"""
Flask server to fetch soccer-rating.com data and serve it via local API
This bypasses CORS issues by fetching data server-side
"""

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import time
from functools import lru_cache
import logging

app = Flask(__name__, static_folder='.')
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Base URLs for data sources
BASE_URL = "https://www.soccer-rating.com"
SOCCERSTATS_URL = "https://www.soccerstats.com"

# Allowed target hosts for proxying
ALLOWED_HOSTS = ["www.soccer-rating.com", "www.soccerstats.com"]

# Cache settings
CACHE_TIMEOUT = 3600  # 1 hour in seconds

# Session with custom headers to avoid blocking
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
})


@lru_cache(maxsize=128)
def fetch_url(url, cache_key):
    """
    Fetch URL with caching
    cache_key includes timestamp to enable cache expiration
    """
    try:
        logger.info(f"Fetching: {url}")
        response = session.get(url, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        logger.error(f"Error fetching {url}: {str(e)}")
        raise


def get_cache_key():
    """Generate cache key based on current time and cache timeout"""
    return int(time.time() / CACHE_TIMEOUT)


@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, etc.)"""
    return send_from_directory('.', path)


@app.route('/api/fetch')
def api_fetch():
    """
    Fetch data from soccer-rating.com
    Query parameters:
    - url: The path to fetch (e.g., /England/ or /England/odds.htm)
    """
    from flask import request
    
    url_path = request.args.get('url', '/')
    source = request.args.get('source', 'soccer-rating')

    # Construct full URL based on source
    if url_path.startswith('http'):
        # Validate that the URL is for an allowed host
        from urllib.parse import urlparse
        parsed = urlparse(url_path)
        if parsed.hostname not in ALLOWED_HOSTS:
            return jsonify({
                'success': False,
                'error': f'Host not allowed: {parsed.hostname}'
            }), 403
        full_url = url_path
    else:
        # Remove leading slash if present to avoid double slashes
        url_path = url_path.lstrip('/')
        if source == 'soccerstats':
            full_url = f"{SOCCERSTATS_URL}/{url_path}"
        else:
            full_url = f"{BASE_URL}/{url_path}"
    
    try:
        # Use cache key to enable expiration
        cache_key = get_cache_key()
        html_content = fetch_url(full_url, cache_key)
        
        return jsonify({
            'success': True,
            'data': html_content,
            'url': full_url
        })
    except requests.RequestException as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'url': full_url
        }), 500


@app.route('/api/test')
def api_test():
    """Test endpoint to verify server is working"""
    try:
        test_url = f"{BASE_URL}/England/"
        cache_key = get_cache_key()
        html_content = fetch_url(test_url, cache_key)
        
        # Parse to verify we got valid data
        soup = BeautifulSoup(html_content, 'html.parser')
        has_table = soup.find('table') is not None
        
        return jsonify({
            'success': True,
            'message': 'Server is working correctly',
            'test_url': test_url,
            'has_table': has_table,
            'content_length': len(html_content)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/clear-cache')
def clear_cache():
    """Clear the LRU cache"""
    fetch_url.cache_clear()
    return jsonify({
        'success': True,
        'message': 'Cache cleared'
    })


@app.route('/api/status')
def status():
    """Get server status and cache info"""
    cache_info = fetch_url.cache_info()
    return jsonify({
        'status': 'running',
        'cache': {
            'hits': cache_info.hits,
            'misses': cache_info.misses,
            'size': cache_info.currsize,
            'maxsize': cache_info.maxsize
        },
        'cache_timeout_seconds': CACHE_TIMEOUT
    })


if __name__ == '__main__':
    print("=" * 60)
    print("Football Ratings Server")
    print("=" * 60)
    print(f"Server starting on http://localhost:5000")
    print(f"Cache timeout: {CACHE_TIMEOUT} seconds")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
