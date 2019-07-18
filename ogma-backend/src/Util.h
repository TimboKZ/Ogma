#ifndef OGMA_BACKEND_UTIL_H
#define OGMA_BACKEND_UTIL_H

#include <map>
#include <sstream>
#include <iostream>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <boost/filesystem.hpp>

#define OGMA_VERSION "v3.0.0"
#define STR(a) (ogma::util::Formatter() << a >> ogma::util::Formatter::to_str)

namespace ogma {

    namespace fs = boost::filesystem;

    namespace util {

        namespace {
            bool debug = true;
            fs::path program_path;
            fs::path sql_path;
            fs::path home_path;
            std::string local_ip;
        }

        void set_debug(bool debug);

        const bool &is_debug();

        void init_util();

        const fs::path &get_program_path();

        const fs::path &get_sql_path();

        const fs::path &get_home_path();

        const std::string &get_local_ip();

        class Formatter {
            public:
                Formatter() = default;

                ~Formatter() = default;

                template<typename Type>
                Formatter &operator<<(const Type &value) {
                    stream_ << value;
                    return *this;
                }

                std::string str() const { return stream_.str(); }

                explicit operator std::string() const { return stream_.str(); }

                enum ConvertToString {
                    to_str
                };

                std::string operator>>(ConvertToString) { return stream_.str(); }

            private:
                std::stringstream stream_;

                Formatter(const Formatter &) = delete; // NOLINT(hicpp-use-equals-delete,modernize-use-equals-delete)
//            Formatter &operator=(Formatter &);
        };

        std::shared_ptr<spdlog::logger> create_logger(const std::string &name);

    }

}

#endif //OGMA_BACKEND_UTIL_H
