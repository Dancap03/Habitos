function catEmoji(c) {
  const m = { nómina:'💼', intereses:'📈', freelance:'💻', dividendos:'🏦', alquiler:'🏠', alimentación:'🛒', transporte:'🚗', suscripciones:'📱', salud:'❤️', ocio:'🎭' };
  return m[c] || '📌';
}

function openModalFin(type) {
  const elType = document.getElementById('fin-type');
  const elTitle = document.getElementById('modal-fin-title');
  const elDate = document.getElementById('fin-date');
  
  if(elType) elType.value = type;
  if(elTitle) elTitle.textContent = type === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto';
  if(elDate) elDate.value = today();
  
  openModal('modal-fin');
}

function addFinEntry() {
  const amount = parseFloat(document.getElementById('fin-amount').value);
  const desc = document.getElementById('fin-desc').value.trim();
  if (!amount || !desc) return showToast('Rellena importe y descripción', 'error');
  
  S.fin.push({ 
    id: uid(), 
    type: document.getElementById('fin-type').value, 
    amount, 
    desc, 
    cat: document.getElementById('fin-cat').value, 
    date: document.getElementById('fin-date').value || today() 
  });
  save(); closeAllModals();
  document.getElementById('fin-amount').value = '';
  document.getElementById('fin-desc').value = '';
  renderFinances();
  showToast('Registro guardado', 'success');
}

function delFinEntry(id) {
  if(typeof customConfirm === 'function') {
    customConfirm('Borrar registro', '¿Seguro que quieres borrar este movimiento?', () => {
      S.fin = S.fin.filter(x => x.id !== id); save(); renderFinances();
    });
  } else {
    if(confirm('¿Borrar?')) { S.fin = S.fin.filter(x => x.id !== id); save(); renderFinances(); }
  }
}

function addRecurring() {
  const name = document.getElementById('rec-name').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  const day = parseInt(document.getElementById('rec-day').value);
  if (!name || !amount) return showToast('Revisa los datos', 'error');
  
  S.recurring.push({ id: uid(), name, amount, day, type: document.getElementById('rec-type').value });
  save(); closeAllModals();
  document.getElementById('rec-name').value = '';
  document.getElementById('rec-amount').value = '';
  document.getElementById('rec-day').value = '';
  renderFinances();
  showToast('Recurrente guardado', 'success');
}

function delRecurring(id) {
  if(typeof customConfirm === 'function') {
    customConfirm('Borrar recurrente', '¿Seguro que quieres borrar este registro recurrente?', () => {
      S.recurring = S.recurring.filter(x => x.id !== id); save(); renderFinances();
    });
  } else {
    if(confirm('¿Borrar?')) { S.recurring = S.recurring.filter(x => x.id !== id); save(); renderFinances(); }
  }
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
  // Por defecto arrancamos en semana si no hay nada guardado
  const period = S.activePeriod || 'semana';
  
  // Iluminamos el botón correcto siempre
  document.querySelectorAll('.fin-tab').forEach(t => {
    t.classList.remove('on');
    if (t.getAttribute('onclick').includes(`'${period}'`)) t.classList.add('on');
  });

  const entries = filterByPeriod(S.fin, period);
  const inc = entries.filter(e => e.type === 'ingreso').reduce((a,e) => a+e.amount, 0);
  const exp = entries.filter(e => e.type === 'gasto').reduce((a,e) => a+e.amount, 0);
  const labels = { mes: 'Mes actual', semana: 'Esta semana', año: 'Este año', total: 'Acumulado total' };

  const pLabel = document.getElementById('fin-period-label');
  if(pLabel) pLabel.textContent = labels[period];
  
  const cLabel = document.getElementById('fin-chart-label');
  if(cLabel) cLabel.textContent = 'Evolución — ' + labels[period];
  
  const balEl = document.getElementById('fin-bal');
  if(balEl) balEl.textContent = fmt(inc - exp);
  
  const incTotEl = document.getElementById('fin-inc');
  if(incTotEl) incTotEl.textContent = fmt(inc);
  
  const expTotEl = document.getElementById('fin-exp');
  if(expTotEl) expTotEl.textContent = fmt(exp);

  const incEntries = entries.filter(e => e.type === 'ingreso');
  const incEl = document.getElementById('fin-income-list');
  if(incEl) {
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
  }

  const expEntries = entries.filter(e => e.type === 'gasto');
  const expEl = document.getElementById('fin-expense-list');
  if(expEl) {
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
  }

  const recEl = document.getElementById('fin-rec-list');
  if(recEl) {
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
  }

  updateFinChart(period);
}

function setFinPeriod(p, btn) {
  S.activePeriod = p; save();
  renderFinances();
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
  updateFinChart(S.activePeriod || 'semana');
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
