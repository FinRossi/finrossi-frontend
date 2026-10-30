// js/app/29-login.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── LOGIN / LOGOUT ──────────────────────────────────────────────────────────
// ─── VALIDAÇÃO DE EMAIL ───────────────────────────────────────────────────────
const ICONE_OLHO = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_OLHO_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.8 21.8 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a21.77 21.77 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
function toggleSenha(inputId, btnId){
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if(!inp) return;
  const mostrar = inp.type === 'password';
  inp.type = mostrar ? 'text' : 'password';
  if(btn) btn.innerHTML = mostrar ? ICONE_OLHO_OFF : ICONE_OLHO;
}

function validarEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ─── Transição "Cofre" ao entrar no app ──────────────────────────────────────
// As duas metades cobrem o login, um fio dourado corta a tela ao meio e as metades
// se abrem como a porta de um cofre, revelando o app (~1,1 s).
// O nome irisTransition foi mantido porque firebase-init.js chama window.irisTransition.
function irisTransition(callback){
  const wrap = document.getElementById('portal-transition-app');
  if(!wrap || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)){ callback(); return; }

  wrap.classList.remove('cobrir','riscar','abrir');
  wrap.style.display = 'block';
  void wrap.offsetHeight;

  wrap.classList.add('cobrir');                               // 1) metades cobrem o login
  setTimeout(()=>wrap.classList.add('riscar'), 160);          // 2) fio dourado corta a tela
  setTimeout(()=>callback(), 420);                            // app monta por baixo das metades
  setTimeout(()=>wrap.classList.add('abrir'), 620);           // 3) metades se abrem
  setTimeout(()=>{
    wrap.style.display = 'none';
    wrap.classList.remove('cobrir','riscar','abrir');
  }, 1200);
}

// ─── Acesso Master: só pelo Google (verificação em duas etapas da conta Google) ───
const EMAIL_MASTER = 'lucasrossi2100@gmail.com';
const ehEmailMaster = v => String(v || '').trim().toLowerCase() === EMAIL_MASTER;
// Digitou o e-mail do Master: aparece o botão do Google.
// Etapa 1 (agora): senha e Google lado a lado, até o Lucas confirmar que o Google funciona.
// Etapa 2: MASTER_SO_GOOGLE = true esconde a senha (e as regras do banco passam a exigir o Google).
const MASTER_SO_GOOGLE = false;
function atualizarLoginMaster(){
  const master = ehEmailMaster(document.getElementById('login-email')?.value);
  const g = document.getElementById('btn-login-google');
  if(g) g.style.display = master ? 'flex' : 'none';
  if(!MASTER_SO_GOOGLE) return;
  const senhaBloco = document.getElementById('login-senha-bloco');
  const btn = document.getElementById('btn-login');
  if(senhaBloco) senhaBloco.style.display = master ? 'none' : '';
  if(btn) btn.style.display = master ? 'none' : 'flex';
}
async function entrarComGoogle(){
  const f = window._firebase, erroEl = document.getElementById('login-erro');
  if(!f || !f.firebaseOk || !f.GoogleAuthProvider) return;
  erroEl.style.display = 'none';
  const provedor = new f.GoogleAuthProvider();
  provedor.setCustomParameters({ login_hint: EMAIL_MASTER, prompt: 'select_account' });
  try{
    await f.signInWithPopup(f.auth, provedor);
  }catch(e){
    // Celular/app instalado sem janela pop-up: vai para a página do Google e volta
    if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment','auth/cancelled-popup-request'].includes(e.code)){
      // Marca a ida ao Google: na volta, finrossi.com.br não pode mandar para a landing
      try{ sessionStorage.setItem('fin_login_google', '1'); }catch(e3){}
      try{ await f.signInWithRedirect(f.auth, provedor); return; }catch(e2){ e = e2; }
    }
    if(e.code === 'auth/popup-closed-by-user') return;
    erroEl.textContent = e.code === 'auth/operation-not-allowed'
      ? 'O login com Google ainda não foi ligado no painel da Firebase.'
      : 'Não deu para entrar com o Google agora. Tente de novo.';
    erroEl.style.display = 'block';
  }
}

async function fazerLogin(){
  const email=document.getElementById('login-email').value.trim();
  if(MASTER_SO_GOOGLE && ehEmailMaster(email)){ atualizarLoginMaster(); entrarComGoogle(); return; }
  const senha=document.getElementById('login-senha').value;
  const erroEl=document.getElementById('login-erro');
  const btn=document.getElementById('btn-login');
  const btnTxt=document.getElementById('btn-login-txt');
  const progressWrap=document.getElementById('login-progress-wrap');
  const progressBar=document.getElementById('login-progress-bar');
  const progressTxt=document.getElementById('login-progress-txt');
  const progressPct=document.getElementById('login-progress-pct');

  if(!email||!senha){erroEl.textContent='Preencha email e senha.';erroEl.style.display='block';return;}
  if(!validarEmail(email)){erroEl.textContent='Email inválido — verifique o formato.';erroEl.style.display='block';return;}

  erroEl.style.display='none';
  btn.disabled=true; btn.style.opacity='.7'; btn.style.cursor='not-allowed';
  if(btnTxt) btnTxt.textContent='Entrando...';
  if(progressWrap) progressWrap.style.display='block';

  const setProgress=(pct,txt)=>{
    if(progressBar) progressBar.style.width=pct+'%';
    if(progressTxt) progressTxt.textContent=txt;
    if(progressPct) progressPct.textContent=pct+'%';
  };

  setProgress(15,'Verificando credenciais...');

  try{
    const f=window._firebase;
    if(!f||!f.firebaseOk){
      document.getElementById('tela-login').style.display='none';
      document.getElementById('tela-app').style.display='flex';
      return;
    }
    setTimeout(()=>setProgress(40,'Autenticando...'),300);
    setTimeout(()=>setProgress(65,'Carregando perfil...'),800);
    await f.signInWithEmailAndPassword(f.auth,email,senha);
    setProgress(85,'Preparando o app...');
    setTimeout(()=>setProgress(100,'Pronto! ✓'),300);
    // Login feito com sucesso — reseta o lembrete de instalação do app,
    // pra aparecer de novo mesmo que ainda não tenham se passado as 3h
    localStorage.removeItem('fin_pwa_ultimo_aviso');
    setTimeout(()=>{ if(typeof mostrarPWABanner==='function') mostrarPWABanner(); }, 3000);
  }catch(e){
    // A Firebase não diz se o e-mail tem conta (proteção contra descobrir quem é cliente): para
    // "e-mail ou senha errados" a mensagem serve aos dois casos e leva quem não tem conta aos planos,
    // com o e-mail já preenchido no cadastro da landing.
    const semConta = ['auth/user-not-found','auth/wrong-password','auth/invalid-credential','auth/invalid-login-credentials'].includes(e.code);
    let msg='Email ou senha incorretos.';
    if(e.code==='auth/user-not-found') msg='Não encontramos uma conta com este e-mail.';
    if(e.code==='auth/invalid-email') msg='Email inválido.';
    if(e.code==='auth/too-many-requests') msg='Muitas tentativas. Aguarde alguns minutos.';
    erroEl.textContent=msg;
    if(semConta){
      const ir=document.createElement('a');
      ir.href='landing/#planos';
      ir.textContent='Ainda não tem conta? Conheça os planos e crie a sua →';
      ir.style.cssText='display:block;margin-top:6px;color:#e8c560;font-weight:600;text-decoration:none';
      ir.onclick=()=>{ try{ sessionStorage.setItem('fin_email_cadastro', email); }catch(err){} };
      erroEl.appendChild(ir);
    }
    erroEl.style.display='block';
    if(progressWrap) progressWrap.style.display='none';
    if(progressBar) progressBar.style.width='0%';
    btn.disabled=false; btn.style.opacity='1'; btn.style.cursor='pointer';
    if(btnTxt) btnTxt.textContent='Entrar';
  }
}
async function fazerLogout(){
  try{
    const f=window._firebase;
    if(f&&f.firebaseOk) await f.signOut(f.auth);
  }catch(e){console.warn('logout err',e)}

  // Reset completo do estado
  cp = 'pessoal';
  _userRole = null;
  window._userRole = null;
  _userPlano = null;
  window._userPlano = null;
  window._firebaseUser = null;
  finrossiAutenticado = false;
  _adminToken = null;

  // Limpa dados em memória
  DATA = {
    pessoal:  {lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]},
    finrossi: {lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]}
  };

  // Destroi todos os gráficos
  Object.keys(charts).forEach(k=>{ try{ charts[k].destroy(); }catch(e){} });
  charts = {};

  // Reseta avatar
  const avatar = document.getElementById('sb-avatar');
  if(avatar){ avatar.innerHTML=''; avatar.textContent='?'; }

  // Reseta nome
  const nomeEl = document.getElementById('user-nome');
  if(nomeEl) nomeEl.textContent='Carregando...';

  // Reseta sidebar para estado padrão
  const sbLogoSub = document.getElementById('sb-logo-sub');
  if(sbLogoSub) sbLogoSub.textContent='Painel pessoal';

  // Fecha modal de config se estiver aberto
  const modalCfg = document.getElementById('modal-config');
  if(modalCfg) modalCfg.style.display='none';

  // Fecha a gaveta "Mais" do mobile, se estiver aberta
  const drawerMobile = document.getElementById('mobile-more-drawer');
  if(drawerMobile) drawerMobile.classList.remove('open');

  // Garante que a próxima vez que entrar, comece no Dashboard
  try{ goTo('dashboard'); }catch(e){}

  // Reseta botões de perfil
  document.querySelectorAll('.profile-btn').forEach(b=>{
    b.classList.remove('active');
    if(b.id==='pb-pessoal') b.classList.add('active');
  });

  // Esconde nav extras
  const navCli = document.getElementById('nav-clientes-item');
  if(navCli) navCli.style.display='none';
  const navSoc = document.getElementById('nav-socios-item');
  if(navSoc) navSoc.style.display='none';
  const navExtra = document.getElementById('sb-nav-cliente-extra');
  if(navExtra) navExtra.style.display='none';
  const navPreview = document.getElementById('nav-preview');
  if(navPreview) navPreview.style.display='none';

  // Limpa sync badge
  const sb = document.getElementById('sync-badge');
  if(sb){ sb.className='sync-badge local'; sb.innerHTML='<span class="sync-dot"></span><span class="nav-text">Modo local</span>'; }

  // Volta para login
  document.getElementById('tela-login').style.display='flex';
  document.getElementById('tela-app').style.display='none';

  // Limpa campos de login
  const emailInp = document.getElementById('login-email');
  const senhaInp = document.getElementById('login-senha');
  if(emailInp) emailInp.value='';
  if(senhaInp) senhaInp.value='';
}

