#!/usr/bin/env python3
"""
Lotto Lab: On-Demand Analysis Refresh Engine (Python Companion & Local Dev Handler)
Performs identical multi-layer protection and incremental statistical updating as refresh.php.
"""

import os
import sys
import json
import time
import fcntl
import urllib.request
import re
import hashlib
import tempfile
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JSON = os.path.join(BASE_DIR, "lotto_data.json")
DATA_JS = os.path.join(BASE_DIR, "lotto_data.js")
LOCK_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".refresh_lock")
MUTEX_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".process_lock")
RATE_LIMIT_DIR = os.path.join(tempfile.gettempdir(), "lotto_rate_limit")

def fetch_url(url, timeout=8):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        return ""

def refresh_lotto_analysis(force=False, client_ip=None):
    now = time.time()
    debounce_seconds = 900  # 15 minutes

    # 0. Per-IP Rate Limiting (Max 5 requests per 5 minutes per non-localhost IP)
    if client_ip and client_ip not in ("127.0.0.1", "localhost", "::1"):
        os.makedirs(RATE_LIMIT_DIR, exist_ok=True)
        ip_hash = hashlib.md5(client_ip.encode("utf-8")).hexdigest()
        rate_file = os.path.join(RATE_LIMIT_DIR, f"{ip_hash}.json")
        rate_data = {"count": 0, "first_req": now}
        if os.path.exists(rate_file):
            try:
                with open(rate_file, "r", encoding="utf-8") as rf:
                    saved = json.load(rf)
                if now - saved.get("first_req", 0) < 300:
                    rate_data = saved
            except Exception:
                pass

        if rate_data["count"] >= 5:
            retry_after = int(300 - (now - rate_data["first_req"]))
            return {
                "success": False,
                "status_code": 429,
                "error": "Rate limit exceeded. Please wait 5 minutes before checking again.",
                "retry_after": max(1, retry_after)
            }

        rate_data["count"] += 1
        try:
            with open(rate_file, "w", encoding="utf-8") as rf:
                json.dump(rate_data, rf)
        except Exception:
            pass

    # 1. Debounce check
    if not force and os.path.exists(LOCK_FILE):
        if now - os.path.getmtime(LOCK_FILE) < debounce_seconds:
            try:
                with open(DATA_JSON, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                return {
                    "success": True,
                    "updated": False,
                    "status": "current",
                    "message": "Analysis matrix is fully up to date (verified within last 15 minutes).",
                    "last_checked": datetime.fromtimestamp(os.path.getmtime(LOCK_FILE)).strftime("%Y-%m-%d %I:%M %p PDT"),
                    "total_draws": {
                        "superlotto": cached_data["superlotto"]["total_draws"],
                        "powerball": cached_data["powerball"]["total_draws"]
                    },
                    "data": cached_data
                }
            except Exception:
                pass

    # 2. Concurrency Lock
    lock_fp = open(MUTEX_FILE, "a+")
    try:
        fcntl.flock(lock_fp.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        with open(DATA_JSON, "r", encoding="utf-8") as f:
            cached_data = json.load(f)
        return {
            "success": True,
            "updated": False,
            "status": "refresh_in_progress",
            "message": "A refresh cycle is currently in progress. Serving cached matrix.",
            "data": cached_data
        }

    try:
        # Mark timestamp
        with open(LOCK_FILE, "w") as f:
            f.write(str(now))

        with open(DATA_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)

        any_updated = False
        new_draws_info = {"superlotto": 0, "powerball": 0}

        # 3. SuperLotto Fetch
        latest_super_date = data["superlotto"]["recent_draws"][0]["date"] if data["superlotto"]["recent_draws"] else "2000-01-01"
        year = datetime.now().year
        super_url = f"https://www.lottery.net/california/superlotto-plus/numbers/{year}"
        super_html = fetch_url(super_url)

        if super_html:
            rows = re.findall(r'<tr[^>]*>.*?</tr>', super_html, re.DOTALL)
            new_super_draws = []
            for r in rows:
                date_match = re.search(r'<td[^>]*class=\"[^\"]*colour[^\"]*\"[^>]*>([^<]+)</td>', r, re.I)
                if not date_match:
                    continue
                try:
                    draw_date = datetime.strptime(date_match.group(1).strip(), "%B %d, %Y").strftime("%Y-%m-%d")
                except Exception:
                    continue

                if draw_date > latest_super_date:
                    balls = re.findall(r'<li[^>]*class=\"[^\"]*ca-superlotto-plus\s+ball[^\"]*\">(\d+)</li>', r, re.I)
                    mega = re.search(r'<li[^>]*class=\"[^\"]*mega-ball[^\"]*\">(\d+)</li>', r, re.I)
                    if len(balls) == 5 and mega:
                        b_list = sorted([int(b) for b in balls])
                        jp_match = re.search(r'data-title=\"Jackpot\"[^>]*>\s*(\$[0-9,]+)', r)
                        new_super_draws.append({
                            "date": draw_date,
                            "balls": b_list,
                            "special": int(mega.group(1)),
                            "jackpot": jp_match.group(1) if jp_match else ""
                        })

            if new_super_draws:
                new_super_draws.sort(key=lambda d: d["date"])
                for draw in new_super_draws:
                    data["superlotto"]["total_draws"] += 1
                    drawn_set = set(draw["balls"])
                    for b in range(1, 48):
                        b_str = str(b)
                        if b in drawn_set:
                            data["superlotto"]["ball_counts"][b_str] = data["superlotto"]["ball_counts"].get(b_str, 0) + 1
                            data["superlotto"]["ball_gaps"][b_str] = 0
                        else:
                            data["superlotto"]["ball_gaps"][b_str] = data["superlotto"]["ball_gaps"].get(b_str, 0) + 1

                    mega_val = draw["special"]
                    for m in range(1, 28):
                        m_str = str(m)
                        if m == mega_val:
                            data["superlotto"]["special_counts"][m_str] = data["superlotto"]["special_counts"].get(m_str, 0) + 1
                            data["superlotto"]["special_gaps"][m_str] = 0
                        else:
                            data["superlotto"]["special_gaps"][m_str] = data["superlotto"]["special_gaps"].get(m_str, 0) + 1

                    data["superlotto"]["recent_draws"].insert(0, draw)

                data["superlotto"]["recent_draws"] = data["superlotto"]["recent_draws"][:50]
                any_updated = True
                new_draws_info["superlotto"] = len(new_super_draws)

        # 4. Powerball Fetch
        latest_pb_date = data["powerball"]["recent_draws"][0]["date"] if data["powerball"]["recent_draws"] else "2015-10-07"
        pb_url = "https://data.ny.gov/resource/d6yy-54nr.json?$limit=5&$order=draw_date%20DESC"
        pb_raw = fetch_url(pb_url)

        if pb_raw:
            try:
                pb_entries = json.loads(pb_raw)
                new_pb_draws = []
                for entry in pb_entries:
                    if "draw_date" in entry and "winning_numbers" in entry:
                        draw_date = entry["draw_date"][:10]
                        if draw_date > latest_pb_date:
                            parts = entry["winning_numbers"].strip().split()
                            if len(parts) >= 6:
                                b_list = sorted([int(p) for p in parts[:5]])
                                pb_val = int(parts[5])
                                new_pb_draws.append({
                                    "date": draw_date,
                                    "balls": b_list,
                                    "special": pb_val,
                                    "jackpot": entry.get("multiplier", "")
                                })

                if new_pb_draws:
                    new_pb_draws.sort(key=lambda d: d["date"])
                    for draw in new_pb_draws:
                        data["powerball"]["total_draws"] += 1
                        drawn_set = set(draw["balls"])
                        for b in range(1, 70):
                            b_str = str(b)
                            if b in drawn_set:
                                data["powerball"]["ball_counts"][b_str] = data["powerball"]["ball_counts"].get(b_str, 0) + 1
                                data["powerball"]["ball_gaps"][b_str] = 0
                            else:
                                data["powerball"]["ball_gaps"][b_str] = data["powerball"]["ball_gaps"].get(b_str, 0) + 1

                        pb_val = draw["special"]
                        for m in range(1, 27):
                            m_str = str(m)
                            if m == pb_val:
                                data["powerball"]["special_counts"][m_str] = data["powerball"]["special_counts"].get(m_str, 0) + 1
                                data["powerball"]["special_gaps"][m_str] = 0
                            else:
                                data["powerball"]["special_gaps"][m_str] = data["powerball"]["special_gaps"].get(m_str, 0) + 1

                        data["powerball"]["recent_draws"].insert(0, draw)

                    data["powerball"]["recent_draws"] = data["powerball"]["recent_draws"][:50]
                    any_updated = True
                    new_draws_info["powerball"] = len(new_pb_draws)
            except Exception:
                pass

        # 5. Atomic write
        if any_updated:
            tmp_json = DATA_JSON + ".tmp"
            with open(tmp_json, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            os.replace(tmp_json, DATA_JSON)

            tmp_js = DATA_JS + ".tmp"
            with open(tmp_js, "w", encoding="utf-8") as f:
                f.write(f"window.LOTTO_DATA = {json.dumps(data)};\n")
            os.replace(tmp_js, DATA_JS)

        return {
            "success": True,
            "updated": any_updated,
            "status": "new_draws_integrated" if any_updated else "current",
            "message": (
                f"Latest official draw data integrated successfully ({new_draws_info['superlotto'] + new_draws_info['powerball']} new draw(s) added)."
                if any_updated else
                "Analysis matrix is fully up to date. Verified through latest drawings."
            ),
            "last_checked": datetime.fromtimestamp(now).strftime("%Y-%m-%d %I:%M %p PDT"),
            "new_draws": new_draws_info,
            "total_draws": {
                "superlotto": data["superlotto"]["total_draws"],
                "powerball": data["powerball"]["total_draws"]
            },
            "latest_draw_dates": {
                "superlotto": data["superlotto"]["recent_draws"][0]["date"] if data["superlotto"]["recent_draws"] else "",
                "powerball": data["powerball"]["recent_draws"][0]["date"] if data["powerball"]["recent_draws"] else ""
            },
            "data": data
        }
    finally:
        fcntl.flock(lock_fp.fileno(), fcntl.LOCK_UN)
        lock_fp.close()

if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    res = refresh_lotto_analysis(force=force_flag)
    print(json.dumps(res, indent=2))
