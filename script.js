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

// RSVP form: submits via a hidden iframe (bypasses CORS restrictions that
// can block direct fetch() calls to Google Apps Script from some browsers)
const form = document.getElementById('rsvpForm');
const formNote = document.getElementById('formNote');
const hiddenFrame = document.getElementById('hiddenRsvpFrame');
let rsvpSubmitted = false;

// --- Dynamic guest fields ---
const presenceRadios = form.querySelectorAll('input[name="presence"]');
const guestCountRow = document.getElementById('guestCountRow');
const guestCountSelect = document.getElementById('guestCount');
const guestsContainer = document.getElementById('guestsContainer');

function renderGuestFields() {
  const count = parseInt(guestCountSelect.value, 10) || 0;
  guestsContainer.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const card = document.createElement('div');
    card.className = 'guest-card';
    card.innerHTML = `
      <p class="guest-card-title">Convive ${i}</p>
      <div class="guest-card-grid">
        <div>
          <label for="guest_${i}_name">Prénom</label>
          <input type="text" id="guest_${i}_name" name="guest_${i}_name" required>
        </div>
        <div>
          <label for="guest_${i}_type">Adulte / Enfant</label>
          <select id="guest_${i}_type" name="guest_${i}_type">
            <option value="Adulte">Adulte</option>
            <option value="Enfant">Enfant</option>
          </select>
        </div>
        <div>
          <label for="guest_${i}_diet">Régime</label>
          <select id="guest_${i}_diet" name="guest_${i}_diet">
            <option value="Omnivore">Omnivore</option>
            <option value="Végétarien">Végétarien</option>
          </select>
        </div>
      </div>
    `;
    guestsContainer.appendChild(card);
  }
}

function updatePresenceUI() {
  const selected = form.querySelector('input[name="presence"]:checked');
  const isComing = selected && selected.value === 'oui';
  guestCountRow.hidden = !isComing;
  if (isComing) {
    renderGuestFields();
  } else {
    guestsContainer.innerHTML = '';
  }
}

presenceRadios.forEach(radio => radio.addEventListener('change', updatePresenceUI));
guestCountSelect.addEventListener('change', renderGuestFields);

// --- Submission ---

form.addEventListener('submit', (event) => {
  if (!form.action || form.action.includes('COLLE_TON_URL')) {
    formNote.textContent = "⚠️ Formulaire pas encore connecté.";
    formNote.style.color = '#c85a44';
    event.preventDefault();
    return;
  }
  rsvpSubmitted = true;
  formNote.textContent = 'Envoi en cours…';
  formNote.style.color = '#1b5a5a';
  // Let the browser submit the form normally into the hidden iframe.
});

hiddenFrame.addEventListener('load', () => {
  if (!rsvpSubmitted) return; // ignore the iframe's initial blank load
  formNote.textContent = 'Merci, votre réponse a bien été envoyée ! 🎉';
  formNote.style.color = '#1b5a5a';
  form.reset();
  rsvpSubmitted = false;
});
