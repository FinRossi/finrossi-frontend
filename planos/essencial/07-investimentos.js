// planos/essencial/07-investimentos.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── INVESTIMENTOS ────────────────────────────────────────────────────────────
function renderInvs(){
  const invs=pd().invs, total=invs.reduce((a,b)=>a+b.val,0);
  const rf=invs.filter(i=>i.tipo.startsWith('Renda Fixa')).reduce((a,b)=>a+b.val,0);
  const rv=invs.filter(i=>i.tipo.startsWith('Renda Variável')).reduce((a,b)=>a+b.val,0);
  document.getElementById('inv-metrics').innerHTML=`
    <div class="mc"><div class="mc-label">Total investido</div><div class="mc-val blue">${fmtR(total)}</div></div>
    <div class="mc"><div class="mc-label">Renda fixa</div><div class="mc-val green">${fmtR(rf)}</div></div>
    <div class="mc"><div class="mc-label">Renda variável</div><div class="mc-val amber">${fmtR(rv)}</div></div>
    <div class="mc"><div class="mc-label">Outros</div><div class="mc-val">${fmtR(total-rf-rv)}</div></div>`;
  destroyChart('inv-dist');
  const ctxD=document.getElementById('c-inv-dist');
  if(ctxD){
    if(!invs.length){
      ctxD.parentElement.innerHTML='<p class="empty" style="padding:60px 0">Nenhum investimento ainda</p>';
    } else {
      const tM={};invs.forEach(i=>tM[i.tipo]=(tM[i.tipo]||0)+i.val);
      charts['inv-dist']=new Chart(ctxD,{type:'doughnut',data:{labels:Object.keys(tM),datasets:[{data:Object.values(tM),backgroundColor:PALETTE,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#888',font:{size:10},padding:5,boxWidth:10}}}}});
    }
  }
  const listEl=document.getElementById('inv-list');
  if(!invs.length){listEl.innerHTML='<p class="empty">Nenhum investimento cadastrado</p>';return}
  // A cor do ponto é a mesma do tipo no gráfico ao lado
  const tipos=[...new Set(invs.map(i=>i.tipo))];
  listEl.innerHTML=invs.map(inv=>`
    <div class="inv-item"><div class="inv-left"><div class="inv-dot" style="background:${PALETTE[tipos.indexOf(inv.tipo)%PALETTE.length]}"></div><div><div class="inv-name">${escHTML(inv.nome)}</div><div class="inv-type">${escHTML(inv.tipo)}${inv.rent?' · '+escHTML(inv.rent):''}${inv.banco?' · '+escHTML(inv.banco):''}</div></div></div>
    <div style="display:flex;align-items:center;gap:8px"><div class="inv-val">${fmtR(inv.val)}</div><button class="btn danger xs" onclick="remInv('${inv.id}')">✕</button></div></div>`).join('');
}

