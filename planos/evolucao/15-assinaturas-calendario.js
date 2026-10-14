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
      el.innerHTML=`<div class="card fr-vazio" style="margin-top:16px">
        <b>Nenhuma assinatura cadastrada</b>
        <p>Cadastre streaming, música, academia e outros serviços para ver quanto eles somam por mês.</p>
        <button class="btn primary" onclick="openModalAssin()">+ Nova assinatura</button>
      </div>`;
      destroyChart('assin-cat');
      return;
    }

    el.innerHTML=`<div class="grid2" style="margin-bottom:16px">
      <div class="card">
        <h3>Gastos por categoria</h3>
        <div class="chart-wrap" style="height:200px"><canvas id="c-assin-cat"></canvas></div>
      </div>
      <div class="card">
        <h3>Assinaturas por dia de cobrança</h3>
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
        const diasFaltam=a.dia>=hoje_d?a.dia-hoje_d:30-(hoje_d-a.dia);
        const urgente=diasFaltam<=3, pausada=a.status==='pausada';
        const selo=pausada?'<span class="fr-selo">Pausada</span>'
          :urgente?`<span class="fr-selo destaque">${diasFaltam===0?'Cobra hoje':`Cobra em ${diasFaltam} ${diasFaltam===1?'dia':'dias'}`}</span>`:'';
        return`<div class="ext-linha${pausada?' pausada':''}">
          <div class="ext-dia"><b>${String(a.dia).padStart(2,'0')}</b><span>mensal</span></div>
          <div style="min-width:0"><div class="ext-tit">${escHTML(a.nome)}</div><div class="ext-meta">${escHTML(a.cat)}</div></div>
          <div class="ext-valor-col"><div class="ext-valor">${fmtR(a.val)}</div>${selo}</div>
          <div class="ext-acoes">
            <button class="btn xs" onclick="openModalAssin('${a.id}')" title="Editar" aria-label="Editar assinatura">${ICO_EDITAR}</button>
            <button class="btn danger xs" onclick="remAssin('${a.id}')" title="Excluir" aria-label="Excluir assinatura">✕</button>
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
  document.getElementById('rec-mes-label').textContent=nomesMes[now.getMonth()].toLowerCase()+' de '+now.getFullYear();

  document.getElementById('rec-metrics').innerHTML=`
    <div class="mc"><div class="mc-label">Total mensal</div><div class="mc-val red">${fmtR(total)}</div></div>
    <div class="mc"><div class="mc-label">Contas cadastradas</div><div class="mc-val blue">${list.length}</div></div>
    <div class="mc"><div class="mc-label">Total anual</div><div class="mc-val amber">${fmtR(total*12)}</div></div>
  `;

  const listEl=document.getElementById('rec-list');
  if(!list.length){listEl.innerHTML=`
    <div class="fr-vazio">
      <b>Nenhuma conta recorrente</b>
      <p>Cadastre aluguel, energia, internet e outros gastos fixos. Depois, um toque lança todos nas despesas do mês.</p>
      <button class="btn primary" onclick="openModalRec()">+ Nova conta</button>
    </div>`;return}
  const sorted=[...list].sort((a,b)=>a.dia-b.dia);
  listEl.innerHTML=sorted.map(r=>{
      const [yr,mo]=mes.split('-').map(Number);
      const dia=Math.min(r.dia,new Date(yr,mo,0).getDate());
      const data=`${mes}-${String(dia).padStart(2,'0')}`;
      const lançado=pd().lancs.some(l=>l.desc===r.desc&&l.data===data&&l.tipo==='despesa'&&l.recorrente);
      return`<div class="ext-linha">
        <div class="ext-dia"><b>${String(r.dia).padStart(2,'0')}</b><span>mensal</span></div>
        <div style="min-width:0"><div class="ext-tit">${escHTML(r.desc)}</div><div class="ext-meta">${escHTML(r.cat)}</div></div>
        <div class="ext-valor-col"><div class="ext-valor">${fmtR(r.val)}</div>${lançado?'<span class="fr-selo ok">Lançada</span>':'<span class="fr-selo destaque">A lançar</span>'}</div>
        <div class="ext-acoes">
          <button class="btn xs" onclick="openModalRec('${r.id}')" title="Editar" aria-label="Editar conta">${ICO_EDITAR}</button>
          <button class="btn danger xs" onclick="remRec('${r.id}')" title="Excluir" aria-label="Excluir conta">✕</button>
        </div>
      </div>`;
    }).join('');
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
  const hoje_str=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; // data local (toISOString virava o dia à noite)
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
    // Atraso = conta fixa (assinatura/recorrente) com data já passada e ainda não lançada
    const atrasado=e=>passado&&(e.tipo==='assinatura'||e.tipo==='recorrente');
    const temAtraso=evts.some(atrasado);
    const soReceita=evts.length&&evts.every(e=>e.tipo==='receita');
    const marca=!evts.length?'':temAtraso?'atraso':soReceita?'receita':'';
    const classes=['cal-dia',evts.length?'com-evt':'',isHoje?'hoje':'',passado?'passado':''].filter(Boolean).join(' ');

    cells+=`<div class="${classes}"${evts.length?` onclick="mostrarDiaCalendario(${d})"`:''}>
      <div class="cal-num">${d}</div>
      ${evts.slice(0,2).map(e=>`<div class="cal-evt${e.tipo==='receita'?' receita':atrasado(e)?' atraso':''}">${escHTML(e.label)}</div>`).join('')}
      ${evts.length>2?`<div class="cal-evt">+${evts.length-2}</div>`:''}
      ${evts.length?`<div class="cal-marca ${marca}"></div>`:''}
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
  if(!todosEvts.length){listaEl.innerHTML='<p class="empty">Nada para pagar ou receber neste mês.</p>';return}

  const mesCurto=MESES_CURTOS[calMes];
  listaEl.innerHTML=todosEvts.map(e=>{
    const passado=e.data<hoje_str;
    const isHoje_e=e.data===hoje_str;
    const fixa=e.tipo==='assinatura'||e.tipo==='recorrente';
    // Lançamentos já registrados não "vencem"; só as contas fixas ainda não lançadas
    const selo=e.tipo==='receita'
        ? (passado||isHoje_e?'<span class="fr-selo ok">Recebida</span>':'<span class="fr-selo">A receber</span>')
      : !fixa
        ? (passado||isHoje_e?'<span class="fr-selo">Paga</span>':'<span class="fr-selo">Agendada</span>')
      : passado ? '<span class="fr-selo alerta">Vencida</span>'
      : isHoje_e ? '<span class="fr-selo destaque">Vence hoje</span>'
      : '<span class="fr-selo">A vencer</span>';
    const tipoNome=e.tipo==='recorrente'?'Conta recorrente':e.tipo==='assinatura'?'Assinatura':e.tipo==='receita'?'Receita':'Despesa';
    return`<div class="ext-linha" style="grid-template-columns:44px 1fr auto">
      <div class="ext-dia"><b>${String(e.dia).padStart(2,'0')}</b><span>${mesCurto}</span></div>
      <div style="min-width:0"><div class="ext-tit">${escHTML(e.label)}</div><div class="ext-meta">${tipoNome}</div></div>
      <div class="ext-valor-col"><div class="ext-valor ${e.tipo==='receita'?'receita':''}">${e.tipo==='receita'?'+':'−'} ${fmtR(e.val).replace(/^R\$\s?/,'')}</div>${selo}</div>
    </div>`;
  }).join('');
  }catch(e){console.error('renderCalendario error:',e);}
}

function mostrarDiaCalendario(dia){
  // Scroll para a lista e destaca o dia
  document.getElementById('cal-lista').scrollIntoView({behavior:'smooth',block:'center'});
}

function saveLancs(data){ lsSave(cp,'lancs'); fbSave(cp,'lancs'); }

