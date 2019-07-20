CREATE TABLE IF NOT EXISTS version (version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS properties
(
    name  TEXT PRIMARY KEY,
    value TEXT
);
CREATE TABLE IF NOT EXISTS entities
(
    id      TEXT PRIMARY KEY,
    hash    TEXT UNIQUE,
    nixPath TEXT UNIQUE,
    isDir   INTEGER
);
CREATE TABLE IF NOT EXISTS tags
(
    id    TEXT PRIMARY KEY,
    name  TEXT,
    color TEXT
);
CREATE TABLE IF NOT EXISTS entity_tags
(
    entityId TEXT,
    tagId    TEXT,
    UNIQUE (entityId, tagId),
    FOREIGN KEY (entityId) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags (id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sink_tags
(
    entityId TEXT,
    tagId    TEXT,
    UNIQUE (entityId, tagId),
    FOREIGN KEY (entityId) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags (id) ON DELETE CASCADE
);
