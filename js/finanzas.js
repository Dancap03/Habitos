function openModalFin(type) {
  document.getElementById('fin-type').value = type;
  document.getElementById('modal-fin-title').textContent = type === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto';
  document.getElementById('fin-date').value = today();
  openModal('modal-fin');
}

function addFinEntry() {
  const amount = parseFloat(document.getElementById('fin-amount').value);
  const desc = document.getElementById('fin-desc').value.trim();
  if (!amount || !desc) return;
  S.fin.push({ id: uid(), type: document.getElementById('fin-type').value, amount, desc, cat: document.getElementById('fin-cat').value, date: document.getElementById('fin-date').value || today() });
  save(); closeAllModals();
  document.getElementById('fin-amount').value = '';
  document.getElementById('fin-desc').value = '';
  renderFinances();
}
function delFinEntry(id) {
  S.fin = S.fin.filter(x => x.id !== id); save(); renderFinances(); renderHome();
}
function addRecurring() {
  const name = document.getElementById('rec-name').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  const day = parseInt(document.getElementById('rec-day').value);
  if (!name || !amount) return;
  S.recurring.push({ id: uid(), name, amount, day, type: document.getElementById('rec-type').value });
  save(); closeAllModals();
  document.getElementById('rec-name').value = '';
  document.getElementById('rec-amount').value = '';
  document.getElementById('rec-day').value = '';
  renderFinances();
}
function delRecurring(id) {
  S.recurring = S.recurring.filter(x => x.id !== id); save(); renderFinances();
}

function filterByPeriod(entries, period) {
  const now = new Date();
  return entries.filter(e => {
    const d = new Date(e.date);
    if (period === 'mes') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === 'semana') return getWeek(e.date) === getWeek(today()) && d.getFullYear() === now.getFullYear();
    if (period === 'año') return d.getFullYear() === now.getFullYear();
    return true;
  });
}

function renderFinances() {
  const period = S.activePeriod;
  const entries = filterByPeriod(S.fin, period);
  const inc = entries.filter(e => e.type === 'ingreso').reduce((a,e) => a+e.amount, 0);
  const exp = entries.filter(e => e.type === 'gasto').reduce((a,e) => a+e.amount, 0);
  const labels = { mes: 'Mes actual', semana: 'Esta semana', año: 'Este año', total: 'Acumulado total' };
  document.getElementById('fin-period-label').textContent = labels[period];
  document.getElementById('fin-chart-label').textContent = 'Evolución — ' + labels[period];
  document.getElementById('fin-bal').textContent = fmt(inc - exp);
  document.getElementById('fin-inc').textContent = fmt(inc);
  document.getElementById('fin-exp').textContent = fmt(exp);

  const incEntries = entries.filter(e => e.type === 'ingreso');
  const incEl = document.getElementById('fin-income-list');
  incEl.innerHTML = incEntries.length ? incEntries.map(e => `
    <div class="fin-row">
      <div class="row-gap">
        <div class="icon-box" style="background:rgba(39,174,96,.1)">${catEmoji(e.cat)}</div>
        <div><div style="font-size:13px;font-weight:500">${e.desc}</div><div class="item-sub">${e.cat} · ${e.date}</div></div>
      </div>
      <div style="text-align:right">
        <div class="fin-amount-pos">${fmt(e.amount)}</div>
        <button class="btn-danger" onclick="delFinEntry('${e.id}')">✕</button>
      </div>
    </div>`).join('') : '<div class="empty">Sin ingresos</div>';

  const expEntries = entries.filter(e => e.type === 'gasto');
  const expEl = document.getElementById('fin-expense-list');
  expEl.innerHTML = expEntries.length ? expEntries.map(e => `
    <div class="fin-row">
      <div class="row-gap">
        <div class="icon-box" style="background:rgba(231,76,60,.1)">${catEmoji(e.cat)}</div>
        <div><div style="font-size:13px;font-weight:500">${e.desc}</div><div class="item-sub">${e.cat} · ${e.date}</div></div>
      </div>
      <div style="text-align:right">
        <div class="fin-amount-neg">-${fmt(e.amount)}</div>
        <button class="btn-danger" onclick="delFinEntry('${e.id}')">✕</button>
      </div>
    </div>`).join('') : '<div class="empty">Sin gastos</div>';

  const recEl = document.getElementById('fin-rec-list');
  recEl.innerHTML = S.recurring.length ? S.recurring.map(r => `
    <div class="fin-row">
      <div class="row-gap">
        <div class="icon-box" style="background:var(--bg4)">🔄</div>
        <div><div style="font-size:13px;font-weight:500">${r.name}</div><div class="item-sub">Día ${r.day} · ${r.type}</div></div>
      </div>
      <div style="text-align:right">
        <div class="${r.type==='ingreso'?'fin-amount-pos':'fin-amount-neg'}">${r.type==='gasto'?'-':''}${fmt(r.amount)}</div>
        <button class="btn-danger" onclick="delRecurring('${r.id}')">✕</button>
      </div>
    </div>`).join('') : '<div class="empty">Sin recurrentes</div>';

  const cats = {};
  expEntries.forEach(e => { cats[e.cat] = (cats[e.cat]||0) + e.amount; });
  const total = Object.values(cats).reduce((a,b)=>a+b,0);
  const catEl = document.getElementById('fin-cat-bars');
  catEl.innerHTML = total === 0 ? '<div class="empty">Sin datos</div>' : Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,v]) => `
    <div style="margin-bottom:10px">
      <div class="row"><span style="font-size:13px">${c}</span><span style="font-size:13px;font-weight:600">${fmt(v)} <span style="color:var(--t3);font-weight:400">${Math.round(v/total*100)}%</span></span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/total*100)}%;background:${catColor(c)}"></div></div>
    </div>`).join('');

  document.getElementById('fin-notes').value = S.finNotes || "";

  updateFinChart(period);
  renderHome();
}

function setFinPeriod(p, btn) {
  document.querySelectorAll('.fin-tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  S.activePeriod = p; save();
  renderFinances();
}

function saveFinNotes() {
  S.finNotes = document.getElementById('fin-notes').value;
  save();
}

let finChartInst = null;
function initFinChart() { if (finChartInst) return; buildFinChart(); }
function buildFinChart() {
  const ctx = document.getElementById('finChart');
  if (!ctx) return;
  finChartInst = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label:'Ingresos', data:[], borderColor:'#27ae60', backgroundColor:'rgba(39,174,96,.08)', tension:.4, fill:true, pointRadius:3 },
      { label:'Gastos', data:[], borderColor:'#e74c3c', backgroundColor:'rgba(231,76,60,.06)', tension:.4, fill:true, pointRadius:3, borderDash:[4,4] }
    ]},
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#444',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#444',font:{size:10},callback:v=>'€'+v.toLocaleString()},grid:{color:'rgba(255,255,255,.04)'}}}}
  });
  updateFinChart(S.activePeriod);
}
function updateFinChart(period) {
  if (!finChartInst) return;
  let labels = [], inc = [], exp = [];
  const now = new Date();
  if (period === 'mes') {
    const days = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    labels = Array.from({length:days}, (_,i)=>String(i+1));
    inc = labels.map(d => S.fin.filter(e=>e.type==='ingreso'&&e.date===`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`).reduce((a,e)=>a+e.amount,0));
    exp = labels.map(d => S.fin.filter(e=>e.type==='gasto'&&e.date===`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`).reduce((a,e)=>a+e.amount,0));
  } else if (period === 'semana') {
    const wdays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    labels = wdays;
    for (let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-d.getDay()+1+i);const ds=d.toISOString().split('T')[0];inc.push(S.fin.filter(e=>e.type==='ingreso'&&e.date===ds).reduce((a,e)=>a+e.amount,0));exp.push(S.fin.filter(e=>e.type==='gasto'&&e.date===ds).reduce((a,e)=>a+e.amount,0));}
  } else if (period === 'año') {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    labels = months;
    for (let m=0;m<12;m++){const yr=now.getFullYear(),mo=String(m+1).padStart(2,'0');inc.push(S.fin.filter(e=>e.type==='ingreso'&&e.date.startsWith(`${yr}-${mo}`)).reduce((a,e)=>a+e.amount,0));exp.push(S.fin.filter(e=>e.type==='gasto'&&e.date.startsWith(`${yr}-${mo}`)).reduce((a,e)=>a+e.amount,0));}
  } else {
    const years = [...new Set(S.fin.map(e=>e.date.slice(0,4)))].sort();
    labels = years.length ? years : [String(now.getFullYear())];
    inc = labels.map(y=>S.fin.filter(e=>e.type==='ingreso'&&e.date.startsWith(y)).reduce((a,e)=>a+e.amount,0));
    exp = labels.map(y=>S.fin.filter(e=>e.type==='gasto'&&e.date.startsWith(y)).reduce((a,e)=>a+e.amount,0));
  }
  finChartInst.data.labels = labels;
  finChartInst.data.datasets[0].data = inc;
  finChartInst.data.datasets[1].data = exp;
  finChartInst.update();
}
