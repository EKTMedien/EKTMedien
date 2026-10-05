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
  document.querySelectorAll('.testi-grid, .google-grid, .plans, .formats-grid, .steps').forEach(group => {
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
  setupLazyAutoplay(document.querySelectorAll('.format-video video[data-src]'), null);
  setupLazyAutoplay(document.querySelectorAll('.about-media video[data-src]'), null);

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

  // Statement text: words light up one after another while scrolling past
  const statement = document.querySelector('[data-words]');
  let words = [];
  if (statement && !reduceMotion) {
    statement.innerHTML = statement.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    words = [...statement.querySelectorAll('.w')];
  }
  const updateWords = () => {
    if (!words.length) return;
    const r = statement.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  };

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
      updateWords();
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
})();
