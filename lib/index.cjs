'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

let osuClasses = require('osu-classes');
let osuCatchStable = require('osu-catch-stable');
let osuDownloader = require('osu-downloader');
let osuStandardStable = require('osu-standard-stable');
let osuTaikoStable = require('osu-taiko-stable');
let osuManiaStable = require('osu-mania-stable');
let md5 = require('md5');
let fs = require('fs');
let osuParsers = require('osu-parsers');

function _interopDefaultLegacy(e) {
  return e && typeof e === 'object' && 'default' in e ? e : { 'default': e };
}

let md5__default = /* #__PURE__*/_interopDefaultLegacy(md5);

exports.GameMode = void 0;

(function(GameMode) {
  GameMode[GameMode['Osu'] = 0] = 'Osu';
  GameMode[GameMode['Taiko'] = 1] = 'Taiko';
  GameMode[GameMode['Fruits'] = 2] = 'Fruits';
  GameMode[GameMode['Mania'] = 3] = 'Mania';
})(exports.GameMode || (exports.GameMode = {}));

function createBeatmapInfoFromBeatmap(beatmap) {
  const rulesetBeatmap = beatmap;

  return new osuClasses.BeatmapInfo({
    id: beatmap.metadata.beatmapId,
    beatmapsetId: beatmap.metadata.beatmapSetId,
    creator: beatmap.metadata.creator,
    title: beatmap.metadata.title,
    artist: beatmap.metadata.artist,
    version: beatmap.metadata.version,
    hittable: countObjects(beatmap, osuClasses.HitType.Normal),
    slidable: countObjects(beatmap, osuClasses.HitType.Slider),
    spinnable: countObjects(beatmap, osuClasses.HitType.Spinner),
    holdable: countObjects(beatmap, osuClasses.HitType.Hold),
    length: beatmap.length / 1000,
    bpmMin: beatmap.bpmMin,
    bpmMax: beatmap.bpmMax,
    bpmMode: beatmap.bpmMode,
    circleSize: beatmap.difficulty.circleSize,
    approachRate: beatmap.difficulty.approachRate,
    overallDifficulty: beatmap.difficulty.overallDifficulty,
    drainRate: beatmap.difficulty.drainRate,
    rulesetId: beatmap.mode,
    mods: rulesetBeatmap.mods ?? null,
    maxCombo: rulesetBeatmap.maxCombo ?? 0,
    isConvert: beatmap.originalMode !== beatmap.mode,
  });
}

function countObjects(beatmap, hitType) {
  return beatmap.hitObjects.reduce((sum, obj) => {
    return sum + (obj.hitType & hitType ? 1 : 0);
  }, 0);
}

function countFruits(beatmap) {
  return countNested(beatmap, osuCatchStable.JuiceFruit);
}

function countDroplets(beatmap) {
  return countNested(beatmap, osuCatchStable.JuiceDroplet);
}

function countTinyDroplets(beatmap) {
  return countNested(beatmap, osuCatchStable.JuiceTinyDroplet);
}

function countNested(beatmap, Class) {
  const rulesetBeatmap = beatmap;

  return rulesetBeatmap.hitObjects.reduce((sum, obj) => {
    const nestedSum = obj.nestedHitObjects?.reduce((sum, obj) => {
      return sum + (obj instanceof Class ? 1 : 0);
    }, 0);

    return sum + (nestedSum ?? 0);
  }, 0);
}

function getTotalHits(beatmap) {
  switch (beatmap.mode) {
    case exports.GameMode.Osu: {
      const circles = countObjects(beatmap, osuClasses.HitType.Normal);
      const sliders = countObjects(beatmap, osuClasses.HitType.Slider);
      const spinners = countObjects(beatmap, osuClasses.HitType.Spinner);

      return circles + sliders + spinners;
    }
    case exports.GameMode.Taiko: {
      return countObjects(beatmap, osuClasses.HitType.Normal);
    }
    case exports.GameMode.Fruits: {
      const tinyDroplets = countNested(beatmap, osuCatchStable.JuiceTinyDroplet);
      const droplets = countNested(beatmap, osuCatchStable.JuiceDroplet) - tinyDroplets;
      const fruits = countNested(beatmap, osuCatchStable.JuiceFruit)
                + countObjects(beatmap, osuClasses.HitType.Normal);

      return fruits + droplets + tinyDroplets;
    }
    case exports.GameMode.Mania: {
      const notes = countObjects(beatmap, osuClasses.HitType.Normal);
      const holds = countObjects(beatmap, osuClasses.HitType.Hold);

      return notes + holds;
    }
  }

  const hittable = countObjects(beatmap, osuClasses.HitType.Normal);
  const slidable = countObjects(beatmap, osuClasses.HitType.Slider);
  const spinnable = countObjects(beatmap, osuClasses.HitType.Spinner);
  const holdable = countObjects(beatmap, osuClasses.HitType.Hold);

  return hittable + slidable + spinnable + holdable;
}

function getMaxCombo(beatmap) {
  const rulesetBeatmap = beatmap;

  return rulesetBeatmap.maxCombo ?? 0;
}

function getMods(beatmap) {
  const rulesetBeatmap = beatmap;

  return rulesetBeatmap.mods ?? null;
}

async function downloadFile(path, options) {
  const downloader = new osuDownloader.Downloader({ rootPath: path });
  const entry = new osuDownloader.DownloadEntry(options);

  await downloader.addSingleEntry(entry);

  return downloader.downloadSingle();
}

function generateHitStatistics(beatmap, accuracy = 1, countMiss = 0, count50, count100) {
  if (accuracy > 1) {
    accuracy /= 100;
  }

  switch (beatmap.mode) {
    case exports.GameMode.Taiko:
      return generateTaikoHitStatistics(beatmap, accuracy, countMiss, count100);
    case exports.GameMode.Fruits:
      return generateCatchHitStatistics(beatmap, accuracy, countMiss, count50, count100);
    case exports.GameMode.Mania:
      return generateManiaHitStatistics(beatmap);
  }

  return generateOsuHitStatistics(beatmap, accuracy, countMiss, count50, count100);
}

function generateOsuHitStatistics(beatmap, accuracy = 1, countMiss = 0, count50, count100) {
  const totalHits = getTotalHits(beatmap);

  countMiss = Math.min(Math.max(0, countMiss), totalHits);
  count50 = count50 ? Math.min(Math.max(0, count50), totalHits - countMiss) : 0;

  if (typeof count100 !== 'number') {
    count100 = Math.round((totalHits - totalHits * accuracy) * 1.5);
  }
  else {
    count100 = Math.min(Math.max(0, count100), totalHits - count50 - countMiss);
  }

  const count300 = totalHits - count100 - count50 - countMiss;

  return {
    great: count300,
    ok: count100,
    meh: count50 ?? 0,
    miss: countMiss,
  };
}

function generateTaikoHitStatistics(beatmap, accuracy = 1, countMiss = 0, count100) {
  const totalHits = getTotalHits(beatmap);

  countMiss = Math.max(0, Math.min(countMiss, totalHits));

  let count300;

  if (typeof count100 !== 'number') {
    const targetTotal = Math.round(accuracy * totalHits * 2);

    count300 = targetTotal - (totalHits - countMiss);
    count100 = totalHits - count300 - countMiss;
  }
  else {
    count100 = Math.min(Math.max(0, count100), totalHits - countMiss);
    count300 = totalHits - count100 - countMiss;
  }

  return {
    great: count300,
    ok: count100,
    miss: countMiss,
  };
}

function generateCatchHitStatistics(beatmap, accuracy = 1, countMiss = 0, count50, count100) {
  const maxTinyDroplets = countTinyDroplets(beatmap);
  const maxDroplets = countDroplets(beatmap) - maxTinyDroplets;
  const maxFruits = countFruits(beatmap) + countObjects(beatmap, osuClasses.HitType.Normal);
  const maxCombo = getMaxCombo(beatmap);

  if (typeof count100 === 'number') {
    countMiss += maxDroplets - count100;
  }

  countMiss = Math.max(0, Math.min(countMiss, maxDroplets + maxFruits));

  let droplets = count100 ?? Math.max(0, maxDroplets - countMiss);

  droplets = Math.max(0, Math.min(droplets, maxDroplets));

  const fruits = maxFruits - (countMiss - (maxDroplets - droplets));
  let tinyDroplets = Math.round(accuracy * (maxCombo + maxTinyDroplets));

  tinyDroplets = count50 ?? tinyDroplets - fruits - droplets;

  const tinyMisses = maxTinyDroplets - tinyDroplets;

  return {
    great: Math.max(0, Math.min(fruits, maxFruits)),
    largeTickHit: Math.max(0, Math.min(droplets, maxDroplets)),
    smallTickHit: tinyDroplets,
    smallTickMiss: tinyMisses,
    miss: countMiss,
  };
}

function generateManiaHitStatistics(beatmap) {
  return {
    perfect: getTotalHits(beatmap),
  };
}

function getValidHitStatistics(original) {
  return {
    perfect: original?.perfect ?? 0,
    great: original?.great ?? 0,
    good: original?.good ?? 0,
    ok: original?.ok ?? 0,
    meh: original?.meh ?? 0,
    largeTickHit: original?.largeTickHit ?? 0,
    smallTickMiss: original?.smallTickMiss ?? 0,
    smallTickHit: original?.smallTickHit ?? 0,
    miss: original?.miss ?? 0,
    largeBonus: 0,
    largeTickMiss: 0,
    smallBonus: 0,
    ignoreHit: 0,
    ignoreMiss: 0,
    none: 0,
  };
}

function getRulesetIdByName(rulesetName) {
  switch (rulesetName?.toLowerCase()) {
    case 'standard':
    case 'std':
    case 'osu': return exports.GameMode.Osu;
    case 'taiko': return exports.GameMode.Taiko;
    case 'ctb':
    case 'catch':
    case 'fruits': return exports.GameMode.Fruits;
    case 'mania': return exports.GameMode.Mania;
  }

  throw new Error('Unknown ruleset!');
}

function getRulesetById(rulesetId) {
  switch (rulesetId) {
    case exports.GameMode.Osu: return new osuStandardStable.StandardRuleset();
    case exports.GameMode.Taiko: return new osuTaikoStable.TaikoRuleset();
    case exports.GameMode.Fruits: return new osuCatchStable.CatchRuleset();
    case exports.GameMode.Mania: return new osuManiaStable.ManiaRuleset();
  }

  throw new Error('Unknown ruleset!');
}

function calculateAccuracy(scoreInfo) {
  const geki = scoreInfo.countGeki;
  const katu = scoreInfo.countKatu;
  const c300 = scoreInfo.count300;
  const c100 = scoreInfo.count100;
  const c50 = scoreInfo.count50;
  const total = scoreInfo.totalHits;

  if (total <= 0) {
    return 1;
  }

  switch (scoreInfo.rulesetId) {
    case 0:
      return Math.max(0, (c50 / 6 + c100 / 3 + c300) / total);
    case 1:
      return Math.max(0, (c100 / 2 + c300) / total);
    case 2:
      return Math.max(0, (c50 + c100 + c300) / total);
    case 3:
      return Math.max(0, (c50 / 6 + c100 / 3 + katu / 1.5 + (c300 + geki)) / total);
  }

  return 1;
}

function calculateRank(scoreInfo) {
  if (!scoreInfo.passed) {
    return osuClasses.ScoreRank.F;
  }

  switch (scoreInfo.rulesetId) {
    case exports.GameMode.Osu: return calculateOsuRank(scoreInfo);
    case exports.GameMode.Taiko: return calculateTaikoRank(scoreInfo);
    case exports.GameMode.Fruits: return calculateCatchRank(scoreInfo);
    case exports.GameMode.Mania: return calculateManiaRank(scoreInfo);
  }

  return osuClasses.ScoreRank.F;
}

function calculateOsuRank(scoreInfo) {
  const hasFL = scoreInfo.mods?.has('FL') ?? false;
  const hasHD = scoreInfo.mods?.has('HD') ?? false;
  const ratio300 = Math.fround(scoreInfo.count300 / scoreInfo.totalHits);
  const ratio50 = Math.fround(scoreInfo.count50 / scoreInfo.totalHits);

  if (ratio300 === 1) {
    return hasHD || hasFL ? osuClasses.ScoreRank.XH : osuClasses.ScoreRank.X;
  }

  if (ratio300 > 0.9 && ratio50 <= 0.01 && scoreInfo.countMiss === 0) {
    return hasHD || hasFL ? osuClasses.ScoreRank.SH : osuClasses.ScoreRank.S;
  }

  if ((ratio300 > 0.8 && scoreInfo.countMiss === 0) || ratio300 > 0.9) {
    return osuClasses.ScoreRank.A;
  }

  if ((ratio300 > 0.7 && scoreInfo.countMiss === 0) || ratio300 > 0.8) {
    return osuClasses.ScoreRank.B;
  }

  return ratio300 > 0.6 ? osuClasses.ScoreRank.C : osuClasses.ScoreRank.D;
}

function calculateTaikoRank(scoreInfo) {
  const hasFL = scoreInfo.mods?.has('FL') ?? false;
  const hasHD = scoreInfo.mods?.has('HD') ?? false;
  const ratio300 = Math.fround(scoreInfo.count300 / scoreInfo.totalHits);
  const ratio50 = Math.fround(scoreInfo.count50 / scoreInfo.totalHits);

  if (ratio300 === 1) {
    return hasHD || hasFL ? osuClasses.ScoreRank.XH : osuClasses.ScoreRank.X;
  }

  if (ratio300 > 0.9 && ratio50 <= 0.01 && scoreInfo.countMiss === 0) {
    return hasHD || hasFL ? osuClasses.ScoreRank.SH : osuClasses.ScoreRank.S;
  }

  if ((ratio300 > 0.8 && scoreInfo.countMiss === 0) || ratio300 > 0.9) {
    return osuClasses.ScoreRank.A;
  }

  if ((ratio300 > 0.7 && scoreInfo.countMiss === 0) || ratio300 > 0.8) {
    return osuClasses.ScoreRank.B;
  }

  return ratio300 > 0.6 ? osuClasses.ScoreRank.C : osuClasses.ScoreRank.D;
}

function calculateCatchRank(scoreInfo) {
  const hasFL = scoreInfo.mods?.has('FL') ?? false;
  const hasHD = scoreInfo.mods?.has('HD') ?? false;
  const accuracy = scoreInfo.accuracy;

  if (accuracy === 1) {
    return hasHD || hasFL ? osuClasses.ScoreRank.XH : osuClasses.ScoreRank.X;
  }

  if (accuracy > 0.98) {
    return hasHD || hasFL ? osuClasses.ScoreRank.SH : osuClasses.ScoreRank.S;
  }

  if (accuracy > 0.94) {
    return osuClasses.ScoreRank.A;
  }

  if (accuracy > 0.90) {
    return osuClasses.ScoreRank.B;
  }

  if (accuracy > 0.85) {
    return osuClasses.ScoreRank.C;
  }

  return osuClasses.ScoreRank.D;
}

function calculateManiaRank(scoreInfo) {
  const hasFL = scoreInfo.mods?.has('FL') ?? false;
  const hasHD = scoreInfo.mods?.has('HD') ?? false;
  const accuracy = scoreInfo.accuracy;

  if (accuracy === 1) {
    return hasHD || hasFL ? osuClasses.ScoreRank.XH : osuClasses.ScoreRank.X;
  }

  if (accuracy > 0.95) {
    return hasHD || hasFL ? osuClasses.ScoreRank.SH : osuClasses.ScoreRank.S;
  }

  if (accuracy > 0.9) {
    return osuClasses.ScoreRank.A;
  }

  if (accuracy > 0.8) {
    return osuClasses.ScoreRank.B;
  }

  if (accuracy > 0.7) {
    return osuClasses.ScoreRank.C;
  }

  return osuClasses.ScoreRank.D;
}

function calculateDifficulty(options) {
  const { beatmap, ruleset, mods } = options;

  if (!beatmap || !ruleset) {
    throw new Error('Cannot calculate difficulty attributes');
  }

  const calculator = ruleset.createDifficultyCalculator(beatmap);

  if (typeof mods !== 'string' && typeof mods !== 'number') {
    return calculator.calculate();
  }

  const combination = ruleset.createModCombination(mods);

  return calculator.calculateWithMods(combination);
}

function calculatePerformance(options) {
  const { difficulty, scoreInfo, ruleset } = options;

  if (!difficulty || !scoreInfo || !ruleset) {
    throw new Error('Cannot calculate performance attributes');
  }

  const calculator = ruleset.createPerformanceCalculator(difficulty, scoreInfo);

  return calculator.calculateAttributes();
}

function getDifficultyMods(rulesetId, mods) {
  const ruleset = getRulesetById(rulesetId);
  const difficultyCalculator = ruleset.createDifficultyCalculator(new osuClasses.Beatmap());
  const difficultyMods = difficultyCalculator.difficultyMods;
  const combination = ruleset.createModCombination(mods);
  const difficultyBitwise = combination.all.reduce((bitwise, mod) => {
    const found = difficultyMods.find((m) => {
      if (m.bitwise === mod.bitwise) {
        return true;
      }

      return m.acronym === 'DT' && mod.acronym === 'NC';
    });

    return bitwise + (found?.bitwise ?? 0);
  }, 0);

  return ruleset.createModCombination(difficultyBitwise);
}

async function parseBeatmap(options) {
  const { beatmapId, fileURL, hash, savePath } = options;

  if (typeof beatmapId === 'string' || typeof beatmapId === 'number') {
    return parseBeatmapById(beatmapId, hash, savePath);
  }

  if (typeof fileURL === 'string') {
    return parseCustomBeatmap(fileURL, hash, savePath);
  }

  throw new Error('No beatmap ID or beatmap URL was specified!');
}

async function parseBeatmapById(id, hash, savePath) {
  let _a;
  const result = await downloadFile(savePath, {
    save: typeof savePath === 'string',
    id,
  });

  if (!result.isSuccessful || (!savePath && !result.buffer)) {
    throw new Error(`${result.fileName} failed to download!`);
  }

  const data = savePath
    ? fs.readFileSync(result.filePath)
    : result.buffer;
  const parsed = parseBeatmapData(data, hash);

  (_a = parsed.data.metadata).beatmapId || (_a.beatmapId = parseInt(id));

  return parsed;
}

async function parseCustomBeatmap(url, hash, savePath) {
  const result = await downloadFile(savePath, {
    save: typeof savePath === 'string',
    url,
  });

  if (!result.isSuccessful || (!savePath && !result.buffer)) {
    throw new Error('Custom beatmap failed to download!');
  }

  const data = savePath
    ? fs.readFileSync(result.filePath)
    : result.buffer;

  return parseBeatmapData(data, hash);
}

function parseBeatmapData(data, hash) {
  const stringified = data.toString();
  const targetHash = md5__default['default'](stringified);

  if (hash && hash !== targetHash) {
    throw new Error('Wrong beatmap file!');
  }

  const decoder = new osuParsers.BeatmapDecoder();
  const parseSb = false;

  return {
    data: decoder.decodeFromString(stringified, parseSb),
    hash: targetHash,
  };
}

async function parseScore(options) {
  const { fileURL, hash } = options;

  if (typeof fileURL === 'string') {
    return parseCustomScore(fileURL, hash);
  }

  throw new Error('No replay URL was specified!');
}

async function parseCustomScore(url, hash) {
  const result = await downloadFile('', {
    type: osuDownloader.DownloadType.Replay,
    save: false,
    url,
  });

  if (!result.isSuccessful || !result.buffer) {
    throw new Error('Replay failed to download!');
  }

  return parseScoreData(result.buffer, hash);
}

async function parseScoreData(data, hash) {
  const targetHash = md5__default['default'](data);

  if (hash && hash !== targetHash) {
    throw new Error('Wrong beatmap file!');
  }

  const decoder = new osuParsers.ScoreDecoder();
  const parseReplay = false;

  return {
    data: await decoder.decodeFromBuffer(data, parseReplay),
    hash: targetHash,
  };
}

class ScoreSimulator {
  simulate(options) {
    const statistics = generateHitStatistics(options.beatmap, options.accuracy, options.countMiss, options.count50, options.count100);
    const beatmap = options.beatmap;
    const beatmapCombo = getMaxCombo(beatmap);
    const percentage = options.percentCombo ?? 100;
    const multiplier = Math.max(0, Math.min(percentage, 100)) / 100;
    const scoreCombo = options.maxCombo ?? beatmapCombo * multiplier;
    const misses = statistics.miss ?? 0;
    const limitedCombo = Math.min(scoreCombo, beatmapCombo - misses);
    const maxCombo = Math.max(0, limitedCombo);
    const scoreInfo = this._generateScoreInfo({
      totalScore: options.totalScore,
      rulesetId: beatmap.mode,
      mods: getMods(options.beatmap),
      totalHits: getTotalHits(beatmap),
      statistics,
      maxCombo,
    });

    return scoreInfo;
  }
  simulateFC(scoreInfo, beatmap) {
    if (scoreInfo.rulesetId === exports.GameMode.Mania) {
      return this.simulateMax(beatmap);
    }

    const statistics = getValidHitStatistics(scoreInfo.statistics);
    const totalHits = getTotalHits(beatmap);

    switch (scoreInfo.rulesetId) {
      case exports.GameMode.Fruits:
        statistics.great = totalHits - statistics.largeTickHit
                    - statistics.smallTickHit - statistics.smallTickMiss - statistics.miss;

        statistics.largeTickHit += statistics.miss;
        break;
      case exports.GameMode.Mania:
        statistics.perfect = totalHits - statistics.great
                    - statistics.good - statistics.ok - statistics.meh;

        break;
      default:
        statistics.great = totalHits - statistics.ok - statistics.meh;
    }

    statistics.miss = 0;

    return this._generateScoreInfo({
      rulesetId: beatmap.mode,
      maxCombo: getMaxCombo(beatmap),
      mods: scoreInfo.mods ?? getMods(beatmap),
      statistics,
      totalHits,
    });
  }
  simulateMax(beatmap) {
    const statistics = generateHitStatistics(beatmap);
    const totalHits = getTotalHits(beatmap);
    const score = this._generateScoreInfo({
      rulesetId: beatmap.mode,
      maxCombo: getMaxCombo(beatmap),
      mods: getMods(beatmap),
      statistics,
      totalHits,
    });

    if (beatmap.mode === exports.GameMode.Mania) {
      score.totalScore = 1e6;
    }

    return score;
  }
  _generateScoreInfo(options) {
    const scoreInfo = new osuClasses.ScoreInfo();

    scoreInfo.maxCombo = options?.maxCombo ?? 0;
    scoreInfo.statistics = getValidHitStatistics(options?.statistics);
    scoreInfo.mods = options?.mods?.clone() ?? null;
    scoreInfo.rulesetId = options?.rulesetId ?? exports.GameMode.Osu;
    scoreInfo.passed = scoreInfo.totalHits >= (options?.totalHits ?? 0);
    scoreInfo.totalScore = options?.totalScore
            ?? (scoreInfo.rulesetId === exports.GameMode.Mania ? 1e6 : 0);

    scoreInfo.accuracy = options.accuracy ?? calculateAccuracy(scoreInfo);
    scoreInfo.rank = osuClasses.ScoreRank[calculateRank(scoreInfo)];

    return scoreInfo;
  }
}

class BeatmapCalculator {
  constructor() {
    this._scoreSimulator = new ScoreSimulator();
  }
  async calculate(options) {
    const { data: parsed, hash: beatmapMD5 } = await parseBeatmap(options);
    const ruleset = options.ruleset ?? getRulesetById(options.rulesetId ?? parsed.mode);
    const combination = ruleset.createModCombination(options.mods);
    const beatmap = ruleset.applyToBeatmapWithMods(parsed, combination);
    const scores = this._simulateScores(beatmap, options);
    const difficulty = options.difficulty ?? calculateDifficulty({ beatmap, ruleset });
    const performance = scores.map((scoreInfo) => calculatePerformance({
      difficulty,
      ruleset,
      scoreInfo,
    }));
    const beatmapInfo = createBeatmapInfoFromBeatmap(beatmap);

    return {
      beatmapInfo,
      difficulty,
      performance,
      beatmapMD5,
    };
  }
  _simulateScores(beatmap, options) {
    return beatmap.mode === exports.GameMode.Mania
      ? this._simulateManiaScores(beatmap, options.totalScores)
      : this._simulateOtherScores(beatmap, options.accuracy);
  }
  _simulateOtherScores(beatmap, accuracy) {
    if (!accuracy) {
      return [];
    }

    return accuracy.map((accuracy) => this._scoreSimulator.simulate({
      beatmap,
      accuracy,
    }));
  }
  _simulateManiaScores(beatmap, totalScores) {
    if (!totalScores) {
      return [];
    }

    return totalScores.map((totalScore) => this._scoreSimulator.simulate({
      beatmap,
      totalScore,
    }));
  }
}

class ScoreCalculator {
  constructor() {
    this._scoreSimulator = new ScoreSimulator();
  }
  async calculate(options) {
    const scoreInfo = this._getScore(options);
    const difficulty = await this._getDifficulty(options);
    const performance = calculatePerformance({
      ruleset: getRulesetById(difficulty.mods.mode),
      difficulty,
      scoreInfo,
    });

    return {
      scoreInfo,
      difficulty,
      performance,
    };
  }
  _getScore(options) {
    if (options.scoreInfo) {
      return options.scoreInfo;
    }

    return this._scoreSimulator.simulate(options);
  }
  async _getDifficulty(options) {
    if (options.difficulty) {
      return options.difficulty;
    }

    const parsed = await parseBeatmap(options);
    const ruleset = options.ruleset
            ?? getRulesetById(options.rulesetId ?? parsed.data.mode);

    return calculateDifficulty({
      beatmap: parsed.data,
      ruleset,
    });
  }
}

exports.BeatmapCalculator = BeatmapCalculator;
exports.ScoreCalculator = ScoreCalculator;
exports.ScoreSimulator = ScoreSimulator;
exports.calculateAccuracy = calculateAccuracy;
exports.calculateDifficulty = calculateDifficulty;
exports.calculatePerformance = calculatePerformance;
exports.calculateRank = calculateRank;
exports.countDroplets = countDroplets;
exports.countFruits = countFruits;
exports.countObjects = countObjects;
exports.countTinyDroplets = countTinyDroplets;
exports.createBeatmapInfoFromBeatmap = createBeatmapInfoFromBeatmap;
exports.downloadFile = downloadFile;
exports.generateHitStatistics = generateHitStatistics;
exports.getDifficultyMods = getDifficultyMods;
exports.getMaxCombo = getMaxCombo;
exports.getMods = getMods;
exports.getRulesetById = getRulesetById;
exports.getRulesetIdByName = getRulesetIdByName;
exports.getTotalHits = getTotalHits;
exports.getValidHitStatistics = getValidHitStatistics;
exports.parseBeatmap = parseBeatmap;
exports.parseScore = parseScore;
