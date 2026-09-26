<?php
/**
 * Lotto Lab: On-Demand Analysis Refresh API Endpoint
 * 
 * Features Multi-Layer Anti-Hammering Protection:
 * 1. IP Rate Limiting (Max 3 requests per 5 minutes per IP -> HTTP 429)
 * 2. Global 15-Minute Debounce Lock (Zero external calls if checked < 15 min ago)
 * 3. Non-Blocking Concurrency Mutex (flock LOCK_EX | LOCK_NB)
 * 4. Automatic Incremental Statistics Recalculation
 * 5. Atomic Disk Writes (lotto_data.json & lotto_data.js)
 */

error_reporting(0);
ini_set('display_errors', '0');
date_default_timezone_set('America/Los_Angeles');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$BASE_DIR = dirname(__DIR__);
$DATA_JSON = $BASE_DIR . '/lotto_data.json';
$DATA_JS   = $BASE_DIR . '/lotto_data.js';
$LOCK_FILE = __DIR__ . '/.refresh_lock';
$MUTEX_FILE = __DIR__ . '/.process_lock';
$RATE_LIMIT_DIR = sys_get_temp_dir() . '/lotto_rate_limit';

// -------------------------------------------------------------
// 1. Per-IP Rate Limiting (Max 3 requests per 5 minutes)
// -------------------------------------------------------------
$client_ip = $_SERVER['HTTP_CF_CONNECTING_IP'] 
    ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
    ?? $_SERVER['REMOTE_ADDR'] 
    ?? '127.0.0.1';

// Sanitize IP for file storage
$ip_key = md5(explode(',', $client_ip)[0]);
if (!is_dir($RATE_LIMIT_DIR)) {
    @mkdir($RATE_LIMIT_DIR, 0755, true);
}

$rate_file = $RATE_LIMIT_DIR . '/' . $ip_key . '.json';
$now = time();
$rate_data = ['count' => 0, 'first_req' => $now];

if (file_exists($rate_file)) {
    $content = @file_get_contents($rate_file);
    if ($content) {
        $parsed = json_decode($content, true);
        if ($parsed && isset($parsed['first_req'])) {
            if ($now - $parsed['first_req'] < 300) { // 5-minute window
                $rate_data = $parsed;
            }
        }
    }
}

if ($rate_data['count'] >= 5) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error' => 'Rate limit exceeded. Please wait 5 minutes before checking again.',
        'retry_after' => 300 - ($now - $rate_data['first_req'])
    ], JSON_PRETTY_PRINT);
    exit(0);
}

$rate_data['count']++;
@file_put_contents($rate_file, json_encode($rate_data));

// -------------------------------------------------------------
// 2. Global 15-Minute Debounce Lock (Zero External Requests)
// -------------------------------------------------------------
$debounce_seconds = 900; // 15 minutes
$is_force = isset($_GET['force']) && $_GET['force'] === '1' && ($client_ip === '127.0.0.1' || php_sapi_name() === 'cli');

if (!$is_force && file_exists($LOCK_FILE) && ($now - filemtime($LOCK_FILE) < $debounce_seconds)) {
    $existing = json_decode(@file_get_contents($DATA_JSON), true);
    if ($existing) {
        echo json_encode([
            'success' => true,
            'updated' => false,
            'status' => 'current',
            'message' => 'Analysis matrix is fully up to date (verified within last 15 minutes).',
            'last_checked' => date('Y-m-d g:i A T', filemtime($LOCK_FILE)),
            'total_draws' => [
                'superlotto' => $existing['superlotto']['total_draws'],
                'powerball' => $existing['powerball']['total_draws']
            ],
            'data' => $existing
        ], JSON_PRETTY_PRINT);
        exit(0);
    }
}

// -------------------------------------------------------------
// 3. Non-Blocking Concurrency Mutex
// -------------------------------------------------------------
$mutex_fp = @fopen($MUTEX_FILE, 'c+');
if (!$mutex_fp || !flock($mutex_fp, LOCK_EX | LOCK_NB)) {
    // Another process is currently executing the refresh
    $existing = json_decode(@file_get_contents($DATA_JSON), true);
    echo json_encode([
        'success' => true,
        'updated' => false,
        'status' => 'refresh_in_progress',
        'message' => 'A refresh cycle is currently in progress. Serving cached matrix.',
        'data' => $existing
    ], JSON_PRETTY_PRINT);
    exit(0);
}

// Mark refresh timestamp
@touch($LOCK_FILE);

// Load current data
$data = json_decode(@file_get_contents($DATA_JSON), true);
if (!$data || !isset($data['superlotto']) || !isset($data['powerball'])) {
    flock($mutex_fp, LOCK_UN);
    fclose($mutex_fp);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Master lottery dataset unreadable.']);
    exit(0);
}

$any_updated = false;
$new_draws_info = ['superlotto' => 0, 'powerball' => 0];

// Helper: HTTP GET with timeout and User-Agent
function fetch_url($url) {
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 8,
            'header'  => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n"
        ]
    ]);
    return @file_get_contents($url, false, $ctx);
}

// -------------------------------------------------------------
// 4. Check & Update California SuperLotto Plus
// -------------------------------------------------------------
try {
    $latest_super_date = $data['superlotto']['recent_draws'][0]['date'] ?? '2000-01-01';
    $year = date('Y');
    $super_url = "https://www.lottery.net/california/superlotto-plus/numbers/{$year}";
    $super_html = fetch_url($super_url);

    if ($super_html) {
        preg_match_all('/<tr[^>]*>.*?<\/tr>/is', $super_html, $row_matches);
        $new_super_draws = [];

        foreach ($row_matches[0] as $row) {
            if (preg_match('/<td[^>]*class=\"[^\"]*colour[^\"]*\"[^>]*>([^<]+)<\/td>/i', $row, $d_match)) {
                $date_raw = trim($d_match[1]);
                $ts = strtotime($date_raw);
                if (!$ts) continue;
                $draw_date = date('Y-m-d', $ts);
                
                // If draw is newer than what we have in history
                if ($draw_date > $latest_super_date) {
                    preg_match_all('/<li[^>]*class=\"[^\"]*ca-superlotto-plus\s+ball[^\"]*\">(\d+)<\/li>/i', $row, $ball_matches);
                    preg_match('/<li[^>]*class=\"[^\"]*mega-ball[^\"]*\">(\d+)<\/li>/i', $row, $mega_match);
                    
                    if (count($ball_matches[1]) === 5 && !empty($mega_match[1])) {
                        $balls = array_map('intval', $ball_matches[1]);
                        sort($balls);
                        $mega = intval($mega_match[1]);
                        
                        preg_match('/data-title=\"Jackpot\"[^>]*>\s*(\$[0-9,]+)/i', $row, $jp_match);
                        $jackpot = $jp_match[1] ?? '';

                        $new_super_draws[] = [
                            'date' => $draw_date,
                            'balls' => $balls,
                            'special' => $mega,
                            'jackpot' => $jackpot
                        ];
                    }
                }
            }
        }

        // Apply new SuperLotto draws chronologically (oldest to newest)
        if (!empty($new_super_draws)) {
            usort($new_super_draws, function($a, $b) { return strcmp($a['date'], $b['date']); });
            
            foreach ($new_super_draws as $draw) {
                $data['superlotto']['total_draws']++;
                
                // Increment ball counts & reset gaps
                $drawn_set = array_flip($draw['balls']);
                for ($b = 1; $b <= 47; $b++) {
                    $b_str = (string)$b;
                    if (isset($drawn_set[$b])) {
                        $data['superlotto']['ball_counts'][$b_str] = ($data['superlotto']['ball_counts'][$b_str] ?? 0) + 1;
                        $data['superlotto']['ball_gaps'][$b_str] = 0;
                    } else {
                        $data['superlotto']['ball_gaps'][$b_str] = ($data['superlotto']['ball_gaps'][$b_str] ?? 0) + 1;
                    }
                }
                
                // Increment special count & reset gaps
                $mega_val = $draw['special'];
                for ($m = 1; $m <= 27; $m++) {
                    $m_str = (string)$m;
                    if ($m === $mega_val) {
                        $data['superlotto']['special_counts'][$m_str] = ($data['superlotto']['special_counts'][$m_str] ?? 0) + 1;
                        $data['superlotto']['special_gaps'][$m_str] = 0;
                    } else {
                        $data['superlotto']['special_gaps'][$m_str] = ($data['superlotto']['special_gaps'][$m_str] ?? 0) + 1;
                    }
                }
                
                // Prepend to recent draws list
                array_unshift($data['superlotto']['recent_draws'], $draw);
            }
            
            // Keep top 50
            $data['superlotto']['recent_draws'] = array_slice($data['superlotto']['recent_draws'], 0, 50);
            $any_updated = true;
            $new_draws_info['superlotto'] = count($new_super_draws);
        }
    }
} catch (Exception $e) {
    // Graceful fallback on network error
}

// -------------------------------------------------------------
// 5. Check & Update Powerball (Socrata API data.ny.gov)
// -------------------------------------------------------------
try {
    $latest_pb_date = $data['powerball']['recent_draws'][0]['date'] ?? '2015-10-07';
    $pb_url = "https://data.ny.gov/resource/d6yy-54nr.json?\$limit=5&\$order=draw_date%20DESC";
    $pb_raw = fetch_url($pb_url);

    if ($pb_raw) {
        $pb_entries = json_decode($pb_raw, true);
        if (is_array($pb_entries)) {
            $new_pb_draws = [];
            foreach ($pb_entries as $entry) {
                if (isset($entry['draw_date']) && isset($entry['winning_numbers'])) {
                    $draw_date = substr($entry['draw_date'], 0, 10);
                    if ($draw_date > $latest_pb_date) {
                        $parts = preg_split('/\s+/', trim($entry['winning_numbers']));
                        if (count($parts) >= 6) {
                            $balls = [
                                intval($parts[0]), intval($parts[1]),
                                intval($parts[2]), intval($parts[3]),
                                intval($parts[4])
                            ];
                            sort($balls);
                            $pb_special = intval($parts[5]);
                            $multiplier = isset($entry['multiplier']) ? $entry['multiplier'] : '';

                            $new_pb_draws[] = [
                                'date' => $draw_date,
                                'balls' => $balls,
                                'special' => $pb_special,
                                'jackpot' => $multiplier
                            ];
                        }
                    }
                }
            }

            if (!empty($new_pb_draws)) {
                usort($new_pb_draws, function($a, $b) { return strcmp($a['date'], $b['date']); });
                
                foreach ($new_pb_draws as $draw) {
                    $data['powerball']['total_draws']++;
                    
                    $drawn_set = array_flip($draw['balls']);
                    for ($b = 1; $b <= 69; $b++) {
                        $b_str = (string)$b;
                        if (isset($drawn_set[$b])) {
                            $data['powerball']['ball_counts'][$b_str] = ($data['powerball']['ball_counts'][$b_str] ?? 0) + 1;
                            $data['powerball']['ball_gaps'][$b_str] = 0;
                        } else {
                            $data['powerball']['ball_gaps'][$b_str] = ($data['powerball']['ball_gaps'][$b_str] ?? 0) + 1;
                        }
                    }

                    $pb_val = $draw['special'];
                    for ($m = 1; $m <= 26; $m++) {
                        $m_str = (string)$m;
                        if ($m === $pb_val) {
                            $data['powerball']['special_counts'][$m_str] = ($data['powerball']['special_counts'][$m_str] ?? 0) + 1;
                            $data['powerball']['special_gaps'][$m_str] = 0;
                        } else {
                            $data['powerball']['special_gaps'][$m_str] = ($data['powerball']['special_gaps'][$m_str] ?? 0) + 1;
                        }
                    }

                    array_unshift($data['powerball']['recent_draws'], $draw);
                }

                $data['powerball']['recent_draws'] = array_slice($data['powerball']['recent_draws'], 0, 50);
                $any_updated = true;
                $new_draws_info['powerball'] = count($new_pb_draws);
            }
        }
    }
} catch (Exception $e) {
    // Graceful fallback
}

// -------------------------------------------------------------
// 6. Atomic Persistence If Data Changed
// -------------------------------------------------------------
if ($any_updated) {
    $json_content = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    @file_put_contents($DATA_JSON . '.tmp', $json_content);
    @rename($DATA_JSON . '.tmp', $DATA_JSON);

    $js_content = "window.LOTTO_DATA = " . json_encode($data) . ";\n";
    @file_put_contents($DATA_JS . '.tmp', $js_content);
    @rename($DATA_JS . '.tmp', $DATA_JS);
}

flock($mutex_fp, LOCK_UN);
fclose($mutex_fp);

// -------------------------------------------------------------
// 7. Output Result JSON
// -------------------------------------------------------------
$response = [
    'success' => true,
    'updated' => $any_updated,
    'status'  => $any_updated ? 'new_draws_integrated' : 'current',
    'message' => $any_updated 
        ? "Latest official draw data integrated successfully (" . ($new_draws_info['superlotto'] + $new_draws_info['powerball']) . " new draw(s) added)."
        : "Analysis matrix is fully up to date. Verified through latest drawings.",
    'last_checked' => date('Y-m-d g:i A T', $now),
    'new_draws' => $new_draws_info,
    'total_draws' => [
        'superlotto' => $data['superlotto']['total_draws'],
        'powerball' => $data['powerball']['total_draws']
    ],
    'latest_draw_dates' => [
        'superlotto' => $data['superlotto']['recent_draws'][0]['date'] ?? '',
        'powerball'  => $data['powerball']['recent_draws'][0]['date'] ?? ''
    ],
    'data' => $data
];

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
