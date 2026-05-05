// --- UTILIDADES DE TIEMPO ---
function formatTime(date) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function calcDuration(start, end) {
    if (!start || !end || start.includes('--') || end.includes('--')) return null;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // Por si pasa de medianoche
    return diff;
}

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
    init(); 
    
    if (!Array.isArray(S.routines)) S.routines = [];
    if (!Array.isArray(S.workoutLog)) S.workoutLog = [];
    if (typeof S.prs !== 'object' || S.prs === null) S.prs = {};

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
            <button class="btn-danger" onclick="removeRtEx(${i})">✕</button>
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
        const pendingExName = document.getElementById('rt-ex-name').value.trim();
        if (pendingExName) {
            const sets = parseInt(document.getElementById('rt-ex-sets').value) || 1;
            tempRtExercises.push({ type: 'pesas', name: pendingExName, sets });
        }
        if(tempRtExercises.length === 0) return showToast('Añade al menos un ejercicio a la lista', 'error');
        finalExercises = [...tempRtExercises];
    } else {
        const unit = document.getElementById('rt-cardio-unit').value.trim() || 'km';
        finalExercises = [{ type: 'cardio', name: name, unit: unit, sets: 1 }];
    }
    
    if (!Array.isArray(S.routines)) S.routines = [];
    S.routines.push({ id: uid(), name, type, exercises: finalExercises });
    
    save(); closeModal('modal-routine'); renderRoutines();
    showToast('Rutina guardada');
}

function renderRoutines() {
    const list = document.getElementById('gym-routine-list');
    if(!list) return;
    if(!Array.isArray(S.routines)) S.routines = []; 
    
    list.innerHTML = S.routines.length ? S.routines.map(r => {
        const isCardio = r.type === 'cardio';
        const exCount = r.exercises ? r.exercises.length : 0;
        const subText = isCardio && r.exercises && r.exercises[0] ? `Cardio (${r.exercises[0].unit})` : `${exCount} ejercicios`;
        
        return `
        <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line);">
            <div>
                <div style="font-weight:700; font-size:15px; color:${isCardio ? 'var(--yel)' : 'var(--t1)'}">${r.name || 'Sin nombre'}</div>
                <div style="font-size:11px; color:var(--t3); margin-top:2px;">${subText}</div>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <button class="btn btn-sm" style="background:var(--acc); color:#fff;" onclick="startWorkout('${r.id}')">▶ Empezar</button>
                <button class="btn-danger" onclick="delRoutine('${r.id}')">✕</button>
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
    if(S.activeRoutine && (!S.activeRoutine.exercises || !S.activeRoutine.startTime)) {
        S.activeRoutine = null;
    } else if (S.activeRoutine) {
        return showToast('Ya tienes un entreno en progreso', 'error');
    }
    
    const r = S.routines.find(x => x.id === id);
    if(!r) return;
    
    const workoutExercises = (r.exercises || []).map(ex => {
        let setsArray = [];
        if(ex.type === 'pesas') {
            for(let i=0; i<(ex.sets || 1); i++) setsArray.push({ done: false });
        } else {
            setsArray.push({ done: false }); 
        }
        return { type: ex.type, name: ex.name, unit: ex.unit, sets: setsArray };
    });

    S.activeRoutine = {
        id: uid(),
        routineId: r.id,
        name: r.name || 'Entrenamiento',
        type: r.type || 'pesas',
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
    const isOnlyCardio = w.type === 'cardio';
    
    let exHtml = (w.exercises || []).map((ex, exIdx) => {
        const isPesas = ex.type === 'pesas';
        const headers = isPesas 
            ? `<div style="flex:1; text-align:center; font-size:10px; color:var(--t3); font-weight:700;">KG</div><div style="flex:1; text-align:center; font-size:10px; color:var(--t3); font-weight:700;">REPS</div>`
            : `<div style="flex:1; text-align:center; font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase;">${ex.unit}</div>`;

        const setsHtml = (ex.sets || []).map((set, sIdx) => {
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

    let addBtnHtml = '';
    if (!isOnlyCardio) {
        addBtnHtml = `<button class="btn" style="background:var(--bg3); color:var(--t1); width:100%; margin-top:16px; font-size:14px; border: 1px dashed var(--line);" onclick="openAddExerciseModal()">+ Añadir Ejercicio Adicional</button>`;
    }

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

            ${addBtnHtml}

            <div style="margin-top:24px; display:flex; flex-direction:column; gap:10px;">
                <button class="btn" style="background:var(--acc); color:#fff; width:100%; font-size:15px;" onclick="finishWorkout()">Finalizar Entreno 💪</button>
                <button class="btn" style="background:transparent; color:var(--t3); width:100%; font-size:13px;" onclick="cancelWorkout()">Descartar entreno</button>
            </div>
        </div>
    `;
}

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
    
    // LÓGICA DE RÉCORDS PARA PESAS (Se comprueba al marcar el check)
    if(s.done) {
        if(!S.prs) S.prs = {};
        const key = ex.name;
        
        if (ex.type === 'pesas' && s.kg && s.reps) {
            const weight = parseFloat(s.kg);
            const reps = parseInt(s.reps);
            let isNewPR = false;
            
            if(!S.prs[key] || S.prs[key].type !== 'pesas') {
                isNewPR = true;
            } else if (weight > S.prs[key].val) {
                // Nuevo récord si levantas más peso
                isNewPR = true;
            } else if (weight === S.prs[key].val && reps > S.prs[key].reps) {
                // Nuevo récord si levantas el MISMO peso pero MÁS repeticiones
                isNewPR = true;
            }

            if(isNewPR) {
                S.prs[key] = { type: 'pesas', val: weight, reps: reps, date: today() };
                showToast(`¡Nuevo PR en ${key}! 🏆`);
            }
        }
        // Nota: Los récords de Cardio se calculan en FinishWorkout para tener en cuenta el tiempo total.
    }
    save(); renderActiveWorkout(); renderRecords();
}

function cancelWorkout() {
    customConfirm('Cancelar Entreno', '¿Descartar este entrenamiento?', () => { S.activeRoutine = null; save(); renderActiveWorkout(); });
}

function finishWorkout() {
    if(!S.activeRoutine.endTime || S.activeRoutine.endTime === '--:--') S.activeRoutine.endTime = formatTime(new Date());
    let vol = 0;
    
    // Calculamos los minutos del entreno (si da 0 o error, ponemos 1 min por defecto para evitar dividir por cero)
    const durMins = calcDuration(S.activeRoutine.startTime, S.activeRoutine.endTime) || 1;
    
    const savedExercises = JSON.parse(JSON.stringify(S.activeRoutine.exercises || []));

    // LÓGICA DE RÉCORDS PARA CARDIO (Se comprueba al finalizar)
    savedExercises.forEach(ex => {
        if(ex.type === 'pesas') { 
            (ex.sets || []).forEach(s => { 
                if((s.done || (s.kg && s.reps)) && s.kg && s.reps) vol += parseFloat(s.kg) * parseInt(s.reps); 
            }); 
        } else if (ex.type === 'cardio') {
            let totalVal = 0;
            (ex.sets || []).forEach(s => { 
                if((s.done || s.val) && s.val) totalVal += parseFloat(s.val); 
            });
            
            if (totalVal > 0) {
                const pace = totalVal / durMins; // Eficiencia: Unidades por minuto
                const key = ex.name;
                if (!S.prs) S.prs = {};

                let isNewRecord = false;
                if (!S.prs[key] || S.prs[key].type !== 'cardio') {
                    isNewRecord = true;
                } else {
                    // Calculamos la eficiencia del récord antiguo
                    const oldPace = S.prs[key].time ? (S.prs[key].val / S.prs[key].time) : 0;
                    if (pace > oldPace) {
                        isNewRecord = true;
                    }
                }

                if (isNewRecord) {
                    S.prs[key] = {
                        type: 'cardio',
                        val: totalVal,
                        time: durMins,
                        unit: ex.unit,
                        date: today()
                    };
                    showToast(`¡Nuevo Récord de eficiencia en ${key}! 🏆`);
                }
            }
        }
    });
    
    if(!Array.isArray(S.workoutLog)) S.workoutLog = [];
    S.workoutLog.push({ 
        id: S.activeRoutine.id, 
        date: S.activeRoutine.date, 
        name: S.activeRoutine.name, 
        type: S.activeRoutine.type, 
        startTime: S.activeRoutine.startTime, 
        endTime: S.activeRoutine.endTime, 
        volume: vol,
        exercises: savedExercises
    });
    
    S.activeRoutine = null;
    save(); renderActiveWorkout(); renderWorkoutLog(); showToast('Entreno completado ✅');
}

// --- HISTORIAL ACORDEÓN ---
function toggleLogDate(date) {
    const content = document.getElementById(`content-date-${date}`);
    const icon = document.getElementById(`icon-date-${date}`);
    if(content.style.display === 'none') {
        content.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    }
}

function toggleWorkoutDetails(id) {
    const el = document.getElementById(`details-${id}`);
    const icon = document.getElementById(`icon-workout-${id}`);
    if(!el) return;
    if(el.style.display === 'none') {
        el.style.display = 'block';
        if(icon) icon.style.transform = 'rotate(180deg)';
    } else {
        el.style.display = 'none';
        if(icon) icon.style.transform = 'rotate(0deg)';
    }
}

function renderWorkoutLog() {
    const list = document.getElementById('gym-workout-log');
    if(!list) return;
    if(!Array.isArray(S.workoutLog)) S.workoutLog = [];
    
    if(S.workoutLog.length === 0) {
        list.innerHTML = '<div class="empty">Tu historial aparecerá aquí</div>';
        return;
    }

    const grouped = {};
    S.workoutLog.forEach(w => {
        if(!grouped[w.date]) grouped[w.date] = [];
        grouped[w.date].push(w);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

    let html = '';
    sortedDates.forEach(date => {
        const dayWorkouts = grouped[date];
        const dayVol = dayWorkouts.reduce((acc, w) => acc + (w.volume || 0), 0);
        
        html += `
        <div style="margin-bottom:12px; background:var(--bg2); border-radius:12px; border:1px solid var(--line); overflow:hidden;">
            <div style="padding:14px 16px; background:var(--bg3); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleLogDate('${date}')">
                <div style="font-weight:700; color:var(--t1); font-size:14px;">📅 ${date}</div>
                <div style="display:flex; gap:12px; align-items:center;">
                    ${dayVol > 0 ? `<div style="font-size:12px; font-weight:700; color:var(--acc);">${dayVol} kg vol.</div>` : ''}
                    <div id="icon-date-${date}" style="font-size:12px; color:var(--t3); transition:transform 0.2s;">▼</div>
                </div>
            </div>
            
            <div id="content-date-${date}" style="display:none; padding:0 16px;">
        `;

        dayWorkouts.reverse().forEach(w => {
            let rightSideHtml = '';
            let detailsHtml = '';
            
            const durMins = calcDuration(w.startTime, w.endTime);
            const durTextBadge = durMins !== null ? ` en ${durMins} min` : '';
            const durTextSub = durMins !== null ? ` (${durMins} min)` : '';
            
            let usedDurationInCardio = false;

            if (w.exercises && w.exercises.length > 0) {
                const hasPesas = w.exercises.some(ex => ex.type === 'pesas');
                const cardioExercises = w.exercises.filter(ex => ex.type === 'cardio');
                
                let badges = [];
                
                if (w.volume > 0) {
                    badges.push(`<div style="font-size:14px; font-weight:800; color:var(--acc);">${w.volume} <span style="font-size:10px; color:var(--t3);">kg</span></div>`);
                }
                
                cardioExercises.forEach(cx => {
                    let cVal = 0;
                    (cx.sets || []).forEach(s => { if (s.val) cVal += parseFloat(s.val); });
                    if (cVal > 0) {
                        badges.push(`<div style="font-size:15px; font-weight:800; color:var(--yel);">${cVal} <span style="font-size:11px; color:var(--t3); font-weight:600;">${cx.unit}${durTextBadge}</span></div>`);
                        usedDurationInCardio = true;
                    }
                });

                rightSideHtml = `<div style="display:flex; gap:10px; align-items:center;">${badges.join('')}</div>`;

                if (hasPesas) {
                    let exList = '';
                    w.exercises.forEach(ex => {
                        if (ex.type !== 'pesas') return;
                        const validSets = (ex.sets || []).filter(s => s.done || (s.kg && s.reps));
                        if (validSets.length === 0) return;

                        let setsBadges = validSets.map(s => `<span style="background:var(--bg3); padding:4px 8px; border-radius:6px; font-size:11px; margin-right:6px; margin-bottom:6px; display:inline-block; border:1px solid var(--line); color:var(--t1);">${s.kg}kg × ${s.reps}</span>`).join('');

                        exList += `
                        <div style="margin-top:10px; border-left:2px solid var(--acc); padding-left:12px;">
                            <div style="font-size:12px; font-weight:700; color:var(--t2); margin-bottom:6px;">${ex.name}</div>
                            <div>${setsBadges}</div>
                        </div>`;
                    });

                    if (exList) {
                        detailsHtml = `
                        <div id="details-${w.id}" style="display:none; margin-top:12px; padding-top:8px; border-top:1px dashed var(--line);">
                            ${exList}
                        </div>`;
                        
                        rightSideHtml = `
                        <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="toggleWorkoutDetails('${w.id}')">
                            ${rightSideHtml}
                            <div id="icon-workout-${w.id}" style="font-size:10px; color:var(--t3); transition:0.2s; padding:4px;">▼</div>
                        </div>`;
                    }
                }
            } else {
                if (w.volume > 0) {
                    rightSideHtml = `<div style="font-size:14px; font-weight:800; color:var(--acc);">${w.volume} <span style="font-size:10px; color:var(--t3);">kg</span></div>`;
                }
            }

            html += `
                <div style="padding:16px 0; border-bottom:1px solid var(--line);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div ${detailsHtml ? `onclick="toggleWorkoutDetails('${w.id}')" style="cursor:pointer;"` : ''}>
                            <div style="font-weight:700; color:var(--t1); font-size:15px;">${w.name || 'Entrenamiento'}</div>
                            <div style="font-size:11px; color:var(--t3); margin-top:4px;">⏱️ ${w.startTime} - ${w.endTime}${!usedDurationInCardio ? durTextSub : ''}</div>
                        </div>
                        <div style="display:flex; gap:16px; align-items:center;">
                            ${rightSideHtml}
                            <button class="btn-danger" onclick="delWorkoutLog('${w.id}')">✕</button>
                        </div>
                    </div>
                    ${detailsHtml}
                </div>
            `;
        });

        html += `</div></div>`;
    });

    list.innerHTML = html;
}

function delWorkoutLog(id) { 
    customConfirm('Borrar Entreno', '¿Eliminar este día?', () => { 
        S.workoutLog = S.workoutLog.filter(x => x.id !== id); 
        save(); renderWorkoutLog(); 
    }); 
}

function renderRecords() {
    const list = document.getElementById('gym-records-list');
    if(!list) return;
    if(!S.prs) S.prs = {};
    
    const prKeys = Object.keys(S.prs);
    list.innerHTML = prKeys.length ? prKeys.map(k => {
        const pr = S.prs[k];
        const isPesas = pr.type === 'pesas';
        
        let rightHtml = '';
        if (isPesas) {
            rightHtml = `
                <div style="font-size:22px; font-weight:800; color:var(--yel); line-height:1;">${pr.val} <span style="font-size:12px; color:var(--t2);">kg</span></div>
                <div style="font-size:12px; color:var(--t1); font-weight:600; margin-top:2px;">x ${pr.reps} reps</div>
            `;
        } else {
            rightHtml = `
                <div style="font-size:22px; font-weight:800; color:var(--yel); line-height:1;">${pr.val} <span style="font-size:12px; color:var(--t2);">${pr.unit || ''}</span></div>
                ${pr.time ? `<div style="font-size:12px; color:var(--t1); font-weight:600; margin-top:2px;">en ${pr.time} min</div>` : ''}
            `;
        }

        return `
        <div class="card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-left: 4px solid var(--yel);">
            <div>
                <div style="font-weight:700; font-size:15px; color:var(--t1); text-transform:uppercase;">${k}</div>
                <div style="font-size:11px; color:var(--t3); margin-top:4px;">El ${pr.date}</div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="text-align:right;">
                    ${rightHtml}
                </div>
                <button class="btn-danger" onclick="delRecord('${k}')">✕</button>
            </div>
        </div>
        `;
    }).join('') : '<div class="empty">Tus récords aparecerán al marcar series ✅</div>';
}

function delRecord(key) {
    customConfirm('Borrar Récord', `¿Eliminar tu récord de ${key}?`, () => {
        delete S.prs[key];
        save(); 
        renderRecords();
        showToast('Récord eliminado');
    });
}
