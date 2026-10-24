/* Tela: Retirada e devolução (aberta ao encostar a tag) */

function movStatusTxt(n){
  return n.status==='disponivel' ? 'disponível' : (n.status==='pendente' ? 'devolução pendente' : 'retirado');
}

function renderMovimentar(){
  const f = state.flow;
  const nbOptions = state.notebooks.map(n=>`<option value="${n.id}" ${f.notebook && f.notebook.id===n.id?'selected':''}>${escapeHtml(n.nome)} — ${escapeHtml(n.patrimonio||'s/patrimônio')} (${movStatusTxt(n)})</option>`).join('');

  if(!state.notebooks.length){
    return `<h2 class="title">Retirada / Devolução</h2><p class="sub">Saída ou devolução de equipamento.</p><div class="empty">Cadastre um notebook primeiro.</div>`;
  }

  const nb = f.notebook;
  const tipoAuto = nb ? (nb.status==='disponivel' ? 'saida' : (nb.status==='retirado' ? 'entrada' : 'pendente')) : null;

  let corpo = '';
  if(nb && tipoAuto==='pendente'){
    corpo = `<div class="msg info">A devolução de <b>${escapeHtml(nb.nome)}</b> já foi registrada${nb.retiradoPor?' por <b>'+escapeHtml(nb.retiradoPor)+'</b>':''} e aguarda a confirmação do responsável.</div>`;
  } else if(nb && tipoAuto==='saida' && !horarioStatus().retirada && !adminOn()){
    corpo = `<div class="msg warn">Retiradas só nos primeiros 30 minutos da aula. Reabrem ${horarioStatus().proxima}. Se precisar retirar agora, peça ao professor (Admin).</div>`;
  } else if(nb && tipoAuto==='entrada' && !horarioStatus().devolucao && !adminOn()){
    corpo = `<div class="msg warn">Durante a aula só o Admin movimenta. Devoluções liberadas a partir de ${horarioStatus().devolucaoDe}. Se precisar sair antes, peça ao professor (Admin).</div>`;
  } else if(nb){
    corpo = `
        <div class="msg info">Ação: <b>${tipoAuto==='saida' ? 'Retirada' : 'Devolução'}</b> — status atual: ${nb.status==='disponivel'?'disponível':'retirado por '+escapeHtml(nb.retiradoPor||'—')}</div>
        ${tipoAuto==='saida' ? `
        <div class="field">
          <label>Nome de quem está retirando o notebook</label>
          <input id="m-pessoa" type="text" placeholder="Nome completo" value="${escapeAttr(f.pessoa)}">
        </div>` : ''}
        <div class="btnrow">
          <button class="btn full" data-action="concluir-mov">${tipoAuto==='saida' ? 'Confirmar retirada' : 'Devolver notebook'}</button>
        </div>`;
  }

  return `
    <h2 class="title">Retirada / Devolução</h2>
    <p class="sub">Retirada e devolução de equipamento.</p>
    <div class="panel">
      ${state.msg && state.msg.where==='movimentar' ? `<div class="msg ${state.msg.type}">${state.msg.text}</div>` : ''}

      <div class="field">
        <label>Notebook</label>
        <select id="m-notebook" class="notebook-select">
          <option value="">Selecione…</option>
          ${nbOptions}
        </select>
      </div>
      ${corpo}
    </div>
  `;
}

function attachMovimentarHandlers(){
  const mSelect = document.getElementById('m-notebook');
  if(mSelect) mSelect.onchange = e=>{
    const nb = state.notebooks.find(n=>n.id===e.target.value);
    state.flow = { step:3, notebook: nb||null, nfcOk:true, pessoa:'', tipo: nb ? (nb.status==='disponivel'?'saida':'entrada') : null };
    state.msg = null;
    render();
  };

  const mPessoa = document.getElementById('m-pessoa');
  if(mPessoa) mPessoa.oninput = e=>{ state.flow.pessoa = e.target.value; };

  bind('[data-action="concluir-mov"]', async ()=>{
    const f = state.flow;
    const erro = t=>{ state.msg = {where:'movimentar', type:'err', text:t}; render(); };
    const saida = f.notebook.status==='disponivel';
    const pessoa = (f.pessoa || '').trim();
    if(saida && !pessoa) return erro('Informe o nome de quem está retirando.');
    try{
      const result = await apiFetch('/api/movimentos', {
        method: 'POST',
        body: JSON.stringify({ notebookId: f.notebook.id, nfcTag: f.notebook.nfcTag, pessoa })
      });
      const idx = state.notebooks.findIndex(n=>n.id===result.notebook.id);
      if(idx>=0) state.notebooks[idx] = result.notebook; else state.notebooks.push(result.notebook);
      state.movimentos.push(result.movimento);
      state.flow = { step:1, notebook:null, nfcOk:false, pessoa:'', tipo:null };
      state.msg = {where:'dashboard', type:'ok', text: saida
        ? `Retirada registrada para ${escapeHtml(pessoa)}.`
        : 'Devolução enviada. O notebook fica como pendente até o responsável confirmar.'};
      state.view = 'dashboard';
      tagFeedback({kind:'ok', title: saida ? 'Retirada registrada' : 'Devolução enviada',
        text: saida ? 'Boa aula!' : 'Aguardando confirmação do responsável.'});
    }catch(e){
      state.msg = {where:'movimentar', type:'err', text: escapeHtml(e.message)};
    }
    render();
  });
}
