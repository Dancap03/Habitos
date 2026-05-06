// js/calendario.js

// ==========================================
// ESTADO LOCAL DEL CALENDARIO Y POMODORO
// ==========================================
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDateStr = today(); // from main.js

let pomoSec = 25 * 60;
let pomoRunning = false;
let pomoInterval = null;
let pomoMode = 'focus';
const pomoModes = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

// ==========================================
// INICIALIZACIÓN
// ==========================================
function initAgendaData() {
    if (!S.tasks) S.tasks = [];
    if (!S.kanban) S.kanban = { todo: [], doing: [], done: [] };
    if (!S.eis) S.eis = { ui: [], ni: [], un: [], nn: [] };
    if (!S.pomo) S.pomo = { sessions: 0 };
    
    // Legacy support for habits/notes if needed, or initialized here
    if (!S.agenda) S.agenda = {};
    if (!S.agenda.habits) S.agenda.habits = [];
    if (!S.agenda.habitLogs) S.agenda.habitLogs = {};
    if (!S.agenda.notes) S.agenda.notes = {};
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
        
        // Check for tasks on this day
        if (S.tasks.some(t => t.date === dStr && !t.done)) {
            classes.push('has-task');
        }

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

    // Set hidden date input for new tasks
    document.getElementById('t-date').value = selectedDateStr;

    renderCalendar();
    renderDayContent();
}

function renderDayContent() {
    renderTasks();
    renderHabits();
    renderNotes();
}

// ==========================================
// VISTAS (PILLS)
// ==========================================
function switchTaskView(v, pill) {
    document.querySelectorAll('#s-tareas .pill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    ['agenda', 'kanban', 'eisenhower'].forEach(id => {
        document.getElementById('tv-' + id).style.display = id === v ? 'block' : 'none';
    });
}

// ==========================================
// TAREAS (MIGRATED LOGIC)
// ==========================================
function catTagClass(cat) {
    const c = (cat || '').toLowerCase();
    if (c === 'trabajo') return 'tag-work';
    if (c === 'personal') return 'tag-personal';
    if (c === 'estudio') return 'tag-study';
    return 'tag-other';
}

function renderTasks() {
    const list = document.getElementById('tasks-list');
    const dayTasks = S.tasks.filter(t => t.date === selectedDateStr);
    
    if (dayTasks.length === 0) {
        list.innerHTML = `<div style="color:var(--t3); font-size:13px; text-align:center; padding:10px;">Nada agendado para este día.</div>`;
        return;
    }

    list.innerHTML = dayTasks.map(t => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg3); border-radius:10px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="check-circle ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')"></div>
                <div style="flex:1">
                    <div style="font-size:14px; font-weight:600; color:${t.done ? 'var(--t3)' : 'var(--t1)'}; text-decoration:${t.done ? 'line-through' : 'none'};">${t.name}</div>
                    <div style="font-size:11px; color:var(--t3); margin-top:4px;">${t.time ? t.time + ' · ' : ''}<span class="tag ${catTagClass(t.cat)}">${t.cat}</span></div>
                </div>
            </div>
            <div style="color:var(--red); font-size:16px; cursor:pointer; padding:0 8px;" onclick="deleteTask('${t.id}')">✕</div>
        </div>
    `).join('');
}

function addTask() {
    const name = document.getElementById('t-name').value.trim();
    if (!name) return;
    
    const tDate = document.getElementById('t-date').value || selectedDateStr;

    S.tasks.push({ 
        id: uid(), 
        name, 
        cat: document.getElementById('t-cat').value, 
        time: document.getElementById('t-time').value, 
        date: tDate, 
        done: false 
    });
    
    save(); 
    closeAllModals();
    document.getElementById('t-name').value = '';
    document.getElementById('t-time').value = '';
    renderCalendar();
    renderTasks(); 
    if(typeof renderHome === 'function') renderHome();
}

function toggleTask(id) {
    const t = S.tasks.find(x => x.id === id);
    if (t) { t.done = !t.done; save(); renderTasks(); renderCalendar(); if(typeof renderHome === 'function') renderHome(); }
}

function deleteTask(id) {
    if (confirm("¿Borrar tarea?")) {
        S.tasks = S.tasks.filter(x => x.id !== id); 
        save(); renderTasks(); renderCalendar(); if(typeof renderHome === 'function') renderHome();
    }
}

// ==========================================
// KANBAN (MIGRATED LOGIC)
// ==========================================
function openModalKanban(col) {
    document.getElementById('k-col-target').value = col;
    const labels = {todo:'Por hacer', doing:'En progreso', done:'Hecho'};
    document.getElementById('modal-kanban-title').textContent = 'Añadir evento → ' + labels[col];
    openModal('modal-kanban');
}

function addKanbanCard() {
    const title = document.getElementById('k-title').value.trim();
    const col = document.getElementById('k-col-target').value;
    if (!title) return;
    S.kanban[col].push({ id: uid(), title, cat: document.getElementById('k-cat').value });
    save(); closeAllModals();
    document.getElementById('k-title').value = '';
    renderKanban();
}

function moveKanban(id, from, to) {
    const card = S.kanban[from].find(c => c.id === id);
    if (!card) return;
    S.kanban[from] = S.kanban[from].filter(c => c.id !== id);
    S.kanban[to].push(card);
    save(); renderKanban();
}

function delKanban(id, col) {
    if(confirm("¿Borrar tarjeta?")) {
        S.kanban[col] = S.kanban[col].filter(c => c.id !== id); save(); renderKanban();
    }
}

function renderKanban() {
    const cols = {todo:'todo', doing:'doing', done:'done'};
    const next = {todo:'doing', doing:'done'};
    const prev = {doing:'todo', done:'doing'};
    
    Object.entries(cols).forEach(([col, key]) => {
        const el = document.getElementById('k-' + key);
        if (!el) return;
        if (!S.kanban[col].length) { el.innerHTML = '<div style="color:var(--t3); font-size:12px; padding:10px;">Vacío</div>'; return; }
        
        el.innerHTML = S.kanban[col].map(c => `
            <div class="k-card">
                <div class="k-card-title">${c.title}</div>
                <div class="k-card-footer">
                    <span class="tag ${catTagClass(c.cat)}">${c.cat}</span>
                    <div style="display:flex;gap:6px">
                        ${prev[col] ? `<span style="font-size:18px;cursor:pointer;color:var(--t3)" onclick="moveKanban('${c.id}','${col}','${prev[col]}')">←</span>` : ''}
                        ${next[col] ? `<span style="font-size:18px;cursor:pointer;color:var(--t3)" onclick="moveKanban('${c.id}','${col}','${next[col]}')">→</span>` : ''}
                        <span style="font-size:14px;cursor:pointer;color:var(--red);margin-left:4px;" onclick="delKanban('${c.id}','${col}')">✕</span>
                    </div>
                </div>
            </div>`).join('');
    });
}

// ==========================================
// EISENHOWER (MIGRATED LOGIC)
// ==========================================
function openModalEis(quad) {
    document.getElementById('eis-quad-target').value = quad;
    const labels = {ui:'Urgente + Importante', ni:'No urgente + Importante', un:'Urgente + No importante', nn:'No urgente + No importante'};
    document.getElementById('modal-eis-title').textContent = labels[quad];
    openModal('modal-eis');
}

function addEisTask() {
    const text = document.getElementById('eis-task-text').value.trim();
    const quad = document.getElementById('eis-quad-target').value;
    if (!text) return;
    S.eis[quad].push({ id: uid(), text });
    save(); closeAllModals();
    document.getElementById('eis-task-text').value = '';
    renderEis();
}

function delEis(id, quad) {
    S.eis[quad] = S.eis[quad].filter(x => x.id !== id); save(); renderEis();
}

function renderEis() {
    ['ui','ni','un','nn'].forEach(q => {
        const el = document.getElementById('eis-' + q);
        if(!el) return;
        if (!S.eis[q].length) { el.innerHTML = '<div style="color:var(--t3); font-size:11px; padding:4px 0;">Vacío</div>'; return; }
        
        el.innerHTML = S.eis[q].map(x => `
            <div class="eis-item">
                <span>${x.text}</span>
                <span style="cursor:pointer;color:var(--red);font-size:12px;padding-left:8px;" onclick="delEis('${x.id}','${q}')">✕</span>
            </div>`).join('');
    });
}

// ==========================================
// POMODORO (MIGRATED LOGIC)
// ==========================================
function updPomo() {
    const m = Math.floor(pomoSec/60), s = pomoSec%60;
    document.getElementById('pomo-display').textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    document.getElementById('pomo-sessions').textContent = S.pomo ? S.pomo.sessions : 0;
}

function togglePomo() {
    if (pomoRunning) {
        clearInterval(pomoInterval); pomoRunning = false;
        const btn = document.getElementById('pomo-play');
        btn.textContent = '▶';
        btn.style.background = "#8b5cf6";
    } else {
        pomoRunning = true;
        const btn = document.getElementById('pomo-play');
        btn.textContent = '⏸';
        btn.style.background = "#e74c3c";
        
        pomoInterval = setInterval(() => {
            if (pomoSec > 0) { 
                pomoSec--; updPomo(); 
            } else {
                clearInterval(pomoInterval); pomoRunning = false;
                const btn = document.getElementById('pomo-play');
                btn.textContent = '▶';
                btn.style.background = "#8b5cf6";
                showToast("¡Tiempo finalizado! 🔔", "success");
                if (pomoMode === 'focus') { 
                    if(!S.pomo) S.pomo = { sessions: 0 };
                    S.pomo.sessions++; 
                    save(); 
                }
                pomoSec = pomoModes[pomoMode];
                updPomo();
            }
        }, 1000);
    }
}

function resetPomo() {
    clearInterval(pomoInterval); pomoRunning = false;
    pomoSec = pomoModes[pomoMode]; updPomo();
    const btn = document.getElementById('pomo-play');
    btn.textContent = '▶';
    btn.style.background = "#8b5cf6";
}

function setPomoMode(m, pill) {
    document.querySelectorAll('#tv-pomo .pill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    pomoMode = m;
    const lbl = {focus:'ENFOQUE', short:'PAUSA CORTA', long:'DESCANSO LARGO'};
    document.getElementById('pomo-label').textContent = lbl[m];
    clearInterval(pomoInterval); pomoRunning = false;
    pomoSec = pomoModes[m]; updPomo();
    const btn = document.getElementById('pomo-play');
    btn.textContent = '▶';
    btn.style.background = "#8b5cf6";
}

// ==========================================
// HÁBITOS Y NOTAS (NUEVAS FUNCIONES)
// ==========================================
function renderHabits() {
    const list = document.getElementById('habits-list');
    const habits = S.agenda.habits || [];
    const completedToday = S.agenda.habitLogs[selectedDateStr] || [];

    if (habits.length === 0) {
        list.innerHTML = `<div style="color:var(--t3); font-size:13px; text-align:center; padding:10px;">Crea tu primer hábito para rastrearlo cada día.</div>`;
        return;
    }

    list.innerHTML = habits.map(h => {
        const isDone = completedToday.includes(h.id);
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--line);">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="check-circle ${isDone ? 'checked' : ''}" onclick="toggleHabit('${h.id}')"></div>
                <span style="font-size:14px; font-weight:600; color:var(--t1);">${h.name}</span>
            </div>
            <div style="color:var(--t3); font-size:14px; cursor:pointer;" onclick="deleteHabit('${h.id}')">🗑️</div>
        </div>
        `;
    }).join('');
}

function addHabit() {
    const name = document.getElementById('habit-text').value.trim();
    if (!name) return;
    
    S.agenda.habits.push({ id: uid(), name });
    save();
    document.getElementById('habit-text').value = '';
    closeModal('modal-habit');
    renderHabits();
}

function toggleHabit(habitId) {
    if (!S.agenda.habitLogs[selectedDateStr]) S.agenda.habitLogs[selectedDateStr] = [];
    const log = S.agenda.habitLogs[selectedDateStr];
    
    const index = log.indexOf(habitId);
    if (index > -1) log.splice(index, 1); 
    else log.push(habitId); 

    save(); renderHabits();
}

function deleteHabit(habitId) {
    if (confirm("¿Borrar este hábito permanentemente de tu lista global?")) {
        S.agenda.habits = S.agenda.habits.filter(h => h.id !== habitId);
        save(); renderHabits();
    }
}

function renderNotes() {
    const textarea = document.getElementById('daily-notes');
    textarea.value = S.agenda.notes[selectedDateStr] || '';
}

function saveDailyNotes() {
    const text = document.getElementById('daily-notes').value;
    if (text.trim() === '') delete S.agenda.notes[selectedDateStr];
    else S.agenda.notes[selectedDateStr] = text;
    save();
}

// ==========================================
// INICIO AUTOMÁTICO AL CARGAR LA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initAgendaData();
        document.getElementById('t-date').value = selectedDateStr;
        selectDate(today()); 
        updPomo();
        renderKanban();
        renderEis();
    }, 100);
});
