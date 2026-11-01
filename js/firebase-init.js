// js/firebase-init.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
(async () => {
  const show = (id, d='block') => { const el=document.getElementById(id); if(el) el.style.display=d; };
  const hide = (id) => { const el=document.getElementById(id); if(el) el.style.display='none'; };

  // Carregamento → login: o logo do carregamento sobe até o lugar dele na tela de login,
  // enquanto o nome e a rodinha somem e o login aparece por baixo (~0,6 s).
  // Antes era um zoom com desfoque na tela cheia, que travava no celular.
  const sairDoLoadingParaLogin = () => {
    const loadingEl = document.getElementById('loading');
    const logoCarr = document.getElementById('loading-logo');
    const login = document.getElementById('tela-login');
    const logoLogin = document.getElementById('login-logo-img');
    const mostrarLogin = () => { show('tela-login','flex'); hide('tela-app'); };
    if(!loadingEl || loadingEl.style.display==='none'){ mostrarLogin(); return; }
    const semMovimento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!logoCarr || !login || !logoLogin || semMovimento){ hide('loading'); mostrarLogin(); return; }

    login.classList.remove('logo-chegou');
    login.classList.add('via-logo');          // login sem o fade padrão; o logo dele espera o viajante
    mostrarLogin();
    const de = logoCarr.getBoundingClientRect(), para = logoLogin.getBoundingClientRect();
    const viajante = logoCarr.cloneNode(true);
    viajante.removeAttribute('id');
    viajante.style.cssText = `position:fixed;left:${de.left}px;top:${de.top}px;width:${de.width}px;height:${de.height}px;margin:0;`
      + 'opacity:1;animation:none;z-index:1000;transform-origin:0 0;transition:transform .56s cubic-bezier(.65,0,.25,1)';
    document.body.appendChild(viajante);
    logoCarr.style.visibility = 'hidden';
    loadingEl.style.transition = 'opacity .3s ease';
    void viajante.offsetHeight;
    requestAnimationFrame(() => {
      loadingEl.style.opacity = '0';          // nome e rodinha somem, o login aparece por baixo
      viajante.style.transform = `translate(${para.left - de.left}px,${para.top - de.top}px) scale(${para.width / de.width})`;
    });
    setTimeout(() => {
      login.classList.add('logo-chegou');     // o logo do login aparece no lugar exato do viajante
      viajante.remove();
      hide('loading');
      loadingEl.style.opacity = ''; loadingEl.style.transition = ''; logoCarr.style.visibility = '';
    }, 600);
  };

  // ── Entrada no app: uma sequência só ──────────────────────────────────────
  // 1) monta o app inteiro por trás (perfil, menu, tema, cor, categorias, dashboard)
  // 2) só então revela, com a transição certa para cada caso
  // Antes o app aparecia primeiro e se montava na frente do usuário (menu piscando,
  // dashboard redesenhando, cor chegando atrasada) — era o "corte" na entrada.
  let entrouNoApp = false;
  const tentar = fn => { try{ fn(); }catch(e){ console.warn('[Entrada]', e && e.message); } };
  const prepararApp = () => {
    tentar(() => initTema());
    tentar(() => lsLoad());
    tentar(() => setupPerfilUI());
    tentar(() => initSidebar());
    tentar(() => { loadCategorias(); populateCatSelects(); });
    tentar(() => refreshAll());
    tentar(() => { if(typeof initPatrimonioCores === 'function') initPatrimonioCores(); });
  };
  // O que só pode aparecer com o app já na tela (depois das boas-vindas): primeiro acesso, passo a passo.
  // Antes a tela de primeiro acesso entrava 1,3 s depois do login e cobria a abertura "Bem-vindo, nome".
  let appRevelado = false;
  const aoRevelarApp = [];
  const quandoAppAparecer = fn => { if(appRevelado) setTimeout(() => tentar(fn), 400); else aoRevelarApp.push(fn); };
  // App entra com um fade curto (classe tira a opacidade em seguida)
  const revelarApp = () => {
    appRevelado = true;
    setTimeout(() => aoRevelarApp.splice(0).forEach(fn => tentar(fn)), 600);
    hide('tela-login');
    const app = document.getElementById('tela-app');
    if(!app) return;
    app.classList.add('app-entrando');
    show('tela-app','flex');
    requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('app-entrando')));
    // O dashboard foi montado com o app escondido: redesenha agora que aparece, para a abertura
    // (patrimônio subindo do zero e roseta) acontecer na frente da pessoa
    requestAnimationFrame(() => tentar(() => {
      const dash = document.getElementById('sec-dashboard');
      if(dash && !dash.classList.contains('section-hidden') && !window._cedAnimou) refreshDash();
    }));
  };

  const irParaLogin = () => {
    entrouNoApp = false;    // saiu da conta: a próxima entrada roda a sequência de novo
    appRevelado = false; aoRevelarApp.length = 0;
    sairDoLoadingParaLogin();
  };
  const irParaApp = (nome, uid) => {
    if(entrouNoApp) return;   // nunca roda duas vezes (evita duas transições seguidas)
    entrouNoApp = true;

    const INTERVALO_BOAS_VINDAS_MS = 30 * 60 * 1000; // 30 minutos — ajuste aqui se quiser mudar
    // Contagem por conta (antes era por aparelho: entrar em outra conta logo depois pulava as boas-vindas dela)
    const chaveBV = 'fin_ultimo_acesso_ts_' + (uid || 'local');
    const ultimoAcesso = parseInt(localStorage.getItem(chaveBV) || '0', 10);
    const vaiMostrarBoasVindas = !!nome && (Date.now() - ultimoAcesso) >= INTERVALO_BOAS_VINDAS_MS && typeof window._abrirComBoasVindas === 'function';
    localStorage.setItem(chaveBV, String(Date.now()));
    localStorage.setItem('fin_ultimo_acesso_ts', String(Date.now()));   // index.html: este aparelho já usa o app (abre o app, não a landing)

    prepararApp();

    // Toda entrada no app passa pelo Cofre (29-login.js): pelo botão Entrar ou abrindo já logado.
    // O Cofre cobre a tela, monta o próximo passo por baixo e se abre mostrando ele.
    const cofre = typeof window.irisTransition === 'function' ? window.irisTransition : (cb => cb());
    if(vaiMostrarBoasVindas){
      // Na vez das boas-vindas (regra dos 30 min), o Cofre se abre mostrando elas; depois o app entra com fade
      cofre(() => { hide('loading'); hide('tela-login'); window._abrirComBoasVindas(nome, revelarApp); });
    } else {
      cofre(() => { hide('loading'); revelarApp(); });
    }
  };

  // Timeout de segurança — se Firebase travar, vai para login
  let iniciou = false;
  setTimeout(() => {
    if(!iniciou){
      iniciou = true;
      console.warn('[FinRossi] timeout — indo para login');
      irParaLogin();
      window._fbReady = true;
      document.dispatchEvent(new Event('fbReady'));
    }
  }, 6000);

  try {
    // As três partes baixam ao mesmo tempo (antes uma esperava a outra terminar).
    // O index.html já pede esses arquivos com antecedência (modulepreload).
    const [
      { initializeApp },
      { getDatabase, ref, set, onValue, runTransaction, onDisconnect, serverTimestamp },
      { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, RecaptchaVerifier, linkWithPhoneNumber }
    ] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    ]);

    const app = initializeApp({
      apiKey: "AIzaSyC6WIL7R0ZkL4Yr3TuBqyZ_VVji3HmhSuE",
      authDomain: "lucasrossi-8dd18.firebaseapp.com",
      databaseURL: "https://lucasrossi-8dd18-default-rtdb.firebaseio.com",
      projectId: "lucasrossi-8dd18",
      storageBucket: "lucasrossi-8dd18.firebasestorage.app",
      messagingSenderId: "673298550054",
      appId: "1:673298550054:web:373dbcfc8dc615555605e7"
    });

    const db = getDatabase(app);
    const auth = getAuth(app);
    window._firebase = { db, ref, set, onValue, runTransaction, onDisconnect, serverTimestamp, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, RecaptchaVerifier, linkWithPhoneNumber, firebaseOk: true };

    // Presença: online enquanto o app está aberto e conectado. Ao fechar ou perder a internet, o
    // servidor da Firebase grava sozinho "offline" e a hora (onDisconnect). Só a equipe lê (regra presenca/).
    let _presencaUid = null, _presencaParar = null;
    const iniciarPresenca = uid => {
      if(_presencaUid === uid) return;
      _presencaUid = uid;
      const pRef = ref(db, 'presenca/' + uid);
      _presencaParar = onValue(ref(db, '.info/connected'), s => {
        if(s.val() !== true) return;
        onDisconnect(pRef).set({ online: false, vistoEm: serverTimestamp() })
          .then(() => set(pRef, { online: true, desde: serverTimestamp(), vistoEm: serverTimestamp() }))
          .catch(() => {});
      });
    };
    // Tempo no app (tela Clientes → "Tempo médio no app"): sessoes/<uid>/<id> = { inicio, fim } (hora do servidor).
    // Uma sessão = o app aberto e na tela; o fim avança a cada minuto enquanto está visível e quando sai da tela.
    // Voltou em até 5 min: continua a mesma sessão; depois disso abre uma nova. Só clientes (a equipe não é medida).
    let _sessao = null, _sessaoParar = null;
    const SESSAO_PAUSA_MS = 5 * 60000;
    const iniciarSessoes = uid => {
      if(_sessaoParar) return;
      const nova = () => {
        _sessao = { uid, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), escondidoEm: null };
        set(ref(db, `sessoes/${uid}/${_sessao.id}`), { inicio: serverTimestamp(), fim: serverTimestamp() }).catch(() => {});
      };
      const marcarFim = () => { if(_sessao) set(ref(db, `sessoes/${_sessao.uid}/${_sessao.id}/fim`), serverTimestamp()).catch(() => {}); };
      const aoMudar = () => {
        if(!_sessao) return;
        if(document.visibilityState === 'hidden'){ marcarFim(); _sessao.escondidoEm = Date.now(); }
        else if(_sessao.escondidoEm){
          if(Date.now() - _sessao.escondidoEm > SESSAO_PAUSA_MS) nova();
          else { _sessao.escondidoEm = null; marcarFim(); }
        }
      };
      nova();
      const timer = setInterval(() => { if(document.visibilityState === 'visible') marcarFim(); }, 60000);
      document.addEventListener('visibilitychange', aoMudar);
      window.addEventListener('pagehide', marcarFim);
      _sessaoParar = () => {
        marcarFim(); clearInterval(timer);
        document.removeEventListener('visibilitychange', aoMudar); window.removeEventListener('pagehide', marcarFim);
        _sessao = null; _sessaoParar = null;
      };
    };

    // "Sair": marca offline antes de desconectar (depois do logout não dá mais para gravar)
    window._presencaSair = async () => {
      try{ if(_sessaoParar) _sessaoParar(); }catch(e){}
      if(!_presencaUid) return;
      const pRef = ref(db, 'presenca/' + _presencaUid);
      try{ await set(pRef, { online: false, vistoEm: serverTimestamp() }); await onDisconnect(pRef).cancel(); }catch(e){}
      try{ if(_presencaParar) _presencaParar(); }catch(e){}
      _presencaUid = null; _presencaParar = null;
    };

    // Conta do dono (Master): o e-mail não fica escrito no site, só a impressão digital dele (SHA-256)
    const HASH_EMAIL_DONO = 'e75f4dc7f7cb90f39eb64c064602bd19a7195dfcef85bdb33aef58ee6c055fe0';
    const ehContaDono = async (email) => {
      try{
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(email || '').trim().toLowerCase()));
        return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') === HASH_EMAIL_DONO;
      }catch(e){ return false; }
    };

    onAuthStateChanged(auth, async (user) => {
      if(!iniciou){ iniciou = true; }
      window._firebaseUser = user;
      const dono = !!user && await ehContaDono(user.email);

      // "Entrar com Google" é só do acesso Master (verificação em duas etapas da conta Google).
      // Qualquer outra conta Google é desconectada na hora.
      if(user && !dono){
        try{
          if((await user.getIdTokenResult()).signInProvider === 'google.com'){
            await signOut(auth);
            const er = document.getElementById('login-erro');
            if(er){ er.textContent = 'O login com Google é só para o administrador. Entre com seu e-mail e senha.'; er.style.display = 'block'; }
            return;
          }
        }catch(e){}
      }
      if(user){
        if(dono){
          window._userRole = 'master'; // dono: nível Master (acima de Sócio)
          window._userPlano = 'patrimonio';
          try{ if(typeof definirMoeda === 'function') definirMoeda('BRL'); }catch(e){}
        } else {
          // Cargo e plano lidos ao mesmo tempo; erro do banco (ex.: fora do ar) responde na hora
          // em vez de esperar 3 s + 3 s
          const ler = caminho => new Promise(res => {
            let feito = false; const fim = v => { if(!feito){ feito = true; res(v); } };
            try{ onValue(ref(db, caminho), s => fim(s.val()), () => fim(null), { onlyOnce: true }); }catch(e){ fim(null); }
            setTimeout(() => fim(null), 3000);
          });
          const [role, plano, trialFim, status, primeiroAcesso, moeda] = await Promise.all([
            ler(`usuarios/${user.uid}/role`), ler(`usuarios/${user.uid}/plano`),
            ler(`usuarios/${user.uid}/trialFim`), ler(`usuarios/${user.uid}/status`),
            ler(`usuarios/${user.uid}/primeiroAcesso`), ler(`usuarios/${user.uid}/moeda`),
          ]);
          // Moeda da conta (cadastro na Austrália = AUD; contas antigas e do Brasil = BRL), antes de montar o app
          try{ if(typeof definirMoeda === 'function') definirMoeda(moeda === 'AUD' ? 'AUD' : 'BRL'); }catch(e){}
          window._userRole = role || 'cliente';
          window._userPlano = plano || 'gratuito';
          window._userTrialFim = trialFim || null;   // fim do período de teste (aviso no dashboard)
          window._userStatus = status || null;
          window._primeiroAcesso = primeiroAcesso === true;   // conta criada pela equipe: criar a própria senha
        }
        _userRole = window._userRole;
        _userPlano = window._userPlano;
        const nEl = document.getElementById('user-nome');
        if(nEl) nEl.textContent = user.displayName || user.email;
        const nome = user.displayName || user.email?.split('@')[0] || '';
        // Este aparelho já usa o FinRossi: daqui em diante finrossi.com.br abre direto o app (não a landing)
        try{ localStorage.setItem('fin_ja_entrou', '1'); sessionStorage.removeItem('fin_login_google'); }catch(e){}
        if(new URLSearchParams(location.search).get('entrar') === '1') history.replaceState(null, '', location.pathname + location.hash);
        irParaApp(nome, user.uid);
        // Conta criada pela equipe com senha provisória: cobre o app até criar a própria senha pelo e-mail
        // (espera a abertura de boas-vindas terminar e o app aparecer)
        if(window._primeiroAcesso) quandoAppAparecer(() => { if(typeof mostrarPrimeiroAcesso === 'function') mostrarPrimeiroAcesso(); });
        // Passo a passo pelo app: uma vez, para o cliente que está começando (js/app/41-passo-a-passo.js)
        // e, depois dele, o convite para ativar as notificações (js/app/32-notificacoes.js)
        else quandoAppAparecer(async () => {
          if(typeof talvezIniciarPassoAPasso === 'function') await talvezIniciarPassoAPasso();
          if(typeof talvezConvidarNotificacoes === 'function') talvezConvidarNotificacoes();
        });
        // Veio do link de um e-mail (?plano=...&cupom=...): abre "Minha assinatura" com tudo aplicado
        setTimeout(() => { try{ if(typeof verificarIntencaoAssinatura === 'function') verificarIntencaoAssinatura(); }catch(e){} }, 1600);
        // Último acesso (régua "cliente que sumiu" para na hora em que a pessoa volta): no máximo a cada 6 h
        try{
          const chaveAcesso = 'fin_ultimo_acesso_nuvem_' + user.uid;
          if(Date.now() - parseInt(localStorage.getItem(chaveAcesso) || '0', 10) > 6 * 3600e3){
            set(ref(db, `usuarios/${user.uid}/ultimoAcesso`), Date.now())
              .then(() => localStorage.setItem(chaveAcesso, String(Date.now()))).catch(() => {});
          }
        }catch(e){}
        try{ iniciarPresenca(user.uid); }catch(e){}
        try{ if(window._userRole === 'cliente') iniciarSessoes(user.uid); }catch(e){}   // tempo no app (só clientes)
        // Acessos por dia (gráfico da tela Clientes): uma marca por pessoa por dia. Só a equipe lê (regra acessos/).
        try{
          const d = new Date(), dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const chaveDia = 'fin_acesso_dia_' + user.uid;
          if(localStorage.getItem(chaveDia) !== dia){
            set(ref(db, `acessos/${dia}/${user.uid}`), Date.now()).then(() => localStorage.setItem(chaveDia, dia)).catch(() => {});
          }
        }catch(e){}
        setTimeout(()=>{ try{ initCursorFx(); }catch(e){} }, 150);
        setTimeout(()=>{ try{ initAvatar(); }catch(e){} }, 300);
        setTimeout(()=>{ try{ iniciarSistemaNotificacoes(); }catch(e){} }, 1000);
      } else {
        irParaLogin();
        const btn = document.getElementById('btn-login');
        if(btn){ btn.disabled=false; btn.style.opacity='1'; btn.style.cursor='pointer'; }
        const btnTxt = document.getElementById('btn-login-txt');
        if(btnTxt) btnTxt.textContent='Entrar';
        const pw = document.getElementById('login-progress-wrap');
        if(pw) pw.style.display='none';
      }

      if(!window._fbReady){
        window._fbReady = true;
        document.dispatchEvent(new Event('fbReady'));
      }
    });

  } catch(e) {
    console.warn('[FinRossi] Firebase erro:', e.message);
    window._firebase = { firebaseOk: false };
    irParaLogin();
    window._fbReady = true;
    document.dispatchEvent(new Event('fbReady'));
  }
})();
