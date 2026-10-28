// js/app/05b-cedula.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── IDENTIDADE "CÉDULA" ─────────────────────────────────────────────────────
// Roseta de guilhoché (a gravura de segurança das cédulas), gerada por curvas de
// espirógrafo. É o elemento marcante do dashboard: aparece só atrás do patrimônio.
// Usa currentColor → acompanha var(--accent), inclusive a cor escolhida no plano Patrimônio.

let _rosetaCache = null;

function _curvaGuilloche(R, r, d, voltas, passos, escala){
  // Hipotrocoide: x=(R−r)cos t + d·cos((R−r)/r·t), y=(R−r)sin t − d·sin((R−r)/r·t)
  const k = (R - r) / r;
  let p = '';
  for(let i = 0; i <= passos; i++){
    const t = (i / passos) * Math.PI * 2 * voltas;
    const x = ((R - r) * Math.cos(t) + d * Math.cos(k * t)) * escala;
    const y = ((R - r) * Math.sin(t) - d * Math.sin(k * t)) * escala;
    p += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return p;
}

function rosetaGuillocheSVG(){
  if(_rosetaCache) return _rosetaCache;
  // Três camadas sobrepostas, como as matrizes de gravura de uma cédula
  const camadas = [
    { R: 96, r: 37, d: 66, voltas: 37, op: .55 },   // rosa externa (37 pétalas)
    { R: 74, r: 23, d: 41, voltas: 23, op: .40 },   // trama intermediária
    { R: 50, r: 13, d: 22, voltas: 13, op: .55 },   // miolo
  ];
  const caminhos = camadas.map(c =>
    `<path d="${_curvaGuilloche(c.R, c.r, c.d, c.voltas, c.voltas * 100, 1)}" opacity="${c.op}"/>`
  ).join('');
  // Anéis finos que emolduram a roseta
  const aneis = [162, 166, 108].map((raio, i) =>
    `<circle r="${raio}" opacity="${i === 2 ? .25 : .45}"/>`
  ).join('');
  _rosetaCache = `<svg class="ced-roseta" viewBox="-170 -170 340 340" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width=".45">${caminhos}${aneis}</g>
  </svg>`;
  return _rosetaCache;
}

// Roseta "viva" do dashboard: as mesmas camadas, cada uma num <svg> próprio para girar
// devagar e em sentidos opostos (o celular gira a peça pronta, sem redesenhar a curva)
let _rosetaVivaCache = null;
function rosetaGuillocheViva(){
  if(_rosetaVivaCache) return _rosetaVivaCache;
  const camadas = [
    { R: 96, r: 37, d: 66, voltas: 37, op: .55 },
    { R: 74, r: 23, d: 41, voltas: 23, op: .40 },
    { R: 50, r: 13, d: 22, voltas: 13, op: .55 },
  ];
  const svg = (conteudo, n) => `<svg class="ced-camada ced-camada-${n}" viewBox="-170 -170 340 340" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width=".45">${conteudo}</g></svg>`;
  const aneis = [162, 166, 108].map((raio, i) => `<circle r="${raio}" opacity="${i === 2 ? .25 : .45}"/>`).join('');
  _rosetaVivaCache = `<div class="ced-roseta ced-roseta-viva" aria-hidden="true">
    ${svg(aneis, 0)}
    ${camadas.map((c, i) => svg(`<path d="${_curvaGuilloche(c.R, c.r, c.d, c.voltas, c.voltas * 100, 1)}" opacity="${c.op}"/>`, i + 1)).join('')}
  </div>`;
  return _rosetaVivaCache;
}

// Valor sobe de zero até o número real (só na primeira abertura; respeita "reduzir movimento").
// O dashboard é redesenhado algumas vezes ao abrir (dados locais, depois a nuvem): a contagem
// continua no elemento novo, pelo id, e mira sempre o valor mais recente.
// Vários valores podem contar ao mesmo tempo (patrimônio, receitas, despesas, saldo), cada um
// do valor anterior ("de") até o novo ("alvo").
const _cedContas = {};
let _cedLoop = false;
function _cedSemMovimento(){ return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
function _cedInterp(c, agora){
  const k = Math.min(1, (agora - c.t0) / c.dur);
  const suave = 1 - Math.pow(1 - k, 3);
  return { k, v: k < 1 ? Math.round((c.de + (c.alvo - c.de) * suave) * 100) / 100 : c.alvo };
}
function cedContando(id){ return id ? !!_cedContas[id] : Object.keys(_cedContas).length > 0; }
function cedValorAtual(id){ const c = _cedContas[id]; return c ? _cedInterp(c, performance.now()).v : null; }
function contarValorCedula(id, alvo, ms, de){
  if(_cedSemMovimento()){ const el = document.getElementById(id); if(el) el.innerHTML = valorCedula(alvo); return; }
  if(_cedContas[id]){ _cedContas[id].alvo = alvo; return; }
  _cedContas[id] = { t0: performance.now(), dur: ms || 1400, de: de || 0, alvo };
  if(_cedLoop) return;
  _cedLoop = true;
  const passo = agora => {
    Object.keys(_cedContas).forEach(i => {
      const { k, v } = _cedInterp(_cedContas[i], agora);
      const el = document.getElementById(i);
      if(el) el.innerHTML = valorCedula(v);
      if(k >= 1) delete _cedContas[i];
    });
    if(Object.keys(_cedContas).length) requestAnimationFrame(passo); else _cedLoop = false;
  };
  requestAnimationFrame(passo);
}

// Últimos valores que o cliente VIU no dashboard (por perfil e mês). Quando ele volta ao
// dashboard depois de lançar algo — ou abre o app de novo — os números andam do que ele viu
// até o valor atual, com um selo da diferença: a sensação de ver o dinheiro se mexer.
function cedVistos(chave){
  try{ return (JSON.parse(localStorage.getItem('fin_ced_vistos') || '{}'))[chave] || null; }catch(e){ return null; }
}
function cedGuardarVistos(chave, valores){
  try{
    const tudo = JSON.parse(localStorage.getItem('fin_ced_vistos') || '{}');
    tudo[chave] = valores;
    localStorage.setItem('fin_ced_vistos', JSON.stringify(tudo));
  }catch(e){}
}
// Selo "+ R$ 150,00" que aparece ao lado do valor e some sozinho (sobrevive aos redesenhos)
const _cedDeltas = {};
const CED_DELTA_MS = 3600;
function cedMarcarDelta(id, diferenca, bomSubir){
  if(!diferenca || _cedSemMovimento()) return;
  const bom = bomSubir ? diferenca > 0 : diferenca < 0;
  _cedDeltas[id] = { txt: `${diferenca > 0 ? '+' : '−'} ${fmtR(Math.abs(diferenca))}`, cls: bom ? 'pos' : 'neg', ate: performance.now() + CED_DELTA_MS };
}
function cedDeltaHTML(id){
  const d = _cedDeltas[id];
  if(!d) return '';
  const resta = d.ate - performance.now();
  if(resta <= 0){ delete _cedDeltas[id]; return ''; }
  return `<span class="ced-delta ${d.cls}" style="animation-delay:-${Math.round(CED_DELTA_MS - resta)}ms">${d.txt}</span>`;
}

// Valor monetário com o "R$" pequeno, como numa cédula
function valorCedula(v){
  const txt = fmtNumero(v, 2);   // em R$: o mesmo que fmtR sem o "R$ " (ex.: "-1.234,56")
  return `<span class="ced-moeda">${simboloMoeda()}</span><span class="ced-num">${txt}</span>`;
}

// "Número de série" discreto do painel: FR-MMAA (mês exibido)
function serieCedula(mes){
  const [yr, mo] = mes.split('-');
  return `FR-${mo}${yr.slice(2)}`;
}

// Clique/toque no painel do patrimônio: passa a faixa de brilho na hora
function brilharPainel(){
  const b = document.querySelector('#dash-kpi-cards .ced-brilho');
  if(!b) return;
  b.classList.remove('extra');
  void b.offsetWidth;            // reinicia a animação mesmo com cliques seguidos
  b.classList.add('extra');
  clearTimeout(b._fimBrilho);
  b._fimBrilho = setTimeout(() => b.classList.remove('extra'), 1200);
}
document.addEventListener('click', e => {
  if(e.target.closest && e.target.closest('#dash-kpi-cards .ced-painel')) brilharPainel();
});
