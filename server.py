#!/usr/bin/env python3
import os
import sys
import argparse
import http.server
import json
import urllib.parse
from functools import partial

LOG_FILE = "/tmp/gemini_integrated_website.log"

class ArcadeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow cross-origin access and caching for local development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        if self.path.startswith("/lotto/api/refresh"):
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")
            self.end_headers()
            return
        super().do_OPTIONS()

    def do_GET(self):
        if self.path.startswith("/lotto/api/refresh"):
            self.handle_lotto_refresh()
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/lotto/api/refresh"):
            self.handle_lotto_refresh()
            return
        super().do_POST()

    def handle_lotto_refresh(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        force = query.get("force", ["0"])[0] == "1"
        client_ip = self.client_address[0] if self.client_address else "127.0.0.1"

        try:
            api_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lotto", "api")
            if api_dir not in sys.path:
                sys.path.insert(0, api_dir)
            import refresh
            result = refresh.refresh_lotto_analysis(force=force, client_ip=client_ip)
            status_code = result.pop("status_code", 200)
        except Exception as e:
            status_code = 500
            result = {"success": False, "error": f"Internal server error: {str(e)}"}

        body = json.dumps(result, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def guess_type(self, path):
        # Ensure proper MIME types for wasm, apk, wheels, and ogg
        if path.endswith(".apk"):
            return "application/vnd.android.package-archive"
        elif path.endswith(".wasm"):
            return "application/wasm"
        elif path.endswith(".whl"):
            return "application/octet-stream"
        elif path.endswith(".ogg"):
            return "audio/ogg"
        elif path.endswith(".tar.gz"):
            return "application/x-tar"
        return super().guess_type(path)

    def log_message(self, format, *args):
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))
        except Exception:
            pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

class QuietThreadingServer(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        exc_type, _, _ = sys.exc_info()
        if exc_type in (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return
        super().handle_error(request, client_address)

def run(port=8000, directory=None):
    if directory is None:
        directory = os.path.dirname(os.path.abspath(__file__))

    handler = partial(ArcadeHTTPRequestHandler, directory=directory)
    server_address = ("0.0.0.0", port)

    with QuietThreadingServer(server_address, handler) as httpd:
        print("=" * 65)
        print(" 🕹️  NumericAgenda Integrated Portal & Labs")
        print("=" * 65)
        print(f" Web Portal URL : http://localhost:{port}/")
        print(f" pyZerk Direct  : http://localhost:{port}/pyzerk/")
        print(f" Lotto Lab      : http://localhost:{port}/lotto/")
        print(f" Serving Root   : {directory}")
        print(f" Server Logs    : {LOG_FILE}")
        print(" Press Ctrl+C to stop.")
        print("=" * 65)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down web server.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HTTP server for Gemini Integrated Website & pyZerk")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--directory", "-d", type=str, default=None, help="Directory to serve")
    args = parser.parse_args()
    run(port=args.port, directory=args.directory)
