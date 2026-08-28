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

  // Lazy autoplay: video metadata/first frame loads right away (preload="metadata")
  // so there's never a black flash, but playback only starts once scrolled into view.
  const setupLazyAutoplay = (videos, root) => {
    if (!videos.length) return;
    videos.forEach(video => { if (!video.src) video.src = video.dataset.src; });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { root, threshold: 0.25 });
      videos.forEach(video => io.observe(video));
    } else {
      videos.forEach(video => video.play().catch(() => {}));
    }
  };
  setupLazyAutoplay(document.querySelectorAll('.reel-video video[data-src]'), document.getElementById('reelCarousel'));
  setupLazyAutoplay(document.querySelectorAll('.format-video video[data-src]'), null);

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
