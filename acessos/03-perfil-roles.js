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

let finrossiAutenticado = false;

function abrirFinRossi(){
  // Master entra direto: o servidor reconhece o login dele, não precisa da senha admin
  if(isMaster()) finrossiAutenticado=true;
  if(finrossiAutenticado){_setProfileFinRossi();return;}
  // Abre modal estilo login
  const overlay=document.getElementById('modal-finrossi-senha');
  if(overlay){
    overlay.style.display='flex';
    const inp=document.getElementById('inp-senha-finrossi');
    if(inp){inp.value='';setTimeout(()=>inp.focus(),120);}
    const msg=document.getElementById('msg-senha-finrossi');
    if(msg){msg.style.display='none';msg.textContent='';}
  }
}

function fecharModalSenhaFinRossi(){
  const overlay=document.getElementById('modal-finrossi-senha');
  if(overlay) overlay.style.display='none';
}

function confirmarSenhaFinRossi(){
  const inp=document.getElementById('inp-senha-finrossi');
  const msg=document.getElementById('msg-senha-finrossi');
  const senha=inp?inp.value:'';
  if(!senha) return;
  fetch(`${BACKEND_URL}/admin/clientes`,{headers:{'x-admin-token':senha}})
    .then(res=>{
      if(res.status===401){
        if(msg){msg.textContent='Senha incorreta. Tente novamente.';msg.style.display='block';}
        if(inp){inp.value='';inp.focus();}
        return;
      }
      finrossiAutenticado=true;
      _adminToken=senha;
      localStorage.setItem('fin_admin_token',senha);
      fecharModalSenhaFinRossi();
      _setProfileFinRossi();
    }).catch(()=>{
      if(msg){msg.textContent='Não foi possível falar com o servidor. Tente de novo em instantes.';msg.style.display='block';}
    });
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
  const navPreview=document.getElementById('nav-preview');
  if(navPreview) navPreview.style.display=(_userRole==='socio'||isMaster())?'':'none';
  const navRenda=document.getElementById('nav-renda');
  if(navRenda) navRenda.style.display='none';
  goTo('dashboard');
  aplicarNavConfig();
  refreshAll();
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
  const navPreview=document.getElementById('nav-preview');
  if(navPreview) navPreview.style.display='none';   // Preview dos planos fica só no FinRossi
  const navRenda=document.getElementById('nav-renda');
  if(navRenda) navRenda.style.display=p==='pessoal'?'flex':'none';
  const navEmp=document.getElementById('nav-empresas');
  if(navEmp) navEmp.style.display='none';
  goTo('dashboard');
  aplicarNavConfig();
  refreshAll();
}

// Enter fecha modal senha FinRossi com Escape
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    const overlay=document.getElementById('modal-finrossi-senha');
    if(overlay&&overlay.style.display==='flex') fecharModalSenhaFinRossi();
  }
});

const SECS=['dashboard','lancamentos','investimentos','historico','metas','objetivos','renda','score','relatorios','empresas','notas','assinaturas','recorrentes','calendario','manual','cartoes','clientes','socios','preview','minha-assinatura'];
function goTo(name){
  if(_verComoPlano && !verComoPlanoPermite(name)){
    name = 'dashboard'; // plano simulado não libera essa seção — redireciona
  }
  SECS.forEach(s=>{
    const el=document.getElementById('sec-'+s);
    if(el) el.classList.toggle('section-hidden',s!==name);
  });
  document.querySelectorAll('.nav-item').forEach(b=>{
    const oc=b.getAttribute('onclick');
    if(oc) b.classList.toggle('active',oc.includes("'"+name+"'"));
  });
  const fn={dashboard:refreshDash,investimentos:renderInvs,historico:renderHistorico,metas:renderMetas,objetivos:renderObjs,renda:renderRP,score:renderScore,relatorios:renderRelatorio,notas:renderNotas,assinaturas:renderAssinaturas,recorrentes:renderRecorrentes,calendario:renderCalendario,manual:renderManual,cartoes:renderCartoes,clientes:renderClientes,socios:renderSocios,preview:renderPreview,'minha-assinatura':renderMinhaAssinatura};
  if(fn[name]) fn[name]();
  if(name==='lancamentos' && typeof atualizarBotaoFoto==='function') atualizarBotaoFoto();
}

function refreshAll(){refreshDash();renderInvs();renderHistorico();renderMetas();renderObjs();populateDashMetaSel();populateCatSelects();renderAlertasVencimento();}

