//
// Created by euql1n on 7/14/19.
//

#ifndef OGMA_BACKEND_SERVER_H
#define OGMA_BACKEND_SERVER_H

#include <simple_web_server/server_http.hpp>

#include "Config.h"

namespace Ogma {

    using HttpServer = SimpleWeb::Server<SimpleWeb::HTTP>;

    class Server {

        private:
            Config config;
            HttpServer web_server;

        public:
            explicit Server(Config config);
            virtual ~Server();
            void start();

    };

}

#endif //OGMA_BACKEND_SERVER_H
