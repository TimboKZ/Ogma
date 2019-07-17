//
// Created by euql1n on 7/14/19.
//

#ifndef OGMA_BACKEND_SERVER_H
#define OGMA_BACKEND_SERVER_H

#include <simple_web_server/server_http.hpp>

#include "Config.h"

namespace ogma {

    using HttpServer = SimpleWeb::Server<SimpleWeb::HTTP>;

    class Server {

        private:
            std::shared_ptr<Config> m_config;
            HttpServer m_web_server;

        public:
            explicit Server(const std::shared_ptr<Config> &mConfig);
            virtual ~Server();
            void start();

    };

}

#endif //OGMA_BACKEND_SERVER_H
