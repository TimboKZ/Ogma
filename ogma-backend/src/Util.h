//
// Created by euql1n on 7/16/19.
//

#ifndef OGMA_BACKEND_UTIL_H
#define OGMA_BACKEND_UTIL_H

#include <sstream>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>

#define OGMA_VERSION "v3.0.0"
#define STR(a) (ogma::util::Formatter() << a >> ogma::util::Formatter::to_str)
#define CREATE_LOGGER(n) namespace { auto logger = ogma::util::create_logger(n); } // NOLINT(cert-err58-cpp)

namespace ogma {

    namespace util {

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

        inline void setup_logger() {
            spdlog::set_pattern("%H:%M:%S %n  %^%L%$  %v");
        }

        inline std::shared_ptr<spdlog::logger> create_logger(const std::string name) {
            std::string full_name = "[" + name + "]";
            int budget = 4 - name.length();
            if (budget > 0) full_name.append(budget, ' ');
            return spdlog::stderr_color_mt(full_name);
        }

    }

}

#endif //OGMA_BACKEND_UTIL_H
