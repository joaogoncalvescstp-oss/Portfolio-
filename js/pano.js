// Full-screen street-elevation panorama. The section is given extra height equal
// to how far the image strip overflows the screen; while its sticky child is
// pinned, vertical scrolling moves the strip horizontally. Horizontal wheel or
// swipe gestures are turned into vertical scroll so they pan it too.
(() => {
  const PAN_PER_SCROLL = 2; // pixels panned per pixel scrolled
  const section = document.getElementById('elevations');
  if (!section) return;
  const sticky = section.querySelector('.pano-sticky');
  const track = section.querySelector('.pano-track');
  const bar = section.querySelector('.pano-progress span');
  let distance = 0; // how far the strip pans
  let runway = 0; // how far the page scrolls while pinned

  function layout() {
    distance = Math.max(0, track.scrollWidth - sticky.clientWidth);
    runway = distance / PAN_PER_SCROLL;
    section.style.height = `${sticky.clientHeight + runway}px`;
    update();
  }

  function update() {
    const top = section.getBoundingClientRect().top;
    const p = runway ? Math.min(1, Math.max(0, -top / runway)) : 0;
    track.style.transform = `translate3d(${-p * distance}px, 0, 0)`;
    bar.style.width = `${p * 100}%`;
    section.classList.toggle('started', p > 0.02);
  }

  const pinned = () => {
    const r = section.getBoundingClientRect();
    return r.top <= 1 && r.bottom >= sticky.clientHeight - 1;
  };

  // Trackpads and tilt wheels send deltaX: pan with them while pinned
  section.addEventListener('wheel', (e) => {
    if (pinned() && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      window.scrollBy(0, e.deltaX / PAN_PER_SCROLL);
    }
  }, { passive: false });

  // Sideways swipes on touch screens
  let lastX = null;
  sticky.addEventListener('touchstart', (e) => { lastX = e.touches[0].clientX; }, { passive: true });
  sticky.addEventListener('touchmove', (e) => {
    if (lastX === null) return;
    const x = e.touches[0].clientX;
    window.scrollBy(0, (lastX - x) / PAN_PER_SCROLL);
    lastX = x;
  }, { passive: true });
  sticky.addEventListener('touchend', () => { lastX = null; });

  // Snap: when scrolling stops with the panorama partly on screen (entering
  // from above or leaving from below), settle it so it fills the screen.
  let snapTimer;
  function snap() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = section.getBoundingClientRect();
    const zone = window.innerHeight * 0.35;
    if (r.top > 0 && r.top < zone) window.scrollBy({ top: r.top, behavior: 'smooth' });
    const pastEnd = sticky.clientHeight - r.bottom; // >0 once the end has scrolled up
    if (pastEnd > 0 && pastEnd < zone) window.scrollBy({ top: -pastEnd, behavior: 'smooth' });
  }

  window.addEventListener('scroll', () => {
    requestAnimationFrame(update);
    clearTimeout(snapTimer);
    snapTimer = setTimeout(snap, 140);
  }, { passive: true });
  window.addEventListener('resize', layout);
  track.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', layout);
  });
  layout();
})();
