#!/usr/bin/env python3
import os
import sys
import argparse
import http.server
from functools import partial

LOG_FILE = "/tmp/gemini_integrated_website.log"

class ArcadeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow cross-origin access and caching for local development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

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
