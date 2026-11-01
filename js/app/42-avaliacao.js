// js/app/42-avaliacao.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── AVALIAÇÃO DO FINROSSI (clientes de todos os planos) ────────────────────────
// Estrelas de 1 a 5 + comentário opcional. Uma avaliação por cliente (dá para mudar depois).
// Fica em avaliacoes/<uid> = { estrelas, comentario, em, primeiraEm } — o cliente grava só a dele e a equipe
// lê todas (Painel do negócio → Avaliações). A equipe não avalia.
// Entradas: menu "Mais" do celular e Configurações (botões só aparecem para clientes).

const AVAL_ROTULOS = ['', 'Muito ruim', 'Ruim', 'Bom', 'Muito bom', 'Excelente'];
const AVAL_ESTRELA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';
let _avalMinha = undefined, _avalNota = 0, _avalUid = null;
// A avaliação guardada vale só para a conta que a leu (outra pessoa pode entrar no mesmo aparelho)
function _avalConta(){ const uid = window._firebaseUser?.uid || null; if(uid !== _avalUid){ _avalUid = uid; _avalMinha = undefined; } }

const _avalEhCliente = () => (window._userRole || (typeof _userRole !== 'undefined' ? _userRole : '')) === 'cliente';
function _avalRef(){
  const u = window._firebaseUser;
  return u && window._db && window._ref ? window._ref(window._db, `avaliacoes/${u.uid}`) : null;
}
function _avalLer(){
  return new Promise(res => {
    const r = _avalRef(); if(!r || !window._onValue) return res(null);
    const t = setTimeout(() => res(null), 4000);
    try{ window._onValue(r, s => { clearTimeout(t); res(s.val()); }, () => { clearTimeout(t); res(null); }, { onlyOnce: true }); }catch(e){ clearTimeout(t); res(null); }
  });
}

// Mostra/esconde os botões "Avaliar o FinRossi" e troca o texto quando já avaliou
async function atualizarEntradasAvaliacao(){
  const cli = _avalEhCliente();
  ['mnav-avaliar', 'cfg-avaliar'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = cli ? (id === 'cfg-avaliar' ? 'flex' : '') : 'none'; });
  if(!cli) return;
  _avalConta();
  if(_avalMinha === undefined) _avalMinha = await _avalLer();
  const sub = document.getElementById('mnav-avaliar-sub'), txt = document.getElementById('cfg-avaliar-txt');
  if(_avalMinha && _avalMinha.estrelas){
    if(sub) sub.textContent = `Sua nota: ${_avalMinha.estrelas} de 5 · toque para mudar`;
    if(txt) txt.textContent = `Sua avaliação: ${_avalMinha.estrelas} de 5 · mudar`;
  } else {
    if(sub) sub.textContent = 'Conte o que está achando';
    if(txt) txt.textContent = 'Avaliar o FinRossi';
  }
}

async function abrirAvaliacao(){
  _avalConta();
  if(_avalMinha === undefined) _avalMinha = await _avalLer();
  const a = _avalMinha || {};
  _avalNota = a.estrelas || 0;
  let m = document.getElementById('avaliacao-modal');
  if(!m){ m = document.createElement('div'); m.id = 'avaliacao-modal'; m.className = 'modal-overlay'; m.addEventListener('click', e => { if(e.target === m) m.classList.remove('open'); }); document.body.appendChild(m); }
  m.innerHTML = `<div class="fav-vidro aval" role="dialog" aria-modal="true" aria-labelledby="aval-tit">
    <button type="button" class="fav-fechar aval-fechar" onclick="document.getElementById('avaliacao-modal').classList.remove('open')" aria-label="Fechar">✕</button>
    <h3 id="aval-tit">${a.estrelas ? 'Sua avaliação' : 'Avalie o FinRossi'}</h3>
    <p>${a.estrelas ? 'Mudou de ideia? Pode atualizar quando quiser.' : 'Sua opinião ajuda a deixar o app cada vez melhor.'}</p>
    <div class="aval-estrelas" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
      ${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" aria-label="${n} estrela${n > 1 ? 's' : ''}: ${AVAL_ROTULOS[n]}" data-n="${n}" onclick="avalEscolher(${n})">${AVAL_ESTRELA}</button>`).join('')}
    </div>
    <div class="aval-rotulo" id="aval-rotulo">Toque nas estrelas</div>
    <div class="field" style="margin:0;width:100%"><label for="aval-com">Conte o que está achando <span style="color:var(--muted2)">(opcional)</span></label>
      <textarea id="aval-com" rows="4" maxlength="1000" placeholder="O que você mais gosta? O que podemos melhorar?" oninput="document.getElementById('aval-cont').textContent=this.value.length+'/1000'">${escHTML(a.comentario || '')}</textarea>
      <div class="aval-cont" id="aval-cont">${(a.comentario || '').length}/1000</div></div>
    <div class="msg" id="msg-aval" style="margin:0;min-height:0"></div>
    <button type="button" class="btn primary" id="aval-enviar" style="width:100%;justify-content:center;height:44px" onclick="enviarAvaliacao()" ${_avalNota ? '' : 'disabled'}>${a.estrelas ? 'Atualizar avaliação' : 'Enviar avaliação'}</button>
  </div>`;
  avalPintar(_avalNota);
  m.classList.add('open');
}
function avalPintar(n){
  document.querySelectorAll('#avaliacao-modal .aval-estrelas button').forEach(b => {
    const k = +b.dataset.n; b.classList.toggle('on', k <= n); b.setAttribute('aria-checked', k === n ? 'true' : 'false');
  });
  const r = document.getElementById('aval-rotulo'); if(r) r.textContent = n ? AVAL_ROTULOS[n] : 'Toque nas estrelas';
}
function avalEscolher(n){
  _avalNota = n; avalPintar(n);
  const b = document.getElementById('aval-enviar'); if(b) b.disabled = false;
  const est = document.querySelector(`#avaliacao-modal .aval-estrelas button[data-n="${n}"]`);
  if(est){ est.classList.remove('pulo'); void est.offsetWidth; est.classList.add('pulo'); }
}
async function enviarAvaliacao(){
  if(!_avalNota) return;
  const btn = document.getElementById('aval-enviar'), r = _avalRef();
  if(!r || !window._set){ showMsg('msg-aval', 'Sem conexão agora. Tente de novo em instantes.', 'err'); return; }
  btn.disabled = true; btn.textContent = 'Enviando…';
  const agora = Date.now();
  const dados = { estrelas: _avalNota, comentario: document.getElementById('aval-com').value.trim().slice(0, 1000), em: agora, primeiraEm: (_avalMinha && _avalMinha.primeiraEm) || agora };
  if(!dados.comentario) delete dados.comentario;
  try{
    await window._set(r, dados);
    _avalMinha = dados;
    document.getElementById('avaliacao-modal').classList.remove('open');
    atualizarEntradasAvaliacao();
    if(typeof _avisoVenc === 'function') _avisoVenc(_avalNota >= 4 ? 'Obrigado pela avaliação! Ficamos muito felizes.' : 'Obrigado pela avaliação! Vamos usar para melhorar o FinRossi.', 'ok');
  }catch(e){
    showMsg('msg-aval', 'Não deu para enviar agora. Tente de novo em instantes.', 'err');
    btn.disabled = false; btn.textContent = 'Enviar avaliação';
  }
}
