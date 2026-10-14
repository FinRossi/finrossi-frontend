// ═══════════════════════════════════════════════════════════════════════════
// PLANO PATRIMÔNIO — inteligência financeira
// Este arquivo reúne tudo que é exclusivo do plano Patrimônio.
// Depende de funções globais já definidas no index.html: pd(), curMes(), fmtR()
// ═══════════════════════════════════════════════════════════════════════════

// ─── SCORE DE SAÚDE FINANCEIRA ───────────────────────────────────────────────
function calcularScoreSaude(){
  const lancs = pd().lancs || [];
  const invs  = pd().invs  || [];
  const hoje  = new Date();

  // Sem nenhum lançamento ainda — não faz sentido calcular nada, e muito
  // menos dar pontuação de brinde. Mostra estado "sem dados" de verdade.
  if(lancs.length === 0){
    return { score:null, nivel:'Sem dados', cor:'#666', semDados:true, fatores:[] };
  }

  // Últimos 6 meses (incluindo o atual)
  const meses = [];
  for(let i=5;i>=0;i--){
    const dt = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
    meses.push(dt.toISOString().slice(0,7));
  }
  const porMes = meses.map(m=>{
    const doMes = lancs.filter(l=>l.data && l.data.startsWith(m));
    const rec = doMes.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
    const des = doMes.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
    return {mes:m, receita:rec, despesa:des};
  });
  const atual = porMes[porMes.length-1];
  const totalInv = invs.reduce((a,b)=>a+b.val,0);

  // 1) Taxa de poupança este mês (peso 30) — só pontua se teve receita registrada de verdade
  const taxaPoupanca = atual.receita>0 ? (atual.receita-atual.despesa)/atual.receita : null;
  let pPoupanca = 0;
  if(taxaPoupanca!==null){
    if(taxaPoupanca>=0.3) pPoupanca=30;
    else if(taxaPoupanca>=0.2) pPoupanca=25;
    else if(taxaPoupanca>=0.1) pPoupanca=18;
    else if(taxaPoupanca>=0) pPoupanca=10;
  }

  // 2) Reserva de emergência: patrimônio investido ÷ média de despesas mensais (peso 25)
  const despesasValidas = porMes.map(m=>m.despesa).filter(v=>v>0);
  const mediaDespesa = despesasValidas.length ? despesasValidas.reduce((a,b)=>a+b,0)/despesasValidas.length : 0;
  const mesesReserva = mediaDespesa>0 ? totalInv/mediaDespesa : 0;
  let pReserva = 0; // sem despesas registradas ainda, não dá pra medir reserva — fica em 0, não em 3
  if(despesasValidas.length>0){
    pReserva = 3;
    if(mesesReserva>=6) pReserva=25;
    else if(mesesReserva>=3) pReserva=18;
    else if(mesesReserva>=1) pReserva=10;
  }

  // 3) Estabilidade de gastos: quão previsíveis são as despesas mês a mês (peso 20)
  let pEstabilidade = 0; // sem dados suficientes ainda — não dá crédito neutro por padrão
  if(despesasValidas.length>=3){
    const media = despesasValidas.reduce((a,b)=>a+b,0)/despesasValidas.length;
    const variancia = despesasValidas.reduce((a,b)=>a+Math.pow(b-media,2),0)/despesasValidas.length;
    const coefVar = media>0 ? Math.sqrt(variancia)/media : 1;
    if(coefVar<=0.15) pEstabilidade=20;
    else if(coefVar<=0.3) pEstabilidade=14;
    else if(coefVar<=0.5) pEstabilidade=8;
    else pEstabilidade=3;
  } else if(despesasValidas.length>0){
    pEstabilidade=5; // tem algum dado, mas pouco pra confiar — parcial, não neutro
  }

  // 4) Hábito de investir (peso 15)
  let pInvestimento = 0;
  if(totalInv>0 && invs.length>=3) pInvestimento=15;
  else if(totalInv>0) pInvestimento=10;

  // 5) Consistência de registro este mês (peso 10)
  const diasComLanc = new Set(lancs.filter(l=>l.data && l.data.startsWith(curMes())).map(l=>l.data)).size;
  const diasDoMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).getDate();
  const pConsistencia = Math.min(10, Math.round((diasComLanc/diasDoMes)*10));

  const score = pPoupanca+pReserva+pEstabilidade+pInvestimento+pConsistencia;

  let nivel, cor;
  if(score>=80){nivel='Excelente';cor='#4ade80';}
  else if(score>=60){nivel='Bom';cor='#8ac97e';}
  else if(score>=40){nivel='Regular';cor='#fbbf24';}
  else if(score>=20){nivel='Atenção';cor='#f97316';}
  else {nivel='Crítico';cor='#f87171';}

  return {
    score, nivel, cor, semDados:false,
    fatores: [
      {label:'Taxa de poupança',        pontos:pPoupanca,      max:30, valor:taxaPoupanca!==null?`${(taxaPoupanca*100).toFixed(1)}%`:'sem receita este mês', desc:'Quanto sobra da renda depois das despesas'},
      {label:'Reserva de emergência',   pontos:pReserva,       max:25, valor:despesasValidas.length>0?`${mesesReserva.toFixed(1)} meses`:'sem despesas registradas', desc:'Quantos meses de despesas seu patrimônio cobre'},
      {label:'Estabilidade de gastos',  pontos:pEstabilidade,  max:20, valor:despesasValidas.length>=3?`${(porMes.length)} meses analisados`:'poucos dados ainda', desc:'Quão previsíveis são seus gastos mês a mês'},
      {label:'Hábito de investir',      pontos:pInvestimento,  max:15, valor:fmtR(totalInv),                              desc:'Se você investe com regularidade'},
      {label:'Consistência de registro',pontos:pConsistencia,  max:10, valor:`${diasComLanc} dias este mês`,              desc:'Quantos dias você registrou lançamentos'},
    ]
  };
}

// ─── INSIGHTS AUTOMÁTICOS ────────────────────────────────────────────────────
function gerarInsights(){
  const lancs = pd().lancs || [];
  const invs  = pd().invs  || [];
  const assinaturas = pd().assinaturas || [];
  const hoje  = new Date();
  const mesAtual = curMes();
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1).toISOString().slice(0,7);

  if(lancs.length === 0) return { semDados:true, insights:[] };

  const doMesAtual    = lancs.filter(l=>l.data && l.data.startsWith(mesAtual));
  const doMesAnterior = lancs.filter(l=>l.data && l.data.startsWith(mesAnterior));

  const recAtual = doMesAtual.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const desAtual = doMesAtual.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
  const desAnt   = doMesAnterior.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);

  const insights = [];

  // 1) Despesas em alta ou em queda vs mês anterior
  if(desAnt > 0 && desAtual > 0){
    const variacao = ((desAtual-desAnt)/desAnt)*100;
    if(variacao >= 20){
      insights.push({tipo:'atencao', icone:'⚠️', titulo:'Gastos em alta', texto:`Suas despesas subiram ${variacao.toFixed(0)}% em relação ao mês passado (${fmtR(desAnt)} → ${fmtR(desAtual)}).`});
    } else if(variacao <= -15){
      insights.push({tipo:'positivo', icone:'🎉', titulo:'Economia em alta', texto:`Você reduziu suas despesas em ${Math.abs(variacao).toFixed(0)}% em relação ao mês passado. Parabéns!`});
    }
  }

  // 2) Categoria que mais pesa no mês
  const porCategoria = {};
  doMesAtual.filter(l=>l.tipo==='despesa').forEach(l=>{ porCategoria[l.cat] = (porCategoria[l.cat]||0)+l.val; });
  const categorias = Object.entries(porCategoria).sort((a,b)=>b[1]-a[1]);
  if(categorias.length>0 && desAtual>0){
    const [maiorCat, maiorVal] = categorias[0];
    const pct = (maiorVal/desAtual)*100;
    if(pct>=30){
      insights.push({tipo:'neutro', icone:'📊', titulo:`${maiorCat} domina seus gastos`, texto:`${maiorCat} representa ${pct.toFixed(0)}% de tudo que você gastou este mês (${fmtR(maiorVal)}).`});
    }
  }

  // 3) Taxa de poupança do mês
  if(recAtual > 0){
    const taxa = ((recAtual-desAtual)/recAtual)*100;
    if(taxa < 0){
      insights.push({tipo:'atencao', icone:'🔴', titulo:'Gastando mais do que ganha', texto:`Este mês suas despesas (${fmtR(desAtual)}) já ultrapassaram sua receita (${fmtR(recAtual)}).`});
    } else if(taxa >= 30){
      insights.push({tipo:'positivo', icone:'💪', titulo:'Ótima taxa de poupança', texto:`Você está guardando ${taxa.toFixed(0)}% da sua renda este mês. Continue assim!`});
    }
  }

  // 4) Sem aporte novo este mês (só avisa se já tem histórico de investir)
  if(invs.length > 0){
    const investiuEsteMes = invs.some(i=>i.data && i.data.startsWith(mesAtual));
    if(!investiuEsteMes){
      insights.push({tipo:'neutro', icone:'💰', titulo:'Nenhum aporte este mês', texto:'Você ainda não registrou nenhum investimento novo este mês.'});
    }
  }

  // 5) Assinaturas pesando no orçamento
  const totalAssinaturas = assinaturas.reduce((a,b)=>a+(b.val||0),0);
  if(desAtual > 0 && totalAssinaturas > 0){
    const pctAssin = (totalAssinaturas/desAtual)*100;
    if(pctAssin >= 15){
      insights.push({tipo:'atencao', icone:'📱', titulo:'Assinaturas pesando no bolso', texto:`Suas assinaturas somam ${fmtR(totalAssinaturas)}/mês — ${pctAssin.toFixed(0)}% do seu gasto total.`});
    }
  }

  // 6) Poucos registros este mês (só depois do dia 10, pra não alarmar cedo demais)
  const diasComLanc = new Set(doMesAtual.map(l=>l.data)).size;
  if(hoje.getDate()>=10 && diasComLanc < hoje.getDate()*0.3){
    insights.push({tipo:'neutro', icone:'📝', titulo:'Poucos registros este mês', texto:`Você só lançou dados em ${diasComLanc} dias este mês. Registrar mais vezes deixa seus insights mais precisos.`});
  }

  if(insights.length===0){
    insights.push({tipo:'positivo', icone:'✅', titulo:'Tudo em ordem', texto:'Não identificamos nenhum ponto de atenção nas suas finanças este mês.'});
  }

  return { semDados:false, insights: insights.slice(0,4) }; // no máximo 4, pra não poluir a tela
}

function corInsight(tipo){
  if(tipo==='positivo') return '#4ade80';
  if(tipo==='atencao') return '#f97316';
  return 'var(--accent)';
}

// ─── DESAFIOS (gamificação) ──────────────────────────────────────────────────
function gerarDesafios(){
  const lancs = pd().lancs || [];
  const invs  = pd().invs  || [];
  const hoje  = new Date();
  const mesAtual = curMes();

  const doMesAtual = lancs.filter(l=>l.data && l.data.startsWith(mesAtual));
  const recAtual = doMesAtual.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const desAtual = doMesAtual.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
  const diasComLanc = new Set(doMesAtual.map(l=>l.data)).size;
  const totalInv = invs.reduce((a,b)=>a+b.val,0);
  const mesesComInv = new Set(invs.filter(i=>i.data).map(i=>i.data.slice(0,7))).size;
  const s = calcularScoreSaude();

  // Reserva de emergência em meses (mesma lógica do Score)
  const meses = [];
  for(let i=5;i>=0;i--){
    const dt = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
    meses.push(dt.toISOString().slice(0,7));
  }
  const despesasValidas = meses
    .map(m=>lancs.filter(l=>l.data && l.data.startsWith(m) && l.tipo==='despesa').reduce((a,b)=>a+b.val,0))
    .filter(v=>v>0);
  const mediaDespesa = despesasValidas.length ? despesasValidas.reduce((a,b)=>a+b,0)/despesasValidas.length : 0;
  const mesesReserva = mediaDespesa>0 ? totalInv/mediaDespesa : 0;

  return [
    {id:'primeiro-passo', icone:'🎯', titulo:'Primeiro Passo',        desc:'Registre seu primeiro lançamento',                     pontos:10, concluido: lancs.length>0},
    {id:'sequencia-7',    icone:'🔥', titulo:'Sequência de 7 dias',   desc:'Lance dados em 7 dias diferentes este mês',            pontos:30, concluido: diasComLanc>=7},
    {id:'guardiao-renda', icone:'🛡️', titulo:'Guardião da Renda',     desc:'Alcance 20% de taxa de poupança este mês',             pontos:25, concluido: recAtual>0 && ((recAtual-desAtual)/recAtual)>=0.2},
    {id:'primeiro-inv',   icone:'🌱', titulo:'Primeiro Investimento', desc:'Registre seu primeiro investimento',                   pontos:20, concluido: invs.length>0},
    {id:'invest-freq',    icone:'📈', titulo:'Investidor Frequente',  desc:'Invista em 3 meses diferentes',                        pontos:40, concluido: mesesComInv>=3},
    {id:'reserva',        icone:'🏦', titulo:'Reserva de Emergência', desc:'Acumule 3+ meses de despesas investidos',              pontos:50, concluido: mesesReserva>=3},
    {id:'mes-impecavel',  icone:'⭐', titulo:'Mês Impecável',         desc:'Alcance um Score de 80+ este mês',                     pontos:60, concluido: !s.semDados && s.score>=80},
    {id:'sem-estouro',    icone:'✅', titulo:'Sem Estouro no Orçamento', desc:'Não gaste mais do que ganhou este mês',              pontos:15, concluido: recAtual>0 && desAtual<=recAtual},
  ];
}

function calcularNivel(pontos){
  if(pontos>=500) return {nome:'Diamante', icone:'💎', cor:'#60a5fa'};
  if(pontos>=300) return {nome:'Ouro',     icone:'🥇', cor:'#fbbf24'};
  if(pontos>=150) return {nome:'Prata',    icone:'🥈', cor:'#cbd5e1'};
  if(pontos>=50)  return {nome:'Bronze',   icone:'🥉', cor:'#d97706'};
  return                 {nome:'Iniciante',icone:'🌱', cor:'#4ade80'};
}

// ─── RENDERIZAÇÃO DAS ABAS ────────────────────────────────────────────────────
let _patrimonioTab = 'score';

function trocarAbaPatrimonio(tab){
  _patrimonioTab = tab;
  renderScore();
}

// Ícones de linha da identidade FinRossi (substituem os emojis na área Patrimônio)
const PT_ICO = {
  score:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  insights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>',
  desafios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"/></svg>',
  projecoes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  alerta:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  positivo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  neutro:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  check:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
};

function ptVazio(icone, titulo, texto){
  return `
    <div class="pt-card pt-vazio">
      <div class="pt-vazio-ico">${PT_ICO[icone]}</div>
      <div class="pt-titulo">${titulo}</div>
      <p>${texto}</p>
    </div>`;
}

function renderScoreTabHTML(){
  const r = calcularScoreSaude();

  if(r.semDados){
    return ptVazio('score','Ainda não temos <em>dados suficientes</em>','Registre suas receitas e despesas do mês pra começar a calcular a saúde do seu patrimônio.');
  }

  const raio = 54, circ = 2*Math.PI*raio;
  const offset = circ - (r.score/100)*circ;

  return `
    <div class="pt-card">
      <div class="pt-r" aria-hidden="true">R</div>
      <div class="pt-score">
        <div>
          <div class="pt-anel">
            <svg width="190" height="190" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="${raio}" fill="none" stroke="var(--surface3)" stroke-width="6"/>
              <circle cx="60" cy="60" r="${raio}" fill="none" stroke="${r.cor}" stroke-width="6" stroke-linecap="round"
                stroke-dasharray="${circ}" stroke-dashoffset="${offset}" style="transition:stroke-dashoffset .6s ease"/>
            </svg>
            <div class="pt-anel-centro">
              <div class="pt-anel-num pt-num" style="color:${r.cor}">${r.score}</div>
              <div class="pt-anel-de">de 100</div>
            </div>
          </div>
          <div class="pt-nivel">
            <strong style="color:${r.cor}">${r.nivel}</strong>
            <span>Sua saúde financeira está ${r.nivel.toLowerCase()} este mês</span>
          </div>
        </div>
        <div>
          <div class="pt-eyebrow">O que compõe seu score</div>
          <div class="pt-fatores">
            ${r.fatores.map(f=>`
              <div>
                <div class="pt-fator-linha">
                  <span class="pt-fator-nome">${f.label}</span>
                  <span class="pt-fator-pts pt-num"><b>${f.pontos}</b> / ${f.max}</span>
                </div>
                <div class="pt-barra"><i style="width:${(f.pontos/f.max*100).toFixed(0)}%"></i></div>
                <div class="pt-fator-desc">${f.desc} · ${f.valor}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function renderInsightsTabHTML(){
  const r = gerarInsights();
  if(r.semDados || !r.insights.length){
    return ptVazio('insights','Sem <em>insights</em> ainda','Registre alguns lançamentos pra começarmos a analisar seus dados.');
  }
  const icoTipo = t => t==='positivo' ? PT_ICO.positivo : t==='atencao' ? PT_ICO.alerta : PT_ICO.neutro;
  return `
    <div class="pt-card">
      <div class="pt-card-cab">
        <div>
          <div class="pt-eyebrow">Este mês</div>
          <div class="pt-titulo">Insights <em>automáticos</em></div>
        </div>
      </div>
      <div class="pt-insights">
        ${r.insights.map(i=>`
          <div class="pt-insight" style="--pt-cor:${corInsight(i.tipo)}">
            <div class="pt-insight-ico">${icoTipo(i.tipo)}</div>
            <div style="min-width:0">
              <h4>${i.titulo}</h4>
              <p>${i.texto}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderDesafiosTabHTML(){
  const desafios = gerarDesafios();
  const pontosGanhos = desafios.filter(d=>d.concluido).reduce((a,b)=>a+b.pontos,0);
  const pontosTotais = desafios.reduce((a,b)=>a+b.pontos,0);
  const nivel = calcularNivel(pontosGanhos);
  const concluidos = desafios.filter(d=>d.concluido).length;

  return `
    <div class="pt-card">
      <div class="pt-r" aria-hidden="true">R</div>
      <div class="pt-nivel-card">
        <div class="pt-medalha" style="--pt-cor:${nivel.cor}"><span>${nivel.nome.charAt(0)}</span></div>
        <div class="pt-nivel-info">
          <div class="pt-eyebrow">Nível ${nivel.nome}</div>
          <div class="pt-pontos pt-num">${pontosGanhos}<small>pts · ${concluidos}/${desafios.length} desafios</small></div>
          <div class="pt-barra" style="margin-top:14px"><i style="width:${pontosTotais>0?(pontosGanhos/pontosTotais*100).toFixed(0):0}%;background:${nivel.cor}"></i></div>
        </div>
      </div>
    </div>

    <div class="pt-card">
      <div class="pt-card-cab">
        <div>
          <div class="pt-eyebrow">Gamificação</div>
          <div class="pt-titulo">Seus <em>desafios</em></div>
        </div>
      </div>
      <div class="pt-desafios">
        ${desafios.map(d=>`
          <div class="pt-desafio${d.concluido?' feito':''}">
            <div class="pt-check">${d.concluido?PT_ICO.check:''}</div>
            <div style="min-width:0">
              <h4>${d.titulo}</h4>
              <p>${d.desc}</p>
            </div>
            <div class="pt-desafio-pts pt-num">+${d.pontos}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ─── PROJEÇÕES FUTURAS ────────────────────────────────────────────────────────
let _projecaoTaxa = 0.8; // % ao mês — mesmo padrão usado na Renda Passiva (CDI)

function atualizarProjecaoTaxa(valor){
  _projecaoTaxa = parseFloat(valor) || 0;
  renderScore();
}

function calcularProjecoes(){
  const lancs = pd().lancs || [];
  const invs  = pd().invs  || [];
  const hoje  = new Date();

  if(lancs.length === 0) return { semDados:true };

  const meses = [];
  for(let i=5;i>=0;i--){
    const dt = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
    meses.push(dt.toISOString().slice(0,7));
  }
  const saldosMensais = meses.map(m=>{
    const doMes = lancs.filter(l=>l.data && l.data.startsWith(m));
    const rec = doMes.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
    const des = doMes.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
    return rec-des;
  });
  const mediaPoupanca = saldosMensais.reduce((a,b)=>a+b,0) / saldosMensais.length;
  const patrimonioAtual = invs.reduce((a,b)=>a+b.val,0);
  const taxa = _projecaoTaxa/100;
  const aporteMensal = Math.max(0, mediaPoupanca); // nunca projeta aporte negativo

  const trajetoria = [patrimonioAtual];
  let valor = patrimonioAtual;
  for(let i=1;i<=60;i++){
    valor = valor*(1+taxa) + aporteMensal;
    trajetoria.push(valor);
  }

  return {
    semDados:false,
    patrimonioAtual, mediaPoupanca, aporteMensal, taxa:_projecaoTaxa, trajetoria,
    marcos: [
      {label:'Em 6 meses', valor:trajetoria[6]},
      {label:'Em 1 ano',   valor:trajetoria[12]},
      {label:'Em 2 anos',  valor:trajetoria[24]},
      {label:'Em 5 anos',  valor:trajetoria[60]},
    ]
  };
}

function renderProjecoesTabHTML(){
  const r = calcularProjecoes();
  if(r.semDados){
    return ptVazio('projecoes','Ainda não temos <em>dados suficientes</em>','Registre seus lançamentos pra começarmos a projetar seu futuro financeiro.');
  }

  return `
    <div class="pt-card">
      <div class="pt-card-cab">
        <div>
          <div class="pt-eyebrow">Próximos 5 anos</div>
          <div class="pt-titulo">Sua trajetória <em>patrimonial</em></div>
        </div>
      </div>
      <div class="pt-param">
        <div class="field">
          <label>Taxa de retorno esperada (%/mês)</label>
          <input type="number" value="${r.taxa}" step="0.1" min="0" max="5" oninput="atualizarProjecaoTaxa(this.value)">
        </div>
        <div class="pt-param-nota">
          Baseado na sua média de poupança dos últimos 6 meses: <strong class="pt-num">${fmtR(r.mediaPoupanca)}</strong>/mês
          ${r.mediaPoupanca<=0?' <span style="color:#f97316">(negativa — a projeção considera aporte zero até você voltar a poupar)</span>':''}
        </div>
      </div>
      <div class="chart-wrap" style="height:220px;margin:20px 0 6px"><canvas id="c-projecao"></canvas></div>
      <div class="pt-marcos">
        ${r.marcos.map(m=>`
          <div class="pt-marco">
            <small>${m.label}</small>
            <strong class="pt-num">${fmtR(m.valor)}</strong>
          </div>`).join('')}
      </div>
    </div>`;
}

function desenharGraficoProjecao(){
  const r = calcularProjecoes();
  if(r.semDados) return;
  if(typeof destroyChart==='function') destroyChart('projecao');
  const ctx = document.getElementById('c-projecao');
  if(!ctx || typeof Chart==='undefined') return;
  charts['projecao'] = new Chart(ctx, {
    type:'line',
    data:{
      labels: r.trajetoria.map((_,i)=>i),
      datasets:[{
        data: r.trajetoria,
        borderColor:(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#C8A96E'),
        backgroundColor:(typeof hexParaRgba==='function'?hexParaRgba(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#C8A96E',.12):'rgba(200,169,110,.12)'),
        fill:true, tension:.3, pointRadius:0, borderWidth:2,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:(ctx)=>fmtR(ctx.raw)}} },
      scales:{
        x:{ display:false },
        y:{ ticks:{color:'#666',font:{size:10},callback:v=>'R$'+(v/1000).toFixed(0)+'k'}, grid:{color:'rgba(255,255,255,.04)'}, border:{display:false} }
      }
    }
  });
}

function renderScore(){
  try{
    const el = document.getElementById('score-content');
    if(!el) return;

    const abas = [['score','Score'],['insights','Insights'],['desafios','Desafios'],['projecoes','Projeções']];
    const tabBar = `
      <div class="pt-abas" role="tablist">
        ${abas.map(([id,label])=>`<button class="pt-aba${_patrimonioTab===id?' ativa':''}" role="tab" aria-selected="${_patrimonioTab===id}" onclick="trocarAbaPatrimonio('${id}')">${PT_ICO[id]}${label}</button>`).join('')}
      </div>`;

    let conteudo = '';
    if(_patrimonioTab==='insights') conteudo = renderInsightsTabHTML();
    else if(_patrimonioTab==='desafios') conteudo = renderDesafiosTabHTML();
    else if(_patrimonioTab==='projecoes') conteudo = renderProjecoesTabHTML();
    else conteudo = renderScoreTabHTML();

    el.innerHTML = tabBar + conteudo;

    if(_patrimonioTab==='projecoes') desenharGraficoProjecao();
  }catch(e){console.error('renderScore error:',e);}
}

// ─── Próximas funcionalidades do Patrimônio entram aqui, uma de cada vez: ───
// 4) Evolução patrimonial
// 5) Planejamento para liberdade financeira
// 6) Recomendações inteligentes

// ─── PERSONALIZAÇÃO DO DASHBOARD (arrastar, esconder, salvar na nuvem) ───────
function patrimonioTemAcesso(){ return planoLibera('personalizacao'); }

let _dashPersonalizando = false;
let _dashConfigCarregada = false;
let _dragWidgetId = null;

function initPersonalizacaoDashboard(){
  const wrap = document.getElementById('dash-personalizar-wrap');
  if(!wrap) return;
  const permitido = patrimonioTemAcesso();
  wrap.style.display = permitido ? 'block' : 'none';
  // Uma vez por perfil (trocar Pessoal/FinRossi aplica a organização do outro)
  if(!permitido || _dashConfigCarregada === cp) return;
  _dashConfigCarregada = cp;
  carregarConfigDashboard();
}

function toggleDashPersonalizar(){
  _dashPersonalizando = !_dashPersonalizando;
  const grid = document.getElementById('dash-widgets-grid');
  const btn = document.getElementById('btn-dash-personalizar');
  if(grid) grid.classList.toggle('dash-editing', _dashPersonalizando);
  if(btn){
    // guarda o ícone do botão na primeira vez e troca só o texto
    if(!btn.dataset.ico){ const s = btn.querySelector('svg'); btn.dataset.ico = s ? s.outerHTML : ''; }
    btn.innerHTML = btn.dataset.ico + (_dashPersonalizando ? 'Concluir personalização' : 'Personalizar dashboard');
  }

  if(_dashPersonalizando){
    ativarControlesWidgets();
  } else {
    removerControlesWidgets();
    salvarConfigDashboard();
  }
}

function ativarControlesWidgets(){
  const ICON_EYE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const ICON_EYE_OFF = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const ICON_HANDLE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/></svg>`;

  document.querySelectorAll('.dash-widget').forEach(w=>{
    w.draggable = true;
    w.addEventListener('dragstart', dashWidgetDragStart);
    w.addEventListener('dragend', dashWidgetDragEnd);
    w.addEventListener('dragover', dashWidgetDragOver);
    w.addEventListener('dragleave', dashWidgetDragLeave);
    w.addEventListener('drop', dashWidgetDrop);
    if(!w.querySelector('.dash-widget-controls')){
      const widgetId = w.dataset.widgetId;
      const oculto = w.classList.contains('dash-widget-oculto');
      const controls = document.createElement('div');
      controls.className = 'dash-widget-controls';
      controls.innerHTML = `
        <div class="dash-widget-eye" onclick="event.stopPropagation();toggleWidgetVisibilidade('${widgetId}')" title="Mostrar/ocultar este card">${oculto?ICON_EYE_OFF:ICON_EYE}</div>
        <div class="dash-widget-handle" title="Arraste para reordenar">${ICON_HANDLE}</div>`;
      w.appendChild(controls);
    }
  });
}

function removerControlesWidgets(){
  document.querySelectorAll('.dash-widget').forEach(w=>{
    w.draggable = false;
    w.removeEventListener('dragstart', dashWidgetDragStart);
    w.removeEventListener('dragend', dashWidgetDragEnd);
    w.removeEventListener('dragover', dashWidgetDragOver);
    w.removeEventListener('dragleave', dashWidgetDragLeave);
    w.removeEventListener('drop', dashWidgetDrop);
    const controls = w.querySelector('.dash-widget-controls');
    if(controls) controls.remove();
  });
}

function toggleWidgetVisibilidade(widgetId){
  const el = document.querySelector(`.dash-widget[data-widget-id="${widgetId}"]`);
  if(!el) return;
  el.classList.toggle('dash-widget-oculto');
  const eyeBtn = el.querySelector('.dash-widget-eye');
  if(eyeBtn){
    const oculto = el.classList.contains('dash-widget-oculto');
    eyeBtn.innerHTML = oculto
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
}

function dashWidgetDragStart(){
  _dragWidgetId = this.dataset.widgetId;
  this.classList.add('dragging');
}
function dashWidgetDragEnd(){
  this.classList.remove('dragging');
  document.querySelectorAll('.dash-widget.drag-over').forEach(el=>el.classList.remove('drag-over'));
}
function dashWidgetDragOver(e){
  e.preventDefault();
  if(this.dataset.widgetId !== _dragWidgetId) this.classList.add('drag-over');
}
function dashWidgetDragLeave(){
  this.classList.remove('drag-over');
}
function dashWidgetDrop(e){
  e.preventDefault();
  this.classList.remove('drag-over');
  const targetId = this.dataset.widgetId;
  if(targetId === _dragWidgetId) return;
  const grid = document.getElementById('dash-widgets-grid');
  if(!grid) return;
  const dragEl = grid.querySelector(`[data-widget-id="${_dragWidgetId}"]`);
  if(!dragEl) return;
  const allWidgets = [...grid.querySelectorAll('.dash-widget')];
  const dragIdx = allWidgets.indexOf(dragEl);
  const targetIdx = allWidgets.indexOf(this);
  if(dragIdx < targetIdx) this.after(dragEl);
  else this.before(dragEl);
}

async function salvarConfigDashboard(){
  const grid = document.getElementById('dash-widgets-grid');
  if(!grid) return;
  const widgets = [...grid.querySelectorAll('.dash-widget')];
  const config = {
    ordem: widgets.map(w=>w.dataset.widgetId),
    ocultos: widgets.filter(w=>w.classList.contains('dash-widget-oculto')).map(w=>w.dataset.widgetId)
  };
  // Por perfil (Pessoal e FinRossi não dividem mais a mesma organização); a nuvem fica com
  // js/app/36-preferencias.js (usuarios/<uid>/preferencias/perfis/<perfil>/layout)
  localStorage.setItem('fin_dash_config_' + cp, JSON.stringify(config));
  if(typeof prefSalvarLayout === 'function') prefSalvarLayout(config);
}

async function carregarConfigDashboard(){
  // Aplica na hora o que está no aparelho (antes esperava até 4 s pelo banco).
  // A versão da nuvem chega por js/app/36-preferencias.js e é aplicada quando vier.
  let config = null;
  try{
    const raw = localStorage.getItem('fin_dash_config_' + cp) || localStorage.getItem('fin_dash_config');
    if(raw) config = JSON.parse(raw);
  }catch(e){}
  aplicarConfigDashboard(config);
}

function aplicarConfigDashboard(config){
  const grid = document.getElementById('dash-widgets-grid');
  if(!grid) return;
  // Guarda a ordem original na primeira vez; sem organização salva, volta a ela
  if(!grid._ordemPadrao) grid._ordemPadrao = [...grid.querySelectorAll('.dash-widget')].map(w => w.dataset.widgetId);
  if(!config) config = { ordem: grid._ordemPadrao, ocultos: [] };
  if(Array.isArray(config.ordem)){
    config.ordem.forEach(id=>{
      const el = grid.querySelector(`[data-widget-id="${id}"]`);
      if(el) grid.appendChild(el);
    });
  }
  document.querySelectorAll('.dash-widget').forEach(w=>{
    const oculto = (config.ocultos||[]).includes(w.dataset.widgetId);
    w.classList.toggle('dash-widget-oculto', oculto);
  });
}

// ─── SISTEMA DE CORES (paleta + color picker) — exclusivo Patrimônio ────────
function hexParaHSL(hex){
  let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if(max===min){ h=s=0; }
  else{
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      case b: h=(r-g)/d+4; break;
    }
    h/=6;
  }
  return [h*360, s*100, l*100];
}

function hslParaHex(h,s,l){
  h/=360; s/=100; l/=100;
  let r,g,b;
  if(s===0){ r=g=b=l; }
  else{
    const hue2rgb=(p,q,t)=>{
      if(t<0) t+=1;
      if(t>1) t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    const q = l<0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    r = hue2rgb(p,q,h+1/3);
    g = hue2rgb(p,q,h);
    b = hue2rgb(p,q,h-1/3);
  }
  const toHex = v => Math.round(v*255).toString(16).padStart(2,'0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function ajustarLuminosidade(hex, deltaPontos){
  const [h,s,l] = hexParaHSL(hex);
  const novoL = Math.max(4, Math.min(96, l+deltaPontos));
  return hslParaHex(h, s, novoL);
}

function hexParaRgba(hex, alpha){
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function gerarTonalidades(hexBase){
  return {
    accent: hexBase,
    accentHover: ajustarLuminosidade(hexBase, 9),
    accentLight: ajustarLuminosidade(hexBase, 22),
    accentDark: ajustarLuminosidade(hexBase, -20),
  };
}


// Cor personalizada (Patrimônio) = o FUNDO do app inteiro, como os temas Azul/Preto.
// O dourado continua sendo o destaque em qualquer cor. Cor clara (ex.: dourado, bege) vira
// um fundo claro no tom escolhido, com letras pretas e destaque num dourado escuro.
const _VARS_COR_FUNDO = ['--bg','--surface','--surface2','--surface3','--surface4','--border','--border2',
  '--text','--muted','--muted2','--accent','--accent-hover','--accent-light','--accent-dark','--accent-s'];

function _luminancia(hex){
  const c = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
}
function gerarTemaPorCor(hex){
  const [h, s] = hexParaHSL(hex);
  if(_luminancia(hex) > 0.3){
    const sat = Math.min(s, 60);
    return { claro: true,
      '--bg': hslParaHex(h, sat*0.8, 76), '--surface': hslParaHex(h, sat*0.65, 85), '--surface2': hslParaHex(h, sat*0.75, 71),
      '--surface3': hslParaHex(h, sat*0.75, 65), '--surface4': hslParaHex(h, sat*0.7, 59),
      '--border': 'rgba(0,0,0,0.10)', '--border2': 'rgba(0,0,0,0.18)',
      '--text': '#15110a', '--muted': '#463d2c', '--muted2': '#6b604b',
      '--accent': '#4a3608', '--accent-hover': '#3a2a05', '--accent-light': '#6b4f14', '--accent-dark': '#2a1e03', '--accent-s': 'rgba(74,54,8,0.12)' };
  }
  const sat = Math.min(s, 55);
  return { claro: false,
    '--bg': hslParaHex(h, sat*0.9, 9), '--surface': hslParaHex(h, sat*0.8, 13), '--surface2': hslParaHex(h, sat*0.7, 16.5),
    '--surface3': hslParaHex(h, sat*0.6, 20.5), '--surface4': hslParaHex(h, sat*0.55, 24),
    '--border': 'rgba(255,255,255,0.08)', '--border2': 'rgba(255,255,255,0.15)',
    '--text': '#f0ede8', '--muted': hslParaHex(h, Math.min(sat, 12), 60), '--muted2': hslParaHex(h, Math.min(sat, 10), 40),
    '--accent': '#C8A96E', '--accent-hover': '#D8BC8A', '--accent-light': '#E8C96D', '--accent-dark': '#8A6A1A', '--accent-s': 'rgba(200,169,110,0.12)' };
}

function _corPadraoAtiva(){ try{ return !localStorage.getItem('fin_cor_tema'); }catch(e){ return true; } }

function aplicarCorTema(hex, persistir){
  if(persistir === undefined) persistir = true;
  if(!hex || hex === 'padrao'){ limparCorTema(persistir); return; }
  const tema = gerarTemaPorCor(hex);
  const root = document.documentElement;
  _VARS_COR_FUNDO.forEach(v => root.style.setProperty(v, tema[v]));
  root.setAttribute('data-cor-fundo', tema.claro ? 'clara' : 'escura');
  // Guarda as cores prontas para o topo da página aplicar já na abertura (sem piscar)
  try{ const vars = {}; _VARS_COR_FUNDO.forEach(v => vars[v] = tema[v]); localStorage.setItem('fin_cor_vars', JSON.stringify({ vars, claro: tema.claro })); }catch(e){}
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', tema['--bg']);
  atualizarSeletorCoresUI(hex);
  if(persistir){
    localStorage.setItem('fin_cor_tema', hex);
    salvarCorTemaFirebase(hex);
  }
  if(typeof refreshDash === 'function') try{ refreshDash(); }catch(e){}
}

// Volta ao tema escolhido (Escuro/Claro/Azul) — sem cor personalizada
function limparCorTema(persistir){
  const root = document.documentElement;
  _VARS_COR_FUNDO.forEach(v => root.style.removeProperty(v));
  root.removeAttribute('data-cor-fundo');
  if(persistir !== false) try{ localStorage.removeItem('fin_cor_vars'); }catch(e){}
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', '#0f0f0f');
  atualizarSeletorCoresUI('padrao');
  if(persistir !== false){
    try{ localStorage.removeItem('fin_cor_tema'); }catch(e){}
    salvarCorTemaFirebase(null);
  }
  if(typeof refreshDash === 'function') try{ refreshDash(); }catch(e){}
}

// Tema e cor não brigam: escolher um tema (ou o All Black) tira a cor personalizada
(function(){
  ['setTema','toggleAllBlack'].forEach(nome => {
    const f = window[nome]; if(typeof f !== 'function') return;
    window[nome] = function(){
      if(!_corPadraoAtiva() && document.documentElement.hasAttribute('data-cor-fundo')) limparCorTema(true);
      return f.apply(this, arguments);
    };
  });
})();

async function salvarCorTemaFirebase(hex){
  if(window._db && window._set && window._ref && window._firebaseUser){
    try{ await window._set(window._ref(window._db, `usuarios/${window._firebaseUser.uid}/corTema`), hex); }
    catch(e){ console.warn('salvarCorTemaFirebase:', e); }
  }
}

let _corTemaCarregada = false;
async function carregarCorTema(){
  let hex = null;
  try{ hex = localStorage.getItem('fin_cor_tema'); }catch(e){}
  // Aplica na hora a cor salva no aparelho; a nuvem só corrige se for diferente
  // (antes esperava até 4 s pelo banco e a cor aparecia atrasada)
  const local = hex;
  if(local) aplicarCorTema(local, false);

  if(window._db && window._ref && window._onValue && window._firebaseUser){
    try{
      const snap = await new Promise((res,rej)=>{
        const t = setTimeout(()=>rej(new Error('timeout')), 4000);
        window._onValue(window._ref(window._db,`usuarios/${window._firebaseUser.uid}/corTema`), s=>{ clearTimeout(t); res(s); }, {onlyOnce:true});
      });
      const remoto = snap.val();
      if(remoto){ hex = remoto; localStorage.setItem('fin_cor_tema', remoto); }
    }catch(e){ /* segue com o que tiver salvo local, se tiver */ }
  }

  if(hex && hex !== local) aplicarCorTema(hex, false);
}

function escolherCorPaleta(hex){ aplicarCorTema(hex, true); }
function escolherCorCustom(hex){ aplicarCorTema(hex, true); }

function atualizarSeletorCoresUI(hexAtivo){
  const ativo = (hexAtivo||'padrao').toLowerCase();
  document.querySelectorAll('.cor-paleta-item').forEach(el=>{
    el.classList.toggle('cor-ativa', el.dataset.hex.toLowerCase()===ativo);
  });
  const picker = document.getElementById('cor-custom-picker');
  if(picker && /^#[0-9a-f]{6}$/.test(ativo)) picker.value = ativo;
}

// Cores do Patrimônio: a cor padrão FinRossi, as cores que o cliente salvou e o seletor livre.
const COR_PADRAO_FINROSSI = 'padrao';   // sem cor personalizada: o tema escolhido (Escuro/Claro/Azul)
const MAX_CORES_SALVAS = 6;
let _coresSalvasNuvem = null;

function getCoresSalvas(){
  if(Array.isArray(_coresSalvasNuvem)) return _coresSalvasNuvem;
  try{ const v = JSON.parse(localStorage.getItem('fin_cores_salvas') || '[]'); return Array.isArray(v) ? v : []; }catch(e){ return []; }
}
function _gravarCoresSalvas(lista){
  _coresSalvasNuvem = lista;
  try{ localStorage.setItem('fin_cores_salvas', JSON.stringify(lista)); }catch(e){}
  if(window._db && window._set && window._ref && window._firebaseUser){
    window._set(window._ref(window._db, `usuarios/${window._firebaseUser.uid}/coresSalvas`), lista.length ? lista : null).catch(()=>{});
  }
}
function salvarCorAtual(){
  const picker = document.getElementById('cor-custom-picker');
  const hex = (picker ? picker.value : '').toLowerCase();
  const msg = document.getElementById('msg-cores');
  const avisar = (t, cls) => { if(msg){ msg.textContent = t; msg.className = 'msg ' + cls; setTimeout(()=>{ msg.textContent=''; msg.className='msg'; }, 2600); } };
  if(!/^#[0-9a-f]{6}$/.test(hex)) return;
  const lista = getCoresSalvas();
  if(lista.includes(hex)){ avisar('Essa cor já está salva', 'err'); return; }
  if(lista.length >= MAX_CORES_SALVAS){ avisar(`Você pode salvar até ${MAX_CORES_SALVAS} cores. Remova uma para salvar outra.`, 'err'); return; }
  _gravarCoresSalvas([...lista, hex]);
  aplicarCorTema(hex, true);
  renderCoresPatrimonio();
  avisar('Cor salva', 'ok');
}
function removerCorSalva(hex){
  _gravarCoresSalvas(getCoresSalvas().filter(c => c !== hex));
  renderCoresPatrimonio();
}

function renderCoresPatrimonio(){
  const wrap = document.getElementById('patrimonio-cores-wrap');
  if(!wrap) return;
  let corAtual = COR_PADRAO_FINROSSI;
  try{ corAtual = localStorage.getItem('fin_cor_tema') || COR_PADRAO_FINROSSI; }catch(e){}
  const salvas = getCoresSalvas();
  const amostra = (hex, nome, removivel) => `
    <div class="cor-amostra">
      <div class="cor-paleta-item" data-hex="${hex}" title="${nome}" role="button" tabindex="0" aria-label="Usar ${nome}"
           onclick="escolherCorPaleta('${hex}')" onkeydown="if(event.key==='Enter')escolherCorPaleta('${hex}')" style="${hex === COR_PADRAO_FINROSSI ? 'background:#0f0f0f;box-shadow:inset 0 0 0 3px #0f0f0f,inset 0 0 0 4px #C8A96E' : 'background:' + hex}"></div>
      ${removivel ? `<button class="cor-remover" type="button" onclick="removerCorSalva('${hex}')" aria-label="Remover ${nome}" title="Remover">✕</button>` : ''}
    </div>`;
  wrap.innerHTML = `
    <label style="font-size:11px;color:var(--muted);display:block;margin:16px 0 10px">Cores</label>
    <div class="cores-caixa">
      <div style="font-size:12px;font-weight:500;margin-bottom:2px">Cor do app</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Pinta o fundo do app inteiro na cor escolhida. O dourado continua nos destaques; em cores claras, as letras ficam pretas.</div>
      <div class="cores-grade">
        ${amostra(COR_PADRAO_FINROSSI, 'Padrão FinRossi', false)}
        ${salvas.map((hex, i) => amostra(hex, 'Minha cor ' + (i + 1), true)).join('')}
      </div>
      ${salvas.length ? '' : '<div style="font-size:11px;color:var(--muted);margin-top:8px">Escolha uma cor abaixo e toque em "Salvar cor" para guardá-la aqui.</div>'}
      <div class="cores-livre">
        <input type="color" id="cor-custom-picker" value="${/^#/.test(corAtual) ? corAtual : '#1f3a5f'}" onchange="escolherCorCustom(this.value)" aria-label="Escolher outra cor">
        <div style="flex:1;font-size:11.5px;color:var(--muted)">Escolha qualquer cor</div>
        <button class="btn sm" type="button" onclick="salvarCorAtual()">Salvar cor</button>
      </div>
      <div class="msg" id="msg-cores" style="margin-top:6px"></div>
    </div>`;
  atualizarSeletorCoresUI(corAtual);
}

function initPatrimonioCores(){
  const wrap = document.getElementById('patrimonio-cores-wrap');
  if(!wrap) return;
  const permitido = patrimonioTemAcesso();
  wrap.style.display = permitido ? 'block' : 'none';
  // Plano sem personalização (ex.: deixou de ser Patrimônio): tira a cor aplicada na abertura
  if(!permitido){ if(document.documentElement.hasAttribute('data-cor-fundo')) limparCorTema(false); return; }
  renderCoresPatrimonio();

  if(!_corTemaCarregada){
    _corTemaCarregada = true;
    carregarCorTema();
    // Cores salvas na nuvem (para valer em outro aparelho)
    if(window._db && window._ref && window._onValue && window._firebaseUser){
      try{
        window._onValue(window._ref(window._db, `usuarios/${window._firebaseUser.uid}/coresSalvas`), s => {
          const v = s.val();
          if(v){ _coresSalvasNuvem = Array.isArray(v) ? v : Object.values(v); try{ localStorage.setItem('fin_cores_salvas', JSON.stringify(_coresSalvasNuvem)); }catch(e){} renderCoresPatrimonio(); }
        }, { onlyOnce: true });
      }catch(e){}
    }
  }
}
