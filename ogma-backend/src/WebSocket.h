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

namespace Ogma {
    namespace ws = websocketpp;
    using json = nlohmann::json;
    using SocketServer = ws::server<ws::config::asio>;

    enum BackendEvent {
        // Important: Also add string version to WebSocket constructor
                AddConnection,
        RemoveConnection,
    };


    namespace {
        int connectionCount = 0;
        hashidsxx::Hashids hash_id;

        std::string get_client_id() {
            connectionCount++;
            return hash_id.encode(connectionCount);
        }
    }

    struct ClientDetails {
        std::string id;
        std::string ip;
        bool localClient = false;
        std::string userAgent;

        ClientDetails() = default;

        explicit ClientDetails(const SocketServer::connection_ptr &connection)
                : id(get_client_id()),
                  userAgent(connection->get_request_header("user-agent")) {
            auto address = connection->get_raw_socket().remote_endpoint().address();
            if (address.is_v4()) {
                ip = address.to_v4().to_string();
                localClient = false; // TODO: Detect local clients for IPv4
            } else {
                ip = address.to_v6().to_string();
                localClient = ip == "::ffff";
            }
        };

        json to_json() {
            json details;
            details["id"] = id;
            details["ip"] = ip;
            details["localClient"] = localClient;
            details["userAgent"] = userAgent;
            return details;
        }
    };

    using ConnectionList = std::map<ws::connection_hdl, ClientDetails, std::owner_less<ws::connection_hdl>>;

    class WebSocket {
        private:
            Config m_config;
            SocketServer m_server;
            ConnectionList m_connections;
            std::queue<std::pair<std::string, json>> m_event_queue;
            std::map<BackendEvent, std::string> m_event_names;

            std::mutex m_action_lock;
            std::mutex m_connection_lock;
            std::condition_variable m_action_cond;

            bool m_shutdown = false;

            void on_open(const ws::connection_hdl &handle);
            void on_close(const ws::connection_hdl &handle);
            void on_message(ws::connection_hdl handle, const SocketServer::message_ptr &msg);
            json process_request(const ws::connection_hdl &handle, json action);
            void add_to_broadcast_queue(BackendEvent event, json data);

        public:
            explicit WebSocket(Config config);
            virtual ~WebSocket();
            void start();
            void process_broadcast_queue();
    };

}

#endif //OGMA_BACKEND_WEBSOCKET_H
