'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

let osuClasses = require('osu-classes');
let osuTaikoStable = require('osu-taiko-stable');
let osuStandardStable = require('osu-standard-stable');
let osuCatchStable = require('osu-catch-stable');
let osuManiaStable = require('osu-mania-stable');
let promises = require('fs/promises');
let osuDownloader = require('osu-downloader');
let osuParsers = require('osu-parsers');

function calculateDifficulty(options) {
  const { beatmap, ruleset, mods } = options;

  if (!beatmap || !ruleset) {
    throw new Error('Cannot calculate difficulty attributes');
  }

  const calculator = options.calculator
        ?? ruleset.createDifficultyCalculator(beatmap);

  if (typeof mods !== 'string' && typeof mods !== 'number') {
    return calculator.calculateAt(options.totalHits);
  }

  const combination = ruleset.createModCombination(mods);

  return calculator.calculateWithModsAt(combination, options.totalHits);
}

function calculatePerformance(options) {
  const { difficulty, scoreInfo, ruleset } = options;

  if (!difficulty || !scoreInfo || !ruleset) {
    throw new Error('Cannot calculate performance attributes');
  }

  const castedDifficulty = difficulty;
  const calculator = ruleset.createPerformanceCalculator(castedDifficulty, scoreInfo);

  return calculator.calculateAttributes();
}

exports.GameMode = void 0;

(function(GameMode) {
  GameMode[GameMode['Osu'] = 0] = 'Osu';
  GameMode[GameMode['Taiko'] = 1] = 'Taiko';
  GameMode[GameMode['Fruits'] = 2] = 'Fruits';
  GameMode[GameMode['Mania'] = 3] = 'Mania';
})(exports.GameMode || (exports.GameMode = {}));

class ExtendedStandardDifficultyCalculator extends osuStandardStable.StandardDifficultyCalculator {
  constructor() {
    super(...arguments);
    this._skills = [];
  }
  getSkills() {
    return this._skills;
  }
  _createDifficultyAttributes(beatmap, mods, skills, clockRate) {
    this._skills = skills;

    return super._createDifficultyAttributes(beatmap, mods, skills, clockRate);
  }
}

class ExtendedTaikoDifficultyCalculator extends osuTaikoStable.TaikoDifficultyCalculator {
  constructor() {
    super(...arguments);
    this._skills = [];
  }
  getSkills() {
    return this._skills;
  }
  _createDifficultyAttributes(beatmap, mods, skills, clockRate) {
    this._skills = skills;

    return super._createDifficultyAttributes(beatmap, mods, skills, clockRate);
  }
}

class ExtendedCatchDifficultyCalculator extends osuCatchStable.CatchDifficultyCalculator {
  constructor() {
    super(...arguments);
    this._skills = [];
  }
  getSkills() {
    return this._skills;
  }
  _createDifficultyAttributes(beatmap, mods, skills, clockRate) {
    this._skills = skills;

    return super._createDifficultyAttributes(beatmap, mods, skills, clockRate);
  }
}

class ExtendedManiaDifficultyCalculator extends osuManiaStable.ManiaDifficultyCalculator {
  constructor() {
    super(...arguments);
    this._skills = [];
  }
  getSkills() {
    return this._skills;
  }
  _createDifficultyAttributes(beatmap, mods, skills, clockRate) {
    this._skills = skills;

    return super._createDifficultyAttributes(beatmap, mods, skills, clockRate);
  }
}

function createDifficultyCalculator(beatmap, ruleset) {
  switch (ruleset.id) {
    case exports.GameMode.Osu:
      return new ExtendedStandardDifficultyCalculator(beatmap, ruleset);
    case exports.GameMode.Taiko:
      return new ExtendedTaikoDifficultyCalculator(beatmap, ruleset);
    case exports.GameMode.Fruits:
      return new ExtendedCatchDifficultyCalculator(beatmap, ruleset);
    case exports.GameMode.Mania:
      return new ExtendedManiaDifficultyCalculator(beatmap, ruleset);
  }

  throw new Error('This ruleset does not support strain output!');
}

function createBeatmapInfo(beatmap, hash) {
  return new osuClasses.BeatmapInfo({
    id: beatmap?.metadata.beatmapId,
    beatmapsetId: beatmap?.metadata.beatmapSetId,
    creator: beatmap?.metadata.creator,
    title: beatmap?.metadata.title,
    artist: beatmap?.metadata.artist,
    version: beatmap?.metadata.version,
    hittable: countObjects(osuClasses.HitType.Normal, beatmap),
    slidable: countObjects(osuClasses.HitType.Slider, beatmap),
    spinnable: countObjects(osuClasses.HitType.Spinner, beatmap),
    holdable: countObjects(osuClasses.HitType.Hold, beatmap),
    length: (beatmap?.length ?? 0) / 1000,
    bpmMin: beatmap?.bpmMin,
    bpmMax: beatmap?.bpmMax,
    bpmMode: beatmap?.bpmMode,
    circleSize: beatmap?.difficulty.circleSize,
    approachRate: beatmap?.difficulty.approachRate,
    overallDifficulty: beatmap?.difficulty.overallDifficulty,
    drainRate: beatmap?.difficulty.drainRate,
    rulesetId: beatmap?.mode,
    mods: getMods(beatmap),
    maxCombo: getMaxCombo(beatmap),
    isConvert: beatmap?.originalMode !== beatmap?.mode,
    md5: hash ?? '',
  });
}

function createBeatmapAttributes(beatmap) {
  const hittable = countObjects(osuClasses.HitType.Normal, beatmap);
  const maxTinyDroplets = countTinyDroplets(beatmap);
  const maxDroplets = countDroplets(beatmap) - maxTinyDroplets;
  const maxFruits = countFruits(beatmap) + hittable;
  const totalHits = beatmap?.mode === exports.GameMode.Fruits
    ? maxFruits + maxDroplets + maxTinyDroplets
    : getTotalHits(beatmap);

  return {
    beatmapId: beatmap?.metadata.beatmapId,
    rulesetId: beatmap?.mode,
    mods: getMods(beatmap)?.toString() ?? 'NM',
    maxCombo: getMaxCombo(beatmap),
    clockRate: beatmap?.difficulty.clockRate ?? 1,
    totalHits,
    maxFruits,
    maxDroplets,
    maxTinyDroplets,
  };
}

function countObjects(hitType, beatmap) {
  if (!beatmap) {
    return 0;
  }

  return beatmap.hitObjects.reduce((sum, obj) => {
    return sum + (obj.hitType & hitType ? 1 : 0);
  }, 0);
}

function countFruits(beatmap) {
  return countNested(osuCatchStable.JuiceFruit, beatmap);
}

function countDroplets(beatmap) {
  return countNested(osuCatchStable.JuiceDroplet, beatmap);
}

function countTinyDroplets(beatmap) {
  return countNested(osuCatchStable.JuiceTinyDroplet, beatmap);
}

function countNested(Class, beatmap) {
  const rulesetBeatmap = beatmap;

  return rulesetBeatmap.hitObjects.reduce((sum, obj) => {
    const nestedSum = obj.nestedHitObjects?.reduce((sum, obj) => {
      return sum + (obj instanceof Class ? 1 : 0);
    }, 0);

    return sum + (nestedSum ?? 0);
  }, 0);
}

function getTotalHits(beatmap) {
  if (!beatmap) {
    return 0;
  }

  switch (beatmap.mode) {
    case exports.GameMode.Osu: {
      const circles = countObjects(osuClasses.HitType.Normal, beatmap);
      const sliders = countObjects(osuClasses.HitType.Slider, beatmap);
      const spinners = countObjects(osuClasses.HitType.Spinner, beatmap);

      return circles + sliders + spinners;
    }
    case exports.GameMode.Taiko: {
      return countObjects(osuClasses.HitType.Normal, beatmap);
    }
    case exports.GameMode.Fruits: {
      const hittable = countObjects(osuClasses.HitType.Normal, beatmap);
      const tinyDroplets = countTinyDroplets(beatmap);
      const droplets = countDroplets(beatmap) - tinyDroplets;
      const fruits = countFruits(beatmap) + hittable;

      return fruits + droplets + tinyDroplets;
    }
    case exports.GameMode.Mania: {
      const notes = countObjects(osuClasses.HitType.Normal, beatmap);
      const holds = countObjects(osuClasses.HitType.Hold, beatmap);

      return notes + holds;
    }
  }

  const hittable = countObjects(osuClasses.HitType.Normal, beatmap);
  const slidable = countObjects(osuClasses.HitType.Slider, beatmap);
  const spinnable = countObjects(osuClasses.HitType.Spinner, beatmap);
  const holdable = countObjects(osuClasses.HitType.Hold, beatmap);

  return hittable + slidable + spinnable + holdable;
}

function getMaxCombo(beatmap) {
  return beatmap?.maxCombo ?? 0;
}

function getMods(beatmap) {
  return beatmap?.mods ?? null;
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

function toDifficultyMods(mods, rulesetId) {
  const ruleset = getRulesetById(rulesetId ?? exports.GameMode.Osu);
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

function toCombination(input, rulesetId) {
  const ruleset = getRulesetById(rulesetId ?? exports.GameMode.Osu);

  return ruleset.createModCombination(input);
}

function toDifficultyAttributes(difficulty, rulesetId) {
  const attributes = createAttributes(rulesetId, difficulty?.mods);

  if (typeof difficulty !== 'object') {
    return attributes;
  }

  for (const key in difficulty) {
    if (key in attributes) {
      attributes[key] = difficulty[key];
    }
  }

  return attributes;
}

function toScoreInfo(data) {
  const scoreInfo = new osuClasses.ScoreInfo();

  if (data?.toJSON) {
    return scoreInfo;
  }

  const jsonable = data;

  scoreInfo.id = jsonable?.id;
  scoreInfo.totalScore = jsonable?.totalScore;
  scoreInfo.pp = jsonable?.pp;
  scoreInfo.maxCombo = jsonable?.maxCombo;
  scoreInfo.passed = jsonable?.passed;
  scoreInfo.perfect = jsonable?.perfect;
  scoreInfo.rank = jsonable?.rank;
  scoreInfo.accuracy = jsonable?.accuracy;
  scoreInfo.username = jsonable?.username;
  scoreInfo.userId = jsonable?.userId;
  scoreInfo.beatmapId = jsonable?.beatmapId;
  scoreInfo.date = jsonable?.date;
  scoreInfo.beatmapHashMD5 = jsonable?.beatmapHashMD5;
  scoreInfo.rulesetId = jsonable?.rulesetId;
  scoreInfo.mods = toCombination(jsonable.mods, jsonable.rulesetId);
  scoreInfo.countGeki = jsonable?.countGeki;
  scoreInfo.count300 = jsonable?.count300;
  scoreInfo.countKatu = jsonable?.countKatu;
  scoreInfo.count100 = jsonable?.count100;
  scoreInfo.count50 = jsonable?.count50;
  scoreInfo.countMiss = jsonable?.countMiss;

  return scoreInfo;
}

function createAttributes(rulesetId, mods) {
  const ruleset = getRulesetById(rulesetId ?? exports.GameMode.Osu);
  const combination = ruleset.createModCombination(mods);

  switch (ruleset.id) {
    case exports.GameMode.Taiko: return new osuTaikoStable.TaikoDifficultyAttributes(combination, 0);
    case exports.GameMode.Fruits: return new osuCatchStable.CatchDifficultyAttributes(combination, 0);
    case exports.GameMode.Mania: return new osuManiaStable.ManiaDifficultyAttributes(combination, 0);
  }

  return new osuStandardStable.StandardDifficultyAttributes(combination, 0);
}

const downloader = new osuDownloader.Downloader();

async function downloadFile(path, options) {
  if (downloader.rootPath !== path) {
    downloader.updateSettings({ rootPath: path });
  }

  const entry = new osuDownloader.DownloadEntry(options);

  downloader.addSingleEntry(entry);

  return downloader.downloadSingle();
}

function generateHitStatistics(options) {
  switch (options.attributes.rulesetId) {
    case exports.GameMode.Taiko:
      return generateTaikoHitStatistics(options);
    case exports.GameMode.Fruits:
      return generateCatchHitStatistics(options);
    case exports.GameMode.Mania:
      return generateManiaHitStatistics(options);
  }

  return generateOsuHitStatistics(options);
}

function generateOsuHitStatistics(options) {
  const attributes = options.attributes;
  const accuracy = getAccuracy(options);
  const totalHits = attributes.totalHits ?? 0;
  let count50 = options.count50;
  let count100 = options.count100;
  let countMiss = options.countMiss ?? 0;

  countMiss = osuClasses.MathUtils.clamp(countMiss, 0, totalHits);
  count50 = count50 ? osuClasses.MathUtils.clamp(count50, 0, totalHits - countMiss) : 0;

  if (typeof count100 !== 'number') {
    count100 = Math.round((totalHits - totalHits * accuracy) * 1.5);
  }
  else {
    count100 = osuClasses.MathUtils.clamp(count100, 0, totalHits - count50 - countMiss);
  }

  const count300 = totalHits - count100 - count50 - countMiss;

  return {
    great: count300,
    ok: count100,
    meh: count50,
    miss: countMiss,
  };
}

function generateTaikoHitStatistics(options) {
  const attributes = options.attributes;
  const accuracy = getAccuracy(options);
  const totalHits = attributes.totalHits ?? 0;
  let count100 = options.count100;
  let countMiss = options.countMiss ?? 0;

  countMiss = osuClasses.MathUtils.clamp(countMiss, 0, totalHits);

  let count300;

  if (typeof count100 !== 'number') {
    const targetTotal = Math.round(accuracy * totalHits * 2);

    count300 = targetTotal - (totalHits - countMiss);
    count100 = totalHits - count300 - countMiss;
  }
  else {
    count100 = osuClasses.MathUtils.clamp(count100, 0, totalHits - countMiss);
    count300 = totalHits - count100 - countMiss;
  }

  return {
    great: count300,
    ok: count100,
    miss: countMiss,
  };
}

function generateCatchHitStatistics(options) {
  const attributes = options.attributes;
  const accuracy = getAccuracy(options);
  const count50 = options.count50;
  const count100 = options.count100;
  let countMiss = options.countMiss ?? 0;
  const maxCombo = attributes.maxCombo ?? 0;
  const maxFruits = attributes.maxFruits ?? 0;
  const maxDroplets = attributes.maxDroplets ?? 0;
  const maxTinyDroplets = attributes.maxTinyDroplets ?? 0;

  if (typeof count100 === 'number') {
    countMiss += maxDroplets - count100;
  }

  countMiss = osuClasses.MathUtils.clamp(countMiss, 0, maxDroplets + maxFruits);

  let droplets = count100 ?? Math.max(0, maxDroplets - countMiss);

  droplets = osuClasses.MathUtils.clamp(droplets, 0, maxDroplets);

  const fruits = maxFruits - (countMiss - (maxDroplets - droplets));
  let tinyDroplets = Math.round(accuracy * (maxCombo + maxTinyDroplets));

  tinyDroplets = count50 ?? tinyDroplets - fruits - droplets;

  const tinyMisses = maxTinyDroplets - tinyDroplets;

  return {
    great: osuClasses.MathUtils.clamp(fruits, 0, maxFruits),
    largeTickHit: osuClasses.MathUtils.clamp(droplets, 0, maxDroplets),
    smallTickHit: tinyDroplets,
    smallTickMiss: tinyMisses,
    miss: countMiss,
  };
}

function generateManiaHitStatistics(options) {
  const attributes = options.attributes;
  const accuracy = getAccuracy(options);
  const totalHits = attributes.totalHits ?? 0;
  let count300 = options.count300 ?? 0;
  let countKatu = options.countKatu ?? 0;
  let count100 = options.count100 ?? 0;
  let count50 = options.count50;
  let countMiss = options.countMiss ?? 0;

  countMiss = osuClasses.MathUtils.clamp(countMiss, 0, totalHits);
  count50 ?? (count50 = Math.round(1.2 * (totalHits - totalHits * accuracy) - 0.8 * count100 - 0.4 * countKatu - 1.2 * countMiss));

  let currentCounts = countMiss;

  count50 = osuClasses.MathUtils.clamp(count50, 0, totalHits - currentCounts);
  currentCounts += count50;
  count100 = osuClasses.MathUtils.clamp(count100, 0, totalHits - currentCounts);
  currentCounts += count100;
  countKatu = osuClasses.MathUtils.clamp(countKatu, 0, totalHits - currentCounts);
  currentCounts += countKatu;
  count300 = osuClasses.MathUtils.clamp(count300, 0, totalHits - currentCounts);

  const countGeki = totalHits - count300 - countKatu - count100 - count50 - countMiss;

  return {
    perfect: countGeki,
    great: count300,
    good: countKatu,
    ok: count100,
    meh: count50,
    miss: countMiss,
  };
}

function getAccuracy(options) {
  if (typeof options.accuracy !== 'number') {
    return 1;
  }

  if (options.accuracy > 1) {
    return options.accuracy / 100;
  }

  return options.accuracy;
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

function calculateAccuracy(scoreInfo) {
  const geki = scoreInfo.countGeki;
  const katu = scoreInfo.countKatu;
  const c300 = scoreInfo.count300;
  const c100 = scoreInfo.count100;
  const c50 = scoreInfo.count50;
  const total = scoreInfo.totalHits || calculateTotalHits(scoreInfo);

  if (total <= 0) {
    return 1;
  }

  switch (scoreInfo.rulesetId) {
    case exports.GameMode.Osu:
      return Math.max(0, (c50 / 6 + c100 / 3 + c300) / total);
    case exports.GameMode.Taiko:
      return Math.max(0, (c100 / 2 + c300) / total);
    case exports.GameMode.Fruits:
      return Math.max(0, (c50 + c100 + c300) / total);
    case exports.GameMode.Mania:
      return Math.max(0, (c50 / 6 + c100 / 3 + katu / 1.5 + (c300 + geki)) / total);
  }

  return 1;
}

function calculateTotalHits(scoreInfo) {
  const geki = scoreInfo.countGeki;
  const katu = scoreInfo.countKatu;
  const c300 = scoreInfo.count300;
  const c100 = scoreInfo.count100;
  const c50 = scoreInfo.count50;
  const misses = scoreInfo.countMiss;

  switch (scoreInfo.rulesetId) {
    case exports.GameMode.Osu:
      return c300 + c100 + c50 + misses;
    case exports.GameMode.Taiko:
      return c300 + c100 + c50 + misses;
    case exports.GameMode.Fruits:
      return c300 + c100 + c50 + misses + katu;
    case exports.GameMode.Mania:
      return c300 + c100 + c50 + misses + geki + katu;
  }

  return c300 + c100 + c50 + misses + geki + katu;
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

function clampStats(value, hasDT = false) {
  const MIN_LIMIT = 0;
  const MAX_LIMIT = hasDT ? 11 : 10;

  return osuClasses.MathUtils.clamp(value, MIN_LIMIT, MAX_LIMIT);
}

function clampRate(value) {
  const MIN_LIMIT = 0.25;
  const MAX_LIMIT = 3.0;

  return osuClasses.MathUtils.clamp(value, MIN_LIMIT, MAX_LIMIT);
}

function clampBPM(value) {
  const MIN_LIMIT = 60;
  const MAX_LIMIT = 10000;

  return osuClasses.MathUtils.clamp(value, MIN_LIMIT, MAX_LIMIT);
}

function applyCustomCircleSize(beatmap, mods, stats) {
  if (typeof stats.circleSize !== 'number') {
    return;
  }

  const denominator = mods.has('HR') ? 1.3 : (mods.has('EZ') ? 0.5 : 1);
  const shouldLockCS = stats.lockStats || stats.lockCircleSize;

  beatmap.difficulty.circleSize = clampStats(shouldLockCS ? stats.circleSize / denominator : stats.circleSize);
}

function applyCustomStats(beatmap, mods, stats) {
  const { clockRate, bpm } = stats;

  if (typeof clockRate === 'number') {
    beatmap.difficulty.clockRate = clampRate(clockRate);
  }
  else if (beatmap.difficulty.clockRate === 1 && typeof bpm === 'number') {
    beatmap.difficulty.clockRate = clampBPM(bpm) / beatmap.bpmMode;
  }

  beatmap.difficulty.approachRate = getScaledAR(beatmap, mods, stats);
  beatmap.difficulty.overallDifficulty = getScaledOD(beatmap, mods, stats);
}

function getScaledAR(beatmap, mods, stats) {
  if (typeof stats.approachRate !== 'number') {
    return beatmap.difficulty.approachRate;
  }

  const hasDT = mods.has('DT') || mods.has('NC');

  if (!stats.lockStats && !stats.lockApproachRate) {
    const multiplier = mods.has('HR') ? 1.4 : (mods.has('EZ') ? 0.5 : 1);

    return clampStats(stats.approachRate * multiplier, hasDT);
  }

  const newApproachRate = clampStats(stats.approachRate, hasDT);
  const adjustedRate = beatmap.difficulty.clockRate;

  switch (beatmap.mode) {
    case exports.GameMode.Osu:
    case exports.GameMode.Fruits: {
      const preemptMs = newApproachRate <= 5
        ? 1800 - newApproachRate * 120
        : 1200 - (newApproachRate - 5) * 150;
      const adjustedPreemptMs = preemptMs * adjustedRate;

      return adjustedPreemptMs <= 1200
        ? ((adjustedPreemptMs - 1200) * 5 / (450 - 1200)) + 5
        : 5 - ((adjustedPreemptMs - 1200) * 5 / (1800 - 1200));
    }
  }

  return newApproachRate;
}

function getScaledOD(beatmap, mods, stats) {
  if (typeof stats.overallDifficulty !== 'number') {
    return beatmap.difficulty.overallDifficulty;
  }

  const hasDT = mods.has('DT') || mods.has('NC');

  if (!stats.lockStats && !stats.lockOverallDifficulty) {
    const multiplier = mods.has('HR') ? 1.4 : (mods.has('EZ') ? 0.5 : 1);

    return clampStats(stats.overallDifficulty * multiplier, hasDT);
  }

  const newOverallDifficulty = clampStats(stats.overallDifficulty, hasDT);
  const adjustedRate = beatmap.difficulty.clockRate;

  switch (beatmap.mode) {
    case exports.GameMode.Osu: {
      const hitWindowGreat = (80 - 6 * newOverallDifficulty);
      const adjustedHitWindowGreat = hitWindowGreat * adjustedRate;

      return adjustedHitWindowGreat <= 50
        ? ((adjustedHitWindowGreat - 50) * 5 / (20 - 50)) + 5
        : 5 - ((adjustedHitWindowGreat - 50) * 5 / (80 - 50));
    }
    case exports.GameMode.Taiko: {
      return newOverallDifficulty;
    }
  }

  return newOverallDifficulty;
}

const DEFAULT_SAVE_PATH = './cache';

async function parseBeatmap(options) {
  const { beatmapId, fileURL, hash, savePath, cacheFiles } = options;

  if (beatmapId && parseInt(beatmapId)) {
    return parseBeatmapById(beatmapId, hash, savePath, cacheFiles);
  }

  if (fileURL) {
    return parseCustomBeatmap(fileURL, hash, savePath, cacheFiles);
  }

  throw new Error('No beatmap ID or file URL was found!');
}

async function parseBeatmapById(id, hash, savePath, cacheFile = true) {
  let _a;

  savePath ?? (savePath = DEFAULT_SAVE_PATH);

  const result = await downloadFile(savePath, {
    save: cacheFile,
    id,
  });

  if (!result.isSuccessful || (!savePath && !result.buffer)) {
    throw new Error(`Beatmap with ID "${id}" failed to download: "${result.statusText}"`);
  }

  if (hash && hash !== result.md5) {
    throw new Error('Beatmap MD5 checksum missmatch!');
  }

  const data = savePath
    ? await promises.readFile(result.filePath)
    : result.buffer;
  const parsed = parseBeatmapData(data);

  (_a = parsed.metadata).beatmapId || (_a.beatmapId = parseInt(id));

  return {
    hash: result.md5,
    data: parsed,
  };
}

async function parseCustomBeatmap(url, hash, savePath, cacheFile = true) {
  const data = await promises.readFile(url);

  return {
    data: parseBeatmapData(data),
    hash: '',
  };
}

function parseBeatmapData(data) {
  return new osuParsers.BeatmapDecoder().decodeFromBuffer(data, {
    parseColours: false,
    parseEditor: false,
    parseEvents: false,
    parseStoryboard: false,
  });
}

async function parseScore(options) {
  const { replayURL, hash, lifeBar } = options;

  if (typeof replayURL === 'string') {
    return parseCustomScore(replayURL, hash, lifeBar);
  }

  throw new Error('No replay URL was specified!');
}

async function parseCustomScore(url, hash, parseReplay = false) {
  const result = await downloadFile('', {
    type: osuDownloader.DownloadType.Replay,
    save: false,
    url,
  });

  if (!result.isSuccessful || !result.buffer) {
    throw new Error('Replay failed to download!');
  }

  if (hash && hash !== result.md5) {
    throw new Error('Replay MD5 checksum missmatch!');
  }

  return {
    data: await parseScoreData(result.buffer, parseReplay),
    hash: result.md5,
  };
}

async function parseScoreData(data, parseReplay = false) {
  return await new osuParsers.ScoreDecoder().decodeFromBuffer(data, parseReplay);
}

class ScoreSimulator {
  async completeReplay(score, attributes) {
    const scoreInfo = score.info;
    const beatmapCombo = attributes.maxCombo ?? 0;

    return this._generateScoreInfo({
      ...scoreInfo,
      beatmapId: attributes.beatmapId,
      rulesetId: attributes.rulesetId,
      totalHits: attributes.totalHits,
      mods: toCombination(attributes.mods, attributes.rulesetId),
      perfect: scoreInfo.maxCombo >= beatmapCombo,
    });
  }
  simulate(options) {
    const statistics = generateHitStatistics(options);
    const attributes = options.attributes;
    const beatmapCombo = attributes.maxCombo ?? 0;
    const percentage = options.percentCombo ?? 100;
    const multiplier = osuClasses.MathUtils.clamp(percentage, 0, 100) / 100;
    const scoreCombo = options.maxCombo ?? Math.round(beatmapCombo * multiplier);
    const misses = statistics.miss ?? 0;
    const limitedCombo = Math.min(scoreCombo, beatmapCombo - misses);
    const maxCombo = Math.max(0, limitedCombo);

    return this._generateScoreInfo({
      beatmapId: attributes.beatmapId,
      rulesetId: attributes.rulesetId,
      totalHits: attributes.totalHits,
      mods: toCombination(attributes.mods, attributes.rulesetId),
      totalScore: options.totalScore,
      perfect: maxCombo >= beatmapCombo,
      statistics,
      maxCombo,
    });
  }
  simulateFC(scoreInfo, attributes) {
    if (scoreInfo.rulesetId === exports.GameMode.Mania) {
      return this.simulateMax(attributes);
    }

    const statistics = getValidHitStatistics(scoreInfo.statistics);
    const totalHits = attributes.totalHits ?? 0;

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
      ...scoreInfo,
      mods: scoreInfo.mods ?? toCombination(attributes.mods, attributes.rulesetId),
      beatmapId: attributes.beatmapId,
      rulesetId: attributes.rulesetId,
      maxCombo: attributes.maxCombo,
      perfect: true,
      statistics,
      totalHits,
    });
  }
  simulateMax(attributes) {
    const statistics = generateHitStatistics({ attributes });
    const totalHits = attributes.totalHits ?? 0;
    const score = this._generateScoreInfo({
      beatmapId: attributes.beatmapId,
      rulesetId: attributes.rulesetId,
      maxCombo: attributes.maxCombo,
      mods: toCombination(attributes.mods, attributes.rulesetId),
      perfect: true,
      statistics,
      totalHits,
    });

    return score;
  }
  _generateScoreInfo(options) {
    const scoreInfo = new osuClasses.ScoreInfo({
      id: options?.id ?? 0,
      beatmapId: options?.beatmapId ?? 0,
      userId: options?.userId ?? 0,
      username: options?.username ?? 'osu!',
      maxCombo: options?.maxCombo ?? 0,
      statistics: getValidHitStatistics(options?.statistics),
      rawMods: options?.rawMods ?? 0,
      rulesetId: options?.rulesetId ?? 0,
      perfect: options?.perfect ?? false,
      beatmapHashMD5: options?.beatmapHashMD5,
      date: options?.date ?? new Date(),
      pp: options?.pp ?? null,
    });

    if (options?.mods) {
      scoreInfo.mods = options.mods;
    }

    scoreInfo.passed = scoreInfo.totalHits >= (options?.totalHits ?? 0);
    scoreInfo.accuracy = calculateAccuracy(scoreInfo);
    scoreInfo.rank = osuClasses.ScoreRank[calculateRank(scoreInfo)];

    return scoreInfo;
  }
}

class BeatmapCalculator {
  constructor() {
    this._scoreSimulator = new ScoreSimulator();
  }
  async calculate(options) {
    if (this._checkPrecalculated(options)) {
      return this._processPrecalculated(options);
    }

    const { data: parsed, hash: beatmapMD5 } = await parseBeatmap(options);
    const ruleset = options.ruleset ?? getRulesetById(options.rulesetId ?? parsed.mode);
    const combination = ruleset.createModCombination(options.mods);

    applyCustomCircleSize(parsed, combination, options);

    const beatmap = ruleset.applyToBeatmapWithMods(parsed, combination);

    applyCustomStats(beatmap, combination, options);

    const beatmapInfo = options.beatmapInfo ?? createBeatmapInfo(beatmap, beatmapMD5);
    const attributes = options.attributes ?? createBeatmapAttributes(beatmap);
    const totalHits = options.totalHits;

    attributes.totalHits = totalHits ?? attributes.totalHits;

    const calculator = createDifficultyCalculator(beatmap, ruleset);
    const difficulty = options.difficulty && !options.strains
      ? toDifficultyAttributes(options.difficulty, ruleset.id)
      : calculateDifficulty({ beatmap, ruleset, calculator, totalHits });
    const skills = options.strains ? this._getSkillsOutput(calculator) : null;
    const scores = this._simulateScores(attributes, options.accuracy);
    const performance = scores.map((scoreInfo) => calculatePerformance({
      difficulty,
      ruleset,
      scoreInfo,
    }));

    return {
      beatmapInfo: beatmapInfo?.toJSON() ?? beatmapInfo,
      attributes,
      skills,
      difficulty,
      performance,
    };
  }
  _processPrecalculated(options) {
    const { beatmapInfo, attributes } = options;
    const ruleset = options.ruleset ?? getRulesetById(attributes.rulesetId);
    const difficulty = toDifficultyAttributes(options.difficulty, ruleset.id);
    const scores = this._simulateScores(attributes, options.accuracy);
    const performance = scores.map((scoreInfo) => calculatePerformance({
      difficulty,
      ruleset,
      scoreInfo,
    }));

    return {
      beatmapInfo: beatmapInfo?.toJSON() ?? beatmapInfo,
      skills: null,
      attributes,
      difficulty,
      performance,
    };
  }
  _checkPrecalculated(options) {
    const isValid = !!options.beatmapInfo
            && !!options.attributes
            && !!options.difficulty
            && !options.strains;

    if (options.attributes && typeof options.totalHits === 'number') {
      return isValid && options.attributes.totalHits === options.totalHits;
    }

    return isValid;
  }
  _getSkillsOutput(calculator) {
    const getStrainSkillOutput = (skills) => {
      const strainSkills = skills.filter((s) => s instanceof osuClasses.StrainSkill);

      return strainSkills.map((skill) => {
        return {
          title: skill.constructor.name,
          strainPeaks: [...skill.getCurrentStrainPeaks()],
        };
      });
    };

    const mainSkills = calculator.getSkills();

    if (mainSkills.length > 0 && mainSkills[0] instanceof osuTaikoStable.Peaks) {
      const peakSkill = mainSkills[0];

      return getStrainSkillOutput([
        peakSkill.rhythm,
        peakSkill.colour,
        peakSkill.stamina,
      ]);
    }

    const skillOutput = getStrainSkillOutput(mainSkills);

    if (skillOutput[0]?.title === 'Aim' && skillOutput[1]?.title === 'Aim') {
      skillOutput[1].title = 'Aim (No Sliders)';
    }

    return skillOutput;
  }
  _simulateScores(attributes, accuracy) {
    accuracy ?? (accuracy = [95, 99, 100]);

    return accuracy.map((accuracy) => this._scoreSimulator.simulate({
      attributes,
      accuracy,
    }));
  }
}

class ScoreCalculator {
  constructor() {
    this._scoreSimulator = new ScoreSimulator();
  }
  async calculate(options) {
    let attributes = options.attributes;
    let beatmapMD5 = options.hash ?? options.attributes?.hash;
    let rulesetId = options.rulesetId ?? options.attributes?.rulesetId;
    let ruleset = options.ruleset;

    if (!ruleset && typeof rulesetId === 'number') {
      ruleset = getRulesetById(rulesetId);
    }

    let difficulty = options.difficulty && ruleset
      ? toDifficultyAttributes(options.difficulty, ruleset.id)
      : null;
    let score = null;
    let beatmapTotalHits = attributes?.totalHits ?? 0;
    let scoreTotalHits = options?.totalHits ?? attributes?.totalHits ?? 0;
    let isPartialDifficulty = beatmapTotalHits > scoreTotalHits;

    if (attributes) {
      score = await this._createScore(options, {
        ...attributes,
        totalHits: options?.totalHits ?? attributes.totalHits,
      });
    }

    if (!attributes || !beatmapMD5 || !ruleset || !score || !difficulty || (isPartialDifficulty && !options.fix)) {
      const { data, hash } = await parseBeatmap(options);

      beatmapMD5 ?? (beatmapMD5 = hash);
      rulesetId ?? (rulesetId = data.mode);
      ruleset ?? (ruleset = getRulesetById(rulesetId));

      const combination = ruleset.createModCombination(options.mods);

      applyCustomCircleSize(data, combination, options);

      const beatmap = ruleset.applyToBeatmapWithMods(data, combination);

      applyCustomStats(beatmap, combination, options);

      if (!attributes) {
        attributes = createBeatmapAttributes(beatmap);
      }

      beatmapTotalHits = getTotalHits(beatmap) ?? 0;
      scoreTotalHits = options?.totalHits ?? attributes.totalHits ?? 0;
      score ?? (score = await this._createScore(options, {
        ...attributes,
        totalHits: Math.min(beatmapTotalHits, scoreTotalHits),
      }));

      score.info.beatmap = createBeatmapInfo(beatmap, beatmapMD5);
      isPartialDifficulty = beatmapTotalHits > scoreTotalHits;

      if (!difficulty || isPartialDifficulty) {
        difficulty = calculateDifficulty({
          totalHits: scoreTotalHits,
          beatmap,
          ruleset,
        });
      }

      if (isPartialDifficulty) {
        score.info.rank = 'F';
        score.info.passed = false;
        score.info.perfect = false;
        score.info.maxCombo = Math.min(score.info.maxCombo, difficulty.maxCombo);
      }
    }

    const scoreBeatmapMD5 = score.info.beatmapHashMD5;

    if (beatmapMD5 && scoreBeatmapMD5 && beatmapMD5 !== scoreBeatmapMD5) {
      throw new Error('Beatmap & replay missmatch!');
    }

    if (beatmapMD5 && !scoreBeatmapMD5) {
      score.info.beatmapHashMD5 = beatmapMD5;
    }

    const performance = calculatePerformance({
      scoreInfo: score.info,
      difficulty,
      ruleset,
    });

    return {
      scoreInfo: score.info.toJSON(),
      lifeBar: score.replay?.lifeBar,
      difficulty,
      performance,
    };
  }
  async _createScore(options, attributes) {
    const score = await this._parseOrSimulateScore(options, attributes);

    if (options.fix) {
      score.info = this._scoreSimulator.simulateFC(score.info, attributes);
    }

    return score;
  }
  async _parseOrSimulateScore(options, attributes) {
    const { scoreInfo, replayURL } = options;

    if (scoreInfo) {
      const info = toScoreInfo(scoreInfo);
      const replay = null;

      return new osuClasses.Score(info, replay);
    }

    if (!replayURL) {
      const info = this._scoreSimulator.simulate({ ...options, attributes });
      const replay = null;

      return new osuClasses.Score(info, replay);
    }

    const { data: score } = await parseScore(options);

    score.info = await this._scoreSimulator.completeReplay(score, attributes);

    return score;
  }
}

exports.BeatmapCalculator = BeatmapCalculator;
exports.ScoreCalculator = ScoreCalculator;
exports.ScoreSimulator = ScoreSimulator;
exports.applyCustomCircleSize = applyCustomCircleSize;
exports.applyCustomStats = applyCustomStats;
exports.calculateAccuracy = calculateAccuracy;
exports.calculateDifficulty = calculateDifficulty;
exports.calculatePerformance = calculatePerformance;
exports.calculateRank = calculateRank;
exports.calculateTotalHits = calculateTotalHits;
exports.createBeatmapAttributes = createBeatmapAttributes;
exports.createBeatmapInfo = createBeatmapInfo;
exports.createDifficultyCalculator = createDifficultyCalculator;
exports.downloadFile = downloadFile;
exports.generateHitStatistics = generateHitStatistics;
exports.getMaxCombo = getMaxCombo;
exports.getMods = getMods;
exports.getRulesetById = getRulesetById;
exports.getRulesetIdByName = getRulesetIdByName;
exports.getTotalHits = getTotalHits;
exports.getValidHitStatistics = getValidHitStatistics;
exports.parseBeatmap = parseBeatmap;
exports.parseScore = parseScore;
exports.toCombination = toCombination;
exports.toDifficultyAttributes = toDifficultyAttributes;
exports.toDifficultyMods = toDifficultyMods;
exports.toScoreInfo = toScoreInfo;
