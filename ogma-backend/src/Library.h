//
// Created by euql1n on 7/16/19.
//

#ifndef OGMA_BACKEND_LIBRARY_H
#define OGMA_BACKEND_LIBRARY_H

#include <stdbool.h>
#include <boost/filesystem.hpp>

#include "Settings.h"
#include "Collection.h"

namespace ogma {

    namespace fs = boost::filesystem;

    class Library {

        private:
            std::shared_ptr<Settings> m_settings;

            std::map<std::string, std::shared_ptr<Collection>> m_coll_by_id;
            std::map<fs::path, std::shared_ptr<Collection>> m_coll_by_path;

            std::shared_ptr<Collection> open(const fs::path &path, bool allow_new = false);

        public:
            explicit Library(std::shared_ptr<Settings> settings);
            std::shared_ptr<Collection> open_collection(const fs::path &path);
    };

}

#endif //OGMA_BACKEND_LIBRARY_H
