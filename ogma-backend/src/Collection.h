//
// Created by euql1n on 7/17/19.
//

#ifndef OGMA_BACKEND_COLLECTION_H
#define OGMA_BACKEND_COLLECTION_H

#include <nlohmann/json.hpp>
#include <boost/filesystem.hpp>

namespace ogma {

    namespace fs = boost::filesystem;
    using json = nlohmann::json;

    struct Summary {
        std::string id;
        fs::path path;
        std::string slug;
        std::string name;
        std::string icon;
        std::string color;

        json to_json() {
            json summary;
            summary["id"] = id;
            summary["path"] = path;
            summary["slug"] = slug;
            summary["name"] = name;
            summary["icon"] = icon;
            summary["color"] = color;
            return summary;
        }
    };

    class Collection {

        private:
            fs::path m_path;
            fs::path m_config_dir;
            fs::path m_data_db_file;
            fs::path m_thumbs_db_file;

            Summary m_summary;

        public:
            explicit Collection(boost::filesystem::path path, bool allow_new = false);
            const Summary &getSummary();

    };

}

#endif //OGMA_BACKEND_COLLECTION_H
