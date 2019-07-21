#ifndef OGMA_BACKEND_UTIL_H
#define OGMA_BACKEND_UTIL_H

#include <map>
#include <ctime>
#include <future>
#include <sstream>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <boost/filesystem.hpp>

#define OGMA_VERSION "v3.0.0"
#define OGMA_COLL_CONFIG_DIR ".ogma_v3"
#define STR(a) (ogma::util::Formatter() << a >> ogma::util::Formatter::to_str)

namespace ogma {

    namespace fs = boost::filesystem;

    namespace util {

        namespace {
            bool debug = true;
            fs::path program_dir;
            fs::path sql_dir;
            fs::path home_dir;
            std::string local_ip;

            fs::path ffmpeg_path;
            fs::path ffprobe_path;

            std::vector<std::string> colors;
            std::vector<std::string> colors_light;
            std::vector<std::string> colors_dark;
        }


        void set_debug(bool debug);

        const bool &is_debug();

        void init_util();

        const fs::path &get_program_dir();

        const fs::path &get_sql_dir();

        const fs::path &get_home_dir();

        const std::string &get_local_ip();

        const fs::path &get_ffmpeg_path();

        const fs::path &get_ffprobe_path();

        const std::vector<std::string> &get_colors();

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
        };

        std::shared_ptr<spdlog::logger> create_logger(const std::string &name);

        std::time_t get_unix_timestamp();

        std::string get_md5(const std::string &stringToHash);

        std::string slugify(std::string str);

        time_t get_video_duration(fs::path videoFile);

        std::string seconds_to_ffmpeg_duration(time_t durationSeconds);

        std::string read_file(const fs::path &path);

        std::string read_file(const fs::ifstream &in);

    }

}

#endif //OGMA_BACKEND_UTIL_H
