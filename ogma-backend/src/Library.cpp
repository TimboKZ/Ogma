#include <utility>

//
// Created by euql1n on 7/16/19.
//

#include "Util.h"
#include "Library.h"

using namespace std;
using namespace ogma;

CREATE_LOGGER("LIB")

std::shared_ptr<Collection> Library::open(const fs::path &path, bool allow_new) {
    shared_ptr<Collection> collection(new Collection(path, allow_new));
    return collection;
}

Library::Library(shared_ptr<Settings> settings) : m_settings(std::move(settings)) {
    auto paths = m_settings->get_open_collections();
    logger->info(STR("Preparing to open " << paths.size() << " collections."));
    for (auto &path : paths) {
        try {
            open(path, false);
        } catch (exception &e) {
            logger->error(STR("Error occurred while opening collection `" << path << "`:" << e.what()));
        }
    }
}

std::shared_ptr<Collection> Library::open_collection(const fs::path &path) {
    return open(path, true);
}

