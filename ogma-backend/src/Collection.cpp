
//
// Created by euql1n on 7/17/19.
//

#include <utility>
#include "Collection.h"

using namespace std;
using namespace ogma;

const Summary &Collection::getSummary() { return m_summary; }

Collection::Collection(boost::filesystem::path path, bool allow_new) : m_path(std::move(path)) {

}

