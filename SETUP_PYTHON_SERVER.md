# Python Backend Server Setup

This document explains how to set up and run the Python backend server to bypass CORS issues.

## Why Use Python Backend?

The Python backend server solves CORS (Cross-Origin Resource Sharing) issues by:
- Fetching data server-side (no CORS restrictions)
- Providing a local API endpoint for the frontend
- Caching responses for better performance
- Using proper headers to avoid being blocked

## Quick Start

### 1. Install Python Dependencies

```powershell
# Install required packages
pip install -r requirements.txt
```

Or install manually:
```powershell
pip install Flask flask-cors requests beautifulsoup4
```

### 2. Start the Server

```powershell
# Run the server
python server.py
```

The server will start on `http://localhost:5000`

You should see:
```
============================================================
Football Ratings Server
============================================================
Server starting on http://localhost:5000
Cache timeout: 3600 seconds
============================================================
```

### 3. Update Frontend to Use Python Backend

Option A: Use the new API file (recommended):
- Update `main.js` to import from `api-python.js` instead of `api.js`
- Change line: `import { fetcher } from './api.js';`
- To: `import { fetcher } from './api-python.js';`

Option B: The app will automatically detect and use the Python server if it's running

### 4. Open the Application

Open your browser and navigate to:
- `http://localhost:5000` (served by Python server)

OR open `index.html` directly and the app will connect to the Python backend API.

## API Endpoints

The Python server provides these endpoints:

### GET /api/fetch
Fetch data from soccer-rating.com
- Query parameter: `url` - the path to fetch (e.g., `/England/` or `/England/odds.htm`)
- Returns: JSON with `{success, data, url}`

Example:
```
http://localhost:5000/api/fetch?url=/England/
```

### GET /api/test
Test if the server is working correctly
- Returns: JSON with success status and test results

### GET /api/status
Get server status and cache statistics
- Returns: JSON with cache hits, misses, size, and timeout info

### GET /api/clear-cache
Clear the server-side cache
- Returns: JSON with success confirmation

## Features

### Caching
- LRU cache with 128 entries
- 1-hour cache timeout
- Automatic cache expiration
- Cache statistics available via `/api/status`

### Error Handling
- Automatic retry with fallback to CORS proxies if Python server is unavailable
- Detailed error logging
- Graceful degradation

### Custom Headers
The server uses realistic browser headers to avoid being blocked:
- User-Agent: Chrome 120
- Accept headers for HTML content
- Proper encoding support

## Troubleshooting

### Server won't start
- Make sure port 5000 is not in use
- Check if all dependencies are installed: `pip list`
- Try running with: `python -m flask run`

### Connection refused
- Verify the server is running: `netstat -an | findstr :5000`
- Check firewall settings
- Try accessing `http://localhost:5000/api/status` in your browser

### No data returned
- Check server logs for error messages
- Test with `/api/test` endpoint
- Clear cache with `/api/clear-cache`

## Development Mode

The server runs in debug mode by default, which:
- Auto-reloads on code changes
- Provides detailed error messages
- Logs all requests

For production, modify `server.py`:
```python
app.run(debug=False, host='0.0.0.0', port=5000)
```

## Advantages Over CORS Proxies

1. **Reliability**: No dependency on third-party proxy services
2. **Speed**: Local caching reduces network requests
3. **Control**: Full control over headers and retry logic
4. **Privacy**: Data doesn't go through external proxies
5. **Debugging**: Easy to debug with server logs

## Notes

- The server caches responses for 1 hour by default
- You can adjust `CACHE_TIMEOUT` in `server.py`
- The server listens on all interfaces (0.0.0.0) by default
- CORS is enabled for all origins (safe for local development)
