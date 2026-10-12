// planos/evolucao/15-assinaturas-calendario.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── ASSINATURAS ─────────────────────────────────────────────────────────────
function getAssin(){return pd().assinaturas||[]}
async function saveAssin(){lsSave(cp,'assinaturas');fbSave(cp,'assinaturas');}

function openModalAssin(id){
  document.getElementById('massin-title').textContent=id?'Editar assinatura':'Nova assinatura';
  document.getElementById('assin-edit-id').value=id||'';
  if(id){const a=getAssin().find(x=>x.id===id);if(a){document.getElementById('assin-nome').value=a.nome;document.getElementById('assin-val').value=a.val;document.getElementById('assin-cat').value=a.cat;document.getElementById('assin-dia').value=a.dia;document.getElementById('assin-status').value=a.status||'ativa';document.getElementById('assin-obs').value=a.obs||'';}}
  else{['assin-nome','assin-val','assin-dia','assin-obs'].forEach(i=>document.getElementById(i).value='');document.getElementById('assin-status').value='ativa';}
  document.getElementById('modal-assin').classList.add('open');
}
async function salvarAssin(){
  const nome=document.getElementById('assin-nome').value.trim();
  const val=parseFloat(document.getElementById('assin-val').value);
  const dia=parseInt(document.getElementById('assin-dia').value);
  if(!nome){showMsg('msg-assin','Informe o nome','err');return}
  if(!val||val<=0){showMsg('msg-assin','Valor inválido','err');return}
  if(!dia||dia<1||dia>31){showMsg('msg-assin','Dia inválido (1-31)','err');return}
  const id=document.getElementById('assin-edit-id').value;
  const obj={id:id||uid(),nome,val,cat:document.getElementById('assin-cat').value,dia,status:document.getElementById('assin-status').value,obs:document.getElementById('assin-obs').value.trim()};
  if(id){const i=pd().assinaturas.findIndex(a=>a.id===id);if(i>=0)pd().assinaturas[i]=obj;}
  else{if(!pd().assinaturas)pd().assinaturas=[];pd().assinaturas.push(obj);}
  await saveAssin();closeModal('modal-assin');renderAssinaturas();
}
async function remAssin(id){
  if(!confirm('Excluir esta assinatura?'))return;
  pd().assinaturas=getAssin().filter(a=>a.id!==id);renderAssinaturas();saveAssin();
}

function renderAssinaturas(){
  try{
    const list=getAssin();
    const ativas=list.filter(a=>a.status!=='pausada');
    const total=ativas.reduce((a,b)=>a+b.val,0);
    const hoje_d=new Date().getDate();

    document.getElementById('assin-metrics').innerHTML=`
      <div class="mc"><div class="mc-label">Total mensal</div><div class="mc-val red">${fmtR(total)}</div><div class="mc-sub">${ativas.length} ativas</div></div>
      <div class="mc"><div class="mc-label">Total anual</div><div class="mc-val amber">${fmtR(total*12)}</div><div class="mc-sub">estimado</div></div>
      <div class="mc"><div class="mc-label">Pausadas</div><div class="mc-val">${list.length-ativas.length}</div></div>
      <div class="mc"><div class="mc-label">Total serviços</div><div class="mc-val blue">${list.length}</div></div>`;

    const el=document.getElementById('assin-content');
    if(!el) return;

    if(!list.length){
      el.innerHTML=`<div class="card" style="text-align:center;padding:56px 24px;border-style:dashed">
        <div style="font-size:48px;margin-bottom:16px">📺</div>
        <div style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:10px">Nenhuma assinatura cadastrada</div>
        <p style="font-size:13px;color:var(--muted);max-width:380px;margin:0 auto 24px;line-height:1.8">
          Cadastre Netflix, Spotify, academia e outros serviços recorrentes para acompanhar quanto gasta por mês.</p>
        <button class="btn primary" onclick="openModalAssin()" style="font-size:14px;padding:11px 28px">+ Cadastrar assinatura</button>
      </div>`;
      destroyChart('assin-cat');
      return;
    }

    el.innerHTML=`<div class="grid2" style="margin-bottom:16px">
      <div class="card">
        <h3><span class="dot" style="background:var(--purple)"></span>Gastos por categoria</h3>
        <div class="chart-wrap" style="height:200px"><canvas id="c-assin-cat"></canvas></div>
      </div>
      <div class="card">
        <h3><span class="dot" style="background:var(--blue)"></span>Lista de assinaturas</h3>
        <div id="assin-list"></div>
      </div>
    </div>`;

    destroyChart('assin-cat');
    const catMap={};
    ativas.forEach(a=>catMap[a.cat]=(catMap[a.cat]||0)+a.val);
    const cL=Object.keys(catMap),cV=Object.values(catMap);
    const ctxC=document.getElementById('c-assin-cat');
    if(ctxC){
      if(!cL.length){ctxC.parentElement.innerHTML='<p class="empty" style="padding:40px 0">Sem dados</p>';}
      else{charts['assin-cat']=new Chart(ctxC,{type:'doughnut',data:{labels:cL,datasets:[{data:cV,backgroundColor:PALETTE.slice(0,cL.length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#888',font:{size:11},padding:6,boxWidth:10}}}}});}
    }

    const listEl=document.getElementById('assin-list');
    if(listEl){
      listEl.innerHTML=[...list].sort((a,b)=>a.dia-b.dia).map(a=>{
        const icon=ASSIN_ICONS[a.cat]||'📦';
        const diasFaltam=a.dia>=hoje_d?a.dia-hoje_d:30-(hoje_d-a.dia);
        const urgente=diasFaltam<=3, pausada=a.status==='pausada';
        return`<div class="inv-item" style="${pausada?'opacity:.5':''}">
          <div class="inv-left">
            <div style="font-size:20px;width:32px;text-align:center">${icon}</div>
            <div><div class="inv-name">${a.nome}</div>
            <div class="inv-type">${a.cat} · dia ${a.dia}${pausada?' · <span style="color:var(--amber)">Pausada</span>':urgente?` · <span style="color:var(--red)">Vence em ${diasFaltam}d</span>`:''}</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="inv-val">${fmtR(a.val)}</div>
            <button class="btn xs" onclick="openModalAssin('${a.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
            <button class="btn danger xs" onclick="remAssin('${a.id}')">✕</button>
          </div>
        </div>`;
      }).join('');
    }
  }catch(e){console.error('renderAssinaturas error:',e);}
}

function getRec(){return pd().recorrentes||[]}
async function saveRec(){lsSave(cp,'recorrentes');fbSave(cp,'recorrentes');}

function openModalRec(id){
  document.getElementById('mrec-title').textContent=id?'Editar conta':'Nova conta recorrente';
  document.getElementById('rec-edit-id').value=id||'';
  if(id){const r=getRec().find(x=>x.id===id);if(r){document.getElementById('rec-desc').value=r.desc;document.getElementById('rec-val').value=r.val;document.getElementById('rec-cat').value=r.cat;document.getElementById('rec-dia').value=r.dia;}}
  else{['rec-desc','rec-val','rec-dia'].forEach(i=>document.getElementById(i).value='');}
  document.getElementById('modal-rec').classList.add('open');
}
async function salvarRec(){
  const desc=document.getElementById('rec-desc').value.trim();
  const val=parseFloat(document.getElementById('rec-val').value);
  const dia=parseInt(document.getElementById('rec-dia').value);
  if(!desc){showMsg('msg-rec-modal','Informe a descrição','err');return}
  if(!val||val<=0){showMsg('msg-rec-modal','Valor inválido','err');return}
  if(!dia||dia<1||dia>31){showMsg('msg-rec-modal','Dia inválido (1-31)','err');return}
  const id=document.getElementById('rec-edit-id').value;
  const obj={id:id||uid(),desc,val,cat:document.getElementById('rec-cat').value,dia};
  if(id){const i=pd().recorrentes.findIndex(r=>r.id===id);if(i>=0)pd().recorrentes[i]=obj;}
  else{if(!pd().recorrentes)pd().recorrentes=[];pd().recorrentes.push(obj);}
  await saveRec();closeModal('modal-rec');renderRecorrentes();
}
async function remRec(id){
  if(!confirm('Excluir esta conta recorrente?'))return;
  pd().recorrentes=getRec().filter(r=>r.id!==id);renderRecorrentes();saveRec();
}

async function lancarRecorrentesDoMes(){
  const mes=curMes();
  const recs=getRec();
  let lançados=0;
  if(recs.length){
    recs.forEach(r=>{
      const [yr,mo]=mes.split('-').map(Number);
      const dia=Math.min(r.dia,new Date(yr,mo,0).getDate());
      const data=`${mes}-${String(dia).padStart(2,'0')}`;
      const jaLancado=pd().lancs.some(l=>l.desc===r.desc&&l.data===data&&l.tipo==='despesa'&&l.recorrente);
      if(!jaLancado){pd().lancs.push({id:uid(),tipo:'despesa',desc:r.desc,val:r.val,data,cat:r.cat,obs:'Automático',recorrente:true});lançados++;}
    });
  }
  // Lança assinaturas ativas do mês também
  lançados += lancarAssinaturasDoMes(mes);
  if(lançados>0){saveLancs(pd().lancs);refreshDash();showMsg('msg-rec',`${lançados} lançamento(s) gerado(s) com sucesso!`,'ok');}
  else{showMsg('msg-rec','Todos os lançamentos deste mês já foram gerados','ok');}
}

function lancarAssinaturasDoMes(mes){
  const assin=getAssin().filter(a=>a.status!=='pausada');
  let lançados=0;
  const [yr,mo]=mes.split('-').map(Number);
  assin.forEach(a=>{
    const dia=Math.min(a.dia||1, new Date(yr,mo,0).getDate());
    const data=`${mes}-${String(dia).padStart(2,'0')}`;
    const jaLancado=pd().lancs.some(l=>l.desc===a.nome&&l.data===data&&l.tipo==='despesa'&&l.assinatura);
    if(!jaLancado){
      pd().lancs.push({id:uid(),tipo:'despesa',desc:a.nome,val:a.val,data,cat:a.cat||'Assinaturas',obs:'Assinatura automática',assinatura:true});
      lançados++;
    }
  });
  return lançados;
}

function renderRecorrentes(){
  try{
  const list=getRec();
  const total=list.reduce((a,b)=>a+b.val,0);
  const mes=curMes();
  const now=new Date();
  const nomesMes=MONTHS;
  document.getElementById('rec-mes-label').textContent=nomesMes[now.getMonth()]+'/'+now.getFullYear();

  document.getElementById('rec-metrics').innerHTML=`
    <div class="mc"><div class="mc-label">Total mensal</div><div class="mc-val red">${fmtR(total)}</div></div>
    <div class="mc"><div class="mc-label">Contas cadastradas</div><div class="mc-val blue">${list.length}</div></div>
    <div class="mc"><div class="mc-label">Total anual</div><div class="mc-val amber">${fmtR(total*12)}</div></div>
  `;

  const listEl=document.getElementById('rec-list');
  if(!list.length){listEl.innerHTML=`
    <div style="text-align:center;padding:40px 24px">
      <div style="font-size:40px;margin-bottom:12px">🔁</div>
      <div style="font-family:'DM Serif Display',serif;font-size:17px;margin-bottom:8px">Nenhuma conta recorrente</div>
      <p style="font-size:13px;color:var(--muted);max-width:360px;margin:0 auto 20px;line-height:1.7">
        Cadastre aluguel, energia, internet e outros gastos fixos mensais. Com um clique, todos são lançados automaticamente nas despesas.
      </p>
      <button class="btn primary" onclick="openModalRec()">+ Cadastrar conta recorrente</button>
    </div>`;return}
  const sorted=[...list].sort((a,b)=>a.dia-b.dia);
  listEl.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="border-bottom:1px solid var(--border)">
      <th style="text-align:left;padding:6px 8px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Descrição</th>
      <th style="text-align:left;padding:6px 8px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Categoria</th>
      <th style="text-align:center;padding:6px 8px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Dia</th>
      <th style="text-align:right;padding:6px 8px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Valor</th>
      <th style="text-align:center;padding:6px 8px;font-size:11px;color:var(--muted)">Status</th>
      <th></th>
    </tr></thead>
    <tbody>${sorted.map(r=>{
      const [yr,mo]=mes.split('-').map(Number);
      const dia=Math.min(r.dia,new Date(yr,mo,0).getDate());
      const data=`${mes}-${String(dia).padStart(2,'0')}`;
      const lançado=pd().lancs.some(l=>l.desc===r.desc&&l.data===data&&l.tipo==='despesa'&&l.recorrente);
      return`<tr>
        <td style="padding:8px">${r.desc}</td>
        <td style="padding:8px;color:var(--muted);font-size:12px">${r.cat}</td>
        <td style="padding:8px;text-align:center">dia ${r.dia}</td>
        <td style="padding:8px;text-align:right;color:var(--red);font-weight:500">${fmtR(r.val)}</td>
        <td style="padding:8px;text-align:center">
          ${lançado?'<span style="font-size:11px;background:var(--green-s);color:var(--green);padding:2px 8px;border-radius:20px">✓ Lançado</span>':'<span style="font-size:11px;background:var(--amber-s);color:var(--amber);padding:2px 8px;border-radius:20px">Pendente</span>'}
        </td>
        <td style="padding:8px;display:flex;gap:4px">
          <button class="btn xs" onclick="openModalRec('${r.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="btn danger xs" onclick="remRec('${r.id}')">✕</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
  }catch(e){console.error('renderRecorrentes error:',e);}
}

// ─── CALENDÁRIO FINANCEIRO ────────────────────────────────────────────────────
let calAno=new Date().getFullYear(), calMes=new Date().getMonth();

function mudarMesCalendario(dir){
  calMes+=dir;
  if(calMes>11){calMes=0;calAno++;}
  if(calMes<0){calMes=11;calAno--;}
  renderCalendario();
}

function renderCalendario(){
  try{
  const now=new Date();
  const hoje_str=now.toISOString().slice(0,10);
  document.getElementById('cal-titulo').textContent=MONTHS[calMes]+' de '+calAno;

  // Coleta todos os eventos do mês
  const mesStr=`${calAno}-${String(calMes+1).padStart(2,'0')}`;
  const lancs=pd().lancs.filter(l=>l.data.startsWith(mesStr));
  const assin=getAssin().filter(a=>a.status!=='pausada');
  const recs=getRec();

  // Mapa dia → eventos
  const eventMap={};
  const addEvt=(dia,evt)=>{if(!eventMap[dia])eventMap[dia]=[];eventMap[dia].push(evt)};

  // Lançamentos
  lancs.forEach(l=>{
    const dia=parseInt(l.data.slice(8,10));
    addEvt(dia,{label:l.desc,tipo:l.tipo==='receita'?'receita':'despesa',val:l.val});
  });
  // Assinaturas
  assin.forEach(a=>{
    const diasNoMes=new Date(calAno,calMes+1,0).getDate();
    const dia=Math.min(a.dia,diasNoMes);
    addEvt(dia,{label:a.nome,tipo:'assinatura',val:a.val});
  });
  // Recorrentes
  recs.forEach(r=>{
    const diasNoMes=new Date(calAno,calMes+1,0).getDate();
    const dia=Math.min(r.dia,diasNoMes);
    // Só mostra se não foi lançado ainda
    const data=`${mesStr}-${String(dia).padStart(2,'0')}`;
    const jaLancado=pd().lancs.some(l=>l.desc===r.desc&&l.data===data&&l.recorrente);
    if(!jaLancado) addEvt(dia,{label:r.desc,tipo:'recorrente',val:r.val});
  });

  // Gera os dias do mês
  const primeiroDia=new Date(calAno,calMes,1).getDay();
  const diasNoMes=new Date(calAno,calMes+1,0).getDate();
  const hoje_dia=now.getFullYear()===calAno&&now.getMonth()===calMes?now.getDate():0;

  let cells='';
  // Células vazias antes do dia 1
  for(let i=0;i<primeiroDia;i++) cells+=`<div></div>`;

  for(let d=1;d<=diasNoMes;d++){
    const evts=eventMap[d]||[];
    const isHoje=d===hoje_dia;
    const data_str=`${mesStr}-${String(d).padStart(2,'0')}`;
    const passado=data_str<hoje_str&&!isHoje;
    const temDespesa=evts.some(e=>e.tipo!=='receita');
    const temReceita=evts.some(e=>e.tipo==='receita');
    const cor=evts.length===0?'':passado&&temDespesa?'var(--red)':isHoje?'var(--amber)':temDespesa?'var(--green)':'var(--blue)';

    cells+=`<div onclick="mostrarDiaCalendario(${d})" style="
      min-height:52px;border-radius:8px;padding:4px;cursor:${evts.length?'pointer':'default'};
      background:${isHoje?'rgba(251,191,36,0.12)':evts.length?'var(--surface2)':'var(--surface)'};
      border:1px solid ${isHoje?'var(--amber)':evts.length?'var(--border2)':'var(--border)'};
      position:relative;transition:all .15s;
    " onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background='${isHoje?'rgba(251,191,36,0.12)':evts.length?'var(--surface2)':'var(--surface)'}'">
      <div style="font-size:12px;font-weight:${isHoje?'700':'400'};color:${isHoje?'var(--amber)':passado?'var(--muted)':'var(--text)'};margin-bottom:3px">${d}</div>
      ${evts.slice(0,2).map(e=>`<div style="font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${e.tipo==='receita'?'var(--blue)':passado?'var(--red)':isHoje?'var(--amber)':'var(--green)'};line-height:1.4">${e.label}</div>`).join('')}
      ${evts.length>2?`<div style="font-size:9px;color:var(--muted)">+${evts.length-2}</div>`:''}
      ${cor&&evts.length?`<div style="position:absolute;bottom:3px;right:4px;width:5px;height:5px;border-radius:50%;background:${cor}"></div>`:''}
    </div>`;
  }

  document.getElementById('cal-grid').innerHTML=cells;

  // Lista de vencimentos do mês
  const todosEvts=[];
  for(let d=1;d<=diasNoMes;d++){
    (eventMap[d]||[]).forEach(e=>todosEvts.push({...e,dia:d,data:`${mesStr}-${String(d).padStart(2,'0')}`}));
  }
  todosEvts.sort((a,b)=>a.dia-b.dia);

  const listaEl=document.getElementById('cal-lista');
  if(!todosEvts.length){listaEl.innerHTML='<p class="empty">Nenhum evento neste mês</p>';return}

  listaEl.innerHTML=todosEvts.map(e=>{
    const passado=e.data<hoje_str;
    const isHoje_e=e.data===hoje_str;
    const cor=passado?'var(--red)':isHoje_e?'var(--amber)':e.tipo==='receita'?'var(--blue)':'var(--green)';
    const status=passado?'Vencido':isHoje_e?'Hoje':'Futuro';
    return`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:8px;background:${cor}18;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <span style="font-size:12px;font-weight:600;color:${cor}">${e.dia}</span>
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${e.label}</div>
        <div style="font-size:11px;color:var(--muted)">${e.tipo==='recorrente'?'Recorrente':e.tipo==='assinatura'?'Assinatura':e.tipo==='receita'?'Receita':'Despesa'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:500;color:${e.tipo==='receita'?'var(--green)':'var(--red)'}">${fmtR(e.val)}</div>
        <div style="font-size:10px;padding:1px 6px;border-radius:10px;background:${cor}18;color:${cor}">${status}</div>
      </div>
    </div>`;
  }).join('');
  }catch(e){console.error('renderCalendario error:',e);}
}

function mostrarDiaCalendario(dia){
  // Scroll para a lista e destaca o dia
  document.getElementById('cal-lista').scrollIntoView({behavior:'smooth',block:'center'});
}

function saveLancs(data){ lsSave(cp,'lancs'); fbSave(cp,'lancs'); }

