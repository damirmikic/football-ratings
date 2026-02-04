"""
Vercel serverless function to fetch soccer-rating.com data
This bypasses CORS issues by fetching data server-side
"""

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests
import json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL and query parameters
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)

        # Get the URL parameter
        url_param = params.get('url', [''])[0]

        if not url_param:
            self.send_error(400, "Missing 'url' parameter")
            return

        # Construct full URL
        if url_param.startswith('http'):
            full_url = url_param
        else:
            # Remove leading slash if present to avoid double slashes
            url_param = url_param.lstrip('/')
            full_url = f"https://www.soccer-rating.com/{url_param}"

        try:
            # Make the request with proper headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }

            response = requests.get(full_url, headers=headers, timeout=10)
            response.raise_for_status()

            # Return success response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

            result = {
                'success': True,
                'data': response.text,
                'url': full_url
            }

            self.wfile.write(json.dumps(result).encode())

        except requests.RequestException as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            result = {
                'success': False,
                'error': str(e),
                'url': full_url
            }

            self.wfile.write(json.dumps(result).encode())

    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
