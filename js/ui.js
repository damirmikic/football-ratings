import { CONFIG, countries } from './config.js?v=5';
import {
    calculateOddsFromRatings,
    calculateOddsWithPoisson,
    compareOdds,
    formatOdds,
    formatProbability,
    formatEV,
    findValueBets,
    calculateBookmakerMargin,
    applyMarginToOdds,
    removeMarginFromOdds,
    formatMargin,
    calculateDNBFromMarket,
    applyMarginToDNB,
    removeMarginFromDNB,
    calculateDNBFromFairOdds
} from './odds-calculator.js?v=5';
import { findTeamDisplayStats } from './poisson-model.js?v=5';

// UI state management
let selectedCountryForTeams = null;
let selectedLeagueForTeams = null;
let selectedLeagueCode = null; // Store league code for draw width calibration
let selectedLeagueUrl = null;
let selectedTeamsData = null;
let selectedOddsData = null; // Store current odds data for margin adjustment updates
let selectedLeagueTable = null; // Store league table data for Poisson xG model

// Loading overlay
export function showLoading(message) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.textContent = message;
    loadingOverlay.style.display = 'block';
}

export function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Error messages
export function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 7000);
}

// Info messages
export function showInfo(message) {
    const infoMessage = document.getElementById('infoMessage');
    infoMessage.textContent = message;
    infoMessage.style.display = 'block';
    setTimeout(() => {
        infoMessage.style.display = 'none';
    }, 4000);
}

// Create countries list in sidebar
export function createCountriesList() {
    const countriesList = document.getElementById('countriesList');
    countriesList.innerHTML = '<div class="countries-grid"></div>';
    const countriesGrid = countriesList.querySelector('.countries-grid');

    // Use predefined league data to show all countries with leagues
    const menLeagueData = CONFIG.ENDPOINTS.leagueData["Men's"];

    Object.keys(menLeagueData).forEach(countryName => {
        const countryCodes = menLeagueData[countryName];
        const countryInfo = countries.find(c => c.name === countryName);
        const rating = countryInfo ? countryInfo.rating : '0.00';

        const countryCard = document.createElement('div');
        countryCard.className = 'country-card';
        countryCard.id = `country-${countryName.replace(/\s+/g, '-')}`;

        const leagues = countryCodes.map((code, index) => ({
            rank: index + 1,
            name: CONFIG.ENDPOINTS.leagueNames[code] || code,
            code: code
        }));

        countryCard.innerHTML = `
        <div class="country-header">
            <div class="country-name">
                ${countryName}
                <span class="country-rating">${rating}</span>
            </div>
        </div>
        <div class="leagues-grid">
            ${leagues.map(league => `
                <div class="league-item" data-country="${countryName}" data-league="${league.name}" data-code="${league.code}">
                    <span class="league-name">${league.name}</span>
                    <span class="league-code">${league.code}</span>
                </div>
            `).join('')}
        </div>
    `;

        countriesGrid.appendChild(countryCard);
    });
}

// Create teams table HTML
export function createTeamsTable(teams) {
    if (!teams || teams.length === 0) {
        return '<div style="padding: 20px; text-align: center; color: #666;">No team data available</div>';
    }

    return `
        <table class="teams-table">
            <thead>
                <tr>
                    <th style="text-align: center;">Rank</th>
                    <th>Team</th>
                    <th style="text-align: center;">League</th>
                    <th style="text-align: center;">Flag</th>
                    <th style="text-align: right;">Rating</th>
                </tr>
            </thead>
            <tbody>
                ${teams.map(team => `
                    <tr>
                        <td style="text-align: center; font-weight: bold; color: #666;">${team.rank}</td>
                        <td style="color: #006600; font-weight: bold;">${team.name}</td>
                        <td style="text-align: center; color: #666;">${team.league || '-'}</td>
                        <td style="text-align: center;">-</td>
                        <td style="text-align: right; font-weight: bold; color: #333;">${team.rating}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Create odds table HTML
export function createOddsTable(odds) {
    if (!odds || odds.length === 0) {
        return '<div style="padding: 20px; text-align: center; color: #666;">No odds data available</div>';
    }

    return `
        <table class="teams-table">
            <thead>
                <tr>
                    <th>Home Team</th>
                    <th>Away Team</th>
                    <th style="text-align: right;">1</th>
                    <th style="text-align: right;">X</th>
                    <th style="text-align: right;">2</th>
                </tr>
            </thead>
            <tbody>
                ${odds.map(match => `
                    <tr>
                        <td style="color: #006600; font-weight: bold;">${match.homeTeam}</td>
                        <td style="color: #006600; font-weight: bold;">${match.awayTeam}</td>
                        <td style="text-align: right; font-weight: bold; color: #333;">${match.odds['1']}</td>
                        <td style="text-align: right; font-weight: bold; color: #333;">${match.odds['X']}</td>
                        <td style="text-align: right; font-weight: bold; color: #333;">${match.odds['2']}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Store margin adjustment preference
let marginAdjustment = 'none'; // Options: 'none', 'applyToCalculated', 'removeFromMarket'

// Create enhanced odds comparison display with calculated odds and value indicators
export function createOddsComparisonTable(odds, teamsData, leagueCode = null) {
    if (!odds || odds.length === 0) {
        return '<div style="padding: 20px; text-align: center; color: #666;">No odds data available</div>';
    }

    if (!teamsData || !teamsData.home || !teamsData.away) {
        return '<div style="padding: 20px; text-align: center; color: #666;">Team ratings not available for odds calculation</div>';
    }

    // Create lookup maps for team ratings
    const homeRatings = {};
    const awayRatings = {};

    teamsData.home.forEach(team => {
        homeRatings[team.name] = parseFloat(team.rating);
    });

    teamsData.away.forEach(team => {
        awayRatings[team.name] = parseFloat(team.rating);
    });

    let matchCards = '';
    let valueBetsCount = 0;

    odds.forEach(match => {
        const homeRating = homeRatings[match.homeTeam];
        const awayRating = awayRatings[match.awayTeam];

        if (!homeRating || !awayRating) {
            matchCards += `
                <div style="padding: 15px; margin-bottom: 15px; background-color: #f9f9f9; border-radius: 6px; text-align: center; color: #999;">
                    <em>Ratings not available for ${match.homeTeam} vs ${match.awayTeam}</em>
                </div>
            `;
            return;
        }

        // Look up team table stats (position, goals per match)
        const homeStats = selectedLeagueTable ? findTeamDisplayStats(match.homeTeam, selectedLeagueTable) : null;
        const awayStats = selectedLeagueTable ? findTeamDisplayStats(match.awayTeam, selectedLeagueTable) : null;

        // Calculate odds: prefer Poisson+DC model if league table available, fallback to Elo draw-width
        let calculatedOdds = null;
        if (selectedLeagueTable) {
            calculatedOdds = calculateOddsWithPoisson(homeRating, awayRating, match.homeTeam, match.awayTeam, selectedLeagueTable);
        }
        if (!calculatedOdds) {
            calculatedOdds = calculateOddsFromRatings(homeRating, awayRating);
        }

        // Calculate bookmaker margin
        const bookmakerMargin = calculateBookmakerMargin(match.odds);

        // Adjust odds based on margin setting
        let displayCalculatedOdds = calculatedOdds;
        let displayMarketOdds = match.odds;

        if (marginAdjustment === 'applyToCalculated') {
            displayCalculatedOdds = applyMarginToOdds(calculatedOdds, bookmakerMargin);
        } else if (marginAdjustment === 'removeFromMarket') {
            displayMarketOdds = removeMarginFromOdds(match.odds);
        }

        // Compare odds (use original for EV calculation)
        const comparison = compareOdds(calculatedOdds, match.odds);

        // Calculate DNB odds based on margin setting
        let displayDNBCalculated, displayDNBMarket;

        console.log(`${match.homeTeam} vs ${match.awayTeam}: margin adjustment = ${marginAdjustment}`);

        if (marginAdjustment === 'removeFromMarket') {
            // Remove margin: use fair DNB for calculated, margin-free DNB for market
            displayDNBCalculated = {
                home: calculatedOdds.dnbHome,
                away: calculatedOdds.dnbAway
            };
            displayDNBMarket = calculateDNBFromFairOdds(displayMarketOdds);
            console.log('removeFromMarket - DNB Market (fair):', displayDNBMarket);

        } else if (marginAdjustment === 'applyToCalculated') {
            // Apply margin: use DNB with margin for calculated, normal market DNB for market
            displayDNBCalculated = applyMarginToDNB(calculatedOdds.dnbHome, calculatedOdds.dnbAway, bookmakerMargin);
            displayDNBMarket = calculateDNBFromMarket(match.odds);
            console.log('applyToCalculated - DNB Calculated (with margin):', displayDNBCalculated);
            console.log('applyToCalculated - DNB Market (with margin):', displayDNBMarket);

        } else {
            // No adjustment: use fair DNB for calculated, market DNB with margin for market
            displayDNBCalculated = {
                home: calculatedOdds.dnbHome,
                away: calculatedOdds.dnbAway
            };
            displayDNBMarket = calculateDNBFromMarket(match.odds);
            console.log('none - DNB Calculated (fair):', displayDNBCalculated);
            console.log('none - DNB Market (with margin):', displayDNBMarket);
        }

        // Find value bets
        const valueBets = findValueBets(comparison);
        const hasValue = valueBets.length > 0;
        if (hasValue) valueBetsCount++;

        // Build xG bar section if Poisson model was used
        const usePoisson = calculatedOdds.model === 'poisson-dc';
        let xgSection = '';
        if (usePoisson) {
            const hxg = calculatedOdds.homeXG;
            const axg = calculatedOdds.awayXG;
            const txg = calculatedOdds.totalXG;
            const homePercent = (hxg / txg * 100).toFixed(0);
            const awayPercent = (axg / txg * 100).toFixed(0);

            xgSection = `
                <div style="padding: 12px 15px; background-color: #fafafa; border-bottom: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <div style="font-size: 13px; font-weight: bold; color: #333;">
                            ${hxg.toFixed(2)} <span style="font-size: 11px; font-weight: normal; color: #999;">xG</span>
                        </div>
                        <div style="font-size: 11px; font-weight: bold; color: #666;">
                            Expected Goals <span style="color: #999;">(${txg.toFixed(2)} total)</span>
                        </div>
                        <div style="font-size: 13px; font-weight: bold; color: #333;">
                            <span style="font-size: 11px; font-weight: normal; color: #999;">xG</span> ${axg.toFixed(2)}
                        </div>
                    </div>
                    <div style="display: flex; height: 8px; border-radius: 4px; overflow: hidden; background-color: #e0e0e0;">
                        <div style="width: ${homePercent}%; background-color: #006600; border-radius: 4px 0 0 4px;"></div>
                        <div style="width: ${awayPercent}%; background-color: #cc0000; border-radius: 0 4px 4px 0;"></div>
                    </div>
                </div>
            `;
        }

        matchCards += `
            <div style="margin-bottom: 20px; border: 2px solid ${hasValue ? '#006600' : '#ddd'}; border-radius: 8px; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Match Header -->
                <div style="padding: 15px; background-color: ${hasValue ? '#e8f5e8' : '#f5f5f5'}; border-bottom: ${usePoisson ? '1px solid #eee' : `2px solid ${hasValue ? '#006600' : '#ddd'}`}; border-radius: 6px 6px 0 0;">
                    <div style="font-size: 16px; font-weight: bold; color: #006600; text-align: center;">
                        ${match.homeTeam} vs ${match.awayTeam}
                    </div>
                    <div style="font-size: 11px; color: #666; text-align: center; margin-top: 5px;">
                        Bookmaker Margin: ${formatMargin(bookmakerMargin)} | Ratings: ${homeRating.toFixed(1)} vs ${awayRating.toFixed(1)}
                        ${usePoisson ? ' | <span style="color: #006600; font-weight: bold;">Poisson+DC</span>' : ''}
                        ${hasValue ? ' | <strong style="color: #006600;">VALUE OPPORTUNITY</strong>' : ''}
                    </div>
                    ${homeStats || awayStats ? `
                    <div style="font-size: 11px; color: #555; text-align: center; margin-top: 4px;">
                        ${homeStats ? `<span style="font-weight: bold;">${homeStats.position ? '#' + homeStats.position : '-'}</span> <span style="color: #888;">${homeStats.homeGPM.toFixed(2)} GPM</span> <span style="color: #aaa;">(${homeStats.homeTotalGPM.toFixed(2)} total)</span>` : ''}
                        <span style="color: #ccc; margin: 0 6px;">|</span>
                        ${awayStats ? `<span style="color: #aaa;">(${awayStats.awayTotalGPM.toFixed(2)} total)</span> <span style="color: #888;">${awayStats.awayGPM.toFixed(2)} GPM</span> <span style="font-weight: bold;">${awayStats.position ? '#' + awayStats.position : '-'}</span>` : ''}
                    </div>
                    ` : ''}
                </div>

                <!-- xG Bar (Poisson model only) -->
                ${xgSection}

                <!-- Odds Grid -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;">
                    <!-- Home Win -->
                    <div style="padding: 15px; border-right: 1px solid #ddd; ${comparison.home.hasValue ? 'background-color: #f0f8f0;' : ''}">
                        <div style="text-align: center; font-weight: bold; font-size: 14px; color: #333; margin-bottom: 10px;">
                            HOME WIN
                        </div>
                        <div style="text-align: center; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #666;">Market</div>
                            <div style="font-size: 24px; font-weight: bold; color: #006600;">${formatOdds(displayMarketOdds['1'])}</div>
                        </div>
                        <div style="text-align: center; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #666;">Fair</div>
                            <div style="font-size: 18px; color: #999;">${formatOdds(displayCalculatedOdds.home)}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 11px; color: #666;">EV</div>
                            <div style="font-size: 16px; font-weight: bold; color: ${comparison.home.ev > 0 ? '#006600' : '#cc0000'};">
                                ${formatEV(comparison.home.ev)}
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #666;">
                            ${formatProbability(comparison.home.probability)}
                        </div>
                    </div>

                    <!-- Draw -->
                    <div style="padding: 15px; border-right: 1px solid #ddd; ${comparison.draw.hasValue ? 'background-color: #f0f8f0;' : ''}">
                        <div style="text-align: center; font-weight: bold; font-size: 14px; color: #333; margin-bottom: 10px;">
                            DRAW
                        </div>
                        <div style="text-align: center; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #666;">Market</div>
                            <div style="font-size: 24px; font-weight: bold; color: #006600;">${formatOdds(displayMarketOdds['X'])}</div>
                        </div>
                        <div style="text-align: center; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #666;">Fair</div>
                            <div style="font-size: 18px; color: #999;">${formatOdds(displayCalculatedOdds.draw)}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 11px; color: #666;">EV</div>
                            <div style="font-size: 16px; font-weight: bold; color: ${comparison.draw.ev > 0 ? '#006600' : '#cc0000'};">
                                ${formatEV(comparison.draw.ev)}
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #666;">
                            ${formatProbability(comparison.draw.probability)}
                        </div>
                    </div>

                    <!-- Away Win -->
                    <div style="padding: 15px; ${comparison.away.hasValue ? 'background-color: #f0f8f0;' : ''}">
                        <div style="text-align: center; font-weight: bold; font-size: 14px; color: #333; margin-bottom: 10px;">
                            AWAY WIN
                        </div>
                        <div style="text-align: center; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #666;">Market</div>
                            <div style="font-size: 24px; font-weight: bold; color: #006600;">${formatOdds(displayMarketOdds['2'])}</div>
                        </div>
                        <div style="text-align: center; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #666;">Fair</div>
                            <div style="font-size: 18px; color: #999;">${formatOdds(displayCalculatedOdds.away)}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 11px; color: #666;">EV</div>
                            <div style="font-size: 16px; font-weight: bold; color: ${comparison.away.ev > 0 ? '#006600' : '#cc0000'};">
                                ${formatEV(comparison.away.ev)}
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #666;">
                            ${formatProbability(comparison.away.probability)}
                        </div>
                    </div>
                </div>
                
                <!-- DNB (Draw No Bet) Section -->
                <div style="margin-top: 10px; padding: 15px; background-color: #f9f9f9; border-top: 2px solid #ddd;">
                    <div style="text-align: center; font-weight: bold; font-size: 13px; color: #333; margin-bottom: 12px;">
                        DNB (Draw No Bet)
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <!-- DNB Home -->
                        <div style="padding: 12px; background-color: white; border-radius: 6px; border: 1px solid ${comparison.dnb.home.hasValue ? '#006600' : '#ddd'}; ${comparison.dnb.home.hasValue ? 'background-color: #f0f8f0;' : ''}">
                            <div style="text-align: center; font-weight: bold; font-size: 12px; color: #333; margin-bottom: 8px;">
                                HOME DNB
                            </div>
                            <div style="text-align: center; margin-bottom: 6px;">
                                <div style="font-size: 10px; color: #666;">Market</div>
                                <div style="font-size: 20px; font-weight: bold; color: #006600;">${formatOdds(displayDNBMarket.home)}</div>
                            </div>
                            <div style="text-align: center; margin-bottom: 6px;">
                                <div style="font-size: 10px; color: #666;">Fair</div>
                                <div style="font-size: 16px; color: #999;">${formatOdds(displayDNBCalculated.home)}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 10px; color: #666;">EV</div>
                                <div style="font-size: 14px; font-weight: bold; color: ${comparison.dnb.home.ev > 0 ? '#006600' : '#cc0000'};">
                                    ${formatEV(comparison.dnb.home.ev)}
                                </div>
                            </div>
                            <div style="text-align: center; margin-top: 6px; font-size: 10px; color: #666;">
                                ${formatProbability(comparison.dnb.home.probability)}
                            </div>
                        </div>

                        <!-- DNB Away -->
                        <div style="padding: 12px; background-color: white; border-radius: 6px; border: 1px solid ${comparison.dnb.away.hasValue ? '#006600' : '#ddd'}; ${comparison.dnb.away.hasValue ? 'background-color: #f0f8f0;' : ''}">
                            <div style="text-align: center; font-weight: bold; font-size: 12px; color: #333; margin-bottom: 8px;">
                                AWAY DNB
                            </div>
                            <div style="text-align: center; margin-bottom: 6px;">
                                <div style="font-size: 10px; color: #666;">Market</div>
                                <div style="font-size: 20px; font-weight: bold; color: #006600;">${formatOdds(displayDNBMarket.away)}</div>
                            </div>
                            <div style="text-align: center; margin-bottom: 6px;">
                                <div style="font-size: 10px; color: #666;">Fair</div>
                                <div style="font-size: 16px; color: #999;">${formatOdds(displayDNBCalculated.away)}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 10px; color: #666;">EV</div>
                                <div style="font-size: 14px; font-weight: bold; color: ${comparison.dnb.away.ev > 0 ? '#006600' : '#cc0000'};">
                                    ${formatEV(comparison.dnb.away.ev)}
                                </div>
                            </div>
                            <div style="text-align: center; margin-top: 6px; font-size: 10px; color: #666;">
                                ${formatProbability(comparison.dnb.away.probability)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    return `
        <!-- Controls Panel -->
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f8f0; border-radius: 6px; border: 1px solid #006600;">
            <div style="margin-bottom: 10px;">
                <strong>Value Bets Found: ${valueBetsCount}</strong>
                <span style="margin-left: 15px; font-size: 12px; color: #666;">(Matches with green border and background have value opportunities)</span>
            </div>
            <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">Margin Adjustment:</div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <label style="cursor: pointer; padding: 8px 12px; background-color: ${marginAdjustment === 'none' ? '#006600' : 'white'}; color: ${marginAdjustment === 'none' ? 'white' : '#333'}; border: 1px solid #006600; border-radius: 4px;">
                    <input type="radio" name="marginAdjustment" value="none" ${marginAdjustment === 'none' ? 'checked' : ''} onchange="window.updateMarginAdjustment('none')" style="margin-right: 5px;">
                    No Adjustment
                </label>
                <label style="cursor: pointer; padding: 8px 12px; background-color: ${marginAdjustment === 'applyToCalculated' ? '#006600' : 'white'}; color: ${marginAdjustment === 'applyToCalculated' ? 'white' : '#333'}; border: 1px solid #006600; border-radius: 4px;">
                    <input type="radio" name="marginAdjustment" value="applyToCalculated" ${marginAdjustment === 'applyToCalculated' ? 'checked' : ''} onchange="window.updateMarginAdjustment('applyToCalculated')" style="margin-right: 5px;">
                    Apply Market Margin to Fair Odds
                </label>
                <label style="cursor: pointer; padding: 8px 12px; background-color: ${marginAdjustment === 'removeFromMarket' ? '#006600' : 'white'}; color: ${marginAdjustment === 'removeFromMarket' ? 'white' : '#333'}; border: 1px solid #006600; border-radius: 4px;">
                    <input type="radio" name="marginAdjustment" value="removeFromMarket" ${marginAdjustment === 'removeFromMarket' ? 'checked' : ''} onchange="window.updateMarginAdjustment('removeFromMarket')" style="margin-right: 5px;">
                    Remove Margin from Market Odds
                </label>
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 8px;">
                Adjust odds to compare like-for-like: either add bookmaker margin to fair odds, or remove it from market odds.
            </div>
        </div>

        <!-- Match Cards -->
        ${matchCards}

        <!-- Legend -->
        <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 6px; border: 1px solid #ddd;">
            <div style="font-weight: bold; margin-bottom: 10px;">How to Read:</div>
            <div style="font-size: 12px; line-height: 1.6;">
                <strong>Market:</strong> Bookmaker odds (includes margin)<br>
                <strong>Fair:</strong> Calculated odds from Poisson+Dixon-Coles model (or Elo fallback)<br>
                <strong>EV (Expected Value):</strong> Percentage difference - positive EV suggests potential value<br>
                <strong>Green background:</strong> Indicates value bet (EV > 5%)<br>
                <strong>Probability:</strong> Win probability based on model<br>
                <strong>xG Bar:</strong> Expected goals per team - derived from league table stats, split using Elo DNB probabilities<br>
                <strong>Poisson+DC:</strong> Model badge shown when Poisson + Dixon-Coles is active (league table available)<br>
                <strong>DNB (Draw No Bet):</strong> Bet refunded if match is a draw - calculated by redistributing draw probability between home/away
            </div>
        </div>
    `;
}

// Show teams display panel
export function showTeamsDisplay(countryName, leagueName, leagueCode, teamData) {
    const teamsHeader = document.getElementById('teamsHeader');
    teamsHeader.textContent = `${countryName} - ${leagueName} Team Ratings (${leagueCode})`;

    selectedCountryForTeams = countryName;
    selectedLeagueForTeams = leagueName;
    selectedLeagueCode = leagueCode; // Store for calibrated draw width lookup
    selectedLeagueUrl = teamData.leagueUrl;
    selectedTeamsData = teamData; // Store for odds calculation

    document.getElementById('welcomeMessage').style.display = 'none';
    document.getElementById('teamsDisplay').classList.add('show');

    showTeamsView(teamData);
}

// Show teams ratings view
export function showTeamsView(teamData) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById('ratingsTab').classList.add('active');
    document.getElementById('teamsContent').style.display = 'flex';
    document.getElementById('oddsDisplay').style.display = 'none';
    document.getElementById('tableDisplay').style.display = 'none';

    const teamsContent = document.getElementById('teamsContent');

    teamsContent.innerHTML = `
        <div class="teams-table-container">
            <div class="table-title">Home Ratings (${teamData.home.length} teams)</div>
            ${createTeamsTable(teamData.home)}
        </div>
        <div class="teams-table-container">
            <div class="table-title">Away Ratings (${teamData.away.length} teams)</div>
            ${createTeamsTable(teamData.away)}
        </div>
    `;
}

// Create league standings table HTML
function createStandingsTable(standings) {
    if (!standings || standings.length === 0) {
        return '<div style="padding: 20px; text-align: center; color: #666;">No standings data available</div>';
    }

    return `
        <table class="teams-table standings-table">
            <thead>
                <tr>
                    <th style="text-align: center; width: 35px;">#</th>
                    <th>Team</th>
                    <th style="text-align: center;">P</th>
                    <th style="text-align: center;">W</th>
                    <th style="text-align: center;">D</th>
                    <th style="text-align: center;">L</th>
                    <th style="text-align: center;">GF</th>
                    <th style="text-align: center;">GA</th>
                    <th style="text-align: center;">GD</th>
                    <th style="text-align: center; font-weight: bold;">Pts</th>
                </tr>
            </thead>
            <tbody>
                ${standings.map((team, index) => {
                    const gd = team.goalsFor - team.goalsAgainst;
                    const gdDisplay = gd > 0 ? `+${gd}` : gd;
                    const gdColor = gd > 0 ? '#006600' : gd < 0 ? '#cc0000' : '#666';
                    return `
                    <tr>
                        <td style="text-align: center; font-weight: bold; color: #666;">${index + 1}</td>
                        <td style="color: #006600; font-weight: bold;">${team.name}</td>
                        <td style="text-align: center;">${team.played}</td>
                        <td style="text-align: center;">${team.wins}</td>
                        <td style="text-align: center;">${team.draws}</td>
                        <td style="text-align: center;">${team.losses}</td>
                        <td style="text-align: center;">${team.goalsFor}</td>
                        <td style="text-align: center;">${team.goalsAgainst}</td>
                        <td style="text-align: center; color: ${gdColor}; font-weight: bold;">${gdDisplay}</td>
                        <td style="text-align: center; font-weight: bold; color: #333;">${team.points}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Create home/away breakdown table
function createHomeAwayTable(standings, type) {
    if (!standings || standings.length === 0) return '';

    const isHome = type === 'home';
    const label = isHome ? 'Home' : 'Away';

    // Sort by home/away points approximation (W*3 + D*1)
    const sorted = [...standings].sort((a, b) => {
        const aPts = (isHome ? a.homeWins : a.awayWins) * 3 + (isHome ? a.homeDraws : a.awayDraws);
        const bPts = (isHome ? b.homeWins : b.awayWins) * 3 + (isHome ? b.homeDraws : b.awayDraws);
        const aGD = (isHome ? a.homeGF - a.homeGA : a.awayGF - a.awayGA);
        const bGD = (isHome ? b.homeGF - b.homeGA : b.awayGF - b.awayGA);
        return bPts - aPts || bGD - aGD;
    });

    return `
        <table class="teams-table standings-table">
            <thead>
                <tr>
                    <th style="text-align: center; width: 35px;">#</th>
                    <th>Team</th>
                    <th style="text-align: center;">P</th>
                    <th style="text-align: center;">W</th>
                    <th style="text-align: center;">D</th>
                    <th style="text-align: center;">L</th>
                    <th style="text-align: center;">GF</th>
                    <th style="text-align: center;">GA</th>
                    <th style="text-align: center;">GD</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map((team, index) => {
                    const m = isHome ? team.homeMatches : team.awayMatches;
                    const w = isHome ? team.homeWins : team.awayWins;
                    const d = isHome ? team.homeDraws : team.awayDraws;
                    const l = isHome ? team.homeLosses : team.awayLosses;
                    const gf = isHome ? team.homeGF : team.awayGF;
                    const ga = isHome ? team.homeGA : team.awayGA;
                    const gd = gf - ga;
                    const gdDisplay = gd > 0 ? `+${gd}` : gd;
                    const gdColor = gd > 0 ? '#006600' : gd < 0 ? '#cc0000' : '#666';
                    return `
                    <tr>
                        <td style="text-align: center; font-weight: bold; color: #666;">${index + 1}</td>
                        <td style="color: #006600; font-weight: bold;">${team.name}</td>
                        <td style="text-align: center;">${m}</td>
                        <td style="text-align: center;">${w}</td>
                        <td style="text-align: center;">${d}</td>
                        <td style="text-align: center;">${l}</td>
                        <td style="text-align: center;">${gf}</td>
                        <td style="text-align: center;">${ga}</td>
                        <td style="text-align: center; color: ${gdColor}; font-weight: bold;">${gdDisplay}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Calculate league-wide stats from standings
function calculateLeagueStats(standings) {
    let totalMatches = 0;
    let totalGoals = 0;
    let totalHomeWins = 0;
    let totalDraws = 0;
    let totalAwayWins = 0;

    for (const team of standings) {
        // Each team's home matches represent unique league matches
        totalMatches += team.homeMatches;
        totalGoals += team.homeGF + team.homeGA;
        totalHomeWins += team.homeWins;
        totalDraws += team.homeDraws;
        totalAwayWins += team.homeLosses; // Home loss = away win for opponent
    }

    if (totalMatches === 0) return null;

    return {
        goalsPerMatch: (totalGoals / totalMatches).toFixed(2),
        homeWinPct: (totalHomeWins / totalMatches * 100).toFixed(1),
        drawPct: (totalDraws / totalMatches * 100).toFixed(1),
        awayWinPct: (totalAwayWins / totalMatches * 100).toFixed(1),
        totalMatches
    };
}

// Create league stats bar HTML
function createLeagueStatsBar(standings) {
    const stats = calculateLeagueStats(standings);
    if (!stats) return '';

    return `
        <div class="league-stats-bar">
            <div class="league-stat">
                <span class="league-stat-value">${stats.goalsPerMatch}</span>
                <span class="league-stat-label">Goals/Match</span>
            </div>
            <div class="league-stat">
                <span class="league-stat-value" style="color: #006600;">${stats.homeWinPct}%</span>
                <span class="league-stat-label">Home Win</span>
            </div>
            <div class="league-stat">
                <span class="league-stat-value" style="color: #666;">${stats.drawPct}%</span>
                <span class="league-stat-label">Draw</span>
            </div>
            <div class="league-stat">
                <span class="league-stat-value" style="color: #cc0000;">${stats.awayWinPct}%</span>
                <span class="league-stat-label">Away Win</span>
            </div>
            <div class="league-stat">
                <span class="league-stat-value" style="color: #888; font-size: 14px;">${stats.totalMatches}</span>
                <span class="league-stat-label">Matches</span>
            </div>
        </div>
    `;
}

// Show table (standings) view
export function showTableView() {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tableTab').classList.add('active');
    document.getElementById('teamsContent').style.display = 'none';
    document.getElementById('oddsDisplay').style.display = 'none';
    document.getElementById('tableDisplay').style.display = 'block';

    const tableDisplay = document.getElementById('tableDisplay');

    if (!selectedLeagueTable || !selectedLeagueTable.standings || selectedLeagueTable.standings.length === 0) {
        tableDisplay.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No league table data available for this league.</div>';
        return;
    }

    const standings = selectedLeagueTable.standings;

    tableDisplay.innerHTML = `
        <div style="width: 100%;">
            <div class="table-title">League Standings (${standings.length} teams)</div>
            ${createLeagueStatsBar(standings)}
            ${createStandingsTable(standings)}

            <div style="display: flex; gap: 20px; margin-top: 20px;">
                <div style="flex: 1;">
                    <div class="table-title">Home Form</div>
                    ${createHomeAwayTable(standings, 'home')}
                </div>
                <div style="flex: 1;">
                    <div class="table-title">Away Form</div>
                    ${createHomeAwayTable(standings, 'away')}
                </div>
            </div>
        </div>
    `;
}

// Show odds view
export function showOddsView(oddsData) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById('oddsTab').classList.add('active');
    document.getElementById('teamsContent').style.display = 'none';
    document.getElementById('oddsDisplay').style.display = 'block';
    document.getElementById('tableDisplay').style.display = 'none';

    const oddsDisplay = document.getElementById('oddsDisplay');

    // Store odds data for margin adjustment updates
    if (oddsData !== undefined) {
        selectedOddsData = oddsData;
    }

    if (!selectedLeagueUrl) {
        oddsDisplay.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Please select a league first to see the odds.</div>';
        return;
    }

    if (selectedOddsData && selectedTeamsData) {
        // Use enhanced comparison table with value indicators (pass league code for calibrated draw width)
        oddsDisplay.innerHTML = createOddsComparisonTable(selectedOddsData, selectedTeamsData, selectedLeagueCode);
    } else if (selectedOddsData) {
        // Fallback to simple table if teams data not available
        oddsDisplay.innerHTML = createOddsTable(selectedOddsData);
    } else {
        oddsDisplay.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No odds data available for this league.</div>';
    }
}

// Set league table data for Poisson model
export function setLeagueTable(tableData) {
    selectedLeagueTable = tableData;
}

// Getters for selected data
export function getSelectedLeagueUrl() {
    return selectedLeagueUrl;
}

export function getSelectedCountry() {
    return selectedCountryForTeams;
}

export function getSelectedLeague() {
    return selectedLeagueForTeams;
}

export function getSelectedTeamsData() {
    return selectedTeamsData;
}

// Update margin adjustment setting and refresh odds display
export function updateMarginAdjustment(newValue) {
    console.log('Updating margin adjustment from', marginAdjustment, 'to', newValue);
    marginAdjustment = newValue;
    console.log('Refreshing odds view');
    // Refresh the odds display with the new margin adjustment
    showOddsView();
}
