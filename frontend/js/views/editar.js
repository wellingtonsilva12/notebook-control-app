/* Tela: Editar notebook */

function renderEditar(){
  const nb = state.notebooks.find(n=>n.id===state.editId);
  if(!nb) return '<div class="empty">Notebook não encontrado.</div>';
  return `
    <h2 class="title">Editar notebook</h2>
    <p class="sub">Tag <span style="font-family:var(--mono)">${escapeHtml(nb.nfcTag)}</span> (a tag não pode ser alterada).</p>
    <div class="panel">
      ${state.msg && state.msg.where==='editar' ? `<div class="msg ${state.msg.type}">${state.msg.text}</div>` : ''}
      <div class="row">
        <div class="field"><label>Nome / modelo do notebook</label><input id="e-nome" type="text" value="${escapeAttr(nb.nome)}"></div>
        <div class="field"><label>Nº de patrimônio</label><input id="e-patr" class="mono-input" type="text" value="${escapeAttr(nb.patrimonio)}"></div>
      </div>
      <div class="btnrow">
        <button class="btn" data-action="salvar-edicao">Salvar</button>
        <button class="btn secondary" data-action="cancelar-edicao">Cancelar</button>
      </div>
    </div>
  `;
}

function attachEditarHandlers(){
  bind('[data-action="cancelar-edicao"]', ()=>{ state.view='admin'; state.editId=null; state.msg=null; render(); });
  bind('[data-action="salvar-edicao"]', async ()=>{
    const nb = state.notebooks.find(n=>n.id===state.editId);
    const nome = (document.getElementById('e-nome').value || '').trim();
    const patr = (document.getElementById('e-patr').value || '').trim();
    if(!nome){ state.msg={where:'editar',type:'err',text:'Informe o nome do notebook.'}; render(); return; }
    try{
      const upd = await apiFetch('/api/notebooks/' + encodeURIComponent(nb.id), { method:'PUT', body: JSON.stringify({ nome, patrimonio: patr }) });
      const idx = state.notebooks.findIndex(n=>n.id===nb.id);
      if(idx>=0) state.notebooks[idx] = Object.assign({}, state.notebooks[idx], upd);
      state.view = 'admin'; state.editId = null;
      state.msg = {where:'admin', type:'ok', text:'Notebook atualizado.'};
    }catch(e){
      const dica = /405|404|Erro 5/.test(e.message) ? ' (a API precisa estar atualizada com a função de editar)' : '';
      state.msg = {where:'editar', type:'err', text:'Falha ao salvar: ' + e.message + dica};
    }
    render();
  });
}
