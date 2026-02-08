import { CONFIG } from './config.js?v=5';

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
    const standings = []; // Full standings array for table display
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
            const rank = parseInt(cells[0].textContent.trim()) || i;
            const teamCell = cells[1];
            const teamLink = teamCell.querySelector('a');
            const teamName = teamLink ? teamLink.textContent.trim() : teamCell.textContent.trim();
            if (!teamName) continue;

            // Total stats: cells[2]=P, cells[3]=W, cells[4]=D, cells[5]=L, cells[6]=Goals, cells[7]=Pts
            const totalPlayed = parseInt(cells[2].textContent.trim()) || 0;
            const totalWins = parseInt(cells[3].textContent.trim()) || 0;
            const totalDraws = parseInt(cells[4].textContent.trim()) || 0;
            const totalLosses = parseInt(cells[5].textContent.trim()) || 0;
            const totalGoals = cells[6].textContent.trim();
            const [totalGF, totalGA] = totalGoals.split(':').map(Number);
            const totalPoints = parseInt(cells[7].textContent.trim()) || 0;

            // Home stats: cells[8]=M, cells[9]=W, cells[10]=D, cells[11]=L, cells[12]=Goals (GF:GA)
            const homeMatches = parseInt(cells[8].textContent.trim()) || 0;
            const homeWins = parseInt(cells[9].textContent.trim()) || 0;
            const homeDraws = parseInt(cells[10].textContent.trim()) || 0;
            const homeLosses = parseInt(cells[11].textContent.trim()) || 0;
            const homeGoals = cells[12].textContent.trim();
            const [homeGF, homeGA] = homeGoals.split(':').map(Number);

            // Away stats: cells[13]=M, cells[14]=W, cells[15]=D, cells[16]=L, cells[17]=Goals (GF:GA)
            const awayMatches = parseInt(cells[13].textContent.trim()) || 0;
            const awayWins = parseInt(cells[14].textContent.trim()) || 0;
            const awayDraws = parseInt(cells[15].textContent.trim()) || 0;
            const awayLosses = parseInt(cells[16].textContent.trim()) || 0;
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

            standings.push({
                rank, name: teamName,
                played: totalPlayed, wins: totalWins, draws: totalDraws, losses: totalLosses,
                goalsFor: isNaN(totalGF) ? homeGF + awayGF : totalGF,
                goalsAgainst: isNaN(totalGA) ? homeGA + awayGA : totalGA,
                points: totalPoints,
                homeMatches, homeWins, homeDraws, homeLosses, homeGF, homeGA,
                awayMatches, awayWins, awayDraws, awayLosses, awayGF, awayGA
            });

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

    // Sort standings by points desc, then goal difference desc
    standings.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));

    const leagueAvgHomeGoals = leagueTotalHomeGoals / leagueTotalHomeMatches;
    const leagueAvgAwayGoals = leagueTotalAwayGoals / leagueTotalAwayMatches;

    console.log(`Parsed league table: ${teamCount} teams, avg home goals: ${leagueAvgHomeGoals.toFixed(2)}, avg away goals: ${leagueAvgAwayGoals.toFixed(2)}`);

    return {
        teams,
        standings,
        leagueAvgHomeGoals,
        leagueAvgAwayGoals,
        leagueTotalHomeMatches,
        leagueTotalAwayMatches
    };
}

// Parse soccerstats.com individual league page (home + away btable tables)
// Returns same structure as parseLeagueTableFromHTML for compatibility with Poisson/DC model
export function parseSoccerstatsLeagueTableFromHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Soccerstats uses multiple tables with id="btable"
    // First btable = Home table, Second btable = Away table
    const btables = doc.querySelectorAll('table#btable');
    if (btables.length < 2) {
        console.warn('Could not find home+away btables on soccerstats page');
        return null;
    }

    const homeTable = btables[0];
    const awayTable = btables[1];

    // Parse a btable into a map of teamName -> { gp, w, d, l, gf, ga, gd, pts, ppg }
    function parseBTable(table) {
        const teamMap = {};
        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length < 10) continue;
            try {
                const rank = parseInt(cells[0].textContent.trim()) || i;
                const teamLink = cells[1].querySelector('a');
                const teamName = teamLink ? teamLink.textContent.trim() : cells[1].textContent.trim();
                if (!teamName) continue;

                const gp = parseInt(cells[2].textContent.trim()) || 0;
                const w = parseInt(cells[3].textContent.trim()) || 0;
                const d = parseInt(cells[4].textContent.trim()) || 0;
                const l = parseInt(cells[5].textContent.trim()) || 0;
                const gf = parseInt(cells[6].textContent.trim()) || 0;
                const ga = parseInt(cells[7].textContent.trim()) || 0;
                const gd = parseInt(cells[8].textContent.trim()) || 0;
                const pts = parseInt(cells[9].textContent.trim()) || 0;
                const ppg = cells.length > 10 ? (parseFloat(cells[10].textContent.trim()) || 0) : 0;

                teamMap[teamName] = { rank, gp, w, d, l, gf, ga, gd, pts, ppg };
            } catch (e) {
                console.warn('Error parsing soccerstats btable row:', e);
            }
        }
        return teamMap;
    }

    const homeData = parseBTable(homeTable);
    const awayData = parseBTable(awayTable);

    if (Object.keys(homeData).length === 0 || Object.keys(awayData).length === 0) {
        console.warn('Empty home or away data from soccerstats btables');
        return null;
    }

    // Combine into the same format as parseLeagueTableFromHTML
    const teams = {};
    const standings = [];
    let leagueTotalHomeGoals = 0;
    let leagueTotalAwayGoals = 0;
    let leagueTotalHomeMatches = 0;
    let leagueTotalAwayMatches = 0;

    // Get all unique team names from both tables
    const allTeamNames = new Set([...Object.keys(homeData), ...Object.keys(awayData)]);

    for (const teamName of allTeamNames) {
        const home = homeData[teamName];
        const away = awayData[teamName];
        if (!home || !away) continue;

        const homeMatches = home.gp;
        const homeWins = home.w;
        const homeDraws = home.d;
        const homeLosses = home.l;
        const homeGF = home.gf;
        const homeGA = home.ga;

        const awayMatches = away.gp;
        const awayWins = away.w;
        const awayDraws = away.d;
        const awayLosses = away.l;
        const awayGF = away.gf;
        const awayGA = away.ga;

        if (homeMatches === 0 || awayMatches === 0) continue;

        teams[teamName] = {
            homeMatches, homeGF, homeGA,
            awayMatches, awayGF, awayGA,
            homeGFPerMatch: homeGF / homeMatches,
            homeGAPerMatch: homeGA / homeMatches,
            awayGFPerMatch: awayGF / awayMatches,
            awayGAPerMatch: awayGA / awayMatches
        };

        const totalPlayed = homeMatches + awayMatches;
        const totalGF = homeGF + awayGF;
        const totalGA = homeGA + awayGA;
        const totalPoints = home.pts + away.pts;

        standings.push({
            rank: 0, // will be recalculated after sorting
            name: teamName,
            played: totalPlayed,
            wins: homeWins + awayWins,
            draws: homeDraws + awayDraws,
            losses: homeLosses + awayLosses,
            goalsFor: totalGF,
            goalsAgainst: totalGA,
            points: totalPoints,
            homeMatches, homeWins, homeDraws, homeLosses, homeGF, homeGA,
            awayMatches, awayWins, awayDraws, awayLosses, awayGF, awayGA
        });

        leagueTotalHomeGoals += homeGF;
        leagueTotalAwayGoals += awayGF;
        leagueTotalHomeMatches += homeMatches;
        leagueTotalAwayMatches += awayMatches;
    }

    const teamCount = Object.keys(teams).length;
    if (teamCount === 0) return null;

    // Sort standings by points desc, then goal difference desc
    standings.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
    standings.forEach((s, i) => s.rank = i + 1);

    const leagueAvgHomeGoals = leagueTotalHomeGoals / leagueTotalHomeMatches;
    const leagueAvgAwayGoals = leagueTotalAwayGoals / leagueTotalAwayMatches;

    console.log(`Parsed soccerstats league table: ${teamCount} teams, avg home goals: ${leagueAvgHomeGoals.toFixed(2)}, avg away goals: ${leagueAvgAwayGoals.toFixed(2)}`);

    return {
        teams,
        standings,
        leagueAvgHomeGoals,
        leagueAvgAwayGoals,
        leagueTotalHomeMatches,
        leagueTotalAwayMatches,
        source: 'soccerstats'
    };
}

// Parse soccerstats.com league statistics table
// Returns a map of soccerstats league ID -> stats object
export function parseSoccerstatsFromHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const leagueStats = {};

    // Find all table rows - soccerstats uses nested tables, look for rows with league links
    const allLinks = doc.querySelectorAll('a[href*="latest.asp?league="]');

    for (const link of allLinks) {
        try {
            // Extract league identifier from href like "latest.asp?league=england"
            const href = link.getAttribute('href') || '';
            const leagueMatch = href.match(/league=([^&"]+)/);
            if (!leagueMatch) continue;

            const leagueId = leagueMatch[1];

            // Navigate up to the row containing this link
            let row = link.closest('tr');
            if (!row) continue;

            // Get all cells in the row
            const cells = row.querySelectorAll('td');
            if (cells.length < 12) continue;

            // Parse the stats from the row cells
            // The soccerstats table structure (based on the provided HTML):
            // Cell layout varies but typically:
            // [country/league name] [stats link] [progress] [matches] [home%] [draw%] [away%] [gpg] [hg] [ag] [o1.5] [o2.5] [o3.5] [btts]

            // Find numeric cells - we need to locate them by parsing all cell text
            const cellTexts = [];
            for (const cell of cells) {
                cellTexts.push(cell.textContent.trim());
            }

            // Find the cell indices with numeric data
            // Look for the matches played (first pure number > 10 typically)
            let statsStartIndex = -1;
            for (let i = 0; i < cellTexts.length; i++) {
                const val = parseInt(cellTexts[i]);
                if (!isNaN(val) && val > 5 && cellTexts[i].match(/^\d+$/)) {
                    statsStartIndex = i;
                    break;
                }
            }

            if (statsStartIndex === -1) continue;

            // From the stats start, extract values
            const remaining = cellTexts.slice(statsStartIndex);
            if (remaining.length < 10) continue;

            const matches = parseInt(remaining[0]) || 0;
            const homeWinPct = parseFloat(remaining[1]) || 0;
            const drawPct = parseFloat(remaining[2]) || 0;
            const awayWinPct = parseFloat(remaining[3]) || 0;
            const goalsPerGame = parseFloat(remaining[4]) || 0;
            const homeGoals = parseFloat(remaining[5]) || 0;
            const awayGoals = parseFloat(remaining[6]) || 0;
            const over15 = parseFloat(remaining[7]) || 0;
            const over25 = parseFloat(remaining[8]) || 0;
            const over35 = parseFloat(remaining[9]) || 0;
            const btts = remaining.length > 10 ? (parseFloat(remaining[10]) || 0) : 0;

            if (matches === 0) continue;

            leagueStats[leagueId] = {
                leagueId,
                leagueName: link.textContent.trim(),
                matches,
                homeWinPct,
                drawPct,
                awayWinPct,
                goalsPerGame,
                homeGoals,
                awayGoals,
                over15,
                over25,
                over35,
                btts
            };
        } catch (e) {
            console.warn('Error parsing soccerstats row:', e);
        }
    }

    console.log(`Parsed ${Object.keys(leagueStats).length} leagues from soccerstats`);
    return leagueStats;
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
