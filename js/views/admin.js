/* Tela: Painel do Administrador (protegido por senha no servidor) */

function adminStats(){
  const inicioHoje = new Date(); inicioHoje.setHours(0,0,0,0);
  const saidas = state.movimentos.filter(m=>m.tipo==='saida');
  const saidasHoje = saidas.filter(m=>m.timestamp >= inicioHoje.getTime()).length;
  return { saidasHoje, totalSaidas: saidas.length };
}

function renderAdminLogin(){
  return `
    <h2 class="title">Administrador</h2>
    <p class="sub">Área restrita. Digite a senha para gerenciar notebooks e histórico.</p>
    <div class="panel">
      ${state.msg && state.msg.where==='admin' ? `<div class="msg ${state.msg.type}">${state.msg.text}</div>` : ''}
      <div class="field">
        <label>Senha do administrador</label>
        <input id="adm-senha" type="password" autocomplete="current-password" placeholder="Senha">
      </div>
      <div class="btnrow"><button class="btn full" data-action="admin-entrar">Entrar</button></div>
    </div>
    ${(!apiBase() || state.configRescue) ? '<div class="msg info" style="margin-top:18px;">Não consegui falar com o servidor. Confira o endereço da API abaixo.</div>' + renderConfigPanel() : ''}
  `;
}

function renderAdmin(){
  if(!adminOn()) return renderAdminLogin();
  const st = adminStats();
  const linhas = state.notebooks.length ? state.notebooks.map(n=>`
    <tr>
      <td>${escapeHtml(n.nome)}<div class="mono" style="padding:0;border:0;">PAT. ${escapeHtml(n.patrimonio||'—')} · ${escapeHtml(n.nfcTag)}</div></td>
      <td><span class="badge ${statusInfo(n).cls}">${statusInfo(n).txt}</span>${n.status!=='disponivel' ? `<div class="mono" style="padding:4px 0 0;border:0;">${escapeHtml(n.retiradoPor||'')}</div>` : ''}</td>
      <td class="acoes">
        <button class="btn secondary small iconbtn" data-edit="${escapeAttr(n.id)}" title="Editar" aria-label="Editar">${ICO_EDIT}</button>
        ${n.status!=='disponivel' ? `<button class="btn small" data-confirmar="${escapeAttr(n.id)}">${ICO_CHECK} Confirmar</button>` : ''}
        <button class="btn secondary small iconbtn" data-del="${escapeAttr(n.id)}" title="Excluir" aria-label="Excluir">${ICO_TRASH}</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--ink-dim);padding:24px;">Nenhum notebook cadastrado.</td></tr>';

  return `
    <h2 class="title">Administrador</h2>
    <p class="sub">Gerencie notebooks e histórico. A sessão dura 8 horas ou até você sair.</p>
    ${state.msg && state.msg.where==='admin' ? `<div class="msg ${state.msg.type}">${state.msg.text}</div>` : ''}

    <div class="stats">
      <div class="stat"><div class="n">${state.notebooks.length}</div><div class="l">Notebooks</div></div>
      <div class="stat out"><div class="n">${st.saidasHoje}</div><div class="l">Saídas hoje</div></div>
      <div class="stat"><div class="n">${state.movimentos.length}</div><div class="l">Movimentações</div></div>
    </div>

    <h3 class="sec">Notebooks</h3>
    ${state.notebooks.some(n=>n.status==='retirado') ? `<div class="btnrow" style="margin:0 0 6px 0;"><button class="btn" data-devolver-todos>${ICO_CHECK} Devolver todos</button></div><div class="hint" style="margin:0 0 14px 0;">Use quando a aula acabar mais cedo: devolve de uma vez todos os notebooks que estão retirados. Os pendentes continuam esperando a sua confirmação.</div>` : ''}
    <table class="admin-table">
      <thead><tr><th>Notebook</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="hint">Confirmar: aceita a devolução e libera o notebook. Escreva um comentário (ex.: aluno precisou sair mais cedo). Se ele ainda consta como retirado, o comentário é obrigatório e a devolução fica como "Admin forçado".</div>

    <h3 class="sec">Histórico</h3>
    <div class="btnrow" style="margin-top:0;">
      ${exportarMenuHtml('admin','Exportar tudo',true)}
      <button class="btn secondary iconbtn" data-action="admin-limpar" data-del-all title="Apagar histórico" aria-label="Apagar histórico">${ICO_TRASH}</button>
    </div>

    ${renderConfigPanel()}

    <div class="btnrow" style="margin-top:28px;">
      <button class="btn secondary" data-action="admin-sair">Sair do modo administrador</button>
    </div>

  `;
}

function attachAdminHandlers(){
  const senhaEl = document.getElementById('adm-senha');
  const entrar = async ()=>{
    const senha = senhaEl ? senhaEl.value : '';
    if(!senha){ state.msg = {where:'admin', type:'err', text:'Digite a senha.'}; render(); return; }
    try{
      const r = await apiFetch('/api/admin/login', { method:'POST', body: JSON.stringify({ senha }) });
      state.admin.token = r.token; saveAdmin();
      state.msg = {where:'admin', type:'ok', text:'Modo administrador ativado.'};
    }catch(e){
      if(e instanceof TypeError) state.configRescue = true;
      state.msg = {where:'admin', type:'err', text: e.message};
    }
    render();
  };
  if(senhaEl) senhaEl.onkeydown = e=>{ if(e.key==='Enter') entrar(); };
  bind('[data-action="admin-entrar"]', entrar);

  bind('[data-action="admin-sair"]', ()=>{
    state.admin.token = null; saveAdmin(); state.msg = null; state.view = 'dashboard'; render();
  });


  bind('[data-action="admin-limpar"]', async ()=>{
    if(!confirm('Apagar TODO o histórico de movimentações? Isso não pode ser desfeito.')) return;
    try{
      await apiFetch('/api/movimentos', { method:'DELETE' });
      state.movimentos = [];
      state.msg = {where:'admin', type:'ok', text:'Histórico apagado.'};
    }catch(e){
      state.msg = {where:'admin', type:'err', text:'Falha ao apagar: ' + e.message};
    }
    render();
  });
}
