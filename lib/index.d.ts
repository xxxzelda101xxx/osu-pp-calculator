import { IBeatmap, IRuleset, DifficultyCalculator, DifficultyAttributes, IScoreInfo, PerformanceAttributes, Skill, IScore, ScoreInfo, IBeatmapInfo, ModCombination, IJsonableScoreInfo, IHitStatistics, ScoreRank, IJsonableBeatmapInfo, ILifeBarFrame } from 'osu-classes';
import { IDownloadEntryOptions, DownloadResult } from 'osu-downloader';

/**
 * Missing beatmap attributes that are required to simulate scores.
 */
interface IBeatmapAttributes {
  /**
     * Beatmap ID.
     */
  beatmapId?: number;
  /**
     * Beatmap MD5 hash.
     */
  hash?: string;
  /**
     * Beatmap ruleset ID.
     */
  rulesetId?: number;
  /**
     * Mod combination or bitwise.
     * @default "NM"
     */
  mods?: string | number;
  /**
     * Beatmap clock rate.
     * @default 1
     */
  clockRate?: number;
  /**
     * Beatmap total hits.
     */
  totalHits?: number;
  /**
     * Beatmap max combo.
     */
  maxCombo?: number;
  /**
     * The number of fruits in osu!catch beatmap.
     */
  maxFruits?: number;
  /**
     * The number of droplets in osu!catch beatmap.
     */
  maxDroplets?: number;
  /**
     * The number of tiny droplets in osu!catch beatmap.
     */
  maxTinyDroplets?: number;
}

/**
 * Custom beatmap stats for beatmap simulation.
 */
interface IBeatmapCustomStats {
  /**
     * Custom approach rate for the target beatmap in range [0-11].
     */
  approachRate?: number;
  /**
     * Prevents scaling of approach rate from difficulty adjusting mods.
     * @default false
     */
  lockApproachRate?: boolean;
  /**
     * Custom overall difficulty for the target beatmap in range [0-11].
     */
  overallDifficulty?: number;
  /**
     * Prevents scaling of overall difficulty from difficulty adjusting mods.
     * @default false
     */
  lockOverallDifficulty?: boolean;
  /**
     * Custom circle size for the target beatmap in range [0-11].
     */
  circleSize?: number;
  /**
     * Prevents scaling of circle size from difficulty adjusting mods.
     * @default false
     */
  lockCircleSize?: boolean;
  /**
     * Custom clock rate for the target beatmap in range [0.25-3].
     */
  clockRate?: number;
  /**
     * Custom BPM for the target beatmap in range [60-10000].
     * Can exceed clockrate limits.
     */
  bpm?: number;
  /**
     * Total hits for gradual beatmap difficulty calculation.
     * If it differs from the hit object count of
     * a full beatmap then it will force difficulty calculation.
     */
  totalHits?: number;
  /**
     * Prevents scaling of stats from difficulty adjusting mods.
     * Use {@link lockApproachRate}, {@link lockOverallDifficulty} or {@link lockCircleSize}
     * @deprecated Since 3.2.0
     * @default false
     */
  lockStats?: boolean;
}

/**
 * Options for beatmap parsing.
 */
interface IBeatmapParsingOptions {
  /**
     * ID of the target beatmap.
     */
  beatmapId?: string | number;
  /**
     * Custom file URL of the target beatmap.
     */
  fileURL?: string;
  /**
     * Path to the beatmap file save location.
     * @default "./cache"
     */
  savePath?: string;
  /**
     * Should files be cached on a disk after calculation?
     * @default true
     */
  cacheFiles?: boolean;
  /**
     * Hash of the target beatmap. Used to validate beatmap files.
     * If wasn't specified then file will not be validated.
     */
  hash?: string;
}

/**
 * Beatmap skill data.
 */
interface IBeatmapSkill {
  /**
     * Skill name.
     */
  title: string;
  /**
     * Strain peaks of this skill.
     */
  strainPeaks: number[];
}

/**
 * Raw difficulty attributes with no methods.
 */
interface IDifficultyAttributes {
  /**
     * The combined star rating of all skill.
     */
  starRating: number;
  /**
     * The maximum achievable combo.
     */
  maxCombo: number;
  /**
     * Mod combination or bitwise.
     */
  mods: string | number;
}

interface IDifficultyCalculationOptions {
  /**
     * An instance of any beatmap.
     */
  beatmap?: IBeatmap;
  /**
     * An instance of any ruleset.
     */
  ruleset?: IRuleset;
  /**
     * Custom difficulty calculator.
     */
  calculator?: DifficultyCalculator;
  /**
     * Mod combination or bitwise. Default is NM.
     */
  mods?: string | number;
  /**
     * Total hits for gradual beatmap difficulty calculation.
     */
  totalHits?: number;
}

/**
 * Options for performance calculation of a score.
 */
interface IPerformanceCalculationOptions {
  /**
     * Difficulty attributes of the target beatmap.
     */
  difficulty: DifficultyAttributes;
  /**
     * Target score information.
     */
  scoreInfo: IScoreInfo;
  /**
     * An instance of any ruleset.
     */
  ruleset: IRuleset;
}

/**
 * Options for score parsing.
 */
interface IScoreParsingOptions {
  /**
     * Custom replay file URL.
     */
  replayURL?: string;
  /**
     * Output replay life bar if replay file is present?
     * @default false
     */
  lifeBar?: boolean;
  /**
     * Path to the replay file save location.
     * @default "./cache"
     */
  savePath?: string;
  /**
     * Hash of the target beatmap. Used to validate beatmap files.
     * If wasn't specified then file will not be validated.
     */
  hash?: string;
}

/**
 * Options for score simulation.
 */
interface IScoreSimulationOptions {
  /**
     * Missing beatmap attributes for score simulation.
     */
  attributes: IBeatmapAttributes;
  /**
     * Target score misses.
     */
  countMiss?: number;
  /**
     * Target score 50's.
     */
  count50?: number;
  /**
     * Target score 100's.
     */
  count100?: number;
  /**
     * Target score 300's.
     */
  count300?: number;
  /**
     * Target score katu hits.
     */
  countKatu?: number;
  /**
     * Target score geki hits (not used right now).
     */
  countGeki?: number;
  /**
     * Target score accuracy.
     */
  accuracy?: number;
  /**
     * Target total score.
     */
  totalScore?: number;
  /**
     * Target max combo of a score.
     */
  maxCombo?: number;
  /**
     * Target percent of max combo of a score.
     */
  percentCombo?: number;
}

/**
 * Calculates difficulty attributes by ID, custom file or IBeatmap object.
 * @param options Difficulty attributes request options.
 * @returns Calculated difficulty attributes.
 */
declare function calculateDifficulty(options: IDifficultyCalculationOptions): DifficultyAttributes;
/**
 * Calculates difficulty attributes by ID, custom file or IBeatmap object.
 * @param options Difficulty attributes request options.
 * @returns Calculated difficulty attributes.
 */
declare function calculatePerformance(options: IPerformanceCalculationOptions): PerformanceAttributes;

declare enum GameMode {
  Osu = 0,
  Taiko = 1,
  Fruits = 2,
  Mania = 3
}

/**
 * Difficulty calculator that can return skill data.
 */
interface IExtendedDifficultyCalculator extends DifficultyCalculator {
  /**
     * Get current skill list.
     */
  getSkills(): Skill[];
}
/**
 * Factory of extended difficulty calculators.
 * @param beatmap IBeatmap object.
 * @param ruleset Ruleset instance.
 * @returns Instance of extended difficulty calculator.
 */
declare function createDifficultyCalculator(beatmap: IBeatmap, ruleset: IRuleset): IExtendedDifficultyCalculator;

declare type BeatmapParsingResult = {
  data: IBeatmap;
  hash: string;
};
declare type ScoreParsingResult = {
  data: IScore;
  hash: string;
};
/**
 * Tries to parse beatmap by beatmap ID or custom file URL.
 * @param options Beatmap parsing options.
 * @returns Parsed beatmap.
 */
declare function parseBeatmap(options: IBeatmapParsingOptions): Promise<BeatmapParsingResult>;
/**
 * Downloads replay file and tries to parse a score from it.
 * Returns null if parsing was not successful.
 * @param options Score parsing options.
 * @returns Parsed score.
 */
declare function parseScore(options: IScoreParsingOptions): Promise<ScoreParsingResult>;

/**
 * A score simulator.
 */
declare class ScoreSimulator {
  /**
     * Adds missing properties to a score parsed from a replay file.
     * @param score Parsed score from the replay file.
     * @param attributes Beatmap attributes of this score.
     * @returns Completed score info.
     */
  completeReplay(score: IScore, attributes: IBeatmapAttributes): Promise<IScoreInfo>;
  /**
     * Simulates a score by score simulation options.
     * @param options Score simulation options.
     * @returns Simulated score.
     */
  simulate(options: IScoreSimulationOptions): ScoreInfo;
  /**
     * Simulates a new score with full combo.
     * @param scoreInfo Original score.
     * @param attributes Beatmap attributes of this score.
     * @returns Simulated FC score.
     */
  simulateFC(scoreInfo: IScoreInfo, attributes: IBeatmapAttributes): ScoreInfo;
  /**
     * Simulates a new score with max possible performance.
     * @param attributes Beatmap attributes of this score.
     * @returns Simulated SS score.
     */
  simulateMax(attributes: IBeatmapAttributes): ScoreInfo;
  private _generateScoreInfo;
}

/**
 * Converts IBeatmap object to beatmap information.
 * @param beatmap IBeatmap object.
 * @param hash Beatmap MD5 hash.
 * @returns Converted beatmap info.
 */
declare function createBeatmapInfo(beatmap?: IBeatmap, hash?: string): IBeatmapInfo;
/**
 * Converts IBeatmap object to beatmap attributes.
 * @param beatmap IBeatmap object.
 * @returns Converted beatmap attributes.
 */
declare function createBeatmapAttributes(beatmap?: IBeatmap): IBeatmapAttributes;
/**
 * Calculates total hits of a beatmap.
 * @param beatmap IBeatmap object.
 * @returns Total hits of a beatmap or 0.
 */
declare function getTotalHits(beatmap?: IBeatmap): number;
/**
 * Tries to get max combo of a beatmap.
 * @param beatmap IBeatmap object.
 * @returns Max combo of a beatmap or 0.
 */
declare function getMaxCombo(beatmap?: IBeatmap): number;
/**
 * Tries to get mod combination from IBeatmap object.
 * @param beatmap IBeatmap object.
 * @returns Mod combination or null.
 */
declare function getMods(beatmap?: IBeatmap): ModCombination | null;

/**
 * Converts raw difficulty attributes to real difficulty attributes.
 * @param difficulty Raw difficulty attributes.
 * @returns Difficulty attributes instance.
 */
declare function toDifficultyAttributes(difficulty?: IDifficultyAttributes, rulesetId?: GameMode): DifficultyAttributes;
/**
 * Converts score information object to score information instance.
 * @param jsonable Raw score info data.
 * @returns Converted score information.
 */
declare function toScoreInfo(data?: IScoreInfo | IJsonableScoreInfo): ScoreInfo;

/**
 * Downloads an osu! file by ID or URL.
 * @param path Path to the file save location.
 * @param options Download options.
 * @returns Download result.
 */
declare function downloadFile(path?: string, options?: IDownloadEntryOptions): Promise<DownloadResult>;

interface IHitStatisticsInput {
  attributes: IBeatmapAttributes;
  accuracy?: number;
  countMiss?: number;
  count50?: number;
  count100?: number;
  count300?: number;
  countKatu?: number;
}
declare function generateHitStatistics(options: IHitStatisticsInput): Partial<IHitStatistics>;
declare function getValidHitStatistics(original?: Partial<IHitStatistics>): IHitStatistics;

/**
 * Filters mods from combination to get only difficulty mods.
 * @param mods Original mods.
 * @param rulesetId Target ruleset ID.
 * @returns Difficulty mods.
 */
declare function toDifficultyMods(mods?: string | number, rulesetId?: number): ModCombination;
/**
 * Converts unknown input to mod combination.
 * @param input Original input.
 * @param rulesetId Target ruleset ID.
 * @returns Mod combination.
 */
declare function toCombination(input?: string | number, rulesetId?: number): ModCombination;

/**
 * Converts ruleset name to ruleset ID.
 * @param rulesetName Ruleset name.
 * @returns Ruleset ID.
 */
declare function getRulesetIdByName(rulesetName?: string): GameMode;
/**
 * Creates a new ruleset instance by its ID.
 * @param rulesetId Ruleset ID.
 * @returns Ruleset instance.
 */
declare function getRulesetById(rulesetId?: number): IRuleset;

/**
 * Calculates accuracy of a score.
 * @param scoreInfo Score information.
 * @returns Calculated accuracy.
 */
declare function calculateAccuracy(scoreInfo: IScoreInfo): number;
/**
 * Calculates total hits of a score.
 * @param scoreInfo Score information.
 * @returns Calculated total hits.
 */
declare function calculateTotalHits(scoreInfo: IScoreInfo): number;
/**
 * Calculates rank of a score.
 * @param scoreInfo Score information.
 * @returns Calculated score rank.
 */
declare function calculateRank(scoreInfo: IScoreInfo): ScoreRank;

/**
 * Overwrites circle size of a beatmap with custom one.
 * @param beatmap A beatmap.
 * @param mods Mod combination.
 * @param stats Custom difficulty stats.
 */
declare function applyCustomCircleSize(beatmap: IBeatmap, mods: ModCombination, stats: IBeatmapCustomStats): void;
/**
 * Overwrites difficulty stats of a beatmap with custom difficulty stats.
 * @param beatmap A beatmap.
 * @param mods Mod combination.
 * @param stats Custom difficulty stats.
 */
declare function applyCustomStats(beatmap: IBeatmap, mods: ModCombination, stats: IBeatmapCustomStats): void;

/**
 * Options for beatmap calculation.
 */
interface IBeatmapCalculationOptions extends IBeatmapParsingOptions, IBeatmapCustomStats {
  /**
     * Precalculated beatmap information.
     */
  beatmapInfo?: IBeatmapInfo | IJsonableBeatmapInfo;
  /**
     * Missing beatmap attributes that are required to simulate scores.
     * This is used only for osu!catch which requires the number of fruits and droplets.
     */
  attributes?: IBeatmapAttributes;
  /**
     * Ruleset ID.
     */
  rulesetId?: GameMode;
  /**
     * Custom ruleset instance (for non-supported rulesets).
     */
  ruleset?: IRuleset;
  /**
     * Mod combination or bitwise.
     */
  mods?: string | number;
  /**
     * Precalculated difficulty attributes.
     */
  difficulty?: IDifficultyAttributes;
  /**
     * Whether to output strain peaks or not.
     */
  strains?: boolean;
  /**
     * List of accuracy for all game modes.
     */
  accuracy?: number[];
}

/**
 * Calculated beatmap.
 */
interface ICalculatedBeatmap {
  /**
     * Beatmap information.
     */
  beatmapInfo: IJsonableBeatmapInfo;
  /**
     * Beatmap missing attributes.
     */
  attributes: IBeatmapAttributes;
  /**
     * Beatmap skill data.
     */
  skills: IBeatmapSkill[] | null;
  /**
     * Difficulty attributes of calculated beatmap.
     */
  difficulty: DifficultyAttributes;
  /**
     * List of performance attributes of calculated beatmap.
     */
  performance: PerformanceAttributes[];
}

/**
 * Calculated score.
 */
interface ICalculatedScore {
  /**
     * Score information.
     */
  scoreInfo: IJsonableScoreInfo;
  /**
     * Difficulty attributes of calculated beatmap.
     */
  difficulty: DifficultyAttributes;
  /**
     * List of performance attributes of calculated beatmap.
     */
  performance: PerformanceAttributes;
  /**
     * Replay life bar.
     */
  lifeBar?: ILifeBarFrame[];
}

/**
 * Options for score calculation.
 */
interface IScoreCalculationOptions extends IScoreParsingOptions, Partial<IScoreSimulationOptions>, IBeatmapCustomStats {
  /**
     * Beatmap ID of this score.
     */
  beatmapId?: number;
  /**
     * Custom beatmap file URL of this score.
     */
  fileURL?: string;
  /**
     * Ruleset ID.
     */
  rulesetId?: GameMode;
  /**
     * Custom ruleset instance.
     */
  ruleset?: IRuleset;
  /**
     * Mod combination or bitwise.
     * @default "NM"
     */
  mods?: string | number;
  /**
     * Precalculated difficulty attributes.
     */
  difficulty?: IDifficultyAttributes;
  /**
     * Target score.
     */
  scoreInfo?: IScoreInfo | IJsonableScoreInfo;
  /**
     * Should this score be unchoked or not?
     * @default false
     */
  fix?: boolean;
}

/**
 * A beatmap calculator.
 */
declare class BeatmapCalculator {
  /**
     * Instance of a score simulator.
     */
  private _scoreSimulator;
  /**
     * Calculates difficulty and performance of a beatmap.
     * @param options Beatmap calculation options.
     * @returns Calculated beatmap.
     */
  calculate(options: IBeatmapCalculationOptions): Promise<ICalculatedBeatmap>;
  /**
     * This is the special case in which all precalculated stuff is present.
     * @param options Beatmap calculation options.
     * @returns Calculated beatmap.
     */
  private _processPrecalculated;
  /**
     * Tests these beatmap calculation options for the possibility of skipping beatmap parsing.
     * @param options Beatmap calculation options.
     * @returns If these options enough to skip beatmap parsing.
     */
  private _checkPrecalculated;
  /**
     * Transforms skill data to get strain peaks.
     * @param calculator Extended difficulty calculator.
     * @returns Skill output data.
     */
  private _getSkillsOutput;
  /**
     * Simulates custom scores by accuracy values.
     * @param attributes Beatmap attributes.
     * @param accuracy Accuracy values.
     * @returns Simulated scores.
     */
  private _simulateScores;
}

/**
 * A score calculator.
 */
declare class ScoreCalculator {
  /**
     * Instance of a score simulator.
     */
  private _scoreSimulator;
  /**
     * Calculates difficulty and performance of a score.
     * @param options Score calculation options.
     * @returns Calculated score.
     */
  calculate(options: IScoreCalculationOptions): Promise<ICalculatedScore>;
  private _createScore;
  private _parseOrSimulateScore;
}

export { BeatmapCalculator, GameMode, IBeatmapAttributes, IBeatmapCalculationOptions, IBeatmapCustomStats, IBeatmapParsingOptions, IBeatmapSkill, ICalculatedBeatmap, ICalculatedScore, IDifficultyAttributes, IDifficultyCalculationOptions, IExtendedDifficultyCalculator, IPerformanceCalculationOptions, IScoreCalculationOptions, IScoreParsingOptions, IScoreSimulationOptions, ScoreCalculator, ScoreSimulator, applyCustomCircleSize, applyCustomStats, calculateAccuracy, calculateDifficulty, calculatePerformance, calculateRank, calculateTotalHits, createBeatmapAttributes, createBeatmapInfo, createDifficultyCalculator, downloadFile, generateHitStatistics, getMaxCombo, getMods, getRulesetById, getRulesetIdByName, getTotalHits, getValidHitStatistics, parseBeatmap, parseScore, toCombination, toDifficultyAttributes, toDifficultyMods, toScoreInfo };
