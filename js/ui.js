import { CONFIG, countries } from './config.js';
import {
    calculateOddsFromRatings,
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
} from './odds-calculator.js';

// UI state management
let selectedCountryForTeams = null;
let selectedLeagueForTeams = null;
let selectedLeagueUrl = null;
let selectedTeamsData = null;

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
export function createOddsComparisonTable(odds, teamsData) {
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

        // Calculate odds from ratings
        let calculatedOdds = calculateOddsFromRatings(homeRating, awayRating);

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

        // Calculate adjusted DNB odds based on margin setting
        let displayDNBCalculated = {
            home: calculatedOdds.dnbHome,
            away: calculatedOdds.dnbAway
        };
        let displayDNBMarket;

        if (marginAdjustment === 'removeFromMarket') {
            // Calculate DNB from margin-free odds (don't re-apply margin)
            displayDNBMarket = calculateDNBFromFairOdds(displayMarketOdds);
        } else {
            // Calculate DNB from market odds (with margin)
            displayDNBMarket = calculateDNBFromMarket(match.odds);
        }

        if (marginAdjustment === 'applyToCalculated') {
            // Apply margin to calculated DNB odds
            displayDNBCalculated = applyMarginToDNB(calculatedOdds.dnbHome, calculatedOdds.dnbAway, bookmakerMargin);
        }

        console.log('DNB Debug:', {
            match: `${match.homeTeam} vs ${match.awayTeam}`,
            calculatedDNBHome: calculatedOdds.dnbHome,
            calculatedDNBAway: calculatedOdds.dnbAway,
            displayDNBCalculated,
            displayDNBMarket,
            marginAdjustment
        });

        // Find value bets
        const valueBets = findValueBets(comparison);
        const hasValue = valueBets.length > 0;
        if (hasValue) valueBetsCount++;

        matchCards += `
            <div style="margin-bottom: 20px; border: 2px solid ${hasValue ? '#006600' : '#ddd'}; border-radius: 8px; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Match Header -->
                <div style="padding: 15px; background-color: ${hasValue ? '#e8f5e8' : '#f5f5f5'}; border-bottom: 2px solid ${hasValue ? '#006600' : '#ddd'}; border-radius: 6px 6px 0 0;">
                    <div style="font-size: 16px; font-weight: bold; color: #006600; text-align: center;">
                        ${match.homeTeam} vs ${match.awayTeam}
                    </div>
                    <div style="font-size: 11px; color: #666; text-align: center; margin-top: 5px;">
                        Bookmaker Margin: ${formatMargin(bookmakerMargin)} | Ratings: ${homeRating.toFixed(1)} vs ${awayRating.toFixed(1)}
                        ${hasValue ? ' | <strong style="color: #006600;">VALUE OPPORTUNITY</strong>' : ''}
                    </div>
                </div>

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
                <strong>Fair:</strong> Calculated odds from team ratings<br>
                <strong>EV (Expected Value):</strong> Percentage difference - positive EV suggests potential value<br>
                <strong>Green background:</strong> Indicates value bet (EV > 5%)<br>
                <strong>Probability:</strong> Win probability based on ratings<br>
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

// Show about view
export function showAboutView() {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById('aboutTab').classList.add('active');
    document.getElementById('teamsContent').style.display = 'none';
    document.getElementById('oddsDisplay').style.display = 'none';
    document.getElementById('aboutDisplay').style.display = 'block';

    const aboutDisplay = document.getElementById('aboutDisplay');

    aboutDisplay.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #006600; margin-bottom: 20px; text-align: center;">About Global Football League Rankings</h2>

            <div style="background-color: #f0f8f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #006600;">
                <h3 style="color: #006600; margin-bottom: 10px;">What is this application?</h3>
                <p style="line-height: 1.6; color: #333;">
                    This is a comprehensive football (soccer) analytics platform that provides team ratings, league rankings,
                    and betting odds analysis for over 90 countries and 200+ leagues worldwide. The application calculates
                    fair betting odds from team ratings and identifies value betting opportunities using advanced statistical models.
                </p>
            </div>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd;">
                <h3 style="color: #006600; margin-bottom: 15px;">Key Features</h3>
                <ul style="line-height: 2; color: #333;">
                    <li><strong>Global Coverage:</strong> UEFA, CONMEBOL, CONCACAF, AFC, CAF, OFC confederations</li>
                    <li><strong>Team Ratings:</strong> Home and away performance ratings for all teams</li>
                    <li><strong>Odds Calculator:</strong> Elo-based probability calculations with draw modeling</li>
                    <li><strong>Value Betting:</strong> Expected Value (EV) analysis and value bet detection</li>
                    <li><strong>Margin Analysis:</strong> Bookmaker margin calculation and adjustment options</li>
                    <li><strong>Smart Caching:</strong> 1-hour cache duration for optimal performance</li>
                    <li><strong>CORS Handling:</strong> Multiple proxy fallback options for data fetching</li>
                </ul>
            </div>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd;">
                <h3 style="color: #006600; margin-bottom: 15px;">How Odds Calculation Works</h3>
                <p style="line-height: 1.6; color: #333; margin-bottom: 10px;">
                    The application uses a 3-way Elo-based formula to calculate match probabilities from team ratings:
                </p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; font-family: monospace; margin-bottom: 10px; font-size: 13px;">
                    P(Home) = F(diff - drawWidth)<br>
                    P(Draw) = F(diff + drawWidth) - F(diff - drawWidth)<br>
                    P(Away) = 1 - F(diff + drawWidth)<br>
                    <span style="color: #666; font-size: 11px;">*where F(x) = 1 / (1 + 10^(-x/400)) and diff = HomeRating - AwayRating</span>
                </div>
                <p style="line-height: 1.6; color: #333; margin-bottom: 10px;">
                    Model Parameters:
                </p>
                <ul style="line-height: 1.8; color: #333;">
                    <li><strong>Draw Width:</strong> 90 points (calibrated for ~25% base draw rate)</li>
                    <li><strong>Expected Value:</strong> Calculated as (Market Odds / Fair Odds - 1) × 100%</li>
                </ul>
            </div>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd;">
                <h3 style="color: #006600; margin-bottom: 15px;">Technology Stack</h3>
                <ul style="line-height: 1.8; color: #333;">
                    <li><strong>Frontend:</strong> Vanilla JavaScript (ES6 Modules)</li>
                    <li><strong>Architecture:</strong> Modular design with separation of concerns</li>
                    <li><strong>Modules:</strong> config.js, parsers.js, api.js, odds-calculator.js, ui.js, main.js</li>
                    <li><strong>Styling:</strong> Pure CSS with responsive design</li>
                    <li><strong>Data Fetching:</strong> Fetch API with CORS proxy support</li>
                </ul>
            </div>

            <div style="background-color: #fff9e6; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f0ad4e;">
                <h3 style="color: #8a6d3b; margin-bottom: 10px;">Disclaimer</h3>
                <p style="line-height: 1.6; color: #8a6d3b; font-size: 14px;">
                    <strong>Educational and Portfolio Purpose:</strong> This application is designed as a technical demonstration
                    and portfolio project. Data is aggregated from public sources for analysis and educational purposes only.
                    This tool is not affiliated with any bookmakers or data providers. Calculated odds and value indicators
                    are statistical models and should not be used as the sole basis for betting decisions.
                    <strong>Gambling involves risk. Please bet responsibly.</strong>
                </p>
            </div>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd;">
                <h3 style="color: #006600; margin-bottom: 15px;">Source Code & Development</h3>
                <p style="line-height: 1.6; color: #333; margin-bottom: 10px;">
                    This is an open-source project. The complete source code is available on GitHub:
                </p>
                <div style="text-align: center; margin: 15px 0;">
                    <a href="https://github.com/damirmikic/football-ratings"
                       target="_blank"
                       style="display: inline-block; padding: 12px 24px; background-color: #006600; color: white;
                              text-decoration: none; border-radius: 6px; font-weight: bold;">
                        View on GitHub
                    </a>
                </div>
                <p style="line-height: 1.6; color: #333; font-size: 14px;">
                    Contributions, issues, and feature requests are welcome!
                </p>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; font-size: 12px; color: #666;">
                <p>Built with JavaScript ES6 Modules • Responsive Design • Global Coverage</p>
                <p style="margin-top: 5px;">Co-Authored-By: Claude Sonnet 4.5</p>
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

    const oddsDisplay = document.getElementById('oddsDisplay');

    if (!selectedLeagueUrl) {
        oddsDisplay.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Please select a league first to see the odds.</div>';
        return;
    }

    if (oddsData && selectedTeamsData) {
        // Use enhanced comparison table with value indicators
        oddsDisplay.innerHTML = createOddsComparisonTable(oddsData, selectedTeamsData);
    } else if (oddsData) {
        // Fallback to simple table if teams data not available
        oddsDisplay.innerHTML = createOddsTable(oddsData);
    } else {
        oddsDisplay.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No odds data available for this league.</div>';
    }
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
    marginAdjustment = newValue;
    // Trigger odds view refresh by dispatching a custom event
    const event = new CustomEvent('marginAdjustmentChanged');
    document.dispatchEvent(event);
}
