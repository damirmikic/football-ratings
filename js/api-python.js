import { CONFIG } from './config.js';
import { parseTeamDataFromHTML, parseLeagueDataFromHTML, parseOddsDataFromHTML } from './parsers.js';

// Python backend server configuration
const PYTHON_SERVER = 'http://localhost:5000';

// Data caching
const dataCache = { leagues: {}, teams: {}, odds: {}, timestamps: {} };

// Utility functions
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

/**
 * Check if Python backend server is available
 */
export async function checkPythonServer() {
    try {
        const response = await fetch(`${PYTHON_SERVER}/api/status`, {
            method: 'GET',
            timeout: 2000
        });
        return response.ok;
    } catch (error) {
        console.warn('Python server not available:', error.message);
        return false;
    }
}

/**
 * Fetch data using Python backend server
 */
async function fetchViaPython(url) {
    try {
        // Remove base URL if present to get relative path
        let relativePath = url;
        if (url.startsWith(CONFIG.BASE_URL)) {
            relativePath = url.substring(CONFIG.BASE_URL.length);
        }
        
        const apiUrl = `${PYTHON_SERVER}/api/fetch?url=${encodeURIComponent(relativePath)}`;
        console.log('Fetching via Python server:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Python server returned ${response.status}`);
        }
        
        const jsonData = await response.json();
        
        if (!jsonData.success) {
            throw new Error(jsonData.error || 'Python server fetch failed');
        }
        
        // Return response-like object for compatibility
        return {
            ok: true,
            status: 200,
            text: () => Promise.resolve(jsonData.data)
        };
    } catch (error) {
        console.error('Python fetch error:', error);
        throw error;
    }
}

/**
 * Main fetch function - tries Python server first, falls back to CORS proxies
 */
export async function fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES) {
    // Try Python server first
    try {
        const isPythonAvailable = await checkPythonServer();
        if (isPythonAvailable) {
            console.log('Using Python backend server');
            return await fetchViaPython(url);
        }
    } catch (error) {
        console.warn('Python server fetch failed, falling back to CORS proxies:', error.message);
    }
    
    // Fallback to original CORS proxy method
    const corsEnabled = document.getElementById('corsProxyCheckbox')?.checked ?? true;
    const isLocalMode = CONFIG.isLocalFile() || CONFIG.isLocalhost();

    // For local files, always use CORS proxy
    if (isLocalMode && !corsEnabled) {
        if (document.getElementById('corsProxyCheckbox')) {
            document.getElementById('corsProxyCheckbox').checked = true;
        }
        console.log('Local file detected - auto-enabling CORS proxy');
    }

    // Try direct request first if not in local mode
    if (!isLocalMode && !corsEnabled) {
        try {
            console.log('Attempting direct request:', url);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                mode: 'cors'
            });

            if (response.ok) {
                console.log('✓ Direct request successful');
                return response;
            }
        } catch (error) {
            console.warn('Direct request failed, trying CORS proxies:', error.message);
        }
    }

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

                    console.log(`✓ Proxy ${proxyIndex + 1} successful:`, proxyBase);

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

    // All methods failed
    throw new Error(`All fetch methods failed for URL: ${originalUrl}. Please start Python server with: python server.py`);
}

export function buildURL(endpoint) {
    return CONFIG.BASE_URL + endpoint;
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
                console.warn('Pattern failed:', pattern, error.message);
                lastError = error;
            }
        }

        if (homeTeams.length === 0 && awayTeams.length === 0) {
            throw lastError || new Error('No team data found for any pattern');
        }

        const result = {
            home: homeTeams,
            away: awayTeams,
            leagueUrl: selectedLeagueUrl
        };

        setCacheData(cacheKey, result, 'teams');
        return result;

    } catch (error) {
        console.error('Error fetching team data:', error);
        throw error;
    }
}

// Fetch odds data for a specific league
export async function fetchOddsData(leagueUrl) {
    if (!leagueUrl) {
        throw new Error('League URL is required');
    }

    const cacheKey = `odds-${leagueUrl}`;
    const cachedData = getCacheData(cacheKey, 'odds');
    if (cachedData) {
        console.log('Using cached odds data for', cacheKey);
        return cachedData;
    }

    try {
        // Odds are on the main league page, not on a separate odds.htm page
        const oddsURL = buildURL(leagueUrl);
        console.log('Fetching odds from:', oddsURL);

        const response = await fetchWithRetry(oddsURL, 2);

        if (response.ok) {
            const html = await response.text();
            const oddsData = parseOddsDataFromHTML(html);

            if (oddsData.length > 0) {
                console.log('✓ Successfully fetched odds data:', oddsData.length, 'matches');
                setCacheData(cacheKey, oddsData, 'odds');
                return oddsData;
            } else {
                console.warn('No odds data found in HTML');
            }
        }

        return [];

    } catch (error) {
        console.error('Error fetching odds data:', error);
        throw error;
    }
}

// Test connection
export async function testConnection() {
    try {
        // Check Python server first
        const isPythonAvailable = await checkPythonServer();
        if (isPythonAvailable) {
            const testResponse = await fetch(`${PYTHON_SERVER}/api/test`);
            const testData = await testResponse.json();
            
            if (testData.success) {
                return {
                    success: true,
                    message: 'Python backend server is working',
                    method: 'Python Server',
                    details: testData
                };
            }
        }
        
        // Fallback to CORS proxy test
        const testURL = buildURL('/England/');
        const response = await fetchWithRetry(testURL, 1);
        
        if (response.ok) {
            const html = await response.text();
            return {
                success: true,
                message: 'Connection successful using CORS proxy',
                method: 'CORS Proxy',
                contentLength: html.length
            };
        }
        
        throw new Error('Connection test failed');
    } catch (error) {
        return {
            success: false,
            message: error.message,
            suggestion: 'Please start Python server: python server.py'
        };
    }
}

// Clear cache
export function clearCache() {
    Object.keys(dataCache).forEach(key => {
        if (typeof dataCache[key] === 'object') {
            Object.keys(dataCache[key]).forEach(subKey => {
                delete dataCache[key][subKey];
            });
        }
    });
    console.log('Cache cleared');
}

// Exported fetcher object for backward compatibility
export const fetcher = {
    fetchTeamData,
    fetchOddsData,
    testConnection,
    clearCache,
    checkPythonServer
};
