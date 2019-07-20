#include <iostream>
#include <unordered_set>
#include <boost/regex.hpp>
#include <boost/range/iterator_range.hpp>

#include "Util.h"
#include "FileManager.h"

using namespace std;
using namespace ogma;

FileManager::FileManager(const fs::path &root_dir, const fs::path &config_dir) : logger(util::create_logger("file")),
                                                                                 m_root_dir(root_dir),
                                                                                 m_config_dir(config_dir) {}

string FileManager::getFileHash(string collPath) {
    return util::get_md5(collPath).substr(0, 12);
}

auto trailing_slash_regex = boost::regex("/^");

base_file_ptr FileManager::getFileDetails(fs::path path) {
    assert(path.is_absolute());
    auto osPath = (m_root_dir / path);
    if (!fs::exists(osPath)) throw runtime_error(STR("Cannot fetch details for file that doesn't exist: " << osPath));

    string collPath = path.lexically_normal().generic_string();
    assert(collPath.at(0) == '/');
    assert(collPath.at(collPath.length() - 1) != '/' || collPath.length() == 1);

    base_file_ptr fileDetails(new BaseFile());
    fileDetails->hash = getFileHash(collPath);
    fileDetails->path = path.lexically_normal();
    fileDetails->collPath = collPath;
    fileDetails->isDir = fs::is_directory(osPath);
    // TODO: Generate thumbnail (or re-generate based on thubmnail)
    fileDetails->thumbName = "";
    fileDetails->thumbState = ThumbState::Impossible;
    fileDetails->readTime = util::get_unix_timestamp();
    fileDetails->modTime = fs::last_write_time(osPath);
    return fileDetails;
}

vector<base_file_ptr> FileManager::getDirectoryDetails(fs::path path) {
    vector<base_file_ptr> files;
    for (auto &entry : boost::make_iterator_range(fs::directory_iterator(m_root_dir / path), {})) {
        auto name = entry.path().filename();
        if (name == OGMA_COLL_CONFIG_DIR) continue;
        files.emplace_back(getFileDetails(path / name));
    }
    return files;
}

pair<vector<base_file_ptr>, vector<string>>
FileManager::getDirectoryDiff(fs::path path, vector<string> cachedHashes, time_t dirReadTime) {
    vector<base_file_ptr> changedFiles;
    unordered_set<string> hashSet;
    for (auto &hash : cachedHashes) hashSet.insert(hash);
    logger->debug(STR("Dir read time is: " << dirReadTime));

    for (auto &entry : boost::make_iterator_range(fs::directory_iterator(m_root_dir / path), {})) {
        auto name = entry.path().filename();
        if (name == OGMA_COLL_CONFIG_DIR) continue;
        auto baseFile = getFileDetails(path / name);
        hashSet.erase(baseFile->hash);
        logger->debug(STR("Dir read time is: " << dirReadTime << " " << baseFile->modTime));
        if (baseFile->modTime > dirReadTime || hashSet.find(baseFile->hash) == hashSet.end()) {
            changedFiles.emplace_back(baseFile);
        }
    }
    vector<string> deletedHashes;
    deletedHashes.reserve(hashSet.size());
    for (auto &hash : hashSet) deletedHashes.emplace_back(hash);
    return pair<vector<base_file_ptr>, vector<string>>(changedFiles, deletedHashes);
}
