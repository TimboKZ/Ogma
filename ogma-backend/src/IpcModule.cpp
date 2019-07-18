#include <utility>
#include <nfd.h>

#include "Util.h"
#include "IpcModule.h"
#include "WebSocket.h"

using namespace std;
using namespace ogma;

IpcModule::IpcModule(Settings *settings, Library *library)
        : logger(util::create_logger("ipc")), m_settings(settings), m_library(library) {}

void IpcModule::set_web_socket(WebSocket *webSocket) { m_web_socket = webSocket; }

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
    } else if (name == "openCollection") {
        nfdchar_t *outPath = nullptr;
        nfdresult_t result = NFD_PickFolder(nullptr, &outPath);
        if (result == NFD_OKAY) {
            fs::path collPath(outPath);
            auto collection = m_library->open_collection(collPath);
            auto summary = collection->getSummary();
            payload = summary.to_json();
        } else if (result == NFD_CANCEL) {
            payload = nullptr;
        } else {
            throw runtime_error(NFD_GetError());
        }
    } else {
        throw runtime_error("Action " + name + " is not supported .");
    }
    callback(payload);
}

