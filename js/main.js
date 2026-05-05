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
  activePeriod: 'mes',
  activeRoutine: null,
  finNotes: "" 
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

function switchTo(id, btn) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('s-' + id).classList.add('on');
  if (btn) btn.classList.add('on');
  else {
    document.querySelectorAll('.nav-btn').forEach(b => {
      if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'"+id+"'")) b.classList.add('on');
    });
  }
  if (id === 'finanzas') { setTimeout(initFinChart, 80); renderFinances(); }
  if (id === 'acciones') renderStocks();
  if (id === 'home') renderHome();
}

function openModal(id) { document.getElementById(id).classList.add('on'); }
function closeModal(id, e) { if (!e || e.target.classList.contains('overlay')) document.getElementById(id).classList.remove('on'); }
function closeAllModals() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('on')); }

function uid() { return Math.random().toString(36).slice(2, 10); }
function today() { return new Date().toISOString().split('T')[0]; }
function formatTime(date) { return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0'); }
function fmt(n) { return '€' + (+n).toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function getWeek(d) { const dt = new Date(d), day = dt.getDay() || 7; dt.setDate(dt.getDate() + 4 - day); const y = new Date(dt.getFullYear(), 0, 1); return Math.ceil(((dt - y) / 86400000 + 1) / 7); }

// NUEVOS COLORES POR CATEGORÍAS
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
  document.getElementById('greeting').textContent = g + ' · ' + new Date().toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
}

function renderHome() {
  const pending = S.tasks.filter(t => !t.done && t.date === today());
  document.getElementById('home-tasks').textContent = pending.length;
  
  let streak = 0;
  for (let i=0; i<30; i++) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const anyDone = S.tasks.some(t => t.date === ds && t.done);
    if (anyDone) streak++; else if (i>0) break;
  }
  document.getElementById('home-streak').textContent = streak + '🔥';
  
  const el = document.getElementById('home-task-list');
  if (!pending.length) { el.innerHTML = '<div class="empty">Sin eventos para hoy</div>'; }
  else { el.innerHTML = pending.slice(0,5).map(t=>`<div class="list-item" onclick="toggleTask('${t.id}')"><div class="check ${t.done?'done':''}"></div><div><div class="item-title">${t.name}</div><div class="item-sub">${t.time?t.time+' · ':''}<span class="tag ${catTagClass(t.cat)}">${t.cat}</span></div></div></div>`).join(''); }
  
  const mes = filterByPeriod(S.fin,'mes');
  const inc = mes.filter(e=>e.type==='ingreso').reduce((a,e)=>a+e.amount,0);
  const exp = mes.filter(e=>e.type==='gasto').reduce((a,e)=>a+e.amount,0);
  document.getElementById('home-inc').textContent = fmt(inc);
  document.getElementById('home-exp').textContent = fmt(exp);
  
  renderCalendar();
}

function init() {
  load();
  setGreeting();
  document.getElementById('t-date').value = today();
  document.getElementById('fin-date').value = today();
  renderTasks();
  renderKanban();
  renderEis();
  renderRoutines();
  renderHome();
  updPomo();
  document.getElementById('pomo-sessions').textContent = S.pomo.sessions || 0;
}
