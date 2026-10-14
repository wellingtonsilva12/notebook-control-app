/* Tela: Histórico (busca, filtro e exportar CSV) */

function historicoFiltrado(){
  const q = state.hq.trim().toLowerCase();
  return state.movimentos.slice().reverse().filter(m=>{
    if(state.htipo!=='todos' && m.tipo!==state.htipo) return false;
    if(!q) return true;
    return [m.notebookNome,m.pessoa,m.nfcTag].some(v=>(v||'').toString().toLowerCase().includes(q));
  });
}

function historicoRows(){
  const list = historicoFiltrado();
  if(!list.length) return '<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:24px;">Nenhum registro encontrado.</td></tr>';
  return list.map(m=>`
    <tr>
      <td class="mono">${fmtDate(m.timestamp)}</td>
      <td>${escapeHtml(m.notebookNome)}</td>
      <td><span class="tipo ${m.tipo}">${m.tipo==='saida'?'Saída':'Entrada'}</span></td>
      <td>${escapeHtml(m.pessoa)}</td>
      <td class="mono">${escapeHtml(m.nfcTag||'—')}</td>
    </tr>`).join('');
}

function renderHistorico(){
  return `
    <h2 class="title">Histórico</h2>
    <p class="sub">Todas as saídas e devoluções registradas.</p>
    ${state.movimentos.length ? `
    <div class="toolbar">
      <input id="hq" type="search" placeholder="Buscar notebook ou pessoa…" value="${escapeAttr(state.hq)}">
      <select id="htipo">
        ${[['todos','Todos'],['saida','Saídas'],['entrada','Entradas']].map(o=>`<option value="${o[0]}" ${state.htipo===o[0]?'selected':''}>${o[1]}</option>`).join('')}
      </select>
      <button class="btn secondary small" data-action="exportar-csv">Exportar CSV</button>
    </div>
    <table>
      <thead><tr><th>Data/hora</th><th>Notebook</th><th>Tipo</th><th>Responsável</th><th>Tag</th></tr></thead>
      <tbody id="hbody">${historicoRows()}</tbody>
    </table>` : '<div class="empty">Nenhuma movimentação registrada ainda.</div>'}
  `;
}

function exportarCsv(todos){
  const list = todos===true ? state.movimentos.slice().reverse() : historicoFiltrado();
  const esc = v => '"' + (v==null?'':String(v)).replace(/"/g,'""') + '"';
  const linhas = [['Data/hora','Notebook','Tipo','Responsável','Tag'].map(esc).join(';')];
  list.forEach(m=>linhas.push([fmtDate(m.timestamp), m.notebookNome, m.tipo==='saida'?'Saída':'Entrada', m.pessoa, m.nfcTag].map(esc).join(';')));
  const blob = new Blob(['\ufeff' + linhas.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'historico-notebooks-' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

function attachHistoricoHandlers(){
  const hqEl = document.getElementById('hq');
  if(hqEl) hqEl.oninput = e=>{ state.hq = e.target.value; document.getElementById('hbody').innerHTML = historicoRows(); };
  const htEl = document.getElementById('htipo');
  if(htEl) htEl.onchange = e=>{ state.htipo = e.target.value; document.getElementById('hbody').innerHTML = historicoRows(); };
  bind('[data-action="exportar-csv"]', exportarCsv);
}
