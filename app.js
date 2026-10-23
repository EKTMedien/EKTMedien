(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Startsequenz: Die Hero-Einblendung und die Partikel starten erst, wenn Schriften und Layout stehen
  // (.is-ready). Vorher baut der Browser die Seite zweimal komplett auf; liefen die Animationen dabei
  // schon, sprangen sie am Anfang. Sicherheitsnetz: spätestens nach 2,5 s geht es los.
  const rootEl = document.documentElement;
  const readyCbs = [];
  const whenReady = (fn) => (rootEl.classList.contains('is-ready') ? fn() : readyCbs.push(fn));
  const markReady = () => {
    if (rootEl.classList.contains('is-ready')) return;
    rootEl.classList.add('is-ready');
    readyCbs.splice(0).forEach(fn => fn());
  };
  const domReady = new Promise(r => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r, { once: true }) : r()));
  Promise.all([domReady, document.fonts ? document.fonts.ready : Promise.resolve()])
    .then(() => requestAnimationFrame(() => requestAnimationFrame(markReady)));
  setTimeout(markReady, 2500);
  // iOS Safari zeigt :active-Zustände nur, wenn irgendein touchstart-Listener existiert
  document.addEventListener('touchstart', () => {}, { passive: true });

  // Nav: background once scrolled, hides while scrolling down, returns when scrolling up
  const nav = document.getElementById('nav');
  let lastY = window.scrollY;
  const onNavScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 600 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  };

  // 3D-Tiefe im Hero: Maus (nur echte Maus/Trackpad) neigt die Headline leicht, Partikel (particles.js
  // liest window.heroDepth) verschieben sich je nach Tiefe; beim Scrollen bleibt der Inhalt zurück.
  // Werte werden weich nachgezogen und nur gesetzt, wenn sie sich ändern; außerhalb des Heros ruht alles.
  const hero = document.querySelector('.hero');
  if (hero && !reduceMotion) {
    const depth = window.heroDepth = { x: 0, y: 0, s: 0 };
    let tx = 0, ty = 0, visible = true, raf = 0, last = '';
    let heroH = hero.offsetHeight || 1; // zwischengespeichert, nicht pro Frame lesen (erzwingt sonst Layout)
    window.addEventListener('resize', () => { heroH = hero.offsetHeight || 1; });
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        ty = ((e.clientY - r.top) / r.height) * 2 - 1;
        kick();
      });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
    }
    const tick = () => {
      raf = 0;
      depth.x += (tx - depth.x) * 0.07;
      depth.y += (ty - depth.y) * 0.07;
      depth.s = Math.min(1, Math.max(0, window.scrollY / heroH));
      const key = `${depth.x.toFixed(3)}|${depth.y.toFixed(3)}|${depth.s.toFixed(3)}`;
      if (key !== last) {
        last = key;
        hero.style.setProperty('--hx', depth.x.toFixed(3));
        hero.style.setProperty('--hy', depth.y.toFixed(3));
        hero.style.setProperty('--hs', depth.s.toFixed(3));
      }
      if (visible && (Math.abs(tx - depth.x) > 0.001 || Math.abs(ty - depth.y) > 0.001)) kick();
    };
    function kick() { if (!raf && visible) raf = requestAnimationFrame(tick); }
    window.addEventListener('scroll', kick, { passive: true });
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) kick(); }).observe(hero);
  }

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

  // Lazy loading + autoplay: a video's bytes (and its small poster) are only fetched once it comes
  // close to the viewport, and playback starts when it's actually visible. Until then the
  // container's indigo gradient shows through, so there is no black flash.
  // iPhones only keep a limited number of video decoders alive; paused reels that were scrolled
  // past kept theirs, so later videos (Kampagne & Produktion) stayed blank. Videos that are far
  // off screen are therefore released again and reloaded from the browser cache on return.
  // If autoplay is blocked (e.g. iOS Low Power Mode), the poster stays and a tap starts the video.
  const setupLazyAutoplay = (videos, root) => {
    if (!videos.length) return;

    const load = (video) => {
      if (video.dataset.poster && !video.poster) video.poster = video.dataset.poster;
      if (video.getAttribute('src') || !video.dataset.src) return;
      video.preload = 'auto';
      video.src = video.dataset.src;
    };
    const release = (video) => {
      if (!video.getAttribute('src')) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
    const play = (video) => {
      video.play().catch(() => {
        video.closest('.media, .reel')?.addEventListener('click', () => video.play().catch(() => {}), { once: true });
      });
    };

    if ('IntersectionObserver' in window) {
      const near = new IntersectionObserver((entries) => {
        entries.forEach(entry => (entry.isIntersecting ? load : release)(entry.target));
      }, { root, rootMargin: '600px', threshold: 0 });

      const player = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            load(video);
            play(video);
          } else {
            video.pause();
          }
        });
      }, { root, threshold: 0.25 });

      videos.forEach(video => { near.observe(video); player.observe(video); });
    } else {
      videos.forEach(video => { load(video); play(video); });
    }
  };
  // Reels use the viewport as root too: the carousel's overflow clips them, so a reel is only
  // fetched once it is both on screen and scrolled into the carousel. (With the carousel as
  // root, every reel in its first screen width loaded on page load, ~6 MB per visit.)
  setupLazyAutoplay(document.querySelectorAll('.reel-video video[data-src]'), null);
  setupLazyAutoplay(document.querySelectorAll('.plan-video video[data-src]'), null);
  setupLazyAutoplay(document.querySelectorAll('.about-media video[data-src]'), null);

  // Quick cut in the project package: the label follows the cuts of schnelldurchlauf-v4.mp4
  // (Revive-Sequenz aus dem Original, Sek. 11,72–17,36: Shirt-Rücken, Nähmaschine, Stick-Logo, Logo-Karte)
  const planVideo = document.querySelector('.plan-video video');
  const planTag = document.getElementById('planTag');
  if (planVideo && planTag) {
    const labels = ['Imagefilm', 'Werbespot', 'Recruiting-Video', 'Produktvideo', 'Event'];
    const cuts = [0, 1.96, 4.32, 9.92, 11.92]; // Startzeit jedes Clips in Sekunden
    const sync = () => {
      let i = cuts.length - 1;
      while (i > 0 && planVideo.currentTime < cuts[i]) i--;
      const label = labels[i];
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

  // Positionen einmal messen (Layout-Werte ohne Transforms) statt in jedem Scroll-Frame
  // getBoundingClientRect() nach Style-Änderungen aufzurufen: das erzwang mehrmals pro Frame eine
  // komplette Layout-Neuberechnung (Ruckeln direkt nach dem Hero). Neu gemessen wird nur bei
  // Größenänderungen (Resize, nachladende Bilder/Schriften).
  const geo = new Map();
  let vh = window.innerHeight;
  const docTop = (el) => { let t = 0; for (let n = el; n; n = n.offsetParent) t += n.offsetTop; return t; };
  const track = (el) => { if (el) geo.set(el, { top: 0, h: 0 }); };
  const remeasure = () => {
    vh = window.innerHeight;
    geo.forEach((g, el) => { g.top = docTop(el); g.h = el.offsetHeight; });
  };
  const topOf = (el) => geo.get(el).top - window.scrollY;
  const heightOf = (el) => geo.get(el).h;

  // Process rail fills with scroll progress; steps light up as the fill reaches them
  const steps = document.getElementById('steps');
  track(steps);
  const stepEls = steps ? [...steps.querySelectorAll('.step')] : [];
  const updateSteps = () => {
    if (!steps) return;
    const p = Math.min(1, Math.max(0, (vh * 0.7 - topOf(steps)) / (heightOf(steps) * 0.9)));
    steps.style.setProperty('--p', p.toFixed(3));
    stepEls.forEach((s, i) => s.classList.toggle('is-active', p >= i / stepEls.length + 0.02 || p === 1));
  };

  // Kamera-Set. Alles läuft über den Scroll-Fortschritt, nicht über Zeit: wer stoppt, sieht ein Standbild.
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);
  const tc = (frames) => {
    const f = frames % 25, s = Math.floor(frames / 25) % 60, m = Math.floor(frames / 1500) % 60;
    return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  // Objektiv: Blende (7 Lamellen) öffnet von f/16 auf f/1.4, Fokusring dreht, der Satz wird scharf,
  // zum Schluss geht's durch die Linse in die nächste Sektion.
  const lensSec = document.querySelector('.lens-sec');
  track(lensSec);
  let updateLens = () => {};
  if (lensSec) {
    const stage = lensSec.querySelector('.lens-stage');
    const wrap = lensSec.querySelector('.lens-wrap');
    const iris = lensSec.querySelector('.ln-iris');
    const blades = lensSec.querySelector('.ln-blades');
    const edge = lensSec.querySelector('.ln-edge');
    const tcEl = lensSec.querySelector('.vf-tc');
    const fEl = lensSec.querySelector('.vf-f');
    const NS = 'http://www.w3.org/2000/svg';
    const ticks = lensSec.querySelector('.ln-ticks');
    for (let i = 0; i < 90; i++) {
      const a = (i * 4 - 90) * Math.PI / 180, major = i % 5 === 0;
      const l = document.createElementNS(NS, 'line');
      const r1 = major ? 153 : 158;
      l.setAttribute('x1', (Math.cos(a) * r1).toFixed(1)); l.setAttribute('y1', (Math.sin(a) * r1).toFixed(1));
      l.setAttribute('x2', (Math.cos(a) * 166).toFixed(1)); l.setAttribute('y2', (Math.sin(a) * 166).toFixed(1));
      if (major) l.setAttribute('class', 'is-major');
      ticks.appendChild(l);
    }
    const nums = lensSec.querySelector('.ln-nums');
    ['∞', '10', '5', '3', '2', '1.5', '1.2', '1', '0.8', '0.6'].forEach((n, i) => {
      const a = (i * 24 - 90) * Math.PI / 180;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', (Math.cos(a) * 141).toFixed(1)); t.setAttribute('y', (Math.sin(a) * 141).toFixed(1));
      t.textContent = n;
      nums.appendChild(t);
    });

    const N = 7, R = 110, A_MIN = 13, A_MAX = 100;
    const STOPS = ['16', '11', '8', '5.6', '4', '2.8', '2', '1.4'];
    const pt = (x, y) => `${x.toFixed(2)} ${y.toFixed(2)}`;
    const setIris = (o) => {
      const a = A_MIN + (A_MAX - A_MIN) * o;
      const phi = (1 - o) * 0.75 - Math.PI / 2;
      const v = [];
      for (let k = 0; k < N; k++) v.push([Math.cos(phi + k * 2 * Math.PI / N) * a, Math.sin(phi + k * 2 * Math.PI / N) * a]);
      const poly = 'M ' + v.map(p => pt(p[0], p[1])).join(' L ') + ' Z';
      iris.setAttribute('d', `M ${R} 0 A ${R} ${R} 0 1 0 ${-R} 0 A ${R} ${R} 0 1 0 ${R} 0 Z ${poly}`);
      edge.setAttribute('d', poly);
      // Lamellen-Kanten: jede Kante der Öffnung läuft als Linie weiter bis zum Rand
      let d = '';
      for (let k = 0; k < N; k++) {
        const [px, py] = v[k], [qx, qy] = v[(k + 1) % N];
        let dx = qx - px, dy = qy - py; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
        const b = px * dx + py * dy, c = px * px + py * py - R * R;
        const t = -b + Math.sqrt(Math.max(0, b * b - c));
        d += `M ${pt(px, py)} L ${pt(px + dx * t, py + dy * t)} `;
      }
      blades.setAttribute('d', d);
      fEl.textContent = 'f/' + STOPS[Math.round(o * (STOPS.length - 1))];
    };
    setIris(reduceMotion ? 1 : 0);

    let lastKey = '', lastOpen = -1, lastTc = '';
    let glass = 1;
    const measureLens = () => { glass = wrap.offsetWidth * 110 / 400; };
    window.addEventListener('resize', measureLens);
    measureLens();
    updateLens = () => {
      if (reduceMotion) return;
      const top = topOf(lensSec), height = heightOf(lensSec);
      if (top + height < 0 || top > vh) return;
      const p = clamp01(-top / Math.max(1, height - vh));
      const key = p.toFixed(4);
      if (key === lastKey) return;
      lastKey = key;
      const open = ease(clamp01(p / 0.5));
      const focus = ease(clamp01((p - 0.16) / 0.36));
      const zoom = clamp01((p - 0.66) / 0.34);
      // Blende nur neu zeichnen, wenn sie sich sichtbar ändert (beim Durchzoomen ist sie längst offen;
      // sonst würde das bildschirmgroße Objektiv in jedem Frame neu gerastert)
      if (Math.abs(open - lastOpen) > 0.002 || (open === 1 && lastOpen !== 1)) { setIris(open); lastOpen = open; }
      // Bis Bildschirmdiagonale durch die Glasfläche (Radius 110 von 400) passt
      const cover = Math.hypot(window.innerWidth, vh) / (2 * glass) * 1.15;
      const z = 1 + Math.pow(zoom, 2.4) * (cover - 1);
      const st = stage.style;
      st.setProperty('--open', open.toFixed(3));
      st.setProperty('--fr', `${(-150 * focus).toFixed(1)}deg`);
      st.setProperty('--z', z.toFixed(3));
      st.setProperty('--lo', (1 - clamp01((zoom - 0.72) / 0.28)).toFixed(3));
      st.setProperty('--to', (focus * (1 - clamp01(zoom / 0.3))).toFixed(3));
      st.setProperty('--tb', `${(7 * (1 - focus) + 6 * clamp01(zoom / 0.3)).toFixed(2)}px`);
      st.setProperty('--ty', `${(24 * (1 - focus) + 30 * zoom).toFixed(1)}px`);
      st.setProperty('--vo', (1 - clamp01(zoom / 0.45)).toFixed(3));
      const tcText = tc(Math.round(p * 260));
      if (tcText !== lastTc) { tcEl.textContent = tcText; lastTc = tcText; }
    };
  }

  // Smartphone dreht sich von der Kamera-Rückseite auf den Bildschirm, während die Arbeit-Sektion reinkommt
  const phoneProp = document.getElementById('propPhone');
  track(phoneProp);
  const updatePhone = () => {
    if (!phoneProp) return;
    const pr = reduceMotion ? 1 : ease(clamp01((vh * 0.95 - topOf(phoneProp)) / (vh * 0.55)));
    phoneProp.style.setProperty('--pr', pr.toFixed(3));
  };

  // Filmklappe: offen, solange der Ablauf-Fortschritt vor „Drehtag" liegt, dann Klappe zu
  const clapProp = document.getElementById('propClap');
  const clapTc = clapProp?.querySelector('.cl-tc');
  const updateClap = () => {
    if (!clapProp || !steps) return;
    const p = parseFloat(steps.style.getPropertyValue('--p')) || 0;
    const shut = reduceMotion || p >= 1 / 3 + 0.02;
    clapProp.style.setProperty('--cl', shut ? '0' : (1 - 0.35 * clamp01(p * 3)).toFixed(3));
    clapProp.classList.toggle('is-shut', shut);
    if (clapTc) clapTc.textContent = tc(Math.round(p * 600));
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onNavScroll();
      updateSteps();
      updateLens();
      updatePhone();
      updateClap();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { remeasure(); onScroll(); });
  remeasure();
  if ('ResizeObserver' in window) new ResizeObserver(() => { remeasure(); onScroll(); }).observe(document.body);
  window.addEventListener('load', () => { remeasure(); onScroll(); }, { once: true });
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
    // Erst messen/klonen, wenn die Hero-Einblendung läuft und die Seite steht (statt beim Seitenaufbau)
    whenReady(() => (window.requestIdleCallback || setTimeout)(fill));
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
        if (window.matchMedia('(max-width: 820px)').matches) {
          requestAnimationFrame(() => chosenEl.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
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

    let slotsRequest = null;
    const load = (force) => {
      if (slotsRequest && !force) return slotsRequest;
      slotsRequest = fetch(`${endpoint}?action=slots`)
        .then(r => r.json())
        .then(data => render(data.slots || []))
        .catch(fail);
      return slotsRequest;
    };

    // Das Google-Skript braucht ~1-2 s zum Antworten. Deshalb die freien Zeiten still im Hintergrund
    // holen, sobald die Seite fertig ist; spätestens aber, wenn jemand Richtung Kontakt scrollt/tippt.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    const prefetch = () => idle(() => load());
    if (document.readyState === 'complete') prefetch();
    else window.addEventListener('load', prefetch, { once: true });
    document.querySelectorAll('a[href="#kontakt"]').forEach(a => a.addEventListener('pointerdown', () => load(), { once: true }));
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      load();
    }, { rootMargin: '900px' }).observe(booking);

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
      // Sofort "reserviert" zeigen; die Eintragung (Kalender, Einladung, Mail) dauert beim Google-Skript
      // einige Sekunden und läuft im Hintergrund. Nur bei einem Fehler springt das Formular zurück.
      const step = booking.querySelector('.booking-step');
      const done = booking.querySelector('.booking-done');
      const d = new Date(selectedSlot);
      done.querySelector('.booking-done-text').textContent =
        `${longFmt.format(d)} um ${timeFmt.format(d)} Uhr. Die Kalender-Einladung ist an ${data.email.trim()} unterwegs. Den Google-Meet-Link ergänzen wir darin in Kürze.`;
      step.hidden = true;
      form.hidden = true;
      done.hidden = false;
      done.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const undo = (message, reload) => {
        done.hidden = true;
        step.hidden = false;
        form.hidden = false;
        errorEl.textContent = message;
        errorEl.hidden = false;
        if (reload) { form.hidden = true; load(true); }
        booking.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      // keepalive: die Reservierung kommt auch an, wenn der Kunde die Seite direkt nach dem Klick schließt
      fetch(endpoint, { method: 'POST', keepalive: true, body: JSON.stringify({ ...data, slot: selectedSlot }) })
        .then(r => r.json())
        .then(res => {
          if (!res.ok) undo(res.error || 'Das hat nicht geklappt. Bitte versuch es noch einmal.', res.taken);
        })
        .catch(() => undo('Das hat nicht geklappt. Bitte versuch es noch einmal oder schreib uns per WhatsApp.'));
    });
  }
})();
