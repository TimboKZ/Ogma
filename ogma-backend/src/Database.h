#ifndef OGMA_BACKEND_DATABASE_H
#define OGMA_BACKEND_DATABASE_H

#include <utility>
#include <sqlpp11/select.h>
#include <sqlpp11/insert.h>
#include <sqlpp11/update.h>
#include <sqlpp11/remove.h>
#include <sqlpp11/custom_query.h>
#include <boost/filesystem.hpp>
#include <sqlpp11/sqlite3/sqlite3.h>

#include "Util.h"
#include "tables/tables_collection.h"

namespace ogma {

    namespace sqlite3 = sqlpp::sqlite3;
    namespace fs = boost::filesystem;

    namespace db {

        typedef std::shared_ptr<sqlite3::connection> db_ptr;

        namespace {

            const char *sql_collection_schema_file = "collection-schema.sql";
            const char *sql_thumbnails_schema_file = "thumbnail-schema.sql";
            std::string sql_collection_schema;
            std::string sql_thumbnails_schema;

        }

        enum Sql {
            Collection,
            Thumbnails,
            None,
        };

        const int sql_collection_schema_version = 1;

        db_ptr create_db(const fs::path &dbFile, bool debug = false);;

        const std::string &get_schema(Sql schema);

        void run_schema(const db_ptr &db, Sql schema);

        bool table_exists(const db_ptr &db, const std::string &table);

    }

}


#endif //OGMA_BACKEND_DATABASE_H
