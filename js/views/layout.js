/* Estrutura da tela: menu, aviso de tag e roteamento das telas */

function render(){
  const root = document.getElementById('root');
  if(!state.loaded){
    root.innerHTML = '<div style="padding:40px;color:#8fa0ad;font-family:sans-serif;">Carregando...</div>';
    return;
  }
  root.innerHTML = `
    <nav class="side">
      <div class="brand">
        <img class="logo" src="assets/icon-192.png" alt="ATLAS">
        <div class="brand-txt"><h1>ATLAS</h1>
        <div class="brand-sub">Controle de Notebooks</div></div>
      </div>
      ${navBtn('dashboard','Painel')}
      ${navBtn('cadastrar','Cadastrar notebook')}
      ${navBtn('historico','Histórico')}
      ${navBtn('movimentar','Registro manual')}
      ${navBtn('admin', adminOn() ? 'Admin ●' : 'Admin')}
      <div class="side-foot">${state.notebooks.length} equipamento(s)<br>${state.movimentos.length} registro(s)</div>
    </nav>
    <main>${renderView()}</main>
    ${state.popup ? `<div class="tagpop ${state.popup.kind}"><div class="box"><div class="ic">${state.popup.kind==='err'?'!':(state.popup.kind==='new'?'+':'✓')}</div><h3>${state.popup.title}</h3><p>${state.popup.text}</p><button class="btn full" data-action="fechar-popup">OK</button></div></div>` : ''}
  `;
  attachHandlers();
}

function navBtn(id, label){
  return `<button class="navbtn ${state.view===id?'active':''}" data-nav="${id}">${label}</button>`;
}

function renderView(){
  if(!apiBase() && state.view!=='admin') return renderNoApi();
  if(state.view==='dashboard') return renderDashboard();
  if(state.view==='cadastrar') return renderCadastro();
  if(state.view==='movimentar') return renderMovimentar();
  if(state.view==='historico') return renderHistorico();
  if(state.view==='editar') return renderEditar();
  if(state.view==='admin') return renderAdmin();
  return '';
}

function renderNoApi(){
  return `
    <h2 class="title">Configure a API primeiro</h2>
    <p class="sub">Este app precisa de um endereço de servidor para guardar os dados e compartilhá-los entre aparelhos.</p>
    <div class="panel">
      <div class="msg info">Entre em <b>Admin</b> → Configurações e informe a URL do seu backend (ex: https://seu-servidor.com).</div>
      <button class="btn full" data-nav="admin">Abrir Admin</button>
    </div>
  `;
}

function attachLayoutHandlers(){
  document.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.onclick = ()=>{ state.view = btn.dataset.nav; state.msg = null; render(); };
  });
  const pop = document.querySelector('[data-action="fechar-popup"]');
  if(pop) pop.onclick = ()=>{ state.popup = null; render(); };
}
