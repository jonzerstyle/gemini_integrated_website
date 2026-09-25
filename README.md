# Gemini Integrated Website & pyZerk WebAssembly Portal

A modern, responsive web portal based on the sleek glassmorphic design system from `gemini_website_setup`, integrating the browser-deployed **pyZerk** arcade game built with WebAssembly (Pygbag & Pygame).

---

## 🗂️ Project Structure

```text
gemini_integrated_website/
├── index.html            # Main landing page with pyZerk launch CTA & interactive modal
├── style.css             # Cyber glassmorphism styling, ambient radial glow orbs & animations
├── script.js             # Live tournament countdown timer, notify signup & modal controller
├── .htaccess             # Apache/cPanel configuration (HTTPS redirect, WASM & APK MIME types)
├── server.py             # Quiet Python multi-threaded HTTP server with MIME handling
├── serve.sh              # Instant launch bash script (defaults to http://localhost:8080)
├── README.md             # Project documentation and deployment guide
└── pyzerk/               # Web-deployed pyZerk game assets
    ├── index.html        # Pygbag WebAssembly runner with Return to Portal navigation
    ├── pyzerk.apk        # Bundled Python 3 code & audio/image assets
    ├── pyzerk.tar.gz     # Web deployment archive
    ├── favicon.png       # Retro robot icon
    ├── server.py         # Dedicated pyZerk test server
    └── cdn/              # Local wheel cache for Pygame WebAssembly runtime
```

---

## 🚀 Quickstart & Local Preview

To launch the web server and test the integrated portal immediately:

```bash
# Using the helper script:
./serve.sh

# Or directly with Python:
python3 server.py --port 8000
```

Open your browser to:
* **Web Portal (Home)**: [http://localhost:8000/](http://localhost:8000/)
* **Direct Game Link**: [http://localhost:8000/pyzerk/](http://localhost:8000/pyzerk/)

---

## 🕹️ Key Features

1. **Integrated pyZerk Launcher**:
   * **Interactive Arcade Modal**: Clicking **"Launch pyZerk Arcade"** opens a retro arcade cabinet overlay directly on the home page, loading the WebAssembly engine in an isolated iframe.
   * **Direct Window / Tab**: Clicking **"Open in New Tab"** opens the dedicated full-screen game page at `pyzerk/index.html`.
   * **Return Navigation**: When browsing the standalone game page, a floating **"← Return to Portal"** button allows seamless return to the home page.
   * **Resource Efficient**: The game iframe is dynamically loaded only when requested and unloaded upon closing the modal, avoiding unwanted background CPU/audio usage.

2. **Design & UX (from `gemini_website_setup`)**:
   * Dark theme with multi-layered animated glowing radial orbs.
   * Backdrop blur glassmorphic card container.
   * Dynamic real-time countdown timer (rolling 7-day tournament cycles).
   * Interactive "Notify Me" subscription form with client-side feedback.
   * Keyboard controls quick reference (<kbd>WASD</kbd>, <kbd>SPACE</kbd>, <kbd>F</kbd>).

3. **Apache / cPanel Production Ready**:
   * `.htaccess` enforces HTTPS and maps MIME types for `.wasm`, `.apk`, `.tar.gz`, `.whl`, and `.ogg` to avoid corrupted downloads or MIME mismatch errors on shared hosts.
