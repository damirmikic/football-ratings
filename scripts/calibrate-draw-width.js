/**
 * Historical Draw Width Calibration Script
 *
 * Fetches historical match data from football-data.co.uk and calibrates
 * the optimal draw width parameter for ELO-based probability predictions.
 *
 * Usage: node scripts/calibrate-draw-width.js
 */

import https from 'https';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Seasons to fetch (football-data.co.uk format)
  seasons: ['2324', '2223', '2122'],  // 2023-24, 2022-23, 2021-22

  // Leagues to calibrate
  leagues: [
    { code: 'E0', name: 'premier-league', country: 'England', division: 'Premier League' },
    { code: 'I1', name: 'serie-a', country: 'Italy', division: 'Serie A' },
    { code: 'SP1', name: 'la-liga', country: 'Spain', division: 'La Liga' },
    { code: 'D1', name: 'bundesliga', country: 'Germany', division: 'Bundesliga' },
    { code: 'F1', name: 'ligue-1', country: 'France', division: 'Ligue 1' }
  ],

  // Calibration parameters
  minDrawWidth: 50,
  maxDrawWidth: 150,
  step: 5,

  // ELO parameters
  initialRating: 1500,
  kFactor: 32,

  // Output
  outputDir: './calibration-results',
  configOutputPath: './js/draw-width-config.js'
};

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch CSV data from football-data.co.uk
 */
async function fetchHistoricalData(leagueCode, season) {
  const url = `https://www.football-data.co.uk/mmz4281/${season}/${leagueCode}.csv`;

  return new Promise((resolve, reject) => {
    console.log(`Fetching: ${url}`);

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Parse CSV to JSON
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const matches = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());

    if (values.length < headers.length) continue;

    const match = {};
    headers.forEach((header, idx) => {
      match[header] = values[idx];
    });

    // Only include matches with valid results
    if (match.HomeTeam && match.AwayTeam && match.FTR && match.Date) {
      matches.push(match);
    }
  }

  return matches;
}

/**
 * Normalize team name for consistency
 */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// ELO RATING SYSTEM
// ============================================================================

class EloRatingTracker {
  constructor(initialRating = 1500, kFactor = 32) {
    this.ratings = new Map();
    this.initialRating = initialRating;
    this.kFactor = kFactor;
  }

  /**
   * Get team rating (initialize if new)
   */
  getRating(team) {
    if (!this.ratings.has(team)) {
      this.ratings.set(team, this.initialRating);
    }
    return this.ratings.get(team);
  }

  /**
   * Update ratings after a match
   */
  updateRatings(homeTeam, awayTeam, result) {
    const homeRating = this.getRating(homeTeam);
    const awayRating = this.getRating(awayTeam);

    // Expected scores (using simple ELO expectation)
    const homeExpected = 1 / (1 + Math.pow(10, (awayRating - homeRating) / 400));
    const awayExpected = 1 - homeExpected;

    // Actual scores
    let homeActual, awayActual;
    if (result === 'H') {
      homeActual = 1;
      awayActual = 0;
    } else if (result === 'A') {
      homeActual = 0;
      awayActual = 1;
    } else { // Draw
      homeActual = 0.5;
      awayActual = 0.5;
    }

    // Update ratings
    const homeNew = homeRating + this.kFactor * (homeActual - homeExpected);
    const awayNew = awayRating + this.kFactor * (awayActual - awayExpected);

    this.ratings.set(homeTeam, homeNew);
    this.ratings.set(awayTeam, awayNew);
  }

  /**
   * Save ratings snapshot
   */
  snapshot() {
    return new Map(this.ratings);
  }

  /**
   * Get statistics
   */
  getStats() {
    const ratings = Array.from(this.ratings.values());
    return {
      teams: this.ratings.size,
      avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      minRating: Math.min(...ratings),
      maxRating: Math.max(...ratings)
    };
  }
}

// ============================================================================
// PROBABILITY CALCULATION (with variable draw width)
// ============================================================================

/**
 * Calculate match probabilities using ELO with draw width
 * (Same logic as odds-calculator.js but with variable draw width)
 */
function calculateMatchProbabilities(homeRating, awayRating, drawWidth) {
  const diff = homeRating - awayRating;

  // Logistic function
  const F = (x) => 1 / (1 + Math.pow(10, -x / 400));

  // Three-way probabilities using draw margin
  let homeProb = F(diff - drawWidth);
  let drawProb = F(diff + drawWidth) - F(diff - drawWidth);
  let awayProb = 1 - F(diff + drawWidth);

  // Apply bounds
  homeProb = Math.max(0.01, Math.min(0.98, homeProb));
  drawProb = Math.max(0.01, Math.min(0.98, drawProb));
  awayProb = Math.max(0.01, Math.min(0.98, awayProb));

  // Normalize
  const total = homeProb + drawProb + awayProb;
  homeProb /= total;
  drawProb /= total;
  awayProb /= total;

  return { home: homeProb, draw: drawProb, away: awayProb };
}

// ============================================================================
// CALIBRATION ENGINE
// ============================================================================

/**
 * Calculate log loss for a set of matches
 */
function calculateLogLoss(matches, drawWidth) {
  let totalLogLoss = 0;
  let validMatches = 0;

  for (const match of matches) {
    const probs = calculateMatchProbabilities(
      match.homeRating,
      match.awayRating,
      drawWidth
    );

    // Get probability of actual outcome
    let actualProb;
    if (match.result === 'H') actualProb = probs.home;
    else if (match.result === 'D') actualProb = probs.draw;
    else if (match.result === 'A') actualProb = probs.away;
    else continue; // Skip invalid results

    // Log loss with safeguard
    actualProb = Math.max(0.0001, Math.min(0.9999, actualProb));
    totalLogLoss += -Math.log(actualProb);
    validMatches++;
  }

  return validMatches > 0 ? totalLogLoss / validMatches : Infinity;
}

/**
 * Calculate Brier score (alternative metric)
 */
function calculateBrierScore(matches, drawWidth) {
  let totalBrier = 0;
  let validMatches = 0;

  for (const match of matches) {
    const probs = calculateMatchProbabilities(
      match.homeRating,
      match.awayRating,
      drawWidth
    );

    // One-hot encoded actual outcome
    const actual = {
      home: match.result === 'H' ? 1 : 0,
      draw: match.result === 'D' ? 1 : 0,
      away: match.result === 'A' ? 1 : 0
    };

    // Brier score
    const brier =
      Math.pow(probs.home - actual.home, 2) +
      Math.pow(probs.draw - actual.draw, 2) +
      Math.pow(probs.away - actual.away, 2);

    totalBrier += brier;
    validMatches++;
  }

  return validMatches > 0 ? totalBrier / validMatches : Infinity;
}

/**
 * Calculate accuracy (correct predictions)
 */
function calculateAccuracy(matches, drawWidth) {
  let correct = 0;
  let total = 0;

  for (const match of matches) {
    const probs = calculateMatchProbabilities(
      match.homeRating,
      match.awayRating,
      drawWidth
    );

    // Predict most likely outcome
    let predicted;
    if (probs.home > probs.draw && probs.home > probs.away) {
      predicted = 'H';
    } else if (probs.draw > probs.away) {
      predicted = 'D';
    } else {
      predicted = 'A';
    }

    if (predicted === match.result) correct++;
    total++;
  }

  return total > 0 ? correct / total : 0;
}

/**
 * Run calibration for a set of matches
 */
function calibrateDrawWidth(matches, minWidth, maxWidth, step) {
  console.log(`\nCalibrating with ${matches.length} matches...`);

  let bestWidth = 90;
  let lowestLogLoss = Infinity;
  const results = [];

  for (let width = minWidth; width <= maxWidth; width += step) {
    const logLoss = calculateLogLoss(matches, width);
    const brierScore = calculateBrierScore(matches, width);
    const accuracy = calculateAccuracy(matches, width);

    results.push({
      width,
      logLoss,
      brierScore,
      accuracy: accuracy * 100
    });

    if (logLoss < lowestLogLoss) {
      lowestLogLoss = logLoss;
      bestWidth = width;
    }
  }

  return {
    optimalWidth: bestWidth,
    logLoss: lowestLogLoss,
    allResults: results
  };
}

// ============================================================================
// VISUALIZATION & OUTPUT
// ============================================================================

/**
 * Print calibration results table
 */
function printCalibrationResults(calibration, leagueName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`CALIBRATION RESULTS: ${leagueName}`);
  console.log('='.repeat(80));
  console.log('Draw Width | Log Loss | Brier Score | Accuracy | Performance');
  console.log('-'.repeat(80));

  const minLoss = Math.min(...calibration.allResults.map(r => r.logLoss));

  for (const result of calibration.allResults) {
    const isOptimal = result.width === calibration.optimalWidth;
    const bars = '█'.repeat(Math.round((result.logLoss - minLoss) * 200));
    const marker = isOptimal ? ' ← OPTIMAL' : '';

    console.log(
      `${result.width.toString().padStart(10)} | ` +
      `${result.logLoss.toFixed(4)} | ` +
      `${result.brierScore.toFixed(4).padStart(11)} | ` +
      `${result.accuracy.toFixed(2).padStart(7)}% | ` +
      `${bars}${marker}`
    );
  }

  console.log('='.repeat(80));
  console.log(`OPTIMAL DRAW WIDTH: ${calibration.optimalWidth}`);
  console.log(`BEST LOG LOSS: ${calibration.logLoss.toFixed(4)}`);
  console.log('='.repeat(80));
}

/**
 * Calculate outcome distribution
 */
function analyzeOutcomes(matches) {
  const outcomes = { H: 0, D: 0, A: 0 };
  matches.forEach(m => outcomes[m.result]++);

  const total = matches.length;
  return {
    homeWins: (outcomes.H / total * 100).toFixed(1),
    draws: (outcomes.D / total * 100).toFixed(1),
    awayWins: (outcomes.A / total * 100).toFixed(1),
    total
  };
}

/**
 * Save results to JSON
 */
async function saveResults(leagueResults, globalResult) {
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(CONFIG.outputDir, `calibration-${timestamp}.json`);

  const output = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    global: globalResult,
    leagues: leagueResults
  };

  await fs.writeFile(filename, JSON.stringify(output, null, 2));
  console.log(`\n✅ Results saved to: ${filename}`);
}

/**
 * Generate JavaScript config file
 */
async function generateConfigFile(leagueResults, globalResult) {
  const configLines = [
    '/**',
    ' * Draw Width Configuration',
    ' * Generated by calibration script',
    ` * Generated: ${new Date().toISOString()}`,
    ' * Based on historical match outcome data',
    ' */',
    '',
    'export const DRAW_WIDTH_CONFIG = {'
  ];

  // Add league-specific configs
  for (const [leagueCode, result] of Object.entries(leagueResults)) {
    const league = CONFIG.leagues.find(l => l.code === leagueCode);
    configLines.push(
      `  '${league.name}': ${result.calibration.optimalWidth}, ` +
      `// ${league.division} - ${result.matches} matches, ` +
      `LogLoss: ${result.calibration.logLoss.toFixed(3)}`
    );
  }

  // Add global fallback
  configLines.push(
    `  'global': ${globalResult.calibration.optimalWidth}, ` +
    `// Global fallback - ${globalResult.matches} matches, ` +
    `LogLoss: ${globalResult.calibration.logLoss.toFixed(3)}`
  );

  configLines.push('};');
  configLines.push('');

  // Add helper function
  configLines.push('/**');
  configLines.push(' * Get optimal draw width for a league');
  configLines.push(' */');
  configLines.push('export function getDrawWidth(leagueCode) {');
  configLines.push('  return DRAW_WIDTH_CONFIG[leagueCode] || DRAW_WIDTH_CONFIG.global;');
  configLines.push('}');

  const content = configLines.join('\n');
  await fs.writeFile(CONFIG.configOutputPath, content);
  console.log(`✅ Config file generated: ${CONFIG.configOutputPath}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🎯 Historical Draw Width Calibration');
  console.log('=====================================\n');

  const allMatches = [];
  const leagueResults = {};

  // Process each league
  for (const league of CONFIG.leagues) {
    console.log(`\n📊 Processing: ${league.division} (${league.code})`);

    const leagueMatches = [];
    const elo = new EloRatingTracker(CONFIG.initialRating, CONFIG.kFactor);

    // Fetch and process each season
    for (const season of CONFIG.seasons) {
      try {
        const csvData = await fetchHistoricalData(league.code, season);
        const matches = parseCSV(csvData);

        console.log(`  📅 Season ${season}: ${matches.length} matches`);

        // Process matches chronologically
        for (const match of matches) {
          const homeTeam = normalizeTeamName(match.HomeTeam);
          const awayTeam = normalizeTeamName(match.AwayTeam);
          const result = match.FTR; // H, D, or A

          // Get current ratings (before match)
          const homeRating = elo.getRating(homeTeam);
          const awayRating = elo.getRating(awayTeam);

          // Store match with ratings
          const processedMatch = {
            homeTeam,
            awayTeam,
            homeRating,
            awayRating,
            result,
            date: match.Date,
            league: league.name
          };

          leagueMatches.push(processedMatch);
          allMatches.push(processedMatch);

          // Update ELO ratings after match
          elo.updateRatings(homeTeam, awayTeam, result);
        }
      } catch (error) {
        console.error(`  ❌ Error fetching ${league.code} ${season}: ${error.message}`);
      }
    }

    if (leagueMatches.length > 0) {
      // Analyze outcomes
      const outcomes = analyzeOutcomes(leagueMatches);
      console.log(`  📈 Outcomes: ${outcomes.homeWins}% H, ${outcomes.draws}% D, ${outcomes.awayWins}% A`);

      // Run calibration
      const calibration = calibrateDrawWidth(
        leagueMatches,
        CONFIG.minDrawWidth,
        CONFIG.maxDrawWidth,
        CONFIG.step
      );

      // Print results
      printCalibrationResults(calibration, league.division);

      // Store results
      leagueResults[league.code] = {
        league: league.name,
        division: league.division,
        matches: leagueMatches.length,
        outcomes,
        calibration,
        eloStats: elo.getStats()
      };
    }
  }

  // Global calibration
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('GLOBAL CALIBRATION (All Leagues Combined)');
  console.log('='.repeat(80));
  console.log(`Total matches: ${allMatches.length}`);

  const globalOutcomes = analyzeOutcomes(allMatches);
  console.log(`Global outcomes: ${globalOutcomes.homeWins}% H, ${globalOutcomes.draws}% D, ${globalOutcomes.awayWins}% A`);

  const globalCalibration = calibrateDrawWidth(
    allMatches,
    CONFIG.minDrawWidth,
    CONFIG.maxDrawWidth,
    CONFIG.step
  );

  printCalibrationResults(globalCalibration, 'GLOBAL');

  const globalResult = {
    matches: allMatches.length,
    outcomes: globalOutcomes,
    calibration: globalCalibration
  };

  // Save results
  await saveResults(leagueResults, globalResult);
  await generateConfigFile(leagueResults, globalResult);

  console.log('\n✅ Calibration complete!\n');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
