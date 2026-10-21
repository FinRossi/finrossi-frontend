// js/app/05-dashboard.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function getMesAnterior(mes){
  const [yr,mo]=mes.split('-').map(Number);
  const d=new Date(yr,mo-2,1);
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function renderComparativo(lancs,mes){
  const mesAnt=getMesAnterior(mes);
  const doMes=lancs.filter(l=>l.data.startsWith(mes));
  const doAnt=lancs.filter(l=>l.data.startsWith(mesAnt));

  const rec=doMes.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const des=doMes.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
  const recAnt=doAnt.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const desAnt=doAnt.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);

  if(!doAnt.length){document.getElementById('dash-comparativo').innerHTML='';return}

  const linha = (rotulo, ant, atual, invertido) => {
    const diff = atual - ant;
    const pct = ant > 0 ? ((diff / ant) * 100).toFixed(1) : 0;
    const bom = invertido ? diff <= 0 : diff >= 0;
    return `<tr>
      <td>${rotulo}</td>
      <td class="ced-ant"><span class="ced-num">${fmtR(ant)}</span></td>
      <td><span class="ced-num">${fmtR(atual)}</span></td>
      <td class="${bom ? 'ced-pos' : 'ced-neg'}">${diff >= 0 ? '↑' : '↓'} ${String(Math.abs(pct)).replace('.', ',')}%</td>
    </tr>`;
  };
  document.getElementById('dash-comparativo').innerHTML=`
    <div class="card card-full">
      <div class="ced-titulo-card">Comparativo<span>${mesLbl(mesAnt+'-01')} e ${mesLbl(mes+'-01')}</span></div>
      <div style="overflow-x:auto"><table class="ced-tabela">
        <thead><tr><th></th><th>${mesLbl(mesAnt+'-01')}</th><th>${mesLbl(mes+'-01')}</th><th>Variação</th></tr></thead>
        <tbody>
          ${linha('Receitas', recAnt, rec, false)}
          ${linha('Despesas', desAnt, des, true)}
          ${linha('Saldo', recAnt - desAnt, rec - des, false)}
        </tbody>
      </table></div>
    </div>`;
}

// Gráfico por categoria: mostra despesas ou receitas do mês (escolha no próprio cartão)
let _catModo = 'despesa';
function setCatModo(modo){
  _catModo = modo === 'receita' ? 'receita' : 'despesa';
  ['despesa','receita'].forEach(m=>{
    const b=document.getElementById('cat-modo-'+m);
    if(b){ b.classList.toggle('ativo', m===_catModo); b.setAttribute('aria-selected', m===_catModo); }
  });
  refreshDash();
}

// Cabeçalho do início: "Bom dia" / nome da pessoa / data completa com hora (atualiza sozinho)
function nomeDaPessoa(){
  const n = (window._firebaseUser?.displayName || localStorage.getItem('fin_nome_display') || '').trim();
  if(n) return n.split(/\s+/).slice(0,2).join(' ');
  const email = window._firebaseUser?.email || '';
  return email ? email.split('@')[0] : PNAMES[cp] || '';
}
function atualizarCabecalhoDash(){
  const agora=new Date(), hora=agora.getHours();
  const saud=hora>=5&&hora<12?'Bom dia':hora>=12&&hora<18?'Boa tarde':'Boa noite';
  const perfil = cp==='finrossi' ? ', perfil FinRossi' : '';
  const data = agora.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const horaTxt = agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const dataCompleta = `${data.charAt(0).toUpperCase()+data.slice(1)}, ${horaTxt}`;
  const set=(id,txt)=>{ const e=document.getElementById(id); if(e && e.textContent!==txt) e.textContent=txt; };
  set('dash-saudacao', saud + perfil); set('mob-dash-saudacao', saud + perfil);
  set('dash-title', nomeDaPessoa()); set('mob-dash-title', nomeDaPessoa());
  set('dash-sub', dataCompleta); set('mob-dash-sub', dataCompleta);
}
// Relógio: acerta no começo de cada minuto
(function relogioCabecalho(){
  try{ atualizarCabecalhoDash(); }catch(e){}
  setTimeout(relogioCabecalho, 60000 - (Date.now() % 60000) + 50);
})();

function refreshDash(){
  const {lancs,invs}=pd(), mes=getMesFiltro();
  atualizarCabecalhoDash();

  populateMesFiltro();
  const doMes=lancs.filter(l=>l.data.startsWith(mes));
  const rec=doMes.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const des=doMes.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
  const saldo=rec-des;

  // Mês anterior para variação %
  const [yrN,moN]=mes.split('-').map(Number);
  const mesAnt=`${moN===1?yrN-1:yrN}-${String(moN===1?12:moN-1).padStart(2,'0')}`;
  const doAnt=lancs.filter(l=>l.data.startsWith(mesAnt));
  const recAnt=doAnt.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const desAnt=doAnt.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
  const saldoAnt=recAnt-desAnt;

  // Variação em relação ao mês anterior. Sem base (mês anterior zerado): só o sentido,
  // 'N+' subiu / 'N-' caiu. Base negativa: divide pelo valor absoluto para a seta não inverter.
  const varPct=(atual,ant)=>{
    if(!ant) return atual>0?'N+':atual<0?'N-':'0.0';
    return ((atual-ant)/Math.abs(ant)*100).toFixed(1);
  };
  const varSubiu=v=>v==='N+'||(v!=='N-'&&parseFloat(v)>=0);

  // Patrimônio no fim de um mês = tudo que sobrou (receitas − despesas) desde o primeiro
  // lançamento até aquele mês + investimentos aplicados até ele. Antes o gráfico mostrava só
  // o saldo de cada mês, sem investimentos e sem acumular.
  const patrimonioAte = m => {
    const lim = m + '-31';
    const caixa = lancs.reduce((a,l) => l.data <= lim ? a + (l.tipo==='receita' ? l.val : l.tipo==='despesa' ? -l.val : 0) : a, 0);
    const aplicado = invs.reduce((a,i) => (!i.data || i.data <= lim) ? a + (Number(i.val) || 0) : a, 0);
    return caixa + aplicado;
  };
  const pat = patrimonioAte(mes), patAnt = patrimonioAte(mesAnt);
  const varRotulo=v=>(v==='N+'||v==='N-')?'':` ${String(Math.abs(parseFloat(v))).replace('.', ',')}%`;

  // Sparkline mini — últimos 6 meses de dados
  const mesUniq=[...new Set(lancs.map(l=>l.data.slice(0,7)))].sort().slice(-6);
  if(!mesUniq.includes(mes)) mesUniq.push(mes);
  mesUniq.sort();

  const sparkRec=mesUniq.map(m=>lancs.filter(l=>l.data.startsWith(m)&&l.tipo==='receita').reduce((a,b)=>a+b.val,0));
  const sparkDes=mesUniq.map(m=>lancs.filter(l=>l.data.startsWith(m)&&l.tipo==='despesa').reduce((a,b)=>a+b.val,0));
  const sparkSal=mesUniq.map((m,i)=>sparkRec[i]-sparkDes[i]);
  const sparkPat=mesUniq.map(patrimonioAte);

  const mkSpark=(id,data,color)=>`<canvas id="spark-${id}" width="120" height="40" style="position:absolute;bottom:12px;right:12px" data-spark='${JSON.stringify(data)}' data-color='${color}'></canvas>`;

  const mkVar=(v,invertido)=>{
    if(v===null) return '';
    const subiu=parseFloat(v)>=0;
    const bom=invertido?!subiu:subiu; // despesas: gastar mais é ruim (vermelho), gastar menos é bom (verde)
    return `<div style="font-size:11px;color:${bom?'var(--green)':'var(--red)'};display:flex;align-items:center;gap:3px;margin-top:4px"><span>${subiu?'↑':'↓'} ${Math.abs(v)}%</span><span style="color:var(--muted)">este mês</span></div>`;
  };

  const ICON_CHART_UP = `<svg width="26" height="26" viewBox="0 0 32 22" fill="none"><polyline points="2,18 8,12 14,14 22,6 30,2" stroke="#C8A96E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="2,18 8,12 14,14 22,6 30,2 30,22 2,22" fill="rgba(200,169,110,0.15)" stroke="none"/></svg>`;
  const ICON_CASH   = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="16" height="10" rx="2" fill="rgba(200,169,110,.12)"/><rect x="6" y="9" width="16" height="10" rx="2" fill="rgba(200,169,110,.22)"/><circle cx="14" cy="14" r="2.2"/></svg>`;
  const ICON_TRENDING_DOWN  = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 10,13 14,9 21,17"/><polyline points="21,10 21,17 14,17"/></svg>`;
  const ICON_WALLET    = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4Z"/></svg>`;

  const kpiCards=[
    {id:'inv', label:'Patrimônio líquido', val:fmtR(pat), var:varPct(pat, patAnt), spark:sparkPat, color:'#C8A96E', icon:ICON_CHART_UP},
    {id:'rec', label:'Receitas', val:fmtR(rec), var:varPct(rec,recAnt), spark:sparkRec, color:'#4ade80', icon:ICON_CASH},
    {id:'des', label:'Despesas', val:fmtR(des), var:varPct(des,desAnt), spark:sparkDes, color:'#f87171', icon:ICON_TRENDING_DOWN},
    {id:'sal', label:'Saldo disponível', val:fmtR(saldo), var:varPct(saldo,saldoAnt), spark:sparkSal, color:'#C8A96E', icon:ICON_WALLET},
  ];

  const kpiEl=document.getElementById('dash-kpi-cards');
  if(kpiEl){
    // Identidade "Cédula": patrimônio no campo do valor (moldura dupla + roseta de guilhoché),
    // receitas/despesas/saldo como faixa de extrato. Mesmos valores e variações de antes.
    const anima = !window._cedAnimou; window._cedAnimou = true; // roseta anima só na 1ª abertura
    const varTxt = (v, invertido) => {
      if(parseFloat(v) === 0) return `<span class="ced-sub">sem mudança no mês</span>`;
      const subiu = varSubiu(v);
      const bom = invertido ? !subiu : subiu; // despesas: gastar menos é bom
      return `<span class="${bom ? 'ced-pos' : 'ced-neg'}">${subiu ? '↑' : '↓'}${varRotulo(v)}</span><span class="ced-sub">${subiu ? 'subiu' : 'caiu'} no mês</span>`;
    };

    // Valores em tempo real: andam do último valor que o cliente viu até o atual.
    // Só conta quando o dashboard está na tela — lançar com ele escondido guarda a
    // surpresa para quando o cliente voltar.
    const secDash = document.getElementById('sec-dashboard'), telaApp = document.getElementById('tela-app');
    const visivel = secDash && !secDash.classList.contains('section-hidden') && (!telaApp || telaApp.style.display !== 'none');
    const chaveVistos = cp + '|' + mes;
    const atuais = { pat, rec, des, sal: saldo };
    const vistos = visivel ? cedVistos(chaveVistos) : null;
    const BOM_SUBIR = { pat: true, rec: true, des: false, sal: true };
    const inicio = {};
    Object.keys(atuais).forEach(k => {
      const id = 'ced-valor-' + k;
      if(cedContando(id)) { inicio[k] = cedValorAtual(id); return; }
      if(vistos && typeof vistos[k] === 'number' && Math.abs(vistos[k] - atuais[k]) >= 0.005){
        inicio[k] = vistos[k]; cedMarcarDelta(id, atuais[k] - vistos[k], BOM_SUBIR[k]);
      } else if(visivel && anima && !vistos && k === 'pat') inicio[k] = 0;   // primeira vez: patrimônio sobe do zero
    });
    const mostra = k => valorCedula(inicio[k] !== undefined ? inicio[k] : atuais[k]);

    kpiEl.innerHTML = `
      <div class="ced-painel"><div class="ced-painel-int">
        ${rosetaGuillocheViva().replace('class="ced-roseta ced-roseta-viva"', anima ? 'class="ced-roseta ced-roseta-viva ced-anima"' : 'class="ced-roseta ced-roseta-viva"')}
        <div class="ced-brilho" aria-hidden="true"></div>
        <div class="ced-serie">${serieCedula(mes)}</div>
        <div class="ced-rotulo">Patrimônio líquido</div>
        <div class="ced-valor-linha"><div class="ced-valor${pat<0?' ced-negativo':''}" id="ced-valor-pat">${mostra('pat')}</div>${cedDeltaHTML('ced-valor-pat')}</div>
        <div class="ced-var">${varTxt(varPct(pat, patAnt), false)}</div>
      </div></div>
      <div class="ced-extrato">
        ${[['Receitas', 'rec', varPct(rec, recAnt), false], ['Despesas', 'des', varPct(des, desAnt), true], ['Saldo disponível', 'sal', varPct(saldo, saldoAnt), false]]
          .map(([rotulo, k, p, inv]) => `
          <div class="ced-item">
            <div class="ced-rotulo">${rotulo}</div>
            <div class="ced-valor-linha"><div class="ced-valor${atuais[k]<0?' ced-negativo':''}" id="ced-valor-${k}">${mostra(k)}</div>${cedDeltaHTML('ced-valor-' + k)}</div>
            <div class="ced-var">${varTxt(p, inv)}</div>
          </div>`).join('')}
      </div>`;

    Object.keys(inicio).forEach(k => contarValorCedula('ced-valor-' + k, atuais[k], 1400, inicio[k]));
    if(visivel) cedGuardarVistos(chaveVistos, atuais);

    // Renderiza sparklines via canvas
    setTimeout(()=>{
      kpiCards.forEach(k=>{
        const cv=document.getElementById(`spark-${k.id}`);
        if(!cv) return;
        const data=JSON.parse(cv.dataset.spark);
        const color=cv.dataset.color;
        const ctx=cv.getContext('2d');
        const W=cv.width,H=cv.height,pad=4;
        const min=Math.min(...data),max=Math.max(...data);
        const range=max-min||1;
        const pts=data.map((v,i)=>({
          x:pad+(i/(data.length-1||1))*(W-pad*2),
          y:H-pad-((v-min)/range)*(H-pad*2)
        }));
        ctx.clearRect(0,0,W,H);
        // Área preenchida
        ctx.beginPath();
        ctx.moveTo(pts[0].x,H);
        pts.forEach(p=>ctx.lineTo(p.x,p.y));
        ctx.lineTo(pts[pts.length-1].x,H);
        ctx.closePath();
        const grad=ctx.createLinearGradient(0,0,0,H);
        grad.addColorStop(0,color+'55');
        grad.addColorStop(1,color+'00');
        ctx.fillStyle=grad;
        ctx.fill();
        // Linha
        ctx.beginPath();
        pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
        ctx.strokeStyle=color;
        ctx.lineWidth=1.5;
        ctx.lineJoin='round';
        ctx.stroke();
      });
    },50);
  }

  // Atualiza totais dos gráficos principais
  const evoTotEl=document.getElementById('dash-evo-total');
  if(evoTotEl){ evoTotEl.textContent=fmtR(pat); evoTotEl.classList.toggle('ced-negativo', pat<0); }
  const evoBadge=document.getElementById('dash-evo-badge');
  if(evoBadge){
    const v=varPct(pat,patAnt);
    if(v!==null){
      const pos=varSubiu(v), igual=parseFloat(v)===0;
      evoBadge.textContent=igual?'sem mudança':`${pos?'↑':'↓'}${varRotulo(v)||(pos?' subiu':' caiu')}`;
      evoBadge.style.background=igual?'var(--surface2)':pos?'rgba(74,222,128,.12)':'rgba(248,113,113,.12)';
      evoBadge.style.color=igual?'var(--muted)':pos?'var(--green)':'var(--red)';
    }
  }
  const catTotEl=document.getElementById('dash-cat-total');
  if(catTotEl) catTotEl.textContent=fmtR(des);

  // Comparativo com o mês anterior (a chamada tinha sido apagada por engano junto com a troca de logos)
  renderComparativo(lancs,mes);

  // Parcelas
  const parcelas=lancs.filter(l=>l.parcelado&&l.tipo==='despesa');
  const totalParcelaMes=doMes.filter(l=>l.parcelado).reduce((a,b)=>a+b.val,0);
  const grupos={};
  parcelas.forEach(l=>{
    if(!grupos[l.groupId])grupos[l.groupId]={desc:l.desc,cat:l.cat,valParc:l.val,total:l.valorTotal,n:l.totalParcelas,pagas:0,restantes:0,proxData:null};
    const g=grupos[l.groupId];
    if(l.data<=mes+'-31')g.pagas++;
    else{g.restantes++;if(!g.proxData||l.data<g.proxData)g.proxData=l.data}
  });

  const parcSec=document.getElementById('dash-parcelas-section');
  const gList=Object.values(grupos);
  if(gList.length){
    parcSec.innerHTML=`<div class="card card-full" style="margin-bottom:16px">
      <h3><span class="dot" style="background:var(--amber)"></span>Parcelas em andamento — ${gList.length} compra(s)</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${gList.map(g=>{
          const pct=Math.round((g.pagas/g.n)*100);
          const concluida=g.pagas>=g.n;
          const restam=g.n-g.pagas;
          return`<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:12px;border-left:3px solid ${concluida?'var(--green)':'var(--amber)'}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;gap:6px">
              <div><div style="font-size:13px;font-weight:500">${escHTML(g.desc)}</div>
              <div style="font-size:11px;color:var(--muted)">${escHTML(g.cat)} · ${fmtR(g.valParc)}/mês</div></div>
              <div style="text-align:right">${concluida
                ?`<span style="font-size:11px;background:var(--green-s);color:var(--green);padding:2px 8px;border-radius:20px">✓ Quitado</span>`
                :`<div style="font-size:12px;color:var(--amber);font-weight:500">${restam}x restantes</div>`}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;background:var(--surface3);border-radius:4px;height:5px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${concluida?'var(--green)':'var(--amber)'};border-radius:4px"></div>
              </div>
              <span style="font-size:11px;color:var(--muted)">${g.pagas}/${g.n}</span>
            </div>
          </div>`;
        }).join('')}
      </div></div>`;
  } else { parcSec.innerHTML=''; }

  // ── Gráfico evolução (linha dourada área preenchida) ──
  const evoR=sparkRec, evoD=sparkDes;   // usados também no gráfico Receitas × Despesas
  const evoS=sparkPat;   // patrimônio acumulado + investimentos em cada mês

  destroyChart('evo');
  const ctxE=document.getElementById('c-evo');
  if(ctxE) charts['evo']=new Chart(ctxE,{
    type:'line',
    data:{
      labels:mesUniq.map(m=>mesLbl(m+'-01')),
      datasets:[{
        label:'Patrimônio',
        data:evoS,
        borderColor:'#C8A96E',
        backgroundColor:(ctx)=>{
          const g=ctx.chart.ctx.createLinearGradient(0,0,0,ctx.chart.height);
          g.addColorStop(0,'rgba(200,169,110,.5)');
          g.addColorStop(0.5,'rgba(200,169,110,.2)');
          g.addColorStop(1,'rgba(200,169,110,.0)');
          return g;
        },
        tension:.4,
        pointRadius:4,
        pointBackgroundColor:'#C8A96E',
        pointBorderColor:'#1a1a1a',
        pointBorderWidth:2,
        pointHoverRadius:6,
        pointHoverBackgroundColor:'#E8D080',
        borderWidth:2.5,
        fill:true
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{intersect:false,mode:'index'},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'rgba(26,26,26,.95)',
          borderColor:'rgba(200,169,110,.3)',
          borderWidth:1,
          titleColor:'#888',
          bodyColor:'#f0ede8',
          callbacks:{label:ctx=>` ${fmtR(ctx.parsed.y)}`}
        }
      },
      scales:{
        x:{
          ticks:{color:'#555',font:{size:11}},
          grid:{display:false},
          border:{display:false}
        },
        y:{
          ticks:{
            color:'#555',
            font:{size:10},
            callback:v=>{
              if(v>=1000) return (v/1000).toFixed(0)+'k';
              return v;
            }
          },
          grid:{color:'rgba(255,255,255,.04)'},
          border:{display:false}
        }
      }
    }
  });

  // ── Gráfico donut categorias ──
  const catMap={};
  doMes.filter(l=>l.tipo===_catModo).forEach(l=>catMap[l.cat]=(catMap[l.cat]||0)+l.val);
  const catTitulo=document.getElementById('dash-cat-titulo');
  if(catTitulo) catTitulo.textContent=_catModo==='receita'?'Receitas por categoria':'Gastos por categoria';
  destroyChart('cat');
  const ctxCat=document.getElementById('c-cat');
  // Ordena do maior gasto pro menor — "Outros" sempre fica por último
  const catOrdenadas=Object.entries(catMap).sort((a,b)=>{
    if(a[0]==='Outros') return 1;
    if(b[0]==='Outros') return -1;
    return b[1]-a[1];
  });
  const cL=catOrdenadas.map(c=>c[0]),cV=catOrdenadas.map(c=>c[1]);
  const totalCat=cV.reduce((a,b)=>a+b,0);

  // Paleta variada, tons terrosos/dourados como na referência
  const GOLD_PALETTE=['#E8C560','#C8A96E','#D4B896','#B8935A','#9A8560','#6A5838','#6B7A6E'];
  const COR_OUTROS='#5F5E5A';
  let _goldIdx=0;
  const CAT_COLORS=cL.map(c=>c==='Outros'?COR_OUTROS:GOLD_PALETTE[_goldIdx++%GOLD_PALETTE.length]);

  if(ctxCat){
    let catVazio=document.getElementById('cat-vazio');
    if(!cL.length){
      ctxCat.style.display='none';
      if(!catVazio){
        catVazio=document.createElement('p');
        catVazio.id='cat-vazio'; catVazio.className='empty';
        catVazio.style.cssText='padding:60px 0;text-align:center;color:var(--muted)';
        ctxCat.parentElement.appendChild(catVazio);
      }
      catVazio.textContent=_catModo==='receita'?'Sem receitas este mês':'Sem despesas este mês';
      const legendElVazio=document.getElementById('cat-legend');
      if(legendElVazio) legendElVazio.innerHTML='';
    } else {
      ctxCat.style.display='';
      if(catVazio) catVazio.remove();
      charts['cat']=new Chart(ctxCat,{
        type:'doughnut',
        data:{
          labels:cL,
          datasets:[{
            data:cV,
            backgroundColor:CAT_COLORS.slice(0,cL.length),
            borderWidth:2,
            borderColor:'#1a1a1a',
            hoverOffset:6
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          cutout:'70%',
          plugins:{
            legend:{display:false},
            tooltip:{
              callbacks:{
                label:(ctx)=>{ const vis=catTotalVisivel(ctx.chart); return `${ctx.label}: ${fmtR(ctx.raw)} (${vis>0?Math.round(ctx.raw/vis*100):0}%)`; }
              }
            }
          }
        },
        plugins:[{
          id:'centerText',
          afterDraw(chart){
            const {ctx,chartArea:{left,top,right,bottom}}=chart;
            const cx=(left+right)/2, cy=(top+bottom)/2;
            ctx.save();
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            ctx.font="500 22px 'Bodoni Moda',Georgia,serif";
            const corTxt=getComputedStyle(document.documentElement);   // segue a cor do texto do tema
            ctx.fillStyle=corTxt.getPropertyValue('--text').trim()||'#f0ede8';
            ctx.fillText(fmtR(catTotalVisivel(chart)).replace('R$\u00a0','R$ '), cx, cy-8);
            ctx.font="12px 'DM Sans',Arial";
            ctx.fillStyle=corTxt.getPropertyValue('--muted').trim()||'#777';
            ctx.fillText(catRotuloCentro(chart), cx, cy+12);
            ctx.restore();
          }
        }]
      });

      // Categorias que o cliente tirou do gráfico continuam fora ao redesenhar
      charts['cat'].$cat={cL,cV,cores:CAT_COLORS};
      const ocultas=_catOcultas[_catModo]||new Set();
      cL.forEach((label,i)=>{ if(ocultas.has(label)) charts['cat'].toggleDataVisibility(i); });
      if(ocultas.size) charts['cat'].update('none');
      renderLegendaCat(charts['cat']);
    }
  }

  // ── Gráfico barras receitas vs despesas ──
  destroyChart('rv');
  const ctxRV=document.getElementById('c-rv');
  if(ctxRV) charts['rv']=new Chart(ctxRV,{
    type:'bar',
    data:{
      labels:mesUniq.map(m=>mesLbl(m+'-01')),
      datasets:[
        {label:'Receitas',data:evoR,backgroundColor:'rgba(74,222,128,.7)',borderRadius:6,borderSkipped:false},
        {label:'Despesas',data:evoD,backgroundColor:'rgba(248,113,113,.7)',borderRadius:6,borderSkipped:false}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#888',font:{size:11},boxWidth:10,padding:12}}},
      scales:{
        x:{ticks:{color:'#666',font:{size:10}},grid:{color:'rgba(255,255,255,0.03)'},border:{display:false}},
        y:{ticks:{color:'#666',font:{size:10},callback:v=>'R$'+v.toLocaleString('pt-BR')},grid:{color:'rgba(255,255,255,0.04)'},border:{display:false}}
      }
    }
  });

  populateDashMetaSel();renderDashMeta();renderDashCartaoWidget();
  renderTodosMeses();

  // Plano Patrimônio: mantém o Score/Insights/Tarefas sempre atualizados,
  // sem precisar sair e voltar na tela (a função só existe se planos/patrimonio/patrimonio.js já carregou)
  if(typeof renderScore==='function') renderScore();
  if(typeof initPersonalizacaoDashboard==='function') initPersonalizacaoDashboard();
  if(typeof initPatrimonioCores==='function') initPatrimonioCores();
}
function renderTodosMeses(){
  const lancs=pd().lancs;
  const mesAtual=curMes();
  const mesesSet=new Set(lancs.map(l=>l.data.slice(0,7)));
  mesesSet.add(mesAtual);
  const meses=[...mesesSet].sort().reverse();
  const mesSel=getMesFiltro();
  const container=document.getElementById('dash-todos-meses');
  if(!container)return;

  if(!meses.length){container.innerHTML='';return;}

  // Valor sem o "R$" repetido em cada célula (o cabeçalho já diz que é dinheiro): cabe no celular
  const num = v => fmtR(v).replace(/^R\$\s?/, '');
  const rows=meses.map(m=>{
    const doM=lancs.filter(l=>l.data.startsWith(m));
    const rec=doM.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
    const des=doM.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
    const saldo=rec-des;
    const qtd=doM.length;
    const ativo=m===mesSel;
    return`<tr onclick="filtrarMes('${m}')" class="mes-row${ativo?' ativo':''}">
      <td class="tm-mes">${mesLbl(m+'-01')}${m===mesAtual?' <span class="fr-selo destaque">atual</span>':''}</td>
      <td class="tm-val pos">${num(rec)}</td>
      <td class="tm-val">${num(des)}</td>
      <td class="tm-val tm-saldo${saldo<0?' neg':''}">${saldo<0?'−':''}${num(Math.abs(saldo))}</td>
      <td class="col-qtd-lancs tm-qtd">${qtd}</td>
    </tr>`;
  }).join('');

  container.innerHTML=`
    <div class="card card-full" style="margin-bottom:16px">
      <h3>Todos os meses</h3>
      <p class="fr-card-sub">Valores em reais. Toque num mês para ver o dashboard dele.</p>
      <div class="tm-wrap">
        <table class="tm-tabela">
          <thead><tr>
            <th class="tm-mes">Mês</th><th class="tm-val">Receitas</th><th class="tm-val">Despesas</th><th class="tm-val">Saldo</th><th class="col-qtd-lancs tm-qtd">Lançamentos</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function filtrarMes(mes){
  // Atualiza o select do filtro
  ['dash-mes-filtro','dash-mes-filtro-mob'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.value=mes;
  });
  refreshDash();
  // Scroll para o topo
  window.scrollTo({top:0,behavior:'smooth'});
}

function populateDashMetaSel(){
  const metas=pd().metas, sel=document.getElementById('dash-meta-sel');
  if(!sel) return;
  const cur=sel.value;
  sel.innerHTML='<option value="">Selecione uma meta</option>'+metas.map(m=>`<option value="${m.id}" ${m.id===cur?'selected':''}>${m.icone?escHTML(m.icone)+' ':''}${escHTML(m.nome)}, ${fmtR0(m.valor)}</option>`).join('');
}

function renderDashMeta(){
  const selEl=document.getElementById('dash-meta-sel');
  if(!selEl) return;
  const id=selEl.value;
  destroyChart('meta');
  const el=document.getElementById('dash-meta-info');
  if(!el) return;
  if(!id){el.innerHTML='<span style="color:var(--muted)">Selecione uma meta para visualizar</span>';return}
  const meta=pd().metas.find(m=>m.id===id);
  if(!meta){el.innerHTML='';return}
  const investido=meta.investido||0;
  const falta=Math.max(0,meta.valor-investido);
  const pct=Math.min(100,(investido/meta.valor)*100);
  const cor=meta.cor||'#4ade80';
  const ctxM=document.getElementById('c-meta');
  if(ctxM)charts['meta']=new Chart(ctxM,{type:'doughnut',data:{datasets:[{data:[investido,falta],backgroundColor:[cor,'#2a2a2a'],borderWidth:0,circumference:270,rotation:225}]},options:{responsive:true,maintainAspectRatio:false,cutout:'78%',plugins:{legend:{display:false},tooltip:{enabled:false}}}});
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:5px">
      <span>Investido: <strong style="color:var(--green)">${fmtR(investido)}</strong></span>
      <span>Falta: <strong style="color:var(--amber)">${fmtR(falta)}</strong></span>
    </div>
    <div style="background:var(--surface3);border-radius:4px;height:6px;overflow:hidden"><div style="width:${pct.toFixed(1)}%;height:100%;background:${cor};border-radius:4px"></div></div>
    <div style="text-align:center;margin-top:4px;font-size:13px;font-weight:500">${pct.toFixed(1).replace('.',',')}% de ${meta.icone?escHTML(meta.icone)+' ':''}${escHTML(meta.nome)}</div>`;
}

let _dashCartaoSelId=null;

function selecionarCartaoDash(id){
  _dashCartaoSelId=id;
  renderDashCartaoWidget();
}

function renderDashCartaoWidget(){
  const card=document.getElementById('dash-card-cartoes');
  if(card){
    const permitido = typeof verComoPlanoPermite==='function' ? verComoPlanoPermite('cartoes') : true;
    const wrapperExterno = card.closest('.dash-widget');
    if(wrapperExterno) wrapperExterno.style.display = permitido ? '' : 'none';
    else card.style.display = permitido ? '' : 'none';
    if(!permitido) return;
  }
  const el=document.getElementById('dash-cartao-widget');
  const selWrap=document.getElementById('dash-cartao-select-wrap');
  if(!el) return;
  const cartoes=getCartoes();
  if(!cartoes.length){
    if(selWrap) selWrap.innerHTML='';
    el.innerHTML=`<div style="text-align:center;padding:20px 0">
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Nenhum cartão cadastrado</div>
      <button class="btn sm" onclick="event.stopPropagation();goTo('cartoes')">+ Cadastrar cartão</button>
    </div>`;
    return;
  }
  // Mantém o cartão selecionado se ainda existir, senão volta pro primeiro
  if(!_dashCartaoSelId || !cartoes.find(x=>x.id===_dashCartaoSelId)){
    _dashCartaoSelId=cartoes[0].id;
  }
  const c=cartoes.find(x=>x.id===_dashCartaoSelId)||cartoes[0];
  const mes=getMesFiltro();
  const lancsMes=pd().lancs.filter(l=>l.tipo==='despesa'&&l.data.startsWith(mes));
  const gastos=lancsMes.filter(l=>l.cartaoId===c.id).reduce((a,b)=>a+b.val,0);
  const disponivel=Math.max(0,(c.limite||0)-gastos);
  const pct=c.limite>0?Math.min(100,(gastos/c.limite)*100):0;
  if(selWrap){
    selWrap.innerHTML = cartoes.length>1 ? `
      <select onclick="event.stopPropagation()" onchange="selecionarCartaoDash(this.value)" style="background:var(--surface2);border:1px solid var(--border2);color:var(--muted);border-radius:var(--radius-sm);padding:5px 8px;font-size:11px;font-family:'DM Sans',sans-serif;outline:none;width:auto;max-width:130px;cursor:pointer">
        ${cartoes.map(cc=>`<option value="${cc.id}" ${cc.id===c.id?'selected':''}>${escHTML(cc.nome)} •••• ${escHTML(cc.final)}</option>`).join('')}
      </select>` : '';
  }
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:20px">
      ${cartaoVisualHTML(c, 270, 170)}
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:var(--muted);margin-bottom:5px">Limite disponível</div>
        <div style="font-size:24px;font-weight:700;color:var(--text);letter-spacing:-.3px;margin-bottom:12px">${fmtR(disponivel)}</div>
        <div style="background:var(--surface3);border-radius:4px;height:6px;overflow:hidden">
          <div style="width:${pct.toFixed(1)}%;height:100%;background:var(--accent);border-radius:4px;transition:width .6s ease"></div>
        </div>
        <div style="font-size:11px;color:var(--muted2);margin-top:6px">de ${fmtR(c.limite||0)}</div>
      </div>
    </div>`;
}


// ── Gráfico de categorias: tirar/voltar categorias mostrando o valor que saiu ──
const _catOcultas = {};   // por modo (despesa/receita): nomes das categorias tiradas do gráfico
function catTotalVisivel(chart){
  const d = chart?.$cat; if(!d) return 0;
  return d.cV.reduce((s, v, i) => s + (chart.getDataVisibility(i) ? v : 0), 0);
}
function catRotuloCentro(chart){
  const d = chart?.$cat; if(!d) return 'Total';
  const fora = d.cL.filter((_, i) => !chart.getDataVisibility(i));
  if(!fora.length) return 'Total';
  return fora.length === 1 ? `sem ${fora[0]}` : `sem ${fora.length} categorias`;
}
function renderLegendaCat(chart){
  const el = document.getElementById('cat-legend');
  const d = chart?.$cat;
  if(!el || !d) return;
  const vis = catTotalVisivel(chart);
  let foraTotal = 0;
  const linhas = d.cL.map((label, i) => {
    const visivel = chart.getDataVisibility(i);
    if(!visivel) foraTotal += d.cV[i];
    const pct = visivel && vis > 0 ? Math.round(d.cV[i] / vis * 100) + '%' : 'fora';
    return `<div class="cat-leg${visivel ? '' : ' fora'}" onclick="toggleCatSlice(${i})" data-cat-idx="${i}" role="button" tabindex="0" title="${visivel ? 'Tirar do gráfico' : 'Voltar ao gráfico'}">
      <span class="cat-leg-cor" style="background:${d.cores[i]}"></span>
      <span class="cat-leg-nome">${escHTML(label)}</span>
      <span class="cat-leg-val">${fmtR(d.cV[i])}</span>
      <span class="cat-leg-pct">${pct}</span>
    </div>`;
  }).join('');
  el.innerHTML = linhas + (foraTotal > 0
    ? `<div class="cat-leg-fora"><span>Fora do gráfico</span><b>${fmtR(foraTotal)}</b></div>`
    : `<div class="cat-leg-dica">Toque numa categoria para tirar do gráfico</div>`);
}
