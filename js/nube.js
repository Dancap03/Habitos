const API_URL = "https://script.google.com/macros/s/AKfycbwEy_iyGNyGQGbJVxJUDrxXofQowJpprQB_kvzQpbqeq69B6kB_N5WWZruobZMYdrUD/exec"; 
let pendingSyncAction = null;
let currentSyncBtn = null;

function requestPin(action, btnEvent) {
  let pin = localStorage.getItem('dancab_pin');
  if (pin) {
    executeSync(action, pin, btnEvent.target);
  } else {
    pendingSyncAction = action;
    currentSyncBtn = btnEvent.target;
    document.getElementById('cloud-pin-input').value = '';
    openModal('modal-pin');
  }
}

function submitPin() {
  const pin = document.getElementById('cloud-pin-input').value.trim();
  if (pin) {
    localStorage.setItem('dancab_pin', pin);
    closeModal('modal-pin');
    if (pendingSyncAction && currentSyncBtn) {
      executeSync(pendingSyncAction, pin, currentSyncBtn);
    }
  }
}

function syncAction(action, event) {
  if (!API_URL.startsWith("http")) return showToast("Falta configurar la URL de Google", "error");
  requestPin(action, event);
}

async function executeSync(action, pin, btn) {
  const originalText = btn.textContent;
  
  if (action === 'upload') {
    btn.textContent = "⏳ Subiendo...";
    try {
      const res = await fetch(API_URL + "?pin=" + pin, {
        method: 'POST',
        body: JSON.stringify(S)
      });
      const text = await res.text();
      if (text === "OK") showToast("Datos guardados en la nube ☁️", "success");
      else { 
        showToast("Error: PIN incorrecto", "error"); 
        localStorage.removeItem('dancab_pin'); 
      }
    } catch (e) { showToast("Error de conexión", "error"); }
  } 
  else if (action === 'download') {
    btn.textContent = "⏳ Bajando...";
    try {
      const res = await fetch(API_URL + "?pin=" + pin);
      const text = await res.text();
      if (text === "{}" || text === "Acceso denegado") {
         showToast(text === "Acceso denegado" ? "PIN incorrecto" : "Base de datos vacía", "error");
         if (text === "Acceso denegado") localStorage.removeItem('dancab_pin');
      } else {
         const data = JSON.parse(text);
         Object.assign(S, data);
         save(); 
         showToast("Datos descargados 📥", "success");
         setTimeout(() => location.reload(), 1500);
      }
    } catch (e) { showToast("Error de conexión", "error"); }
  }
  btn.textContent = originalText;
}
