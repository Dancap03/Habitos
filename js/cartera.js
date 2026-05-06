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
// GENERADOR DE LEYENDAS (FIX MÓVIL)
// ==========================================
function generateCustomLegend(containerId, labels, data, colors) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const total = data.reduce((a, b) => a + b, 0);
    
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.gap = '12px';
    container.style.justifyContent = 'center';
    container.style.width = '100%';
    container.style.marginTop = '20px';

    container.innerHTML = labels.map((label, i) => {
        const pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : 0;
        const color = colors[i];
        
        return `
        <div style="display:flex; align-items:center; gap:8px; min-width:85px;">
            <div style="width:12px; height:12px; border-radius:50%; background-color:${color}; flex-shrink:0;"></div>
            <div style="display:flex; flex-direction:column;">
                <span style="font-size:9px; color:var(--t3); text-transform:uppercase; font-weight:700; line-height:1;">${label}</span>
                <span style="font-size:16px; font-weight:800; color:${color}; line-height:1.2;">${pct}%</span>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// FUNCIÓN MATEMÁTICA SEGURA (EVITA EL NaN)
// ==========================================
function getStockValues(s) {
    // Convierte a número de forma segura, si falla devuelve 0
    const invested = parseFloat(s.invested) || 0;
    const buyPrice = parseFloat(s.buyPrice) || 0;
    const price = parseFloat(s.price || s.currentPrice) || 0;
    
    // Si es un registro viejo que usaba 'amount', lo usa. Si no, lo calcula.
    let amount = parseFloat(s.amount);
    if (isNaN(amount) || amount === 0) {
        amount = buyPrice > 0 ? invested / buyPrice : 0;
    }

    // Calculamos el valor actual y el beneficio
    const currentVal = amount > 0 ? (price * amount) : invested; // Si no hay precio, asume lo invertido
    const pnl = currentVal - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

    return { invested, currentVal, pnl, pnlPct, amount, price, buyPrice };
}

// Helper para formatear moneda
function formatCurrency(val) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
}

// ==========================================
// ACTUALIZACIÓN DE GRÁFICOS Y TOTALES
// ==========================================
let chartType = null;
let chartAsset = null;

function updatePortfolioPage() {
    if (!S.stocks) S.stocks = [];

    let totalVal = 0;
    let totalInv = 0;
    const typeTotals = {};
    const assetTotals = {};

    // Renderizar lista vacía si no hay datos
    if (S.stocks.length === 0) {
        document.getElementById('portfolio-list').innerHTML = `<div style="text-align:center;color:var(--t3);padding:20px;font-size:14px;">Tu cartera está vacía</div>`;
        document.getElementById('port-total-main').textContent = "€0,00";
        document.getElementById('port-inv-main').textContent = "€0,00";
        document.getElementById('port-pnl-main').textContent = "+€0,00 (0%)";
        if(chartType) chartType.destroy();
        if(chartAsset) chartAsset.destroy();
        return;
    }

    // Calcular Totales con la función matemática segura
    S.stocks.forEach(s => {
        const vals = getStockValues(s);

        totalVal += vals.currentVal;
        totalInv += vals.invested;

        typeTotals[s.type] = (typeTotals[s.type] || 0) + vals.currentVal;
        assetTotals[s.ticker] = (assetTotals[s.ticker] || 0) + vals.currentVal;
    });

    // Actualizar Textos Principales
    const pnl = totalVal - totalInv;
    const pnlPct = totalInv > 0 ? (pnl / totalInv) * 100 : 0;
    
    document.getElementById('port-total-main').textContent = formatCurrency(totalVal);
    document.getElementById('port-inv-main').textContent = formatCurrency(totalInv);
    const pnlEl = document.getElementById('port-pnl-main');
    pnlEl.textContent = `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)} (${pnlPct.toFixed(2)}%)`;
    pnlEl.style.color = pnl >= 0 ? 'var(--grn)' : 'var(--red)';

    // Gráfico 1: Por Tipo
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

    // Gráfico 2: Por Activo
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

    // Renderizar Lista de Posiciones
    renderStockList(S.stocks);
}

// ==========================================
// RENDERIZADO DE LA LISTA
// ==========================================
function renderStockList(stocks) {
    const list = document.getElementById('portfolio-list');
    
    // Ordenar por valor actual (de mayor a menor)
    stocks.sort((a, b) => {
        return getStockValues(b).currentVal - getStockValues(a).currentVal;
    });

    list.innerHTML = stocks.map(s => {
        const v = getStockValues(s); // Valores limpios sin errores
        const color = getTypeColor(s.type);

        return `
        <div class="stock-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line); position:relative;" onclick="openEditStockModal('${s.id}')">
            <!-- Izquierda: Ticker y Nombre -->
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:10px; height:30px; border-radius:4px; background-color:${color};"></div>
                <div>
                    <div style="font-weight:700; color:var(--t1); font-size:15px;">${s.ticker}</div>
                    <div style="font-size:11px; color:var(--t3); text-transform:uppercase;">${s.type}</div>
                </div>
            </div>
            
            <!-- Derecha: Valor y PnL -->
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
function saveStock() {
    const ticker = document.getElementById('stock-ticker').value.toUpperCase().trim();
    const name = document.getElementById('stock-name').value.trim();
    const invested = parseFloat(document.getElementById('stock-invested').value) || 0;
    const buyPrice = parseFloat(document.getElementById('stock-buy-price').value) || 0;
    const currentPrice = parseFloat(document.getElementById('stock-current-price').value) || 0;
    const type = document.getElementById('stock-type').value;

    if (!ticker || !name) return showToast('Rellena el Ticker y el Nombre', 'error');

    const newStock = {
        id: uid(), 
        ticker,
        name,
        invested,
        buyPrice,
        price: currentPrice, 
        type
    };

    if (!S.stocks) S.stocks = [];
    S.stocks.push(newStock);
    save(); 
    closeModal('modal-add-stock');
    updatePortfolioPage();
    showToast('Posición añadida ✅', 'success');

    document.getElementById('modal-add-stock').querySelectorAll('input').forEach(i => i.value = '');
}

// ==========================================
// LÓGICA DE EDITAR / BORRAR
// ==========================================
let currentEditingId = null;

function openEditStockModal(id) {
    currentEditingId = id;
    const stock = S.stocks.find(s => s.id === id);
    if (!stock) return;

    // Calculamos los valores seguros para rellenar el formulario
    const v = getStockValues(stock);

    document.getElementById('edit-stock-id').value = stock.id;
    document.getElementById('edit-stock-ticker').value = stock.ticker;
    document.getElementById('edit-stock-name').value = stock.name || '';
    document.getElementById('edit-stock-invested').value = v.invested > 0 ? v.invested : '';
    document.getElementById('edit-stock-buy-price').value = v.buyPrice > 0 ? v.buyPrice : '';
    document.getElementById('edit-stock-current-price').value = v.price > 0 ? v.price : '';
    
    // Si el tipo guardado existe en el selector, lo marca
    const typeSelect = document.getElementById('edit-stock-type');
    const options = Array.from(typeSelect.options).map(o => o.value.toLowerCase());
    if (options.includes((stock.type || '').toLowerCase())) {
        typeSelect.value = stock.type;
    }

    openModal('modal-edit-stock');
}

function updateStock() {
    if (!currentEditingId) return;

    const index = S.stocks.findIndex(s => s.id === currentEditingId);
    if (index === -1) return;

    const ticker = document.getElementById('edit-stock-ticker').value.toUpperCase().trim();
    const name = document.getElementById('edit-stock-name').value.trim();
    const invested = parseFloat(document.getElementById('edit-stock-invested').value) || 0;
    const buyPrice = parseFloat(document.getElementById('edit-stock-buy-price').value) || 0;
    const currentPrice = parseFloat(document.getElementById('edit-stock-current-price').value) || 0;
    const type = document.getElementById('edit-stock-type').value;

    if (!ticker || !name) return showToast('Rellena el Ticker y el Nombre', 'error');

    // Actualizamos el objeto pisando los datos viejos
    S.stocks[index] = {
        id: currentEditingId,
        ticker,
        name,
        invested,
        buyPrice,
        price: currentPrice,
        type
    };

    save(); 
    closeModal('modal-edit-stock');
    updatePortfolioPage();
    showToast('Cambios guardados ✅', 'success');
    currentEditingId = null;
}

function deleteStock() {
    if (!currentEditingId) return;
    
    if (!confirm('¿Estás seguro de que quieres borrar esta posición?')) return;

    S.stocks = S.stocks.filter(s => s.id !== currentEditingId);

    save(); 
    closeModal('modal-edit-stock');
    updatePortfolioPage();
    showToast('Posición eliminada 🗑️', 'success');
    currentEditingId = null;
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    if (typeof S !== 'undefined' && typeof save === 'function') {
        updatePortfolioPage();
    } else {
        setTimeout(() => {
            if (typeof updatePortfolioPage === 'function') updatePortfolioPage();
        }, 100);
    }
});
