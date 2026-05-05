// 1. ESTADO GLOBAL DE LA APP
const S = {
  tasks: [], 
  fin: [], 
  recurring: [], 
  stocks: [], 
  routines: [], 
  workoutLog: [], 
  prs: {},
  kanban: { todo:[], doing:[], done:[] }, 
  eis: { ui:[], ni:[], un:[], nn:[] },
  pomo: { sessions: 0 }, 
  activePeriod: 'semana', 
  activeRoutine: null, 
  finNotes: "" 
};

// Variables de control para el calendario del Gym
let currGymMonth = new Date().getMonth();
let currGymYear = new Date().getFullYear();

// 2. PERSISTENCIA (LOCALSTORAGE)
function save() { 
  localStorage.setItem('dancab_v1', JSON.stringify(S)); 
}

function load() {
  try {
    const d = localStorage.getItem('dancab_v1');
    if (d) Object.assign(S, JSON.parse(d));
    // Asegurar que estructuras críticas existan
    if (!S.workoutLog) S.workoutLog = [];
    if (!S.prs) S.prs = {};
    if (!S.fin) S.fin = [];
    if (!S.stocks) S.stocks = [];
  } catch(e) {
    console.error("Error cargando datos", e);
  }
}

// 3. UTILIDADES GENERALES
function uid() { return Math.random().toString(36).slice(2, 10); }

function today() { 
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fmt(n) { 
  return '€' + (+n).toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2}); 
}

function getWeek(d) { 
  const dt = new Date(d), day = dt.getDay() || 7; 
  dt.setDate(dt.getDate() + 4 - day); 
  const y = new Date(dt.getFullYear(), 0, 1); 
  return Math.ceil(((dt - y) / 86400000 + 1) / 7); 
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

// 4. INTERFAZ Y MODALES
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

function closeAllModals() { 
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('on')); 
}

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const greetEl = document.getElementById('greeting');
  if(greetEl) greetEl.textContent = g + ' · ' + new Date().toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
}

// Confirmación personalizada
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
  closeAllModals();
  confirmAction = null;
}

// 5. MOTOR DEL DASHBOARD (INICIO)
function renderHome() {
  // --- FINANZAS ---
  if (S.fin && document.getElementById('home-fin-inc')) {
    // Ingresos y Gastos Reales (Sin contar movimientos de huchas)
    const trueInc = S.fin.filter(e => e.type === 'ingreso' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e) => a+e.amount, 0);
    const trueExp = S.fin.filter(e => e.type === 'gasto' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e) => a+e.amount, 0);
    
    // Balance disponible (Efectivo real en mano)
    const available = S.fin.reduce((a,e) => a + (e.type==='ingreso'?e.amount:-e.amount), 0);
    
    // Totales acumulados en huchas
    const totalSav = S.fin.filter(e => e.cat === 'ahorro').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);
    const totalInv = S.fin.filter(e => e.cat === 'inversión').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);

    document.getElementById('home-fin-avail').textContent = fmt(available);
    document.getElementById('home-fin-inc').textContent = fmt(trueInc);
    document.getElementById('home-fin-exp').textContent = fmt(trueExp);
    document.getElementById('home-fin-sav').textContent = fmt(totalSav);
    
    const elInv = document.getElementById('home-fin-inv');
    if(elInv) {
      elInv.textContent = fmt(totalInv);
      elInv.style.color = 'var(--yel)';
    }
  }

  // --- CARTERA ---
  if (S.stocks && document.getElementById('home-port-total')) {
    let val = 0; let inv = 0;
    S.stocks.forEach(s => {
      let sInv = 0; let sShares = 0;
      if(s.purchases) s.purchases.forEach(p => { sInv += p.invested; sShares += p.shares; });
      val += sShares * s.price; inv += sInv;
    });
    const pnl = val - inv;
    const pct = inv > 0 ? (pnl / inv) * 100 : 0;

    document.getElementById('home-port-total').textContent = fmt(val);
    document.getElementById('home-port-inv').textContent = fmt(inv);
    const elPnl = document.getElementById('home-port-pnl');
    elPnl.textContent = `${pnl>=0?'+':''}${fmt(pnl)} (${pct.toFixed(2)}%)`;
    elPnl.style.color = pnl>=0 ? 'var(--grn)' : 'var(--red)';
  }

  // --- CALENDARIO GYM ---
  renderGymCalendar();
}

// 6. CALENDARIO MENSUAL GYM
function changeGymMonth(dir) {
  currGymMonth += dir;
  if (currGymMonth < 0) { currGymMonth = 11; currGymYear--; }
  else if (currGymMonth > 11) { currGymMonth = 0; currGymYear++; }
  renderGymCalendar();
}

function renderGymCalendar() {
  const calEl = document.getElementById('home-gym-calendar');
  const labelEl = document.getElementById('gym-cal-month');
  if (!calEl) return;

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  if(labelEl) labelEl.textContent = `${monthNames[currGymMonth]} ${currGymYear}`;

  const daysInMonth = new Date(currGymYear, currGymMonth + 1, 0).getDate();
  const firstDay = new Date(currGymYear, currGymMonth, 1).getDay();
  const startDay = firstDay === 0 ? 6 : firstDay - 1; // Ajuste Lunes como primer día

  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  let html = dayNames.map(d => `<div style="font-size:10px; color:var(--t3); font-weight:600; padding-bottom:6px;">${d}</div>`).join('');

  for (let i = 0; i < startDay; i++) html += `<div></div>`;

  const todayStr = today();

  for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${currGymYear}-${String(currGymMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      const isToday = dStr === todayStr;
      const didWorkout = S.workoutLog.some(w => w.date === dStr);

      let bg = didWorkout ? 'var(--acc)' : 'var(--bg4)';
      let color = didWorkout ? '#fff' : 'var(--t2)';
      let border = isToday ? '2px solid var(--t1)' : '2px solid transparent';

      html += `
      <div style="display:flex; justify-content:center;">
         <div style="width:30px; height:30px; border-radius:50%; background:${bg}; border:${border}; display:flex; justify-content:center; align-items:center; font-size:12px; font-weight:700; color:${color};">
            ${i}
         </div>
      </div>`;
  }
  calEl.innerHTML = html;
}

// 7. INICIALIZACIÓN
function init() {
  load();
  setGreeting();
  
  // Ajustar fechas por defecto en modales
  if(document.getElementById('fin-date')) document.getElementById('fin-date').value = today();

  // Renderizar componentes según la página en la que estemos
  if(document.getElementById('home-fin-inc')) renderHome();
  
  if(document.getElementById('finChart') && typeof renderFinances === 'function') { 
    setTimeout(initFinChart, 100); 
    renderFinances(); 
  }
  
  if(document.getElementById('stock-list') && typeof renderStocks === 'function') {
    renderStocks();
  }
  
  if(document.getElementById('gym-routine-list') && typeof renderRoutines === 'function') {
    renderRoutines();
  }
}

document.addEventListener('DOMContentLoaded', init);
