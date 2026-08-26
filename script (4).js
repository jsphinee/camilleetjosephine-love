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

// --- RSVP dynamic fields ---
const presenceRadios = form.querySelectorAll('input[name="presence"]');
const contactProfileRow = document.getElementById('contactProfileRow');
const contactProfileSelect = document.getElementById('contactProfile');
const householdBox = document.getElementById('householdSuggestions');
const contactFirstname = document.getElementById('contact_firstname');
const contactLastname = document.getElementById('contact_lastname');
const extraGuestsSection = document.getElementById('extraGuestsSection');
const extraGuestsContainer = document.getElementById('extraGuestsContainer');
const addGuestBtn = document.getElementById('addGuestBtn');

let householdLookupDone = false;
let extraGuestCounter = 0; // identifiants uniques pour les cartes ajoutées manuellement

const PROFILE_OPTIONS = `
  <option value="Adulte - Omnivore">Adulte - Omnivore</option>
  <option value="Adulte - Végétarien">Adulte - Végétarien</option>
  <option value="Enfant - Omnivore">Enfant - Omnivore</option>
  <option value="Enfant - Végétarien">Enfant - Végétarien</option>
  <option value="Bébé">Bébé</option>
`;

function updatePresenceUI() {
  const selected = form.querySelector('input[name="presence"]:checked');
  const isComing = selected && selected.value === 'oui';
  contactProfileRow.hidden = !isComing;
  extraGuestsSection.hidden = !isComing;
  if (isComing) {
    maybeLookupHousehold();
  } else {
    householdBox.hidden = true;
    householdBox.innerHTML = '';
    extraGuestsContainer.innerHTML = '';
  }
}

presenceRadios.forEach(radio => radio.addEventListener('change', updatePresenceUI));

contactLastname.addEventListener('blur', () => {
  const selected = form.querySelector('input[name="presence"]:checked');
  if (selected && selected.value === 'oui') maybeLookupHousehold();
});

// --- Recherche du foyer (via JSONP pour contourner les restrictions CORS d'Apps Script) ---
function maybeLookupHousehold() {
  const firstname = contactFirstname.value.trim();
  const lastname = contactLastname.value.trim();
  if (!firstname || !lastname || householdLookupDone) return;

  const scriptURL = form.dataset.scriptUrl;
  if (!scriptURL || scriptURL.includes('COLLE_TON_URL')) return;
  householdLookupDone = true;

  const callbackName = 'householdCb_' + Date.now();
  window[callbackName] = function (data) {
    renderHouseholdSuggestions(data || {});
    delete window[callbackName];
    scriptTag.remove();
  };

  const scriptTag = document.createElement('script');
  const params = new URLSearchParams({
    action: 'household',
    prenom: firstname,
    nom: lastname,
    callback: callbackName
  });
  scriptTag.src = scriptURL + '?' + params.toString();
  scriptTag.onerror = () => { delete window[callbackName]; householdLookupDone = false; };
  document.body.appendChild(scriptTag);
}

function renderHouseholdSuggestions(data) {
  const members = data.members || [];

  if (data.found === false) {
    householdBox.hidden = false;
    householdBox.innerHTML = '<p class="household-note">Nous n\'avons pas retrouvé votre nom sur notre liste — pas de souci, vous pouvez continuer votre réponse normalement.</p>';
    return;
  }

  if (!members.length) {
    householdBox.hidden = true;
    householdBox.innerHTML = '';
    return;
  }

  householdBox.hidden = false;
  householdBox.innerHTML = '<p>Nous avons trouvé ces membres de votre foyer :</p>';
  members.forEach(m => {
    const row = document.createElement('div');
    row.className = 'household-row';
    row.innerHTML = `
      <div class="household-row-name">${m.prenom} ${m.nom}</div>
      <div class="household-row-fields">
        <select class="household-presence">
          <option value="non" selected>Ne sera pas présent(e)</option>
          <option value="oui">Sera présent(e)</option>
        </select>
        <select class="household-profile" hidden>${PROFILE_OPTIONS}</select>
      </div>
    `;
    householdBox.appendChild(row);

    const presenceSelect = row.querySelector('.household-presence');
    const profileSelect = row.querySelector('.household-profile');
    presenceSelect.addEventListener('change', () => {
      profileSelect.hidden = presenceSelect.value !== 'oui';
    });
  });
}

// --- Convives ajoutés manuellement (non trouvés dans la liste) ---
addGuestBtn.addEventListener('click', () => {
  extraGuestCounter++;
  const id = extraGuestCounter;
  const card = document.createElement('div');
  card.className = 'guest-card';
  card.dataset.extraId = id;
  card.innerHTML = `
    <div class="guest-card-header">
      <p class="guest-card-title">Convive supplémentaire</p>
      <button type="button" class="remove-guest-btn" aria-label="Retirer ce convive">✕</button>
    </div>
    <div class="guest-card-grid">
      <div>
        <label>Prénom</label>
        <input type="text" class="extra-firstname" required>
      </div>
      <div>
        <label>Nom</label>
        <input type="text" class="extra-lastname" required>
      </div>
      <div>
        <label>Profil</label>
        <select class="extra-profile">${PROFILE_OPTIONS}</select>
      </div>
    </div>
  `;
  extraGuestsContainer.appendChild(card);
  card.querySelector('.remove-guest-btn').addEventListener('click', () => card.remove());
});

// --- Compilation finale des convives juste avant l'envoi ---
function collectFinalGuests() {
  const guests = [];

  // Convive 1 : le contact lui-même
  guests.push({
    firstname: contactFirstname.value.trim(),
    lastname: contactLastname.value.trim(),
    profile: contactProfileSelect.value
  });

  // Membres du foyer marqués "Sera présent(e)"
  householdBox.querySelectorAll('.household-row').forEach(row => {
    const presenceSelect = row.querySelector('.household-presence');
    if (presenceSelect.value === 'oui') {
      const name = row.querySelector('.household-row-name').textContent.trim();
      const [firstname, ...rest] = name.split(' ');
      guests.push({
        firstname,
        lastname: rest.join(' '),
        profile: row.querySelector('.household-profile').value
      });
    }
  });

  // Convives ajoutés manuellement
  extraGuestsContainer.querySelectorAll('.guest-card').forEach(card => {
    const firstname = card.querySelector('.extra-firstname').value.trim();
    const lastname = card.querySelector('.extra-lastname').value.trim();
    if (firstname || lastname) {
      guests.push({ firstname, lastname, profile: card.querySelector('.extra-profile').value });
    }
  });

  return guests;
}

function injectHiddenGuestFields() {
  // Retire les champs cachés d'un envoi précédent
  form.querySelectorAll('input[data-injected="1"]').forEach(el => el.remove());

  const selected = form.querySelector('input[name="presence"]:checked');
  const isComing = selected && selected.value === 'oui';
  const guests = isComing ? collectFinalGuests() : [];

  const addHidden = (name, value) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    input.dataset.injected = '1';
    form.appendChild(input);
  };

  addHidden('guestCount', String(guests.length));
  guests.forEach((g, idx) => {
    const i = idx + 1;
    addHidden(`guest_${i}_firstname`, g.firstname);
    addHidden(`guest_${i}_lastname`, g.lastname);
    addHidden(`guest_${i}_profile`, g.profile);
  });
}

// --- Submission ---

form.addEventListener('submit', (event) => {
  if (!form.action || form.action.includes('COLLE_TON_URL')) {
    formNote.textContent = "⚠️ Formulaire pas encore connecté.";
    formNote.style.color = '#c85a44';
    event.preventDefault();
    return;
  }
  injectHiddenGuestFields();
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
  extraGuestsContainer.innerHTML = '';
  householdBox.innerHTML = '';
  householdBox.hidden = true;
  contactProfileRow.hidden = true;
  extraGuestsSection.hidden = true;
  householdLookupDone = false;
  rsvpSubmitted = false;
});
