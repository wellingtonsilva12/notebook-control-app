/* Funções utilitárias */

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function fmtDate(ts){
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }

// Liga um clique a um elemento da tela (usado pelos handlers de cada view)
function bind(sel, fn){ const el = document.querySelector(sel); if(el) el.onclick = fn; }
