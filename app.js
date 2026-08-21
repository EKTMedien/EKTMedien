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

  // Lazy autoplay: any muted loop video only loads/plays once it scrolls into view
  const setupLazyAutoplay = (videos, root) => {
    if (!videos.length) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            if (!video.src) video.src = video.dataset.src;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { root, threshold: 0.25 });
      videos.forEach(video => io.observe(video));
    } else {
      videos.forEach(video => { video.src = video.dataset.src; video.play().catch(() => {}); });
    }
  };
  setupLazyAutoplay(document.querySelectorAll('.reel-video video[data-src]'), document.getElementById('reelCarousel'));
  setupLazyAutoplay(document.querySelectorAll('.format-video video[data-src]'), null);
})();
