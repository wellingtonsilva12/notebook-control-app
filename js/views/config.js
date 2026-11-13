/* Configurações (URL da API). Fica dentro da área Admin. */

function renderConfigPanel(){
  const c = state.config;
  const statusLabel = { unknown:'Não testado', checking:'Testando…', ok:'Conectado', error:'Falha na conexão' }[state.apiStatus];
  const statusClass = { unknown:'', checking:'wait', ok:'on', error:'' }[state.apiStatus];
  return `
    <h3 class="sec">Configurações</h3>
    <p class="sub" style="margin-bottom:14px;">Endereço do servidor que guarda os notebooks e o histórico. Assim os dados ficam iguais em qualquer aparelho.</p>
    <div class="panel">
      ${state.msg && state.msg.where==='config' ? `<div class="msg ${state.msg.type}">${state.msg.text}</div>` : ''}
      <div class="field">
        <label>URL da API</label>
        <input id="cfg-url" class="mono-input" type="text" placeholder="https://seu-servidor.com" value="${escapeAttr(c.apiUrl)}">
      </div>
      <div class="field">
        <label>Chave de API (opcional, se o servidor exigir)</label>
        <input id="cfg-key" class="mono-input" type="text" placeholder="deixe em branco se não usar" value="${escapeAttr(c.apiKey)}">
      </div>
      <div class="nfc-status" style="margin-bottom:10px;">
        <span class="dot ${statusClass}"></span><span>Status: ${statusLabel}</span>
      </div>
      <div class="btnrow">
        <button class="btn" data-action="testar-api">Testar conexão</button>
        <button class="btn secondary" data-action="salvar-config">Salvar</button>
      </div>
      <div class="hint"><b>Atalho no iPhone:</b> no Safari, toque em Compartilhar → "Adicionar à Tela de Início". O atalho abre o app em tela cheia com ícone próprio.</div>
      <div class="hint">A URL é a do servidor onde você hospedou a API (veja o README do projeto de backend). Ex: um serviço no Render/Railway, ou um servidor na sua rede local.</div>
    </div>
  `;
}

function attachConfigHandlers(){
  const cfgUrl = document.getElementById('cfg-url');
  if(cfgUrl) cfgUrl.oninput = e=>{ state.config.apiUrl = e.target.value; };
  const cfgKey = document.getElementById('cfg-key');
  if(cfgKey) cfgKey.oninput = e=>{ state.config.apiKey = e.target.value; };

  bind('[data-action="testar-api"]', async ()=>{
    saveConfig();
    await testApiConnection();
    state.msg = { where:'config', type: state.apiStatus==='ok' ? 'ok' : 'err', text: state.apiStatus==='ok' ? 'Conectado com sucesso.' : 'Não foi possível conectar. Confira a URL e se o servidor está no ar.' };
    render();
  });

  bind('[data-action="salvar-config"]', ()=>{
    saveConfig();
    state.msg = { where:'config', type:'ok', text:'Configuração salva.' };
    render();
    loadData();
  });
}
