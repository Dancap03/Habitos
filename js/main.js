// 1. ESTADO GLOBAL
const S = {
  tasks: [], fin: [], recurring: [], stocks: [], routines: [], workoutLog: [], prs: {}, projects: [],
  kanban: { todo:[], doing:[], done:[] }, eis: { ui:[], ni:[], un:[], nn:[] },
  pomo: { sessions: 0 }, activePeriod: 'semana', activeRoutine: null
};

let currGymMonth = new Date().getMonth();
let currGymYear = new Date().getFullYear();

// 2. PERSISTENCIA
function save() { localStorage.setItem('dancab_v1', JSON.stringify(S)); }
function load() {
  try {
    const d = localStorage.getItem('dancab_v1');
    if (d) Object.assign(S, JSON.parse(d));
    
    // Inicialización de seguridad para todos los arrays posibles
    if (!S.tasks) S.tasks = [];
    if (!S.projects) S.projects = [];
    if (!S.workoutLog) S.workoutLog = [];
    if (!S.fin) S.fin = [];
    if (!S.stocks) S.stocks = [];
    if (!S.recurring) S.recurring = [];
    
    // Arrays antiguos por si acaso
    if (!S.incomes) S.incomes = [];
    if (!S.expenses) S.expenses = [];
    if (!S.savings) S.savings = [];
    if (!S.investments) S.investments = [];
  } catch(e) { console.error("Error cargando datos"); }
}

// 4. UTILIDADES GENERALES
function uid() { return Math.random().toString(36).slice(2, 10); }
function today() { 
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function fmt(n) { return '€' + (+n).toLocaleString('es-ES', {minimumFractionDigits:2}); }
function getWeek(d) { const dt = new Date(d), day = dt.getDay() || 7; dt.setDate(dt.getDate() + 4 - day); const y = new Date(dt.getFullYear(), 0, 1); return Math.ceil(((dt - y) / 86400000 + 1) / 7); }

// 5. CONTROL DE MODALES
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
function showToast(m, t='success') { const c = document.getElementById('toast-container'); if(!c) return; const tc = document.createElement('div'); tc.className=`toast ${t}`; tc.textContent=m; c.appendChild(tc); setTimeout(()=>tc.classList.add('show'),10); setTimeout(()=>{tc.classList.remove('show');setTimeout(()=>tc.remove(),300)},3000); }

// ==========================================
// CONFIRMACIÓN DE BORRADO DESDE INICIO
// ==========================================
let confirmDeleteActionHome = null;

function showDeleteConfirmHome(title, msg, callback) {
    const tEl = document.getElementById('confirm-del-title-home');
    const mEl = document.getElementById('confirm-del-msg-home');
    if(tEl) tEl.textContent = title;
    if(mEl) mEl.textContent = msg;
    confirmDeleteActionHome = callback;
    openModal('modal-confirm-delete-home');
}

function executeConfirmDeleteHome() {
    if (confirmDeleteActionHome) confirmDeleteActionHome();
    closeModal('modal-confirm-delete-home');
    confirmDeleteActionHome = null;
}

// ==========================================
// LÓGICA DE LA PANTALLA INICIO (HOY)
// ==========================================
function toggleTaskHome(id) {
    const t = S.tasks.find(x => x.id === id);
    if (t) { t.done = !t.done; save(); renderHome(); }
}

function toggleProjectTaskHome(projectId, taskId) {
    const p = S.projects.find(x => x.id === projectId);
    if (p) {
        const t = p.tasks.find(x => x.id === taskId);
        if (t) { t.done = !t.done; save(); renderHome(); }
    }
}

function deleteTaskHome(id) {
    showDeleteConfirmHome("Borrar Evento", "¿Seguro que quieres borrar este evento diario?", () => {
        S.tasks = S.tasks.filter(x => x.id !== id); 
        save(); renderHome();
    });
}

function delProjectTaskHome(projectId, taskId) {
    showDeleteConfirmHome("Borrar Tarea", "¿Seguro que quieres borrar esta tarea del proyecto?", () => {
        const p = S.projects.find(x => x.id === projectId);
        if(p) {
            p.tasks = p.tasks.filter(x => x.id !== taskId);
            save(); renderHome();
        }
    });
}

// EDITAR DESDE INICIO
function openEditDailyTaskHome(id) {
    const t = S.tasks.find(x => x.id === id);
    if(!t) return;
    document.getElementById('edit-dt-id-home').value = t.id;
    document.getElementById('edit-dt-name-home').value = t.name || '';
    document.getElementById('edit-dt-desc-home').value = t.desc || '';
    document.getElementById('edit-dt-cat-home').value = (t.cat === 'Otro') ? 'Trabajo' : (t.cat || 'Trabajo');
    document.getElementById('edit-dt-time-home').value = t.time || '';
    document.getElementById('edit-dt-date-home').value = t.date || '';
    openModal('modal-edit-dt-home');
}

function saveEditDailyTaskHome() {
    const id = document.getElementById('edit-dt-id-home').value;
    const t = S.tasks.find(x => x.id === id);
    if(!t) return;
    const name = document.getElementById('edit-dt-name-home').value.trim();
    if(!name) return showToast('Escribe un nombre', 'error');

    t.name = name;
    t.desc = document.getElementById('edit-dt-desc-home').value.trim();
    t.cat = document.getElementById('edit-dt-cat-home').value;
    t.time = document.getElementById('edit-dt-time-home').value;
    t.date = document.getElementById('edit-dt-date-home').value;

    save();
    closeModal('modal-edit-dt-home');
    renderHome();
    showToast('Evento actualizado ✅');
}

function openEditProjectTaskHome(projectId, taskId) {
    const p = S.projects.find(x => x.id === projectId);
    if(!p) return;
    const t = p.tasks.find(x => x.id === taskId);
    if(!t) return;

    document.getElementById('edit-pt-pid-home').value = projectId;
    document.getElementById('edit-pt-tid-home').value = taskId;
    document.getElementById('edit-pt-name-home').value = t.text || '';
    document.getElementById('edit-pt-desc-home').value = t.desc || '';
    document.getElementById('edit-pt-priority-home').value = t.priority || 'nn';
    document.getElementById('edit-pt-deadline-home').value = t.deadline || '';

    openModal('modal-edit-pt-home');
}

function saveEditProjectTaskHome() {
    const projectId = document.getElementById('edit-pt-pid-home').value;
    const taskId = document.getElementById('edit-pt-tid-home').value;
    const name = document.getElementById('edit-pt-name-home').value.trim();
    if (!name) return showToast('Escribe el nombre de la tarea', 'error');

    const p = S.projects.find(x => x.id === projectId);
    const t = p.tasks.find(x => x.id === taskId);

    t.text = name;
    t.desc = document.getElementById('edit-pt-desc-home').value.trim();
    t.priority = document.getElementById('edit-pt-priority-home').value;
    t.deadline = document.getElementById('edit-pt-deadline-home').value;

    save();
    closeModal('modal-edit-pt-home');
    renderHome();
    showToast('Tarea actualizada ✅');
}

function renderHome() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hoyStr = `${y}-${m}-${day}`;
    
    let pendingCount = 0;
    let combined = [];

    if (S.tasks) {
        S.tasks.forEach(t => {
            if (t.date === hoyStr) combined.push({ ...t, isProject: false });
        });
    }

    if (S.projects) {
        S.projects.forEach(p => {
            if (p.tasks) {
                p.tasks.forEach(t => {
                    if (t.deadline === hoyStr) {
                        combined.push({ ...t, isProject: true, projectName: p.name });
                    }
                });
            }
        });
    }

    const pWeight = { ui: 4, ni: 3, un: 2, nn: 1 };
    combined.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        let wA = a.isProject ? (pWeight[a.priority] || 0) : 0; 
        let wB = b.isProject ? (pWeight[b.priority] || 0) : 0;
        return wB - wA; 
    });

    combined.forEach(t => {
        if (!t.done) pendingCount++;
    });

    const countEl = document.getElementById('home-pending-count');
    if (countEl) countEl.textContent = pendingCount;

    const listEl = document.getElementById('home-tasks-list');
    if (listEl) {
        if (combined.length === 0) {
            listEl.innerHTML = `<div style="color:var(--t3); font-size:13px; text-align:center; padding:20px;">No hay eventos para hoy. ¡Disfruta tu día libre! 🎉</div>`;
            return;
        }

        const prioColor = { ui: '#e74c3c', ni: '#3b82f6', un: '#f59e0b', nn: '#95a5a6', acc: '#8b5cf6' };

        listEl.innerHTML = combined.map(t => {
            const color = t.isProject ? (prioColor[t.priority] || 'var(--acc)') : 'var(--acc)';
            const title = t.isProject ? t.text : t.name;
            let timeStr = t.time ? `${t.time} · ` : '';
            const sub = t.isProject ? `${timeStr}Proyecto: ${t.projectName}` : `${timeStr}${t.cat}`;
            
            const toggleAction = t.isProject ? `toggleProjectTaskHome('${t.projectId}', '${t.id}')` : `toggleTaskHome('${t.id}')`;
            const editAction = t.isProject ? `openEditProjectTaskHome('${t.projectId}', '${t.id}')` : `openEditDailyTaskHome('${t.id}')`;
            const deleteAction = t.isProject ? `delProjectTaskHome('${t.projectId}', '${t.id}')` : `deleteTaskHome('${t.id}')`;

            return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg3); border-radius:10px; margin-bottom:8px; border-left: 4px solid ${color}; opacity: ${t.done ? '0.6' : '1'}; cursor:pointer;" onclick="${editAction}">
                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                    <div class="check-circle ${t.done ? 'checked' : ''}" onclick="event.stopPropagation(); ${toggleAction}"></div>
                    <div style="flex:1;">
                        <div style="font-size:14px; font-weight:600; color:${t.done ? 'var(--t3)' : 'var(--t1)'}; text-decoration:${t.done ? 'line-through' : 'none'};">${title}</div>
                        <div style="font-size:11px; color:var(--t3); margin-top:4px;">${sub}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <button class="btn-danger" style="background:transparent; color:var(--red); padding:4px 8px; border:none; font-size:16px;" onclick="event.stopPropagation(); ${deleteAction}">✕</button>
                </div>
            </div>`;
        }).join('');
    }
}

// ==========================================
// FORMULARIO DE AÑADIR EVENTO DESDE INICIO
// ==========================================
function toggleCustomRecurrenceHome() {
    const val = document.getElementById('h-recurrence').value;
    document.getElementById('home-custom-recurrence-options').style.display = (val === 'custom') ? 'block' : 'none';
}

function toggleCustomDayHome(btn) {
    btn.classList.toggle('on');
    btn.style.background = btn.classList.contains('on') ? 'var(--acc)' : 'var(--bg3)';
    btn.style.color = btn.classList.contains('on') ? '#fff' : 'var(--t1)';
}

function addTaskHome() {
    const name = document.getElementById('h-name').value.trim();
    const desc = document.getElementById('h-desc').value.trim(); 
    if (!name) return showToast('Escribe un nombre', 'error');
    
    const cat = document.getElementById('h-cat').value;
    const time = document.getElementById('h-time').value;
    const recurrence = document.getElementById('h-recurrence').value;
    
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hoyStr = `${y}-${m}-${day}`;
    
    const tDate = document.getElementById('h-start-date').value || hoyStr;

    if (cat === "Otro") {
        if (!S.projects.some(p => p.name === name)) {
            S.projects.push({ id: uid(), name: name, desc: desc, date: tDate, tasks: [] });
            save(); closeModal('modal-task-home'); renderHome(); 
            return showToast('Proyecto creado con éxito ✅');
        } else {
            return showToast('Ese proyecto ya existe', 'error');
        }
    }

    const createSingleTask = (dateStr) => {
        S.tasks.push({ id: uid(), name, cat, time, date: dateStr, desc: desc, done: false });
    };

    if (recurrence === 'none') {
        createSingleTask(tDate);
    } else {
        const [y2, m2, d2] = tDate.split('-');
        let currDate = new Date(y2, m2 - 1, d2);
        let endLimit = new Date(currDate.getFullYear(), currDate.getMonth() + 1, 0); 
        let selectedCustomDays = [];

        if (recurrence === 'custom') {
            const customEnd = document.getElementById('h-recurrence-end').value;
            if (customEnd) {
                const [ey, em, ed] = customEnd.split('-');
                endLimit = new Date(ey, em - 1, ed); 
            } else { endLimit = new Date(currDate.getFullYear(), currDate.getMonth() + 3, 0); }
            document.querySelectorAll('#home-custom-recurrence-options .custom-day-btn.on').forEach(btn => selectedCustomDays.push(parseInt(btn.dataset.day)));
        }

        while (currDate <= endLimit) {
            const dStr = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, '0')}-${String(currDate.getDate()).padStart(2, '0')}`;
            let shouldAdd = false;
            const dayOfWeek = currDate.getDay(); 
            if (recurrence === 'daily') shouldAdd = true;
            else if (recurrence === 'weekdays' && dayOfWeek !== 0 && dayOfWeek !== 6) shouldAdd = true; 
            else if (recurrence === 'weekly' && dayOfWeek === new Date(y2, m2 - 1, d2).getDay()) shouldAdd = true;
            else if (recurrence === 'custom' && selectedCustomDays.includes(dayOfWeek)) shouldAdd = true;

            if (shouldAdd) createSingleTask(dStr);
            currDate.setDate(currDate.getDate() + 1);
        }
    }
    
    save(); 
    closeModal('modal-task-home');
    
    document.getElementById('h-name').value = '';
    document.getElementById('h-desc').value = '';
    document.getElementById('h-time').value = '';
    document.getElementById('h-recurrence').value = 'none';
    document.getElementById('home-custom-recurrence-options').style.display = 'none';
    document.querySelectorAll('#home-custom-recurrence-options .custom-day-btn').forEach(btn => {
        btn.classList.remove('on');
        btn.style.background = 'var(--bg3)';
        btn.style.color = 'var(--t1)';
    });

    renderHome(); 
    showToast('Evento guardado ✅');
}

// ==========================================
// TRADUCTOR UNIVERSAL: SINCRONIZACIÓN ESTADÍSTICAS
// ==========================================
function syncHomeStats() {
    
    // --- 1. FINANZAS ---
    if (document.getElementById('home-fin-avail')) {
        let inc = 0, exp = 0, sav = 0, inv = 0;

        // Leer datos de listas antiguas (por si están ahí)
        if (S.incomes) S.incomes.forEach(e => inc += (parseFloat(e.amount || e.importe) || 0));
        if (S.expenses) S.expenses.forEach(e => exp += (parseFloat(e.amount || e.importe) || 0));
        if (S.savings) S.savings.forEach(e => sav += (parseFloat(e.amount || e.importe) || 0));
        if (S.investments) S.investments.forEach(e => inv += (parseFloat(e.amount || e.importe) || 0));

        // Leer datos de lista unificada (nuevo diseño)
        if (S.fin && S.fin.length > 0) {
            S.fin.forEach(e => {
                const amt = parseFloat(e.amount || e.importe) || 0;
                const cat = (e.cat || e.categoria || '').toLowerCase();
                const type = (e.type || e.tipo || '').toLowerCase();

                if (cat === 'ahorro' || type === 'ahorro') sav += amt;
                else if (cat.includes('invers') || type.includes('invers')) inv += amt;
                else if (type === 'ingreso') inc += amt;
                else if (type === 'gasto') exp += amt;
            });
        }

        const avail = inc - exp - sav - inv;

        document.getElementById('home-fin-avail').textContent = fmt(avail);
        document.getElementById('home-fin-inc').textContent = fmt(inc);
        document.getElementById('home-fin-exp').textContent = fmt(exp);
        document.getElementById('home-fin-sav').textContent = fmt(sav);
        document.getElementById('home-fin-inv').textContent = fmt(inv);
    }

    // --- 2. CARTERA ---
    if (document.getElementById('home-port-total')) {
        let total = 0, invested = 0;
        
        // La información puede estar guardada con distintos nombres según tu código de cartera
        const portArray = S.stocks || S.cartera || S.portfolio || [];
        
        portArray.forEach(s => {
            const shares = parseFloat(s.shares || s.qty || s.quantity || s.cantidad || s.amount || 0);
            const avg = parseFloat(s.avgPrice || s.avg || s.buyPrice || s.precioCompra || s.precio || s.price || 0);
            
            // Si tu app de cartera no guarda precio actual localmente, no pasará nada porque leerá totales pre-calculados abajo
            const current = parseFloat(s.currentPrice || s.precioActual || s.lastPrice || s.price || avg);

            total += (current * shares);
            invested += (avg * shares);
        });

        // SI tu app de Cartera calcula y guarda el total global... (esto sobreescribe lo de arriba)
        if (S.totalValue && S.totalValue > 0) total = parseFloat(S.totalValue);
        else if (S.portTotal && S.portTotal > 0) total = parseFloat(S.portTotal);
        
        if (S.totalInvested && S.totalInvested > 0) invested = parseFloat(S.totalInvested);
        else if (S.portInvested && S.portInvested > 0) invested = parseFloat(S.portInvested);

        const pnl = total - invested;
        const pct = invested > 0 ? (pnl / invested) * 100 : 0;
        const sign = pnl > 0 ? '+' : ''; 
        const color = pnl >= 0 ? 'var(--grn)' : 'var(--red)';

        document.getElementById('home-port-total').textContent = fmt(total);
        document.getElementById('home-port-inv').textContent = fmt(invested);
        
        const pnlEl = document.getElementById('home-port-pnl');
        if(pnlEl) {
            pnlEl.textContent = `${sign}${fmt(pnl)} (${sign}${pct.toFixed(2)}%)`;
            pnlEl.style.color = color;
        }
    }

    // --- 3. GYM ---
    if (document.getElementById('home-gym-calendar')) {
        renderGymCalendar();
    }
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
    const did = S.workoutLog && S.workoutLog.some(w => w.date === dStr);
    const isT = dStr === today();
    html += `<div style="display:flex;justify-content:center;"><div style="width:28px;height:28px;border-radius:50%;background:${did?'var(--acc)':'var(--bg4)'};border:${isT?'2px solid #fff':'none'};display:flex;justify-content:center;align-items:center;font-size:11px;font-weight:700;color:${did?'#fff':'var(--t2)'};">${i}</div></div>`;
  }
  calEl.innerHTML = html;
}

function init() {
  load();
  setupSwipeToClose();
  const h = new Date().getHours();
  const greet = h<5?'Buenas noches':h<12?'Buenos días':h<20?'Buenas tardes':'Buenas noches';
  const elGreet = document.getElementById('greeting');
  if(elGreet) elGreet.textContent = `${greet} · ${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}`;
  
  // SI ESTAMOS EN LA PANTALLA INICIO, SINCRONIZAMOS TODO:
  if(document.getElementById('home-pending-count')) {
      renderHome();
      syncHomeStats();
  }
  
  if(document.getElementById('finChart') && typeof renderFinances === 'function') { setTimeout(initFinChart, 100); renderFinances(); }
  if(document.getElementById('stock-list') && typeof renderStocks === 'function') renderStocks();
}
document.addEventListener('DOMContentLoaded', init);

// ==========================================
// DESLIZAR PARA CERRAR MODALES (SWIPE DOWN)
// ==========================================
function setupSwipeToClose() {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        const handle = modal.querySelector('.modal-handle');
        if (!handle) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
            modal.style.transition = 'none'; 
        }, { passive: true });

        handle.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const y = e.touches[0].clientY;
            currentY = Math.max(0, y - startY); 
            modal.style.transform = `translateY(${currentY}px)`;
        }, { passive: true });

        handle.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            modal.style.transition = 'transform 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)'; 

            if (currentY > 100) {
                const overlay = modal.closest('.overlay');
                if (overlay) {
                    setTimeout(() => modal.style.transform = '', 300); 
                    overlay.classList.remove('on'); 
                }
            } else {
                modal.style.transform = ''; 
            }
            currentY = 0;
        });
    });
}
