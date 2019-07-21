#include <iostream>
#include <boost/program_options.hpp>
#include <boost/algorithm/string.hpp>

#include "Util.h"
#include "Config.h"
#include "Server.h"
#include "WebSocket.h"
#include "Settings.h"
#include "Library.h"
#include "IpcModule.h"

using namespace std;
using namespace ogma;
namespace fs = boost::filesystem;
namespace algo = boost::algorithm;
namespace po = boost::program_options;

const char *param_web_port = "web-port";
const char *param_socket_port = "socket-port";
const char *param_frontend = "frontend";
const char *param_ogma_dir = "ogma-dir";
const char *param_debug = "debug";

int main(int ac, char *av[]) {
    // Parse command line options
    po::options_description desc("Allowed options");
    desc.add_options()
            ("help", "produce help message")
            (param_web_port, po::value<int>(), "port on which the web server will listen")
            (param_socket_port, po::value<int>(), "port on which the websocket server will listen")
            (param_frontend, po::value<string>(), "path to frontend build")
            (param_ogma_dir, po::value<string>(), "path to Ogma config folder")
            (param_debug, po::bool_switch()->default_value(false), "show debug messages");
    po::variables_map vm;
    try {
        po::store(po::parse_command_line(ac, av, desc), vm);
        po::notify(vm);
    } catch (exception &e) {
        cerr << "Error parsing arguments: " << e.what() << endl;
        cout << desc;
        return 1;
    }
    if (vm.count("help")) {
        cout << desc;
        return 1;
    }

    // Enable debug messages if needed
    util::set_debug(vm[param_debug].as<bool>());
    auto logger = util::create_logger("main");
    if (util::is_debug()) logger->info(STR("Running in debug mode."));

    // Initialize util to determine home path, etc.
    try {
        util::init_util();
    } catch (exception &e) {
        logger->error(e.what());
        return 2;
    }

    // Prepare config
    unique_ptr<Config> config(new Config());
    if (vm.count(param_web_port)) {
        config->web_server_port = vm[param_web_port].as<int>();
    } else {
        logger->warn("Web server port was not specified. Using default.");
        config->web_server_port = 10548;
    }
    if (vm.count(param_socket_port)) {
        config->socket_server_port = vm[param_socket_port].as<int>();
    } else {
        logger->warn("Websocket server port was not specified. Using default.");
        config->socket_server_port = 10549;
    }
    if (vm.count(param_frontend)) {
        config->frontend_build_path = fs::absolute(vm[param_frontend].as<string>());
    } else {
        logger->error("Frontend build path was not specified. Exiting.");
        return 3;
    }
    if (vm.count(param_ogma_dir)) {
        string inputPath = vm[param_ogma_dir].as<string>();
        if (algo::contains(inputPath, "~")) {
            logger->error(STR("Supplied Ogma config directory path contains tilde (~). "
                              "Please provide a full path since special characters will not be expanded. "
                              "Path: " << inputPath));
            return 4;
        }
        config->ogma_dir = fs::absolute(inputPath).lexically_normal();
    } else {
        config->ogma_dir = util::get_home_dir() / ".ogma";
    }

    // Log effective config
    logger->info("Effective config:");
    logger->info(STR("  - web server port: " << config->web_server_port));
    logger->info(STR("  - socket server port: " << config->socket_server_port));
    logger->info(STR("  - frontend build path: " << config->frontend_build_path));
    logger->info(STR("  - Ogma config directory: " << config->ogma_dir));

    // Prepare pointers
    unique_ptr<Settings> settings(new Settings(config->ogma_dir));
    unique_ptr<Library> library(new Library(settings.get()));
    unique_ptr<IpcModule> ipcModule(new IpcModule(settings.get(), library.get()));

    unique_ptr<WebSocket> webSocket(new WebSocket(config.get(), ipcModule.get()));
    library->setWebSocket(webSocket.get());
    ipcModule->set_web_socket(webSocket.get());

    unique_ptr<Server> server(new Server(config.get(), library.get()));

    thread socket_thread(&WebSocket::start, webSocket.get());
    thread web_thread(&Server::start, server.get());
    thread broadcast_thread(&WebSocket::process_broadcast_queue, webSocket.get());
    web_thread.join();
    socket_thread.join();
    broadcast_thread.join();
    return 0;
}

