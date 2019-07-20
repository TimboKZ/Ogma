//
// Created by euql1n on 7/20/19.
//

#ifndef OGMA_BACKEND_FILEMANAGER_H
#define OGMA_BACKEND_FILEMANAGER_H

#include <string>
#include <boost/filesystem.hpp>

namespace ogma {

    namespace fs = boost::filesystem;

    enum ThumbState {
        Impossible = 0,
        Possible = 1,
        Ready = 2,
    };

    struct BaseFile {
        std::string hash;
        fs::path path;
        std::string collPath;

        bool isDir;
        std::string thumbName;
        ThumbState thumbState = ThumbState::Impossible;
        std::time_t readTime;
        std::time_t modTime;
    };

    typedef std::shared_ptr<BaseFile> base_file_ptr;

    class FileManager {

        private:
            std::shared_ptr<spdlog::logger> logger;

            fs::path m_root_dir;
            fs::path m_config_dir;

        public:
            FileManager(const fs::path &root_dir, const fs::path &config_dir);

            static std::string getFileHash(std::string collPath);

            base_file_ptr getFileDetails(fs::path path);

            std::vector<base_file_ptr> getDirectoryDetails(fs::path path);

            std::pair<std::vector<base_file_ptr>, std::vector<std::string>>
            getDirectoryDiff(fs::path path, std::vector<std::string> cachedHashes, std::time_t dirReadTime);

    };

}

#endif //OGMA_BACKEND_FILEMANAGER_H
