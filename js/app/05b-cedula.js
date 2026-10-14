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
let _cedConta = null;
function cedContando(){ return !!_cedConta; }
function contarValorCedula(id, alvo, ms){
  const el = document.getElementById(id);
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches){ if(el) el.innerHTML = valorCedula(alvo); return; }
  if(_cedConta){ _cedConta.alvo = alvo; _cedConta.id = id; return; }
  _cedConta = { t0: performance.now(), dur: ms || 1400, alvo, id };
  const passo = agora => {
    const c = _cedConta; if(!c) return;
    const k = Math.min(1, (agora - c.t0) / c.dur);
    const suave = 1 - Math.pow(1 - k, 3);
    const alvoEl = document.getElementById(c.id);
    if(alvoEl) alvoEl.innerHTML = valorCedula(k < 1 ? Math.round(c.alvo * suave * 100) / 100 : c.alvo);
    if(k < 1) requestAnimationFrame(passo); else _cedConta = null;
  };
  requestAnimationFrame(passo);
}

// Valor monetário com o "R$" pequeno, como numa cédula
function valorCedula(v){
  const txt = fmtR(v).replace(/^R\$\s?/, '');
  return `<span class="ced-moeda">R$</span><span class="ced-num">${txt}</span>`;
}

// "Número de série" discreto do painel: FR-MMAA (mês exibido)
function serieCedula(mes){
  const [yr, mo] = mes.split('-');
  return `FR-${mo}${yr.slice(2)}`;
}
