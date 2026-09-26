/**
 * NumericAgenda Lotto Lab: Core Application Engine
 * Handles game switching, strategy algorithms, statistical charting, and history queries.
 */

document.addEventListener('DOMContentLoaded', () => {
  let data = window.LOTTO_DATA;
  if (!data) {
    console.error('Lotto data not loaded!');
    return;
  }

  let currentGame = 'superlotto';
  let currentStrategy = 'hybrid';

  // Strategy presets and generators
  const STRATEGY_INFO = {
    hybrid: {
      name: 'Optimal Balanced Hybrid',
      desc: 'Blends all-time winning numbers with overdue momentum, matching the 65% odd/even and low/high sweet spot.',
      icon: '🌟'
    },
    heat: {
      name: 'All-Time Heat',
      desc: 'Selects purely from the most frequently drawn numbers in game history.',
      icon: '🔥'
    },
    overdue: {
      name: 'Law of Averages (Overdue)',
      desc: 'Targets numbers with the longest current drought that are statistically primed for mean-reversion.',
      icon: '⏳'
    },
    antisplit: {
      name: 'Anti-Split Jackpot Maximizer',
      desc: 'Bypasses the casual 1–31 birthday bias so if you win, your odds of keeping the entire jackpot alone are maximized.',
      icon: '🛡️'
    }
  };

  // Pre-calculated empirical lines
  const PRESET_LINES = {
    superlotto: {
      hybrid: { balls: [6, 13, 15, 33, 43], special: 10 },
      heat: { balls: [4, 6, 7, 30, 33], special: 20 },
      overdue: { balls: [10, 15, 32, 39, 43], special: 24 },
      antisplit: { balls: [7, 21, 33, 38, 45], special: 23 }
    },
    powerball: {
      hybrid: { balls: [21, 28, 52, 61, 64], special: 21 },
      heat: { balls: [21, 23, 27, 61, 64], special: 4 },
      overdue: { balls: [1, 22, 34, 51, 52], special: 19 },
      antisplit: { balls: [17, 32, 44, 63, 69], special: 24 }
    }
  };

  // DOM Elements
  const tabSuperLotto = document.getElementById('btn-tab-superlotto');
  const tabPowerball = document.getElementById('btn-tab-powerball');
  const strategyBtns = document.querySelectorAll('.strategy-btn');
  const generateBtn = document.getElementById('generate-btn');
  const generatorHeading = document.getElementById('generator-heading');
  const strategyBanner = document.getElementById('strategy-banner');
  const strategyDesc = document.getElementById('strategy-desc');
  const ballsRow = document.getElementById('balls-row');
  const lineMetricsGrid = document.getElementById('line-metrics-grid');
  const analyticsTabs = document.querySelectorAll('.analytics-tab-btn');
  const analyticsPanels = document.querySelectorAll('.analytics-panel');
  const drawSearch = document.getElementById('draw-search');

  // Refresh & Header Elements
  const refreshBtn = document.getElementById('refresh-analysis-btn');
  const refreshToast = document.getElementById('refresh-status-toast');
  const matrixTimestamp = document.getElementById('matrix-timestamp');
  const verifiedDrawsTag = document.getElementById('verified-draws-tag');
  const superlottoTabSub = document.getElementById('superlotto-tab-sub');
  const powerballTabSub = document.getElementById('powerball-tab-sub');

  let toastTimer = null;

  function init() {
    setupGameSwitcher();
    setupStrategyButtons();
    setupAnalyticsNavigation();
    setupSearch();
    setupRefreshButton();
    updateHeaderBadges();
    renderAll();
  }

  function formatPacificTime(dateObj = new Date()) {
    try {
      const options = {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(dateObj);
      const getPart = (type) => parts.find(p => p.type === type)?.value || '';
      const y = getPart('year');
      const m = getPart('month');
      const d = getPart('day');
      const h = getPart('hour');
      const min = getPart('minute');
      const dayPeriod = getPart('dayPeriod').toUpperCase();
      return `${y}-${m}-${d} ${h}:${min} ${dayPeriod} PDT`;
    } catch (e) {
      return '2026-09-25 07:55 PM PDT';
    }
  }

  function updateHeaderBadges(lastCheckedStr = null) {
    if (!data) return;
    const superDraws = data.superlotto?.total_draws || 0;
    const powerDraws = data.powerball?.total_draws || 0;
    const totalDraws = superDraws + powerDraws;

    if (verifiedDrawsTag) {
      verifiedDrawsTag.textContent = `${totalDraws.toLocaleString()} DRAWS VERIFIED`;
    }
    if (superlottoTabSub) {
      superlottoTabSub.textContent = `5 of 47 + 1 of 27 Mega (${superDraws.toLocaleString()} Draws)`;
    }
    if (powerballTabSub) {
      powerballTabSub.textContent = `5 of 69 + 1 of 26 Red (${powerDraws.toLocaleString()} Draws)`;
    }
    if (matrixTimestamp) {
      const savedTime = localStorage.getItem('lotto_lab_last_sync_timestamp');
      const displayTime = lastCheckedStr || savedTime || formatPacificTime();
      matrixTimestamp.textContent = `COMM-LINK // LAST FULL MATRIX ANALYSIS: ${displayTime}`;
    }
  }

  function showToast(message, type = 'info', duration = 8000) {
    if (!refreshToast) return;
    if (toastTimer) clearTimeout(toastTimer);

    refreshToast.className = `refresh-status-toast ${type}`;
    refreshToast.innerHTML = `
      <span>${message}</span>
      <button type="button" style="background:none;border:none;color:inherit;cursor:pointer;font-family:inherit;font-weight:bold;margin-left:12px;" onclick="this.parentElement.style.display='none'">✕</button>
    `;
    refreshToast.style.display = 'flex';

    if (duration > 0) {
      toastTimer = setTimeout(() => {
        refreshToast.style.display = 'none';
      }, duration);
    }
  }

  function setupRefreshButton() {
    const refreshBtns = document.querySelectorAll('.refresh-analysis-btn');
    if (!refreshBtns.length) return;

    const COOLDOWN_MS = 60000; // 60s client cooldown
    const STORAGE_KEY = 'lotto_lab_last_sync';

    function setButtonsState(disabled, loading, icon, text) {
      refreshBtns.forEach(btn => {
        btn.disabled = disabled;
        if (loading) {
          btn.classList.add('loading');
        } else {
          btn.classList.remove('loading');
        }
        const iconSpan = btn.querySelector('.btn-refresh-icon');
        const textSpan = btn.querySelector('.btn-refresh-text');
        if (iconSpan && icon) iconSpan.textContent = icon;
        if (textSpan && text) textSpan.textContent = text;
      });
    }

    let cooldownInterval = null;
    function startCooldownTimer(seconds) {
      if (cooldownInterval) clearInterval(cooldownInterval);
      setButtonsState(true, false, '⏳', `COOLDOWN (${seconds}s)`);

      let remaining = seconds;
      cooldownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(cooldownInterval);
          cooldownInterval = null;
          setButtonsState(false, false, '🔄', 'SYNC LATEST DRAWS');
        } else {
          setButtonsState(true, false, '⏳', `COOLDOWN (${remaining}s)`);
        }
      }, 1000);
    }

    function checkExistingCooldown() {
      const lastSync = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      const elapsed = Date.now() - lastSync;
      if (elapsed < COOLDOWN_MS) {
        startCooldownTimer(Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      }
    }

    async function triggerSync() {
      const lastSync = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      const elapsed = Date.now() - lastSync;
      if (elapsed < COOLDOWN_MS) {
        startCooldownTimer(Math.ceil((COOLDOWN_MS - elapsed) / 1000));
        return;
      }

      setButtonsState(true, true, '🔄', 'CHECKING FEEDS...');
      showToast('📡 Connecting to official lottery data feeds (CA SuperLotto & Powerball)...', 'info', 0);

      try {
        const response = await fetch('api/refresh.php', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });

        localStorage.setItem(STORAGE_KEY, Date.now().toString());

        if (response.status === 429) {
          const errData = await response.json().catch(() => ({}));
          const waitTime = errData.retry_after || 300;
          showToast(`⚠️ Rate limit active. Please wait ${Math.ceil(waitTime / 60)} minutes before checking again.`, 'warning', 10000);
          startCooldownTimer(60);
          return;
        }

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const res = await response.json();
        if (!res.success) {
          throw new Error(res.error || 'Sync request failed.');
        }

        // Apply updated data in-memory
        if (res.data) {
          window.LOTTO_DATA = res.data;
          data = window.LOTTO_DATA;
        }

        if (res.last_checked) {
          localStorage.setItem('lotto_lab_last_sync_timestamp', res.last_checked);
        }

        updateHeaderBadges(res.last_checked);
        renderAll();

        if (res.updated) {
          const newTotal = (res.new_draws?.superlotto || 0) + (res.new_draws?.powerball || 0);
          showToast(`⚡ Matrix updated: ${newTotal} new verified draw(s) integrated! Frequencies & gaps recalculated.`, 'success', 9000);
        } else {
          showToast(`✓ Current matrix verified: ${res.message}`, 'info', 7000);
        }

        startCooldownTimer(60);
      } catch (err) {
        console.error('Lotto sync error:', err);
        showToast(`❌ Connection error: ${err.message || 'Could not reach sync endpoint.'}`, 'error', 8000);
        setButtonsState(false, false, '🔄', 'SYNC LATEST DRAWS');
      }
    }

    refreshBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (btn.disabled) return;
        triggerSync();
      });
    });

    checkExistingCooldown();
  }

  function setupGameSwitcher() {
    tabSuperLotto.addEventListener('click', () => {
      if (currentGame === 'superlotto') return;
      currentGame = 'superlotto';
      tabSuperLotto.classList.add('active');
      tabPowerball.classList.remove('active');
      renderAll();
    });

    tabPowerball.addEventListener('click', () => {
      if (currentGame === 'powerball') return;
      currentGame = 'powerball';
      tabPowerball.classList.add('active');
      tabSuperLotto.classList.remove('active');
      renderAll();
    });
  }

  function setupStrategyButtons() {
    strategyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        strategyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStrategy = btn.dataset.strategy;
        renderStrategyLine();
      });
    });

    generateBtn.addEventListener('click', () => {
      // Trigger subtle pulse animation on balls
      renderStrategyLine(true);
    });
  }

  function setupAnalyticsNavigation() {
    analyticsTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        analyticsTabs.forEach(b => b.classList.remove('active'));
        analyticsPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPanel = document.getElementById(`panel-${btn.dataset.section}`);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  }

  function renderAll() {
    const isSuper = currentGame === 'superlotto';
    generatorHeading.textContent = isSuper ? 'SuperLotto Plus Pick Generator' : 'Powerball Pick Generator';
    
    // Update labels in headings
    document.getElementById('special-ball-title').textContent = isSuper ? '⭐ Mega Ball Rankings' : '🔴 Red Powerball Rankings';
    document.getElementById('special-ball-subtitle').textContent = isSuper ? 'Mega Ball frequencies (1 to 27)' : 'Powerball frequencies (1 to 26)';
    document.getElementById('overdue-special-title').textContent = isSuper ? '⏳ Most Overdue Mega Balls' : '⏳ Most Overdue Powerballs';
    document.getElementById('th-special').textContent = isSuper ? 'Mega' : 'Powerball';

    renderStrategyLine();
    renderLeaderboards();
    renderOverdue();
    renderCombinatorics();
    renderHistory();
  }

  function renderStrategyLine(randomize = false) {
    const gameData = data[currentGame];
    const info = STRATEGY_INFO[currentStrategy];
    strategyDesc.textContent = info.desc;

    let line;
    if (!randomize) {
      line = PRESET_LINES[currentGame][currentStrategy];
    } else {
      line = generateDynamicPick(currentGame, currentStrategy);
    }

    // Render balls
    ballsRow.innerHTML = '';
    const isSuper = currentGame === 'superlotto';
    const specialClass = isSuper ? 'mega-ball' : 'power-ball';
    const specialLabel = isSuper ? 'MEGA' : 'POWERBALL';

    // 5 standard balls
    const sortedBalls = [...line.balls].sort((a, b) => a - b);
    sortedBalls.forEach((num, idx) => {
      const ballEl = document.createElement('div');
      ballEl.className = 'lotto-ball white-ball';
      ballEl.textContent = num;
      ballEl.title = `Ball ${num} | Drawn ${gameData.ball_counts[num] || 0} times | Absent ${gameData.ball_gaps[num] || 0} draws`;
      ballsRow.appendChild(ballEl);
    });

    // 1 special ball
    const specEl = document.createElement('div');
    specEl.className = `lotto-ball ${specialClass}`;
    specEl.innerHTML = `<span>${line.special}</span><span class="ball-special-label">${specialLabel}</span>`;
    specEl.title = `${specialLabel} ${line.special} | Drawn ${gameData.special_counts[line.special] || 0} times | Absent ${gameData.special_gaps[line.special] || 0} draws`;
    ballsRow.appendChild(specEl);

    // Calculate line metrics
    const odds = sortedBalls.filter(n => n % 2 !== 0).length;
    const evens = 5 - odds;
    const splitThreshold = isSuper ? 23 : 35;
    const lows = sortedBalls.filter(n => n <= splitThreshold).length;
    const highs = 5 - lows;
    const sum = sortedBalls.reduce((acc, v) => acc + v, 0);

    const sweetLow = isSuper ? 89 : 131;
    const sweetHigh = isSuper ? 149 : 222;
    const inSweet = sum >= sweetLow && sum <= sweetHigh;

    lineMetricsGrid.innerHTML = `
      <div class="metric-pill">
        <span class="metric-label">Odd / Even Ratio</span>
        <span class="metric-value ${odds === 3 || odds === 2 ? 'status-badge-good' : ''}">${odds} Odd / ${evens} Even</span>
      </div>
      <div class="metric-pill">
        <span class="metric-label">Low / High Split</span>
        <span class="metric-value ${lows === 3 || lows === 2 ? 'status-badge-good' : ''}">${lows} Low / ${highs} High</span>
      </div>
      <div class="metric-pill">
        <span class="metric-label">Sum Total</span>
        <span class="metric-value ${inSweet ? 'status-badge-good' : ''}">${sum} ${inSweet ? '✓ (Optimal)' : ''}</span>
      </div>
      <div class="metric-pill">
        <span class="metric-label">Strategy Rating</span>
        <span class="metric-value status-badge-good">${info.name}</span>
      </div>
    `;
  }

  function generateDynamicPick(game, strategy) {
    const gameData = data[game];
    const ballRange = gameData.ball_range;
    const specialRange = gameData.special_range;

    const ballCounts = gameData.ball_counts;
    const ballGaps = gameData.ball_gaps;
    const specCounts = gameData.special_counts;
    const specGaps = gameData.special_gaps;

    let pool = [];
    if (strategy === 'heat') {
      // Top 40% most frequent
      pool = Object.keys(ballCounts).map(Number).sort((a, b) => ballCounts[b] - ballCounts[a]).slice(0, 18);
    } else if (strategy === 'overdue') {
      // Top 40% most overdue
      pool = Object.keys(ballGaps).map(Number).sort((a, b) => ballGaps[b] - ballGaps[a]).slice(0, 18);
    } else if (strategy === 'antisplit') {
      // Numbers above 31
      pool = Object.keys(ballCounts).map(Number).filter(n => n > 31);
    } else {
      // Hybrid: Blend top 12 hot + top 12 overdue
      const hots = Object.keys(ballCounts).map(Number).sort((a, b) => ballCounts[b] - ballCounts[a]).slice(0, 14);
      const dues = Object.keys(ballGaps).map(Number).sort((a, b) => ballGaps[b] - ballGaps[a]).slice(0, 14);
      pool = Array.from(new Set([...hots, ...dues]));
    }

    // Pick 5 distinct balls from pool
    const selected = [];
    const poolCopy = [...pool];
    while (selected.length < 5 && poolCopy.length > 0) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      selected.push(poolCopy.splice(idx, 1)[0]);
    }

    // Special ball selection
    let special;
    if (strategy === 'heat') {
      const topSpecials = Object.keys(specCounts).map(Number).sort((a, b) => specCounts[b] - specCounts[a]).slice(0, 5);
      special = topSpecials[Math.floor(Math.random() * topSpecials.length)];
    } else if (strategy === 'overdue') {
      const dueSpecials = Object.keys(specGaps).map(Number).sort((a, b) => specGaps[b] - specGaps[a]).slice(0, 5);
      special = dueSpecials[Math.floor(Math.random() * dueSpecials.length)];
    } else {
      const topSpecials = Object.keys(specCounts).map(Number).sort((a, b) => specCounts[b] - specCounts[a]).slice(0, 8);
      special = topSpecials[Math.floor(Math.random() * topSpecials.length)];
    }

    return { balls: selected, special };
  }

  function renderLeaderboards() {
    const gameData = data[currentGame];
    const isSuper = currentGame === 'superlotto';
    const ballCounts = Object.entries(gameData.ball_counts).map(([k, v]) => [Number(k), v]);
    const specCounts = Object.entries(gameData.special_counts).map(([k, v]) => [Number(k), v]);

    const sortedHottest = [...ballCounts].sort((a, b) => b[1] - a[1]);
    const sortedColdest = [...ballCounts].sort((a, b) => a[1] - b[1]);
    const sortedSpecials = [...specCounts].sort((a, b) => b[1] - a[1]);

    const maxBall = sortedHottest[0][1];
    const maxSpec = sortedSpecials[0][1];

    // Render Hot
    const hotList = document.getElementById('hot-balls-list');
    hotList.innerHTML = sortedHottest.slice(0, 10).map(([num, count]) => `
      <div class="stat-row">
        <span class="stat-ball-mini mini-white">${num}</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill" style="width: ${(count / maxBall) * 100}%"></div>
        </div>
        <span class="stat-count">${count}x</span>
      </div>
    `).join('');

    // Render Cold
    const coldList = document.getElementById('cold-balls-list');
    coldList.innerHTML = sortedColdest.slice(0, 10).map(([num, count]) => `
      <div class="stat-row">
        <span class="stat-ball-mini mini-white">${num}</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill" style="width: ${(count / maxBall) * 100}%; background: linear-gradient(90deg, #64748b, #94a3b8);"></div>
        </div>
        <span class="stat-count">${count}x</span>
      </div>
    `).join('');

    // Render Special
    const specList = document.getElementById('special-balls-list');
    const miniClass = isSuper ? 'mini-mega' : 'mini-power';
    specList.innerHTML = sortedSpecials.slice(0, 10).map(([num, count]) => `
      <div class="stat-row">
        <span class="stat-ball-mini ${miniClass}">${num}</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill special" style="width: ${(count / maxSpec) * 100}%"></div>
        </div>
        <span class="stat-count">${count}x</span>
      </div>
    `).join('');
  }

  function renderOverdue() {
    const gameData = data[currentGame];
    const isSuper = currentGame === 'superlotto';
    const ballGaps = Object.entries(gameData.ball_gaps).map(([k, v]) => [Number(k), v]);
    const specGaps = Object.entries(gameData.special_gaps).map(([k, v]) => [Number(k), v]);

    const sortedBallGaps = [...ballGaps].sort((a, b) => b[1] - a[1]);
    const sortedSpecGaps = [...specGaps].sort((a, b) => b[1] - a[1]);

    const maxBallGap = sortedBallGaps[0][1];
    const maxSpecGap = sortedSpecGaps[0][1];

    const overdueBallsList = document.getElementById('overdue-balls-list');
    overdueBallsList.innerHTML = sortedBallGaps.slice(0, 10).map(([num, gap]) => `
      <div class="stat-row">
        <span class="stat-ball-mini mini-white">${num}</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill" style="width: ${(gap / maxBallGap) * 100}%; background: linear-gradient(90deg, #f59e0b, #ef4444);"></div>
        </div>
        <span class="stat-count">${gap} draws absent</span>
      </div>
    `).join('');

    const overdueSpecList = document.getElementById('overdue-specials-list');
    const miniClass = isSuper ? 'mini-mega' : 'mini-power';
    overdueSpecList.innerHTML = sortedSpecGaps.slice(0, 5).map(([num, gap]) => `
      <div class="stat-row">
        <span class="stat-ball-mini ${miniClass}">${num}</span>
        <div class="stat-bar-container">
          <div class="stat-bar-fill special" style="width: ${(gap / maxSpecGap) * 100}%;"></div>
        </div>
        <span class="stat-count">${gap} draws absent</span>
      </div>
    `).join('');
  }

  function renderCombinatorics() {
    const isSuper = currentGame === 'superlotto';
    const rulesGrid = document.getElementById('rules-grid');

    if (isSuper) {
      rulesGrid.innerHTML = `
        <div class="rule-card">
          <span class="rule-icon">⚖️</span>
          <h4 class="rule-title">Odd vs. Even Split</h4>
          <p class="rule-desc">65.5% of all 2,745 winning draws in California history feature either 3 Odd / 2 Even (32.5%) or 2 Odd / 3 Even (33.0%).</p>
          <span class="rule-stat">65.5% Winning Frequency</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">📊</span>
          <h4 class="rule-title">Low (1-23) vs. High (24-47)</h4>
          <p class="rule-desc">Balanced 3 Low / 2 High (33.7%) and 2 Low / 3 High (32.4%) represent two-thirds of all winning tickets.</p>
          <span class="rule-stat">66.1% Probability</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🎯</span>
          <h4 class="rule-title">Sum Range Sweet Spot</h4>
          <p class="rule-desc">The average sum of the 5 white balls is 118.8. Exactly 70% of all winning combinations sum between 89 and 149.</p>
          <span class="rule-stat">89 to 149 Optimal</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🛡️</span>
          <h4 class="rule-title">Birthday Bias (Anti-Split)</h4>
          <p class="rule-desc">Numbers 1-31 are heavily over-selected by casual players picking birthdays. Selecting numbers above 31 protects your payout.</p>
          <span class="rule-stat">Maximizes Solo Payout</span>
        </div>
      `;
    } else {
      rulesGrid.innerHTML = `
        <div class="rule-card">
          <span class="rule-icon">⚖️</span>
          <h4 class="rule-title">Odd vs. Even Split</h4>
          <p class="rule-desc">63.1% of all Powerball draws feature 3 Odd / 2 Even (32.0%) or 2 Odd / 3 Even (31.1%). Extreme tickets (all odd/even) hit under 3%.</p>
          <span class="rule-stat">63.1% Winning Frequency</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">📊</span>
          <h4 class="rule-title">Low (1-35) vs. High (36-69)</h4>
          <p class="rule-desc">2 Low / 3 High (33.7%) and 3 Low / 2 High (32.6%) account for 66.3% of all winning draws.</p>
          <span class="rule-stat">66.3% Probability</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🎯</span>
          <h4 class="rule-title">Sum Range Sweet Spot</h4>
          <p class="rule-desc">The average winning sum in Powerball is 176.9. 70% of winning combinations have sums between 131 and 222.</p>
          <span class="rule-stat">131 to 222 Optimal</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🛡️</span>
          <h4 class="rule-title">High Board Edge (32-69)</h4>
          <p class="rule-desc">Over 55% of the Powerball board (32-69) is outside birthday range. Playing 3+ numbers from 32-69 slashes split risk.</p>
          <span class="rule-stat">Jackpot Protection</span>
        </div>
      `;
    }
  }

  function renderHistory(filterText = '') {
    const gameData = data[currentGame];
    const isSuper = currentGame === 'superlotto';
    const recentDraws = gameData.recent_draws || [];
    const tbody = document.getElementById('history-tbody');
    const badge = document.getElementById('history-count-badge');

    const filtered = recentDraws.filter(d => {
      if (!filterText) return true;
      const term = filterText.toLowerCase();
      const inDate = d.date.toLowerCase().includes(term);
      const inBalls = d.balls.some(b => String(b) === term);
      const inSpec = String(d.special) === term;
      return inDate || inBalls || inSpec;
    });

    badge.textContent = `Showing ${filtered.length} draws`;

    tbody.innerHTML = filtered.map(d => {
      const sorted = [...d.balls].sort((a, b) => a - b);
      const specClass = isSuper ? 'tbl-special-mega' : 'tbl-special-power';
      return `
        <tr>
          <td><strong>${d.date}</strong></td>
          <td>
            <div class="history-balls-row">
              ${sorted.map(b => `<span class="tbl-ball">${b}</span>`).join('')}
            </div>
          </td>
          <td>
            <span class="tbl-ball ${specClass}">${d.special}</span>
          </td>
          <td>${d.jackpot || '—'}</td>
        </tr>
      `;
    }).join('');
  }

  function setupSearch() {
    drawSearch.addEventListener('input', (e) => {
      renderHistory(e.target.value.trim());
    });
  }

  init();
});
