import http.server
import socketserver
import os
import urllib.parse
import urllib.request
import mimetypes
import webbrowser
import threading
import sys

PORT = 8000
REMOTE_ORIGIN = "https://pokebonk.com/"

# Ensure all essential mime types
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("audio/ogg", ".ogg")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("application/manifest+json", ".webmanifest")

class PokeBonkHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Parse path and strip query string for local file checking
        parsed = urllib.parse.urlparse(self.path)
        clean_path = urllib.parse.unquote(parsed.path.lstrip("/"))
        if not clean_path or clean_path == "/":
            clean_path = "index.html"
            self.path = "/index.html"

        local_file = os.path.normpath(clean_path)

        # If file exists locally, serve it
        if os.path.exists(local_file) and not os.path.isdir(local_file):
            return super().do_GET()

        # If not found locally, try to fetch and cache from pokebonk.com
        remote_url = urllib.parse.urljoin(REMOTE_ORIGIN, clean_path)
        print(f"[CACHE MISS] Fetching on-demand: {clean_path} from {remote_url}")
        try:
            req = urllib.request.Request(remote_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                content_type = resp.headers.get("Content-Type") or mimetypes.guess_type(clean_path)[0] or "application/octet-stream"

                # Save locally for future offline play
                os.makedirs(os.path.dirname(local_file) or ".", exist_ok=True)
                with open(local_file, "wb") as f:
                    f.write(data)
                print(f"[CACHED] Saved {clean_path} ({len(data)} bytes)")

                # Serve the fetched content
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
        except Exception as e:
            print(f"[FETCH ERROR] Could not retrieve {clean_path}: {e}")

        # Fallback to standard 404
        return super().do_GET()

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), PokeBonkHandler) as httpd:
        print(f"=======================================================")
        print(f"  PokéBonk Local Server running at http://localhost:{PORT}")
        print(f"  All assets served from disk with auto-caching proxy")
        print(f"  Press Ctrl+C to stop.")
        print(f"=======================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    if "--open" in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    start_server()
