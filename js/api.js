import { CONFIG } from './config.js';
import { parseTeamDataFromHTML, parseLeagueDataFromHTML, parseOddsDataFromHTML } from './parsers.js';

// Data caching
const dataCache = { leagues: {}, teams: {}, odds: {}, timestamps: {} };

// Utility functions
export function buildURL(endpoint) {
    const url = CONFIG.BASE_URL + endpoint;
    const corsEnabled = document.getElementById('corsProxyCheckbox').checked;
    return corsEnabled ? CONFIG.CORS_PROXY + encodeURIComponent(url) : url;
}

function isCacheValid(cacheKey) {
    const timestamp = dataCache.timestamps[cacheKey];
    return timestamp && (Date.now() - timestamp) < CONFIG.CACHE_DURATION;
}

function setCacheData(cacheKey, data, type) {
    dataCache[type][cacheKey] = data;
    dataCache.timestamps[cacheKey] = Date.now();
}

function getCacheData(cacheKey, type) {
    return isCacheValid(cacheKey) ? dataCache[type][cacheKey] : null;
}

// Enhanced fetch with serverless function and fallback to CORS proxies
export async function fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES) {
    const corsEnabled = document.getElementById('corsProxyCheckbox')?.checked || false;
    const isLocalMode = CONFIG.isLocalFile() || CONFIG.isLocalhost();

    // Extract the path from the full URL
    let urlPath = url;
    if (url.includes('soccer-rating.com')) {
        urlPath = url.split('soccer-rating.com')[1] || '/';
    }

    // Try serverless function first (works on Vercel and local Python server)
    const backendEndpoints = [
        '/api/fetch',  // Vercel serverless function
        'http://localhost:5000/api/fetch'  // Local Python server
    ];

    for (const endpoint of backendEndpoints) {
        try {
            // Skip localhost endpoint if we're on a remote server
            if (endpoint.includes('localhost') && !isLocalMode) {
                continue;
            }

            // Use URLSearchParams to avoid double encoding
            const params = new URLSearchParams({ url: urlPath });
            const apiUrl = `${endpoint}?${params.toString()}`;
            console.log('Trying backend API:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    console.log(' Backend API successful:', endpoint);

                    // Return a response-like object
                    return {
                        ok: true,
                        status: 200,
                        text: () => Promise.resolve(data.data)
                    };
                }
            }
        } catch (error) {
            console.warn(`Backend API ${endpoint} failed:`, error.message);
        }
    }

    // Fallback to CORS proxies if backend fails and CORS is enabled
    if (corsEnabled) {
        console.log('Backend APIs failed, trying CORS proxies...');

        // Extract original URL if it's already proxied
        let originalUrl = url;
        for (const proxyBase of CONFIG.CORS_PROXIES) {
            if (url.includes(proxyBase)) {
                try {
                    originalUrl = decodeURIComponent(url.split(proxyBase)[1]);
                    break;
                } catch (e) {
                    console.warn('Error extracting URL from proxy:', e);
                }
            }
        }

        // Try each CORS proxy
        for (let proxyIndex = 0; proxyIndex < CONFIG.CORS_PROXIES.length; proxyIndex++) {
            const proxyBase = CONFIG.CORS_PROXIES[proxyIndex];

            for (let attempt = 0; attempt < Math.min(maxRetries, 2); attempt++) {
                try {
                    let proxyUrl;

                    // Different proxy URL formats
                    if (proxyBase.includes('allorigins.win')) {
                        proxyUrl = proxyBase + encodeURIComponent(originalUrl);
                    } else if (proxyBase.includes('corsproxy.io')) {
                        proxyUrl = proxyBase + encodeURIComponent(originalUrl);
                    } else if (proxyBase.includes('cors-anywhere')) {
                        proxyUrl = proxyBase + originalUrl;
                    } else if (proxyBase.includes('thingproxy')) {
                        proxyUrl = proxyBase + originalUrl;
                    } else {
                        proxyUrl = proxyBase + encodeURIComponent(originalUrl);
                    }

                    console.log(`Trying proxy ${proxyIndex + 1}/${CONFIG.CORS_PROXIES.length}, attempt ${attempt + 1}:`, proxyUrl);

                    const response = await fetch(proxyUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': proxyBase.includes('allorigins.win') ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    if (response.ok) {
                        let responseData;

                        if (proxyBase.includes('allorigins.win')) {
                            const data = await response.json();
                            responseData = {
                                ok: true,
                                status: 200,
                                text: () => Promise.resolve(data.contents || data.data || '')
                            };
                        } else {
                            responseData = response;
                        }

                        console.log(` Proxy ${proxyIndex + 1} successful:`, proxyBase);

                        // Update CONFIG to use successful proxy for future requests
                        CONFIG.CORS_PROXY = proxyBase;

                        return responseData;
                    }

                } catch (error) {
                    console.warn(`Proxy ${proxyIndex + 1} attempt ${attempt + 1} failed:`, error.message);

                    if (attempt < Math.min(maxRetries, 2) - 1) {
                        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                    }
                }
            }
        }
    }

    // All methods failed
    throw new Error(`All fetching methods failed for URL: ${url}. Try enabling CORS proxy mode in settings.`);
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
                            console.log(' Successfully fetched team data:', { home: homeTeams.length, away: awayTeams.length });
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
                            console.log(' Successfully fetched general team data:', teams.length);
                            break;
                        }
                    }
                }
            } catch (error) {
                lastError = error;
                console.warn(' Pattern failed:', error.message);
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
                        console.log(` Successfully fetched ${leagues.length} leagues from:`, endpoint);
                        break;
                    }
                }
            } catch (error) {
                lastError = error;
                console.warn(' Endpoint failed:', endpoint, error.message);
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

// Clear all cached data
export function clearCache() {
    Object.keys(dataCache.leagues).forEach(key => delete dataCache.leagues[key]);
    Object.keys(dataCache.teams).forEach(key => delete dataCache.teams[key]);
    Object.keys(dataCache.odds).forEach(key => delete dataCache.odds[key]);
    Object.keys(dataCache.timestamps).forEach(key => delete dataCache.timestamps[key]);

    console.log('Cache cleared');
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
                return { success: true, message: ' Connection successful! Ready to fetch data.' };
            } else {
                throw new Error('Empty or invalid response');
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        return { success: false, message: ` Connection failed: ${error.message}` };
    }
}
