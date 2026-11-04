// planos/evolucao/14-notas.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// Cores dos cartões de nota (tinham sido apagadas junto com funções duplicadas — a tela de Notas quebrava)
const NOTA_CORES={
  default:{bg:'var(--surface)',border:'var(--border)',dot:'var(--muted)'},
  green:{bg:'rgba(74,222,128,0.06)',border:'rgba(74,222,128,0.25)',dot:'var(--green)'},
  blue:{bg:'rgba(96,165,250,0.06)',border:'rgba(96,165,250,0.25)',dot:'var(--blue)'},
  amber:{bg:'rgba(251,191,36,0.06)',border:'rgba(251,191,36,0.25)',dot:'var(--amber)'},
  red:{bg:'rgba(248,113,113,0.06)',border:'rgba(248,113,113,0.25)',dot:'var(--red)'},
  purple:{bg:'rgba(192,132,252,0.06)',border:'rgba(192,132,252,0.25)',dot:'var(--purple)'},
};
function getNotas(){return pd().notas||[];}
async function saveNotas(){
  if(!pd().notas)pd().notas=[];
  lsSave(cp,'notas');
  await fbSave(cp,'notas');   // fbSave já grava no caminho certo (cliente ou perfil); antes gravava duas vezes
}

function addNota(){
  const titulo=document.getElementById('nota-titulo').value.trim();
  const texto=document.getElementById('nota-texto').value.trim();
  const cat=document.getElementById('nota-cat').value;
  const cor=document.getElementById('nota-cor').value;
  if(!titulo&&!texto){showMsg('msg-nota','Escreva algo antes de salvar','err');return}
  if(!pd().notas)pd().notas=[];
  pd().notas.unshift({id:uid(),titulo:titulo||'Sem título',texto,cat,cor,data:hoje(),hora:new Date().toLocaleTimeString(LOCALE,{hour:'2-digit',minute:'2-digit'})});
  saveNotas();fecharFormNota();renderNotas();   // a nota nova aparece em primeiro na lista
}

function limparFormNota(){
  document.getElementById('nota-titulo').value='';
  document.getElementById('nota-texto').value='';
  document.getElementById('nota-cat').value='Geral';
  document.getElementById('nota-cor').value='default';
}

// O formulário fica escondido: a tela mostra primeiro as notas; "+ Nova nota" abre para escrever
function abrirFormNota(){
  const f=document.getElementById('nota-form'); if(!f) return;
  f.style.display='block';
  f.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>document.getElementById('nota-titulo').focus({preventScroll:true}),250);
}
function fecharFormNota(){
  limparFormNota();
  const f=document.getElementById('nota-form'); if(f) f.style.display='none';
}

function abrirEditNota(id){
  const n=getNotas().find(x=>x.id===id);if(!n)return;
  document.getElementById('nota-edit-id').value=id;
  document.getElementById('nota-edit-titulo').value=n.titulo;
  document.getElementById('nota-edit-texto').value=n.texto;
  document.getElementById('nota-edit-cat').value=n.cat||'Geral';
  document.getElementById('nota-edit-cor').value=n.cor||'default';
  document.getElementById('modal-nota').classList.add('open');
}

async function salvarEditNota(){
  const id=document.getElementById('nota-edit-id').value;
  const notas=getNotas(); const i=notas.findIndex(n=>n.id===id);
  if(i>=0) notas[i]={...notas[i],
    titulo:document.getElementById('nota-edit-titulo').value.trim()||'Sem título',
    texto:document.getElementById('nota-edit-texto').value.trim(),
    cat:document.getElementById('nota-edit-cat').value,
    cor:document.getElementById('nota-edit-cor').value,
    editada:hoje()};
  closeModal('modal-nota'); renderNotas();
  await saveNotas();
}

// ── Concluída / pendente ─────────────────────────────────────────────────────
// Com muitas notas, a pessoa marca o que já resolveu (✓) e filtra: Pendentes (padrão), Concluídas ou Todas.
// A escolha do filtro fica lembrada no aparelho, por perfil.
function _notaSit(){ try{ return localStorage.getItem('fin_notas_sit_'+cp)||'pendentes'; }catch(e){ return 'pendentes'; } }
function setNotaSit(s){ try{ localStorage.setItem('fin_notas_sit_'+cp,s); }catch(e){} renderNotas(); }
async function toggleNotaConcluida(id){
  const n=getNotas().find(x=>x.id===id); if(!n) return;
  n.concluida=!n.concluida;
  n.concluidaEm=n.concluida?hoje():null;
  renderNotas();
  await saveNotas();
}
const _dataNotaBR=d=>{ if(!d) return ''; try{ return new Date(d+'T12:00:00').toLocaleDateString(typeof LOCALE!=='undefined'?LOCALE:'pt-BR'); }catch(e){ return String(d).split('-').reverse().join('/'); } };

async function remNota(id){
  if(!confirm('Excluir esta nota?'))return;
  pd().notas=getNotas().filter(n=>n.id!==id);renderNotas();saveNotas();
}

function renderNotas(){
  try{
  document.getElementById('notas-sub').textContent='Anotações, ideias e lembretes';
  const busca=(document.getElementById('nota-busca')||{}).value?.toLowerCase()||'';
  const filtCat=(document.getElementById('nota-filtro-cat')||{}).value||'';
  let notas=getNotas();
  if(busca)notas=notas.filter(n=>(n.titulo+n.texto).toLowerCase().includes(busca));
  if(filtCat)notas=notas.filter(n=>n.cat===filtCat);
  // Situação: contagem com a busca/categoria aplicadas; "Todas" mostra as pendentes primeiro
  const sit=_notaSit();
  const qtd={pendentes:notas.filter(n=>!n.concluida).length, concluidas:notas.filter(n=>n.concluida).length, todas:notas.length};
  document.querySelectorAll('#nota-sit button').forEach(b=>{
    b.classList.toggle('ativo',b.dataset.sit===sit);
    b.setAttribute('aria-selected',b.dataset.sit===sit?'true':'false');
    const q=b.querySelector('.nota-qtd'); if(q) q.textContent=qtd[b.dataset.sit];
  });
  const total=notas.length;
  if(sit==='pendentes') notas=notas.filter(n=>!n.concluida);
  else if(sit==='concluidas') notas=notas.filter(n=>n.concluida);
  else notas=[...notas.filter(n=>!n.concluida),...notas.filter(n=>n.concluida)];
  const grid=document.getElementById('notas-grid');
  if(!notas.length){grid.innerHTML=busca||filtCat
    ?'<p class="empty" style="grid-column:1/-1">Nenhuma nota encontrada. Ajuste a busca ou a categoria.</p>'
    :total&&sit==='pendentes'
      ?'<div class="card fr-vazio" style="grid-column:1/-1"><b>Nenhuma nota pendente</b><p>Tudo concluído por aqui. As notas resolvidas ficam em Concluídas.</p></div>'
    :total&&sit==='concluidas'
      ?'<div class="card fr-vazio" style="grid-column:1/-1"><b>Nenhuma nota concluída ainda</b><p>Quando resolver uma nota, toque no ✓ dela para marcar como concluída.</p></div>'
      :'<div class="card fr-vazio" style="grid-column:1/-1"><b>Nenhuma nota ainda</b><p>Guarde ideias, combinados e lembretes.</p><button class="btn primary" onclick="abrirFormNota()">+ Nova nota</button></div>';return}
  const ICO_OK='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  grid.innerHTML=notas.map(n=>{
    const c=NOTA_CORES[n.cor]||NOTA_CORES.default;   // cor desconhecida não quebra a tela
    const preview=n.texto.length>120?n.texto.slice(0,120)+'...':n.texto;
    const feita=!!n.concluida;
    return`<div class="nota-card${feita?' feita':''}" style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px;min-height:120px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <div style="width:7px;height:7px;border-radius:50%;background:${c.dot};flex-shrink:0"></div>
          <div class="meta-tit nota-tit" style="font-size:17px">${escHTML(n.titulo)}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn xs nota-ok${feita?' on':''}" onclick="toggleNotaConcluida('${n.id}')" aria-pressed="${feita}" title="${feita?'Reabrir nota':'Marcar como concluída'}" aria-label="${feita?'Reabrir nota':'Marcar como concluída'}">${ICO_OK}</button>
          <button class="btn xs" onclick="abrirEditNota('${n.id}')" title="Editar" aria-label="Editar nota">${ICO_EDITAR}</button>
          <button class="btn danger xs" onclick="remNota('${n.id}')" title="Excluir" aria-label="Excluir nota">✕</button>
        </div>
      </div>
      ${preview?`<div style="font-size:12.5px;color:var(--muted);line-height:1.6;flex:1;white-space:pre-wrap">${escHTML(preview)}</div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;font-size:11.5px;color:var(--muted)">
        <span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="fr-selo">${escHTML(n.cat)}</span>${feita?`<span class="nota-selo-feita"><span>Concluída</span> ${_dataNotaBR(n.concluidaEm)}</span>`:''}</span>
        <span>${n.data}${n.hora?' às '+n.hora:''}</span>
      </div>
    </div>`;
  }).join('');
  }catch(e){console.error('renderNotas error:',e);}
}

