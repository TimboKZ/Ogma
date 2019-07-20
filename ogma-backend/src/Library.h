//
// Created by euql1n on 7/16/19.
//

#ifndef OGMA_BACKEND_LIBRARY_H
#define OGMA_BACKEND_LIBRARY_H

#include <boost/filesystem.hpp>

#include "Settings.h"
#include "Collection.h"

namespace ogma {

    // Forward declaration
    class WebSocket;

    namespace fs = boost::filesystem;

    class Library {

        private:
            std::shared_ptr<spdlog::logger> logger;

            Settings *m_settings;
            WebSocket *m_web_socket = nullptr;

            std::mutex m_coll_lock;
            std::map<std::string, std::shared_ptr<Collection>> m_coll_by_id;
            std::map<fs::path, std::shared_ptr<Collection>> m_coll_by_slug;
            std::map<fs::path, std::shared_ptr<Collection>> m_coll_by_path;

            Summary getDefaultSummary(const fs::path &path);

            std::shared_ptr<Collection> open(const fs::path &path, bool allow_new = false);

            void updateOpenCollections();

        public:
            explicit Library(Settings *settings);

            void setWebSocket(WebSocket *web_socket);

            std::shared_ptr<Collection> openCollection(const fs::path &path);

            std::shared_ptr<Collection> getCollection(const std::string &id);

            std::vector<std::shared_ptr<Summary>> getSummaries();
    };

}

#endif //OGMA_BACKEND_LIBRARY_H
