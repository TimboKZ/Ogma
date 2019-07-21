#include <utility>

//
// Created by euql1n on 7/14/19.
//

#include "Util.h"
#include "Server.h"

using namespace std;
using namespace ogma;

class FileServer {
    public:
        static void read_and_send(const shared_ptr<HttpServer::Response> &response,
                                  const shared_ptr<ifstream> &ifs) {
            // Read and send 128 KB at a time
            static vector<char> buffer(131072); // Safe when server is running on one thread
            streamsize read_length;
            if ((read_length = ifs->read(&buffer[0], static_cast<streamsize>(buffer.size())).gcount()) >
                0) {
                response->write(&buffer[0], read_length);
                if (read_length == static_cast<streamsize>(buffer.size())) {
                    response->send([response, ifs](const SimpleWeb::error_code &ec) {
                        if (!ec) read_and_send(response, ifs);
                        else cerr << "Connection interrupted" << endl;
                    });
                }
            }
        }
};

void serve_file(const shared_ptr<HttpServer::Response> &response,
                const shared_ptr<HttpServer::Request> &request,
                fs::path file) {
    SimpleWeb::CaseInsensitiveMultimap header;
    header.emplace("Cache-Control", "max-age=86400");
    auto ifs = make_shared<ifstream>();
    ifs->open(file.string(), ifstream::in | ios::binary | ios::ate);
    if (*ifs) {
        auto length = ifs->tellg();
        ifs->seekg(0, ios::beg);
        header.emplace("Content-Length", to_string(length));
        response->write(header);
        FileServer::read_and_send(response, ifs);
    } else {
        throw invalid_argument("could not read file!");
    }
}

Server::Server(Config *config, Library *library)
        : logger(util::create_logger("serv")), m_config(std::move(config)), m_library(std::move(library)) {
    m_web_server.config.port = m_config->web_server_port;
    m_web_server.resource["^/static/([0-9A-Za-z]+)/thumbs/([^/]+)$"]["GET"] =
            [this](const shared_ptr<HttpServer::Response> &response,
                   const shared_ptr<HttpServer::Request> &request) {
                try {
                    auto collId = request->path_match[1].str();
                    auto thumbName = request->path_match[2].str();
                    auto collection = m_library->getCollection(collId);

                    auto thumbDir = collection->getThumbDir();
                    auto path = fs::canonical(thumbDir / thumbName);

                    if (distance(thumbDir.begin(), thumbDir.end()) > distance(path.begin(), path.end()) ||
                        !equal(thumbDir.begin(), thumbDir.end(), path.begin())) {
                        throw invalid_argument("thumb must be within thumb dir");
                    }

                    serve_file(response, request, path);
                }
                catch (const exception &e) {
                    response->write(SimpleWeb::StatusCode::client_error_bad_request,
                                    "Could not open path " + request->path + ": " + e.what());
                }
            };

    m_web_server.default_resource["GET"] = [this](const shared_ptr<HttpServer::Response> &response,
                                                  const shared_ptr<HttpServer::Request> &request) {
        try {
            auto webRootPath = m_config->frontend_build_path;
            auto path = fs::canonical(webRootPath / request->path);
            // Check if path is within webRootPath
            if (distance(webRootPath.begin(), webRootPath.end()) > distance(path.begin(), path.end()) ||
                !equal(webRootPath.begin(), webRootPath.end(), path.begin())) {
                throw invalid_argument("path must be within root path");
            }
            if (boost::filesystem::is_directory(path)) path /= "index.html";

            logger->debug(STR("Serving static file: " << request->path));
            serve_file(response, request, path);
        }
        catch (const exception &e) {
            response->write(SimpleWeb::StatusCode::client_error_bad_request,
                            "Could not open path " + request->path + ": " + e.what());
        }
    };

}

void Server::start() { m_web_server.start(); }

Server::~Server() {
    m_web_server.stop();
}

