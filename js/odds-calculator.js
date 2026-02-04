/**
 * Odds Calculator - Converts team ratings to betting odds
 * Uses Elo-based probability calculation with draw adjustment for football
 */

/**
 * Calculate match outcome probabilities including draw
 * Uses an Elo-based model with Home Field Advantage (HFA) and a draw width parameter
 * @param {number} homeRating - Home team rating
 * @param {number} awayRating - Away team rating
 * @returns {Object} - Probabilities for home win, draw, away win
 */
export function calculateMatchProbabilities(homeRating, awayRating) {
    // Parameters for the football model
    const drawWidth = 90; // Parameter to control draw frequency (lower = fewer draws)

    const diff = homeRating - awayRating;

    // Standard Elo logistic function
    const F = (x) => 1 / (1 + Math.pow(10, -x / 400));

    // Calculate probabilities using the draw margin method
    // P(Home) = F(diff - drawWidth)
    // P(Draw) = F(diff + drawWidth) - F(diff - drawWidth)
    // P(Away) = 1 - F(diff + drawWidth)
    const homeWinProbRaw = F(diff - drawWidth);
    const drawProbRaw = F(diff + drawWidth) - F(diff - drawWidth);
    const awayWinProbRaw = 1 - F(diff + drawWidth);

    // Safeguards and normalization
    const total = homeWinProbRaw + drawProbRaw + awayWinProbRaw;
    let homeWinProb = Math.max(0.01, Math.min(0.98, homeWinProbRaw / total));
    let awayWinProb = Math.max(0.01, Math.min(0.98, awayWinProbRaw / total));
    const adjustedDrawProb = Math.max(0.01, 1 - homeWinProb - awayWinProb);

    return {
        home: homeWinProb,
        draw: adjustedDrawProb,
        away: awayWinProb
    };
}

/**
 * Convert probability to decimal odds
 * @param {number} probability - Win probability (0-1)
 * @returns {number} - Decimal odds
 */
function probabilityToOdds(probability) {
    if (probability <= 0 || probability >= 1) {
        return 1.01; // Minimum odds
    }
    return 1 / probability;
}

/**
 * Calculate fair odds from team ratings
 * @param {number} homeRating - Home team rating
 * @param {number} awayRating - Away team rating
 * @returns {Object} - Calculated odds for home win, draw, away win
 */
export function calculateOddsFromRatings(homeRating, awayRating) {
    const probabilities = calculateMatchProbabilities(homeRating, awayRating);
    
    // Calculate DNB probabilities (redistribute draw probability)
    const dnbHomeProb = probabilities.home / (probabilities.home + probabilities.away);
    const dnbAwayProb = probabilities.away / (probabilities.home + probabilities.away);

    return {
        home: probabilityToOdds(probabilities.home),
        draw: probabilityToOdds(probabilities.draw),
        away: probabilityToOdds(probabilities.away),
        dnbHome: probabilityToOdds(dnbHomeProb),
        dnbAway: probabilityToOdds(dnbAwayProb),
        probabilities: probabilities,
        dnbProbabilities: {
            home: dnbHomeProb,
            away: dnbAwayProb
        }
    };
}

/**
 * Calculate expected value (value bet indicator)
 * Positive EV means the odds offer value
 * @param {number} marketOdds - Bookmaker odds
 * @param {number} fairOdds - Calculated fair odds
 * @returns {number} - Expected value percentage
 */
export function calculateExpectedValue(marketOdds, fairOdds) {
    // EV = (Market Odds / Fair Odds - 1) * 100
    return ((marketOdds / fairOdds - 1) * 100);
}

/**
 * Compare calculated odds with market odds
 * @param {Object} calculatedOdds - Our calculated odds {home, draw, away, dnbHome, dnbAway}
 * @param {Object} marketOdds - Bookmaker odds {1, X, 2}
 * @returns {Object} - Comparison with value indicators
 */
export function compareOdds(calculatedOdds, marketOdds) {
    const homeEV = calculateExpectedValue(marketOdds['1'], calculatedOdds.home);
    const drawEV = calculateExpectedValue(marketOdds['X'], calculatedOdds.draw);
    const awayEV = calculateExpectedValue(marketOdds['2'], calculatedOdds.away);
    
    // Calculate DNB odds from market
    const marketDNB = calculateDNBFromMarket(marketOdds);
    const dnbHomeEV = calculateExpectedValue(marketDNB.home, calculatedOdds.dnbHome);
    const dnbAwayEV = calculateExpectedValue(marketDNB.away, calculatedOdds.dnbAway);

    return {
        home: {
            calculated: calculatedOdds.home,
            market: marketOdds['1'],
            ev: homeEV,
            hasValue: homeEV > 5, // 5% threshold for value bet
            probability: calculatedOdds.probabilities.home
        },
        draw: {
            calculated: calculatedOdds.draw,
            market: marketOdds['X'],
            ev: drawEV,
            hasValue: drawEV > 5,
            probability: calculatedOdds.probabilities.draw
        },
        away: {
            calculated: calculatedOdds.away,
            market: marketOdds['2'],
            ev: awayEV,
            hasValue: awayEV > 5,
            probability: calculatedOdds.probabilities.away
        },
        dnb: {
            home: {
                calculated: calculatedOdds.dnbHome,
                market: marketDNB.home,
                ev: dnbHomeEV,
                hasValue: dnbHomeEV > 5,
                probability: calculatedOdds.dnbProbabilities.home
            },
            away: {
                calculated: calculatedOdds.dnbAway,
                market: marketDNB.away,
                ev: dnbAwayEV,
                hasValue: dnbAwayEV > 5,
                probability: calculatedOdds.dnbProbabilities.away
            }
        }
    };
}

/**
 * Find best value bets in a comparison
 * @param {Object} comparison - Result from compareOdds
 * @returns {Array} - Outcomes sorted by expected value
 */
export function findValueBets(comparison) {
    const bets = [
        { outcome: 'Home Win', ...comparison.home },
        { outcome: 'Draw', ...comparison.draw },
        { outcome: 'Away Win', ...comparison.away },
        { outcome: 'Home DNB', ...comparison.dnb.home },
        { outcome: 'Away DNB', ...comparison.dnb.away }
    ];

    // Sort by EV descending
    return bets
        .filter(bet => bet.hasValue)
        .sort((a, b) => b.ev - a.ev);
}

/**
 * Format odds for display
 * @param {number} odds - Decimal odds
 * @returns {string} - Formatted odds (2 decimal places)
 */
export function formatOdds(odds) {
    return odds.toFixed(2);
}

/**
 * Format probability for display
 * @param {number} probability - Probability (0-1)
 * @returns {string} - Formatted percentage
 */
export function formatProbability(probability) {
    return (probability * 100).toFixed(1) + '%';
}

/**
 * Format expected value for display
 * @param {number} ev - Expected value percentage
 * @returns {string} - Formatted EV with sign
 */
export function formatEV(ev) {
    const sign = ev > 0 ? '+' : '';
    return sign + ev.toFixed(1) + '%';
}

/**
 * Calculate bookmaker margin from market odds
 * @param {Object} marketOdds - Market odds {1, X, 2}
 * @returns {number} - Margin as decimal (e.g., 0.05 for 5%)
 */
export function calculateBookmakerMargin(marketOdds) {
    const impliedProb1 = 1 / marketOdds['1'];
    const impliedProbX = 1 / marketOdds['X'];
    const impliedProb2 = 1 / marketOdds['2'];
    const totalImpliedProb = impliedProb1 + impliedProbX + impliedProb2;
    return totalImpliedProb - 1;
}

/**
 * Apply bookmaker margin to fair odds
 * @param {Object} fairOdds - Fair odds {home, draw, away}
 * @param {number} margin - Margin to apply (e.g., 0.05 for 5%)
 * @returns {Object} - Odds with margin applied
 */
export function applyMarginToOdds(fairOdds, margin) {
    const prob1 = 1 / fairOdds.home;
    const probX = 1 / fairOdds.draw;
    const prob2 = 1 / fairOdds.away;

    // Distribute margin proportionally
    const totalProb = prob1 + probX + prob2;
    const adjustedProb1 = (prob1 / totalProb) * (1 + margin);
    const adjustedProbX = (probX / totalProb) * (1 + margin);
    const adjustedProb2 = (prob2 / totalProb) * (1 + margin);

    return {
        home: 1 / adjustedProb1,
        draw: 1 / adjustedProbX,
        away: 1 / adjustedProb2
    };
}

/**
 * Remove bookmaker margin from market odds to get fair odds
 * @param {Object} marketOdds - Market odds {1, X, 2}
 * @returns {Object} - Fair odds without margin
 */
export function removeMarginFromOdds(marketOdds) {
    const impliedProb1 = 1 / marketOdds['1'];
    const impliedProbX = 1 / marketOdds['X'];
    const impliedProb2 = 1 / marketOdds['2'];
    const totalImpliedProb = impliedProb1 + impliedProbX + impliedProb2;

    // Normalize to remove margin
    const fairProb1 = impliedProb1 / totalImpliedProb;
    const fairProbX = impliedProbX / totalImpliedProb;
    const fairProb2 = impliedProb2 / totalImpliedProb;

    return {
        '1': 1 / fairProb1,
        'X': 1 / fairProbX,
        '2': 1 / fairProb2
    };
}

/**
 * Format margin for display
 * @param {number} margin - Margin as decimal
 * @returns {string} - Formatted margin percentage
 */
export function formatMargin(margin) {
    return (margin * 100).toFixed(2) + '%';
}

/**
 * Calculate DNB (Draw No Bet) odds from 1X2 market odds
 * DNB refunds the stake if the match is a draw
 * @param {Object} marketOdds - Market odds {1, X, 2}
 * @returns {Object} - DNB odds {home, away}
 */
export function calculateDNBFromMarket(marketOdds) {
    // Convert odds to probabilities
    const prob1 = 1 / marketOdds['1'];
    const probX = 1 / marketOdds['X'];
    const prob2 = 1 / marketOdds['2'];
    
    // Normalize probabilities (remove margin)
    const totalProb = prob1 + probX + prob2;
    const normProb1 = prob1 / totalProb;
    const normProbX = probX / totalProb;
    const normProb2 = prob2 / totalProb;
    
    // Calculate DNB probabilities (redistribute draw probability)
    const dnbProb1 = normProb1 / (normProb1 + normProb2);
    const dnbProb2 = normProb2 / (normProb1 + normProb2);
    
    // Re-apply margin proportionally
    const margin = totalProb - 1;
    const dnbProb1WithMargin = dnbProb1 * (1 + margin);
    const dnbProb2WithMargin = dnbProb2 * (1 + margin);
    
    return {
        home: 1 / dnbProb1WithMargin,
        away: 1 / dnbProb2WithMargin
    };
}

/**
 * Apply margin to DNB fair odds
 * @param {number} dnbHomeOdds - DNB home fair odds
 * @param {number} dnbAwayOdds - DNB away fair odds
 * @param {number} margin - Margin to apply
 * @returns {Object} - DNB odds with margin {home, away}
 */
export function applyMarginToDNB(dnbHomeOdds, dnbAwayOdds, margin) {
    const probHome = 1 / dnbHomeOdds;
    const probAway = 1 / dnbAwayOdds;

    const totalProb = probHome + probAway;
    const adjustedProbHome = (probHome / totalProb) * (1 + margin);
    const adjustedProbAway = (probAway / totalProb) * (1 + margin);

    return {
        home: 1 / adjustedProbHome,
        away: 1 / adjustedProbAway
    };
}

/**
 * Remove margin from DNB market odds
 * @param {Object} dnbMarketOdds - DNB market odds {home, away}
 * @returns {Object} - DNB fair odds {home, away}
 */
export function removeMarginFromDNB(dnbMarketOdds) {
    const probHome = 1 / dnbMarketOdds.home;
    const probAway = 1 / dnbMarketOdds.away;
    const totalProb = probHome + probAway;

    const fairProbHome = probHome / totalProb;
    const fairProbAway = probAway / totalProb;

    return {
        home: 1 / fairProbHome,
        away: 1 / fairProbAway
    };
}
