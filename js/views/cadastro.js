/* Tela: Cadastrar notebook */

function renderCadastro(){
  const c = state.cadastro;
  return `
    <h2 class="title">Cadastrar notebook</h2>
    <p class="sub">Registre o equipamento, e a tag NFC do ativo.</p>
    <div class="panel">
      ${state.msg && state.msg.where==='cadastrar' ? `<div class="msg ${state.msg.type}">${state.msg.text}</div>` : ''}
      <div class="row">
        <div class="field">
          <label>Nome / modelo do notebook</label>
          <input id="c-nome" type="text" placeholder="Ex: Dell Latitude 5440" value="${escapeAttr(c.nome)}">
        </div>
        <div class="field">
          <label>Nº de patrimônio</label>
          <input id="c-patr" class="mono-input" type="text" placeholder="Ex: TI-0042" value="${escapeAttr(c.patrimonio)}">
        </div>
      </div>

      <div class="nfc-box">
        <div class="lbl">Tag NFC</div>
        <div class="nfc-status">
          <span class="dot ${c.nfcOk?'on':''}"></span>
          <span>${c.nfcOk ? 'Tag vinculada: ' + c.nfcTag : 'Nenhuma tag lida ainda'}</span>
        </div>
        <div class="btnrow" style="margin-top:10px;">
          <button class="btn secondary small" data-action="ler-nfc-cadastro">Ler tag NFC</button>
        </div>
        <div class="hint">Web NFC funciona em Chrome para Android com o site em HTTPS. No iPhone e em outros aparelhos, grave a tag como link (?tag=CÓDIGO) e encoste o celular nela.</div>
      </div>

      <div class="btnrow">
        <button class="btn full" data-action="salvar-cadastro">Salvar notebook</button>
      </div>
    </div>
  `;
}

function attachCadastroHandlers(){
  const cNome = document.getElementById('c-nome');
  if(cNome) cNome.oninput = e=>{ state.cadastro.nome = e.target.value; };
  const cPatr = document.getElementById('c-patr');
  if(cPatr) cPatr.oninput = e=>{ state.cadastro.patrimonio = e.target.value; };

  bind('[data-action="ler-nfc-cadastro"]', async ()=>{
    state.msg = {where:'cadastrar', type:'info', text:'Aproxime a tag NFC do dispositivo…'};
    render();
    await readNfcTag(
      (id)=>{ state.cadastro.nfcTag = id; state.cadastro.nfcOk = true; state.msg={where:'cadastrar',type:'ok',text:'Tag lida com sucesso.'}; render(); },
      (err)=>{ state.msg = {where:'cadastrar', type:'err', text: err}; render(); }
    );
  });

  bind('[data-action="salvar-cadastro"]', async ()=>{
    const c = state.cadastro;
    if(!c.nome){ state.msg={where:'cadastrar',type:'err',text:'Informe o nome/modelo do notebook.'}; render(); return; }
    if(!c.nfcTag){ state.msg={where:'cadastrar',type:'err',text:'Leia a tag NFC.'}; render(); return; }
    if(state.notebooks.some(n=>n.nfcTag===c.nfcTag)){ state.msg={where:'cadastrar',type:'err',text:'Já existe um notebook cadastrado com essa tag.'}; render(); return; }
    try{
      const notebook = await apiFetch('/api/notebooks', {
        method: 'POST',
        body: JSON.stringify({ nome: c.nome, patrimonio: c.patrimonio, nfcTag: c.nfcTag })
      });
      state.notebooks.push(notebook);
      state.cadastro = { nome:'', patrimonio:'', nfcTag:'', nfcOk:false };
      state.msg = {where:'dashboard', type:'ok', text:'Notebook cadastrado.'};
      state.view = 'dashboard';
    }catch(e){
      state.msg = {where:'cadastrar', type:'err', text: 'Falha ao salvar: ' + e.message};
    }
    render();
  });
}
