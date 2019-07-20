//
// Created by euql1n on 7/17/19.
//

#ifndef OGMA_BACKEND_IPCMODULE_H
#define OGMA_BACKEND_IPCMODULE_H

#include <memory>

#include "Library.h"

namespace ogma {

    // Forward declaration
    class WebSocket;

    struct ClientDetails;

    class IpcModule {

        private:
            std::shared_ptr<spdlog::logger> logger;

            Settings *m_settings;
            Library *m_library;
            WebSocket *m_web_socket = nullptr;

        public:
            IpcModule(Settings *settings, Library *library);
            void set_web_socket(WebSocket *webSocket);
            void process_action(const std::string &name, const json &requestPayload,
                                const std::shared_ptr<ClientDetails> &client,
                                const std::function<void(const json)> &callback);

    };

}

#endif //OGMA_BACKEND_IPCMODULE_H
