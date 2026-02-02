import { fetchTeamData, fetchOddsData, clearCache, testConnection } from './api.js';
import {
    createCountriesList,
    showLoading,
    hideLoading,
    showError,
    showInfo,
    showTeamsDisplay,
    showOddsView,
    getSelectedLeagueUrl,
    updateMarginAdjustment
} from './ui.js';

// Data stores
const teamsData = {};

// Create fetcher object for compatibility with HTML onclick handlers
window.fetcher = {
    clearCache: handleClearCache,
    testConnection: handleTestConnection
};

// Expose updateMarginAdjustment globally for radio button handlers
window.updateMarginAdjustment = function(value) {
    updateMarginAdjustment(value);
    // Re-trigger odds view to refresh display
    handleOddsTabClick();
};

// Handle clear cache button
function handleClearCache() {
    clearCache();

    // Clear local data stores
    Object.keys(teamsData).forEach(key => delete teamsData[key]);

    createCountriesList();
    attachLeagueClickHandlers();
    showInfo('Cache cleared successfully!');
}

// Handle test connection button
async function handleTestConnection() {
    showLoading('Testing connection to data source...');

    const result = await testConnection();

    hideLoading();

    if (result.success) {
        showInfo(result.message);
    } else {
        showError(result.message);
    }
}

// Handle league click to show teams
async function handleLeagueClick(event) {
    const leagueItem = event.target.closest('.league-item');
    if (!leagueItem) return;

    const countryName = leagueItem.dataset.country;
    const leagueName = leagueItem.dataset.league;
    const leagueCode = leagueItem.dataset.code;

    // Check if we already have the data
    let teamData = teamsData[countryName] && teamsData[countryName][leagueName];

    if (!teamData) {
        try {
            showLoading(`Loading ${leagueName} team data...`);
            teamData = await fetchTeamData(countryName, leagueName, leagueCode);

            // Store the data
            if (!teamsData[countryName]) {
                teamsData[countryName] = {};
            }
            teamsData[countryName][leagueName] = teamData;

            hideLoading();
            showInfo(`Successfully loaded ${teamData.home.length + teamData.away.length} team records for ${leagueName}`);
        } catch (error) {
            hideLoading();
            showError(`Failed to load team data for ${leagueName}. ${error.message}`);
            return;
        }
    }

    if (teamData && (teamData.home.length > 0 || teamData.away.length > 0)) {
        showTeamsDisplay(countryName, leagueName, leagueCode, teamData);
    } else {
        showError(`No team data available for ${countryName} - ${leagueName}`);
    }
}

// Handle ratings tab click
function handleRatingsTabClick() {
    const selectedCountry = document.getElementById('teamsHeader').textContent.split(' - ')[0];
    const selectedLeague = document.getElementById('teamsHeader').textContent.split(' - ')[1]?.split(' Team')[0];

    if (selectedCountry && selectedLeague && teamsData[selectedCountry] && teamsData[selectedCountry][selectedLeague]) {
        const teamData = teamsData[selectedCountry][selectedLeague];

        // Import showTeamsView dynamically
        import('./ui.js').then(module => {
            module.showTeamsView(teamData);
        });
    }
}

// Handle odds tab click
async function handleOddsTabClick() {
    const leagueUrl = getSelectedLeagueUrl();

    if (!leagueUrl) {
        import('./ui.js').then(module => {
            module.showOddsView(null);
        });
        return;
    }

    try {
        showLoading('Loading odds data...');
        const oddsData = await fetchOddsData(leagueUrl);
        hideLoading();

        if (oddsData && oddsData.length > 0) {
            showInfo(`Successfully loaded ${oddsData.length} odds records`);
        }

        import('./ui.js').then(module => {
            module.showOddsView(oddsData);
        });
    } catch (error) {
        hideLoading();
        showError(`Failed to load odds data. ${error.message}`);

        import('./ui.js').then(module => {
            module.showOddsView(null);
        });
    }
}

// Attach event handlers to league items
function attachLeagueClickHandlers() {
    const leagueItems = document.querySelectorAll('.league-item');
    leagueItems.forEach(item => {
        item.addEventListener('click', handleLeagueClick);
    });
}

// Initialize the application
function init() {
    console.log('🏆 UEFA League Rankings initialized');

    // Create countries list
    createCountriesList();

    // Attach event handlers
    attachLeagueClickHandlers();

    // Attach navigation tab handlers
    const ratingsTab = document.getElementById('ratingsTab');
    const oddsTab = document.getElementById('oddsTab');

    if (ratingsTab) {
        ratingsTab.addEventListener('click', handleRatingsTabClick);
    }

    if (oddsTab) {
        oddsTab.addEventListener('click', handleOddsTabClick);
    }

    // Auto-test connection on load
    setTimeout(() => {
        console.log('Auto-testing connection...');
        handleTestConnection();
    }, 1000);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
