// Lane system
export const LANE_COUNT = 5;
export const LANE_WIDTH = 1.2;
export const LANE_GAP = 0.1;
export const LANE_POSITIONS = [];
for (let i = 0; i < LANE_COUNT; i++) {
    LANE_POSITIONS.push((i - Math.floor(LANE_COUNT / 2)) * (LANE_WIDTH + LANE_GAP));
}
// Result: [-2.6, -1.3, 0, 1.3, 2.6]

// Player
export const PLAYER_BODY_W = 0.6;
export const PLAYER_BODY_H = 1.0;
export const PLAYER_BODY_D = 0.4;
export const PLAYER_BOARD_W = 0.8;
export const PLAYER_BOARD_H = 0.08;
export const PLAYER_BOARD_D = 0.3;
export const PLAYER_START_LANE = 2; // middle lane (0-indexed)
export const PLAYER_Y_OFFSET = 0.54; // body center Y above ground
export const LANE_SWITCH_DURATION = 0.15; // seconds
export const JUMP_HEIGHT = 2.0;
export const JUMP_DURATION = 0.5; // seconds

// World scrolling
export const SCROLL_SPEED_START = 5.0; // units per second
export const SCROLL_SPEED_MAX = 20.0;
export const SCROLL_SPEED_INCREMENT = 0.25; // per 10 seconds
export const SPEED_INCREASE_INTERVAL = 10; // seconds

// Ground
export const GROUND_CHUNK_DEPTH = 4;
export const GROUND_CHUNKS_VISIBLE = 12;
export const GROUND_WIDTH = LANE_COUNT * (LANE_WIDTH + LANE_GAP) + 4; // extra for sidewalks

// Camera
export const CAM_FRUSTUM_SIZE = 10;
export const CAM_OFFSET_Y = 10;
export const CAM_OFFSET_Z = 10;
export const CAM_LOOK_AHEAD = 4; // look slightly ahead of player

// Route phases
export const TURN_CHUNK = 30;              // chunk index where the turn starts
export const TURN_DURATION_CHUNKS = 5;     // how many chunks the turn lasts

// Chase camera (Phase 3: Planken — Subway Surfers style)
export const CHASE_CAM_FOV = 60;
export const CHASE_CAM_Y = 3;              // height above player
export const CHASE_CAM_Z = 5;              // distance behind player
export const CHASE_CAM_LOOK_AHEAD = 8;     // look-ahead distance in front of player

// Obstacles
export const OBSTACLE_SPAWN_DISTANCE = 30; // spawn this far ahead of player
export const OBSTACLE_DESPAWN_DISTANCE = 10; // remove when this far behind player
export const OBSTACLE_MIN_GAP = 6; // minimum Z gap between obstacle rows
export const OBSTACLE_MAX_GAP = 14;

// Collectibles
export const BREZEL_SPAWN_CHANCE = 0.6; // chance per row to spawn brezels
export const BREZEL_Y_OFFSET = 0.6; // float above ground
export const BREZEL_ROTATION_SPEED = 2.0; // radians per second
export const POWERUP_SPAWN_CHANCE = 0.08; // per row

// Scoring
export const SCORE_PER_BREZEL = 1;
export const SCORE_DISTANCE_PER_SECOND = 1; // base distance score per second
export const SCORE_NEAR_MISS = 5;
export const SCORE_JUMP_OVER = 3;

// Power-up durations (seconds)
export const POWERUP_EISTEE_DURATION = 5;
export const POWERUP_RAD_DURATION = 10;
export const POWERUP_TICKET_DURATION = 8;
export const POWERUP_SPRAY_DURATION = 5;
export const POWERUP_BOARD_DURATION = 10;

// Zones
export const ZONE_CHANGE_INTERVAL = 500; // score points between zone changes
export const ZONES = [
    {
        id: 'planken',
        name: 'Planken',
        groundColor: 0xd4c5a0, // beige cobblestone
        ambientColor: 0xfff8e7,
        fogColor: 0xf5efe0,
    },
    {
        id: 'jungbusch',
        name: 'Jungbusch',
        groundColor: 0x555555, // dark asphalt
        ambientColor: 0xdde0e8,
        fogColor: 0xc8cdd6,
    },
    {
        id: 'hafen',
        name: 'Hafen',
        groundColor: 0x888888, // concrete grey
        ambientColor: 0xe0e0e0,
        fogColor: 0xd0d0d0,
    },
    {
        id: 'luisenpark',
        name: 'Luisenpark',
        groundColor: 0x4a8c3f, // grass green
        ambientColor: 0xeeffee,
        fogColor: 0xd8f0d0,
    },
];

// Supabase (same instance as main game, new table)
export const SUPABASE_URL = 'https://whelaaozlexvxkojrljp.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_F1S_lB8kCYj22c-ssxrL4A_3hTHta1h';
export const LEADERBOARD_TABLE = 'mannheim_skater_scores';
export const LEADERBOARD_LIMIT = 10;

// Quadrate system: valid block letters and max numbers
export const QUADRATE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'];
export const QUADRATE_MAX_NUMBER = 7;
export const NIGHT_MODE_SCORE = 3000;
