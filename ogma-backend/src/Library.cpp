#include <boost/date_time.hpp>
#include <boost/algorithm/string.hpp>

#include "Util.h"
#include "Server.h"
#include "Library.h"
#include "WebSocket.h"

using namespace std;
using namespace ogma;
namespace algo = boost::algorithm;

Library::Library(Settings *settings) : logger(util::create_logger("lib")), m_settings(settings) {
    auto paths = m_settings->get_open_collections();
    logger->debug(STR("Preparing to open " << paths.size() << " collections."));
    for (auto &path : paths) {
        try {
            open(path, false);
        } catch (exception &e) {
            logger->error(STR("Error occurred while opening collection " << path << ": " << e.what()));
        }
    }
    updateOpenCollections();
}

void Library::setWebSocket(WebSocket *web_socket) {
    m_web_socket = web_socket;
    for (auto &it : m_coll_by_id) it.second->setWebSocket(m_web_socket);
}

uint16_t last_coll_color_index = 0;

Summary Library::getDefaultSummary(const fs::path &path) {
    Summary summary;
    const auto dirName = path.filename().string();
    string slugBase = util::slugify(dirName);
    char suffix = 'a';
    summary.slug = slugBase;

    {
        lock_guard<mutex> guard(m_coll_lock);
        do {
            summary.id = util::get_md5(STR(path << util::get_unix_timestamp())).substr(0, 6);
        } while (m_coll_by_id.find(summary.id) != m_coll_by_id.end());

        while (m_coll_by_slug.find(summary.slug) != m_coll_by_slug.end()) {
            summary.slug = slugBase + "_" + suffix++;
        }
    }

    summary.name = dirName;
    summary.icon = "box-open";

    auto colors = util::get_colors();
    last_coll_color_index = (last_coll_color_index + 18) % colors.size();
    summary.color = colors[last_coll_color_index];

    return summary;
}

std::shared_ptr<Collection> Library::open(const fs::path &path, bool allow_new) {
    logger->info(STR("Opening collection at path: " << path));

    shared_ptr<Collection> collection;

    {
        lock_guard<mutex> guard(m_coll_lock);
        auto colIt = m_coll_by_path.find(path);
        if (colIt != m_coll_by_path.end()) { collection = colIt->second; }
    }

    if (collection != nullptr) {
        logger->debug("Collection already open, returning from cache.");
        return collection;
    }

    auto defaultSummaryLambda = [this](const fs::path &path) { return getDefaultSummary(path); };
    collection = make_shared<Collection>(path, defaultSummaryLambda, allow_new);
    collection->setWebSocket(m_web_socket);
    auto summary = collection->getSummary();

    vector<string> conflicts;
    {
        lock_guard<mutex> guard(m_coll_lock);
        if (m_coll_by_id.find(summary->id) != m_coll_by_id.end()) conflicts.emplace_back("ID");
        if (m_coll_by_slug.find(summary->slug) != m_coll_by_slug.end()) conflicts.emplace_back("slug");
    }
    if (!conflicts.empty()) {
        throw runtime_error(STR("The new collection conflicts with opened collections in fields: "
                                        << algo::join(conflicts, ", ")));
    }

    {
        lock_guard<mutex> guard(m_coll_lock);
        m_coll_by_id[summary->id] = collection;
        m_coll_by_slug[summary->slug] = collection;
        m_coll_by_path[summary->path] = collection;
    }
    return collection;
}

void Library::updateOpenCollections() {
    vector<fs::path> paths;
    {
        lock_guard<mutex> guard(m_coll_lock);
        paths.reserve(m_coll_by_id.size());
        for (auto &colEntry : m_coll_by_id) paths.push_back(colEntry.second->getSummary()->path);
    }
    m_settings->set_open_collections(paths);
}

std::shared_ptr<Collection> Library::openCollection(const fs::path &path) {
    auto collection = open(path, true);
    updateOpenCollections();
    auto summary = collection->getSummary();
    m_web_socket->add_to_broadcast_queue(BackendEvent::CreateCollection,
                                         json{{"id",      summary->id},
                                              {"summary", summary->to_json()}});
    return collection;
}

void Library::closeCollection(string id) {
    if (id.empty()) throw runtime_error("Cannot close collection: provided ID is an empty string!");

    {
        lock_guard<mutex> guard(m_coll_lock);
        auto collIt = m_coll_by_id.find(id);
        if (collIt == m_coll_by_id.end()) throw runtime_error(STR("Could not find collection with ID: " << id));
        auto collection = collIt->second;
        auto summary = collection->getSummary();
        m_coll_by_id.erase(summary->id);
        m_coll_by_slug.erase(summary->slug);
        m_coll_by_path.erase(summary->path);
        m_web_socket->add_to_broadcast_queue(BackendEvent::CloseCollection, json{{"id", summary->id}});
    }
}

shared_ptr<Collection> Library::getCollection(const string &id) {
    if (id.empty()) throw runtime_error("Cannot get collection: provided ID is an empty string!");
    shared_ptr<Collection> coll;
    {
        lock_guard<mutex> guard(m_coll_lock);
        auto collIt = m_coll_by_id.find(id);
        if (collIt == m_coll_by_id.end()) throw runtime_error(STR("Could not find collection with ID: " << id));
        coll = collIt->second;
    }
    return coll;
}

vector<std::shared_ptr<Summary>> Library::getSummaries() {
    vector<shared_ptr<Summary>> summaries;
    {
        lock_guard<mutex> guard(m_coll_lock);
        summaries.reserve(m_coll_by_id.size());
        for (const auto &collection : m_coll_by_id) summaries.emplace_back(collection.second->getSummary());
    }
    return summaries;
}
