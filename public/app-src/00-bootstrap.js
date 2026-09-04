const STORAGE_KEY = "bubble-borough-save-v1";
const SAVE_FILE_FORMAT = "bubble-borough-save";
import {
  ZOMBIE_SKELETON_BEHAVIOR_CONFIG,
  ZOMBIE_SKELETON_COMFORT_PROFILES,
  ZOMBIE_SKELETON_FEATURE_DEFAULT_ENABLED,
  ZOMBIE_SKELETON_FISH_CATALOG_PATH,
  ZOMBIE_SKELETON_PROGRESSION_UNLOCKS,
  canZombieSkeletonPassAttackTarget,
  canZombieSkeletonUsePassAttack,
  getZombieSkeletonEffectiveBehavior,
  isZombieSkeletonAssetFile,
  isZombieSkeletonCatalogSpecies,
  isZombieSkeletonStage,
  isZombieSkeletonUndeadType,
  mergeZombieSkeletonStageAssets,
  usesZombieSkeletonHunterBehavior
} from "./zombie_skeleton_behaviors.js?v=20260427b";
const SAVE_FILE_EXPORT_VERSION = 1;
const STATE_VERSION = 41;
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
const SOFTWARE_RENDERER_PATTERNS = Object.freeze([
  /swiftshader/i,
  /llvmpipe/i,
  /software/i,
  /basic render/i,
  /\bwarp\b/i
]);
let appConfig = DEFAULT_APP_CONFIG;
const DEBUG_MODE = false;
// Toggle this to keep zombie/skeleton fish behavior and assets out of the main catalog.
const ZOMBIE_SKELETON_BEHAVIOR_ENABLED = ZOMBIE_SKELETON_FEATURE_DEFAULT_ENABLED;
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
const DEBUG_UNLOCK_SEQUENCE = "bbtools";
const VIEW_LOCK_SEQUENCE = "viewlock";
const HIDDEN_KEY_SEQUENCE_BUFFER_LENGTH = Math.max(DEBUG_UNLOCK_SEQUENCE.length, VIEW_LOCK_SEQUENCE.length);
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
  { id: "debugBehaviorNightSleepButton", domKey: "debugBehaviorNightSleepButton", action: "night-sleep", icon: "&#127769;", label: "Night Sleep", title: "Debug: Night Sleep" },
  { id: "debugBehaviorNightForageButton", domKey: "debugBehaviorNightForageButton", action: "night-forage", icon: "&#128269;", label: "Night Forage", title: "Debug: Night Forage" },
  { id: "debugBehaviorClearButton", domKey: "debugBehaviorClearButton", action: "clear", icon: "&#8634;", label: "Clear Behavior", title: "Debug: Clear Forced Behavior", extraClass: "wide" }
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
const LIGHTS_OUT_OVERRIDE_AUTO = "auto";
const LIGHTS_OUT_OVERRIDE_ON = "on";
const LIGHTS_OUT_OVERRIDE_OFF = "off";
const LIGHTS_OUT_OVERRIDES = Object.freeze([
  LIGHTS_OUT_OVERRIDE_AUTO,
  LIGHTS_OUT_OVERRIDE_ON,
  LIGHTS_OUT_OVERRIDE_OFF
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
const BEHAVIOR_INTENT_LINGER_MS = 90 * 1000;
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
  "pufferfish": { group: "special-predator", personalities: ["curious", "greedy", "standoffish", "explorer"], rare: ["hunter", "territorial", "sensitive"], predatorDiet: true }
});
const HIDDEN_FISH_OPTION_IDS = new Set(["loach"]);
const FISH_BEHAVIOR_GROUP_VARIATIONS = Object.freeze({
  "open-water-cruiser": ["bold", "explorer", "social", "routine-loving", "curious", "greedy"],
  "slow-graceful": ["display", "gentle", "sensitive", "homebody", "territorial", "routine-loving", "curious"],
  "small-social": ["social", "shy", "follower", "routine-loving", "curious", "nervous"],
  "bottom-cleaner": ["digger", "cleaner", "night-active", "homebody", "curious", "shy"],
  "special-predator": ["hunter", "bold", "curious", "standoffish", "territorial", "greedy"]
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
  "neon-tetra": { mealCoins: 1, unlock: null, needs: ["plants", "school_2_plus"], conflicts: ["betta_present", "aggressive_predator", "large_fish"] },
  "cherry-barb": { mealCoins: 1, unlock: null, needs: ["plants", "school_2_plus"], conflicts: ["betta_present", "aggressive_predator"] },
  "celestial-pearl-danio": { mealCoins: 1, unlock: "first-care", needs: ["plants", "school_2_plus"], conflicts: ["betta_present", "large_fish", "aggressive_predator"] },
  "chili-rasbora": { mealCoins: 1, unlock: null, needs: ["plants", "school_2_plus"], conflicts: ["large_fish", "aggressive_predator", "fast_eater"] },
  "ember-tetra": { mealCoins: 1, unlock: null, needs: ["plants", "school_2_plus"], conflicts: ["large_fish", "aggressive_predator", "fast_eater"] },
  "harlequin-rasbora": { mealCoins: 1, unlock: null, needs: ["open_water", "school_2_plus"], conflicts: ["aggressive_predator", "overcrowded"] },
  "pencilfish": { mealCoins: 1, unlock: null, needs: ["surface_cover", "school_2_plus"], conflicts: ["aggressive_predator", "fast_eater"] },
  "rummy-nose-tetra": { mealCoins: 1, unlock: null, needs: ["open_water", "school_2_plus"], conflicts: ["aggressive_predator", "overcrowded"] },
  "moor-goldfish": { mealCoins: 1, unlock: "first-care", needs: ["open_water", "hardscape"], conflicts: ["sharp_decor", "fin_nipper", "overcrowded"] },
  "otocinclus": { mealCoins: 0, unlock: "first-care", needs: ["seaweed_algae", "plants"], conflicts: ["aggressive_predator", "large_fish"] },
  "molly": { mealCoins: 1, unlock: "first-care", needs: ["seaweed_algae", "open_water"], conflicts: ["aggressive_predator", "overcrowded"] },
  "livebearer": { mealCoins: 1, unlock: "first-care", needs: ["plants", "open_water"], conflicts: ["aggressive_predator", "overcrowded"] },
  "loach": { mealCoins: 1, unlock: "stable-tank", needs: ["cave", "plants"], conflicts: ["sharp_decor", "aggressive_predator"] },
  "swordtail": { mealCoins: 1, unlock: "stable-tank", needs: ["open_water", "plants"], conflicts: ["same_species", "overcrowded"] },
  "betta": { mealCoins: 1, unlock: "stable-tank", needs: ["plants", "cave"], conflicts: ["betta_present", "community_fish", "fin_nipper"] },
  "blue-ram": { mealCoins: 1, unlock: "stable-tank", needs: ["cave", "plants"], conflicts: ["fast_eater", "aggressive_predator"] },
  "piranha": { mealCoins: 1, unlock: "stable-tank", needs: ["open_water", "cave"], conflicts: ["community_fish", "overcrowded"] },
  ...(ZOMBIE_SKELETON_BEHAVIOR_ENABLED ? ZOMBIE_SKELETON_COMFORT_PROFILES : {}),
  "wonder-killifish": { mealCoins: 1, unlock: "happy-habitat", needs: ["surface_cover", "open_water"], conflicts: ["tiny_fish", "surface_crowding"] },
  "rainbowfish": { mealCoins: 1, unlock: "happy-habitat", needs: ["open_water", "school_2_plus"], conflicts: ["overcrowded", "aggressive_predator"] },
  "gourami": { mealCoins: 1, unlock: "happy-habitat", needs: ["surface_cover", "plants"], conflicts: ["betta_present", "fin_nipper"] },
  "discus": { mealCoins: 2, unlock: "master-keeper", needs: ["plants", "driftwood"], conflicts: ["fast_eater", "aggressive_predator"] },
  "angelfish": { mealCoins: 2, unlock: "master-keeper", needs: ["plants", "open_water"], conflicts: ["fin_nipper", "tiny_fish"] },
  "clownfish": { mealCoins: 2, unlock: "marine-curator", needs: ["coral", "cave"], conflicts: ["same_species", "aggressive_predator"] },
  "royal-gramma": { mealCoins: 2, unlock: "marine-curator", needs: ["cave", "hardscape"], conflicts: ["same_species"] },
  "yellow-tang": { mealCoins: 2, unlock: "marine-curator", needs: ["seaweed_algae", "open_water"], conflicts: ["tang_present", "overcrowded"] },
  "blue-tang": { mealCoins: 2, unlock: "marine-curator", needs: ["cave", "seaweed_algae"], conflicts: ["tang_present", "overcrowded"] },
  "pufferfish": { mealCoins: 2, unlock: "marine-curator", needs: ["cave", "hardscape"], conflicts: ["community_fish", "puffer_present"] }
});
const PROGRESSION_MILESTONES = Object.freeze([
  {
    id: "first-care",
    label: "First Care",
    requirement: "Finish a Daily Recap with score 3+.",
    reward: 3,
    unlocks: ["celestial-pearl-danio", "moor-goldfish", "otocinclus", "molly", "livebearer"],
    decorUnlocks: ["floating_swampmoss_1.png", "fishing_lure.png", "rock-arch.png", "treasure-chest_bubbler.png"],
    isMet: (stats) => stats.latestScore >= 3,
    progress: (stats) => [{ value: (Number(stats.latestScore) || 0) / 3, label: `Latest recap score ${Math.max(0, Number(stats.latestScore) || 0)}/3` }]
  },
  {
    id: "stable-tank",
    label: "Stable Tank",
    requirement: "Finish 3 good recaps and keep recent average comfort at 70%+.",
    reward: 8,
    unlocks: ["swordtail", "betta", "blue-ram", "piranha"],
    decorUnlocks: ["driftwood-root.png", "driftwood.png", "moss-bridge.png", "slate-cave.png", "Plane-wreck.png"],
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
    unlocks: ["wonder-killifish", "rainbowfish", "gourami"],
    decorUnlocks: ["Shipwreck.png", "mushroomcoral_seaweed.png", "Castle-Cave.png", "blue_castle_cave.png", "meteor_cave.png", "volcano-1_bubbler.png", "volcano-2_bubbler.png", "__custom-decor-shop__", "__custom-hide-shop__"],
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
    unlocks: ["discus", "angelfish"],
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
    requirement: "Own a saltwater fish, finish 5 good recaps, and go 3 days without a death.",
    reward: 20,
    unlocks: ["clownfish", "royal-gramma", "yellow-tang", "blue-tang", "pufferfish"],
    decorUnlocks: [],
    isMet: (stats) => stats.hasSaltwaterFish && stats.goodRecaps >= 5 && stats.daysSinceLastDeath >= 3,
    progress: (stats) => [
      { value: stats.hasSaltwaterFish ? 1 : 0, label: stats.hasSaltwaterFish ? "Saltwater fish owned" : "Needs a saltwater fish" },
      { value: (Number(stats.goodRecaps) || 0) / 5, label: `Good recaps ${Math.min(Number(stats.goodRecaps) || 0, 5)}/5` },
      { value: (Number(stats.daysSinceLastDeath) || 0) / 3, label: `No-death streak ${Math.min(Number(stats.daysSinceLastDeath) || 0, 3)}/3d` }
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
    requirement: "Keep cleanliness at 95%+ for 7 daily recaps.",
    reward: 12,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.cleanRecapCount95 >= 7,
    progress: (stats) => [{ value: (Number(stats.cleanRecapCount95) || 0) / 7, label: `95%+ clean recaps ${Math.min(Number(stats.cleanRecapCount95) || 0, 7)}/7` }]
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
    requirement: "Keep 5 community-safe fish with 70%+ recent comfort and 3 good recaps.",
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
    requirement: "Own 3 aquariums with at least one healthy fish in each.",
    reward: 20,
    unlocks: [],
    decorUnlocks: [],
    isMet: (stats) => stats.healthyTankCount >= 3,
    progress: (stats) => [{ value: (Number(stats.healthyTankCount) || 0) / 3, label: `Healthy tanks ${Math.min(Number(stats.healthyTankCount) || 0, 3)}/3` }]
  },
  ...(ZOMBIE_SKELETON_BEHAVIOR_ENABLED ? [{
    id: "spooky-keeper",
    label: "Spooky Keeper",
    requirement: "Discover the corpse, zombie, or skeleton care path.",
    reward: 5,
    unlocks: [...ZOMBIE_SKELETON_PROGRESSION_UNLOCKS],
    decorUnlocks: ["gorebag_lure.png", "fishheadeffigy_1.png", "fishheadeffigy_2.png", "fishheadeffigy_3.png"],
    isMet: (stats) => stats.hasSpookyKeeperPath,
    progress: (stats) => [{ value: stats.hasSpookyKeeperPath ? 1 : 0, label: stats.hasSpookyKeeperPath ? "Spooky path found" : "No spooky path discovered yet" }]
  }] : [])
]);
const DECOR_UNLOCK_REQUIREMENTS = Object.freeze({
  "rock-arch.png": "first-care",
  "fishing_lure.png": "first-care",
  "treasure-chest_bubbler.png": "first-care",
  "floating_swampmoss_1.png": "first-care",
  "kelp-cafe.png": "first-care",
  "shell-house.png": "first-care",
  "driftwood-root.png": "stable-tank",
  "driftwood.png": "stable-tank",
  "moss-bridge.png": "stable-tank",
  "slate-cave.png": "stable-tank",
  "Plane-wreck.png": "stable-tank",
  "bubble-plaza.png": "stable-tank",
  "moonstone-grotto.png": "stable-tank",
  "Shipwreck.png": "happy-habitat",
  "mushroomcoral_seaweed.png": "happy-habitat",
  "Castle-Cave.png": "happy-habitat",
  "blue_castle_cave.png": "happy-habitat",
  "meteor_cave.png": "happy-habitat",
  "volcano-1_bubbler.png": "happy-habitat",
  "volcano-2_bubbler.png": "happy-habitat",
  "coral-clinic.png": "happy-habitat",
  "nursery-garden.png": "happy-habitat",
  "__custom-decor-shop__": "happy-habitat",
  "__custom-hide-shop__": "happy-habitat",
  ...(ZOMBIE_SKELETON_BEHAVIOR_ENABLED ? {
    "gorebag_lure.png": "spooky-keeper",
    "fishheadeffigy_1.png": "spooky-keeper",
    "fishheadeffigy_2.png": "spooky-keeper",
    "fishheadeffigy_3.png": "spooky-keeper"
  } : {})
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
const FISH_DECAY_ZOMBIE_MS = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.fishDecayZombieMs;
const FISH_DECAY_SKELETON_MS = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.fishDecaySkeletonMs;
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
const GRIME_VISUAL_START_DIRTINESS = 0.1;
const SEVERE_GRIME_VISUAL_THRESHOLD = 0.72;
const GRIME_OVERLAY_OVERSCAN = 1.1;
const GRIME_OVERLAY_ASSET_PATHS = Object.freeze([
  resolveAppUrl("assets/grime/grime-level-1.webp"),
  resolveAppUrl("assets/grime/grime-level-2.webp"),
  resolveAppUrl("assets/grime/grime-level-3.webp"),
  resolveAppUrl("assets/grime/grime-level-4.webp"),
  resolveAppUrl("assets/grime/grime-level-5.webp")
]);
const CLEAN_FADE_MS = 950;
const CLEAN_SPARKLE_MS = 1550;
const CARE_TASK_COMPLETE_HOLD_MS = 2200;
const DEFAULT_THEME = "dark";
// Location selectors are intentionally disabled in the current UI. Keep the
// underlying settings code available so the feature can be restored later.
const TOOLBAR_POSITION_SETTING_ENABLED = false;
const DISPLAY_POSITION_SETTING_ENABLED = false;
const DEFAULT_CONTENT_SETTINGS = Object.freeze({
  violenceAndGoreEnabled: false
});
const UV_LIGHT_RENDER_QUALITY_LOW = "low";
const UV_LIGHT_RENDER_QUALITY_HIGH = "high";
const DEFAULT_UV_LIGHT_RENDER_QUALITY = UV_LIGHT_RENDER_QUALITY_LOW;
const UV_LIGHT_RENDER_QUALITY_OPTIONS = Object.freeze([
  UV_LIGHT_RENDER_QUALITY_LOW,
  UV_LIGHT_RENDER_QUALITY_HIGH
]);
const DEFAULT_UI_SETTINGS = Object.freeze({
  toolbarPosition: "bottom-center",
  displayPosition: "top-left",
  toolbarCollapsed: false,
  displayCollapsed: false,
  careTaskPaneOpen: false,
  soundMuted: false,
  uiSoundsMuted: false,
  tankMouseInputLocked: false,
  ambientBubblesEnabled: true,
  waterParticlesEnabled: true,
  causticLightingEnabled: true,
  decorShadowsEnabled: true,
  uvLightQuality: DEFAULT_UV_LIGHT_RENDER_QUALITY,
  halloweenMode: HALLOWEEN_MODE_AUTOMATIC,
  editOverlayMode: "fish"
});
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
const CUSTOM_FISH_COST = 10;
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
  "gorebag_lure.png",
  "fishheadeffigy_1.png",
  "fishheadeffigy_2.png",
  "fishheadeffigy_3.png"
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
const CAUSTIC_LIGHT_ASSET_PATH = resolveAppUrl("assets/misc/caustic_light.png");
const ENABLE_PORTABLE_PERFORMANCE_MODE = true;
const PORTABLE_PERFORMANCE_MEDIA_QUERY = "(hover: none) and (pointer: coarse)";
const PORTABLE_PERFORMANCE_MAX_RENDER_DPR = 1.25;
const PORTABLE_PERFORMANCE_MAX_FPS = 30;
const PORTABLE_PERFORMANCE_WATER_PARTICLE_COUNT = 96;
const PORTABLE_PERFORMANCE_WATER_PARTICLE_CLEAN_VISIBLE_COUNT = 30;
const PORTABLE_PERFORMANCE_WATER_PARTICLE_DIRTY_VISIBLE_COUNT = 96;
const PORTABLE_PERFORMANCE_AMBIENT_BUBBLE_COUNT = 18;
const PORTABLE_PERFORMANCE_MAX_BUBBLER_VISIBLE_BUBBLES_PER_SPOUT = 32;
const PORTABLE_PERFORMANCE_RESIZE_DEBOUNCE_MS = 120;
const PORTABLE_PERFORMANCE_TANK_BLUR_SCALE = 0.55;
const PORTABLE_PERFORMANCE_GRIME_BLUR_SCALE = 0.5;
const ENABLE_FILTER = false;
const BASIC_FILTER_KEY = "basic-filter.png";
const FILTER_DRAW_BASE_WIDTH = 250;
const FILTER_DRAW_BASE_HEIGHT = FILTER_DRAW_BASE_WIDTH * (220 / 148);
const FILTER_GROUP_RIGHT_MARGIN_PX = 0;
const FILTER_BUBBLE_STREAM_DISTANCE_PX = 200;
const FILTER_BUBBLE_STREAM_RISE_PX = 22;
const FILTER_BUBBLE_OUTLET_X_OFFSET_PX = 14;
const DEFAULT_FILTER_ASSET_KEY = BASIC_FILTER_KEY;
const BASE_TANK_DIRTY_DAYS = 3.5;
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
const FISH_TURN_MIN_SCALE_X = 0.42;
const FISH_TURN_MAX_SCALE_Y = 1.12;
const FISH_TURN_MIN_MS = 130;
const FISH_TURN_MAX_MS = 210;
const CAVE_ALLOWED_OUTSIDE_LAYERS = Object.freeze([1, 2, 5]);
const MAX_VALID_CAVE_PLANS_PER_EVAL = 2;
const MAX_FISH_RETARGETS_PER_FRAME = 2;
const AUTO_DISPENSER_DRAW_WIDTH = 252;
const AUTO_DISPENSER_DRAW_HEIGHT = Math.round(AUTO_DISPENSER_DRAW_WIDTH * (340 / 943));
const AUTO_DISPENSER_VIEWPORT_SIZE_MULTIPLIER = 1.5;
const AUTO_DISPENSER_TOP_MOUNT_OVERHANG_PX = 18;
const FISH_MOTION_SCALE = 3.35;
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
const SUCKER_FISH_FRONT_GLASS_SCRUB_COOLDOWN_MS = 16;
const SUCKER_FISH_FRONT_GLASS_SCRUB_MAX_INTERVAL_MS = 33;
const SUCKER_FISH_FRONT_GLASS_SCRUB_MIN_DISTANCE_PX = 0.35;
const SUCKER_FISH_FRONT_GLASS_SCRUB_STROKE_STEP_PX = 2.5;
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
const FISH_SURFACE_BREACH_ALLOWANCE_PX = 6;
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
const SAME_SPECIES_FOLLOW_RADIUS_NORM = 0.34;
const SAME_SPECIES_FOLLOW_BASE_CHANCE = 0.08;
const SAME_SPECIES_FOLLOW_NEIGHBOR_BONUS = 0.035;
const SAME_SPECIES_FOLLOW_MAX_CHANCE = 0.42;
const SAME_SPECIES_FOLLOW_MIN_MS = 2200;
const SAME_SPECIES_FOLLOW_MAX_MS = 4800;
const SAME_SPECIES_FOLLOW_SPACING_MIN_NORM = 0.024;
const SAME_SPECIES_FOLLOW_SPACING_MAX_NORM = 0.07;
const SAME_SPECIES_FOLLOW_VERTICAL_JITTER_NORM = 0.03;
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
const WATER_PARTICLE_COUNT = 180;
const WATER_PARTICLE_CLEAN_VISIBLE_COUNT = 44;
const WATER_PARTICLE_DIRTY_VISIBLE_COUNT = 180;
const WATER_PARTICLE_FISH_FORCE_RADIUS_PX = 90;
const WATER_PARTICLE_BUBBLER_FORCE_RADIUS_PX = 74;
const WATER_PARTICLE_FILTER_FORCE_RADIUS_PX = 130;
const WATER_PARTICLE_SPRITE_SIZE_MIN_PX = 0.75;
const WATER_PARTICLE_SPRITE_SIZE_MAX_PX = 2.45;
const WATER_PARTICLE_SPRITE_ALPHA_BOOST = 1.9;
const WATER_PARTICLE_SPRITE_ALPHA_FLOOR = 18;
const WATER_PARTICLE_FADE_IN_PER_SECOND = 1.8;
const WATER_PARTICLE_FADE_OUT_PER_SECOND = 0.42;
const FISH_SATIATED_MS = 5 * MINUTE_MS;
const FILTERLESS_BASE_TANK_DIRTY_DAYS = 2.4;
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
const AUTO_DISPENSER_COST = 30;
const AUTO_DISPENSER_ASSET_VERSION = "2026-04-01";
const AUTO_DISPENSER_RELEASE_SPACING_MS = 80;
const AUTO_DISPENSER_DROP_DISTANCE_PX = 150;
const AUTO_DISPENSER_DROP_X_OFFSET_PX = -30;
const AUTO_DISPENSER_DROP_DRIFT_PX = 10;
const AUTO_DISPENSER_DROP_DURATION_MS = 850;
const AUTO_DISPENSER_PELLET_MAX_Y_NORM = 0.28;
const AUTO_DISPENSER_HOPPER_MAX_DRAWN_PELLETS = AUTO_DISPENSER_MAX_PELLETS;
const AUTO_DISPENSER_LOW_FOOD_BLINK_MS = 360;
const ENABLE_UV_LIGHT = false;
const UV_LIGHT_COST = 25;
const UV_LIGHT_IMAGE_PATH = resolveAppUrl("assets/misc/uvlight.png");
const UV_LIGHT_ATMOSPHERE_ENABLED = false;
const UV_LIGHT_GRAVEL_GLOW_HIGH_ENABLED = true;
const UV_LIGHT_BUBBLE_GLOW_ENABLED = false;
const UV_LIGHT_WATER_PARTICLE_GLOW_ENABLED = false;
const UV_LIGHT_CACHE_LOW_MIN_WIDTH = 24;
const UV_LIGHT_CACHE_LOW_MAX_WIDTH = 176;
const UV_LIGHT_CACHE_HIGH_MIN_WIDTH = 72;
const UV_LIGHT_CACHE_HIGH_MAX_WIDTH = 256;
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
  "selectedFilterAsset",
  "autoDispenser",
  "uvLightInstalled",
  "uvLightEnabled",
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
const FISH_ACTION_WAIT_FOOD_DURATION_MS = 60 * 1000;
const FISH_ACTION_REST_DURATION_MS = 3 * MINUTE_MS;
const FISH_ACTION_SLEEP_DURATION_MS = 10 * MINUTE_MS;
const FISH_ACTION_HIDE_DURATION_MS = 2 * MINUTE_MS;
const FISH_ACTION_GREET_DURATION_MS = 45 * 1000;
const FISH_ACTION_FOLLOW_DURATION_MS = 3 * MINUTE_MS;
const FISH_ACTION_AVOID_DURATION_MS = 60 * 1000;
const FISH_ACTION_MATE_DURATION_MS = 2 * MINUTE_MS;
const FISH_ACTION_INSPECT_DURATION_MS = 90 * 1000;
const FISH_ACTION_DIG_DURATION_MS = 75 * 1000;
const FISH_ACTION_PEBBLE_DURATION_MS = 60 * 1000;
const FISH_ACTION_ZOOMIES_DURATION_MS = 20 * 1000;
const FISH_ACTION_PLAY_DURATION_MS = 2 * MINUTE_MS;
const FISH_ACTION_BREED_HOLD_MS = 2 * MINUTE_MS;
const FISH_ACTION_QUEUE_REST_MS = 2 * 1000;
const BETTA_ATTACK_PASS_CHANCE = 0.001;
const BETTA_ATTACK_TRIGGER_RANGE_NORM = 0.052;
const BETTA_ATTACK_RELEASE_RANGE_NORM = 0.074;
const ZOMBIE_BITE_FATAL_MS = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.biteFatalMs;
const ZOMBIE_BITE_BLOOD_INTERVAL_MS = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.biteBloodIntervalMs;
const ZOMBIE_BITE_REVIVE_MIN_MS = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.biteReviveMinMs;
const ZOMBIE_BITE_REVIVE_MAX_MS = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.biteReviveMaxMs;
const ZOMBIE_ATTACK_TARGET_REFRESH_MS = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.attackTargetRefreshMs;
const FISH_SPAWN_PROTECTION_MS = 15000;
const PIRANHA_ATTACK_TRIGGER_RANGE_NORM = 0.04;
const PIRANHA_ATTACK_RELEASE_RANGE_NORM = 0.06;
const PIRANHA_ATTACK_BUILDUP_MS = 7000;
const PIRANHA_BITE_DAMAGE_INTERVAL_MS = 900;
const PIRANHA_BITE_DAMAGE_UNITS = 1;
const PIRANHA_CONSUMPTION_ZOMBIE_MS = MINUTE_MS / 3;
const PIRANHA_CONSUMPTION_SKELETON_MS = (2 * MINUTE_MS) / 3;
const PIRANHA_CONSUMPTION_DURATION_MS = 1 * MINUTE_MS;
const PIRANHA_BLOOD_CLOUD_INTERVAL_MS = 1200;
const PIRANHA_TARGET_REFRESH_MS = 650;
const BLOOD_WATER_TINT_DECAY_PER_SECOND = 0.0034;
const CHUM_BLOOD_CLOUD_INTERVAL_MS = 1300;
const UNDEAD_COMFORT_PENALTY = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.undeadComfortPenalty;
const MAX_UNDEAD_COMFORT_PENALTY = ZOMBIE_SKELETON_BEHAVIOR_CONFIG.maxUndeadComfortPenalty;
const CORPSE_VIGIL_TRIGGER_RANGE_NORM = 0.16;
const CAVE_NIGHT_ENTRY_CHANCE = 0.5;
const CAVE_NIGHT_START_HOUR = 21;
const CAVE_NIGHT_END_HOUR = 4;
const CAVE_ENTRY_CHANCE_BY_STYLE = {
  peaceful: 0.1,
  steady: 0.1,
  sporadic: 0.1
};
const STATIC_ASSET_MANIFEST = "assets/asset-manifest.json";
const FISH_CATALOG_PATH = "assets/fish/fish-types.json";
const DECOR_CATALOG_PATH = "assets/decor/decor_types.json";
const FILTER_CATALOG_PATH = "assets/filter/filter.json";
const BACKGROUND_CATALOG_PATH = "assets/backgrounds/backgrounds.json";
const FOOD_AND_MEDS_CATALOG_PATH = "assets/foodandmeds/food-and-meds.json";
const FOOD_AND_MEDS_FALLBACK_IMAGE_NAME = "basic-food.png";
const FOOD_AND_MEDS_ASSET_VERSION = "2026-04-01";
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
const STORE_REGULAR_BUTTON_SOUND_SELECTOR = [
  "#storeFoodTab",
  "#storePharmacyTab",
  "#storeFishTab",
  "#storeDecorTab",
  "#storeEquipmentTab",
  "[data-buy-food]",
  "[data-buy-medicine]",
  "[data-buy-fish]",
  "[data-buy-decor]",
  "[data-buy-background]",
  "[data-buy-filter]",
  "[data-buy-auto-dispenser]",
  "[data-buy-uv-light]",
  "[data-extend-aquarium-store]"
].join(",");
const STORE_FILTER_CONTROL_SOUND_SELECTOR = [
  "[data-shop-sort]",
  "[data-shop-filter]"
].join(",");
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


const AUTO_DISPENSER_IMAGE_PATH = resolveDispenserAssetPath("pelletdispenser.png");
const AUTO_DISPENSER_BG_PATH = resolveDispenserAssetPath("pelletdispenser_bg.png");


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
    id: "goldfish",
    name: "Goldfish",
    cost: 5,
    mealCoins: 1,
    asset: "/assets/fish/goldfish.png",
    description: "The classic round buddy. Big, cheerful, and always hungry.",
    width: 405,
    cycleSeconds: 28,
    bobSpeed: 1.25,
    swimStyle: "peaceful",
    speedMin: 0.02,
    speedMax: 0.024,
    targetMinMs: 4400,
    targetMaxMs: 7600
  },
  {
    id: "guppy",
    name: "Guppy",
    cost: 4,
    mealCoins: 1,
    asset: "/assets/fish/guppy.png",
    description: "A ribbon-tailed coin helper with a fast little wiggle.",
    width: 179,
    cycleSeconds: 23,
    bobSpeed: 1.45,
    swimStyle: "sporadic",
    speedMin: 0.024,
    speedMax: 0.072,
    targetMinMs: 1400,
    targetMaxMs: 3600
  },
  {
    id: "betta",
    name: "Betta",
    cost: 10,
    mealCoins: 1,
    asset: "/assets/fish/betta.png",
    description: "A dramatic, fluttery fish with elegant fins and better payouts.",
    width: 219,
    cycleSeconds: 30,
    bobSpeed: 1.15,
    swimStyle: "peaceful",
    speedMin: 0.018,
    speedMax: 0.022,
    targetMinMs: 5200,
    targetMaxMs: 8200
  },
  {
    id: "clownfish",
    name: "Clownfish",
    cost: 20,
    mealCoins: 2,
    asset: "/assets/fish/clownfish.png",
    description: "Bright stripes, playful swimming, and a solid meal bonus.",
    width: 270,
    cycleSeconds: 24,
    bobSpeed: 1.35,
    swimStyle: "steady",
    speedMin: 0.032,
    speedMax: 0.042,
    targetMinMs: 2400,
    targetMaxMs: 5200
  },
  {
    id: "angelfish",
    name: "Angelfish",
    cost: 36,
    mealCoins: 2,
    asset: "/assets/fish/angelfish.png",
    description: "Tall fins and graceful turns. Fancy fish, fancy coins.",
    width: 456,
    cycleSeconds: 33,
    bobSpeed: 1.05,
    swimStyle: "peaceful",
    speedMin: 0.017,
    speedMax: 0.021,
    targetMinMs: 5400,
    targetMaxMs: 8600
  },
  {
    id: "pufferfish",
    name: "Pufferfish",
    cost: 40,
    mealCoins: 2,
    asset: "/assets/fish/pufferfish.png",
    description: "The round little oddball. Expensive, adorable, and profitable.",
    width: 150,
    cycleSeconds: 27,
    bobSpeed: 1.55,
    swimStyle: "steady",
    speedMin: 0.026,
    speedMax: 0.034,
    targetMinMs: 2600,
    targetMaxMs: 5600
  },
];

const FILTER_META = {
  "basic-filter.png": {
    name: "Basic Filter",
    blurb: "Scrub cycle: 3.5 days",
    cleanDays: BASE_TANK_DIRTY_DAYS,
    comfortBoost: 0,
    cost: 0,
    purchasable: false,
    tier: 0,
    flow: 1
  },
  "charcoal-filter.png": {
    name: "Charcoal Filter",
    blurb: "Scrub cycle: 5.25 days",
    cleanDays: 5.25,
    comfortBoost: 0.04,
    cost: 30,
    purchasable: true,
    tier: 1,
    flow: 1.04
  },
  "porcelain-filter.png": {
    name: "Porcelain Filter",
    blurb: "Scrub cycle: 7 days",
    cleanDays: 7,
    comfortBoost: 0.08,
    cost: 40,
    purchasable: true,
    tier: 2,
    flow: 1.08
  },
  "reef-filter.png": {
    name: "Reef Filter",
    blurb: "Scrub cycle: 10.5 days",
    cleanDays: 10.5,
    comfortBoost: 0.12,
    cost: 50,
    purchasable: true,
    tier: 3,
    flow: 1.14
  }
};

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
    description: "A full-size aquarium with room for fish, decor, and filters.",
    cost: 65,
    supportsFilters: true,
    waterTypes: ["freshwater", "saltwater"],
    defaultWaterType: "freshwater",
    baseCleanDays: FILTERLESS_BASE_TANK_DIRTY_DAYS,
    visual: "rectangular"
  }
});

const TANK_PRODUCT_IMAGE_PATHS = Object.freeze({
  rectangular: "assets/misc/tank.png"
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
  "castle-tower.png": {
    name: "Castle Ruin",
    cost: 16,
    width: 198,
    defaultScale: DEFAULT_DECOR_SCALE
  },
  "coral-bloom.png": {
    name: "Coral Bloom",
    cost: 6,
    width: 140,
    defaultScale: DEFAULT_DECOR_SCALE
  },
  "rock-arch.png": {
    name: "Rock Arch",
    cost: 9,
    width: 595,
    defaultScale: 1
  },
  "seaweed-bunch.png": {
    name: "Seaweed Bunch",
    cost: 4,
    width: 298,
    defaultScale: 1
  },
  "treasure-chest.png": {
    name: "Treasure Chest",
    cost: 10,
    width: 150,
    defaultScale: DEFAULT_DECOR_SCALE
  },
  "anubia-rock_seaweed.png": {
    name: "Anubias Rock",
    cost: 8,
    width: 495,
    defaultScale: 1
  },
  "driftwood-root.png": {
    name: "Driftwood Root",
    cost: 14,
    width: 660,
    defaultScale: 1
  },
  "moss-bridge.png": {
    name: "Moss Bridge",
    cost: 13,
    width: 698,
    defaultScale: 1
  },
  "pagoda-lantern.png": {
    name: "Pagoda Lantern",
    cost: 15,
    width: 176,
    defaultScale: DEFAULT_DECOR_SCALE
  },
  "slate-cave.png": {
    name: "Slate Cave",
    cost: 11,
    width: 620,
    defaultScale: 1
  },
  "terracotta-hide.png": {
    name: "Terracotta Hide",
    cost: 9,
    width: 158,
    defaultScale: DEFAULT_DECOR_SCALE
  }
};

const DECOR_KEY_ALIASES = Object.freeze({
  "anubia-rock.png": "anubia-rock_seaweed.png",
  "anubias-rock.png": "anubia-rock_seaweed.png"
});
const DECOR_RGB_COLOR_SETTING = "rgb";
const DECOR_COLORIZE_SETTING_SUFFIX = "Colorize";
const DECOR_RGB_CYCLE_MS = 22000;
const DECOR_RGB_CYCLE_CACHE_STEPS = 120;


const CUSTOM_BUBBLER_DECOR_IMAGE = resolveAppUrl(OPTIONAL_BUBBLE_ORB_ASSET_PATH);
const CUSTOM_BUBBLER_THUMBNAIL_IMAGE = resolveAppUrl("assets/misc/custom_bubbler.png");
const CUSTOM_DECOR_SHOP_IMAGE = resolveAppUrl("assets/misc/custom_decor.png");
const CUSTOM_HIDE_SHOP_IMAGE = resolveAppUrl("assets/misc/custom_hide.png");
const CUSTOM_FISH_SHOP_IMAGE = resolveAppUrl("assets/misc/custom_fish.png");
const CUSTOM_FISH_TEMPLATE_IMAGE = resolveAppUrl("assets/misc/fish_template.png");

const dom = {
  coinCount: document.querySelector("#coinCount"),
  toolbarWallet: document.querySelector("#toolbarWallet"),
  toolbarCoinCount: document.querySelector("#toolbarCoinCount"),
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
  addCoinsButton: document.querySelector("#addCoinsButton"),
  maxDirtButton: document.querySelector("#maxDirtButton"),
  debugMaxDirtinessButton: document.querySelector("#debugMaxDirtinessButton"),
  debugGravelDigButton: document.querySelector("#debugGravelDigButton"),
  debugGravelPebbleButton: document.querySelector("#debugGravelPebbleButton"),
  debugCaveButton: document.querySelector("#debugCaveButton"),
  debugDailyRecapButton: document.querySelector("#debugDailyRecapButton"),
  debugFishBehaviorLogButton: document.querySelector("#debugFishBehaviorLogButton"),
  lightsOutToggleButton: document.querySelector("#lightsOutToggleButton"),
  lightsOutModeBadge: document.querySelector("#lightsOutModeBadge"),
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
  editTankTray: document.querySelector("#editTankTray"),
  closeEditTankTrayButton: document.querySelector("#closeEditTankTrayButton"),
  editTankTrayScroller: document.querySelector("#editTankTrayScroller"),
  editTankBackgroundColorPanel: document.querySelector("#editTankBackgroundColorPanel"),
  editTankBackgroundList: document.querySelector("#editTankBackgroundList"),
  editTankCustomGravelPanel: document.querySelector("#editTankCustomGravelPanel"),
  editTankFilterSection: document.querySelector("#editTankFilterSection"),
  editTankFilterList: document.querySelector("#editTankFilterList"),
  editTankUvLightList: document.querySelector("#editTankUvLightList"),
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
  tankFilterActionList: document.querySelector("#tankFilterActionList"),
  tankFilterSection: document.querySelector("#tankFilterSection"),
  tankFilterSectionTitle: document.querySelector("#tankFilterSectionTitle"),
  tankFilterSectionNote: document.querySelector("#tankFilterSectionNote"),
  uvLightList: document.querySelector("#uvLightList"),
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
  utilityOverlay: document.querySelector("#utilityOverlay"),
  utilityOverlayTitle: document.querySelector("#utilityOverlayTitle"),
  utilityOverlayKicker: document.querySelector("#utilityOverlayKicker"),
  utilityOverlayBody: document.querySelector("#utilityOverlayBody"),
  utilityOverlayFooter: document.querySelector("#utilityOverlayFooter"),
  closeUtilityOverlay: document.querySelector("#closeUtilityOverlay"),
  settingsOverlay: document.querySelector("#settingsOverlay"),
  equipmentOverlay: document.querySelector("#equipmentOverlay"),
  equipmentPanelDescription: document.querySelector("#equipmentPanelDescription"),
  equipmentFilterSection: document.querySelector("#equipmentFilterSection"),
  equipmentFilterSectionTitle: document.querySelector("#equipmentFilterSectionTitle"),
  equipmentFilterSectionNote: document.querySelector("#equipmentFilterSectionNote"),
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
  openSettingsSidebarButton: document.querySelector("#openSettingsSidebarButton"),
  closeSettingsOverlay: document.querySelector("#closeSettingsOverlay"),
  closeEquipmentOverlay: document.querySelector("#closeEquipmentOverlay"),
  violenceGoreToggleInput: document.querySelector("#violenceGoreToggleInput"),
  soundMuteToggleInput: document.querySelector("#soundMuteToggleInput"),
  uiMuteToggleInput: document.querySelector("#uiMuteToggleInput"),
  ambientBubblesToggleInput: document.querySelector("#ambientBubblesToggleInput"),
  waterParticlesToggleInput: document.querySelector("#waterParticlesToggleInput"),
  causticLightingToggleInput: document.querySelector("#causticLightingToggleInput"),
  decorShadowsToggleInput: document.querySelector("#decorShadowsToggleInput"),
  mouseLockSettingsRow: document.querySelector("#mouseLockSettingsRow"),
  uvLightQualitySelect: document.querySelector("#uvLightQualitySelect"),
  halloweenModeSelect: document.querySelector("#halloweenModeSelect"),
  tankMouseLockToggleInput: document.querySelector("#tankMouseLockToggleInput"),
  openEquipmentShopButton: document.querySelector("#openEquipmentShopButton"),
  openEquipmentStoreButton: document.querySelector("#openEquipmentStoreButton"),
  placedDecorList: document.querySelector("#placedDecorList"),
  backgroundList: document.querySelector("#backgroundList"),
  equipmentBackgroundList: document.querySelector("#equipmentBackgroundList"),
  equipmentBackgroundColorPanel: document.querySelector("#equipmentBackgroundColorPanel"),
  tankAssetList: document.querySelector("#tankAssetList"),
  filterAssetList: document.querySelector("#filterAssetList"),
  equipmentFilterList: document.querySelector("#equipmentFilterList"),
  equipmentUvLightList: document.querySelector("#equipmentUvLightList"),
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
  toggleMouseLockButton: document.querySelector("#toggleMouseLockButton"),
  uvLightToggleButton: document.querySelector("#uvLightToggleButton"),
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
  utilityOverlayOpen: false,
  utilityOverlayMode: "",
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
  tankEditMode: false,
  editTankTrayTab: "background",
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
  boroughOverviewFishFrameMs: 1000 / 12,
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
  foodTravelDestinations: new Map(),
  tankAppearanceClipboard: { background: null, gravel: null },
  boroughEdgeBursts: [],
  boroughActivityNotifications: [],
  boroughNotificationSignatures: new Map(),
  lastBoroughNotificationAt: 0,
  achievementEvaluationActive: false,
  lastBoroughHappeningAt: 0,
  debugSimulatedNow: null,
  debugTimeScale: 1,
  debugSimulationPaused: false,
  debugHalloweenModeOverride: null,
  debugHalloweenRandomSalt: "",
  debugFishVisualOverrides: new Map(),
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
  tankStateDirty: false,
  cleaningTransition: null,
  backgroundCatalog: [],
  tankCatalog: [],
  filterCatalog: [],
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
  filterMap: new Map(),
  gravelMap: new Map(),
  bubbleMap: new Map(),
  images: new Map(),
  imageLoadPromises: new Map(),
  imageLoadFailures: new Map(),
  imageRecoveryNextAt: new Map(),
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
  caveSourceStats: new Map(),
  bubbleOrbTintCache: new Map(),
  customGravelTintCache: new Map(),
  foodPelletTintCache: new Map(),
  waterParticleTintCache: new Map(),
  uvGlowMaskCache: new Map(),
  uvGlowSourceId: 0,
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
  fishGravelPebbleActions: new Map(),
  fishPebbleTosses: [],
  forcedGravelDigUntilByFishId: new Map(),
  gravelDigBursts: [],
  sedimentClouds: [],
  effectClouds: [],
  coinGlints: [],
  waterParticles: [],
  waterParticleTankId: null,
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
  debugToolsEnabled: DEBUG_MODE,
  debugSidebarOpen: false,
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
    decorFilter: true,
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
  "toggleMouseLockButton",
  "lightsOutToggleButton",
  "uvLightToggleButton"
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
    label: "Custom Fish",
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
        createdAt: now
      }, speciesKey);
      if (!asset) {
        showToast("Could not create that custom fish.");
        return false;
      }
      setRuntimeImageSource(asset, "runtimePath", storedImage.runtimeUrl);
      state.coins -= CUSTOM_FISH_COST;
      if (!state.customFishAssets || typeof state.customFishAssets !== "object") {
        state.customFishAssets = {};
      }
      state.customFishAssets[asset.key] = asset;
      syncRuntimeCustomFishAssetsFromState(state);
      const fish = createFishRecord(asset.key, {
        now,
        name: asset.name,
        scale: DEFAULT_FISH_SCALE,
        entryStartedAt: now,
        entryDurationMs: FISH_ENTRY_DURATION_MS,
        entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
      });
      if (!fish) {
        delete state.customFishAssets[asset.key];
        syncRuntimeCustomFishAssetsFromState(state);
        state.coins = Math.min(MAX_WALLET_COINS, state.coins + CUSTOM_FISH_COST);
        showToast("Could not add that custom fish to the tank.");
        return false;
      }
      addFishToTank(fish, now);
      maybeSeedNewFishDiseaseCarrier(fish, now);
      if (!isMealFreeFish(fish) && canFoodSatisfyFishMeal(fish, "basic")) {
        setFishNeedValue(fish, "hunger", 82, now);
        fish.lastAteAt = now;
      }
      return finalizeCustomAssetCreation("fish", {
        now,
        eventText: `Created custom fish ${asset.name}.`,
        toastText: `${asset.name} created and added to the tank.`
      });
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
    renderBody: (item) => renderDecorSettingsOverlay(item)
  }),
  "custom-decor-settings": createPlacedDecorUtilityMode({
    id: "custom-decor-settings",
    runtimeKey: "customDecorSettingsDecorId",
    fallbackTitle: "Decor Settings",
    getItem: () => getPlacedDecorById(runtime.customDecorSettingsDecorId) || getSelectedPlacedDecor(),
    renderBody: (item) => renderDecorSettingsOverlay(item)
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
