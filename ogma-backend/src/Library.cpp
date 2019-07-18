#include <utility>

#include "Util.h"
#include "Library.h"

using namespace std;
using namespace ogma;

std::shared_ptr<Collection> Library::open(const fs::path &path, bool allow_new) {
    logger->info(STR("Opening collection at path: " << path));
    shared_ptr<Collection> collection(new Collection(path, allow_new));
    auto summary = collection->getSummary();
    m_coll_by_id[summary.id] = collection;
    m_coll_by_path[summary.path] = collection;
    return collection;
}

void Library::update_open_collections() {
    vector<fs::path> paths;
    {
        lock_guard<mutex> guard(m_coll_lock);
        paths.reserve(m_coll_by_id.size());
        for (auto &colEntry : m_coll_by_id) paths.push_back(colEntry.second->getSummary().path);
        m_settings->set_open_collections(paths);
    }
}

Library::Library(Settings *settings) : logger(util::create_logger("lib")), m_settings(settings) {
    auto paths = m_settings->get_open_collections();
    logger->debug(STR("Preparing to open " << paths.size() << " collections."));
    for (auto &path : paths) {
        try {
            open(path, false);
        } catch (exception &e) {
            logger->error(STR("Error occurred while opening collection `" << path << "`:" << e.what()));
        }
    }
    update_open_collections();
}

std::shared_ptr<Collection> Library::open_collection(const fs::path &path) {
    auto collection = open(path, true);
    update_open_collections();
    return collection;
}
