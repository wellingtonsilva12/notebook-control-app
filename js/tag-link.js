/* Tag gravada como link (?tag=CODIGO): reconhece ao abrir o app */

function tagFeedback(popup){
  state.popup = popup;
  try{ if(navigator.vibrate) navigator.vibrate(popup.kind==='err'?[200,100,200]:120); }catch(e){}
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(AC){ const a = new AC(), o = a.createOscillator(), g = a.createGain();
      o.frequency.value = popup.kind==='err' ? 220 : 880; g.gain.value = 0.15;
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.18); }
  }catch(e){}
  setTimeout(()=>{ if(state.popup===popup){ state.popup = null; render(); } }, 6000);
}

async function handleTagParam(){
  let tag = null;
  try{ tag = new URLSearchParams(location.search).get('tag'); }catch(e){}
  if(!tag) return;
  tag = tag.trim();
  try{ history.replaceState(null, '', location.pathname); }catch(e){}
  if(!apiBase()){ state.view = 'admin'; state.msg = {where:'admin', type:'info', text:'Configure a API para usar a tag lida (' + escapeHtml(tag) + ').'}; return; }
  const nb = state.notebooks.find(n=>n.nfcTag === tag);
  if(nb && nb.status==='retirado'){
    // devolução automática: registra na hora, em nome de quem retirou
    const pessoa = nb.retiradoPor || '—';
    try{
      const result = await apiFetch('/api/movimentos', { method:'POST', body: JSON.stringify({ notebookId: nb.id, nfcTag: nb.nfcTag, pessoa }) });
      const idx = state.notebooks.findIndex(n=>n.id===result.notebook.id);
      if(idx>=0) state.notebooks[idx] = result.notebook;
      state.movimentos.push(result.movimento);
      state.view = 'dashboard';
      state.msg = {where:'dashboard', type:'ok', text:'Devolução registrada automaticamente: ' + escapeHtml(nb.nome) + ' (' + escapeHtml(pessoa) + ').'};
      tagFeedback({kind:'ok', title:'Tag reconhecida!', text:'<b>' + escapeHtml(nb.nome) + '</b><br>Devolução registrada em nome de ' + escapeHtml(pessoa) + '.'});
    }catch(e){
      state.view = 'dashboard';
      state.msg = {where:'dashboard', type:'err', text:'Falha ao registrar devolução: ' + e.message};
      tagFeedback({kind:'err', title:'Tag lida, mas falhou', text:'Não consegui registrar a devolução: ' + escapeHtml(e.message)});
    }
  } else if(nb){
    state.view = 'movimentar';
    state.flow = { step:3, notebook: nb, nfcOk:true, pessoa:'', tipo: nb.status==='disponivel'?'saida':'entrada' };
    state.msg = {where:'movimentar', type:'ok', text:'Tag reconhecida: ' + escapeHtml(nb.nome) + '. Informe o nome e confirme.'};
    tagFeedback({kind:'ok', title:'Tag reconhecida!', text:'<b>' + escapeHtml(nb.nome) + '</b><br>Informe quem está retirando e confirme.'});
  } else {
    state.view = 'cadastrar';
    state.cadastro.nfcTag = tag; state.cadastro.nfcOk = true;
    state.msg = {where:'cadastrar', type:'ok', text:'Tag nova lida (' + escapeHtml(tag) + '). Preencha os dados do notebook e salve.'};
    tagFeedback({kind:'new', title:'Tag nova lida', text:'Código <b>' + escapeHtml(tag) + '</b> ainda não está cadastrado. Preencha os dados do notebook.'});
  }
}
