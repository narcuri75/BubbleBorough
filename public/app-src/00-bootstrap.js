const STORAGE_KEY = "bubble-borough-save-v1";
const WEBSURF_MAIL_READ_STORAGE_KEY = "bubble-borough-websurf-read-mail-v1";
const WEBSURF_SILENCED_SENDERS_STORAGE_KEY = "bubble-borough-websurf-silenced-senders-v1";
const SUPABASE_URL = "https://idljwswasrxtifbkioyg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qxhGQH_faz0TDw4_AbYsGw_iYljA_9s";
const INVITE_FRIEND_ENABLED = false;
const CLOUD_AUTH_SESSION_KEY = "bubble-borough-cloud-auth-v1";
const CLOUD_SAVE_META_KEY = "bubble-borough-cloud-meta-v1";
const CLOUD_REPLACEMENT_BACKUP_KEY = "bubble-borough-cloud-replacement-backup-v1";
const CLOUD_SYNC_DEBOUNCE_MS = 3000;
const CLOUD_SYNC_MIN_INTERVAL_MS = 60000;
const SAVE_FILE_FORMAT = "bubble-borough-save";
const SAVE_FILE_EXPORT_VERSION = 1;
const STATE_VERSION = 50;
const CUSTOM_IMAGE_DB_NAME = "bubble-borough-custom-images-v1";
const CUSTOM_IMAGE_DB_VERSION = 1;
const CUSTOM_IMAGE_DB_STORE = "images";
const CUSTOM_IMAGE_STORAGE_TEST_ID = "__bb-custom-image-storage-test__";
const APP_CONFIG_PATH = "assets/app-config.json";
const HARDWARE_ACCELERATION_NOTICE_DISMISSED_KEY = "bubble-borough-hardware-acceleration-dismissed-v3";
const STARTING_COINS = 20;
const DEFAULT_APP_CONFIG = Object.freeze({
  wallpaperEngine: true
});
const DESKTOP_PORTABLE_BACKUP_INTERVAL_MS = 10 * 60 * 1000;
const DEFERRED_STATE_SAVE_MIN_INTERVAL_MS = 4000;
const DEFERRED_TICK_UI_MIN_INTERVAL_MS = 2500;
const SOFTWARE_RENDERER_PATTERNS = Object.freeze([
  /swiftshader/i,
  /llvmpipe/i,
  /software/i,
  /basic render/i,
  /\bwarp\b/i
]);
let appConfig = DEFAULT_APP_CONFIG;
const DEBUG_AUTHORIZED_USER_ID = "37128461-efc9-4997-bdc9-b5e55d6c02df";
const DEBUG_TOOLS_PREFERENCE_KEY = "bubble-borough-debug-tools-v1";
const DEBUG_FISH_BEHAVIOR_LOG_LIMIT = 600;
const TUTORIAL_MODE_DISABLED = "disabled";
const TUTORIAL_MODE_GUIDED = "guided-live";
const TUTORIAL_MODE_INFO_ONLY = "info-only";
const TUTORIAL_STAGE_SPLASH = "splash";
const TUTORIAL_STAGE_ADOPT_FISH = "adopt-fish";
const TUTORIAL_STAGE_ADOPT_FISH_DONE = "adopt-fish-done";
const TUTORIAL_STAGE_PLACE_DECORATION = "place-decoration";
const TUTORIAL_STAGE_PLACE_DECORATION_DONE = "place-decoration-done";
const TUTORIAL_STAGE_FEED_FISH = "feed-fish";
const TUTORIAL_STAGE_FEED_FISH_DONE = "feed-fish-done";
const TUTORIAL_STAGE_CLEAN_TANK = "clean-tank";
const TUTORIAL_STAGE_CLEAN_TANK_DONE = "clean-tank-done";
const TUTORIAL_STAGE_TOOLBAR_REVEAL = "toolbar-reveal";
const TUTORIAL_STAGE_COMPLETED = "completed";
const TUTORIAL_STAGE_IDS = Object.freeze([
  TUTORIAL_STAGE_SPLASH,
  TUTORIAL_STAGE_ADOPT_FISH,
  TUTORIAL_STAGE_ADOPT_FISH_DONE,
  TUTORIAL_STAGE_PLACE_DECORATION,
  TUTORIAL_STAGE_PLACE_DECORATION_DONE,
  TUTORIAL_STAGE_FEED_FISH,
  TUTORIAL_STAGE_FEED_FISH_DONE,
  TUTORIAL_STAGE_CLEAN_TANK,
  TUTORIAL_STAGE_CLEAN_TANK_DONE,
  TUTORIAL_STAGE_TOOLBAR_REVEAL,
  TUTORIAL_STAGE_COMPLETED
]);
const TUTORIAL_FEATURE_MANAGE_FISH = "manage-fish";
const TUTORIAL_FEATURE_EDIT_TANK = "edit-tank";
const TUTORIAL_FEATURE_SETTINGS = "settings";
const TUTORIAL_FEATURE_IDS = Object.freeze([]);
const TUTORIAL_STORE_COST_CAP = 10;
const TUTORIAL_SPLASH_DURATION_MS = 7000;
const TUTORIAL_STORE_CLOSE_DELAY_MS = 650;
const TUTORIAL_TASK_COMPLETE_DELAY_MS = 2200;
const TUTORIAL_POST_FEED_DELAY_MS = 5000;
const TUTORIAL_TOOLBAR_REVEAL_STEP_MS = 170;
const TUTORIAL_TOOLBAR_REVEAL_SETTLE_MS = 700;
const TUTORIAL_BASIC_FOOD_REWARD_COUNT = 5;
const TUTORIAL_BASIC_FOOD_KEY = "basic";
const TUTORIAL_TOAST_DECOR_DONE = "tutorial-decor-done";
const VIEW_LOCK_SEQUENCE = "viewlock";
const HIDDEN_KEY_SEQUENCE_BUFFER_LENGTH = VIEW_LOCK_SEQUENCE.length;
// Set true to letterbox/pillarbox the aquarium at 16:9 instead of filling the viewport.
const FIXED_16_9_ASPECT_RATIO = false;
const PIRANHA_BEHAVIOR_ENABLED = true;
const LEGACY_MAX_HEALTH_UNITS = 6;
const HEALTH_MODEL_VERSION = 3;
const LEGACY_HEALTH_SCALE_MODEL_VERSION = 2;
const MIN_FISH_HEARTS = 2;
const MAX_FISH_HEARTS = 10;
const FISH_HEALTH_SIZE_BASE_MAX_HEARTS = 8;
const PREMIUM_FISH_HEART_COST_THRESHOLD = 20;
const ULTRA_PREMIUM_FISH_HEART_COST_THRESHOLD = 40;
const PREMIUM_FISH_HEART_BONUS = 1;
const ULTRA_PREMIUM_FISH_HEART_BONUS = 2;
const FISH_MEAL_COIN_COST_DIVISOR = 4;
const RECOVERY_FEED_STREAK = 4;
const STARVATION_DAMAGE_MISSED_MEALS_THRESHOLD = 4;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const HOUR_MS = 60 * 60 * 1000;
const NORMAL_MEAL_FOOD_KEYS = Object.freeze(["basic", "frisky"]);
const PREDATOR_MEAL_FOOD_KEYS = Object.freeze(["chum"]);
const COMFORT_MEAL_WINDOW_MS = 12 * HOUR_MS;
const COMFORT_MEALTIME_BOOST_MS = HOUR_MS;
const BREEDING_FOOD_BOOST_MS = MINUTE_MS;
const DAILY_RECAP_REWARD_CAP = 30;
const DAILY_RECAP_HISTORY_LIMIT = 45;
const BOROUGH_DAILY_RECAP_ID = "borough";
const BOROUGH_RECAP_SCORE_MODEL = "borough-normalized-v1";
const MAX_BOROUGH_EVENT_HISTORY = 400;
const COMFORT_VERY_LOW_EVENT_MS = 2 * HOUR_MS;
const TANK_SPACE_FULL_LOAD = 10;
const TANK_SPACE_MAX_LOAD = 14;
const COMFORT_COMPONENTS = Object.freeze({
  cleanliness: 20,
  meal: 20,
  needs: 20,
  health: 15,
  space: 15,
  mealBoost: 10,
  conflictPenalty: 10,
  maxConflictPenalty: 30
});
const DISEASE_STATE_NONE = "none";
const DISEASE_STATE_CARRIER = "carrier";
const DISEASE_STATE_INCUBATING = "incubating";
const DISEASE_STATE_EARLY = "earlySymptoms";
const DISEASE_STATE_VISIBLE = "visibleSymptoms";
const DISEASE_STATE_SEVERE = "severe";
const DISEASE_STATE_RECOVERING = "recovering";
const DISEASE_STATE_IMMUNE = "temporaryImmunity";
const DISEASE_STATES = Object.freeze([
  DISEASE_STATE_NONE,
  DISEASE_STATE_CARRIER,
  DISEASE_STATE_INCUBATING,
  DISEASE_STATE_EARLY,
  DISEASE_STATE_VISIBLE,
  DISEASE_STATE_SEVERE,
  DISEASE_STATE_RECOVERING,
  DISEASE_STATE_IMMUNE
]);
const DEBUG_DISEASE_STAGE_ORDER = Object.freeze([
  DISEASE_STATE_CARRIER,
  DISEASE_STATE_INCUBATING,
  DISEASE_STATE_EARLY,
  DISEASE_STATE_VISIBLE,
  DISEASE_STATE_SEVERE
]);
const DEBUG_BEHAVIOR_BUTTON_CONFIGS = Object.freeze([
  { id: "debugBehaviorRefuseFoodButton", domKey: "debugBehaviorRefuseFoodButton", action: "refuse-food", icon: "&#127860;", label: "Refuse Food", title: "Debug: Refuse Food" },
  { id: "debugBehaviorAnticipateFoodButton", domKey: "debugBehaviorAnticipateFoodButton", action: "anticipate-food", icon: "&#9201;&#65039;", label: "Anticipate Food", title: "Debug: Anticipate Food" },
  { id: "debugBehaviorHideButton", domKey: "debugBehaviorHideButton", action: "hide", icon: "&#127793;", label: "Hide", title: "Debug: Hide Near Cover" },
  { id: "debugBehaviorInspectLureButton", domKey: "debugBehaviorInspectLureButton", action: "inspect-lure", icon: "&#127907;", label: "Inspect Lure", title: "Debug: Inspect Lure" },
  { id: "debugBehaviorGuardCaveButton", domKey: "debugBehaviorGuardCaveButton", action: "guard-cave", icon: "&#9968;&#65039;", label: "Guard Cave", title: "Debug: Guard Cave Or Hardscape" },
  { id: "debugBehaviorFollowButton", domKey: "debugBehaviorFollowButton", action: "follow", icon: "&#128101;", label: "Follow", title: "Debug: Follow A Friend" },
  { id: "debugBehaviorAvoidButton", domKey: "debugBehaviorAvoidButton", action: "avoid", icon: "&#8618;&#65039;", label: "Avoid", title: "Debug: Avoid A Feared Fish" },
  { id: "debugBehaviorDiseaseButton", domKey: "debugBehaviorDiseaseButton", action: "disease", icon: "&#129658;", label: "Symptom Test", title: "Debug: Disease Symptom Test" },
  { id: "debugBehaviorSpeciesSignatureButton", domKey: "debugBehaviorSpeciesSignatureButton", action: "species-signature", icon: "&#129504;", label: "Test Species AI", title: "Debug: Force the selected species' signature behavior", extraClass: "wide" },
  { id: "debugPufferInflateButton", domKey: "debugPufferInflateButton", action: "puffer-inflate", icon: "&#128167;", label: "Puffer Puff", title: "Debug: Force the selected Pufferfish to inflate" },
  { id: "debugPufferDeflateButton", domKey: "debugPufferDeflateButton", action: "puffer-deflate", icon: "&#128168;", label: "Puffer Deflate", title: "Debug: Force the selected Pufferfish into deflation" },
  { id: "debugPufferRapidTapsButton", domKey: "debugPufferRapidTapsButton", action: "puffer-taps", icon: "&#128070;", label: "Puffer 12 Taps", title: "Debug: Simulate twelve rapid nearby glass taps on the selected Pufferfish", extraClass: "wide" },
  { id: "debugOtocinclusBackButton", domKey: "debugOtocinclusBackButton", action: "oto-back", icon: "&#8595;&#65039;", label: "Oto Back Glass", title: "Debug: Force Otocinclus / Dwarf Sucker Catfish to the back glass" },
  { id: "debugOtocinclusSwimButton", domKey: "debugOtocinclusSwimButton", action: "oto-swim", icon: "&#128031;", label: "Oto Swim", title: "Debug: Force Otocinclus / Dwarf Sucker Catfish to free swim" },
  { id: "debugOtocinclusFrontButton", domKey: "debugOtocinclusFrontButton", action: "oto-front", icon: "&#8593;&#65039;", label: "Oto Front Glass", title: "Debug: Force Otocinclus / Dwarf Sucker Catfish to the front glass" },
  { id: "debugOtocinclusNormalButton", domKey: "debugOtocinclusNormalButton", action: "oto-normal", icon: "&#8634;", label: "Oto Normal", title: "Debug: Return Otocinclus / Dwarf Sucker Catfish to normal behavior", extraClass: "wide" },
  { id: "debugBehaviorClearButton", domKey: "debugBehaviorClearButton", action: "clear", icon: "&#8634;", label: "Clear Behavior", title: "Debug: Clear Forced Behavior", extraClass: "wide" }
]);
const DEBUG_FISH_BEHAVIOR_PREVIEW_OPTIONS = Object.freeze([
  { id: "swim", label: "Normal Swim", description: "The standard cruising pose, body flex, and tail rhythm." },
  { id: "turn-around", label: "Turn Around", description: "The fish's configured turnaround animation, played at its real duration." },
  { id: "eat", label: "Eat", description: "A repeated feeding approach and bite motion." },
  { id: "waitfood", label: "Wait for Food", description: "An alert hover while anticipating the next meal." },
  { id: "rest", label: "Rest", description: "A quiet hover with reduced motion and slow breathing." },
  { id: "sleep", label: "Sleep", description: "The settled sleeping posture and minimal body movement." },
  { id: "zoomies", label: "Zoomies", description: "Fast, energetic flexing used during a burst around the tank." },
  { id: "greet", label: "Greet", description: "A friendly approach with a short double nod." },
  { id: "hangout", label: "Hang Out", description: "Relaxed social swimming with an easy synchronized sway." },
  { id: "play", label: "Play", description: "A lively roll, bounce, and body squash cycle." },
  { id: "pebble", label: "Find Pebble", description: "The nose-down search, pickup, and raised carry pose." },
  { id: "dig", label: "Dig", description: "The steep gravel-facing digging pose and repeated push." },
  { id: "avoid", label: "Avoid", description: "A startled recoil and fast retreat posture." },
  { id: "breed", label: "Mate", description: "The courtship sway used during a breeding approach." },
  { id: "hide", label: "Hide", description: "A compressed, cautious posture used while moving into cover." },
  { id: "inspect", label: "Inspect", description: "A curious close-look pose with small deliberate nods." },
  { id: "sick", label: "Sick / Critical", description: "Low-health coloring with sluggish, uneven movement." },
  { id: "dead", label: "Dead Float", description: "The inverted floating pose used after death." }
]);
const DEBUG_BEHAVIOR_STEER_REFRESH_MS = 260;
const DEBUG_BEHAVIOR_FOLLOW_DURATION_MS = 45 * 1000;
const DEBUG_BEHAVIOR_FOLLOW_DISTANCE_NORM = 0.045;
const DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM = 0.075;
const DEBUG_BEHAVIOR_FOLLOW_CATCHUP_NORM = 0.16;
const DEBUG_BEHAVIOR_FOLLOW_LOOKAHEAD_NORM = 0.026;
const DEBUG_BEHAVIOR_AVOID_DURATION_MS = 45 * 1000;
const DEBUG_BEHAVIOR_AVOID_RANGE_NORM = 0.48;
const DEBUG_BEHAVIOR_AVOID_RETREAT_NORM = 0.34;
const DEBUG_BEHAVIOR_LURE_INSPECT_DURATION_MS = 45 * 1000;
const DEBUG_BEHAVIOR_LURE_SIDE_MS = 4200;
const DEBUG_BEHAVIOR_ANTICIPATE_FOOD_DURATION_MS = 14 * 1000;
const DISEASE_TYPE_GENERIC = "generic";
const DISEASE_TYPE_VIRAL = "viral";
const DAVY_JONES_VIRAL_PURCHASE_CHANCE = 0.05;
const DISEASE_CARRIER_MS = 12 * HOUR_MS;
const DISEASE_INCUBATING_MS = 24 * HOUR_MS;
const DISEASE_EARLY_MS = 48 * HOUR_MS;
const DISEASE_VISIBLE_MS = 72 * HOUR_MS;
const DISEASE_TREATMENT_SLOW_MS = 12 * HOUR_MS;
const DISEASE_RECOVERY_REQUIRED_MS = 24 * HOUR_MS;
const DISEASE_RECOVERING_ENTRY_MS = 6 * HOUR_MS;
const DISEASE_HEALTH_DAMAGE_INTERVAL_MS = 12 * HOUR_MS;
const DISEASE_HEALTH_DAMAGE_UNITS = 1;
const DISEASE_BASE_DAILY_CHANCE = 0.001;
const DISEASE_LOW_CLEANLINESS_CHANCE = 0.005;
const DISEASE_CRITICAL_CLEANLINESS_CHANCE = 0.01;
const DISEASE_LOW_COMFORT_CHANCE = 0.005;
const DISEASE_CROWDED_CHANCE = 0.005;
const DISEASE_NEW_FISH_CLEAN_CHANCE = 0.05;
const DISEASE_NEW_FISH_DIRTY_MIN_CHANCE = 0.08;
const DISEASE_NEW_FISH_DIRTY_MAX_CHANCE = 0.12;
const DISEASE_NEW_FISH_CROWDED_MIN_BONUS = 0.02;
const DISEASE_NEW_FISH_CROWDED_MAX_BONUS = 0.04;
const DISEASE_NEW_FISH_LOW_COMFORT_MIN_BONUS = 0.02;
const DISEASE_NEW_FISH_LOW_COMFORT_MAX_BONUS = 0.04;
const DISEASE_LOW_CLEANLINESS_THRESHOLD = 0.5;
const DISEASE_CRITICAL_CLEANLINESS_THRESHOLD = 0.25;
const DISEASE_LOW_COMFORT_THRESHOLD = 0.4;
const DISEASE_CROWDED_LOAD_THRESHOLD = TANK_SPACE_FULL_LOAD;
const DISEASE_EXPOSURE_MAX = 100;
const DISEASE_EXPOSURE_DECAY_CLEAN = 2.2;
const DISEASE_EXPOSURE_DECAY_DIRTY = 0.7;
const DISEASE_SPREAD_BASE_GAIN = 5.5;
const DISEASE_SPREAD_CHECK_MIN_MS = 5 * 1000;
const DISEASE_SPREAD_CHECK_MAX_MS = 10 * 1000;
const DISEASE_STAGE_CHECK_MIN_MS = 10 * 1000;
const DISEASE_STAGE_CHECK_MAX_MS = 30 * 1000;
const DISEASE_EXPOSURE_DECAY_MIN_MS = 30 * 1000;
const DISEASE_EXPOSURE_DECAY_MAX_MS = 60 * 1000;
const DISEASE_SYMPTOM_CHECK_MIN_MS = 2 * 1000;
const DISEASE_SYMPTOM_CHECK_MAX_MS = 6 * 1000;
const DISEASE_TASK_COOLDOWN_MS = 4 * MINUTE_MS;
const DISEASE_SIGNAL_HISTORY_LIMIT = 12;
const DISEASE_TEMPORARY_IMMUNITY_MIN_MS = DAY_MS;
const DISEASE_TEMPORARY_IMMUNITY_MAX_MS = 3 * DAY_MS;
const DISEASE_PROXIMITY_SMALL_PX = 110;
const DISEASE_PROXIMITY_NORMAL_PX = 170;
const DISEASE_PROXIMITY_CROWDED_PX = 230;
const DISEASE_VISIBLE_AVOIDANCE_MIN_RADIUS_NORM = 0.4;
const DISEASE_VISIBLE_AVOIDANCE_MAX_RADIUS_NORM = 0.58;
const DISEASE_VISIBLE_AVOIDANCE_RETREAT_MIN_NORM = 0.28;
const DISEASE_VISIBLE_AVOIDANCE_RETREAT_MAX_NORM = 0.52;
const DISEASE_FEEDING_EXPOSURE_MULTIPLIER = 1.5;
const DISEASE_SHARED_HIDE_EXPOSURE_MULTIPLIER = 1.7;
const DISEASE_TREATED_MULTIPLIER = 0.35;
const DISEASE_RECOVERY_TREATED_MULTIPLIER = 1.35;
const DISEASE_SPREAD_CHECK_EXPOSURE_CAPS = Object.freeze({
  [DISEASE_STATE_CARRIER]: 5,
  [DISEASE_STATE_INCUBATING]: 12,
  [DISEASE_STATE_EARLY]: 20,
  [DISEASE_STATE_VISIBLE]: 28,
  [DISEASE_STATE_SEVERE]: 42,
  [DISEASE_STATE_RECOVERING]: 10
});
const DISEASE_SIGNAL_TYPES = Object.freeze([
  "looking_under_weather",
  "green_bubbles",
  "food_refused",
  "missed_feeding",
  "hiding_more_than_usual",
  "avoiding_group",
  "sick_isolation",
  "surface_hover",
  "bottom_sit",
  "slow_drift",
  "stopped_grazing",
  "stopped_digging",
  "stopped_hunting",
  "night_active_still",
  "odd_sleep_spot",
  "lingering_near_bubbler"
]);
const BEHAVIOR_PERSONALITIES = Object.freeze([
  "bold",
  "shy",
  "social",
  "standoffish",
  "curious",
  "territorial",
  "greedy",
  "sensitive",
  "digger",
  "cleaner",
  "routine-loving",
  "night-active",
  "follower",
  "homebody",
  "hunter",
  "explorer",
  "display",
  "gentle",
  "nervous"
]);
const PERSONALITY_RARITY_TYPE = "type";
const PERSONALITY_RARITY_VARIATION = "variation";
const PERSONALITY_RARITY_ODDBALL = "oddball";
const BEHAVIOR_SIGNAL_EXPIRY_MS = 12 * MINUTE_MS;
const BEHAVIOR_SIGNAL_COOLDOWN_MS = 4 * MINUTE_MS;
const BEHAVIOR_INTENT_LINGER_MS = 12 * 1000;
const FOOD_REFUSAL_RETARGET_MS = 80 * 1000;
const BEHAVIOR_RELATIONSHIP_CHECK_MS = 2 * MINUTE_MS;
const DISEASE_AVOIDANCE_CHECK_MIN_MS = 900;
const DISEASE_AVOIDANCE_CHECK_MAX_MS = 2200;
const FISH_BEHAVIOR_PROFILES = Object.freeze({
  "blue-tang": { group: "open-water-cruiser", personalities: ["explorer", "bold", "social", "curious"], rare: ["greedy", "routine-loving", "shy"] },
  "yellow-tang": { group: "open-water-cruiser", personalities: ["explorer", "bold", "routine-loving", "curious"], rare: ["social", "territorial", "greedy"] },
  "rainbowfish": { group: "open-water-cruiser", personalities: ["display", "social", "explorer", "routine-loving"], rare: ["bold", "curious", "greedy"] },
  "swordtail": { group: "open-water-cruiser", personalities: ["bold", "explorer", "territorial", "greedy"], rare: ["social", "standoffish", "routine-loving"] },
  "molly": { group: "open-water-cruiser", personalities: ["social", "routine-loving", "greedy", "gentle"], rare: ["bold", "curious", "follower"] },
  "livebearer": { group: "small-social", personalities: ["social", "routine-loving", "curious", "follower"], rare: ["greedy", "shy", "bold"] },
  "clownfish": { group: "open-water-cruiser", personalities: ["social", "curious", "bold", "homebody"], rare: ["greedy", "routine-loving", "territorial"] },
  "goldfish": { group: "slow-graceful", personalities: ["greedy", "gentle", "routine-loving", "curious"], rare: ["bold", "homebody", "sensitive"], slowGraceful: true },
  "koi": { group: "slow-graceful", personalities: ["social", "gentle", "routine-loving", "greedy"], rare: ["curious", "digger", "bold"], slowGraceful: true },
  "betta": { group: "slow-graceful", personalities: ["display", "standoffish", "territorial", "sensitive"], rare: ["curious", "homebody", "greedy"], slowGraceful: true },
  "angelfish": { group: "slow-graceful", personalities: ["display", "gentle", "sensitive", "social"], rare: ["territorial", "homebody", "curious"], slowGraceful: true },
  "discus": { group: "slow-graceful", personalities: ["display", "sensitive", "gentle", "routine-loving"], rare: ["shy", "social", "homebody"], slowGraceful: true },
  "moor-goldfish": { group: "slow-graceful", personalities: ["gentle", "sensitive", "shy", "routine-loving"], rare: ["night-active", "curious", "homebody"], slowGraceful: true, nightActive: true },
  "gourami": { group: "slow-graceful", personalities: ["display", "gentle", "sensitive", "homebody"], rare: ["territorial", "curious", "routine-loving"], slowGraceful: true },
  "blue-ram": { group: "slow-graceful", personalities: ["territorial", "homebody", "sensitive", "digger"], rare: ["curious", "gentle", "display"], slowGraceful: true },
  "royal-gramma": { group: "slow-graceful", personalities: ["territorial", "homebody", "standoffish", "display"], rare: ["curious", "sensitive", "gentle"], slowGraceful: true },
  "guppy": { group: "small-social", personalities: ["social", "curious", "shy", "follower"], rare: ["bold", "greedy", "routine-loving"] },
  "zebra-danio": { group: "small-social", personalities: ["explorer", "social", "curious", "nervous"], rare: ["bold", "follower", "routine-loving"] },
  "cherry-barb": { group: "small-social", personalities: ["social", "shy", "follower", "gentle"], rare: ["curious", "routine-loving", "bold"] },
  "neon-tetra": { group: "small-social", personalities: ["social", "follower", "routine-loving", "shy"], rare: ["curious", "nervous", "night-active"] },
  "celestial-pearl-danio": { group: "small-social", personalities: ["shy", "curious", "nervous", "social"], rare: ["follower", "night-active", "routine-loving"] },
  "chili-rasbora": { group: "small-social", personalities: ["shy", "social", "follower", "nervous"], rare: ["curious", "routine-loving", "gentle"] },
  "ember-tetra": { group: "small-social", personalities: ["gentle", "social", "follower", "shy"], rare: ["curious", "routine-loving", "nervous"] },
  "harlequin-rasbora": { group: "small-social", personalities: ["social", "explorer", "follower", "routine-loving"], rare: ["bold", "curious", "gentle"] },
  "pencilfish": { group: "small-social", personalities: ["social", "display", "curious", "standoffish"], rare: ["follower", "shy", "routine-loving"] },
  "rummy-nose-tetra": { group: "small-social", personalities: ["social", "follower", "routine-loving", "nervous"], rare: ["curious", "shy", "explorer"] },
  "otocinclus": { group: "bottom-cleaner", personalities: ["cleaner", "homebody", "night-active", "shy"], rare: ["curious", "sensitive", "digger"], nightActive: true, detritusDiet: true },
  "loach": { group: "bottom-cleaner", personalities: ["digger", "explorer", "cleaner", "night-active"], rare: ["social", "homebody", "curious"], nightActive: true },
  "piranha": { group: "special-predator", personalities: ["hunter", "social", "territorial", "bold"], rare: ["curious", "greedy", "standoffish"], predatorDiet: true },
  "wonder-killifish": { group: "special-predator", personalities: ["hunter", "curious", "bold", "nervous"], rare: ["territorial", "standoffish", "greedy"], predatorDiet: true },
  "pufferfish": { group: "special-predator", personalities: ["curious", "greedy", "standoffish", "explorer"], rare: ["hunter", "territorial", "sensitive"], predatorDiet: true },
  "lionfish": { group: "special-predator", personalities: ["hunter", "homebody", "standoffish", "routine-loving"], rare: ["curious", "territorial", "bold"], predatorDiet: true },
  "bull-shark": { group: "shark-cruiser", personalities: ["bold", "explorer", "territorial", "routine-loving"], rare: ["hunter", "curious", "standoffish"], predatorDiet: true, desperationPredator: true },
  "great-white-shark": { group: "shark-cruiser", personalities: ["hunter", "bold", "explorer", "territorial"], rare: ["curious", "standoffish", "routine-loving"], predatorDiet: true, desperationPredator: true },
  "hammerhead-shark": { group: "shark-cruiser", personalities: ["curious", "explorer", "bold", "social"], rare: ["hunter", "territorial", "gentle"], predatorDiet: true, desperationPredator: true },
  "orca": { group: "orca-pod", personalities: ["social", "hunter", "explorer", "bold"], rare: ["curious", "routine-loving", "territorial"], predatorDiet: true, desperationPredator: true },
  "sunfish": { group: "sunfish-gentle", personalities: ["gentle", "homebody", "routine-loving", "sensitive"], rare: ["shy", "curious", "social"], slowGraceful: true },
  "seahorse": { group: "seahorse-drifter", personalities: ["gentle", "homebody", "shy", "curious"], rare: ["social", "routine-loving", "sensitive"], slowGraceful: true },
  "pilot-fish": { group: "pilot-follower", personalities: ["follower", "social", "explorer", "curious"], rare: ["bold", "routine-loving", "shy"] },
  "davy-dwarf-chimera-barracuda": { group: "special-predator", personalities: ["hunter", "bold", "standoffish", "territorial"], rare: ["curious", "explorer", "sensitive"], predatorDiet: true },
  "davy-bioluminescent-angler-pike": { group: "special-predator", personalities: ["hunter", "homebody", "sensitive", "standoffish"], rare: ["curious", "bold", "territorial"], predatorDiet: true },
  "davy-bioluminescent-glass-fangfish": { group: "small-social", personalities: ["nervous", "shy", "curious", "explorer"], rare: ["hunter", "sensitive", "homebody"] },
  "davy-bioluminescent-cherub-goldfish": { group: "slow-graceful", personalities: ["gentle", "social", "follower", "curious"], rare: ["sensitive", "homebody", "greedy"], slowGraceful: true }
});
const FISH_LOCOMOTION_PROFILE_DEFAULT = Object.freeze({
  movementPattern: "cruise",
  preferredY: 0.5,
  verticalSpread: 0.82,
  targetDistanceMin: 0.16,
  targetDistanceMax: 0.52,
  headingPersistence: 0.5,
  hoverChance: 0.05,
  hoverMinMs: 700,
  hoverMaxMs: 1700,
  schoolStrength: 0.2,
  schoolSpacingScale: 1,
  schoolDurationScale: 1,
  schoolVerticalJitterScale: 1,
  structureAffinity: 1,
  caveAffinity: 1,
  homeRangeStrength: 0,
  homeRangeRadius: 0.22,
  startleStrength: 1,
  startleRecoveryScale: 1,
  turnDurationScale: 1,
  speedMinBlend: 0.2,
  speedMaxBlend: 0.8,
  dartChance: 0,
  dartSpeedMinBlend: 0.72,
  targetDurationScale: 1
});
const createFishLocomotionProfile = (overrides = {}) => Object.freeze({
  ...FISH_LOCOMOTION_PROFILE_DEFAULT,
  ...overrides
});
const FISH_LOCOMOTION_PROFILES = Object.freeze({
  "blue-tang": createFishLocomotionProfile({
    movementPattern: "open-water-cruise", preferredY: 0.48, verticalSpread: 0.74,
    targetDistanceMin: 0.34, targetDistanceMax: 0.72, headingPersistence: 0.8,
    hoverChance: 0.015, schoolStrength: 0.3, structureAffinity: 0.82, caveAffinity: 0.3,
    startleStrength: 1.25, startleRecoveryScale: 1.08, turnDurationScale: 0.9,
    speedMinBlend: 0.62, speedMaxBlend: 0.98, targetDurationScale: 0.88
  }),
  "yellow-tang": createFishLocomotionProfile({
    movementPattern: "patrol-graze", preferredY: 0.54, verticalSpread: 0.72,
    targetDistanceMin: 0.26, targetDistanceMax: 0.6, headingPersistence: 0.7,
    hoverChance: 0.1, hoverMinMs: 700, hoverMaxMs: 1900, schoolStrength: 0.16,
    structureAffinity: 1.28, caveAffinity: 0.25, startleStrength: 1.08,
    turnDurationScale: 0.95, speedMinBlend: 0.48, speedMaxBlend: 0.86
  }),
  "rainbowfish": createFishLocomotionProfile({
    movementPattern: "fast-school-cruise", preferredY: 0.45, verticalSpread: 0.66,
    targetDistanceMin: 0.36, targetDistanceMax: 0.74, headingPersistence: 0.84,
    hoverChance: 0.008, schoolStrength: 0.7, schoolSpacingScale: 0.92,
    schoolDurationScale: 1.35, schoolVerticalJitterScale: 0.72, structureAffinity: 0.72,
    startleStrength: 1.22, turnDurationScale: 0.84, speedMinBlend: 0.66,
    speedMaxBlend: 1, targetDurationScale: 0.82
  }),
  "swordtail": createFishLocomotionProfile({
    movementPattern: "strong-cruise", preferredY: 0.46, verticalSpread: 0.72,
    targetDistanceMin: 0.3, targetDistanceMax: 0.68, headingPersistence: 0.8,
    hoverChance: 0.015, schoolStrength: 0.3, schoolDurationScale: 1.08,
    structureAffinity: 0.88, startleStrength: 0.98, turnDurationScale: 0.88,
    speedMinBlend: 0.58, speedMaxBlend: 0.96, targetDurationScale: 0.9
  }),
  "molly": createFishLocomotionProfile({
    movementPattern: "social-graze", preferredY: 0.48, verticalSpread: 0.75,
    targetDistanceMin: 0.18, targetDistanceMax: 0.48, headingPersistence: 0.5,
    hoverChance: 0.08, schoolStrength: 0.34, schoolSpacingScale: 1.05,
    structureAffinity: 1.15, startleStrength: 0.92, turnDurationScale: 1.02,
    speedMinBlend: 0.3, speedMaxBlend: 0.76
  }),
  "livebearer": createFishLocomotionProfile({
    movementPattern: "lively-social", preferredY: 0.38, verticalSpread: 0.66,
    targetDistanceMin: 0.15, targetDistanceMax: 0.46, headingPersistence: 0.42,
    hoverChance: 0.035, schoolStrength: 0.38, schoolSpacingScale: 1,
    structureAffinity: 1.08, startleStrength: 1.05, turnDurationScale: 0.9,
    speedMinBlend: 0.38, speedMaxBlend: 0.88, dartChance: 0.14, dartSpeedMinBlend: 0.78
  }),
  "clownfish": createFishLocomotionProfile({
    movementPattern: "home-hover", preferredY: 0.5, verticalSpread: 0.52,
    targetDistanceMin: 0.07, targetDistanceMax: 0.26, headingPersistence: 0.26,
    hoverChance: 0.28, hoverMinMs: 900, hoverMaxMs: 2600, schoolStrength: 0.2,
    schoolSpacingScale: 1.15, structureAffinity: 2, caveAffinity: 2.2,
    homeRangeStrength: 0.92, homeRangeRadius: 0.16, startleStrength: 1.05,
    turnDurationScale: 1.08, speedMinBlend: 0.1, speedMaxBlend: 0.52,
    targetDurationScale: 1.2
  }),
  "goldfish": createFishLocomotionProfile({
    movementPattern: "area-forage", preferredY: 0.58, verticalSpread: 0.76,
    targetDistanceMin: 0.16, targetDistanceMax: 0.42, headingPersistence: 0.42,
    hoverChance: 0.13, hoverMinMs: 900, hoverMaxMs: 2300, schoolStrength: 0.18,
    structureAffinity: 1.04, startleStrength: 0.86, turnDurationScale: 1.2,
    speedMinBlend: 0.08, speedMaxBlend: 0.58, targetDurationScale: 1.12
  }),
  "betta": createFishLocomotionProfile({
    movementPattern: "deliberate-hover", preferredY: 0.42, verticalSpread: 0.58,
    targetDistanceMin: 0.1, targetDistanceMax: 0.34, headingPersistence: 0.36,
    hoverChance: 0.26, hoverMinMs: 1100, hoverMaxMs: 3000, schoolStrength: 0,
    structureAffinity: 1.72, caveAffinity: 0.42, homeRangeStrength: 0.45,
    homeRangeRadius: 0.2, startleStrength: 1.08, startleRecoveryScale: 1.05,
    turnDurationScale: 1.42, speedMinBlend: 0.04, speedMaxBlend: 0.48,
    targetDurationScale: 1.22
  }),
  "angelfish": createFishLocomotionProfile({
    movementPattern: "graceful-cruise", preferredY: 0.48, verticalSpread: 0.6,
    targetDistanceMin: 0.2, targetDistanceMax: 0.5, headingPersistence: 0.62,
    hoverChance: 0.2, hoverMinMs: 1100, hoverMaxMs: 3000, schoolStrength: 0.28,
    schoolSpacingScale: 1.18, structureAffinity: 1.18, caveAffinity: 0.45,
    startleStrength: 1.02, turnDurationScale: 1.5, speedMinBlend: 0.04,
    speedMaxBlend: 0.46, targetDurationScale: 1.22
  }),
  "discus": createFishLocomotionProfile({
    movementPattern: "group-hover", preferredY: 0.5, verticalSpread: 0.54,
    targetDistanceMin: 0.14, targetDistanceMax: 0.38, headingPersistence: 0.44,
    hoverChance: 0.3, hoverMinMs: 1300, hoverMaxMs: 3400, schoolStrength: 0.56,
    schoolSpacingScale: 1.16, schoolDurationScale: 1.55, schoolVerticalJitterScale: 0.75,
    structureAffinity: 1.2, startleStrength: 1.2, startleRecoveryScale: 1.22,
    turnDurationScale: 1.55, speedMinBlend: 0.02, speedMaxBlend: 0.4,
    targetDurationScale: 1.28
  }),
  "moor-goldfish": createFishLocomotionProfile({
    movementPattern: "slow-area-forage", preferredY: 0.58, verticalSpread: 0.62,
    targetDistanceMin: 0.08, targetDistanceMax: 0.26, headingPersistence: 0.3,
    hoverChance: 0.24, hoverMinMs: 1200, hoverMaxMs: 3100, schoolStrength: 0.12,
    structureAffinity: 1.12, startleStrength: 0.66, startleRecoveryScale: 1.12,
    turnDurationScale: 1.6, speedMinBlend: 0, speedMaxBlend: 0.3,
    targetDurationScale: 1.3
  }),
  "gourami": createFishLocomotionProfile({
    movementPattern: "upper-hover", preferredY: 0.3, verticalSpread: 0.48,
    targetDistanceMin: 0.1, targetDistanceMax: 0.34, headingPersistence: 0.38,
    hoverChance: 0.28, hoverMinMs: 1000, hoverMaxMs: 2900, schoolStrength: 0.08,
    structureAffinity: 1.68, caveAffinity: 1.18, homeRangeStrength: 0.48,
    homeRangeRadius: 0.2, startleStrength: 1.14, startleRecoveryScale: 1.1,
    turnDurationScale: 1.35, speedMinBlend: 0.02, speedMaxBlend: 0.42,
    targetDurationScale: 1.22
  }),
  "blue-ram": createFishLocomotionProfile({
    movementPattern: "bottom-stop-go", preferredY: 0.84, verticalSpread: 0.34,
    targetDistanceMin: 0.08, targetDistanceMax: 0.28, headingPersistence: 0.3,
    hoverChance: 0.28, hoverMinMs: 900, hoverMaxMs: 2600, schoolStrength: 0.04,
    structureAffinity: 1.7, caveAffinity: 1.65, homeRangeStrength: 0.72,
    homeRangeRadius: 0.18, startleStrength: 1.16, startleRecoveryScale: 1.12,
    turnDurationScale: 1.2, speedMinBlend: 0.08, speedMaxBlend: 0.5,
    dartChance: 0.1, dartSpeedMinBlend: 0.72, targetDurationScale: 1.18
  }),
  "royal-gramma": createFishLocomotionProfile({
    movementPattern: "cave-hover-dart", preferredY: 0.5, verticalSpread: 0.42,
    targetDistanceMin: 0.06, targetDistanceMax: 0.22, headingPersistence: 0.24,
    hoverChance: 0.4, hoverMinMs: 1100, hoverMaxMs: 3300, schoolStrength: 0.02,
    structureAffinity: 2.05, caveAffinity: 2.35, homeRangeStrength: 0.96,
    homeRangeRadius: 0.14, startleStrength: 1.38, startleRecoveryScale: 1.25,
    turnDurationScale: 0.92, speedMinBlend: 0.04, speedMaxBlend: 0.42,
    dartChance: 0.24, dartSpeedMinBlend: 0.8, targetDurationScale: 1.24
  }),
  "guppy": createFishLocomotionProfile({
    movementPattern: "lively-social", preferredY: 0.36, verticalSpread: 0.68,
    targetDistanceMin: 0.12, targetDistanceMax: 0.44, headingPersistence: 0.34,
    hoverChance: 0.025, schoolStrength: 0.38, schoolSpacingScale: 0.96,
    structureAffinity: 1.05, caveAffinity: 0.78, startleStrength: 1.14,
    turnDurationScale: 0.78, speedMinBlend: 0.3, speedMaxBlend: 0.96,
    dartChance: 0.2, dartSpeedMinBlend: 0.76, targetDurationScale: 0.85
  }),
  "zebra-danio": createFishLocomotionProfile({
    movementPattern: "fast-school-cruise", preferredY: 0.36, verticalSpread: 0.62,
    targetDistanceMin: 0.28, targetDistanceMax: 0.7, headingPersistence: 0.72,
    hoverChance: 0.002, schoolStrength: 0.7, schoolSpacingScale: 0.88,
    schoolDurationScale: 1.22, schoolVerticalJitterScale: 0.75, structureAffinity: 0.68,
    caveAffinity: 0.7, startleStrength: 1.28, turnDurationScale: 0.7,
    speedMinBlend: 0.6, speedMaxBlend: 1, targetDurationScale: 0.72
  }),
  "cherry-barb": createFishLocomotionProfile({
    movementPattern: "calm-shoal", preferredY: 0.56, verticalSpread: 0.58,
    targetDistanceMin: 0.12, targetDistanceMax: 0.38, headingPersistence: 0.44,
    hoverChance: 0.13, hoverMinMs: 800, hoverMaxMs: 2200, schoolStrength: 0.44,
    schoolSpacingScale: 1.08, schoolDurationScale: 1.2, structureAffinity: 1.28,
    caveAffinity: 0.95, startleStrength: 1.08, turnDurationScale: 1.08,
    speedMinBlend: 0.22, speedMaxBlend: 0.62, targetDurationScale: 1.1
  }),
  "neon-tetra": createFishLocomotionProfile({
    movementPattern: "school-cruise", preferredY: 0.46, verticalSpread: 0.52,
    targetDistanceMin: 0.18, targetDistanceMax: 0.5, headingPersistence: 0.58,
    hoverChance: 0.02, schoolStrength: 0.84, schoolSpacingScale: 0.82,
    schoolDurationScale: 1.55, schoolVerticalJitterScale: 0.58, structureAffinity: 1.25,
    caveAffinity: 0.7, startleStrength: 1.36, startleRecoveryScale: 1.14,
    turnDurationScale: 0.86, speedMinBlend: 0.48, speedMaxBlend: 0.86,
    dartChance: 0.12, dartSpeedMinBlend: 0.78, targetDurationScale: 0.9
  }),
  "celestial-pearl-danio": createFishLocomotionProfile({
    movementPattern: "hover-dart", preferredY: 0.56, verticalSpread: 0.46,
    targetDistanceMin: 0.05, targetDistanceMax: 0.2, headingPersistence: 0.18,
    hoverChance: 0.34, hoverMinMs: 900, hoverMaxMs: 2500, schoolStrength: 0.16,
    schoolSpacingScale: 1.12, structureAffinity: 1.82, caveAffinity: 0.92,
    homeRangeStrength: 0.22, homeRangeRadius: 0.18, startleStrength: 1.34,
    startleRecoveryScale: 1.18, turnDurationScale: 0.78, speedMinBlend: 0.16,
    speedMaxBlend: 0.52, dartChance: 0.58, dartSpeedMinBlend: 0.8,
    targetDurationScale: 1.08
  }),
  "chili-rasbora": createFishLocomotionProfile({
    movementPattern: "hover-dart-shoal", preferredY: 0.38, verticalSpread: 0.48,
    targetDistanceMin: 0.06, targetDistanceMax: 0.24, headingPersistence: 0.24,
    hoverChance: 0.24, hoverMinMs: 700, hoverMaxMs: 2100, schoolStrength: 0.62,
    schoolSpacingScale: 0.84, schoolDurationScale: 1.3, schoolVerticalJitterScale: 0.62,
    structureAffinity: 1.72, startleStrength: 1.45, startleRecoveryScale: 1.22,
    turnDurationScale: 0.72, speedMinBlend: 0.18, speedMaxBlend: 0.58,
    dartChance: 0.54, dartSpeedMinBlend: 0.82, targetDurationScale: 0.98
  }),
  "ember-tetra": createFishLocomotionProfile({
    movementPattern: "hover-shoal", preferredY: 0.5, verticalSpread: 0.5,
    targetDistanceMin: 0.08, targetDistanceMax: 0.28, headingPersistence: 0.34,
    hoverChance: 0.25, hoverMinMs: 800, hoverMaxMs: 2300, schoolStrength: 0.52,
    schoolSpacingScale: 0.94, schoolDurationScale: 1.32, schoolVerticalJitterScale: 0.7,
    structureAffinity: 1.55, startleStrength: 1.3, startleRecoveryScale: 1.14,
    turnDurationScale: 0.98, speedMinBlend: 0.2, speedMaxBlend: 0.58,
    targetDurationScale: 1.12
  }),
  "harlequin-rasbora": createFishLocomotionProfile({
    movementPattern: "steady-school-cruise", preferredY: 0.48, verticalSpread: 0.56,
    targetDistanceMin: 0.22, targetDistanceMax: 0.54, headingPersistence: 0.66,
    hoverChance: 0.04, schoolStrength: 0.74, schoolSpacingScale: 0.9,
    schoolDurationScale: 1.5, schoolVerticalJitterScale: 0.62, structureAffinity: 1.08,
    startleStrength: 1.16, turnDurationScale: 0.92, speedMinBlend: 0.44,
    speedMaxBlend: 0.82, targetDurationScale: 0.94
  }),
  "pencilfish": createFishLocomotionProfile({
    movementPattern: "upper-glide", preferredY: 0.24, verticalSpread: 0.3,
    targetDistanceMin: 0.14, targetDistanceMax: 0.4, headingPersistence: 0.72,
    hoverChance: 0.25, hoverMinMs: 900, hoverMaxMs: 2600, schoolStrength: 0.4,
    schoolSpacingScale: 1.14, schoolDurationScale: 1.25, schoolVerticalJitterScale: 0.4,
    structureAffinity: 1.42, startleStrength: 1.16, turnDurationScale: 1.14,
    speedMinBlend: 0.18, speedMaxBlend: 0.58, targetDurationScale: 1.16
  }),
  "rummy-nose-tetra": createFishLocomotionProfile({
    movementPattern: "tight-school-cruise", preferredY: 0.48, verticalSpread: 0.46,
    targetDistanceMin: 0.28, targetDistanceMax: 0.62, headingPersistence: 0.78,
    hoverChance: 0.006, schoolStrength: 1, schoolSpacingScale: 0.7,
    schoolDurationScale: 1.85, schoolVerticalJitterScale: 0.42, structureAffinity: 0.86,
    startleStrength: 1.4, startleRecoveryScale: 1.18, turnDurationScale: 0.82,
    speedMinBlend: 0.56, speedMaxBlend: 0.9, targetDurationScale: 0.82
  }),
  "otocinclus": createFishLocomotionProfile({
    movementPattern: "attached-grazer", preferredY: 0.68, verticalSpread: 0.62,
    targetDistanceMin: 0.08, targetDistanceMax: 0.28, headingPersistence: 0.3,
    hoverChance: 0.34, schoolStrength: 0.34, schoolSpacingScale: 1.12,
    structureAffinity: 2.1, caveAffinity: 0.1, startleStrength: 1.42,
    startleRecoveryScale: 1.24, turnDurationScale: 1.12, speedMinBlend: 0,
    speedMaxBlend: 0.5, dartChance: 0.16, dartSpeedMinBlend: 0.78,
    targetDurationScale: 1.4
  }),
  "loach": createFishLocomotionProfile({
    movementPattern: "bottom-wriggle", preferredY: 0.92, verticalSpread: 0.2,
    targetDistanceMin: 0.1, targetDistanceMax: 0.4, headingPersistence: 0.4,
    hoverChance: 0.12, hoverMinMs: 1100, hoverMaxMs: 3600, schoolStrength: 0.24,
    schoolSpacingScale: 1.16, structureAffinity: 1.85, caveAffinity: 1.7,
    homeRangeStrength: 0.34, homeRangeRadius: 0.2, startleStrength: 1.32,
    startleRecoveryScale: 1.2, turnDurationScale: 0.86, speedMinBlend: 0.16,
    speedMaxBlend: 0.62, dartChance: 0.18, dartSpeedMinBlend: 0.78,
    targetDurationScale: 1.2
  }),
  "piranha": createFishLocomotionProfile({
    movementPattern: "cautious-shoal", preferredY: 0.5, verticalSpread: 0.56,
    targetDistanceMin: 0.14, targetDistanceMax: 0.42, headingPersistence: 0.46,
    hoverChance: 0.1, hoverMinMs: 700, hoverMaxMs: 1900, schoolStrength: 0.68,
    schoolSpacingScale: 0.8, schoolDurationScale: 1.45, schoolVerticalJitterScale: 0.62,
    structureAffinity: 0.98, startleStrength: 1.3, startleRecoveryScale: 1.12,
    turnDurationScale: 0.86, speedMinBlend: 0.08, speedMaxBlend: 0.48,
    targetDurationScale: 1.18
  }),
  "wonder-killifish": createFishLocomotionProfile({
    movementPattern: "surface-ambush", preferredY: 0.08, verticalSpread: 0.18,
    targetDistanceMin: 0.05, targetDistanceMax: 0.3, headingPersistence: 0.34,
    hoverChance: 0.48, hoverMinMs: 1300, hoverMaxMs: 3800, schoolStrength: 0,
    structureAffinity: 0.9, startleStrength: 1.4, startleRecoveryScale: 1.12,
    turnDurationScale: 0.78, speedMinBlend: 0.02, speedMaxBlend: 0.34,
    dartChance: 0.38, dartSpeedMinBlend: 0.88, targetDurationScale: 1.16
  }),
  "pufferfish": createFishLocomotionProfile({
    movementPattern: "precision-hover", preferredY: 0.5, verticalSpread: 0.58,
    targetDistanceMin: 0.1, targetDistanceMax: 0.34, headingPersistence: 0.34,
    hoverChance: 0.36, hoverMinMs: 1100, hoverMaxMs: 3300, schoolStrength: 0,
    structureAffinity: 1.3, caveAffinity: 0.4, startleStrength: 0.78,
    startleRecoveryScale: 0.92, turnDurationScale: 1.32, speedMinBlend: 0,
    speedMaxBlend: 0.42, dartChance: 0.07, dartSpeedMinBlend: 0.86,
    targetDurationScale: 1.22
  }),
  "koi": createFishLocomotionProfile({
    movementPattern: "broad-bottom-cruise", preferredY: 0.6, verticalSpread: 0.52,
    targetDistanceMin: 0.28, targetDistanceMax: 0.68, headingPersistence: 0.82,
    hoverChance: 0.035, hoverMinMs: 900, hoverMaxMs: 2100, schoolStrength: 0.46,
    schoolSpacingScale: 1.28, schoolDurationScale: 1.34, schoolVerticalJitterScale: 0.72,
    structureAffinity: 0.82, caveAffinity: 0.05, startleStrength: 0.82,
    startleRecoveryScale: 1.08, turnDurationScale: 1.32, speedMinBlend: 0.3,
    speedMaxBlend: 0.68, targetDurationScale: 1.24
  }),
  "lionfish": createFishLocomotionProfile({
    movementPattern: "shelter-hover-glide", preferredY: 0.56, verticalSpread: 0.48,
    targetDistanceMin: 0.06, targetDistanceMax: 0.3, headingPersistence: 0.5,
    hoverChance: 0.44, hoverMinMs: 1400, hoverMaxMs: 4300, schoolStrength: 0,
    structureAffinity: 2.15, caveAffinity: 2.35, homeRangeStrength: 0.76,
    homeRangeRadius: 0.18, startleStrength: 0.68, startleRecoveryScale: 1.18,
    turnDurationScale: 1.52, speedMinBlend: 0.02, speedMaxBlend: 0.38,
    dartChance: 0.035, dartSpeedMinBlend: 0.88, targetDurationScale: 1.38
  }),
  "bull-shark": createFishLocomotionProfile({
    movementPattern: "wide-cruise", preferredY: 0.46, verticalSpread: 0.56,
    targetDistanceMin: 0.3, targetDistanceMax: 0.7, headingPersistence: 0.97,
    hoverChance: 0.015, schoolStrength: 0.08, structureAffinity: 0.64,
    caveAffinity: 0.1, startleStrength: 0.72, turnDurationScale: 0.72,
    speedMinBlend: 0.55, speedMaxBlend: 0.98, targetDurationScale: 1.2
  }),
  "great-white-shark": createFishLocomotionProfile({
    movementPattern: "wide-cruise", preferredY: 0.42, verticalSpread: 0.46,
    targetDistanceMin: 0.38, targetDistanceMax: 0.76, headingPersistence: 0.985,
    hoverChance: 0.006, schoolStrength: 0, structureAffinity: 0.48,
    caveAffinity: 0.04, startleStrength: 0.58, turnDurationScale: 0.62,
    speedMinBlend: 0.62, speedMaxBlend: 1, targetDurationScale: 1.28
  }),
  "hammerhead-shark": createFishLocomotionProfile({
    movementPattern: "search-cruise", preferredY: 0.5, verticalSpread: 0.62,
    targetDistanceMin: 0.26, targetDistanceMax: 0.62, headingPersistence: 0.95,
    hoverChance: 0.035, schoolStrength: 0.16, schoolSpacingScale: 1.08,
    structureAffinity: 0.72, caveAffinity: 0.16, startleStrength: 0.86,
    turnDurationScale: 0.76, speedMinBlend: 0.5, speedMaxBlend: 0.92,
    targetDurationScale: 1.15
  }),
  "orca": createFishLocomotionProfile({
    movementPattern: "pod-cruise", preferredY: 0.44, verticalSpread: 0.54,
    targetDistanceMin: 0.3, targetDistanceMax: 0.7, headingPersistence: 0.82,
    hoverChance: 0.02, schoolStrength: 0.78, schoolSpacingScale: 0.9,
    schoolDurationScale: 1.38, schoolVerticalJitterScale: 0.58, structureAffinity: 0.54,
    caveAffinity: 0.04, startleStrength: 0.68, turnDurationScale: 0.7,
    speedMinBlend: 0.56, speedMaxBlend: 0.98, targetDurationScale: 0.84
  }),
  "sunfish": createFishLocomotionProfile({
    movementPattern: "gentle-drift", preferredY: 0.42, verticalSpread: 0.58,
    targetDistanceMin: 0.08, targetDistanceMax: 0.28, headingPersistence: 0.36,
    hoverChance: 0.34, hoverMinMs: 1500, hoverMaxMs: 4200, schoolStrength: 0.02,
    structureAffinity: 0.82, caveAffinity: 0.08, startleStrength: 0.48,
    startleRecoveryScale: 1.32, turnDurationScale: 1.6, speedMinBlend: 0.02,
    speedMaxBlend: 0.28, targetDurationScale: 1.42
  }),
  "seahorse": createFishLocomotionProfile({
    movementPattern: "vertical-hover", preferredY: 0.56, verticalSpread: 0.42,
    targetDistanceMin: 0.04, targetDistanceMax: 0.18, headingPersistence: 0.22,
    hoverChance: 0.48, hoverMinMs: 1200, hoverMaxMs: 3600, schoolStrength: 0.04,
    structureAffinity: 1.74, caveAffinity: 0.78, homeRangeStrength: 0.58,
    homeRangeRadius: 0.14, startleStrength: 0.7, startleRecoveryScale: 1.2,
    turnDurationScale: 1.5, speedMinBlend: 0, speedMaxBlend: 0.28, targetDurationScale: 1.36
  }),
  "pilot-fish": createFishLocomotionProfile({
    movementPattern: "companion-cruise", preferredY: 0.44, verticalSpread: 0.66,
    targetDistanceMin: 0.26, targetDistanceMax: 0.62, headingPersistence: 0.78,
    hoverChance: 0.015, schoolStrength: 0.42, schoolSpacingScale: 1.02,
    schoolDurationScale: 1.22, schoolVerticalJitterScale: 0.72, structureAffinity: 0.62,
    caveAffinity: 0.08, startleStrength: 0.92, turnDurationScale: 0.82,
    speedMinBlend: 0.56, speedMaxBlend: 0.96, targetDurationScale: 0.88
  }),
  "davy-dwarf-chimera-barracuda": createFishLocomotionProfile({
    movementPattern: "patrol-burst", preferredY: 0.46, verticalSpread: 0.58,
    targetDistanceMin: 0.34, targetDistanceMax: 0.76, headingPersistence: 0.9,
    hoverChance: 0.24, hoverMinMs: 2400, hoverMaxMs: 5200, schoolStrength: 0,
    structureAffinity: 0.3, caveAffinity: 0.05, startleStrength: 1.3,
    startleRecoveryScale: 0.82, turnDurationScale: 0.72, speedMinBlend: 0.55,
    speedMaxBlend: 0.92, dartChance: 0.22, dartSpeedMinBlend: 0.92, targetDurationScale: 0.9
  }),
  "davy-bioluminescent-angler-pike": createFishLocomotionProfile({
    movementPattern: "ambush-hover", preferredY: 0.5, verticalSpread: 0.48,
    targetDistanceMin: 0.05, targetDistanceMax: 0.28, headingPersistence: 0.82,
    hoverChance: 0.62, hoverMinMs: 4200, hoverMaxMs: 9200, schoolStrength: 0,
    structureAffinity: 1.35, caveAffinity: 0.7, homeRangeStrength: 0.45, homeRangeRadius: 0.18,
    startleStrength: 1.5, startleRecoveryScale: 1.3, turnDurationScale: 1.2,
    speedMinBlend: 0.05, speedMaxBlend: 0.36, dartChance: 0.09, dartSpeedMinBlend: 0.95, targetDurationScale: 1.35
  }),
  "davy-bioluminescent-glass-fangfish": createFishLocomotionProfile({
    movementPattern: "cover-dart", preferredY: 0.42, verticalSpread: 0.72,
    targetDistanceMin: 0.08, targetDistanceMax: 0.3, headingPersistence: 0.22,
    hoverChance: 0.04, schoolStrength: 0.04, structureAffinity: 2.1, caveAffinity: 1.4,
    startleStrength: 1.65, startleRecoveryScale: 0.7, turnDurationScale: 0.55,
    speedMinBlend: 0.42, speedMaxBlend: 0.94, dartChance: 0.62, dartSpeedMinBlend: 0.9, targetDurationScale: 0.66
  }),
  "davy-bioluminescent-cherub-goldfish": createFishLocomotionProfile({
    movementPattern: "companion-hover", preferredY: 0.5, verticalSpread: 0.64,
    targetDistanceMin: 0.07, targetDistanceMax: 0.28, headingPersistence: 0.36,
    hoverChance: 0.32, hoverMinMs: 1800, hoverMaxMs: 4800, schoolStrength: 0.48,
    schoolSpacingScale: 1.15, schoolDurationScale: 1.4, structureAffinity: 0.9, caveAffinity: 0.55,
    startleStrength: 0.9, startleRecoveryScale: 1.4, turnDurationScale: 1.35,
    speedMinBlend: 0.08, speedMaxBlend: 0.42, targetDurationScale: 1.25
  })
});
const HIDDEN_FISH_OPTION_IDS = new Set(["loach"]);
const FISH_BEHAVIOR_GROUP_VARIATIONS = Object.freeze({
  "open-water-cruiser": ["bold", "explorer", "social", "routine-loving", "curious", "greedy"],
  "slow-graceful": ["display", "gentle", "sensitive", "homebody", "territorial", "routine-loving", "curious"],
  "small-social": ["social", "shy", "follower", "routine-loving", "curious", "nervous"],
  "bottom-cleaner": ["digger", "cleaner", "night-active", "homebody", "curious", "shy"],
  "special-predator": ["hunter", "bold", "curious", "standoffish", "territorial", "greedy"],
  "shark-cruiser": ["bold", "explorer", "territorial", "routine-loving", "curious", "hunter"],
  "orca-pod": ["social", "hunter", "explorer", "bold", "curious", "routine-loving"],
  "sunfish-gentle": ["gentle", "homebody", "routine-loving", "sensitive", "curious", "shy"],
  "seahorse-drifter": ["gentle", "homebody", "shy", "curious", "routine-loving", "nervous"],
  "pilot-follower": ["follower", "social", "explorer", "curious", "bold", "routine-loving"]
});
const COMFORT_NEED_LABELS = Object.freeze({
  plants: "Plants",
  cave: "Cave",
  bubbler: "Bubbler",
  driftwood: "Driftwood",
  hardscape: "Hardscape",
  seaweed_algae: "Seaweed",
  coral: "Coral",
  spooky: "Spooky Decor",
  open_water: "Open Water",
  school_2_plus: "School 2+",
  surface_cover: "Surface Cover"
});
const COMFORT_CONFLICT_LABELS = Object.freeze({
  betta_present: "Betta Present",
  aggressive_predator: "Aggressive Predator",
  fin_nipper: "Fin Nipper",
  large_fish: "Large Fish",
  tiny_fish: "Tiny Fish",
  same_species: "Same Species",
  tang_present: "Another Tang",
  puffer_present: "Another Puffer",
  surface_crowding: "Surface Crowding",
  overcrowded: "Overcrowded",
  sharp_decor: "Sharp Decor",
  fast_eater: "Fast Eater",
  community_fish: "Community Fish",
  the_cure: "The Cure"
});
const FISH_COMFORT_PROFILES = Object.freeze({
  "guppy": { mealCoins: 1, unlock: null, needs: ["plants", "open_water"], conflicts: ["betta_present", "aggressive_predator", "fin_nipper"] },
  "zebra-danio": { mealCoins: 1, unlock: null, needs: ["open_water", "school_2_plus"], conflicts: ["overcrowded"] },
  "goldfish": { mealCoins: 1, unlock: null, needs: ["open_water", "hardscape"], conflicts: ["overcrowded", "fin_nipper"] },
  "neon-tetra": { mealCoins: 1, unlock: "first-care", needs: ["plants", "school_2_plus"], conflicts: ["betta_present", "aggressive_predator", "large_fish"] },
  "cherry-barb": { mealCoins: 1, unlock: null, needs: ["plants", "school_2_plus"], conflicts: ["betta_present", "aggressive_predator"] },
  "celestial-pearl-danio": { mealCoins: 1, unlock: "first-care", needs: ["plants", "school_2_plus"], conflicts: ["betta_present", "large_fish", "aggressive_predator"] },
  "chili-rasbora": { mealCoins: 1, unlock: "first-care", needs: ["plants", "school_2_plus"], conflicts: ["large_fish", "aggressive_predator", "fast_eater"] },
  "ember-tetra": { mealCoins: 1, unlock: "first-care", needs: ["plants", "school_2_plus"], conflicts: ["large_fish", "aggressive_predator", "fast_eater"] },
  "harlequin-rasbora": { mealCoins: 1, unlock: "stable-tank", needs: ["open_water", "school_2_plus"], conflicts: ["aggressive_predator", "overcrowded"] },
  "pencilfish": { mealCoins: 1, unlock: "stable-tank", needs: ["surface_cover", "school_2_plus"], conflicts: ["aggressive_predator", "fast_eater"] },
  "rummy-nose-tetra": { mealCoins: 1, unlock: "stable-tank", needs: ["open_water", "school_2_plus"], conflicts: ["aggressive_predator", "overcrowded"] },
  "moor-goldfish": { mealCoins: 1, unlock: "first-care", needs: ["open_water", "hardscape"], conflicts: ["sharp_decor", "fin_nipper", "overcrowded"] },
  "otocinclus": { mealCoins: 0, unlock: "stable-tank", needs: ["seaweed_algae", "plants"], conflicts: ["aggressive_predator", "large_fish"] },
  "molly": { mealCoins: 1, unlock: "stable-tank", needs: ["seaweed_algae", "open_water"], conflicts: ["aggressive_predator", "overcrowded"] },
  "livebearer": { mealCoins: 1, unlock: "stable-tank", needs: ["plants", "open_water"], conflicts: ["aggressive_predator", "overcrowded"] },
  "loach": { mealCoins: 1, unlock: "stable-tank", needs: ["cave", "plants"], conflicts: ["sharp_decor", "aggressive_predator"] },
  "swordtail": { mealCoins: 1, unlock: "stable-tank", needs: ["open_water", "plants"], conflicts: ["same_species", "overcrowded"] },
  "betta": { mealCoins: 1, unlock: "happy-habitat", needs: ["plants", "cave"], conflicts: ["betta_present", "community_fish", "fin_nipper"] },
  "blue-ram": { mealCoins: 1, unlock: "happy-habitat", needs: ["cave", "plants"], conflicts: ["fast_eater", "aggressive_predator"] },
  "piranha": { mealCoins: 1, unlock: "happy-habitat", needs: ["open_water", "cave"], conflicts: ["community_fish", "overcrowded"] },
  "wonder-killifish": { mealCoins: 1, unlock: "happy-habitat", needs: ["surface_cover", "open_water"], conflicts: ["tiny_fish", "surface_crowding"] },
  "rainbowfish": { mealCoins: 1, unlock: "happy-habitat", needs: ["open_water", "school_2_plus"], conflicts: ["overcrowded", "aggressive_predator"] },
  "gourami": { mealCoins: 1, unlock: "happy-habitat", needs: ["surface_cover", "plants"], conflicts: ["betta_present", "fin_nipper"] },
  "discus": { mealCoins: 2, unlock: "master-keeper", needs: ["plants", "driftwood"], conflicts: ["fast_eater", "aggressive_predator"] },
  "angelfish": { mealCoins: 2, unlock: "master-keeper", needs: ["plants", "open_water"], conflicts: ["fin_nipper", "tiny_fish"] },
  "clownfish": { mealCoins: 2, unlock: "happy-habitat", needs: ["coral", "cave"], conflicts: ["same_species", "aggressive_predator"] },
  "royal-gramma": { mealCoins: 2, unlock: "happy-habitat", needs: ["cave", "hardscape"], conflicts: ["same_species"] },
  "yellow-tang": { mealCoins: 2, unlock: "master-keeper", needs: ["seaweed_algae", "open_water"], conflicts: ["tang_present", "overcrowded"] },
  "blue-tang": { mealCoins: 2, unlock: "master-keeper", needs: ["open_water", "seaweed_algae"], conflicts: ["tang_present", "overcrowded"] },
  "pufferfish": { mealCoins: 2, unlock: "marine-curator", needs: ["cave", "hardscape"], conflicts: ["community_fish", "puffer_present"] },
  "koi": { mealCoins: 2, unlock: null, needs: ["open_water", "school_2_plus"], conflicts: ["overcrowded"] },
  "lionfish": { mealCoins: 2, unlock: null, needs: ["cave", "coral"], conflicts: ["overcrowded"] },
  "bull-shark": { mealCoins: 3, unlock: "marine-curator", needs: ["open_water", "hardscape"], conflicts: ["overcrowded"] },
  "great-white-shark": { mealCoins: 4, unlock: "borough-legends", needs: ["open_water", "hardscape"], conflicts: ["overcrowded"] },
  "hammerhead-shark": { mealCoins: 3, unlock: "marine-curator", needs: ["open_water", "hardscape"], conflicts: ["overcrowded"] },
  "orca": { mealCoins: 4, unlock: "borough-legends", needs: ["open_water", "school_2_plus"], conflicts: ["overcrowded"] },
  "sunfish": { mealCoins: 2, unlock: "master-keeper", needs: ["open_water", "surface_cover"], conflicts: ["overcrowded"] },
  "seahorse": { mealCoins: 2, unlock: "happy-habitat", needs: ["plants", "surface_cover"], conflicts: ["fast_eater", "aggressive_predator"] },
  "pilot-fish": { mealCoins: 2, unlock: "master-keeper", needs: ["open_water"], conflicts: ["overcrowded"] }
});
const PROGRESSION_MILESTONES = Object.freeze([
  {
    id: "first-care",
    label: "First Care",
    requirement: "Finish a Daily Recap with score 3+.",
    reward: 3,
    unlocks: ["chili-rasbora", "ember-tetra", "neon-tetra", "celestial-pearl-danio", "moor-goldfish"],
    decorUnlocks: ["floating-swamp-moss__plant__theme-natural.png", "fishing-lure__lure__theme-artificial.png", "treasure-chest__bubbler__theme-treasure__front.png"],
    isMet: (stats) => stats.latestScore >= 3,
    progress: (stats) => [{ value: (Number(stats.latestScore) || 0) / 3, label: `Latest recap score ${Math.max(0, Number(stats.latestScore) || 0)}/3` }]
  },
  {
    id: "stable-tank",
    label: "Stable Tank",
    requirement: "Finish 3 good recaps and keep recent average comfort at 70%+.",
    reward: 8,
    unlocks: ["harlequin-rasbora", "pencilfish", "rummy-nose-tetra", "otocinclus", "molly", "livebearer", "swordtail"],
    decorUnlocks: ["driftwood-root__wood__theme-natural.png", "driftwood__wood__theme-natural.png", "moss-bridge__wood-plant__theme-natural.png", "slate__cave-rock__theme-natural__front.png"],
    isMet: (stats) => stats.goodRecaps >= 3 && stats.recentAverageComfort >= 70,
    progress: (stats) => [
      { value: (Number(stats.goodRecaps) || 0) / 3, label: `Good recaps ${Math.min(Number(stats.goodRecaps) || 0, 3)}/3` },
      { value: (Number(stats.recentAverageComfort) || 0) / 70, label: `Recent comfort ${Math.min(Number(stats.recentAverageComfort) || 0, 70)}%/70%` }
    ]
  },
  {
    id: "happy-habitat",
    label: "Happy Habitat",
    requirement: "Keep any fish alive for 7 days and recent average comfort at 80%+.",
    reward: 12,
    unlocks: ["betta", "blue-ram", "piranha", "wonder-killifish", "rainbowfish", "gourami", "clownfish", "royal-gramma", "seahorse"],
    decorUnlocks: ["large-mushroom-coral__coral__theme-reef.png", "wizard-castle__cave__theme-fantasy__front.png", "blue-castle__cave__theme-fantasy__front.png", "meteor__cave-rock__theme-space__front.png", "volcano__bubbler__theme-natural__front.png", "volcano__bubbler__theme-natural__v2__front.png", "__custom-decor-shop__", "__custom-hide-shop__"],
    isMet: (stats) => stats.oldestLivingFishAgeMs >= WEEK_MS && stats.recentAverageComfort >= 80,
    progress: (stats) => [
      { value: (Number(stats.oldestLivingFishAgeMs) || 0) / WEEK_MS, label: `Oldest fish ${formatDuration(Math.min(Number(stats.oldestLivingFishAgeMs) || 0, WEEK_MS))}/7d` },
      { value: (Number(stats.recentAverageComfort) || 0) / 80, label: `Recent comfort ${Math.min(Number(stats.recentAverageComfort) || 0, 80)}%/80%` }
    ]
  },
  {
    id: "master-keeper",
    label: "Master Keeper",
    requirement: "Go 14 days without a death and have one fish at Sparkling comfort.",
    reward: 18,
    unlocks: ["discus", "angelfish", "yellow-tang", "blue-tang", "sunfish", "pilot-fish"],
    decorUnlocks: [],
    isMet: (stats) => stats.daysSinceLastDeath >= 14 && stats.hasSparklingFish,
    progress: (stats) => [
      { value: (Number(stats.daysSinceLastDeath) || 0) / 14, label: `No-death streak ${Math.min(Number(stats.daysSinceLastDeath) || 0, 14)}/14d` },
      { value: stats.hasSparklingFish ? 1 : 0, label: stats.hasSparklingFish ? "Sparkling fish found" : "Needs one Sparkling fish" }
    ]
  },
  {
    id: "marine-curator",
    label: "Marine Curator",
    requirement: "Keep any fish alive for 21 days and finish 10 good recaps.",
    reward: 20,
    unlocks: ["pufferfish", "bull-shark", "hammerhead-shark"],
    decorUnlocks: [],
    isMet: (stats) => stats.oldestLivingFishAgeMs >= 21 * DAY_MS && stats.goodRecaps >= 10,
    progress: (stats) => [
      { value: (Number(stats.oldestLivingFishAgeMs) || 0) / (21 * DAY_MS), label: `Oldest fish ${formatDuration(Math.min(Number(stats.oldestLivingFishAgeMs) || 0, 21 * DAY_MS))}/21d` },
      { value: (Number(stats.goodRecaps) || 0) / 10, label: `Good recaps ${Math.min(Number(stats.goodRecaps) || 0, 10)}/10` }
    ]
  },
  {
    id: "borough-legends",
    label: "Borough Legends",
    requirement: "Keep any fish alive for 30 days, finish 15 good recaps, and have one fish at Sparkling comfort.",
    reward: 30,
    unlocks: ["great-white-shark", "orca", "__custom-fish-shop__"],
    decorUnlocks: [],
    isMet: (stats) => stats.oldestLivingFishAgeMs >= 30 * DAY_MS && stats.goodRecaps >= 15 && stats.hasSparklingFish,
    progress: (stats) => [
      { value: (Number(stats.oldestLivingFishAgeMs) || 0) / (30 * DAY_MS), label: `Oldest fish ${formatDuration(Math.min(Number(stats.oldestLivingFishAgeMs) || 0, 30 * DAY_MS))}/30d` },
      { value: (Number(stats.goodRecaps) || 0) / 15, label: `Good recaps ${Math.min(Number(stats.goodRecaps) || 0, 15)}/15` },
      { value: stats.hasSparklingFish ? 1 : 0, label: stats.hasSparklingFish ? "Sparkling fish found" : "Needs one Sparkling fish" }
    ]
  },
  {
    id: "clean-start",
    label: "Clean Start",
    requirement: "Keep cleanliness at 90%+ for 3 daily recaps in a row.",
    reward: 5,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.cleanRecapStreak90 >= 3,
    progress: (stats) => [{ value: (Number(stats.cleanRecapStreak90) || 0) / 3, label: `90%+ clean recaps ${Math.min(Number(stats.cleanRecapStreak90) || 0, 3)}/3` }]
  },
  {
    id: "crystal-keeper",
    label: "Crystal Keeper",
    requirement: "Keep cleanliness at 95%+ for 7 daily recaps in a row.",
    reward: 12,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.cleanRecapStreak95 >= 7,
    progress: (stats) => [{ value: (Number(stats.cleanRecapStreak95) || 0) / 7, label: `95%+ clean recap streak ${Math.min(Number(stats.cleanRecapStreak95) || 0, 7)}/7` }]
  },
  {
    id: "full-bellies",
    label: "Full Bellies",
    requirement: "Keep fish from reaching Starving for 3 daily recaps in a row.",
    reward: 6,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.allMealsSatisfiedStreak >= 3,
    progress: (stats) => [{ value: (Number(stats.allMealsSatisfiedStreak) || 0) / 3, label: `No-starving streak ${Math.min(Number(stats.allMealsSatisfiedStreak) || 0, 3)}/3` }]
  },
  {
    id: "reliable-feeder",
    label: "Reliable Feeder",
    requirement: "Keep fish from reaching Starving for 7 daily recaps in a row.",
    reward: 14,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.allMealsSatisfiedStreak >= 7,
    progress: (stats) => [{ value: (Number(stats.allMealsSatisfiedStreak) || 0) / 7, label: `No-starving streak ${Math.min(Number(stats.allMealsSatisfiedStreak) || 0, 7)}/7` }]
  },
  {
    id: "cozy-corner",
    label: "Cozy Corner",
    requirement: "Average 80%+ comfort for 3 daily recaps in a row.",
    reward: 6,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.comfort80Streak >= 3,
    progress: (stats) => [{ value: (Number(stats.comfort80Streak) || 0) / 3, label: `80%+ comfort streak ${Math.min(Number(stats.comfort80Streak) || 0, 3)}/3` }]
  },
  {
    id: "little-paradise",
    label: "Little Paradise",
    requirement: "Average 90%+ comfort for 3 daily recaps in a row.",
    reward: 12,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.comfort90Streak >= 3,
    progress: (stats) => [{ value: (Number(stats.comfort90Streak) || 0) / 3, label: `90%+ comfort streak ${Math.min(Number(stats.comfort90Streak) || 0, 3)}/3` }]
  },
  {
    id: "perfect-hour",
    label: "Perfect Hour",
    requirement: "Have any fish reach Sparkling comfort.",
    reward: 5,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.hasSparklingFish || stats.sparklingComfortEvents >= 1,
    progress: (stats) => [{
      value: stats.hasSparklingFish || Number(stats.sparklingComfortEvents) > 0 ? 1 : 0,
      label: stats.hasSparklingFish || Number(stats.sparklingComfortEvents) > 0 ? "Sparkling comfort found" : "Needs one Sparkling fish"
    }]
  },
  {
    id: "perfect-day",
    label: "Perfect Day",
    requirement: "Have Sparkling comfort during a daily recap with score 8+.",
    reward: 15,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.hasPerfectDay,
    progress: (stats) => [{ value: stats.hasPerfectDay ? 1 : 0, label: stats.hasPerfectDay ? "Perfect day recorded" : "Needs score 8+ with Sparkling comfort" }]
  },
  {
    id: "no-drama-day",
    label: "No Drama Day",
    requirement: "Finish a daily recap with no negative events.",
    reward: 5,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.latestNoDramaDay,
    progress: (stats) => [{ value: stats.latestNoDramaDay ? 1 : 0, label: stats.latestNoDramaDay ? "Latest recap had no drama" : "Needs one no-drama recap" }]
  },
  {
    id: "peaceful-week",
    label: "Peaceful Week",
    requirement: "Finish 5 recaps in a row with no attacks or deaths.",
    reward: 16,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.noAttackDeathRecapStreak >= 5,
    progress: (stats) => [{ value: (Number(stats.noAttackDeathRecapStreak) || 0) / 5, label: `Peaceful recap streak ${Math.min(Number(stats.noAttackDeathRecapStreak) || 0, 5)}/5` }]
  },
  {
    id: "gentle-keeper",
    label: "Gentle Keeper",
    requirement: "Finish 3 recaps in a row without stress-tapping fish.",
    reward: 5,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.noGlassTapStressStreak >= 3,
    progress: (stats) => [{ value: (Number(stats.noGlassTapStressStreak) || 0) / 3, label: `Quiet glass streak ${Math.min(Number(stats.noGlassTapStressStreak) || 0, 3)}/3` }]
  },
  {
    id: "calm-glass",
    label: "Calm Glass",
    requirement: "Finish 7 recaps in a row without stress-tapping fish.",
    reward: 12,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.noGlassTapStressStreak >= 7,
    progress: (stats) => [{ value: (Number(stats.noGlassTapStressStreak) || 0) / 7, label: `Quiet glass streak ${Math.min(Number(stats.noGlassTapStressStreak) || 0, 7)}/7` }]
  },
  {
    id: "decorator",
    label: "Decorator",
    requirement: "Place 5 decor items across your aquariums.",
    reward: 5,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.decorPlacedCount >= 5,
    progress: (stats) => [{ value: (Number(stats.decorPlacedCount) || 0) / 5, label: `Decor placed ${Math.min(Number(stats.decorPlacedCount) || 0, 5)}/5` }]
  },
  {
    id: "habitat-builder",
    label: "Habitat Builder",
    requirement: "Satisfy 10 total fish comfort needs at once.",
    reward: 10,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.metNeedsCount >= 10,
    progress: (stats) => [{ value: (Number(stats.metNeedsCount) || 0) / 10, label: `Needs satisfied ${Math.min(Number(stats.metNeedsCount) || 0, 10)}/10` }]
  },
  {
    id: "need-expert",
    label: "Need Expert",
    requirement: "Have every living fish's comfort needs satisfied at once.",
    reward: 15,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.hasAllLivingNeedsMet,
    progress: (stats) => [{ value: stats.hasAllLivingNeedsMet ? 1 : 0, label: stats.hasAllLivingNeedsMet ? "All living needs met" : "Some living fish still need comfort help" }]
  },
  {
    id: "community-tank",
    label: "Community Tank",
    requirement: "Keep 5 community-safe fish in one aquarium, without overcrowding, with 70%+ recent comfort and 3 good recaps.",
    reward: 12,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.hasCommunityTank && stats.goodRecaps >= 3,
    progress: (stats) => [
      { value: stats.hasCommunityTank ? 1 : 0, label: stats.hasCommunityTank ? "Community tank ready" : "Needs 5 peaceful fish and 70%+ recent comfort" },
      { value: (Number(stats.goodRecaps) || 0) / 3, label: `Good recaps ${Math.min(Number(stats.goodRecaps) || 0, 3)}/3` }
    ]
  },
  {
    id: "big-family",
    label: "Big Family",
    requirement: "Own 10 living fish across your aquariums.",
    reward: 10,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.livingFishCount >= 10,
    progress: (stats) => [{ value: (Number(stats.livingFishCount) || 0) / 10, label: `Living fish ${Math.min(Number(stats.livingFishCount) || 0, 10)}/10` }]
  },
  {
    id: "careful-curator",
    label: "Careful Curator",
    requirement: "Own 15 living fish without overcrowding any aquarium.",
    reward: 18,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.livingFishCount >= 15 && stats.noOvercrowdedTanks,
    progress: (stats) => [
      { value: (Number(stats.livingFishCount) || 0) / 15, label: `Living fish ${Math.min(Number(stats.livingFishCount) || 0, 15)}/15` },
      { value: stats.noOvercrowdedTanks ? 1 : 0, label: stats.noOvercrowdedTanks ? "No overcrowded tanks" : "One or more tanks are overcrowded" }
    ]
  },
  {
    id: "first-generation",
    label: "First Generation",
    requirement: "Hatch one egg.",
    reward: 8,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.hatchedFishEvents >= 1,
    progress: (stats) => [{ value: Number(stats.hatchedFishEvents) || 0, label: `Eggs hatched ${Math.min(Number(stats.hatchedFishEvents) || 0, 1)}/1` }]
  },
  {
    id: "nursery-keeper",
    label: "Nursery Keeper",
    requirement: "Raise 3 baby fish past juvenile stage.",
    reward: 16,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.grownBabyFishCount >= 3,
    progress: (stats) => [{ value: (Number(stats.grownBabyFishCount) || 0) / 3, label: `Raised babies ${Math.min(Number(stats.grownBabyFishCount) || 0, 3)}/3` }]
  },
  {
    id: "gravel-luck",
    label: "Gravel Luck",
    requirement: "Find 5 gravel coins.",
    reward: 5,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.gravelCoinFinds >= 5,
    progress: (stats) => [{ value: (Number(stats.gravelCoinFinds) || 0) / 5, label: `Gravel coins ${Math.min(Number(stats.gravelCoinFinds) || 0, 5)}/5` }]
  },
  {
    id: "treasure-hunter",
    label: "Treasure Hunter",
    requirement: "Find 25 gravel coins.",
    reward: 18,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.gravelCoinFinds >= 25,
    progress: (stats) => [{ value: (Number(stats.gravelCoinFinds) || 0) / 25, label: `Gravel coins ${Math.min(Number(stats.gravelCoinFinds) || 0, 25)}/25` }]
  },
  {
    id: "medicine-cabinet",
    label: "Medicine Cabinet",
    requirement: "Heal fish or use medicine 3 times.",
    reward: 8,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.healingEvents >= 3,
    progress: (stats) => [{ value: (Number(stats.healingEvents) || 0) / 3, label: `Healing events ${Math.min(Number(stats.healingEvents) || 0, 3)}/3` }]
  },
  {
    id: "rescue-keeper",
    label: "Rescue Keeper",
    requirement: "Heal a fish and go 3 days without a death afterward.",
    reward: 12,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.hasRescueKeeper,
    progress: (stats) => [{ value: stats.hasRescueKeeper ? 1 : 0, label: stats.hasRescueKeeper ? "Rescue streak complete" : "Needs a heal followed by 3 safe days" }]
  },
  {
    id: "tank-network",
    label: "Tank Network",
    requirement: "Own 3 aquariums and connect them with Bubble Borough tubes.",
    reward: 20,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.connectedTubeTankCount >= 3,
    progress: (stats) => [{ value: (Number(stats.connectedTubeTankCount) || 0) / 3, label: `Tube-connected tanks ${Math.min(Number(stats.connectedTubeTankCount) || 0, 3)}/3` }]
  }
]);
const DECOR_UNLOCK_REQUIREMENTS = Object.freeze({
  "fishing-lure__lure__theme-artificial.png": "first-care",
  "treasure-chest__bubbler__theme-treasure__front.png": "first-care",
  "floating-swamp-moss__plant__theme-natural.png": "first-care",
  "driftwood-root__wood__theme-natural.png": "stable-tank",
  "driftwood__wood__theme-natural.png": "stable-tank",
  "moss-bridge__wood-plant__theme-natural.png": "stable-tank",
  "slate__cave-rock__theme-natural__front.png": "stable-tank",
  "large-mushroom-coral__coral__theme-reef.png": "happy-habitat",
  "wizard-castle__cave__theme-fantasy__front.png": "happy-habitat",
  "blue-castle__cave__theme-fantasy__front.png": "happy-habitat",
  "meteor__cave-rock__theme-space__front.png": "happy-habitat",
  "volcano__bubbler__theme-natural__front.png": "happy-habitat",
  "volcano__bubbler__theme-natural__v2__front.png": "happy-habitat",
  "__custom-decor-shop__": "happy-habitat",
  "__custom-hide-shop__": "happy-habitat",
});
const MANAGEMENT_HISTORY_PAGE_SIZE = 12;
const MAX_TANK_EVENT_HISTORY = 2000;
const MAX_BOROUGH_HAPPENINGS = 160;
const MAX_MEMORIAL_HISTORY = 240;
const HALLOWEEN_MODE_AUTOMATIC = "automatic";
const HALLOWEEN_MODE_ON = "on";
const HALLOWEEN_MODE_OFF = "off";
const HALLOWEEN_MODE_OPTIONS = Object.freeze([
  HALLOWEEN_MODE_AUTOMATIC,
  HALLOWEEN_MODE_ON,
  HALLOWEEN_MODE_OFF
]);
const FISH_AGE_MILESTONE_DAYS = Object.freeze([7, 30, 100, 365]);
const BOROUGH_NOTIFICATION_COOLDOWN_MS = 22 * 1000;
const BOROUGH_NOTIFICATION_DUPLICATE_MS = 3 * MINUTE_MS;
const NOTIFICATION_CENTER_HISTORY_LIMIT = 60;
const CRITICAL_COMFORT_HEALTH_TICK_MS = 6 * HOUR_MS;
const POOP_FALL_MS = 18 * 1000;
const POOP_DRAW_WIDTH_PX = 36;
const TANK_WIDTH = 1280;
const TANK_HEIGHT = 720;
const TARGET_STAGE_ASPECT_RATIO = TANK_WIDTH / TANK_HEIGHT;
const NARROW_STAGE_ASPECT_RATIO = 0.5;
const MIN_VIEWPORT_ASSET_SCALE = 0.76;
const VIEWPORT_OBJECT_SCALE_PROFILES = Object.freeze({
  decor: Object.freeze({ min: 0.58, max: 1.18 }),
  fish: Object.freeze({ min: 0.55, max: 1.1 }),
  hardware: Object.freeze({ min: 0.64, max: 1.06 })
});
const VIEWPORT_OBJECT_NARROW_LIMIT_MIN = 0.72;
const VIEWPORT_OBJECT_SHORT_LIMIT_MIN = 0.72;
const SCRUB_GRID_COLS = 72;
const SCRUB_GRID_ROWS = 40;
const DEFAULT_SCRUB_THRESHOLD = 0.95;
const WALLPAPER_ENGINE_SCRUB_THRESHOLD = 0.85;
const SCRUB_AUTO_COMPLETE_GRACE_THRESHOLD = 0.8;
const SCRUB_AUTO_COMPLETE_GRACE_MS = 5 * 1000;
const SCRUB_BRUSH_RADIUS = 62;
const SCRUB_STROKE_STEP = 17;
const SCRUB_MAX_STAMPS = 2400;
const GRIME_CACHE_PRECISION = 240;
const GRIME_CANVAS_RENDER_SCALE = 0.5;
const GRIME_VISUAL_START_DIRTINESS = 0;
const SEVERE_GRIME_VISUAL_THRESHOLD = 0.72;
const GRIME_OVERLAY_OVERSCAN = 1.1;
const GRIME_OVERLAY_ASSET_PATHS = Object.freeze([
  resolveAppUrl("assets/grime/grime-level-1.webp")
]);
const CLEAN_FADE_MS = 950;
const CLEAN_SPARKLE_MS = 1550;
const CARE_TASK_COMPLETE_HOLD_MS = 2200;
const DEFAULT_THEME = "dark";
// Location selectors are intentionally disabled in the current UI. Keep the
// underlying settings code available so the feature can be restored later.
const TOOLBAR_POSITION_SETTING_ENABLED = false;
const DISPLAY_POSITION_SETTING_ENABLED = false;
const CAUSTIC_LIGHTING_SETTING_ENABLED = true;
const DECOR_SHADOWS_SETTING_ENABLED = true;

// Shared aquarium depth treatment. Layer 1 is closest to the front glass and
// Layer 5 sits against the rear of the tank. Keep these values centralized so
// fish, decor, machinery, shadows, and continuous substrate surfaces all resolve
// their visual depth from the same source.
const DEPTH_VISUALS = Object.freeze({
  1: Object.freeze({ haze: 0, saturation: 1, contrast: 1, blurPx: 0, coolTint: 0, shadowStrength: 1, movementMultiplier: 1 }),
  2: Object.freeze({ haze: 0.015, saturation: 0.99, contrast: 0.98, blurPx: 0.05, coolTint: 0.01, shadowStrength: 0.88, movementMultiplier: 0.98 }),
  3: Object.freeze({ haze: 0.03, saturation: 0.97, contrast: 0.96, blurPx: 0.15, coolTint: 0.025, shadowStrength: 0.75, movementMultiplier: 0.96 }),
  4: Object.freeze({ haze: 0.045, saturation: 0.95, contrast: 0.94, blurPx: 0.25, coolTint: 0.04, shadowStrength: 0.65, movementMultiplier: 0.94 }),
  5: Object.freeze({ haze: 0.06, saturation: 0.92, contrast: 0.91, blurPx: 0.35, coolTint: 0.05, shadowStrength: 0.55, movementMultiplier: 0.92 })
});
const DEPTH_VISUAL_COOL_TINT_RGB = Object.freeze({ r: 76, g: 188, b: 211 });
const DEPTH_VISUAL_SUBSTRATE_SOFTNESS_MAX_PX = 0.35;
// The rear background is behind Layer 5, but a standard aquarium is shallow.
// Use only a restrained fraction of the Layer 5 treatment so the background
// recedes without looking like deep water or fog.
const BACKGROUND_DEPTH_VISUAL_STRENGTH = 0.65;
const SUBSTRATE_GROUND_SHADOW = Object.freeze({
  startLayer: 1,
  startAlpha: 0.12,
  endAlpha: 0.22,
  color: Object.freeze({ r: 56, g: 43, b: 31 }),
  hillInsetPx: 1.4,
  hillAmplitudePx: 5.7,
  hillSecondaryAmplitudePx: 2.4,
  hillSegments: 12,
  topFadeRatio: 0.18,
  midFadeRatio: 0.38
});
const DECOR_GROUND_SHADOWS = Object.freeze({
  baseAlphaMultiplier: 1.22,
  baseRadiusXMultiplier: 1.0,
  baseRadiusYMultiplier: 1.1,
  baseOffsetY: -2.8,
  baseMidAlphaMultiplier: 0.62,
  contactCoreAlphaMultiplier: 1.3,
  contactSoftAlphaMultiplier: 0.82,
  contactRadiusXMultiplier: 1.02,
  contactRadiusYMultiplier: 1.0,
  shadowDarknessCap: 3
});
const DEPTH_VISUAL_SUBSTRATE_BASE_SHADOW_START_RATIO = 0.5;
const DEPTH_VISUAL_SUBSTRATE_BASE_SHADOW_MAX_ALPHA = 0.18;
const DEPTH_VISUAL_SUBSTRATE_BASE_SHADOW_RGB = Object.freeze({ r: 58, g: 46, b: 33 });
const DEBUG_DEPTH_TUNING_STORAGE_KEY = "bubble-borough-debug-depth-tuning-v1";
const DEPTH_EFFECT_LEVEL_MIN = 0;
const DEPTH_EFFECT_LEVEL_MAX = 4;
const DEPTH_EFFECT_LEVEL_DEFAULT = 1;
const DEPTH_EFFECT_LEVEL_PREFERENCE_KEY = "bubble-borough-depth-effect-level-v1";
const DEPTH_EFFECT_LEVEL_LABELS = Object.freeze(["Off", "Subtle", "Medium", "Strong", "Max"]);
const DEFAULT_DEBUG_DEPTH_TUNING = Object.freeze({
  saturation: 1,
  contrast: 1,
  coolTint: 1,
  haze: 1,
  substrate: 1,
  shadow: 1,
  movement: 1,
  shadowDarkness: 1.3
});
const DEFAULT_CONTENT_SETTINGS = Object.freeze({
  violenceAndGoreEnabled: false,
  trypophobiaEnabled: false
});
const DEFAULT_UI_SETTINGS = Object.freeze({
  toolbarPosition: "bottom-center",
  toolbarTileColor: "#00438a",
  displayPosition: "top-left",
  toolbarCollapsed: false,
  displayCollapsed: false,
  careTaskPaneOpen: false,
  soundMuted: false,
  uiSoundsMuted: false,
  tankMouseInputLocked: false,
  layoutRatioLockEnabled: true,
  layoutRatioLockWidth: 0,
  layoutRatioLockHeight: 0,
  ambientBubblesEnabled: true,
  waterParticlesEnabled: true,
  causticLightingEnabled: true,
  decorShadowsEnabled: true,
  depthEffectLevel: DEPTH_EFFECT_LEVEL_DEFAULT,
  backgroundDepthHazeEnabled: true,
  simpleTurnAnimationsOnly: false,
  halloweenMode: HALLOWEEN_MODE_AUTOMATIC,
  editOverlayMode: "fish"
});
const BOROUGH_OVERVIEW_FISH_FPS = 24;
const BOROUGH_OVERVIEW_FISH_FRAME_MS = 1000 / BOROUGH_OVERVIEW_FISH_FPS;
const CUSTOM_IMAGE_BACKGROUND_ASSET_KEY = "__custom-image-background__";
const CUSTOM_DECOR_SHOP_KEY = "__custom-decor-shop__";
const CUSTOM_DECOR_KEY_PREFIX = "__custom-decor-";
const CUSTOM_HIDE_SHOP_KEY = "__custom-hide-shop__";
const CUSTOM_HIDE_KEY_PREFIX = "__custom-hide-";
const CUSTOM_BUBBLER_DECOR_KEY = "__custom-bubbler__";
const CUSTOM_FISH_SHOP_KEY = "__custom-fish-shop__";
const CUSTOM_FISH_KEY_PREFIX = "__custom-fish-";
const CUSTOM_DECOR_COST = 10;
const CUSTOM_HIDE_COST = 10;
const CUSTOM_BUBBLER_COST = 8;
const CUSTOM_FISH_COST = 75;
const CUSTOM_DECOR_DEFAULT_WIDTH = 200;
const CUSTOM_DECOR_MIN_WIDTH = 40;
const CUSTOM_DECOR_MAX_WIDTH = 1440;
const CUSTOM_FISH_DEFAULT_WIDTH = 140;
const CUSTOM_FISH_MIN_WIDTH = 40;
const CUSTOM_FISH_MAX_WIDTH = 420;
const CUSTOM_FISH_ROTATION_MIN_DEGREES = -45;
const CUSTOM_FISH_ROTATION_MAX_DEGREES = 45;
const MAX_CUSTOM_BACKGROUND_IMAGE_DIMENSION = 1920;
const MAX_CUSTOM_DECOR_IMAGE_DIMENSION = 640;
const MAX_CUSTOM_FISH_IMAGE_DIMENSION = 640;
const DEFAULT_CUSTOM_DECOR_MOTION_TYPE = "standard-static";
const DEFAULT_CUSTOM_DECOR_MOTION_SPLIT_Y = 0.55;
const DEFAULT_CUSTOM_DECOR_MOTION_INTENSITY = 1;
const MIN_CUSTOM_DECOR_MOTION_INTENSITY = 0;
const MAX_CUSTOM_DECOR_MOTION_INTENSITY = 2.5;
const DEFAULT_DECOR_MOTION_SPEED = 1;
const MIN_DECOR_MOTION_SPEED = 0.2;
const MAX_DECOR_MOTION_SPEED = 3;
const DEFAULT_DECOR_SWAY_SIDE = "above";
const DECOR_WARP_SLICE_TARGET_PX = 2.25;
const DECOR_WARP_MIN_SLICES = 28;
const DECOR_WARP_MAX_SLICES = 180;
const DECOR_WARP_SLICE_OVERLAP_PX = 1.1;
const DECOR_SWAY_SIDE_OPTIONS = Object.freeze([
  { id: "above", label: "Above Line" },
  { id: "below", label: "Below Line" }
]);
const CUSTOM_DECOR_MOTION_TYPES = Object.freeze([
  {
    id: "standard-static",
    label: "Standard Static Object",
    summary: "Solid and still.",
    usesSplit: false,
    hasBob: false,
    hasSway: false
  },
  {
    id: "suspended-static",
    label: "Suspended Static Object",
    summary: "Bobs at depth while the top sways.",
    usesSplit: true,
    hasBob: true,
    hasSway: true
  },
  {
    id: "standard-seaweed",
    label: "Standard Seaweed",
    summary: "Planted base with a swaying top.",
    usesSplit: true,
    hasBob: false,
    hasSway: true
  },
  {
    id: "floating-seaweed",
    label: "Floating/Suspended Object",
    summary: "Bobs gently while the selected image portion sways.",
    usesSplit: true,
    hasBob: true,
    hasSway: true
  }
]);
const SAFE_CHUM_PELLET_COLORS = Object.freeze({
  base: "#8F2030",
  accent: "#C94A5D",
  highlight: "#FFB6C1"
});
const FILTERED_GORE_DECOR_KEYS = new Set([
  "halloween-gorebag__lure__theme-halloween.png",
  "halloween-fish-head-effigy__ornament__theme-halloween.png",
  "halloween-fish-head-effigy__ornament__theme-halloween__v2.png",
  "halloween-fish-head-effigy__ornament__theme-halloween__v3.png"
]);
const NONE_BACKGROUND_ASSET_KEY = "none.png";
const DEFAULT_BACKGROUND_ASSET_KEY = NONE_BACKGROUND_ASSET_KEY;
const CUSTOM_BACKGROUND_MODE_SOLID = "solid";
const CUSTOM_BACKGROUND_MODE_GRADIENT = "gradient";
const CUSTOM_BACKGROUND_MODE_ANIMATED = "animated";
const DEFAULT_TANK_BACKGROUND_ASSET_KEY = NONE_BACKGROUND_ASSET_KEY;
const DEFAULT_TANK_CUSTOM_BACKGROUND_MODE = CUSTOM_BACKGROUND_MODE_ANIMATED;
const DEFAULT_ANIMATED_BACKGROUND_SURFACE_BLOOM_COLOR = "#78DCFF";
const DEFAULT_ANIMATED_BACKGROUND_SHADOW_BLOOM_COLOR = "#0050B4";
const DEFAULT_SOLID_BACKGROUND_COLOR = "#0D84B4";
const DEFAULT_GRADIENT_BACKGROUND_START_COLOR = "#8EE6FF";
const DEFAULT_GRADIENT_BACKGROUND_END_COLOR = "#1A5FAF";
const DEFAULT_ANIMATED_BACKGROUND_TOP_COLOR = "#7FDCFF";
const DEFAULT_ANIMATED_BACKGROUND_MID_COLOR = "#1B8BD1";
const DEFAULT_ANIMATED_BACKGROUND_BOTTOM_COLOR = "#064F8F";
const DEFAULT_ANIMATED_BACKGROUND_ABYSS_COLOR = "#022A5C";
const DEFAULT_ANIMATED_BACKGROUND_HIGHLIGHT_COLOR = "#FFFFFF";
const DEFAULT_ANIMATED_BACKGROUND_DRIFT_A_COLOR = "#96E6FF";
const DEFAULT_ANIMATED_BACKGROUND_DRIFT_B_COLOR = "#50BEFF";
const DEFAULT_ANIMATED_BACKGROUND_DRIFT_C_COLOR = "#0078DC";
const ANIMATED_BACKGROUND_COLOR_GROUPS = Object.freeze([
  { key: "surface", label: "Color Scheme", description: "color scheme" }
]);
const ANIMATED_BACKGROUND_SOURCE_PALETTE = Object.freeze({
  surfaceBloom: DEFAULT_ANIMATED_BACKGROUND_SURFACE_BLOOM_COLOR,
  shadowBloom: DEFAULT_ANIMATED_BACKGROUND_SHADOW_BLOOM_COLOR,
  surface: DEFAULT_ANIMATED_BACKGROUND_TOP_COLOR,
  mid: DEFAULT_ANIMATED_BACKGROUND_MID_COLOR,
  deep: DEFAULT_ANIMATED_BACKGROUND_BOTTOM_COLOR,
  abyss: DEFAULT_ANIMATED_BACKGROUND_ABYSS_COLOR,
  highlight: DEFAULT_ANIMATED_BACKGROUND_HIGHLIGHT_COLOR,
  driftA: DEFAULT_ANIMATED_BACKGROUND_DRIFT_A_COLOR,
  driftB: DEFAULT_ANIMATED_BACKGROUND_DRIFT_B_COLOR,
  driftC: DEFAULT_ANIMATED_BACKGROUND_DRIFT_C_COLOR
});
const DEFAULT_OWNED_BACKGROUND_KEYS = Object.freeze([NONE_BACKGROUND_ASSET_KEY, CUSTOM_IMAGE_BACKGROUND_ASSET_KEY]);
const CUSTOM_GRAVEL_LAYER_COUNT = 3;
const DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR = "#2F80FF";
const CUSTOM_GRAVEL_LAYER_SPECS = Object.freeze([
  {
    id: "layer-1",
    label: "Back Layer",
    fileName: "Gravel_L1.png",
    manifestKeys: ["Gravel_L1.png", "Gravel_1.png"]
  },
  {
    id: "layer-2",
    label: "Middle Layer",
    fileName: "Gravel_L2.png",
    manifestKeys: ["Gravel_L2.png", "Gravel_2.png"]
  },
  {
    id: "layer-3",
    label: "Front Layer",
    fileName: "Gravel_L3.png",
    manifestKeys: ["Gravel_L3.png", "Gravel_3.png"]
  }
]);
const CUSTOM_GRAVEL_TOP_PEBBLE_SPECS = Object.freeze([
  { id: "top-pebble-1", fileName: "pebble_1.png", manifestKeys: ["pebble_1.png"] },
  { id: "top-pebble-2", fileName: "pebble_2.png", manifestKeys: ["pebble_2.png"] },
  { id: "top-pebble-3", fileName: "pebble_3.png", manifestKeys: ["pebble_3.png"] }
]);
const CUSTOM_GRAVEL_TOP_PEBBLE_COUNT = 260;
const CUSTOM_GRAVEL_TOP_PEBBLE_DEPTH_PX = 34;
const CUSTOM_GRAVEL_CONTOUR_PEBBLE_COUNT = 200;
const CUSTOM_GRAVEL_CONTOUR_PEBBLE_X_JITTER_RATIO = 0.36;
const CUSTOM_GRAVEL_CONTOUR_PEBBLE_SETTLE_MIN_RATIO = 0.02;
const CUSTOM_GRAVEL_CONTOUR_PEBBLE_SETTLE_MAX_RATIO = 0.14;
const CUSTOM_GRAVEL_TOP_PEBBLE_SIZE_MIN_PX = 10;
const CUSTOM_GRAVEL_TOP_PEBBLE_SIZE_MAX_PX = 10;
const CUSTOM_GRAVEL_CONTOUR_PEBBLE_SIZE_MIN_PX = 9;
const CUSTOM_GRAVEL_CONTOUR_PEBBLE_SIZE_MAX_PX = 11;
const CUSTOM_GRAVEL_TOP_PEBBLE_SPRITE_CACHE_SIZE = 96;
const FISH_GRAVEL_PEBBLE_ACTIVITY = "gravel-play";
const FISH_GRAVEL_DIG_ACTIVITY = "gravel-dig";
const FISH_GRAVEL_PEBBLE_CHANCE_PER_SECOND = 0.0026;
const MAX_ACTIVE_FISH_GRAVEL_PEBBLE_ACTIONS = 1;
const MAX_ACTIVE_FISH_GRAVEL_PEBBLE_TOSSES = 6;
const FISH_GRAVEL_PEBBLE_PICKUP_REACHED_DISTANCE_NORM = 0.026;
const FISH_GRAVEL_PEBBLE_SPIT_REACHED_DISTANCE_NORM = 0.03;
const FISH_GRAVEL_PEBBLE_PICKUP_Y_OFFSET_MIN_PX = 12;
const FISH_GRAVEL_PEBBLE_PICKUP_Y_OFFSET_MAX_PX = 20;
const FISH_GRAVEL_PEBBLE_CARRY_RISE_MIN_NORM = 0.18;
const FISH_GRAVEL_PEBBLE_CARRY_RISE_MAX_NORM = 0.32;
const FISH_GRAVEL_PEBBLE_TOP_LAYER_SIZE_SCALE_MIN = 1.65;
const FISH_GRAVEL_PEBBLE_TOP_LAYER_SIZE_SCALE_MAX = 2.05;
const FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX = CUSTOM_GRAVEL_TOP_PEBBLE_SIZE_MIN_PX * FISH_GRAVEL_PEBBLE_TOP_LAYER_SIZE_SCALE_MIN;
const FISH_GRAVEL_PEBBLE_HOLD_SIZE_MAX_PX = Math.max(
  FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX,
  CUSTOM_GRAVEL_TOP_PEBBLE_SIZE_MAX_PX * FISH_GRAVEL_PEBBLE_TOP_LAYER_SIZE_SCALE_MAX
);
const FISH_GRAVEL_PEBBLE_FRONT_SCAN_RATIO = 0.16;
const FISH_GRAVEL_PEBBLE_MOUTH_OVERLAP_RATIO = 0.1;
// Shared by custom gravel, fish tinting, decor color layers, bubbler bubbles, and gravel/background swatches.
const CUSTOM_GRAVEL_COLOR_OPTIONS = Object.freeze([
  { key: "white-glow", label: "White", color: "#FFFFFF" },
  { key: "cream-ivory", label: "Cream / Ivory", color: "#FFF4D6", uvReactive: false },
  { key: "light-tan", label: "Light Tan", color: "#F1D7A6", uvReactive: false },
  { key: "silver-gray", label: "Silver Gray", color: "#BFC7D2", uvReactive: false },
  { key: "stone-gray", label: "Gray", color: "#8C96A8", uvReactive: false },
  { key: "slate-gray", label: "Slate Gray", color: "#81909F", uvReactive: false },
  { key: "peach", label: "Peach", color: "#F5C185", uvReactive: false },
  { key: "tan", label: "Tan", color: "#D9BA82", uvReactive: false },
  { key: "aged-gold", label: "Aged Gold", color: "#D7C56A", uvReactive: false },
  { key: "standard-yellow", label: "Standard Yellow", color: "#FFD700" },
  { key: "sun-yellow", label: "Sun Yellow", color: "#FFD93D" },
  { key: "gold-flare", label: "Gold Flare", color: "#FFB703" },
  { key: "orange-zing", label: "Orange Zing", color: "#FF8C42" },
  { key: "tangerine-pop", label: "Tangerine Pop", color: "#FF6B35" },
  { key: "dark-tan", label: "Dark Tan", color: "#B88C57", uvReactive: false },
  { key: "dark-brown", label: "Dark Brown", color: "#5A3825", uvReactive: false },
  { key: "coral-punch", label: "Coral Punch", color: "#FF5E78" },
  { key: "dusty-rose", label: "Dusty Rose", color: "#E07A9C", uvReactive: false },
  { key: "bubblegum", label: "Bubblegum", color: "#FF77E1" },
  { key: "hot-pink", label: "Hot Pink", color: "#FF4FBF" },
  { key: "magenta-flash", label: "Magenta Flash", color: "#E83DFF" },
  { key: "ruby-red", label: "Ruby Red", color: "#FF3355" },
  { key: "cherry-pop", label: "Cherry Pop", color: "#FF1744" },
  { key: "crimson-wave", label: "Crimson Wave", color: "#E63946" },
  { key: "blood-red", label: "Deep Red / Blood Red", color: "#8A0303", uvReactive: false },
  { key: "lavender-mist", label: "Lavender Mist", color: "#B98DEB", uvReactive: false },
  { key: "lavender-periwinkle", label: "Lavender / Periwinkle", color: "#A79BFF" },
  { key: "orchid-glow", label: "Orchid Glow", color: "#C65BFF" },
  { key: "violet-burst", label: "Violet Burst", color: "#B55CFF" },
  { key: "ultraviolet", label: "Ultraviolet", color: "#8E5BFF" },
  { key: "royal-purple", label: "Royal Purple", color: "#6D3DFF" },
  { key: "deep-purple", label: "Deep Purple", color: "#4B1D95" },
  { key: "periwinkle", label: "Periwinkle", color: "#8AA8F7", uvReactive: false },
  { key: "lagoon-blue", label: "Lagoon Blue", color: "#67C8E0", uvReactive: false },
  { key: "cyan-pop", label: "Cyan Pop", color: "#18D6FF" },
  { key: "aqua-burst", label: "Aqua Burst", color: "#1FE7C9" },
  { key: "teal-current", label: "Teal Current", color: "#00B8A9" },
  { key: "electric-blue", label: "Electric Blue", color: "#2F80FF" },
  { key: "indigo-pulse", label: "Indigo Pulse", color: "#4F46E5" },
  { key: "deep-navy", label: "Deep Navy", color: "#1D2A6D", uvReactive: false },
  { key: "mint-glass", label: "Mint Glass", color: "#6FD7B8", uvReactive: false },
  { key: "seafoam-glow", label: "Seafoam Glow", color: "#42F5A1" },
  { key: "jade-flash", label: "Jade Flash", color: "#10D98B" },
  { key: "meadow-green", label: "Meadow Green", color: "#8FD368", uvReactive: false },
  { key: "lime-spark", label: "Lime Spark", color: "#A8FF2A" },
  { key: "neon-green", label: "Neon Green", color: "#57F000" },
  { key: "forest-green", label: "Forest Green", color: "#2E6B3E", uvReactive: false },
  { key: "charcoal", label: "Charcoal", color: "#4E5966", uvReactive: false },
  { key: "deep-black", label: "Black", color: "#212121", uvReactive: false },
  { key: "black-black", label: "Black Black", color: "#000000", uvReactive: false }
]);
const TANK_ANIMATED_BACKGROUND_PRESETS = Object.freeze([
  { key: "deep-ocean", label: "Deep Ocean", color: "#1D2A6D" },
  { key: "lagoon", label: "Lagoon", color: "#00B8A9" },
  { key: "tropical", label: "Tropical", color: "#42F5A1" },
  { key: "sunrise", label: "Sunrise", color: "#FF8C42" },
  { key: "coral-pulse", label: "Coral Pulse", color: "#FF5E78" },
  { key: "aurora", label: "Aurora", color: "#6D3DFF" },
  { key: "bioluminescent", label: "Bioluminescent", color: "#18D6FF" },
  { key: "midnight", label: "Midnight", color: "#4B1D95" }
]);

const CUSTOM_GRAVEL_UV_REACTIVE_COLOR_KEYS = new Set(
  CUSTOM_GRAVEL_COLOR_OPTIONS
    .filter((choice) => choice.uvReactive !== false)
    .map((choice) => choice.key)
);
const LEGACY_DEFAULT_CUSTOM_GRAVEL_LAYER_COLORS = Object.freeze([
  "#2F80FF",
  "#57F000",
  "#FF4FBF"
]);
const DEFAULT_CUSTOM_GRAVEL_LAYER_COLORS = Object.freeze([
  "#F1D7A6",
  "#B88C57",
  "#D9BA82"
]);
const DEFAULT_DECOR_SCALE = 1.5;
const DECOR_SCALE_MIN = 0.5;
const DECOR_SCALE_MAX = 6;
const DEFAULT_FISH_SCALE = 1;
const FISH_SCALE_MIN = 0.5;
const FISH_SCALE_MAX = 3;
const FISH_HUE_SHIFT_MIN = -180;
const FISH_HUE_SHIFT_MAX = 180;
const FISH_SATURATION_MIN = 0;
const FISH_SATURATION_MAX = 200;
const FISH_BRIGHTNESS_MIN = 50;
const FISH_BRIGHTNESS_MAX = 150;
const FISH_CATALOG_WIDTH_MIN = 70;
const FISH_CATALOG_WIDTH_MAX = 488;
const FISH_WORLD_SIZE_MULTIPLIER = 1;
const DECOR_WORLD_SIZE_MULTIPLIER = 1;
const DECOR_X_ANCHOR_MODE_CENTER_OFFSET = "center-offset";
const DECOR_Y_ANCHOR_MODE_BOTTOM_GAP = "bottom-gap";
const DECOR_Y_ANCHOR_MODE_TOP_GAP = "top-gap";
const DECOR_Y_ANCHOR_MODE_COLUMN_FRACTION = "column-fraction";
const DECOR_Y_ANCHOR_MODES = Object.freeze([
  DECOR_Y_ANCHOR_MODE_BOTTOM_GAP,
  DECOR_Y_ANCHOR_MODE_TOP_GAP,
  DECOR_Y_ANCHOR_MODE_COLUMN_FRACTION
]);
const SIZE_STEP = 0.05;
const GRAVEL_COLOR_SWATCHES = Object.freeze(CUSTOM_GRAVEL_COLOR_OPTIONS.map((choice) => choice.color));
const DEFAULT_GRAVEL_PALETTE = ["#F5C185", "#E07A9C", "#81909F"];
const AMBIENT_BUBBLE_COUNT = 30;
const AMBIENT_BUBBLE_DEPTH_LAYERS = 5;
const TANK_DEPTH_LAYERS = 5;
const FISH_LAYER_DEPTH_SCALE_STEP = 0.1;
const DEFAULT_BUBBLER_SPOUT_QTY = 1;
const DEFAULT_BUBBLER_INTENSITY = 1;
const MAX_BUBBLER_INTENSITY = 24;
const DEFAULT_BUBBLER_SPREAD_PX = 14;
const DEFAULT_BUBBLER_FADE_DISTANCE_PX = 140;
const DEFAULT_BUBBLER_BUBBLE_COLOR = "#FFFFFF";
const DEFAULT_BUBBLER_LIGHT_COLOR = "#FF9A35";
const DEFAULT_BUBBLER_BUBBLE_OPACITY = 1.35;
const DEFAULT_BUBBLER_FILL_TINT_ENABLED = true;
const DEFAULT_BUBBLER_FILL_OPACITY = 0.28;
const DEFAULT_BUBBLER_SPEED = 1;
const MIN_BUBBLER_SPEED = 0.05;
const MAX_BUBBLER_SPEED = 4;
const DEFAULT_CUSTOM_BUBBLER_AMOUNT = 8;
const MIN_CUSTOM_BUBBLER_AMOUNT = 0.1;
const DEFAULT_CUSTOM_BUBBLER_BUBBLE_SIZE = 1;
const MIN_CUSTOM_BUBBLER_BUBBLE_SIZE = 0.35;
const MAX_CUSTOM_BUBBLER_BUBBLE_SIZE = 20;
const MIN_CUSTOM_BUBBLER_OPACITY = 0.25;
const MAX_CUSTOM_BUBBLER_OPACITY = 3;
const MIN_CUSTOM_BUBBLER_WIDTH_PX = 0;
const MAX_CUSTOM_BUBBLER_WIDTH_PX = 260;
const MIN_CUSTOM_BUBBLER_DISTANCE_PX = 40;
const MAX_CUSTOM_BUBBLER_DISTANCE_PX = 1000;
const CUSTOM_BUBBLER_HIT_SCALE = 2;
const DEFAULT_CUSTOM_BUBBLER_DIRECTION = "up";
const BUBBLER_DIRECTION_OPTIONS = Object.freeze([
  { id: "up", label: "Up" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "down", label: "Down" }
]);
const MAX_BUBBLER_VISIBLE_BUBBLES_PER_SPOUT = 72;
const MIN_BUBBLER_STREAM_CADENCE_MS = 95;
const MAX_BUBBLER_STREAM_CADENCE_MS = 6000;
const DEFAULT_BUBBLER_TRAVEL_DURATION_MS = 3600;
const MIN_BUBBLER_TRAVEL_DURATION_MS = 900;
const MAX_BUBBLER_TRAVEL_DURATION_MS = 45000;
const DEFAULT_BUBBLER_POP_ENABLED = false;
const DEFAULT_BUBBLER_MALFORMED_ENABLED = false;
const DEFAULT_BUBBLER_MALFORMED_INTENSITY = 0.75;
const MIN_BUBBLER_MALFORMED_INTENSITY = 0;
const MAX_BUBBLER_MALFORMED_INTENSITY = 2;
const DEFAULT_BUBBLER_MALFORMED_SPEED = 0.75;
const MIN_BUBBLER_MALFORMED_SPEED = 0.05;
const MAX_BUBBLER_MALFORMED_SPEED = 3;
const BUBBLER_POP_MICRO_BUBBLE_COUNT = 10;
const DISEASE_GREEN_BUBBLE_COLOR = "#7DDF22";
const DISEASE_GREEN_BUBBLE_CADENCE_MS = 1800;
const DISEASE_GREEN_BUBBLE_MIN_TRAVEL_MS = 5400;
const DISEASE_GREEN_BUBBLE_POP_MS = 620;
const DISEASE_GREEN_BUBBLE_MAX_PER_FISH = 24;
const DEFAULT_TANK_LAYER = 3;
const LAYER_BOTTOM_GRAVEL_SURFACE_OFFSET_PX = 0;
const LAYER_BOTTOM_GRAVEL_STEP_PX = 20;
const LAYER_LIMIT_PULSE_MS = 620;
const GRAVEL_BED_STAMP_COUNT = 7600;
const GRAVEL_SPRITE_CACHE_SIZE = 256;
const GRAVEL_PEBBLE_SIZE_MIN = 7;
const GRAVEL_PEBBLE_SIZE_MAX = 14;
const GRAVEL_BED_DEPTH_PX = 92;
const GRAVEL_LIVE_LAYER_DEPTH_PX = 10;
const GRAVEL_SURFACE_CAP_DEPTH_PX = 18;
const GRAVEL_SURFACE_EMBED_PX = 3.5;
const GRAVEL_PULL_ZONE_PX = 30;
const GRAVEL_VARIANT_BUCKETS = 7;
const GRAVEL_FISH_DISTURB_RADIUS_PX = 56;
const GRAVEL_FISH_DISTURB_MS_MIN = 1600;
const GRAVEL_FISH_DISTURB_MS_MAX = 3200;
const GRAVEL_CACHE_OVERSAMPLE = 1.08;
// Estimated from the desktop reference screenshot: the gravel band reads as
// roughly 17% of the visible tank stage height.
const GRAVEL_VIEWPORT_HEIGHT_RATIO = 0.17;
const MOBILE_GRAVEL_VIEWPORT_HEIGHT_RATIO = 1 / 3;
const MOBILE_SWIM_EDGE_INSET_PX = 8;
const MOBILE_VIEWPORT_OBJECT_SCALE_MULTIPLIERS = Object.freeze({
  fish: 0.62,
  decor: 0.68,
  hardware: 0.74
});
const FISH_NEED_KEYS = Object.freeze(["hunger", "energy", "social", "comfort", "hygiene", "environment", "stimulation"]);
const FISH_NEED_DEFAULTS = Object.freeze({
  hunger: 68,
  energy: 72,
  social: 70,
  comfort: 70,
  hygiene: 78,
  environment: 70,
  stimulation: 70
});
const FISH_NEED_MOOD_WEIGHTS = Object.freeze({
  hunger: 0.2,
  energy: 0.15,
  social: 0.15,
  comfort: 0.2,
  hygiene: 0.15,
  environment: 0.15,
  stimulation: 0
});
const FISH_HUNGER_LOW_THRESHOLD = 55;
const FISH_HUNGER_CRITICAL_THRESHOLD = 14;
const FISH_ENERGY_LOW_THRESHOLD = 30;
const FISH_ENERGY_CRITICAL_THRESHOLD = 15;
const FISH_AUTO_FEEDER_COOLDOWN_MS = 8 * MINUTE_MS;
const FISH_AUTO_FEEDER_TANK_COOLDOWN_MS = 55 * 1000;
const FISH_NEEDS_MAX_OFFLINE_MS = 6 * HOUR_MS;
const FISH_DAILY_FEEDING_CARE_COIN_CAP = 8;
const MOBILE_VIEWPORT_OBJECT_SCALE_MIN = 0.22;
const SUBSTRATE_CONTOUR_POINTS = 26;
const ALPHA_HIT_THRESHOLD = 26;
const ALPHA_COLLISION_THRESHOLD = 40;
const ALPHA_MASK_GRID_SIZE = 28;
const GLASS_MARGIN_X = 0;
const GLASS_MARGIN_BOTTOM = 0;
let WATER_SURFACE_Y = 112;
const WATER_SURFACE_VIEWPORT_TOP_PX = 112;
const FLOOR_Y = TANK_HEIGHT * 0.83;
const CAVE_CENTER_TARGET_SIZE_PX = 50;
const CAVE_NAV_MAX_SIZE = 220;
const CAVE_PATH_NODE_STEP = 10;
const CAVE_STRICT_SAMPLE_STEP_PX = 2;
const CAVE_PLAN_SAMPLE_STEP_PX = 4;
const CAVE_PLAN_SEGMENT_STEP_PX = 10;
const CAVE_PORTAL_SCAN_RADIUS_PX = 28;
const CAVE_GENERAL_REACHED_DISTANCE_NORM = 0.018;
const CAVE_MOUTH_REACHED_DISTANCE_NORM = 0.014;
const CAVE_TRIGGER_COOLDOWN_MS = 10 * 1000;
const CAVE_POST_EXIT_COOLDOWN_MS = 24 * 1000;
const CAVE_NORMAL_ROAM_SIT_CHANCE_DAY = 0.25;
const CAVE_NORMAL_ROAM_LEAVE_CHANCE_DAY = 0.25;
const CAVE_NORMAL_ROAM_SIT_CHANCE_NIGHT = 0.5;
const CAVE_NORMAL_ROAM_LEAVE_CHANCE_NIGHT = 0.25;
const CAVE_NORMAL_SEAT_HOLD_MIN_MS = 12 * 1000;
const CAVE_NORMAL_SEAT_HOLD_MAX_MS = 22 * 1000;
const CAVE_NORMAL_SEAT_SETTLE_DISTANCE_NORM = 0.008;
const CAVE_DEBUG_TEST_ROAM_MS = 5 * 1000;
const CAVE_DEBUG_TEST_SEAT_MS = 2 * 1000;
const CAVE_DEBUG_TEST_SEAT_SETTLE_DISTANCE_NORM = 0.008;
const CAVE_SEAT_LOCKED_LAYER = 4;
const CAVE_TRIGGER_STALL_FORCE_MS = 250;
const CAVE_TRIGGER_STALL_FORCE_DISTANCE_NORM = 0.034;
const CAVE_SEAT_MARKER_MAX_SIZE_PX = 18;
const CAVE_SEAT_MARKER_EXPAND_RADIUS_PX = 22;
const CAVE_DERIVED_TRIGGER_MIN_AREA_PX = 24;
const CAVE_SETTINGS_MIN_ENTRIES = 1;
const CAVE_SETTINGS_DEFAULT_ENTRIES = 1;
const CAVE_SETTINGS_MAX_ENTRIES = 10;
const CAVE_SETTINGS_MIN_SEATS = 1;
const CAVE_SETTINGS_DEFAULT_SEATS = 2;
const CAVE_SETTINGS_MAX_SEATS = 10;
const CAVE_SETTINGS_DEFAULT_ENTRY = Object.freeze({ x: 0.5, y: 0.67 });
const CAVE_ENTRY_SIDE_OPTIONS = Object.freeze([
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "both", label: "Both" }
]);
const OPTIONAL_BUBBLE_ORB_ASSET_PATH = "assets/misc/bubble.png";
const ENABLE_PORTABLE_PERFORMANCE_MODE = true;
const PORTABLE_PERFORMANCE_MEDIA_QUERY = "(hover: none) and (pointer: coarse)";
const PORTABLE_PERFORMANCE_MAX_RENDER_DPR = 1.25;
const PORTABLE_PERFORMANCE_MAX_FPS = 30;
const PORTABLE_PERFORMANCE_WATER_PARTICLE_COUNT = 30;
const PORTABLE_PERFORMANCE_WATER_PARTICLE_CLEAN_VISIBLE_COUNT = 30;
const PORTABLE_PERFORMANCE_WATER_PARTICLE_DIRTY_VISIBLE_COUNT = 30;
const PORTABLE_PERFORMANCE_AMBIENT_BUBBLE_COUNT = 18;
const PORTABLE_PERFORMANCE_MAX_BUBBLER_VISIBLE_BUBBLES_PER_SPOUT = 32;
const PORTABLE_PERFORMANCE_RESIZE_DEBOUNCE_MS = 120;
const PORTABLE_PERFORMANCE_TANK_BLUR_SCALE = 0.55;
const PORTABLE_PERFORMANCE_GRIME_BLUR_SCALE = 0.5;


const FISH_DIRTINESS_BONUS_MIN = 0.01;
const FISH_DIRTINESS_BONUS_MAX = 0.10;
const SUCKER_FISH_CLEAN_DURATION_BONUS = 0.25;
const SUCKER_FISH_CLEAN_DURATION_BONUS_CAP = 0.9;
const DEAD_FISH_DIRTINESS_BONUS = 0.5;
const CRITICAL_TANK_DIRTINESS = 0.999;
const SICK_FISH_HEALTH_RATIO_THRESHOLD = 0.5;
const LOW_HEALTH_PANIC_HEALTH_UNITS = 1;
const POOP_ASSET_PATH = "assets/misc/fishpoops.png";
const FISH_EGG_ASSET_PATH = resolveAppUrl("assets/misc/fish_egg.png");
const FISH_EGG_CRACKED_ASSET_PATH = resolveAppUrl("assets/misc/fish_egg_cracked.png");
const FISH_EGG_SHELL_ASSET_PATH = resolveAppUrl("assets/misc/fish_egg_shell.png");
const WATER_PARTICLE_ASSET_PATHS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => resolveAppUrl(`assets/misc/particle${index + 1}.png`))
);
const FISH_DIRECTION_TARGET_DEADZONE_NORM = 0.006;
const FISH_SWIM_TILT_MAX = Math.PI / 4;
const FISH_SWIM_TILT_RESPONSE_PER_SECOND = 5.2;
const FISH_SWIM_TILT_MAX_RADIANS_PER_SECOND = 2.35;
const FISH_SWIM_TILT_SETTLE_EPSILON = 0.001;
const FISH_TURN_MIN_SCALE_X = 0.42;
const FISH_TURN_MAX_SCALE_Y = 1.12;
const FISH_TURN_MIN_MS = 130;
const FISH_TURN_MAX_MS = 210;
// The segmented turnaround rig is authored on a 0..1.08 second timeline.
// Keep the gameplay turn alive for that entire sequence instead of squeezing
// it into the legacy 130-210ms sprite-flip window.
const FISH_TURN_RIG_SEGMENTS = 12;
const FISH_TURN_RIG_COLLAPSE_DURATION = 0.12;
const FISH_TURN_RIG_COLLAPSE_STEP = 0.055;
const FISH_TURN_RIG_REBUILD_DURATION = 0.15;
const FISH_TURN_RIG_REBUILD_STEP = 0.05;
const FISH_TURN_RIG_FRONT_SHRINK = 0.18;
const FISH_TURN_RIG_TAIL_SWELL = 0.12;
const FISH_TURN_RIG_FOLLOWER_LAG = 0.9;
const FISH_TURN_RIG_TAIL_START_DELAY = 0;
const FISH_TURN_RIG_REBUILD_OVERLAP = 0.35;
const FISH_TURN_RIG_EXIT_PULL = 0.58;
const FISH_TURN_RIG_RELEASE_CURVE = 0.5;
const FISH_TURN_RIG_HEAD_STAGGER = 1;
const FISH_TURN_RIG_REVERSE_EMERGENCE_PULL = false;
const FISH_TURN_RIG_CENTER_SEAM_SCALE = 1;
const FISH_TURN_RIG_SEAM_BRIDGE = 0;
const FISH_TURN_RIG_CONTINUOUS_OVERLAP = 0.85;
const FISH_TURN_RIG_EDGE_SOFTEN_SRC = 1.25;
const FISH_TURN_RIG_EDGE_SOFTEN_DEST = 1.15;
const FISH_TURN_RIG_INTERNAL_TIMELINE_MAX = 1.08;
const FISH_TURN_RIG_TIMELINE_RATE = 0.24;
const FISH_TURN_RIG_PLAYBACK_SPEED = 2.5;
const FISH_TURN_RIG_DURATION_MS = (
  FISH_TURN_RIG_INTERNAL_TIMELINE_MAX
  / (FISH_TURN_RIG_TIMELINE_RATE * FISH_TURN_RIG_PLAYBACK_SPEED)
) * 1000;
const FISH_TURN_RIG_MIN_DURATION_MS = 1000;
const FISH_TURN_RIG_MAX_DURATION_MS = 3200;
const FISH_TURN_RIG_BEHAVIOR_DURATION_SCALE = Object.freeze({
  piranha: 0.86,
  sucker: 1.08,
});
const FISH_TURN_RIG_VISIBLE_COLUMN_DENSITY = 0.55;
const FISH_TURN_RIG_VISIBLE_MAX_COLUMNS = 48;
const FISH_TURN_RIG_CAUSTIC_COLUMN_DENSITY = 0.08;
const FISH_TURN_RIG_CAUSTIC_MAX_COLUMNS = 4;
const FISH_TURN_RIG_MOVEMENT_RELEASE_PROGRESS = 0.62;
const fishTurnRigCanvasCache = new WeakMap();
const KNOWN_DECOR_TRYPOPHOBIA_VARIANT_PATHS = new Set([
  "assets/decor/cave_layered/coral-shelf-1__cave-coral__theme-reef__trypophobia__front.png",
  "assets/decor/cave_layered/coral-shelf-6__cave-coral__theme-reef__trypophobia__front.png",
  "assets/decor/cave_layered/coral-shelf-10__cave-coral__theme-reef__trypophobia__front.png",
  "assets/decor/cave_layered/coral-shelf-9__cave-coral__theme-reef__trypophobia__front__color2.png"
].map((path) => path.toLowerCase()));
const NAUTILUS_STATE_HOVER = "hover";
const NAUTILUS_STATE_JET = "jet";
const NAUTILUS_STATE_GLIDE = "glide";
const NAUTILUS_STATE_APPROACH_REST = "approach-rest";
const NAUTILUS_STATE_ATTACHING = "attaching";
const NAUTILUS_STATE_RESTING = "resting";
const NAUTILUS_STATE_DETACHING = "detaching";
const NAUTILUS_HOVER_MIN_MS = 1400;
const NAUTILUS_HOVER_MAX_MS = 4200;
const NAUTILUS_JET_MIN_MS = 360;
const NAUTILUS_JET_MAX_MS = 680;
const NAUTILUS_GLIDE_MIN_MS = 1100;
const NAUTILUS_GLIDE_MAX_MS = 2600;
const NAUTILUS_ATTACH_DURATION_MS = 1150;
const NAUTILUS_DETACH_DURATION_MS = 900;
const NAUTILUS_REST_MIN_MS = 10000;
const NAUTILUS_REST_MAX_MS = 28000;
const NAUTILUS_REST_DECISION_CHANCE = 0.34;
const NAUTILUS_REST_REACH_WIDTH_RATIO = 0.42;
const NAUTILUS_REST_APPROACH_EXTRA_PX = 24;
const NAUTILUS_TENTACLE_PIVOT_X = 0.43;
const NAUTILUS_TENTACLE_PIVOT_Y = 0.54;
const CAVE_ALLOWED_OUTSIDE_LAYERS = Object.freeze([1, 2, 5]);
const MAX_VALID_CAVE_PLANS_PER_EVAL = 2;
const MAX_FISH_RETARGETS_PER_FRAME = 2;
const AUTO_DISPENSER_DRAW_WIDTH = 252;
const AUTO_DISPENSER_DRAW_HEIGHT = Math.round(AUTO_DISPENSER_DRAW_WIDTH * (340 / 943));
const AUTO_DISPENSER_VIEWPORT_SIZE_MULTIPLIER = 1.5;
const AUTO_DISPENSER_TOP_MOUNT_OVERHANG_PX = 18;
// Normal aquarium travel should leave room for fish to feel observably alive.
// Emergency behavior stacks its own multiplier on top of this base pace.
const FISH_MOTION_SCALE = 1.62;
const FISH_SHADOW_LAYER_EASE_MS = 420;
const FISH_LAYER_DEPTH_SCALE_EASE_MS = 520;
const SUCKER_FISH_FACE_PIVOT_ENABLED = true;
const SUCKER_FISH_FACE_PIVOT_X = 0.88;
const SUCKER_FISH_FACE_PIVOT_Y = 0.5;
const SUCKER_FISH_GLASS_SHADOW_ENABLED = true;
const SUCKER_FISH_GLASS_SHADOW_ALPHA = 0.16;
const SUCKER_FISH_GLASS_SHADOW_BLUR_PX = 2.25;
const SUCKER_FISH_GLASS_SHADOW_OFFSET_X = 0.75;
const SUCKER_FISH_GLASS_SHADOW_OFFSET_Y = 3.25;
const SUCKER_FISH_GLASS_SHADOW_SCALE = 1.012;
const SUCKER_FISH_BACK_GLASS_LAYER = TANK_DEPTH_LAYERS;
const SUCKER_FISH_FRONT_GLASS_LAYER = 1;
const SUCKER_FISH_BACK_GLASS_MIN_Y_NORM = 0.18;
const SUCKER_FISH_BACK_GLASS_MAX_Y_NORM = 0.76;
const SUCKER_FISH_FRONT_GLASS_MIN_Y_NORM = 0.18;
const SUCKER_FISH_FRONT_GLASS_MAX_Y_NORM = 0.96;
const SUCKER_FISH_FRONT_GLASS_SCRUB_RADIUS = 7;
const SUCKER_FISH_FRONT_GLASS_SCRUB_MOUTH_INSET_RATIO = 0.075;
// Automatic sucker-fish cleaning is visually continuous, but batching the mask
// updates prevents a dirty tank from rebuilding the grime overlay every frame.
const SUCKER_FISH_FRONT_GLASS_SCRUB_COOLDOWN_MS = 160;
const SUCKER_FISH_FRONT_GLASS_SCRUB_MAX_INTERVAL_MS = 240;
const SUCKER_FISH_FRONT_GLASS_SCRUB_MIN_DISTANCE_PX = 1.5;
const SUCKER_FISH_FRONT_GLASS_SCRUB_STROKE_STEP_PX = 5.5;
const SUCKER_FISH_FRONT_GLASS_DIRTINESS_REDUCTION_PER_SCRUB_COVERAGE = 0.45;
const SUCKER_FISH_FRONT_GLASS_GRIME_TARGET_CHANCE = 0.72;
const SUCKER_FISH_COLLISION_ITERATIONS = 3;
const SUCKER_FISH_COLLISION_RADIUS_X_RATIO = 0.43;
const SUCKER_FISH_COLLISION_RADIUS_Y_RATIO = 0.36;
const SUCKER_FISH_COLLISION_PADDING_PX = 4;
const SUCKER_FISH_FRONT_GLASS_ASSET_BY_SPECIES = Object.freeze({
  otocinclus: "assets/fish/otocinclus_bottom.png"
});
const SUCKER_FISH_FREE_SWIM_ASSET_BY_SPECIES = Object.freeze({
  otocinclus: "assets/fish/otocinclus_side.png"
});
const SUCKER_FISH_FREE_SWIM_DISTANCE_NORM = 0.3;
const SUCKER_FISH_FREE_SWIM_GRIME_DISTANCE_NORM = 0.26;
const SUCKER_FISH_FREE_SWIM_ARRIVAL_DISTANCE_NORM = 0.028;
const SUCKER_FISH_FREE_SWIM_SPEED_MIN = 0.022;
const SUCKER_FISH_FREE_SWIM_SPEED_MAX = 0.03;
const SUCKER_FISH_FREE_SWIM_MIN_DURATION_MS = 1700;
const SUCKER_FISH_FREE_SWIM_MAX_DURATION_MS = 7200;
const SUCKER_FISH_FREE_SWIM_LAYER = 3;
const SUCKER_FISH_VIEW_TRANSITION_DURATION_MS = 680;
const SUCKER_FISH_VIEW_TRANSITION_MIN_SCALE_Y = 0.07;
const OTOCINCLUS_STATE_COMMIT_MS = 20 * 1000;
const OTOCINCLUS_GRAVEL_SCAN_CHANCE = 0.72;
const OTOCINCLUS_GRAVEL_SCAN_MIN_PICKS = 2;
const OTOCINCLUS_GRAVEL_SCAN_MAX_PICKS = 5;
const OTOCINCLUS_GRAVEL_SCAN_MIN_DURATION_MS = 5600;
const OTOCINCLUS_GRAVEL_SCAN_MAX_DURATION_MS = 10800;
const OTOCINCLUS_GRAVEL_SCAN_COIN_CHANCE_MULTIPLIER = 2;
const OTOCINCLUS_GLASS_SWITCH_CHANCE_AFTER_SCAN = 0.34;
const OTOCINCLUS_GRAVEL_SPIT_MIN_MS = 420;
const OTOCINCLUS_GRAVEL_SPIT_MAX_MS = 720;
const FISH_SURFACE_BREACH_ALLOWANCE_PX = 6;
const WHALE_BREATH_ACTIVITY = "surface_breathe";
const WHALE_BREATH_FIRST_MIN_MS = 45 * 1000;
const WHALE_BREATH_FIRST_MAX_MS = 90 * 1000;
const WHALE_BREATH_INTERVAL_MIN_MS = 140 * 1000;
const WHALE_BREATH_INTERVAL_MAX_MS = 240 * 1000;
const WHALE_BREATH_SURFACE_HOLD_MIN_MS = 1400;
const WHALE_BREATH_SURFACE_HOLD_MAX_MS = 2200;
const WHALE_BREATH_BREACH_HEIGHT_RATIO = 0.36;
// Orca.png faces right. The blowhole sits well forward of the dorsal fin,
// so position the breach splash roughly 27% of body width ahead of center.
const WHALE_BREATH_BLOWHOLE_FORWARD_OFFSET_RATIO = 0.27;
const WHALE_BREATH_ARRIVAL_NORM = 0.012;
const FISH_SURFACE_MOTION_HEADROOM_PX = 10;
const FISH_SURFACE_HEIGHT_GUARD_MULTIPLIER = 1.08;
const DEAD_FISH_SURFACE_FLOAT_INSET_PX = 4;
const DEAD_FISH_SURFACE_BOB_ALLOWANCE_PX = 3;
const FISH_ENTRY_DURATION_MS = 1450;
const FISH_ENTRY_FROM_Y_NORM = 0.03;
const FISH_ENTRY_SPLASH_PROGRESS = 0.22;
const FISH_ENTRY_RIGHTING_END_PROGRESS = 0.68;
const FISH_ENTRY_NOSE_DIVE_TILT = Math.PI * 0.5;
const FEED_CHASE_MULTIPLIER = 2.5;
const DECOR_HANGOUT_DEFAULT_OCCUPANCY_LIMIT = 2;
const DECOR_HANGOUT_SICK_OCCUPANCY_LIMIT = 1;
const SAME_SPECIES_FOLLOW_RADIUS_NORM = 0.16;
const SAME_SPECIES_FOLLOW_BASE_CHANCE = 0.006;
const SAME_SPECIES_FOLLOW_NEIGHBOR_BONUS = 0.003;
const SAME_SPECIES_FOLLOW_MAX_CHANCE = 0.035;
const SAME_SPECIES_FOLLOW_MIN_MS = 650;
const SAME_SPECIES_FOLLOW_MAX_MS = 1250;
const SAME_SPECIES_FOLLOW_SPACING_MIN_NORM = 0.04;
const SAME_SPECIES_FOLLOW_SPACING_MAX_NORM = 0.095;
const SAME_SPECIES_FOLLOW_VERTICAL_JITTER_NORM = 0.05;
const BABY_FISH_SCALE_MULTIPLIER = 0.25;
const BABY_FISH_GROWTH_DURATION_MS = 3 * DAY_MS;
const BREEDING_MIN_TANK_TIME_MS = 3 * DAY_MS;
const BREEDING_BASE_CHANCE_PER_WINDOW = 0.06;
const BREEDING_EXTRA_PAIR_BONUS_CHANCE = 0.025;
const BREEDING_MAX_CHANCE_PER_WINDOW = 0.18;
const BREEDING_EVENT_TANK_LAYER = 1;
const FISH_EGG_SINK_DURATION_MS = 18 * 1000;
const FISH_EGG_RELEASE_DRIFT_DURATION_MS = 8 * 1000;
const FISH_EGG_INCUBATION_MS = 72 * HOUR_MS;
const FISH_EGG_SHELL_LINGER_MS = 90 * 1000;
const FISH_EGG_DRAW_WIDTH_MIN_PX = 26;
const FISH_EGG_DRAW_WIDTH_MAX_PX = 44;
const FISH_EGG_INITIAL_SCALE = 0.5;
const FISH_EGG_CRACKED_SCALE = 0.75;
const FISH_EGG_HATCH_SCALE = 0.9;
const FISH_EGG_CRACKED_START_PROGRESS = 0.5;
const GRAVEL_COIN_FIND_CHANCE = 0.08;
const GRAVEL_COIN_FIND_COOLDOWN_MS = 15 * MINUTE_MS;
const GRAVEL_COIN_GLINT_DURATION_MS = 1900;
const SEDIMENT_CLOUD_DURATION_MIN_MS = 2500;
const SEDIMENT_CLOUD_DURATION_MAX_MS = 4000;
const MAX_SEDIMENT_CLOUDS = 36;
const SEDIMENT_WAKE_MIN_SPEED_PX_PER_SECOND = 90;
const SEDIMENT_WAKE_COOLDOWN_MS = 1300;
const MAX_EFFECT_CLOUD_PARTICLES = 520;
const EFFECT_CLOUD_LAYER_FLOOR = "floor";
const EFFECT_CLOUD_LAYER_FOOD = "food";
const EFFECT_CLOUD_LAYER_FRONT = "front";
const BLOOD_CLOUD_COLOR_STOPS = Object.freeze([
  { offset: 0, rgb: "110, 0, 0", alpha: 1.15 },
  { offset: 0.22, rgb: "92, 0, 0", alpha: 0.9 },
  { offset: 0.55, rgb: "58, 0, 0", alpha: 0.42 },
  { offset: 1, rgb: "20, 0, 0", alpha: 0 }
]);
const GRAVEL_DUST_CLOUD_COLOR_STOPS = Object.freeze([
  { offset: 0, rgb: "124, 100, 68", alpha: 0.68 },
  { offset: 0.3, rgb: "92, 88, 64", alpha: 0.42 },
  { offset: 0.62, rgb: "58, 78, 54", alpha: 0.24 },
  { offset: 1, rgb: "48, 42, 30", alpha: 0 }
]);
const EFFECT_CLOUD_PRESETS = Object.freeze({
  blood: Object.freeze({
    key: "blood",
    layer: EFFECT_CLOUD_LAYER_FRONT,
    requiresGore: true,
    colorStops: BLOOD_CLOUD_COLOR_STOPS,
    countBase: 42,
    countScale: 36,
    speedMin: 0.00006,
    speedMax: 0.00034,
    driftMin: 0.00002,
    driftMax: 0.0001,
    yLiftMin: 0.000005,
    yLiftMax: 0.00003,
    radiusMin: 0.0018,
    radiusMax: 0.0046,
    alphaMin: 0.22,
    alphaMax: 0.5,
    lifeMinMs: 2200,
    lifeMaxMs: 4600,
    spreadNorm: 0.003,
    radiusGrowth: 1.006
  }),
  gravelDust: Object.freeze({
    key: "gravelDust",
    layer: EFFECT_CLOUD_LAYER_FLOOR,
    requiresGore: false,
    colorStops: GRAVEL_DUST_CLOUD_COLOR_STOPS,
    countBase: 22,
    countScale: 24,
    speedMin: 0.00004,
    speedMax: 0.0002,
    driftMin: 0.00002,
    driftMax: 0.00012,
    yLiftMin: 0.000018,
    yLiftMax: 0.000075,
    radiusMin: 0.0024,
    radiusMax: 0.0066,
    alphaMin: 0.1,
    alphaMax: 0.26,
    lifeMinMs: 1500,
    lifeMaxMs: 3400,
    spreadNorm: 0.005,
    radiusGrowth: 1.007
  })
});
const MAX_GRAVEL_DIG_BURSTS = 8;
const GRAVEL_DIG_BURST_DURATION_MIN_MS = 850;
const GRAVEL_DIG_BURST_DURATION_MAX_MS = 1450;
const GRAVEL_DIG_BURST_PEBBLE_MIN = 3;
const GRAVEL_DIG_BURST_PEBBLE_MAX = 9;
const FISH_GRAVEL_DIG_CHANCE = 0.18;
const FISH_GRAVEL_DIG_COOLDOWN_MIN_MS = 9000;
const FISH_GRAVEL_DIG_COOLDOWN_MAX_MS = 18000;
const FORCED_GRAVEL_DIG_TIMEOUT_MS = 9000;
const WATER_PARTICLE_COUNT = 44;
const WATER_PARTICLE_CLEAN_VISIBLE_COUNT = 44;
const WATER_PARTICLE_DIRTY_VISIBLE_COUNT = 44;
const WATER_PARTICLE_FISH_FORCE_RADIUS_PX = 90;
const WATER_PARTICLE_BUBBLER_FORCE_RADIUS_PX = 74;

const WATER_PARTICLE_SPRITE_SIZE_MIN_PX = 0.75;
const WATER_PARTICLE_SPRITE_SIZE_MAX_PX = 2.45;
const WATER_PARTICLE_SPRITE_ALPHA_BOOST = 1.9;
const WATER_PARTICLE_SPRITE_ALPHA_FLOOR = 18;
const WATER_PARTICLE_FADE_IN_PER_SECOND = 1.8;
const WATER_PARTICLE_FADE_OUT_PER_SECOND = 0.42;
const FISH_SATIATED_MS = 30 * MINUTE_MS;
const FISH_BASIC_MEAL_HUNGER_GAIN = 50;
const FISH_BASIC_MEAL_HUNGER_FLOOR = 85;
const FISH_CHUM_MEAL_HUNGER_GAIN = 55;
const FISH_CHUM_MEAL_HUNGER_FLOOR = 90;
const FISH_WILLING_TO_EAT_HUNGER_MAX = 82;
const FISH_OVERFEED_HUNGER_THRESHOLD = 88;
const DEFAULT_TANK_DIRTY_DAYS = 14;
const MEDICINE_HEAL_INTERVAL_MS = 10 * 1000;
const MEDICINE_HEAL_DURATION_MS = 60 * 1000;
const MEDICINE_VISUAL_DURATION_MS = 60 * 1000;
const MEDICINE_CLOUD_DURATION_MS = 8 * 1000;
const FOOD_DROP_SPREAD_NORM = 0.03;
const FOOD_PELLET_SINK_DURATION_MS = 95 * 1000;
const FOOD_PELLET_SETTLED_LIFETIME_MS = 36 * HOUR_MS;
const FOOD_PELLET_SETTLED_Y_OFFSET_PX = 5;
const FOOD_PELLET_SETTLED_OPEN_TARGET_MS = 2 * MINUTE_MS;
const FOOD_PELLET_SETTLED_STALE_TARGET_MS = 15 * MINUTE_MS;
const FOOD_PELLET_SETTLED_NEARBY_TARGET_RADIUS_NORM = 0.5;
const AUTO_DISPENSER_MAX_PELLETS = 99;
const AUTO_DISPENSER_PORTION_MIN = 0;
const AUTO_DISPENSER_PORTION_MAX = AUTO_DISPENSER_MAX_PELLETS;
const AUTO_DISPENSER_COST = 150;
const AUTO_DISPENSER_ASSET_VERSION = "2026-04-01";
const AUTO_DISPENSER_RELEASE_SPACING_MS = 80;
const AUTO_DISPENSER_DROP_DISTANCE_PX = 150;
const AUTO_DISPENSER_DROP_X_OFFSET_PX = -30;
const AUTO_DISPENSER_DROP_DRIFT_PX = 10;
const AUTO_DISPENSER_DROP_DURATION_MS = 850;
const AUTO_DISPENSER_PELLET_MAX_Y_NORM = 0.28;
const AUTO_DISPENSER_DEFAULT_TANK_LAYER = 5;
const AUTO_DISPENSER_DEFAULT_X_NORM = 0.5;
const AUTO_DISPENSER_VARIANT_IMAGE_PATHS = [
  resolveDispenserAssetPath("Food_Dispenser.png"),
  ...[1, 2, 3, 4].map((number) => resolveDispenserAssetPath(`Food_Dispenser_${number}.png`))
];
const AUTO_DISPENSER_VARIANT_BG_PATHS = [
  resolveDispenserAssetPath("Food_Dispenser_bg.png"),
  ...[1, 2, 3, 4].map((number) => resolveDispenserAssetPath(`Food_Dispenser_${number}_bg.png`))
];
const AUTO_DISPENSER_LIGHT_OFF_PATH = resolveDispenserAssetPath("Food_Dispenser_Light_Off.png");
const AUTO_DISPENSER_LIGHT_GREEN_PATH = resolveDispenserAssetPath("Food_Dispenser_Light_Green.png");
const AUTO_DISPENSER_LIGHT_RED_PATH = resolveDispenserAssetPath("Food_Dispenser_Light_Red.png");
const AUTO_DISPENSER_LIGHT_YELLOW_PATH = resolveDispenserAssetPath("Food_Dispenser_Light_Yellow.png");
const AUTO_DISPENSER_HOPPER_MAX_DRAWN_PELLETS = AUTO_DISPENSER_MAX_PELLETS;
const AUTO_DISPENSER_LOW_FOOD_BLINK_MS = 360;
const MACHINERY_TYPE_SUBMARINE = "submarine";
const MACHINERY_TYPE_BOAT = "boat";
const SUBMARINE_COST = 300;
const SUBMARINE_IMAGE_PATH = resolveAppUrl("assets/equipment/machinery/submarine.png");
const SUBMARINE_RED_LIGHT_OVERLAY_PATH = resolveAppUrl("assets/equipment/machinery/Submarine_Light_Red.webp");
const BOAT_COST = 125;
const BOAT_IMAGE_PATH = resolveAppUrl("assets/equipment/machinery/boat.png");
// The original Halloween vehicle files were renamed to their shared fifth
// appearance slot, so seasonal presentation and the purchasable choice use
// the same real asset.
const HALLOWEEN_BOAT_IMAGE_PATH = resolveAppUrl("assets/equipment/machinery/Halloween_Boat_5.png");
const HALLOWEEN_SUBMARINE_IMAGE_PATH = resolveAppUrl("assets/equipment/machinery/Halloween_Submarine_5.png");
const BOAT_VARIANT_IMAGE_PATHS = [
  BOAT_IMAGE_PATH,
  ...[1, 2, 3, 4].map((number) => resolveAppUrl(`assets/equipment/machinery/boat_${number}.png`)),
  HALLOWEEN_BOAT_IMAGE_PATH
];
const SUBMARINE_VARIANT_IMAGE_PATHS = [
  SUBMARINE_IMAGE_PATH,
  ...[1, 2, 3, 4].map((number) => resolveAppUrl(`assets/equipment/machinery/submarine_${number}.png`)),
  HALLOWEEN_SUBMARINE_IMAGE_PATH
];
const BOAT_RESOURCE_CAPACITY = 99;
const BOAT_DRAW_WIDTH_PX = 121;
const BOAT_CRUISE_SPEED_PX_PER_SECOND = 96;
const BOAT_MANUAL_SPEED_PX_PER_SECOND = 184;
const BOAT_MANUAL_ACCELERATION_PX_PER_SECOND2 = 470;
const BOAT_MANUAL_DRAG_PER_SECOND = 5.8;
const BOAT_IDLE_BOB_AMPLITUDE_PX = 3.8;
const BOAT_IDLE_BOB_PERIOD_MS = 1800;
const BOAT_MANUAL_FOOD_COOLDOWN_MS = 140;
const BOAT_ENTRY_DURATION_MS = FISH_ENTRY_DURATION_MS;
const BOAT_ENTRY_FROM_Y_NORM = FISH_ENTRY_FROM_Y_NORM;
const BOAT_SURFACE_LAYER = 3;
const BOAT_SURFACE_BOTTOM_GAP_PX = 17;
const BOAT_REAR_BUBBLE_X_NORM = 0.12;
const BOAT_REAR_BUBBLE_Y_NORM = 0.925;
const SUBMARINE_TURN_DURATION_MS = 240;
const BOAT_TURN_DURATION_MS = 320;
const SUBMARINE_TURN_LEAN_RADIANS = Math.PI / 180 * 5.5;
const BOAT_TURN_LEAN_RADIANS = Math.PI / 180 * 4.25;
const SUBMARINE_RESOURCE_CAPACITY = 99;
const SUBMARINE_DRAW_WIDTH_PX = 190;
const SUBMARINE_CRUISE_SPEED_PX_PER_SECOND = 82;
const SUBMARINE_MISSION_SPEED_PX_PER_SECOND = 108;
const SUBMARINE_TRAVEL_SPEED_PX_PER_SECOND = 118;
const SUBMARINE_MANUAL_SPEED_PX_PER_SECOND = 168;
const SUBMARINE_MANUAL_ACCELERATION_PX_PER_SECOND2 = 430;
const SUBMARINE_MANUAL_VERTICAL_ACCELERATION_PX_PER_SECOND2 = 360;
const SUBMARINE_MANUAL_DRAG_PER_SECOND = 5.2;
const SUBMARINE_MANUAL_VERTICAL_SPEED_SCALE = 0.82;
const SUBMARINE_DEFAULT_TANK_LAYER = 2;
const SUBMARINE_IDLE_BOB_AMPLITUDE_PX = 3.4;
const SUBMARINE_IDLE_BOB_PERIOD_MS = 2100;
const SUBMARINE_MANUAL_FOOD_COOLDOWN_MS = 140;
const SUBMARINE_ENTRY_DURATION_MS = FISH_ENTRY_DURATION_MS;
const SUBMARINE_ENTRY_FROM_Y_NORM = FISH_ENTRY_FROM_Y_NORM;
const SUBMARINE_REAR_BUBBLE_X_NORM = 0.048;
const SUBMARINE_REAR_BUBBLE_Y_NORM = 0.565;
const SUBMARINE_PRESSURE_BUBBLE_LEFT_X_NORM = 0.46;
const SUBMARINE_PRESSURE_BUBBLE_RIGHT_X_NORM = 0.67;
const SUBMARINE_PRESSURE_BUBBLE_Y_NORM = 0.445;
const SUBMARINE_BUBBLE_EMITTER_SAMPLE_MS = 110;
const SUBMARINE_BUBBLE_LINGER_PAD_MS = 180;
const SUBMARINE_IDLE_MIN_MS = 3500;
const SUBMARINE_IDLE_MAX_MS = 11000;
const SUBMARINE_SCAN_INTERVAL_MS = 1500;
const SUBMARINE_SERVICE_DISTANCE_PX = 150;
const SUBMARINE_HUNGER_THRESHOLD = FISH_HUNGER_LOW_THRESHOLD;
const SUBMARINE_COMFORT_THRESHOLD = 0.35;
const SUBMARINE_RED_LIGHT_BLINK_MS = 500;
const SUBMARINE_FOOD_RETRY_MS = 9000;
const SUBMARINE_MEDICINE_RETRY_MS = 12000;
const SHARK_DESPERATION_ATTACK_COOLDOWN_MS = 9000;
const SHARK_DESPERATION_ATTACK_RANGE_NORM = 0.075;
const TANK_STATE_ACCESSOR_KEYS = Object.freeze([
  "fish",
  "feedHistory",
  "pendingPoops",
  "poops",
  "fishEggs",
  "placedDecor",
  "customGravelEnabled",
  "customGravelLayerColors",
  "customGravelLayerColorize",
  "gravelPalette",
  "gravelSeed",
  "gravelHillSeed",
  "gravelLivePebbles",
  "floatingPellets",
  "selectedBackground",
  "customBackgroundMode",
  "solidBackgroundColor",
  "gradientBackgroundStartColor",
  "gradientBackgroundEndColor",
  "animatedBackgroundSurfaceBloomColor",
  "animatedBackgroundShadowBloomColor",
  "animatedBackgroundTopColor",
  "animatedBackgroundMidColor",
  "animatedBackgroundBottomColor",
  "animatedBackgroundAbyssColor",
  "animatedBackgroundHighlightColor",
  "animatedBackgroundDriftColorA",
  "animatedBackgroundDriftColorB",
  "animatedBackgroundDriftColorC",
  "localBackgroundImageDataUrl",
  "localBackgroundImageRefId",
  "selectedTankAsset",
  "autoDispenser",
  "selectedBubbleAsset",
  "theme",
  "lastCleanedAt",
  "lastSimulatedAt",
  "events",
  "lastCorpseSicknessAt",
  "tankTypeId",
  "waterType",
  "setupPending",
  "foodBuffs",
  "medicineEffects",
  "medicineClouds",
  "medicineWaterTint"
]);
const BREEDING_COOLDOWN_MS = 4 * DAY_MS;
const DEBUG_BREEDING_HOLD_MS = 60 * 1000;
const DEBUG_BREEDING_REACHED_DISTANCE_NORM = 0.024;
const FISH_ACTION_STEER_REFRESH_MS = 260;
const FISH_ACTION_EAT_DURATION_MS = 45 * 1000;
const FISH_ACTION_WAIT_FOOD_DURATION_MS = 25 * 1000;
const FISH_ACTION_REST_DURATION_MS = 35 * 1000;
const FISH_ACTION_SLEEP_DURATION_MS = 90 * 1000;
const FISH_ACTION_HIDE_DURATION_MS = 40 * 1000;
const FISH_ACTION_GREET_DURATION_MS = 12 * 1000;
const FISH_ACTION_FOLLOW_DURATION_MS = 45 * 1000;
const FISH_ACTION_AVOID_DURATION_MS = 60 * 1000;
const FISH_ACTION_MATE_DURATION_MS = 2 * MINUTE_MS;
const FISH_ACTION_INSPECT_DURATION_MS = 18 * 1000;
const FISH_ACTION_DIG_DURATION_MS = 20 * 1000;
const FISH_ACTION_PEBBLE_DURATION_MS = 20 * 1000;
const FISH_ACTION_ZOOMIES_DURATION_MS = 12 * 1000;
const FISH_ACTION_PLAY_DURATION_MS = 20 * 1000;
const FISH_ACTION_BREED_HOLD_MS = 2 * MINUTE_MS;
const FISH_ACTION_QUEUE_REST_MS = 2 * 1000;
const BETTA_ATTACK_PASS_CHANCE = 0.001;
const BETTA_ATTACK_TRIGGER_RANGE_NORM = 0.052;
const BETTA_ATTACK_RELEASE_RANGE_NORM = 0.074;
const FISH_SPAWN_PROTECTION_MS = 15000;
const PIRANHA_ATTACK_TRIGGER_RANGE_NORM = 0.04;
const PIRANHA_ATTACK_RELEASE_RANGE_NORM = 0.06;
const PIRANHA_ATTACK_BUILDUP_MS = 7000;
const PIRANHA_BITE_DAMAGE_INTERVAL_MS = 900;
const PIRANHA_BITE_DAMAGE_UNITS = 1;
const PIRANHA_CONSUMPTION_DURATION_MS = 1 * MINUTE_MS;
const PIRANHA_BLOOD_CLOUD_INTERVAL_MS = 1200;
const PIRANHA_TARGET_REFRESH_MS = 650;
const BLOOD_WATER_TINT_DECAY_PER_SECOND = 0.0034;
const CHUM_BLOOD_CLOUD_INTERVAL_MS = 1300;
const CORPSE_VIGIL_TRIGGER_RANGE_NORM = 0.16;
const CAVE_NIGHT_ENTRY_CHANCE = 0.5;
const CAVE_NIGHT_START_HOUR = 21;
const CAVE_NIGHT_END_HOUR = 4;
const CAVE_ENTRY_CHANCE_BY_STYLE = {
  peaceful: 0.22,
  steady: 0.22,
  sporadic: 0.2
};
const STATIC_ASSET_MANIFEST = "assets/asset-manifest.json";
const FISH_CATALOG_PATH = "assets/fish/fish-types.json";
const DECOR_CATALOG_PATH = "assets/decor/decor_types.json?v=20260908-halloween-sizing-3";

const BACKGROUND_CATALOG_PATH = "assets/backgrounds/backgrounds.json";
const FOOD_AND_MEDS_CATALOG_PATH = "assets/foodandmeds/food-and-meds.json";
const FOOD_AND_MEDS_FALLBACK_IMAGE_NAME = "basic-food.png";
const FOOD_AND_MEDS_ASSET_VERSION = "2026-09-09";
const AMBIENCE_AUDIO_PATH = "assets/sounds/ambience.mp3";
const AMBIENCE_AUDIO_VOLUME = 0.55;
const AMBIENCE_AUDIO_FADE_IN_MS = 2000;
const AMBIENCE_AUDIO_CROSSFADE_MS = 1800;
const AMBIENCE_AUDIO_LOOP_END_PADDING_SECONDS = AMBIENCE_AUDIO_CROSSFADE_MS / 1000;
const SOUND_EFFECT_VOLUME = 0.72;
const TOOLBAR_BUTTON_PRESS_SOUND_PATH = "assets/sounds/toolbar_button_1.mp3";
const TOOLBAR_BUTTON_EXIT_SOUND_PATH = "assets/sounds/toolbar_button_2.mp3";
const REGULAR_BUTTON_SOUND_PATH = "assets/sounds/reg_button.mp3";
const PURCHASE_SOUND_PATH = "assets/sounds/purchase.mp3";
const COIN_SOUND_PATH = "assets/sounds/coin.mp3";
const COIN_ICON_PATH = resolveAppUrl("assets/icons/coin.png");
const MAX_WALLET_COINS = 9999;
// Keep the legacy digital display implementation available, but ship it off.
const DIGITAL_DISPLAY_ENABLED = false;
const DISPENSER_SOUND_PATH = "assets/sounds/dispenser.mp3";
const SUBMARINE_SONAR_SOUND_PATH = "assets/sounds/sonar_sound.mp3";
const BOAT_HORN_SOUND_PATH = "assets/sounds/boat_horn.mp3";
const WHALE_BREATH_SOUND_PATH = "assets/sounds/whalebreath.mp3";
const SUBMARINE_SONAR_SOUND_VOLUME = 0.5;
const TOOLBAR_FAST_TOOLTIP_DELAY_MS = 100;
const TOOLBAR_FAST_TOOLTIP_OFFSET_PX = 14;
const TANK_INFO_REGULAR_BUTTON_SOUND_SELECTOR = [
  "[data-open-equipment-overlay]",
  '[data-open-store-tab="equipment"]',
  "[data-sell-current-tank]"
].join(",");
const TANK_INFO_TOOLBAR_BUTTON_SOUND_SELECTOR = [
  "[data-edit-tank-name]",
  '[data-management-view="fish"]',
  '[data-management-view="decor"]',
  '[data-management-view="history"]',
  '[data-management-view="milestones"]',
  "[data-management-select-fish]",
  "[data-management-store-fish]",
  "[data-management-buy-another-fish]",
  "[data-management-sell-fish]",
  "[data-management-select-decor]",
  "[data-management-store-decor]",
  "[data-management-buy-another-decor]",
  "[data-management-sell-decor]"
].join(",");
const TANK_INFO_TOOLBAR_RELEASE_BUTTON_SOUND_SELECTOR = [
  '[data-management-view="overview"]',
  "[data-save-tank-name]",
  "[data-cancel-tank-name]"
].join(",");
const FEED_TRAY_ITEM_SOUND_SELECTOR = "[data-select-food]";
const MEDICINE_TRAY_ITEM_SOUND_SELECTOR = "[data-select-medicine]";


const EQUIPMENT_REGULAR_BUTTON_SOUND_SELECTOR = [
  "[data-reset-animated-background-colors]",
  "[data-open-local-background-picker]",
  "[data-select-background]",
  "[data-clear-local-background]"
].join(",");
const EQUIPMENT_TOOLBAR_BUTTON_SOUND_SELECTOR = [
  "[data-solid-background-color]",
  "[data-gradient-background-color]",
  "[data-animated-background-color]",
  "[data-custom-gravel-color]"
].join(",");
const EQUIPMENT_TOOLBAR_TOGGLE_SOUND_SELECTOR = [
  "[data-toggle-solid-background]",
  "[data-toggle-gradient-background]",
  "[data-toggle-animated-background]",
  "[data-custom-gravel-colorize]"
].join(",");
const FISH_INSPECTOR_TOOLBAR_BUTTON_SOUND_SELECTOR = [
  "#randomizeFishName",
  "#saveFishName",
  "#inspectorSellFish",
  "#inspectorBuyAnotherFish",
  "#inspectorStoreFish",
  "#inspectorFishSettingsButton",
  "[data-inspector-fish-color]",
  'input[type="checkbox"][data-inspector-fish-setting="colorize"]'
].join(",");
const FISH_INSPECTOR_SLIDER_SOUND_SELECTOR = 'input[type="range"][data-inspector-fish-setting="size"]';
const SELECTED_DECOR_REGULAR_BUTTON_SOUND_SELECTOR = [
  "#selectedDecorBuyAnotherButton",
  "#selectedDecorSellButton",
  "#selectedDecorStoreButton",
  "#selectedDecorSettingsButton",
  "[data-edit-decor-settings]",
  "[data-sell-decor-placed]",
  "[data-store-decor]",
  "[data-sell-decor-inventory]",
  "[data-tray-buy-another-decor]",
  "[data-tray-edit-decor-settings]",
  "[data-tray-store-placed-decor]",
  "[data-tray-sell-placed-decor]"
].join(",");
const SELECTED_DECOR_INCREASE_BUTTON_SOUND_SELECTOR = [
  "#selectedDecorScaleUpButton",
  "#selectedDecorLayerUpButton",
  '[data-size-decor][data-size-direction="1"]',
  '[data-resize-placed][data-size-direction="1"]'
].join(",");
const SELECTED_DECOR_DECREASE_BUTTON_SOUND_SELECTOR = [
  "#selectedDecorScaleDownButton",
  "#selectedDecorLayerDownButton",
  '[data-size-decor][data-size-direction="-1"]',
  '[data-resize-placed][data-size-direction="-1"]'
].join(",");
const DECOR_SETTINGS_SOUND_MODES = new Set([
  "decor-settings",
  "custom-decor-settings",
  "bubbler-settings",
  "custom-hide-create"
]);
const DECOR_SETTINGS_RANGE_SOUND_SELECTOR = [
  'input[type="range"][data-decor-setting]',
  'input[type="range"][data-bubbler-setting]',
  'input[type="range"][data-cave-setting]',
  'input[type="range"][data-custom-decor-setting]',
  'input[type="range"][data-custom-decor-size-input]',
  'input[type="range"][data-custom-decor-split-input]',
  'input[type="range"][data-custom-decor-intensity-input]',
  'input[type="range"][data-custom-hide-size-input]'
].join(",");
const DECOR_SETTINGS_SELECT_SOUND_SELECTOR = [
  "select[data-decor-setting]",
  "select[data-bubbler-setting]",
  "select[data-cave-setting]",
  "select[data-custom-decor-setting]",
  "select[data-custom-decor-type-select]",
  "select[data-custom-decor-sway-side-select]"
].join(",");
const DECOR_SETTINGS_TOOLBAR_CLICK_SOUND_SELECTOR = [
  "[data-cave-color-layer]",
  "[data-bubbler-color]",
  'input[type="checkbox"][data-cave-colorize-layer]',
  'input[type="checkbox"][data-bubbler-setting]',
  'input[type="checkbox"][data-decor-setting]',
  'input[type="checkbox"][data-custom-decor-setting]',
  '[data-cave-entry-select]:not([data-cave-settings-entry-marker])',
  '[data-cave-seat-select]:not([data-cave-settings-seat-marker])',
  "[data-cave-seat-facing]",
  DECOR_SETTINGS_SELECT_SOUND_SELECTOR
].join(",");
const DECOR_SETTINGS_PREVIEW_POINT_SOUND_SELECTOR = [
  "[data-cave-settings-entry-marker]",
  "[data-cave-settings-seat-marker]"
].join(",");
const SOUND_DRAG_INPUT_INTERVAL_MS = 90;
const FISH_SPLASH_SOUND_PATHS = Object.freeze([
  "assets/sounds/splash1.mp3",
  "assets/sounds/splash2.mp3",
  "assets/sounds/splash3.mp3",
  "assets/sounds/splash4.mp3"
]);
const FISH_SPLASH_SOUND_GAIN = 4;
const MEDICINE_DROP_SOUND_PATHS = Object.freeze([
  "assets/sounds/drop1.mp3",
  "assets/sounds/drop2.mp3"
]);
const MEDICINE_DROP_SOUND_GAIN = 2;
const CLEANING_COMPLETE_SOUND_PATH = "assets/sounds/glass_shine.mp3";
const GLASS_KNOCK_SOUND_PATHS = Object.freeze([
  "assets/sounds/glass_knock_1.mp3"
]);
const SCRUB_WIPE_SOUND_PATH_GROUPS = Object.freeze([
  Object.freeze([
    "assets/sounds/glass_wipe_1.mp3",
    "assets/sounds/glass_wipe_3.mp3",
    "assets/sounds/glass_wipe_5.mp3"
  ]),
  Object.freeze([
    "assets/sounds/glass_wipe_2.mp3",
    "assets/sounds/glass_wipe_4.mp3"
  ])
]);
const SCRUB_WIPE_SOUND_MIN_DISTANCE_PX = 12;
const SCRUB_WIPE_SOUND_COOLDOWN_MS = 180;
const GLASS_TAP_EFFECT_DURATION_MS = 320;
const GLASS_TAP_EFFECT_LIMIT = 8;
const GLASS_TAP_MAX_HOLD_MS = 250;
const GLASS_TAP_MAX_MOVE_PX = 14;
const GLASS_TAP_FISH_STARTLE_RADIUS_PX = 260;
const GLASS_TAP_FISH_ESCAPE_MIN_DISTANCE_PX = 145;
const GLASS_TAP_FISH_ESCAPE_MAX_DISTANCE_PX = 285;
const GLASS_TAP_STRESS_RADIUS_PX = 120;
const GLASS_TAP_STRESS_WINDOW_MS = 10 * 1000;
const GLASS_TAP_STRESS_TAP_THRESHOLD = 3;
const GLASS_TAP_STRESS_DURATION_MS = 30 * MINUTE_MS;
const GLASS_TAP_STRESS_PENALTY = 0.01;
const GLASS_TAP_STRESS_MAX_STACKS = 5;
const SOUND_EFFECT_POOL_SIZE = 2;
const SOUND_EFFECT_PATHS = Object.freeze([
  TOOLBAR_BUTTON_PRESS_SOUND_PATH,
  TOOLBAR_BUTTON_EXIT_SOUND_PATH,
  REGULAR_BUTTON_SOUND_PATH,
  PURCHASE_SOUND_PATH,
  COIN_SOUND_PATH,
  DISPENSER_SOUND_PATH,
  BOAT_HORN_SOUND_PATH,
  WHALE_BREATH_SOUND_PATH,
  ...FISH_SPLASH_SOUND_PATHS,
  ...MEDICINE_DROP_SOUND_PATHS,
  CLEANING_COMPLETE_SOUND_PATH,
  ...GLASS_KNOCK_SOUND_PATHS,
  ...SCRUB_WIPE_SOUND_PATH_GROUPS.flat()
]);
// Recommended host checkbox key: "mutesounds"
const WALLPAPER_ENGINE_SOUND_MUTE_PROPERTY_KEYS = Object.freeze([
  "mutesounds",
  "soundmute",
  "wallpapermute"
]);
const wallpaperEngineGeneralPropertyState = {
  fps: 0
};
const wallpaperEnginePlaybackState = {
  paused: false
};
const wallpaperEngineUserPropertyState = {
  soundMuted: null
};
let runtimeInitialized = false;
let assetManifestPromise = null;

const existingWallpaperPropertyListener = typeof window !== "undefined" && window.wallpaperPropertyListener && typeof window.wallpaperPropertyListener === "object"
  ? window.wallpaperPropertyListener
  : {};
const previousWallpaperApplyUserProperties = typeof existingWallpaperPropertyListener.applyUserProperties === "function"
  ? existingWallpaperPropertyListener.applyUserProperties.bind(existingWallpaperPropertyListener)
  : null;
const previousWallpaperApplyGeneralProperties = typeof existingWallpaperPropertyListener.applyGeneralProperties === "function"
  ? existingWallpaperPropertyListener.applyGeneralProperties.bind(existingWallpaperPropertyListener)
  : null;
const previousWallpaperSetPaused = typeof existingWallpaperPropertyListener.setPaused === "function"
  ? existingWallpaperPropertyListener.setPaused.bind(existingWallpaperPropertyListener)
  : null;

if (typeof window !== "undefined") {
  window.wallpaperPropertyListener = {
    ...existingWallpaperPropertyListener,
    applyUserProperties(properties) {
      previousWallpaperApplyUserProperties?.(properties);
      applyWallpaperEngineUserProperties(properties);
    },
    applyGeneralProperties(properties) {
      previousWallpaperApplyGeneralProperties?.(properties);
      applyWallpaperEngineGeneralProperties(properties);
    },
    setPaused(isPaused) {
      previousWallpaperSetPaused?.(isPaused);
      applyWallpaperEnginePauseState(isPaused);
    }
  };
}


const FOOD_PELLET_IMAGE_PATH = resolveFoodAndMedAssetPath("pellet.png");
const TOOL_CURSOR_ICON_PATHS = Object.freeze({
  feed: resolveAppUrl("assets/icons/feed_fish.png"),
  medicine: resolveAppUrl("assets/icons/medicine.png"),
  cleaning: resolveAppUrl("assets/icons/sponge.png"),
  scoop: resolveAppUrl("assets/icons/scoop.png")
});


const AUTO_DISPENSER_IMAGE_PATH = resolveDispenserAssetPath("Food_Dispenser.png");
const AUTO_DISPENSER_BG_PATH = resolveDispenserAssetPath("Food_Dispenser_bg.png");


const DEFAULT_CAVE_BEHAVIOR_PROFILE = {
  portals: [
    { id: "left", approachX: 0.34, approachY: 0.76, mouthX: 0.38, mouthY: 0.69 },
    { id: "center", approachX: 0.5, approachY: 0.76, mouthX: 0.5, mouthY: 0.68 },
    { id: "right", approachX: 0.66, approachY: 0.76, mouthX: 0.62, mouthY: 0.69 }
  ],
  insideSlots: [
    { id: "center", x: 0.5, y: 0.54, layer: 4 }
  ],
  interiorZones: [
    { id: "center", xMin: 0.38, xMax: 0.62, yMin: 0.46, yMax: 0.66 },
    { id: "left", xMin: 0.28, xMax: 0.48, yMin: 0.5, yMax: 0.7 },
    { id: "right", xMin: 0.52, xMax: 0.72, yMin: 0.5, yMax: 0.7 }
  ],
  lingerMinMs: 4200,
  lingerMaxMs: 8600
};
const CAVE_BEHAVIOR_OVERRIDES = {
  "bathysphere-wreck-cave": {
    insideLayer: 4,
    portals: [
      {
        id: "main_hatch",
        approachX: 0.56,
        approachY: 0.71,
        mouthX: 0.58,
        mouthY: 0.60,
        outsideLayer: 2,
        insideLayer: 4,
        path: [
          { x: 0.54, y: 0.57 },
          { x: 0.50, y: 0.52 }
        ]
      }
    ],
    insideSlots: [
      {
        id: "cabin",
        x: 0.47,
        y: 0.47,
        layer: 4,
        portalIds: ["main_hatch"]
      }
    ],
    lingerMinMs: 12000,
    lingerMaxMs: 22000
  }
};

const FISH_TYPES = [
  {
    "id": "blue-tang",
    "name": "Blue Tang",
    "genetics": "natural",
    "cost": 28,
    "mealCoins": 2,
    "asset": "/assets/fish/bluetang.png",
    "description": "A bright, energetic reef fish known for its bold blue coloring and constant movement. Blue Tangs love having plenty of room to cruise and rarely spend much time sitting still.",
    "width": 398,
    "displayWidth": 260,
    "bobSpeed": 1.32,
    "swimStyle": "steady",
    "speedMin": 0.022,
    "speedMax": 0.032,
    "targetMinMs": 2200,
    "targetMaxMs": 4600,
    "defaultNames": [
      "Dory",
      "Azure",
      "Bubbles",
      "Reef",
      "Sapphire",
      "Indigo",
      "Pacific",
      "Tidal",
      "Marlin",
      "Coraline",
      "Skye",
      "Cobalt",
      "Lagoon",
      "Ripple",
      "Bali",
      "Nixie",
      "Wave",
      "Blu",
      "Misty",
      "Finn"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "goldfish",
    "name": "Goldfish",
    "genetics": "natural",
    "cost": 5,
    "mealCoins": 1,
    "asset": "/assets/fish/goldfish.png",
    "description": "A familiar favorite with a round body, flowing fins, and an easygoing personality. Goldfish spend their days calmly exploring the tank and checking out just about everything. Fun fact: Not actual gold. Who knew?",
    "width": 405,
    "displayWidth": 250,
    "bobSpeed": 1.25,
    "swimStyle": "peaceful",
    "speedMin": 0.014,
    "speedMax": 0.021,
    "targetMinMs": 4400,
    "targetMaxMs": 7600,
    "defaultNames": [
      "Sunny",
      "Pebble",
      "Marmalade",
      "Pip",
      "Goldie",
      "Nugget",
      "Cheddar",
      "Biscuit",
      "Pumpkin",
      "Butters",
      "Caramel",
      "Honey",
      "Dorito",
      "Cheeto",
      "Tango",
      "Topaz",
      "Glowy",
      "Mango",
      "Scooter",
      "Waffles"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "guppy",
    "name": "Guppy",
    "genetics": "natural",
    "cost": 4,
    "mealCoins": 1,
    "asset": "/assets/fish/guppy.png",
    "description": "A small, colorful fish with a big personality and a flowing tail. Guppies are lively swimmers that alternate between quick bursts of energy and relaxed cruising around the tank.",
    "width": 179,
    "bobSpeed": 1.45,
    "swimStyle": "sporadic",
    "speedMin": 0.02,
    "speedMax": 0.036,
    "targetMinMs": 1400,
    "targetMaxMs": 3600,
    "defaultNames": [
      "Ribbon",
      "Skipper",
      "Twinkle",
      "Bubbles",
      "Zip",
      "Sprout",
      "Flick",
      "Pebbles",
      "Miso",
      "Jitter",
      "Gizmo",
      "Pogo",
      "Spark",
      "Scoot",
      "Pipsqueak",
      "Tinker",
      "Nova",
      "Button",
      "Wiggles",
      "Nibbles"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": true
  },
  {
    "id": "betta",
    "name": "Betta",
    "genetics": "natural",
    "cost": 10,
    "mealCoins": 1,
    "asset": "/assets/fish/betta.png",
    "assetVariants": [
      "/assets/fish/betta_1.png",
      "/assets/fish/betta_2.png",
      "/assets/fish/betta_3.png",
      "/assets/fish/betta_4.png"
    ],
    "description": "A striking fish known for its flowing fins, bold colors, and unmistakable presence. Bettas are graceful swimmers, but they can be highly territorial and aggressive, especially around other bettas.",
    "width": 219,
    "bobSpeed": 1.15,
    "swimStyle": "peaceful",
    "speedMin": 0.012,
    "speedMax": 0.019,
    "targetMinMs": 5200,
    "targetMaxMs": 8200,
    "defaultNames": [
      "Velvet",
      "Nova",
      "Flare",
      "Satin",
      "Blaze",
      "Crimson",
      "Phantom",
      "Silk",
      "Rogue",
      "Vanta",
      "Ember",
      "Scarlet",
      "Prince",
      "Razor",
      "Onyx",
      "Luxe",
      "Draco",
      "Vesper",
      "Titan",
      "Majesty"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "clownfish",
    "name": "Clownfish",
    "genetics": "natural",
    "cost": 20,
    "mealCoins": 2,
    "asset": "/assets/fish/clownfish.png",
    "description": "A colorful, energetic fish known for its bold stripes and curious personality. Clownfish often form close bonds with anemones and tend to stick near a favorite part of the tank.",
    "width": 162,
    "bobSpeed": 1.35,
    "swimStyle": "steady",
    "speedMin": 0.024,
    "speedMax": 0.034,
    "targetMinMs": 2400,
    "targetMaxMs": 5200,
    "defaultNames": [
      "Nemo",
      "Pennywise",
      "Coral",
      "Dash",
      "Tango",
      "Patch",
      "Cheeto",
      "Skittles",
      "Jester",
      "Tiki",
      "Blaze",
      "Sunny",
      "Miso",
      "Marlin",
      "Peaches",
      "Jinx",
      "Bingo",
      "Fanta",
      "Pogo",
      "Beans"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "angelfish",
    "name": "Angelfish",
    "genetics": "natural",
    "cost": 36,
    "mealCoins": 2,
    "asset": "/assets/fish/angelfish.png",
    "assetVariants": [
      "/assets/fish/angelfish_1.png",
      "/assets/fish/angelfish_2.png",
      "/assets/fish/angelfish_3.png",
      "/assets/fish/angelfish_4.png"
    ],
    "description": "A graceful fish known for its tall body, long fins, and slow, sweeping movements. Angelfish usually carry themselves calmly, but they can become territorial as they mature, especially when pairing or breeding.",
    "width": 456,
    "displayWidth": 235,
    "bobSpeed": 1.05,
    "swimStyle": "peaceful",
    "speedMin": 0.014,
    "speedMax": 0.02,
    "targetMinMs": 5400,
    "targetMaxMs": 8600,
    "defaultNames": [
      "Halo",
      "Opal",
      "Glint",
      "Pearl",
      "Seraph",
      "Ivory",
      "Luna",
      "Celeste",
      "Aurora",
      "Grace",
      "Nimbus",
      "Shimmer",
      "Eden",
      "Dove",
      "Solace",
      "Angelica",
      "Cloud",
      "Moonbeam",
      "Starlight",
      "Mirage"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "pufferfish",
    "name": "Pufferfish",
    "genetics": "natural",
    "cost": 40,
    "mealCoins": 2,
    "asset": "/assets/fish/pufferfish.png",
    "description": "A curious little oddball with a round body, expressive face, and plenty of personality. Pufferfish are known for investigating their surroundings and, when seriously threatened, inflating themselves into a much larger shape.",
    "width": 150,
    "bobSpeed": 1.55,
    "swimStyle": "steady",
    "speedMin": 0.014,
    "speedMax": 0.024,
    "targetMinMs": 2600,
    "targetMaxMs": 5600,
    "defaultNames": [
      "Puffin",
      "Marsh",
      "Button",
      "Plum",
      "Chonk",
      "Spud",
      "Wobble",
      "Boba",
      "Pickles",
      "Tater",
      "Gumball",
      "Pudge",
      "Mochi",
      "Pompom",
      "Squish",
      "Porkchop",
      "Biscuit",
      "Nugget",
      "Waffles",
      "Dumpling"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "zebra-danio",
    "name": "Zebra Danio",
    "genetics": "natural",
    "cost": 4,
    "mealCoins": 1,
    "asset": "/assets/fish/zebradanio.png",
    "description": "A small, energetic fish known for its bold horizontal stripes and nonstop activity. Zebra Danios are quick, social swimmers that love racing back and forth and rarely stay still for long.",
    "width": 143,
    "bobSpeed": 1.5,
    "swimStyle": "sporadic",
    "speedMin": 0.032,
    "speedMax": 0.052,
    "targetMinMs": 1200,
    "targetMaxMs": 3200,
    "defaultNames": [
      "Zig",
      "Dash",
      "Stripe",
      "Volt",
      "Zoom",
      "Racer",
      "Streak",
      "Flash",
      "Skid",
      "Bolt",
      "Turbo",
      "Rocket",
      "Pepper",
      "Jolt",
      "Whip",
      "Jitter",
      "Sonic",
      "Flicker",
      "Quickdraw",
      "Skippy"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "cherry-barb",
    "name": "Cherry Barb",
    "genetics": "natural",
    "cost": 5,
    "mealCoins": 1,
    "asset": "/assets/fish/cherrybarb.png",
    "description": "A small, peaceful fish known for its warm red coloring and relaxed personality. Cherry Barbs are social swimmers that do especially well in groups and tend to explore the tank at an easy, steady pace.",
    "width": 165,
    "bobSpeed": 1.28,
    "swimStyle": "steady",
    "speedMin": 0.02,
    "speedMax": 0.03,
    "targetMinMs": 2200,
    "targetMaxMs": 4600,
    "defaultNames": [
      "Cherry",
      "Blush",
      "Ruby",
      "Ember",
      "Scarlet",
      "Poppy",
      "Rose",
      "Berry",
      "Cranberry",
      "Maraschino",
      "Rosie",
      "Crimson",
      "Garnet",
      "Valentine",
      "Sangria",
      "Twizzler",
      "Blazer",
      "Cupid",
      "Reddy",
      "Jam"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "rainbowfish",
    "name": "Rainbowfish",
    "genetics": "natural",
    "cost": 16,
    "mealCoins": 1,
    "asset": "/assets/fish/rainbowfish.png",
    "description": "A lively, shimmering fish known for its metallic colors and graceful movement. Rainbowfish are active, social swimmers that look especially striking as they glide through the tank and catch the light.",
    "width": 241,
    "bobSpeed": 1.2,
    "swimStyle": "steady",
    "speedMin": 0.028,
    "speedMax": 0.04,
    "targetMinMs": 2600,
    "targetMaxMs": 5600,
    "defaultNames": [
      "Prism",
      "Iris",
      "Glow",
      "Aura",
      "Skittles",
      "Disco",
      "Neon",
      "Sunbeam",
      "Mirage",
      "Twinkle",
      "Pixel",
      "Kaleido",
      "Shimmer",
      "Sparkle",
      "Flair",
      "Confetti",
      "Radiance",
      "Glimmer",
      "Nova",
      "Luster"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "royal-gramma",
    "name": "Royal Gramma",
    "genetics": "natural",
    "cost": 20,
    "mealCoins": 2,
    "asset": "/assets/fish/royalgramma.png",
    "description": "A striking little fish known for its vivid purple and yellow coloring. Royal Grammas tend to stay close to rocks, caves, and other hiding places, often hovering nearby before darting back to safety.",
    "width": 260,
    "bobSpeed": 1.18,
    "swimStyle": "peaceful",
    "speedMin": 0.016,
    "speedMax": 0.024,
    "targetMinMs": 3200,
    "targetMaxMs": 6200,
    "defaultNames": [
      "Royal",
      "Velour",
      "Crown",
      "Majesty",
      "Regal",
      "Prince",
      "Queenie",
      "Scepter",
      "Velvet",
      "Amethyst",
      "Goldie",
      "Monarch",
      "Duke",
      "Baron",
      "Luxe",
      "Gilded",
      "Violet",
      "Imperial",
      "Treasure",
      "Sultan"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "yellow-tang",
    "name": "Yellow Tang",
    "genetics": "natural",
    "cost": 24,
    "mealCoins": 2,
    "asset": "/assets/fish/yellowtang.png",
    "assetVariants": [
      "/assets/fish/yellowtang_1.png"
    ],
    "description": "A bright, active fish known for its vivid yellow coloring and constant grazing. Yellow Tangs spend much of their time cruising around the tank and picking at algae as they explore.",
    "width": 360,
    "displayWidth": 245,
    "bobSpeed": 1.25,
    "swimStyle": "steady",
    "speedMin": 0.024,
    "speedMax": 0.034,
    "targetMinMs": 2400,
    "targetMaxMs": 5200,
    "defaultNames": [
      "Sunny",
      "Lemon",
      "Zest",
      "Goldie",
      "Banana",
      "Butter",
      "Dandelion",
      "Sunkist",
      "Yuzu",
      "Nacho",
      "Mustard",
      "Topaz",
      "Blondie",
      "Canary",
      "Sunbeam",
      "Dijon",
      "Cheese",
      "Marigold",
      "Mellow",
      "Pikachu"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "discus",
    "name": "Discus",
    "genetics": "natural",
    "cost": 32,
    "mealCoins": 2,
    "asset": "/assets/fish/discus.png",
    "description": "An elegant, round-bodied fish known for its striking colors and calm, deliberate movement. Discus tend to glide gracefully through the tank and have a reputation for being a little more delicate than the average aquarium fish.",
    "width": 488,
    "displayWidth": 260,
    "bobSpeed": 1.05,
    "swimStyle": "peaceful",
    "speedMin": 0.012,
    "speedMax": 0.018,
    "targetMinMs": 5200,
    "targetMaxMs": 8600,
    "defaultNames": [
      "Solar",
      "Halo",
      "Ember",
      "Flare",
      "Apollo",
      "Orbit",
      "Nova",
      "Helios",
      "Sundrop",
      "Phoenix",
      "Inferno",
      "Comet",
      "Blaze",
      "Aurora",
      "Solstice",
      "Zenith",
      "Lumen",
      "Vortex",
      "Corona",
      "Mirage"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "moor-goldfish",
    "name": "Black Moor Goldfish",
    "genetics": "natural",
    "cost": 4,
    "mealCoins": 1,
    "asset": "/assets/fish/moorgoldfish.png",
    "description": "A distinctive goldfish known for its deep black coloring, rounded body, and large telescope eyes. Black Moors are gentle, unhurried swimmers that tend to drift calmly around the tank.",
    "width": 378,
    "displayWidth": 250,
    "bobSpeed": 1.1,
    "swimStyle": "peaceful",
    "speedMin": 0.012,
    "speedMax": 0.018,
    "targetMinMs": 5200,
    "targetMaxMs": 8200,
    "defaultNames": [
      "Shadow",
      "Orb",
      "Midnight",
      "Pebble",
      "Inky",
      "Smokey",
      "Moon",
      "Raven",
      "Void",
      "Eclipse",
      "Jet",
      "Morpheus",
      "Obsidian",
      "Noir",
      "Phantom",
      "Ash",
      "Coal",
      "Salem",
      "Soot",
      "Gloom"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "chili-rasbora",
    "name": "Chili Rasbora",
    "genetics": "natural",
    "cost": 3,
    "mealCoins": 1,
    "asset": "/assets/fish/ChiliRasbora.png",
    "assetVariants": [
      "/assets/fish/ChiliRasbora_1.png",
      "/assets/fish/ChiliRasbora_2.png",
      "/assets/fish/ChiliRasbora_3.png",
      "/assets/fish/ChiliRasbora_4.png"
    ],
    "description": "A tiny, peaceful fish known for its brilliant red coloring and lively personality. Chili Rasboras feel most at home in groups, weaving through plants and open spaces in quick little bursts.",
    "width": 105,
    "bobSpeed": 1.48,
    "swimStyle": "sporadic",
    "speedMin": 0.022,
    "speedMax": 0.036,
    "targetMinMs": 1500,
    "targetMaxMs": 3600,
    "defaultNames": [
      "Pepper",
      "Chili",
      "Paprika",
      "Pico",
      "Ruby",
      "Ember",
      "Dot",
      "Pip",
      "Saffron",
      "Crimson",
      "Speck",
      "Miso",
      "Pep",
      "Berry",
      "Flick",
      "Tango",
      "Niblet",
      "Rosie",
      "Spark",
      "Tiny"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 5,
        "alike": true
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "ember-tetra",
    "name": "Ember Tetra",
    "genetics": "natural",
    "cost": 4,
    "mealCoins": 1,
    "asset": "/assets/fish/embertetra.png",
    "assetVariants": [
      "/assets/fish/embertetra_1.png",
      "/assets/fish/embertetra_2.png",
      "/assets/fish/embertetra_3.png",
      "/assets/fish/embertetra_4.png"
    ],
    "description": "A tiny, peaceful fish known for its warm orange coloring and gentle nature. Ember Tetras are happiest in groups, where they spend much of their time calmly schooling through the middle of the tank.",
    "width": 110,
    "bobSpeed": 1.42,
    "swimStyle": "steady",
    "speedMin": 0.022,
    "speedMax": 0.034,
    "targetMinMs": 1900,
    "targetMaxMs": 4300,
    "defaultNames": [
      "Ember",
      "Cinder",
      "Sunny",
      "Tangerine",
      "Glow",
      "Spark",
      "Copper",
      "Maple",
      "Mango",
      "Peach",
      "Flame",
      "Poppy",
      "Ginger",
      "Amber",
      "Flicker",
      "Clementine",
      "Torch",
      "Honey",
      "Blaze",
      "Apricot"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 5,
        "alike": true
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "harlequin-rasbora",
    "name": "Harlequin Rasbora",
    "genetics": "natural",
    "cost": 6,
    "mealCoins": 1,
    "asset": "/assets/fish/HarlequinRasbora.png",
    "assetVariants": [
      "/assets/fish/HarlequinRasbora_1.png",
      "/assets/fish/HarlequinRasbora_2.png",
      "/assets/fish/HarlequinRasbora_3.png",
      "/assets/fish/HarlequinRasbora_4.png"
    ],
    "description": "A peaceful, active fish known for its coppery coloring and distinctive black markings. Harlequin Rasboras are social swimmers that do best in groups and fit comfortably into calm community tanks.",
    "width": 155,
    "bobSpeed": 1.32,
    "swimStyle": "steady",
    "speedMin": 0.024,
    "speedMax": 0.036,
    "targetMinMs": 2000,
    "targetMaxMs": 4500,
    "defaultNames": [
      "Harley",
      "Jester",
      "Patch",
      "Copper",
      "Ace",
      "Domino",
      "Trickster",
      "Tango",
      "Penny",
      "Rook",
      "Mosaic",
      "Maple",
      "Quinn",
      "Pip",
      "Clover",
      "Pixel",
      "Rascal",
      "Scout",
      "Marble",
      "Harlow"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 5,
        "alike": true
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "pencilfish",
    "name": "Golden Pencilfish",
    "genetics": "natural",
    "cost": 7,
    "mealCoins": 1,
    "asset": "/assets/fish/Pencilfish.png",
    "assetVariants": [
      "/assets/fish/Pencilfish_1.png",
      "/assets/fish/Pencilfish_2.png",
      "/assets/fish/Pencilfish_3.png",
      "/assets/fish/Pencilfish_4.png"
    ],
    "description": "A slender, peaceful fish known for its golden coloring and delicate shape. Golden Pencilfish prefer staying near plants and cover, moving in relaxed groups with the occasional quick burst or harmless sparring display.",
    "width": 185,
    "bobSpeed": 1.24,
    "swimStyle": "steady",
    "speedMin": 0.018,
    "speedMax": 0.028,
    "targetMinMs": 2600,
    "targetMaxMs": 5600,
    "defaultNames": [
      "Pencil",
      "Graphite",
      "Sketch",
      "Dash",
      "Line",
      "Nib",
      "Scribble",
      "Reed",
      "Twig",
      "Quill",
      "Stripe",
      "Ink",
      "Ruler",
      "Streak",
      "Doodle",
      "Slate",
      "Pixel",
      "Copper",
      "Fineliner",
      "Taper"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 5,
        "alike": true
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "rummy-nose-tetra",
    "name": "Rummy-Nose Tetra",
    "genetics": "natural",
    "cost": 7,
    "mealCoins": 1,
    "asset": "/assets/fish/RummyNoseTetra.png",
    "assetVariants": [
      "/assets/fish/RummyNoseTetra_1.png",
      "/assets/fish/RummyNoseTetra_2.png",
      "/assets/fish/RummyNoseTetra_3.png",
      "/assets/fish/RummyNoseTetra_4.png"
    ],
    "description": "A peaceful, social fish known for its bright red nose and tightly coordinated schooling. Rummy-Nose Tetras move through the tank in impressive unison, and their coloring becomes especially vivid when they’re comfortable.",
    "width": 158,
    "bobSpeed": 1.36,
    "swimStyle": "steady",
    "speedMin": 0.026,
    "speedMax": 0.038,
    "targetMinMs": 1800,
    "targetMaxMs": 4100,
    "defaultNames": [
      "Rummy",
      "Ruby",
      "Rouge",
      "Beacon",
      "Signal",
      "Cherry",
      "Blush",
      "Scarlet",
      "Radar",
      "Pinot",
      "Rosy",
      "Flash",
      "Nosey",
      "Pepper",
      "Crimson",
      "Dash",
      "Merlot",
      "Berry",
      "Spark",
      "Socks"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 5,
        "alike": true
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "otocinclus",
    "name": "Dwarf Sucker Catfish",
    "genetics": "natural",
    "cost": 6,
    "mealCoins": 0,
    "asset": "/assets/fish/otocinclus.png",
    "fallbackAsset": "/assets/fish/pufferfish.png",
    "description": "A small, hardworking grazer that spends much of its time attached to glass, plants, and other surfaces. Dwarf Sucker Catfish steadily browse for algae and biofilm, helping keep the tank a little cleaner as they go.",
    "width": 170,
    "bobSpeed": 0.2,
    "swimStyle": "peaceful",
    "speedMin": 0.00009,
    "speedMax": 0.00016,
    "targetMinMs": 26000,
    "targetMaxMs": 52000,
    "behavior": "sucker",
    "diet": "detritus",
    "cleanupMinMs": 660000,
    "cleanupMaxMs": 1320000,
    "cleanupStrength": 0.16,
    "defaultNames": [
      "Mochi",
      "Peb",
      "Smudge",
      "Suction",
      "Otis",
      "Crumb",
      "Scooter",
      "Niblet",
      "Lint",
      "Dusty",
      "Toasty",
      "Scrub",
      "Mop",
      "Tiny Tank",
      "Gremlin",
      "Speck",
      "Doobie",
      "Plink",
      "Snout",
      "Tidbit"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "blue-ram",
    "name": "Blue Ram",
    "genetics": "natural",
    "cost": 11,
    "mealCoins": 1,
    "asset": "/assets/fish/BlueRam.png",
    "description": "A small, colorful cichlid known for its brilliant blue markings and confident personality. Blue Rams usually move with calm, deliberate turns, but they can become territorial when pairing or guarding a chosen spot.",
    "width": 240,
    "bobSpeed": 1.18,
    "swimStyle": "peaceful",
    "speedMin": 0.016,
    "speedMax": 0.024,
    "targetMinMs": 4200,
    "targetMaxMs": 7600,
    "defaultNames": [
      "Lapis",
      "Indigo",
      "Cobalt",
      "Marina",
      "Sapphire",
      "Rambo",
      "Azure",
      "Mako",
      "Triton",
      "Borealis",
      "Koda",
      "Denim",
      "Navy",
      "Bluey",
      "Aegean",
      "Zephyr",
      "Storm",
      "Glacier",
      "Echo",
      "Rio"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "gourami",
    "name": "Gourami",
    "genetics": "natural",
    "cost": 18,
    "mealCoins": 1,
    "asset": "/assets/fish/Gourami.png",
    "description": "A graceful fish known for its flowing fins, long feelers, and calm presence. Gouramis tend to move at an easy pace and often explore the tank with slow, deliberate turns near the surface.",
    "width": 158,
    "bobSpeed": 1.08,
    "swimStyle": "peaceful",
    "speedMin": 0.014,
    "speedMax": 0.021,
    "targetMinMs": 5200,
    "targetMaxMs": 8600,
    "defaultNames": [
      "Pearl",
      "Lotus",
      "Velour",
      "Halo",
      "Sage",
      "Willow",
      "Silk",
      "Opaline",
      "Lily",
      "Serene",
      "Breeze",
      "Moonpetal",
      "Ivory",
      "Sora",
      "Clover",
      "Mallow",
      "Zen",
      "Fable",
      "Aster",
      "Nimbus"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "wonder-killifish",
    "name": "Wonder Killifish",
    "genetics": "natural",
    "cost": 15,
    "mealCoins": 1,
    "asset": "/assets/fish/wonderkillifish.png",
    "description": "A flashy little hunter known for its bold markings, curious nature, and sudden bursts of speed. Wonder Killifish often patrol near the surface, watching everything around them before darting off after something interesting.",
    "width": 243,
    "bobSpeed": 1.34,
    "swimStyle": "sporadic",
    "speedMin": 0.02,
    "speedMax": 0.038,
    "targetMinMs": 1400,
    "targetMaxMs": 3400,
    "defaultNames": [
      "Comet",
      "Glint",
      "Flicker",
      "Nova",
      "Rocket",
      "Vandal",
      "Rascal",
      "Jinx",
      "Maverick",
      "Blitz",
      "Pistol",
      "Riot",
      "Zippy",
      "Bandit",
      "Rumble",
      "Hex",
      "Chaos",
      "Skipper",
      "Ace",
      "Havoc"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "neon-tetra",
    "name": "Neon Tetra",
    "genetics": "natural",
    "cost": 5,
    "mealCoins": 1,
    "asset": "/assets/fish/NeonTetra.png",
    "description": "A tiny, peaceful fish known for its glowing blue stripe and vivid red coloring. Neon Tetras are social swimmers that look their best in groups, moving together in lively little schools.",
    "width": 136,
    "bobSpeed": 1.42,
    "swimStyle": "steady",
    "speedMin": 0.024,
    "speedMax": 0.036,
    "targetMinMs": 2000,
    "targetMaxMs": 4200,
    "defaultNames": [
      "Neon",
      "Zip",
      "Spark",
      "Glimmer",
      "Laser",
      "Pixel",
      "Circuit",
      "Glowstick",
      "Static",
      "Blink",
      "Plasma",
      "Twitch",
      "Tesla",
      "Radon",
      "Strobe",
      "Jellybean",
      "Arc",
      "Lumen",
      "Dash",
      "Photon"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "celestial-pearl-danio",
    "name": "Celestial Pearl Danio",
    "genetics": "natural",
    "cost": 3,
    "mealCoins": 1,
    "asset": "/assets/fish/CelestialPearlDanio.png",
    "assetVariants": [
      "/assets/fish/CelestialPearlDanio_1.png",
      "/assets/fish/CelestialPearlDanio_2.png",
      "/assets/fish/CelestialPearlDanio_3.png",
      "/assets/fish/CelestialPearlDanio_4.png"
    ],
    "description": "A tiny, striking fish covered in pearl-like spots with flashes of red and orange on its fins. Celestial Pearl Danios are curious little swimmers that alternate between quick darts and brief, watchful pauses.",
    "width": 105,
    "bobSpeed": 1.38,
    "swimStyle": "sporadic",
    "speedMin": 0.02,
    "speedMax": 0.034,
    "targetMinMs": 1500,
    "targetMaxMs": 3600,
    "defaultNames": [
      "Starlit",
      "Pearlie",
      "Orbit",
      "Dot",
      "Cosmo",
      "Nova",
      "Galaxy",
      "Pip",
      "Speck",
      "Twinkle",
      "Comet",
      "Astro",
      "Starbean",
      "Niblet",
      "Luna",
      "Glimmer",
      "Sparkle",
      "Pluto",
      "Skittle",
      "Blinky"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "molly",
    "name": "Molly",
    "genetics": "natural",
    "cost": 7,
    "mealCoins": 1,
    "asset": "/assets/fish/molly.png",
    "description": "A hardy, easygoing fish known for its rounded shape, active nature, and friendly demeanor. Mollies spend much of their time steadily exploring the tank and tend to get along well with other peaceful fish.",
    "width": 287,
    "bobSpeed": 1.22,
    "swimStyle": "steady",
    "speedMin": 0.02,
    "speedMax": 0.03,
    "targetMinMs": 2600,
    "targetMaxMs": 5200,
    "defaultNames": [
      "Mallow",
      "Biscuit",
      "Sunny",
      "Daisy",
      "Poppy",
      "Butterbean",
      "Pudding",
      "Cookie",
      "Muffin",
      "Nilla",
      "Taffy",
      "Clover",
      "Honeybun",
      "Pebbles",
      "Toffee",
      "Sundae",
      "Bunny",
      "Pancake",
      "Winnie",
      "Sprinkles"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": true
  },
  {
    "id": "swordtail",
    "name": "Swordtail",
    "genetics": "natural",
    "cost": 9,
    "mealCoins": 1,
    "asset": "/assets/fish/Swordtail.png",
    "description": "A sleek, active fish best known for the long, sword-like extension on the male’s tail. Swordtails are livebearers, giving birth to free-swimming young instead of laying eggs, and spend much of their time confidently cruising the tank.",
    "width": 220,
    "bobSpeed": 1.3,
    "swimStyle": "steady",
    "speedMin": 0.024,
    "speedMax": 0.036,
    "targetMinMs": 2200,
    "targetMaxMs": 4800,
    "defaultNames": [
      "Blade",
      "Lancer",
      "Flash",
      "Sable",
      "Rapier",
      "Dagger",
      "Slash",
      "Fencer",
      "Viper",
      "Striker",
      "Edge",
      "Katana",
      "Rogue",
      "Spike",
      "Hunter",
      "Arrow",
      "Rex",
      "Spear",
      "Bandit",
      "Jett"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": true
  },
  {
    "id": "livebearer",
    "name": "Livebearer",
    "genetics": "natural",
    "cost": 8,
    "mealCoins": 1,
    "asset": "/assets/fish/Livebearer.png",
    "description": "A lively, social fish best known for giving birth to free-swimming young instead of laying eggs. Livebearers are active, curious swimmers that settle easily into peaceful community tanks.",
    "width": 141,
    "bobSpeed": 1.26,
    "swimStyle": "steady",
    "speedMin": 0.02,
    "speedMax": 0.032,
    "targetMinMs": 2400,
    "targetMaxMs": 5200,
    "defaultNames": [
      "Coral",
      "Willow",
      "Miso",
      "Poppy",
      "Skipper",
      "Pebble",
      "Rosie",
      "Sunny",
      "Blinky",
      "Noodle",
      "Daisy",
      "Pickles",
      "Clover",
      "Biscuit",
      "Tango",
      "Bubbles",
      "Pip",
      "Sprout",
      "Mango",
      "Wiggles"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": true
  },
  {
    "id": "piranha",
    "name": "Piranha",
    "genetics": "natural",
    "cost": 12,
    "mealCoins": 1,
    "asset": "/assets/fish/piranha.png",
    "fallbackAsset": "/assets/fish/cherrybarb.png",
    "description": "A sharp-toothed predator with a reputation that speaks for itself. Piranhas hunt in groups, ignore ordinary pellets, and will quickly turn most living tankmates into lunch. Why buy one? Seriously. Why?",
    "width": 284,
    "bobSpeed": 1.44,
    "swimStyle": "sporadic",
    "speedMin": 0.022,
    "speedMax": 0.04,
    "targetMinMs": 1100,
    "targetMaxMs": 2600,
    "behavior": "piranha",
    "diet": "chum",
    "defaultNames": [
      "Razor",
      "Chomp",
      "Scar",
      "Fang",
      "Snap",
      "Ripley",
      "Nipper",
      "Riot",
      "Jaws",
      "Slash"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "koi",
    "name": "Koi",
    "genetics": "natural",
    "cost": 30,
    "mealCoins": 2,
    "asset": "/assets/fish/Koi_1.png",
    "assetVariants": [
      "/assets/fish/Koi_2.png",
      "/assets/fish/Koi_3.png",
      "/assets/fish/Koi_4.png",
      "/assets/fish/Koi_5.png"
    ],
    "description": "A large, peaceful ornamental carp bred for bold colors and striking patterns. Koi are steady, social swimmers that cruise open water and nose around the bottom for food, so they appreciate plenty of room to move.",
    "width": 420,
    "displayWidth": 280,
    "bobSpeed": 1,
    "swimStyle": "peaceful",
    "speedMin": 0.012,
    "speedMax": 0.019,
    "targetMinMs": 4800,
    "targetMaxMs": 8200,
    "defaultNames": [
      "Kohaku",
      "Sumi",
      "Mikan",
      "Sakura",
      "Yuki",
      "Hoshi",
      "Mochi",
      "Kumo",
      "Akari",
      "Tora",
      "Nami",
      "Kiku",
      "Beni",
      "Shiro",
      "Gin",
      "Koi Boy",
      "Marble",
      "Lantern",
      "Pond",
      "Lucky"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false,
    "diet": "pellet",
    "breedingMethod": "egg-scatterer",
    "spawnPreference": "plants-or-substrate"
  },
  {
    "id": "lionfish",
    "name": "Lionfish",
    "genetics": "natural",
    "cost": 35,
    "mealCoins": 2,
    "asset": "/assets/fish/Lionfish_1.png",
    "assetVariants": [
      "/assets/fish/Lionfish_2.png",
      "/assets/fish/Lionfish_3.png",
      "/assets/fish/Lionfish_4.png",
      "/assets/fish/Lionfish_5.png"
    ],
    "description": "A slow, deliberate reef predator with broad fan-like fins and venomous spines. Lionfish hover near rockwork and shelter, then stalk chum with outstretched fins before a sudden short strike.",
    "width": 340,
    "displayWidth": 270,
    "bobSpeed": 1.05,
    "swimStyle": "steady",
    "speedMin": 0.012,
    "speedMax": 0.021,
    "targetMinMs": 3800,
    "targetMaxMs": 7200,
    "defaultNames": [
      "Leo",
      "Stripe",
      "Spines",
      "Raja",
      "Ember",
      "Flare",
      "Bandit",
      "Crown",
      "Venom",
      "Mane",
      "Rook",
      "Sable",
      "Torch",
      "Razor",
      "Coral",
      "Regal",
      "Fang",
      "Bristle",
      "Marquis",
      "Roar"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false,
    "diet": "chum",
    "chumOnly": true,
    "breedingMethod": "floating-egg-mass",
    "spawnPreference": "open-water"
  },
  {
    "id": "bull-shark",
    "name": "Bull Shark",
    "genetics": "enhanced",
    "seller": "Proteus Biodyne",
    "type": "Shark",
    "cost": 42,
    "mealCoins": 3,
    "asset": "/assets/fish/Bull_Shark.png",
    "assetVariants": [
      "/assets/fish/Bull_Shark_1.png",
      "/assets/fish/Bull_Shark_2.png",
      "/assets/fish/Bull_Shark_3.png",
      "/assets/fish/Bull_Shark_4.png"
    ],
    "description": "A proven success in the PROTEUS BIODYNE marine scaling program. Our goldfish-sized Bull Shark demonstrates excellent specimen stability while retaining the adaptability, confidence, and predatory response profile of a mature animal. Chum recognition remains exceptionally strong, territorial movement is consistent, and predatory retention meets all behavioral integrity targets. Cohabitation performance is considered acceptable under normal feeding conditions. Periods of nutritional deficiency may result in opportunistic reassessment of nearby tankmates.",
    "aboutAttribution": "PROTEUS BIODYNE",
    "aboutTagline": "Adaptive Biology. Engineered.",
    "width": 405,
    "displayWidth": 310,
    "bobSpeed": 1.08,
    "swimStyle": "steady",
    "speedMin": 0.028,
    "speedMax": 0.044,
    "targetMinMs": 2200,
    "targetMaxMs": 4800,
    "behavior": "shark",
    "diet": "chum",
    "chumOnly": true,
    "desperationPredator": true,
    "heartCount": 10,
    "defaultNames": [
      "Bully",
      "Brackish",
      "Rumble",
      "Breaker",
      "Tide",
      "Mako",
      "Riptide",
      "Muddy",
      "Brawler",
      "Jaws"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "complex",
    "liveBirth": false
  },
  {
    "id": "great-white-shark",
    "name": "Great White Shark",
    "genetics": "enhanced",
    "seller": "Proteus Biodyne",
    "type": "Shark",
    "cost": 55,
    "mealCoins": 4,
    "asset": "/assets/fish/Great_White_Shark.png",
    "description": "A flagship achievement in PROTEUS BIODYNE biological miniaturization. This goldfish-sized Great White Shark maintains exceptional behavioral integrity, preserving the patrol patterns, feeding responses, and predatory instincts expected from a full-grown apex predator. Specimen stability remains high despite the extreme reduction in body mass, with reliable chum acquisition and excellent predatory retention. Interaction with neighboring specimens is minimal while nutritional requirements are satisfied. Hunger-related pursuit behavior is considered an expected expression of retained phenotype.",
    "aboutAttribution": "PROTEUS BIODYNE",
    "aboutTagline": "Adaptive Biology. Engineered.",
    "width": 405,
    "displayWidth": 310,
    "bobSpeed": 0.96,
    "swimStyle": "steady",
    "speedMin": 0.028,
    "speedMax": 0.046,
    "targetMinMs": 2600,
    "targetMaxMs": 5600,
    "behavior": "shark",
    "diet": "chum",
    "chumOnly": true,
    "desperationPredator": true,
    "heartCount": 10,
    "defaultNames": [
      "Whitecap",
      "Brine",
      "Glacier",
      "Silver",
      "Breaker",
      "Mistral",
      "Mariner",
      "Finley",
      "Pearl",
      "Moby"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "complex",
    "liveBirth": false
  },
  {
    "id": "hammerhead-shark",
    "name": "Hammerhead Shark",
    "genetics": "enhanced",
    "seller": "Proteus Biodyne",
    "type": "Shark",
    "cost": 48,
    "mealCoins": 3,
    "asset": "/assets/fish/Hammerhead_Shark.png",
    "assetVariants": [
      "/assets/fish/Hammerhead_Shark_1.png",
      "/assets/fish/Hammerhead_Shark_2.png",
      "/assets/fish/Hammerhead_Shark_3.png",
      "/assets/fish/Hammerhead_Shark_4.png"
    ],
    "description": "A highly successful product of the PROTEUS BIODYNE marine development program. Our goldfish-sized Hammerhead Shark exhibits strong specimen stability, full sensory retention, and an unusually high level of environmental engagement. Wide-ranging patrol behavior has been preserved alongside rapid chum acquisition and dependable feeding response. Behavioral testing confirms that miniaturization has produced no meaningful reduction in exploratory drive or predatory function, exceeding several original development targets.",
    "aboutAttribution": "PROTEUS BIODYNE",
    "aboutTagline": "Adaptive Biology. Engineered.",
    "width": 405,
    "displayWidth": 310,
    "bobSpeed": 1.12,
    "swimStyle": "steady",
    "speedMin": 0.026,
    "speedMax": 0.042,
    "targetMinMs": 2100,
    "targetMaxMs": 4700,
    "behavior": "shark",
    "diet": "chum",
    "chumOnly": true,
    "desperationPredator": true,
    "heartCount": 10,
    "defaultNames": [
      "Hammer",
      "Radar",
      "Scout",
      "Wedge",
      "Sonar",
      "Banner",
      "Sweep",
      "Tally",
      "Sail",
      "Echo"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "complex",
    "liveBirth": false
  },
  {
    "id": "orca",
    "name": "Orca",
    "genetics": "enhanced",
    "seller": "Proteus Biodyne",
    "type": "Whale",
    "cost": 60,
    "mealCoins": 4,
    "asset": "/assets/fish/Orca.png",
    "description": "One of the most significant achievements in PROTEUS BIODYNE history. Advanced biological scaling has produced a stable, goldfish-sized Orca while preserving cognitive performance, social recognition, communication, emotional complexity, and behavioral memory at levels consistent with the full-sized animal. Long-term observation confirms persistent social bonding and individual recognition across specimens. Respiratory architecture was intentionally retained without modification, requiring routine surfacing and periodic breaching. Internal assessments classify cognitive retention as exceptional and commercial viability as highly favorable.",
    "aboutAttribution": "PROTEUS BIODYNE",
    "aboutTagline": "Adaptive Biology. Engineered.",
    "width": 405,
    "displayWidth": 320,
    "bobSpeed": 1.02,
    "swimStyle": "steady",
    "speedMin": 0.03,
    "speedMax": 0.048,
    "targetMinMs": 2200,
    "targetMaxMs": 5000,
    "behavior": "shark",
    "diet": "chum",
    "chumOnly": true,
    "desperationPredator": true,
    "heartCount": 10,
    "defaultNames": [
      "Koa",
      "Echo",
      "Nalu",
      "Tala",
      "Pod",
      "Comet",
      "Wave",
      "Rook",
      "Cedar",
      "Orion"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 1,
        "alike": true
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "complex",
    "liveBirth": true
  },
  {
    "id": "sunfish",
    "name": "Ocean Sunfish",
    "genetics": "enhanced",
    "seller": "Proteus Biodyne",
    "type": "Fish",
    "cost": 24,
    "mealCoins": 2,
    "asset": "/assets/fish/Sunfish.png",
    "description": "Developed under the PROTEUS BIODYNE Compact Marine Initiative, the Ocean Sunfish represents a successful conversion of one of the world's largest bony fish into a commercially practical aquarium specimen. Miniaturization achieved target scale without compromising body plan, temperament, surface-oriented behavior, or characteristic locomotion. Specimen stability has remained exceptionally high throughout evaluation, with no significant behavioral degradation observed. The resulting goldfish-sized Sunfish offers full phenotype retention at a fraction of the spatial requirement.",
    "aboutAttribution": "PROTEUS BIODYNE",
    "aboutTagline": "Adaptive Biology. Engineered.",
    "width": 330,
    "displayWidth": 230,
    "bobSpeed": 0.82,
    "swimStyle": "peaceful",
    "speedMin": 0.012,
    "speedMax": 0.018,
    "targetMinMs": 4200,
    "targetMaxMs": 8200,
    "heartCount": 7,
    "defaultNames": [
      "Sunny",
      "Pancake",
      "Mellow",
      "Float",
      "Moon",
      "Dapple",
      "Drift",
      "Sol",
      "Mochi",
      "Luma"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "seahorse",
    "name": "Seahorse",
    "genetics": "natural",
    "type": "Seahorse",
    "cost": 18,
    "mealCoins": 2,
    "asset": "/assets/fish/Seahorse.png",
    "description": "A delicate, upright swimmer that prefers drifting to rushing. Seahorses spend much of their time hovering near plants and other perches, often using their curled tails to hold on while they rest and watch the tank around them.",
    "width": 95,
    "bobSpeed": 0.74,
    "swimStyle": "peaceful",
    "speedMin": 0.012,
    "speedMax": 0.016,
    "targetMinMs": 3800,
    "targetMaxMs": 7600,
    "renderMotionProfile": "seahorse",
    "defaultNames": [
      "Tails",
      "Pip",
      "Kelp",
      "Coral",
      "Moss",
      "Sway",
      "Twig",
      "Nori",
      "Wisp",
      "Dune"
    ],
    "caveEnabled": true,
    "needs": {
      "decor": [
        "plants"
      ],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  },
  {
    "id": "pilot-fish",
    "name": "Pilot Fish",
    "genetics": "natural",
    "type": "Fish",
    "cost": 24,
    "mealCoins": 2,
    "asset": "/assets/fish/Pilot_Fish.png",
    "assetVariants": [
      "/assets/fish/Pilot_Fish_1.png",
      "/assets/fish/Pilot_Fish_2.png",
      "/assets/fish/Pilot_Fish_3.png",
      "/assets/fish/Pilot_Fish_4.png"
    ],
    "description": "An active, curious fish known for following larger animals through open water. In the wild, Pilot Fish often shadow sharks and other big swimmers, picking through scraps and investigating whatever their much larger companions leave behind.",
    "width": 320,
    "displayWidth": 245,
    "bobSpeed": 1.28,
    "swimStyle": "steady",
    "speedMin": 0.028,
    "speedMax": 0.044,
    "targetMinMs": 1900,
    "targetMaxMs": 4300,
    "defaultNames": [
      "Pilot",
      "Stripe",
      "Wingman",
      "Scout",
      "Shadow",
      "Skipper",
      "Escort",
      "Radar",
      "Buddy",
      "Dash"
    ],
    "caveEnabled": false,
    "needs": {
      "decor": [],
      "friends": {
        "min": 0,
        "alike": false
      }
    },
    "dislikedTypes": [],
    "turnAnimation": "simple",
    "liveBirth": false
  }
];

const WATER_TYPE_META = Object.freeze({
  freshwater: {
    id: "freshwater",
    name: "Freshwater"
  },
  saltwater: {
    id: "saltwater",
    name: "Saltwater"
  }
});

const TANK_TYPE_META = Object.freeze({
  rectangular: {
    id: "rectangular",
    name: "Aquarium",
    shortName: "Aquarium",
    description: "A full-size aquarium with room for fish and decor.",
    cost: 65,
    waterTypes: ["freshwater", "saltwater"],
    defaultWaterType: "freshwater",
    baseCleanDays: DEFAULT_TANK_DIRTY_DAYS,
    visual: "rectangular"
  }
});

const TANK_PRODUCT_IMAGE_PATHS = Object.freeze({
  rectangular: "assets/icons/edit_tank.png"
});

const BOWL_TANK_OUTER_POINTS = Object.freeze([
  [0.278, 0.05],
  [0.722, 0.05],
  [0.862, 0.18],
  [0.926, 0.35],
  [0.934, 0.57],
  [0.906, 0.76],
  [0.842, 0.9],
  [0.706, 0.955],
  [0.294, 0.955],
  [0.158, 0.9],
  [0.094, 0.76],
  [0.066, 0.57],
  [0.074, 0.35],
  [0.138, 0.18]
]);

const BOWL_TANK_INNER_POINTS = Object.freeze([
  [0.292, 0.064],
  [0.708, 0.064],
  [0.842, 0.188],
  [0.9, 0.35],
  [0.908, 0.568],
  [0.884, 0.75],
  [0.826, 0.878],
  [0.698, 0.916],
  [0.302, 0.916],
  [0.174, 0.878],
  [0.116, 0.75],
  [0.092, 0.568],
  [0.1, 0.35],
  [0.158, 0.188]
]);

const BUBBLE_META = {
  "glass-orbs.png": {
    name: "Glass Orbs",
    blurb: "Larger glossy bubbles with a slower, dreamy look."
  },
  "micro-fizz.png": {
    name: "Micro Fizz",
    blurb: "Tiny fizzy bubbles for a busy planted tank feel."
  },
  "soft-pearls.png": {
    name: "Soft Pearls",
    blurb: "Rounded pearly bubbles with a gentle shimmer."
  }
};

const SWIM_STYLE_DEFAULTS = {
  peaceful: {
    speedMin: 0.018,
    speedMax: 0.024,
    targetMinMs: 4600,
    targetMaxMs: 7600,
    speedMode: "steady"
  },
  steady: {
    speedMin: 0.03,
    speedMax: 0.042,
    targetMinMs: 2400,
    targetMaxMs: 5200,
    speedMode: "steady"
  },
  sporadic: {
    speedMin: 0.022,
    speedMax: 0.074,
    targetMinMs: 1400,
    targetMaxMs: 3600,
    speedMode: "dynamic"
  }
};

const DECOR_META = {
  "halloween-seaweed__plant__theme-halloween.png": {
    "name": "Haunted Seaweed",
    "width": 644,
    "defaultScale": 1,
    "categories": [
      "plant"
    ],
    "theme": "halloween",
    "description": "Dark, eerie seaweed that sways in the tank with considerably more menace than ordinary seaweed should possess.",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "halloween",
      "grazable",
      "perchable",
      "sway",
      "spooky"
    ]
  },
  "amazon-sword__plant__theme-natural.png": {
    "name": "Amazon Sword",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A amazon sword decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "anubias-rock__plant-rock__theme-natural.png": {
    "name": "Anubias Rock",
    "cost": 4,
    "width": 495,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A hardy Anubias growing directly from a rock. Conveniently combines plant and stone into one tidy little decoration.",
    "categories": [
      "plant",
      "rock"
    ],
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "rock",
      "natural",
      "hardscape",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "bacopa__plant__theme-natural.png": {
    "name": "Bacopa",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A bacopa decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "bronze-red-crypt__plant__theme-natural.png": {
    "name": "Bronze Red Crypt",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A bronze red crypt decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "cabomba__plant__theme-natural.png": {
    "name": "Cabomba",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A cabomba decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "cryptocoryne__plant__theme-natural.png": {
    "name": "Cryptocoryne",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A cryptocoryne decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "hornwort__plant__theme-natural.png": {
    "name": "Hornwort",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A hornwort decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "java-fern-cluster__plant__theme-natural.png": {
    "name": "Java Fern Cluster",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A java fern cluster decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "java-moss__plant__theme-natural.png": {
    "name": "Java Moss",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A java moss decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "ludwigia__plant__theme-natural.png": {
    "name": "Ludwigia",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A ludwigia decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "marimo-moss-ball__plant__theme-natural.png": {
    "name": "Marimo Moss Ball",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A marimo moss ball decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "monte-carlo-carpet__plant__theme-natural.png": {
    "name": "Monte Carlo Carpet",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A monte carlo carpet decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "red-stem__plant__theme-natural.png": {
    "name": "Red Stem",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A red stem decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "rotala__plant__theme-natural.png": {
    "name": "Rotala",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A rotala decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "small-moss-patch__plant__theme-natural.png": {
    "name": "Small Moss Patch",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A small moss patch decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "tiger-lotus__plant__theme-natural.png": {
    "name": "Tiger Lotus",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A tiger lotus decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "vallisneria-clump__plant__theme-natural.png": {
    "name": "Vallisneria Clump",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A vallisneria clump decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "vallisneria-cutout__plant__theme-natural.png": {
    "name": "Vallisneria Cutout",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A vallisneria cutout decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "water-wisteria__plant__theme-natural.png": {
    "name": "Water Wisteria",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A water wisteria decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "hammer-coral__coral__theme-reef.png": {
    "name": "Hammer Coral",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A hammer coral decoration for the aquarium.",
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "behavior": "anchored_sway",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable",
      "sway"
    ]
  },
  "leather-coral__coral__theme-reef.png": {
    "name": "Leather Coral",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A leather coral decoration for the aquarium.",
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "behavior": "anchored_sway",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable",
      "sway"
    ]
  },
  "macroalgae__plant__theme-reef.png": {
    "name": "Macroalgae",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A macroalgae decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "reef",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "reef",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "large-mushroom-coral__coral__theme-reef.png": {
    "name": "Mushroom Coral",
    "cost": 15,
    "width": 510,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A low, rounded coral with soft curves and plenty of texture. An easy way to add a natural reef look without taking over the tank.",
    "behavior": "anchored_sway",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable",
      "sway"
    ]
  },
  "mushroom-coral-colony__coral__theme-reef.png": {
    "name": "Mushroom Coral Colony",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A mushroom coral colony decoration for the aquarium.",
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "behavior": "anchored_sway",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable",
      "sway"
    ]
  },
  "sea-anemone__coral__theme-reef.png": {
    "name": "Sea Anemone 2",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A soft mass of waving tentacles that brings constant gentle movement to the aquarium. Clownfish may approve.",
    "behavior": "anchored_sway",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable",
      "sway",
      "anemone",
      "clownfish-host"
    ]
  },
  "sea-anemone__coral__theme-reef__v2.png": {
    "name": "Sea Anemone 5",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A colorful sea anemone with flowing tentacles that sway with the water and make the tank feel a little more alive.",
    "behavior": "anchored_sway",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable",
      "sway",
      "anemone",
      "clownfish-host"
    ]
  },
  "sea-fan-gorgonian__coral__theme-reef.png": {
    "name": "Sea Fan Gorgonian",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A sea fan gorgonian decoration for the aquarium.",
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "behavior": "anchored_sway",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable",
      "sway"
    ]
  },
  "seaweed__plant__theme-reef.png": {
    "name": "Seaweed",
    "cost": 4,
    "width": 280,
    "defaultScale": 1,
    "theme": "reef",
    "description": "A simple patch of flowing seaweed that adds height, movement, and a little extra greenery to the tank.",
    "categories": [
      "plant"
    ],
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "reef",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "seaweed-bunch__plant__theme-reef.png": {
    "name": "Seaweed Bunch",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A seaweed bunch decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "reef",
    "behavior": "anchored_sway",
    "tags": [
      "plant",
      "reef",
      "grazable",
      "perchable",
      "sway"
    ]
  },
  "torch-coral__coral__theme-reef.png": {
    "name": "Torch Coral",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A torch coral decoration for the aquarium.",
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "behavior": "anchored_sway",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable",
      "sway"
    ]
  },
  "frozen-bubbler__bubbler__theme-frozen.png": {
    "name": "Frozen Bubbler",
    "cost": 8,
    "width": 340,
    "defaultScale": 1,
    "description": "A frozen bubbler decoration for the aquarium.",
    "categories": [
      "bubbler"
    ],
    "theme": "frozen",
    "behavior": "bubbler",
    "tags": [
      "bubbler",
      "frozen",
      "hardscape",
      "bubble-emitter"
    ],
    "bubbler": {
      "spoutQty": 1
    }
  },
  "halloween-cauldron__bubbler__theme-halloween__front.png": {
    "name": "Haunted Cauldron Bubbler",
    "width": 125,
    "defaultScale": 1,
    "categories": [
      "bubbler"
    ],
    "fishBehavior": {
      "hangout": [
        "bubbler",
        "hardscape"
      ]
    },
    "bubbler": {
      "spoutQty": 1,
      "spouts": [
        {
          "horizontalLocation": 0.5,
          "verticalLocation": 0.17,
          "intensity": 5,
          "speed": 1,
          "spread": 48,
          "fadeDistance": 210,
          "bubbleColor": [
            "",
            "",
            ""
          ],
          "bubbleOpacity": 3
        }
      ]
    },
    "theme": "halloween",
    "description": "A cauldron that churns away on the aquarium floor, releasing a steady stream of bubbles. Whatever is brewing inside probably should not be tasted. Also: Completely Adjustable and Customizable!",
    "behavior": "bubbler",
    "tags": [
      "bubbler",
      "halloween",
      "hardscape",
      "bubble-emitter",
      "spooky"
    ]
  },
  "halloween-jack-o-lantern__bubbler__theme-halloween__front.png": {
    "name": "Jack-o'-Lantern Bubbler",
    "width": 125,
    "defaultScale": 1,
    "categories": [
      "bubbler"
    ],
    "fishBehavior": {
      "hangout": [
        "bubbler",
        "hardscape"
      ]
    },
    "bubbler": {
      "spoutQty": 1,
      "spouts": [
        {
          "horizontalLocation": 0.5,
          "verticalLocation": 0.16,
          "intensity": 4,
          "speed": 1,
          "spread": 46,
          "fadeDistance": 205,
          "bubbleColor": [
            "",
            "",
            ""
          ],
          "bubbleOpacity": 3
        }
      ]
    },
    "theme": "halloween",
    "description": "A grinning jack-o'-lantern that releases a steady stream of bubbles. The pumpkin remains suspiciously intact underwater. Also: Completely Adjustable and Customizable!",
    "behavior": "bubbler",
    "tags": [
      "bubbler",
      "halloween",
      "hardscape",
      "bubble-emitter",
      "spooky"
    ]
  },
  "volcano__bubbler__theme-natural__front.png": {
    "name": "Volcano Bubbler 1",
    "cost": 16,
    "width": 390,
    "defaultScale": 1,
    "bubbler": {
      "spoutQty": 1,
      "spouts": [
        {
          "horizontalLocation": 0.5,
          "intensity": 15,
          "speed": 2,
          "spread": 40,
          "fadeDistance": 250,
          "bubbleColor": [
            "",
            "",
            ""
          ],
          "bubbleOpacity": 3
        }
      ]
    },
    "theme": "natural",
    "description": "A miniature volcano that continuously sends bubbles toward the surface. Considerably safer than the full-sized version. Also: Completely Adjustable and Customizable!",
    "categories": [
      "bubbler"
    ],
    "behavior": "bubbler",
    "tags": [
      "bubbler",
      "natural",
      "hardscape",
      "bubble-emitter"
    ]
  },
  "volcano__bubbler__theme-natural__v2__front.png": {
    "name": "Volcano Bubbler 2",
    "cost": 18,
    "width": 375,
    "defaultScale": 1,
    "bubbler": {
      "spoutQty": 2,
      "spouts": [
        {
          "horizontalLocation": 0.3,
          "intensity": 15,
          "speed": 2,
          "spread": 20,
          "fadeDistance": 200,
          "bubbleColor": [
            "",
            "",
            ""
          ],
          "bubbleOpacity": 3
        },
        {
          "horizontalLocation": 0.6,
          "intensity": 10,
          "speed": 2,
          "spread": 20,
          "fadeDistance": 200,
          "bubbleColor": [
            "",
            "",
            ""
          ],
          "bubbleOpacity": 3
        }
      ]
    },
    "theme": "natural",
    "description": "A bubbling volcanic decoration that adds constant movement to the tank without requiring an evacuation plan. Also: Completely Adjustable and Customizable!",
    "categories": [
      "bubbler"
    ],
    "behavior": "bubbler",
    "tags": [
      "bubbler",
      "natural",
      "hardscape",
      "bubble-emitter"
    ]
  },
  "treasure-chest__bubbler__theme-treasure__front.png": {
    "name": "Treasure Chest Bubbler",
    "cost": 8,
    "width": 233,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": [
        "hardscape"
      ]
    },
    "bubbler": {
      "spoutQty": 1,
      "spouts": [
        {
          "horizontalLocation": 0.5,
          "intensity": 4,
          "speed": 1,
          "spread": 50,
          "fadeDistance": 200,
          "bubbleColor": [
            "",
            "",
            ""
          ],
          "bubbleOpacity": 3
        }
      ]
    },
    "theme": "treasure",
    "description": "A little sunken treasure chest that releases a steady stream of bubbles. The treasure itself appears to be mostly air. Also: Completely Adjustable and Customizable!",
    "categories": [
      "bubbler"
    ],
    "behavior": "bubbler",
    "tags": [
      "bubbler",
      "treasure",
      "hardscape",
      "bubble-emitter"
    ]
  },
  "broken-pot-fragment__cave__theme-artificial__front.png": {
    "name": "Broken Pot Fragment",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A broken pot fragment decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "artificial",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "artificial",
      "hardscape",
      "shelter"
    ]
  },
  "broken-terracotta-pot__cave__theme-artificial__front.png": {
    "name": "Broken Terracotta Pot",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A broken terracotta pot decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "artificial",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "artificial",
      "hardscape",
      "shelter"
    ]
  },
  "ceramic-tube-cluster__cave__theme-artificial__front.png": {
    "name": "Ceramic Tube Cluster",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A ceramic tube cluster decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "artificial",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "artificial",
      "hardscape",
      "shelter"
    ]
  },
  "clay-multi__cave__theme-artificial__front.png": {
    "name": "Clay Multi",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A clay multi decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "artificial",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "artificial",
      "hardscape",
      "shelter"
    ]
  },
  "extra-narrow-pleco-tubes__cave__theme-artificial__front.png": {
    "name": "Extra Narrow Pleco Tubes",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A extra narrow pleco tubes decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "artificial",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "artificial",
      "hardscape",
      "shelter"
    ]
  },
  "pvc-pipe__cave__theme-artificial__front.png": {
    "name": "PVC Pipe",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A pvc pipe decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "artificial",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "artificial",
      "hardscape",
      "shelter"
    ]
  },
  "terracotta-pot__cave__theme-artificial__front.png": {
    "name": "Terracotta Pot",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A terracotta pot decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "artificial",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "artificial",
      "hardscape",
      "shelter"
    ]
  },
  "terracotta-tunnel__cave__theme-artificial__front.png": {
    "name": "Terracotta Tunnel",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A terracotta tunnel decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "artificial",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "artificial",
      "hardscape",
      "shelter"
    ]
  },
  "blue-castle__cave__theme-fantasy__front.png": {
    "name": "Castle Cave 1",
    "cost": 16,
    "width": 595,
    "defaultScale": 1,
    "caveSettings": {
      "entryCount": 3,
      "entries": [
        {
          "id": "left-front",
          "x": 0.24,
          "y": 0.82,
          "side": "front"
        },
        {
          "id": "center-front",
          "x": 0.44,
          "y": 0.65,
          "side": "front"
        },
        {
          "id": "right-front",
          "x": 0.62,
          "y": 0.84,
          "side": "front"
        }
      ],
      "seatCount": 3,
      "seats": [
        {
          "id": "left-seat",
          "x": 0.24,
          "y": 0.82
        },
        {
          "id": "center-seat",
          "x": 0.44,
          "y": 0.65
        },
        {
          "id": "right-seat",
          "x": 0.62,
          "y": 0.84
        }
      ]
    },
    "theme": "fantasy",
    "description": "A tiny underwater castle that gives the tank a touch of fantasy and its residents somewhere suitably dramatic to hide.",
    "categories": [
      "cave"
    ],
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "fantasy",
      "hardscape",
      "shelter"
    ]
  },
  "wizard-castle__cave__theme-fantasy__front.png": {
    "name": "Castle Cave 2",
    "cost": 16,
    "width": 600,
    "defaultScale": 1,
    "caveSettings": {
      "entryCount": 3,
      "entries": [
        {
          "id": "main-both",
          "x": 0.49,
          "y": 0.69,
          "side": "both"
        },
        {
          "id": "right-front",
          "x": 0.76,
          "y": 0.84,
          "side": "front"
        },
        {
          "id": "far-right-front",
          "x": 0.92,
          "y": 0.89,
          "side": "front"
        }
      ],
      "seatCount": 3,
      "seats": [
        {
          "id": "main-upper",
          "x": 0.5,
          "y": 0.74,
          "facing": "right"
        },
        {
          "id": "right-seat",
          "x": 0.76,
          "y": 0.84,
          "facing": "left"
        },
        {
          "id": "main-lower",
          "x": 0.51,
          "y": 0.78,
          "facing": "left"
        }
      ]
    },
    "caveBehavior": {
      "portals": [
        {
          "id": "main_front",
          "approachX": 0.49,
          "approachY": 0.76,
          "mouthX": 0.5,
          "mouthY": 0.67,
          "outsideLayer": 2,
          "insideLayer": 4,
          "path": [
            {
              "x": 0.5,
              "y": 0.6
            },
            {
              "x": 0.49,
              "y": 0.55
            }
          ]
        },
        {
          "id": "side_layer4",
          "approachX": 0.74,
          "approachY": 0.62,
          "mouthX": 0.69,
          "mouthY": 0.6,
          "outsideLayer": 4,
          "insideLayer": 4,
          "path": [
            {
              "x": 0.63,
              "y": 0.57
            },
            {
              "x": 0.56,
              "y": 0.54
            }
          ]
        }
      ],
      "insideSlots": [
        {
          "id": "main_chamber",
          "x": 0.52,
          "y": 0.52,
          "layer": 4,
          "portalIds": [
            "main_front",
            "side_layer4"
          ]
        }
      ]
    },
    "theme": "fantasy",
    "description": "A miniature castle with enough openings and shelter to double as a proper fish hideout. Royal residency not guaranteed.",
    "categories": [
      "cave"
    ],
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "fantasy",
      "hardscape",
      "shelter"
    ]
  },
  "frozen-cave__cave__theme-frozen__front.png": {
    "name": "Frozen Cave",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A frozen cave decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "frozen",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "frozen",
      "hardscape",
      "shelter"
    ]
  },
  "frozen-cave__cave__theme-frozen__v2__front.png": {
    "name": "Frozen Cave 2",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A frozen cave 2 decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "frozen",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "frozen",
      "hardscape",
      "shelter"
    ]
  },
  "halloween-crypt__cave__theme-halloween__front.png": {
    "name": "Crypt Cave",
    "width": 590,
    "defaultScale": 1,
    "categories": [
      "cave"
    ],
    "theme": "halloween",
    "description": "A miniature stone crypt with enough room inside for fish that prefer their hiding places a little more gothic.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "halloween",
      "hardscape",
      "shelter",
      "spooky"
    ]
  },
  "halloween-haunted-house__cave__theme-halloween__front.png": {
    "name": "Haunted House Cave",
    "width": 590,
    "defaultScale": 1,
    "caveSettings": {
      "entryCount": 3,
      "entries": [
        {
          "id": "left-cellar",
          "x": 0.18,
          "y": 0.86,
          "side": "front"
        },
        {
          "id": "front-door",
          "x": 0.5,
          "y": 0.69,
          "side": "front"
        },
        {
          "id": "right-cellar",
          "x": 0.84,
          "y": 0.86,
          "side": "front"
        }
      ],
      "seatCount": 3,
      "seats": [
        {
          "id": "left-cellar-seat",
          "x": 0.18,
          "y": 0.84,
          "facing": "right",
          "entryIds": [
            "left-cellar"
          ]
        },
        {
          "id": "front-door-seat",
          "x": 0.5,
          "y": 0.67,
          "facing": "right",
          "entryIds": [
            "front-door"
          ]
        },
        {
          "id": "right-cellar-seat",
          "x": 0.84,
          "y": 0.84,
          "facing": "left",
          "entryIds": [
            "right-cellar"
          ]
        }
      ]
    },
    "categories": [
      "cave"
    ],
    "theme": "halloween",
    "description": "A miniature haunted house with enough room inside for brave fish, scared fish, or fish that simply want somewhere dark to sit.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "halloween",
      "hardscape",
      "shelter",
      "spooky"
    ]
  },
  "coconut-shell-hideaway__cave__theme-natural__front.png": {
    "name": "Coconut Shell Hideaway",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A coconut shell hideaway decoration for the aquarium.",
    "categories": [
      "cave"
    ],
    "theme": "natural",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "natural",
      "hardscape",
      "shelter"
    ]
  },
  "hollow-mossy-driftwood__cave-wood__theme-natural__front.png": {
    "name": "Hollow Mossy Driftwood",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A hollow mossy driftwood decoration for the aquarium.",
    "categories": [
      "cave",
      "wood"
    ],
    "theme": "natural",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "wood",
      "natural",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "live-root-overhang__cave-wood__theme-natural__front.png": {
    "name": "Live Root Overhang",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A live root overhang decoration for the aquarium.",
    "categories": [
      "cave",
      "wood"
    ],
    "theme": "natural",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "wood",
      "natural",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "mangrove-roots__cave-wood__theme-natural__front.png": {
    "name": "Mangrove Roots",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A mangrove roots decoration for the aquarium.",
    "categories": [
      "cave",
      "wood"
    ],
    "theme": "natural",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "wood",
      "natural",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "slate__cave-rock__theme-natural__front.png": {
    "name": "Slate Cave",
    "cost": 12,
    "width": 620,
    "defaultScale": 1,
    "caveSettings": {
      "entryCount": 1,
      "entries": [
        {
          "id": "main-front",
          "x": 0.51,
          "y": 0.67,
          "side": "front"
        }
      ],
      "seatCount": 2,
      "seats": [
        {
          "id": "left-seat",
          "x": 0.42,
          "y": 0.64,
          "facing": "right"
        },
        {
          "id": "right-seat",
          "x": 0.6,
          "y": 0.64,
          "facing": "left"
        }
      ]
    },
    "caveBehavior": {
      "portals": [
        {
          "id": "main_front",
          "approachX": 0.5,
          "approachY": 0.77,
          "mouthX": 0.5,
          "mouthY": 0.67,
          "outsideLayer": 2,
          "insideLayer": 4,
          "path": [
            {
              "x": 0.5,
              "y": 0.61
            },
            {
              "x": 0.5,
              "y": 0.56
            }
          ]
        }
      ],
      "insideSlots": [
        {
          "id": "center",
          "x": 0.5,
          "y": 0.53,
          "layer": 4,
          "portalIds": [
            "main_front"
          ]
        }
      ]
    },
    "theme": "natural",
    "description": "A sturdy little shelter built from stacked slate. Simple, rocky, and perfect for fish that appreciate some privacy.",
    "categories": [
      "cave",
      "rock"
    ],
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "rock",
      "natural",
      "hardscape",
      "shelter"
    ]
  },
  "slate-stack__cave-rock__theme-natural__front.png": {
    "name": "Slate Stack",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A slate stack decoration for the aquarium.",
    "categories": [
      "cave",
      "rock"
    ],
    "theme": "natural",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "rock",
      "natural",
      "hardscape",
      "shelter"
    ]
  },
  "tangled-driftwood-rootscape__cave-wood__theme-natural__front.png": {
    "name": "Tangled Driftwood Rootscape",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A tangled driftwood rootscape decoration for the aquarium.",
    "categories": [
      "cave",
      "wood"
    ],
    "theme": "natural",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "wood",
      "natural",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-1__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 1",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A rocky coral shelf with a sheltered space underneath. Part reef decoration, part cozy hiding place.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-10__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 10",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A substantial coral shelf with a protected hollow below, giving the tank a more layered reef landscape.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-2__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 2",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A layered coral shelf that creates a shaded little retreat beneath the reef.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-3__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 3",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A sturdy coral-covered shelf with enough room underneath for curious fish to disappear for a while.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-4__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 4",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A reef shelf with a natural hollow beneath it, adding both height and a tucked-away hiding spot.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-5__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 5",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A rugged coral shelf that gives the tank a bit of reef structure and a quiet space underneath.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-6__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 6",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A raised coral formation with a sheltered opening below, perfect for breaking up an open aquarium floor.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-7__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 7",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A broad reef shelf with a built-in hiding place beneath it. Basically beachfront property for fish.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coral-shelf-9__cave-coral__theme-reef__front.png": {
    "name": "Coral Shelf Cave 9",
    "cost": 16,
    "width": 520,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A rocky coral overhang that adds depth to the reef and a shady little spot underneath.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "coralline-live-rock__cave-rock-coral__theme-reef__front.png": {
    "name": "Coralline Live Rock",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A coralline live rock decoration for the aquarium.",
    "categories": [
      "cave",
      "rock",
      "coral"
    ],
    "theme": "reef",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "rock",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "live-rock-cluster__cave-rock__theme-reef__front.png": {
    "name": "Live Rock Cluster",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A live rock cluster decoration for the aquarium.",
    "categories": [
      "cave",
      "rock"
    ],
    "theme": "reef",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "rock",
      "reef",
      "hardscape",
      "shelter"
    ]
  },
  "sea-anemone-1__cave-coral__theme-reef__front.png": {
    "name": "Sea Anemone Cave 1",
    "cost": 14,
    "width": 420,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A cozy sea anemone. Cozy, colorful, and slightly wiggly.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable",
      "anemone",
      "clownfish-host"
    ],
    "motionBehavior": "anchored_sway",
    "motionLayer": "front",
    "motionSplitY": 0.55,
    "motionSwaySide": "above"
  },
  "sea-anemone-3__cave-coral__theme-reef__front.png": {
    "name": "Sea Anemone Cave 3",
    "cost": 14,
    "width": 420,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A cozy sea anemone. Cozy, colorful, and slightly wiggly.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable",
      "anemone",
      "clownfish-host"
    ],
    "motionBehavior": "anchored_sway",
    "motionLayer": "front",
    "motionSplitY": 0.55,
    "motionSwaySide": "above"
  },
  "sea-anemone-4__cave-coral__theme-reef__front.png": {
    "name": "Sea Anemone Cave 4",
    "cost": 14,
    "width": 420,
    "defaultScale": 1,
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "description": "A cozy sea anemone. Cozy, colorful, and slightly wiggly.",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable",
      "anemone",
      "clownfish-host"
    ],
    "motionBehavior": "anchored_sway",
    "motionLayer": "front",
    "motionSplitY": 0.55,
    "motionSwaySide": "above"
  },
  "seashell-cluster__cave-coral__theme-reef__front.png": {
    "name": "Seashell Cluster",
    "cost": 8,
    "width": 420,
    "defaultScale": 1,
    "description": "A seashell cluster decoration for the aquarium.",
    "categories": [
      "cave",
      "coral"
    ],
    "theme": "reef",
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "coral",
      "reef",
      "hardscape",
      "shelter",
      "perchable"
    ]
  },
  "meteor__cave-rock__theme-space__front.png": {
    "name": "Meteor Cave",
    "cost": 16,
    "width": 585,
    "defaultScale": 1,
    "caveSettings": {
      "entryCount": 1,
      "entries": [
        {
          "id": "main-front",
          "x": 0.56,
          "y": 0.67,
          "side": "front"
        }
      ],
      "seatCount": 2,
      "seats": [
        {
          "id": "upper-seat",
          "x": 0.5,
          "y": 0.55,
          "facing": "right"
        },
        {
          "id": "lower-seat",
          "x": 0.49,
          "y": 0.72,
          "facing": "right"
        }
      ]
    },
    "theme": "space",
    "description": "A strange rocky formation that looks suspiciously like it fell from somewhere much farther away. Conveniently, it also has a cave.",
    "categories": [
      "cave",
      "rock"
    ],
    "behavior": "cave_layered",
    "tags": [
      "cave",
      "rock",
      "space",
      "hardscape",
      "shelter"
    ]
  },
  "fishing-lure__lure__theme-artificial.png": {
    "name": "Fishing Lure",
    "cost": 6,
    "width": 255,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "lure",
      "occupancyLimit": 1
    },
    "theme": "artificial",
    "variantGroup": "fishing_lure",
    "description": "A bright fishing lure placed inside an aquarium for reasons nobody has fully explained. Fortunately, the fish seem more curious than concerned.",
    "categories": [
      "lure"
    ],
    "behavior": "ceiling_sway",
    "tags": [
      "lure",
      "artificial",
      "sway"
    ]
  },
  "fishing-lure__lure__theme-artificial__v2.png": {
    "name": "Fishing Lure",
    "cost": 6,
    "width": 255,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "lure",
      "occupancyLimit": 1
    },
    "theme": "artificial",
    "variantGroup": "fishing_lure",
    "description": "A colorful fishing lure dangling where no fishing should be happening. The fish seem fascinated by it, which is probably exactly what the lure wants.",
    "categories": [
      "lure"
    ],
    "behavior": "ceiling_sway",
    "tags": [
      "lure",
      "artificial",
      "sway"
    ]
  },
  "fishing-lure__lure__theme-artificial__v3.png": {
    "name": "Fishing Lure",
    "cost": 6,
    "width": 255,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "lure",
      "occupancyLimit": 1
    },
    "theme": "artificial",
    "variantGroup": "fishing_lure",
    "description": "A shiny little lure suspended in the aquarium. Completely harmless here, although the fish may have some understandable trust issues.",
    "categories": [
      "lure"
    ],
    "behavior": "ceiling_sway",
    "tags": [
      "lure",
      "artificial",
      "sway"
    ]
  },
  "fishing-lure__lure__theme-artificial__v4.png": {
    "name": "Fishing Lure",
    "cost": 6,
    "width": 255,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "lure",
      "occupancyLimit": 1
    },
    "theme": "artificial",
    "variantGroup": "fishing_lure",
    "description": "A fishing lure repurposed as aquarium decor. It catches attention instead of fish now.",
    "categories": [
      "lure"
    ],
    "behavior": "ceiling_sway",
    "tags": [
      "lure",
      "artificial",
      "sway"
    ]
  },
  "fishing-lure__lure__theme-artificial__v5.png": {
    "name": "Fishing Lure",
    "cost": 6,
    "width": 255,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "lure",
      "occupancyLimit": 1
    },
    "theme": "artificial",
    "variantGroup": "fishing_lure",
    "description": "A suspiciously enticing lure left hanging in the tank. No hook-related incidents have been reported.",
    "categories": [
      "lure"
    ],
    "behavior": "ceiling_sway",
    "tags": [
      "lure",
      "artificial",
      "sway"
    ]
  },
  "fishing-lure__lure__theme-artificial__v6.png": {
    "name": "Fishing Lure",
    "cost": 6,
    "width": 255,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "lure",
      "occupancyLimit": 1
    },
    "theme": "artificial",
    "variantGroup": "fishing_lure",
    "description": "A bright piece of fishing tackle that gives curious fish something unusual to investigate. Thankfully, nobody is actually fishing.",
    "categories": [
      "lure"
    ],
    "behavior": "ceiling_sway",
    "tags": [
      "lure",
      "artificial",
      "sway"
    ]
  },
  "fishing-lure__lure__theme-artificial__v7.png": {
    "name": "Fishing Lure",
    "cost": 6,
    "width": 255,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "lure",
      "occupancyLimit": 1
    },
    "theme": "artificial",
    "variantGroup": "fishing_lure",
    "description": "A decorative lure that sparkles just enough to get every nearby fish interested in absolutely nothing.",
    "categories": [
      "lure"
    ],
    "behavior": "ceiling_sway",
    "tags": [
      "lure",
      "artificial",
      "sway"
    ]
  },
  "halloween-gorebag__lure__theme-halloween.png": {
    "name": "Gorebag",
    "cost": 10,
    "width": 200,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "lure",
      "occupancyLimit": 1
    },
    "theme": "halloween",
    "description": "A peculiar decoration known only as Gorebag. Nobody remembers where it came from, and asking questions has not helped.",
    "categories": [
      "lure"
    ],
    "behavior": "ceiling_sway",
    "tags": [
      "lure",
      "halloween",
      "sway",
      "spooky"
    ]
  },
  "frozen-glacier__rock__theme-frozen.png": {
    "name": "Frozen Glacier",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A frozen glacier decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "frozen",
    "behavior": "floating_bob",
    "tags": [
      "rock",
      "frozen",
      "hardscape",
      "surface-cover"
    ]
  },
  "frozen-iceberg__rock__theme-frozen.png": {
    "name": "Frozen Iceberg",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A frozen iceberg decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "frozen",
    "behavior": "floating_bob",
    "tags": [
      "rock",
      "frozen",
      "hardscape",
      "surface-cover"
    ]
  },
  "halloween-webs__ornament__theme-halloween.png": {
    "name": "Aquarium Webs",
    "width": 175,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "theme": "halloween",
    "description": "A little spider web to put wherever. How the web remains perfectly intact underwater is a problem for someone else to solve.",
    "behavior": "floating_bob",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "surface-cover",
      "spooky"
    ]
  },
  "halloween-skeleton__ornament__theme-halloween.png": {
    "name": "Floating Fish Skeleton",
    "width": 220,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "theme": "halloween",
    "description": "A fish skeleton that quietly floats in the aquarium. It probably fake, though. Right?",
    "behavior": "floating_bob",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "surface-cover",
      "spooky"
    ]
  },
  "halloween-ghost__ornament__theme-halloween.png": {
    "name": "Floating Ghost",
    "width": 170,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "fishBehavior": {
      "hangout": [
        "spooky"
      ],
      "occupancyLimit": 1
    },
    "theme": "halloween",
    "description": "A little ghost that quietly floats in the aquarium.",
    "behavior": "floating_bob",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "surface-cover",
      "spooky"
    ]
  },
  "halloween-floating-seaweed__plant__theme-halloween.png": {
    "name": "Haunted Floating Seaweed",
    "width": 525,
    "defaultScale": 1,
    "categories": [
      "plant"
    ],
    "theme": "halloween",
    "description": "Eerie floating seaweed. It looks like it is rotting.",
    "behavior": "floating_sway",
    "tags": [
      "plant",
      "halloween",
      "grazable",
      "perchable",
      "surface-cover",
      "sway",
      "spooky"
    ]
  },
  "floating-lettuce-root__plant__theme-natural.png": {
    "name": "Floating Lettuce Root",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A floating lettuce root decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "natural",
    "behavior": "floating_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "surface-cover",
      "sway"
    ]
  },
  "floating-swamp-moss__plant__theme-natural.png": {
    "name": "Floating Swamp Moss",
    "theme": "natural",
    "cost": 5,
    "width": 510,
    "defaultScale": 1,
    "description": "A loose patch of eerie swamp moss suspended in the water. Damp, gloomy, and somehow thriving.",
    "categories": [
      "plant"
    ],
    "behavior": "floating_sway",
    "tags": [
      "plant",
      "natural",
      "grazable",
      "perchable",
      "surface-cover",
      "sway"
    ]
  },
  "floating-seaweed__plant__theme-reef.png": {
    "name": "Floating Seaweed",
    "cost": 4,
    "width": 220,
    "defaultScale": 1,
    "theme": "reef",
    "description": "Loose seaweed that drifts above the aquarium floor instead of staying politely planted where it belongs.",
    "categories": [
      "plant"
    ],
    "behavior": "floating_sway",
    "tags": [
      "plant",
      "reef",
      "grazable",
      "perchable",
      "surface-cover",
      "sway"
    ]
  },
  "frozen-anchor__ornament__theme-frozen.png": {
    "name": "Frozen Anchor",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen anchor decoration for the aquarium.",
    "categories": [
      "ornament"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-arch__ornament__theme-frozen.png": {
    "name": "Frozen Arch",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen arch decoration for the aquarium.",
    "categories": [
      "ornament"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-arch__ornament__theme-frozen__v2.png": {
    "name": "Frozen Arch 2",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen arch 2 decoration for the aquarium.",
    "categories": [
      "ornament"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-column__ornament__theme-frozen.png": {
    "name": "Frozen Column",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen column decoration for the aquarium.",
    "categories": [
      "ornament"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-column__ornament__theme-frozen__v2.png": {
    "name": "Frozen Column 2",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen column 2 decoration for the aquarium.",
    "categories": [
      "ornament"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-column__ornament__theme-frozen__v3.png": {
    "name": "Frozen Column 3",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen column 3 decoration for the aquarium.",
    "categories": [
      "ornament"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-crystals__rock__theme-frozen.png": {
    "name": "Frozen Crystals",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A frozen crystals decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "rock",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-fossil__rock__theme-frozen.png": {
    "name": "Frozen Fossil",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A frozen fossil decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "rock",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-plant__plant__theme-frozen.png": {
    "name": "Frozen Plant",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A frozen plant decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "plant",
      "frozen",
      "grazable",
      "perchable"
    ]
  },
  "frozen-plant__plant__theme-frozen__v2.png": {
    "name": "Frozen Plant 2",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A frozen plant 2 decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "plant",
      "frozen",
      "grazable",
      "perchable"
    ]
  },
  "frozen-plant__plant__theme-frozen__v3.png": {
    "name": "Frozen Plant 3",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A frozen plant 3 decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "plant",
      "frozen",
      "grazable",
      "perchable"
    ]
  },
  "frozen-plant__plant__theme-frozen__v4.png": {
    "name": "Frozen Plant 4",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A frozen plant 4 decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "plant",
      "frozen",
      "grazable",
      "perchable"
    ]
  },
  "frozen-plant__plant__theme-frozen__v5.png": {
    "name": "Frozen Plant 5",
    "cost": 8,
    "width": 280,
    "defaultScale": 1,
    "description": "A frozen plant 5 decoration for the aquarium.",
    "categories": [
      "plant"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "plant",
      "frozen",
      "grazable",
      "perchable"
    ]
  },
  "frozen-rock__rock__theme-frozen.png": {
    "name": "Frozen Rock",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A frozen rock decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "rock",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-rock__rock__theme-frozen__v2.png": {
    "name": "Frozen Rock 2",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A frozen rock 2 decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "rock",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-root__wood__theme-frozen.png": {
    "name": "Frozen Root",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen root decoration for the aquarium.",
    "categories": [
      "wood"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "wood",
      "frozen",
      "hardscape",
      "perchable"
    ]
  },
  "frozen-treasure__ornament__theme-frozen.png": {
    "name": "Frozen Treasure",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen treasure decoration for the aquarium.",
    "categories": [
      "ornament"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-ufo__ornament__theme-frozen.png": {
    "name": "Frozen UFO",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A frozen ufo decoration for the aquarium.",
    "categories": [
      "ornament"
    ],
    "theme": "frozen",
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-sunken-submarine__ornament__theme-frozen.png": {
    "name": "Plane Crash",
    "cost": 12,
    "width": 613,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "hide"
    },
    "theme": "frozen",
    "description": "A miniature aircraft wreck resting on the aquarium floor. The investigation remains ongoing.",
    "categories": [
      "ornament"
    ],
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "frozen-ship__ornament__theme-frozen.png": {
    "name": "Shipwreck",
    "cost": 15,
    "width": 616,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "hide"
    },
    "theme": "frozen",
    "description": "A sunken ship left to slowly become part of the aquarium. Dramatic enough to tell a story without taking the whole tank hostage.",
    "categories": [
      "ornament"
    ],
    "behavior": "static",
    "tags": [
      "ornament",
      "frozen",
      "hardscape"
    ]
  },
  "halloween-spider__ornament__theme-halloween.png": {
    "name": "Aquarium Spider",
    "width": 150,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "fishBehavior": {
      "hangout": [
        "spooky"
      ],
      "occupancyLimit": 1
    },
    "theme": "halloween",
    "description": "A spider. In the aquarium. We agree that this raises several questions, but none of them have improved the situation.",
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-fish-head-effigy__ornament__theme-halloween__v3.png": {
    "name": "Danio Fish Head Effigy",
    "cost": 3,
    "width": 70,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "spooky",
      "occupancyLimit": 1
    },
    "theme": "halloween",
    "description": "A Danio fish-head effigy. Pretty ominous and completely unnecessary.",
    "categories": [
      "ornament"
    ],
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-ghost-ship__ornament__theme-halloween.png": {
    "name": "Ghost Ship",
    "width": 600,
    "defaultScale": 1.5,
    "categories": [
      "ornament"
    ],
    "fishBehavior": {
      "hangout": [
        "hardscape",
        "spooky"
      ]
    },
    "theme": "halloween",
    "description": "A spectral shipwreck that appears to have sailed directly into the aquarium. Its crew has yet to make themselves available for questions.",
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-gravestone__ornament__theme-halloween.png": {
    "name": "Gravestone 1",
    "width": 288,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "theme": "halloween",
    "description": "A tiny weathered gravestone for giving the aquarium floor a proper little graveyard atmosphere.",
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-gravestone__ornament__theme-halloween__v2.png": {
    "name": "Gravestone 2",
    "width": 288,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "theme": "halloween",
    "description": "A miniature gravestone that adds just the right amount of unnecessary morbidity to the tank.",
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-gravestone__ornament__theme-halloween__v3.png": {
    "name": "Gravestone 3",
    "width": 288,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "theme": "halloween",
    "description": "A worn little grave marker that looks perfectly at home among caves, dead plants, and other questionable aquarium decisions.",
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-gravestone__ornament__theme-halloween__v4.png": {
    "name": "Gravestone 4",
    "width": 288,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "theme": "halloween",
    "description": "A small gravestone for building an underwater cemetery. Nobody is quite sure who is buried there.",
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-gravestone__ornament__theme-halloween__v5.png": {
    "name": "Gravestone 5",
    "width": 288,
    "defaultScale": 1,
    "categories": [
      "ornament"
    ],
    "theme": "halloween",
    "description": "A lonely little grave marker with just enough weathering to suggest it has been underwater much longer than it should have been.",
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-fish-head-effigy__ornament__theme-halloween__v2.png": {
    "name": "Guppy Fish Head Effigy",
    "cost": 3,
    "width": 70,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "spooky",
      "occupancyLimit": 1
    },
    "theme": "halloween",
    "description": "A guppy head mounted on a stake.",
    "categories": [
      "ornament"
    ],
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-haunted-tree__ornament__theme-halloween.png": {
    "name": "Haunted Tree",
    "width": 300,
    "defaultScale": 2,
    "categories": [
      "ornament"
    ],
    "fishBehavior": {
      "hangout": [
        "spooky",
        "hardscape"
      ]
    },
    "theme": "halloween",
    "description": "A twisted old tree that looks thoroughly dead.",
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "halloween-fish-head-effigy__ornament__theme-halloween.png": {
    "name": "Neon Fish Head Effigy",
    "cost": 3,
    "width": 70,
    "defaultScale": 1,
    "fishBehavior": {
      "hangout": "spooky",
      "occupancyLimit": 1
    },
    "theme": "halloween",
    "description": "A bloody fish-head effigy. Tasteful is probably not the word, but memorable definitely is.",
    "categories": [
      "ornament"
    ],
    "behavior": "static",
    "tags": [
      "ornament",
      "halloween",
      "hardscape",
      "spooky"
    ]
  },
  "alder-cone-cluster__botanical__theme-natural.png": {
    "name": "Alder Cone Cluster",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A alder cone cluster decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "autumn-leaf-litter-mound__botanical__theme-natural.png": {
    "name": "Autumn Leaf Litter Mound",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A autumn leaf litter mound decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "branch-canopy__wood__theme-natural.png": {
    "name": "Branch Canopy",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A branch canopy decoration for the aquarium.",
    "categories": [
      "wood"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "wood",
      "natural",
      "hardscape",
      "perchable"
    ]
  },
  "dirt__rock__theme-natural.png": {
    "name": "Dirt Mound",
    "cost": 3,
    "width": 480,
    "defaultScale": 1,
    "categories": [
      "rock"
    ],
    "theme": "natural",
    "description": "A small mound of loose earth for giving the aquarium floor a more uneven, natural look. Sometimes dirt really is the decoration.",
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "dried-catappa-leaf-pile__botanical__theme-natural.png": {
    "name": "Dried Catappa Leaf Pile",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A dried catappa leaf pile decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "driftwood__wood__theme-natural.png": {
    "name": "Driftwood",
    "cost": 10,
    "width": 675,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A weathered piece of driftwood with plenty of natural bends and texture. Simple, classic, and nearly impossible to make look out of place.",
    "categories": [
      "wood"
    ],
    "behavior": "static",
    "tags": [
      "wood",
      "natural",
      "hardscape",
      "perchable"
    ]
  },
  "driftwood-root__wood__theme-natural.png": {
    "name": "Driftwood Root",
    "cost": 10,
    "width": 660,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A gnarled mass of weathered roots that adds natural shape and texture to the aquarium floor.",
    "categories": [
      "wood"
    ],
    "behavior": "static",
    "tags": [
      "wood",
      "natural",
      "hardscape",
      "perchable"
    ]
  },
  "flat-spawning-stone__rock__theme-natural.png": {
    "name": "Flat Spawning Stone",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A flat spawning stone decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "mixed-leaf-litter-scatter__botanical__theme-natural.png": {
    "name": "Mixed Leaf Litter Scatter",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A mixed leaf litter scatter decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "moss-bridge__wood-plant__theme-natural.png": {
    "name": "Moss Bridge",
    "cost": 10,
    "width": 698,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A small bridge softened by a layer of moss. Equal parts peaceful garden feature and tiny fish infrastructure.",
    "categories": [
      "wood",
      "plant"
    ],
    "behavior": "static",
    "tags": [
      "wood",
      "plant",
      "natural",
      "hardscape",
      "grazable",
      "perchable"
    ]
  },
  "moss-covered-driftwood__wood-plant__theme-natural.png": {
    "name": "Moss Covered Driftwood",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A moss covered driftwood decoration for the aquarium.",
    "categories": [
      "wood",
      "plant"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "wood",
      "plant",
      "natural",
      "hardscape",
      "grazable",
      "perchable"
    ]
  },
  "moss-covered-rock-formation__rock-plant__theme-natural.png": {
    "name": "Moss Covered Rock Formation",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A moss covered rock formation decoration for the aquarium.",
    "categories": [
      "rock",
      "plant"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "rock",
      "plant",
      "natural",
      "hardscape",
      "grazable",
      "perchable"
    ]
  },
  "river-stone-mound__rock__theme-natural.png": {
    "name": "River Stone Mound",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A river stone mound decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "rock-bricks__rock__theme-natural.png": {
    "name": "Rock 1",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A rock. A perfectly respectable rock, in fact. Useful for filling gaps, building little landscapes, or simply adding more rock.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "rock-bricks__rock__theme-natural__v2.png": {
    "name": "Rock 2",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A simple aquarium rock for adding natural texture wherever the tank needs a little more structure.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "rock-bricks__rock__theme-natural__v3.png": {
    "name": "Rock 3",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A sturdy decorative rock that fits comfortably into just about any aquarium layout.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "rock-bricks__rock__theme-natural__v4.png": {
    "name": "Rock 4",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A natural-looking stone for breaking up open spaces and giving the aquarium floor a little more shape.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "rock-bricks__rock__theme-natural__v5.png": {
    "name": "Rock 5",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A straightforward piece of rock decor. No gimmicks, no bubbles, just dependable geology.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "root-debris-scatter__wood__theme-natural.png": {
    "name": "Root Debris Scatter",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A root debris scatter decoration for the aquarium.",
    "categories": [
      "wood"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "wood",
      "natural",
      "hardscape",
      "perchable"
    ]
  },
  "seed-pod-cluster__botanical__theme-natural.png": {
    "name": "Seed Pod Cluster",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A seed pod cluster decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "single-catappa-leaf__botanical__theme-natural.png": {
    "name": "Single Catappa Leaf",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A single catappa leaf decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "single-loose-leaf__botanical__theme-natural.png": {
    "name": "Single Loose Leaf",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A single loose leaf decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "single-twig__botanical__theme-natural.png": {
    "name": "Single Twig",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A single twig decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "small-botanical-scatter-pieces__botanical__theme-natural.png": {
    "name": "Small Botanical Scatter Pieces",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A small botanical scatter pieces decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "small-branch-pile__wood__theme-natural.png": {
    "name": "Small Branch Pile",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A small branch pile decoration for the aquarium.",
    "categories": [
      "wood"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "wood",
      "natural",
      "hardscape",
      "perchable"
    ]
  },
  "small-stone-shard-cluster__rock__theme-natural.png": {
    "name": "Small Stone Shard Cluster",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A small stone shard cluster decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "small-wood-branch-cluster__wood__theme-natural.png": {
    "name": "Small Wood Branch Cluster",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A small wood branch cluster decoration for the aquarium.",
    "categories": [
      "wood"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "wood",
      "natural",
      "hardscape",
      "perchable"
    ]
  },
  "sprawling-spider-wood-rootscape__wood__theme-natural.png": {
    "name": "Sprawling Spider Wood Rootscape",
    "cost": 8,
    "width": 320,
    "defaultScale": 1,
    "description": "A sprawling spider wood rootscape decoration for the aquarium.",
    "categories": [
      "wood"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "wood",
      "natural",
      "hardscape",
      "perchable"
    ]
  },
  "stone-pebble-cluster__rock__theme-natural.png": {
    "name": "Stone Pebble Cluster",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A stone pebble cluster decoration for the aquarium.",
    "categories": [
      "rock"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape"
    ]
  },
  "twig-and-pod-mix__botanical__theme-natural.png": {
    "name": "Twig And Pod Mix",
    "cost": 8,
    "width": 220,
    "defaultScale": 1,
    "description": "A twig and pod mix decoration for the aquarium.",
    "categories": [
      "botanical"
    ],
    "theme": "natural",
    "behavior": "static",
    "tags": [
      "botanical",
      "natural"
    ]
  },
  "volcanic-rock-bricks__rock__theme-natural.png": {
    "name": "Volcanic Rock 1",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A dark, rugged piece of volcanic rock with plenty of rough texture and character.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape",
      "volcanic",
      "sharp"
    ]
  },
  "volcanic-rock-bricks__rock__theme-natural__v2.png": {
    "name": "Volcanic Rock 2",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A porous-looking volcanic stone that adds a harsher, more dramatic edge to the aquarium floor.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape",
      "volcanic",
      "sharp"
    ]
  },
  "volcanic-rock-bricks__rock__theme-natural__v3.png": {
    "name": "Volcanic Rock 3",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A chunk of dark volcanic rock for building rocky formations, caves, or anything that needs a little ancient lava energy.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape",
      "volcanic",
      "sharp"
    ]
  },
  "volcanic-rock-bricks__rock__theme-natural__v4.png": {
    "name": "Volcanic Rock 4",
    "cost": 1,
    "width": 100,
    "defaultScale": 1,
    "theme": "natural",
    "description": "A rough volcanic stone with a naturally dramatic look. Thankfully, the volcano part is no longer active.",
    "categories": [
      "rock"
    ],
    "behavior": "static",
    "tags": [
      "rock",
      "natural",
      "hardscape",
      "volcanic",
      "sharp"
    ]
  },
  "barnacle-covered-reef-rock__rock-coral__theme-reef.png": {
    "name": "Barnacle Covered Reef Rock",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A barnacle covered reef rock decoration for the aquarium.",
    "categories": [
      "rock",
      "coral"
    ],
    "theme": "reef",
    "behavior": "static",
    "tags": [
      "rock",
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "brain-coral__coral__theme-reef.png": {
    "name": "Brain Coral",
    "cost": 12,
    "width": 300,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A dense coral covered in winding, maze-like ridges. Compact, colorful, and just strange enough to earn its name.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef.png": {
    "name": "Branch Coral 1",
    "cost": 10,
    "width": 280,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A branching coral formation that adds height, color, and a little reef complexity to the tank.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v10.png": {
    "name": "Branch Coral 10",
    "cost": 10,
    "width": 280,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A natural-looking coral cluster with branching growth, perfect for rounding out a larger reef display.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v2.png": {
    "name": "Branch Coral 2",
    "cost": 10,
    "width": 240,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A lively cluster of branching coral that helps fill open spaces with natural reef texture.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v3.png": {
    "name": "Branch Coral 3",
    "cost": 10,
    "width": 280,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A decorative branching coral with plenty of little arms reaching into the water around it.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v4.png": {
    "name": "Branch Coral 4",
    "cost": 10,
    "width": 260,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A colorful coral formation that brings a bit of reef structure and vertical interest to the aquarium.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v5.png": {
    "name": "Branch Coral 5",
    "cost": 10,
    "width": 280,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A branching coral cluster made for building out colorful reef scenes without overwhelming the tank.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v6.png": {
    "name": "Branch Coral 6",
    "cost": 10,
    "width": 280,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A compact branching coral that adds texture and depth wherever the tank is looking a little too empty.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v7.png": {
    "name": "Branch Coral 7",
    "cost": 10,
    "width": 280,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A decorative coral with branching growth that gives the tank a busier, more established reef look.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v8.png": {
    "name": "Branch Coral 8",
    "cost": 10,
    "width": 280,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A branching coral formation that works nicely tucked between rocks, caves, and other reef decorations.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "coral__coral__theme-reef__v9.png": {
    "name": "Branch Coral 9",
    "cost": 10,
    "width": 280,
    "defaultScale": 1,
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "description": "A colorful piece of branching coral that adds a little height and life to the aquarium floor.",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "zoanthid-mat__coral__theme-reef.png": {
    "name": "Zoanthid Mat",
    "cost": 8,
    "width": 300,
    "defaultScale": 1,
    "description": "A zoanthid mat decoration for the aquarium.",
    "categories": [
      "coral"
    ],
    "theme": "reef",
    "behavior": "static",
    "tags": [
      "coral",
      "reef",
      "hardscape",
      "perchable"
    ]
  },
  "transit-tube__transit__theme-artificial__front.png": {
    "name": "Borough Transit Tube",
    "cost": 28,
    "width": 230,
    "defaultScale": 0.58,
    "categories": [
      "transit"
    ],
    "fishBehavior": {
      "hangout": [
        "hardscape"
      ],
      "occupancyLimit": 1,
      "note": "Name and link two tubes to give fish a fast route between neighborhoods. It only bubbles while in use."
    },
    "theme": "artificial",
    "description": "Link two named tubes to create a fast route between neighborhoods. The tube stays quiet until a fish enters, then bubbles to life as it carries the fish across the Borough like an italian plumber.",
    "behavior": "transit",
    "tags": [
      "transit",
      "artificial",
      "hardscape",
      "transport"
    ]
  }
};

const DECOR_KEY_ALIASES = Object.freeze({
  "anubia-rock.png": "anubias-rock__plant-rock__theme-natural.png",
  "anubia-rock_seaweed.png": "anubias-rock__plant-rock__theme-natural.png",
  "anubias-rock.png": "anubias-rock__plant-rock__theme-natural.png",
  "blue_castle_cave.png": "blue-castle__cave__theme-fantasy__front.png",
  "brain_coral.png": "brain-coral__coral__theme-reef.png",
  "castle-cave.png": "wizard-castle__cave__theme-fantasy__front.png",
  "cave_coral_shelf_1.png": "coral-shelf-1__cave-coral__theme-reef__front.png",
  "cave_coral_shelf_10.png": "coral-shelf-10__cave-coral__theme-reef__front.png",
  "cave_coral_shelf_2.png": "coral-shelf-2__cave-coral__theme-reef__front.png",
  "cave_coral_shelf_3.png": "coral-shelf-3__cave-coral__theme-reef__front.png",
  "cave_coral_shelf_4.png": "coral-shelf-4__cave-coral__theme-reef__front.png",
  "cave_coral_shelf_5.png": "coral-shelf-5__cave-coral__theme-reef__front.png",
  "cave_coral_shelf_6.png": "coral-shelf-6__cave-coral__theme-reef__front.png",
  "cave_coral_shelf_7.png": "coral-shelf-7__cave-coral__theme-reef__front.png",
  "cave_coral_shelf_9.png": "coral-shelf-9__cave-coral__theme-reef__front.png",
  "cave_sea_anemone_1.png": "sea-anemone-1__cave-coral__theme-reef__front.png",
  "cave_sea_anemone_3.png": "sea-anemone-3__cave-coral__theme-reef__front.png",
  "cave_sea_anemone_4.png": "sea-anemone-4__cave-coral__theme-reef__front.png",
  "coral_1.png": "coral__coral__theme-reef.png",
  "coral_10.png": "coral__coral__theme-reef__v10.png",
  "coral_2.png": "coral__coral__theme-reef__v2.png",
  "coral_3.png": "coral__coral__theme-reef__v3.png",
  "coral_4.png": "coral__coral__theme-reef__v4.png",
  "coral_5.png": "coral__coral__theme-reef__v5.png",
  "coral_6.png": "coral__coral__theme-reef__v6.png",
  "coral_7.png": "coral__coral__theme-reef__v7.png",
  "coral_8.png": "coral__coral__theme-reef__v8.png",
  "coral_9.png": "coral__coral__theme-reef__v9.png",
  "dirt.png": "dirt__rock__theme-natural.png",
  "driftwood-root.png": "driftwood-root__wood__theme-natural.png",
  "driftwood.png": "driftwood__wood__theme-natural.png",
  "fishheadeffigy_1.png": "halloween-fish-head-effigy__ornament__theme-halloween.png",
  "fishheadeffigy_2.png": "halloween-fish-head-effigy__ornament__theme-halloween__v2.png",
  "fishheadeffigy_3.png": "halloween-fish-head-effigy__ornament__theme-halloween__v3.png",
  "fishing_lure.png": "fishing-lure__lure__theme-artificial.png",
  "fishing_lure_1.png": "fishing-lure__lure__theme-artificial__v2.png",
  "fishing_lure_2.png": "fishing-lure__lure__theme-artificial__v3.png",
  "fishing_lure_3.png": "fishing-lure__lure__theme-artificial__v4.png",
  "fishing_lure_4.png": "fishing-lure__lure__theme-artificial__v5.png",
  "fishing_lure_5.png": "fishing-lure__lure__theme-artificial__v6.png",
  "fishing_lure_6.png": "fishing-lure__lure__theme-artificial__v7.png",
  "floating_halloween_ghost.png": "halloween-ghost__ornament__theme-halloween.png",
  "floating_swampmoss_1.png": "floating-swamp-moss__plant__theme-natural.png",
  "floatingseaweed_1.png": "floating-seaweed__plant__theme-reef.png",
  "gorebag_lure.png": "halloween-gorebag__lure__theme-halloween.png",
  "halloween_cauldron.png": "halloween-cauldron__bubbler__theme-halloween__front.png",
  "halloween_cauldron_bubbler.png": "halloween-cauldron__bubbler__theme-halloween__front.png",
  "halloween_crypt_cave.png": "halloween-crypt__cave__theme-halloween__front.png",
  "halloween_floating_skeleton.png": "halloween-skeleton__ornament__theme-halloween.png",
  "halloween_floatingseaweed.png": "halloween-floating-seaweed__plant__theme-halloween.png",
  "halloween_ghost_ship.png": "halloween-ghost-ship__ornament__theme-halloween.png",
  "halloween_gravestone_1.png": "halloween-gravestone__ornament__theme-halloween.png",
  "halloween_gravestone_2.png": "halloween-gravestone__ornament__theme-halloween__v2.png",
  "halloween_gravestone_3.png": "halloween-gravestone__ornament__theme-halloween__v3.png",
  "halloween_gravestone_4.png": "halloween-gravestone__ornament__theme-halloween__v4.png",
  "halloween_gravestone_5.png": "halloween-gravestone__ornament__theme-halloween__v5.png",
  "halloween_haunted_house_cave.png": "halloween-haunted-house__cave__theme-halloween__front.png",
  "halloween_haunted_tree.png": "halloween-haunted-tree__ornament__theme-halloween.png",
  "halloween_jackolantern.png": "halloween-jack-o-lantern__bubbler__theme-halloween__front.png",
  "halloween_jackolantern_bubbler.png": "halloween-jack-o-lantern__bubbler__theme-halloween__front.png",
  "halloween_seaweed.png": "halloween-seaweed__plant__theme-halloween.png",
  "halloween_skeleton_lure.png": "halloween-skeleton__ornament__theme-halloween.png",
  "halloween_spider.png": "halloween-spider__ornament__theme-halloween.png",
  "halloween_webs.png": "halloween-webs__ornament__theme-halloween.png",
  "meteor_cave.png": "meteor__cave-rock__theme-space__front.png",
  "moss-bridge.png": "moss-bridge__wood-plant__theme-natural.png",
  "mushroomcoral_seaweed.png": "large-mushroom-coral__coral__theme-reef.png",
  "plane-wreck.png": "frozen-sunken-submarine__ornament__theme-frozen.png",
  "rock_1_bricks.png": "rock-bricks__rock__theme-natural.png",
  "rock_2_bricks.png": "rock-bricks__rock__theme-natural__v2.png",
  "rock_3_bricks.png": "rock-bricks__rock__theme-natural__v3.png",
  "rock_4_bricks.png": "rock-bricks__rock__theme-natural__v4.png",
  "rock_5_bricks.png": "rock-bricks__rock__theme-natural__v5.png",
  "sea_anemone_2.png": "sea-anemone__coral__theme-reef.png",
  "sea_anemone_5.png": "sea-anemone__coral__theme-reef__v2.png",
  "seaweed-bunch.png": "seaweed-bunch__plant__theme-reef.png",
  "seaweed_1.png": "seaweed__plant__theme-reef.png",
  "shipwreck.png": "frozen-ship__ornament__theme-frozen.png",
  "slate-cave.png": "slate__cave-rock__theme-natural__front.png",
  "transit-tube.png": "transit-tube__transit__theme-artificial__front.png",
  "treasure-chest_bubbler.png": "treasure-chest__bubbler__theme-treasure__front.png",
  "volcanic_rock_1_bricks.png": "volcanic-rock-bricks__rock__theme-natural.png",
  "volcanic_rock_2_bricks.png": "volcanic-rock-bricks__rock__theme-natural__v2.png",
  "volcanic_rock_3_bricks.png": "volcanic-rock-bricks__rock__theme-natural__v3.png",
  "volcanic_rock_4_bricks.png": "volcanic-rock-bricks__rock__theme-natural__v4.png",
  "volcano-1_bubbler.png": "volcano__bubbler__theme-natural__front.png",
  "volcano-2_bubbler.png": "volcano__bubbler__theme-natural__v2__front.png"
});
const DECOR_RGB_COLOR_SETTING = "rgb";
const DECOR_COLORIZE_SETTING_SUFFIX = "Colorize";
const DECOR_RGB_CYCLE_MS = 22000;
const DECOR_RGB_CYCLE_CACHE_STEPS = 120;


const CUSTOM_BUBBLER_DECOR_IMAGE = resolveAppUrl(OPTIONAL_BUBBLE_ORB_ASSET_PATH);
const CUSTOM_BUBBLER_THUMBNAIL_IMAGE = resolveAppUrl("assets/misc/custom_bubbler.png");
const CUSTOM_DECOR_SHOP_IMAGE = resolveAppUrl("assets/misc/custom_decor.png");
const CUSTOM_HIDE_SHOP_IMAGE = resolveAppUrl("assets/misc/custom_hide.png");
const CUSTOM_FISH_SHOP_IMAGE = resolveAppUrl("assets/web/proteus/PB_Custom_Fish.png");
const CUSTOM_FISH_TEMPLATE_IMAGE = resolveAppUrl("assets/misc/fish_template.png");

const dom = {
  coinCount: document.querySelector("#coinCount"),
  toolbarWallet: document.querySelector("#toolbarWallet"),
  toolbarCoinCount: document.querySelector("#toolbarCoinCount"),
  walletTransactionMenu: document.querySelector("#walletTransactionMenu"),
  cleanlinessLabel: document.querySelector("#cleanlinessLabel"),
  mealWindowLabel: document.querySelector("#mealWindowLabel"),
  tankStatus: document.querySelector("#tankStatus"),
  mealStatus: document.querySelector("#mealStatus"),
  nextMealCountdown: document.querySelector("#nextMealCountdown"),
  scrubProgressLabel: document.querySelector("#scrubProgressLabel"),
  scrubProgressBar: document.querySelector("#scrubProgressBar"),
  nextMealCountdownMirror: document.querySelector("#nextMealCountdownMirror"),
  feedButton: document.querySelector("#feedButton"),
  toggleDebugMenuButton: document.querySelector("#toggleDebugMenuButton"),
  debugSidebar: document.querySelector("#debugSidebar"),
  debugMenuGameState: document.querySelector("#debugMenuGameState"),
  debugMenuFish: document.querySelector("#debugMenuFish"),
  debugMenuDirtiness: document.querySelector("#debugMenuDirtiness"),
  debugMenuBehaviors: document.querySelector("#debugMenuBehaviors"),
  debugFishBehaviorPreviewButton: document.querySelector("#debugFishBehaviorPreviewButton"),
  debugFishBehaviorPreview: document.querySelector("#debugFishBehaviorPreview"),
  closeDebugFishBehaviorPreview: document.querySelector("#closeDebugFishBehaviorPreview"),
  restartDebugFishBehaviorPreview: document.querySelector("#restartDebugFishBehaviorPreview"),
  debugFishBehaviorPreviewSpecies: document.querySelector("#debugFishBehaviorPreviewSpecies"),
  debugFishBehaviorPreviewBehavior: document.querySelector("#debugFishBehaviorPreviewBehavior"),
  debugFishBehaviorPreviewCanvas: document.querySelector("#debugFishBehaviorPreviewCanvas"),
  debugFishBehaviorPreviewStatus: document.querySelector("#debugFishBehaviorPreviewStatus"),
  debugFishBehaviorPreviewPhase: document.querySelector("#debugFishBehaviorPreviewPhase"),
  debugFishBehaviorPreviewScaleX: document.querySelector("#debugFishBehaviorPreviewScaleX"),
  debugFishBehaviorPreviewScaleY: document.querySelector("#debugFishBehaviorPreviewScaleY"),
  debugFishBehaviorPreviewTilt: document.querySelector("#debugFishBehaviorPreviewTilt"),
  debugFishBehaviorPreviewDescription: document.querySelector("#debugFishBehaviorPreviewDescription"),
  debugDecorPreviewButton: document.querySelector("#debugDecorPreviewButton"),
  debugDecorPreview: document.querySelector("#debugDecorPreview"),
  closeDebugDecorPreview: document.querySelector("#closeDebugDecorPreview"),
  debugDecorPreviewSelect: document.querySelector("#debugDecorPreviewSelect"),
  debugDecorPreviewLayer: document.querySelector("#debugDecorPreviewLayer"),
  debugDecorPreviewSnapButton: document.querySelector("#debugDecorPreviewSnapButton"),
  debugDecorPreviewResetButton: document.querySelector("#debugDecorPreviewResetButton"),
  debugDecorPreviewCanvas: document.querySelector("#debugDecorPreviewCanvas"),
  debugDecorPreviewStatus: document.querySelector("#debugDecorPreviewStatus"),
  debugDecorPreviewSize: document.querySelector("#debugDecorPreviewSize"),
  debugDecorPreviewSizeOutput: document.querySelector("#debugDecorPreviewSizeOutput"),
  debugDecorPreviewFlipX: document.querySelector("#debugDecorPreviewFlipX"),
  debugDecorPreviewFlipY: document.querySelector("#debugDecorPreviewFlipY"),
  debugDecorPreviewShowFootprint: document.querySelector("#debugDecorPreviewShowFootprint"),
  debugDecorPreviewColors: document.querySelector("#debugDecorPreviewColors"),
  debugDecorPreviewBottom: document.querySelector("#debugDecorPreviewBottom"),
  debugDecorPreviewOffset: document.querySelector("#debugDecorPreviewOffset"),
  debugDecorPreviewFootprint: document.querySelector("#debugDecorPreviewFootprint"),
  debugNotificationUiButton: document.querySelector("#debugNotificationUiButton"),
  debugFishActionIndicatorsButton: document.querySelector("#debugFishActionIndicatorsButton"),
  debugFrameProfilerButton: document.querySelector("#debugFrameProfilerButton"),
  debugDepthTuner: document.querySelector("#debugDepthTuner"),
  debugDepthTunerReadout: document.querySelector("#debugDepthTunerReadout"),
  debugDepthTunerResetButton: document.querySelector("#debugDepthTunerResetButton"),
  debugDepthTunerCopyButton: document.querySelector("#debugDepthTunerCopyButton"),
  debugLivingBoroughPanel: document.querySelector("#debugLivingBoroughPanel"),
  resetMealsButton: document.querySelector("#resetMealsButton"),
  addHundredCoinsButton: document.querySelector("#addHundredCoinsButton"),
  completeMealsButton: document.querySelector("#completeMealsButton"),
  spongeButton: document.querySelector("#spongeButton"),
  scoopButton: document.querySelector("#scoopButton"),
  debugDamageFishButton: document.querySelector("#debugDamageFishButton"),
  debugBreedButton: document.querySelector("#debugBreedButton"),
  resetFishHealthButton: document.querySelector("#resetFishHealthButton"),
  debugInfectFishButton: document.querySelector("#debugInfectFishButton"),
  debugCureFishButton: document.querySelector("#debugCureFishButton"),
  debugReviveAllFishButton: document.querySelector("#debugReviveAllFishButton"),
  addCoinsButton: document.querySelector("#addCoinsButton"),
  maxDirtButton: document.querySelector("#maxDirtButton"),
  debugMaxDirtinessButton: document.querySelector("#debugMaxDirtinessButton"),
  debugMaxCleanlinessButton: document.querySelector("#debugMaxCleanlinessButton"),
  debugGravelDigButton: document.querySelector("#debugGravelDigButton"),
  debugGravelPebbleButton: document.querySelector("#debugGravelPebbleButton"),
  debugCaveButton: document.querySelector("#debugCaveButton"),
  debugDailyRecapButton: document.querySelector("#debugDailyRecapButton"),
  debugFishBehaviorLogButton: document.querySelector("#debugFishBehaviorLogButton"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingOverlayBackground: document.querySelector("#loadingOverlayBackground"),
  loadingOverlayUnderwater: document.querySelector("#loadingOverlayUnderwater"),
  loadingOverlayText: document.querySelector(".loading-overlay-text"),
  tankStage: document.querySelector("#tankStage"),
  tankStageBackground: document.querySelector("#tankStageBackground"),
  tankDisplay: document.querySelector(".tank-display"),
  displayTab: document.querySelector("#displayTab"),
  tankSidebar: document.querySelector("#tankSidebar"),
  tankBottomDock: document.querySelector(".tank-bottom-dock"),
  toolbarCareMenu: document.querySelector("#toolbarCareMenu"),
  toolbarEditMenu: document.querySelector("#toolbarEditMenu"),
  careMenuButton: document.querySelector("#careMenuButton"),
  editMenuButton: document.querySelector("#editMenuButton"),
  toolbarFastTooltip: document.querySelector("#toolbarFastTooltip"),
  toolbarTab: document.querySelector("#toolbarTab"),
  tankCanvas: document.querySelector("#tankCanvas"),
  grimeCanvas: document.querySelector("#grimeCanvas"),
  glassCanvas: document.querySelector("#glassCanvas"),
  prevTankButton: document.querySelector("#prevTankButton"),
  nextTankButton: document.querySelector("#nextTankButton"),
  boroughOverview: document.querySelector("#boroughOverview"),
  boroughOverviewTitle: document.querySelector("#boroughOverviewTitle"),
  boroughOverviewHint: document.querySelector("#boroughOverviewHint"),
  boroughOverviewStatus: document.querySelector("#boroughOverviewStatus"),
  boroughOverviewInfo: document.querySelector("#boroughOverviewInfo"),
  boroughOverviewInfoBody: document.querySelector("#boroughOverviewInfoBody"),
  toggleBoroughEditMode: document.querySelector("#toggleBoroughEditMode"),
  addBoroughTankButton: document.querySelector("#addBoroughTankButton"),
  boroughGrid: document.querySelector("#boroughGrid"),
  closeBoroughOverview: document.querySelector("#closeBoroughOverview"),
  overviewButton: document.querySelector("#overviewButton"),
  extendAquariumButton: document.querySelector("#extendAquariumButton"),
  dailyBonusBell: document.querySelector("#dailyBonusBell"),
  notificationBellBadge: document.querySelector("#notificationBellBadge"),
  placementHint: document.querySelector("#placementHint"),
  placementHintContainer: document.querySelector(".tank-overlay-hints"),
  careTaskPane: document.querySelector("#careTaskPane"),
  careTaskList: document.querySelector("#careTaskList"),
  editQuickRef: document.querySelector("#editQuickRef"),
  editQuickRefCard: document.querySelector("#editQuickRefCard"),
  editDecorTray: document.querySelector("#editDecorTray"),
  closeEditDecorTrayButton: document.querySelector("#closeEditDecorTrayButton"),
  editDecorTrayScroller: document.querySelector("#editDecorTrayScroller"),
  editDecorTrayContextMenu: document.querySelector("#editDecorTrayContextMenu"),
  editDecorTrayPrev: document.querySelector("#editDecorTrayPrev"),
  editDecorTrayNext: document.querySelector("#editDecorTrayNext"),
  editFishTray: document.querySelector("#editFishTray"),
  closeEditFishTrayButton: document.querySelector("#closeEditFishTrayButton"),
  editFishTrayScroller: document.querySelector("#editFishTrayScroller"),
  editFishTrayContextMenu: document.querySelector("#editFishTrayContextMenu"),
  editFishTrayPrev: document.querySelector("#editFishTrayPrev"),
  editFishTrayNext: document.querySelector("#editFishTrayNext"),
  editEquipmentTray: document.querySelector("#editEquipmentTray"),
  closeEditEquipmentTrayButton: document.querySelector("#closeEditEquipmentTrayButton"),
  editEquipmentTrayScroller: document.querySelector("#editEquipmentTrayScroller"),
  editEquipmentTrayContextMenu: document.querySelector("#editEquipmentTrayContextMenu"),
  editTankTray: document.querySelector("#editTankTray"),
  closeEditTankTrayButton: document.querySelector("#closeEditTankTrayButton"),
  editTankTrayScroller: document.querySelector("#editTankTrayScroller"),
  editTankBackgroundColorPanel: document.querySelector("#editTankBackgroundColorPanel"),
  editTankBackgroundList: document.querySelector("#editTankBackgroundList"),
  editTankCustomGravelPanel: document.querySelector("#editTankCustomGravelPanel"),
  foodTray: document.querySelector("#foodTray"),
  foodTrayScroller: document.querySelector("#foodTrayScroller"),
  foodTrayPrev: document.querySelector("#foodTrayPrev"),
  foodTrayNext: document.querySelector("#foodTrayNext"),
  medicineTray: document.querySelector("#medicineTray"),
  medicineTrayScroller: document.querySelector("#medicineTrayScroller"),
  medicineTrayPrev: document.querySelector("#medicineTrayPrev"),
  medicineTrayNext: document.querySelector("#medicineTrayNext"),
  toolCursor: document.querySelector("#toolCursor"),
  mealTrack: document.querySelector("#mealTrack"),
  summaryGrid: document.querySelector("#summaryGrid"),
  eventFeed: document.querySelector("#eventFeed"),
  tutorialSettingsSection: document.querySelector("#tutorialSettingsSection"),
  replayTutorialButton: document.querySelector("#replayTutorialButton"),
  resetProgressButton: document.querySelector("#resetProgressButton"),
  exportDataButton: document.querySelector("#exportDataButton"),
  importDataButton: document.querySelector("#importDataButton"),
  importDataInput: document.querySelector("#importDataInput"),
  localBackgroundInput: document.querySelector("#localBackgroundInput"),
  localDecorInput: document.querySelector("#localDecorInput"),
  localHideFrontInput: document.querySelector("#localHideFrontInput"),
  localHideBackgroundInput: document.querySelector("#localHideBackgroundInput"),
  localFishInput: document.querySelector("#localFishInput"),
  tankManagementCard: document.querySelector("#tankManagementCard"),
  tankWaterActionList: document.querySelector("#tankWaterActionList"),
  foodShop: document.querySelector("#foodShop"),
  pharmacyShop: document.querySelector("#pharmacyShop"),
  fishList: document.querySelector("#fishList"),
  fishShop: document.querySelector("#fishShop"),
  decorWorkspace: document.querySelector("#decorWorkspace"),
  decorInventory: document.querySelector("#decorInventory"),
  decorShop: document.querySelector("#decorShop"),
  equipmentShop: document.querySelector("#equipmentShop"),
  storeScrollControls: document.querySelector("#storeScrollControls"),
  storeOverlay: document.querySelector("#storeOverlay"),
  webHomePage: document.querySelector("#webHomePage"),
  webSurfUnreadBadge: document.querySelector("#webSurfUnreadBadge"),
  bubbleBankPage: document.querySelector("#bubbleBankPage"),
  davyJonesLockerPage: document.querySelector("#davyJonesLockerPage"),
  utilityOverlay: document.querySelector("#utilityOverlay"),
  utilityOverlayTitle: document.querySelector("#utilityOverlayTitle"),
  utilityOverlayKicker: document.querySelector("#utilityOverlayKicker"),
  utilityOverlayTitleActions: document.querySelector("#utilityOverlayTitleActions"),
  utilityOverlayHeaderActions: document.querySelector("#utilityOverlayHeaderActions"),
  utilityOverlayBody: document.querySelector("#utilityOverlayBody"),
  utilityOverlayFooter: document.querySelector("#utilityOverlayFooter"),
  closeUtilityOverlay: document.querySelector("#closeUtilityOverlay"),
  settingsOverlay: document.querySelector("#settingsOverlay"),
  debugModeSettingsSection: document.querySelector("#debugModeSettingsSection"),
  debugModeToggleInput: document.querySelector("#debugModeToggleInput"),
  peacefulModeToggleInput: document.querySelector("#peacefulModeToggleInput"),
  layoutRatioLockToggleInput: document.querySelector("#layoutRatioLockToggleInput"),
  equipmentOverlay: document.querySelector("#equipmentOverlay"),
  equipmentPanelDescription: document.querySelector("#equipmentPanelDescription"),
  equipmentLightingSection: document.querySelector("#equipmentLightingSection"),
  equipmentLightingSectionTitle: document.querySelector("#equipmentLightingSectionTitle"),
  equipmentLightingSectionNote: document.querySelector("#equipmentLightingSectionNote"),
  introTutorialOverlay: document.querySelector("#introTutorialOverlay"),
  introTutorialSplash: document.querySelector("#introTutorialSplash"),
  introTutorialPanel: document.querySelector("#introTutorialPanel"),
  introTutorialKicker: document.querySelector("#introTutorialKicker"),
  introTutorialBody: document.querySelector("#introTutorialBody"),
  introTutorialActions: document.querySelector("#introTutorialActions"),
  introTutorialCloseButton: document.querySelector("#introTutorialCloseButton"),
  storeFoodTab: document.querySelector("#storeFoodTab"),
  storePharmacyTab: document.querySelector("#storePharmacyTab"),
  storeFishTab: document.querySelector("#storeFishTab"),
  storeDecorTab: document.querySelector("#storeDecorTab"),
  storeEquipmentTab: document.querySelector("#storeEquipmentTab"),
  storeCoinCounter: document.querySelector("#storeCoinCounter"),
  closeStoreOverlay: document.querySelector("#closeStoreOverlay"),
  openManagementButton: document.querySelector("#openManagementButton"),
  aquariumTaskBadge: document.querySelector("#aquariumTaskBadge"),
  careTaskPaneButton: document.querySelector("#careTaskPaneButton"),
  openStoreButton: document.querySelector("#openStoreButton"),
  openEquipmentButton: document.querySelector("#openEquipmentButton"),
  openSettingsButton: document.querySelector("#openSettingsButton"),
  toolbarTileColorInput: document.querySelector("#toolbarTileColorInput"),
  openSettingsSidebarButton: document.querySelector("#openSettingsSidebarButton"),
  closeSettingsOverlay: document.querySelector("#closeSettingsOverlay"),
  closeEquipmentOverlay: document.querySelector("#closeEquipmentOverlay"),
  violenceGoreToggleInput: document.querySelector("#violenceGoreToggleInput"),
  trypophobiaToggleInput: document.querySelector("#trypophobiaToggleInput"),
  soundMuteToggleInput: document.querySelector("#soundMuteToggleInput"),
  uiMuteToggleInput: document.querySelector("#uiMuteToggleInput"),
  ambientBubblesToggleInput: document.querySelector("#ambientBubblesToggleInput"),
  waterParticlesToggleInput: document.querySelector("#waterParticlesToggleInput"),
  causticLightingToggleInput: document.querySelector("#causticLightingToggleInput"),
  decorShadowsToggleInput: document.querySelector("#decorShadowsToggleInput"),
  depthEffectLevelInput: document.querySelector("#depthEffectLevelInput"),
  depthEffectLevelOutput: document.querySelector("#depthEffectLevelOutput"),
  backgroundDepthHazeToggleInput: document.querySelector("#backgroundDepthHazeToggleInput"),
  simpleTurnAnimationsToggleInput: document.querySelector("#simpleTurnAnimationsToggleInput"),
  mouseLockSettingsRow: document.querySelector("#mouseLockSettingsRow"),
  halloweenModeSelect: document.querySelector("#halloweenModeSelect"),
  tankMouseLockToggleInput: document.querySelector("#tankMouseLockToggleInput"),
  openEquipmentShopButton: document.querySelector("#openEquipmentShopButton"),
  openEquipmentStoreButton: document.querySelector("#openEquipmentStoreButton"),
  placedDecorList: document.querySelector("#placedDecorList"),
  backgroundList: document.querySelector("#backgroundList"),
  equipmentBackgroundList: document.querySelector("#equipmentBackgroundList"),
  equipmentBackgroundColorPanel: document.querySelector("#equipmentBackgroundColorPanel"),
  tankAssetList: document.querySelector("#tankAssetList"),
  //gravelPaletteSlots: document.querySelector("#gravelPaletteSlots"),
  //gravelPaletteChoices: document.querySelector("#gravelPaletteChoices"),
  customGravelPanel: document.querySelector("#customGravelPanel"),
  equipmentCustomGravelPanel: document.querySelector("#equipmentCustomGravelPanel"),
  fishInspector: document.querySelector("#fishInspector"),
  fishActionFlyout: document.querySelector("#fishActionFlyout"),
  fishActionFlyoutName: document.querySelector("#fishActionFlyoutName"),
  fishActionFlyoutSettings: document.querySelector("#fishActionFlyoutSettings"),
  fishActionQueue: document.querySelector("#fishActionQueue"),
  fishActionQueueDock: document.querySelector("#fishActionQueueDock"),
  fishActionSubmenu: document.querySelector("#fishActionSubmenu"),
  fishActionTargetMenu: document.querySelector("#fishActionTargetMenu"),
  selectedFishNeedsPanel: document.querySelector("#selectedFishNeedsPanel"),
  closeInspector: document.querySelector("#closeInspector"),
  selectedDecorActionBar: document.querySelector("#selectedDecorActionBar"),
  selectedDecorScaleControls: document.querySelector("#selectedDecorScaleControls"),
  selectedDecorResizeHandles: document.querySelector("#selectedDecorResizeHandles"),
  selectedDecorResizeIndicator: document.querySelector("#selectedDecorResizeIndicator"),
  selectedDecorResizeCornerHandles: [...document.querySelectorAll("[data-selected-decor-resize-corner]")],
  selectedDecorLayerControls: document.querySelector("#selectedDecorLayerControls"),
  selectedDecorTransformControls: document.querySelector("#selectedDecorTransformControls"),
  selectedDecorFlipHorizontalButton: document.querySelector("#selectedDecorFlipHorizontalButton"),
  selectedDecorFlipVerticalButton: document.querySelector("#selectedDecorFlipVerticalButton"),
  selectedDecorSettingsButton: document.querySelector("#selectedDecorSettingsButton"),
  selectedDecorAssignButton: document.querySelector("#selectedDecorAssignButton"),
  selectedDecorSellButton: document.querySelector("#selectedDecorSellButton"),
  selectedDecorStoreButton: document.querySelector("#selectedDecorStoreButton"),
  selectedDecorBuyAnotherButton: document.querySelector("#selectedDecorBuyAnotherButton"),
  selectedDecorScaleUpButton: document.querySelector("#selectedDecorScaleUpButton"),
  selectedDecorScaleDownButton: document.querySelector("#selectedDecorScaleDownButton"),
  selectedDecorSizeValue: document.querySelector("#selectedDecorSizeValue"),
  selectedDecorLayerUpButton: document.querySelector("#selectedDecorLayerUpButton"),
  selectedDecorLayerDownButton: document.querySelector("#selectedDecorLayerDownButton"),
  selectedDecorLayerValue: document.querySelector("#selectedDecorLayerValue"),
  inspectorBuyAnotherFish: document.querySelector("#inspectorBuyAnotherFish"),
  inspectorSellFish: document.querySelector("#inspectorSellFish"),
  inspectorStoreFish: document.querySelector("#inspectorStoreFish"),
  inspectorDisposeFish: document.querySelector("#inspectorDisposeFish"),
  saveFishName: document.querySelector("#saveFishName"),
  clearFishName: document.querySelector("#clearFishName"),
  randomizeFishName: document.querySelector("#randomizeFishName"),
  fishNameInput: document.querySelector("#fishNameInput"),
  fishNameKeyboard: document.querySelector("#fishNameKeyboard"),
  inspectorSpecies: document.querySelector("#inspectorSpecies"),
  inspectorHealth: document.querySelector("#inspectorHealth"),
  inspectorActivity: document.querySelector("#inspectorActivity"),
  inspectorComfort: document.querySelector("#inspectorComfort"),
  inspectorNeeds: document.querySelector("#inspectorNeeds"),
  inspectorNeedsBars: document.querySelector("#inspectorNeedsBars"),
  inspectorLifeStory: document.querySelector("#inspectorLifeStory"),
  inspectorAge: document.querySelector("#inspectorAge"),
  inspectorMeal: document.querySelector("#inspectorMeal"),
  inspectorFishSettingsButton: document.querySelector("#inspectorFishSettingsButton"),
  fishInspectorSettings: document.querySelector("#fishInspectorSettings"),
  inspectorFishSizeInput: document.querySelector("#inspectorFishSizeInput"),
  inspectorFishSizeValue: document.querySelector("#inspectorFishSizeValue"),
  inspectorFishBehaviorSelect: document.querySelector("#inspectorFishBehaviorSelect"),
  inspectorFishTurnAnimationInput: document.querySelector("#inspectorFishTurnAnimationInput"),
  inspectorFishTurnAnimationValue: document.querySelector("#inspectorFishTurnAnimationValue"),
  inspectorFishColorSwatches: document.querySelector("#inspectorFishColorSwatches"),
  inspectorFishColorValue: document.querySelector("#inspectorFishColorValue"),
  inspectorFishColorizeInput: document.querySelector("#inspectorFishColorizeInput"),
  toast: document.querySelector("#toast"),
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  medicineButton: document.querySelector("#medicineButton"),
  tipsButton: document.querySelector("#tipsButton"),
  toggleFishShop: document.querySelector("#toggleFishShop"),
  fishEditModeDockButton: document.querySelector("#fishEditModeDockButton"),
  editModeDockButton: document.querySelector("#editModeDockButton"),
  equipmentEditModeDockButton: document.querySelector("#equipmentEditModeDockButton"),
  toggleMouseLockButton: document.querySelector("#toggleMouseLockButton"),
  editLayerUpButton: document.querySelector("#editLayerUpButton"),
  editLayerDownButton: document.querySelector("#editLayerDownButton"),
  editScaleUpButton: document.querySelector("#editScaleUpButton"),
  editScaleDownButton: document.querySelector("#editScaleDownButton"),
  toggleEditMode: document.querySelector("#toggleEditMode"),
  toggleDecorShop: document.querySelector("#toggleDecorShop"),
  toggleSidebar: document.querySelector("#toggleSidebar")
};

const tankContext = dom.tankCanvas.getContext("2d");
const grimeContext = dom.grimeCanvas.getContext("2d");
const glassContext = dom.glassCanvas.getContext("2d");

const runtime = {
  activeTab: "overview",
  storeOverlayOpen: false,
  webHomeOpen: false,
  webSurfLastPage: "home",
  webSurfPageScroll: { home: 0, store: 0, bank: 0, locker: 0, designer: 0 },
  webSurfSelectedMailId: "",
  bubbleBankOpen: false,
  davyJonesLockerOpen: false,
  davyJonesLockerTabOpen: false,
  davyLockerItemSpeciesId: "",
  davyLockerVariantSelections: {},
  proteusDesignerOpen: false,
  proteusDesignerCompleting: false,
  activeEngineeredSpecimenOrderId: "",
  proteusDesignerCloseTimer: 0,
  utilityOverlayOpen: false,
  utilityOverlayMode: "",
  bubbleBankTab: "account",
  bubbleBankTargetId: "",
  bubbleBankTransactionFilter: "all",
  legalOverlayTab: "privacy",
  startupLegalOpen: false,
  startupLegalTab: "privacy",
  settingsOverlayOpen: false,
  equipmentOverlayOpen: false,
  storeTab: "food",
  toolbarActionMenu: "",
  toolbarCareTaskCount: 0,
  toolbarCareTaskCountAt: 0,
  storeSorts: {
    food: "cost",
    pharmacy: "cost",
    fish: "cost",
    decor: "cost",
    equipment: "cost"
  },
  storeFilters: {
    fish: "all"
  },
  storeSearches: {
    fish: "",
    decor: ""
  },
  storeScrollPointerId: null,
  storeScrollPointerDirection: "",
  storeScrollSuppressClickUntil: 0,
  storeScrollAnimationFrame: 0,
  wallpaperScrollRepeatTimer: 0,
  wallpaperScrollRepeatTarget: "",
  wallpaperScrollRepeatDirection: "",
  fishNameKeyboardMode: "letters",
  fishNameKeyboardUppercase: false,
  fishNameKeyboardOpen: false,
  fishNameDraftId: "",
  fishNameDraftValue: "",
  wallpaperUtilityKeyboardOpenId: "",
  tutorialSkipReturnTab: "",
  tutorialSkipReturnStage: "",
  tutorialDismissedFeaturePopup: "",
  tutorialDisplayCollapsed: false,
  tutorialToolbarRevealOrder: [],
  sidebarCollapsed: true,
  editTankMode: false,
  editDecorTrayTab: "all",
  editDecorTrayInTank: false,
  fishEditMode: false,
  fishEditTrayTab: "tank",
  editOverlayMode: "fish",
  equipmentEditMode: false,
  equipmentEditTrayTab: "storage",
  tankEditMode: false,
  editTankTrayTab: "background",
  editTankBackgroundMode: "",
  editTankGravelLayer: 0,
  tankColorPickerDrag: null,
  foodTrayOpen: false,
  medicineTrayOpen: false,
  feedingModeFoodKey: "",
  medicineModeKey: "",
  toolModeSource: null,
  placementMode: null,
  placementPreview: null,
  cleaningMode: false,
  scoopMode: false,
  dragState: null,
  decorResizeState: null,
  fishDragState: null,
  eggDragState: null,
  pebbleDragState: null,
  selectedFishId: null,
  selectedFishStatusFishId: null,
  fishActionMenuFishId: null,
  fishActionMenuPoint: null,
  fishActionMenuHold: null,
  fishActionCategory: "",
  fishActionCategoryAnchor: null,
  fishActionTargetAction: "",
  fishActionTargetFishId: "",
  fishInspectorSettingsOpen: false,
  selectedDecorId: null,
  selectedDecorIds: [],
  bubblerSettingsDecorId: null,
  customDecorSettingsDecorId: null,
  residenceSettingsDecorId: null,
  caveSettingsActivePointType: "seat",
  caveSettingsDrag: null,
  decorSettingsCaveTab: "entries",
  pendingDecorAction: null,
  pendingFishAction: null,
  pendingCustomDecorUpload: null,
  pendingCustomHideUpload: null,
  pendingCustomFishUpload: null,
  pendingSaveExport: null,
  pendingExternalLink: null,
  hardwareAccelerationIssue: null,
  customImageDbPromise: null,
  customImageStorageMode: "unknown",
  customImageStorageTestPromise: null,
  customImageStorageFallbackWarningShown: false,
  customImageObjectUrls: new Map(),
  missingCustomImageWarnings: new Set(),
  customImageCleanupQueued: false,
  editingTankNameId: null,
  editingTankNameValue: "",
  managementHubView: "overview",
  boroughOverviewOpen: false,
  aquariumExpansionMode: false,
  boroughPanPointerId: null,
  boroughPanStartX: 0,
  boroughPanStartY: 0,
  boroughOverviewFishRenderedAt: 0,
  boroughOverviewFishSampleMs: 2000,
  boroughOverviewFishProxies: new Map(),
  boroughOverviewSnapshotCache: new Map(),
  boroughOverviewSnapshotRenderedAt: 0,
  boroughOverviewSnapshotFrameMs: 1500,
  boroughOverviewDraggedTankId: null,
  boroughOverviewEditMode: false,
  boroughOverviewInfoTab: "borough",
  boroughOverviewInfoView: "overview",
  boroughOverviewInfoTankId: null,
  boroughOverviewDragPointerId: null,
  transitTubeBursts: [],
  pendingNeighborhoodTravel: new Map(),
  pendingMachineryTravel: new Map(),
  foodTravelDestinations: new Map(),
  selectedMachineryId: null,
  machinerySettingsOpen: false,
  submarineManualDriveKeys: new Set(),
  submarineManualLastFoodDeployAt: 0,
  boatManualDriveKeys: new Set(),
  boatManualLastFoodDeployAt: 0,
  submarineBubbleBursts: [],
  submarineBubbleEmitterState: new Map(),
  boatBubbleBursts: [],
  boatBubbleEmitterState: new Map(),
  tankAppearanceClipboard: { background: null, gravel: null },
  boroughEdgeBursts: [],
  boroughActivityNotifications: [],
  boroughNotificationSignatures: new Map(),
  lastBoroughNotificationAt: 0,
  debugNotificationUiEnabled: false,
  debugFishActionIndicatorsEnabled: false,
  debugFrameProfilerEnabled: false,
  debugDepthTuning: null,
  debugDepthTuningLoaded: false,
  debugDepthTuningApplyTimer: 0,
  frameProfilerCurrent: null,
  frameProfilerSamples: [],
  frameProfilerLongFrameCount: 0,
  frameProfilerLastOverlayAt: 0,
  frameProfilerOverlay: null,
  frameProfilerLastSaveMs: 0,
  frameProfilerLastUiRenderMs: 0,
  frameProfilerLastTickMs: 0,
  frameProfilerLastDeferredUiMs: 0,
  fishFrameLookupById: new Map(),
  fishFrameLookupSource: null,
  fishFrameLookupLength: 0,
  fishRenderFrameCache: null,
  fishRenderRecordPool: [],
  fishRenderLayerBuckets: null,
  fishSpeciesMergeCache: new Map(),
  deferredStateSaveDirty: false,
  deferredStateSaveRequestedAt: 0,
  deferredStateSaveTimerId: 0,
  deferredStateSaveIdleId: 0,
  lastStateSavedAt: 0,
  deferredTickUiTimerId: 0,
  deferredTickUiIdleId: 0,
  deferredTickUiNow: 0,
  lastDeferredTickUiRefreshAt: 0,
  caveCollisionFrameCache: null,
  lastRenderedCoinCount: null,
  coinGainGlowTimeoutId: 0,
  achievementEvaluationActive: false,
  lastBoroughHappeningAt: 0,
  debugSimulatedNow: null,
  debugTimeScale: 1,
  debugSimulationPaused: false,
  debugHalloweenModeOverride: null,
  debugBirthdayMode: false,
  debugBirthdayHatFishIds: new Set(),
  debugAutonomyPausedFishIds: new Set(),
  debugOverviewFishFps: null,
  debugOverviewInterpolationDisabled: false,
  debugOverviewLayoutMode: "auto",
  debugOverviewSyntheticCount: 0,
  debugSnapshotCacheFrozen: false,
  managementHistoryVisibleCount: MANAGEMENT_HISTORY_PAGE_SIZE,
  managementHistoryFilters: {
    eventType: "",
    fishType: "",
    fishName: "",
    decorType: "",
    decorKey: ""
  },
  careTaskPaneTankId: "",
  careTaskPaneInitialized: false,
  careTaskPaneActiveTasks: new Map(),
  careTaskPaneCompletingTasks: new Map(),
  careTaskPaneCleanupHandle: null,
  tutorialPanelCacheKey: "",
  pendingToolbarButtonSound: null,
  toolbarFastTooltipButton: null,
  toolbarFastTooltipTimer: 0,
  toolbarFastTooltipPointer: null,
  soundDragState: null,
  suppressNextTankClick: false,
  suppressNextGlassTap: false,
  glassTapGesture: {
    pointerId: null,
    startedAt: 0,
    startX: 0,
    startY: 0,
    movedTooFar: false,
    allowNextClick: false
  },
  editDecorTrayContextMenuState: {
    entryId: null,
    decorKey: null,
    anchorX: 0,
    anchorY: 0
  },
  editDecorTrayLongPress: {
    timerId: 0,
    pointerId: null,
    decorKey: null,
    entryId: null,
    startClientX: 0,
    startClientY: 0
  },
  suppressEditDecorTrayClickDecorKey: null,
  suppressEditDecorTrayClickEntryId: null,
  editFishTrayContextMenuState: {
    fishId: null,
    anchorX: 0,
    anchorY: 0
  },
  editEquipmentTrayContextMenuState: {
    machineryId: null,
    anchorX: 0,
    anchorY: 0
  },
  editFishTrayLongPress: {
    timerId: 0,
    pointerId: null,
    fishId: null,
    startClientX: 0,
    startClientY: 0
  },
  suppressEditFishTrayClickFishId: null,
  pointerDown: false,
  capturedTankPointerId: null,
  pointerStagePx: null,
  stageRenderScale: 1,
  stageRenderOffsetX: 0,
  stageRenderOffsetY: 0,
  stageEditViewAmount: 0,
  stageRenderViewLastFrameAt: 0,
  playfield: {
    scale: 1,
    left: 0,
    top: 0,
    width: TANK_WIDTH,
    height: TANK_HEIGHT,
    contentWidth: TANK_WIDTH,
    contentHeight: TANK_HEIGHT
  },
  lastScrubPoint: null,
  pendingScrubPoint: null,
  scrubFrameHandle: 0,
  scrubCells: new Uint8Array(SCRUB_GRID_COLS * SCRUB_GRID_ROWS),
  scrubbedCount: 0,
  scrubStamps: [],
  scrubAutoCompleteAt: 0,
  scrubMaskRevision: 0,
  cleanableScrubCellCount: 0,
  scrubbedCleanableCellCount: 0,
  scrubCoverageCacheKey: "",
  grimeCompositeCacheKey: "",
  lastGrimeCanvasOpacity: "",
  lastGrimeCanvasVisibility: "",
  tankStateDirty: false,
  cleaningTransition: null,
  backgroundCatalog: [],
  tankCatalog: [],
  gravelCatalog: [],
  customGravelLayerCatalog: [],
  customGravelPebbleCatalog: [],
  bubbleCatalog: [],
  suckerFishCatalog: [],
  decorCatalog: [],
  decorMeta: {},
  fishCatalog: [...FISH_TYPES],
  foodAndMedCatalog: {
    fallbackImage: resolveFoodAndMedAssetPath(FOOD_AND_MEDS_FALLBACK_IMAGE_NAME),
    items: {
      food: {},
      medicine: {}
    }
  },
  fishMap: new Map(FISH_TYPES.map((fish) => [fish.id, fish])),
  fishSizeRange: buildFishSizeRange(FISH_TYPES),
  fishCostRange: {
    min: Math.min(...FISH_TYPES.map((fish) => fish.cost)),
    max: Math.max(...FISH_TYPES.map((fish) => fish.cost))
  },
  decorMap: new Map(),
  backgroundMap: new Map(),
  tankMap: new Map(),
  gravelMap: new Map(),
  bubbleMap: new Map(),
  images: new Map(),
  imageLoadPromises: new Map(),
  imageLoadFailures: new Map(),
  imageRecoveryNextAt: new Map(),
  activeTankAssetLoadGeneration: 0,
  tankSwitchTransitionActive: false,
  tankSwitchTransitionElement: null,
  tankSwitchTransitionToken: 0,
  cloudUploadPromise: null,
  cloudUploadQueued: false,
  missingFishImageWarnings: new Set(),
  pendingFishPurchases: new Set(),
  alphaMaskCache: new Map(),
  bubblerSpoutOriginCache: new Map(),
  maskRegionCache: new Map(),
  caveInteriorMaskCache: new Map(),
  caveShellMaskCache: new Map(),
  caveTriggerMaskCache: new Map(),
  caveNavCache: new Map(),
  activeFishCavePlans: new Map(),
  fishActionSteeringByFishId: new Map(),
  fishActionQueuesByFishId: new Map(),
  fishActionQueueCollapsedFishIds: new Set(),
  fishBreedingSequence: null,
  gravelTintCache: new Map(),
  caveTintCache: new Map(),
  bubblerLightTintCache: new Map(),
  caveSourceStats: new Map(),
  bubbleOrbTintCache: new Map(),
  customGravelTintCache: new Map(),
  foodPelletTintCache: new Map(),
  waterParticleTintCache: new Map(),
  imageSourceId: 0,
  gravelSourceStats: new Map(),
  customGravelTopLayerCacheKey: "",
  customGravelTopLayerCanvas: null,
  gravelBedCacheKey: "",
  gravelBedCanvas: null,
  gravelCapCanvas: null,
  scrubMaskCanvas: document.createElement("canvas"),
  grimeBaseCanvas: document.createElement("canvas"),
  grimeBaseCacheKey: "",
  fishShadowPlaneCache: new Map(),
  fishLayerDepthScaleTransitions: new Map(),
  diseaseGreenBubblesByFishId: new Map(),
  debugBehaviorSteeringByFishId: new Map(),
  debugForcedOtocinclusStateByFishId: new Map(),
  fishGravelPebbleActions: new Map(),
  fishPebbleTosses: [],
  forcedGravelDigUntilByFishId: new Map(),
  gravelDigBursts: [],
  sedimentClouds: [],
  effectClouds: [],
  coinGlints: [],
  waterParticles: [],
  waterParticleTankId: null,
  waterAtmosphereStreakSprite: null,
  waterEffectFishSamples: new Map(),
  renderedMarkup: Object.create(null),
  renderedDataKeys: Object.create(null),
  lastGrimeCanvasFilter: "",
  lastTankCanvasFilter: "",
  toastHandle: null,
  toastKey: "",
  guidanceToastOwner: "",
  guidanceHintOwner: "",
  saveStateWarningShown: false,
  lastAnimationFrameAt: 0,
  lastAnimationUpdateAt: 0,
  debugToolsEnabled: false,
  debugSidebarOpen: false,
  debugFishBehaviorPreviewOpen: false,
  debugFishBehaviorPreviewSpeciesId: "",
  debugFishBehaviorPreviewBehaviorId: "turn-around",
  debugFishBehaviorPreviewStartedAt: 0,
  debugFishBehaviorPreviewFrame: 0,
  debugFishBehaviorPreviewFish: null,
  debugFishBehaviorPreviewLoadToken: 0,
  debugDecorPreviewOpen: false,
  debugDecorPreviewDecorKey: "",
  debugDecorPreviewItem: null,
  debugDecorPreviewFrame: 0,
  debugDecorPreviewLoadToken: 0,
  debugDecorPreviewScalePercent: 100,
  debugDecorPreviewPointerId: null,
  debugDecorPreviewDragOffsetX: 0,
  debugDecorPreviewDragOffsetY: 0,
  debugDecorPreviewTransform: null,
  debugDecorPreviewSnapped: true,
  aspectRatioLocked: FIXED_16_9_ASPECT_RATIO,
  hiddenKeySequenceBuffer: "",
  debugBreedingSequence: null,
  debugFishBehaviorLog: [],
  debugFishBehaviorSignatures: new Map(),
  lastTankPoint: null,
  viewportMetrics: {
    orientation: "",
    width: 0,
    height: 0,
    stableHeight: 0
  },
  layoutRatioLockActive: false,
  layoutRatioLockWidth: 0,
  layoutRatioLockHeight: 0,
  layoutRatioLockScale: 1,
  portablePerformanceActive: null,
  resizeObserver: null,
  wallpaperEngineFpsLimit: wallpaperEngineGeneralPropertyState.fps,
  wallpaperEngineFpsCarrySeconds: 0,
  wallpaperEnginePaused: wallpaperEnginePlaybackState.paused,
  ambienceAudio: null,
  ambienceAudioChannels: [],
  ambienceAudioActiveIndex: 0,
  ambienceAudioResumeHandler: null,
  ambienceAudioResumeEventsBound: false,
  ambienceAudioFadeFrame: 0,
  ambienceAudioCrossfadeFrame: 0,
  ambienceAudioCrossfade: null,
  activeSoundEffects: new Set(),
  submarineSonarAudio: null,
  soundEffectAudioContext: null,
  soundEffectPools: new Map(),
  soundEffectPoolIndices: new Map(),
  soundEffectsPrimed: false,
  soundEffectsResumeHandler: null,
  soundEffectsResumeEventsBound: false,
  lastFishSplashSoundPath: "",
  lastMedicineDropSoundPath: "",
  lastGlassKnockSoundPath: "",
  scrubWipeSoundDirectionKey: "",
  scrubWipeSoundBankIndex: 0,
  lastScrubWipeSoundPath: "",
  lastScrubWipeSoundAt: 0,
  splashBursts: [],
  glassTapEffects: [],
  fallingGravelPebbles: [],
  bloodWaterTint: 0,
  chumBloodCloudAtByPelletId: new Map(),
  bettaPassLocks: new Set(),
  gravelStateDirty: false,
  decorHangoutZonesKey: "",
  decorHangoutZones: [],
  activeGravelPaletteSlot: 0,
  decorPlacementLayer: DEFAULT_TANK_LAYER,
  layerLimitPulseLayer: null,
  layerLimitPulseStartedAt: 0,
  layerLimitPulseUntil: 0,
  debugNightCaveMode: false,
  debugForcedCaveFishId: null,
  debugForcedCaveDecorId: null,
  collapsedSections: {
    fishTank: true,
    fishDead: true,
    fishStorage: true,
    decorPlaced: true,
    decorStorage: true,
    decorBackgrounds: true,
    decorTankShell: true,
    decorLighting: true,
    decorGravel: true,
    decorCustomGravel: true
  },
  scene: null
};
runtimeInitialized = true;

const EDIT_TRAY_LONG_PRESS_MS = 450;
const EDIT_TRAY_LONG_PRESS_MOVE_PX = 16;
const EDIT_TRAY_CONTEXT_MENU_GUTTER_PX = 10;

let state = null;


const CUSTOM_ASSET_PENDING_RUNTIME_KEYS = Object.freeze({
  decor: "pendingCustomDecorUpload",
  hide: "pendingCustomHideUpload",
  fish: "pendingCustomFishUpload"
});


const CUSTOM_ASSET_EDITOR_OVERLAY_CONFIGS = Object.freeze({
  decor: {
    pendingStateKey: getCustomAssetPendingStateKey("decor"),
    overlayMode: "custom-decor-name",
    inputSelector: "[data-custom-decor-name-input]",
    afterOpen: () => updatePendingCustomDecorPreview()
  },
  hide: {
    pendingStateKey: getCustomAssetPendingStateKey("hide"),
    overlayMode: "custom-hide-create",
    inputSelector: "[data-custom-hide-name-input]",
    afterOpen: () => updatePendingCustomHidePreview()
  },
  fish: {
    pendingStateKey: getCustomAssetPendingStateKey("fish"),
    overlayMode: "custom-fish-create",
    inputSelector: "[data-custom-fish-name-input]",
    afterOpen: () => updatePendingCustomFishPreview()
  }
});


const TUTORIAL_TOOLBAR_CONTROL_IDS = Object.freeze([
  "openStoreButton",
  "editModeDockButton",
  "feedButton",
  "fishEditModeDockButton",
  "openEquipmentButton",
  "openSettingsButton",
  "careTaskPaneButton",
  "spongeButton",
  "scoopButton",
  "overviewButton"
]);

const TUTORIAL_TOOLBAR_BLOCK_MESSAGES = Object.freeze({
  openStoreButton: "Finish this task first.",
  editModeDockButton: "Decoration comes next.",
  feedButton: "Feeding comes next.",
  fishEditModeDockButton: "Available after the tutorial.",
  openEquipmentButton: "Available after the tutorial.",
  openSettingsButton: "Available after the tutorial.",
  careTaskPaneButton: "Available after the tutorial.",
  spongeButton: "Cleaning comes next.",
  scoopButton: "Use the sponge here.",
  overviewButton: "Available after the tutorial."
});


const TUTORIAL_FEATURE_STEP_DEFS = Object.freeze({});

const TUTORIAL_TASK_ADOPT_FISH = "adopt-fish";
const TUTORIAL_TASK_PLACE_DECORATION = "place-decoration";
const TUTORIAL_TASK_FEED_FISH = "feed-fish";
const TUTORIAL_TASK_CLEAN_TANK = "clean-tank";
const TUTORIAL_TASK_DEFS = Object.freeze({
  [TUTORIAL_TASK_ADOPT_FISH]: {
    id: TUTORIAL_TASK_ADOPT_FISH,
    label: "Adopt A Fish"
  },
  [TUTORIAL_TASK_PLACE_DECORATION]: {
    id: TUTORIAL_TASK_PLACE_DECORATION,
    label: "Place A Decoration"
  },
  [TUTORIAL_TASK_FEED_FISH]: {
    id: TUTORIAL_TASK_FEED_FISH,
    label: "Feed Your Fish"
  },
  [TUTORIAL_TASK_CLEAN_TANK]: {
    id: TUTORIAL_TASK_CLEAN_TANK,
    label: "Clean The Tank"
  }
});

const TUTORIAL_CORE_TOOLBAR_BUTTON_IDS = Object.freeze([
  "openStoreButton",
  "editModeDockButton",
  "feedButton",
  "spongeButton"
]);
const TUTORIAL_REVEAL_TOOLBAR_BUTTON_IDS = Object.freeze([
  "scoopButton",
  "fishEditModeDockButton",
  "openEquipmentButton",
  "openSettingsButton",
  "openManagementButton",
  "careTaskPaneButton",
  "medicineButton",
  "tipsButton",
  "toggleMouseLockButton"
]);
const TUTORIAL_ALL_TOOLBAR_BUTTON_IDS = Object.freeze([
  ...TUTORIAL_CORE_TOOLBAR_BUTTON_IDS,
  ...TUTORIAL_REVEAL_TOOLBAR_BUTTON_IDS
]);


const TUTORIAL_STAGE_DEFS = Object.freeze({
  [TUTORIAL_STAGE_SPLASH]: {
    id: TUTORIAL_STAGE_SPLASH,
    popup: () => ({ mode: "splash" }),
    ui: () => createTutorialUiStateConfig({ toolbarVisible: false, displayVisible: false }),
    toolbar: () => createTutorialToolbarConfig([]),
    advance: {
      type: "timeout",
      onSync(ctx) {
        if (dom.loadingOverlay && !dom.loadingOverlay.hidden) {
          return false;
        }
        return createTutorialTimedAdvance(TUTORIAL_SPLASH_DURATION_MS, TUTORIAL_STAGE_ADOPT_FISH).onSync(ctx);
      }
    },
    resume: () => false
  },
  [TUTORIAL_STAGE_ADOPT_FISH]: {
    id: TUTORIAL_STAGE_ADOPT_FISH,
    popup: () => createTutorialTaskPopup(TUTORIAL_TASK_ADOPT_FISH),
    ui: () => createTutorialUiStateConfig({
      visibleButtons: ["openStoreButton"],
      pulseButtons: ["openStoreButton"]
    }),
    store: (ctx) => ({
      allowedTabs: new Set(["fish"]),
      preferredTab: "fish",
      blockCloseWithSkipConfirm: ctx.isGuided,
      restrictions: {
        fish: createTutorialStoreRestrictionConfig(ctx.isInfoOnly)
      },
      open() {
        openStoreOverlay("fish");
        return true;
      }
    }),
    toolbar: () => createTutorialToolbarConfig(["openStoreButton"]),
    resume: () => false
  },
  [TUTORIAL_STAGE_ADOPT_FISH_DONE]: {
    id: TUTORIAL_STAGE_ADOPT_FISH_DONE,
    popup: () => createTutorialTaskPopup(TUTORIAL_TASK_ADOPT_FISH, true),
    ui: () => createTutorialUiStateConfig({
      visibleButtons: ["openStoreButton"]
    }),
    toolbar: () => createTutorialToolbarConfig([]),
    advance: createTutorialTimedAdvance(TUTORIAL_TASK_COMPLETE_DELAY_MS, TUTORIAL_STAGE_PLACE_DECORATION),
    resume: () => false
  },
  [TUTORIAL_STAGE_PLACE_DECORATION]: {
    id: TUTORIAL_STAGE_PLACE_DECORATION,
    popup: () => createTutorialTaskPopup(TUTORIAL_TASK_PLACE_DECORATION),
    ui: (ctx) => {
      const hasDecor = Boolean(ctx.tutorial?.decorKey);
      const editModeOpen = runtime.editTankMode === true;
      return createTutorialUiStateConfig({
        visibleButtons: hasDecor ? ["openStoreButton", "editModeDockButton"] : ["openStoreButton"],
        pulseButtons: hasDecor && !editModeOpen ? ["editModeDockButton"] : (!hasDecor ? ["openStoreButton"] : []),
        pulseDecorKey: hasDecor && editModeOpen ? ctx.tutorial.decorKey : ""
      });
    },
    store: (ctx) => ({
      allowedTabs: new Set(["decor"]),
      preferredTab: "decor",
      blockCloseWithSkipConfirm: ctx.isGuided,
      restrictions: {
        decor: createTutorialStoreRestrictionConfig(ctx.isInfoOnly)
      },
      open() {
        openStoreOverlay("decor");
        return true;
      }
    }),
    toolbar: (ctx) => createTutorialToolbarConfig(ctx.tutorial?.decorKey
      ? ["openStoreButton", "editModeDockButton"]
      : ["openStoreButton"]),
    resume: () => false
  },
  [TUTORIAL_STAGE_PLACE_DECORATION_DONE]: {
    id: TUTORIAL_STAGE_PLACE_DECORATION_DONE,
    popup: () => createTutorialTaskPopup(TUTORIAL_TASK_PLACE_DECORATION, true),
    ui: () => createTutorialUiStateConfig({
      visibleButtons: ["openStoreButton", "editModeDockButton"]
    }),
    toolbar: () => createTutorialToolbarConfig(["editModeDockButton"]),
    advance: createTutorialTimedAdvance(
      TUTORIAL_TASK_COMPLETE_DELAY_MS,
      TUTORIAL_STAGE_FEED_FISH,
      (ctx) => ctx.isGuided ? grantTutorialBasicFoodReward(ctx.now) : false
    ),
    resume: () => false
  },
  [TUTORIAL_STAGE_FEED_FISH]: {
    id: TUTORIAL_STAGE_FEED_FISH,
    popup: () => createTutorialTaskPopup(TUTORIAL_TASK_FEED_FISH),
    ui: () => createTutorialUiStateConfig({
      visibleButtons: ["openStoreButton", "editModeDockButton", "feedButton"],
      pulseButtons: runtime.editTankMode ? ["editModeDockButton"] : (runtime.foodTrayOpen ? [] : ["feedButton"]),
      pulseFoodKey: runtime.foodTrayOpen ? TUTORIAL_BASIC_FOOD_KEY : ""
    }),
    toolbar: () => createTutorialToolbarConfig(runtime.editTankMode
      ? ["editModeDockButton", "feedButton"]
      : ["feedButton"]),
    resume: (ctx) => resumeTutorialFoodState(ctx.tutorial, ctx.now)
  },
  [TUTORIAL_STAGE_FEED_FISH_DONE]: {
    id: TUTORIAL_STAGE_FEED_FISH_DONE,
    popup: () => createTutorialTaskPopup(TUTORIAL_TASK_FEED_FISH, true),
    ui: () => createTutorialUiStateConfig({
      visibleButtons: ["openStoreButton", "editModeDockButton", "feedButton"]
    }),
    toolbar: () => createTutorialToolbarConfig([]),
    advance: {
      type: "timeout",
      onSync(ctx) {
        if (ctx.elapsed < TUTORIAL_POST_FEED_DELAY_MS) {
          return false;
        }
        let changed = false;
        if (ctx.isGuided) {
          changed = forceTutorialPoopScenario(ctx.now) || changed;
        }
        return ctx.setStage(TUTORIAL_STAGE_CLEAN_TANK) || changed;
      }
    },
    resume: () => false
  },
  [TUTORIAL_STAGE_CLEAN_TANK]: {
    id: TUTORIAL_STAGE_CLEAN_TANK,
    popup: () => createTutorialTaskPopup(TUTORIAL_TASK_CLEAN_TANK),
    ui: () => createTutorialUiStateConfig({
      visibleButtons: ["openStoreButton", "editModeDockButton", "feedButton", "spongeButton"],
      pulseButtons: ["spongeButton"]
    }),
    toolbar: () => createTutorialToolbarConfig(["spongeButton"]),
    resume: () => false
  },
  [TUTORIAL_STAGE_CLEAN_TANK_DONE]: {
    id: TUTORIAL_STAGE_CLEAN_TANK_DONE,
    popup: () => createTutorialTaskPopup(TUTORIAL_TASK_CLEAN_TANK, true),
    ui: () => createTutorialUiStateConfig({
      visibleButtons: ["openStoreButton", "editModeDockButton", "feedButton", "spongeButton"]
    }),
    toolbar: () => createTutorialToolbarConfig([]),
    advance: createTutorialTimedAdvance(TUTORIAL_TASK_COMPLETE_DELAY_MS, TUTORIAL_STAGE_TOOLBAR_REVEAL),
    resume: () => false
  },
  [TUTORIAL_STAGE_TOOLBAR_REVEAL]: {
    id: TUTORIAL_STAGE_TOOLBAR_REVEAL,
    popup: () => null,
    ui: (ctx) => {
      const revealButtons = getTutorialRevealButtonIds(ctx);
      return createTutorialUiStateConfig({
        visibleButtons: [
          ...TUTORIAL_CORE_TOOLBAR_BUTTON_IDS,
          ...revealButtons
        ],
        revealButtons
      });
    },
    toolbar: () => createTutorialToolbarConfig(TUTORIAL_ALL_TOOLBAR_BUTTON_IDS),
    advance: {
      type: "timeout",
      onSync(ctx) {
        const revealDuration = TUTORIAL_REVEAL_TOOLBAR_BUTTON_IDS.length * TUTORIAL_TOOLBAR_REVEAL_STEP_MS
          + TUTORIAL_TOOLBAR_REVEAL_SETTLE_MS;
        if (ctx.elapsed < revealDuration) {
          return false;
        }
        finishTutorial();
        return true;
      }
    },
    resume: () => false
  },
});


const scrubMaskContext = runtime.scrubMaskCanvas.getContext("2d");
const grimeBaseContext = runtime.grimeBaseCanvas.getContext("2d");

runtime.scrubMaskCanvas.width = TANK_WIDTH;
runtime.scrubMaskCanvas.height = TANK_HEIGHT;
runtime.grimeBaseCanvas.width = TANK_WIDTH;
runtime.grimeBaseCanvas.height = TANK_HEIGHT;
configureCanvasContext(tankContext);
configureCanvasContext(grimeContext);
configureCanvasContext(glassContext);
configureCanvasContext(scrubMaskContext);
configureCanvasContext(grimeBaseContext);

init().catch((error) => {
  console.error(error);
  showToast("The aquarium hit a snag while loading.");
  showLoadingOverlayError(error);
});


const CUSTOM_ASSET_TYPES = Object.freeze({
  decor: {
    type: "decor",
    label: "Custom Decor",
    cost: CUSTOM_DECOR_COST,
    pendingStateKey: "pendingCustomDecorUpload",
    failureToast: "Could not use that image.",
    pickerSteps: {
      primary: {
        inputKey: "localDecorInput",
        unavailableMessage: "Custom decor picker unavailable.",
        importStep: async ({ file }) => {
          const dataUrl = await prepareLocalDecorImageDataUrl(file);
          await preloadImages([dataUrl]);
          const image = runtime.images.get(dataUrl) || await loadImageElement(dataUrl);
          openCustomDecorNameOverlay(dataUrl, titleFromFile(file.name || "Custom Decor"), {
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height
          });
        }
      }
    },
    validatePending(pending) {
      if (!pending?.dataUrl) {
        return { ok: false, message: "Choose an image for Custom Decor first." };
      }
      const rawName = String(pending.name || "").replace(/\s+/g, " ").trim();
      if (!rawName) {
        return {
          ok: false,
          message: "Name your custom decor first.",
          focusSelector: "[data-custom-decor-name-input]"
        };
      }
      return { ok: true, rawName };
    },
    async save({ pending, now }) {
      const rawName = String(pending.name || "").replace(/\s+/g, " ").trim();
      const name = sanitizeCustomDecorName(rawName);
      const storedImage = await storeCustomImageDataUrl(pending.dataUrl, "custom-decor");
      await preloadImages([storedImage.runtimeUrl || storedImage.dataUrl]);
      const decorKey = `${CUSTOM_DECOR_KEY_PREFIX}${createId("asset")}`;
      const asset = sanitizeCustomDecorAssetEntry({
        key: decorKey,
        name,
        path: storedImage.dataUrl,
        imageRefId: storedImage.imageRefId,
        width: pending.width,
        defaultScale: 1,
        motionType: pending.motionType,
        motionSplitY: pending.motionSplitY,
        motionSwaySide: pending.motionSwaySide,
        motionIntensity: pending.motionIntensity,
        createdAt: now
      }, decorKey);
      if (!asset) {
        showToast("Could not create that custom decor.");
        return false;
      }
      setRuntimeImageSource(asset, "runtimePath", storedImage.runtimeUrl);
      state.coins -= CUSTOM_DECOR_COST;
      recordWalletTransaction({ amount: CUSTOM_DECOR_COST, direction: "debit", now, place: "BubbleBodega", label: `Created custom decor ${asset.name}.` });
      if (!state.customDecorAssets || typeof state.customDecorAssets !== "object") {
        state.customDecorAssets = {};
      }
      state.customDecorAssets[asset.key] = asset;
      syncRuntimeCustomDecorAssetsFromState(state);
      state.decorInventory[asset.key] = (state.decorInventory[asset.key] || 0) + 1;
      return finalizeCustomAssetCreation("decor", {
        now,
        eventText: `Created custom decor ${asset.name}.`,
        toastText: `${asset.name} saved. Custom decor created and waiting in storage.`
      });
    }
  },
  hide: {
    type: "hide",
    label: "Custom Hide",
    cost: CUSTOM_HIDE_COST,
    pendingStateKey: "pendingCustomHideUpload",
    failureToast: "Could not use that image.",
    pickerSteps: {
      front: {
        inputKey: "localHideFrontInput",
        unavailableMessage: "Custom hide picker unavailable.",
        importStep: async ({ file }) => {
          const dataUrl = await prepareLocalDecorImageDataUrl(file);
          await preloadImages([dataUrl]);
          const image = runtime.images.get(dataUrl) || await loadImageElement(dataUrl);
          const pending = buildPendingCustomHideUpload({
            frontDataUrl: dataUrl,
            frontName: titleFromFile(file.name || "Custom Hide"),
            frontNaturalWidth: Math.max(1, image.naturalWidth || image.width || CUSTOM_DECOR_DEFAULT_WIDTH),
            frontNaturalHeight: Math.max(1, image.naturalHeight || image.height || CUSTOM_DECOR_DEFAULT_WIDTH)
          });
          showToast(pending.bgDataUrl ? "Front image updated." : "Front image selected. Choose a background image for the hide.");
          openCustomHideCreationOverlay(pending);
        },
        onError: (error) => {
          showToast(error?.message || "Could not use that front image.");
        }
      },
      background: {
        inputKey: "localHideBackgroundInput",
        checkCost: false,
        unavailableMessage: "Custom hide background picker unavailable.",
        importStep: async ({ file }) => {
          const pending = runtime.pendingCustomHideUpload;
          if (!pending?.frontDataUrl) {
            showToast("Choose a front image for Custom Hide first.");
            openCustomHideCreationOverlay();
            return;
          }
          const dataUrl = await prepareLocalDecorImageDataUrl(file);
          await preloadImages([pending.frontDataUrl, dataUrl]);
          const image = runtime.images.get(dataUrl) || await loadImageElement(dataUrl);
          const nextPending = buildPendingCustomHideUpload({
            ...pending,
            bgDataUrl: dataUrl,
            bgNaturalWidth: Math.max(1, image.naturalWidth || image.width || CUSTOM_DECOR_DEFAULT_WIDTH),
            bgNaturalHeight: Math.max(1, image.naturalHeight || image.height || CUSTOM_DECOR_DEFAULT_WIDTH),
            suggestedName: pending.frontName || titleFromFile(file.name || "Custom Hide")
          });
          showToast("Background image selected.");
          openCustomHideCreationOverlay(nextPending);
        },
        onError: (error) => {
          showToast(error?.message || "Could not use that background image.");
        }
      }
    },
    validatePending(pending) {
      if (!pending?.frontDataUrl || !pending?.bgDataUrl) {
        return { ok: false, message: "Choose both images for Custom Hide first." };
      }
      const rawName = String(pending.name || "").replace(/\s+/g, " ").trim();
      if (!rawName) {
        return {
          ok: false,
          message: "Name your custom hide first.",
          focusSelector: "[data-custom-hide-name-input]"
        };
      }
      return { ok: true, rawName };
    },
    async save({ pending, now }) {
      const name = sanitizeCustomDecorName(String(pending.name || "").replace(/\s+/g, " ").trim(), "Custom Hide");
      const [frontImage, backgroundImage] = await Promise.all([
        storeCustomImageDataUrl(pending.frontDataUrl, "custom-hide-front"),
        storeCustomImageDataUrl(pending.bgDataUrl, "custom-hide-background")
      ]);
      await preloadImages([
        frontImage.runtimeUrl || frontImage.dataUrl,
        backgroundImage.runtimeUrl || backgroundImage.dataUrl
      ]);
      const decorKey = `${CUSTOM_HIDE_KEY_PREFIX}${createId("asset")}`;
      const asset = sanitizeCustomDecorAssetEntry({
        key: decorKey,
        customType: "hide",
        name,
        path: frontImage.dataUrl,
        imageRefId: frontImage.imageRefId,
        bgPath: backgroundImage.dataUrl,
        bgImageRefId: backgroundImage.imageRefId,
        width: pending.width,
        defaultScale: pending.scale,
        caveSettings: pending.caveSettings,
        caveColorSettings: pending.caveColorSettings,
        createdAt: now
      }, decorKey);
      if (!asset) {
        showToast("Could not create that custom hide.");
        return false;
      }
      setRuntimeImageSource(asset, "runtimePath", frontImage.runtimeUrl);
      setRuntimeImageSource(asset, "runtimeBgPath", backgroundImage.runtimeUrl);
      state.coins -= CUSTOM_HIDE_COST;
      recordWalletTransaction({ amount: CUSTOM_HIDE_COST, direction: "debit", now, place: "BubbleBodega", label: `Created custom hide ${asset.name}.` });
      if (!state.customDecorAssets || typeof state.customDecorAssets !== "object") {
        state.customDecorAssets = {};
      }
      state.customDecorAssets[asset.key] = asset;
      syncRuntimeCustomDecorAssetsFromState(state);
      state.decorInventory[asset.key] = (state.decorInventory[asset.key] || 0) + 1;
      return finalizeCustomAssetCreation("hide", {
        now,
        eventText: `Created custom hide ${asset.name}.`,
        toastText: `${asset.name} saved. Custom hide created and waiting in storage.`
      });
    }
  },
  fish: {
    type: "fish",
    label: "Engineered Aquatic Specimen",
    cost: CUSTOM_FISH_COST,
    pendingStateKey: "pendingCustomFishUpload",
    failureToast: "Could not use that image.",
    pickerSteps: {
      primary: {
        inputKey: "localFishInput",
        unavailableMessage: "Custom fish picker unavailable.",
        importStep: async ({ file }) => {
          const dataUrl = await prepareLocalFishImageDataUrl(file);
          const image = await loadImageElement(dataUrl);
          await preloadImages([dataUrl]);
          openCustomFishCreationOverlay(dataUrl, titleFromFile(file.name || "Custom Fish"), {
            width: image.naturalWidth || image.width || CUSTOM_FISH_DEFAULT_WIDTH,
            height: image.naturalHeight || image.height || CUSTOM_FISH_DEFAULT_WIDTH
          });
        }
      }
    },
    validatePending(pending) {
      if (!pending?.dataUrl) {
        return { ok: false, message: "Choose an image for Custom Fish first." };
      }
      const rawName = String(pending.name || "").replace(/\s+/g, " ").trim();
      if (!rawName) {
        return {
          ok: false,
          message: "Name your custom fish type first.",
          focusSelector: "[data-custom-fish-name-input]"
        };
      }
      if (!normalizeCustomFishBehaviorProfileId(pending.behaviorProfileId)) {
        return {
          ok: false,
          message: "Choose a fish behavior first.",
          focusSelector: "[data-custom-fish-behavior-select]"
        };
      }
      return { ok: true, rawName };
    },
    async save({ pending, now }) {
      const outputDataUrl = await getPendingCustomFishOutputDataUrl(pending);
      const storedImage = await storeCustomImageDataUrl(outputDataUrl || pending.dataUrl, "custom-fish");
      await preloadImages([storedImage.runtimeUrl || storedImage.dataUrl]);
      const speciesKey = `${CUSTOM_FISH_KEY_PREFIX}${createId("species")}`;
      const asset = sanitizeCustomFishAssetEntry({
        key: speciesKey,
        name: sanitizeCustomFishName(String(pending.name || "").replace(/\s+/g, " ").trim()),
        path: storedImage.dataUrl,
        imageRefId: storedImage.imageRefId,
        width: pending.width,
        behaviorProfileId: pending.behaviorProfileId,
        diet: normalizeCustomFishDiet(pending.diet),
        activityRegulation: normalizeCustomFishActivityRegulation(pending.activityRegulation),
        swimZone: normalizeCustomFishSwimZone(pending.swimZone),
        socialAffinity: normalizeCustomFishSocialAffinity(pending.socialAffinity),
        liveBirth: pending.liveBirth === true,
        turnAnimation: String(pending.turnAnimation || "").trim().toLowerCase() === "complex" ? "complex" : "simple",
        createdAt: now
      }, speciesKey);
      if (!asset) {
        showToast("Could not create that custom fish.");
        return false;
      }
      setRuntimeImageSource(asset, "runtimePath", storedImage.runtimeUrl);
      const activeDesignOrderId = String(runtime.activeEngineeredSpecimenOrderId || "").trim();
      const designCredit = Boolean(
        activeDesignOrderId
        && getEngineeredAquaticSpecimenOrderStatus(activeDesignOrderId) === "specimen-configured"
      );
      if (!designCredit) {
        state.coins -= CUSTOM_FISH_COST;
        recordWalletTransaction({ amount: CUSTOM_FISH_COST, direction: "debit", now, place: "BubbleBodega", label: `Created custom fish ${asset.name}.` });
      }
      if (!state.customFishAssets || typeof state.customFishAssets !== "object") {
        state.customFishAssets = {};
      }
      state.customFishAssets[asset.key] = asset;
      syncRuntimeCustomFishAssetsFromState(state);
      const fish = createFishRecord(asset.key, {
        now,
        name: asset.name,
        behaviorSpeciesId: asset.behaviorProfileId,
        scale: DEFAULT_FISH_SCALE,
        entryStartedAt: now,
        entryDurationMs: FISH_ENTRY_DURATION_MS,
        entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
      });
      if (!fish) {
        delete state.customFishAssets[asset.key];
        syncRuntimeCustomFishAssetsFromState(state);
        if (!designCredit) {
          state.coins = Math.min(MAX_WALLET_COINS, state.coins + CUSTOM_FISH_COST);
          recordWalletTransaction({ amount: CUSTOM_FISH_COST, direction: "credit", now, place: "Bubble Borough", label: `Refunded custom fish ${asset.name}.` });
        }
        showToast("Could not add that custom fish to the tank.");
        return false;
      }
      addFishToTank(fish, now);
      if (designCredit) {
        if (!markEngineeredAquaticSpecimenDesigned(activeDesignOrderId)) {
          delete state.customFishAssets[asset.key];
          syncRuntimeCustomFishAssetsFromState(state);
          state.fish = state.fish.filter((entry) => entry.id !== fish.id);
          showToast("This Proteus commission could not be fulfilled because its order state changed.");
          return false;
        }
        runtime.proteusDesignerCompleting = true;
      }
      maybeSeedNewFishDiseaseCarrier(fish, now);
      if (!isMealFreeFish(fish) && canFoodSatisfyFishMeal(fish, "basic")) {
        setFishNeedValue(fish, "hunger", 82, now);
        fish.lastAteAt = now;
      }
      if (!designCredit) recordBubbleBodegaOrder([{
          key: CUSTOM_FISH_SHOP_KEY,
          name: "Engineered Aquatic Specimen",
          category: "fish",
          image: CUSTOM_FISH_SHOP_IMAGE,
          seller: "Proteus Biodyne",
          cost: CUSTOM_FISH_COST,
          quantity: 1
        }]);
      const finalized = finalizeCustomAssetCreation("fish", {
        now,
        eventText: `Created custom fish ${asset.name}.`,
        toastText: designCredit ? "" : `${asset.name} created and added to the tank.`
      });
      if (finalized && designCredit) {
        completeProteusDesignerFlow(activeDesignOrderId);
      }
      return finalized;
    }
  }
});


const DECOR_SETTINGS_UTILITY_MODE_HANDLERS = Object.freeze({
  onBodyClick: handleCaveSettingsUtilityOverlayBodyClick,
  onBodyPointerDown: handleCaveSettingsUtilityOverlayPointerDown,
  onBodyPointerMove: handleCaveSettingsUtilityOverlayPointerMove,
  onBodyPointerUp: handleCaveSettingsUtilityOverlayPointerEnd,
  onBodyPointerCancel: handleCaveSettingsUtilityOverlayPointerEnd,
  onBodyFocusIn: handleCaveSettingsUtilityOverlayFocusIn,
  onBodyInput: handleCommonUtilityOverlayInput,
  onBodyChange: handleCommonUtilityOverlayChange
});


const UTILITY_OVERLAY_MODES = Object.freeze({
  "tutorial-skip-confirm": {
    id: "tutorial-skip-confirm",
    exclusive: true,
    render: renderTutorialSkipConfirmUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-confirm-tutorial-skip]", run: () => advanceIntroTutorial("confirm-skip") },
      { selector: "[data-cancel-tutorial-skip]", run: () => advanceIntroTutorial("cancel-skip") }
    ]),
    onRequestClose: () => {
      cancelTutorialSkipConfirmation();
      return true;
    }
  },
  food: {
    id: "food",
    exclusive: true,
    render: () => ({
      kicker: "Feeding",
      title: "Food Inventory",
      body: renderFoodInventoryOverlay(),
      footer: `<div class="mini-note">Select a food, then click inside the tank to drop one piece at a time.</div>`,
      closable: true
    }),
    onBodyClick: handleFoodUtilityOverlayBodyClick
  },
  "hardware-acceleration": {
    id: "hardware-acceleration",
    exclusive: true,
    render: renderHardwareAccelerationUtilityOverlay,
    onBodyClick: handleHardwareAccelerationUtilityOverlayBodyClick,
    onFooterClick: createUtilityOverlayActionHandler([
      {
        selector: "[data-acknowledge-hardware-acceleration-notice]",
        run: () => acknowledgeHardwareAccelerationNotice()
      },
      {
        selector: "[data-dismiss-hardware-acceleration-notice]",
        run: () => acknowledgeHardwareAccelerationNotice({ dismiss: true })
      }
    ]),
    onRequestClose: () => true
  },
  medicine: {
    id: "medicine",
    exclusive: true,
    render: () => ({
      kicker: "Pharmacy",
      title: "Medicine Inventory",
      body: renderMedicineInventoryOverlay(),
      footer: `<div class="mini-note">Select a medicine, then click the tank to use one dose on the whole tank.</div>`,
      closable: true
    }),
    onBodyClick: handleMedicineUtilityOverlayBodyClick
  },
  "dispenser-reset": {
    id: "dispenser-reset",
    exclusive: true,
    render: renderDispenserResetUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-confirm-dispenser-reset]", run: () => returnAutoDispenserPelletsToInventory() }
    ])
  },
  tips: {
    id: "tips",
    exclusive: true,
    render: () => ({
      kicker: "Care",
      title: "Current Tank Tips",
      body: renderTipsOverlay(),
      footer: "",
      closable: true
    })
  },
  "tank-management": {
    id: "tank-management",
    exclusive: true,
    onOpen: () => {
      runtime.managementHubView = "overview";
      runtime.managementHistoryVisibleCount = MANAGEMENT_HISTORY_PAGE_SIZE;
      resetManagementHistoryFilters();
    },
    render: (ctx) => ({
      kicker: "Aquarium",
      title: ctx.tank ? getTankLabel(ctx.tank) : "Aquarium Info",
      body: buildTankManagementOverlayBody(ctx.now),
      footer: "",
      closable: true
    }),
    onBodyClick: handleTankManagementUtilityOverlayBodyClick,
    onBodyInput: handleTankManagementUtilityOverlayInput,
    onBodyChange: handleTankManagementUtilityOverlayChange,
    onBodyKeyDown: handleTankManagementUtilityOverlayKeyDown
  },
  credits: {
    id: "credits",
    exclusive: true,
    render: renderCreditsUtilityOverlay
  },
  legal: {
    id: "legal",
    exclusive: true,
    onOpen: (ctx, options = {}) => {
      runtime.legalOverlayTab = normalizeLegalOverlayTab(options.tab || "privacy");
    },
    render: renderLegalUtilityOverlay,
    onHeaderClick: handleLegalUtilityOverlayBodyClick,
    onBodyClick: handleLegalUtilityOverlayBodyClick
  },
  "invite-friend": {
    id: "invite-friend",
    exclusive: true,
    render: renderInviteFriendUtilityOverlay,
    onBodyInput: handleInviteFriendUtilityOverlayInput,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-send-friend-invite]", run: (ctx, button) => sendInviteFriendEmails(button) }
    ])
  },
  "bubbler-settings": createPlacedDecorUtilityMode({
    id: "bubbler-settings",
    runtimeKey: "bubblerSettingsDecorId",
    fallbackTitle: "Bubbler Settings",
    getItem: () => getPlacedDecorById(runtime.bubblerSettingsDecorId) || getSelectedPlacedDecor(),
    renderBody: (item) => renderBubblerSettingsOverlay(item)
  }),
  "decor-settings": createPlacedDecorUtilityMode({
    id: "decor-settings",
    runtimeKey: "customDecorSettingsDecorId",
    fallbackTitle: "Decor Settings",
    getItem: () => getPlacedDecorById(runtime.customDecorSettingsDecorId) || getSelectedPlacedDecor(),
    renderBody: (item) => renderDecorSettingsOverlay(item),
    renderTitleActions: (item, decor) => renderDecorSettingsTitleActions(item, decor),
    renderHeaderActions: (item, decor) => renderDecorSettingsHeaderActions(item, decor),
    hideFooter: true,
    handlers: {
      onHeaderClick: handleDecorSettingsUtilityOverlayHeaderClick
    }
  }),
  "custom-decor-settings": createPlacedDecorUtilityMode({
    id: "custom-decor-settings",
    runtimeKey: "customDecorSettingsDecorId",
    fallbackTitle: "Decor Settings",
    getItem: () => getPlacedDecorById(runtime.customDecorSettingsDecorId) || getSelectedPlacedDecor(),
    renderBody: (item) => renderDecorSettingsOverlay(item),
    renderTitleActions: (item, decor) => renderDecorSettingsTitleActions(item, decor),
    renderHeaderActions: (item, decor) => renderDecorSettingsHeaderActions(item, decor),
    hideFooter: true,
    handlers: {
      onHeaderClick: handleDecorSettingsUtilityOverlayHeaderClick
    }
  }),
  "decor-residence": createPlacedDecorUtilityMode({
    id: "decor-residence",
    runtimeKey: "residenceSettingsDecorId",
    kicker: "Residence",
    fallbackTitle: "Assign Residence",
    getItem: () => getPlacedDecorById(runtime.residenceSettingsDecorId) || getSelectedPlacedDecor(),
    renderBody: (item) => renderDecorResidenceAssignmentOverlay(item),
    handlers: {
      onBodyClick: handleDecorResidenceUtilityOverlayBodyClick
    }
  }),
  "fish-buy-confirm": createPendingStateUtilityMode({
    id: "fish-buy-confirm",
    pendingStateKey: "pendingFishAction",
    render: renderFishBuyConfirmUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-confirm-fish-buy-another]", run: () => confirmFishBuyAnother() }
    ])
  }),
  "fish-sell-confirm": createPendingStateUtilityMode({
    id: "fish-sell-confirm",
    pendingStateKey: "pendingFishAction",
    render: renderFishSellConfirmUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-confirm-fish-sell]", run: () => confirmFishSell() }
    ])
  }),
  "decor-buy-confirm": createPendingStateUtilityMode({
    id: "decor-buy-confirm",
    pendingStateKey: "pendingDecorAction",
    render: renderDecorBuyConfirmUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-confirm-decor-buy-another]", run: () => confirmDecorBuyAnother() }
    ])
  }),
  "decor-sell-confirm": createPendingStateUtilityMode({
    id: "decor-sell-confirm",
    pendingStateKey: "pendingDecorAction",
    render: renderDecorSellConfirmUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-confirm-decor-sell]", run: () => confirmDecorSell() }
    ])
  }),
  "custom-decor-name": createPendingStateUtilityMode({
    id: "custom-decor-name",
    pendingStateKey: "pendingCustomDecorUpload",
    render: () => ({
      kicker: "Custom Decor",
      title: "Create Decor",
      body: renderCustomDecorNameOverlay(),
      footer: buildUtilityActionsFooter([
        { label: "Save", attribute: "data-save-custom-decor" },
        { label: "Cancel", variant: "alt", attribute: "data-close-utility" }
      ]),
      closable: true
    }),
    onBodyInput: handleCustomDecorUtilityOverlayInput,
    onBodyChange: handleCommonUtilityOverlayChange,
    onBodyKeyDown: handleCustomDecorUtilityOverlayKeyDown,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-save-custom-decor]", run: () => void savePendingCustomDecorUpload() }
    ])
  }),
  "custom-hide-background": createPendingStateUtilityMode({
    id: "custom-hide-background",
    pendingStateKey: "pendingCustomHideUpload",
    render: () => ({
      kicker: "Custom Hide",
      title: "Choose Background",
      body: renderCustomHideBackgroundPrompt(),
      footer: buildUtilityActionsFooter([
        { label: "Choose Background", attribute: "data-choose-custom-hide-background" },
        { label: "Cancel", variant: "alt", attribute: "data-close-utility" }
      ]),
      closable: true
    }),
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-choose-custom-hide-background]", run: () => openLocalHideBackgroundPicker() }
    ])
  }),
  "custom-hide-create": createPendingStateUtilityMode({
    id: "custom-hide-create",
    pendingStateKey: "pendingCustomHideUpload",
    render: () => ({
      kicker: "Custom Hide",
      title: "Create Hide",
      body: renderCustomHideCreationOverlay(),
      footer: buildUtilityActionsFooter([
        {
          label: "Create Hide",
          attribute: "data-save-custom-hide",
          disabled: !runtime.pendingCustomHideUpload?.frontDataUrl || !runtime.pendingCustomHideUpload?.bgDataUrl
        },
        { label: "Cancel", variant: "alt", attribute: "data-close-utility" }
      ]),
      closable: true
    }),
    ...DECOR_SETTINGS_UTILITY_MODE_HANDLERS,
    onBodyClick: (ctx, target, event) => handleCustomHideUtilityOverlayBodyClick(ctx, target, event) || handleCaveSettingsUtilityOverlayBodyClick(ctx, target, event),
    onBodyInput: (ctx, target, event) => handleCommonUtilityOverlayInput(ctx, target, event) || handleCustomHideUtilityOverlayInput(ctx, target, event),
    onBodyChange: (ctx, target, event) => handleCustomHideUtilityOverlayChange(ctx, target, event) || handleCommonUtilityOverlayChange(ctx, target, event),
    onBodyKeyDown: handleCustomHideUtilityOverlayKeyDown,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-save-custom-hide]", run: () => void savePendingCustomHideUpload() }
    ])
  }),
  "custom-fish-create": createPendingStateUtilityMode({
    id: "custom-fish-create",
    pendingStateKey: "pendingCustomFishUpload",
    render: () => ({
      kicker: "Custom Fish",
      title: "Create Fish",
      body: renderCustomFishCreationOverlay(),
      footer: buildUtilityActionsFooter([
        {
          label: "Create Fish",
          attribute: "data-save-custom-fish"
        },
        { label: "Cancel", variant: "alt", attribute: "data-close-utility" }
      ]),
      closable: true
    }),
    onBodyClick: handleCustomFishUtilityOverlayBodyClick,
    onBodyInput: handleCustomFishUtilityOverlayInput,
    onBodyChange: handleCustomFishUtilityOverlayChange,
    onBodyKeyDown: handleCustomFishUtilityOverlayKeyDown,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-save-custom-fish]", run: () => void savePendingCustomFishUpload() }
    ])
  }),
  "save-export": {
    id: "save-export",
    exclusive: true,
    onClose: () => {
      runtime.pendingSaveExport = null;
    },
    render: () => {
      const exportData = runtime.pendingSaveExport;
      return {
        kicker: "Save Data",
        title: "Save Export",
        body: renderSaveExportOverlay(exportData),
        footer: exportData
          ? renderSaveExportActionsFooter({ doneLabel: "Done" })
          : `<button class="small-button" data-close-utility>Close</button>`,
        closable: true
      };
    },
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-copy-save-export]", run: () => void copyCurrentSaveExportData() },
      {
        selector: "[data-select-save-export]",
        run: () => {
          if (selectSaveExportText()) {
            showToast("Save data selected.");
          }
        }
      },
      { selector: "[data-download-save-export]", run: () => void retrySaveExportDownload() }
    ])
  },
  "external-link": {
    id: "external-link",
    exclusive: true,
    preservePendingState: ["pendingExternalLink"],
    onClose: () => {
      runtime.pendingExternalLink = null;
    },
    render: () => {
      const link = getPendingExternalLink();
      return {
        kicker: "External Link",
        title: "Open Link",
        body: renderExternalLinkOverlay(link),
        footer: link
          ? buildUtilityActionsFooter([
            { label: "Open Link", attribute: "data-open-external-link" },
            { label: "Copy Link", variant: "alt", attribute: "data-copy-external-link" },
            { label: "Cancel", variant: "alt", attribute: "data-close-utility" }
          ])
          : buildUtilityCloseFooter("Close"),
        closable: true
      };
    },
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-open-external-link]", run: () => openPendingExternalLink() },
      { selector: "[data-copy-external-link]", run: () => void copyPendingExternalLink() }
    ])
  },
  "import-confirm": {
    id: "import-confirm",
    exclusive: true,
    render: renderImportConfirmUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      {
        selector: "[data-confirm-import-save]",
        run: () => {
          openImportDataPicker();
          closeUtilityOverlay();
        }
      }
    ])
  },
  "reset-progress-confirm": {
    id: "reset-progress-confirm",
    exclusive: true,
    render: renderResetProgressUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-confirm-reset-progress]", run: () => openUtilityOverlay("reset-progress-save-choice") }
    ])
  },
  "reset-progress-save-choice": {
    id: "reset-progress-save-choice",
    exclusive: true,
    render: renderResetProgressSaveChoiceUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-reset-save-first]", run: () => void prepareResetProgressSaveExport() },
      { selector: "[data-reset-without-saving]", run: () => resetAllProgress() }
    ])
  },
  "reset-progress-save-export": {
    id: "reset-progress-save-export",
    exclusive: true,
    onClose: () => {
      runtime.pendingSaveExport = null;
    },
    render: renderResetProgressSaveExportUtilityOverlay,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-copy-save-export]", run: () => void copyCurrentSaveExportData() },
      {
        selector: "[data-select-save-export]",
        run: () => {
          if (selectSaveExportText()) {
            showToast("Save data selected.");
          }
        }
      },
      { selector: "[data-download-save-export]", run: () => void retrySaveExportDownload() },
      { selector: "[data-reset-after-save-export]", run: () => resetAllProgress() }
    ])
  },
  "daily-bonus": {
    id: "daily-bonus",
    exclusive: true,
    render: () => ({
      kicker: "Daily Recap",
      title: "Recap Summary",
      body: renderDailyBonusOverlay(),
      footer: state.dailyBonus?.available
        ? `<button class="small-button" data-claim-daily-bonus>Claim Bonus</button>`
        : `<button class="small-button" data-close-utility>Close</button>`,
      closable: true
    }),
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-claim-daily-bonus]", run: () => claimDailyBonus() }
    ])
  },
  notifications: {
    id: "notifications",
    exclusive: true,
    onOpen: () => markNotificationCenterRead(),
    render: renderNotificationCenterOverlay,
    onBodyClick: handleNotificationCenterBodyClick,
    onFooterClick: createUtilityOverlayActionHandler([
      { selector: "[data-mark-notifications-read]", run: () => markNotificationCenterRead() },
      { selector: "[data-clear-notifications]", run: () => clearNotificationCenter() }
    ])
  }
});
