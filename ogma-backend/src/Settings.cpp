//
// Created by euql1n on 7/16/19.
//

#include "Util.h"
#include "Settings.h"

using namespace std;
using namespace ogma;

const char *version_param = "version";
const char *collections_param = "open_collections";

CREATE_LOGGER("SET")

ogma::Settings::Settings(const fs::path &ogma_dir) {
    m_ogma_dir = fs::canonical(ogma_dir);
    fs::create_directories(m_ogma_dir);

    bool overwriteSettings = true;
    m_ogma_settings_file = m_ogma_dir / ".ogmarc.v3.json";
    if (fs::exists(m_ogma_settings_file)) {
        fs::ifstream ifs(m_ogma_settings_file);
        m_settings_json = json::parse(ifs);
        if (m_settings_json.contains(version_param)) {
            string ogmaVersion = m_settings_json[version_param];
            if (ogmaVersion != OGMA_VERSION) {
                throw runtime_error(STR("ogma version mismatch: expected " << OGMA_VERSION
                                                                           << ", found " << ogmaVersion
                                                                           << " in the settings file."));
            }

            if (m_settings_json.contains(collections_param) && m_settings_json[collections_param].is_array()) {
                overwriteSettings = false;
            }
        }
    }

    if (overwriteSettings) {
        m_settings_json[version_param] = OGMA_VERSION;
        m_settings_json[collections_param] = json::array();
        fs::ofstream ofs(m_ogma_settings_file);
        ofs << m_settings_json.dump() << endl;
    }

    logger->info(STR("Effective settings: " << m_settings_json));

    for (auto &element : m_settings_json[collections_param]) {
        m_open_collections.push_back(fs::canonical(element));
    }
}

const vector<fs::path> &Settings::get_open_collections() {
    return m_open_collections;
}
