(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nav: background once scrolled, hides while scrolling down, returns when scrolling up
  const nav = document.getElementById('nav');
  let lastY = window.scrollY;
  const onNavScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 600 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  };

  // Mobile menu
  const toggle = document.getElementById('navToggle');
  const drawer = document.getElementById('mobileDrawer');
  const setMenu = (open) => {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle?.addEventListener('click', () => setMenu(!drawer.classList.contains('is-open')));
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Scroll reveal, children of [data-stagger] get a small cascading delay
  document.querySelectorAll('[data-stagger]').forEach(group => {
    [...group.children].forEach((child, i) => child.style.setProperty('--d', `${i * 0.08}s`));
  });
  document.querySelectorAll('.testi-row, .plans, .steps').forEach(group => {
    [...group.querySelectorAll(':scope > .reveal')].forEach((child, i) => child.style.setProperty('--d', `${(i % 4) * 0.09}s`));
  });
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Lazy loading + autoplay: a video's bytes are only fetched once it comes close
  // to the viewport (rootMargin), and playback starts when it's actually visible.
  // Until then the container's indigo gradient shows through, so there is no black flash.
  const setupLazyAutoplay = (videos, root) => {
    if (!videos.length) return;

    const load = (video) => {
      if (video.src || !video.dataset.src) return;
      video.preload = 'auto';
      video.src = video.dataset.src;
    };

    if ('IntersectionObserver' in window) {
      // Fetch a little before the video scrolls into view so it's ready in time.
      const loader = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          load(entry.target);
          loader.unobserve(entry.target);
        });
      }, { root, rootMargin: '400px', threshold: 0 });

      const player = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            load(video);
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { root, threshold: 0.25 });

      videos.forEach(video => { loader.observe(video); player.observe(video); });
    } else {
      videos.forEach(video => { load(video); video.play().catch(() => {}); });
    }
  };
  // Reels use the viewport as root too: the carousel's overflow clips them, so a reel is only
  // fetched once it is both on screen and scrolled into the carousel. (With the carousel as
  // root, every reel in its first screen width loaded on page load, ~6 MB per visit.)
  setupLazyAutoplay(document.querySelectorAll('.reel-video video[data-src]'), null);
  setupLazyAutoplay(document.querySelectorAll('.plan-video video[data-src]'), null);
  setupLazyAutoplay(document.querySelectorAll('.about-media video[data-src]'), null);

  // Quick cut in the project package: the label follows the cuts (5 clips, 2 s each, see schnelldurchlauf-v1.mp4)
  const planVideo = document.querySelector('.plan-video video');
  const planTag = document.getElementById('planTag');
  if (planVideo && planTag) {
    const labels = ['Imagefilm', 'Werbespot', 'Recruiting-Video', 'Produktvideo', 'Event'];
    const sync = () => {
      const label = labels[Math.min(labels.length - 1, Math.floor(planVideo.currentTime / 2))];
      if (planTag.textContent !== label) planTag.textContent = label;
    };
    if ('requestVideoFrameCallback' in planVideo) {
      const onFrame = () => { sync(); planVideo.requestVideoFrameCallback(onFrame); };
      planVideo.requestVideoFrameCallback(onFrame);
    } else {
      planVideo.addEventListener('timeupdate', sync);
    }
  }

  // About photos are hidden by CSS below 900px - don't download them there at all.
  const desktopOnlyImgs = document.querySelectorAll('img[data-desktop-only][data-src]');
  if (desktopOnlyImgs.length) {
    const mq = window.matchMedia('(min-width: 901px)');
    let near = false;
    const loadImgs = () => {
      if (!mq.matches || !near) return;
      desktopOnlyImgs.forEach(img => { if (!img.src) img.src = img.dataset.src; });
      mq.removeEventListener('change', loadImgs);
    };
    // Only once the about section gets close, not on page load
    const nearIo = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near = true;
      nearIo.disconnect();
      loadImgs();
    }, { rootMargin: '600px' });
    nearIo.observe(desktopOnlyImgs[0].parentElement);
    mq.addEventListener('change', loadImgs);
  }

  // Process rail fills with scroll progress; steps light up as the fill reaches them
  const steps = document.getElementById('steps');
  const stepEls = steps ? [...steps.querySelectorAll('.step')] : [];
  const updateSteps = () => {
    if (!steps) return;
    const r = steps.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / (r.height * 0.9)));
    steps.style.setProperty('--p', p.toFixed(3));
    stepEls.forEach((s, i) => s.classList.toggle('is-active', p >= i / stepEls.length + 0.02 || p === 1));
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onNavScroll();
      updateSteps();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // Soft gold light that follows the pointer on cards
  document.querySelectorAll('.plan, .testi').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Marquees: the track scrolls by -50%, so each half must be at least as wide as the screen,
  // otherwise wide (ultrawide) monitors see a gap before the loop restarts. Repeat the set as
  // often as needed and stretch the duration accordingly so the speed stays the same.
  document.querySelectorAll('.marquee').forEach(mq => {
    const track = mq.querySelector('.marquee-track');
    const tpl = track.firstElementChild.cloneNode(true);
    const baseDuration = parseFloat(getComputedStyle(track).animationDuration) || 48;
    let current = 0;
    const fill = () => {
      const setWidth = track.firstElementChild.getBoundingClientRect().width;
      if (!setWidth) return;
      const perHalf = Math.max(1, Math.ceil(mq.clientWidth / setWidth));
      if (perHalf === current) return;
      current = perHalf;
      track.replaceChildren(...Array.from({ length: perHalf * 2 }, (_, i) => {
        const copy = tpl.cloneNode(true);
        if (i > 0) {
          copy.setAttribute('aria-hidden', 'true');
          copy.querySelectorAll('img').forEach(img => { img.alt = ''; });
        }
        return copy;
      }));
      track.style.setProperty('animation-duration', `${baseDuration * perHalf}s`, 'important');
    };
    fill();
    window.addEventListener('load', fill);
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fill, 200); });
  });

  // Reel carousel: drag (mouse/trackpad; touch scrolls natively), arrows and progress bar
  const carousel = document.getElementById('reelCarousel');
  if (carousel) {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const endDrag = () => {
      isDown = false;
      carousel.classList.remove('is-dragging');
    };

    carousel.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = carousel.scrollLeft;
      carousel.classList.add('is-dragging');
    });
    carousel.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      carousel.scrollLeft = startScroll - dx;
    });
    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointerleave', endDrag);
    carousel.addEventListener('pointercancel', endDrag);
    carousel.addEventListener('click', (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    const step = () => {
      const card = carousel.querySelector('.reel');
      return card ? (card.offsetWidth + 16) * 2 : 400;
    };
    document.getElementById('reelPrev')?.addEventListener('click', () => carousel.scrollBy({ left: -step(), behavior: 'smooth' }));
    document.getElementById('reelNext')?.addEventListener('click', () => carousel.scrollBy({ left: step(), behavior: 'smooth' }));

    const bar = document.getElementById('reelProgress');
    const updateBar = () => {
      const max = carousel.scrollWidth - carousel.clientWidth;
      const visible = carousel.clientWidth / carousel.scrollWidth;
      bar.style.width = `${Math.max(10, visible * 100)}%`;
      const p = max > 0 ? carousel.scrollLeft / max : 0;
      bar.style.transform = `translateX(${p * (100 / Math.max(0.1, visible) - 100)}%)`;
    };
    carousel.addEventListener('scroll', updateBar, { passive: true });
    window.addEventListener('resize', updateBar);
    updateBar();
  }
  // Terminbuchung: freie Zeiten kommen aus dem Google-Skript (EKT-MEDIEN/WEBSITE-BUCHUNG/Code.gs).
  // Geladen wird erst, wenn der Kontakt-Bereich in die Nähe kommt, nicht bei jedem Seitenaufruf.
  const booking = document.getElementById('booking');
  if (booking) {
    const endpoint = booking.dataset.endpoint;
    const daysEl = booking.querySelector('.booking-days');
    const timesEl = booking.querySelector('.booking-times');
    const form = booking.querySelector('.booking-form');
    const chosenEl = booking.querySelector('.booking-chosen');
    const errorEl = booking.querySelector('.booking-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const tz = 'Europe/Berlin';
    const fmt = (opts) => new Intl.DateTimeFormat('de-DE', { timeZone: tz, ...opts });
    const dayKey = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });
    const weekdayShort = fmt({ weekday: 'short' });
    const dateShort = fmt({ day: '2-digit', month: '2-digit' });
    const timeFmt = fmt({ hour: '2-digit', minute: '2-digit' });
    const longFmt = fmt({ weekday: 'long', day: '2-digit', month: '2-digit' });
    let byDay = new Map();
    let selectedSlot = null;

    const fail = () => {
      daysEl.innerHTML = '<span class="booking-hint">Der Kalender ist gerade nicht erreichbar. Schreib uns einfach per WhatsApp, wir melden uns sofort.</span>';
      timesEl.innerHTML = '';
    };

    const chip = (label, small, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.innerHTML = (small ? `<small>${small}</small>` : '') + label;
      b.addEventListener('click', () => {
        b.parentElement.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-checked', String(c === b)));
        onClick();
      });
      return b;
    };

    const showTimes = (key) => {
      timesEl.replaceChildren(...byDay.get(key).map(iso => chip(timeFmt.format(new Date(iso)), '', () => {
        selectedSlot = iso;
        const d = new Date(iso);
        chosenEl.textContent = `${longFmt.format(d)} um ${timeFmt.format(d)} Uhr · 20 Minuten per Google Meet`;
        form.hidden = false;
        errorEl.hidden = true;
      })));
      selectedSlot = null;
      form.hidden = true;
    };

    const render = (slots) => {
      byDay = new Map();
      slots.forEach(iso => {
        const key = dayKey.format(new Date(iso));
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(iso);
      });
      if (!byDay.size) {
        daysEl.innerHTML = '<span class="booking-hint">Gerade sind alle Termine vergeben. Schreib uns per WhatsApp, wir finden einen.</span>';
        timesEl.innerHTML = '';
        return;
      }
      daysEl.replaceChildren(...[...byDay.keys()].map(key => {
        const d = new Date(byDay.get(key)[0]);
        return chip(dateShort.format(d), weekdayShort.format(d).replace('.', ''), () => showTimes(key));
      }));
      timesEl.innerHTML = '<span class="booking-hint">Erst einen Tag wählen.</span>';
    };

    const load = () => fetch(`${endpoint}?action=slots`)
      .then(r => r.json())
      .then(data => render(data.slots || []))
      .catch(fail);

    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      load();
    }, { rootMargin: '900px' });
    near.observe(booking);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      let ok = true;
      ['name', 'email', 'phone'].forEach(n => {
        const input = form.elements[n];
        const bad = !input.value.trim() || (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()));
        input.setAttribute('aria-invalid', String(bad));
        if (bad) ok = false;
      });
      if (!ok || !selectedSlot) {
        errorEl.textContent = 'Bitte Name, E-Mail und Telefon ausfüllen.';
        errorEl.hidden = false;
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Wird reserviert …';
      // Ohne Content-Type-Header = "simple request", kein CORS-Preflight beim Google-Skript nötig
      fetch(endpoint, { method: 'POST', body: JSON.stringify({ ...data, slot: selectedSlot }) })
        .then(r => r.json())
        .then(res => {
          if (!res.ok) {
            errorEl.textContent = res.error || 'Das hat nicht geklappt. Bitte versuch es noch einmal.';
            errorEl.hidden = false;
            if (res.taken) load();
            return;
          }
          booking.querySelector('.booking-step').hidden = true;
          form.hidden = true;
          const done = booking.querySelector('.booking-done');
          done.querySelector('.booking-done-text').textContent =
            `${res.when}. Die Kalender-Einladung ist an ${data.email} unterwegs. Den Google-Meet-Link ergänzen wir darin in Kürze.`;
          done.hidden = false;
        })
        .catch(() => {
          errorEl.textContent = 'Das hat nicht geklappt. Bitte versuch es noch einmal oder schreib uns per WhatsApp.';
          errorEl.hidden = false;
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Termin reservieren';
        });
    });
  }
})();
