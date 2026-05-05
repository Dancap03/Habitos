// --- SISTEMA DE PESTAÑAS ---
function switchGymTab(tab, btn) {
    document.querySelectorAll('.gym-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    
    const cont = document.getElementById('active-workout-container');
    
    document.querySelectorAll('.tab-rutinas-item').forEach(el => {
        if(el.id === 'active-workout-container') {
            el.style.display = (tab === 'rutinas' && S.activeRoutine) ? 'block' : 'none';
        } else {
            el.style.display = tab === 'rutinas' ? 'block' : 'none';
        }
    });
    
    document.querySelectorAll('.tab-records-item').forEach(el => {
        el.style.display = tab === 'records' ? 'block' : 'none';
    });
}

function renderGymInit() {
    init(); // Asegura cargar S desde main.js
    
    // PROTECCIÓN CONTRA BUG "Cargando..." (Asegura que los arrays existan)
    if (!S.routines) S.routines = [];
    if (!S.workoutLog) S.workoutLog = [];
    if (!S.prs) S.prs = {};

    renderRoutines();
    renderActiveWorkout();
    renderWorkoutLog();
    renderRecords();
}

// --- CREADOR DE RUTINAS BASE ---
let tempRtExercises = [];

function openRoutineModal() {
    document.getElementById('rt-name').value = '';
    document.getElementById('rt-main-type').value = 'pesas';
    
    tempRtExercises = [];
    renderRtExList();
    
    document.getElementById('rt-ex-name').value = '';
    document.getElementById('rt-ex-sets').value = '';
    document.getElementById('rt-cardio-unit').value = '';
    
    toggleRtMainType();
    openModal('modal-routine');
}

function toggleRtMainType() {
    const type = document.getElementById('rt-main-type').value;
    document.getElementById('rt-pesas-container').style.display = type === 'pesas' ? 'block' : 'none';
    document.getElementById('rt-cardio-container').style.display = type === 'cardio' ? 'block' : 'none';
}

function addRtEx() {
    const name = document.getElementById('rt-ex-name').value.trim();
    const sets = parseInt(document.getElementById('rt-ex-sets').value) || 1;

    if(!name) return showToast('Pon nombre al ejercicio', 'error');

    tempRtExercises.push({ type: 'pesas', name, sets });
    renderRtExList();

    document.getElementById('rt-ex-name').value = '';
    document.getElementById('rt-ex-sets').value = '';
}

function renderRtExList() {
    const el = document.getElementById('rt-ex-list');
    el.innerHTML = tempRtExercises.map((ex, i) => `
        <div style="background:var(--bg3); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-size:13px; font-weight:700;">${ex.name}</div>
                <div style="font-size:11px; color:var(--t3);">${ex.sets} series</div>
            </div>
            <button class="btn-danger" style="background:none; border:none; color:var(--red); padding:4px;" onclick="removeRtEx(${i})">✕</button>
        </div>
    `).join('');
}

function removeRtEx(i) {
    tempRtExercises.splice(i, 1);
    renderRtExList();
}

function addRoutine() {
    const name = document.getElementById('rt-name').value.trim();
    const type = document.getElementById('rt-main-type').value;
    
    if(!name) return showToast('Pon un nombre a la rutina', 'error');
    
    let finalExercises = [];
    
    if (type === 'pesas') {
        if(tempRtExercises.length === 0) return showToast('Añade al menos un ejercicio a la lista', 'error');
        finalExercises = [...tempRtExercises];
    } else {
        // Modo Cardio: Crea un único ejercicio con el mismo nombre que la rutina
        const unit = document.getElementById('rt-cardio-unit').value.trim() || 'km';
        finalExercises = [{ type: 'cardio', name: name, unit: unit, sets: 1 }];
    }
    
    S.routines.push({ id: uid(), name, type, exercises: finalExercises });
    save(); closeModal('modal-routine'); renderRoutines();
    showToast('Rutina guardada');
}

function renderRoutines() {
    const list = document.getElementById('gym-routine-list');
    if(!list) return;
    if(!S.routines) S.routines = []; // Doble check
    
    list.innerHTML = S.routines.length ? S.routines.map(r => {
        const isCardio = r.type === 'cardio';
        const subText = isCardio ? `Cardio (${r.exercises[0].unit})` : `${r.exercises.length} ejercicios`;
        
        return `
        <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line);">
            <div>
                <div style="font-weight:700; font-size:15px; color:${isCardio ? 'var(--yel)' : 'var(--t1)'}">${r.name}</div>
                <div style="font-size:11px; color:var(--t3); margin-top:2px;">${subText}</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-sm" style="background:var(--acc); color:#fff;" onclick="startWorkout('${r.id}')">▶ Empezar</button>
                <button class="btn-danger" style="background:none; color:var(--red); border:none; padding:8px;" onclick="delRoutine('${r.id}')">✕</button>
            </div>
        </div>
        `;
    }).join('') : '<div class="empty">No tienes rutinas. ¡Crea una!</div>';
}

function delRoutine(id) {
    customConfirm('Borrar Rutina', '¿Eliminar esta rutina para siempre?', () => {
        S.routines = S.routines.filter(x => x.id !== id);
        save(); renderRoutines();
    });
}

// --- ENTRENO ACTIVO ---
function startWorkout(id) {
    if(S.activeRoutine) return showToast('Ya tienes un entreno en progreso', 'error');
    const r = S.routines.find(x => x.id === id);
    if(!r) return;
    
    // Preparar las series según lo guardado
    const workoutExercises = r.exercises.map(ex => {
        let setsArray = [];
        if(ex.type === 'pesas') {
            for(let i=0; i<ex.sets; i++) setsArray.push({ done: false });
        } else {
            setsArray.push({ done: false }); // Cardio por defecto 1 serie (1 registro)
        }
        return { type: ex.type, name: ex.name, unit: ex.unit, sets: setsArray };
    });

    S.activeRoutine = {
        id: uid(),
        routineId: r.id,
        name: r.name,
        date: today(),
        startTime: formatTime(new Date()),
        endTime: '--:--',
        exercises: workoutExercises
    };
    save();
    
    const btnRutinas = document.querySelector('.gym-tab:first-child');
    if(btnRutinas) switchGymTab('rutinas', btnRutinas);
    
    renderActiveWorkout();
}

function renderActiveWorkout() {
    const cont = document.getElementById('active-workout-container');
    if(!cont) return;
    
    if(!S.activeRoutine) {
        cont.style.display = 'none';
        cont.innerHTML = '';
        return;
    }
    
    const isRutinasTab = document.querySelector('.gym-tab.on').textContent.trim() === 'Rutinas';
    cont.style.display = isRutinasTab ? 'block' : 'none';
    
    const w = S.activeRoutine;
    
    let exHtml = w.exercises.map((ex, exIdx) => {
        const isPesas = ex.type === 'pesas';
        const headers = isPesas 
            ? `<div style="flex:1; text-align:center; font-size:10px; color:var(--t3); font-weight:700;">KG</div><div style="flex:1; text-align:center; font-size:10px; color:var(--t3); font-weight:700;">REPS</div>`
            : `<div style="flex:1; text-align:center; font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase;">${ex.unit}</div>`;

        const setsHtml = ex.sets.map((set, sIdx) => {
            const inputs = isPesas
                ? `<input type="number" placeholder="kg" value="${set.kg||''}" onchange="updateSet(${exIdx}, ${sIdx}, 'kg', this.value)" style="flex:1; min-width:0; padding:10px; background:var(--bg4); border:none; border-radius:8px; color:#fff; text-align:center;">
                   <input type="number" placeholder="reps" value="${set.reps||''}" onchange="updateSet(${exIdx}, ${sIdx}, 'reps', this.value)" style="flex:1; min-width:0; padding:10px; background:var(--bg4); border:none; border-radius:8px; color:#fff; text-align:center;">`
                : `<input type="number" placeholder="${ex.unit}" value="${set.val||''}" onchange="updateSet(${exIdx}, ${sIdx}, 'val', this.value)" style="flex:1; min-width:0; padding:10px; background:var(--bg4); border:none; border-radius:8px; color:#fff; text-align:center;">`;

            return `
                <div style="display:flex; gap:8px; align-items:center;">
                    <div style="width:24px; text-align:center; font-size:12px; color:var(--t3); font-weight:700;">${sIdx + 1}</div>
                    ${inputs}
                    <button class="btn" style="background:${set.done ? 'var(--acc)' : 'var(--bg4)'}; color:${set.done ? '#fff' : 'var(--t2)'}; padding:10px 16px; border-radius:8px; font-weight:700;" onclick="toggleSet(${exIdx}, ${sIdx})">✓</button>
                </div>
            `;
        }).join('');

        return `
        <div style="margin-top:16px; background:var(--bg3); padding:14px; border-radius:12px;">
            <div style="font-weight:700; font-size:15px; color:${isPesas?'var(--acc)':'var(--yel)'}; margin-bottom:12px;">${ex.name}</div>
            <div style="display:flex; gap:8px; padding-left:32px; padding-right:56px; margin-bottom:4px;">${headers}</div>
            <div style="display:flex; flex-direction:column; gap:8px;">${setsHtml}</div>
            ${isPesas ? `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05); width:100%; margin-top:12px; color:var(--t1);" onclick="addSet(${exIdx})">+ Añadir Serie Extra</button>` : ''}
        </div>
        `;
    }).join('');

    cont.innerHTML = `
        <div class="card" style="border: 1px solid var(--acc);">
            <div style="font-size:22px; font-weight:800; color:var(--t1);">${w.name}</div>
            <div style="font-size:12px; color:var(--acc); font-weight:600; margin-bottom:16px; letter-spacing:0.5px;">EN PROGRESO ⏳</div>
            
            <div style="display:flex; gap:12px; margin-bottom:16px;">
                <div style="flex:1;">
                    <div style="font-size:11px; color:var(--t3); margin-bottom:4px; font-weight:600;">Hora Inicio</div>
                    <input type="time" value="${w.startTime}" onchange="S.activeRoutine.startTime=this.value; save();" style="width:100%; padding:10px; background:var(--bg3); border:none; border-radius:8px; color:#fff; box-sizing:border-box;">
                </div>
                <div style="flex:1;">
                    <div style="font-size:11px; color:var(--t3); margin-bottom:4px; font-weight:600;">Hora Fin</div>
                    <input type="time" value="${w.endTime !== '--:--' ? w.endTime : ''}" onchange="S.activeRoutine.endTime=this.value; save();" style="width:100%; padding:10px; background:var(--bg3); border:none; border-radius:8px; color:#fff; box-sizing:border-box;">
                </div>
            </div>

            ${exHtml}

            <button class="btn" style="background:var(--bg3); color:var(--t1); width:100%; margin-top:16px; font-size:14px; border: 1px dashed var(--line);" onclick="openAddExerciseModal()">+ Añadir Ejercicio Adicional</button>

            <div style="margin-top:24px; display:flex; flex-direction:column; gap:10px;">
                <button class="btn" style="background:var(--acc); color:#fff; width:100%; font-size:15px;" onclick="finishWorkout()">Finalizar Entreno 💪</button>
                <button class="btn" style="background:transparent; color:var(--t3); width:100%; font-size:13px;" onclick="cancelWorkout()">Descartar entreno</button>
            </div>
        </div>
    `;
}

// --- EJERCICIOS AD-HOC DENTRO DEL ENTRENO ---
function openAddExerciseModal() {
    document.getElementById('ex-name').value = '';
    document.getElementById('ex-unit').value = '';
    document.getElementById('ex-type').value = 'pesas';
    toggleExerciseType();
    openModal('modal-exercise');
}

function toggleExerciseType() {
    const type = document.getElementById('ex-type').value;
    document.getElementById('ex-unit-container').style.display = type === 'cardio' ? 'block' : 'none';
}

function addExerciseToWorkout() {
    const type = document.getElementById('ex-type').value;
    const name = document.getElementById('ex-name').value.trim();
    const unit = document.getElementById('ex-unit').value.trim() || 'km';

    if(!name) return showToast('Escribe el nombre', 'error');

    S.activeRoutine.exercises.push({ type, name, unit: type === 'cardio' ? unit : null, sets: [ { done: false } ] });
    save(); closeModal('modal-exercise'); renderActiveWorkout();
}

function addSet(exIdx) {
    S.activeRoutine.exercises[exIdx].sets.push({ done: false });
    save(); renderActiveWorkout();
}

function updateSet(exIdx, sIdx, field, val) {
    S.activeRoutine.exercises[exIdx].sets[sIdx][field] = val;
    save();
}

function toggleSet(exIdx, sIdx) {
    const ex = S.activeRoutine.exercises[exIdx];
    const s = ex.sets[sIdx];
    s.done = !s.done;
    
    if(s.done) {
        if(!S.prs) S.prs = {};
        const key = ex.name;
        if (ex.type === 'pesas' && s.kg && s.reps) {
            const weight = parseFloat(s.kg);
            if(!S.prs[key] || weight > S.prs[key].val) {
                S.prs[key] = { type: 'pesas', val: weight, reps: parseInt(s.reps), date: today() };
                showToast(`¡Nuevo PR en ${key}! 🏆`);
            }
        } else if (ex.type === 'cardio' && s.val) {
            const value = parseFloat(s.val);
            if(!S.prs[key] || value > S.prs[key].val) {
                S.prs[key] = { type: 'cardio', val: value, unit: ex.unit, date: today() };
                showToast(`¡Nuevo Récord en ${key}! 🏆`);
            }
        }
    }
    save(); renderActiveWorkout(); renderRecords();
}

function cancelWorkout() {
    customConfirm('Cancelar Entreno', '¿Descartar este entrenamiento?', () => { S.activeRoutine = null; save(); renderActiveWorkout(); });
}

function finishWorkout() {
    if(!S.activeRoutine.endTime || S.activeRoutine.endTime === '--:--') S.activeRoutine.endTime = formatTime(new Date());
    let vol = 0;
    S.activeRoutine.exercises.forEach(ex => {
        if(ex.type === 'pesas') { ex.sets.forEach(s => { if(s.done && s.kg && s.reps) vol += parseFloat(s.kg) * parseInt(s.reps); }); }
    });
    
    if(!S.workoutLog) S.workoutLog = [];
    S.workoutLog.push({ id: S.activeRoutine.id, date: S.activeRoutine.date, name: S.activeRoutine.name, startTime: S.activeRoutine.startTime, endTime: S.activeRoutine.endTime, volume: vol });
    S.activeRoutine = null;
    save(); renderActiveWorkout(); renderWorkoutLog(); showToast('Entreno completado ✅');
}

// --- HISTORIAL Y RÉCORDS ---
function renderWorkoutLog() {
    const list = document.getElementById('gym-workout-log');
    if(!list) return;
    if(!S.workoutLog) S.workoutLog = [];
    
    const sortedLog = [...S.workoutLog].reverse();
    list.innerHTML = sortedLog.length ? sortedLog.map(w => `
        <div class="list-item" style="padding:12px 0; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:700; color:var(--t1);">${w.name}</div>
                <div style="font-size:11px; color:var(--t2); margin-top:2px;">${w.date} · ⏱️ ${w.startTime} - ${w.endTime}</div>
            </div>
            <div style="text-align:right; display:flex; align-items:center; gap:12px;">
                ${w.volume > 0 ? `<div style="font-size:14px; font-weight:800; color:var(--acc);">${w.volume} <span style="font-size:10px; color:var(--t3);">kg vol.</span></div>` : ''}
                <button class="btn-danger" style="background:none; color:var(--red); border:none; padding:4px;" onclick="delWorkoutLog('${w.id}')">✕</button>
            </div>
        </div>
    `).join('') : '<div class="empty">Tu historial aparecerá aquí</div>';
}

function delWorkoutLog(id) { customConfirm('Borrar Entreno', '¿Eliminar este día?', () => { S.workoutLog = S.workoutLog.filter(x => x.id !== id); save(); renderWorkoutLog(); }); }

function renderRecords() {
    const list = document.getElementById('gym-records-list');
    if(!list) return;
    if(!S.prs) S.prs = {};
    
    const prKeys = Object.keys(S.prs);
    list.innerHTML = prKeys.length ? prKeys.map(k => {
        const pr = S.prs[k];
        const isPesas = pr.type === 'pesas';
        return `
        <div class="card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-left: 4px solid var(--yel);">
            <div><div style="font-weight:700; font-size:15px; color:var(--t1); text-transform:uppercase;">${k}</div><div style="font-size:11px; color:var(--t3); margin-top:4px;">El ${pr.date}</div></div>
            <div style="text-align:right;">
                <div style="font-size:22px; font-weight:800; color:var(--yel); line-height:1;">${pr.val} <span style="font-size:12px; color:var(--t2);">${isPesas ? 'kg' : pr.unit}</span></div>
                ${isPesas ? `<div style="font-size:12px; color:var(--t1); font-weight:600; margin-top:2px;">x ${pr.reps} reps</div>` : ''}
            </div>
        </div>
        `;
    }).join('') : '<div class="empty">Tus récords aparecerán al marcar series ✅</div>';
}
