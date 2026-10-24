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
  if(nb && nb.status==='pendente'){
    state.view = 'dashboard';
    state.msg = {where:'dashboard', type:'info', text:'A devolução de ' + escapeHtml(nb.nome) + ' já foi registrada e aguarda confirmação do responsável.'};
    tagFeedback({kind:'new', title:'Devolução pendente', text:'<b>' + escapeHtml(nb.nome) + '</b><br>Já foi devolvido e aguarda confirmação do responsável.'});
  } else if(nb){
    const saida = nb.status==='disponivel';
    state.view = 'movimentar';
    state.flow = { step:3, notebook: nb, nfcOk:true, pessoa:'', tipo: saida?'saida':'entrada' };
    state.msg = {where:'movimentar', type:'ok', text: saida
      ? 'Tag reconhecida: ' + escapeHtml(nb.nome) + '. Informe seu nome para retirar.'
      : 'Tag reconhecida: ' + escapeHtml(nb.nome) + '. Confirme a devolução.'};
    tagFeedback({kind:'ok', title:'Tag reconhecida!', text:'<b>' + escapeHtml(nb.nome) + '</b><br>' + (saida ? 'Informe seu nome para retirar.' : 'Confirme a devolução.')});
  } else {
    state.view = 'cadastrar';
    state.cadastro.nfcTag = tag; state.cadastro.nfcOk = true;
    state.msg = {where:'cadastrar', type:'ok', text:'Tag nova lida (' + escapeHtml(tag) + '). Preencha os dados do notebook e salve.'};
    tagFeedback({kind:'new', title:'Tag nova lida', text:'Código <b>' + escapeHtml(tag) + '</b> ainda não está cadastrado. Preencha os dados do notebook.'});
  }
}
