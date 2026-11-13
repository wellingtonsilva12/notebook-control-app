/* Funções utilitárias */

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function fmtDate(ts){
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }

// Liga um clique a um elemento da tela (usado pelos handlers de cada view)
function bind(sel, fn){ const el = document.querySelector(sel); if(el) el.onclick = fn; }

/* Ícones (SVG simples, herdam a cor do texto) */
const ICO_EDIT = '<svg class="ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const ICO_TRASH = '<svg class="ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
const ICO_CHECK = '<svg class="ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function statusInfo(n){
  if(n.status==='disponivel') return {cls:'disp', txt:'Disponível'};
  if(n.status==='pendente')  return {cls:'pendente', txt:'Devolução pendente'};
  return {cls:'retirado', txt:'Retirado'};
}

/* Registros antigos foram gravados como "Admin (forçado)"; exibimos sempre "Admin forçado" */
function nomePessoa(p){ return (p==null?'':String(p)).replace('Admin (forçado)','Admin forçado'); }

/* Admin confirma a devolução (abre a janela com o comentário) */
function abrirConfirmar(id){
  state.confirmarId = id; state.confirmarTxt = ''; state.confirmarErro = '';
  render();
  const t = document.getElementById('conf-coment'); if(t) t.focus();
}

function devolverTodosModalHtml(){
  const abertos = state.notebooks.filter(n=>n.status==='retirado');
  const pend = state.notebooks.filter(n=>n.status==='pendente').length;
  return `<div class="tagpop"><div class="box" style="text-align:left;border-color:var(--steel);">
    <h3 style="margin:0 0 4px 0;">Devolver todos</h3>
    <p style="margin:0 0 12px 0;color:var(--ink-dim);font-size:13px;">Encerra a aula: ${abertos.length} notebook(s) retirado(s) voltam a ficar disponíveis, registrados por <b>Admin forçado</b>.${pend?' Os '+pend+' pendente(s) não entram: confirme um a um.':''}</p>
    <ul style="margin:0 0 14px 0;padding-left:18px;font-size:13px;line-height:1.7;">${abertos.map(n=>`<li>${escapeHtml(n.nome)}${n.retiradoPor?' <span style="color:var(--ink-dim)">· '+escapeHtml(n.retiradoPor)+'</span>':''}</li>`).join('')}</ul>
    <label for="conf-coment" style="display:block;font-size:12px;color:var(--ink-dim);margin-bottom:6px;">Comentário (obrigatório)</label>
    <textarea id="conf-coment" rows="3" maxlength="300" placeholder="Ex.: aula encerrada mais cedo" class="lib-textarea">${escapeHtml(state.confirmarTxt||'')}</textarea>
    ${state.confirmarErro ? `<div class="msg err" style="margin-top:8px;">${escapeHtml(state.confirmarErro)}</div>` : ''}
    <div class="btnrow" style="margin-top:14px;">
      <button class="btn secondary" data-action="conf-cancelar">Cancelar</button>
      <button class="btn" data-action="conf-confirmar">${ICO_CHECK} Devolver todos</button>
    </div>
  </div></div>`;
}

function confirmarModalHtml(){
  if(state.confirmarId==='*') return devolverTodosModalHtml();
  const nb = state.notebooks.find(n=>n.id===state.confirmarId);
  if(!nb) return '';
  const pend = nb.status==='pendente';
  return `<div class="tagpop"><div class="box" style="text-align:left;border-color:var(--steel);">
    <h3 style="margin:0 0 4px 0;">Confirmar devolução</h3>
    <p style="margin:0 0 14px 0;color:var(--ink-dim);font-size:13px;">${escapeHtml(nb.nome)} (${escapeHtml(nb.nfcTag||'sem tag')})${nb.retiradoPor?' · '+(pend?'devolvido por ':'com ')+escapeHtml(nb.retiradoPor):''}</p>
    ${pend ? '' : '<div class="msg info" style="margin-bottom:12px;">Este notebook ainda consta como retirado. Ao confirmar, a devolução é registrada pelo administrador.</div>'}
    <label for="conf-coment" style="display:block;font-size:12px;color:var(--ink-dim);margin-bottom:6px;">Comentário ${pend?'(opcional)':'(obrigatório)'}</label>
    <textarea id="conf-coment" rows="3" maxlength="300" placeholder="Ex.: aluno precisou sair mais cedo" class="lib-textarea">${escapeHtml(state.confirmarTxt||'')}</textarea>
    ${state.confirmarErro ? `<div class="msg err" style="margin-top:8px;">${escapeHtml(state.confirmarErro)}</div>` : ''}
    <div class="btnrow" style="margin-top:14px;">
      <button class="btn secondary" data-action="conf-cancelar">Cancelar</button>
      <button class="btn" data-action="conf-confirmar">${ICO_CHECK} Confirmar</button>
    </div>
  </div></div>`;
}

function attachConfirmarHandlers(){
  document.querySelectorAll('[data-devolver-todos]').forEach(btn=>{ btn.onclick = ()=>abrirConfirmar('*'); });
  document.querySelectorAll('[data-confirmar]').forEach(btn=>{ btn.onclick = ()=>abrirConfirmar(btn.dataset.confirmar); });
  const ct = document.getElementById('conf-coment');
  if(ct) ct.oninput = e=>{ state.confirmarTxt = e.target.value; if(state.confirmarErro){ state.confirmarErro = ''; const er = document.querySelector('.tagpop .msg.err'); if(er) er.remove(); } };
  bind('[data-action="conf-cancelar"]', ()=>{ state.confirmarId = null; render(); });
  bind('[data-action="conf-confirmar"]', async ()=>{
    if(state.confirmarId==='*'){
      const comentario = (state.confirmarTxt||'').trim();
      if(!comentario){
        state.confirmarErro = 'Escreva um comentário para devolver todos.'; render();
        const t = document.getElementById('conf-coment'); if(t) t.focus(); return;
      }
      try{
        const r = await apiFetch('/api/notebooks/devolver-todos', { method:'POST', body: JSON.stringify({ comentario }) });
        state.notebooks = r.notebooks;
        (r.movimentos||[]).forEach(mv=>state.movimentos.push(mv));
        state.msg = {where:state.view, type:'ok', text: r.quantidade + ' notebook(s) devolvido(s) e disponíveis.'};
      }catch(e){
        state.msg = {where:state.view, type:'err', text:'Falha ao devolver todos: ' + escapeHtml(e.message)};
      }
      state.confirmarId = null;
      render();
      return;
    }
    const nb = state.notebooks.find(n=>n.id===state.confirmarId);
    const comentario = (state.confirmarTxt||'').trim();
    if(!nb){ state.confirmarId = null; render(); return; }
    if(nb.status!=='pendente' && !comentario){
      state.confirmarErro = 'Escreva um comentário para confirmar.'; render();
      const t = document.getElementById('conf-coment'); if(t) t.focus(); return;
    }
    try{
      const r = await apiFetch('/api/notebooks/' + encodeURIComponent(nb.id) + '/confirmar', { method:'POST', body: JSON.stringify({ comentario }) });
      const idx = state.notebooks.findIndex(n=>n.id===nb.id);
      if(idx>=0) state.notebooks[idx] = r.notebook;
      state.movimentos.push(r.movimento);
      state.msg = {where:state.view, type:'ok', text:'Devolução confirmada: ' + escapeHtml(nb.nome) + ' está disponível.'};
    }catch(e){
      state.msg = {where:state.view, type:'err', text:'Falha ao confirmar: ' + escapeHtml(e.message)};
    }
    state.confirmarId = null;
    render();
  });
}

/* Horário de aula (mesma regra do servidor). Fuso de Brasília.
   Retirada: só nos primeiros 30 min. Devolução: bloqueada no meio da aula, liberada nos últimos 60 min e fora do horário.
   Valores em minutos: [início da aula, fim da retirada, início da devolução, fim da aula] */
const SEMANA_AULA = [1140, 1170, 1290, 1350];   // 19:00, 19:30, 21:30, 22:30
const SABADO_AULA = [570, 600, 720, 780];        // 09:30, 10:00, 12:00, 13:00
const AULAS = { 1:SEMANA_AULA, 2:SEMANA_AULA, 3:SEMANA_AULA, 4:SEMANA_AULA, 5:SEMANA_AULA, 6:SABADO_AULA };
const NOMES_DIA = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const hhmm = min => String(Math.floor(min/60)).padStart(2,'0') + ':' + String(min%60).padStart(2,'0');

function horarioStatus(data){
  const d = data || new Date();
  const p = {};
  new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .formatToParts(d).forEach(x=>{ p[x.type] = x.value; });
  const dia = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday);
  const min = parseInt(p.hour,10)*60 + parseInt(p.minute,10);
  const j = AULAS[dia];
  let fase = 'fora';
  if(j){
    if(min>=j[0] && min<j[1]) fase = 'retirada';
    else if(min>=j[1] && min<j[2]) fase = 'aula';
    else if(min>=j[2] && min<j[3]) fase = 'devolucao';
  }
  let proxima = 'segunda-feira às 19:00';
  for(let i=0;i<=7;i++){
    const dd = (dia+i)%7, jj = AULAS[dd];
    if(!jj) continue;
    if(i===0 && min>=jj[0]) continue;
    proxima = (i===0?'hoje':(i===1?'amanhã':NOMES_DIA[dd])) + ' às ' + hhmm(jj[0]);
    break;
  }
  return {
    fase, proxima,
    retirada: fase==='retirada',
    devolucao: fase==='devolucao' || fase==='fora',
    retiradaAte: j ? hhmm(j[1]) : null,
    devolucaoDe: j ? hhmm(j[2]) : null,
    fimAula: j ? hhmm(j[3]) : null
  };
}

function avisoHorarioHtml(){
  const h = horarioStatus();
  if(h.fase==='retirada') return `<div class="msg ok">Retiradas liberadas até ${h.retiradaAte}. Devoluções a partir de ${h.devolucaoDe}.</div>`;
  if(h.fase==='aula') return `<div class="msg warn">Aula em andamento: só o Admin movimenta. Devoluções liberadas a partir de ${h.devolucaoDe}.</div>`;
  if(h.fase==='devolucao') return `<div class="msg info">Devoluções liberadas até ${h.fimAula}. Retiradas só no início da aula.</div>`;
  return `<div class="msg warn">Fora do horário de aula: retiradas bloqueadas, reabrem ${h.proxima}. Devoluções liberadas.</div>`;
}
