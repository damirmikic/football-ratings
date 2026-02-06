import { CONFIG } from './config.js?v=2';

// Enhanced HTML parser for team data
export function parseTeamDataFromHTML(htmlString, ratingType = 'home') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Try multiple table selectors
    let table = doc.querySelector('table.bigtable.rattab') ||
               doc.querySelector('table.bigtable') ||
               doc.querySelector('table[bgcolor="#ffffff"]') ||
               doc.querySelector('table');

    if (!table) {
        console.warn('No team table found in HTML');
        return [];
    }

    const teams = [];
    const rows = table.querySelectorAll('tr');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');

        if (cells.length >= 4) {
            try {
                const rank = cells[0].textContent.trim().replace('.', '');
                const teamCell = cells[1];
                const teamLink = teamCell.querySelector('a');
                const teamName = teamLink ? teamLink.textContent.trim() : teamCell.textContent.trim();

                let league = '';
                let flag = '';
                let rating = '';

                if (cells.length >= 5) {
                    // 5-column format: rank, team, league, flag, rating
                    league = cells[2].textContent.trim();
                    const flagImg = cells[3].querySelector('img');
                    flag = flagImg ? flagImg.src.split('/').pop().replace('.gif', '') : 'Unknown';
                    rating = cells[4].textContent.trim();
                } else {
                    // 4-column format: rank, team, flag, rating
                    const flagImg = cells[2].querySelector('img');
                    flag = flagImg ? flagImg.src.split('/').pop().replace('.gif', '') : 'Unknown';
                    rating = cells[3].textContent.trim();
                }

                if (teamName && rating) {
                    teams.push({
                        rank: parseInt(rank) || i,
                        name: teamName,
                        league: league,
                        flag: flag,
                        rating: rating
                    });
                }
            } catch (e) {
                console.warn('Error parsing team row:', e, row);
            }
        }
    }

    console.log(`Parsed ${teams.length} teams for ${ratingType} ratings`);
    return teams;
}

// Parse league data from HTML
export function parseLeagueDataFromHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    console.log('Raw HTML length:', htmlString.length);

    const leagues = [];

    // Method 1: Try table-based parsing (original method)
    let table = doc.querySelector('table.bigtable.rattab') ||
               doc.querySelector('table.bigtable') ||
               doc.querySelector('table[bgcolor="#ffffff"]') ||
               doc.querySelector('table');

    if (table) {
        console.log('Found table, parsing...');
        const rows = table.querySelectorAll('tr');

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');

            if (cells.length >= 3) {
                try {
                    const rank = cells[0].textContent.trim().replace('.', '');
                    const leagueCell = cells[1];
                    const leagueLink = leagueCell.querySelector('a');
                    const leagueName = leagueLink ? leagueLink.textContent.trim() : leagueCell.textContent.trim();
                    const rating = cells[cells.length - 1].textContent.trim();

                    if (leagueName && rating && !isNaN(parseFloat(rating))) {
                        leagues.push({
                            rank: parseInt(rank) || i,
                            name: leagueName,
                            rating: rating
                        });
                    }
                } catch (e) {
                    console.warn('Error parsing league row:', e, row);
                }
            }
        }
    }

    // Method 2: Parse the actual format shown in your image
    if (leagues.length === 0) {
        console.log('No table leagues found, trying text parsing...');

        // Look for the pattern: "1. 1.49 TH1 -24/-23 58 41"
        const lines = htmlString.split(/[\r\n]+/);

        for (const line of lines) {
            const trimmed = line.trim();

            // Match numbered lines with ratings
            const match = trimmed.match(/^(\d+)\.\s+([0-9.]+)\s+([A-Z0-9]+)/);
            if (match) {
                const [, rank, rating, code] = match;

                // Use the comprehensive league names from CONFIG
                const leagueName = CONFIG.ENDPOINTS.leagueNames[code] || code;

                leagues.push({
                    rank: parseInt(rank),
                    name: leagueName,
                    rating: rating
                });

                console.log('Parsed league:', {rank, name: leagueName, rating});
            }
        }
    }

    console.log(`Successfully parsed ${leagues.length} leagues`);
    return leagues;
}

// Parse league table (ltable) from HTML to extract team goal stats
export function parseLeagueTableFromHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const table = doc.getElementById('ltable') || doc.querySelector('table.ltable');
    if (!table) {
        console.warn('No league table (ltable) found in HTML');
        return null;
    }

    const teams = {};
    let leagueTotalHomeGoals = 0;
    let leagueTotalAwayGoals = 0;
    let leagueTotalHomeMatches = 0;
    let leagueTotalAwayMatches = 0;

    const rows = table.querySelectorAll('tr');
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');

        // Need at least 18 cells for full home/away data
        if (cells.length < 18) continue;

        try {
            const teamCell = cells[1];
            const teamLink = teamCell.querySelector('a');
            const teamName = teamLink ? teamLink.textContent.trim() : teamCell.textContent.trim();
            if (!teamName) continue;

            // Home stats: cells[8]=M, cells[12]=Goals (GF:GA)
            const homeMatches = parseInt(cells[8].textContent.trim()) || 0;
            const homeGoals = cells[12].textContent.trim();
            const [homeGF, homeGA] = homeGoals.split(':').map(Number);

            // Away stats: cells[13]=M, cells[17]=Goals (GF:GA)
            const awayMatches = parseInt(cells[13].textContent.trim()) || 0;
            const awayGoals = cells[17].textContent.trim();
            const [awayGF, awayGA] = awayGoals.split(':').map(Number);

            if (isNaN(homeGF) || isNaN(awayGF) || homeMatches === 0 || awayMatches === 0) continue;

            teams[teamName] = {
                homeMatches, homeGF, homeGA,
                awayMatches, awayGF, awayGA,
                homeGFPerMatch: homeGF / homeMatches,
                homeGAPerMatch: homeGA / homeMatches,
                awayGFPerMatch: awayGF / awayMatches,
                awayGAPerMatch: awayGA / awayMatches
            };

            leagueTotalHomeGoals += homeGF;
            leagueTotalAwayGoals += awayGF;
            leagueTotalHomeMatches += homeMatches;
            leagueTotalAwayMatches += awayMatches;
        } catch (e) {
            console.warn('Error parsing league table row:', e);
        }
    }

    const teamCount = Object.keys(teams).length;
    if (teamCount === 0) return null;

    const leagueAvgHomeGoals = leagueTotalHomeGoals / leagueTotalHomeMatches;
    const leagueAvgAwayGoals = leagueTotalAwayGoals / leagueTotalAwayMatches;

    console.log(`Parsed league table: ${teamCount} teams, avg home goals: ${leagueAvgHomeGoals.toFixed(2)}, avg away goals: ${leagueAvgAwayGoals.toFixed(2)}`);

    return {
        teams,
        leagueAvgHomeGoals,
        leagueAvgAwayGoals,
        leagueTotalHomeMatches,
        leagueTotalAwayMatches
    };
}

// Parse odds data from HTML
export function parseOddsDataFromHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const oddsContainer = doc.getElementById('oddsa');

    if (!oddsContainer) {
        console.warn('No odds container found in HTML');
        return [];
    }

    const table = oddsContainer.querySelector('table.bigtable');
    if (!table) {
        console.warn('No odds table found in HTML');
        return [];
    }

    const matches = [];
    const rows = table.querySelectorAll('tr');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');

        if (cells.length === 1 && row.querySelector('hr')) {
            // This is a separator row, skip it
            continue;
        }

        if (cells.length >= 10) {
            const homeTeamLink = cells[4].querySelector('a');
            const homeTeam = homeTeamLink ? homeTeamLink.textContent.trim() : 'N/A';

            const awayTeamLink = cells[6].querySelector('a');
            const awayTeam = awayTeamLink ? awayTeamLink.textContent.trim() : 'N/A';

            const odds1 = cells[7].textContent.trim();
            const oddsX = cells[8].textContent.trim();
            const odds2 = cells[9].textContent.trim();

            if (homeTeam !== 'N/A' && awayTeam !== 'N/A') {
                matches.push({
                    homeTeam,
                    awayTeam,
                    odds: {
                        '1': parseFloat(odds1),
                        'X': parseFloat(oddsX),
                        '2': parseFloat(odds2)
                    }
                });
            }
        }
    }
    return matches;
}
