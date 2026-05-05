const S = {
  tasks: [], fin: [], recurring: [], stocks: [], routines: [], workoutLog: [], prs: {},
  kanban: { todo:[], doing:[], done:[] }, eis: { ui:[], ni:[], un:[], nn:[] },
  pomo: { sessions: 0 }, activePeriod: 'mes', activeRoutine: null, finNotes: "" 
};

function save() { localStorage.setItem('dancab_v1', JSON.stringify(S)); }

function load() {
  try {
    const d = localStorage.getItem('dancab_v1');
    if (d) Object.assign(S, JSON.parse(d));
    if (!S.workoutLog) S.workoutLog = [];
    if (!S.prs) S.prs = {};
    if (S.stocks) {
      S.stocks.forEach(s => {
        if (s.purchases === undefined) {
          s.purchases = [];
          if (s.shares && s.shares > 0) {
            s.purchases.push({ id: uid(), date: today(), shares: s.shares, price: s.avg, invested: s.shares * s.avg });
          }
        }
      });
    }
  } catch(e) {}
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function openModal(id) { 
  const m = document.getElementById(id);
  if(m) m.classList.add('on'); 
}
function closeModal(id, e) { 
  if (!e || e.target.classList.contains('overlay')) { 
    const m = document.getElementById(id); 
    if(m) m.classList.remove('on'); 
  } 
}
function closeAllModals() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('on')); }

function uid() { return Math.random().toString(36).slice(2, 10); }
function today() { return new Date().toISOString().split('T')[0]; }
function formatTime(date) { return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0'); }
function fmt(n) { return '€' + (+n).toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function getWeek(d) { const dt = new Date(d), day = dt.getDay() || 7; dt.setDate(dt.getDate() + 4 - day); const y = new Date(dt.getFullYear(), 0, 1); return Math.ceil(((dt - y) / 86400000 + 1) / 7); }

function catTagClass(c) {
  if (['trabajo','salud'].includes(c)) return 'tag-blu';
  if (['clases','suscripciones'].includes(c)) return 'tag-pur';
  if (['exámenes','alquiler'].includes(c)) return 'tag-red';
  if (['gym','freelance','transporte'].includes(c)) return 'tag-acc';
  if (['cumpleaños','ocio','dividendos','intereses'].includes(c)) return 'tag-yel';
  if (['quedadas','alimentación','nómina','personal'].includes(c)) return 'tag-grn';
  return 'tag-t3';
}

function catColor(c) {
  const m = { trabajo:'var(--blu)', personal:'var(--grn)', estudios:'var(--pur)', gym:'var(--acc)', nómina:'var(--grn)', intereses:'var(--yel)', freelance:'var(--acc)', dividendos:'var(--yel)', alquiler:'var(--red)', alimentación:'var(--grn)', transporte:'var(--acc)', suscripciones:'var(--pur)', salud:'var(--blu)', ocio:'var(--yel)', clases:'var(--pur)', exámenes:'var(--red)', cumpleaños:'var(--yel)', quedadas:'var(--grn)' };
  return m[c] || 'var(--t3)';
}

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const greetEl = document.getElementById('greeting');
  if(greetEl) greetEl.textContent = g + ' · ' + new Date().toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
}

// --- SISTEMA DE CONFIRMACIÓN PERSONALIZADO ---
let confirmAction = null;

function customConfirm(title, message, callback) {
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  
  confirmAction = callback;
  openModal('modal-confirm');
}

function executeConfirm() {
  if (confirmAction) confirmAction();
  const m = document.getElementById('modal-confirm');
  if(m) m.classList.remove('on');
  confirmAction = null;
}

function cancelConfirm(e, force = false) {
  if (force || !e || (e.target && e.target.classList.contains('overlay'))) {
    const m = document.getElementById('modal-confirm');
    if(m) m.classList.remove('on');
    confirmAction = null;
  }
}

function init() {
  load();
  setGreeting();
  
  if(document.getElementById('t-date')) document.getElementById('t-date').value = today();
  if(document.getElementById('fin-date')) document.getElementById('fin-date').value = today();

  if(document.getElementById('task-pending') && typeof renderTasks === 'function') renderTasks();
  if(document.getElementById('k-todo') && typeof renderKanban === 'function') renderKanban();
  if(document.getElementById('eis-ui') && typeof renderEis === 'function') renderEis();
  if(document.getElementById('gym-routine-list') && typeof renderRoutines === 'function') renderRoutines();
  if(document.getElementById('home-tasks') && typeof renderHome === 'function') renderHome();
  if(document.getElementById('pomo-display') && typeof updPomo === 'function') updPomo();
  if(document.getElementById('finChart') && typeof renderFinances === 'function') { setTimeout(initFinChart, 80); renderFinances(); }
  if(document.getElementById('stock-list') && typeof renderStocks === 'function') renderStocks();
}
