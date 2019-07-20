#include <utility>
#include <sqlpp11/select.h>
#include <sqlpp11/insert.h>
#include <sqlpp11/custom_query.h>
#include <boost/algorithm/string.hpp>

#include "WebSocket.h"
#include "Collection.h"

using namespace std;
using namespace ogma;
namespace sql = sqlpp::sqlite3;
namespace algo = boost::algorithm;

db::Version t_version;
db::Properties t_properties;
db::Entities t_entities;

const char *id_field = "id";
const char *slug_field = "slug";
const char *name_field = "name";
const char *icon_field = "icon";
const char *color_field = "color";

Collection::Collection(fs::path path, summary_generator getDefaultSummary, bool allowNew)
        : logger(util::create_logger("col")), m_path(std::move(path)),
          m_summary(new Summary()), m_get_default_summary(std::move(getDefaultSummary)) {
    if (!fs::exists(m_path)) throw runtime_error("Specified collection path does not exist!");
    m_summary->path = m_path;

    m_config_dir = m_path / OGMA_COLL_CONFIG_DIR;
    fs::create_directories(m_config_dir);

    m_data_db_file = m_config_dir / "data.sqlite3";
    if (!fs::exists(m_data_db_file) && !allowNew) {
        throw runtime_error("Collection has no DB file and creation is not allowed.");
    }

    prepareDb();
    m_file_manager = make_shared<FileManager>(m_path, m_config_dir);
}

void Collection::setWebSocket(WebSocket *web_socket) { m_web_socket = web_socket; }

void Collection::dispatchEvent(BackendEvent event, json payload) {
    if (!payload.is_object()) {
        throw runtime_error(STR("Payload for event " << event_names[event] << " is not an object!"));
    }
    if (payload.find("id") != payload.end()) {
        throw runtime_error(STR("Payload for event " << event_names[event] << " already contains an ID field!"));
    }

    payload["id"] = m_summary->id;
    m_web_socket->add_to_broadcast_queue(event, payload);
}

string get_property(const db::db_ptr &_db, const char *name, string value) {
    auto selectQuery = sqlpp::select(t_properties.value)
            .from(t_properties)
            .where(t_properties.name == name);
    auto result = _db->operator()(selectQuery);
    if (result.empty()) {
        auto insertQuery = sqlpp::insert_into(t_properties)
                .set(t_properties.name = name, t_properties.value = value);
        _db->operator()(insertQuery);
        return value;
    }
    return result.front().value;
};

void Collection::prepareDb() {
    m_db = db::create_db(m_data_db_file);

    if (db::table_exists(m_db, "version")) {
        auto result = m_db->operator()(sqlpp::select(t_version.version).from(t_version).unconditionally());
        if (result.empty()) {
            logger->warn("Version table exists in the DB but version is not specified. Writing current version.");
            m_db->operator()(sqlpp::insert_into(t_version).set(t_version.version = db::sql_collection_schema_version));
        } else {
            auto version = int(result.front().version);
            logger->debug(STR("Collection DB version: " << version));
            if (version != db::sql_collection_schema_version) {
                throw runtime_error("Unsupported database version. Aborting collection DB initialization.");
            }
        }
        logger->debug("Populating DB with schema (again) for good measure.");
        db::run_schema(m_db, db::Sql::Collection);
    } else {
        logger->debug("DB has no tables, populating it with the schema.");
        db::run_schema(m_db, db::Sql::Collection);
    }

    auto defaultSummary = m_get_default_summary(m_path);
    m_summary->id = get_property(m_db, id_field, defaultSummary.id);
    m_summary->slug = get_property(m_db, slug_field, defaultSummary.slug);
    m_summary->name = get_property(m_db, name_field, defaultSummary.name);
    m_summary->icon = get_property(m_db, icon_field, defaultSummary.icon);
    m_summary->color = get_property(m_db, color_field, defaultSummary.color);
    logger->debug(STR("Effective summary: " << m_summary->to_json().dump()));
}

file_ptr Collection::consumeBaseFile(base_file_ptr baseFile) {
    auto file = make_shared<File>(*baseFile.get());
    auto result = m_db->operator()(select(t_entities.id).from(t_entities).where(t_entities.hash == file->hash));
    if (!result.empty()) file->entityId = result.front().id;
    return file;
}

const shared_ptr<Summary> &Collection::getSummary() const { return m_summary; }

std::pair<file_ptr, std::vector<file_ptr>> Collection::getDirectoryContents(fs::path path) {
    assert(path.is_absolute());
    path = path.lexically_normal();
    auto dir = consumeBaseFile(m_file_manager->getFileDetails(path));
    auto baseFiles = m_file_manager->getDirectoryDetails(path);
    vector<file_ptr> files;
    files.reserve(baseFiles.size());
    for (auto &baseFile : baseFiles) files.emplace_back(consumeBaseFile(baseFile));
    return pair<file_ptr, std::vector<file_ptr>>(dir, files);
}

file_ptr Collection::scanDirectoryForChanges(fs::path path, vector<string> cachedHashes, time_t dirReadTime) {
    auto result = m_file_manager->getDirectoryDiff(path, cachedHashes, dirReadTime);
    if (!result.second.empty()) {
        dispatchEvent(BackendEvent::EnvRemoveFiles, json{{"hashes", result.second}});
    }
    if (!result.first.empty()) {
        vector<json> jsonFiles;
        jsonFiles.reserve(result.first.size());
        for (auto &baseFile : result.first) jsonFiles.emplace_back(consumeBaseFile(baseFile)->to_json());
        dispatchEvent(BackendEvent::EnvUpdateFiles, json{{"files", jsonFiles}});
    }
    return consumeBaseFile(m_file_manager->getFileDetails(path));
}
