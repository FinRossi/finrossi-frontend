// js/app/38-primeiro-acesso.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PRIMEIRO ACESSO (conta criada pela equipe com senha provisória) ─────────
// 1) O cliente entra com a senha provisória → a tela "Primeiro acesso" cobre o app (não fecha)
//    e manda para o e-mail dele um link "Criar minha senha" (servidor + Resend).
// 2) O link abre finrossi.com.br/?modo=criar-senha&oobCode=… → tela "Crie sua senha".
//    Ao salvar, o servidor troca a senha pelo código do e-mail: a provisória deixa de valer e o
//    e-mail fica confirmado (só quem abriu o e-mail tem o código).

function _paOverlay(id){
  let m = document.getElementById(id);
  if(!m){
    m = document.createElement('div');
    m.id = id;
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(8,8,7,.94);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
    document.body.appendChild(m);
  }
  return m;
}
const _paSelo = '<div aria-hidden="true" style="width:46px;height:46px;flex-shrink:0;border-radius:50%;border:1px solid var(--accent);background:var(--accent-s);display:flex;align-items:center;justify-content:center;color:var(--accent)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg></div>';
const _paCartao = corpo => `<div class="modal" style="max-width:420px;width:100%;display:flex;flex-direction:column;gap:14px;margin:auto">${corpo}</div>`;
const _paCabeca = (titulo, sub) => `<div style="display:flex;align-items:center;gap:12px">${_paSelo}<div><h3 style="margin:0">${titulo}</h3><div style="font-size:12px;color:var(--muted);margin-top:2px">${sub}</div></div></div>`;
const _paTexto = t => `<p style="margin:0;font-size:13px;color:var(--muted);line-height:1.6">${t}</p>`;

// ── Confirmação do celular por SMS (passo 1 do primeiro acesso) ────────────
// Liga/desliga: fica false até o Lucas ativar o login por telefone na Firebase (plano Blaze, SMS só
// para o Brasil). Enquanto false, o primeiro acesso vai direto ao passo do e-mail.
// Depois: trocar o SMS por código no WhatsApp do FinRossi (número próprio + API da Meta) — ver backlog.
const TELEFONE_SMS_ATIVO = false;
let _paConfirmacaoSms = null, _paRecaptcha = null;

function mostrarPrimeiroAcesso(){
  const u = window._firebaseUser; if(!u) return;
  // Abriu pelo link do e-mail neste mesmo aparelho (ainda logado com a provisória): a tela
  // "Crie a sua senha" já está aberta — não cobrir com o "Primeiro acesso"
  const criar = document.getElementById('pa-criar-senha');
  if(criar && criar.style.display !== 'none') return;
  if(TELEFONE_SMS_ATIVO && !u.phoneNumber) return _paPassoTelefone();
  _paPassoEmail();
}
function _paPassoTelefone(){
  const m = _paOverlay('pa-primeiro-acesso');
  m.innerHTML = _paCartao(
    _paCabeca('Primeiro acesso', 'Passo 1 de 2 · confirme o seu celular') +
    _paTexto('Vamos mandar um código por SMS para confirmar o seu número. Use o celular com DDD.') +
    '<div class="field"><label for="pa-tel">Celular</label><input id="pa-tel" type="tel" inputmode="tel" maxlength="16" placeholder="(11) 98765-4321" oninput="ncMascaraTelefone(this)"></div>' +
    '<div id="pa-codigo-bloco" style="display:none" class="field"><label for="pa-codigo">Código recebido por SMS</label><input id="pa-codigo" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" onkeydown="if(event.key===\'Enter\')confirmarCodigoSms()"></div>' +
    '<div id="pa-recaptcha"></div>' +
    '<div id="pa-msg" class="msg" style="margin:0;min-height:0"></div>' +
    '<div class="btn-row" style="flex-direction:column;align-items:stretch;gap:8px"><button class="btn primary" type="button" id="pa-sms" onclick="enviarCodigoSms()">Enviar código por SMS</button>' +
    '<button class="btn" type="button" onclick="sairDoPrimeiroAcesso()">Sair da conta</button></div>'
  );
  m.style.display = 'flex';
  // Preenche com o número do cadastro (se a equipe informou)
  try{
    window._onValue(window._ref(window._db, `usuarios/${window._firebaseUser.uid}/telefone`), s => {
      const t = String(s.val() || '').replace(/^55/, ''); const el = document.getElementById('pa-tel');
      if(t && el && !el.value){ el.value = t; ncMascaraTelefone(el); }
    }, () => {}, { onlyOnce:true });
  }catch(e){}
}
async function enviarCodigoSms(){
  const f = window._firebase, msg = document.getElementById('pa-msg'), btn = document.getElementById('pa-sms');
  const d = (document.getElementById('pa-tel').value || '').replace(/\D/g, '');
  const erro = t => { msg.className = 'msg err'; msg.textContent = t; btn.disabled = false; btn.textContent = 'Enviar código por SMS'; };
  if(d.length < 10 || d.length > 11) return erro('Celular inválido: use DDD + número.');
  btn.disabled = true; btn.textContent = 'Enviando…'; msg.textContent = '';
  try{
    if(!_paRecaptcha) _paRecaptcha = new f.RecaptchaVerifier(f.auth, 'pa-recaptcha', { size:'invisible' });   // anti-robô da Google
    _paConfirmacaoSms = await f.linkWithPhoneNumber(window._firebaseUser, '+55' + d, _paRecaptcha);
    document.getElementById('pa-codigo-bloco').style.display = '';
    msg.className = 'msg ok'; msg.textContent = 'Código enviado! Digite os 6 números que chegaram por SMS.';
    btn.textContent = 'Confirmar código'; btn.disabled = false; btn.onclick = confirmarCodigoSms;
    setTimeout(() => document.getElementById('pa-codigo')?.focus(), 100);
  }catch(e){
    const c = e && e.code;
    erro(c === 'auth/invalid-phone-number' ? 'Número inválido. Confira o DDD.'
      : c === 'auth/too-many-requests' ? 'Muitas tentativas. Aguarde alguns minutos.'
      : c === 'auth/credential-already-in-use' || c === 'auth/account-exists-with-different-credential' ? 'Este celular já está ligado a outra conta do FinRossi.'
      : c === 'auth/operation-not-allowed' ? 'A confirmação por SMS ainda não foi ligada. Avise a equipe do FinRossi.'
      : 'Não deu para enviar o SMS agora. Tente de novo.');
  }
}
async function confirmarCodigoSms(){
  const msg = document.getElementById('pa-msg'), btn = document.getElementById('pa-sms');
  const codigo = (document.getElementById('pa-codigo').value || '').replace(/\D/g, '');
  if(codigo.length !== 6 || !_paConfirmacaoSms){ msg.className = 'msg err'; msg.textContent = 'Digite os 6 números do SMS.'; return; }
  btn.disabled = true; btn.textContent = 'Confirmando…';
  try{
    await _paConfirmacaoSms.confirm(codigo);                    // liga o celular à conta na Firebase
    const token = await window._firebaseUser.getIdToken(true);
    await fetchBackend(`${BACKEND_URL}/telefone/confirmar`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }, body:'{}' });
    _paPassoEmail();                                             // passo 2: senha pelo e-mail
  }catch(e){
    msg.className = 'msg err';
    msg.textContent = e && e.code === 'auth/invalid-verification-code' ? 'Código errado. Confira o SMS e tente de novo.' : 'Não deu para confirmar agora. Tente de novo.';
    btn.disabled = false; btn.textContent = 'Confirmar código';
  }
}

// ── Passo do e-mail: criar a própria senha (o link também confirma o e-mail) ─
function _paPassoEmail(){
  const u = window._firebaseUser; if(!u) return;
  const m = _paOverlay('pa-primeiro-acesso');
  m.innerHTML = _paCartao(
    _paCabeca('Primeiro acesso', TELEFONE_SMS_ATIVO ? 'Passo 2 de 2 · crie a sua senha' : 'Crie a sua própria senha') +
    _paTexto(`Sua conta foi criada pela nossa equipe com uma <b style="color:var(--text)">senha provisória</b>. Para sua segurança, crie a sua senha: vamos mandar um link para <b style="color:var(--text)">${escHTML(u.email || '')}</b>. O mesmo link confirma o seu e-mail.`) +
    '<div id="pa-msg" class="msg" style="margin:0;min-height:0"></div>' +
    '<div class="btn-row" style="flex-direction:column;align-items:stretch;gap:8px"><button class="btn primary" type="button" id="pa-enviar" onclick="enviarLinkPrimeiroAcesso()">Enviar link para o meu e-mail</button>' +
    '<button class="btn" type="button" onclick="sairDoPrimeiroAcesso()">Sair da conta</button></div>'
  );
  m.style.display = 'flex';
}
function sairDoPrimeiroAcesso(){
  const m = document.getElementById('pa-primeiro-acesso'); if(m) m.style.display = 'none';
  if(typeof fazerLogout === 'function') fazerLogout();
}
async function enviarLinkPrimeiroAcesso(){
  const btn = document.getElementById('pa-enviar'), msg = document.getElementById('pa-msg');
  btn.disabled = true; btn.textContent = 'Enviando…'; msg.textContent = ''; msg.className = 'msg';
  try{
    const token = await window._firebaseUser.getIdToken();
    const res = await fetchBackend(`${BACKEND_URL}/primeiro-acesso/enviar`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }, body:'{}' });
    let d = {}; try{ d = await res.json(); }catch(e){}
    if(!res.ok) throw new Error(d.erro || 'Não foi possível enviar agora. Tente de novo em instantes.');
    msg.className = 'msg ok';
    msg.textContent = 'Enviamos! Abra o seu e-mail (veja também o Spam) e toque em "Criar minha senha". O link vale por 1 hora.';
    // Reenviar só depois de 60 s (evita vários e-mails seguidos)
    let s = 60;
    const t = setInterval(() => { s--; btn.textContent = s > 0 ? `Reenviar em ${s} s` : 'Reenviar o link'; if(s <= 0){ clearInterval(t); btn.disabled = false; } }, 1000);
  }catch(e){
    msg.className = 'msg err'; msg.textContent = e.message;
    btn.disabled = false; btn.textContent = 'Enviar link para o meu e-mail';
  }
}

// ── 2) Tela "Crie sua senha" (aberta pelo link do e-mail) ───────────────────
function _paCampoSenha(id, rotulo, enter){
  return `<div class="field"><label for="${id}">${rotulo}</label><div style="position:relative">
    <input id="${id}" type="password" autocomplete="new-password" placeholder="••••••••" style="width:100%;padding-right:42px" onkeydown="if(event.key==='Enter')${enter}">
    <button type="button" id="${id}-olho" onclick="toggleSenha('${id}','${id}-olho')" aria-label="Mostrar ou esconder a senha" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;line-height:0">${typeof ICONE_OLHO !== 'undefined' ? ICONE_OLHO : '👁'}</button>
  </div></div>`;
}
function telaCriarSenha(codigo){
  const m = _paOverlay('pa-criar-senha');
  m._codigo = codigo;
  m.innerHTML = _paCartao(
    _paCabeca('Crie a sua senha', 'FinRossi') +
    _paTexto('Escolha uma senha com pelo menos 8 caracteres, misturando letras e números. Ao salvar, a senha provisória deixa de valer e o seu e-mail fica confirmado.') +
    _paCampoSenha('pa-senha', 'Nova senha', "document.getElementById('pa-senha2').focus()") +
    _paCampoSenha('pa-senha2', 'Repita a senha', 'salvarSenhaPrimeiroAcesso()') +
    '<div id="pa-msg2" class="msg" style="margin:0;min-height:0"></div>' +
    '<div class="btn-row"><button class="btn primary" type="button" id="pa-salvar" onclick="salvarSenhaPrimeiroAcesso()">Criar senha</button></div>'
  );
  m.style.display = 'flex';
  setTimeout(() => document.getElementById('pa-senha')?.focus(), 150);
}
async function salvarSenhaPrimeiroAcesso(){
  const m = document.getElementById('pa-criar-senha'), msg = document.getElementById('pa-msg2'), btn = document.getElementById('pa-salvar');
  const s1 = document.getElementById('pa-senha').value, s2 = document.getElementById('pa-senha2').value;
  const erro = t => { msg.className = 'msg err'; msg.textContent = t; };
  if(s1.length < 8) return erro('Use pelo menos 8 caracteres.');
  if(s1 !== s2) return erro('As duas senhas não são iguais.');
  btn.disabled = true; btn.textContent = 'Salvando…'; msg.textContent = '';
  try{
    const res = await fetchBackend(`${BACKEND_URL}/primeiro-acesso/concluir`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ oobCode:m._codigo, senha:s1 }) });
    let d = {}; try{ d = await res.json(); }catch(e){}
    if(!res.ok) throw new Error(d.erro || 'Não foi possível salvar agora. Tente de novo em instantes.');
    // Sessão antiga (senha provisória) não vale mais: sai e volta para o login com o e-mail preenchido
    try{ const f = window._firebase; if(f && f.firebaseOk && f.auth && f.auth.currentUser) await f.signOut(f.auth); }catch(e){}
    history.replaceState(null, '', location.pathname + '?entrar=1');
    m.innerHTML = _paCartao(
      _paCabeca('Pronto!', 'Senha criada e e-mail confirmado') +
      _paTexto('Agora é só entrar com o seu e-mail e a senha nova.') +
      `<div class="btn-row"><button class="btn primary" type="button" onclick="document.getElementById('pa-criar-senha').style.display='none';const e=document.getElementById('login-email');if(e){e.value=${JSON.stringify(d.email || '')};document.getElementById('login-senha')?.focus();}">Entrar no FinRossi</button></div>`
    );
  }catch(e){
    erro(e.message); btn.disabled = false; btn.textContent = 'Criar senha';
  }
}

// Abriu pelo link do e-mail?
(function(){
  try{
    const q = new URLSearchParams(location.search);
    if(q.get('modo') === 'criar-senha' && q.get('oobCode')) telaCriarSenha(q.get('oobCode'));
  }catch(e){}
})();
