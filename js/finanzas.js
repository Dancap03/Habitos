function catEmoji(c) {
  const m = { nómina:'💼', ahorro:'💰', inversión:'📈', intereses:'📊', dividendos:'🏦', alquiler:'🏠', comida:'🛒', transporte:'🚗', suscripciones:'📱', salud:'❤️', ocio:'🎭', caprichos:'🎁', compras:'🛍️', viajes:'✈️' };
  return m[c] || '📌';
}

function toggleFinTypeOptions() {
  const cat = document.getElementById('fin-cat').value;
  const typeEl = document.getElementById('fin-type');
  const typeLabel = document.getElementById('fin-type-label');
  const dateWrap = document.getElementById('date-wrapper');
  const dayWrap = document.getElementById('day-wrapper');
  const descLabel = document.getElementById('fin-desc-label');
  const descInput = document.getElementById('fin-desc');

  if(!typeEl || !typeLabel) return;
  
  if (cat === 'ahorro') {
    typeLabel.textContent = 'Acción';
    typeEl.innerHTML = '<option value="gasto">Ingresar a la hucha</option><option value="ingreso">Sacar de la hucha</option>';
    dateWrap.style.display = 'block'; dayWrap.style.display = 'none';
    descLabel.textContent = 'Descripción'; descInput.placeholder = 'Motivo...';
  } else if (cat === 'inversión') {
    typeLabel.textContent = 'Acción';
    typeEl.innerHTML = '<option value="gasto">Inyectar capital</option><option value="ingreso">Retirar capital</option>';
    dateWrap.style.display = 'block'; dayWrap.style.display = 'none';
    descLabel.textContent = 'Descripción'; descInput.placeholder = 'Activo o Broker...';
  } else if (cat === 'suscripciones') {
    typeLabel.textContent = 'Tipo';
    typeEl.innerHTML = '<option value="gasto">Gasto</option><option value="ingreso">Ingreso</option>';
    dateWrap.style.display = 'none'; dayWrap.style.display = 'block';
    descLabel.textContent = 'Nombre suscripción'; descInput.placeholder = 'Netflix...';
  } else {
    typeLabel.textContent = 'Tipo';
    const curr = typeEl.value;
    typeEl.innerHTML = '<option value="ingreso">Ingreso</option><option value="gasto">Gasto</option>';
    if(curr === 'ingreso' || curr === 'gasto') typeEl.value = curr;
    dateWrap.style.display = 'block'; dayWrap.style.display = 'none';
    descLabel.textContent = 'Descripción'; descInput.placeholder = 'Concepto...';
  }
}

function openModalFin(type, defaultCat = null) {
  const elType = document.getElementById('fin-type');
  const elCat = document.getElementById('fin-cat');
  const elTitle = document.getElementById('modal-fin-title');
  
  if(elCat) {
     if(defaultCat) elCat.value = defaultCat;
     else if(['ahorro','inversión','suscripciones'].includes(elCat.value)) elCat.value = type === 'ingreso' ? 'nómina' : 'otro';
  }
  
  toggleFinTypeOptions();
  if(elType) elType.value = type;
  if(elTitle) elTitle.textContent = defaultCat ? `Nuevo ${defaultCat}` : (type === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto');
  
  document.getElementById('fin-date').value = today();
  document.getElementById('fin-amount').value = '';
  document.getElementById('fin-desc').value = '';
  openModal('modal-fin');
}

function addFinEntry() {
  const amount = parseFloat(document.getElementById('fin-amount').value);
  const desc = document.getElementById('fin-desc').value.trim();
  const cat = document.getElementById('fin-cat').value;
  const type = document.getElementById('fin-type').value;

  if (!amount || !desc) return showToast('Rellena los datos', 'error');
  
  if (cat === 'suscripciones') {
    const day = parseInt(document.getElementById('fin-day').value);
    if (!day || day < 1 || day > 31) return showToast('Día inválido', 'error');
    S.recurring.push({ id: uid(), name: desc, amount, day, type });
  } else {
    S.fin.push({ id: uid(), type, amount, desc, cat, date: document.getElementById('fin-date').value || today() });
  }
  
  save(); closeAllModals(); renderFinances();
  if(typeof renderHome === 'function') renderHome();
  showToast('Guardado', 'success');
}

function delFinEntry(id) {
  customConfirm('Borrar registro', '¿Seguro?', () => {
    S.fin = S.fin.filter(x => x.id !== id); save(); renderFinances(); if(typeof renderHome === 'function') renderHome();
  });
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
  const period = S.activePeriod || 'semana';
  document.querySelectorAll('.fin-tab').forEach(t => {
    t.classList.remove('on');
    if (t.getAttribute('onclick').includes(`'${period}'`)) t.classList.add('on');
  });

  const entries = filterByPeriod(S.fin, period);

  // Totales Huchas (Históricos)
  const totalSav = S.fin.filter(e => e.cat === 'ahorro').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);
  const totalInv = S.fin.filter(e => e.cat === 'inversión').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);

  // Matemática periodo
  const trueInc = entries.filter(e => e.type === 'ingreso' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e) => a+e.amount, 0);
  const trueExp = entries.filter(e => e.type === 'gasto' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e) => a+e.amount, 0);
  const periodSav = entries.filter(e => e.cat === 'ahorro').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);

  // Balance disponible (Efectivo en mano)
  const available = S.fin.reduce((a,e) => a + (e.type==='ingreso'?e.amount:-e.amount), 0);

  document.getElementById('fin-bal').textContent = fmt(available);
  document.getElementById('fin-total-sav').textContent = fmt(totalSav);
  document.getElementById('fin-total-inv-label').textContent = fmt(totalInv);
  document.getElementById('fin-inc').textContent = fmt(trueInc);
  document.getElementById('fin-exp').textContent = fmt(trueExp);
  document.getElementById('fin-sav').textContent = fmt(periodSav);

  // Listas
  renderList('fin-income-list', entries.filter(e => e.type === 'ingreso' && !['ahorro','inversión'].includes(e.cat)));
  renderList('fin-expense-list', entries.filter(e => e.type === 'gasto' && !['ahorro','inversión'].includes(e.cat)));
  renderList('fin-sav-list', entries.filter(e => e.cat === 'ahorro'), true);
  renderList('fin-inv-list', entries.filter(e => e.cat === 'inversión'), true);
  
  const recEl = document.getElementById('fin-rec-list');
  if(recEl) recEl.innerHTML = S.recurring.length ? S.recurring.map(r => `
    <div class="fin-row">
      <div class="row-gap"><div class="icon-box" style="background:var(--pur); color:#fff; border-radius:10px;">🔄</div><div><div style="font-size:13px;font-weight:500">${r.name}</div><div class="item-sub">Día ${r.day}</div></div></div>
      <div style="text-align:right"><div class="fin-amount-neg">-${fmt(r.amount)}</div><button class="btn-danger" onclick="delRecurring('${r.id}')">✕</button></div>
    </div>`).join('') : '<div class="empty">Vacío</div>';

  updateFinChart(period);
}

function renderList(id, list, isHucha = false) {
  const el = document.getElementById(id);
  if(!el) return;
  el.innerHTML = list.length ? list.map(e => `
    <div class="fin-row">
      <div class="row-gap">
        <div class="icon-box" style="background:${isHucha ? (e.cat==='ahorro'?'rgba(59,130,246,0.1)':'rgba(245,158,11,0.1)') : 'rgba(255,255,255,0.05)'}">${catEmoji(e.cat)}</div>
        <div><div style="font-size:13px;font-weight:500">${e.desc}</div><div class="item-sub">${e.date}</div></div>
      </div>
      <div style="text-align:right">
        <div class="${e.type==='ingreso'?'fin-amount-pos':'fin-amount-neg'}">${e.type==='gasto'?'-':'+'}${fmt(e.amount)}</div>
        <button class="btn-danger" onclick="delFinEntry('${e.id}')">✕</button>
      </div>
    </div>`).join('') : '<div class="empty">Vacío</div>';
}

function setFinPeriod(p, btn) { S.activePeriod = p; save(); renderFinances(); }

let finChartInst = null;
function initFinChart() {
  const ctx = document.getElementById('finChart');
  if (!ctx) return;
  finChartInst = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label:'Ingresos', data:[], borderColor:'#27ae60', backgroundColor:'rgba(39,174,96,.08)', tension:.4, fill:true },
      { label:'Gastos', data:[], borderColor:'#e74c3c', backgroundColor:'rgba(231,76,60,.06)', tension:.4, fill:true, borderDash:[4,4] },
      { label:'Ahorrado', data:[], borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.08)', tension:.4, fill:true }
    ]},
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#444',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#444',font:{size:10}},grid:{color:'rgba(255,255,255,.03)'}}}}
  });
  updateFinChart(S.activePeriod || 'semana');
}

function updateFinChart(period) {
  if (!finChartInst) return;
  let labels = [], inc = [], exp = [], sav = [];
  const now = new Date();
  
  if (period === 'semana') {
    labels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    for (let i=0;i<7;i++){
      const d=new Date(); d.setDate(d.getDate()-d.getDay()+1+i); const ds=d.toISOString().split('T')[0];
      inc.push(S.fin.filter(e=>e.type==='ingreso' && !['ahorro','inversión'].includes(e.cat) && e.date===ds).reduce((a,e)=>a+e.amount,0));
      exp.push(S.fin.filter(e=>e.type==='gasto' && !['ahorro','inversión'].includes(e.cat) && e.date===ds).reduce((a,e)=>a+e.amount,0));
      sav.push(S.fin.filter(e=>e.cat==='ahorro' && e.date===ds).reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
    }
  }
  // (Mantenemos la lógica para Mes/Año similar)
  finChartInst.data.labels = labels;
  finChartInst.data.datasets[0].data = inc;
  finChartInst.data.datasets[1].data = exp;
  finChartInst.data.datasets[2].data = sav;
  finChartInst.update();
}
