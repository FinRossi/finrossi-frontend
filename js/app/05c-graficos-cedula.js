// js/app/05c-graficos-cedula.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── GRÁFICOS NA IDENTIDADE "CÉDULA" ─────────────────────────────────────────
// Um tema único aplicado a TODOS os gráficos (Chart.js) do app, sem mudar dados,
// tipos de gráfico ou textos das dicas:
//   • áreas e séries secundárias com hachura gravada (as linhas finas de cédula)
//   • linhas finas, só o último ponto (mês atual) marcado
//   • barras finas; roscas de anel fino com respiro entre fatias
//   • grade quase invisível, sem bordas de eixo
//   • dica (tooltip) como etiqueta de valor: filete dourado e valor no numeral de cédula
// A cor de destaque vem de var(--accent) → segue o tema escolhido no plano Patrimônio.

(function(){
  if(typeof Chart === 'undefined') return;

  const css = (nome, padrao) => (getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || padrao);
  const rgba = (hex, a) => {
    const h = String(hex).replace('#','');
    if(!/^[0-9a-f]{6}$/i.test(h)) return hex;
    const n = parseInt(h, 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  };

  // Hachura gravada: linhas diagonais finas sobre um véu leve da mesma cor
  const _hachuras = {};
  function hachura(cor, opac = .55, veu = .07){
    const chave = cor + opac + veu;
    if(_hachuras[chave]) return _hachuras[chave];
    const c = document.createElement('canvas');
    c.width = c.height = 7;
    const g = c.getContext('2d');
    g.fillStyle = rgba(cor, veu); g.fillRect(0, 0, 7, 7);
    g.strokeStyle = rgba(cor, opac); g.lineWidth = 1;
    g.beginPath(); g.moveTo(-1, 8); g.lineTo(8, -1); g.moveTo(-1, 1); g.lineTo(1, -1); g.moveTo(6, 8); g.lineTo(8, 6); g.stroke();
    return (_hachuras[chave] = g.createPattern(c, 'repeat'));
  }
  window.hachuraCedula = hachura;

  const SERIF = "'Bodoni Moda','Didot','Bodoni 72',Georgia,serif";
  const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const SANS  = "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  Chart.defaults.font.family = SANS;
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#8a8680';
  Chart.defaults.animation.duration = 900;
  Chart.defaults.animation.easing = 'easeOutQuart';

  const corDeSerie = ds => {
    const b = typeof ds.borderColor === 'string' ? ds.borderColor : '';
    const f = typeof ds.backgroundColor === 'string' ? ds.backgroundColor : '';
    return b || f;
  };
  const ehSecundaria = ds => /despes|limite|gasto/i.test(ds.label || '');
  const hexDe = (cor, padrao) => {
    if(/^#[0-9a-f]{6}$/i.test(cor)) return cor;
    const m = String(cor).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('') : padrao;
  };

  Chart.register({
    id: 'temaCedula',
    beforeInit(chart){
      const cfg = chart.config, tipo = cfg.type, o = cfg.options || (cfg.options = {});
      const accent = hexDe(css('--accent', '#C8A96E'), '#C8A96E');
      const fundo  = css('--surface', '#1a1a1a');

      // Dica: etiqueta de valor
      o.plugins = o.plugins || {};
      o.plugins.tooltip = Object.assign(o.plugins.tooltip || {}, {
        backgroundColor: 'rgba(12,11,9,.97)',
        borderColor: rgba(accent, .45), borderWidth: 1, cornerRadius: 4,
        padding: { x: 12, y: 10 }, caretSize: 5,
        titleColor: '#8a8680', titleFont: { family: SANS, size: 11, weight: '500' }, titleMarginBottom: 4,
        bodyColor: '#F2EBDD', bodyFont: { family: SERIF, size: 15, weight: '500' },
        usePointStyle: true, boxWidth: 7, boxHeight: 7, boxPadding: 4,
      });
      if(o.plugins.legend && o.plugins.legend.display !== false){
        o.plugins.legend.labels = Object.assign(o.plugins.legend.labels || {}, {
          usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 14,
          color: '#a39d93', font: { family: SANS, size: 12 },
        });
      }

      // Eixos: grade quase invisível, sem borda
      Object.values(o.scales || {}).forEach(s => {
        s.border = Object.assign(s.border || {}, { display: false });
        if(s.grid && s.grid.display !== false){
          s.grid.color = rgba(accent, .07); s.grid.lineWidth = 1; s.grid.drawTicks = false;
        }
        s.ticks = Object.assign(s.ticks || {}, { color: '#77736c', padding: 8, font: { family: SANS, size: 11 } });
        // Eixo de valores: reais compactos em português ("R$ 3,2 mil"), sem rótulos repetidos
        if(s.axis === 'y' || s === o.scales.y){
          s.ticks.maxTicksLimit = 5;
          s.ticks.callback = v => 'R$ ' + COMPACTO.format(v);
        }
      });

      (cfg.data.datasets || []).forEach(ds => {
        if(tipo === 'line'){
          const cor = hexDe(corDeSerie(ds), accent);
          ds.borderColor = cor; ds.borderWidth = 2; ds.tension = .35;
          ds.pointRadius = c => (c.dataIndex === c.dataset.data.length - 1 ? 4 : 0);
          ds.pointHoverRadius = 5;
          ds.pointBackgroundColor = fundo; ds.pointBorderColor = cor; ds.pointBorderWidth = 2;
          ds.pointHoverBackgroundColor = cor;
          if(ds.fill) ds.backgroundColor = hachura(cor, .42, .05);
        }
        if(tipo === 'bar'){
          const cor = hexDe(corDeSerie(ds), accent);
          ds.borderRadius = 3; ds.borderSkipped = 'bottom'; ds.maxBarThickness = 18;
          ds.categoryPercentage = .62; ds.barPercentage = .82;
          if(ehSecundaria(ds)){ ds.backgroundColor = hachura(cor, .8, .12); ds.borderColor = rgba(cor, .9); ds.borderWidth = 1; }
          else { ds.backgroundColor = rgba(cor, .88); ds.borderWidth = 0; }
          ds.hoverBackgroundColor = rgba(cor, 1);
        }
        if(tipo === 'doughnut' || tipo === 'pie'){
          ds.borderColor = fundo; ds.borderWidth = 3; ds.borderRadius = 3; ds.hoverOffset = 6;
        }
      });
      if(tipo === 'doughnut') o.cutout = '76%';
    },
  });
})();
