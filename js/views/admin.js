/* Tela: Painel do Administrador (protegido por senha no servidor) */

function adminStats(){
  const inicioHoje = new Date(); inicioHoje.setHours(0,0,0,0);
  const saidas = state.movimentos.filter(m=>m.tipo==='saida');
  const saidasHoje = saidas.filter(m=>m.timestamp >= inicioHoje.getTime()).length;
  const porPessoa = {};
  saidas.forEach(m=>{ porPessoa[m.pessoa] = (porPessoa[m.pessoa]||0) + 1; });
  const ranking = Object.entries(porPessoa).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return { saidasHoje, totalSaidas: saidas.length, ranking };
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
      <td><span class="badge ${n.status==='disponivel'?'disp':'retirado'}">${n.status==='disponivel'?'Disponível':'Retirado'}</span>${n.status==='retirado' ? `<div class="mono" style="padding:4px 0 0;border:0;">${escapeHtml(n.retiradoPor||'')}</div>` : ''}</td>
      <td class="acoes">
        <button class="btn secondary small" data-edit="${escapeAttr(n.id)}">Editar</button>
        ${n.status==='retirado' ? `<button class="btn secondary small" data-liberar="${escapeAttr(n.id)}">Liberar</button>` : ''}
        <button class="btn secondary small" data-del="${escapeAttr(n.id)}">Excluir</button>
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

    <h3 class="sec">Quem mais retirou</h3>
    ${st.ranking.length ? `<div class="rank">${st.ranking.map((r,i)=>`<div class="rank-row"><span>${i+1}. ${escapeHtml(r[0])}</span><b>${r[1]}</b></div>`).join('')}</div>` : '<div class="empty">Ainda sem retiradas.</div>'}

    <h3 class="sec">Notebooks</h3>
    <table class="admin-table">
      <thead><tr><th>Notebook</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="hint">Liberar: marca o notebook como disponível quando alguém devolveu e esqueceu de registrar (fica no histórico como "Admin (forçado)").</div>

    <h3 class="sec">Histórico</h3>
    <div class="btnrow" style="margin-top:0;">
      <button class="btn secondary" data-action="admin-csv">Exportar tudo (CSV)</button>
      <button class="btn secondary" data-action="admin-limpar">Apagar histórico</button>
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

  bind('[data-action="admin-csv"]', ()=>exportarCsv(true));

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

  document.querySelectorAll('[data-liberar]').forEach(btn=>{
    btn.onclick = async ()=>{
      const nb = state.notebooks.find(n=>n.id===btn.dataset.liberar);
      if(!nb || !confirm('Marcar "' + nb.nome + '" como devolvido?')) return;
      try{
        const r = await apiFetch('/api/notebooks/' + encodeURIComponent(nb.id) + '/liberar', { method:'POST' });
        const idx = state.notebooks.findIndex(n=>n.id===nb.id);
        if(idx>=0) state.notebooks[idx] = r.notebook;
        state.movimentos.push(r.movimento);
        state.msg = {where:'admin', type:'ok', text:'Notebook liberado.'};
      }catch(e){
        state.msg = {where:'admin', type:'err', text:'Falha ao liberar: ' + e.message};
      }
      render();
    };
  });
}
