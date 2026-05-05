const S = {
  tasks: [], fin: [], recurring: [], stocks: [], routines: [], workoutLog: [], prs: {},
  kanban: { todo:[], doing:[], done:[] }, eis: { ui:[], ni:[], un:[], nn:[] },
  pomo: { sessions: 0 }, activePeriod: 'semana', activeRoutine: null, finNotes: "" 
};

function save() { localStorage.setItem('dancab_v1', JSON.stringify(S)); }
function load() {
  try {
    const d = localStorage.getItem('dancab_v1');
    if (d) Object.assign(S, JSON.parse(d));
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
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function openModal(id) { const m = document.getElementById(id); if(m) m.classList.add('on'); }
function closeModal(id, e) { if (!e || e.target.classList.contains('overlay')) { const m = document.getElementById(id); if(m) m.classList.remove('on'); } }
function closeAllModals() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('on')); }

function uid() { return Math.random().toString(36).slice(2, 10); }
function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmt(n) { return '€' + (+n).toLocaleString('es-ES', {minimumFractionDigits:2}); }
function getWeek(d) { const dt = new Date(d), day = dt.getDay() || 7; dt.setDate(dt.getDate() + 4 - day); const y = new Date(dt.getFullYear(), 0, 1); return Math.ceil(((dt - y) / 86400000 + 1) / 7); }

function catColor(c) {
  const m = { inversión:'var(--yel)', ahorro:'var(--blu)', trabajo:'var(--blu)', personal:'var(--grn)', gym:'var(--acc)', nómina:'var(--grn)', intereses:'var(--yel)', alquiler:'var(--red)', alimentación:'var(--grn)', transporte:'var(--acc)', suscripciones:'var(--pur)', salud:'var(--blu)', ocio:'var(--yel)', caprichos:'var(--yel)', compras:'var(--pur)', viajes:'var(--acc)' };
  return m[c] || 'var(--t3)';
}

function renderHome() {
  if (S.fin && document.getElementById('home-fin-inc')) {
    const trueInc = S.fin.filter(e => e.type === 'ingreso' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e) => a+e.amount, 0);
    const trueExp = S.fin.filter(e => e.type === 'gasto' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e) => a+e.amount, 0);
    const available = S.fin.reduce((a,e) => a + (e.type==='ingreso'?e.amount:-e.amount), 0);
    const totalSav = S.fin.filter(e => e.cat === 'ahorro').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);

    document.getElementById('home-fin-avail').textContent = fmt(available);
    document.getElementById('home-fin-inc').textContent = fmt(trueInc);
    document.getElementById('home-fin-exp').textContent = fmt(trueExp);
    document.getElementById('home-fin-sav').textContent = fmt(totalSav);
  }

  if (S.stocks && document.getElementById('home-port-total')) {
    let val = 0; let inv = 0;
    S.stocks.forEach(s => {
      let sInv = 0; let sShares = 0;
      if(s.purchases) s.purchases.forEach(p => { sInv += p.invested; sShares += p.shares; });
      val += sShares * s.price; inv += sInv;
    });
    const pnl = val - inv;
    document.getElementById('home-port-total').textContent = fmt(val);
    document.getElementById('home-port-inv').textContent = fmt(inv);
    const elPnl = document.getElementById('home-port-pnl');
    elPnl.textContent = `${pnl>=0?'+':''}${fmt(pnl)} (${inv>0?((pnl/inv)*100).toFixed(2):0}%)`;
    elPnl.style.color = pnl>=0 ? 'var(--grn)' : 'var(--red)';
  }
}

function init() {
  load();
  if(document.getElementById('finChart') && typeof renderFinances === 'function') { setTimeout(initFinChart, 80); renderFinances(); }
  if(document.getElementById('home-fin-inc')) renderHome();
}
