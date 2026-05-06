function catEmoji(c) {
    const m = { nómina:'💼', 
               ahorro:'💰',
               inversión:'📈', 
               intereses:'📊', 
               dividendos:'🏦',
               comida:'🛒', 
               transporte:'🚗', 
               suscripciones:'📱', 
               salud:'❤️', 
               ocio:'🎭', 
               caprichos:'🎁', 
               compras:'🛍️', 
               viajes:'✈️'
    };
   return m[c] || '📌'; // Icono por defecto
}


function toggleFinTypeOptions() {
  const cat = document.getElementById('fin-cat').value;
  const typeEl = document.getElementById('fin-type');
  const dateWrap = document.getElementById('date-wrapper');
  const dayWrap = document.getElementById('day-wrapper');
  if (cat === 'ahorro') {
    typeEl.innerHTML = '<option value="gasto">Ingresar a hucha</option><option value="ingreso">Sacar de hucha</option>';
    dateWrap.style.display = 'block'; dayWrap.style.display = 'none';
  } else if (cat === 'inversión') {
    typeEl.innerHTML = '<option value="gasto">Inyectar capital</option><option value="ingreso">Retirar capital</option>';
    dateWrap.style.display = 'block'; dayWrap.style.display = 'none';
  } else if (cat === 'suscripciones') {
    typeEl.innerHTML = '<option value="gasto">Gasto</option>';
    dateWrap.style.display = 'none'; dayWrap.style.display = 'block';
  } else {
    typeEl.innerHTML = '<option value="ingreso">Ingreso</option><option value="gasto">Gasto</option>';
    dateWrap.style.display = 'block'; dayWrap.style.display = 'none';
  }
}

function openModalFin(type, defaultCat = null) {
  const elCat = document.getElementById('fin-cat');
  const elType = document.getElementById('fin-type');
  const elTitle = document.getElementById('modal-fin-title');
  if(defaultCat) elCat.value = defaultCat;
  else if(['ahorro','inversión','suscripciones'].includes(elCat.value)) elCat.value = type === 'ingreso' ? 'nómina' : 'otro';
  toggleFinTypeOptions();
  elType.value = type;
  elTitle.textContent = type === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto';
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
    S.recurring.push({ id: uid(), name: desc, amount, day, type: 'gasto' });
  } else {
    S.fin.push({ id: uid(), type, amount, desc, cat, date: document.getElementById('fin-date').value || today() });
  }
  save(); closeAllModals(); renderFinances(); if(typeof renderHome === 'function') renderHome(); showToast('Guardado');
}
function renderFinances() {
  const period = S.activePeriod || 'semana';
  document.querySelectorAll('.fin-tab').forEach(t => {
    t.classList.remove('on');
    if (t.textContent.toLowerCase().includes(period)) t.classList.add('on');
  });
  const entries = filterByPeriod(S.fin, period);
  const totalSav = S.fin.filter(e => e.cat === 'ahorro').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);
  const totalInv = S.fin.filter(e => e.cat === 'inversión').reduce((a,e) => a + (e.type==='gasto'?e.amount:-e.amount), 0);
  const available = S.fin.reduce((a,e) => a + (e.type==='ingreso'?e.amount:-e.amount), 0);
  document.getElementById('fin-bal').textContent = fmt(available);
  document.getElementById('fin-total-sav').textContent = fmt(totalSav);
  document.getElementById('fin-total-inv-label').textContent = fmt(totalInv);
  document.getElementById('fin-inc').textContent = fmt(entries.filter(e => e.type==='ingreso' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e)=>a+e.amount,0));
  document.getElementById('fin-exp').textContent = fmt(entries.filter(e => e.type==='gasto' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e)=>a+e.amount,0));
  document.getElementById('fin-sav').textContent = fmt(entries.filter(e => e.cat==='ahorro').reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
  document.getElementById('fin-inv-period').textContent = fmt(entries.filter(e => e.cat==='inversión').reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
  renderList('fin-income-list', entries.filter(e => e.type === 'ingreso' && !['ahorro','inversión'].includes(e.cat)));
  renderList('fin-expense-list', entries.filter(e => e.type === 'gasto' && !['ahorro','inversión'].includes(e.cat)));
  renderList('fin-sav-list', entries.filter(e => e.cat === 'ahorro'), true);
  renderList('fin-inv-list', entries.filter(e => e.cat === 'inversión'), true);
  const recEl = document.getElementById('fin-rec-list');
  if(recEl) recEl.innerHTML = S.recurring.length ? S.recurring.map(r => `
    <div class="fin-row" style="padding:10px 0; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="icon-box" style="background:var(--pur); color:#fff; padding:8px; border-radius:8px;">🔄</div>
        <div><div style="font-size:13px;font-weight:600">${r.name}</div><div class="item-sub" style="font-size:11px;color:var(--t2)">Día ${r.day}</div></div>
      </div>
      <div style="text-align:right; display:flex; align-items:center; gap:8px;">
         <div style="font-weight:700; color:var(--red)">-${fmt(r.amount)}</div>
         <button class="btn-danger" onclick="delRecurring('${r.id}')">✕</button>
      </div>
    </div>`).join('') : '<div class="empty">Vacío</div>';
  updateFinChart(period);
}

function renderList(id, list, h=false) {
  const el = document.getElementById(id); if(!el) return;
  el.innerHTML = list.length ? list.map(e => `
    <div class="fin-row" style="padding:10px 0; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="icon-box" style="background:${h ? (e.cat==='ahorro'?'rgba(59,130,246,0.1)':'rgba(245,158,11,0.1)') : 'rgba(255,255,255,0.05)'}; padding:8px; border-radius:8px;">${catEmoji(e.cat)}</div>
        <div><div style="font-size:13px;font-weight:600">${e.desc}</div><div class="item-sub" style="font-size:11px;color:var(--t2)">${e.date}</div></div>
      </div>
      <div style="text-align:right; display:flex; align-items:center; gap:8px;">
        <div style="font-weight:700; color:${e.type==='ingreso'?'var(--grn)':'var(--red)'}">${e.type==='gasto'?'-':'+'}${fmt(e.amount)}</div>
        <button class="btn-danger" onclick="delFinEntry('${e.id}')">✕</button>
      </div>
    </div>`).join('') : '<div class="empty">Vacío</div>';
}


function filterByPeriod(entries, period) {
  const now = new Date();
  return entries.filter(e => {
    const d = new Date(e.date);
    if (period === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'semana') return getWeek(e.date) === getWeek(today());
    if (period === 'año') return d.getFullYear() === now.getFullYear();
    return true;
  });
}

function setFinPeriod(p, btn) { S.activePeriod = p; renderFinances(); }

// ==========================================
// SISTEMA DE CONFIRMACIÓN PERSONALIZADO
// ==========================================
let confirmCallback = null;

function customConfirm(title, message, callback) {
    // 1. Rellenamos los textos del modal
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = message;
    
    // 2. Guardamos lo que tiene que hacer si pulsa "Borrar"
    confirmCallback = callback;
    
    // 3. Abrimos el modal
    openModal('modal-confirm');
}

// Escuchamos el clic del botón rojo de borrar dentro del modal
document.addEventListener('DOMContentLoaded', () => {
    const btnBorrar = document.getElementById('confirm-btn');
    if (btnBorrar) {
        btnBorrar.addEventListener('click', () => {
            if (confirmCallback) confirmCallback(); // Ejecuta el borrado
            closeModal('modal-confirm'); // Cierra la ventana
            confirmCallback = null; // Limpia la memoria
        });
    }
});

// ==========================================
// FUNCIONES DE BORRADO USANDO EL MODAL BONITO
// ==========================================
function delFinEntry(id) { 
    customConfirm(
        'Borrar registro', 
        '¿Seguro que quieres borrar este movimiento?', 
        () => {
            S.fin = S.fin.filter(x => String(x.id) !== String(id)); 
            save(); 
            renderFinances(); // Usa updateFinanzasPage() si es así como se llama en tu código actual
            if(typeof renderHome === 'function') renderHome(); 
            if(typeof showToast === 'function') showToast('Registro eliminado 🗑️', 'success');
        }
    );
}

function delRecurring(id) { 
    customConfirm(
        'Borrar suscripción', 
        '¿Seguro que quieres borrar esta suscripción?', 
        () => {
            S.recurring = S.recurring.filter(x => String(x.id) !== String(id)); 
            save(); 
            renderFinances(); // Usa updateFinanzasPage() si es así como se llama en tu código actual
            if(typeof showToast === 'function') showToast('Suscripción eliminada 🗑️', 'success');
        }
    );
}

let finChartInst = null;
function initFinChart() {
  const ctx = document.getElementById('finChart'); if (!ctx) return;
  finChartInst = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label:'Ingresos', data:[], borderColor:'#27ae60', backgroundColor:'rgba(39,174,96,.08)', tension:.4, fill:true, pointRadius:3 },
      { label:'Gastos', data:[], borderColor:'#e74c3c', backgroundColor:'rgba(231,76,60,.06)', tension:.4, fill:true, borderDash:[4,4], pointRadius:3 },
      { label:'Ahorrado', data:[], borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.08)', tension:.4, fill:true, pointRadius:3 },
      { label:'Invertido', data:[], borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,.08)', tension:.4, fill:true, pointRadius:3 }
    ]},
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#444',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#444',font:{size:10},callback:v=>'€'+v},grid:{color:'rgba(255,255,255,.03)'}}}}
  });
  updateFinChart(S.activePeriod || 'semana');
}

function updateFinChart(period) {
  if (!finChartInst) return;
  let labels = [], inc = [], exp = [], sav = [], inv = [];
  const now = new Date();
  if (period === 'semana') {
    labels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    for (let i=0; i<7; i++) {
      const d = new Date(); d.setDate(d.getDate() - (d.getDay() || 7) + 1 + i);
      const ds = d.toISOString().split('T')[0];
      getDataForPoint(ds, inc, exp, sav, inv);
    }
  } else if (period === 'mes') {
    const days = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    for (let i=1; i<=days; i++) {
      labels.push(i);
      const ds = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      getDataForPoint(ds, inc, exp, sav, inv);
    }
  } else if (period === 'año') {
    labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    for (let m=1; m<=12; m++) {
      const prefix = `${now.getFullYear()}-${String(m).padStart(2,'0')}`;
      inc.push(S.fin.filter(e => e.date.startsWith(prefix) && e.type==='ingreso' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e)=>a+e.amount,0));
      exp.push(S.fin.filter(e => e.date.startsWith(prefix) && e.type==='gasto' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e)=>a+e.amount,0));
      sav.push(S.fin.filter(e => e.date.startsWith(prefix) && e.cat==='ahorro').reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
      inv.push(S.fin.filter(e => e.date.startsWith(prefix) && e.cat==='inversión').reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
    }
  } else {
    let years = [...new Set(S.fin.map(e => e.date.slice(0,4)))].sort();
    if (years.length === 0) years = [String(now.getFullYear())];
    labels = years;
    years.forEach(y => {
      inc.push(S.fin.filter(e => e.date.startsWith(y) && e.type==='ingreso' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e)=>a+e.amount,0));
      exp.push(S.fin.filter(e => e.date.startsWith(y) && e.type==='gasto' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e)=>a+e.amount,0));
      sav.push(S.fin.filter(e => e.date.startsWith(y) && e.cat==='ahorro').reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
      inv.push(S.fin.filter(e => e.date.startsWith(y) && e.cat==='inversión').reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
    });
  }
  finChartInst.data.labels = labels;
  finChartInst.data.datasets[0].data = inc;
  finChartInst.data.datasets[1].data = exp;
  finChartInst.data.datasets[2].data = sav;
  finChartInst.data.datasets[3].data = inv;
  finChartInst.update();
}

function getDataForPoint(ds, inc, exp, sav, inv) {
  inc.push(S.fin.filter(e => e.date===ds && e.type==='ingreso' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e)=>a+e.amount,0));
  exp.push(S.fin.filter(e => e.date===ds && e.type==='gasto' && !['ahorro','inversión'].includes(e.cat)).reduce((a,e)=>a+e.amount,0));
  sav.push(S.fin.filter(e => e.date===ds && e.cat==='ahorro').reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
  inv.push(S.fin.filter(e => e.date===ds && e.cat==='inversión').reduce((a,e)=>a+(e.type==='gasto'?e.amount:-e.amount),0));
}
