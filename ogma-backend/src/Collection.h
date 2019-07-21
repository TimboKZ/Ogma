#ifndef OGMA_BACKEND_COLLECTION_H
#define OGMA_BACKEND_COLLECTION_H

#include <nlohmann/json.hpp>
#include <boost/filesystem.hpp>

#include "Database.h"
#include "FileManager.h"

namespace ogma {

    // Forward declaration
    enum BackendEvent : unsigned int;

    // Forward declaration
    class WebSocket;

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
            summary["path"] = path.string();
            summary["slug"] = slug;
            summary["name"] = name;
            summary["icon"] = icon;
            summary["color"] = color;
            return summary;
        }
    };

    struct File : BaseFile {

        std::string entityId;
        std::vector<std::string> tagIds;

        File(BaseFile baseFile) {
            hash = baseFile.hash;
            path = baseFile.path;
            osPath = baseFile.osPath;
            nixPath = baseFile.nixPath;
            isDir = baseFile.isDir;
            thumbName = baseFile.thumbName;
            thumbState = baseFile.thumbState;
            readTime = baseFile.readTime;
            modTime = baseFile.modTime;
        }

        json to_json() {
            json summary;
            summary["hash"] = hash;
            summary["nixPath"] = nixPath;
            summary["base"] = path.filename().string();

            auto extStr = path.extension().string();
            if (isDir) summary["ext"] = nullptr;
            else summary["ext"] = extStr;

            auto nameStr = path.filename().string();
            summary["name"] = isDir ? nameStr : nameStr.substr(0, nameStr.length() - extStr.length());

            summary["isDir"] = isDir;
            summary["tagIds"] = tagIds;

            if (entityId.empty()) summary["entityId"] = nullptr;
            else summary["entityId"] = entityId;

            if (thumbName.empty()) summary["thumbName"] = nullptr;
            else summary["thumbName"] = thumbName;

            summary["thumbState"] = thumbState;
            summary["readTime"] = readTime;
            return summary;
        }

        operator std::string() { return to_json().dump(); }
    };

    typedef std::shared_ptr<File> file_ptr;

    typedef std::function<Summary(const fs::path &)> summary_generator;

    class Collection {

        private:
            std::shared_ptr<spdlog::logger> logger;

            WebSocket *m_web_socket = nullptr;

            fs::path m_path;
            fs::path m_config_dir;
            fs::path m_data_db_file;
            fs::path m_thumb_dir;

            db::db_ptr m_db;
            std::shared_ptr<Summary> m_summary;
            std::shared_ptr<FileManager> m_file_manager;
            summary_generator m_get_default_summary;

            void prepareDb();

            file_ptr consumeBaseFile(base_file_ptr baseFile);

        public:
            explicit Collection(boost::filesystem::path path, summary_generator getDefaultSummary,
                                bool allowNew = false);

            void setWebSocket(WebSocket *web_socket);

            void dispatchEvent(BackendEvent event, json payload);

            const std::shared_ptr<Summary> &getSummary() const;

            const fs::path &getThumbDir() const;

            void setProperties(json data);

            std::pair<file_ptr, std::vector<file_ptr>> getDirectoryContents(fs::path path);

            file_ptr
            scanDirectoryForChanges(fs::path path, std::vector<std::string> cachedHashes, std::time_t dirReadTime);

            void requestFileThumbnails(std::vector<std::string> paths);

    };

}

#endif //OGMA_BACKEND_COLLECTION_H
