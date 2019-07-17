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
            std::shared_ptr<Settings> m_settings;
            std::shared_ptr<Library> m_library;
            std::shared_ptr<WebSocket> m_web_socket;

        public:
            IpcModule(std::shared_ptr<Settings> settings, std::shared_ptr<Library> library);
            void set_web_socket(const std::shared_ptr<WebSocket> &webSocket);
            void process_action(const std::string &name, const json &data,
                                const std::shared_ptr<ClientDetails> &client,
                                const std::function<void(const json)> &callback);

    };

}

#endif //OGMA_BACKEND_IPCMODULE_H
