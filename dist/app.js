const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Abrir menu'); mobileNav.hidden = true; }
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  menuButton.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
  mobileNav.hidden = expanded;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => { if (!document.querySelector('.site-header').contains(event.target)) closeMenu(); });

const galleryCards = [...document.querySelectorAll('.project-card')];
const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxTitle = document.querySelector('#lightbox-title');
const lightboxCount = document.querySelector('.lightbox-count');
let currentPhoto = 0;
let previousFocus;
function showPhoto(index) {
  currentPhoto = (index + galleryCards.length) % galleryCards.length;
  const card = galleryCards[currentPhoto];
  const thumbnail = card.querySelector('img');
  lightboxImage.src = thumbnail.src;
  lightboxImage.alt = thumbnail.alt;
  lightboxTitle.textContent = card.querySelector('.project-caption > span').textContent;
  lightboxCount.textContent = `${String(currentPhoto + 1).padStart(2, '0')} / ${String(galleryCards.length).padStart(2, '0')}`;
}
galleryCards.forEach((card, index) => card.addEventListener('click', () => {
  previousFocus = card;
  showPhoto(index);
  lightbox.showModal();
  document.body.style.overflow = 'hidden';
}));
document.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
document.querySelector('.lightbox-prev').addEventListener('click', () => showPhoto(currentPhoto - 1));
document.querySelector('.lightbox-next').addEventListener('click', () => showPhoto(currentPhoto + 1));
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(currentPhoto - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(currentPhoto + 1); }
});
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
lightbox.addEventListener('close', () => {
  document.body.style.overflow = '';
  previousFocus?.focus({ preventScroll: true });
});
window.matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
