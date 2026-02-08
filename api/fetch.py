"""
Vercel serverless function to fetch soccer-rating.com data
This bypasses CORS issues by fetching data server-side
"""

from http.server import BaseHTTPRequestHandler
import requests
import json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Get the URL parameter from query string
            # The path is like: /api/fetch?url=/England/
            if '?' not in self.path:
                self._send_error(400, "Missing 'url' parameter")
                return

            query_string = self.path.split('?', 1)[1]
            # Parse url parameter manually to avoid issues
            url_param = None
            for param in query_string.split('&'):
                if param.startswith('url='):
                    url_param = param[4:]  # Remove 'url='
                    break

            if not url_param:
                self._send_error(400, "Missing 'url' parameter")
                return

            # Parse source parameter
            source_param = None
            for param in query_string.split('&'):
                if param.startswith('source='):
                    source_param = param[7:]
                    break

            # URL decode the parameter
            from urllib.parse import unquote, urlparse
            url_param = unquote(url_param)

            # Allowed hosts for proxying
            allowed_hosts = ["www.soccer-rating.com", "www.soccerstats.com"]

            # Construct full URL
            if url_param.startswith('http'):
                parsed = urlparse(url_param)
                if parsed.hostname not in allowed_hosts:
                    self._send_error(403, f'Host not allowed: {parsed.hostname}')
                    return
                full_url = url_param
            else:
                # Remove leading slash if present to avoid double slashes
                url_param = url_param.lstrip('/')
                if source_param == 'soccerstats':
                    full_url = f"https://www.soccerstats.com/{url_param}"
                else:
                    full_url = f"https://www.soccer-rating.com/{url_param}"

            # Make the request with proper headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
            }

            response = requests.get(full_url, headers=headers, timeout=10)
            response.raise_for_status()

            # Return success response
            self._send_json(200, {
                'success': True,
                'data': response.text,
                'url': full_url
            })

        except requests.ConnectionError as e:
            self._send_json(502, {
                'success': False,
                'error': f'Could not connect to upstream source',
                'url': full_url if 'full_url' in locals() else 'unknown',
                'retryable': False
            })
        except requests.Timeout as e:
            self._send_json(504, {
                'success': False,
                'error': 'Request to upstream source timed out',
                'url': full_url if 'full_url' in locals() else 'unknown',
                'retryable': True
            })
        except requests.RequestException as e:
            self._send_json(500, {
                'success': False,
                'error': str(e),
                'url': full_url if 'full_url' in locals() else 'unknown',
                'retryable': False
            })
        except Exception as e:
            self._send_json(500, {
                'success': False,
                'error': f"Server error: {str(e)}",
                'url': 'unknown'
            })

    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _send_json(self, status_code, data):
        """Helper to send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _send_error(self, status_code, message):
        """Helper to send error response"""
        self._send_json(status_code, {
            'success': False,
            'error': message
        })
