// planos/patrimonio/anexos.js — Anexos de foto nos lançamentos (exclusivo do plano Patrimônio)
// • Antes de salvar: o cliente anexa uma foto (câmera ou galeria) e pode trocar/remover à vontade.
// • Ao tocar em "Adicionar": o anexo é gravado e fica TRAVADO — só dá para ver, nunca trocar nem apagar.
//   O registro guarda só os dados do anexo (id, data); a foto fica em anexos/<perfil>/<id>,
//   que as regras do banco permitem apenas CRIAR (não alterar nem apagar).
// • Cópia local em IndexedDB: abre rápido e funciona sem internet.

const _anexoPendente = { r: null, d: null };   // { blob, url } por formulário (receita/despesa)

// ── Guarda local (IndexedDB) ─────────────────────────────────────────────────
function _anexosDB(){
  return new Promise((res, rej) => {
    const req = indexedDB.open('finrossi-anexos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('fotos');
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function _anexoLocalGet(id){
  try{ const db = await _anexosDB(); return await new Promise(r => { const q = db.transaction('fotos').objectStore('fotos').get(id); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); }
  catch(e){ return null; }
}
async function _anexoLocalPut(id, dados){
  try{
    const db = await _anexosDB();
    const store = db.transaction('fotos', 'readwrite').objectStore('fotos');
    const existe = await new Promise(r => { const q = store.get(id); q.onsuccess = () => r(!!q.result); q.onerror = () => r(false); });
    if(!existe) store.put(dados, id);   // nunca sobrescreve
  }catch(e){}
}

// Caminho na nuvem: o próprio uid para clientes; o perfil (pessoal/finrossi) para a equipe
function _anexoCaminho(id){
  const role = window._userRole || (typeof _userRole !== 'undefined' ? _userRole : '');
  const dono = (role === 'cliente' && window._firebaseUser?.uid) ? window._firebaseUser.uid : cp;
  return `anexos/${dono}/${id}`;
}

// Reduz a foto para guardar (lado maior 1280px, JPEG 70%) → ~100–200 KB
function _compactarFoto(blob){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const maior = Math.max(img.naturalWidth, img.naturalHeight);
      const k = Math.min(1, 1280 / maior);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => rej(new Error('Não consegui abrir essa imagem.'));
    img.src = URL.createObjectURL(blob);
  });
}

// ── Formulário: anexo pendente (antes de salvar) ─────────────────────────────
async function definirAnexoPendente(p, blob){
  try{
    const url = await _compactarFoto(blob);
    _anexoPendente[p] = { url };
    document.getElementById(`${p}-anexo-img`).src = url;
    document.getElementById(`${p}-anexo-vazio`).hidden = true;
    document.getElementById(`${p}-anexo-preview`).hidden = false;
  }catch(e){ showMsg('msg-' + p, e.message || 'Não consegui anexar a foto', 'err'); }
}

function limparAnexoPendente(p){
  _anexoPendente[p] = null;
  const prev = document.getElementById(`${p}-anexo-preview`), vazio = document.getElementById(`${p}-anexo-vazio`);
  if(prev) prev.hidden = true;
  if(vazio) vazio.hidden = false;
  // zera os seletores: escolher o mesmo arquivo de novo precisa funcionar
  ['galeria','camera'].forEach(m => { const i = document.getElementById(`${p}-anexo-${m}`); if(i) i.value = ''; });
}

function anexarFoto(p, modo){
  if(!fotoTemAcesso()) return;
  if(modo === 'camera') return tirarFotoPara(blob => definirAnexoPendente(p, blob), `${p}-anexo-camera`);
  const inp = document.getElementById(`${p}-anexo-galeria`);
  if(inp){ inp.value = ''; inp.click(); }
}

// Chamado por addLanc depois das validações: grava a foto e devolve os dados do anexo para o registro
function anexoParaSalvar(p){
  const pend = _anexoPendente[p];
  if(!pend || !fotoTemAcesso()) return null;
  const id = 'ax' + uid();
  const meta = { id, criadoEm: new Date().toISOString() };
  _anexoLocalPut(id, pend.url);
  if(typeof fbOk !== 'undefined' && fbOk && window._db && window._ref && window._set){
    window._set(window._ref(window._db, _anexoCaminho(id)), { dados: pend.url, criadoEm: meta.criadoEm })
      .catch(e => console.warn('[Anexo] não foi para a nuvem (fica no aparelho):', e && e.message));
  }
  _anexoPendente[p] = null;
  return meta;
}

// ── Visualização (somente leitura) ──────────────────────────────────────────
async function verAnexo(id, criadoEm){
  let m = document.getElementById('modal-anexo');
  if(!m){
    m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'modal-anexo';
    m.innerHTML = `<div class="modal anexo-modal">
      <h3>Anexo do lançamento</h3>
      <div class="anexo-visor"><img id="anexo-visor-img" alt="Foto anexada ao lançamento"><p id="anexo-visor-msg"></p></div>
      <p class="anexo-trava"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><span id="anexo-visor-data"></span></p>
      <div class="btn-row"><button class="btn" onclick="closeModal('modal-anexo')">Fechar</button></div>
    </div>`;
    document.body.appendChild(m);
  }
  const img = document.getElementById('anexo-visor-img'), msg = document.getElementById('anexo-visor-msg');
  img.hidden = true; img.removeAttribute('src'); msg.textContent = 'Carregando…';
  const quando = criadoEm ? new Date(criadoEm) : null;
  document.getElementById('anexo-visor-data').textContent = 'Anexado' + (quando ? ` em ${quando.toLocaleDateString('pt-BR')} às ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '') + '. O anexo não pode ser alterado.';
  m.classList.add('open');

  let dados = await _anexoLocalGet(id);
  if(!dados && window._db && window._ref && window._onValue){
    dados = await new Promise(res => {
      const t = setTimeout(() => res(null), 6000);
      window._onValue(window._ref(window._db, _anexoCaminho(id)), s => { clearTimeout(t); const v = s.val(); res(v && v.dados || null); }, { onlyOnce: true });
    });
    if(dados) _anexoLocalPut(id, dados);
  }
  if(dados){ img.src = dados; img.hidden = false; msg.textContent = ''; }
  else msg.textContent = 'Não consegui abrir o anexo agora. Verifique a internet e tente de novo.';
}

// Ícone de clipe para listas (Histórico)
const ICO_ANEXO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>';

// Edição do lançamento: mostra o anexo só para consulta
(function(){
  if(typeof editarLanc !== 'function') return;
  const _editarOriginal = editarLanc;
  window.editarLanc = editarLanc = function(id){
    _editarOriginal(id);
    const box = document.getElementById('mel-anexo');
    if(!box) return;
    const l = pd().lancs.find(x => x.id === id);
    if(l && l.anexo){
      box.hidden = false;
      box.innerHTML = `${ICO_ANEXO}<span>Este lançamento tem um anexo. O anexo não pode ser alterado.</span><button class="btn xs" type="button" onclick="verAnexo('${l.anexo.id}','${l.anexo.criadoEm || ''}')">Ver anexo</button>`;
    } else box.hidden = true;
  };
})();
