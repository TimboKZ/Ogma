#include <utility>
#include <sqlpp11/sqlpp11.h>
#include <sqlpp11/custom_query.h>
#include <sqlpp11/sqlite3/sqlite3.h>
#include <boost/algorithm/string.hpp>

#include "Collection.h"

using namespace std;
using namespace ogma;
namespace sql = sqlpp::sqlite3;
namespace algo = boost::algorithm;

const Summary &Collection::getSummary() { return m_summary; }

Collection::Collection(fs::path path, bool allow_new) : m_path(std::move(path)) {
    if (!fs::exists(m_path)) throw runtime_error("Specified collection path does not exist!");

    m_config_dir = m_path / ".ogma_v3";
    fs::create_directories(m_config_dir);

    m_data_db_file = m_config_dir / "data.sqlite3";
    if (!fs::exists(m_data_db_file) && !allow_new) {
        throw runtime_error("Collection has no DB file and creation is not allowed.");
    }

    sql::connection_config config;
    config.path_to_database = m_data_db_file.string();
    config.flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE; // NOLINT(hicpp-signed-bitwise)
    config.debug = true;


}
