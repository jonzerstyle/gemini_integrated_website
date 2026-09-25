# Gemini Integrated Website & pyZerk Arcade Showcase Record

## 📌 Project Overview
* **Repository**: [`https://github.com/jonzerstyle/gemini_integrated_website.git`](https://github.com/jonzerstyle/gemini_integrated_website.git) (branch `main`)
* **Local Path**: `/home/mjones/agy/gemini_integrated_website`
* **Target Domain**: `numericagenda.com`
* **Hosting Platform**: GoDaddy Linux cPanel (`public_html/`)
* **Primary Tech Stack**: HTML5, Vanilla JavaScript, CSS3 Glassmorphism, Pygbag WebAssembly (Pygame-CE), Apache HTTP Server (`.htaccess`).

---

## 🗂️ Project Directory Structure

```text
gemini_integrated_website/
├── .gitignore             # Git exclusions (caches, OS files, zips, tarballs)
├── .htaccess              # Production Apache rules (HTTPS redirect, MIME types, CORS, gzip)
├── DEPLOY_GODADDY.md      # Step-by-step GoDaddy cPanel extraction & deployment guide
├── GEMINI.md              # Project record, architecture, decisions & chronological log
├── README.md              # Public overview and quickstart instructions
├── generate_banner_gif.py # Banner generation script for 16s animated binary header
├── index.html             # Showcase portal with binary banner, info cards & arcade modal
├── numericagenda_banner.gif # Pre-rendered 16-second looping binary matrix header banner
├── script.js              # Tournament countdown, modal launcher, and Ko-fi event handlers
├── style.css              # Cyber-glassmorphism theme, glowing neon accents & responsive layout
├── serve.sh               # Local launch script
├── server.py              # Local testing multi-threaded HTTP server with MIME mappings
├── cdn/                   # Pre-cached WebAssembly wheels for Pygame-CE runtime
│   ├── index-0.9.3-cp312.json
│   └── cp312/
│       └── pygame_ce-2.5.7-cp312-cp312-wasm32_bi_emscripten.whl
└── pyzerk/                # Embedded pyZerk WebAssembly game suite
    ├── index.html         # Fullscreen WASM runner with portal return link & controls HUD
    ├── pyzerk.apk         # Compiled game package (Python source, audio & image assets)
    ├── favicon.png        # Retro arcade icon
    ├── server.py          # Standalone pyZerk arcade test server
    └── cdn/               # Local wheel cache for standalone pyZerk runner
```

---

## 🏛️ Architecture & Technical Decisions

### 1. Web Portal & Glassmorphic UI
* **Design Aesthetic**: Retro cyberpunk meets modern glassmorphism. Deep dark background (`#0b0f19`) paired with radial ambient glow orbs, frosted glass backdrop filters (`backdrop-filter: blur(16px)`), and crisp cyan/emerald glowing borders.
* **16-Second Looping Binary Banner (`numericagenda_banner.gif`)**:
  * Generated programmatically with Python (PIL / Pillow) via `generate_banner_gif.py`.
  * Features flowing green-on-black binary matrix streams, subtle CRT scanlines, and high-contrast glowing title typography.
* **Responsive Layout**: Designed for seamless viewing across ultra-wide desktop displays, standard laptops, tablets, and mobile devices.

### 2. Embedded pyZerk WebAssembly Integration
* **Arcade Cabinet Modal (`index.html`, `script.js`, `style.css`)**:
  * Clicking **"Launch pyZerk Arcade"** triggers an animated retro arcade cabinet modal overlay.
  * The game runs inside an isolated `<iframe>` pointing to `./pyzerk/index.html`.
  * **Resource Preservation**: The iframe is created on demand when opened and destroyed on close, ensuring zero background CPU, memory, or audio bleed when the user is simply reading the portal.
  * **Auto-Focus**: Upon opening, keyboard focus is automatically shifted into the game iframe for immediate WASM control response without requiring an extra click.
* **Standalone Arcade Mode (`pyzerk/index.html`)**:
  * For full immersion, clicking **"Open in New Tab"** opens the dedicated full-screen runner.
  * Features a floating **"← Return to Portal"** navigation button and a quick-reference controls pill HUD.

### 3. Production Apache & GoDaddy Linux cPanel Setup
* **Automatic HTTPS Redirection**:
  * Enforced via `.htaccess` mod_rewrite rules: any insecure request is permanently redirected to `https://%{HTTP_HOST}%{REQUEST_URI}`.
* **Crucial Binary MIME Types**:
  * Shared hosting servers often lack MIME associations for modern WebAssembly assets. The `.htaccess` file explicitly maps:
    * `AddType application/wasm .wasm`
    * `AddType application/vnd.android.package-archive .apk`
    * `AddType application/x-wheel+zip .whl`
    * `AddType audio/ogg .ogg`
    * `AddType application/json .json`
* **Cross-Origin & Caching Optimizations**:
  * `Access-Control-Allow-Origin: "*"` allows WASM web workers to fetch local wheels and APK packages smoothly.
  * Apache `mod_deflate` enabled for high-speed compressed delivery of HTML, CSS, JavaScript, and JSON.

---

## 📜 Chronological Actions & Milestones

### 1. Initial Portal Setup & Glassmorphic Redesign
* Built responsive showcase portal based on cyber-glassmorphism theme.
* Integrated responsive grid featuring pyZerk showcase card, game lore, combat tips, and roadmap.

### 2. Animated Binary Banner Generation
* Developed `generate_banner_gif.py` to create custom 16-second looping binary matrix animated header.
* Embedded `numericagenda_banner.gif` with neon border styling and retro arcade aesthetic.

### 3. Pygame-CE WebAssembly Bundle Synchronization
* Integrated latest Pygbag WebAssembly build (`pyzerk.apk`) containing:
  * 10-level bonus life celebration display and multi-banner vertical stacking.
  * Web environment ESC key handling (pauses and returns to menu without freezing browser canvas).
  * Dynamic status popup positioning (bottom placement when entering from top side).
  * Doorway corridor safety buffer and wall collision immunity during exit escape.
  * Complete suppression of debug terminal and status log overlays.

### 4. Production Deployment Packaging
* Created GoDaddy cPanel production archive: [`/home/mjones/agy/numericagenda_godaddy_deploy.zip`](file:///home/mjones/agy/numericagenda_godaddy_deploy.zip) (45 MB).
* Documented extraction procedures in [`DEPLOY_GODADDY.md`](file:///home/mjones/agy/gemini_integrated_website/DEPLOY_GODADDY.md).

### 5. Git Repository Tracking
* Created `.gitignore` excluding Python caches, OS files, and archive bundles.
* Linked and pushed to GitHub repository: [`https://github.com/jonzerstyle/gemini_integrated_website.git`](https://github.com/jonzerstyle/gemini_integrated_website.git) (branch `main`).

---

## 🛠️ Operational Commands & Local Testing

### Launch Local Showcase Server
```bash
cd /home/mjones/agy/gemini_integrated_website
python3 server.py --port 8080
```
* **Portal URL**: [http://localhost:8080/](http://localhost:8080/)
* **Direct Arcade URL**: [http://localhost:8080/pyzerk/](http://localhost:8080/pyzerk/)

### Re-package Deployment Zip
```bash
python3 -c "
import os, zipfile
source_dir = '/home/mjones/agy/gemini_integrated_website'
target = '/home/mjones/agy/numericagenda_godaddy_deploy.zip'
exclude_files = {'generate_banner_gif.py'}
exclude_dirs = {'__pycache__', '.git'}
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(source_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f in exclude_files or f.endswith('.pyc') or f.endswith('.tar.gz') or f.endswith('.zip'): continue
            fp = os.path.join(root, f)
            zipf.write(fp, os.path.relpath(fp, source_dir))
"
```
