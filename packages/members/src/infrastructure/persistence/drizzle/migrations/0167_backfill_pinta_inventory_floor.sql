-- Preserve every admitted format, including future values. A tombstone still records the live format.
INSERT INTO members.creation_inventory_floors (user_id, account_id, audience, tool, required_version)
SELECT DISTINCT ON (c.user_id, c.audience, c.tool)
       c.user_id, c.account_id, c.audience, c.tool, v.version
FROM members.creations AS c
CROSS JOIN LATERAL (VALUES (c.kind, c.format_version), (c.pending_kind, CASE WHEN c.pending_revision IS NOT NULL THEN c.pending_format_version END)) AS v(kind, version)
WHERE c.tool = 'pinta'
  AND v.kind IN ('tilemap','tileset','vector-tileset','map-set')
  AND v.version >= 7
ORDER BY c.user_id, c.audience, c.tool, v.version DESC, c.account_id
ON CONFLICT (user_id, audience, tool) DO UPDATE
SET required_version = GREATEST(creation_inventory_floors.required_version, EXCLUDED.required_version);