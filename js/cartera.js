// ==========================================
// CONFIGURACIÓN DE COLORES POR TIPO
// ==========================================
function getTypeColor(type) {
    const colors = {
        'acción': '#3b82f6', 
        'etf': '#8b5cf6', 
        'crypto': '#f59e0b', 
        'fondos': '#1abc9c', 
        'bonos': '#27ae60', 
        'materias primas': '#e74c3c', 
        'otro': '#95a5a6'
    };
    return colors[(type || 'otro').toLowerCase()] || colors['otro'];
}

// ==========================================
// GENERADOR DE LEYENDAS (FIX CUADRÍCULA FLUIDA DEFINITIVA)
// ==========================================
function generateCustomLegend(containerId, labels, data, colors) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const total = data.reduce((a, b) => a + b, 0);
    
    // Contenedor principal
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.flexWrap = 'wrap';
    container.style.justifyContent = 'center';
    container.style.gap = '16px 12px'; // 16px de espacio vertical, 12px horizontal
    container.style.width = '100%';
    container.style.marginTop = '24px';

    container.innerHTML = labels.map((label, i) => {
        const pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : 0;
        const color = colors[i];
        
        // LA CLAVE: width: 90px; Esto obliga a que se pongan uno al lado del otro
        return `
        <div style="display:flex; align-items:center; gap:8px; width: 90px;">
            <div style="width:10px; height:10px; border-radius:50%; background-color:${color}; flex-shrink:0;"></div>
            <div style="display:flex; flex-direction:column; align-items:flex-start; width:calc(100% - 18px);">
                <span style="font-size:9px; color:var(--t3); text-transform:uppercase; font-weight:700; line-height:1; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${label}</span>
                <span style="font-size:14px; font-weight:800; color:${color}; line-height:1;">${pct}%</span>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// FUNCIÓN MATEMÁTICA SEGURA (ANTI-ERRORES)
// ==========================================
function safeFloat(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(',', '.')) || 0;
}

function getStockValues(s) {
    const invested = safeFloat(s.invested);
    const buyPrice = safeFloat(s.buyPrice);
    const price = safeFloat(s.price || s.currentPrice);
    
    let amount = safeFloat(s.amount);
    
    if (amount === 0) {
        if (buyPrice > 0) {
            amount = invested / buyPrice;
        } else {
            amount = 1; 
        }
    }

    const currentVal = amount > 0 ? (price * amount) : invested;
    const pnl = currentVal - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

    return { invested, currentVal, pnl, pnlPct, amount, price, buyPrice };
}

function formatCurrency(val) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

// ==========================================
// ACTUALIZACIÓN DE GRÁFICOS Y TOTALES
// ==========================================
let chartType = null;
let chartAsset = null;

function updatePortfolioPage() {
    if (!S.stocks) S.stocks = [];
    S.stocks = S.stocks.filter(s => s && typeof s === 'object' && s.ticker);

    let totalVal = 0;
    let totalInv = 0;
    const typeTotals = {};
    const assetTotals = {};

    if (S.stocks.length === 0) {
        document.getElementById('stock-list').innerHTML = `<div style="text-align:center;color:var(--t3);padding:20px;font-size:14px;">Tu cartera está vacía</div>`;
        document.getElementById('port-total').textContent = "0,00 €";
        document.getElementById('port-invested').textContent = "0,00 €";
        document.getElementById('port-pnl').textContent = "+0,00 € (0%)";
        if(chartType) chartType.destroy();
        if(chartAsset) chartAsset.destroy();
        return;
    }

    S.stocks.forEach(s => {
        const vals = getStockValues(s);
        totalVal += vals.currentVal;
        totalInv += vals.invested;

        typeTotals[s.type || 'Otro'] = (typeTotals[s.type || 'Otro'] || 0) + vals.currentVal;
        assetTotals[s.ticker] = (assetTotals[s.ticker] || 0) + vals.currentVal;
    });

    const pnl = totalVal - totalInv;
    const pnlPct = totalInv > 0 ? (pnl / totalInv) * 100 : 0;
    
    document.getElementById('port-total').textContent = formatCurrency(totalVal);
    document.getElementById('port-invested').textContent = formatCurrency(totalInv);
    const pnlEl = document.getElementById('port-pnl');
    pnlEl.textContent = `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)} (${pnlPct.toFixed(2)}%)`;
    pnlEl.style.color = pnl >= 0 ? 'var(--grn)' : 'var(--red)';

    const typeLabels = Object.keys(typeTotals);
    const typeData = Object.values(typeTotals);
    const typeColors = typeLabels.map(label => getTypeColor(label));

    if (chartType) chartType.destroy();
    const ctxType = document.getElementById('chart-type').getContext('2d');
    chartType = new Chart(ctxType, {
        type: 'doughnut',
        data: { datasets: [{ data: typeData, backgroundColor: typeColors, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
    });
    generateCustomLegend('legend-type', typeLabels, typeData, typeColors);

    const assetLabels = Object.keys(assetTotals);
    const assetData = Object.values(assetTotals);
    const assetColors = assetLabels.map((_, i) => `hsl(${(i * 137) % 360}, 65%, 60%)`);

    if (chartAsset) chartAsset.destroy();
    const ctxAsset = document.getElementById('chart-asset').getContext('2d');
    chartAsset = new Chart(ctxAsset, {
        type: 'doughnut',
        data: { datasets: [{ data: assetData, backgroundColor: assetColors, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
    });
    generateCustomLegend('legend-asset', assetLabels, assetData, assetColors);

    renderStockList(S.stocks);
}

// ==========================================
// RENDERIZADO DE LA LISTA
// ==========================================
function renderStockList(stocks) {
    const list = document.getElementById('stock-list');
    
    stocks.sort((a, b) => getStockValues(b).currentVal - getStockValues(a).currentVal);

    list.innerHTML = stocks.map(s => {
        const v = getStockValues(s);
        const color = getTypeColor(s.type);

        return `
        <div class="stock-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line); position:relative;" onclick="openEditStockModal('${s.id}')">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:10px; height:30px; border-radius:4px; background-color:${color};"></div>
                <div>
                    <div style="font-weight:700; color:var(--t1); font-size:15px;">${s.ticker}</div>
                    <div style="font-size:11px; color:var(--t3); text-transform:uppercase;">${s.type || 'Otro'}</div>
                </div>
            </div>
            
            <div style="text-align:right; margin-right: 15px;">
                <div style="font-weight:700; color:var(--t1); font-size:15px;">${formatCurrency(v.currentVal)}</div>
                <div style="font-size:12px; font-weight:600; color:${v.pnl >= 0 ? 'var(--grn)' : 'var(--red)'};">
                    ${v.pnl >= 0 ? '+' : ''}${formatCurrency(v.pnl)} (${v.pnlPct.toFixed(2)}%)
                </div>
            </div>
            <div style="color:var(--bg4); font-size:12px; position:absolute; right:0;">▶</div>
        </div>`;
    }).join('');
}

// ==========================================
// LÓGICA DE AÑADIR NUEVA POSICIÓN
// ==========================================
function openNewStockModal() {
    currentEditingId = null;
    document.getElementById('modal-stock').querySelector('.modal-title').textContent = 'Nueva posición';
    document.getElementById('s-ticker').value = '';
    document.getElementById('s-name').value = '';
    document.getElementById('s-invested').value = '';
    document.getElementById('s-price').value = '';
    document.getElementById('s-current').value = '';
    document.getElementById('s-type').value = 'Acción';
    
    // Configuramos el botón para añadir
    const btn = document.querySelector('#modal-stock .btn-primary');
    btn.textContent = 'Crear Posición';
    btn.onclick = addStock;

    openModal('modal-stock');
}

function addStock() {
    const ticker = document.getElementById('s-ticker').value.toUpperCase().trim();
    const name = document.getElementById('s-name').value.trim();
    const invested = safeFloat(document.getElementById('s-invested').value);
    const buyPrice = safeFloat(document.getElementById('s-price').value);
    const currentPrice = safeFloat(document.getElementById('s-current').value);
    const type = document.getElementById('s-type').value;

    if (!ticker) return showToast('El Ticker es obligatorio', 'error');

    const newStock = { id: uid(), ticker, name, invested, buyPrice, price: currentPrice, type };

    if (!S.stocks) S.stocks = [];
    S.stocks.push(newStock);
    save(); 
    closeModal('modal-stock');
    updatePortfolioPage();
    if(typeof renderHome === 'function') renderHome();
    showToast('Posición añadida ✅', 'success');
}

// ==========================================
// LÓGICA DE EDITAR / BORRAR
// ==========================================
let currentEditingId = null;

function openEditStockModal(id) {
    currentEditingId = id;
    const stock = S.stocks.find(s => s.id === id);
    if (!stock) return;

    const v = getStockValues(stock);

    document.getElementById('modal-stock').querySelector('.modal-title').textContent = 'Editar posición';
    document.getElementById('s-ticker').value = stock.ticker;
    document.getElementById('s-name').value = stock.name || '';
    document.getElementById('s-invested').value = v.invested > 0 ? v.invested : '';
    document.getElementById('s-price').value = v.buyPrice > 0 ? v.buyPrice : '';
    document.getElementById('s-current').value = v.price > 0 ? v.price : '';
    
    const typeSelect = document.getElementById('s-type');
    const options = Array.from(typeSelect.options).map(o => o.value.toLowerCase());
    if (options.includes((stock.type || '').toLowerCase())) typeSelect.value = stock.type;

    // Cambiamos la función del botón al de actualizar y añadimos botón borrar
    const btnContainer = document.querySelector('#modal-stock .btn-primary').parentElement;
    
    btnContainer.innerHTML = `
        <label class="form-label">Tipo</label>
        <select id="s-type" class="form-input">
            <option value="Acción">Acción</option>
            <option value="ETF">ETF</option>
            <option value="Crypto">Crypto</option>
            <option value="Fondos">Fondos</option>
            <option value="Bonos">Bonos</option>
            <option value="Materias primas">Materias primas</option>
            <option value="Otro">Otro</option>
        </select>
        <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn" style="flex:1; background:var(--red); color:#fff;" onclick="deleteStock()">Borrar</button>
            <button class="btn btn-primary" style="flex:1;" onclick="updateStock()">Guardar</button>
        </div>
    `;
    
    // Volvemos a setear el valor del selector porque al reescribir el HTML se reinicia
    document.getElementById('s-type').value = stock.type || 'Otro';

    openModal('modal-stock');
}

function updateStock() {
    if (!currentEditingId) return;
    const index = S.stocks.findIndex(s => s.id === currentEditingId);
    if (index === -1) return;

    const ticker = document.getElementById('s-ticker').value.toUpperCase().trim();
    const name = document.getElementById('s-name').value.trim();
    const invested = safeFloat(document.getElementById('s-invested').value);
    const buyPrice = safeFloat(document.getElementById('s-price').value);
    const currentPrice = safeFloat(document.getElementById('s-current').value);
    const type = document.getElementById('s-type').value;

    if (!ticker) return showToast('El Ticker es obligatorio', 'error');

    S.stocks[index] = { id: currentEditingId, ticker, name, invested, buyPrice, price: currentPrice, type };

    save(); 
    closeModal('modal-stock');
    updatePortfolioPage();
    if(typeof renderHome === 'function') renderHome();
    showToast('Cambios guardados ✅', 'success');
    currentEditingId = null;
}

function deleteStock() {
    if (!currentEditingId) return;
    
    // Usamos el confirm personalizado de main.js o el nativo por si acaso
    if (typeof customConfirm === 'function') {
        customConfirm('Borrar posición', '¿Seguro que quieres borrar este activo?', () => {
            S.stocks = S.stocks.filter(s => s.id !== currentEditingId);
            save(); 
            closeModal('modal-stock');
            updatePortfolioPage();
            if(typeof renderHome === 'function') renderHome();
            showToast('Posición eliminada 🗑️', 'success');
            currentEditingId = null;
        });
    } else {
        if (!confirm('¿Seguro que quieres borrar esta posición?')) return;
        S.stocks = S.stocks.filter(s => s.id !== currentEditingId);
        save(); 
        closeModal('modal-stock');
        updatePortfolioPage();
        if(typeof renderHome === 'function') renderHome();
        showToast('Posición eliminada 🗑️', 'success');
        currentEditingId = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof S !== 'undefined' && typeof save === 'function') {
        updatePortfolioPage();
    } else {
        setTimeout(() => { if (typeof updatePortfolioPage === 'function') updatePortfolioPage(); }, 100);
    }
});
