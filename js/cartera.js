// Función inteligente para asignar el color (ignora si está en mayúscula o minúscula)
function getTypeColor(type) {
  const colors = {
    'acción': '#3b82f6', // Azul
    'etf': '#8b5cf6', // Morado
    'crypto': '#f59e0b', // Naranja
    'fondos': '#1abc9c', // Turquesa
    'bonos': '#27ae60', // Verde
    'materias primas': '#e74c3c', // Rojo
    'otro': '#95a5a6' // Gris
  };
  if (!type) return colors['otro'];
  return colors[type.toLowerCase()] || colors['otro'];
}

function renderStocks() {
  const list = document.getElementById('stock-list');
  const totalEl = document.getElementById('port-total');
  const invEl = document.getElementById('port-inv');
  const pnlEl = document.getElementById('port-pnl');

  if (!list) return;

  if (!S.stocks || S.stocks.length === 0) {
    list.innerHTML = '<div class="empty">Sin posiciones</div>';
    if(totalEl) totalEl.textContent = fmt(0);
    if(invEl) invEl.textContent = fmt(0);
    if(pnlEl) { pnlEl.textContent = '+€0.00 (0.00%)'; pnlEl.className = 'stock-chg-pos'; }
    renderDonuts();
    return;
  }

  let totalValue = 0;
  let totalInvested = 0;

  list.innerHTML = S.stocks.map(s => {
    let inv = 0;
    let shares = 0;
    if(s.purchases) {
       s.purchases.forEach(p => { inv += p.invested; shares += p.shares; });
    }
    const val = shares * s.price;
    totalValue += val;
    totalInvested += inv;

    const pnl = val - inv;
    const pnlPct = inv > 0 ? (pnl / inv) * 100 : 0;
    const isPos = pnl >= 0;
    const colorClass = isPos ? 'stock-chg-pos' : 'stock-chg-neg';
    const sign = isPos ? '▲' : '▼';
    
    // Obtenemos el color según la categoría para pintar el Ticker
    const tickerColor = getTypeColor(s.assetType);

    return `
    <div class="stock-item" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:12px;" onclick="openEditStockModal('${s.id}')">
        <!-- AQUÍ SE APLICA EL COLOR AL TEXTO DEL TICKER -->
        <div class="stock-ticker" style="background:var(--bg4); border:1px solid var(--line); color:${tickerColor}; font-weight:700;">${s.ticker}</div>
        <div>
          <div style="font-size:14px;font-weight:600">${s.name}</div>
          <div style="font-size:12px;color:var(--t2)">Precio: ${fmt(s.price)}</div>
        </div>
      </div>
      <div style="text-align:right; display:flex; align-items:center; gap:12px;">
        <div onclick="openEditStockModal('${s.id}')">
          <div style="font-size:15px;font-weight:700">${fmt(val)}</div>
          <div class="${colorClass}">${sign} ${fmt(Math.abs(pnl))} (${pnlPct.toFixed(2)}%)</div>
        </div>
        <button class="btn-danger" style="padding: 6px 10px; margin-left: 4px;" onclick="event.stopPropagation(); delStock('${s.id}')">✕</button>
      </div>
    </div>`;
  }).join('');

  if(totalEl) totalEl.textContent = fmt(totalValue);
  if(invEl) invEl.textContent = fmt(totalInvested);
  if(pnlEl) {
    const totalPnl = totalValue - totalInvested;
    const totalPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const isPosTot = totalPnl >= 0;
    pnlEl.textContent = `${isPosTot ? '+' : '-'}${fmt(Math.abs(totalPnl))} (${totalPct.toFixed(2)}%)`;
    pnlEl.className = isPosTot ? 'stock-chg-pos' : 'stock-chg-neg';
  }

  renderDonuts();
}

function addStock() {
  const ticker = document.getElementById('st-ticker').value.trim().toUpperCase();
  const name = document.getElementById('st-name').value.trim();
  const price = parseFloat(document.getElementById('st-price').value);
  const invested = parseFloat(document.getElementById('st-invested').value);
  const buyPrice = parseFloat(document.getElementById('st-buy-price').value);
  const type = document.getElementById('st-type').value;

  if (!ticker || isNaN(price)) return showToast('Ticker y precio actual son obligatorios', 'error');

  const purchases = [];
  if (!isNaN(invested) && !isNaN(buyPrice) && buyPrice > 0 && invested > 0) {
    purchases.push({ id: uid(), date: today(), shares: invested / buyPrice, price: buyPrice, invested: invested });
  }

  S.stocks.push({ id: uid(), ticker, name: name||ticker, price, assetType: type, purchases });
  save(); closeAllModals();
  ['st-ticker','st-name','st-price','st-invested','st-buy-price'].forEach(id => document.getElementById(id).value = '');
  renderStocks(); showToast('Posición creada', 'success');
}

function openEditStockModal(id) {
  const s = S.stocks.find(x => x.id === id);
  if (!s) return;
  document.getElementById('edit-st-id').value = id;
  document.getElementById('edit-stock-title').textContent = `Gestionar ${s.ticker}`;
  document.getElementById('edit-st-price').value = s.price;
  document.getElementById('edit-st-buy-invested').value = '';
  document.getElementById('edit-st-buy-price').value = '';
  renderEditPurchases(s);
  openModal('modal-stock-edit');
}

function renderEditPurchases(s) {
  const el = document.getElementById('edit-stock-purchases');
  if(!el) return;
  if(!s.purchases || s.purchases.length === 0) {
    el.innerHTML = '<div class="empty">Sin compras</div>';
    return;
  }
  
  el.innerHTML = s.purchases.map(p => {
    const currentVal = p.shares * s.price;
    const pnl = currentVal - p.invested;
    const pnlPct = p.invested > 0 ? (pnl / p.invested) * 100 : 0;
    const isPos = pnl >= 0;
    const colorClass = isPos ? 'stock-chg-pos' : 'stock-chg-neg';
    const sign = isPos ? '▲' : '▼';

    const formattedInvested = p.invested % 1 === 0 ? p.invested + '€' : p.invested.toFixed(2) + '€';

    return `
    <div class="fin-row" style="padding: 12px 0; border-bottom: 1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:13px; font-weight:600; color:var(--t1);">Invertido: ${formattedInvested}</div>
        <div style="font-size:12px; color:var(--t2); margin-top:2px;">${p.date}</div>
      </div>
      <div style="display:flex; flex-direction: column; align-items:flex-end; gap:6px;">
        <div class="${colorClass}" style="font-size:12px; font-weight:600;">${sign} ${fmt(Math.abs(pnl))} (${pnlPct.toFixed(2)}%)</div>
        <button class="btn-danger" style="padding: 4px 10px; border-radius:6px;" onclick="delStockPurchase('${s.id}', '${p.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function saveStockPrice() {
  const id = document.getElementById('edit-st-id').value;
  const price = parseFloat(document.getElementById('edit-st-price').value);
  if (isNaN(price) || price < 0) return showToast('Precio inválido', 'error');

  const s = S.stocks.find(x => x.id === id);
  if (s) {
    s.price = price;
    save();
    renderEditPurchases(s);
    renderStocks();
    showToast('Precio actualizado', 'success');
  }
}

function addStockPurchase() {
  const id = document.getElementById('edit-st-id').value;
  const invested = parseFloat(document.getElementById('edit-st-buy-invested').value);
  const buyPrice = parseFloat(document.getElementById('edit-st-buy-price').value);

  if (isNaN(invested) || isNaN(buyPrice) || invested <= 0 || buyPrice <= 0) {
    return showToast('Datos inválidos', 'error');
  }

  const s = S.stocks.find(x => x.id === id);
  if (s) {
    if (!s.purchases) s.purchases = [];
    s.purchases.push({ id: uid(), date: today(), shares: invested / buyPrice, price: buyPrice, invested: invested });
    save();
    document.getElementById('edit-st-buy-invested').value = '';
    document.getElementById('edit-st-buy-price').value = '';
    renderEditPurchases(s);
    renderStocks();
    showToast('Compra añadida', 'success');
  }
}

function delStockPurchase(stockId, purchaseId) {
  if (typeof customConfirm === 'function') {
    customConfirm('Borrar lote', '¿Seguro que quieres borrar esta compra?', () => {
      const s = S.stocks.find(x => x.id === stockId);
      if (s) {
        s.purchases = s.purchases.filter(p => p.id !== purchaseId);
        save(); renderEditPurchases(s); renderStocks();
      }
    });
  } else {
    if (confirm('¿Borrar compra?')) {
      const s = S.stocks.find(x => x.id === stockId);
      if (s) {
        s.purchases = s.purchases.filter(p => p.id !== purchaseId);
        save(); renderEditPurchases(s); renderStocks();
      }
    }
  }
}

function delStock(id) {
  if (typeof customConfirm === 'function') {
    customConfirm('Borrar posición', '¿Seguro que quieres borrar esta posición y todas sus compras?', () => {
      S.stocks = S.stocks.filter(x => x.id !== id);
      save(); closeAllModals(); renderStocks();
    });
  } else {
    if (confirm('¿Borrar acción?')) {
      S.stocks = S.stocks.filter(x => x.id !== id);
      save(); closeAllModals(); renderStocks();
    }
  }
}

let donutTypeInst = null;
let donutAssetInst = null;

function renderDonuts() {
  const canvasType = document.getElementById('donutChartType');
  const legendType = document.getElementById('port-legend-type');
  const canvasAsset = document.getElementById('donutChartAsset');
  const legendAsset = document.getElementById('port-legend-asset');
  
  if (!canvasType || !legendType || !canvasAsset || !legendAsset) return;

  if (!S.stocks || S.stocks.length === 0) {
    if(donutTypeInst) donutTypeInst.destroy();
    if(donutAssetInst) donutAssetInst.destroy();
    donutTypeInst = null;
    donutAssetInst = null;
    legendType.innerHTML = '';
    legendAsset.innerHTML = '';
    return;
  }

  const typeMap = {};
  const assetMap = {};
  let totalVal = 0;

  S.stocks.forEach(s => {
    let shares = 0;
    if(s.purchases) s.purchases.forEach(p => shares += p.shares);
    const val = shares * s.price;
    if (val > 0) {
      totalVal += val;
      
      // Normalizamos el nombre para agrupar viejos "crypto" con nuevos "Crypto"
      let rawType = (s.assetType || 'Otro').trim();
      let typeKey = rawType.toLowerCase();
      let displayType = typeKey === 'etf' ? 'ETF' : (rawType.charAt(0).toUpperCase() + rawType.slice(1));
      
      typeMap[displayType] = (typeMap[displayType] || 0) + val;
      assetMap[s.ticker] = (assetMap[s.ticker] || 0) + val;
    }
  });

  if (totalVal === 0) {
    if(donutTypeInst) donutTypeInst.destroy();
    if(donutAssetInst) donutAssetInst.destroy();
    donutTypeInst = null;
    donutAssetInst = null;
    legendType.innerHTML = '';
    legendAsset.innerHTML = '';
    return;
  }

  // --- 1. DOUGHNUT POR TIPO DE ACTIVO ---
  const types = Object.keys(typeMap).sort((a,b) => typeMap[b] - typeMap[a]);
  const dataTypes = types.map(t => typeMap[t]);
  // Asignamos el color correcto usando la función inteligente
  const bgTypes = types.map(t => getTypeColor(t));

  legendType.innerHTML = types.map((l, i) => `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
      <div style="display:flex; align-items:center; gap:6px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${bgTypes[i]}"></div>
        <span style="color:var(--t1); font-weight:500;">${l}</span>
      </div>
      <span style="color:var(--t2); font-weight:600">${((dataTypes[i]/totalVal)*100).toFixed(1)}%</span>
    </div>
  `).join('');

  if (donutTypeInst) donutTypeInst.destroy();
  donutTypeInst = new Chart(canvasType, {
    type: 'doughnut',
    data: { labels: types, datasets: [{ data: dataTypes, backgroundColor: bgTypes, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
  });

  // --- 2. DOUGHNUT POR ACTIVO INDIVIDUAL ---
  const defaultColors = ['#e05a2b', '#27ae60', '#3b82f6', '#f59e0b', '#8b5cf6', '#e74c3c', '#1abc9c'];
  const assets = Object.keys(assetMap).sort((a,b) => assetMap[b] - assetMap[a]);
  const dataAssets = assets.map(a => assetMap[a]);
  const bgAssets = assets.map((a, i) => defaultColors[i % defaultColors.length]);

  legendAsset.innerHTML = assets.map((l, i) => `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
      <div style="display:flex; align-items:center; gap:6px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${bgAssets[i]}"></div>
        <span style="color:var(--t1); font-weight:500;">${l}</span>
      </div>
      <span style="color:var(--t2); font-weight:600">${((dataAssets[i]/totalVal)*100).toFixed(1)}%</span>
    </div>
  `).join('');

  if (donutAssetInst) donutAssetInst.destroy();
  donutAssetInst = new Chart(canvasAsset, {
    type: 'doughnut',
    data: { labels: assets, datasets: [{ data: dataAssets, backgroundColor: bgAssets, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
  });
}
