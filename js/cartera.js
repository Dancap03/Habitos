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
    renderDonut();
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

    return `
    <div class="stock-item" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:12px;" onclick="openEditStockModal('${s.id}')">
        <div class="stock-ticker" style="background:var(--bg4)">${s.ticker}</div>
        <div>
          <div style="font-size:14px;font-weight:600">${s.name}</div>
          <div style="font-size:12px;color:var(--t2)">${shares.toFixed(4)} ud · ${fmt(s.price)}</div>
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

  renderDonut();
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

    // Formateo del dinero: Si es exacto pone 6€, si tiene decimales pone 6.30€
    let formattedInvested = p.invested % 1 === 0 ? p.invested + '€' : p.invested.toFixed(2) + '€';

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
    customConfirm('Borrar posición', '¿Seguro que quieres borrar esta acción y todas sus compras?', () => {
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

let donutInst = null;
function renderDonut() {
  const canvas = document.getElementById('donutChart');
  const legend = document.getElementById('port-legend');
  if (!canvas || !legend) return;

  if (!S.stocks || S.stocks.length === 0) {
    if(donutInst) donutInst.destroy();
    donutInst = null;
    legend.innerHTML = '';
    return;
  }

  const data = [];
  const labels = [];
  const colors = ['#e05a2b', '#27ae60', '#3b82f6', '#f59e0b', '#8b5cf6', '#e74c3c', '#1abc9c'];
  let totalVal = 0;

  S.stocks.forEach(s => {
    let shares = 0;
    if(s.purchases) s.purchases.forEach(p => shares += p.shares);
    const val = shares * s.price;
    if (val > 0) {
      data.push(val);
      labels.push(s.ticker);
      totalVal += val;
    }
  });

  if (totalVal === 0) {
    if(donutInst) donutInst.destroy();
    donutInst = null;
    legend.innerHTML = '';
    return;
  }

  legend.innerHTML = labels.map((l, i) => `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
      <div style="display:flex; align-items:center; gap:6px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${colors[i%colors.length]}"></div>
        <span>${l}</span>
      </div>
      <span style="font-weight:600">${((data[i]/totalVal)*100).toFixed(1)}%</span>
    </div>
  `).join('');

  if (donutInst) donutInst.destroy();
  donutInst = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '75%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}
