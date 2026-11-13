/* Comunicação com a API (Spring Boot) e carga inicial dos dados */

function apiBase(){ return (state.config.apiUrl || '').replace(/\/+$/,''); }

async function apiFetch(path, options={}){
  const base = apiBase();
  if(!base) throw new Error('API não configurada. Entre em Admin → Configurações e informe a URL do servidor.');
  const headers = Object.assign({ 'Content-Type':'application/json' }, options.headers || {});
  if(state.config.apiKey) headers['x-api-key'] = state.config.apiKey;
  if(state.admin.token) headers['x-admin-token'] = state.admin.token;
  const res = await fetch(base + path, Object.assign({}, options, { headers }));
  let data = null;
  try{ data = await res.json(); }catch(e){}
  if(!res.ok){
    if(res.status===401 && state.admin.token && /administrador/i.test((data && data.error) || '')){
      state.admin.token = null; saveAdmin();
    }
    throw new Error((data && data.error) ? data.error : ('Erro ' + res.status + ' ao falar com a API.'));
  }
  return data;
}

async function testApiConnection(){
  state.apiStatus = 'checking'; render();
  try{
    await apiFetch('/api/health');
    state.apiStatus = 'ok';
  }catch(e){
    state.apiStatus = 'error';
  }
  render();
}

async function loadData(){
  loadConfig();
  if(!apiBase()){
    state.notebooks = []; state.movimentos = []; state.loaded = true; render();
    return;
  }
  try{
    state.notebooks = await apiFetch('/api/notebooks');
    state.movimentos = await apiFetch('/api/movimentos');
    state.apiStatus = 'ok';
  }catch(e){
    state.apiStatus = 'error';
    state.msg = { where:'dashboard', type:'err', text: 'Não foi possível carregar dados da API: ' + e.message };
  }
  state.loaded = true;
  await handleTagParam();
  render();
}

/* Tag NFC gravada como URL (?tag=CODIGO): ao encostar o celular, o app abre já identificando a tag */
