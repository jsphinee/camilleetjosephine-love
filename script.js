// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Scroll progress wave
const wavePath = document.querySelector('.scroll-wave path');
const waveLength = wavePath.getTotalLength();
wavePath.style.strokeDasharray = waveLength;
wavePath.style.strokeDashoffset = waveLength;

function updateWave() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? scrollTop / docHeight : 0;
  wavePath.style.strokeDashoffset = waveLength - waveLength * progress;
}
window.addEventListener('scroll', updateWave, { passive: true });
updateWave();

// RSVP form: friendly inline confirmation (works once a real Formspree ID is set)
const form = document.getElementById('rsvpForm');
const formNote = document.getElementById('formNote');

form.addEventListener('submit', async (e) => {
  if (form.action.includes('VOTRE_ID_FORMSPREE')) {
    e.preventDefault();
    formNote.textContent = "⚠️ Formulaire pas encore connecté — voir les instructions pour configurer Formspree.";
    formNote.style.color = '#c85a44';
    return;
  }
  e.preventDefault();
  const data = new FormData(form);
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      formNote.textContent = 'Merci, votre réponse a bien été envoyée ! 🎉';
      formNote.style.color = '#1b5a5a';
      form.reset();
    } else {
      formNote.textContent = "Un souci est survenu, réessayez ou écrivez-nous directement.";
      formNote.style.color = '#c85a44';
    }
  } catch (err) {
    formNote.textContent = "Un souci est survenu, réessayez ou écrivez-nous directement.";
    formNote.style.color = '#c85a44';
  }
});
