#include <utility>

//
// Created by euql1n on 7/14/19.
//

#include "Server.h"

using namespace std;
using namespace Ogma;

Server::Server(Config _config) : config(std::move(_config)) {
    web_server.config.port = config.web_server_port;
    web_server.default_resource["GET"] = [this](shared_ptr<HttpServer::Response> response,
                                                shared_ptr<HttpServer::Request> request) {
        try {
            auto web_root_path = config.frontend_build_path;
            auto path = boost::filesystem::canonical(web_root_path / request->path);
            // Check if path is within web_root_path
            if (distance(web_root_path.begin(), web_root_path.end()) > distance(path.begin(), path.end()) ||
                !equal(web_root_path.begin(), web_root_path.end(), path.begin()))
                throw invalid_argument("path must be within root path");
            if (boost::filesystem::is_directory(path))path /= "index.html";

            cout << "Serving file " << path << endl;

            SimpleWeb::CaseInsensitiveMultimap header;
            header.emplace("Cache-Control", "max-age=86400");
            auto ifs = make_shared<ifstream>();
            ifs->open(path.string(), ifstream::in | ios::binary | ios::ate);

            if (*ifs) {
                auto length = ifs->tellg();
                ifs->seekg(0, ios::beg);

                header.emplace("Content-Length", to_string(length));
                response->write(header);

                // Trick to define a recursive function within this scope (for example purposes)
                class FileServer {
                    public:
                        static void
                        read_and_send(const shared_ptr<HttpServer::Response> &response,
                                      const shared_ptr<ifstream> &ifs) {
                            // Read and send 128 KB at a time
                            static vector<char> buffer(131072); // Safe when server is running on one thread
                            streamsize read_length;
                            if ((read_length = ifs->read(&buffer[0], static_cast<streamsize>(buffer.size())).gcount()) >
                                0) {
                                response->write(&buffer[0], read_length);
                                if (read_length == static_cast<streamsize>(buffer.size())) {
                                    response->send([response, ifs](const SimpleWeb::error_code &ec) {
                                        if (!ec)
                                            read_and_send(response, ifs);
                                        else
                                            cerr << "Connection interrupted" << endl;
                                    });
                                }
                            }
                        }
                };
                FileServer::read_and_send(response, ifs);
            } else
                throw invalid_argument("Could not read file: " + request->path);
        }
        catch (const exception &e) {
            response->write(SimpleWeb::StatusCode::client_error_bad_request,
                            "Could not open path " + request->path + ": " + e.what());
        }
    };

}

void Server::start() {
    thread web_thread([this]() { web_server.start(); });
    web_thread.join();
    this_thread::sleep_for(chrono::seconds(1));
}

Server::~Server() {
    web_server.stop();
}
