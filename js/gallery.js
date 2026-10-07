// Lightbox for project galleries: click a thumbnail to view it full size,
// use arrow keys or the on-screen buttons to move within that project.
(() => {
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
