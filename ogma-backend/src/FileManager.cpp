#include <iostream>
#include <unordered_set>
#include <boost/regex.hpp>
#include <boost/process.hpp>
#include <boost/algorithm/string.hpp>
#include <boost/range/iterator_range.hpp>

#include "Util.h"
#include "FileManager.h"
#include "tables/tables_thumbnail.h"

using namespace std;
using namespace ogma;
namespace algo = boost::algorithm;
namespace process = boost::process;

db::tables::Thumbnails t_thumbnails;

FileManager::FileManager(const fs::path &root_dir, const fs::path &config_dir, const fs::path &thumb_dir)
        : logger(util::create_logger("file")), m_root_dir(root_dir),
          m_config_dir(config_dir), m_thumb_dir(thumb_dir) {
    prepareThumbDb();
}

string FileManager::getFileHash(string collPath) {
    return util::get_md5(collPath).substr(0, 12);
}

void FileManager::prepareThumbDb() {
    m_thumb_db_file = m_config_dir / "thumbs.sqlite3";
    fs::create_directories(m_thumb_dir);
    m_db = db::create_db(m_thumb_db_file);
    db::run_schema(m_db, db::Sql::Thumbnails);
}

base_file_ptr FileManager::getFileDetails(fs::path path) {
    assert(path.is_absolute());
    path = path.lexically_normal();
    auto osPath = (m_root_dir / path);
    if (!fs::exists(osPath)) {
        throw runtime_error(STR("Cannot fetch details for file that doesn't exist: " << osPath));
    }

    string collPath = path.generic_string();
    assert(collPath.at(0) == '/');
    assert(collPath.at(collPath.length() - 1) != '/' || collPath.length() == 1);

    base_file_ptr fileDetails(new BaseFile());
    fileDetails->hash = getFileHash(collPath);
    fileDetails->path = path;
    fileDetails->osPath = osPath;
    fileDetails->nixPath = collPath;
    fileDetails->isDir = fs::is_directory(osPath);
    // TODO: Generate thumbnail (or re-generate based on thumbnail)
    fileDetails->thumbName = "";
    fileDetails->thumbState = fileDetails->isDir ? ThumbState::Impossible : ThumbState::Possible;
    fileDetails->readTime = util::get_unix_timestamp();
    fileDetails->modTime = fs::last_write_time(osPath);

    try {
        auto thumbName = checkThumbnail(fileDetails);
        if (!thumbName.empty()) {
            fileDetails->thumbName = thumbName;
            fileDetails->thumbState = ThumbState::Ready;
        }
    } catch (exception &e) {
        logger->error(STR("Error occurred while checking for thumbnail: " << e.what()));
    }

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

    for (auto &entry : boost::make_iterator_range(fs::directory_iterator(m_root_dir / path), {})) {
        auto name = entry.path().filename();
        if (name == OGMA_COLL_CONFIG_DIR) continue;
        auto baseFile = getFileDetails(path / name);
        hashSet.erase(baseFile->hash);
        if (baseFile->modTime > dirReadTime || hashSet.find(baseFile->hash) == hashSet.end()) {
            changedFiles.emplace_back(baseFile);
        }
    }
    vector<string> deletedHashes;
    deletedHashes.reserve(hashSet.size());
    for (auto &hash : hashSet) deletedHashes.emplace_back(hash);
    return pair<vector<base_file_ptr>, vector<string>>(changedFiles, deletedHashes);
}


#pragma clang diagnostic push
#pragma ide diagnostic ignored "MemberFunctionCanBeStatic"

void FileManager::generateFfmpegThumb(fs::path inPath, fs::path outPath) {
    auto duration = util::get_video_duration(inPath);

    int result;
    if (duration > 0) {
        auto durationString = util::seconds_to_ffmpeg_duration(duration * 0.04);
        process::child c(util::get_ffmpeg_path(),
                         "-y", "-ss", durationString, "-i", inPath, "-an", "-vframes", "1", "-q:v", "10",
                         "-filter:v", "scale='300:-1'", outPath, process::std_err > process::null);
        c.wait();
        result = c.exit_code();
    } else {
        auto durationString = util::seconds_to_ffmpeg_duration(duration * 0.04);
        process::child c(util::get_ffmpeg_path(),
                         "-y", "-i", inPath, "-an", "-vframes", "1", "-q:v", "10",
                         "-filter:v", "scale='300:-1'", outPath, process::std_err > process::null);
        c.wait();
        result = c.exit_code();
    }

    if (result != 0) {
        throw runtime_error(STR("ffmpeg exited with code " << result));
    }
}

#pragma clang diagnostic pop

string FileManager::generateThumbnail(base_file_ptr baseFile, bool skipCheck) {
    if (!skipCheck) {
        string name = checkThumbnail(baseFile);
        if (!name.empty()) return name;
    }

    auto sourcePath = baseFile->osPath;

    string thumbId = util::get_md5(STR(sourcePath << util::get_unix_timestamp())).substr(0, 10);
    auto thumbName = thumbId + ".jpg";

    generateFfmpegThumb(sourcePath, m_thumb_dir / thumbName);

    auto query = sqlpp::insert_into(t_thumbnails)
            .set(t_thumbnails.id = thumbId,
                 t_thumbnails.hash = baseFile->hash,
                 t_thumbnails.nixPath = baseFile->nixPath,
                 t_thumbnails.isDir = int(baseFile->isDir),
                 t_thumbnails.epoch = util::get_unix_timestamp());
    m_db->operator()(query);
    return thumbName;
}

string FileManager::checkThumbnail(base_file_ptr baseFile) {
    auto query = sqlpp::select(t_thumbnails.id, t_thumbnails.epoch)
            .from(t_thumbnails)
            .where(t_thumbnails.hash == baseFile->hash);
    auto result = m_db->operator()(query);

    if (result.empty()) return "";
    auto &thumb = result.front();
    string name = string(thumb.id) + ".jpg";
    if (thumb.epoch < baseFile->modTime) {
        fs::remove(m_thumb_dir / name);
        m_db->operator()(sqlpp::remove_from(t_thumbnails).where(t_thumbnails.id == thumb.id));
        return "";
    } else if (!fs::exists(m_thumb_dir / name)) {
        m_db->operator()(sqlpp::remove_from(t_thumbnails).where(t_thumbnails.id == thumb.id));
        return "";
    }

    return name;
}
