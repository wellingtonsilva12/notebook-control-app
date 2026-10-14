/* Estado global e configuração (guardada no navegador) */

const DEFAULT_API = 'https://notebook-control-api.onrender.com';
const state = {
  view: 'dashboard',
  notebooks: [],
  movimentos: [],
  loaded: false,
  flow: { step: 1, notebook: null, nfcOk: false, pessoa: '', tipo: null },
  cadastro: { nome:'', patrimonio:'', nfcTag:'', nfcOk:false },
  config: { apiUrl: DEFAULT_API, apiKey:'' },
  apiStatus: 'unknown', // 'unknown' | 'checking' | 'ok' | 'error'
  msg: null,
  popup: null,
  admin: { token: null },
  q: '', filtro: 'todos', hq: '', htipo: 'todos', editId: null
};

function loadConfig(){
  try{
    const raw = localStorage.getItem('api-config');
    if(raw) state.config = Object.assign({ apiUrl: DEFAULT_API, apiKey:'' }, JSON.parse(raw));
  }catch(e){}
}
function loadAdmin(){
  try{ state.admin.token = sessionStorage.getItem('atlas-admin') || null; }catch(e){}
}
function saveAdmin(){
  try{
    if(state.admin.token) sessionStorage.setItem('atlas-admin', state.admin.token);
    else sessionStorage.removeItem('atlas-admin');
  }catch(e){}
}
function adminOn(){ return !!state.admin.token; }
function saveConfig(){
  try{ localStorage.setItem('api-config', JSON.stringify(state.config)); }catch(e){}
}
