#include <utility>

//
// Created by euql1n on 7/17/19.
//

#include "Util.h"
#include "IpcModule.h"
#include "WebSocket.h"

using namespace std;
using namespace ogma;

CREATE_LOGGER("IPC")

IpcModule::IpcModule(shared_ptr<Settings> settings, shared_ptr<Library> library)
        : m_settings(move(settings)), m_library(move(library)) {}

void IpcModule::set_web_socket(const shared_ptr<WebSocket> &webSocket) { m_web_socket = webSocket; }

void IpcModule::process_action(const std::string &name, const json &data,
                               const std::shared_ptr<ClientDetails> &client,
                               const function<void(const json)> &callback) {
    json payload;
    if (name == "getClientDetails") {
        payload = client->to_json();
    } else if (name == "getClientList") {
        payload = json::array();
        auto clients = m_web_socket->get_connected_clients();
        for (auto &connectedClient : clients) payload.emplace_back(connectedClient->to_json());
    } else if (name == "getSummaries") {
        payload = json::array();
    } else {
        throw runtime_error("Action " + name + " is not supported .");
    }
    callback(payload);
}

