//
// Created by euql1n on 7/16/19.
//

#ifndef OGMA_BACKEND_LIBRARY_H
#define OGMA_BACKEND_LIBRARY_H

#include "Settings.h"

namespace Ogma {

    class Library {

        private:
            std::shared_ptr<Settings> m_settings;

        public:
            Library(const std::shared_ptr<Settings> &mSettings);
    };

}

#endif //OGMA_BACKEND_LIBRARY_H
