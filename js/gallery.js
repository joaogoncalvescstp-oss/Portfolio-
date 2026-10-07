// Project sliders (one photo at a time, swipe/arrows/dots, optional slideshow)
// plus a lightbox: click a slide to view it full size.
(() => {
  const SLIDE_MS = 4000;

  document.querySelectorAll('.slider').forEach((slider) => {
    const track = slider.querySelector('.slides');
    const slides = [...track.querySelectorAll('.shot')];
    if (slides.length < 2) { slider.classList.add('single'); return; }

    const bar = document.createElement('div');
    bar.className = 'slider-bar';
    bar.innerHTML = `
      <button class="prev" aria-label="Previous photo">‹</button>
      <button class="next" aria-label="Next photo">›</button>
      <div class="dots">${slides.map((_, i) => `<button class="dot" aria-label="Photo ${i + 1}"></button>`).join('')}</div>
      <span class="count"></span>
      <button class="play" aria-label="Play slideshow" title="Slideshow">▶</button>`;
    slider.append(bar);

    const dots = [...bar.querySelectorAll('.dot')];
    const count = bar.querySelector('.count');
    const play = bar.querySelector('.play');
    let current = 0;
    let timer = null;

    const goTo = (i) => {
      const n = (i + slides.length) % slides.length;
      track.scrollTo({ left: slides[n].offsetLeft - track.offsetLeft, behavior: 'smooth' });
    };

    const update = () => {
      current = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
      count.textContent = `${current + 1} / ${slides.length}`;
    };

    const stop = () => {
      clearInterval(timer);
      timer = null;
      play.textContent = '▶';
      play.classList.remove('active');
      play.setAttribute('aria-label', 'Play slideshow');
    };

    const start = () => {
      timer = setInterval(() => goTo(current + 1), SLIDE_MS);
      play.textContent = '❚❚';
      play.classList.add('active');
      play.setAttribute('aria-label', 'Pause slideshow');
    };

    bar.querySelector('.prev').addEventListener('click', () => goTo(current - 1));
    bar.querySelector('.next').addEventListener('click', () => goTo(current + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
    play.addEventListener('click', () => (timer ? stop() : start()));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    track.tabIndex = 0;
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    });
    update();
  });

  const box = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-cap');
  let shots = [];
  let index = 0;

  function show(i) {
    index = (i + shots.length) % shots.length;
    const shot = shots[index];
    const alt = shot.querySelector('img').alt;
    img.src = shot.href;
    img.alt = alt;
    cap.textContent = `${alt}  ·  ${index + 1} / ${shots.length}`;
    box.classList.toggle('single', shots.length < 2);
  }

  document.querySelectorAll('.gallery').forEach((gallery) => {
    const items = [...gallery.querySelectorAll('.shot')];
    items.forEach((shot, i) => {
      shot.addEventListener('click', (e) => {
        e.preventDefault();
        shot.closest('.slider').querySelector('.play.active')?.click(); // pause slideshow
        shots = items;
        show(i);
        box.showModal();
      });
    });
  });

  box.addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    if (act === 'prev') show(index - 1);
    else if (act === 'next') show(index + 1);
    else if (act === 'close' || e.target === box) box.close();
  });

  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  box.addEventListener('close', () => { img.removeAttribute('src'); });
})();
