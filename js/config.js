// Application configuration
export const CONFIG = {
    BASE_URL: 'https://www.soccer-rating.com',
    ENDPOINTS: {
        // Standard patterns
        leagues: (country) => `/${country}/`,
        homeTeams: (country, league) => `/${country}/${league}/home/`,
        awayTeams: (country, league) => `/${country}/${league}/away/`,
        generalTeams: (country, league) => `/${country}/${league}/`,

        // Data source specific patterns
        countryRanking: () => '/football-country-ranking/',

        // Complete league data structure
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
                "San-Marino": ["SM1"],
                // Americas
                "Brazil": ["BR1", "BR2", "BR3", "BRC", "BRGA"],
                "Mexico": ["MX1"],
                "Argentina": ["AR1", "AR2"],
                "USA": ["US1", "US2", "US3"],
                "Colombia": ["CO1", "CO2"],
                "Ecuador": ["EC1"],
                "Paraguay": ["PY1"],
                "Chile": ["CL1", "CL2"],
                "Uruguay": ["UY1", "UY2"],
                "Costa-Rica": ["CR1"],
                "Bolivia": ["BO1"],
                "Guatemala": ["GT1"],
                "Venezuela": ["VE1"],
                "Peru": ["PE1"],
                "Jamaica": ["JM1"],
                "Canada": ["CA1"],
                // Asia & Oceania
                "Japan": ["JP1", "JP2", "JP3"],
                "South-Korea": ["KR1", "KR2"],
                "China": ["CN1", "CN2", "CN3"],
                "Iran": ["IA1"],
                "Australia": ["AU1", "AU2V", "AU2NSW", "AU2S", "AU2W"],
                "Saudi-Arabia": ["SA1", "SA2"],
                "Thailand": ["TH1"],
                "Qatar": ["QA1", "QA2"],
                "United Arab Emirates": ["AE1"],
                "Indonesia": ["ID1"],
                "Jordan": ["JO1"],
                "Malaysia": ["MY1"],
                "Vietnam": ["VN1"],
                "Kuwait": ["KW1"],
                "Bahrain": ["BH1"],
                "India": ["IN1", "IN2"],
                "Hong Kong": ["HK1"],
                "Singapore": ["SG1"],
                "Bangladesh": ["BD1"],
                // Africa
                "Egypt": ["EG1"],
                "Morocco": ["MA1"],
                "South-Africa": ["ZA1", "ZA2"],
                "Rwanda": ["RW1"]
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
            "SM1": "San Marino Championship",

            // Americas - Brazil
            "BR1": "Brasileirão Série A", "BR2": "Brasileirão Série B", "BR3": "Brasileirão Série C",
            "BRC": "Campeonato Carioca", "BRGA": "Campeonato Gaúcho",

            // Americas - Other
            "MX1": "Liga MX",
            "AR1": "Argentine Primera División", "AR2": "Primera Nacional",
            "US1": "MLS", "US2": "USL Championship", "US3": "USL League One",
            "CO1": "Categoría Primera A", "CO2": "Categoría Primera B",
            "EC1": "Serie A Ecuador",
            "PY1": "División Profesional",
            "CL1": "Primera División Chile", "CL2": "Primera B Chile",
            "UY1": "Primera División Uruguay", "UY2": "Segunda División Uruguay",
            "CR1": "Primera División Costa Rica",
            "BO1": "División Profesional Bolivia",
            "GT1": "Liga Nacional Guatemala",
            "VE1": "Primera División Venezuela",
            "PE1": "Liga 1 Peru",
            "JM1": "Jamaica Premier League",
            "CA1": "Canadian Premier League",

            // Asia & Oceania
            "JP1": "J1 League", "JP2": "J2 League", "JP3": "J3 League",
            "KR1": "K League 1", "KR2": "K League 2",
            "CN1": "Chinese Super League", "CN2": "China League One", "CN3": "China League Two",
            "IA1": "Persian Gulf Pro League",
            "AU1": "A-League", "AU2V": "NPL Victoria", "AU2NSW": "NPL NSW", "AU2S": "NPL South Australia", "AU2W": "NPL Western Australia",
            "SA1": "Saudi Pro League", "SA2": "Saudi First Division",
            "TH1": "Thai League 1",
            "QA1": "Qatar Stars League", "QA2": "Qatari Second Division",
            "AE1": "UAE Pro League",
            "ID1": "Liga 1 Indonesia",
            "JO1": "Jordan Premier League",
            "MY1": "Malaysia Super League",
            "VN1": "V.League 1",
            "KW1": "Kuwait Premier League",
            "BH1": "Bahraini Premier League",
            "IN1": "Indian Super League", "IN2": "I-League",
            "HK1": "Hong Kong Premier League",
            "SG1": "Singapore Premier League",
            "BD1": "Bangladesh Premier League",

            // Africa
            "EG1": "Egyptian Premier League",
            "MA1": "Botola Pro",
            "ZA1": "South African Premier Division", "ZA2": "National First Division",
            "RW1": "Rwanda National Football League"
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

    // Cache and retry settings
    CACHE_DURATION: 3600000, // 1 hour (60 minutes)
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
    { name: "San Marino", rating: "1418.89", flag: "SM" },

    // Americas
    { name: "Brazil", rating: "2280.00", flag: "BR" },
    { name: "Argentina", rating: "2250.00", flag: "AR" },
    { name: "Mexico", rating: "2150.00", flag: "MX" },
    { name: "USA", rating: "2100.00", flag: "US" },
    { name: "Colombia", rating: "2050.00", flag: "CO" },
    { name: "Uruguay", rating: "2030.00", flag: "UY" },
    { name: "Chile", rating: "1980.00", flag: "CL" },
    { name: "Ecuador", rating: "1950.00", flag: "EC" },
    { name: "Paraguay", rating: "1920.00", flag: "PY" },
    { name: "Peru", rating: "1900.00", flag: "PE" },
    { name: "Venezuela", rating: "1850.00", flag: "VE" },
    { name: "Costa-Rica", rating: "1830.00", flag: "CR" },
    { name: "Canada", rating: "1800.00", flag: "CA" },
    { name: "Jamaica", rating: "1750.00", flag: "JM" },
    { name: "Bolivia", rating: "1720.00", flag: "BO" },
    { name: "Guatemala", rating: "1680.00", flag: "GT" },

    // Asia & Oceania
    { name: "Japan", rating: "2080.00", flag: "JP" },
    { name: "South-Korea", rating: "2050.00", flag: "KR" },
    { name: "Iran", rating: "2000.00", flag: "IA" },
    { name: "Australia", rating: "1980.00", flag: "AU" },
    { name: "Saudi-Arabia", rating: "1950.00", flag: "SA" },
    { name: "Qatar", rating: "1920.00", flag: "QA" },
    { name: "China", rating: "1900.00", flag: "CN" },
    { name: "United Arab Emirates", rating: "1880.00", flag: "AE" },
    { name: "Thailand", rating: "1820.00", flag: "TH" },
    { name: "Vietnam", rating: "1780.00", flag: "VN" },
    { name: "Malaysia", rating: "1750.00", flag: "MY" },
    { name: "Indonesia", rating: "1730.00", flag: "ID" },
    { name: "Jordan", rating: "1710.00", flag: "JO" },
    { name: "India", rating: "1700.00", flag: "IN" },
    { name: "Kuwait", rating: "1680.00", flag: "KW" },
    { name: "Bahrain", rating: "1670.00", flag: "BH" },
    { name: "Hong Kong", rating: "1640.00", flag: "HK" },
    { name: "Singapore", rating: "1620.00", flag: "SG" },
    { name: "Bangladesh", rating: "1580.00", flag: "BD" },

    // Africa
    { name: "Egypt", rating: "1950.00", flag: "EG" },
    { name: "Morocco", rating: "1930.00", flag: "MA" },
    { name: "South-Africa", rating: "1850.00", flag: "ZA" },
    { name: "Rwanda", rating: "1720.00", flag: "RW" }
];
