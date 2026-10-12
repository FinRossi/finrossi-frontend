// js/app/07-investimentos-historico.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
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
  listEl.innerHTML=invs.map((inv,idx)=>`
    <div class="inv-item"><div class="inv-left"><div class="inv-dot" style="background:${PALETTE[idx%PALETTE.length]}"></div><div><div class="inv-name">${inv.nome}</div><div class="inv-type">${inv.tipo}${inv.rent?' · '+inv.rent:''}${inv.banco?' · '+inv.banco:''}</div></div></div>
    <div style="display:flex;align-items:center;gap:8px"><div class="inv-val">${fmtR(inv.val)}</div><button class="btn danger xs" onclick="remInv('${inv.id}')">✕</button></div></div>`).join('');
}

// ─── HISTÓRICO ────────────────────────────────────────────────────────────────
function renderHistorico(){
  const lancs=pd().lancs;
  const filtroMes=document.getElementById('h-mes').value, filtroTipo=document.getElementById('h-tipo').value, filtroCat=document.getElementById('h-cat').value;
  const mesUniq=[...new Set(lancs.map(l=>l.data.slice(0,7)))].sort().reverse();
  const selMes=document.getElementById('h-mes'),cM=selMes.value;
  selMes.innerHTML='<option value="">Todos os meses</option>'+mesUniq.map(m=>`<option value="${m}" ${m===cM?'selected':''}>${mesLbl(m+'-01')}</option>`).join('');
  const cats=[...new Set(lancs.map(l=>l.cat))].sort();
  const selCat=document.getElementById('h-cat'),cC=selCat.value;
  selCat.innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option value="${c}" ${c===cC?'selected':''}>${c}</option>`).join('');
  let lista=[...lancs].sort((a,b)=>b.data.localeCompare(a.data));
  if(filtroMes)lista=lista.filter(l=>l.data.startsWith(filtroMes));
  if(filtroTipo)lista=lista.filter(l=>l.tipo===filtroTipo);
  if(filtroCat)lista=lista.filter(l=>l.cat===filtroCat);
  const tbody=document.getElementById('h-tbody');
  if(!lista.length){tbody.innerHTML='<tr><td colspan="7"><p class="empty">Nenhum lançamento</p></td></tr>';return}
  const METODO_ICON={'pix':'Pix','debito':'Déb','credito':'Cré','dinheiro':'Din','boleto':'Bol','transferencia':'Trf','deposito':'Dep','outro':'Outro','':'—'};
  tbody.innerHTML=lista.map(l=>{
    const parcTag=l.parcelado?`<span style="font-size:10px;background:var(--amber-s);color:var(--amber);padding:1px 6px;border-radius:10px;margin-left:4px">${l.parcela}/${l.totalParcelas}</span>`:'';
    const metTag=l.metodo?`<span style="font-size:10px;background:var(--surface3);color:var(--muted);padding:1px 6px;border-radius:10px;margin-left:4px">${METODO_ICON[l.metodo]||l.metodo}</span>`:'';
    return`<tr>
      <td style="color:var(--muted);font-size:12px">${l.data.split('-').reverse().join('/')}</td>
      <td><span class="badge ${l.tipo}">${l.tipo.charAt(0).toUpperCase()+l.tipo.slice(1)}</span></td>
      <td style="font-weight:500">${l.desc}${parcTag}${metTag}</td>
      <td style="color:var(--muted);font-size:12px">${l.cat}</td>
      <td style="text-align:right;font-weight:500;color:${l.tipo==='receita'?'var(--green)':'var(--red)'}">${fmtR(l.val)}</td>
      <td style="color:var(--muted);font-size:12px">${l.obs||'—'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn xs" onclick="editarLanc('${l.id}')" title="Editar">✏</button>
        <button class="btn danger xs" onclick="remLanc('${l.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

