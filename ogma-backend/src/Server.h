//
// Created by euql1n on 7/14/19.
//

#ifndef OGMA_BACKEND_SERVER_H
#define OGMA_BACKEND_SERVER_H

#include <simple_web_server/server_http.hpp>

#include "Config.h"
#include "Library.h"

namespace ogma {

    using HttpServer = SimpleWeb::Server<SimpleWeb::HTTP>;

    class Server {

        private:
            std::shared_ptr<spdlog::logger> logger;

            Config *m_config;
            Library *m_library;
            HttpServer m_web_server;

        public:
            explicit Server(Config *config, Library *library);

            virtual ~Server();

            void start();

    };

}

#endif //OGMA_BACKEND_SERVER_H
