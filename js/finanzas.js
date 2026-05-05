function catEmoji(c) {
  const m = { nómina:'💼', ahorro:'💰', intereses:'📈', dividendos:'🏦', alquiler:'🏠', comida:'🛒', transporte:'🚗', suscripciones:'📱', salud:'❤️', ocio:'🎭' };
  return m[c] || '📌';
}

// -----------------------------
// MAGIA DEL DESPLEGABLE
// -----------------------------
function toggleFinTypeOptions() {
  const cat = document.getElementById('fin-cat').value;
  const typeEl = document.getElementById('fin-type');
  const typeLabel = document.getElementById('fin-type-label');
  if(!typeEl || !typeLabel) return;
  
  if (cat === 'ahorro') {
    typeLabel.textContent = 'Acción';
    typeEl.innerHTML = '<option value="gasto">Ingresar a la hucha</option><option value="ingreso">Sacar de la hucha</option>';
  } else {
    typeLabel.textContent = 'Tipo';
    const curr = typeEl.value; // Guardamos lo que tenía seleccionado si era ingreso/gasto
    typeEl.innerHTML = '<option value="ingreso">Ingreso</option><option value="gasto">Gasto</option>';
    if(curr === 'ingreso' || curr === 'gasto') typeEl.value = curr;
  }
}

function openModalFin(type) {
  const elType = document.getElementById('fin-type');
  const elCat = document.getElementById('fin-cat');
  const elTitle = document.getElementById('modal-fin-title');
  const elDate = document.getElementById('fin-date');
  
  // Si estaba en ahorro, lo sacamos al abrir un registro normal
  if(elCat && elCat.value === 'ahorro') {
     elCat.value = type === 'ingreso' ? 'nómina' : 'otro';
  }
  toggleFinTypeOptions(); // Reseteamos opciones
  
  if(elType) elType.value = type;
  if(elTitle) elTitle.textContent = type === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto';
  if(elDate) elDate.value = today();
  
  openModal('modal-fin');
}

// Botón exclusivo de la tarjeta "Ahorro"
function openModalFinSav() {
  const elCat = document.getElementById('fin-cat');
  const elTitle = document.getElementById('modal-fin-title');
  const elDate = document.getElementById('fin-date');
  
  if(elCat) elCat.value = 'ahorro';
  toggleFinTypeOptions(); // Esto cambia automáticamente a "Ingresar/Sacar"
  
  if(elTitle) elTitle.textContent = 'Movimiento de Ahorro';
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
  showToast('Suscripción guardada', 'success');
}

function delRecurring(id) {
  if(typeof customConfirm === 'function') {
    customConfirm('Borrar suscripción', '¿Seguro que quieres borrar esta suscripción?', () => {
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
  const period = S.activePeriod || 'semana';
  
  document.querySelectorAll('.fin-tab').forEach(t => {
    t.classList.remove('on');
    if (t.getAttribute('onclick').includes(`'${period}'`)) t.classList.add('on');
  });

  const entries = filterByPeriod(S.fin, period);
  const labels = { mes: 'Mes actual', semana: 'Esta semana', año: 'Este año', total: 'Acumulado total' };

  // MATEMÁTICA DE LA HUCHA (TODO EL HISTORIAL)
  const totalSavIn = S.fin.filter(e => e.type === 'gasto' && e.cat === 'ahorro').reduce((a,e) => a+e.amount, 0);
  const totalSavOut = S.fin.filter(e => e.type === 'ingreso' && e.cat === 'ahorro').reduce((a,e) => a+e.amount, 0);
  const historicalSavings = totalSavIn - totalSavOut;

  // MATEMÁTICA DEL PERIODO ACTUAL
  const inc = entries.filter(e => e.type === 'ingreso').reduce((a,e) => a+e.amount, 0);
  const exp = entries.filter(e => e.type === 'gasto').reduce((a,e) => a+e.amount, 0);
  
  // Ingresos y Gastos REALES (ignorando la hucha de ahorro)
  const trueInc = entries.filter(e => e.type === 'ingreso' && e.cat !== 'ahorro').reduce((a,e) => a+e.amount, 0);
  const trueExp = entries.filter(e => e.type === 'gasto' && e.cat !== 'ahorro').reduce((a,e) => a+e.amount, 0);
  
  // Ahorro generado específicamente en este periodo
  const periodSavIn = entries.filter(e => e.type === 'gasto' && e.cat === 'ahorro').reduce((a,e) => a+e.amount, 0);
  const periodSavOut = entries.filter(e => e.type === 'ingreso' && e.cat === 'ahorro').reduce((a,e) => a+e.amount, 0);
  const periodSavings = periodSavIn - periodSavOut;

  // ACTUALIZACIÓN DE ETIQUETAS
  const pLabel = document.getElementById('fin-period-label');
  if(pLabel) pLabel.textContent = labels[period];
  
  const cLabel = document.getElementById('fin-chart-label');
  if(cLabel) cLabel.textContent = 'Evolución — ' + labels[period];
  
  // BALANCE FINAL (Incluye el dinero que tienes en el bolsillo contando entradas/salidas de la hucha)
  const balEl = document.getElementById('fin-bal');
  if(balEl) balEl.textContent = fmt(inc - exp);
  
  // HUCHA TOTAL
  const totalSavEl = document.getElementById('fin-total-sav');
  if(totalSavEl) totalSavEl.textContent = fmt(historicalSavings);
  
  // CAJAS SUPERIORES REALES
  const incTotEl = document.getElementById('fin-inc');
  if(incTotEl) incTotEl.textContent = fmt(trueInc);
  
  const expTotEl = document.getElementById('fin-exp');
  if(expTotEl) expTotEl.textContent = fmt(trueExp);
  
  const savTotEl = document.getElementById('fin-sav');
  if(savTotEl) {
      if(periodSavings < 0) {
         savTotEl.textContent = '-' + fmt(Math.abs(periodSavings));
         savTotEl.style.color = 'var(--red)';
      } else {
         savTotEl.textContent = fmt(periodSavings);
         savTotEl.style.color = 'var(--blu)';
      }
  }

  // --- PINTAR LISTA INGRESOS ---
  const incEntries = entries.filter(e => e.type === 'ingreso' && e.cat !== 'ahorro');
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

  // --- PINTAR LISTA GASTOS ---
  const expEntries = entries.filter(e => e.type === 'gasto' && e.cat !== 'ahorro');
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

  // --- PINTAR LISTA SUSCRIPCIONES ---
  const recEl = document.getElementById('fin-rec-list');
  if(recEl) {
    recEl.innerHTML = S.recurring.length ? S.recurring.map(r => `
      <div class="fin-row">
        <div class="row-gap">
          <div class="icon-box" style="background:var(--pur); color:#fff; border-radius:10px;">🔄</div>
          <div><div style="font-size:13px;font-weight:500">${r.name}</div><div class="item-sub">Día ${r.day} · ${r.type}</div></div>
        </div>
        <div style="text-align:right">
          <div class="${r.type==='ingreso'?'fin-amount-pos':'fin-amount-neg'}">${r.type==='gasto'?'-':''}${fmt(r.amount)}</div>
          <button class="btn-danger" onclick="delRecurring('${r.id}')">✕</button>
        </div>
      </div>`).join('') : '<div class="empty">Sin suscripciones</div>';
  }

  // --- PINTAR LISTA AHORRO ---
  const savEntries = entries.filter(e => e.cat === 'ahorro');
  const savListEl = document.getElementById('fin-sav-list');
  if(savListEl) {
    savListEl.innerHTML = savEntries.length ? savEntries.map(e => `
      <div class="fin-row">
        <div class="row-gap">
          <div class="icon-box" style="background:rgba(59,130,246,.1)">${catEmoji(e.cat)}</div>
          <div><div style="font-size:13px;font-weight:500">${e.desc}</div><div class="item-sub">${e.type === 'gasto' ? 'Ingresado a la hucha' : 'Sacado de la hucha'} · ${e.date}</div></div>
        </div>
        <div style="text-align:right">
          <div class="${e.type === 'gasto' ? 'fin-amount-pos' : 'fin-amount-neg'}" style="color:${e.type === 'gasto' ? 'var(--blu)' : 'var(--t2)'}">${e.type === 'gasto' ? '+' : '-'}${fmt(e.amount)}</div>
          <button class="btn-danger" onclick="delFinEntry('${e.id}')">✕</button>
        </div>
      </div>`).join('') : '<div class="empty">Sin movimientos de ahorro</div>';
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
      { label:'Ingresos Reales', data:[], borderColor:'#27ae60', backgroundColor:'rgba(39,174,96,.08)', tension:.4, fill:true, pointRadius:3 },
      { label:'Gastos Reales', data:[], borderColor:'#e74c3c', backgroundColor:'rgba(231,76,60,.06)', tension:.4, fill:true, pointRadius:3, borderDash:[4,4] }
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
    inc = labels.map(d => S.fin.filter(e=>e.type==='ingreso' && e.cat!=='ahorro' && e.date===`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`).reduce((a,e)=>a+e.amount,0));
    exp = labels.map(d => S.fin.filter(e=>e.type==='gasto' && e.cat!=='ahorro' && e.date===`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`).reduce((a,e)=>a+e.amount,0));
  } else if (period === 'semana') {
    const wdays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    labels = wdays;
    for (let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-d.getDay()+1+i);const ds=d.toISOString().split('T')[0];inc.push(S.fin.filter(e=>e.type==='ingreso' && e.cat!=='ahorro' && e.date===ds).reduce((a,e)=>a+e.amount,0));exp.push(S.fin.filter(e=>e.type==='gasto' && e.cat!=='ahorro' && e.date===ds).reduce((a,e)=>a+e.amount,0));}
  } else if (period === 'año') {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    labels = months;
    for (let m=0;m<12;m++){const yr=now.getFullYear(),mo=String(m+1).padStart(2,'0');inc.push(S.fin.filter(e=>e.type==='ingreso' && e.cat!=='ahorro' && e.date.startsWith(`${yr}-${mo}`)).reduce((a,e)=>a+e.amount,0));exp.push(S.fin.filter(e=>e.type==='gasto' && e.cat!=='ahorro' && e.date.startsWith(`${yr}-${mo}`)).reduce((a,e)=>a+e.amount,0));}
  } else {
    const years = [...new Set(S.fin.map(e=>e.date.slice(0,4)))].sort();
    labels = years.length ? years : [String(now.getFullYear())];
    inc = labels.map(y=>S.fin.filter(e=>e.type==='ingreso' && e.cat!=='ahorro' && e.date.startsWith(y)).reduce((a,e)=>a+e.amount,0));
    exp = labels.map(y=>S.fin.filter(e=>e.type==='gasto' && e.cat!=='ahorro' && e.date.startsWith(y)).reduce((a,e)=>a+e.amount,0));
  }
  finChartInst.data.labels = labels;
  finChartInst.data.datasets[0].data = inc;
  finChartInst.data.datasets[1].data = exp;
  finChartInst.update();
}
