//
// Created by euql1n on 7/17/19.
//

#ifndef OGMA_BACKEND_COLLECTION_H
#define OGMA_BACKEND_COLLECTION_H

#include <boost/filesystem.hpp>

namespace ogma {

    namespace fs = boost::filesystem;

    struct Summary {
        std::string id;
        fs::path path;
        std::string slug;
        std::string name;
        std::string icon;
        std::string color;
    };

    class Collection {

        private:
            fs::path m_path;

            Summary m_summary;

        public:
            explicit Collection(boost::filesystem::path path, bool allow_new = false);
            const Summary &getSummary();

    };

}

#endif //OGMA_BACKEND_COLLECTION_H
