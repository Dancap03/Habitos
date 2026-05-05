// --- COLORES POR TIPO ---
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

function openNewStockModal() {
    // Vaciamos los campos de texto antes de abrir
    document.getElementById('s-ticker').value = '';
    document.getElementById('s-name').value = '';
    document.getElementById('s-invested').value = '';
    document.getElementById('s-price').value = '';
    document.getElementById('s-current').value = '';
    document.getElementById('s-type').value = 'Acción'; // Reiniciamos el desplegable
    openModal('modal-stock');
}

function renderStocks() {
  const el = document.getElementById('stock-list');
  if (!el) return;
  if (!S.stocks) S.stocks = [];

  let html = '';
  let totalVal = 0, totalInv = 0;

  S.stocks.forEach(s => {
    let sInv = 0, sShares = 0;
    if (s.purchases) {
      s.purchases.forEach(p => {
        sInv += p.invested;
        sShares += p.shares;
      });
    }

    const curVal = sShares * s.price;
    const pnl = curVal - sInv;
    const pct = sInv > 0 ? (pnl / sInv) * 100 : 0;
    
    // Lógica estricta de color para individual
    let cStr = 'var(--t3)';
    let sign = '';
    if (pnl > 0.001) { cStr = 'var(--grn)'; sign = '▲ '; }
    else if (pnl < -0.001) { cStr = 'var(--red)'; sign = '▼ '; }

    // Color del badge según tu función
    const badgeColor = getTypeColor(s.type);
    const badgeBg = badgeColor + '1A'; // 1A es ~10% de opacidad en hexadecimal para el fondo

    totalVal += curVal;
    totalInv += sInv;

    html += `
    <div class="list-item" style="padding:16px 0; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:12px; cursor:pointer; flex:1;" onclick="openManageStock('${s.id}')">
        <div style="background:${badgeBg}; color:${badgeColor}; font-weight:700; font-size:10px; padding:10px; border-radius:10px; width:45px; text-align:center;">${s.ticker}</div>
        <div>
           <div style="font-weight:700; font-size:15px; color:var(--t1);">${s.name}</div>
           <div style="font-size:11px; color:var(--t2); margin-top:4px;">Precio act: €${s.price.toFixed(2)}</div>
        </div>
      </div>
      <div style="text-align:right; display:flex; align-items:center; gap:12px;">
         <div>
            <div style="font-size:15px; font-weight:700; color:var(--t1);">€${curVal.toFixed(2)}</div>
            <div style="font-size:11px; font-weight:700; margin-top:4px; color:${cStr};">${sign}€${Math.abs(pnl).toFixed(2)} (${pct.toFixed(2)}%)</div>
         </div>
         <button class="btn-danger" onclick="delStock('${s.id}')">✕</button>
      </div>
    </div>`;
  });

  el.innerHTML = html || '<div class="empty">Tu cartera está vacía</div>';

  const tPnl = totalVal - totalInv;
  const tPct = totalInv > 0 ? (tPnl / totalInv) * 100 : 0;
  
  document.getElementById('port-total').textContent = '€' + totalVal.toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('port-invested').textContent = '€' + totalInv.toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2});
  
  // Lógica de color para el VALOR TOTAL
  const elPnl = document.getElementById('port-pnl');
  let tColor = 'var(--t3)';
  let tSign = '';
  if (tPnl > 0.001) { tColor = 'var(--grn)'; tSign = '+'; }
  else if (tPnl < -0.001) { tColor = 'var(--red)'; tSign = '-'; }
  
  elPnl.textContent = `${tSign}€${Math.abs(tPnl).toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2})} (${tPct.toFixed(2)}%)`;
  elPnl.style.color = tColor;

  updatePortfolioCharts();
}

function addStock() {
  const ticker = document.getElementById('s-ticker').value.trim().toUpperCase();
  const name = document.getElementById('s-name').value.trim();
  const invested = parseFloat(document.getElementById('s-invested').value);
  const buyPrice = parseFloat(document.getElementById('s-price').value);
  const curPrice = parseFloat(document.getElementById('s-current').value);
  const type = document.getElementById('s-type').value;

  if (!ticker || !name || !invested || !buyPrice || !curPrice) return showToast('Rellena todos los campos', 'error');

  const shares = invested / buyPrice;
  S.stocks.push({
    id: uid(),
    ticker, name, type, price: curPrice,
    purchases: [{ id: uid(), date: today(), invested, price: buyPrice, shares }]
  });

  save(); closeModal('modal-stock'); renderStocks(); showToast('Posición creada');
}

function delStock(id) {
  customConfirm('Borrar Activo', '¿Eliminar toda la posición de la cartera?', () => {
    S.stocks = S.stocks.filter(s => s.id !== id);
    save(); renderStocks();
  });
}

function openManageStock(id) {
  const s = S.stocks.find(x => x.id === id);
  if (!s) return;

  let pHtml = s.purchases.map(p => {
    const val = p.shares * s.price;
    const pnl = val - p.invested;
    const pct = (pnl / p.invested) * 100;
    
    // Lógica de color de lotes individuales
    let pColor = 'var(--t3)';
    let pSign = '';
    if (pnl > 0.001) { pColor = 'var(--grn)'; pSign = '▲ '; }
    else if (pnl < -0.001) { pColor = 'var(--red)'; pSign = '▼ '; }

    return `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line);">
       <div>
          <div style="font-size:12px; font-weight:700;">Invertido: €${p.invested.toFixed(2)}</div>
          <div style="font-size:10px; color:var(--t3);">${p.date}</div>
       </div>
       <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:11px; font-weight:700; color:${pColor};">${pSign}€${Math.abs(pnl).toFixed(2)} (${pct.toFixed(2)}%)</div>
          <button class="btn-danger" onclick="delPurchase('${s.id}', '${p.id}')">✕</button>
       </div>
    </div>`;
  }).join('');

  document.getElementById('manage-stock-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title" style="margin-bottom:20px;">Gestionar ${s.ticker}</div>
    
    <label class="form-label">Actualizar Precio Actual (€)</label>
    <div style="display:flex; gap:10px; margin-bottom:16px;">
       <input type="number" id="update-price-${s.id}" class="form-input" style="margin-bottom:0;" value="${s.price.toFixed(2)}" step="0.01">
       <button class="btn" style="background:var(--acc); color:#fff; border-radius:10px; padding:0 20px; border:none; cursor:pointer;" onclick="updatePrice('${s.id}')">Actualizar</button>
    </div>

    <label class="form-label">Añadir Lote de Compra</label>
    <div style="display:flex; gap:10px; margin-bottom:24px;">
       <input type="number" id="add-inv-${s.id}" class="form-input" style="margin-bottom:0;" placeholder="Inversión (€)" step="0.01">
       <input type="number" id="add-px-${s.id}" class="form-input" style="margin-bottom:0;" placeholder="Precio compra (€)" step="0.01">
       <button class="btn" style="background:var(--grn); color:#fff; border-radius:10px; padding:0 20px; border:none; cursor:pointer;" onclick="addPurchase('${s.id}')">Añadir</button>
    </div>

    <label class="form-label">TUS COMPRAS (LOTES)</label>
    <div>${pHtml || '<div class="empty">Sin compras</div>'}</div>
  `;
  openModal('modal-manage-stock');
}

function updatePrice(id) {
  const s = S.stocks.find(x => x.id === id);
  const px = parseFloat(document.getElementById(`update-price-${id}`).value);
  if (!px || px <= 0) return showToast('Precio inválido', 'error');
  s.price = px;
  save(); renderStocks(); openManageStock(id); showToast('Precio actualizado');
}

function addPurchase(id) {
  const s = S.stocks.find(x => x.id === id);
  const inv = parseFloat(document.getElementById(`add-inv-${id}`).value);
  const px = parseFloat(document.getElementById(`add-px-${id}`).value);
  if (!inv || !px) return showToast('Rellena inversión y precio', 'error');
  s.purchases.push({ id: uid(), date: today(), invested: inv, price: px, shares: inv / px });
  save(); renderStocks(); openManageStock(id); showToast('Compra añadida');
}

function delPurchase(sid, pid) {
  const s = S.stocks.find(x => x.id === sid);
  s.purchases = s.purchases.filter(p => p.id !== pid);
  save(); renderStocks(); openManageStock(sid);
}

let typeChart = null, assetChart = null;
function updatePortfolioCharts() {
  const c1 = document.getElementById('chart-type');
  const c2 = document.getElementById('chart-asset');
  if (!c1 || !c2 || !S.stocks) return;

  let types = {}, assets = {};
  S.stocks.forEach(s => {
    let val = 0;
    if (s.purchases) s.purchases.forEach(p => val += p.shares * s.price);
    if (val > 0) {
      types[s.type] = (types[s.type] || 0) + val;
      assets[s.ticker] = (assets[s.ticker] || 0) + val;
    }
  });

  // PREPARACIÓN DE PORCENTAJES PARA "POR TIPO"
  const typeLabelsRaw = Object.keys(types);
  const typeData = Object.values(types);
  const typeBgColors = typeLabelsRaw.map(t => getTypeColor(t));
  const totalTypeVal = typeData.reduce((a, b) => a + b, 0);
  
  // Añadimos el % al texto del label
  const typeLabelsPct = typeLabelsRaw.map((t, i) => {
      const pct = totalTypeVal > 0 ? ((typeData[i] / totalTypeVal) * 100).toFixed(1) : 0;
      return `${t} ${pct}%`;
  });
  
  if (typeChart) typeChart.destroy();
  typeChart = new Chart(c1, {
    type: 'doughnut',
    data: { labels: typeLabelsPct, datasets: [{ data: typeData, backgroundColor: typeBgColors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right', labels: { color: '#a1a1a6', font: { size: 10, family: 'DM Sans' }, boxWidth: 10, padding: 10 } } } }
  });

  // PREPARACIÓN DE PORCENTAJES PARA "POR ACTIVO"
  const assetLabelsRaw = Object.keys(assets);
  const assetData = Object.values(assets);
  const assetCols = ['#8b5cf6', '#3b82f6', '#27ae60', '#f59e0b', '#e74c3c', '#e05a2b', '#1abc9c', '#95a5a6']; 
  const totalAssetVal = assetData.reduce((a, b) => a + b, 0);
  
  // Añadimos el % al texto del label
  const assetLabelsPct = assetLabelsRaw.map((t, i) => {
      const pct = totalAssetVal > 0 ? ((assetData[i] / totalAssetVal) * 100).toFixed(1) : 0;
      return `${t} ${pct}%`;
  });

  if (assetChart) assetChart.destroy();
  assetChart = new Chart(c2, {
    type: 'doughnut',
    data: { labels: assetLabelsPct, datasets: [{ data: assetData, backgroundColor: assetCols, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right', labels: { color: '#a1a1a6', font: { size: 10, family: 'DM Sans' }, boxWidth: 10, padding: 10 } } } }
  });
}
