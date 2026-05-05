let tempExercises = [];

function switchGymView(v, pill) {
  document.querySelectorAll('#gym-routine-pills .pill').forEach(p => p.classList.remove('on'));
  if(pill) pill.classList.add('on');
  if(document.getElementById('gv-rutinas')) document.getElementById('gv-rutinas').style.display = v === 'rutinas' ? 'block' : 'none';
  if(document.getElementById('gv-records')) document.getElementById('gv-records').style.display = v === 'records' ? 'block' : 'none';
  
  if (v === 'records') renderGymPRs();
  if (v === 'rutinas') { renderRoutines(); renderGymDays(); }
}

function openRoutineModal() {
  tempExercises = [];
  if(document.getElementById('r-name')) document.getElementById('r-name').value = '';
  if(document.getElementById('r-type')) document.getElementById('r-type').value = 'pesas';
  if(document.getElementById('r-ex-name')) document.getElementById('r-ex-name').value = '';
  if(document.getElementById('r-ex-sets')) document.getElementById('r-ex-sets').value = '';
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
  if (typeof customConfirm === 'function') {
    customConfirm('Borrar rutina', '¿Seguro que quieres borrar esta rutina? No afectará a tus Días de Entrenamiento.', () => {
      S.routines = S.routines.filter(r => r.id !== id);
      if (S.activeRoutine === id) S.activeRoutine = null;
      save(); renderRoutines();
    });
  } else {
    S.routines = S.routines.filter(r => r.id !== id);
    if (S.activeRoutine === id) S.activeRoutine = null;
    save(); renderRoutines();
  }
}

function startRoutine(id) {
  S.activeRoutine = id; save();
  if(document.getElementById('gym-start-time')) document.getElementById('gym-start-time').value = formatTime(new Date());
  if(document.getElementById('gym-end-time')) document.getElementById('gym-end-time').value = '';
  renderGymActive();
}

function cancelWorkout() { S.activeRoutine = null; save(); renderRoutines(); }

function renderRoutines() {
  renderGymDays();

  const el = document.getElementById('gym-routine-list');
  const active = document.getElementById('gym-active');
  if(!el || !active) return;

  if (S.activeRoutine) { 
    el.style.display='none'; 
    active.style.display='block'; 
    renderGymActive(); 
    return; 
  }
  
  active.style.display = 'none'; 
  el.style.display = 'block';
  
  if (!S.routines || !S.routines.length) { 
    el.innerHTML = '<div class="empty">Crea tu primera rutina</div>'; 
    return; 
  }
  
  el.innerHTML = S.routines.map(r => `
    <div class="card">
      <div class="card-header">
        <div><div style="font-size:16px;font-weight:700">${r.name}</div><div style="font-size:11px;color:var(--t2);text-transform:uppercase;margin-top:2px;">${r.type === 'cardio' ? '🏃 Cardio' : '🏋️ Pesas'}</div></div>
        <div style="display:flex;gap:8px"><button class="btn btn-sm" onclick="startRoutine('${r.id}')">▶ Iniciar</button><button class="btn-danger" onclick="deleteRoutine('${r.id}')">✕</button></div>
      </div>
      ${r.type === 'cardio' ? '' : r.exercises.map(e=>`<div class="list-item" style="padding:8px 0"><div class="item-title">${e.name}</div><div class="item-sub">${e.sets} series</div></div>`).join('')}
    </div>`).join('');
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

    if (maxKg > 0 || maxReps > 0) {
      if(!S.prs) S.prs = {};
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

// ----------------------------------------
// RÉCORDS PERSONALES
// ----------------------------------------
function renderGymPRs() {
  const el = document.getElementById('gym-prs');
  if(!el) return;
  
  if(!S.prs) S.prs = {};
  const prs = Object.entries(S.prs).map(([name, data]) => ({name, ...data}));
  
  if (!prs.length) { el.innerHTML = '<div class="empty">Sin registros aún</div>'; return; }
  
  el.innerHTML = prs.sort((a,b) => a.name.localeCompare(b.name)).map(p => {
    const isCardio = p.isCardio === true;
    const unitText = p.unit ? ` ${p.unit}` : '';
    const prText = isCardio ? `${p.kg}${unitText} en ${p.reps} min` : `${p.kg} kg × ${p.reps} reps`;
    
    return `
    <div class="fin-row" style="padding: 12px 0; border-bottom: 1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
      <div><div style="font-size:14px; font-weight:500">${p.name}</div><div style="font-size:11px; color:var(--t2)">${p.date}</div></div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="font-size:15px;font-weight:700;color:var(--yel)">${prText} 🏆</div>
        <button class="btn-danger" style="padding: 4px 8px;" onclick="deletePR('${p.name}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function deletePR(name) {
  if (typeof customConfirm === 'function') {
    customConfirm('Borrar Récord', `¿Seguro que quieres borrar el récord de ${name}?`, () => {
      delete S.prs[name];
      save();
      renderGymPRs();
    });
  } else {
    delete S.prs[name];
    save();
    renderGymPRs();
  }
}

// ----------------------------------------
// DÍAS DE ENTRENAMIENTO
// ----------------------------------------
function renderGymDays() {
  const el = document.getElementById('gym-days');
  if(!el) return;
  if (!S.workoutLog || !S.workoutLog.length) { 
    el.innerHTML = '<div class="empty">Sin entrenamientos aún</div>'; 
    return; 
  }
  
  const days = {};
  S.workoutLog.forEach(w => {
    if(!days[w.date]) days[w.date] = [];
    days[w.date].push(w);
  });
  
  const sortedDates = Object.keys(days).sort((a,b) => new Date(b) - new Date(a));
  
  el.innerHTML = sortedDates.slice(0, 15).map((date, index) => {
    const workouts = days[date];
    const [y, m, d] = date.split('-');
    const safeDate = new Date(y, m-1, d);
    let dateStr = safeDate.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'short'});
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    
    const detailsHtml = workouts.map(w => {
      const isCardio = w.type === 'cardio';
      const exHtml = (w.exercises || []).map(ex => {
        const unitText = ex.unit ? ` ${ex.unit}` : '';
        const setsHtml = (ex.sets || []).map((s, i) => {
          if(isCardio) return `<div style="display:flex; justify-content:space-between; font-size:12px; color:var(--t2); padding:2px 0;"><span>Registro</span><span>${s.kg}${unitText} en ${s.reps} min</span></div>`;
          else return `<div style="display:flex; justify-content:space-between; font-size:12px; color:var(--t2); padding:2px 0;"><span>Serie ${i+1}</span><span>${s.kg} kg × ${s.reps} reps</span></div>`;
        }).join('');
        const titleHtml = isCardio ? '' : `<div style="font-size:13px; font-weight:600; color:var(--t1); margin-top:4px;">${ex.name}</div>`;
        return `<div>${titleHtml}${setsHtml}</div>`;
      }).join('');
      
      return `
        <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--line);">
          <div style="font-size:13px; font-weight:700; color:var(--acc); display:flex; justify-content:space-between;">
            <span>${w.routineName}</span>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:11px; color:var(--t2); font-weight:normal;">${w.startTime} - ${w.endTime}</span>
              <button class="btn-danger" style="padding: 2px 6px; font-size:10px;" onclick="event.stopPropagation(); deleteWorkoutLog('${w.id}')">✕</button>
            </div>
          </div>
          ${exHtml}
        </div>
      `;
    }).join('');
    
    return `
      <div class="history-card" onclick="toggleHistoryDetails('day-${index}')" style="margin-bottom: 8px;">
        <div class="row">
          <div style="font-size:14px; font-weight:600;">${dateStr}</div>
          <div style="font-size:11px; color:var(--t2)">${workouts.length} entreno(s) ▼</div>
        </div>
        <div id="day-${index}" style="display:none; cursor:default;" onclick="event.stopPropagation();">
          ${detailsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function toggleHistoryDetails(id) { 
  const el = document.getElementById(id); 
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; 
}

function deleteWorkoutLog(id) { 
  if (typeof customConfirm === 'function') {
    customConfirm('Borrar registro', '¿Seguro que quieres borrar este entrenamiento de tu día?', () => {
      S.workoutLog = S.workoutLog.filter(w => w.id !== id); 
      save(); 
      renderGymDays(); 
      if(typeof renderHome === 'function') renderHome(); 
    });
  } else {
    S.workoutLog = S.workoutLog.filter(w => w.id !== id); 
    save(); 
    renderGymDays();
    if(typeof renderHome === 'function') renderHome(); 
  }
}
