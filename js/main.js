// 1. ESTADO GLOBAL
const S = {
  tasks: [], fin: [], recurring: [], stocks: [], routines: [], workoutLog: [], prs: {},
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
    // Protecciones contra datos vacíos
    if (!S.tasks) S.tasks = [];
    if (!S.workoutLog) S.workoutLog = [];
    if (!S.fin) S.fin = [];
    if (!S.stocks) S.stocks = [];
    if (!S.recurring) S.recurring = [];
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

// 5. CONTROL DE MODALES (VITAL PARA LOS BOTONES)
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
function cancelConfirm(e, force = false) {
  if (force || !e || (e.target && e.target.classList.contains('overlay'))) {
    closeAllModals();
    confirmAction = null;
  }
}

// 6. DASHBOARD E INICIO
function renderHome() {
    const hoyStr = today(); // Fecha de hoy (ej: 2026-05-06)
    let pendingCount = 0;
    let combined = [];

    // 1. Recopilar metas diarias normales
    if (S.tasks) {
        S.tasks.forEach(t => {
            if (t.date === hoyStr) combined.push({ ...t, isProject: false });
        });
    }

    // 2. Recopilar tareas de proyectos cuya fecha límite es hoy
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

    // 3. Ordenar: No hechas primero, luego por prioridad (Matriz Eisenhower)
    const pWeight = { ui: 4, ni: 3, un: 2, nn: 1 };
    combined.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        let wA = a.isProject ? (pWeight[a.priority] || 0) : 0; 
        let wB = b.isProject ? (pWeight[b.priority] || 0) : 0;
        return wB - wA; 
    });

    // 4. Contar cuántas tareas de hoy están pendientes
    combined.forEach(t => {
        if (!t.done) pendingCount++;
    });

    // 5. Actualizar el recuadro gigante de Eventos Pendientes
    const countEl = document.getElementById('home-pending-count');
    if (countEl) countEl.textContent = pendingCount;

    // 6. Renderizar la lista debajo del calendario
    const listEl = document.getElementById('home-tasks-list');
    if (listEl) {
        if (combined.length === 0) {
            listEl.innerHTML = `<div style="color:var(--t3); font-size:13px; text-align:center; padding:20px;">No hay eventos para hoy. ¡Disfruta tu día libre! 🎉</div>`;
            return;
        }

        const prioColor = { ui: '#e74c3c', ni: '#3b82f6', un: '#f59e0b', nn: '#95a5a6', acc: '#8b5cf6' };

        listEl.innerHTML = combined.map(t => {
            // El color dependerá de si es tarea de proyecto (usa la matriz) o meta normal (usa color de acento)
            const color = t.isProject ? (prioColor[t.priority] || 'var(--acc)') : 'var(--acc)';
            const title = t.isProject ? t.text : t.name;
            const sub = t.isProject ? `Proyecto: ${t.projectName}` : (t.time ? `${t.time} · ${t.cat}` : t.cat);
            
            // Al hacer clic en una tarea de inicio, te lleva a la Agenda para gestionarla
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg3); border-radius:10px; margin-bottom:8px; border-left: 4px solid ${color}; opacity: ${t.done ? '0.6' : '1'}; cursor:pointer;" onclick="window.location.href='calendario.html'">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="check-circle ${t.done ? 'checked' : ''}"></div>
                    <div style="flex:1">
                        <div style="font-size:14px; font-weight:600; color:${t.done ? 'var(--t3)' : 'var(--t1)'}; text-decoration:${t.done ? 'line-through' : 'none'};">${title}</div>
                        <div style="font-size:11px; color:var(--t3); margin-top:4px;">${sub}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
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
    const did = S.workoutLog.some(w => w.date === dStr);
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
  
  if(document.getElementById('home-gym-calendar')) renderHome();
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

        // Cuando ponemos el dedo en la rayita
        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
            modal.style.transition = 'none'; // Quitamos la animación para que siga al dedo
        }, { passive: true });

        // Mientras arrastramos el dedo
        handle.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const y = e.touches[0].clientY;
            currentY = Math.max(0, y - startY); // Solo permitimos arrastrar hacia abajo
            
            // Movemos el modal visualmente
            modal.style.transform = `translateY(${currentY}px)`;
        }, { passive: true });

        // Cuando soltamos el dedo
        handle.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            // Devolvemos la animación suave
            modal.style.transition = 'transform 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)'; 

            // Si lo hemos bajado más de 100px, lo cerramos
            if (currentY > 100) {
                const overlay = modal.closest('.overlay');
                if (overlay) {
                    // Quitamos los estilos en línea para que CSS vuelva a tomar el control
                    setTimeout(() => modal.style.transform = '', 300); 
                    overlay.classList.remove('on'); // Cerramos el modal
                }
            } else {
                // Si no lo bajamos lo suficiente, rebota a su sitio original
                modal.style.transform = ''; 
            }
            currentY = 0;
        });
    });
}
