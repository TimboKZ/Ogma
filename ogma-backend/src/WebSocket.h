#include <utility>

//
// Created by euql1n on 7/15/19.
//

#ifndef OGMA_BACKEND_WEBSOCKET_H
#define OGMA_BACKEND_WEBSOCKET_H

#include <map>
#include <stdbool.h>
#include <hashids.h>
#include <nlohmann/json.hpp>
#include <websocketpp/server.hpp>
#include <websocketpp/config/asio_no_tls.hpp>

#include "Config.h"
#include "Settings.h"
#include "Library.h"
#include "IpcModule.h"

namespace ogma {
    namespace ws = websocketpp;
    using json = nlohmann::json;
    using SocketServer = ws::server<ws::config::asio>;

    enum BackendEvent {
        // Important: Also add string version to WebSocket constructor
                AddConnection,
        RemoveConnection,
    };

    namespace {
        uint16_t connectionCount = 0;
        hashidsxx::Hashids hash_id; // NOLINT(cert-err58-cpp)

        std::string get_client_id() {
            connectionCount = (connectionCount + 1) % 60000;
            return hash_id.encode(connectionCount);
        }
    }

    struct ClientDetails {
        std::string id;
        std::string ip;
        bool localClient = false;
        std::string userAgent;

        const json to_json() {
            json details;
            details["id"] = id;
            details["ip"] = ip;
            details["localClient"] = localClient;
            details["userAgent"] = userAgent;
            return details;
        }

        ClientDetails(std::string id, const std::string &ip, bool local_client, const std::string &user_agent)
                : id(std::move(id)), ip(ip), localClient(local_client), userAgent(user_agent) {}
    };

    using ConnectionList = std::map<ws::connection_hdl, std::shared_ptr<ClientDetails>,
            std::owner_less<ws::connection_hdl>>;

    class WebSocket {
        private:
            std::shared_ptr<Config> m_config;
            std::shared_ptr<IpcModule> m_ipc;
            std::string m_internal_ip;

            SocketServer m_server;
            ConnectionList m_connections;
            std::mutex m_connection_lock;
            std::mutex m_event_lock;

            std::condition_variable m_event_cond;
            std::map<BackendEvent, std::string> m_event_names;
            std::queue<std::pair<BackendEvent, json>> m_event_queue;

            bool m_shutdown = false;

            void on_open(const ws::connection_hdl &handle);
            void on_close(const ws::connection_hdl &handle);
            void on_message(ws::connection_hdl handle, const SocketServer::message_ptr &msg);
            void process_request(const ws::connection_hdl &handle, json action,
                                 std::function<void(const json)> &callback);
            void add_to_broadcast_queue(BackendEvent event, const json &data);

            static const json prepare_response(const json &request, const json &payload, const json &error);

        public:
            WebSocket(std::shared_ptr<Config> config, std::shared_ptr<IpcModule> ipc);
            virtual ~WebSocket();
            void start();
            void process_broadcast_queue();
            const std::vector<std::shared_ptr<ClientDetails>> get_connected_clients();
    };

}

#endif //OGMA_BACKEND_WEBSOCKET_H
