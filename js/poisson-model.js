/**
 * Poisson + Dixon-Coles Model
 *
 * Calculates 1X2 probabilities using:
 * 1. Elo ratings → DNB (winner) probabilities
 * 2. League table → match-specific total xG
 * 3. Binary search → distribute xG to match DNB
 * 4. Poisson scoreline matrix + Dixon-Coles correction → 1X2
 */

// Default Dixon-Coles rho parameter (typically -0.04 to -0.12)
const DEFAULT_RHO = -0.04;

// Maximum goals to consider in scoreline matrix
const MAX_GOALS = 10;

/**
 * Poisson probability mass function
 * P(X = k) = (λ^k * e^(-λ)) / k!
 */
function poissonPMF(k, lambda) {
    if (lambda <= 0) return k === 0 ? 1 : 0;
    let logP = -lambda + k * Math.log(lambda);
    for (let i = 2; i <= k; i++) {
        logP -= Math.log(i);
    }
    return Math.exp(logP);
}

/**
 * Generate Poisson scoreline probability matrix
 * @param {number} homeXG - Expected goals for home team
 * @param {number} awayXG - Expected goals for away team
 * @returns {number[][]} - Matrix where [i][j] = P(home=i, away=j)
 */
function generateScorelineMatrix(homeXG, awayXG) {
    const matrix = [];
    for (let i = 0; i <= MAX_GOALS; i++) {
        matrix[i] = [];
        for (let j = 0; j <= MAX_GOALS; j++) {
            matrix[i][j] = poissonPMF(i, homeXG) * poissonPMF(j, awayXG);
        }
    }
    return matrix;
}

/**
 * Apply Dixon-Coles correction to scoreline matrix
 * Adjusts probabilities for low-scoring outcomes (0-0, 1-0, 0-1, 1-1)
 * where the Poisson independence assumption breaks down
 *
 * @param {number[][]} matrix - Scoreline matrix
 * @param {number} homeXG - Home expected goals
 * @param {number} awayXG - Away expected goals
 * @param {number} rho - Dixon-Coles correction parameter
 * @returns {number[][]} - Corrected matrix
 */
function applyDixonColes(matrix, homeXG, awayXG, rho) {
    // Apply correction to low-scoring outcomes
    matrix[0][0] *= 1 - homeXG * awayXG * rho;
    matrix[1][0] *= 1 + awayXG * rho;
    matrix[0][1] *= 1 + homeXG * rho;
    matrix[1][1] *= 1 - rho;

    // Renormalize the matrix
    let total = 0;
    for (let i = 0; i <= MAX_GOALS; i++) {
        for (let j = 0; j <= MAX_GOALS; j++) {
            // Ensure no negative probabilities from correction
            matrix[i][j] = Math.max(0, matrix[i][j]);
            total += matrix[i][j];
        }
    }

    if (total > 0 && total !== 1) {
        for (let i = 0; i <= MAX_GOALS; i++) {
            for (let j = 0; j <= MAX_GOALS; j++) {
                matrix[i][j] /= total;
            }
        }
    }

    return matrix;
}

/**
 * Extract 1X2 probabilities from scoreline matrix
 * @param {number[][]} matrix - Scoreline probability matrix
 * @returns {Object} - { home, draw, away }
 */
function extractProbabilities(matrix) {
    let home = 0, draw = 0, away = 0;

    for (let i = 0; i <= MAX_GOALS; i++) {
        for (let j = 0; j <= MAX_GOALS; j++) {
            if (i > j) home += matrix[i][j];
            else if (i === j) draw += matrix[i][j];
            else away += matrix[i][j];
        }
    }

    return { home, draw, away };
}

/**
 * Calculate DNB (Draw No Bet) home probability from Poisson model
 * @param {number} homeXG - Home expected goals
 * @param {number} awayXG - Away expected goals
 * @returns {number} - DNB home probability
 */
function poissonDNBHome(homeXG, awayXG) {
    const matrix = generateScorelineMatrix(homeXG, awayXG);
    let home = 0, away = 0;
    for (let i = 0; i <= MAX_GOALS; i++) {
        for (let j = 0; j <= MAX_GOALS; j++) {
            if (i > j) home += matrix[i][j];
            else if (i < j) away += matrix[i][j];
        }
    }
    return home / (home + away);
}

/**
 * Binary search to find xG split that matches Elo DNB probability
 *
 * @param {number} totalXG - Total expected goals for the match
 * @param {number} eloDNBHome - DNB home probability from Elo ratings
 * @param {number} [tolerance=0.0001] - Convergence tolerance
 * @param {number} [maxIterations=50] - Maximum iterations
 * @returns {Object} - { homeXG, awayXG }
 */
function findXGSplit(totalXG, eloDNBHome, tolerance = 0.0001, maxIterations = 50) {
    // r is the ratio: homeXG = totalXG * r, awayXG = totalXG * (1 - r)
    let lo = 0.01;
    let hi = 0.99;

    for (let iter = 0; iter < maxIterations; iter++) {
        const mid = (lo + hi) / 2;
        const homeXG = totalXG * mid;
        const awayXG = totalXG * (1 - mid);

        const poissonDNB = poissonDNBHome(homeXG, awayXG);

        if (Math.abs(poissonDNB - eloDNBHome) < tolerance) {
            return { homeXG, awayXG };
        }

        // Higher r → more home goals → higher home DNB
        if (poissonDNB < eloDNBHome) {
            lo = mid;
        } else {
            hi = mid;
        }
    }

    // Return best estimate after max iterations
    const r = (lo + hi) / 2;
    return { homeXG: totalXG * r, awayXG: totalXG * (1 - r) };
}

/**
 * Normalize a team name for fuzzy comparison
 * Strips common suffixes, lowercases, and removes extra whitespace
 */
function normalizeTeamName(name) {
    return name
        .toLowerCase()
        .replace(/\s+fc$/i, '')
        .replace(/^fc\s+/i, '')
        .replace(/\s+afc$/i, '')
        .replace(/\s+sc$/i, '')
        .replace(/\s+cf$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Find a team in the league table using fuzzy name matching
 * Tries: exact match, normalized match, substring match
 *
 * @param {string} teamName - Team name from odds/ratings
 * @param {Object} teams - League table teams object
 * @returns {Object|null} - Team data or null
 */
function findTeamInTable(teamName, teams) {
    // 1. Exact match
    if (teams[teamName]) return teams[teamName];

    // 2. Normalized match
    const normalizedInput = normalizeTeamName(teamName);
    for (const [tableName, data] of Object.entries(teams)) {
        if (normalizeTeamName(tableName) === normalizedInput) return data;
    }

    // 3. One contains the other (handles "Leeds United" vs "Leeds Utd" etc.)
    for (const [tableName, data] of Object.entries(teams)) {
        const normalizedTable = normalizeTeamName(tableName);
        // Check if either name starts with the same significant prefix (at least 4 chars)
        const shorter = normalizedInput.length <= normalizedTable.length ? normalizedInput : normalizedTable;
        const longer = normalizedInput.length > normalizedTable.length ? normalizedInput : normalizedTable;
        if (shorter.length >= 4 && longer.startsWith(shorter)) return data;
        if (shorter.length >= 4 && longer.includes(shorter)) return data;
    }

    return null;
}

/**
 * Calculate match-specific total xG from league table data
 * totalXG = homeTeam's home GF/match + awayTeam's away GF/match
 *
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @param {Object} leagueTable - Parsed league table data
 * @returns {number|null} - Total xG or null if teams not found
 */
export function calculateMatchTotalXG(homeTeam, awayTeam, leagueTable) {
    if (!leagueTable || !leagueTable.teams) return null;

    const homeData = findTeamInTable(homeTeam, leagueTable.teams);
    const awayData = findTeamInTable(awayTeam, leagueTable.teams);

    if (!homeData || !awayData) {
        console.warn(`Team not found in league table: ${!homeData ? homeTeam : ''} ${!awayData ? awayTeam : ''}`);
        return null;
    }

    return homeData.homeGFPerMatch + awayData.awayGFPerMatch;
}

/**
 * Calculate 1X2 probabilities using Poisson + Dixon-Coles model
 *
 * @param {number} homeRating - Home team Elo rating
 * @param {number} awayRating - Away team Elo rating
 * @param {number} totalXG - Match-specific total expected goals
 * @param {number} [rho=DEFAULT_RHO] - Dixon-Coles correction parameter
 * @returns {Object} - { home, draw, away, homeXG, awayXG }
 */
export function calculatePoissonProbabilities(homeRating, awayRating, totalXG, rho = DEFAULT_RHO) {
    // Step 1: Get DNB probabilities from Elo
    const diff = homeRating - awayRating;
    const F = (x) => 1 / (1 + Math.pow(10, -x / 400));
    const eloHomeWin = F(diff);
    // eloHomeWin is P(home > away) in a two-outcome scenario (DNB)

    // Step 2: Find xG split that matches Elo DNB
    const { homeXG, awayXG } = findXGSplit(totalXG, eloHomeWin);

    // Step 3: Generate Poisson scoreline matrix
    let matrix = generateScorelineMatrix(homeXG, awayXG);

    // Step 4: Apply Dixon-Coles correction
    matrix = applyDixonColes(matrix, homeXG, awayXG, rho);

    // Step 5: Extract 1X2 probabilities
    const probs = extractProbabilities(matrix);

    // Safeguards
    const total = probs.home + probs.draw + probs.away;
    let homeProb = Math.max(0.01, Math.min(0.98, probs.home / total));
    let awayProb = Math.max(0.01, Math.min(0.98, probs.away / total));
    const drawProb = Math.max(0.01, 1 - homeProb - awayProb);

    return {
        home: homeProb,
        draw: drawProb,
        away: awayProb,
        homeXG: homeXG,
        awayXG: awayXG
    };
}
