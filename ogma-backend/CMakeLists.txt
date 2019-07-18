cmake_minimum_required(VERSION 3.14)
project(ogma_backend)

set(BUILD_SHARED_LIBS "OFF")
set(CMAKE_CXX_STANDARD 14)

# Set paths to important directories
set(DB_DIR "${PROJECT_SOURCE_DIR}/sql")
set(LIB_DIR "${PROJECT_SOURCE_DIR}/libs")

# Copy all DB files
set(DB_OUTPUT_DIR "${CMAKE_CURRENT_BINARY_DIR}/db")
file(MAKE_DIRECTORY ${DB_OUTPUT_DIR})
file(GLOB db_files "${DB_DIR}/*.sql")
foreach (file ${db_files})
    configure_file(${file} ${DB_OUTPUT_DIR} COPYONLY)
endforeach ()

# Set library paths
set(HinnantDate_ROOT_DIR "${LIB_DIR}/date/include")
set(SQLite3_DIR "${LIB_DIR}/libsqlite3")
set(Sqlpp11_DIR "${LIB_DIR}/sqlpp11")
set(Sqlpp11Sqlite3_DIR "${LIB_DIR}/sqlpp11-connector-sqlite3")
set(Hashidsxx_DIR "${LIB_DIR}/hashidsxx")
set(Spdlog_DIR "${LIB_DIR}/spdlog")
set(Nfd_DIR "${LIB_DIR}/nativefiledialog")

# Add Boost
find_package(Boost 1.69 COMPONENTS program_options filesystem REQUIRED)

# Add GTK3
find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK3 REQUIRED gtk+-3.0)
include_directories(${GTK3_INCLUDE_DIRS})
link_directories(${GTK3_LIBRARY_DIRS})
add_definitions(${GTK3_CFLAGS_OTHER})

# Setup include deictories
include_directories(
        ${LIB_DIR}/include
        ${HinnantDate_ROOT_DIR}
        ${HinnantDate_ROOT_DIR}/date
        ${Sqlpp11_DIR}/include
        ${Sqlpp11Sqlite3_DIR}/include
        ${Hashidsxx_DIR}
        ${Spdlog_DIR}/include
        ${Nfd_DIR}/src/include
)

add_subdirectory(${SQLite3_DIR})
add_subdirectory(${Sqlpp11_DIR})
add_subdirectory(${Sqlpp11Sqlite3_DIR})
add_subdirectory(${Spdlog_DIR})

file(
        GLOB Lib_SRC
        "${Sqlpp11Sqlite3_DIR}/src/*.h"
        "${Sqlpp11Sqlite3_DIR}/src/*.cpp"
        "${Sqlpp11Sqlite3_DIR}/src/detail/*.h"
        "${Sqlpp11Sqlite3_DIR}/src/detail/*.cpp"
        "${Hashidsxx_DIR}/*.cpp"
)

add_executable(
        ogma
        src/main.cpp
        src/Util.cpp
        src/Server.cpp
        src/WebSocket.cpp
        src/IpcModule.cpp
        src/Settings.cpp
        src/Library.cpp
        src/Collection.cpp
        ${Lib_SRC}
)
target_link_libraries(
        ogma
        sqlite3
        sqlpp11
        pthread
        boost_program_options
        boost_filesystem
        spdlog
        ${GTK3_LIBRARIES}
        "${Nfd_DIR}/build/lib/Release/x64/libnfd.a"
)
