// planos/evolucao/09-metas-objetivos.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── METAS ────────────────────────────────────────────────────────────────────
function openModalMeta(id){
  document.getElementById('mm-title').textContent=id?'Editar meta':'Nova meta';
  document.getElementById('meta-edit-id').value=id||'';
  if(id){
    const m=pd().metas.find(x=>x.id===id);
    if(m){
      document.getElementById('meta-nome').value=m.nome;
      document.getElementById('meta-valor').value=m.valor;
      document.getElementById('meta-investido').value=m.investido||0;
      document.getElementById('meta-icone').value=m.icone||'';
      document.getElementById('meta-cor').value=m.cor||'#C8A96E';
    }
  } else {
    document.getElementById('meta-nome').value='';
    document.getElementById('meta-valor').value='';
    document.getElementById('meta-investido').value='';
    document.getElementById('meta-icone').value='';
    document.getElementById('meta-cor').value='#C8A96E';
  }
  document.getElementById('modal-meta').classList.add('open');
}
async function salvarMeta(){
  const nome=document.getElementById('meta-nome').value.trim();
  const valor=parseFloat(document.getElementById('meta-valor').value);
  const investido=parseFloat(document.getElementById('meta-investido').value)||0;
  if(!nome){showMsg('msg-meta','Informe o nome','err');return}
  if(!valor||valor<=0){showMsg('msg-meta','Valor alvo inválido','err');return}
  const id=document.getElementById('meta-edit-id').value;
  const icone=document.getElementById('meta-icone').value.trim();
  const cor=document.getElementById('meta-cor').value;
  if(id){const i=pd().metas.findIndex(m=>m.id===id);if(i>=0)pd().metas[i]={...pd().metas[i],nome,valor,investido,icone,cor}}
  else{pd().metas.push({id:uid(),nome,valor,investido,icone,cor})}
  await saveCollection('metas');closeModal('modal-meta');renderMetas();populateDashMetaSel();
}
async function remMeta(id){
  if(!confirm('Excluir esta meta?'))return;
  pd().metas=pd().metas.filter(m=>m.id!==id);
  renderMetas();
  populateDashMetaSel();
  renderDashMeta();
  saveCollection('metas');
}

function renderMetas(){
  const metas=pd().metas;
  document.getElementById('metas-sub').textContent='Quanto falta para cada objetivo de dinheiro';
  const cont=document.getElementById('metas-cards');
  if(!metas.length){
    cont.innerHTML='<div class="card fr-vazio" style="grid-column:1/-1"><b>Nenhuma meta ainda</b><p>Defina um valor para juntar, como a reserva de emergência ou uma viagem, e acompanhe quanto falta.</p><button class="btn primary" onclick="openModalMeta()">+ Nova meta</button></div>';
  } else {
    cont.innerHTML=metas.map(m=>{
      const investido=m.investido||0;
      const pct=Math.min(100,(investido/m.valor)*100);
      const falta=Math.max(0,m.valor-investido);
      const atingida=investido>=m.valor;
      const cor=m.cor||'var(--accent)';
      return`<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div class="meta-tit">${m.icone?escHTML(m.icone)+' ':''}${escHTML(m.nome)}</div>
          <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
            ${atingida?'<span class="fr-selo ok">Atingida</span>':''}
            <button class="btn xs" onclick="openModalMeta('${m.id}')" title="Editar" aria-label="Editar meta">${ICO_EDITAR}</button>
            <button class="btn danger xs" onclick="remMeta('${m.id}')" title="Excluir" aria-label="Excluir meta">✕</button>
          </div>
        </div>
        <div class="meta-valor">${fmtR0(m.valor)}</div>
        <div class="prog-meta"><span>${fmtR(investido)} guardado</span><strong>${pct.toFixed(1).replace('.',',')}%</strong></div>
        <div class="prog-track"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:${cor}"></div></div>
        <div class="meta-rodape">
          <span>${atingida?'Meta atingida':`Falta <b>${fmtR(falta)}</b>`}</span>
          <button type="button" onclick="openModalMeta('${m.id}')">Atualizar saldo</button>
        </div>
      </div>`;
    }).join('');
  }
  renderSim();
}

function renderSim(){
  const metas=pd().metas;
  const aporte=parseFloat(document.getElementById('sim-aporte').value)||300;
  const cdi=(parseFloat(document.getElementById('sim-cdi').value)||0.8)/100;
  if(!metas.length){document.getElementById('sim-resultado').innerHTML='<p class="empty" style="padding:8px 0;text-align:left">Crie uma meta para ver em quanto tempo chega lá.</p>';return}

  const rows=metas.map(m=>{
    const investido=m.investido||0;
    const nome=`${m.icone?escHTML(m.icone)+' ':''}${escHTML(m.nome)}`;
    if(investido>=m.valor)return`
      <div class="sim-linha"><div class="sim-nome">${nome}</div><span class="fr-selo ok">Atingida</span></div>`;
    let s=investido,mes=0;
    while(s<m.valor&&mes<600){s=s*(1+cdi)+aporte;mes++}
    const a=Math.floor(mes/12),mr=mes%12;
    const prazo=a>0?`${a} ${a>1?'anos':'ano'}${mr?` e ${mr} ${mr>1?'meses':'mês'}`:''}`:`${mes} ${mes===1?'mês':'meses'}`;
    const rend=s-investido-aporte*mes;
    return`
      <div class="sim-linha">
        <div class="sim-nome">${nome}</div>
        <div class="sim-prazo">${prazo}</div>
        <div class="sim-det">Rendimento <b>${fmtR(rend)}</b>, saldo final <b>${fmtR(s)}</b></div>
      </div>`;
  }).join('');

  document.getElementById('sim-resultado').innerHTML=`<div>${rows}</div>`;
}

// ─── OBJETIVOS ────────────────────────────────────────────────────────────────
var objDashOpen = false;
function toggleObjDash(){
  objDashOpen = !objDashOpen;
  const wrap = document.getElementById('obj-dash-wrap');
  const arrow = document.getElementById('obj-toggle-arrow');
  const toggle = document.getElementById('obj-view-toggle');
  const label = document.getElementById('obj-toggle-label');
  if(objDashOpen){
    wrap.style.maxHeight = wrap.scrollHeight + 800 + 'px';
    arrow.style.transform = 'rotate(180deg)';
    toggle.classList.add('open');
    label.textContent = 'Dashboard';
    renderObjDash();
  } else {
    wrap.style.maxHeight = '0';
    arrow.style.transform = 'rotate(0deg)';
    toggle.classList.remove('open');
    label.textContent = 'Dashboard';
  }
}

function openModalObj(id){
  document.getElementById('mo-title').textContent=id?'Editar objetivo':'Novo objetivo';
  document.getElementById('obj-edit-id').value=id||'';
  if(id){const o=pd().objs.find(x=>x.id===id);if(o){document.getElementById('obj-desc').value=o.desc;document.getElementById('obj-periodo').value=o.periodo;document.getElementById('obj-prioridade').value=o.prioridade;dpSetValue('obj-data',o.data||hoje())}}
  else{document.getElementById('obj-desc').value='';dpInit('obj-data',hoje())}
  document.getElementById('modal-obj').classList.add('open');
}
async function salvarObj(){
  const desc=document.getElementById('obj-desc').value.trim();
  if(!desc){showMsg('msg-obj','Informe a descrição','err');return}
  const id=document.getElementById('obj-edit-id').value, periodo=document.getElementById('obj-periodo').value, prioridade=document.getElementById('obj-prioridade').value, data=document.getElementById('obj-data').value;
  if(id){const i=pd().objs.findIndex(o=>o.id===id);if(i>=0)pd().objs[i]={...pd().objs[i],desc,periodo,prioridade,data}}
  else{pd().objs.push({id:uid(),desc,periodo,prioridade,data,done:false})}
  await saveCollection('objs');closeModal('modal-obj');renderObjs();
}
async function toggleObj(id){const o=pd().objs.find(x=>x.id===id);if(o)o.done=!o.done;await saveCollection('objs');renderObjs()}
async function remObj(id){
  if(!confirm('Excluir?'))return;
  pd().objs=pd().objs.filter(o=>o.id!==id);
  renderObjs();
  saveCollection('objs');
}
const PCOL={alta:'var(--red)',media:'var(--accent)',baixa:'var(--muted)'}, PLBL={alta:'Alta',media:'Média',baixa:'Baixa'};

function renderObjItem(o){
  return`<div class="obj-item">
    <div class="obj-check ${o.done?'done':''}" onclick="toggleObj('${o.id}')">${o.done?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':''}</div>
    <div style="flex:1"><div class="obj-text ${o.done?'done':''}">${escHTML(o.desc)}</div>
      <div class="obj-meta-row"><span style="color:${PCOL[o.prioridade]}">${PLBL[o.prioridade]}</span>${o.data?`<span>até ${o.data.split('-').reverse().join('/')}</span>`:''}</div></div>
    <div style="display:flex;gap:4px"><button class="btn xs" onclick="openModalObj('${o.id}')">${ICO_EDITAR}</button><button class="btn danger xs" onclick="remObj('${o.id}')">✕</button></div>
  </div>`;
}

function renderObjs(){
  document.getElementById('obj-sub').textContent='Tarefas do dia, da semana e do mês';
  ['hoje','semana','mes'].forEach(p=>{
    const lista=pd().objs.filter(o=>o.periodo===p).sort((a,b)=>{const po={alta:0,media:1,baixa:2};return po[a.prioridade]-po[b.prioridade]});
    const el=document.getElementById('obj-'+p);
    if(!lista.length){el.innerHTML='<p class="empty" style="padding:6px 0 4px;text-align:left">Nada por aqui. Toque em "+ Novo objetivo" para incluir.</p>';return}
    el.innerHTML=lista.map(renderObjItem).join('');
  });
  if(objDashOpen) renderObjDash();
}

function renderObjDash(){
  const objs=pd().objs;
  const periodos=['hoje','semana','mes'];
  const labels={hoje:'Hoje',semana:'Semana',mes:'Mês'};
  const total=objs.length, done=objs.filter(o=>o.done).length, pend=total-done;

  // Métricas gerais
  const pct=total>0?Math.round((done/total)*100):0;
  const altaPend=objs.filter(o=>!o.done&&o.prioridade==='alta').length;
  document.getElementById('obj-dash-metrics').innerHTML=`
    <div class="mc"><div class="mc-label">Total de objetivos</div><div class="mc-val">${total}</div></div>
    <div class="mc"><div class="mc-label">Concluídos</div><div class="mc-val green">${done}</div><div class="mc-sub">${pct}% do total</div></div>
    <div class="mc"><div class="mc-label">Pendentes</div><div class="mc-val amber">${pend}</div></div>
    <div class="mc"><div class="mc-label">Alta prioridade pend.</div><div class="mc-val red">${altaPend}</div></div>
    <div class="mc"><div class="mc-label">Taxa de conclusão</div><div class="mc-val ${pct>=70?'green':pct>=40?'amber':'red'}">${pct}%</div>
      <div style="margin-top:6px;background:var(--surface3);border-radius:4px;height:5px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${pct>=70?'var(--green)':pct>=40?'var(--amber)':'var(--red)'};border-radius:4px"></div></div>
    </div>
  `;

  // Concluídos e pendentes por período
  periodos.forEach(p=>{
    const lista=objs.filter(o=>o.periodo===p).sort((a,b)=>{const po={alta:0,media:1,baixa:2};return po[a.prioridade]-po[b.prioridade]});
    const doneList=lista.filter(o=>o.done);
    const pendList=lista.filter(o=>!o.done);

    const elDone=document.getElementById(`obj-dash-${p}-done`);
    const elPend=document.getElementById(`obj-dash-${p}-pend`);

    // barra de progresso do período
    const ptotal=lista.length, pdone=doneList.length;
    const ppct=ptotal>0?Math.round((pdone/ptotal)*100):0;
    const barraHTML=ptotal>0?`<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <div style="flex:1;background:var(--surface3);border-radius:4px;height:5px;overflow:hidden"><div style="width:${ppct}%;height:100%;background:var(--green);border-radius:4px"></div></div>
      <span style="font-size:11px;color:var(--muted);white-space:nowrap">${pdone}/${ptotal}</span>
    </div>`:'';

    if(!doneList.length){
      elDone.innerHTML=barraHTML+'<p class="empty" style="padding:8px 0;font-size:12px">Nenhum concluído</p>';
    } else {
      elDone.innerHTML=barraHTML+doneList.map(o=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <div style="width:14px;height:14px;border-radius:4px;background:var(--green);flex-shrink:0;display:flex;align-items:center;justify-content:center">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span style="font-size:12px;text-decoration:line-through;color:var(--muted);flex:1">${escHTML(o.desc)}</span>
        </div>`).join('');
    }

    if(!pendList.length){
      elPend.innerHTML='<p class="empty" style="padding:8px 0;font-size:12px;color:var(--green)">Tudo concluído</p>';
    } else {
      elPend.innerHTML=pendList.map(o=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <div style="width:8px;height:8px;border-radius:50%;background:${PCOL[o.prioridade]};flex-shrink:0"></div>
          <span style="font-size:12px;flex:1;color:var(--text)">${escHTML(o.desc)}</span>
          <span style="font-size:10px;color:${PCOL[o.prioridade]};white-space:nowrap">${PLBL[o.prioridade]}</span>
        </div>`).join('');
    }
  });

  // Ajusta altura do wrapper após renderizar
  const wrap=document.getElementById('obj-dash-wrap');
  wrap.style.maxHeight=wrap.scrollHeight+200+'px';
}

