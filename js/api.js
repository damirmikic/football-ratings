import { CONFIG } from './config.js?v=5';
import { parseTeamDataFromHTML, parseLeagueDataFromHTML, parseOddsDataFromHTML, parseLeagueTableFromHTML, parseSoccerstatsFromHTML, parseSoccerstatsLeagueTableFromHTML } from './parsers.js?v=5';

// Data caching
const dataCache = { leagues: {}, teams: {}, odds: {}, leagueTable: {}, soccerstats: {}, timestamps: {} };

// LocalStorage cache key prefix
const LS_PREFIX = 'fr_cache_';

// Load persisted cache from localStorage on init
function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem(LS_PREFIX + 'data');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.timestamps) {
                // Restore only non-expired entries
                for (const type of ['leagues', 'teams', 'odds', 'leagueTable', 'soccerstats']) {
                    if (parsed[type]) {
                        for (const key of Object.keys(parsed[type])) {
                            const ts = parsed.timestamps[`${type}-${key}`] || parsed.timestamps[key];
                            if (ts && (Date.now() - ts) < CONFIG.CACHE_DURATION) {
                                dataCache[type][key] = parsed[type][key];
                                dataCache.timestamps[`${type}-${key}`] = ts;
                            }
                        }
                    }
                }
                console.log('Restored cache from localStorage');
            }
        }
    } catch (e) {
        console.warn('Failed to load cache from localStorage:', e.message);
    }
}

// Persist current cache to localStorage
function saveToLocalStorage() {
    try {
        const toStore = { leagues: {}, teams: {}, odds: {}, leagueTable: {}, soccerstats: {}, timestamps: {} };
        for (const type of ['leagues', 'teams', 'odds', 'leagueTable', 'soccerstats']) {
            for (const key of Object.keys(dataCache[type])) {
                const tsKey = `${type}-${key}`;
                const ts = dataCache.timestamps[tsKey] || dataCache.timestamps[key];
                if (ts && (Date.now() - ts) < CONFIG.CACHE_DURATION) {
                    toStore[type][key] = dataCache[type][key];
                    toStore.timestamps[tsKey] = ts;
                }
            }
        }
        localStorage.setItem(LS_PREFIX + 'data', JSON.stringify(toStore));
    } catch (e) {
        console.warn('Failed to save cache to localStorage:', e.message);
    }
}

// Initialize cache from localStorage
loadFromLocalStorage();

// Utility functions
export function buildURL(endpoint) {
    return CONFIG.BASE_URL + endpoint;
}

function isCacheValid(cacheKey) {
    const timestamp = dataCache.timestamps[cacheKey];
    return timestamp && (Date.now() - timestamp) < CONFIG.CACHE_DURATION;
}

function setCacheData(cacheKey, data, type) {
    dataCache[type][cacheKey] = data;
    dataCache.timestamps[`${type}-${cacheKey}`] = Date.now();
    dataCache.timestamps[cacheKey] = Date.now();
    saveToLocalStorage();
}

function getCacheData(cacheKey, type) {
    return isCacheValid(cacheKey) ? dataCache[type][cacheKey] : null;
}

// Fetch data using serverless function
// source: 'soccer-rating' (default) or 'soccerstats'
export async function fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES, source = 'soccer-rating') {
    const isLocalMode = CONFIG.isLocalFile() || CONFIG.isLocalhost();

    // Extract the path from the full URL
    let urlPath = url;
    if (url.includes('soccer-rating.com')) {
        urlPath = url.split('soccer-rating.com')[1] || '/';
    } else if (url.includes('soccerstats.com')) {
        urlPath = url.split('soccerstats.com')[1] || '/';
        source = 'soccerstats';
    }

    // Try serverless function (works on Vercel and local Python server)
    const backendEndpoints = [
        '/api/fetch',  // Vercel serverless function
        'http://localhost:5000/api/fetch'  // Local Python server
    ];

    for (const endpoint of backendEndpoints) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Skip localhost endpoint if we're on a remote server
                if (endpoint.includes('localhost') && !isLocalMode) {
                    continue;
                }

                // Use URLSearchParams to avoid double encoding
                const params = new URLSearchParams({ url: urlPath });
                if (source === 'soccerstats') {
                    params.set('source', 'soccerstats');
                }
                const apiUrl = `${endpoint}?${params.toString()}`;
                console.log(`Trying backend API (attempt ${attempt + 1}/${maxRetries}):`, apiUrl);

                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.success) {
                        console.log('✓ Backend API successful:', endpoint);

                        // Return a response-like object
                        return {
                            ok: true,
                            status: 200,
                            text: () => Promise.resolve(data.data)
                        };
                    }
                }

                // If response not OK, check if error is retryable
                if (!response.ok) {
                    let errorData = {};
                    try { errorData = await response.json(); } catch (_) {}
                    // Don't retry on non-retryable errors (e.g. upstream connection failures)
                    if (errorData.retryable === false) {
                        console.warn(`Backend API ${endpoint}: ${errorData.error || response.statusText} (not retryable)`);
                        break;
                    }
                }

                // Retry on retryable errors
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                }

            } catch (error) {
                console.warn(`Backend API ${endpoint} failed (attempt ${attempt + 1}):`, error.message);

                // Retry on error
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                }
            }
        }
    }

    // All methods failed
    throw new Error(`Failed to fetch data from: ${url}`);
}

// Fetch team data for a specific league
export async function fetchTeamData(countryName, leagueName, leagueCode = null) {
    const cacheKey = `${countryName}-${leagueName}-${leagueCode || 'nocode'}`;

    const cachedData = getCacheData(cacheKey, 'teams');
    if (cachedData) {
        console.log('Using cached team data for', cacheKey);
        return cachedData;
    }

    try {
        // Get specific URL patterns for this league, with priority for exact code
        const patterns = CONFIG.ENDPOINTS.getLeaguePatterns(countryName, leagueName, leagueCode);

        let homeTeams = [];
        let awayTeams = [];
        let lastError = null;
        let selectedLeagueUrl = null;

        for (const pattern of patterns) {
            try {
                if (pattern.home && pattern.away) {
                    console.log('Trying home/away pattern:', pattern);
                    selectedLeagueUrl = pattern.general || `/${countryName}/${leagueCode}/`;
                    const homeURL = buildURL(pattern.home);
                    const awayURL = buildURL(pattern.away);

                    const [homeResponse, awayResponse] = await Promise.all([
                        fetchWithRetry(homeURL, 2),
                        fetchWithRetry(awayURL, 2)
                    ]);

                    if (homeResponse.ok && awayResponse.ok) {
                        const homeHTML = await homeResponse.text();
                        const awayHTML = await awayResponse.text();

                        homeTeams = parseTeamDataFromHTML(homeHTML, 'home');
                        awayTeams = parseTeamDataFromHTML(awayHTML, 'away');

                        if (homeTeams.length > 0 || awayTeams.length > 0) {
                            console.log('✓ Successfully fetched team data:', { home: homeTeams.length, away: awayTeams.length });
                            break;
                        }
                    }
                } else if (pattern.general) {
                    console.log('Trying general pattern:', pattern.general);
                    selectedLeagueUrl = pattern.general;
                    const generalURL = buildURL(pattern.general);
                    const response = await fetchWithRetry(generalURL, 2);

                    if (response.ok) {
                        const html = await response.text();
                        const teams = parseTeamDataFromHTML(html, 'general');

                        if (teams.length > 0) {
                            homeTeams = teams;
                            awayTeams = teams;
                            console.log('✓ Successfully fetched general team data:', teams.length);
                            break;
                        }
                    }
                }
            } catch (error) {
                lastError = error;
                console.warn('✗ Pattern failed:', error.message);
            }
        }

        if (homeTeams.length === 0 && awayTeams.length === 0) {
            throw lastError || new Error('No team data found in any URL pattern');
        }

        const teamData = {
            home: homeTeams,
            away: awayTeams,
            leagueUrl: selectedLeagueUrl,
            lastUpdated: new Date().toISOString()
        };

        setCacheData(cacheKey, teamData, 'teams');

        return teamData;

    } catch (error) {
        console.error('Error fetching team data:', error);
        throw error;
    }
}

// Fetch league data for a country
export async function fetchLeagueData(countryName) {
    const cacheKey = countryName;

    const cachedData = getCacheData(cacheKey, 'leagues');
    if (cachedData) {
        console.log('Using cached league data for', countryName);
        return cachedData;
    }

    try {
        // Method 1: Use predefined league data if available
        const countryData = CONFIG.ENDPOINTS.leagueData["Men's"];
        const countryCodes = countryData[countryName];

        if (countryCodes && countryCodes.length > 0) {
            console.log(`Found predefined leagues for ${countryName}:`, countryCodes);

            const leagues = countryCodes.map((code, index) => ({
                rank: index + 1,
                name: CONFIG.ENDPOINTS.leagueNames[code] || code,
                rating: "0.00", // Will be updated if we can fetch actual ratings
                code: code
            }));

            setCacheData(cacheKey, leagues, 'leagues');

            return leagues;
        }

        // Method 2: Try to fetch from actual endpoints
        const endpoints = [
            `/${countryName}/`,
            `/${countryName.toLowerCase()}/`,
            `/${countryName.replace(/\s+/g, '-').toLowerCase()}/`,
            `/${countryName}/leagues/`,
            `/${countryName}/ratings/`
        ];

        let leagues = [];
        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const url = buildURL(endpoint);
                console.log('Trying league endpoint:', url);

                const response = await fetchWithRetry(url, 2);

                if (response.ok) {
                    const html = await response.text();
                    leagues = parseLeagueDataFromHTML(html);

                    if (leagues.length > 0) {
                        console.log(`✓ Successfully fetched ${leagues.length} leagues from:`, endpoint);
                        break;
                    }
                }
            } catch (error) {
                lastError = error;
                console.warn('✗ Endpoint failed:', endpoint, error.message);
            }
        }

        if (leagues.length === 0) {
            throw lastError || new Error('No leagues found in any endpoint');
        }

        setCacheData(cacheKey, leagues, 'leagues');

        return leagues;

    } catch (error) {
        console.error('Error fetching league data:', error);
        throw error;
    }
}

// Fetch odds data for a league
export async function fetchOddsData(leagueUrl) {
    const cacheKey = leagueUrl;

    const cachedData = getCacheData(cacheKey, 'odds');
    if (cachedData) {
        console.log('Using cached odds data for', cacheKey);
        return cachedData;
    }

    try {
        const url = buildURL(leagueUrl);
        const response = await fetchWithRetry(url, 2);

        if (response.ok) {
            const html = await response.text();
            const oddsData = parseOddsDataFromHTML(html);

            setCacheData(cacheKey, oddsData, 'odds');

            return oddsData;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }

    } catch (error) {
        console.error('Error fetching odds data:', error);
        throw error;
    }
}

// Fetch league table data for a league (goal stats for xG calculation)
export async function fetchLeagueTable(countryName, leagueCode) {
    const cacheKey = `table-${countryName}-${leagueCode}`;

    const cachedData = getCacheData(cacheKey, 'leagueTable');
    if (cachedData) {
        console.log('Using cached league table for', cacheKey);
        return cachedData;
    }

    try {
        const url = buildURL(`/${countryName}/${leagueCode}/`);
        console.log('Fetching league table from:', url);
        const response = await fetchWithRetry(url, 2);

        if (response.ok) {
            const html = await response.text();
            const tableData = parseLeagueTableFromHTML(html);

            if (tableData) {
                setCacheData(cacheKey, tableData, 'leagueTable');
                console.log(`League table loaded: ${Object.keys(tableData.teams).length} teams`);
                return tableData;
            }
        }

        console.warn('No league table data found');
        return null;
    } catch (error) {
        console.warn('Error fetching league table:', error.message);
        return null;
    }
}

// Fetch soccerstats league table (home+away tables) for a specific league
// Returns same format as fetchLeagueTable for Poisson/DC model compatibility
export async function fetchSoccerstatsLeagueTable(leagueCode) {
    const cacheKey = `ss-table-${leagueCode}`;

    const cachedData = getCacheData(cacheKey, 'leagueTable');
    if (cachedData) {
        console.log('Using cached soccerstats league table for', cacheKey);
        return cachedData;
    }

    try {
        // Look up the soccerstats league identifier from the soccer-rating code
        const reverseMap = CONFIG.ENDPOINTS.soccerstatsReverseMapping;
        const ssId = reverseMap[leagueCode];
        if (!ssId) {
            console.warn(`No soccerstats mapping for league code: ${leagueCode}`);
            return null;
        }

        const url = CONFIG.SOCCERSTATS_URL + `/latest.asp?league=${ssId}`;
        console.log('Fetching soccerstats league table from:', url);
        const response = await fetchWithRetry(url, 2, 'soccerstats');

        if (response.ok) {
            const html = await response.text();
            const tableData = parseSoccerstatsLeagueTableFromHTML(html);

            if (tableData) {
                setCacheData(cacheKey, tableData, 'leagueTable');
                console.log(`Soccerstats league table loaded: ${Object.keys(tableData.teams).length} teams`);
                return tableData;
            }
        }

        console.warn('No soccerstats league table data found');
        return null;
    } catch (error) {
        console.warn('Error fetching soccerstats league table:', error.message);
        return null;
    }
}

// Fetch soccerstats league statistics
// Returns stats for a specific league code (soccer-rating code), or null if not found
export async function fetchSoccerstatsData(leagueCode) {
    const cacheKey = 'soccerstats-all';

    // Check if we have cached soccerstats data
    const cachedData = getCacheData(cacheKey, 'soccerstats');
    if (cachedData) {
        console.log('Using cached soccerstats data');
        const reverseMap = CONFIG.ENDPOINTS.soccerstatsReverseMapping;
        const ssId = reverseMap[leagueCode];
        if (ssId && cachedData[ssId]) {
            return cachedData[ssId];
        }
        return null;
    }

    try {
        // Fetch the main soccerstats page with all league statistics
        const url = CONFIG.SOCCERSTATS_URL + '/latest.asp';
        console.log('Fetching soccerstats data from:', url);
        const response = await fetchWithRetry(url, 2, 'soccerstats');

        if (response.ok) {
            const html = await response.text();
            const allStats = parseSoccerstatsFromHTML(html);

            if (Object.keys(allStats).length > 0) {
                setCacheData(cacheKey, allStats, 'soccerstats');
                console.log(`Soccerstats: cached ${Object.keys(allStats).length} leagues`);

                // Look up the requested league
                const reverseMap = CONFIG.ENDPOINTS.soccerstatsReverseMapping;
                const ssId = reverseMap[leagueCode];
                if (ssId && allStats[ssId]) {
                    return allStats[ssId];
                }
            }
        }

        return null;
    } catch (error) {
        console.warn('Error fetching soccerstats data:', error.message);
        return null;
    }
}

// Fetch all soccerstats data (returns the full map)
export async function fetchAllSoccerstatsData() {
    const cacheKey = 'soccerstats-all';

    const cachedData = getCacheData(cacheKey, 'soccerstats');
    if (cachedData) {
        console.log('Using cached soccerstats data (all)');
        return cachedData;
    }

    try {
        const url = CONFIG.SOCCERSTATS_URL + '/latest.asp';
        console.log('Fetching all soccerstats data from:', url);
        const response = await fetchWithRetry(url, 2, 'soccerstats');

        if (response.ok) {
            const html = await response.text();
            const allStats = parseSoccerstatsFromHTML(html);

            if (Object.keys(allStats).length > 0) {
                setCacheData(cacheKey, allStats, 'soccerstats');
                return allStats;
            }
        }

        return {};
    } catch (error) {
        console.warn('Error fetching all soccerstats data:', error.message);
        return {};
    }
}

// Clear all cached data
export function clearCache() {
    Object.keys(dataCache.leagues).forEach(key => delete dataCache.leagues[key]);
    Object.keys(dataCache.teams).forEach(key => delete dataCache.teams[key]);
    Object.keys(dataCache.odds).forEach(key => delete dataCache.odds[key]);
    Object.keys(dataCache.leagueTable).forEach(key => delete dataCache.leagueTable[key]);
    Object.keys(dataCache.soccerstats).forEach(key => delete dataCache.soccerstats[key]);
    Object.keys(dataCache.timestamps).forEach(key => delete dataCache.timestamps[key]);

    // Clear localStorage cache
    try {
        localStorage.removeItem(LS_PREFIX + 'data');
    } catch (e) {
        console.warn('Failed to clear localStorage cache:', e.message);
    }

    console.log('Cache cleared (memory + localStorage)');
    return true;
}

// Test connection to data source
export async function testConnection() {
    try {
        const testUrl = buildURL('/England/');
        console.log('Testing connection to:', testUrl);

        const response = await fetchWithRetry(testUrl, 1);

        if (response.ok) {
            const html = await response.text();
            if (html.length > 100) {
                return { success: true, message: '✓ Connection successful! Ready to fetch data.' };
            } else {
                throw new Error('Empty or invalid response');
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        return { success: false, message: `✗ Connection failed: ${error.message}` };
    }
}
