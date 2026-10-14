/* Tela: Painel (cartões, busca, filtro, editar e excluir) */

function cardsHtml(){
  const q = state.q.trim().toLowerCase();
  const list = state.notebooks.filter(n=>{
    if(state.filtro==='disponivel' && n.status!=='disponivel') return false;
    if(state.filtro==='retirado' && n.status!=='retirado') return false;
    if(!q) return true;
    return [n.nome,n.patrimonio,n.nfcTag,n.retiradoPor].some(v=>(v||'').toString().toLowerCase().includes(q));
  });
  if(!state.notebooks.length) return '<div class="empty">Nenhum notebook cadastrado ainda. Encoste uma tag ou vá em "Cadastrar notebook".</div>';
  if(!list.length) return '<div class="empty">Nenhum notebook encontrado com esse filtro.</div>';
  return list.map(n=>{
    const badge = n.status==='disponivel' ? '<span class="badge disp">Disponível</span>' : '<span class="badge retirado">Retirado</span>';
    const meta = n.status==='retirado'
      ? `<div>Com: <b>${escapeHtml(n.retiradoPor||'—')}</b></div><div>Desde: <b>${n.dataRetirada?fmtDate(n.dataRetirada):'—'}</b></div>`
      : (n.ultimaDevolucao ? `<div>Devolvido por: <b>${escapeHtml(n.ultimaDevolucao.pessoa)}</b></div><div>Em: <b>${fmtDate(n.ultimaDevolucao.data)}</b></div>` : `<div>Ainda não movimentado</div>`);
    return `
    <div class="card">
      <div class="top">
        <div>
          <h3>${escapeHtml(n.nome)}</h3>
          <div class="patr">PAT. ${escapeHtml(n.patrimonio || '—')}</div>
        </div>
        ${badge}
      </div>
      <div class="meta">${meta}</div>
      <div class="tagline">TAG ${escapeHtml(n.nfcTag || 'sem tag')}</div>
      ${adminOn() ? `<div class="btnrow"><button class="btn secondary small" data-edit="${escapeAttr(n.id)}">Editar</button><button class="btn secondary small" data-del="${escapeAttr(n.id)}">Excluir</button></div>` : ''}
    </div>`;
  }).join('');
}

function renderDashboard(){
  const disponiveis = state.notebooks.filter(n=>n.status==='disponivel').length;
  const retirados = state.notebooks.filter(n=>n.status==='retirado').length;
  return `
    <h2 class="title">Painel</h2>
    <p class="sub">Situação atual do parque de notebooks.</p>
    ${state.msg && state.msg.where==='dashboard' ? `<div class="msg ${state.msg.type}">${state.msg.text}</div>` : ''}
    <div class="stats">
      <div class="stat ok"><div class="n">${disponiveis}</div><div class="l">Disponíveis</div></div>
      <div class="stat out"><div class="n">${retirados}</div><div class="l">Retirados</div></div>
      <div class="stat"><div class="n">${state.notebooks.length}</div><div class="l">Total cadastrado</div></div>
    </div>
    <div class="toolbar">
      <input id="q" type="search" placeholder="Buscar notebook ou pessoa…" value="${escapeAttr(state.q)}">
      <select id="filtro">
        ${[['todos','Todos'],['disponivel','Disponíveis'],['retirado','Retirados']].map(o=>`<option value="${o[0]}" ${state.filtro===o[0]?'selected':''}>${o[1]}</option>`).join('')}
      </select>
    </div>
    <div class="grid" id="grid">${cardsHtml()}</div>
  `;
}

function bindCardButtons(){
  document.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.onclick = ()=>{ state.editId = btn.dataset.edit; state.view = 'editar'; state.msg = null; render(); };
  });
  document.querySelectorAll('[data-del]').forEach(btn=>{
    btn.onclick = async ()=>{
      const nb = state.notebooks.find(n=>n.id===btn.dataset.del);
      if(!nb || !confirm('Excluir o notebook "' + nb.nome + '" (tag ' + nb.nfcTag + ')?')) return;
      try{
        await apiFetch('/api/notebooks/' + encodeURIComponent(nb.id), { method:'DELETE' });
        state.notebooks = state.notebooks.filter(n=>n.id!==nb.id);
        state.msg = {where:state.view, type:'ok', text:'Notebook excluído. A tag ' + escapeHtml(nb.nfcTag) + ' pode ser cadastrada de novo.'};
      }catch(e){
        state.msg = {where:state.view, type:'err', text:'Falha ao excluir: ' + e.message};
      }
      render();
    };
  });
}

function atualizarGrid(){
  document.getElementById('grid').innerHTML = cardsHtml();
  bindCardButtons();
}

function attachDashboardHandlers(){
  bindCardButtons();
  const qEl = document.getElementById('q');
  if(qEl) qEl.oninput = e=>{ state.q = e.target.value; atualizarGrid(); };
  const fEl = document.getElementById('filtro');
  if(fEl) fEl.onchange = e=>{ state.filtro = e.target.value; atualizarGrid(); };
}
