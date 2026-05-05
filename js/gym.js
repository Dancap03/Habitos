// --- SISTEMA DE PESTAÑAS ---
function switchGymTab(tab, btn) {
    document.querySelectorAll('.fin-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    
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

// --- RENDERIZADO INICIAL ---
function renderGymInit() {
    init(); // Asegura cargar los datos de main.js primero
    renderRoutines();
    renderActiveWorkout();
    renderWorkoutLog();
    renderRecords();
}

// --- RUTINAS ---
function addRoutine() {
    const name = document.getElementById('rt-name').value.trim();
    const exStr = document.getElementById('rt-exercises').value;
    if(!name) return showToast('Pon un nombre a la rutina', 'error');
    
    const exercises = exStr.split(',').map(e => e.trim()).filter(e => e);
    S.routines.push({ id: uid(), name, exercises });
    save(); 
    closeModal('modal-routine'); 
    renderRoutines();
    showToast('Rutina guardada');
}

function renderRoutines() {
    const list = document.getElementById('gym-routine-list');
    if(!list) return;
    list.innerHTML = S.routines.length ? S.routines.map(r => `
        <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line);">
            <div>
                <div style="font-weight:700; font-size:14px;">${r.name}</div>
                <div style="font-size:11px; color:var(--t2); margin-top:2px;">${r.exercises.join(' · ')}</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-sm" style="background:var(--acc); color:#fff;" onclick="startWorkout('${r.id}')">▶ Empezar</button>
                <button class="btn-danger" style="background:none; color:var(--red); border:none; padding:8px;" onclick="delRoutine('${r.id}')">✕</button>
            </div>
        </div>
    `).join('') : '<div class="empty">No tienes rutinas configuradas</div>';
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
    
    S.activeRoutine = {
        id: uid(),
        routineId: r.id,
        name: r.name,
        date: today(),
        startTime: formatTime(new Date()),
        endTime: '--:--',
        exercises: r.exercises.map(name => ({ name, sets: [] }))
    };
    save();
    
    // Cambiar automáticamente a la pestaña de Rutinas si no estaba
    const btnRutinas = document.querySelector('.fin-tab:first-child');
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
    
    // Si la pestaña seleccionada no es "Rutinas", lo ocultamos
    const isRutinasTab = document.querySelector('.fin-tab.on').textContent.trim() === 'Rutinas';
    cont.style.display = isRutinasTab ? 'block' : 'none';
    
    const w = S.activeRoutine;
    
    let exHtml = w.exercises.map((ex, exIdx) => `
        <div style="margin-top:20px; background:var(--bg3); padding:12px; border-radius:12px;">
            <div style="font-weight:700; color:var(--acc); margin-bottom:12px;">${ex.name}</div>
            
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${ex.sets.map((set, sIdx) => `
                    <div style="display:flex; gap:8px; align-items:center;">
                        <div style="width:24px; text-align:center; font-size:12px; color:var(--t3); font-weight:700;">${sIdx + 1}</div>
                        <input type="number" placeholder="kg" value="${set.kg||''}" onchange="updateSet(${exIdx}, ${sIdx}, 'kg', this.value)" style="flex:1; min-width:0; padding:10px; background:var(--bg4); border:none; border-radius:8px; color:#fff; text-align:center;">
                        <input type="number" placeholder="reps" value="${set.reps||''}" onchange="updateSet(${exIdx}, ${sIdx}, 'reps', this.value)" style="flex:1; min-width:0; padding:10px; background:var(--bg4); border:none; border-radius:8px; color:#fff; text-align:center;">
                        <button class="btn" style="background:${set.done ? 'var(--acc)' : 'var(--bg4)'}; color:${set.done ? '#fff' : 'var(--t2)'}; padding:10px 16px; border-radius:8px; font-weight:700;" onclick="toggleSet(${exIdx}, ${sIdx})">✓</button>
                    </div>
                `).join('')}
            </div>
            
            <button class="btn btn-sm" style="background:rgba(255,255,255,0.05); width:100%; margin-top:12px; color:var(--t2);" onclick="addSet(${exIdx})">+ Añadir Serie</button>
        </div>
    `).join('');

    cont.innerHTML = `
        <div style="font-size:20px; font-weight:800; color:var(--t1);">${w.name}</div>
        <div style="font-size:12px; color:var(--acc); font-weight:600; margin-bottom:16px;">EN PROGRESO ⏳</div>
        
        <div style="display:flex; gap:12px; margin-bottom:8px;">
            <div style="flex:1;">
                <div style="font-size:11px; color:var(--t3); margin-bottom:4px; font-weight:600;">Hora Inicio</div>
                <input type="time" value="${w.startTime}" onchange="S.activeRoutine.startTime=this.value; save();" style="width:100%; padding:10px; background:var(--bg3); border:none; border-radius:8px; color:#fff;">
            </div>
            <div style="flex:1;">
                <div style="font-size:11px; color:var(--t3); margin-bottom:4px; font-weight:600;">Hora Fin</div>
                <input type="time" value="${w.endTime !== '--:--' ? w.endTime : ''}" onchange="S.activeRoutine.endTime=this.value; save();" style="width:100%; padding:10px; background:var(--bg3); border:none; border-radius:8px; color:#fff;">
            </div>
        </div>

        ${exHtml}

        <div style="margin-top:24px; display:flex; flex-direction:column; gap:10px;">
            <button class="btn" style="background:var(--acc); color:#fff; width:100%; font-size:16px;" onclick="finishWorkout()">Finalizar Entreno 💪</button>
            <button class="btn" style="background:rgba(231,76,60,0.1); color:var(--red); width:100%;" onclick="cancelWorkout()">Descartar entreno</button>
        </div>
    `;
}

function addSet(exIdx) {
    S.activeRoutine.exercises[exIdx].sets.push({ kg: '', reps: '', done: false });
    save(); renderActiveWorkout();
}

function updateSet(exIdx, sIdx, field, val) {
    S.activeRoutine.exercises[exIdx].sets[sIdx][field] = val;
    save();
}

function toggleSet(exIdx, sIdx) {
    const s = S.activeRoutine.exercises[exIdx].sets[sIdx];
    s.done = !s.done;
    
    // Comprobar si hay nuevo PR
    if(s.done && s.kg && s.reps) {
        const exName = S.activeRoutine.exercises[exIdx].name;
        const weight = parseFloat(s.kg);
        if(!S.prs[exName] || weight > S.prs[exName].kg) {
            S.prs[exName] = { kg: weight, reps: parseInt(s.reps), date: today() };
            showToast(`¡Nuevo PR en ${exName}! 🏆`);
        }
    }
    save(); renderActiveWorkout(); renderRecords();
}

function cancelWorkout() {
    customConfirm('Cancelar Entreno', '¿Estás seguro de descartar este entrenamiento en progreso?', () => {
        S.activeRoutine = null;
        save(); renderActiveWorkout();
    });
}

function finishWorkout() {
    if(!S.activeRoutine.endTime || S.activeRoutine.endTime === '--:--') {
        S.activeRoutine.endTime = formatTime(new Date());
    }
    
    // Calcular volumen total movido
    let vol = 0;
    S.activeRoutine.exercises.forEach(ex => {
        ex.sets.forEach(s => {
            if(s.done && s.kg && s.reps) vol += parseFloat(s.kg) * parseInt(s.reps);
        });
    });

    S.workoutLog.push({
        id: S.activeRoutine.id,
        date: S.activeRoutine.date,
        name: S.activeRoutine.name,
        startTime: S.activeRoutine.startTime,
        endTime: S.activeRoutine.endTime,
        volume: vol
    });

    S.activeRoutine = null;
    save(); renderActiveWorkout(); renderWorkoutLog(); showToast('Entreno completado y guardado ✅');
}

// --- HISTORIAL ---
function renderWorkoutLog() {
    const list = document.getElementById('gym-workout-log');
    if(!list) return;
    
    // Mostrar del más reciente al más antiguo
    const sortedLog = [...S.workoutLog].reverse();
    
    list.innerHTML = sortedLog.length ? sortedLog.map(w => `
        <div class="list-item" style="padding:12px 0; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:700; color:var(--t1);">${w.name}</div>
                <div style="font-size:11px; color:var(--t2); margin-top:2px;">${w.date} · ⏱️ ${w.startTime} - ${w.endTime}</div>
            </div>
            <div style="text-align:right; display:flex; align-items:center; gap:12px;">
                <div style="font-size:14px; font-weight:800; color:var(--acc);">${w.volume} <span style="font-size:10px; color:var(--t3);">kg vol.</span></div>
                <button class="btn-danger" style="background:none; color:var(--red); border:none; padding:4px;" onclick="delWorkoutLog('${w.id}')">✕</button>
            </div>
        </div>
    `).join('') : '<div class="empty">Tu historial de entrenos aparecerá aquí</div>';
}

function delWorkoutLog(id) {
    customConfirm('Borrar Entreno', '¿Eliminar este día del historial?', () => {
        S.workoutLog = S.workoutLog.filter(x => x.id !== id);
        save(); renderWorkoutLog();
    });
}

// --- RÉCORDS (PRs) ---
function renderRecords() {
    const list = document.getElementById('gym-records-list');
    if(!list) return;
    
    const prKeys = Object.keys(S.prs);
    list.innerHTML = prKeys.length ? prKeys.map(k => {
        const pr = S.prs[k];
        return `
        <div class="list-item" style="padding:16px; background:var(--bg3); border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-left: 4px solid var(--yel);">
            <div>
                <div style="font-weight:700; font-size:15px; color:var(--t1); text-transform:uppercase;">${k}</div>
                <div style="font-size:11px; color:var(--t3); margin-top:4px;">Conseguido el ${pr.date}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:22px; font-weight:800; color:var(--yel); line-height:1;">${pr.kg} <span style="font-size:12px; color:var(--t2);">kg</span></div>
                <div style="font-size:12px; color:var(--t1); font-weight:600; margin-top:2px;">x ${pr.reps} reps</div>
            </div>
        </div>
        `;
    }).join('') : '<div class="empty">Completa series para que tus récords aparezcan aquí mágicamente 🥇</div>';
}
