#include <sqlpp11/sqlpp11.h>
#include <sqlpp11/verbatim.h>
#include <sqlpp11/custom_query.h>
#include <boost/algorithm/string.hpp>

#include "Database.h"

using namespace std;
using namespace ogma;
using namespace sqlpp;
namespace algo = boost::algorithm;

db::db_ptr db::create_db(const boost::filesystem::path &dbFile, bool debug) {
    sqlite3::connection_config config;
    config.path_to_database = dbFile.string();
    config.flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE; // NOLINT(hicpp-signed-bitwise)
    config.debug = debug;

    auto db = make_shared<sqlite3::connection>(config);

    return db;
}

const string &db::get_schema(db::Sql schema) {
    switch (schema) {
        case Sql::Collection:
            if (sql_collection_schema.empty()) {
                sql_collection_schema = util::read_file(util::get_sql_dir() / sql_collection_schema_file);
            }
            return sql_collection_schema;
        case None:
        default:
            throw runtime_error(STR("Invalid SQL schema requested: " << schema));
    }
}

void db::run_schema(const db::db_ptr &db, db::Sql schema) {
    auto schema_full = get_schema(schema);
    vector<string> statements;
    algo::split(statements, schema_full, boost::is_any_of(";"));
    for (auto &statement : statements) {
        algo::trim(statement);
        if (!statement.empty()) db->execute(statement);
    }
}

SQLPP_ALIAS_PROVIDER(tableExists);

bool db::table_exists(const db::db_ptr &db, const std::string &table) {
    auto
            query = custom_query(sqlpp::verbatim("SELECT name FROM sqlite_master WHERE type='table' AND name = "),
                                 table)
            .with_result_type_of(sqlpp::select(sqlpp::value(1).as(tableExists)));
    auto result = db->operator()(query);
    return !result.empty();
}

