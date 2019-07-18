//
// Created by euql1n on 7/14/19.
//

#ifndef OGMA_BACKEND_CONFIG_H
#define OGMA_BACKEND_CONFIG_H

#include <boost/filesystem.hpp>

namespace ogma {

    namespace fs = boost::filesystem;

    struct Config {
        int web_server_port;
        int socket_server_port;
        fs::path frontend_build_path;
        fs::path ogma_dir;
    };

}

#endif //OGMA_BACKEND_CONFIG_H
