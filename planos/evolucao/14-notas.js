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
  const grid=document.getElementById('notas-grid');
  if(!notas.length){grid.innerHTML=busca||filtCat
    ?'<p class="empty" style="grid-column:1/-1">Nenhuma nota encontrada. Ajuste a busca ou a categoria.</p>'
    :'<div class="card fr-vazio" style="grid-column:1/-1"><b>Nenhuma nota ainda</b><p>Guarde ideias, combinados e lembretes.</p><button class="btn primary" onclick="abrirFormNota()">+ Nova nota</button></div>';return}
  grid.innerHTML=notas.map(n=>{
    const c=NOTA_CORES[n.cor]||NOTA_CORES.default;   // cor desconhecida não quebra a tela
    const preview=n.texto.length>120?n.texto.slice(0,120)+'...':n.texto;
    return`<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px;min-height:120px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <div style="width:7px;height:7px;border-radius:50%;background:${c.dot};flex-shrink:0"></div>
          <div class="meta-tit" style="font-size:17px">${escHTML(n.titulo)}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn xs" onclick="abrirEditNota('${n.id}')" title="Editar" aria-label="Editar nota">${ICO_EDITAR}</button>
          <button class="btn danger xs" onclick="remNota('${n.id}')" title="Excluir" aria-label="Excluir nota">✕</button>
        </div>
      </div>
      ${preview?`<div style="font-size:12.5px;color:var(--muted);line-height:1.6;flex:1;white-space:pre-wrap">${escHTML(preview)}</div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;font-size:11.5px;color:var(--muted)">
        <span class="fr-selo">${escHTML(n.cat)}</span>
        <span>${n.data}${n.hora?' às '+n.hora:''}</span>
      </div>
    </div>`;
  }).join('');
  }catch(e){console.error('renderNotas error:',e);}
}

