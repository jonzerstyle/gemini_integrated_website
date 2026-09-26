/**
 * Gemini Arcade & pyZerk Integrated Portal Script
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Dynamic Current Year in Footer
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 1b. Click to Replay Banner Animation
  const bannerContainer = document.getElementById('banner-container');
  const bannerGif = document.getElementById('banner-gif');
  if (bannerContainer && bannerGif) {
    bannerContainer.addEventListener('click', () => {
      const baseSrc = bannerGif.src.split('?')[0];
      bannerGif.src = `${baseSrc}?replay=${Date.now()}`;
    });
  }

  // 2. Countdown Timer
  // Defaults to rolling 7-day tournament cycles so the clock is always dynamically counting down
  const now = new Date().getTime();
  const CYCLE_MS = 7 * 24 * 60 * 60 * 1000;
  let targetDate = now + (CYCLE_MS - (now % CYCLE_MS));

  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  function updateCountdown() {
    const current = new Date().getTime();
    const distance = targetDate - current;

    if (distance <= 0) {
      targetDate = current + CYCLE_MS;
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // 3. Subscription / Notify Form Handling
  const notifyForm = document.getElementById('notify-form');
  const emailInput = document.getElementById('email-input');
  const formMsg = document.getElementById('form-message');
  const submitBtn = document.getElementById('submit-btn');

  if (notifyForm) {
    notifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();

      if (!email || !email.includes('@')) {
        showFormMessage('Please enter a valid email address.', 'error');
        return;
      }

      // Client-side simulation of signup feedback
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Joining...</span>';

      setTimeout(() => {
        showFormMessage('🎉 You are in! We will notify you of high scores and new releases.', 'success');
        notifyForm.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>Notify Me</span>
          <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        `;
      }, 700);
    });
  }

  function showFormMessage(text, type) {
    if (!formMsg) return;
    formMsg.textContent = text;
    formMsg.className = `form-message ${type}`;
    formMsg.style.opacity = '1';

    setTimeout(() => {
      formMsg.style.opacity = '0';
    }, 6000);
  }

  // 4. Interactive Arcade Game Modal
  const launchBtn = document.getElementById('launch-game-btn');
  const modal = document.getElementById('arcade-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const gameIframe = document.getElementById('game-iframe');

  function openArcade() {
    if (!modal || !gameIframe) return;
    
    // Dynamically set src only when launching so the WASM engine doesn't consume memory in the background
    if (!gameIframe.src || gameIframe.src === 'about:blank') {
      gameIframe.src = 'pyzerk/index.html';
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus iframe for immediate keyboard play
    setTimeout(() => {
      gameIframe.focus();
    }, 300);
  }

  function closeArcade() {
    if (!modal || !gameIframe) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Unload the iframe audio and Pygame execution loop upon closing
    setTimeout(() => {
      gameIframe.src = 'about:blank';
    }, 300);
  }

  if (launchBtn) {
    launchBtn.addEventListener('click', openArcade);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeArcade);
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeArcade);
  }

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal && modal.classList.contains('active')) {
        closeArcade();
      }
      if (lottoModal && lottoModal.classList.contains('active')) {
        closeLottoLab();
      }
    }
  });

  // 5. Interactive Lotto Lab Modal
  const launchLottoBtn = document.getElementById('launch-lotto-btn');
  const lottoModal = document.getElementById('lotto-modal');
  const lottoModalBackdrop = document.getElementById('lotto-modal-backdrop');
  const closeLottoModalBtn = document.getElementById('close-lotto-modal-btn');
  const lottoIframe = document.getElementById('lotto-iframe');

  function openLottoLab() {
    if (!lottoModal || !lottoIframe) return;

    if (!lottoIframe.src || lottoIframe.src === 'about:blank') {
      lottoIframe.src = 'lotto/index.html';
    }

    lottoModal.classList.add('active');
    lottoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      lottoIframe.focus();
    }, 300);
  }

  function closeLottoLab() {
    if (!lottoModal || !lottoIframe) return;
    lottoModal.classList.remove('active');
    lottoModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    setTimeout(() => {
      lottoIframe.src = 'about:blank';
    }, 300);
  }

  if (launchLottoBtn) {
    launchLottoBtn.addEventListener('click', openLottoLab);
  }

  if (closeLottoModalBtn) {
    closeLottoModalBtn.addEventListener('click', closeLottoLab);
  }

  if (lottoModalBackdrop) {
    lottoModalBackdrop.addEventListener('click', closeLottoLab);
  }

  const openLottoTabBtn = document.getElementById('open-lotto-tab-btn');
  if (openLottoTabBtn) {
    openLottoTabBtn.addEventListener('click', (e) => {
      try {
        const win = window.open('lotto/index.html', '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          // If popup is blocked by browser settings, navigate directly
          window.location.href = 'lotto/index.html';
        }
        e.preventDefault();
      } catch (err) {
        // Fallback to native link navigation
      }
    });
  }

  // 6. Dynamic Lotto Showcase Card Status & Matrix Run Timestamp
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

  function updatePortalLottoCard() {
    const recsTitle = document.getElementById('recs-card-title');
    if (!recsTitle) return;

    const savedSync = localStorage.getItem('lotto_lab_last_sync_timestamp');
    const displayTime = savedSync || formatPacificTime();
    recsTitle.textContent = `RECOMMENDED PICKS // LAST MATRIX RUN: ${displayTime}`;
  }

  function setupPortalSyncButton() {
    const portalSyncBtn = document.getElementById('portal-sync-btn');
    const portalToast = document.getElementById('portal-sync-toast');
    const recsTitle = document.getElementById('recs-card-title');
    if (!portalSyncBtn) return;

    const COOLDOWN_MS = 60000;
    const STORAGE_KEY = 'lotto_lab_last_sync';

    let toastTimer = null;
    function showPortalToast(message, type = 'info', duration = 7000) {
      if (!portalToast) return;
      if (toastTimer) clearTimeout(toastTimer);
      portalToast.className = `portal-sync-toast ${type}`;
      portalToast.innerHTML = `
        <span>${message}</span>
        <button type="button" style="background:none;border:none;color:inherit;cursor:pointer;font-family:inherit;font-weight:bold;margin-left:10px;" onclick="this.parentElement.style.display='none'">✕</button>
      `;
      portalToast.style.display = 'flex';
      if (duration > 0) {
        toastTimer = setTimeout(() => {
          portalToast.style.display = 'none';
        }, duration);
      }
    }

    let cooldownInterval = null;
    function startPortalCooldown(seconds) {
      if (cooldownInterval) clearInterval(cooldownInterval);
      portalSyncBtn.disabled = true;
      portalSyncBtn.classList.remove('loading');

      const iconSpan = portalSyncBtn.querySelector('.portal-sync-icon');
      const textSpan = portalSyncBtn.querySelector('.portal-sync-text');
      if (iconSpan) iconSpan.textContent = '⏳';

      let remaining = seconds;
      if (textSpan) textSpan.textContent = `COOLDOWN (${remaining}s)`;

      cooldownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(cooldownInterval);
          cooldownInterval = null;
          portalSyncBtn.disabled = false;
          if (iconSpan) iconSpan.textContent = '🔄';
          if (textSpan) textSpan.textContent = 'SYNC LATEST DRAWS';
        } else {
          if (textSpan) textSpan.textContent = `COOLDOWN (${remaining}s)`;
        }
      }, 1000);
    }

    function checkExistingCooldown() {
      const lastSync = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      const elapsed = Date.now() - lastSync;
      if (elapsed < COOLDOWN_MS) {
        startPortalCooldown(Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      }
    }

    portalSyncBtn.addEventListener('click', async () => {
      if (portalSyncBtn.disabled) return;

      const lastSync = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      const elapsed = Date.now() - lastSync;
      if (elapsed < COOLDOWN_MS) {
        startPortalCooldown(Math.ceil((COOLDOWN_MS - elapsed) / 1000));
        return;
      }

      portalSyncBtn.disabled = true;
      portalSyncBtn.classList.add('loading');
      const iconSpan = portalSyncBtn.querySelector('.portal-sync-icon');
      const textSpan = portalSyncBtn.querySelector('.portal-sync-text');
      if (iconSpan) iconSpan.textContent = '🔄';
      if (textSpan) textSpan.textContent = 'CHECKING FEEDS...';

      showPortalToast('📡 Connecting to official lottery feeds...', 'info', 0);

      try {
        const response = await fetch('lotto/api/refresh.php', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });

        localStorage.setItem(STORAGE_KEY, Date.now().toString());

        if (response.status === 429) {
          const errData = await response.json().catch(() => ({}));
          const waitTime = errData.retry_after || 300;
          showPortalToast(`⚠️ Rate limit active. Please wait ${Math.ceil(waitTime / 60)} minutes.`, 'warning', 8000);
          startPortalCooldown(60);
          return;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const res = await response.json();
        if (!res.success) throw new Error(res.error || 'Sync request failed.');

        if (res.last_checked) {
          localStorage.setItem('lotto_lab_last_sync_timestamp', res.last_checked);
        }

        if (recsTitle) {
          recsTitle.textContent = `RECOMMENDED PICKS // LAST MATRIX RUN: ${res.last_checked || formatPacificTime()}`;
        }

        if (res.updated) {
          const newTotal = (res.new_draws?.superlotto || 0) + (res.new_draws?.powerball || 0);
          showPortalToast(`⚡ Matrix updated: ${newTotal} new draw(s) integrated!`, 'success', 8000);
        } else {
          showPortalToast(`✓ Current matrix verified: ${res.message}`, 'info', 6000);
        }

        startPortalCooldown(60);
      } catch (err) {
        console.error('Portal sync error:', err);
        showPortalToast(`❌ Sync error: ${err.message || 'Could not reach sync endpoint.'}`, 'error', 7000);
        portalSyncBtn.disabled = false;
        portalSyncBtn.classList.remove('loading');
        if (iconSpan) iconSpan.textContent = '🔄';
        if (textSpan) textSpan.textContent = 'SYNC LATEST DRAWS';
      }
    });

    checkExistingCooldown();
  }

  updatePortalLottoCard();
  setupPortalSyncButton();
});
