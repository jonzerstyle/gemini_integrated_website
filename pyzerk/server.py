#!/usr/bin/env python3
import os
import sys
import argparse
import http.server
from functools import partial

LOG_FILE = "/tmp/pyzerk_server.log"

class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Redirect request logs to a dedicated log file to keep the terminal clean
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))
        except Exception:
            pass

    def copyfile(self, source, outputfile):
        # Ignore client disconnects when browser aborts or refreshes
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

class QuietThreadingServer(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        # Suppress noise from dropped browser connections
        exc_type, _, _ = sys.exc_info()
        if exc_type in (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return
        super().handle_error(request, client_address)

def run(port=8000, directory=None):
    if directory is None:
        directory = os.path.dirname(os.path.abspath(__file__))

    handler = partial(QuietHTTPRequestHandler, directory=directory)
    server_address = ("0.0.0.0", port)

    with QuietThreadingServer(server_address, handler) as httpd:
        print(f"pyZerk server running silently on http://localhost:{port}/")
        print(f"Serving directory: {directory}")
        print(f"Logs routed to: {LOG_FILE} (terminal output suppressed)")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down web server.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Quiet HTTP server for pyZerk Web")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--directory", "-d", type=str, default=None, help="Directory to serve")
    args = parser.parse_args()
    run(port=args.port, directory=args.directory)
