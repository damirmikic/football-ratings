// Configuration specifically for soccer-rating.com
export const CONFIG = {
    BASE_URL: 'https://www.soccer-rating.com',
    ENDPOINTS: {
        // Standard patterns
        leagues: (country) => `/${country}/`,
        homeTeams: (country, league) => `/${country}/${league}/home/`,
        awayTeams: (country, league) => `/${country}/${league}/away/`,
        generalTeams: (country, league) => `/${country}/${league}/`,

        // Soccer-rating.com specific patterns
        countryRanking: () => '/football-country-ranking/',

        // Complete league data structure from soccer-rating.com
        leagueData: {
            "Men's": {
                "England": ["UK1", "UK2", "UK3", "UK4", "UK5", "UK6N", "UK6S"],
                "Germany": ["DE1", "DE2", "DE3", "DE4SW", "DE4W", "DE4N", "DE4NO", "DE4B"],
                "Italy": ["IT1", "IT2", "IT3C", "IT3B", "IT3A"],
                "Spain": ["ES1", "ES2"],
                "France": ["FR1", "FR2", "FR3"],
                "Sweden": ["SW1", "SW2", "SW3S", "SW3N"],
                "Netherlands": ["NL1", "NL2", "NL3"],
                "Russia": ["RU1", "RU2"],
                "Portugal": ["PT1", "PT2"],
                "Austria": ["AT1", "AT2", "AT3O", "AT3M", "AT3W"],
                "Denmark": ["DK1", "DK2", "DK3"],
                "Greece": ["GR1"],
                "Norway": ["NO1", "NO2", "NO3G1", "NO3G2"],
                "Czech Republic": ["CZ1", "CZ2"],
                "Turkey": ["TU1", "TU2", "TU3B", "TU3K"],
                "Belgium": ["BE1", "BE2"],
                "Scotland": ["SC1", "SC2", "SC3", "SC4"],
                "Switzerland": ["CH1", "CH2"],
                "Finland": ["FI1", "FI2", "FI3"],
                "Ukraine": ["UA1", "UA2"],
                "Romania": ["RO1", "RO2"],
                "Poland": ["PL1", "PL2", "PL3"],
                "Croatia": ["HR1", "HR2"],
                "Belarus": ["BY1"],
                "Israel": ["IL1"],
                "Iceland": ["IS1", "IS2", "IS3"],
                "Cyprus": ["CY1", "CY2"],
                "Serbia": ["CS1", "CS2"],
                "Bulgaria": ["BG1", "BG2"],
                "Slovakia": ["SK1", "SK2"],
                "Hungary": ["HU1", "HU2"],
                "Kazakhstan": ["KZ1"],
                "Bosnia-Herzegovina": ["BA1"],
                "Slovenia": ["SI1"],
                "Azerbaijan": ["AZ1"],
                "Ireland": ["IR1", "IR2"],
                "Latvia": ["LA1", "LA2"],
                "Georgia": ["GE1", "GE2"],
                "Albania": ["AL1"],
                "Lithuania": ["LT1", "LT2"],
                "North-Macedonia": ["MK1"],
                "Armenia": ["AM1"],
                "Estonia": ["EE1"],
                "Northern-Ireland": ["NI1", "NI2"],
                "Wales": ["WL1"],
                "Montenegro": ["MN1"],
                "Moldova": ["MD1"],
                "Färöer": ["FA1"],
                "Gibraltar": ["GI1"],
                "Andorra": ["AD1"],
                "San-Marino": ["SM1"]
            },
            "Women's": {
                "England-Women": ["UW1", "UW2"],
                "Spain-Women": ["EW1", "EW2"],
                "Germany-Women": ["GW1", "GW2"],
                "Brazil-Women": ["FB1"],
                "France-Women": ["FF1"],
                "Italy-Women": ["IF1"],
                "Sweden-Women": ["SX1", "SX2"],
                "Norway-Women": ["NW1", "NW2"],
                "Iceland-Women": ["IW1"],
                "Scotland-Women": ["SP1"],
                "Netherlands-Women": ["NV1"],
                "Japan-Women": ["JW1", "JW2"],
                "Finland-Women": ["FW1"],
                "Mexico-Women": ["MF1"],
                "Czech-Republic-Women": ["LZ1"],
                "USA-Women": ["UV1", "UV2"],
                "Australia-Women": ["AW1"],
                "South-Korea-Women": ["KX1"]
            }
        },

        // League code to name mapping
        leagueNames: {
            // England
            "UK1": "Premier League", "UK2": "Championship", "UK3": "League One",
            "UK4": "League Two", "UK5": "National League", "UK6N": "National League North",
            "UK6S": "National League South",

            // Germany
            "DE1": "Bundesliga", "DE2": "2. Bundesliga", "DE3": "3. Liga",
            "DE4SW": "Regionalliga Southwest", "DE4W": "Regionalliga West",
            "DE4N": "Regionalliga Nord", "DE4NO": "Regionalliga Nordost", "DE4B": "Regionalliga Bayern",

            // Spain
            "ES1": "La Liga", "ES2": "La Liga 2",

            // Italy
            "IT1": "Serie A", "IT2": "Serie B", "IT3A": "Serie C - Group A",
            "IT3B": "Serie C - Group B", "IT3C": "Serie C - Group C",

            // France
            "FR1": "Ligue 1", "FR2": "Ligue 2", "FR3": "National",

            // Other major leagues
            "NL1": "Eredivisie", "NL2": "Eerste Divisie", "NL3": "Tweede Divisie",
            "PT1": "Primeira Liga", "PT2": "Liga Portugal 2",
            "BE1": "Belgian Pro League", "BE2": "Challenger Pro League",
            "CH1": "Swiss Super League", "CH2": "Swiss Challenge League",
            "AT1": "Austrian Bundesliga", "AT2": "2. Liga Austria",
            "DK1": "Danish Superliga", "DK2": "1st Division", "DK3": "2nd Division",
            "NO1": "Eliteserien", "NO2": "1. Division", "NO3G1": "2. Division Group 1", "NO3G2": "2. Division Group 2",
            "SW1": "Allsvenskan", "SW2": "Superettan", "SW3S": "Ettan South", "SW3N": "Ettan North",
            "FI1": "Veikkausliiga", "FI2": "Ykkönen", "FI3": "Kakkonen",
            "CZ1": "Czech First League", "CZ2": "Czech National Football League",
            "PL1": "Ekstraklasa", "PL2": "I Liga", "PL3": "II Liga",
            "TU1": "Süper Lig", "TU2": "TFF First League", "TU3B": "TFF Second League Group B", "TU3K": "TFF Second League Group K",
            "HR1": "1. HNL", "HR2": "2. HNL",
            "RU1": "Russian Premier League", "RU2": "FNL",
            "SC1": "Scottish Premiership", "SC2": "Scottish Championship", "SC3": "Scottish League One", "SC4": "Scottish League Two",
            "GR1": "Super League Greece",
            "UA1": "Ukrainian Premier League", "UA2": "Ukrainian First League",
            "RO1": "Liga I", "RO2": "Liga II",
            "CS1": "Serbian SuperLiga", "CS2": "Serbian First League",
            "BG1": "First Professional Football League", "BG2": "Second Professional Football League",
            "SK1": "Slovak Super Liga", "SK2": "2. Liga Slovakia",
            "HU1": "Hungarian NB I", "HU2": "Hungarian NB II",
            "IL1": "Israeli Premier League",
            "CY1": "Cypriot First Division", "CY2": "Cypriot Second Division",
            "IS1": "Úrvalsdeild", "IS2": "1. deild karla", "IS3": "2. deild karla",
            "IR1": "League of Ireland Premier Division", "IR2": "League of Ireland First Division",
            "WL1": "Cymru Premier",
            "BY1": "Belarusian Premier League",
            "KZ1": "Kazakhstan Premier League",
            "BA1": "Bosnian Premier League",
            "SI1": "Slovenian PrvaLiga",
            "AZ1": "Azerbaijan Premier League",
            "LA1": "Latvian Higher League", "LA2": "Latvian First League",
            "GE1": "Georgian Erovnuli Liga", "GE2": "Georgian Liga 2",
            "AL1": "Albanian Superliga",
            "LT1": "A Lyga", "LT2": "1 Lyga",
            "MK1": "Macedonian First League",
            "AM1": "Armenian Premier League",
            "EE1": "Estonian Meistriliiga",
            "NI1": "NIFL Premiership", "NI2": "NIFL Championship",
            "MN1": "Montenegrin First League",
            "MD1": "Moldovan Super Liga",
            "FA1": "Faroese Premier League",
            "GI1": "Gibraltar National League",
            "AD1": "Andorran First Division",
            "SM1": "San Marino Championship"
        },

        // Get URL patterns for a specific country and league
        getLeaguePatterns: (country, league, leagueCode = null) => {
            const patterns = [];
            const countryData = CONFIG.ENDPOINTS.leagueData["Men's"];

            // Find league codes for this country
            const countryCodes = countryData[country] || [];

            // Priority 1: Use exact league code if provided
            if (leagueCode && countryCodes.includes(leagueCode)) {
                patterns.push(
                    { home: `/${country}/${leagueCode}/home/`, away: `/${country}/${leagueCode}/away/` },
                    { general: `/${country}/${leagueCode}/` }
                );
                console.log(`Using exact league code ${leagueCode} for ${country}`);
                return patterns; // Return early with exact match
            }

            // Priority 2: Try to match league name to code
            let targetCode = null;
            for (const [code, name] of Object.entries(CONFIG.ENDPOINTS.leagueNames)) {
                if (name === league || league.includes(name) || name.includes(league)) {
                    if (countryCodes.includes(code)) {
                        targetCode = code;
                        break;
                    }
                }
            }

            // If we found a specific code, use it
            if (targetCode) {
                patterns.push(
                    { home: `/${country}/${targetCode}/home/`, away: `/${country}/${targetCode}/away/` },
                    { general: `/${country}/${targetCode}/` }
                );
            }

            // Priority 3: Try all codes for this country
            for (const code of countryCodes) {
                if (code !== targetCode) { // Avoid duplicates
                    patterns.push(
                        { home: `/${country}/${code}/home/`, away: `/${country}/${code}/away/` },
                        { general: `/${country}/${code}/` }
                    );
                }
            }

            // Priority 4: Generic fallback patterns
            const countryLower = country.toLowerCase();
            const leagueLower = league.toLowerCase();
            patterns.push(
                { home: `/${country}/${league}/home/`, away: `/${country}/${league}/away/` },
                { home: `/${countryLower}/${leagueLower}/home/`, away: `/${countryLower}/${leagueLower}/away/` },
                { general: `/${country}/${league}/` },
                { general: `/${countryLower}/${leagueLower}/` }
            );

            return patterns;
        }
    },

    // Multiple CORS proxy options
    CORS_PROXIES: [
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.allorigins.win/get?url=',
        'https://thingproxy.freeboard.io/fetch/'
    ],

    // Current proxy settings
    CORS_PROXY: 'https://corsproxy.io/?',
    USE_CORS_PROXY: true,
    CACHE_DURATION: 300000, // 5 minutes
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,

    // Local development detection
    isLocalFile: () => window.location.protocol === 'file:',
    isLocalhost: () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
};

// UEFA Country data
export const countries = [
    { name: "England", rating: "2459.89", flag: "UK" },
    { name: "Germany", rating: "2365.54", flag: "DE" },
    { name: "Italy", rating: "2349.30", flag: "IT" },
    { name: "Spain", rating: "2309.66", flag: "ES" },
    { name: "France", rating: "2238.96", flag: "FR" },
    { name: "Turkey", rating: "2191.08", flag: "TU" },
    { name: "Portugal", rating: "2189.39", flag: "PT" },
    { name: "Netherlands", rating: "2125.61", flag: "NL" },
    { name: "Greece", rating: "2120.38", flag: "GR" },
    { name: "Denmark", rating: "2120.32", flag: "DK" },
    { name: "Belgium", rating: "2104.26", flag: "BE" },
    { name: "Sweden", rating: "2099.48", flag: "SW" },
    { name: "Russia", rating: "2094.53", flag: "RU" },
    { name: "Czech Republic", rating: "2049.79", flag: "CZ" },
    { name: "Austria", rating: "2047.78", flag: "AT" },
    { name: "Switzerland", rating: "2033.60", flag: "CH" },
    { name: "Scotland", rating: "2010.67", flag: "SC" },
    { name: "Poland", rating: "1998.12", flag: "PL" },
    { name: "Cyprus", rating: "1992.01", flag: "CY" },
    { name: "Croatia", rating: "1988.83", flag: "HR" },
    { name: "Bulgaria", rating: "1975.45", flag: "BG" },
    { name: "Romania", rating: "1968.78", flag: "RO" },
    { name: "Israel", rating: "1958.26", flag: "IL" },
    { name: "Ukraine", rating: "1949.29", flag: "UA" },
    { name: "Hungary", rating: "1948.41", flag: "HU" },
    { name: "Finland", rating: "1948.26", flag: "FI" },
    { name: "Slovakia", rating: "1911.52", flag: "SK" },
    { name: "Kazakhstan", rating: "1909.27", flag: "KZ" },
    { name: "Serbia", rating: "1896.24", flag: "CS" },
    { name: "Norway", rating: "1880.76", flag: "NO" },
    { name: "Azerbaijan", rating: "1866.38", flag: "AZ" },
    { name: "Iceland", rating: "1863.54", flag: "IS" },
    { name: "Slovenia", rating: "1860.15", flag: "SI" },
    { name: "Bosnia-Herzegovina", rating: "1858.71", flag: "BA" },
    { name: "Ireland", rating: "1825.98", flag: "IR" },
    { name: "Georgia", rating: "1808.88", flag: "GE" },
    { name: "Armenia", rating: "1774.38", flag: "AM" },
    { name: "Albania", rating: "1767.88", flag: "AL" },
    { name: "North Macedonia", rating: "1748.48", flag: "MK" },
    { name: "Kosovo", rating: "1728.28", flag: "XK" },
    { name: "Malta", rating: "1712.19", flag: "MT" },
    { name: "Latvia", rating: "1708.61", flag: "LA" },
    { name: "Moldova", rating: "1680.54", flag: "MD" },
    { name: "Northern Ireland", rating: "1680.43", flag: "NI" },
    { name: "Luxembourg", rating: "1678.84", flag: "LU" },
    { name: "Wales", rating: "1672.78", flag: "WL" },
    { name: "Färöer", rating: "1638.41", flag: "FA" },
    { name: "Montenegro", rating: "1633.37", flag: "MN" },
    { name: "Andorra", rating: "1518.14", flag: "AD" },
    { name: "Gibraltar", rating: "1433.02", flag: "GI" },
    { name: "San Marino", rating: "1418.89", flag: "SM" }
];
