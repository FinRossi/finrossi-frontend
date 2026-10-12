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

  function seta(atual,ant){
    const diff=atual-ant;
    const pct=ant>0?((diff/ant)*100).toFixed(1):0;
    const up=diff>=0;
    const cor=up?'var(--green)':'var(--red)';
    return`<span style="font-size:11px;color:${cor};margin-left:6px">${up?'▲':'▼'} ${Math.abs(pct)}%</span>`;
  }

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

function refreshDash(){
  const {lancs,invs}=pd(), mes=getMesFiltro();
  document.getElementById('dash-title').textContent=PNAMES[cp];
  const [yr,mo]=mes.split('-');
  const mesNome=MONTHS[+mo-1]+' de '+yr;
  document.getElementById('dash-sub').textContent=mesNome;
  const mobTitle=document.getElementById('mob-dash-title');if(mobTitle)mobTitle.textContent=PNAMES[cp];
  const mobSub=document.getElementById('mob-dash-sub');if(mobSub)mobSub.textContent=mesNome;

  // Saudação
  const hora=new Date().getHours();
  const saud=hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite';
  const nomeUser = window._firebaseUser?.displayName || localStorage.getItem('fin_nome_display') || '';
  const primeiroNome = nomeUser ? ', ' + nomeUser.split(' ')[0] : '';
  const saudEl=document.getElementById('dash-saudacao');
  if(saudEl) saudEl.textContent=saud + primeiroNome;
  const saudMobEl=document.getElementById('mob-dash-saudacao');
  if(saudMobEl) saudMobEl.textContent=saud + primeiroNome;

  populateMesFiltro();
  const doMes=lancs.filter(l=>l.data.startsWith(mes));
  const rec=doMes.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const des=doMes.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
  const totalInv=invs.reduce((a,b)=>a+b.val,0);
  const saldo=rec-des;

  // Mês anterior para variação %
  const [yrN,moN]=mes.split('-').map(Number);
  const mesAnt=`${moN===1?yrN-1:yrN}-${String(moN===1?12:moN-1).padStart(2,'0')}`;
  const doAnt=lancs.filter(l=>l.data.startsWith(mesAnt));
  const recAnt=doAnt.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const desAnt=doAnt.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
  const saldoAnt=recAnt-desAnt;

  const varPct=(atual,ant)=>{
    if(!ant) return '0.0';
    return ((atual-ant)/ant*100).toFixed(1);
  };

  // Sparkline mini — últimos 6 meses de dados
  const mesUniq=[...new Set(lancs.map(l=>l.data.slice(0,7)))].sort().slice(-6);
  if(!mesUniq.includes(mes)) mesUniq.push(mes);
  mesUniq.sort();

  const sparkRec=mesUniq.map(m=>lancs.filter(l=>l.data.startsWith(m)&&l.tipo==='receita').reduce((a,b)=>a+b.val,0));
  const sparkDes=mesUniq.map(m=>lancs.filter(l=>l.data.startsWith(m)&&l.tipo==='despesa').reduce((a,b)=>a+b.val,0));
  const sparkSal=mesUniq.map((m,i)=>sparkRec[i]-sparkDes[i]);
  const sparkInv=mesUniq.map(()=>totalInv); // investimentos não variam por mês neste modelo

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

  const totalInvAnt = invs.reduce((a,b)=>a+b.val,0); // investimentos não variam mês a mês por ora
  const saldoAcumAnt = saldoAnt; // usa saldo do mês anterior como comparativo

  const kpiCards=[
    {id:'inv', label:'Patrimônio líquido', val:fmtR(totalInv+saldo), var:varPct(totalInv+saldo, totalInv+saldoAnt), spark:sparkInv, color:'#C8A96E', icon:ICON_CHART_UP},
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
      const subiu = parseFloat(v) >= 0;
      const bom = invertido ? !subiu : subiu; // despesas: gastar menos é bom
      return `<span class="${bom ? 'ced-pos' : 'ced-neg'}">${subiu ? '↑' : '↓'} ${String(Math.abs(v)).replace('.', ',')}%</span><span class="ced-sub">no mês</span>`;
    };
    const pat = totalInv + saldo;
    kpiEl.innerHTML = `
      <div class="ced-painel"><div class="ced-painel-int">
        ${rosetaGuillocheSVG().replace('class="ced-roseta"', anima ? 'class="ced-roseta ced-anima"' : 'class="ced-roseta"')}
        <div class="ced-serie">${serieCedula(mes)}</div>
        <div class="ced-rotulo">Patrimônio líquido</div>
        <div class="ced-valor">${valorCedula(pat)}</div>
        <div class="ced-var">${varTxt(varPct(pat, totalInv + saldoAnt), false)}</div>
      </div></div>
      <div class="ced-extrato">
        ${[['Receitas', rec, varPct(rec, recAnt), false], ['Despesas', des, varPct(des, desAnt), true], ['Saldo disponível', saldo, varPct(saldo, saldoAnt), false]]
          .map(([rotulo, v, p, inv]) => `
          <div class="ced-item">
            <div class="ced-rotulo">${rotulo}</div>
            <div class="ced-valor">${valorCedula(v)}</div>
            <div class="ced-var">${varTxt(p, inv)}</div>
          </div>`).join('')}
      </div>`;

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
  if(evoTotEl) evoTotEl.textContent=fmtR(saldo);
  const evoBadge=document.getElementById('dash-evo-badge');
  if(evoBadge){
    const v=varPct(saldo,saldoAnt);
    if(v!==null){
      const pos=parseFloat(v)>=0;
      evoBadge.textContent=`${pos?'↑':'↓'} ${Math.abs(v)}%`;
      evoBadge.style.background=pos?'rgba(74,222,128,.12)':'rgba(248,113,113,.12)';
      evoBadge.style.color=pos?'var(--green)':'var(--red)';
    }
  }
  const catTotEl=document.getElementById('dash-cat-total');
  if(catTotEl) catTotEl.textContent=fmtR(des);

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
              <div><div style="font-size:13px;font-weight:500">${g.desc}</div>
              <div style="font-size:11px;color:var(--muted)">${g.cat} · ${fmtR(g.valParc)}/mês</div></div>
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
  const evoR=mesUniq.map(m=>lancs.filter(l=>l.data.startsWith(m)&&l.tipo==='receita').reduce((a,b)=>a+b.val,0));
  const evoD=mesUniq.map(m=>lancs.filter(l=>l.data.startsWith(m)&&l.tipo==='despesa').reduce((a,b)=>a+b.val,0));
  const evoS=mesUniq.map((m,i)=>evoR[i]-evoD[i]);

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
  doMes.filter(l=>l.tipo==='despesa').forEach(l=>catMap[l.cat]=(catMap[l.cat]||0)+l.val);
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
    if(!cL.length){
      ctxCat.parentElement.innerHTML='<p class="empty" style="padding:60px 0;text-align:center;color:var(--muted)">Sem despesas este mês</p>';
      const legendElVazio=document.getElementById('cat-legend');
      if(legendElVazio) legendElVazio.innerHTML='';
    } else {
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
                label:(ctx)=>`${ctx.label}: ${fmtR(ctx.raw)} (${totalCat>0?Math.round(ctx.raw/totalCat*100):0}%)`
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
            ctx.fillStyle='#f0ede8';
            ctx.fillText(fmtR(totalCat).replace('R$\u00a0','R$ '), cx, cy-8);
            ctx.font="12px 'DM Sans',Arial";
            ctx.fillStyle='#777';
            ctx.fillText('Total', cx, cy+12);
            ctx.restore();
          }
        }]
      });

      // Legenda HTML própria — porcentagens sempre alinhadas em coluna reta
      const legendEl=document.getElementById('cat-legend');
      if(legendEl){
        legendEl.innerHTML=cL.map((label,i)=>{
          const pct=totalCat>0?Math.round(cV[i]/totalCat*100):0;
          return `<div onclick="toggleCatSlice(${i})" data-cat-idx="${i}" style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <span style="width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[i]};flex-shrink:0"></span>
            <span style="font-size:12px;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
            <span style="font-size:12px;color:var(--text);font-variant-numeric:tabular-nums;text-align:right;min-width:34px">${pct}%</span>
          </div>`;
        }).join('');
      }
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
  const lancs=pd().lancs;
  const doMes=lancs.filter(l=>l.data.startsWith(mes));
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

  const rows=meses.map(m=>{
    const doM=lancs.filter(l=>l.data.startsWith(m));
    const rec=doM.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
    const des=doM.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
    const saldo=rec-des;
    const qtd=doM.length;
    const ativo=m===mesSel;
    return`<tr onclick="filtrarMes('${m}')" style="cursor:pointer;${ativo?'background:var(--green-s);':''}" class="mes-row">
      <td style="padding:9px 10px;font-weight:${ativo?'600':'400'};color:${ativo?'var(--green)':'var(--text)'}">
        ${mesLbl(m+'-01')}${m===mesAtual?' <span style="font-size:10px;background:var(--green-s);color:var(--green);padding:1px 6px;border-radius:10px">atual</span>':''}
      </td>
      <td style="padding:9px 10px;color:var(--green);text-align:right">${fmtR(rec)}</td>
      <td style="padding:9px 10px;color:var(--red);text-align:right">${fmtR(des)}</td>
      <td style="padding:9px 10px;color:${saldo>=0?'var(--green)':'var(--red)'};text-align:right;font-weight:500">${fmtR(saldo)}</td>
      <td class="col-qtd-lancs" style="padding:9px 10px;color:var(--muted);text-align:center;font-size:12px">${qtd}</td>
      <td style="padding:9px 10px;text-align:center">
        <span style="font-size:11px;color:var(--muted)">→</span>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML=`
    <div class="card card-full" style="margin-bottom:16px">
      <h3 style="font-size:13px;font-weight:500"><span class="dot" style="background:var(--teal)"></span>Todos os meses <span style="color:var(--muted);font-weight:400;font-size:11px">— clique para filtrar</span></h3>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:6px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Mês</th>
              <th style="text-align:right;padding:6px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Receitas</th>
              <th style="text-align:right;padding:6px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Despesas</th>
              <th style="text-align:right;padding:6px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Saldo</th>
              <th class="col-qtd-lancs" style="text-align:center;padding:6px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Lançamentos</th>
              <th style="width:30px"></th>
            </tr>
          </thead>
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
  sel.innerHTML='<option value="">— Selecione uma meta —</option>'+metas.map(m=>`<option value="${m.id}" ${m.id===cur?'selected':''}>${m.icone||'🎯'} ${m.nome} — ${fmtR0(m.valor)}</option>`).join('');
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
    <div style="text-align:center;margin-top:4px;font-size:13px;font-weight:500">${pct.toFixed(1)}% — ${meta.icone||'🎯'} ${meta.nome}</div>`;
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
        ${cartoes.map(cc=>`<option value="${cc.id}" ${cc.id===c.id?'selected':''}>${cc.nome} •••• ${cc.final}</option>`).join('')}
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

