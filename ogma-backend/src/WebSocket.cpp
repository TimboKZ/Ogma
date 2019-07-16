#include <utility>

//
// Created by euql1n on 7/15/19.
//

#include <math.h>
#include <boost/algorithm/string.hpp>

#include "WebSocket.h"

using namespace std;
using namespace Ogma;
namespace ph = ws::lib::placeholders;

WebSocket::WebSocket(Config config) : m_config(std::move(config)) {
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
        m_server.listen(m_config.socket_server_port);
        m_server.start_accept();
        m_server.run();
    });
    socket_thread.join();
    m_shutdown = true;
    this_thread::sleep_for(chrono::seconds(1));
}

void WebSocket::on_open(const ws::connection_hdl &handle) {
    const SocketServer::connection_ptr &connection = m_server.get_con_from_hdl(handle);
    ClientDetails clientDetails = ClientDetails(connection);
    {
        lock_guard<mutex> guard(m_connection_lock);
        m_connections[handle] = clientDetails;
    }
    cout << "[WS] Connected: <" + clientDetails.id + "> from " + clientDetails.ip << endl;
    add_to_broadcast_queue(BackendEvent::AddConnection, clientDetails.to_json());
}

void WebSocket::on_close(const ws::connection_hdl &handle) {
    std::string id;
    {
        lock_guard<mutex> guard(m_connection_lock);
        auto client = m_connections.find(handle);
        if (client != m_connections.end()) id = client->second.id;
        m_connections.erase(handle);
    }
    cout << "[WS] Disconnected: <" + id + ">" << endl;
    add_to_broadcast_queue(BackendEvent::RemoveConnection, id);
}


void WebSocket::on_message(ws::connection_hdl handle, const SocketServer::message_ptr &msg) {
    vector<string> parts;

    auto requestAction = json::parse(msg->get_payload());

    json responseAction;
    try {
        SocketServer::connection_ptr connection = m_server.get_con_from_hdl(handle);
        responseAction = this->process_request(handle, requestAction);
    } catch (const std::exception &e) {
        responseAction["error"] = e.what();
    }

    if (requestAction.find("id") != requestAction.end()) {
        responseAction["id"] = requestAction["id"];
    }

    m_server.send(std::move(handle), responseAction.dump(), ws::frame::opcode::text);
}

json WebSocket::process_request(const ws::connection_hdl &handle, json action) {
    cout << "[IPC] Received action: " << action << endl;
    if (action.find("name") == action.end()) throw runtime_error("Request action has no name specified!");
    string name = action["name"];

    json payload;

    if (name == "getClientDetails") {
        {
            lock_guard<mutex> guard(m_connection_lock);
            auto client = m_connections.find(handle);
            if (client == m_connections.end()) throw runtime_error("Could not find client details using the handle!");
            payload = client->second.to_json();
        }
    } else if (name == "getClientList") {
        payload = json::array();
        {
            lock_guard<mutex> guard(m_connection_lock);
            for (auto &clientHandle : m_connections) {
                payload.emplace_back(clientHandle.second.to_json());
            }
        }
    } else if (name == "getSummaries") {
        payload = json::array();
    } else {
        throw runtime_error("Action " + name + " is not supported .");
    }

    json responseAction;
    responseAction["name"] = name;
    responseAction["payload"] = payload;
    return responseAction;
}

void WebSocket::add_to_broadcast_queue(BackendEvent event, json data) {
    auto name = m_event_names[event];
    {
        lock_guard<mutex> guard(m_action_lock);
        m_event_queue.push(pair<string, json>(name, data));
    }
    m_action_cond.notify_one();
}

void WebSocket::process_broadcast_queue() {
    while (true) {
        if (m_shutdown) break;

        unique_lock<mutex> lock(m_action_lock);
        while (m_event_queue.empty()) m_action_cond.wait(lock);
        auto eventData = m_event_queue.front();
        m_event_queue.pop();
        lock.unlock();

        auto name = eventData.first;
        auto data = eventData.second;
        cout << "[IPC] Broadcasting event " + name + " with data: " + data.dump() << endl;
        json eventAction = {
                {"name",    "ipc-forward-event"},
                {"payload", {{"name", name}, {"data", data}}}
        };

        {
            lock_guard<mutex> guard(m_connection_lock);
            for (auto &handle : m_connections) {
                m_server.send(handle.first, eventAction.dump(), ws::frame::opcode::text);
            }
        }
    }
}

WebSocket::~WebSocket() {
    m_shutdown = true;
    m_server.stop_listening();
    m_server.stop();
}

