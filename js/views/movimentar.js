/* Tela: Registro manual (saída e devolução) */

function renderMovimentar(){
  const f = state.flow;
  const nbOptions = state.notebooks.map(n=>`<option value="${n.id}" ${f.notebook && f.notebook.id===n.id?'selected':''}>${escapeHtml(n.nome)} — ${escapeHtml(n.patrimonio||'s/patrimônio')} (${n.status==='disponivel'?'disponível':'retirado'})</option>`).join('');

  if(!state.notebooks.length){
    return `<h2 class="title">Registro manual</h2><p class="sub">Saída ou devolução de equipamento.</p><div class="empty">Cadastre um notebook primeiro.</div>`;
  }

  const tipoAuto = f.notebook ? (f.notebook.status==='disponivel' ? 'saida' : 'entrada') : null;

  return `
    <h2 class="title">Registro manual</h2>
    <p class="sub">Use só se a tag não funcionar (descolou, sem sinal ou sem celular com NFC). O caminho normal é encostar a tag.</p>
    <div class="panel">
      ${state.msg && state.msg.where==='movimentar' ? `<div class="msg ${state.msg.type}">${state.msg.text}</div>` : ''}

      <div class="field">
        <label>Notebook</label>
        <select id="m-notebook" class="notebook-select">
          <option value="">Selecione…</option>
          ${nbOptions}
        </select>
      </div>

      ${f.notebook ? `
        <div class="msg info">Ação: <b>${tipoAuto==='saida' ? 'Saída (retirada)' : 'Entrada (devolução)'}</b> — status atual: ${f.notebook.status==='disponivel'?'disponível':'retirado por '+(f.notebook.retiradoPor||'—')}</div>

        <div class="field">
          <label>${tipoAuto==='saida' ? 'Nome de quem está retirando o notebook' : 'Nome de quem está devolvendo o notebook'}</label>
          <input id="m-pessoa" type="text" placeholder="Nome completo" value="${escapeAttr(f.pessoa)}">
        </div>

        <div class="btnrow">
          <button class="btn full" data-action="concluir-mov">${tipoAuto==='saida' ? 'Confirmar saída' : 'Confirmar devolução'}</button>
        </div>
      ` : ''}
    </div>
  `;
}

function attachMovimentarHandlers(){
  const mSelect = document.getElementById('m-notebook');
  if(mSelect) mSelect.onchange = e=>{
    const nb = state.notebooks.find(n=>n.id===e.target.value);
    state.flow = { step:3, notebook: nb||null, nfcOk:true, pessoa:'', tipo: nb ? (nb.status==='disponivel'?'saida':'entrada') : null };
    render();
  };

  bind('[data-action="ler-nfc-mov"]', async ()=>{
    state.msg = {where:'movimentar', type:'info', text:'Aproxime a tag NFC do notebook…'};
    render();
    await readNfcTag(
      (id)=>{
        if(id !== state.flow.notebook.nfcTag){
          state.msg = {where:'movimentar', type:'err', text:'A tag lida não corresponde a este notebook.'};
        } else {
          state.flow.nfcOk = true; state.flow.step = 3;
          state.msg = {where:'movimentar', type:'ok', text:'Tag confirmada.'};
        }
        render();
      },
      (err)=>{ state.msg = {where:'movimentar', type:'err', text: err}; render(); }
    );
  });

  const mPessoa = document.getElementById('m-pessoa');
  if(mPessoa) mPessoa.oninput = e=>{ state.flow.pessoa = e.target.value; };

  bind('[data-action="concluir-mov"]', async ()=>{
    const f = state.flow;
    const pessoa = (f.pessoa || '').trim();
    if(!pessoa){ state.msg={where:'movimentar',type:'err',text:'Informe o nome de quem está retirando/devolvendo.'}; render(); return; }
    const acao = f.notebook.status==='disponivel' ? 'SAÍDA' : 'DEVOLUÇÃO';
    if(!confirm('Registrar ' + acao + ' de "' + f.notebook.nome + '" para ' + pessoa + '?')) return;
    try{
      const result = await apiFetch('/api/movimentos', {
        method: 'POST',
        body: JSON.stringify({ notebookId: f.notebook.id, nfcTag: f.notebook.nfcTag, pessoa })
      });
      const idx = state.notebooks.findIndex(n=>n.id===result.notebook.id);
      if(idx>=0) state.notebooks[idx] = result.notebook; else state.notebooks.push(result.notebook);
      state.movimentos.push(result.movimento);
      state.flow = { step:1, notebook:null, nfcOk:false, pessoa:'', tipo:null };
      state.msg = {where:'dashboard', type:'ok', text: result.movimento.tipo==='saida' ? `Saída registrada para ${pessoa}.` : `Devolução registrada por ${pessoa}.`};
      state.view = 'dashboard';
    }catch(e){
      state.msg = {where:'movimentar', type:'err', text: 'Falha ao registrar: ' + e.message};
    }
    render();
  });
}
