import { CONFIG, countries } from './config.js';

// UI state management
let selectedCountryForTeams = null;
let selectedLeagueForTeams = null;
let selectedLeagueUrl = null;

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
                🏆 ${countryName}
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
                        <td style="text-align: center;">🏴</td>
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

// Show teams display panel
export function showTeamsDisplay(countryName, leagueName, leagueCode, teamData) {
    const teamsHeader = document.getElementById('teamsHeader');
    teamsHeader.textContent = `${countryName} - ${leagueName} Team Ratings (${leagueCode})`;

    selectedCountryForTeams = countryName;
    selectedLeagueForTeams = leagueName;
    selectedLeagueUrl = teamData.leagueUrl;

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
            <div class="table-title">🏠 Home Ratings (${teamData.home.length} teams)</div>
            ${createTeamsTable(teamData.home)}
        </div>
        <div class="teams-table-container">
            <div class="table-title">✈️ Away Ratings (${teamData.away.length} teams)</div>
            ${createTeamsTable(teamData.away)}
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

    if (oddsData) {
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
