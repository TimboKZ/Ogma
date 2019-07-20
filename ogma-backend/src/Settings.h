//
// Created by euql1n on 7/16/19.
//

#ifndef OGMA_BACKEND_SETTINGS_H
#define OGMA_BACKEND_SETTINGS_H

#include "Util.h"
#include <nlohmann/json.hpp>
#include <boost/filesystem.hpp>

namespace ogma {

    namespace fs = boost::filesystem;
    using json = nlohmann::json;

    class Settings {

        private:
            std::shared_ptr<spdlog::logger> logger;

            fs::path m_ogma_dir;
            fs::path m_ogma_settings_file;

            json m_settings_json;
            std::vector<fs::path> m_open_collections;

            void persist();

        public:
            explicit Settings(fs::path ogma_dir);
            const std::vector<fs::path> &get_open_collections();
            void set_open_collections(const std::vector<fs::path> &open_collections);
    };

}

#endif //OGMA_BACKEND_SETTINGS_H
