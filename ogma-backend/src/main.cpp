#include <iostream>
#include <boost/program_options.hpp>
#include <boost/filesystem.hpp>

#include "Config.h"
#include "Server.h"
#include "WebSocket.h"

using namespace std;
using namespace Ogma;
namespace po = boost::program_options;
namespace fs = boost::filesystem;

const char *param_web_port = "web-port";
const char *param_socket_port = "socket-port";
const char *param_frontend = "frontend";

int main(int ac, char *av[]) {

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
    Config config;
    if (vm.count(param_web_port)) {
        config.web_server_port = vm[param_web_port].as<int>();
    } else {
        std::cout << "Web server port was not specified. Using default." << std::endl;
        config.web_server_port = 10548;
    }
    if (vm.count(param_socket_port)) {
        config.socket_server_port = vm[param_socket_port].as<int>();
    } else {
        std::cout << "Websocket server port was not specified. Using default." << std::endl;
        config.socket_server_port = 10549;
    }
    if (vm.count(param_frontend)) {
        config.frontend_build_path = fs::canonical(vm[param_frontend].as<string>());
    } else {
        std::cout << "Frontend build path was not specified. Aborting." << std::endl;
        return 2;
    }

    // Log effective config
    std::cout << "Effective config:" << std::endl;
    std::cout << "  - web server port: " << config.web_server_port << std::endl;
    std::cout << "  - socket server port: " << config.socket_server_port << std::endl;
    std::cout << "  - frontend build path: " << config.frontend_build_path << std::endl;
    std::cout << std::endl;

    WebSocket webSocket(config);
    Server server(config);

    thread broadcast_thread(&WebSocket::process_broadcast_queue, &webSocket);
    webSocket.start();
    server.start();
    broadcast_thread.join();
    return 0;
}

