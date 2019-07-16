cmake_minimum_required(VERSION 3.14)
project(ogma_backend)

set(CMAKE_CXX_STANDARD 14)

set(LIB_DIR "${PROJECT_SOURCE_DIR}/libs")
set(HinnantDate_ROOT_DIR "${LIB_DIR}/date/include")
set(SQLite3_DIR "${LIB_DIR}/libsqlite3/cmake")
set(Sqlpp11_DIR "${LIB_DIR}/sqlpp11")
set(Sqlpp11Sqlite3_DIR "${LIB_DIR}/sqlpp11-connector-sqlite3")
set(Hashidsxx_DIR "${LIB_DIR}/hashidsxx")

find_package(Boost 1.69 COMPONENTS program_options filesystem REQUIRED)
find_package(SQLite3 REQUIRED)

include_directories(
        ${LIB_DIR}/include
        ${HinnantDate_ROOT_DIR}
        ${HinnantDate_ROOT_DIR}/date
        ${Sqlpp11_DIR}/include
        ${Sqlpp11Sqlite3_DIR}/include
        ${Hashidsxx_DIR}
)

add_subdirectory(${Sqlpp11_DIR})
add_subdirectory(${Sqlpp11Sqlite3_DIR})

file(
        GLOB Lib_SRC
        "${Sqlpp11Sqlite3_DIR}/src/*.h"
        "${Sqlpp11Sqlite3_DIR}/src/*.cpp"
        "${Sqlpp11Sqlite3_DIR}/src/detail/*.h"
        "${Sqlpp11Sqlite3_DIR}/src/detail/*.cpp"
        "${Hashidsxx_DIR}/*.cpp"
)

add_executable(
        ogma_backend
        src/main.cpp
        src/Server.cpp
        src/WebSocket.cpp
        src/EnvironmentManager.cpp
        ${Lib_SRC}
)
target_link_libraries(
        ogma_backend
        sqlite3
        sqlpp11
        pthread
        boost_program_options
        boost_filesystem
)
