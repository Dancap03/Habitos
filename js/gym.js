let tempExercises = [];

function switchGymView(v, pill) {
  document.querySelectorAll('#gym-routine-pills .pill').forEach(p => p.classList.remove('on'));
  pill.classList.add('on');
  document.getElementById('gv-rutinas').style.display = v === 'rutinas' ? 'block' : 'none';
  document.getElementById('gv-historial').style.display = v === 'historial' ? 'block' : 'none';
  if (v === 'historial') renderGymHistory();
}

function openRoutineModal() {
  tempExercises = [];
  document.getElementById('r-name').value = '';
  document.getElementById('r-type').value = 'pesas';
  document.getElementById('r-ex-name').value = '';
  document.getElementById('r-ex-sets').value = '';
  document.getElementById('r-cardio-name').value = '';
  toggleRoutineType();
  openModal('modal-routine');
}

function toggleRoutineType() {
  const type = document.getElementById('r-type').value;
  tempExercises = []; 
  renderTempExercises();
  if (type === 'pesas') {
    document.getElementById('routine-pesas-ui').style.display = 'block';
    document.getElementById('routine-cardio-ui').style.display = 'none';
  } else {
    document.getElementById('routine-pesas-ui').style.display = 'none';
    document.getElementById('routine-cardio-ui').style.display = 'block';
  }
}

function addTempExercise() {
  const name = document.getElementById('r-ex-name').value.trim();
  const sets = parseInt(document.getElementById('r-ex-sets').value);
  if (name && sets > 0) {
    tempExercises.push({ name, sets });
    document.getElementById('r-ex-name').value = '';
    document.getElementById('r-ex-sets').value = '';
    renderTempExercises();
  } else { showToast('Añade un nombre y nº de series', 'error'); }
}

function addTempCardio() {
  const name = document.getElementById('r-cardio-name').value.trim();
  if (name) {
    tempExercises.push({ name, sets: 1 }); 
    document.getElementById('r-cardio-name').value = '';
    renderTempExercises();
  } else { showToast('Añade un nombre', 'error'); }
}

function removeTempExercise(index) {
  tempExercises.splice(index, 1); renderTempExercises();
}

function renderTempExercises() {
   const el = document.getElementById('temp-exercises-list');
   if (tempExercises.length === 0) { el.innerHTML = '<div class="empty" style="padding: 10px 0;">Ningún ejercicio añadido</div>'; return; }
   const isCardio = document.getElementById('r-type').value === 'cardio';
   el.innerHTML = tempExercises.map((ex, i) => `
     <div class="list-item" style="padding:10px 0;">
       <div style="flex:1"><div style="font-size:13px;font-weight:600">${ex.name}</div>${isCardio ? '' : `<div class="item-sub">${ex.sets} series</div>`}</div>
       <button class="btn-danger" style="padding: 2px 8px;" onclick="removeTempExercise(${i})">✕</button>
     </div>`).join('');
}

function saveNewRoutine() {
  const name = document.getElementById('r-name').value.trim();
  const type = document.getElementById('r-type').value;
  if (!name) return showToast('Ponle un nombre a la rutina', 'error');
  if (tempExercises.length === 0) return showToast('Añade al menos un ejercicio', 'error');
  S.routines.push({ id: uid(), name, type, exercises: [...tempExercises] });
  save(); closeModal('modal-routine'); renderRoutines(); showToast('Rutina creada', 'success');
}

function deleteRoutine(id) {
  S.routines = S.routines.filter(r => r.id !== id);
  if (S.activeRoutine === id) S.activeRoutine = null;
  save(); renderRoutines();
}

function startRoutine(id) {
  S.activeRoutine = id; save();
  document.getElementById('gym-start-time').value = formatTime(new Date());
  document.getElementById('gym-end-time').value = '';
  renderGymActive();
}

function cancelWorkout() { S.activeRoutine = null; save(); renderRoutines(); }

function renderRoutines() {
  const el = document.getElementById('gym-routine-list');
  const active = document.getElementById('gym-active');
  if (S.activeRoutine) { el.style.display='none'; active.style.display='block'; renderGymActive(); return; }
  active.style.display = 'none'; el.style.display = 'block';
  if (!S.routines.length) { el.innerHTML = '<div class="empty">Crea tu primera rutina</div>'; return; }
  el.innerHTML = S.routines.map(r => `
    <div class="card">
      <div class="card-header">
        <div><div style="font-size:16px;font-weight:700">${r.name}</div><div style="font-size:11px;color:var(--t2);text-transform:uppercase;margin-top:2px;">${r.type === 'cardio' ? '🏃 Cardio' : '🏋️ Pesas'}</div></div>
        <div style="display:flex;gap:8px"><button class="btn btn-sm" onclick="startRoutine('${r.id}')">▶ Iniciar</button><button class="btn-danger" onclick="deleteRoutine('${r.id}')">✕</button></div>
      </div>
      ${r.exercises.map(e=>`<div class="list-item" style="padding:8px 0"><div class="item-title">${e.name}</div>${r.type==='cardio'?'':`<div class="item-sub">${e.sets} series</div>`}</div>`).join('')}
    </div>`).join('');
  renderGymPRs();
}

function renderGymActive() {
  const r = S.routines.find(x => x.id === S.activeRoutine);
  if (!r) { S.activeRoutine = null; save(); renderRoutines(); return; }
  document.getElementById('gym-routine-list').style.display = 'none';
  document.getElementById('gym-active').style.display = 'block';
  document.getElementById('gym-active-name').textContent = r.name;
  document.getElementById('gym-active-date').textContent = new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  
  const el = document.getElementById('gym-exercises');
  el.innerHTML = r.exercises.map((e,ei) => {
    const isCardio = r.type === 'cardio';
    let setsHtml = '';
    if (isCardio) {
      setsHtml = `<div class="set-row"><input type="number" class="set-field" placeholder="min" id="ex-${ei}-0-reps"><input type="number" class="set-field" placeholder="km/nivel" id="ex-${ei}-0-kg" step="0.5"><div class="set-done" onclick="toggleSetDone(this)" id="ex-${ei}-0-done"></div></div>`;
    } else {
      setsHtml = Array.from({length:e.sets},(_,si)=>`<div class="set-row"><span class="set-num">${si+1}</span><input type="number" class="set-field" placeholder="reps" id="ex-${ei}-${si}-reps"><input type="number" class="set-field" placeholder="kg" id="ex-${ei}-${si}-kg" step="0.5"><div class="set-done" onclick="toggleSetDone(this)" id="ex-${ei}-${si}-done"></div></div>`).join('');
    }
    return `<div style="padding:16px 0;border-bottom:1px solid var(--line)"><div class="row"><span style="font-size:15px;font-weight:600">${e.name}</span>${isCardio ? '' : `<span class="tag tag-blu">${e.sets} series</span>`}</div>${setsHtml}</div>`;
  }).join('');
}

function toggleSetDone(el) {
  el.classList.toggle('on'); el.textContent = el.classList.contains('on') ? '✓' : '';
}

function finishWorkout() {
  const r = S.routines.find(x => x.id === S.activeRoutine);
  if (!r) return;
  let endT = document.getElementById('gym-end-time').value;
  if(!endT) endT = formatTime(new Date());
  const startT = document.getElementById('gym-start-time').value || formatTime(new Date());
  const logEntry = { id: uid(), date: today(), routineName: r.name, type: r.type, startTime: startT, endTime: endT, exercises: [] };

  r.exercises.forEach((e, ei) => {
    let maxKg = 0; let maxReps = 0;
    const logEx = { name: e.name, sets: [] };
    for (let si = 0; si < e.sets; si++) {
      const kgEl = document.getElementById(`ex-${ei}-${si}-kg`);
      const repsEl = document.getElementById(`ex-${ei}-${si}-reps`);
      const doneEl = document.getElementById(`ex-${ei}-${si}-done`);
      if (doneEl && doneEl.classList.contains('on')) {
        const kg = parseFloat(kgEl.value)||0;
        const reps = parseInt(repsEl.value)||0;
        logEx.sets.push({kg, reps});
        if (kg > maxKg || (kg === maxKg && reps > maxReps)) { maxKg = kg; maxReps = reps; }
      }
    }
    if(logEx.sets.length > 0) logEntry.exercises.push(logEx);
    if (maxKg > 0 && r.type === 'pesas') {
      const currentPr = S.prs[e.name];
      if (!currentPr || maxKg > currentPr.kg || (maxKg === currentPr.kg && maxReps > currentPr.reps)) {
        S.prs[e.name] = { kg: maxKg, reps: maxReps, date: today() };
      }
    }
  });

  S.workoutLog.unshift(logEntry); S.activeRoutine = null; save(); renderRoutines(); renderHome(); 
  showToast('¡Entrenamiento guardado! 💪', 'success');
}

function renderGymPRs() {
  const el = document.getElementById('gym-prs');
  const prs = Object.entries(S.prs).map(([name, data]) => ({name, ...data}));
  if (!prs.length) { el.innerHTML = '<div class="empty">Sin registros aún</div>'; return; }
  el.innerHTML = prs.sort((a,b) => a.name.localeCompare(b.name)).map(p => `
    <div class="fin-row">
      <div><div style="font-size:14px; font-weight:500">${p.name}</div><div style="font-size:11px; color:var(--t2)">${p.date}</div></div>
      <div style="font-size:15px;font-weight:700;color:var(--yel)">${p.kg} kg × ${p.reps} reps 🏆</div>
    </div>`).join('');
}

function renderGymHistory() {
  const el = document.getElementById('gym-history-list');
  const btnMore = document.getElementById('gym-history-more');
  if (!S.workoutLog.length) { el.innerHTML = '<div class="empty">Aún no hay entrenamientos registrados</div>'; btnMore.style.display = 'none'; return; }
  const itemsToShow = S.workoutLog.slice(0, historyPage * HISTORY_PER_PAGE);
  el.innerHTML = itemsToShow.map(w => {
    const isCardio = w.type === 'cardio';
    const exCount = w.exercises.length;
    const setsCount = w.exercises.reduce((acc, curr) => acc + curr.sets.length, 0);
    const detailsHtml = w.exercises.map(ex => {
      const setsHtml = ex.sets.map((s, i) => {
        if(isCardio) return `<div style="display:flex; justify-content:space-between; font-size:12px; color:var(--t2); padding:2px 0;"><span>Registro</span><span>${s.kg} km/nivel en ${s.reps} min</span></div>`;
        else return `<div style="display:flex; justify-content:space-between; font-size:12px; color:var(--t2); padding:2px 0;"><span>Serie ${i+1}</span><span>${s.kg} kg × ${s.reps} reps</span></div>`;
      }).join('');
      return `<div style="margin-top:10px;"><div style="font-size:13px; font-weight:600; color:var(--t1);">${ex.name}</div>${setsHtml}</div>`;
    }).join('');

    return `
      <div class="history-card" onclick="toggleHistoryDetails('det-${w.id}')">
        <div class="row" style="margin-bottom:8px;">
          <div><div style="font-size:14px;font-weight:700">${w.routineName}</div><div style="font-size:11px;color:var(--t2)">${w.date} · ${w.startTime} - ${w.endTime}</div></div>
          <button class="btn-danger" onclick="event.stopPropagation(); deleteWorkoutLog('${w.id}')">✕</button>
        </div>
        <div class="row"><div style="font-size:12px; color:var(--t1)">${isCardio ? `🏃 ${exCount} actividades` : `🏋️ ${exCount} ejercicios (${setsCount} series)`}</div><div style="font-size:10px; color:var(--acc);">▼ Detalles</div></div>
        <div id="det-${w.id}" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid var(--line); cursor:default;" onclick="event.stopPropagation();">${detailsHtml}</div>
      </div>`;
  }).join('');
  btnMore.style.display = S.workoutLog.length > historyPage * HISTORY_PER_PAGE ? 'block' : 'none';
}

function toggleHistoryDetails(id) { const el = document.getElementById(id); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
function loadMoreHistory() { historyPage++; renderGymHistory(); }
function deleteWorkoutLog(id) { if(confirm('¿Seguro que quieres borrar este registro?')) { S.workoutLog = S.workoutLog.filter(w => w.id !== id); save(); renderGymHistory(); renderHome(); } }

function renderCalendar() {
  const grid = document.getElementById('home-calendar-grid');
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  const firstDay = (new Date(y, m, 1).getDay() || 7) - 1; 
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysTrained = S.workoutLog.map(w => w.date);
  const todayStr = today();
  const todayTrained = daysTrained.includes(todayStr);
  
  const badge = document.getElementById('home-gym-today');
  badge.className = todayTrained ? 'tag tag-grn' : 'tag tag-t3';
  badge.textContent = todayTrained ? 'Hoy: Entrenado ✓' : 'Hoy: Descanso';

  let html = `<div style="font-size:10px;color:var(--t3)">L</div><div style="font-size:10px;color:var(--t3)">M</div><div style="font-size:10px;color:var(--t3)">X</div><div style="font-size:10px;color:var(--t3)">J</div><div style="font-size:10px;color:var(--t3)">V</div><div style="font-size:10px;color:var(--t3)">S</div><div style="font-size:10px;color:var(--t3)">D</div>`;
  for (let i = 0; i < firstDay; i++) html += '<div></div>'; 
  
  for (let d = 1; d <= daysInMonth; d++) {
     const dStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
     const isTrained = daysTrained.includes(dStr);
     const isToday = dStr === todayStr;
     const bg = isTrained ? 'var(--acc)' : 'var(--bg3)';
     const color = isTrained ? '#fff' : (isToday ? 'var(--acc)' : 'var(--t1)');
     const border = isToday && !isTrained ? '1px solid var(--acc)' : 'none';
     html += `<div style="aspect-ratio:1; display:flex; align-items:center; justify-content:center; background:${bg}; color:${color}; border:${border}; border-radius:8px; font-size:13px; font-weight:600;">${d}</div>`;
  }
  grid.innerHTML = html;
}
