const S = {
  tasks: [], fin: [], recurring: [], stocks: [], routines: [], workoutLog: [], prs: {},
  kanban: { todo:[], doing:[], done:[] }, eis: { ui:[], ni:[], un:[], nn:[] },
  pomo: { sessions: 0 }, activePeriod: 'semana', activeRoutine: null
};

let currGymMonth = new Date().getMonth();
let currGymYear = new Date().getFullYear();

function save() { localStorage.setItem('dancab_v1', JSON.stringify(S)); }
function load() {
  try {
    const d = localStorage.getItem('dancab_v1');
    if (d) Object.assign(S, JSON.parse(d));
    if (!S.tasks) S.tasks = [];
    if (!S.workoutLog) S.workoutLog = [];
    if (!S.fin) S.fin = [];
    if (!S.stocks) S.stocks = [];
  } catch(e) {}
}

// Lógica de Nube (JsonBin sugerido)
async function cloudSync(mode) {
  if (mode === 'up') {
    showToast("Sincronizando... ⬆️");
    save(); // Aseguramos guardar antes de subir
  } else {
    showToast("Descargando datos... ⬇️");
  }
}

function uid() { return Math.random().toString(36).slice(2, 10); }
function today() { 
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function fmt(n) { return '€' + (+n).toLocaleString('es-ES', {minimumFractionDigits:2}); }
function getWeek(d) { const dt = new Date(d), day = dt.getDay() || 7; dt.setDate(dt.getDate() + 4 - day); const y = new Date(dt.getFullYear(), 0, 1); return Math.ceil(((dt - y) / 86400000 + 1) / 7); }

function renderHome() {
  // FINANZAS
  if (document.getElementById('home-fin-inc')) {
    const trueInc = S.fin.filter(e => e.type === 'ingreso' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e) => a+e.amount, 0);
    const trueExp = S.fin.filter(e => e.type === 'gasto' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e) => a+e.amount, 0);
    const available = S.fin.reduce((a,e) => a + (e.type==='ingreso'?e.amount:-e.amount), 0);
    const totalSav = S.fin.filter(e => e.cat === 'ahorro').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);
    const totalInv = S.fin.filter(e => e.cat === 'inversión').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);

    document.getElementById('home-fin-avail').textContent = fmt(available);
    document.getElementById('home-fin-inc').textContent = fmt(trueInc);
    document.getElementById('home-fin-exp').textContent = fmt(trueExp);
    document.getElementById('home-fin-sav').textContent = fmt(totalSav);
    const elInv = document.getElementById('home-fin-inv');
    if(elInv) elInv.textContent = fmt(totalInv);
  }

  // CARTERA
  if (document.getElementById('home-port-total')) {
    let val = 0, inv = 0;
    S.stocks.forEach(s => {
      let sInv = 0, sShares = 0;
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

  // EVENTOS HOY
  const homeEvents = document.getElementById('home-events-list');
  if (homeEvents) {
    const todayTasks = S.tasks.filter(t => t.date === today());
    homeEvents.innerHTML = todayTasks.length ? todayTasks.map(t => `<div class="list-item" style="padding:10px 0; border-bottom:1px solid var(--line); display:flex; justify-content:space-between;"><span>${t.title}</span><span style="color:var(--acc); font-weight:600;">${t.time || ''}</span></div>`).join('') : '<div class="empty">Sin eventos hoy</div>';
  }

  renderGymCalendar();
}

function changeGymMonth(dir) { currGymMonth += dir; if(currGymMonth<0){currGymMonth=11;currGymYear--;} else if(currGymMonth>11){currGymMonth=0;currGymYear++;} renderGymCalendar(); }

function renderGymCalendar() {
  const calEl = document.getElementById('home-gym-calendar');
  const labelEl = document.getElementById('gym-cal-month');
  if (!calEl) return;
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  if(labelEl) labelEl.textContent = `${monthNames[currGymMonth]} ${currGymYear}`;
  const daysInMonth = new Date(currGymYear, currGymMonth + 1, 0).getDate();
  const startDay = (new Date(currGymYear, currGymMonth, 1).getDay() || 7) - 1;
  let html = ['L','M','X','J','V','S','D'].map(d => `<div style="font-size:10px;color:var(--t3);font-weight:600;">${d}</div>`).join('');
  for (let i=0; i<startDay; i++) html += `<div></div>`;
  for (let i=1; i<=daysInMonth; i++) {
    const dStr = `${currGymYear}-${String(currGymMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const did = S.workoutLog.some(w => w.date === dStr);
    const isT = dStr === today();
    html += `<div style="display:flex;justify-content:center;"><div style="width:28px;height:28px;border-radius:50%;background:${did?'var(--acc)':'var(--bg4)'};border:${isT?'2px solid #fff':'none'};display:flex;justify-content:center;align-items:center;font-size:11px;font-weight:700;color:${did?'#fff':'var(--t2)'};">${i}</div></div>`;
  }
  calEl.innerHTML = html;
}

function init() {
  load();
  const h = new Date().getHours();
  const greet = h<5?'Buenas noches':h<12?'Buenos días':h<20?'Buenas tardes':'Buenas noches';
  const elGreet = document.getElementById('greeting');
  if(elGreet) elGreet.textContent = `${greet} · ${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}`;
  if(document.getElementById('home-fin-inc')) renderHome();
  if(document.getElementById('finChart') && typeof renderFinances === 'function') { setTimeout(initFinChart, 100); renderFinances(); }
  if(document.getElementById('stock-list') && typeof renderStocks === 'function') renderStocks();
}
document.addEventListener('DOMContentLoaded', init);
