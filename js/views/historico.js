/* Tela: Histórico (busca, filtro e exportar Word/PDF) */

function tipoLabel(t){ return t==='saida' ? 'Saída' : (t==='pendente' ? 'Devolução pendente' : 'Entrada'); }

function historicoFiltrado(){
  const q = state.hq.trim().toLowerCase();
  return state.movimentos.slice().reverse().filter(m=>{
    if(state.htipo!=='todos' && m.tipo!==state.htipo) return false;
    if(!q) return true;
    return [m.notebookNome,nomePessoa(m.pessoa),m.nfcTag,m.comentario].some(v=>(v||'').toString().toLowerCase().includes(q));
  });
}

function historicoRows(){
  const list = historicoFiltrado();
  if(!list.length) return '<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:24px;">Nenhum registro encontrado.</td></tr>';
  return list.map(m=>`
    <tr>
      <td class="mono">${fmtDate(m.timestamp)}</td>
      <td>${escapeHtml(m.notebookNome)}</td>
      <td><span class="tipo ${m.tipo}">${tipoLabel(m.tipo)}</span></td>
      <td><span class="${nomePessoa(m.pessoa)==='Admin forçado'?'forcado ':''}" style="white-space:nowrap;">${escapeHtml(nomePessoa(m.pessoa))}</span>${m.comentario?`<div class="mono" style="white-space:normal;margin-top:3px;">“${escapeHtml(m.comentario)}”</div>`:''}</td>
      <td class="mono">${escapeHtml(m.nfcTag||'—')}</td>
    </tr>`).join('');
}

function renderHistorico(){
  return `
    <h2 class="title">Histórico</h2>
    <p class="sub">Todas as saídas e devoluções registradas.</p>
    ${state.movimentos.length ? `
    <div class="toolbar">
      <input id="hq" type="search" placeholder="Buscar notebook ou pessoa…" value="${escapeAttr(state.hq)}">
      <select id="htipo">
        ${[['todos','Todos'],['saida','Saídas'],['pendente','Pendentes'],['entrada','Entradas']].map(o=>`<option value="${o[0]}" ${state.htipo===o[0]?'selected':''}>${o[1]}</option>`).join('')}
      </select>
      ${exportarMenuHtml('hist','Exportar',false)}
    </div>
    <table>
      <thead><tr><th>Data/hora</th><th>Notebook</th><th>Tipo</th><th>Responsável</th><th>Tag</th></tr></thead>
      <tbody id="hbody">${historicoRows()}</tbody>
    </table>` : '<div class="empty">Nenhuma movimentação registrada ainda.</div>'}
  `;
}

/* ---------- Exportar Word (.docx de verdade, sem bibliotecas) ---------- */
const CRC_TAB = (()=>{ const t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
function crc32(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c = CRC_TAB[(c^b[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }

/* .docx é um zip; aqui o zip é montado sem compressão (suficiente e válido) */
function zipSemCompressao(arquivos){
  const enc = new TextEncoder(), partes = [], central = [];
  const d = new Date();
  const hora = (d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  const data = ((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  let pos = 0;
  arquivos.forEach(a=>{
    const nome = enc.encode(a.nome), dados = enc.encode(a.conteudo), crc = crc32(dados);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(8,0,true);
    lh.setUint16(10,hora,true); lh.setUint16(12,data,true); lh.setUint32(14,crc,true);
    lh.setUint32(18,dados.length,true); lh.setUint32(22,dados.length,true); lh.setUint16(26,nome.length,true); lh.setUint16(28,0,true);
    partes.push(new Uint8Array(lh.buffer), nome, dados);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint16(10,0,true);
    ch.setUint16(12,hora,true); ch.setUint16(14,data,true); ch.setUint32(16,crc,true);
    ch.setUint32(20,dados.length,true); ch.setUint32(24,dados.length,true); ch.setUint16(28,nome.length,true);
    ch.setUint32(42,pos,true);
    central.push(new Uint8Array(ch.buffer), nome);
    pos += 30 + nome.length + dados.length;
  });
  const tamCentral = central.reduce((t,x)=>t+x.length,0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0,0x06054b50,true); fim.setUint16(8,arquivos.length,true); fim.setUint16(10,arquivos.length,true);
  fim.setUint32(12,tamCentral,true); fim.setUint32(16,pos,true);
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

function xmlEsc(v){
  return (v==null?'':String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function wRun(texto, o){
  o = o || {};
  const rpr = (o.bold?'<w:b/>':'') + (o.italic?'<w:i/>':'') + (o.color?`<w:color w:val="${o.color}"/>`:'') + `<w:sz w:val="${o.sz||20}"/>`;
  return `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${rpr}</w:rPr><w:t xml:space="preserve">${xmlEsc(texto)}</w:t></w:r>`;
}
function wPar(runs, espaco){ return `<w:p><w:pPr><w:spacing w:before="0" w:after="${espaco||0}"/></w:pPr>${runs}</w:p>`; }
function wCel(largura, paragrafos, fill){
  return `<w:tc><w:tcPr><w:tcW w:w="${largura}" w:type="dxa"/>${fill?`<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`:''}</w:tcPr>${paragrafos}</w:tc>`;
}

function exportarWord(todos){
  const lista = todos===true ? state.movimentos.slice().reverse() : historicoFiltrado();
  const W = [2000, 3400, 2400, 5200, 2398];   // soma 15398 (A4 em paisagem, margens de 0,5")
  const cor = {saida:'B36B00', pendente:'1F6AA5', entrada:'1E7A46'};
  const cab = ['Data/hora','Notebook','Tipo','Responsável','Tag'];
  const linhaCab = `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${cab.map((t,i)=>wCel(W[i], wPar(wRun(t,{bold:true})), 'E6E6E6')).join('')}</w:tr>`;
  const linhas = lista.map(m=>{
    const nome = nomePessoa(m.pessoa), forcado = nome==='Admin forçado';
    const resp = wPar(wRun(nome, forcado?{bold:true,color:'D32F2F'}:{})) + (m.comentario ? wPar(wRun('“'+m.comentario+'”',{italic:true,color:'555555'})) : '');
    return `<w:tr><w:trPr><w:cantSplit/></w:trPr>`
      + wCel(W[0], wPar(wRun(fmtDate(m.timestamp))))
      + wCel(W[1], wPar(wRun(m.notebookNome)))
      + wCel(W[2], wPar(wRun(tipoLabel(m.tipo),{bold:true,color:cor[m.tipo]||'000000'})))
      + wCel(W[3], resp)
      + wCel(W[4], wPar(wRun(m.nfcTag||'—')))
      + `</w:tr>`;
  }).join('');
  const borda = ['top','left','bottom','right','insideH','insideV'].map(l=>`<w:${l} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`).join('');
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${wPar(wRun('ATLAS - Histórico',{bold:true,sz:36}), 40)}
${wPar(wRun('Controle de Notebooks · gerado em '+fmtDate(Date.now())+' · '+lista.length+' registro(s)',{color:'555555'}), 160)}
<w:tbl><w:tblPr><w:tblW w:w="${W.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblBorders>${borda}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>
<w:tblGrid>${W.map(x=>`<w:gridCol w:w="${x}"/>`).join('')}</w:tblGrid>${linhaCab}${linhas}</w:tbl>
<w:p/><w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;
  const blob = zipSemCompressao([
    { nome:'[Content_Types].xml', conteudo:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { nome:'_rels/.rels', conteudo:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { nome:'word/document.xml', conteudo:documento }
  ]);
  entregarArquivo(blob, 'historico-notebooks-' + new Date().toISOString().slice(0,10) + '.docx');
}

/* Entrega o arquivo ao usuário: prévia do Claude (permissão de download), iPhone/iPad (abre/compartilha) ou download normal */
async function entregarArquivo(blob, nome){
  try{
    if(window.claude && window.claude.use){
      const d = await window.claude.use('downloads');
      if(d){ await d.save({filename:nome, data:blob}); return; }
    }
  }catch(e){ /* segue para os outros métodos */ }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const url = URL.createObjectURL(blob);
  if(ios){
    try{
      const f = new File([blob], nome, {type:blob.type});
      if(navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], title:nome}); return; }
    }catch(e){ if(e && e.name==='AbortError') return; }
    // plano B no iPhone: abre o arquivo numa aba (de lá: compartilhar > imprimir/salvar)
    if(!window.open(url,'_blank')) location.href = url;
    setTimeout(()=>URL.revokeObjectURL(url), 120000);
    return;
  }
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
}

/* ---------- Exportar PDF (gerado no navegador, sem bibliotecas) ---------- */
const PDF_W = 841.89, PDF_H = 595.28, PDF_M = 36;
const PDF_COLS = [100, 170, 120, 260, 83.89];          // soma = 769.89 (largura útil)
const PDF_COR = {saida:[0.70,0.42,0], pendente:[0.12,0.42,0.65], entrada:[0.12,0.48,0.27], vermelho:[0.83,0.18,0.18], cinza:[0.33,0.33,0.33], preto:[0,0,0]};

/* texto -> bytes WinAnsi (Helvetica padrão do PDF) em hexadecimal */
function pdfHex(t){
  const esp = {'“':0x93,'”':0x94,'‘':0x91,'’':0x92,'—':0x97,'–':0x96,'•':0x95,'…':0x85,'↳':0x3E};
  let h = '';
  for(const ch of String(t==null?'':t)){
    const c = ch.codePointAt(0);
    let b = esp[ch] || ((c>=32 && c<=126) || (c>=160 && c<=255) ? c : 63);
    h += b.toString(16).padStart(2,'0');
  }
  return '<' + h + '>';
}
const PDF_MEDE = document.createElement('canvas').getContext('2d');
function pdfLargura(t, fonte, tam){
  PDF_MEDE.font = (fonte==='B'?'bold ':(fonte==='I'?'italic ':'')) + tam + 'px Helvetica, Arial, "Liberation Sans", sans-serif';
  return PDF_MEDE.measureText(t).width;
}
function pdfQuebrar(texto, fonte, tam, larg){
  const linhas = []; let atual = '';
  String(texto==null?'':texto).split(/\s+/).filter(Boolean).forEach(pal=>{
    let tent = atual ? atual+' '+pal : pal;
    if(pdfLargura(tent,fonte,tam) <= larg){ atual = tent; return; }
    if(atual){ linhas.push(atual); atual = ''; }
    while(pdfLargura(pal,fonte,tam) > larg && pal.length>1){        // palavra maior que a coluna
      let n = pal.length; while(n>1 && pdfLargura(pal.slice(0,n),fonte,tam) > larg) n--;
      linhas.push(pal.slice(0,n)); pal = pal.slice(n);
    }
    atual = pal;
  });
  if(atual || !linhas.length) linhas.push(atual);
  return linhas;
}

function exportarPdf(todos){
  const lista = todos===true ? state.movimentos.slice().reverse() : historicoFiltrado();
  const TAM = 9, ALT = 12, PAD = 4, TOPO_TAB = PDF_M + 52, FUNDO = PDF_H - PDF_M - 14;
  const cab = ['Data/hora','Notebook','Tipo','Responsável','Tag'];
  const paginas = [];   // cada página: lista de comandos
  let cmds, y;
  const cor = (c,tipo)=> c.map(v=>v.toFixed(3)).join(' ') + (tipo==='f'?' rg':' RG');
  const texto = (x, yTopo, t, fonte, c)=>`BT ${cor(c,'f')} /F${fonte==='B'?'2':(fonte==='I'?'3':'1')} ${TAM} Tf ${x.toFixed(2)} ${(PDF_H-yTopo).toFixed(2)} Td ${pdfHex(t)} Tj ET`;
  const novaPagina = ()=>{
    cmds = []; paginas.push(cmds); y = PDF_M;
    if(paginas.length===1){
      cmds.push(`BT 0 g /F2 18 Tf ${PDF_M} ${(PDF_H-PDF_M-14).toFixed(2)} Td ${pdfHex('ATLAS - Histórico')} Tj ET`);
      cmds.push(`BT 0.33 g /F1 9 Tf ${PDF_M} ${(PDF_H-PDF_M-30).toFixed(2)} Td ${pdfHex('Controle de Notebooks · gerado em '+fmtDate(Date.now())+' · '+lista.length+' registro(s)')} Tj ET`);
      y = TOPO_TAB;
    }
    // cabeçalho da tabela (repete em todas as páginas)
    const hh = ALT + 2*PAD; let x = PDF_M;
    PDF_COLS.forEach((w,i)=>{
      cmds.push(`0.9 g ${x.toFixed(2)} ${(PDF_H-y-hh).toFixed(2)} ${w} ${hh} re f`);
      cmds.push(`0.6 G 0.5 w ${x.toFixed(2)} ${(PDF_H-y-hh).toFixed(2)} ${w} ${hh} re S`);
      cmds.push(texto(x+PAD, y+PAD+ALT-3, cab[i], 'B', PDF_COR.preto));
      x += w;
    });
    y += hh;
  };
  novaPagina();
  lista.forEach(m=>{
    const nome = nomePessoa(m.pessoa), forcado = nome==='Admin forçado';
    const wTxt = i => PDF_COLS[i] - 2*PAD;
    const cel = [
      [{t:fmtDate(m.timestamp), f:'N', c:PDF_COR.preto}],
      pdfQuebrar(m.notebookNome,'N',TAM,wTxt(1)).map(t=>({t, f:'N', c:PDF_COR.preto})),
      [{t:tipoLabel(m.tipo), f:'B', c:PDF_COR[m.tipo]||PDF_COR.preto}],
      pdfQuebrar(nome,forcado?'B':'N',TAM,wTxt(3)).map(t=>({t, f:forcado?'B':'N', c:forcado?PDF_COR.vermelho:PDF_COR.preto}))
        .concat(m.comentario ? pdfQuebrar('“'+m.comentario+'”','I',TAM,wTxt(3)).map(t=>({t, f:'I', c:PDF_COR.cinza})) : []),
      pdfQuebrar(m.nfcTag||'—','N',TAM,wTxt(4)).map(t=>({t, f:'N', c:PDF_COR.preto}))
    ];
    const nl = Math.max(...cel.map(c=>c.length)), alt = nl*ALT + 2*PAD;
    if(y + alt > FUNDO) novaPagina();
    let x = PDF_M;
    cel.forEach((linhas,i)=>{
      cmds.push(`0.6 G 0.5 w ${x.toFixed(2)} ${(PDF_H-y-alt).toFixed(2)} ${PDF_COLS[i]} ${alt} re S`);
      linhas.forEach((l,k)=>cmds.push(texto(x+PAD, y+PAD+ALT-3+k*ALT, l.t, l.f, l.c)));
      x += PDF_COLS[i];
    });
    y += alt;
  });
  // rodapé com numeração
  paginas.forEach((c,i)=>c.push(`BT 0.45 g /F1 8 Tf ${(PDF_W-PDF_M-70).toFixed(2)} ${(PDF_M-12).toFixed(2)} Td ${pdfHex('Página '+(i+1)+' de '+paginas.length)} Tj ET`));

  // monta o arquivo PDF
  const objs = [];   // índice = número do objeto - 1
  const fonts = '<< /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >>';
  const kids = paginas.map((_,i)=>`${6+i*2} 0 R`).join(' ');
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`);
  ['Helvetica','Helvetica-Bold','Helvetica-Oblique'].forEach(f=>objs.push(`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
  paginas.forEach((c,i)=>{
    const fluxo = c.join('\n');
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] /Resources ${fonts} /Contents ${7+i*2} 0 R >>`);
    objs.push(`<< /Length ${fluxo.length} >>\nstream\n${fluxo}\nendstream`);
  });
  let saida = '%PDF-1.4\n'; const pos = [];
  objs.forEach((o,i)=>{ pos.push(saida.length); saida += `${i+1} 0 obj\n${o}\nendobj\n`; });
  const xref = saida.length;
  saida += `xref\n0 ${objs.length+1}\n0000000000 65535 f \n` + pos.map(p=>String(p).padStart(10,'0')+' 00000 n \n').join('') +
           `trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(saida.length); for(let i=0;i<saida.length;i++) bytes[i] = saida.charCodeAt(i) & 255;
  entregarArquivo(new Blob([bytes], {type:'application/pdf'}), 'historico-notebooks-' + new Date().toISOString().slice(0,10) + '.pdf');
}

/* Botão único "Exportar" com menu: Word ou PDF */
function exportarMenuHtml(id, rotulo, todos){
  const aberto = state.exportMenu===id;
  return `<span class="exportwrap"><button class="btn secondary small" data-exportar-menu="${id}" aria-haspopup="true" aria-expanded="${aberto}">${rotulo} ▾</button>
    ${aberto ? `<div class="exportmenu"><button data-exportar-tipo="docx" data-todos="${todos?1:0}">Word (.docx)</button><button data-exportar-tipo="pdf" data-todos="${todos?1:0}">PDF</button></div>` : ''}</span>`;
}
function attachExportHandlers(){
  document.querySelectorAll('[data-exportar-menu]').forEach(btn=>{
    btn.onclick = e=>{ e.stopPropagation(); state.exportMenu = state.exportMenu===btn.dataset.exportarMenu ? null : btn.dataset.exportarMenu; render(); };
  });
  document.querySelectorAll('[data-exportar-tipo]').forEach(btn=>{
    btn.onclick = e=>{
      e.stopPropagation();
      const todos = btn.dataset.todos==='1';
      state.exportMenu = null; render();
      if(btn.dataset.exportarTipo==='pdf') exportarPdf(todos); else exportarWord(todos);
    };
  });
  if(state.exportMenu && !window.__exportFecha){
    window.__exportFecha = true;
    document.addEventListener('click', ()=>{ if(state.exportMenu){ state.exportMenu = null; render(); } });
  }
}

function attachHistoricoHandlers(){
  const hqEl = document.getElementById('hq');
  if(hqEl) hqEl.oninput = e=>{ state.hq = e.target.value; document.getElementById('hbody').innerHTML = historicoRows(); };
  const htEl = document.getElementById('htipo');
  if(htEl) htEl.onchange = e=>{ state.htipo = e.target.value; document.getElementById('hbody').innerHTML = historicoRows(); };
  attachExportHandlers();
}
