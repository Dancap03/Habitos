function addStock() {
  const ticker = document.getElementById('st-ticker').value.trim().toUpperCase();
  const name   = document.getElementById('st-name').value.trim();
  const price  = parseFloat(document.getElementById('st-price').value);
  const invested = parseFloat(document.getElementById('st-invested').value);
  const buyPrice = parseFloat(document.getElementById('st-buy-price').value);
  
  if (!ticker || !price) return;
  
  const purchases = [];
  if (!isNaN(invested) && !isNaN(buyPrice) && buyPrice > 0 && invested > 0) {
    purchases.push({ id: uid(), date: today(), shares: invested / buyPrice, price: buyPrice, invested: invested });
  }
  
  S.stocks.push({ id: uid(), ticker, name: name||ticker, price, assetType: document.getElementById('st-type').value, purchases: purchases });
  
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
  renderStockPurchases(id); openModal('modal-stock-edit');
}

function saveStockPrice() {
  const id = document.getElementById('edit-st-id').value;
  const newPrice = parseFloat(document.getElementById('edit-st-price').value);
  const s = S.stocks.find(x => x.id === id);
  if (s && !isNaN(newPrice)) {
    s.price = newPrice; save(); renderStocks(); renderStockPurchases(id);
    showToast('Precio actualizado', 'success');
  }
}

function addStockPurchase() {
  const id = document.getElementById('edit-st-id').value;
  const invested = parseFloat(document.getElementById('edit-st-buy-invested').value);
  const buyPrice = parseFloat(document.getElementById('edit-st-buy-price').value);
  const s = S.stocks.find(x => x.id === id);
  if (s && !isNaN(invested) && !isNaN(buyPrice) && buyPrice > 0 && invested > 0) {
    if(!s.purchases) s.purchases = [];
    const shares = invested / buyPrice;
    s.purchases.push({ id: uid(), date: today(), shares, price: buyPrice, invested });
    save(); renderStocks(); renderStockPurchases(id);
    document.getElementById('edit-st-buy-invested').value = '';
    document.getElementById('edit-st-buy-price').value = '';
    showToast('Compra añadida', 'success');
  } else { showToast('Comprueba los datos', 'error'); }
}

function delStockPurchase(stockId, purchaseId) {
  const s = S.stocks.find(x => x.id === stockId);
  if(s && s.purchases) {
     s.purchases = s.purchases.filter(p => p.id !== purchaseId);
     save(); renderStocks(); renderStockPurchases(stockId);
  }
}

function renderStockPurchases(id) {
  const el = document.getElementById('edit-stock-purchases');
  const s = S.stocks.find(x => x.id === id);
  if(!s || !s.purchases || !s.purchases.length) { el.innerHTML = '<div class="empty">Aún no hay compras registradas</div>'; return; }
  el.innerHTML = s.purchases.map(p => {
     const cost = p.invested !== undefined ? p.invested : (p.shares * p.price);
     const val = p.shares * s.price;
     const chg = val - cost;
     const chgPct = cost > 0 ? (chg/cost)*100 : 0;
     const pos = chg >= 0;
     return `
      <div class="list-item" style="padding:10px 0;">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">Invertido: ${fmt(cost)} a ${fmt(p.price)}/ud</div>
          <div class="item-sub">${p.date} · ${p.shares.toFixed(4)} unidades</div>
        </div>
        <div style="text-align:right">
          <div class="${pos?'stock-chg-pos':'stock-chg-neg'}" style="font-size:13px;">${pos?'▲':'▼'} ${fmt(val)} (${Math.abs(chgPct).toFixed(2)}%)</div>
          <button class="btn-danger" style="margin-top:4px; padding: 2px 8px;" onclick="delStockPurchase('${s.id}', '${p.id}')">✕</button>
        </div>
      </div>`;
  }).join('');
}

function delStock(id) {
  if(confirm('¿Seguro que quieres borrar esta posición completa?')) {
    S.stocks = S.stocks.filter(x => x.id !== id); save(); renderStocks();
  }
}

function renderStocks() {
  let globalTotal = 0; let globalInvested = 0;
  const el = document.getElementById('stock-list');
  if (!S.stocks.length) { el.innerHTML = '<div class="empty">Sin posiciones</div>'; } else {
    const typeColors = { accion:'var(--blu)', etf:'var(--grn)', crypto:'var(--yel)', bono:'var(--pur)', otro:'var(--t3)' };
    el.innerHTML = S.stocks.map(s => {
      const totalShares = (s.purchases || []).reduce((a,p) => a + p.shares, 0);
      const invested = (s.purchases || []).reduce((a,p) => a + (p.invested !== undefined ? p.invested : (p.shares * p.price)), 0);
      const val = totalShares * s.price;
      globalTotal += val; globalInvested += invested;
      const chg = val - invested;
      const chgPct = invested > 0 ? chg/invested*100 : 0;
      const pos = chg >= 0;
      return `
        <div class="stock-item" style="padding: 16px 0;">
          <div class="row-gap" style="flex:1">
            <div class="stock-ticker" style="background:${typeColors[s.assetType]}22;color:${typeColors[s.assetType]}">${s.ticker}</div>
            <div><div style="font-size:15px;font-weight:700">${s.name}</div><div class="item-sub">Total inv: ${fmt(invested)} · Act: ${fmt(s.price)}</div></div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:700">${fmt(val)}</div>
            <div class="${pos?'stock-chg-pos':'stock-chg-neg'}">${pos?'▲':'▼'} ${Math.abs(chgPct).toFixed(2)}%</div>
            <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px">
              <button class="btn btn-sm" style="font-size:11px;padding:4px 10px" onclick="openEditStockModal('${s.id}')">✎ Gestionar</button>
              <button class="btn-danger" style="padding:4px 10px;" onclick="delStock('${s.id}')">✕</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }
  const globalPnl = globalTotal - globalInvested;
  const globalPnlPct = globalInvested > 0 ? (globalPnl/globalInvested)*100 : 0;
  document.getElementById('port-total').textContent = fmt(globalTotal);
  document.getElementById('port-inv').textContent = fmt(globalInvested);
  const pnlEl = document.getElementById('port-pnl');
  pnlEl.textContent = `${globalPnl>=0?'+':''}${fmt(globalPnl)} (${globalPnlPct>=0?'+':''}${globalPnlPct.toFixed(2)}%)`;
  pnlEl.style.color = globalPnl >= 0 ? 'var(--grn)' : 'var(--red)';
  renderDonut();
}

let donutInst = null;
function renderDonut() {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;
  const typeColors = { accion:'#3b82f6', etf:'#27ae60', crypto:'#f59e0b', bono:'#8b5cf6', otro:'#888' };
  const byType = {};
  S.stocks.forEach(s => { 
    const t = s.assetType; 
    const totalShares = (s.purchases || []).reduce((a,p) => a + p.shares, 0);
    byType[t] = (byType[t]||0) + (totalShares * s.price); 
  });
  const labels = Object.keys(byType);
  const data = Object.values(byType);
  const colors = labels.map(t => typeColors[t]||'#888');
  if (donutInst) { donutInst.destroy(); donutInst = null; }
  if (!labels.length || data.reduce((a,b)=>a+b,0) === 0) { document.getElementById('port-legend').innerHTML='<div style="color:var(--t3);font-size:12px">Sin datos</div>'; return; }
  donutInst = new Chart(ctx, { type:'doughnut', data:{labels,datasets:[{data,backgroundColor:colors,borderColor:'#101010',borderWidth:2}]}, options:{cutout:'68%',plugins:{legend:{display:false}},responsive:false} });
  const total = data.reduce((a,b)=>a+b,0);
  document.getElementById('port-legend').innerHTML = labels.map((l,i)=>`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
      <span style="width:8px;height:8px;border-radius:2px;background:${colors[i]};display:inline-block"></span><span style="color:var(--t2)">${l}</span><span style="margin-left:auto;font-weight:600">${(data[i]/total*100).toFixed(1)}%</span>
    </div>`).join('');
}
