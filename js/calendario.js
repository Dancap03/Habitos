// ==========================================
// ESTADO LOCAL Y CONFIGURACIÓN
// ==========================================
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDateStr = today(); 

let pomoSec = 25 * 60;
let pomoRunning = false;
let pomoInterval = null;
let pomoMode = 'focus';
const pomoModes = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

let openProjects = {}; 

const prioColor = { ui: '#e74c3c', ni: '#3b82f6', un: '#f59e0b', nn: '#95a5a6', acc: '#8b5cf6' };
const prioText = { ui: 'Urgente + Imp 🔴', ni: 'No Urg + Imp 🔵', un: 'Urg + No Imp 🟡', nn: 'No Urg + No Imp ⚪' };

// ==========================================
// SISTEMA DE CONFIRMACIÓN DE BORRADO SEGURO
// ==========================================
let confirmDeleteAction = null;

function showDeleteConfirm(title, msg, callback) {
    document.getElementById('confirm-del-title').textContent = title;
    document.getElementById('confirm-del-msg').textContent = msg;
    confirmDeleteAction = callback;
    openModal('modal-confirm-delete');
}

document.getElementById('confirm-del-btn').addEventListener('click', () => {
    if (confirmDeleteAction) confirmDeleteAction();
    closeModal('modal-confirm-delete');
});

// ==========================================
// INICIALIZACIÓN
// ==========================================
function initAgendaData() {
    if (!S.tasks) S.tasks = [];
    if (!S.pomo) S.pomo = { sessions: 0 };
    if (!S.resources) S.resources = [];
    if (!S.projects) S.projects = []; 
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
        
        let dayPriorities = new Set();
        if (S.tasks.some(t => t.date === dStr && !t.done)) dayPriorities.add('acc'); 
        S.projects.forEach(p => {
            if(p.tasks) p.tasks.forEach(t => { if (t.deadline === dStr && !t.done) dayPriorities.add(t.priority); });
        });

        let dotsHtml = '';
        if (dayPriorities.size > 0) {
            dotsHtml = '<div style="display:flex; justify-content:center; gap:3px; margin-top:3px; height:4px;">';
            dayPriorities.forEach(prio => {
                dotsHtml += `<div style="width:4px; height:4px; border-radius:50%; background:${prioColor[prio] || 'var(--acc)'};"></div>`;
            });
            dotsHtml += '</div>';
        }

        daysContainer.innerHTML += `<div class="${classes.join(' ')}" onclick="selectDate('${dStr}')">
            <div>${day}</div>
            ${dotsHtml}
        </div>`;
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
    renderProjects();
}

function switchTaskView(v, pill) {
    document.querySelectorAll('#s-tareas .ag-pill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    ['agenda', 'resources'].forEach(id => {
        const el = document.getElementById('tv-' + id);
        if (el) el.style.display = id === v ? 'block' : 'none';
    });
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

    if (cat === "Otro") {
        if (!S.projects.some(p => p.name === name)) {
            S.projects.push({ id: uid(), name: name, date: tDate, tasks: [] });
            save(); resetTaskForm(); renderCalendar(); renderDayContent(); 
            return showToast('Proyecto creado con éxito ✅');
        } else {
            return showToast('Ese proyecto ya existe', 'error');
        }
    }

    const createSingleTask = (dateStr) => {
        S.tasks.push({ id: uid(), name, cat, time, date: dateStr, desc: '', done: false });
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
    renderCalendar(); renderDayContent(); 
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
    let combined = [];

    S.tasks.forEach(t => {
        if (t.date === selectedDateStr) combined.push({ ...t, isProject: false });
    });

    S.projects.forEach(p => {
        if (p.tasks) {
            p.tasks.forEach(t => {
                if (t.deadline === selectedDateStr) {
                    combined.push({ ...t, isProject: true, projectId: p.id, projectName: p.name });
                }
            });
        }
    });

    if (combined.length === 0) {
        list.innerHTML = `<div style="color:var(--t3); font-size:13px; text-align:center; padding:10px;">Nada para hoy. Disfruta tu día libre.</div>`;
        return;
    }

    const pWeight = { ui: 4, ni: 3, un: 2, nn: 1 };
    combined.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        let wA = a.isProject ? (pWeight[a.priority] || 0) : 0; 
        let wB = b.isProject ? (pWeight[b.priority] || 0) : 0;
        return wB - wA; 
    });

    list.innerHTML = combined.map(t => {
        if (t.isProject) {
            const color = prioColor[t.priority] || 'var(--acc)';
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg3); border-radius:10px; margin-bottom:8px; border-left: 4px solid ${color}; opacity: ${t.done ? '0.6' : '1'}; cursor:pointer;" onclick="openEditProjectTask('${t.projectId}', '${t.id}')">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="check-circle ${t.done ? 'checked' : ''}" onclick="event.stopPropagation(); toggleProjectTask('${t.projectId}', '${t.id}')"></div>
                    <div style="flex:1">
                        <div style="font-size:14px; font-weight:600; color:${t.done ? 'var(--t3)' : 'var(--t1)'}; text-decoration:${t.done ? 'line-through' : 'none'};">${t.text}</div>
                        <div style="font-size:11px; color:var(--t3); margin-top:4px;">Proyecto: ${t.projectName}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <button class="btn-danger" style="background:transparent; color:var(--red); padding:4px 8px; border:none; font-size:16px;" onclick="event.stopPropagation(); delProjectTask('${t.projectId}', '${t.id}')">✕</button>
                </div>
            </div>`;
        } else {
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg3); border-radius:10px; margin-bottom:8px; border-left: 4px solid var(--acc); opacity: ${t.done ? '0.6' : '1'}; cursor:pointer;" onclick="openEditDailyTask('${t.id}')">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="check-circle ${t.done ? 'checked' : ''}" onclick="event.stopPropagation(); toggleTask('${t.id}')"></div>
                    <div style="flex:1">
                        <div style="font-size:14px; font-weight:600; color:${t.done ? 'var(--t3)' : 'var(--t1)'}; text-decoration:${t.done ? 'line-through' : 'none'};">${t.name}</div>
                        <div style="font-size:11px; color:var(--t3); margin-top:4px;">${t.time || '--:--'} · ${t.cat}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <button class="btn-danger" style="background:transparent; color:var(--red); padding:4px 8px; border:none; font-size:16px;" onclick="event.stopPropagation(); deleteTask('${t.id}')">✕</button>
                </div>
            </div>`;
        }
    }).join('');
}

function toggleTask(id) {
    const t = S.tasks.find(x => x.id === id);
    if (t) { t.done = !t.done; save(); renderCalendar(); renderDayContent(); }
}

function deleteTask(id) {
    showDeleteConfirm("Borrar Meta", "¿Seguro que quieres borrar esta meta diaria?", () => {
        S.tasks = S.tasks.filter(x => x.id !== id); 
        save(); renderCalendar(); renderDayContent();
    });
}

// ==========================================
// VISTA PROYECTOS
// ==========================================
function toggleProject(id) {
    openProjects[id] = !openProjects[id];
    renderProjects();
}

function renderProjects() {
    const cont = document.getElementById('projects-container');
    if (!cont) return;
    if (!S.projects || S.projects.length === 0) {
        cont.innerHTML = '<div style="color:var(--t3); text-align:center; padding:10px; font-size:13px;">No hay proyectos.</div>';
        return;
    }
    
    cont.innerHTML = S.projects.map(p => {
        const isOpen = openProjects[p.id];
        const total = (p.tasks || []).length;
        const done = (p.tasks || []).filter(t => t.done).length;
        
        let tasksHtml = '<div class="empty" style="padding:10px 0;">No hay tareas asignadas</div>';
        
        if (p.tasks && p.tasks.length > 0) {
            const priorityWeight = { 'ui': 4, 'ni': 3, 'un': 2, 'nn': 1 };
            const sortedTasks = [...p.tasks].sort((a, b) => {
                if (a.done !== b.done) return a.done ? 1 : -1; 
                return priorityWeight[b.priority] - priorityWeight[a.priority]; 
            });

            tasksHtml = sortedTasks.map(t => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg3); border-radius:10px; margin-bottom:8px; border-left: 3px solid ${prioColor[t.priority] || 'var(--acc)'}; opacity: ${t.done ? '0.6' : '1'}; cursor:pointer;" onclick="openEditProjectTask('${p.id}', '${t.id}')">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="check-circle ${t.done ? 'checked' : ''}" onclick="event.stopPropagation(); toggleProjectTask('${p.id}', '${t.id}')"></div>
                        <div>
                            <div style="font-size:13px; font-weight:700; color:${t.done ? 'var(--t3)' : 'var(--t1)'}; text-decoration:${t.done ? 'line-through' : 'none'};">${t.text}</div>
                            <div style="font-size:10px; color:var(--t3); margin-top:2px;">Límite: ${t.deadline || '--/--/----'}</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <button class="btn-danger" style="background:transparent; color:var(--red); padding:4px 8px; border:none; font-size:16px;" onclick="event.stopPropagation(); delProjectTask('${p.id}', '${t.id}')">✕</button>
                    </div> 
                </div>
            `).join('');
        }

        const bodyHtml = isOpen ? `
            <div style="padding: 0 16px 16px 16px; border-top: 1px solid var(--line); margin-top: 12px; padding-top: 16px;">
                <div style="font-size:10px; font-weight:800; color:var(--acc); letter-spacing:0.5px; margin-bottom:8px; text-transform:uppercase;">NUEVA TAREA DEL PROYECTO</div>
                
                <input type="text" id="pt-name-${p.id}" class="form-input" placeholder="Nombre de la tarea...">
                
                <label class="form-label">DESCRIPCIÓN (Opcional)</label>
                <textarea id="pt-desc-${p.id}" class="form-input" style="min-height:60px;resize:none;" placeholder="Detalles de la tarea..."></textarea>

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
                    <div style="font-size:11px; color:var(--t3); font-weight:600;">Límite/Inicio: ${p.date} • ${done}/${total} tareas</div>
                </div>
                <div style="display:flex; gap:16px; align-items:center;">
                    <button class="btn-danger" style="background:transparent; color:var(--red); padding:0; border:none; font-size:16px;" onclick="event.stopPropagation(); delProject('${p.id}')">✕</button>
                    <div style="font-size:12px; color:var(--t3); transition:transform 0.2s; transform: rotate(${isOpen ? '180deg' : '0deg'});">▼</div>
                </div>
            </div>
            ${bodyHtml}
        </div>
        `;
    }).join('');
}

function addProjectTask(projectId) {
    const name = document.getElementById(`pt-name-${projectId}`).value.trim();
    const desc = document.getElementById(`pt-desc-${projectId}`).value.trim();
    const priority = document.getElementById(`pt-priority-${projectId}`).value;
    const deadline = document.getElementById(`pt-deadline-${projectId}`).value;

    if (!name) return showToast('Escribe el nombre de la tarea', 'error');

    const p = S.projects.find(x => x.id === projectId);
    if (!p.tasks) p.tasks = [];

    p.tasks.push({ id: uid(), text: name, desc: desc, priority, deadline, done: false });

    save();
    renderCalendar(); renderDayContent(); 
    showToast('Tarea añadida');
}

function toggleProjectTask(projectId, taskId) {
    const p = S.projects.find(x => x.id === projectId);
    const t = p.tasks.find(x => x.id === taskId);
    t.done = !t.done;
    save(); renderCalendar(); renderDayContent();
}

function delProjectTask(projectId, taskId) {
    showDeleteConfirm("Borrar Tarea", "¿Seguro que quieres borrar esta tarea del proyecto?", () => {
        const p = S.projects.find(x => x.id === projectId);
        p.tasks = p.tasks.filter(x => x.id !== taskId);
        save(); renderCalendar(); renderDayContent();
    });
}

function delProject(id) {
    showDeleteConfirm("Borrar Proyecto", "Se eliminará el proyecto y todas sus tareas. ¿Continuar?", () => {
        S.projects = S.projects.filter(p => p.id !== id);
        save(); renderCalendar(); renderDayContent();
    });
}

// ==========================================
// EDICIÓN DE TAREAS (DIARIAS Y PROYECTOS)
// ==========================================
function openEditDailyTask(id) {
    const t = S.tasks.find(x => x.id === id);
    if(!t) return;
    
    document.getElementById('edit-dt-id').value = t.id;
    document.getElementById('edit-dt-name').value = t.name || '';
    document.getElementById('edit-dt-desc').value = t.desc || '';
    
    let catSelect = document.getElementById('edit-dt-cat');
    if (t.cat === 'Otro') catSelect.value = 'Trabajo'; 
    else catSelect.value = t.cat || 'Trabajo';
    
    document.getElementById('edit-dt-time').value = t.time || '';
    document.getElementById('edit-dt-date').value = t.date || '';
    
    openModal('modal-edit-daily-task');
}

function saveEditDailyTask() {
    const id = document.getElementById('edit-dt-id').value;
    const t = S.tasks.find(x => x.id === id);
    if(!t) return;
    
    const name = document.getElementById('edit-dt-name').value.trim();
    if(!name) return showToast('Escribe un nombre', 'error');

    t.name = name;
    t.desc = document.getElementById('edit-dt-desc').value.trim();
    t.cat = document.getElementById('edit-dt-cat').value;
    t.time = document.getElementById('edit-dt-time').value;
    t.date = document.getElementById('edit-dt-date').value;

    save();
    closeModal('modal-edit-daily-task');
    renderCalendar();
    renderDayContent();
    showToast('Meta actualizada ✅');
}

function openEditProjectTask(projectId, taskId) {
    const p = S.projects.find(x => x.id === projectId);
    const t = p.tasks.find(x => x.id === taskId);

    document.getElementById('edit-pt-pid').value = projectId;
    document.getElementById('edit-pt-tid').value = taskId;
    
    document.getElementById('edit-pt-name').value = t.text || '';
    document.getElementById('edit-pt-desc').value = t.desc || '';
    document.getElementById('edit-pt-priority').value = t.priority || 'nn';
    document.getElementById('edit-pt-deadline').value = t.deadline || '';

    openModal('modal-edit-project-task');
}

function saveEditProjectTask() {
    const projectId = document.getElementById('edit-pt-pid').value;
    const taskId = document.getElementById('edit-pt-tid').value;
    
    const name = document.getElementById('edit-pt-name').value.trim();
    const desc = document.getElementById('edit-pt-desc').value.trim();
    const priority = document.getElementById('edit-pt-priority').value;
    const deadline = document.getElementById('edit-pt-deadline').value;

    if (!name) return showToast('Escribe el nombre de la tarea', 'error');

    const p = S.projects.find(x => x.id === projectId);
    const t = p.tasks.find(x => x.id === taskId);

    t.text = name;
    t.desc = desc;
    t.priority = priority;
    t.deadline = deadline;

    save();
    closeModal('modal-edit-project-task');
    renderCalendar(); renderDayContent();
    showToast('Tarea actualizada ✅');
}

// ==========================================
// VISUALIZADOR DE DETALLES DE TAREAS
// ==========================================
function viewTaskDetails(type, id1, id2) {
    let title = '', meta = '', desc = '';
    
    if (type === 'project') {
        const p = S.projects.find(x => x.id === id1);
        const t = p.tasks.find(x => x.id === id2);
        title = t.text;
        meta = `PROYECTO: ${p.name} <br> LÍMITE: ${t.deadline || 'Sin límite'} <br> PRIORIDAD: ${prioText[t.priority] || ''}`;
        desc = t.desc || 'No hay descripción adjunta para esta tarea.';
    } else {
        const t = S.tasks.find(x => x.id === id1);
        title = t.name;
        meta = `META DIARIA <br> FECHA: ${t.date} ${t.time ? '· HORA: '+t.time : ''}`;
        desc = t.desc || 'No hay descripción adjunta.';
    }
    
    document.getElementById('vt-title').textContent = title;
    document.getElementById('vt-meta').innerHTML = meta;
    document.getElementById('vt-desc').textContent = desc;
    openModal('modal-view-task');
}

// ==========================================
// RECURSOS Y POMODORO
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
            <button class="btn-danger" style="background:transparent; color:var(--red); border:none; padding:4px 8px; font-size:16px;" onclick="delResource('${r.id}')">✕</button>
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

function delResource(id) { 
    showDeleteConfirm("Borrar Recurso", "¿Seguro que quieres borrar este enlace?", () => {
        S.resources = S.resources.filter(r => r.id !== id); 
        save(); renderResources();
    });
}

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
