(() => {
  // Mobile nav drawer
  const toggle = document.getElementById('navToggle');
  const drawer = document.getElementById('mobileDrawer');
  const closeBtn = document.getElementById('drawerClose');

  const openDrawer = () => { drawer.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); };
  const closeDrawer = () => { drawer.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };

  toggle?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
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
  setupLazyAutoplay(document.querySelectorAll('.reel-video video[data-src]'), document.getElementById('reelCarousel'));
  setupLazyAutoplay(document.querySelectorAll('.format-video video[data-src]'), null);
  setupLazyAutoplay(document.querySelectorAll('.about-media video[data-src]'), null);

  // About photos are hidden by CSS below 900px - don't download them there at all.
  const desktopOnlyImgs = document.querySelectorAll('img[data-desktop-only][data-src]');
  if (desktopOnlyImgs.length) {
    const mq = window.matchMedia('(min-width: 901px)');
    const loadImgs = () => {
      if (!mq.matches) return;
      desktopOnlyImgs.forEach(img => { if (!img.src) img.src = img.dataset.src; });
      mq.removeEventListener('change', loadImgs);
    };
    loadImgs();
    mq.addEventListener('change', loadImgs);
  }

  // Drag-to-scroll for the reel carousel (mouse/trackpad; touch scrolls natively)
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
  }
})();
