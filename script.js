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

  updatePortalLottoCard();
});
