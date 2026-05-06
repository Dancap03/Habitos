// ==========================================
// RENDERIZADO PRINCIPAL DE FINANZAS
// ==========================================
function updateFinanzasPage() {
    // Aseguramos que los arrays existan en S
    if (!S.incomes) S.incomes = [];
    if (!S.expenses) S.expenses = [];
    if (!S.savings) S.savings = [];
    if (!S.investments) S.investments = [];
    if (!S.subs) S.subs = []; // Suscripciones

    let totalInc = 0, totalExp = 0, totalSav = 0, totalInv = 0;

    // Calcular totales
    S.incomes.forEach(i => totalInc += parseFloat(i.amount));
    S.expenses.forEach(e => totalExp += parseFloat(e.amount));
    S.subs.forEach(s => totalExp += parseFloat(s.amount)); // Las subs cuentan como gasto
    S.savings.forEach(s => totalSav += parseFloat(s.amount));
    S.investments.forEach(i => totalInv += parseFloat(i.amount));

    const disponible = totalInc - totalExp - totalSav - totalInv;

    // Actualizar Textos
    document.getElementById('fin-avail').textContent = formatCurrency(disponible);
    document.getElementById('fin-total-aho').textContent = formatCurrency(totalSav);
    document.getElementById('fin-total-inv').textContent = formatCurrency(totalInv);
    
    document.getElementById('fin-total-inc').textContent = formatCurrency(totalInc);
    document.getElementById('fin-total-exp').textContent = formatCurrency(totalExp);
    document.getElementById('fin-total-sav-box').textContent = formatCurrency(totalSav);
    document.getElementById('fin-total-inv-box').textContent = formatCurrency(totalInv);

    // Pintar Listas
    renderFinList('list-incomes', S.incomes, 'ingreso');
    renderFinList('list-expenses', S.expenses, 'gasto');
    renderFinList('list-subs', S.subs, 'gasto');
    renderFinList('list-savings', S.savings, 'ahorro');
    renderFinList('list-investments', S.investments, 'inversion');
}

// Formateador de moneda
function formatCurrency(val) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
}

// Generador de Iconos basado en la descripción
function getIconForDesc(desc) {
    const d = desc.toLowerCase();
    if(d.includes('spotify') || d.includes('netflix')) return '🎭';
    if(d.includes('gasolina') || d.includes('coche')) return '🚗';
    if(d.includes('escapada') || d.includes('vuelo') || d.includes('viaje')) return '✈️';
    if(d.includes('regalo')) return '🛍️';
    if(d.includes('trade republic') || d.includes('inversion')) return '📊';
    if(d.includes('ahorro')) return '🐷';
    if(d.includes('comida') || d.includes('restaurante') || d.includes('super')) return '🍔';
    return '📌'; // Icono por defecto
}

// ==========================================
// DIBUJAR LAS LISTAS
// ==========================================
function renderFinList(containerId, list, tipo) {
    const container = document.getElementById(containerId);
    
    if (!list || list.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--t3); padding:20px 0; font-size:13px;">Vacío</div>';
        return;
    }

    // Ordenar de más reciente a más antiguo
    const sortedList = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sortedList.map(item => {
        const isExpense = tipo === 'gasto';
        const color = isExpense ? 'var(--red)' : 'var(--grn)';
        const sign = isExpense ? '-' : '+';
        const icon = getIconForDesc(item.desc);

        // AQUÍ ESTÁ EL ONCLICK CORRECTO: onclick="deleteFinEntry('${item.id}')"
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line);">
            
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:40px; background:var(--bg3); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px;">
                    ${icon}
                </div>
                <div>
                    <div style="font-weight:700; color:var(--t1); font-size:15px;">${item.desc}</div>
                    <div style="font-size:11px; color:var(--t3);">${item.date}</div>
                </div>
            </div>

            <div style="display:flex; align-items:center; gap:12px;">
                <div style="font-weight:700; color:${color}; font-size:15px;">
                    ${sign}${formatCurrency(item.amount)}
                </div>
                <div onclick="deleteFinEntry('${item.id}')" style="color:var(--red); font-size:16px; cursor:pointer; padding:5px 10px; font-weight:bold;">
                    ✕
                </div>
            </div>

        </div>`;
    }).join('');
}

// ==========================================
// FUNCIÓN PARA BORRAR (LA QUE FALLABA)
// ==========================================
function deleteFinEntry(id) {
    if (!confirm("¿Seguro que quieres borrar este registro?")) return;

    const listas = ['incomes', 'expenses', 'subs', 'savings', 'investments'];
    let borrado = false;

    listas.forEach(lista => {
        if (S[lista]) {
            const sizeOriginal = S[lista].length;
            S[lista] = S[lista].filter(item => item.id !== id);
            if (S[lista].length < sizeOriginal) borrado = true;
        }
    });

    if (borrado) {
        save();
        updateFinanzasPage();
        showToast("Registro eliminado 🗑️", "success");
    }
}

// ==========================================
// GUARDAR NUEVO REGISTRO
// ==========================================
function saveFinEntry() {
    const type = document.getElementById('fin-type').value;
    const amount = parseFloat(document.getElementById('fin-amount').value);
    const desc = document.getElementById('fin-desc').value.trim();
    const cat = document.getElementById('fin-cat').value;
    const date = document.getElementById('fin-date').value || today();

    if (!amount || !desc) return showToast('Rellena importe y descripción', 'error');

    const entry = { id: uid(), type, amount, desc, cat, date };

    if (cat === 'ahorro') {
        S.savings.push(entry);
    } else if (cat === 'inversión') {
        S.investments.push(entry);
    } else {
        if (type === 'ingreso') S.incomes.push(entry);
        else if (type === 'suscripcion') S.subs.push(entry);
        else S.expenses.push(entry);
    }

    save();
    closeModal('modal-fin');
    updateFinanzasPage();
    showToast('Registro guardado ✅', 'success');

    // Limpiar campos
    document.getElementById('fin-amount').value = '';
    document.getElementById('fin-desc').value = '';
}

// Arrancar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    if (typeof S !== 'undefined') updateFinanzasPage();
});
