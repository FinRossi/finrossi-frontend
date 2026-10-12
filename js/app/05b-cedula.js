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
