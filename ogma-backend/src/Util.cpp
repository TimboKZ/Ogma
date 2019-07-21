#include <memory>
#include <iomanip>
#include <iostream>
#include <openssl/md5.h>
#include <boost/dll.hpp>
#include <boost/asio.hpp>
#include <boost/regex.hpp>
#include <boost/process.hpp>
#include <boost/algorithm/string.hpp>

#include "Util.h"

using namespace std;
using namespace ogma;
namespace dll = boost::dll;
namespace asio = boost::asio;
namespace algo = boost::algorithm;
namespace process = boost::process;

void util::set_debug(bool debug_state) { debug = debug_state; }

const bool &util::is_debug() { return debug; }

void util::init_util() {
    auto logger = create_logger("UTIL");

    program_dir = dll::program_location().parent_path();
    logger->debug(STR("Detected program dir: " << program_dir));

    sql_dir = program_dir / "sql";
    logger->debug(STR("Detected SQL dir: " << sql_dir));

    const char *homeDir = getenv("HOME");
    if (homeDir == nullptr) throw std::runtime_error("Could not determine user's home directory!");
    home_dir = homeDir;
    logger->debug(STR("Detected home dir: " << homeDir));

    try {
        asio::io_service io_service;
        asio::ip::tcp::socket s(io_service);
        s.connect(asio::ip::tcp::endpoint(asio::ip::address::from_string("216.58.193.206"), 80));
        local_ip = s.local_endpoint().address().to_string();
        logger->debug(STR("Detected local server IP: " << local_ip));
    } catch (exception &e) {
        logger->warn(STR("Could not determine server IP, using empty string. Error: " << e.what()));
    }

    ffmpeg_path = process::search_path("ffmpeg");
    if (ffmpeg_path.empty()) logger->warn("Could not find ffmpeg executable, thumbnail generation might not work.");
    else logger->debug(STR("Detected ffmpeg: " << ffmpeg_path));

    ffprobe_path = process::search_path("ffprobe");
    if (ffprobe_path.empty()) logger->warn("Could not find ffprobe executable, thumbnail generation might not work.");
    else logger->debug(STR("Detected ffprobe: " << ffprobe_path));

    colors = {
            "#b71c1c", "#d32f2f", "#f44336", "#880e4f", "#c2185b", "#e91e63", "#4a148c", "#7b1fa2",
            "#9c27b0", "#311b92", "#512da8", "#673ab7", "#1a237e", "#303f9f", "#3f51b5", "#0d47a1",
            "#1976d2", "#2196f3", "#006064", "#0097a7", "#004d40", "#00796b", "#009688", "#194d33",
            "#388e3c", "#4caf50", "#e65100", "#f57c00", "#bf360c", "#e64a19", "#ff5722", "#3e2723",
            "#5d4037", "#795548", "#263238", "#455a64", "#607d8b", "#000000", "#525252", "#969696",
    };
    colors_light = {
            "#eeeeee", "#d65c5c", "#d6665c", "#d6705c", "#d67a5c", "#d6855c", "#d68f5c", "#d6995c",
            "#d6a35c", "#d6ad5c", "#d6b85c", "#d6c25c", "#d6cc5c", "#d6d65c", "#ccd65c", "#c2d65c",
            "#b8d65c", "#add65c", "#a3d65c", "#99d65c", "#8fd65c", "#85d65c", "#7ad65c", "#70d65c",
            "#66d65c", "#5cd65c", "#5cd666", "#5cd670", "#5cd67a", "#5cd685", "#5cd68f", "#5cd699",
            "#5cd6a3", "#5cd6ad", "#5cd6b8", "#5cd6c2", "#5cd6cc", "#5cd6d6", "#5cccd6", "#5cc2d6",
            "#5cb8d6", "#5cadd6", "#5ca3d6", "#5c99d6", "#5c8fd6", "#5c85d6", "#5c7ad6", "#5c70d6",
            "#5c66d6", "#5c5cd6", "#665cd6", "#705cd6", "#7a5cd6", "#855cd6", "#8f5cd6", "#995cd6",
            "#a35cd6", "#ad5cd6", "#b85cd6", "#c25cd6", "#cc5cd6", "#d65cd6", "#d65ccc", "#d65cc2",
            "#d65cb8", "#d65cad", "#d65ca3", "#d65c99", "#d65c8f", "#d65c85", "#d65c7a", "#d65c70",
            "#d65c66",
    };
    colors_dark = {
            "#777777", "#8f3d3d", "#8f443d", "#8f4b3d", "#8f523d", "#8f583d", "#8f5f3d", "#8f663d",
            "#8f6d3d", "#8f743d", "#8f7a3d", "#8f813d", "#8f883d", "#8f8f3d", "#888f3d", "#818f3d",
            "#7a8f3d", "#748f3d", "#6d8f3d", "#668f3d", "#5f8f3d", "#588f3d", "#528f3d", "#4b8f3d",
            "#448f3d", "#3d8f3d", "#3d8f44", "#3d8f4b", "#3d8f52", "#3d8f58", "#3d8f5f", "#3d8f66",
            "#3d8f6d", "#3d8f74", "#3d8f7a", "#3d8f81", "#3d8f88", "#3d8f8f", "#3d888f", "#3d818f",
            "#3d7a8f", "#3d748f", "#3d6d8f", "#3d668f", "#3d5f8f", "#3d588f", "#3d528f", "#3d4b8f",
            "#3d448f", "#3d3d8f", "#443d8f", "#4b3d8f", "#523d8f", "#583d8f", "#5f3d8f", "#663d8f",
            "#6d3d8f", "#743d8f", "#7a3d8f", "#813d8f", "#883d8f", "#8f3d8f", "#8f3d88", "#8f3d81",
            "#8f3d7a", "#8f3d74", "#8f3d6d", "#8f3d66", "#8f3d5f", "#8f3d58", "#8f3d52", "#8f3d4b",
            "#8f3d44",
    };
}

const fs::path &util::get_program_dir() { return program_dir; };

const fs::path &util::get_sql_dir() { return sql_dir; };

const fs::path &util::get_home_dir() { return home_dir; }

const std::string &util::get_local_ip() { return local_ip; }

const fs::path &util::get_ffmpeg_path() { return ffmpeg_path; }

const fs::path &util::get_ffprobe_path() { return ffprobe_path; }

const std::vector<std::string> &util::get_colors() { return colors; }

using color_sink = spdlog::sinks::stdout_color_sink_mt;

class color_sink_per_level : public color_sink {
    public:
        bool should_log(spdlog::level::level_enum msg_level) const override;
};

SPDLOG_INLINE bool color_sink_per_level::should_log(spdlog::level::level_enum msg_level) const {
    return msg_level == level_.load(std::memory_order_relaxed);
}

std::shared_ptr<spdlog::logger> util::create_logger(const std::string &name) {
    // Prepare log sinks
    std::shared_ptr<color_sink> error_sink(new color_sink());
    error_sink->set_level(spdlog::level::err);
    error_sink->set_pattern("%H:%M:%S %n %^ERR %v%$");
    error_sink->set_color_mode(spdlog::color_mode::always);
    std::shared_ptr<color_sink_per_level> warn_sink(new color_sink_per_level());
    warn_sink->set_level(spdlog::level::warn);
    warn_sink->set_pattern("%H:%M:%S %n %^WRN %v%$");
    warn_sink->set_color_mode(spdlog::color_mode::always);
    std::shared_ptr<color_sink_per_level> info_sink(new color_sink_per_level());
    info_sink->set_level(spdlog::level::info);
    info_sink->set_pattern("%H:%M:%S %n %^INF%$ %v");
    info_sink->set_color_mode(spdlog::color_mode::always);
    std::shared_ptr<color_sink_per_level> debug_sink(new color_sink_per_level());
    debug_sink->set_level(debug ? spdlog::level::debug : spdlog::level::off);
    debug_sink->set_pattern("%H:%M:%S %n %^DBG %v%$");
    debug_sink->set_color_mode(spdlog::color_mode::always);
    spdlog::sinks_init_list sinks{error_sink, warn_sink, info_sink, debug_sink};

    // Create name by padding
    std::string full_name = algo::to_upper_copy(name);
    uint8_t length = 4;
    if (length > full_name.length()) full_name.insert(0, length - full_name.length(), ' ');

    // Create logger
    std::shared_ptr<spdlog::logger> new_logger(new spdlog::logger(full_name, sinks));
    new_logger->set_level(spdlog::level::debug);
    return new_logger;
}

std::string util::get_md5(const std::string &stringToHash) {
    unsigned char md5_result[MD5_DIGEST_LENGTH];
    MD5(reinterpret_cast<const unsigned char *>(stringToHash.c_str()), stringToHash.length(), md5_result);
    std::ostringstream ostream;
    ostream << std::hex << std::setfill('0');
    for (long long c: md5_result) ostream << std::setw(2) << (long long) c;
    return ostream.str();
}

time_t util::get_unix_timestamp() {
    return std::time(nullptr);
}

auto slug_replace_regex = boost::regex("[-_\\s]+");
auto slug_remove_regex = boost::regex("[^0-9A-Za-z_]+", boost::regex::icase);

std::string util::slugify(std::string str) {
    str = boost::regex_replace(str, slug_replace_regex, "_");
    str = boost::regex_replace(str, slug_remove_regex, "");
    algo::to_lower(str);
    return str;
}

template<typename... Args>
vector<string> get_command_output(Args &&...args) {
    process::ipstream is;
    process::child child(args..., process::std_out > is);

    vector<string> lines;
    string line;
    while (child.running() && getline(is, line) && !line.empty())
        lines.push_back(line);
    child.wait();
    return lines;
}

template<typename... Args>
vector<string> get_command_err(Args &&...args) {
    process::ipstream is;
    process::child child(args..., process::std_err > is);

    vector<string> lines;
    string line;
    while (child.running() && getline(is, line) && !line.empty())
        lines.push_back(line);
    child.wait();
    return lines;
}

auto duration_regex = boost::regex("^Input(\\s+)");

time_t util::get_video_duration(fs::path videoFile) {
    if (!fs::exists(videoFile)) {
        throw runtime_error(STR("Attempted count frames of non-existent file: " << videoFile));
    }

    auto ffmpeg = util::get_ffmpeg_path();
    if (ffmpeg.empty()) return -1;

    auto lines = get_command_err(ffmpeg, "-i", videoFile);
    for (auto &line : lines) {
        boost::smatch match;
        if (boost::starts_with(line, "  Duration: ")) {
            string part = line.substr(12, 8);
            vector<string> parts;
            boost::split(parts, part, boost::is_any_of(":"));
            time_t seconds = stoi(parts[2]) + stoi(parts[1]) * 60 + stoi(parts[0]) * 60 * 60;
            return seconds;
        }
    }

    return -1;
}

std::string util::seconds_to_ffmpeg_duration(time_t durationSeconds) {
    int hours = durationSeconds / 3600;
    int minutes = (durationSeconds % 3600) / 60;
    int seconds = durationSeconds % 60;

    stringstream ss;
    ss << setfill('0') << setw(2) << hours << ':' << setw(2) << minutes << ':' << setw(2) << seconds;
    return ss.str();
}

string util::read_file(const fs::path &path) {
    if (!fs::exists(path)) {
        throw runtime_error(STR("Attempted to read non-existent file: " << path));
    }
    return read_file(fs::ifstream(path));
}

string util::read_file(const fs::ifstream &in) {
    std::stringstream stream;
    stream << in.rdbuf();
    return stream.str();
}
