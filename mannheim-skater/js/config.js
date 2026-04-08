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

// Graze / Stumble
export const GRAZE_OVERLAP_THRESHOLD = 0.65; // overlap ratio above this = frontal hit (generous graze zone)
export const STUMBLE_DURATION = 1.5; // seconds
export const STUMBLE_SPEED_FACTOR = 0.6; // speed multiplied by this during stumble
export const STUMBLE_RECOVERY_DURATION = 0.5; // seconds to lerp speed back

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

// Obstacle definitions (data-driven)
export const OBSTACLE_DEFS = [
    // Static — jumpable
    { type: 'poller',    lanes: 1, jumpable: true,  grazeble: true,
      shape: 'cylinder', w: 0.3, h: 0.7, d: 0.3, color: 0x888888, weight: 3 },
    { type: 'barrier',   lanes: 1, jumpable: true,  grazeble: true,
      shape: 'box', w: 0.9, h: 0.5, d: 0.2, color: 0xff8800, weight: 2 },
    { type: 'ampel',     lanes: 1, jumpable: true,  grazeble: true,
      shape: 'cylinder', w: 0.2, h: 2.0, d: 0.2, color: 0x333333, weight: 1 },
    // Static — not jumpable
    { type: 'car',       lanes: 1, jumpable: false, grazeble: true,
      shape: 'box', w: 1.0, h: 0.9, d: 1.8, color: 0xcc2222, weight: 3 },
    { type: 'car_wide',  lanes: 2, jumpable: false, grazeble: true,
      shape: 'box', w: 2.2, h: 1.0, d: 2.0, color: 0x2255aa, weight: 1 },
    { type: 'baustelle', lanes: 2, jumpable: false, grazeble: false,
      shape: 'box', w: 2.4, h: 1.2, d: 0.4, color: 0xff6600, weight: 1 },
    { type: 'tunnel',    lanes: 3, jumpable: false, grazeble: false,
      shape: 'box', w: 4.0, h: 2.5, d: 0.3, color: 0x666666, weight: 0.5 },
    // Moving
    { type: 'tram',      lanes: 2, jumpable: false, grazeble: true,
      shape: 'box', w: 2.6, h: 1.8, d: 4.0, color: 0xdd0000,
      weight: 1, moving: true, moveSpeed: 8, moveDir: 'toward' },
    { type: 'radfahrer', lanes: 1, jumpable: false, grazeble: true,
      shape: 'box', w: 0.5, h: 1.2, d: 0.8, color: 0x44aa44,
      weight: 1, moving: true, moveSpeed: 3, moveDir: 'toward' },
];

// Powerup definitions (data-driven)
export const POWERUP_DEFS = [
    { type: 'doener',  name: 'Doener',        color: 0x8B4513, emissive: 0x442200,
      duration: 0,  effect: 'shield' },
    { type: 'eistee',  name: 'Eistee',        color: 0xFFDD00, emissive: 0x665500,
      duration: 5,  effect: 'slowmo' },
    { type: 'rad',     name: 'Kurpfalz-Rad',  color: 0xDD2222, emissive: 0x550000,
      duration: 10, effect: 'bulldozer' },
    { type: 'ticket',  name: 'Monatsticket',  color: 0x22CC44, emissive: 0x005500,
      duration: 8,  effect: 'magnet' },
    { type: 'spray',   name: 'Graffiti',      color: 0xFF00FF, emissive: 0x550055,
      duration: 5,  effect: 'scoreblast' },
    { type: 'board',   name: 'Board-Up',      color: 0x00FFFF, emissive: 0x005555,
      duration: 10, effect: 'hover' },
];

// Brezel formation templates
export const BREZEL_FORMATIONS = [
    // Path formations — guide player to safe lane
    { id: 'line',      category: 'path',  weight: 3,
      points: [
        { lane: 0, z: 0 }, { lane: 0, z: 1.5 }, { lane: 0, z: 3 },
        { lane: 0, z: 4.5 }, { lane: 0, z: 6 },
    ]},
    { id: 'diagonal',  category: 'path',  weight: 2,
      points: [
        { lane: 0, z: 0 }, { lane: 1, z: 1.5 }, { lane: 2, z: 3 },
        { lane: 3, z: 4.5 }, { lane: 4, z: 6 },
    ]},
    { id: 'slalom',    category: 'path',  weight: 2,
      points: [
        { lane: 1, z: 0 }, { lane: 3, z: 1.5 }, { lane: 1, z: 3 },
        { lane: 3, z: 4.5 }, { lane: 1, z: 6 },
    ]},
    { id: 'funnel',    category: 'path',  weight: 1,
      points: [
        { lane: 0, z: 0 }, { lane: 4, z: 0 },
        { lane: 1, z: 1.5 }, { lane: 3, z: 1.5 },
        { lane: 2, z: 3 },
    ]},
    // Trick formations — risk/reward
    { id: 'jump_arc',  category: 'trick', weight: 2,
      points: [
        { lane: 2, z: 0, y: 0.5 }, { lane: 2, z: 1, y: 1.2 },
        { lane: 2, z: 2, y: 1.8 }, { lane: 2, z: 3, y: 1.2 },
        { lane: 2, z: 4, y: 0.5 },
    ]},
    { id: 'diamond',   category: 'trick', weight: 1,
      points: [
        { lane: 2, z: 0 },
        { lane: 1, z: 1.5 }, { lane: 3, z: 1.5 },
        { lane: 0, z: 3 }, { lane: 4, z: 3 },
        { lane: 1, z: 4.5 }, { lane: 3, z: 4.5 },
        { lane: 2, z: 6 },
    ]},
    { id: 'risky_edge', category: 'trick', weight: 1,
      points: [
        { lane: 0, z: 0 }, { lane: 0, z: 1.5 }, { lane: 0, z: 3 },
        { lane: 0, z: 4.5 }, { lane: 0, z: 6 },
        { lane: 0, z: 7.5 }, { lane: 0, z: 9 },
    ]},
    { id: 'v_shape',   category: 'trick', weight: 1,
      points: [
        { lane: 0, z: 0 }, { lane: 4, z: 0 },
        { lane: 1, z: 2 }, { lane: 3, z: 2 },
        { lane: 2, z: 4 },
    ]},
];

// Formation spawn settings
export const FORMATION_CHANCE = 0.7; // 70% formation, 30% random scatter

// Model definitions (for GLB loading)
export const MODEL_DEFS = {
    schloss: {
        path: 'assets/models/schloss_optimized.glb',
        targetWidth: 15, // auto-scale to fit this width in game units
        rotation: { y: Math.PI },
    },
};
