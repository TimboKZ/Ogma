CREATE TABLE IF NOT EXISTS thumbnails
(
    id      TEXT PRIMARY KEY UNIQUE,
    hash    TEXT UNIQUE,
    nixPath TEXT UNIQUE,
    isDir   INTEGER,
    epoch   INTEGER
);
