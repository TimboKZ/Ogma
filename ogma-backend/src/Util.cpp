#include <memory>
#include <boost/dll.hpp>
#include <boost/asio.hpp>
#include <boost/algorithm/string.hpp>

#include "Util.h"

using namespace std;
using namespace ogma;
namespace dll = boost::dll;
namespace asio = boost::asio;
namespace algo = boost::algorithm;

void util::set_debug(bool debug_state) { debug = debug_state; }

const bool &util::is_debug() { return debug; }

void util::init_util() {
    auto logger = create_logger("UTIL");

    program_path = dll::program_location();
    logger->debug(STR("Detected program path: " << program_path));

    sql_path = program_path / "sql";
    logger->debug(STR("Detected SQL path: " << program_path));

    const char *homePath = getenv("HOME");
    if (homePath == nullptr) throw std::runtime_error("Could not determine user's home path!");
    home_path = homePath;
    logger->debug(STR("Detected home path: " << program_path));

    try {
        asio::io_service io_service;
        asio::ip::tcp::socket s(io_service);
        s.connect(asio::ip::tcp::endpoint(asio::ip::address::from_string("216.58.193.206"), 80));
        local_ip = s.local_endpoint().address().to_string();
        logger->debug(STR("Detected local server IP: " << local_ip));
    } catch (exception &e) {
        logger->warn(STR("Could not determine server IP, using empty string. Error: " << e.what()));
    }

}

const fs::path &util::get_program_path() { return program_path; };

const fs::path &util::get_sql_path() { return sql_path; };

const fs::path &util::get_home_path() { return home_path; }

const std::string &util::get_local_ip() { return local_ip; }

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
