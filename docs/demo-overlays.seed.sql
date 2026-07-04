-- CloudTAK hackathon demo overlay seed.
-- Run against the CloudTAK DB, not the TAK Server cot DB.
--
-- Example:
-- psql 'postgres://cloudtak:cloudtak@localhost:5432/tak_ps_etl' -f docs/demo-overlays.seed.sql

WITH bm AS (
    INSERT INTO basemaps (
        name,
        url,
        protocol,
        minzoom,
        maxzoom,
        format,
        type,
        tilesize,
        attribution,
        scheme,
        overlay,
        sharing_enabled
    )
    SELECT
        'OpenStreetMap',
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'zxy',
        0,
        19,
        'png',
        'raster',
        256,
        '© OpenStreetMap contributors',
        'xyz',
        false,
        true
    WHERE NOT EXISTS (
        SELECT 1 FROM basemaps WHERE name = 'OpenStreetMap'
    )
    RETURNING id
),
selected AS (
    SELECT id FROM bm
    UNION
    SELECT id FROM basemaps WHERE name = 'OpenStreetMap'
    ORDER BY id
    LIMIT 1
)
INSERT INTO settings (key, value)
SELECT 'map::basemap', id::text FROM selected
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO profile_overlays (
    name,
    username,
    pos,
    type,
    opacity,
    visible,
    styles,
    mode,
    mode_id,
    url
)
SELECT
    'OpenStreetMap',
    'cloudtak',
    0,
    'raster',
    1,
    true,
    '[]'::jsonb,
    'basemap',
    selected.id::text,
    '/api/basemap/' || selected.id || '/tiles'
FROM selected
WHERE NOT EXISTS (
    SELECT 1
    FROM profile_overlays
    WHERE username = 'cloudtak'
      AND mode = 'basemap'
);

DELETE FROM profile_overlays
WHERE username = 'cloudtak'
  AND name IN (
      'Layer 1: 경계 구역',
      'Layer 2: 드론 위험 구역',
      'Layer 3: 통신 불가 구역'
  );

INSERT INTO profile_overlays (
    name,
    username,
    pos,
    type,
    opacity,
    visible,
    styles,
    mode,
    mode_id,
    url
) VALUES
(
    'Layer 1: 경계 구역',
    'cloudtak',
    10,
    'geojson',
    1,
    true,
    '[]'::jsonb,
    'demo',
    'boundary-zones',
    '/demo-layers/boundary-zones.geojson'
),
(
    'Layer 2: 드론 위험 구역',
    'cloudtak',
    11,
    'geojson',
    1,
    true,
    '[]'::jsonb,
    'demo',
    'drone-risk-zones',
    '/demo-layers/drone-risk-zones.geojson'
),
(
    'Layer 3: 통신 불가 구역',
    'cloudtak',
    12,
    'geojson',
    1,
    true,
    '[]'::jsonb,
    'demo',
    'no-comms-zones',
    '/demo-layers/no-comms-zones.geojson'
);

UPDATE profile_overlays
SET styles = jsonb_build_array(
    jsonb_build_object(
        'id', 'boundary-fill',
        'type', 'fill',
        'source', id::text,
        'paint', jsonb_build_object(
            'fill-color', '#2f80ed',
            'fill-opacity', 0.28
        )
    ),
    jsonb_build_object(
        'id', 'boundary-outline',
        'type', 'line',
        'source', id::text,
        'paint', jsonb_build_object(
            'line-color', '#1554a1',
            'line-width', 2.5,
            'line-opacity', 0.9
        )
    )
)
WHERE username = 'cloudtak'
  AND name = 'Layer 1: 경계 구역';

UPDATE profile_overlays
SET styles = jsonb_build_array(
    jsonb_build_object(
        'id', 'drone-fill',
        'type', 'fill',
        'source', id::text,
        'paint', jsonb_build_object(
            'fill-color', '#f59f00',
            'fill-opacity', 0.34
        )
    ),
    jsonb_build_object(
        'id', 'drone-outline',
        'type', 'line',
        'source', id::text,
        'paint', jsonb_build_object(
            'line-color', '#b06b00',
            'line-width', 2.5,
            'line-opacity', 0.95
        )
    )
)
WHERE username = 'cloudtak'
  AND name = 'Layer 2: 드론 위험 구역';

UPDATE profile_overlays
SET styles = jsonb_build_array(
    jsonb_build_object(
        'id', 'nocomms-fill',
        'type', 'fill',
        'source', id::text,
        'paint', jsonb_build_object(
            'fill-color', '#d9480f',
            'fill-opacity', 0.3
        )
    ),
    jsonb_build_object(
        'id', 'nocomms-outline',
        'type', 'line',
        'source', id::text,
        'paint', jsonb_build_object(
            'line-color', '#8f2f0b',
            'line-width', 2.5,
            'line-opacity', 0.95
        )
    )
)
WHERE username = 'cloudtak'
  AND name = 'Layer 3: 통신 불가 구역';
