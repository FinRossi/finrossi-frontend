// acessos/03-perfil-roles.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PROFILE & NAV ───────────────────────────────────────────────────────────
// ─── ROLES ────────────────────────────────────────────────────────────────────
// Role do usuário logado (atualizado após login via Firebase — js/firebase-init.js)
let _userRole = null; // 'master' | 'socio' | 'admin' | 'dev' | 'cliente' | null
let _userPlano = null; // plano real do cliente logado: 'gratuito' | 'essencial' | 'evolucao' | 'patrimonio' | null

// Helpers de role
// Master (o dono) está acima do Sócio: tem tudo que o Sócio tem + controla os acessos da equipe
function isMaster(){ return _userRole==='master'; }
function isEquipe(){ return ['master','socio','admin','dev'].includes(_userRole); }
function isAdmin(){ // mantém compatibilidade — true para sócio e master (acesso total)
  const f=window._firebase;
  if(!f||!f.firebaseOk) return true;
  return _userRole==='socio' || isMaster();
}

function setupPerfilUI(){
  const role = _userRole||'cliente';
  const socio = role==='socio' || role==='master'; // Master vê tudo que o Sócio vê
  const admin = role==='admin';
  const dev = role==='dev';
  const equipe = isEquipe();

  // Sidebar — perfis admin (Pessoal + FinRossi) só para sócio
  const sidebarPerfis=document.getElementById('sb-perfis-admin');
  if(sidebarPerfis) sidebarPerfis.style.display=socio?'block':'none';

  // Sidebar — perfil cliente (Minha conta) para cliente
  const perfilCliente=document.getElementById('sb-perfil-cliente');
  if(perfilCliente) perfilCliente.style.display=(!socio&&!equipe)?'block':'none';

  // Sidebar — bloco equipe (admin/dev) — vai para clientes direto
  let sbEquipe=document.getElementById('sb-perfil-equipe');
  if(!sbEquipe&&(role==='admin'||role==='dev')){
    sbEquipe=document.createElement('div');
    sbEquipe.id='sb-perfil-equipe';
    const container=document.querySelector('.sb-section')||document.querySelector('.sidebar');
    if(container) container.prepend(sbEquipe);
  }
  if(sbEquipe){
    const ROLE_LABEL={admin:'Admin',dev:'Dev'};
    sbEquipe.style.display=(role==='admin'||role==='dev')?'block':'none';
    sbEquipe.innerHTML=`<div style="padding:10px 10px 14px">
      <div style="font-size:13px;font-weight:500;color:var(--text)">${ROLE_LABEL[role]||role}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${escHTML(window._firebaseUser?.email||'')}</div>
      <div style="margin-top:8px;font-size:11px;padding:4px 8px;background:var(--accent-s);border:1px solid var(--accent);border-radius:6px;color:var(--accent);display:inline-block">${role==='dev'?'Acesso: painel técnico':'Acesso: gestão de clientes'}</div>
    </div>`;
  }

  // Mobile drawer — mostra/oculta seções por role
  const mobPerfis = document.getElementById('mob-perfis-section');
  const mobAssin  = document.getElementById('mob-minha-assin-section');
  if(mobPerfis) mobPerfis.style.display = (socio||admin||dev) ? '' : 'none';
  // Sem "Minha área" (clientes), o Menu abre o painel: sem a linha e o espaço de separação no topo
  const mobMenu = document.getElementById('mob-menu-section');
  if(mobMenu){ const comPerfis = socio||admin||dev; mobMenu.style.marginTop = comPerfis ? '12px' : '0'; mobMenu.style.borderTop = comPerfis ? '1px solid var(--border)' : 'none'; mobMenu.style.paddingTop = comPerfis ? '10px' : '0'; }
  if(mobAssin)  mobAssin.style.display  = role==='cliente' ? '' : 'none';

  // Preview dos planos: só para sócio/master e só no perfil FinRossi (no Pessoal não aparece)
  const navPreview=document.getElementById('nav-preview');
  if(navPreview) navPreview.style.display=(socio && cp==='finrossi')?'':'none';
  const verComoWrap=document.getElementById('cfg-vercomo-wrap');
  if(verComoWrap) verComoWrap.style.display=socio?'block':'none';
  if(role==='cliente'&&window._firebaseUser){
    const uid=window._firebaseUser.uid;
    cp=uid;
    if(!DATA[uid]) DATA[uid]={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]};
    const nomeEl=document.getElementById('cliente-nome-sb');
    if(nomeEl) nomeEl.textContent=window._firebaseUser.displayName||window._firebaseUser.email;
    // Mostra nav de assinatura para clientes
    const navExtra=document.getElementById('sb-nav-cliente-extra');
    if(navExtra) navExtra.style.display='block';
  }

  // Se admin/dev, vai direto para clientes
  if(role==='admin'||role==='dev'){
    // Esconde nav exceto clientes
    document.querySelectorAll('.nav-item').forEach(b=>{
      const oc=b.getAttribute('onclick')||'';
      const show=oc.includes("'clientes'");
      b.style.display=show?'flex':'none';
    });
    const navCli=document.getElementById('nav-clientes-item');
    if(navCli) navCli.style.display='flex';
    finrossiAutenticado=true; // pula senha para clientes
    setTimeout(()=>{ cp='finrossi'; goTo('clientes'); },200);
  }
}

// ─── Senha própria do perfil FinRossi (Master) ───────────────────────────────
// Tranca na porta do perfil FinRossi: pedida toda vez que o Master entra nele (mesmo com o app
// aberto, quem pegar o aparelho não entra no FinRossi). A senha não fica salva: só um resumo
// (PBKDF2-SHA256, 150 mil rodadas, com sal) em usuarios/<uid>/senhaPerfilFinRossi.
// 5 erros seguidos → espera 5 minutos. Esqueceu: sair e entrar de novo na conta; nos 10 minutos
// seguintes ao login dá para criar uma senha nova.
const SPF_RODADAS = 150000;
const _spfB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const _spfDeB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function _spfResumo(senha, salB64, rodadas){
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:_spfDeB64(salB64), iterations:rodadas }, chave, 256);
  return _spfB64(bits);
}
function _spfCaminho(){ return `usuarios/${window._firebaseUser?.uid}/senhaPerfilFinRossi`; }
function _spfLer(){
  return new Promise(res => {
    try{ window._onValue(window._ref(window._db, _spfCaminho()), s => res(s.val()), () => res(null), { onlyOnce:true }); }catch(e){ res(null); }
  });
}
function _spfBloqueadoAte(){ return parseInt(localStorage.getItem('fin_spf_bloqueio') || '0', 10); }

function _spfModal(modo, cfg){
  let m = document.getElementById('modal-senha-perfil-fr');
  if(!m){
    m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'modal-senha-perfil-fr';
    m.addEventListener('click', e => { if(e.target === m) closeModal('modal-senha-perfil-fr'); });
    document.body.appendChild(m);
  }
  const criar = modo === 'criar';
  // Mesmo visual dos formulários do app: selo dourado, rótulo em caixa alta, campo escuro e olho
  const campo = (id, rotulo, auto, enter) => `
    <div class="field">
      <label for="${id}">${rotulo}</label>
      <div style="position:relative">
        <input id="${id}" type="password" autocomplete="${auto}" placeholder="••••••••" style="width:100%;padding-right:42px" onkeydown="if(event.key==='Enter')${enter}">
        <button type="button" id="${id}-olho" onclick="toggleSenha('${id}','${id}-olho')" aria-label="Mostrar ou esconder a senha" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;line-height:0">${typeof ICONE_OLHO !== 'undefined' ? ICONE_OLHO : '👁'}</button>
      </div>
    </div>`;
  m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="spf-tit" style="max-width:400px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;align-items:center;gap:12px">
      <div aria-hidden="true" style="width:42px;height:42px;flex-shrink:0;border-radius:50%;border:1px solid var(--accent);background:var(--accent-s);display:flex;align-items:center;justify-content:center;color:var(--accent)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
      </div>
      <div>
        <h3 id="spf-tit" style="margin:0">${criar ? 'Criar senha do perfil' : 'Perfil FinRossi'}</h3>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${criar ? 'Perfil FinRossi' : 'Área protegida'}</div>
      </div>
    </div>
    <p style="margin:0;font-size:12.5px;color:var(--muted);line-height:1.6">${criar
      ? 'Ela vai ser pedida toda vez que você entrar no perfil FinRossi. Use uma senha diferente da senha de login, com pelo menos 6 caracteres.'
      : 'Digite a senha do perfil FinRossi para continuar.'}</p>
    ${campo('spf-senha', criar ? 'Nova senha' : 'Senha', criar ? 'new-password' : 'current-password', criar ? "document.getElementById('spf-senha2').focus()" : 'confirmarSenhaPerfilFR()')}
    ${criar ? campo('spf-senha2', 'Repita a senha', 'new-password', 'criarSenhaPerfilFR()') : ''}
    <div id="spf-msg" class="msg" style="margin-top:0;min-height:0"></div>
    <div class="btn-row" style="margin-top:2px"><button class="btn primary" type="button" onclick="${criar ? 'criarSenhaPerfilFR()' : 'confirmarSenhaPerfilFR()'}">${criar ? 'Criar senha' : 'Entrar'}</button><button class="btn" type="button" onclick="closeModal('modal-senha-perfil-fr')">Cancelar</button></div>
    ${criar ? '' : `<button type="button" onclick="esqueciSenhaPerfilFR()" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;align-self:center;font-family:inherit">Esqueci a senha do perfil</button>`}
  </div>`;
  m._cfg = cfg || null;
  m.classList.add('open');
  setTimeout(() => document.getElementById('spf-senha')?.focus(), 120);
}
function _spfMsg(txt, ok){ const el = document.getElementById('spf-msg'); if(el){ el.textContent = txt; el.className = 'msg ' + (ok ? 'ok' : 'err'); } }

// Chamado por abrirFinRossi() quando quem entra é o Master
async function pedirSenhaPerfilFR(){
  const cfg = await _spfLer();
  if(cfg && cfg.hash && cfg.sal) _spfModal('entrar', cfg);
  else _spfModal('criar');
}
async function criarSenhaPerfilFR(){
  const s1 = document.getElementById('spf-senha').value, s2 = document.getElementById('spf-senha2').value;
  if(s1.length < 6) return _spfMsg('Use pelo menos 6 caracteres.');
  if(s1 !== s2) return _spfMsg('As duas senhas não são iguais.');
  try{
    const sal = _spfB64(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await _spfResumo(s1, sal, SPF_RODADAS);
    await window._set(window._ref(window._db, _spfCaminho()), { sal, hash, rodadas:SPF_RODADAS, criadaEm:new Date().toISOString() });
    closeModal('modal-senha-perfil-fr');
    finrossiAutenticado = true; _setProfileFinRossi();
  }catch(e){ _spfMsg('Não deu para salvar agora. Tente de novo.'); }
}
async function confirmarSenhaPerfilFR(){
  const m = document.getElementById('modal-senha-perfil-fr'), cfg = m && m._cfg;
  const espera = _spfBloqueadoAte() - Date.now();
  if(espera > 0) return _spfMsg(`Muitas tentativas. Tente de novo em ${Math.ceil(espera / 60000)} min.`);
  const senha = document.getElementById('spf-senha').value;
  if(!senha || !cfg) return;
  let confere = false;
  try{ confere = (await _spfResumo(senha, cfg.sal, cfg.rodadas || SPF_RODADAS)) === cfg.hash; }catch(e){}
  if(!confere){
    const erros = parseInt(localStorage.getItem('fin_spf_erros') || '0', 10) + 1;
    if(erros >= 5){ localStorage.setItem('fin_spf_bloqueio', String(Date.now() + 5 * 60000)); localStorage.setItem('fin_spf_erros', '0'); return _spfMsg('Senha incorreta 5 vezes. Aguarde 5 minutos.'); }
    localStorage.setItem('fin_spf_erros', String(erros));
    document.getElementById('spf-senha').value = '';
    return _spfMsg(`Senha incorreta (${erros} de 5).`);
  }
  localStorage.setItem('fin_spf_erros', '0');
  closeModal('modal-senha-perfil-fr');
  finrossiAutenticado = true; _setProfileFinRossi();
}
async function esqueciSenhaPerfilFR(){
  let recente = false;
  try{ const t = await window._firebaseUser.getIdTokenResult(); recente = Date.now() - new Date(t.authTime).getTime() < 10 * 60000; }catch(e){}
  if(recente){ _spfModal('criar'); return; }
  _spfMsg('Para criar uma senha nova, saia e entre de novo na sua conta. Nos 10 minutos seguintes ao login, o "Esqueci" deixa criar outra.');
}

let finrossiAutenticado = false;

function abrirFinRossi(){
  // Master e sócios: cada um com a própria senha do perfil FinRossi, pedida a cada entrada.
  // (Antes o sócio digitava a senha admin compartilhada, que ficava salva no navegador.)
  if((isMaster() || _userRole === 'socio') && !finrossiAutenticado){ pedirSenhaPerfilFR(); return; }
  if(finrossiAutenticado || isEquipe()){ _setProfileFinRossi(); return; }
}

function _setProfileFinRossi(){
  cp='finrossi';
  if(!DATA.finrossi) DATA.finrossi={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]};
  // Atualiza botões de perfil
  document.querySelectorAll('.profile-btn').forEach(b=>{
    const id=b.id.replace('pb-','');
    b.classList.toggle('active', id==='finrossi');
  });
  const sub=document.getElementById('sb-logo-sub');
  if(sub) sub.textContent='Negócio FinRossi';
  // Mostra Clientes no nav (e Sócios, só para o Master), esconde Renda Passiva
  const navCli=document.getElementById('nav-clientes-item');
  if(navCli) navCli.style.display='flex';
  const navSoc=document.getElementById('nav-socios-item');
  if(navSoc) navSoc.style.display=isMaster()?'flex':'none';
  const navQr=document.getElementById('nav-qr');
  if(navQr) navQr.style.display=isMaster()?'flex':'none';   // QR Code: só o Master
  const navPreview=document.getElementById('nav-preview');
  if(navPreview) navPreview.style.display=(_userRole==='socio'||isMaster())?'':'none';
  const navRenda=document.getElementById('nav-renda');
  if(navRenda) navRenda.style.display='none';
  goTo('dashboard');
  aplicarNavConfig();
  refreshAll();
  try{ initAvatar(); }catch(e){}   // cada perfil tem a sua foto
  _extrasAtualizarMenu();
  if(isMaster()) carregarExtrasEquipe();
}

function setProfile(p){
  if(p==='finrossi'){abrirFinRossi();return;}
  cp=p;
  finrossiAutenticado=false;
  // Botões de perfil
  document.querySelectorAll('.profile-btn').forEach(b=>{
    const id=b.id.replace('pb-','');
    b.classList.toggle('active', id===p);
  });
  // Subtitle do logo
  const sub=document.getElementById('sb-logo-sub');
  if(sub) sub.textContent=p==='pessoal'?'Minhas finanças':'Painel';
  // Nav items
  const navCli=document.getElementById('nav-clientes-item');
  if(navCli) navCli.style.display='none';
  const navSoc=document.getElementById('nav-socios-item');
  if(navSoc) navSoc.style.display='none';
  const navQr=document.getElementById('nav-qr');
  if(navQr) navQr.style.display='none';
  const navPreview=document.getElementById('nav-preview');
  if(navPreview) navPreview.style.display='none';   // Preview dos planos fica só no FinRossi
  const navRenda=document.getElementById('nav-renda');
  if(navRenda) navRenda.style.display=p==='pessoal'?'flex':'none';
  const navEmp=document.getElementById('nav-empresas');
  if(navEmp) navEmp.style.display='none';
  goTo('dashboard');
  aplicarNavConfig();
  refreshAll();
  try{ initAvatar(); }catch(e){}   // cada perfil tem a sua foto
  _extrasAtualizarMenu();
}


const SECS=['dashboard','lancamentos','investimentos','historico','metas','objetivos','renda','score','relatorios','empresas','notas','assinaturas','recorrentes','calendario','manual','cartoes','clientes','socios','preview','minha-assinatura','qr'];
function goTo(name){
  if(_verComoPlano && !verComoPlanoPermite(name)){
    name = 'dashboard'; // plano simulado não libera essa seção — redireciona
  }
  if(!SECS.includes(name)) name = 'dashboard';   // tela que não existe (ou não é desta pessoa): nada de página em branco
  SECS.forEach(s=>{
    const el=document.getElementById('sec-'+s);
    if(el) el.classList.toggle('section-hidden',s!==name);
  });
  document.querySelectorAll('.nav-item').forEach(b=>{
    const oc=b.getAttribute('onclick');
    if(oc) b.classList.toggle('active',oc.includes("'"+name+"'"));
  });
  const fn={dashboard:refreshDash,investimentos:renderInvs,historico:renderHistorico,metas:renderMetas,objetivos:renderObjs,renda:renderRP,score:renderScore,relatorios:renderRelatorio,notas:renderNotas,assinaturas:renderAssinaturas,recorrentes:renderRecorrentes,calendario:renderCalendario,manual:renderManual,cartoes:renderCartoes,clientes:renderClientes,socios:renderSocios,preview:renderPreview,'minha-assinatura':renderMinhaAssinatura,qr:()=>{ if(typeof renderQrCode==='function') renderQrCode(); }};
  if(fn[name]) fn[name]();
  else if(_extras.telas[name]) _extras.telas[name]();
  if(name==='lancamentos' && typeof atualizarBotaoFoto==='function') atualizarBotaoFoto();
}

// ─── Ferramentas internas da equipe ──────────────────────────────────────────
// Não ficam no site: o servidor entrega só para o login do Master (o resto recebe 403), e elas se
// encaixam aqui (telas e menus). Clientes nunca baixam nem veem nada disso.
const _extras = { telas:{}, aoAtualizarMenu:[] };
let _extrasCarregados = false;
function _extrasAtualizarMenu(){ _extras.aoAtualizarMenu.forEach(f => { try{ f(); }catch(e){} }); }
async function carregarExtrasEquipe(){
  if(_extrasCarregados || !isMaster() || !window._firebaseUser || typeof fetchBackend !== 'function') return;
  _extrasCarregados = true;
  try{
    const res = await fetchBackend(`${BACKEND_URL}/admin/extras.js`, { headers:{ Authorization:'Bearer ' + await window._firebaseUser.getIdToken() } });
    if(!res.ok){ _extrasCarregados = false; return; }
    const url = URL.createObjectURL(new Blob([await res.text()], { type:'text/javascript' }));
    const s = document.createElement('script');
    s.src = url; s.onload = () => { URL.revokeObjectURL(url); _extrasAtualizarMenu(); };
    document.head.appendChild(s);
  }catch(e){ _extrasCarregados = false; }
}

function refreshAll(){refreshDash();renderInvs();renderHistorico();renderMetas();renderObjs();populateDashMetaSel();populateCatSelects();renderAlertasVencimento();}

