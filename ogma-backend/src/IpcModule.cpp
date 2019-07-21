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

const char *id_key = "id";

void IpcModule::process_action(const std::string &name, const json &requestPayload,
                               const std::shared_ptr<ClientDetails> &client,
                               const function<void(const json)> &callback) {

    string collId;
    if (requestPayload.is_object()) {
        if (requestPayload.find(id_key) != requestPayload.end()) collId = requestPayload[id_key];
    }

    json payload;
    bool callbackCalled = false;
    if (name == "getClientDetails") {
        payload = client->to_json();

    } else if (name == "getClientList") {
        payload = json::array();
        auto clients = m_web_socket->get_connected_clients();
        for (auto &connectedClient : clients) payload.emplace_back(connectedClient->to_json());

    } else if (name == "getSummaries") {
        payload = json::array();
        auto summaries = m_library->getSummaries();
        for (const auto &summary : summaries) payload.emplace_back(summary->to_json());

    } else if (name == "getAllTags") {
        payload = json::array();

    } else if (name == "getAllEntities") {
        payload = json::array();

    } else if (name == "getSinkTreeSnapshot") {
        payload = json::array();

    } else if (name == "openCollection") {
        nfdchar_t *outPath = nullptr;
        nfdresult_t result = NFD_PickFolder(nullptr, &outPath);
        if (result == NFD_OKAY) {
            fs::path collPath(outPath);
            auto collection = m_library->openCollection(collPath);
            auto summary = collection->getSummary();
            payload = summary->to_json();
        } else if (result == NFD_CANCEL) {
            payload = nullptr;
        } else {
            throw runtime_error(NFD_GetError());
        }

    } else if (name == "closeCollection") {
        m_library->closeCollection(collId);

    } else if (name == "setCollectionProperties") {
        m_library->getCollection(collId)->setProperties(requestPayload);

    } else if (name == "getDirectoryContents") {
        auto result = m_library->getCollection(collId)->getDirectoryContents(requestPayload["path"]);
        payload["directory"] = result.first.get()->to_json();
        payload["files"] = json::array();
        for (auto &file : result.second) payload["files"].emplace_back(file->to_json());

    } else if (name == "scanDirectoryForChanges") {
        auto dir = m_library->getCollection(collId)->scanDirectoryForChanges(requestPayload["path"],
                                                                             requestPayload["cachedHashes"],
                                                                             requestPayload["dirReadTime"]);
        payload = dir->to_json();

    } else if (name == "requestFileThumbnails") {
        callback(nullptr);
        callbackCalled = true;
        vector<string> paths = requestPayload["paths"];
        m_library->getCollection(collId)->requestFileThumbnails(paths);

    } else {
        throw runtime_error("Action " + name + " is not supported .");
    }

    if (!callbackCalled) callback(payload);
}

