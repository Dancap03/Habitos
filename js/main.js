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

// Ajuste para evitar bugs de zona horaria (UTC vs Local)
function today() { 
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatTime(date) { return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0'); }
function fmt(n) { return '€' + (+n).toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function getWeek(d) { const dt = new Date(d), day = dt.getDay() || 7; dt.setDate(dt.getDate() + 4 - day); const y = new Date(dt.getFullYear(), 0, 1); return Math.ceil(((dt - y) / 86400000 + 1) / 7); }

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const greetEl = document.getElementById('greeting');
  if(greetEl) greetEl.textContent = g + ' · ' + new Date().toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
}

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

// ----------------------------------------
// MOTOR DEL INICIO (DASHBOARD TOTAL)
// ----------------------------------------
function renderHome() {
  // 1. FINANZAS TOTALES HISTÓRICAS
  if (S.fin && document.getElementById('home-fin-inc')) {
    const trueInc = S.fin.filter(e => e.type === 'ingreso' && e.cat !== 'ahorro').reduce((a,e) => a+e.amount, 0);
    const trueExp = S.fin.filter(e => e.type === 'gasto' && e.cat !== 'ahorro').reduce((a,e) => a+e.amount, 0);
    
    const savIn = S.fin.filter(e => e.type === 'gasto' && e.cat === 'ahorro').reduce((a,e) => a+e.amount, 0);
    const savOut = S.fin.filter(e => e.type === 'ingreso' && e.cat === 'ahorro').reduce((a,e) => a+e.amount, 0);
    const totalSav = savIn - savOut;

    document.getElementById('home-fin-inc').textContent = fmt(trueInc);
    document.getElementById('home-fin-exp').textContent = fmt(trueExp);
    
    const elSav = document.getElementById('home-fin-sav');
    if (totalSav < 0) {
      elSav.textContent = '-' + fmt(Math.abs(totalSav));
      elSav.style.color = 'var(--red)';
    } else {
      elSav.textContent = fmt(totalSav);
      elSav.style.color = 'var(--blu)';
    }
  }

  // 2. CARTERA (VALOR TOTAL)
  if (S.stocks && document.getElementById('home-port-total')) {
    let totalValue = 0;
    let totalInvested = 0;

    S.stocks.forEach(s => {
      let inv = 0; let shares = 0;
      if(s.purchases) {
        s.purchases.forEach(p => { inv += p.invested; shares += p.shares; });
      }
      totalValue += shares * s.price;
      totalInvested += inv;
    });

    const pnl = totalValue - totalInvested;
    const pct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
    const isPos = pnl >= 0;

    document.getElementById('home-port-total').textContent = fmt(totalValue);
    document.getElementById('home-port-inv').textContent = fmt(totalInvested);
    
    const elPnl = document.getElementById('home-port-pnl');
    elPnl.textContent = `${isPos ? '+' : '-'}${fmt(Math.abs(pnl))} (${pct.toFixed(2)}%)`;
    elPnl.style.color = isPos ? 'var(--grn)' : 'var(--red)';
  }

  // 3. CALENDARIO GYM (SEMANA COMPLETA)
  const gymCal = document.getElementById('home-gym-calendar');
  if (S.workoutLog && gymCal) {
    const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    let calHtml = '';
    
    const now = new Date();
    // Ajuste para que la semana empiece el Lunes (1) y termine el Domingo (7)
    const dayOfWeek = now.getDay() || 7; 
    now.setHours(0,0,0,0);
    
    // Encontramos el Lunes de esta semana
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);

    // Dibujamos los 7 días
    for(let i=0; i<7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      
      // Creamos el string YYYY-MM-DD para comparar con el historial
      const dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      const isToday = dStr === today();
      const didWorkout = S.workoutLog.some(w => w.date === dStr);

      // Estilos según si has entrenado o no
      let bg = didWorkout ? 'var(--acc)' : 'var(--bg4)';
      let color = didWorkout ? '#fff' : 'var(--t2)';
      // Aro blanco sutil para destacar qué día es "HOY"
      let border = isToday ? '2px solid var(--t1)' : '2px solid transparent';

      calHtml += `
        <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
           <div style="font-size:10px; color:var(--t3); font-weight:600;">${dayNames[i]}</div>
           <div style="width:30px; height:30px; border-radius:50%; background:${bg}; border:${border}; display:flex; justify-content:center; align-items:center; font-size:13px; font-weight:700; color:${color};">
              ${d.getDate()}
           </div>
        </div>
      `;
    }
    gymCal.innerHTML = calHtml;
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
  if(document.getElementById('finChart') && typeof renderFinances === 'function') { setTimeout(initFinChart, 80); renderFinances(); }
  if(document.getElementById('stock-list') && typeof renderStocks === 'function') renderStocks();
  
  // Disparamos la nueva función del Dashboard al abrir el Inicio
  if(document.getElementById('home-fin-inc')) renderHome();
}
