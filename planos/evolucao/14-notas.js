// planos/evolucao/14-notas.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
function getNotas(){return pd().notas||[];}
async function saveNotas(){
  if(!pd().notas)pd().notas=[];
  lsSave(cp,'notas'); fbSave(cp,'notas');
  if(fbOk)try{await _set(_ref(_db,`financeiro/${cp}/notas`),pd().notas)}catch(e){}
}

function addNota(){
  const titulo=document.getElementById('nota-titulo').value.trim();
  const texto=document.getElementById('nota-texto').value.trim();
  const cat=document.getElementById('nota-cat').value;
  const cor=document.getElementById('nota-cor').value;
  if(!titulo&&!texto){showMsg('msg-nota','Escreva algo antes de salvar','err');return}
  if(!pd().notas)pd().notas=[];
  pd().notas.unshift({id:uid(),titulo:titulo||'Sem título',texto,cat,cor,data:hoje(),hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
  saveNotas();limparFormNota();showMsg('msg-nota','Nota salva!','ok');renderNotas();
}

function limparFormNota(){
  document.getElementById('nota-titulo').value='';
  document.getElementById('nota-texto').value='';
  document.getElementById('nota-cat').value='Geral';
  document.getElementById('nota-cor').value='default';
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
  const notas=getNotas();const i=notas.findIndex(n=>n.id===id);
  if(i>=0)notas[i]={...notas[i],titulo:document.getElementById('nota-edit-titulo').value.trim()||'Sem título',texto:document.getElementById('nota-edit-texto').value.trim(),cat:document.getElementById('nota-edit-cat').value,cor:document.getElementById('nota-edit-cor').value,editada:hoje()};
  await saveNotas();closeModal('modal-nota');renderNotas();
}

async function remNota(id){
  if(!confirm('Excluir esta nota?'))return;
  pd().notas=getNotas().filter(n=>n.id!==id);renderNotas();saveNotas();
}

function renderNotas(){
  try{
  document.getElementById('notas-sub').textContent='Perfil: '+PNAMES[cp];
  const busca=(document.getElementById('nota-busca')||{}).value?.toLowerCase()||'';
  const filtCat=(document.getElementById('nota-filtro-cat')||{}).value||'';
  let notas=getNotas();
  if(busca)notas=notas.filter(n=>(n.titulo+n.texto).toLowerCase().includes(busca));
  if(filtCat)notas=notas.filter(n=>n.cat===filtCat);
  const grid=document.getElementById('notas-grid');
  if(!notas.length){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);font-size:13px">${busca||filtCat?'Nenhuma nota encontrada':'Nenhuma nota ainda. Crie sua primeira anotação acima!'}</div>`;return}
  grid.innerHTML=notas.map(n=>{
    const c=NOTA_CORES[n.cor||'default'];
    const preview=n.texto.length>120?n.texto.slice(0,120)+'...':n.texto;
    return`<div style="background:${c.bg};border:1px solid ${c.border};border-radius:var(--radius);padding:14px;display:flex;flex-direction:column;gap:8px;min-height:120px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0">
          <div style="width:8px;height:8px;border-radius:50%;background:${c.dot};flex-shrink:0"></div>
          <div style="font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.titulo}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn xs" onclick="abrirEditNota('${n.id}')">✏</button>
          <button class="btn danger xs" onclick="remNota('${n.id}')">✕</button>
        </div>
      </div>
      ${preview?`<div style="font-size:12px;color:var(--muted);line-height:1.6;flex:1;white-space:pre-wrap">${preview}</div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto">
        <span style="font-size:10px;background:var(--surface3);padding:2px 7px;border-radius:20px;color:var(--muted)">${n.cat}</span>
        <span style="font-size:10px;color:var(--muted2)">${n.data}${n.hora?' · '+n.hora:''}</span>
      </div>
    </div>`;
  }).join('');
  }catch(e){console.error('renderNotas error:',e);}
}

