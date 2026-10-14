// planos/patrimonio/relatorios.js — Relatórios semanais e mensais (exclusivo do plano Patrimônio)
// • Tela "Relatórios": o cliente escolhe semana ou mês e vê a análise do período.
// • "Baixar PDF": gera o arquivo no próprio aparelho (jsPDF + html2canvas, carregados sob demanda)
//   e abre a janela "Salvar como" para escolher a pasta (Chrome/Edge no computador).
//   Nos navegadores sem essa janela, o PDF vai para Downloads ou para o menu de compartilhar.
// Só lê os dados; não grava nada.

const REL_LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];
const REL_MESES_DE = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
let _relTipo = 'mensal';

function relatorioTemAcesso(){
  if(typeof _verComoPlano!=='undefined' && _verComoPlano){
    const cfg = PLANOS_CONFIG[_verComoPlano];
    return !!(cfg && cfg.limites && cfg.limites.relatorios);
  }
  if(typeof isEquipe==='function' && isEquipe()) return true;
  const plano = (typeof _userPlano!=='undefined' && _userPlano) || 'gratuito';
  const cfg = PLANOS_CONFIG[plano];
  return !!(cfg && cfg.limites && cfg.limites.relatorios);
}

// Texto digitado pelo usuário nunca entra cru no HTML
function _relEsc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Datas (sempre no fuso local) ────────────────────────────────────────────
function _relIso(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function _relDia(iso){ const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); }
function _relSoma(iso, dias){ const d = _relDia(iso); d.setDate(d.getDate()+dias); return _relIso(d); }
function _relSegunda(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const w = (x.getDay()+6)%7; x.setDate(x.getDate()-w); return x; }

function _relRotuloSemana(ini, fim){
  const a = _relDia(ini), b = _relDia(fim);
  return a.getMonth()===b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${REL_MESES_DE[b.getMonth()]}`
    : `${a.getDate()} de ${REL_MESES_DE[a.getMonth()]} a ${b.getDate()} de ${REL_MESES_DE[b.getMonth()]}`;
}

// Lista de períodos para o seletor (mais recente primeiro)
function _relPeriodos(tipo){
  const hoje = new Date();
  const lista = [];
  if(tipo === 'semanal'){
    let seg = _relSegunda(hoje);
    for(let i=0;i<12;i++){
      const ini = _relIso(seg), fim = _relSoma(ini, 6);
      lista.push({ ini, fim, rotulo: (i===0?'Esta semana, ':'')+_relRotuloSemana(ini, fim) });
      seg.setDate(seg.getDate()-7);
    }
  } else {
    const meses = new Set();
    for(let i=0;i<12;i++){ const d = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1); meses.add(_relIso(d).slice(0,7)); }
    (pd().lancs||[]).forEach(l => { if(l.data) meses.add(l.data.slice(0,7)); });
    [...meses].sort().reverse().forEach(m => {
      const [y,mo] = m.split('-').map(Number);
      const fim = _relIso(new Date(y, mo, 0));
      lista.push({ ini: m+'-01', fim, rotulo: `${MONTHS[mo-1]} de ${y}` });
    });
  }
  return lista;
}

function _relAnterior(p, tipo){
  if(tipo === 'semanal') return { ini: _relSoma(p.ini, -7), fim: _relSoma(p.fim, -7) };
  const d = _relDia(p.ini); const a = new Date(d.getFullYear(), d.getMonth()-1, 1);
  return { ini: _relIso(a), fim: _relIso(new Date(a.getFullYear(), a.getMonth()+1, 0)) };
}
function _relSeguinte(p, tipo){
  if(tipo === 'semanal') return { ini: _relSoma(p.ini, 7), fim: _relSoma(p.fim, 7) };
  const d = _relDia(p.ini); const a = new Date(d.getFullYear(), d.getMonth()+1, 1);
  return { ini: _relIso(a), fim: _relIso(new Date(a.getFullYear(), a.getMonth()+1, 0)) };
}

// ── Cálculo ─────────────────────────────────────────────────────────────────
function _relTotais(ini, fim){
  const lancs = (pd().lancs||[]).filter(l => l.data && l.data >= ini && l.data <= fim);
  const rec = lancs.filter(l=>l.tipo==='receita').reduce((a,b)=>a+(+b.val||0),0);
  const des = lancs.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+(+b.val||0),0);
  const cats = {};
  lancs.filter(l=>l.tipo==='despesa').forEach(l => { const c = l.cat||'Outros'; cats[c] = (cats[c]||0) + (+l.val||0); });
  return { lancs, rec, des, saldo: rec-des, poupanca: rec>0 ? (rec-des)/rec : null, cats };
}

function calcularRelatorio(p, tipo){
  const atual = _relTotais(p.ini, p.fim);
  const ant = _relAnterior(p, tipo), prev = _relTotais(ant.ini, ant.fim);
  const seg = _relSeguinte(p, tipo);

  const categorias = Object.entries(atual.cats).map(([cat, val]) => {
    const antes = prev.cats[cat] || 0;
    return { cat, val, pct: atual.des>0 ? val/atual.des : 0, antes, variacao: antes>0 ? (val-antes)/antes : null };
  }).sort((a,b)=>b.val-a.val);

  const maiores = atual.lancs.filter(l=>l.tipo==='despesa').sort((a,b)=>b.val-a.val).slice(0,5);

  const invs = pd().invs || [];
  const aportes = invs.filter(i => i.data && i.data >= p.ini && i.data <= p.fim).reduce((a,b)=>a+(+b.val||0),0);
  const carteira = invs.filter(i => !i.data || i.data <= p.fim).reduce((a,b)=>a+(+b.val||0),0);

  const metas = (pd().metas||[]).map(m => {
    const inv = +m.investido||0, alvo = +m.valor||0;
    return { nome: m.nome, investido: inv, valor: alvo, pct: alvo>0 ? Math.min(1, inv/alvo) : 0, falta: Math.max(0, alvo-inv) };
  });

  // Contas fixas do período seguinte (assinaturas ativas + recorrentes)
  const proximos = [];
  const diasNoPeriodo = [];
  for(let d=seg.ini; d<=seg.fim; d=_relSoma(d,1)) diasNoPeriodo.push(d);
  const noDia = (dia) => diasNoPeriodo.find(d => {
    const ultimo = new Date(_relDia(d).getFullYear(), _relDia(d).getMonth()+1, 0).getDate();
    return _relDia(d).getDate() === Math.min(dia, ultimo);
  });
  (pd().assinaturas||[]).filter(a=>a.status!=='pausada').forEach(a => { const d = noDia(+a.dia); if(d) proximos.push({ data:d, nome:a.nome, tipo:'Assinatura', val:+a.val||0 }); });
  (pd().recorrentes||[]).forEach(r => { const d = noDia(+r.dia); if(d) proximos.push({ data:d, nome:r.desc, tipo:'Conta recorrente', val:+r.val||0 }); });
  proximos.sort((a,b)=>a.data.localeCompare(b.data));

  const score = typeof calcularScoreSaude==='function' ? calcularScoreSaude() : null;

  const r = { p, tipo, atual, prev, seg, categorias, maiores, aportes, carteira, metas, proximos, score };
  r.recomendacoes = _relRecomendacoes(r);
  return r;
}

function _relRecomendacoes(r){
  const out = [];
  const { atual, prev, categorias, aportes, proximos } = r;
  const periodo = r.tipo==='semanal' ? 'na semana' : 'no mês';
  if(atual.rec>0 && atual.poupanca!==null){
    if(atual.poupanca < 0) out.push({ tom:'alerta', texto:`As despesas passaram as receitas em ${fmtR(-atual.saldo)} ${periodo}. Vale revisar os maiores gastos abaixo.` });
    else if(atual.poupanca < .1) out.push({ tom:'alerta', texto:`Você guardou ${_relPct(atual.poupanca)} da renda ${periodo}. Uma meta saudável é guardar pelo menos 10%.` });
    else if(atual.poupanca >= .2) out.push({ tom:'ok', texto:`Você guardou ${_relPct(atual.poupanca)} da renda ${periodo}. Acima dos 20% recomendados.` });
  }
  const subiu = categorias.filter(c => c.variacao!==null && c.variacao>=.2 && c.val-c.antes>=50).sort((a,b)=>(b.val-b.antes)-(a.val-a.antes))[0];
  if(subiu) out.push({ tom:'alerta', texto:`Os gastos com ${_relEsc(subiu.cat)} subiram ${_relPct(subiu.variacao)} em relação ao período anterior (mais ${fmtR(subiu.val-subiu.antes)}).` });
  if(prev.des>0 && atual.des>0 && atual.des < prev.des*.9) out.push({ tom:'ok', texto:`Suas despesas caíram ${_relPct((prev.des-atual.des)/prev.des)} em relação ao período anterior.` });
  if(atual.saldo>0 && aportes===0) out.push({ tom:'neutro', texto:`Sobraram ${fmtR(atual.saldo)} e nada foi investido ${periodo}. Investir parte da sobra ajuda a reserva a crescer.` });
  const assin = (pd().assinaturas||[]).filter(a=>a.status!=='pausada').reduce((a,b)=>a+(+b.val||0),0);
  if(r.tipo==='mensal' && atual.rec>0 && assin/atual.rec >= .05) out.push({ tom:'neutro', texto:`Suas assinaturas somam ${fmtR(assin)} por mês, ${_relPct(assin/atual.rec)} da renda. Confira se usa todas.` });
  if(proximos.length) out.push({ tom:'neutro', texto:`No próximo período vencem ${proximos.length} ${proximos.length===1?'conta fixa':'contas fixas'}, somando ${fmtR(proximos.reduce((a,b)=>a+b.val,0))}.` });
  return out.slice(0, 5);
}

function _relPct(v){ return (Math.abs(v)*100).toFixed(Math.abs(v)<.1?1:0).replace('.',',')+'%'; }
function _relVar(atual, antes, inverter){
  if(!antes) return '<span class="rel-var">sem base anterior</span>';
  const v = (atual-antes)/antes;
  if(Math.abs(v) < .005) return '<span class="rel-var">igual ao período anterior</span>';
  const bom = inverter ? v<0 : v>0;
  return `<span class="rel-var ${bom?'bom':'ruim'}">${v>0?'mais':'menos'} ${_relPct(v)} que o período anterior</span>`;
}

// ── Tela ────────────────────────────────────────────────────────────────────
function setRelTipo(tipo){
  _relTipo = tipo;
  document.querySelectorAll('#rel-tipo button').forEach(b => b.classList.toggle('ativo', b.dataset.tipo===tipo));
  _relPreencherPeriodos();
  renderRelatorio();
}

function _relPreencherPeriodos(){
  const sel = document.getElementById('rel-periodo');
  const lista = _relPeriodos(_relTipo);
  sel.innerHTML = lista.map((p,i) => `<option value="${p.ini}|${p.fim}"${i===0?' selected':''}>${p.rotulo}</option>`).join('');
}

function _relPeriodoAtual(){
  const sel = document.getElementById('rel-periodo');
  if(!sel.value) _relPreencherPeriodos();
  const [ini, fim] = sel.value.split('|');
  const opt = sel.options[sel.selectedIndex];
  return { ini, fim, rotulo: opt ? opt.textContent.replace(/^Esta semana, /,'') : '' };
}

function _relDono(){
  const role = window._userRole || (typeof _userRole!=='undefined' ? _userRole : '');
  const nomeCli = document.getElementById('cliente-nome-sb');
  if(role==='cliente' && nomeCli && nomeCli.textContent.trim() && nomeCli.textContent.trim()!=='Minha conta') return nomeCli.textContent.trim();
  return 'Perfil ' + (PNAMES[cp] || cp);
}

function renderRelatorio(){
  const folha = document.getElementById('rel-folha');
  if(!folha) return;
  if(!relatorioTemAcesso()){
    folha.innerHTML = '<div class="card fr-vazio"><b>Relatórios fazem parte do plano Patrimônio</b><p>Receba a análise da sua semana e do seu mês, pronta para salvar em PDF.</p></div>';
    return;
  }
  const sel = document.getElementById('rel-periodo');
  if(!sel.options.length) _relPreencherPeriodos();
  const p = _relPeriodoAtual();
  const r = calcularRelatorio(p, _relTipo);
  folha.innerHTML = _relHTML(r);
}

function _relHTML(r){
  const { atual, prev } = r;
  const titulo = r.tipo==='semanal' ? 'Relatório semanal' : 'Relatório mensal';
  const serie = typeof serieCedula==='function' ? serieCedula(r.p.ini.slice(0,7)) : '';
  const gerado = new Date();
  const geradoTxt = `Gerado em ${gerado.toLocaleDateString('pt-BR')} às ${gerado.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
  const fmtDia = iso => { const d = _relDia(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };

  if(!atual.lancs.length){
    return `<div class="rel-bloco rel-capa">${_relCapa(titulo, r.p.rotulo, serie, geradoTxt)}</div>
      <div class="rel-bloco"><div class="fr-vazio"><b>Nenhum lançamento neste período</b><p>Escolha outro período acima ou registre receitas e despesas para o relatório ter o que analisar.</p></div></div>`;
  }

  const blocos = [];
  blocos.push(`<div class="rel-bloco rel-capa">${_relCapa(titulo, r.p.rotulo, serie, geradoTxt)}</div>`);

  // 1. Resumo
  blocos.push(`<div class="rel-bloco">
    <h3 class="rel-tit">Resumo do período</h3>
    <div class="rel-resumo">
      <div><span>Entradas</span><b class="pos">${fmtR(atual.rec)}</b>${_relVar(atual.rec, prev.rec, false)}</div>
      <div><span>Saídas</span><b>${fmtR(atual.des)}</b>${_relVar(atual.des, prev.des, true)}</div>
      <div><span>Saldo</span><b class="${atual.saldo>=0?'pos':'neg'}">${fmtR(atual.saldo)}</b><span class="rel-var">${atual.lancs.length} ${atual.lancs.length===1?'lançamento':'lançamentos'}</span></div>
      <div><span>Guardado da renda</span><b>${atual.poupanca===null?'sem receita':_relPct(atual.poupanca)}</b><span class="rel-var">${prev.poupanca===null?'sem base anterior':'antes: '+_relPct(prev.poupanca)}</span></div>
    </div>
  </div>`);

  // 2. Recomendações
  if(r.recomendacoes.length){
    blocos.push(`<div class="rel-bloco">
      <h3 class="rel-tit">O que os números dizem</h3>
      <ul class="rel-recs">${r.recomendacoes.map(x => `<li class="${x.tom}">${x.texto}</li>`).join('')}</ul>
    </div>`);
  }

  // 3. Categorias
  if(r.categorias.length){
    blocos.push(`<div class="rel-bloco">
      <h3 class="rel-tit">Gastos por categoria</h3>
      <div class="rel-cats">${r.categorias.map(c => `
        <div class="rel-cat">
          <div class="rel-cat-nome">${_relEsc(c.cat)}</div>
          <div class="rel-cat-barra"><i style="width:${Math.max(2, c.pct*100).toFixed(1)}%"></i></div>
          <div class="rel-cat-val">${fmtR(c.val)}<small>${_relPct(c.pct)}${c.variacao===null||Math.abs(c.variacao)<.005?'':`, ${c.variacao>0?'mais':'menos'} ${_relPct(c.variacao)}`}</small></div>
        </div>`).join('')}
      </div>
    </div>`);
  }

  // 4. Maiores despesas
  if(r.maiores.length){
    blocos.push(`<div class="rel-bloco">
      <h3 class="rel-tit">Maiores despesas</h3>
      ${r.maiores.map(l => `<div class="rel-linha"><span class="rel-data">${fmtDia(l.data)}</span><span class="rel-nome">${_relEsc(l.desc)}<small>${_relEsc(l.cat||'')}</small></span><b>${fmtR(l.val)}</b></div>`).join('')}
    </div>`);
  }

  // 5. Saúde + investimentos
  const sc = r.score;
  blocos.push(`<div class="rel-bloco rel-duas">
    <div>
      <h3 class="rel-tit">Saúde do patrimônio</h3>
      ${sc && !sc.semDados ? `<div class="rel-score"><b>${sc.score}</b><span>de 100, ${_relEsc(String(sc.nivel).toLowerCase())}</span></div>
        ${sc.fatores.map(f => `<div class="rel-fator"><span>${f.label}</span><span>${f.pontos} de ${f.max}</span></div>`).join('')}
        <p class="rel-nota">Score calculado com os dados de hoje.</p>`
      : '<p class="rel-nota">Ainda não há dados suficientes para calcular o score.</p>'}
    </div>
    <div>
      <h3 class="rel-tit">Investimentos</h3>
      <div class="rel-fator"><span>Aplicado no período</span><b>${fmtR(r.aportes)}</b></div>
      <div class="rel-fator"><span>Total da carteira</span><b>${fmtR(r.carteira)}</b></div>
      ${atual.saldo>0 ? `<div class="rel-fator"><span>Parte da sobra investida</span><b>${_relPct(Math.min(1, r.aportes/atual.saldo))}</b></div>` : ''}
    </div>
  </div>`);

  // 6. Metas
  if(r.metas.length){
    blocos.push(`<div class="rel-bloco">
      <h3 class="rel-tit">Metas</h3>
      ${r.metas.map(m => `<div class="rel-meta">
        <div class="rel-meta-top"><span>${_relEsc(m.nome)}</span><span>${fmtR(m.investido)} de ${fmtR(m.valor)}</span></div>
        <div class="rel-cat-barra"><i style="width:${(m.pct*100).toFixed(1)}%"></i></div>
        <div class="rel-meta-sub">${m.falta>0?`Faltam ${fmtR(m.falta)}`:'Meta atingida'}</div>
      </div>`).join('')}
    </div>`);
  }

  // 7. Próximos vencimentos
  blocos.push(`<div class="rel-bloco">
    <h3 class="rel-tit">Contas fixas do próximo período</h3>
    ${r.proximos.length ? r.proximos.map(x => `<div class="rel-linha"><span class="rel-data">${fmtDia(x.data)}</span><span class="rel-nome">${_relEsc(x.nome)}<small>${x.tipo}</small></span><b>${fmtR(x.val)}</b></div>`).join('')
      : '<p class="rel-nota">Nenhuma assinatura ou conta recorrente vence no próximo período.</p>'}
  </div>`);

  blocos.push(`<div class="rel-bloco rel-rodape">FinRossi. Relatório gerado a partir dos lançamentos registrados no app. ${geradoTxt}.</div>`);
  return blocos.join('');
}

function _relCapa(titulo, rotulo, serie, geradoTxt){
  return `<div class="rel-roseta">${typeof rosetaGuillocheSVG==='function'?rosetaGuillocheSVG():''}</div>
    <div class="rel-capa-txt">
      ${serie?`<div class="rel-serie">${serie}</div>`:''}
      <div class="rel-capa-tipo">${titulo}</div>
      <div class="rel-capa-periodo">${_relEsc(rotulo)}</div>
      <div class="rel-capa-dono">${_relEsc(_relDono())}</div>
    </div>`;
}

// ── PDF ─────────────────────────────────────────────────────────────────────
function _relCarregarLibs(){
  return REL_LIBS.reduce((p, url) => p.then(() => new Promise((res, rej) => {
    if(document.querySelector(`script[src="${url}"]`)){ res(); return; }
    const s = document.createElement('script');
    s.src = url; s.onload = res;
    s.onerror = () => rej(new Error('Não foi possível preparar o PDF. Verifique a internet e tente de novo.'));
    document.head.appendChild(s);
  })), Promise.resolve());
}

function _relNomeArquivo(){
  const p = _relPeriodoAtual();
  return _relTipo==='semanal' ? `FinRossi-relatorio-semanal-${p.ini}.pdf` : `FinRossi-relatorio-mensal-${p.ini.slice(0,7)}.pdf`;
}

function _relStatus(txt, cls){
  const el = document.getElementById('msg-rel');
  if(el){ el.textContent = txt || ''; el.className = 'msg' + (cls?' '+cls:''); }
}

function _relCorRGB(cor){
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = cor; const hex = c.fillStyle;
  if(hex.startsWith('#')) return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
  const m = hex.match(/\d+/g); return m ? m.slice(0,3).map(Number) : [24,24,24];
}

// O html2canvas não entende cores modernas (color-mix vira "color(srgb …)");
// fixa cada cor como rgba() direto no elemento antes de fotografar
const _REL_PROPS_COR = ['color','background-color','border-top-color','border-right-color','border-bottom-color','border-left-color','outline-color','text-decoration-color','fill','stroke','box-shadow','background-image'];
function _relCorSimples(valor){
  return valor.replace(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.e-]+))?\)/g, (_, r, g, b, a) =>
    `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, ${a===undefined?1:+a})`)
    .replace(/oklch\([^)]*\)|oklab\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)/g, 'rgba(0,0,0,0)');
}
function _relFixarCores(raiz){
  [raiz, ...raiz.querySelectorAll('*')].forEach(el => {
    const cs = getComputedStyle(el);
    _REL_PROPS_COR.forEach(p => {
      const v = cs.getPropertyValue(p);
      if(v && /color\(|oklch|oklab|lab\(|lch\(/.test(v)) el.style.setProperty(p, _relCorSimples(v), 'important');
    });
  });
}

async function gerarRelatorioPDF(){
  await _relCarregarLibs();
  renderRelatorio();
  const css = getComputedStyle(document.documentElement);
  const fundo = (css.getPropertyValue('--bg') || '#0f0f0f').trim();
  const corFundo = _relCorRGB(fundo);

  // Monta uma cópia com largura fixa de folha (igual no celular e no computador)
  const palco = document.createElement('div');
  palco.className = 'rel-folha rel-pdf';
  palco.style.cssText = `position:fixed;left:-10000px;top:0;width:760px;background:${fundo}`;
  palco.innerHTML = document.getElementById('rel-folha').innerHTML;
  document.body.appendChild(palco);
  try{
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    _relFixarCores(palco);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit:'pt', format:'a4', compress:true });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    const margem = 30, larg = W - margem*2, rodape = 26;
    const pintarFundo = () => { pdf.setFillColor(...corFundo); pdf.rect(0, 0, W, H, 'F'); };
    pintarFundo();
    let y = margem;
    for(const bloco of palco.querySelectorAll('.rel-bloco')){
      const canvas = await html2canvas(bloco, { scale: 2, backgroundColor: fundo, logging: false, useCORS: true });
      const h = canvas.height * (larg / canvas.width);
      if(y + h > H - margem - rodape && y > margem){ pdf.addPage(); pintarFundo(); y = margem; }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margem, y, larg, Math.min(h, H - margem*2 - rodape));
      y += h + 10;
    }
    const total = pdf.getNumberOfPages();
    for(let i=1;i<=total;i++){
      pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(140,134,128);
      pdf.text(`FinRossi, página ${i} de ${total}`, W/2, H - 16, { align:'center' });
    }
    return pdf.output('blob');
  } finally {
    palco.remove();
  }
}

async function baixarRelatorioPDF(){
  if(!relatorioTemAcesso()) return;
  const nome = _relNomeArquivo();
  const botoes = document.querySelectorAll('.rel-btn-pdf');

  // A janela "Salvar como" precisa abrir logo no clique (antes de gerar o arquivo)
  let destino = null;
  if(window.showSaveFilePicker && window.self === window.top){
    try{
      destino = await window.showSaveFilePicker({ suggestedName: nome, types: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }] });
    }catch(e){
      if(e && e.name === 'AbortError') return;   // o cliente fechou a janela
      destino = null;
    }
  }

  botoes.forEach(b => b.disabled = true);
  _relStatus('Gerando o PDF…');
  try{
    const blob = await gerarRelatorioPDF();
    if(destino){
      const w = await destino.createWritable(); await w.write(blob); await w.close();
      _relStatus(`Relatório salvo: ${destino.name}`, 'ok');
      return;
    }
    const arquivo = new File([blob], nome, { type: 'application/pdf' });
    const toque = window.matchMedia && matchMedia('(pointer:coarse)').matches;
    if(toque && navigator.canShare && navigator.canShare({ files: [arquivo] })){
      try{ await navigator.share({ files: [arquivo], title: nome }); _relStatus('Relatório pronto.', 'ok'); return; }
      catch(e){ if(e && e.name === 'AbortError'){ _relStatus(''); return; } }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    _relStatus(`Relatório baixado: ${nome}`, 'ok');
  }catch(e){
    console.error('[Relatório]', e);
    _relStatus(e && e.message ? e.message : 'Não consegui gerar o PDF. Tente de novo.', 'err');
  }finally{
    botoes.forEach(b => b.disabled = false);
  }
}
