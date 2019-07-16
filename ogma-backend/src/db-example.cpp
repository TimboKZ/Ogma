#include <iostream>

#include <sqlpp11/sqlpp11.h>
#include <sqlpp11/custom_query.h>
#include <sqlpp11/sqlite3/sqlite3.h>

#include "TabSample.h"

namespace sql = sqlpp::sqlite3;

int main() {
    std::cout << "Starting sequence..." << std::endl;

    sql::connection_config config;
    config.path_to_database = ":memory:";
    config.flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE;
    config.debug = true;

    sql::connection db(config);
    std::cerr << __FILE__ << ": " << __LINE__ << std::endl;
    db.execute("CREATE TABLE tab_sample (\
        alpha bigint(20) DEFAULT NULL,\
        beta varchar(255) DEFAULT NULL,\
        gamma bool DEFAULT NULL\
    )");

    TabSample tab;
    for (const auto &row : db(select(all_of(tab)).from(tab).unconditionally())) {
        int64_t alpha = row.alpha;
        std::string beta = row.beta;
        bool gamma = row.gamma;
    };

    std::cout << "Done..." << std::endl;
    return 0;
}