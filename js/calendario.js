// ==========================================
// ESTADO LOCAL Y CONFIGURACIÓN
// ==========================================
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDateStr = today(); // from main.js

let pomoSec = 25 * 60;
let pomoRunning = false;
let pomoInterval = null;
let pomoMode = 'focus';
const pomoModes = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

// Control de Acordeones de Proyectos
let openProjects = {}; 

// ==========================================
// INICIALIZACIÓN DE LA BASE DE DATOS
// ==========================================
function initAgendaData() {
    if (!S.tasks) S.tasks = [];
    if (!S.pomo) S.pomo = { sessions: 0 };
    if (!S.resources) S.resources = [];
    if (!S.projects) S.projects = []; 
    
    if (!S.agenda) S.agenda = {};
    if (!S.agenda.habits) S.agenda.habits = [];
    if (!S.agenda.habitLogs) S.agenda.habitLogs = {};
}

// ==========================================
// LÓGICA DEL CALENDARIO
// ==========================================
function renderCalendar() {
    const daysContainer = document.getElementById('cal-days');
    const monthYearLabel = document.getElementById('cal-month-year');
    if (!daysContainer) return;
    daysContainer.innerHTML = '';
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYearLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    let startDayOfWeek = firstDay.getDay() || 7; 
    for (let i = 1; i < startDayOfWeek; i++) {
        daysContainer.innerHTML += `<div class="cal-day empty"></div>`;
    }

    const hoyStr = today();
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let classes = ['cal-day'];
        if (dStr === hoyStr) classes.push('today');
        if (dStr === selectedDateStr) classes.push('selected');
        if (S.tasks.some(t => t.date === dStr && !t.done)) classes.push('has-task');
        daysContainer.innerHTML += `<div class="${classes.join(' ')}" onclick="selectDate('${dStr}')">${day}</div>`;
    }
}

function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function selectDate(dStr) {
    selectedDateStr = dStr;
    const label = document.getElementById('selected-date-label');
    if (dStr === today()) label.textContent = "Hoy";
    else {
        const dateObj = new Date(dStr);
        label.textContent = dateObj.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
    }
    document.getElementById('t-start-date').value = selectedDateStr;
    renderCalendar();
    renderDayContent();
}

function renderDayContent() {
    renderTasks();
    renderHabits();
}

function switchTaskView(v, pill) {
    document.querySelectorAll('#s-tareas .ag-pill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    ['agenda', 'proyectos', 'resources'].forEach(id => {
        const el = document.getElementById('tv-' + id);
        if (el) el.style.display = id === v ? 'block' : 'none';
    });
    if (v === 'proyectos') renderProjects();
}

// ==========================================
// GOAL SETTING (METAS)
// ==========================================
function addTask() {
    const name = document.getElementById('t-name').value.trim();
    if (!name) return showToast('Escribe un nombre', 'error');
    
    const cat = document.getElementById('t-cat').value;
    const time = document.getElementById('t-time').value;
    const recurrence = document.getElementById('t-recurrence').value;
    const tDate = document.getElementById('t-start-date').value || selectedDateStr;

    // CREAR PROYECTO SI ES "OTRO"
    if (cat === "Otro") {
        if (!S.projects.some(p => p.name === name)) {
            S.projects.push({ id: uid(), name: name, date: tDate, tasks: [] });
        }
    }

    const createSingleTask = (dateStr) => {
        S.tasks.push({ id: uid(), name, cat, time, date: dateStr, done: false });
    };

    if (recurrence === 'none') {
        createSingleTask(tDate);
    } else {
        const [y, m, d] = tDate.split('-');
        let currDate = new Date(y, m - 1, d);
        let endLimit = new Date(currDate.getFullYear(), currDate.getMonth() + 1, 0); 
        let selectedCustomDays = [];

        if (recurrence === 'custom') {
            const customEnd = document.getElementById('t-recurrence-end').value;
            if (customEnd) {
                const [ey, em, ed] = customEnd.split('-');
                endLimit = new Date(ey, em - 1, ed); 
            } else { endLimit = new Date(currDate.getFullYear(), currDate.getMonth() + 3, 0); }
            document.querySelectorAll('.custom-day-btn.on').forEach(btn => selectedCustomDays.push(parseInt(btn.dataset.day)));
        }

        while (currDate <= endLimit) {
            const dStr = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, '0')}-${String(currDate.getDate()).padStart(2, '0')}`;
            let shouldAdd = false;
            const dayOfWeek = currDate.getDay(); 
            if (recurrence === 'daily') shouldAdd = true;
            else if (recurrence === 'weekdays' && dayOfWeek !== 0 && dayOfWeek !== 6) shouldAdd = true; 
            else if (recurrence === 'weekly' && dayOfWeek === new Date(y, m - 1, d).getDay()) shouldAdd = true;
            else if (recurrence === 'custom' && selectedCustomDays.includes(dayOfWeek)) shouldAdd = true;

            if (shouldAdd) createSingleTask(dStr);
            currDate.setDate(currDate.getDate() + 1);
        }
    }
    
    save(); closeModal('modal-task');
    resetTaskForm();
    renderCalendar(); renderTasks(); renderProjects(); 
    showToast('Meta guardada ✅');
}

function resetTaskForm() {
    document.getElementById('t-name').value = '';
    document.getElementById('t-time').value = '';
    document.getElementById('t-recurrence').value = 'none';
    document.getElementById('custom-recurrence-options').style.display = 'none';
    document.querySelectorAll('.custom-day-btn').forEach(btn => {
        btn.classList.remove('on');
        btn.style.background = 'var(--bg3)';
        btn.style.color = 'var(--t1)';
    });
}

function toggleCustomRecurrence() {
    const val = document.getElementById('t-recurrence').value;
    document.getElementById('custom-recurrence-options').style.display = (val === 'custom') ? 'block' : 'none';
}

function toggleCustomDay(btn) {
    btn.classList.toggle('on');
    btn.style.background = btn.classList.contains('on') ? 'var(--acc)' : 'var(--bg3)';
    btn.style.color = btn.classList.contains('on') ? '#fff' : 'var(--t1)';
}

function renderTasks() {
    const list = document.getElementById('tasks-list');
    const dayTasks = S.tasks.filter(t => t.date === selectedDateStr);
    dayTasks.sort((a, b) => (a.done === b.done) ? 0 : a.done ? 1 : -1);
    
    if (dayTasks.length === 0) {
        list.innerHTML = `<div style="color:var(--t3); font-size:13px; text-align:center; padding:10px;">Nada para hoy.</div>`;
        return;
    }
    list.innerHTML = dayTasks.map(t => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg3); border-radius:10px; margin-bottom:8px; border-left: 4px solid var(--acc); opacity: ${t.done ? '0.6' : '1'};">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="check-circle ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')"></div>
                <div style="flex:1">
                    <div style="font-size:14px; font-weight:600; color:${t.done ? 'var(--t3)' : 'var(--t1)'}; text-decoration:${t.done ? 'line-through' : 'none'};">${t.name}</div>
                    <div style="font-size:11px; color:var(--t3); margin-top:4px;">${t.time || '--:--'} · ${t.cat}</div>
                </div>
            </div>
            <div style="color:var(--red); font-size:16px; cursor:pointer; padding: 0 8px;" onclick="deleteTask('${t.id}')">✕</div>
        </div>`).join('');
}

function toggleTask(id) {
    const t = S.tasks.find(x => x.id === id);
    if (t) { t.done = !t.done; save(); renderTasks(); renderCalendar(); }
}

function deleteTask(id) {
    if(confirm("¿Borrar meta?")) {
        S.tasks = S.tasks.filter(x => x.id !== id); 
        save(); renderTasks(); renderCalendar();
    }
}

// ==========================================
// VISTA PROYECTOS (ESTILO ACORDEÓN CON MATRIZ EISENHOWER)
// ==========================================
function toggleProject(id) {
    openProjects[id] = !openProjects[id];
    renderProjects();
}

function renderProjects() {
    const cont = document.getElementById('projects-container');
    if (!cont) return;
    if (!S.projects || S.projects.length === 0) {
        cont.innerHTML = '<div style="color:var(--t3); text-align:center; padding:20px; font-size:13px;">Las metas con categoría "Otro" se crearán aquí como proyectos.</div>';
        return;
    }
    
    cont.innerHTML = S.projects.map(p => {
        const isOpen = openProjects[p.id];
        const total = (p.tasks || []).length;
        const done = (p.tasks || []).filter(t => t.done).length;

        // Diccionario de colores estilo Eisenhower
        const prioColor = { ui: '#e74c3c', ni: '#3b82f6', un: '#f59e0b', nn: '#95a5a6' };
        
        let tasksHtml = '<div class="empty" style="padding:10px 0;">No hay tareas en este proyecto</div>';
        
        if (p.tasks && p.tasks.length > 0) {
            // Ordenamos: No hechas primero, luego por peso de prioridad
            const priorityWeight = { 'ui': 4, 'ni': 3, 'un': 2, 'nn': 1 };
            const sortedTasks = [...p.tasks].sort((a, b) => {
                if (a.done !== b.done) return a.done ? 1 : -1; 
                return priorityWeight[b.priority] - priorityWeight[a.priority]; 
            });

            tasksHtml = sortedTasks.map(t => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg3); border-radius:10px; margin-bottom:8px; border-left: 3px solid ${prioColor[t.priority] || 'var(--acc)'}; opacity: ${t.done ? '0.6' : '1'};">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="check-circle ${t.done ? 'checked' : ''}" onclick="toggleProjectTask('${p.id}', '${t.id}')"></div>
                        <div>
                            <div style="font-size:13px; font-weight:700; color:${t.done ? 'var(--t3)' : 'var(--t1)'}; text-decoration:${t.done ? 'line-through' : 'none'};">${t.text}</div>
                            <div style="font-size:10px; color:var(--t3); margin-top:2px;">Límite: ${t.deadline || '--/--/----'}</div>
                        </div>
                    </div>
                    <button class="btn-danger" style="background:transparent; color:var(--t3); font-size:14px; padding:0 8px;" onclick="delProjectTask('${p.id}', '${t.id}')">✕</button>
                </div>
            `).join('');
        }

        // Formulario de añadir tarea con las opciones de Eisenhower
        const bodyHtml = isOpen ? `
            <div style="padding: 0 16px 16px 16px; border-top: 1px solid var(--line); margin-top: 12px; padding-top: 16px;">
                <div style="font-size:10px; font-weight:800; color:var(--acc); letter-spacing:0.5px; margin-bottom:8px; text-transform:uppercase;">NUEVA TAREA DEL PROYECTO</div>
                <input type="text" id="pt-name-${p.id}" class="form-input" placeholder="Nombre de la tarea...">

                <div style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <label class="form-label">PRIORIDAD</label>
                        <select id="pt-priority-${p.id}" class="form-input">
                            <option value="ui">Urgente + Imp 🔴</option>
                            <option value="ni">No Urg + Imp 🔵</option>
                            <option value="un">Urg + No Imp 🟡</option>
                            <option value="nn" selected>No Urg + No Imp ⚪</option>
                        </select>
                    </div>
                    <div style="flex:1;">
                        <label class="form-label">FECHA LÍMITE</label>
                        <input type="date" id="pt-deadline-${p.id}" class="form-input">
                    </div>
                </div>
                <button class="btn" style="width:100%; background:var(--acc); color:#fff; font-weight:700; margin-bottom: 24px;" onclick="addProjectTask('${p.id}')">+ Añadir Tarea</button>

                <div style="font-size:10px; font-weight:800; color:var(--acc); letter-spacing:0.5px; margin-bottom:8px; text-transform:uppercase;">LISTA DE TAREAS</div>
                ${tasksHtml}
            </div>
        ` : '';

        return `
        <div style="margin-bottom:12px; background:var(--bg2); border-radius:12px; border:1px solid var(--line); overflow:hidden;">
            <div style="padding:14px 16px; background:var(--bg3); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleProject('${p.id}')">
                <div>
                    <div style="font-weight:800; color:var(--t1); font-size:15px; margin-bottom:4px;">${p.name}</div>
                    <div style="font-size:11px; color:var(--t3); font-weight:600;">Límite: ${p.date} • ${done}/${total} tareas</div>
                </div>
                <div style="display:flex; gap:16px; align-items:center;">
                    <button class="btn-danger" style="background:transparent; color:var(--red); padding:0;" onclick="event.stopPropagation(); delProject('${p.id}')">✕</button>
                    <div style="font-size:12px; color:var(--t3); transition:transform 0.2s; transform: rotate(${isOpen ? '180deg' : '0deg'});">▼</div>
                </div>
            </div>
            ${bodyHtml}
        </div>
        `;
    }).join('');
}

function delProject(id) {
    if(confirm("¿Eliminar este proyecto y todas sus tareas?")) {
        S.projects = S.projects.filter(p => p.id !== id);
        save(); renderProjects();
    }
}

function addProjectTask(projectId) {
    const name = document.getElementById(`pt-name-${projectId}`).value.trim();
    const priority = document.getElementById(`pt-priority-${projectId}`).value;
    const deadline = document.getElementById(`pt-deadline-${projectId}`).value;

    if (!name) return showToast('Escribe el nombre de la tarea', 'error');

    const p = S.projects.find(x => x.id === projectId);
    if (!p.tasks) p.tasks = [];

    p.tasks.push({ id: uid(), text: name, priority, deadline, done: false });

    save();
    renderProjects(); 
    showToast('Tarea añadida al proyecto');
}

function toggleProjectTask(projectId, taskId) {
    const p = S.projects.find(x => x.id === projectId);
    const t = p.tasks.find(x => x.id === taskId);
    t.done = !t.done;
    save(); renderProjects();
}

function delProjectTask(projectId, taskId) {
    if(confirm("¿Borrar esta tarea del proyecto?")) {
        const p = S.projects.find(x => x.id === projectId);
        p.tasks = p.tasks.filter(x => x.id !== taskId);
        save(); renderProjects();
    }
}

// ==========================================
// RECURSOS, POMODORO Y HÁBITOS
// ==========================================
function renderResources() {
    const list = document.getElementById('resources-list');
    if(!list) return;
    list.innerHTML = S.resources.length ? S.resources.map(r => `
        <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg2); border-radius:10px; margin-bottom:8px; border: 1px solid var(--line);">
            <div style="flex:1;">
                <a href="${r.url.startsWith('http') ? r.url : 'https://'+r.url}" target="_blank" style="color:var(--t1); font-weight:700; text-decoration:none; display:block; margin-bottom:4px; font-size:14px;">🔗 ${r.title}</a>
                <span class="tag" style="background:var(--bg3); color:var(--t3); font-size:10px; padding:2px 6px; border-radius:4px;">${r.cat}</span>
            </div>
            <button class="btn-danger" style="background:transparent; color:var(--t3);" onclick="delResource('${r.id}')">✕</button>
        </div>`).join('') : '<div class="empty">Vacío</div>';
}

function addResource() {
    const title = document.getElementById('res-title').value.trim();
    const url = document.getElementById('res-url').value.trim();
    const cat = document.getElementById('res-cat').value.trim() || 'General';
    if(!title || !url) return;
    S.resources.push({ id: uid(), title, url, cat });
    save(); closeModal('modal-resource'); renderResources();
}

function delResource(id) { S.resources = S.resources.filter(r => r.id !== id); save(); renderResources(); }

function updPomo() {
    const m = Math.floor(pomoSec/60), s = pomoSec%60;
    document.getElementById('pomo-display').textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    document.getElementById('pomo-sessions').textContent = S.pomo.sessions;
}

function togglePomo() {
    if (pomoRunning) {
        clearInterval(pomoInterval); pomoRunning = false;
        document.getElementById('pomo-play').textContent = '▶ Empezar';
    } else {
        pomoRunning = true;
        document.getElementById('pomo-play').textContent = '⏸ Pausar';
        pomoInterval = setInterval(() => {
            if (pomoSec > 0) { pomoSec--; updPomo(); }
            else {
                clearInterval(pomoInterval); pomoRunning = false;
                document.getElementById('pomo-play').textContent = '▶ Empezar';
                if (pomoMode === 'focus') { S.pomo.sessions++; save(); }
                pomoSec = pomoModes[pomoMode]; updPomo();
                showToast("¡Focus completado! 🔔");
            }
        }, 1000);
    }
}

function resetPomo() {
    clearInterval(pomoInterval); pomoRunning = false;
    pomoSec = pomoModes[pomoMode]; updPomo();
    document.getElementById('pomo-play').textContent = '▶ Empezar';
}

function setPomoMode(m, el) {
    document.querySelectorAll('.pomo-tab').forEach(b => b.classList.remove('on'));
    el.classList.add('on');
    pomoMode = m; pomoSec = pomoModes[m]; updPomo();
}

function renderHabits() {
    const list = document.getElementById('habits-list');
    const completedToday = S.agenda.habitLogs[selectedDateStr] || [];
    if (!S.agenda.habits.length) {
        list.innerHTML = '<div class="empty">No hay hábitos</div>';
        return;
    }
    list.innerHTML = S.agenda.habits.map(h => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--line);">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="check-circle ${completedToday.includes(h.id) ? 'checked' : ''}" onclick="toggleHabit('${h.id}')"></div>
                <span style="font-size:14px; font-weight:600; color:var(--t1);">${h.name}</span>
            </div>
            <div style="color:var(--t3); font-size:14px; cursor:pointer;" onclick="deleteHabit('${h.id}')">✕</div>
        </div>`).join('');
}

function addHabit() {
    const name = document.getElementById('habit-text').value.trim();
    if (!name) return;
    S.agenda.habits.push({ id: uid(), name });
    save(); closeModal('modal-habit'); renderHabits();
}

function toggleHabit(id) {
    if (!S.agenda.habitLogs[selectedDateStr]) S.agenda.habitLogs[selectedDateStr] = [];
    const log = S.agenda.habitLogs[selectedDateStr];
    const idx = log.indexOf(id);
    if (idx > -1) log.splice(idx, 1); else log.push(id);
    save(); renderHabits();
}

function deleteHabit(id) { S.agenda.habits = S.agenda.habits.filter(h => h.id !== id); save(); renderHabits(); }

// ==========================================
// INICIO AUTOMÁTICO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initAgendaData();
        selectDate(today()); 
        updPomo();
        renderResources();
    }, 100);
});
