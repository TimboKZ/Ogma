BEGIN TRANSACTION;


-- Add `isDir` column
ALTER TABLE entities
    ADD COLUMN isDir INTEGER DEFAULT 0;

-- Add cascade deletion to `entity_tags`
ALTER TABLE entity_tags
    RENAME TO TempOldTable;
CREATE TABLE entity_tags
(
    entityId TEXT,
    tagId    TEXT,
    UNIQUE (entityId, tagId),
    FOREIGN KEY (entityId) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags (id) ON DELETE CASCADE
);
INSERT INTO entity_tags (entityId, tagId)
SELECT entityId, tagId
FROM TempOldTable;
DROP TABLE TempOldTable;


COMMIT;