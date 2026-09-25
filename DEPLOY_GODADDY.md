# GoDaddy cPanel Deployment Guide for numericagenda

This package is pre-configured and ready to deploy directly to your GoDaddy Linux cPanel hosting account.

---

## 📦 Deployment Archive

* **File Location**: [`/home/mjones/agy/numericagenda_godaddy_deploy.zip`](file:///home/mjones/agy/numericagenda_godaddy_deploy.zip)
* **Archive Size**: ~23 MB
* **Contents**: Fully standalone static website + WebAssembly arcade runtime + Apache `.htaccess` configuration. Zero external build steps or node_modules needed.

---

## 🚀 3-Step GoDaddy cPanel Deployment

### Step 1: Open cPanel File Manager
1. Log in to your **GoDaddy Account** and open **My Products**.
2. Click **Manage** next to your **Web Hosting (cPanel)**.
3. In the cPanel dashboard, open **File Manager**.

### Step 2: Upload the Zip Archive
1. Navigate to your website's document root:
   * **Primary Domain**: `public_html/`
   * **Addon / Subdomain**: `public_html/numericagenda.com/` (or your chosen folder).
2. Click **Upload** in the top toolbar.
3. Select and upload [`numericagenda_godaddy_deploy.zip`](file:///home/mjones/agy/numericagenda_godaddy_deploy.zip).

### Step 3: Extract & Activate
1. Once the upload finishes (100% / green bar), return to File Manager.
2. Right-click **`numericagenda_godaddy_deploy.zip`** and choose **Extract**.
3. Confirm the extraction path (`public_html/` or your domain folder) and click **Extract Files**.
4. *(Optional)* Delete or move the `.zip` file to keep your directory clean.

---

## 🔒 Built-In Apache Configurations (`.htaccess`)
The package includes a custom [`.htaccess`](file:///home/mjones/agy/gemini_integrated_website/.htaccess) file configured with:
1. **HTTPS Enforcement**: Automatically redirects all insecure `http://` traffic to secure `https://`.
2. **WebAssembly & Wheel MIME Types**: Maps `.wasm`, `.apk`, `.whl`, `.ogg`, and `.json` to ensure GoDaddy's Apache server transmits the binary game files without MIME mismatch errors.
3. **CORS Support**: Sets `Access-Control-Allow-Origin: "*"` so the browser can load WebAssembly workers and Pygame packages smoothly.
4. **Gzip / Deflate Compression**: Enables high-speed delivery for text, CSS, JavaScript, and HTML assets.

---

## 🕹️ Verifying Live Operation
After extracting:
1. Visit `https://yourdomain.com` (or `https://numericagenda.com`).
2. Verify the 16-second animated binary banner renders and loops at the top.
3. Click **"Launch pyZerk Arcade"** to test the game running inside the modal.
4. Click **"Support on Ko-fi"** to confirm it opens your live [ko-fi.com/jonzerstyle](https://ko-fi.com/jonzerstyle) page.
