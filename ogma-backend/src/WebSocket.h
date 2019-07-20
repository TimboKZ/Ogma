#ifndef OGMA_BACKEND_WEBSOCKET_H
#define OGMA_BACKEND_WEBSOCKET_H

#include <map>
#include <utility>
#include <stdbool.h>
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

    // Important: Also add string version to below
    enum BackendEvent : unsigned int {
        AddConnection,
        RemoveConnection,
        CreateEnvironment,

        EnvUpdateFiles,
        EnvRemoveFiles,
    };

    namespace {
        std::map<BackendEvent, std::string> event_names;

        void setup_event_names() {
            // Important: Also add enum version above
            event_names[BackendEvent::AddConnection] = "add-conn";
            event_names[BackendEvent::RemoveConnection] = "remove-conn";
            event_names[BackendEvent::CreateEnvironment] = "create-env";

            event_names[BackendEvent::EnvUpdateFiles] = "env-update-files";
            event_names[BackendEvent::EnvRemoveFiles] = "env-remove-files";
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

        ClientDetails(std::string id, std::string ip, bool local_client, std::string user_agent)
                : id(std::move(id)), ip(std::move(ip)), localClient(local_client), userAgent(std::move(user_agent)) {}
    };

    using ConnectionList = std::map<ws::connection_hdl, std::shared_ptr<ClientDetails>,
            std::owner_less<ws::connection_hdl>>;

    class WebSocket {
        private:
            std::shared_ptr<spdlog::logger> logger;

            Config *m_config;
            IpcModule *m_ipc;

            SocketServer m_server;
            ConnectionList m_connections;
            std::mutex m_connection_lock;
            std::mutex m_event_lock;

            std::condition_variable m_event_cond;
            std::queue<std::pair<BackendEvent, json>> m_event_queue;

            uint16_t m_action_count = 0;

            bool m_shutdown = false;

            void on_open(const ws::connection_hdl &handle);

            void on_close(const ws::connection_hdl &handle);

            void on_message(ws::connection_hdl handle, const SocketServer::message_ptr &msg);

            void process_request(const ws::connection_hdl &handle, json action,
                                 std::function<void(const json)> &callback);

            static const json prepare_response(const json &request, const json &payload, const json &error);

        public:
            WebSocket(Config *config, IpcModule *ipc);

            virtual ~WebSocket();

            void start();

            void add_to_broadcast_queue(BackendEvent event, const json &data);

            void process_broadcast_queue();

            const std::vector<std::shared_ptr<ClientDetails>> get_connected_clients();
    };

}

#endif //OGMA_BACKEND_WEBSOCKET_H
