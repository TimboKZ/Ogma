#include <utility>

#include <utility>

#include <utility>

#include <utility>

#include <utility>

//
// Created by euql1n on 7/15/19.
#include <boost/algorithm/string.hpp>

#include "Util.h"
#include "WebSocket.h"

using namespace std;
using namespace ogma;
namespace ph = ws::lib::placeholders;
namespace algo = boost::algorithm;

WebSocket::WebSocket(Config *config, IpcModule *ipc)
        : logger(util::create_logger("ws")), m_config(config), m_ipc(ipc) {
    // Important: Also add enum version to WebSocket header file
    m_event_names[BackendEvent::AddConnection] = "add-conn";
    m_event_names[BackendEvent::RemoveConnection] = "remove-conn";

    m_server.init_asio();
    m_server.set_reuse_addr(true);
    m_server.clear_access_channels(ws::log::alevel::all ^ ws::log::alevel::fail);

    m_server.set_open_handler(ws::lib::bind(&WebSocket::on_open, this, ph::_1));
    m_server.set_close_handler(ws::lib::bind(&WebSocket::on_close, this, ph::_1));
    m_server.set_message_handler(ws::lib::bind(&WebSocket::on_message, this, ph::_1, ph::_2));
}

void WebSocket::start() {
    thread socket_thread([this]() {
        m_server.listen(m_config->socket_server_port);
        m_server.start_accept();
        m_server.run();
    });
    socket_thread.join();
    m_shutdown = true;
    this_thread::sleep_for(chrono::seconds(1));
}

void WebSocket::on_open(const ws::connection_hdl &handle) {
    const SocketServer::connection_ptr &connection = m_server.get_con_from_hdl(handle);

    auto id = get_client_id();
    auto userAgent = connection->get_request_header("user-agent");

    auto address = connection->get_raw_socket().remote_endpoint().address();
    auto ip = address.to_string();
    bool localClient = algo::contains(ip, m_internal_ip);

    shared_ptr<ClientDetails> clientDetails(new ClientDetails(id, ip, localClient, userAgent));
    {
        lock_guard<mutex> guard(m_connection_lock);
        m_connections[handle] = clientDetails;
    }
    logger->info(STR("Connected: <" << clientDetails->id << "> from " << clientDetails->ip));
    add_to_broadcast_queue(BackendEvent::AddConnection, clientDetails->to_json());
}

void WebSocket::on_close(const ws::connection_hdl &handle) {
    std::string id;
    {
        lock_guard<mutex> guard(m_connection_lock);
        auto client = m_connections.find(handle);
        if (client != m_connections.end()) id = client->second->id;
        m_connections.erase(handle);
    }
    logger->info(STR("Disconnected: <" << id << ">"));
    add_to_broadcast_queue(BackendEvent::RemoveConnection, id);
}

void WebSocket::on_message(ws::connection_hdl handle, const SocketServer::message_ptr &msg) {
    vector<string> parts;
    auto request = json::parse(msg->get_payload());

    try {
        bool callback_called = false;
        function<void(const json)> callback = [&handle, &callback_called, &request, this](const json &payload) {
            callback_called = true;
            auto response = prepare_response(request, payload, nullptr);
            m_server.send(std::move(handle), response.dump(), ws::frame::opcode::text);
        };
        this->process_request(handle, request, callback);
        if (!callback_called) callback(nullptr);
    } catch (const std::exception &e) {
        auto response = prepare_response(request, nullptr, e.what());
        m_server.send(std::move(handle), response.dump(), ws::frame::opcode::text);
    }
}

void WebSocket::process_request(const ws::connection_hdl &handle, json action, function<void(const json)> &callback) {
    logger->info(STR("Received action: " << action));
    if (action.find("name") == action.end()) throw runtime_error("Request action has no name specified!");
    string name = action["name"];

    shared_ptr<ClientDetails> client;
    {
        lock_guard<mutex> guard(m_connection_lock);
        auto client_connection = m_connections.find(handle);
        if (client_connection == m_connections.end())
            throw runtime_error("Could not find client details using the handle!");
        client = client_connection->second;
    }

    m_ipc->process_action(name, {}, client, callback);
}

void WebSocket::add_to_broadcast_queue(BackendEvent event, const json &data) {
    {
        lock_guard<mutex> guard(m_event_lock);
        m_event_queue.push(pair<BackendEvent, json>(event, data));
    }
    m_event_cond.notify_one();
}

void WebSocket::process_broadcast_queue() {
    while (true) {
        if (m_shutdown) break;

        unique_lock<mutex> lock(m_event_lock);
        while (m_event_queue.empty()) m_event_cond.wait(lock);
        auto eventData = m_event_queue.front();
        m_event_queue.pop();
        lock.unlock();

        auto name = m_event_names[eventData.first];
        auto data = eventData.second;
        logger->info(STR("Broadcasting event " << name << " with data: " << data.dump()));
        json event = {
                {"name",    "ipc-forward-event"},
                {"payload", {{"name", name}, {"data", data}}}
        };

        {
            lock_guard<mutex> guard(m_connection_lock);
            for (auto &handle : m_connections) {
                m_server.send(handle.first, event.dump(), ws::frame::opcode::text);
            }
        }
    }
}

const vector<shared_ptr<ClientDetails>> WebSocket::get_connected_clients() {
    vector<shared_ptr<ClientDetails>> clients;
    {
        lock_guard<mutex> guard(m_event_lock);
        clients.reserve(m_connections.size());
        for (auto &handle : m_connections) clients.push_back(handle.second);
    }
    return clients;
}

const json WebSocket::prepare_response(const json &request, const json &payload, const json &error) {
    json response;
    if (request.find("id") != request.end()) response["id"] = request["id"];
    if (request.find("name") != request.end()) response["name"] = request["name"];
    if (!payload.is_null()) response["payload"] = payload;
    if (!error.is_null()) response["error"] = error;
    return response;
}

WebSocket::~WebSocket() {
    m_shutdown = true;
    m_server.stop_listening();
    m_server.stop();
}

