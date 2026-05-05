let tempExercises = [];

function switchGymView(v, pill) {
  document.querySelectorAll('#gym-routine-pills .pill').forEach(p => p.classList.remove('on'));
  if(pill) pill.classList.add('on');
  if(document.getElementById('gv-rutinas')) document.getElementById('gv-rutinas').style.display = v === 'rutinas' ? 'block' : 'none';
  if(document.getElementById('gv-historial')) document.getElementById('gv-historial').style.display = v === 'historial' ? 'block' : 'none';
  if (v === 'historial') renderGymHistory();
}

function openRoutineModal() {
  tempExercises = [];
  if(document.getElementById('r-name')) document.getElementById('r-name').value = '';
  if(document.getElementById('r-type')) document.getElementById('r-type').value = 'pesas';
  if(document.getElementById('r-ex-name')) document.getElementById('r-ex-name').value = '';
  if(document.getElementById('r-ex-sets')) document.getElementById('r-ex-sets').value = '';
  // Esto es clave para que no se quede guardado "peldaños" de la vez anterior
  if(document.getElementById('r-cardio-unit')) document.getElementById('r-cardio-unit').value = '';
  
  toggleRoutineType();
  openModal('modal-routine');
}

function toggleRoutineType() {
  const typeEl = document.getElementById('r-type');
  if(!typeEl) return;
  const type = typeEl.value;
  tempExercises = []; 
  renderTempExercises();
  
  const pesasUi = document.getElementById('routine-pesas-ui');
  const cardioUi = document.getElementById('routine-cardio-ui');
  const exTitle = document.getElementById('temp-exercises-title');
  const exList = document.getElementById('temp-exercises-list');

  if (type === 'pesas') {
    if(pesasUi) pesasUi.style.display = 'block';
    if(cardioUi) cardioUi.style.display = 'none';
    if(exTitle) exTitle.style.display = 'block';
    if(exList) exList.style.display = 'block';
  } else {
    if(pesasUi) pesasUi.style.display = 'none';
    if(cardioUi) cardioUi.style.display = 'block';
    if(exTitle) exTitle.style.display = 'none';
    if(exList) exList.style.display = 'none';
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

function removeTempExercise(index) {
  tempExercises.splice(index, 1); renderTempExercises();
}

function renderTempExercises() {
   const el = document.getElementById('temp-exercises-list');
   if(!el) return;
   if (tempExercises.length === 0) { el.innerHTML = '<div class="empty" style="padding: 10px 0;">Ningún ejercicio añadido</div>'; return; }
   
   el.innerHTML = tempExercises.map((ex, i) => `
     <div class="list-item" style="padding:10px 0;">
       <div style="flex:1"><div style="font-size:13px;font-weight:600">${ex.name}</div><div class="item-sub">${ex.sets} series</div></div>
       <button class="btn-danger" style="padding: 2px 8px;" onclick="removeTempExercise(${i})">✕</button>
     </div>`).join('');
}

function saveNewRoutine() {
  const name = document.getElementById('r-name').value.trim();
  const type = document.getElementById('r-type').value;
  
  if (!name) return showToast('Ponle un nombre a la rutina', 'error');
  
  let exercisesToSave = [];
  if (type === 'pesas') {
    if (tempExercises.length === 0) return showToast('Añade al menos un ejercicio', 'error');
    exercisesToSave = [...tempExercises];
  } else {
    // Si es cardio, cogemos la unidad que hayas escrito y creamos la rutina
    const unitEl = document.getElementById('r-cardio-unit');
    const unit = unitEl ? unitEl.value.trim() : '';
    exercisesToSave = [{ name: name, sets: 1, unit: unit }];
  }

  S.routines.push({ id: uid(), name, type, exercises: exercisesToSave });
  save(); 
  closeModal('modal-routine'); 
  renderRoutines(); 
  showToast('Rutina creada', 'success');
}

function deleteRoutine(id) {
  S.routines = S.routines.filter(r => r.id !== id);
  if (S.activeRoutine === id) S.activeRoutine = null;
  save(); renderRoutines();
}

function startRoutine(id) {
  S.activeRoutine = id; save();
  if(document.getElementById('gym-start-time')) document.getElementById('gym-start-time').value = formatTime(new Date());
  if(document.getElementById('gym-end-time')) document.getElementById('gym-end-time').value = '';
  renderGymActive();
}

function cancelWorkout() { S.activeRoutine = null; save(); renderRoutines(); }

function renderRoutines() {
  const el = document.getElementById('gym-routine-list');
  const active = document.getElementById('gym-active');
  if(!el || !active) return;

  if (S.activeRoutine) { el.style.display='none'; active.style.display='block'; renderGymActive(); return; }
  active.style.display = 'none'; el.style.display = 'block';
  
  if (!S.routines.length) { el.innerHTML = '<div class="empty">Crea tu primera rutina</div>'; return; }
  
  el.innerHTML = S.routines.map(r => `
    <div class="card">
      <div class="card-header">
        <div><div style="font-size:16px;font-weight:700">${r.name}</div><div style="font-size:11px;color:var(--t2);text-transform:uppercase;margin-top:2px;">${r.type === 'cardio' ? '🏃 Cardio' : '🏋️ Pesas'}</div></div>
        <div style="display:flex;gap:8px"><button class="btn btn-sm" onclick="startRoutine('${r.id}')">▶ Iniciar</button><button class="btn-danger" onclick="deleteRoutine('${r.id}')">✕</button></div>
      </div>
      ${r.type === 'cardio' ? '' : r.exercises.map(e=>`<div class="list-item" style="padding:8px 0"><div class="item-title">${e.name}</div><div class="item-sub">${e.sets} series</div></div>`).join('')}
    </div>`).join('');
    
  renderGymPRs();
}

function renderGymActive() {
  const r = S.routines.find(x => x.id === S.activeRoutine);
  if (!r) { S.activeRoutine = null; save(); renderRoutines(); return; }
  
  if(document.getElementById('gym-routine-list')) document.getElementById('gym-routine-list').style.display = 'none';
  if(document.getElementById('gym-active')) document.getElementById('gym-active').style.display = 'block';
  if(document.getElementById('gym-active-name')) document.getElementById('gym-active-name').textContent = r.name;
  if(document.getElementById('gym-active-date')) document.getElementById('gym-active-date').textContent = new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  
  const el = document.getElementById('gym-exercises');
  if(!el) return;

  el.innerHTML = r.exercises.map((e,ei) => {
    const isCardio = r.type === 'cardio';
    let setsHtml = '';
    
    if (isCardio) {
      // Si la unidad está vacía, pone "valor", si no, pone la que hayas guardado
      const unitPlaceholder = e.unit ? e.unit : 'valor';
      setsHtml = `<div class="set-row"><input type="number" class="set-field" placeholder="min" id="ex-${ei}-0-reps"><input type="number" class="set-field" placeholder="${unitPlaceholder}" id="ex-${ei}-0-kg" step="0.5"><div class="set-done" onclick="toggleSetDone(this)" id="ex-${ei}-0-done"></div></div>`;
    } else {
      setsHtml = Array.from({length:e.sets},(_,si)=>`<div class="set-row"><span class="set-num">${si+1}</span><input type="number" class="set-field" placeholder="reps" id="ex-${ei}-${si}-reps"><input type="number" class="set-field" placeholder="kg" id="ex-${ei}-${si}-kg" step="0.5"><div class="set-done" onclick="toggleSetDone(this)" id="ex-${ei}-${si}-done"></div></div>`).join('');
    }
    
    const headerHtml = isCardio ? '' : `<div class="row"><span style="font-size:15px;font-weight:600">${e.name}</span><span class="tag tag-blu">${e.sets} series</span></div>`;
    return `<div style="padding:16px 0;border-bottom:1px solid var(--line)">${headerHtml}${setsHtml}</div>`;
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
  const isCardio = r.type === 'cardio';

  r.exercises.forEach((e, ei) => {
    let maxKg = 0; let maxReps = 0;
    const logEx = { name: e.name, sets: [], unit: e.unit || '' };
    
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

    // Sistema de PR adaptado a cardio (más peldaños o menos tiempo)
    if (maxKg > 0 || maxReps > 0) {
      const currentPr = S.prs[e.name];
      let isNewPr = false;
      if (!currentPr) {
          isNewPr = true;
      } else {
          if (isCardio) {
              if (maxKg > currentPr.kg || (maxKg === currentPr.kg && maxReps <= currentPr.reps)) isNewPr = true;
          } else {
              if (maxKg > currentPr.kg || (maxKg === currentPr.kg && maxReps >= currentPr.reps)) isNewPr = true;
          }
      }
      if (isNewPr) {
        S.prs[e.name] = { kg: maxKg, reps: maxReps, date: today(), isCardio: isCardio, unit: e.unit || '' };
      }
    }
  });

  S.workoutLog.unshift(logEntry); 
  S.activeRoutine = null; 
  save(); 
  renderRoutines(); 
  if(typeof renderHome === 'function') renderHome(); 
  showToast('¡Entrenamiento guardado! 💪', 'success');
}

function renderGymPRs() {
  const el = document.getElementById('gym-prs');
  if(!el) return;
  const prs = Object.entries(S.prs).map(([name, data]) => ({name, ...data}));
  
  if (!prs.length) { el.innerHTML = '<div class="empty">Sin registros aún</div>'; return; }
  
  el.innerHTML = prs.sort((a,b) => a.name.localeCompare(b.name)).map(p => {
    const isCardio = p.isCardio === true;
    const unitText = p.unit ? ` ${p.unit}` : '';
    // Muestra "10 peldaños en 5 min" o "10 kg x 5 reps" de forma limpia
    const prText = isCardio ? `${p.kg}${unitText} en ${p.reps} min` : `${p.kg} kg × ${p.reps} reps`;
    
    return `
    <div class="fin-row">
      <div><div style="font-size:14px; font-weight:500">${p.name}</div><div style="font-size:11px; color:var(--t2)">${p.date}</div></div>
      <div style="font-size:15px;font-weight:700;color:var(--yel)">${prText} 🏆</div>
    </div>`;
  }).join('');
}

let historyPage = 1;
const HISTORY_PER_PAGE = 10;

function renderGymHistory() {
  const el = document.getElementById('gym-history-list');
  const btnMore = document.getElementById('gym-history-more');
  if(!el) return;
  
  if (!S.workoutLog || !S.workoutLog.length) { 
    el.innerHTML = '<div class="empty">Aún no hay entrenamientos registrados</div>'; 
    if(btnMore) btnMore.style.display = 'none'; 
    return; 
  }
  
  const itemsToShow = S.workoutLog.slice(0, historyPage * HISTORY_PER_PAGE);
  
  el.innerHTML = itemsToShow.map(w => {
    const isCardio = w.type === 'cardio';
    const exercises = w.exercises || []; 
    const exCount = exercises.length;
    const setsCount = exercises.reduce((acc, curr) => acc + (curr.sets || []).length, 0);
    
    const detailsHtml = exercises.map(ex => {
      const unitText = ex.unit ? ` ${ex.unit}` : '';
      const setsHtml = (ex.sets || []).map((s, i) => {
        if(isCardio) return `<div style="display:flex; justify-content:space-between; font-size:12px; color:var(--t2); padding:2px 0;"><span>Registro</span><span>${s.kg}${unitText} en ${s.reps} min</span></div>`;
        else return `<div style="display:flex; justify-content:space-between; font-size:12px; color:var(--t2); padding:2px 0;"><span>Serie ${i+1}</span><span>${s.kg} kg × ${s.reps} reps</span></div>`;
      }).join('');
      
      const titleHtml = isCardio ? '' : `<div style="font-size:13px; font-weight:600; color:var(--t1);">${ex.name}</div>`;
      return `<div style="margin-top:10px;">${titleHtml}${setsHtml}</div>`;
    }).join('');

    return `
      <div class="history-card" onclick="toggleHistoryDetails('det-${w.id}')">
        <div class="row" style="margin-bottom:8px;">
          <div><div style="font-size:14px;font-weight:700">${w.routineName}</div><div style="font-size:11px;color:var(--t2)">${w.date} · ${w.startTime} - ${w.endTime}</div></div>
          <button class="btn-danger" onclick="event.stopPropagation(); deleteWorkoutLog('${w.id}')">✕</button>
        </div>
        <div class="row"><div style="font-size:12px; color:var(--t1)">${isCardio ? `🏃 ${setsCount} registros` : `🏋️ ${exCount} ejercicios (${setsCount} series)`}</div><div style="font-size:10px; color:var(--acc);">▼ Detalles</div></div>
        <div id="det-${w.id}" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid var(--line); cursor:default;" onclick="event.stopPropagation();">${detailsHtml}</div>
      </div>`;
  }).join('');
  
  if(btnMore) btnMore.style.display = S.workoutLog.length > historyPage * HISTORY_PER_PAGE ? 'block' : 'none';
}

function toggleHistoryDetails(id) { 
  const el = document.getElementById(id); 
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; 
}
function loadMoreHistory() { historyPage++; renderGymHistory(); }
function deleteWorkoutLog(id) { 
  if(confirm('¿Seguro que quieres borrar este registro?')) { 
    S.workoutLog = S.workoutLog.filter(w => w.id !== id); 
    save(); renderGymHistory(); 
    if(typeof renderHome === 'function') renderHome(); 
  } 
}
