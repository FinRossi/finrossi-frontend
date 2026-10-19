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
      + 'border-radius:10px;opacity:1;animation:none;z-index:1000;transform-origin:0 0;transition:transform .56s cubic-bezier(.65,0,.25,1)';
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
  // App entra com um fade curto (classe tira a opacidade em seguida)
  const revelarApp = () => {
    hide('tela-login');
    const app = document.getElementById('tela-app');
    if(!app) return;
    app.classList.add('app-entrando');
    show('tela-app','flex');
    requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('app-entrando')));
  };

  const irParaLogin = () => {
    entrouNoApp = false;    // saiu da conta: a próxima entrada roda a sequência de novo
    sairDoLoadingParaLogin();
  };
  const irParaApp = (nome) => {
    if(entrouNoApp) return;   // nunca roda duas vezes (evita duas transições seguidas)
    entrouNoApp = true;

    const INTERVALO_BOAS_VINDAS_MS = 30 * 60 * 1000; // 30 minutos — ajuste aqui se quiser mudar
    const ultimoAcesso = parseInt(localStorage.getItem('fin_ultimo_acesso_ts') || '0', 10);
    const vaiMostrarBoasVindas = !!nome && (Date.now() - ultimoAcesso) >= INTERVALO_BOAS_VINDAS_MS && typeof window._abrirComBoasVindas === 'function';
    localStorage.setItem('fin_ultimo_acesso_ts', String(Date.now()));

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
      { getDatabase, ref, set, onValue },
      { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
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
    window._firebase = { db, ref, set, onValue, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, firebaseOk: true };

    onAuthStateChanged(auth, async (user) => {
      if(!iniciou){ iniciou = true; }
      window._firebaseUser = user;

      if(user){
        if(user.email === 'lucasrossi2100@gmail.com'){
          window._userRole = 'master'; // dono: nível Master (acima de Sócio)
          window._userPlano = 'patrimonio';
        } else {
          // Cargo e plano lidos ao mesmo tempo; erro do banco (ex.: fora do ar) responde na hora
          // em vez de esperar 3 s + 3 s
          const ler = caminho => new Promise(res => {
            let feito = false; const fim = v => { if(!feito){ feito = true; res(v); } };
            try{ onValue(ref(db, caminho), s => fim(s.val()), () => fim(null), { onlyOnce: true }); }catch(e){ fim(null); }
            setTimeout(() => fim(null), 3000);
          });
          const [role, plano, trialFim, status] = await Promise.all([
            ler(`usuarios/${user.uid}/role`), ler(`usuarios/${user.uid}/plano`),
            ler(`usuarios/${user.uid}/trialFim`), ler(`usuarios/${user.uid}/status`),
          ]);
          window._userRole = role || 'cliente';
          window._userPlano = plano || 'gratuito';
          window._userTrialFim = trialFim || null;   // fim do período de teste (aviso no dashboard)
          window._userStatus = status || null;
        }
        _userRole = window._userRole;
        _userPlano = window._userPlano;
        const nEl = document.getElementById('user-nome');
        if(nEl) nEl.textContent = user.displayName || user.email;
        const nome = user.displayName || user.email?.split('@')[0] || '';
        irParaApp(nome);
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
