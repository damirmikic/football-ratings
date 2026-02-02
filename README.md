# Global Football League Rankings - Soccer Rating Client

A modular web application for viewing global football league rankings and team ratings from soccer-rating.com. Covers UEFA, CONMEBOL, CONCACAF, AFC, CAF, and OFC confederations.

## Project Structure

```
football-ratings/
├── index.html              # Main HTML entry point
├── css/
│   └── styles.css         # All application styles
├── js/
│   ├── config.js          # Configuration and constants
│   ├── parsers.js         # HTML parsing functions
│   ├── api.js             # Data fetching and CORS handling
│   ├── ui.js              # UI rendering functions
│   └── main.js            # Application initialization and event handlers
└── README.md              # This file
```

## Module Overview

### config.js
- **Purpose**: Configuration and static data
- **Exports**:
  - `CONFIG` - Application configuration (URLs, CORS proxies, league data)
  - `countries` - UEFA country data with ratings

### parsers.js
- **Purpose**: HTML parsing logic
- **Exports**:
  - `parseTeamDataFromHTML()` - Parse team ratings from HTML
  - `parseLeagueDataFromHTML()` - Parse league data from HTML
  - `parseOddsDataFromHTML()` - Parse betting odds from HTML

### api.js
- **Purpose**: Data fetching and caching
- **Exports**:
  - `fetchTeamData()` - Fetch team ratings for a league
  - `fetchLeagueData()` - Fetch leagues for a country
  - `fetchOddsData()` - Fetch betting odds
  - `fetchWithRetry()` - Enhanced fetch with CORS proxy fallback
  - `clearCache()` - Clear all cached data
  - `testConnection()` - Test connection to soccer-rating.com

### ui.js
- **Purpose**: UI rendering and display management
- **Exports**:
  - `showLoading()` / `hideLoading()` - Loading overlay
  - `showError()` / `showInfo()` - Message notifications
  - `createCountriesList()` - Render countries sidebar
  - `createTeamsTable()` - Generate team rating tables
  - `createOddsTable()` - Generate odds tables
  - `showTeamsDisplay()` - Display team ratings view
  - `showTeamsView()` / `showOddsView()` - Tab navigation

### main.js
- **Purpose**: Application initialization and orchestration
- **Responsibilities**:
  - Initialize the application
  - Handle user interactions
  - Coordinate between API and UI modules
  - Manage application state

## Features

- ✅ **Modular Architecture**: Clean separation of concerns
- ✅ **ES6 Modules**: Modern JavaScript module system
- ✅ **CORS Handling**: Multiple proxy fallback options
- ✅ **Smart Caching**: 5-minute cache duration for API calls
- ✅ **Responsive Design**: Mobile-friendly layout
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Live Data**: Real-time data from soccer-rating.com
- ✅ **Global Coverage**: 90+ countries across all confederations

## Global Coverage

### UEFA (Europe) - 51 Countries
England, Germany, Italy, Spain, France, Portugal, Netherlands, Belgium, Turkey, and 42 more...

### CONMEBOL (South America) - 10 Countries
Brazil, Argentina, Uruguay, Colombia, Chile, Ecuador, Paraguay, Peru, Venezuela, Bolivia

### CONCACAF (North/Central America & Caribbean) - 6 Countries
Mexico, USA, Costa Rica, Jamaica, Canada, Guatemala

### AFC (Asia) - 19 Countries
Japan, South Korea, Iran, Australia, Saudi Arabia, China, Qatar, UAE, Thailand, India, and 10 more...

### CAF (Africa) - 4 Countries
Egypt, Morocco, South Africa, Rwanda

### Total: 90+ Countries, 200+ Leagues

## Usage

### Opening the Application

1. **Local Server** (Recommended):
   ```bash
   # Python 3
   python -m http.server 8000

   # Node.js
   npx http-server
   ```
   Then open: http://localhost:8000

2. **Direct File**: Open `index.html` in a modern browser
   - CORS proxy will be automatically enabled

### Navigating the App

1. Browse countries in the left sidebar
2. Click any country to see its leagues
3. Click a league to view team ratings
4. Switch between "Home/Away Ratings" and "Odds" tabs
5. Use "Clear Cache" to refresh data
6. Use "Test Connection" to verify API access

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (requires ES6 modules)

## Configuration

Edit `js/config.js` to modify:
- CORS proxy URLs
- Cache duration
- Retry settings
- League data mappings

## Development

### Adding a New Module

1. Create new `.js` file in `js/` directory
2. Use ES6 export syntax:
   ```javascript
   export function myFunction() { ... }
   ```
3. Import in other modules:
   ```javascript
   import { myFunction } from './myModule.js';
   ```

### Debugging

- Open browser DevTools (F12)
- Check Console for logs
- Network tab shows API requests
- All modules log their activities

## API Reference

### soccer-rating.com Endpoints

- **Country Page**: `/{country}/`
- **League Home**: `/{country}/{leagueCode}/home/`
- **League Away**: `/{country}/{leagueCode}/away/`
- **League General**: `/{country}/{leagueCode}/`

### CORS Proxies Used

1. https://corsproxy.io
2. https://cors-anywhere.herokuapp.com
3. https://api.allorigins.win
4. https://thingproxy.freeboard.io

## License

This project is for educational purposes.

## Credits

Data source: [soccer-rating.com](https://www.soccer-rating.com)
