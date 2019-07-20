#include <utility>

#include "Settings.h"

using namespace std;
using namespace ogma;

const char *version_param = "version";
const char *collections_param = "open_collections";

ogma::Settings::Settings(fs::path ogma_dir)
        : logger(util::create_logger("set")), m_ogma_dir(std::move(ogma_dir)) {
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
                for (string path : m_settings_json[collections_param]) m_open_collections.emplace_back(path);
            }
        }
    }

    if (overwriteSettings) {
        m_settings_json[version_param] = OGMA_VERSION;
        persist();
    }

    logger->info(STR("Effective settings: " << m_settings_json));

    for (auto &element : m_settings_json[collections_param]) {
        m_open_collections.push_back(fs::canonical(element));
    }
}

void Settings::persist() {
    m_settings_json[version_param] = OGMA_VERSION;
    m_settings_json[collections_param] = json::array();
    for (auto &path : m_open_collections) m_settings_json[collections_param].emplace_back(path.string());

    fs::ofstream ofs(m_ogma_settings_file);
    ofs << m_settings_json.dump(2) << endl;
}

const vector<fs::path> &Settings::get_open_collections() {
    return m_open_collections;
}

void Settings::set_open_collections(const vector<fs::path> &open_collections) {
    m_open_collections = open_collections;
    persist();
}

