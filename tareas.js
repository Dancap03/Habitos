function addTask() {
  const name = document.getElementById('t-name').value.trim();
  if (!name) return;
  S.tasks.push({ id: uid(), name, cat: document.getElementById('t-cat').value, time: document.getElementById('t-time').value, date: document.getElementById('t-date').value || today(), done: false });
  save(); closeAllModals();
  document.getElementById('t-name').value = '';
  document.getElementById('t-time').value = '';
  renderTasks(); renderHome();
}
function toggleTask(id) {
  const t = S.tasks.find(x => x.id === id);
  if (t) { t.done = !t.done; save(); renderTasks(); renderHome(); }
}
function deleteTask(id) {
  S.tasks = S.tasks.filter(x => x.id !== id); save(); renderTasks(); renderHome();
}
function renderTasks() {
  const pending = S.tasks.filter(t => !t.done);
  const done = S.tasks.filter(t => t.done);
  renderTaskList('task-pending', pending, true);
  renderTaskList('task-done-list', done, false);
}
function renderTaskList(elId, arr, showDelete) {
  const el = document.getElementById(elId);
  if (!arr.length) { el.innerHTML = '<div class="empty">—</div>'; return; }
  el.innerHTML = arr.map(t => `
    <div class="list-item">
      <div class="check ${t.done ? 'done' : ''}" onclick="toggleTask('${t.id}')"></div>
      <div style="flex:1">
        <div class="item-title ${t.done ? 'struck' : ''}">${t.name}</div>
        <div class="item-sub">${t.time ? t.time + ' · ' : ''}<span class="tag ${catTagClass(t.cat)}">${t.cat}</span></div>
      </div>
      ${showDelete ? `<button class="btn-danger" onclick="deleteTask('${t.id}')">✕</button>` : ''}
    </div>`).join('');
}

function switchTaskView(v, pill) {
  document.querySelectorAll('#s-tareas .pill').forEach(p => p.classList.remove('on'));
  pill.classList.add('on');
  ['agenda','kanban','eisenhower','pomo'].forEach(id => {
    document.getElementById('tv-' + id).style.display = id === v ? 'block' : 'none';
  });
}

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
  S.kanban[col] = S.kanban[col].filter(c => c.id !== id); save(); renderKanban();
}
function renderKanban() {
  const cols = {todo:'todo', doing:'doing', done:'done'};
  const next = {todo:'doing', doing:'done'};
  const prev = {doing:'todo', done:'doing'};
  Object.entries(cols).forEach(([col, key]) => {
    const el = document.getElementById('k-' + key);
    if (!S.kanban[col].length) { el.innerHTML = ''; return; }
    el.innerHTML = S.kanban[col].map(c => `
      <div class="k-card">
        <div class="k-card-title">${c.title}</div>
        <div class="k-card-footer">
          <span class="tag ${catTagClass(c.cat)}">${c.cat}</span>
          <div style="display:flex;gap:6px">
            ${prev[col] ? `<span style="font-size:18px;cursor:pointer;color:var(--t3)" onclick="moveKanban('${c.id}','${col}','${prev[col]}')">←</span>` : ''}
            ${next[col] ? `<span style="font-size:18px;cursor:pointer;color:var(--t3)" onclick="moveKanban('${c.id}','${col}','${next[col]}')">→</span>` : ''}
            <span style="font-size:14px;cursor:pointer;color:var(--red)" onclick="delKanban('${c.id}','${col}')">✕</span>
          </div>
        </div>
      </div>`).join('');
  });
}

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
    el.innerHTML = S.eis[q].map(x => `
      <div class="eis-item">
        <span>${x.text}</span>
        <span style="cursor:pointer;color:var(--red);font-size:11px" onclick="delEis('${x.id}','${q}')">✕</span>
      </div>`).join('');
  });
}

let pomoSec = 25*60, pomoRunning = false, pomoInterval = null, pomoMode = 'focus';
const pomoModes = { focus: 25*60, short: 5*60, long: 15*60 };
function updPomo() {
  const m = Math.floor(pomoSec/60), s = pomoSec%60;
  document.getElementById('pomo-display').textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
function togglePomo() {
  if (pomoRunning) {
    clearInterval(pomoInterval); pomoRunning = false;
    document.getElementById('pomo-play').textContent = '▶';
  } else {
    pomoRunning = true;
    document.getElementById('pomo-play').textContent = '⏸';
    pomoInterval = setInterval(() => {
      if (pomoSec > 0) { pomoSec--; updPomo(); }
      else {
        clearInterval(pomoInterval); pomoRunning = false;
        document.getElementById('pomo-play').textContent = '▶';
        if (pomoMode === 'focus') { S.pomo.sessions++; save(); document.getElementById('pomo-sessions').textContent = S.pomo.sessions; }
      }
    }, 1000);
  }
}
function resetPomo() {
  clearInterval(pomoInterval); pomoRunning = false;
  pomoSec = pomoModes[pomoMode]; updPomo();
  document.getElementById('pomo-play').textContent = '▶';
}
function setPomoMode(m, pill) {
  document.querySelectorAll('#tv-pomo .pill').forEach(p => p.classList.remove('on'));
  pill.classList.add('on');
  pomoMode = m;
  const lbl = {focus:'ENFOQUE', short:'PAUSA CORTA', long:'DESCANSO LARGO'};
  document.getElementById('pomo-label').textContent = lbl[m];
  clearInterval(pomoInterval); pomoRunning = false;
  pomoSec = pomoModes[m]; updPomo();
  document.getElementById('pomo-play').textContent = '▶';
}