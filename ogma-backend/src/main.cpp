#include <iostream>
#include <boost/program_options.hpp>
#include <boost/filesystem.hpp>

#include "Util.h"
#include "Config.h"
#include "Server.h"
#include "WebSocket.h"
#include "Settings.h"
#include "Library.h"
#include "IpcModule.h"

using namespace std;
using namespace ogma;
namespace po = boost::program_options;
namespace fs = boost::filesystem;

const char *param_web_port = "web-port";
const char *param_socket_port = "socket-port";
const char *param_frontend = "frontend";

CREATE_LOGGER("MAIN")

int main(int ac, char *av[]) {
    util::setup_logger();

    // Parse command line options
    po::options_description desc("Allowed options");
    desc.add_options()
            ("help", "produce help message")
            (param_web_port, po::value<int>(), "port on which the web server will listen")
            (param_socket_port, po::value<int>(), "port on which the websocket server will listen")
            (param_frontend, po::value<string>(), "path to frontend build");
    po::variables_map vm;
    po::store(po::parse_command_line(ac, av, desc), vm);
    po::notify(vm);
    if (vm.count("help")) {
        std::cout << desc << std::endl;
        return 1;
    }

    // Prepare config
    shared_ptr<Config> config(new Config());
    if (vm.count(param_web_port)) {
        config->web_server_port = vm[param_web_port].as<int>();
    } else {
        logger->info("Web server port was not specified. Using default.");
        config->web_server_port = 10548;
    }
    if (vm.count(param_socket_port)) {
        config->socket_server_port = vm[param_socket_port].as<int>();
    } else {
        logger->info("Websocket server port was not specified. Using default.");
        config->socket_server_port = 10549;
    }
    if (vm.count(param_frontend)) {
        config->frontend_build_path = fs::canonical(vm[param_frontend].as<string>());
    } else {
        logger->error("Frontend build path was not specified. Aborting.");
        return 2;
    }

    // Log effective config
    logger->info("Effective config:");
    logger->info(STR("  - web server port: " << config->web_server_port));
    logger->info(STR("  - socket server port: " << config->socket_server_port));
    logger->info(STR("  - frontend build path: " << config->frontend_build_path));

    // Find home directory
    fs::path ogma_dir; // TODO: Find home dir
    logger->info(STR("ogma directory is set to: " << ogma_dir));

    // Prepare pointers
    shared_ptr<Settings> settings(new Settings(ogma_dir));
    shared_ptr<Library> library(new Library(settings));
    shared_ptr<IpcModule> ipcModule(new IpcModule(settings, library));

    shared_ptr<WebSocket> webSocket(new WebSocket(config, ipcModule));
    ipcModule->set_web_socket(webSocket);

    Server server(config);

    thread broadcast_thread(&WebSocket::process_broadcast_queue, webSocket.get());
    webSocket->start();
    server.start();
    broadcast_thread.join();
    return 0;
}

