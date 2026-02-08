import { fetchTeamData, fetchOddsData, fetchLeagueTable, clearCache, testConnection } from './api.js?v=5';
import {
    createCountriesList,
    showLoading,
    hideLoading,
    showError,
    showInfo,
    showTeamsDisplay,
    showOddsView,
    showTableView,
    getSelectedLeagueUrl,
    updateMarginAdjustment,
    setLeagueTable
} from './ui.js?v=5';

// Data stores
const teamsData = {};
const leagueTableData = {}; // Store league tables separately

// Attach button handlers after DOM is ready (replaces inline onclick)
function attachButtonHandlers() {
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', handleClearCache);
    if (testConnectionBtn) testConnectionBtn.addEventListener('click', handleTestConnection);
}

// Expose updateMarginAdjustment globally for radio button handlers
window.updateMarginAdjustment = function(value) {
    updateMarginAdjustment(value);
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
    const tableKey = `${countryName}-${leagueCode}`;

    if (!teamData) {
        try {
            showLoading(`Loading ${leagueName} team data...`);

            // Fetch team ratings and league table in parallel
            const [fetchedTeamData, leagueTable] = await Promise.all([
                fetchTeamData(countryName, leagueName, leagueCode),
                fetchLeagueTable(countryName, leagueCode)
            ]);

            teamData = fetchedTeamData;

            // Store the data
            if (!teamsData[countryName]) {
                teamsData[countryName] = {};
            }
            teamsData[countryName][leagueName] = teamData;
            leagueTableData[tableKey] = leagueTable;

            // Set league table for Poisson+DC model
            setLeagueTable(leagueTable);

            hideLoading();
            const tableInfo = leagueTable ? ` + league table (${Object.keys(leagueTable.teams).length} teams)` : '';
            showInfo(`Successfully loaded ${teamData.home.length + teamData.away.length} team records for ${leagueName}${tableInfo}`);
        } catch (error) {
            hideLoading();
            showError(`Failed to load team data for ${leagueName}. ${error.message}`);
            return;
        }
    } else {
        // Restore league table from cache for Poisson+DC model
        setLeagueTable(leagueTableData[tableKey] || null);
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
        import('./ui.js?v=5').then(module => {
            module.showTeamsView(teamData);
        });
    }
}

// Handle odds tab click
async function handleOddsTabClick() {
    const leagueUrl = getSelectedLeagueUrl();

    if (!leagueUrl) {
        import('./ui.js?v=5').then(module => {
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

        import('./ui.js?v=5').then(module => {
            module.showOddsView(oddsData);
        });
    } catch (error) {
        hideLoading();
        showError(`Failed to load odds data. ${error.message}`);

        import('./ui.js?v=5').then(module => {
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

    // Attach button event handlers
    attachButtonHandlers();

    // Attach event handlers
    attachLeagueClickHandlers();

    // Attach navigation tab handlers
    const ratingsTab = document.getElementById('ratingsTab');
    const oddsTab = document.getElementById('oddsTab');
    const tableTab = document.getElementById('tableTab');

    if (ratingsTab) {
        ratingsTab.addEventListener('click', handleRatingsTabClick);
    }

    if (oddsTab) {
        oddsTab.addEventListener('click', handleOddsTabClick);
    }

    if (tableTab) {
        tableTab.addEventListener('click', showTableView);
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
