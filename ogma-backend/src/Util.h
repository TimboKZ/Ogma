//
// Created by euql1n on 7/16/19.
//

#ifndef OGMA_BACKEND_UTIL_H
#define OGMA_BACKEND_UTIL_H

#include <sstream>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>

#define OGMA_VERSION "v3.0.0"
#define STR(a) (Formatter() << a >> Formatter::to_str)
#define CREATE_LOGGER(n) namespace { auto logger = spdlog::stdout_color_mt(n); } // NOLINT(cert-err58-cpp)

namespace Ogma {


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

            Formatter(const Formatter &) = delete;
            Formatter &operator=(Formatter &);
    };

}

#endif //OGMA_BACKEND_UTIL_H
