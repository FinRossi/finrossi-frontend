// js/firebase-init.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
(async () => {
  const show = (id, d='block') => { const el=document.getElementById(id); if(el) el.style.display=d; };
  const hide = (id) => { const el=document.getElementById(id); if(el) el.style.display='none'; };

  // Faz o logo da tela de carregamento crescer em direção à tela (como se o
  // app estivesse vindo até você), depois revela o próximo passo
  const sairDoLoadingComZoom = (proximoPasso) => {
    const loadingEl = document.getElementById('loading');
    if(!loadingEl || loadingEl.style.display==='none'){ proximoPasso(); return; }
    loadingEl.classList.add('loading-zoom-out');
    // Revela a próxima tela um pouco antes do zoom terminar — as duas se
    // sobrepõem, em vez de uma esperar a outra (evita a sensação de travar)
    setTimeout(() => { proximoPasso(); }, 320);
    setTimeout(() => {
      hide('loading');
      loadingEl.classList.remove('loading-zoom-out');
    }, 550);
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
    sairDoLoadingComZoom(() => { show('tela-login','flex'); hide('tela-app'); });
  };
  const irParaApp = (nome) => {
    if(entrouNoApp) return;   // nunca roda duas vezes (evita duas transições seguidas)
    entrouNoApp = true;

    const INTERVALO_BOAS_VINDAS_MS = 30 * 60 * 1000; // 30 minutos — ajuste aqui se quiser mudar
    const ultimoAcesso = parseInt(localStorage.getItem('fin_ultimo_acesso_ts') || '0', 10);
    const vaiMostrarBoasVindas = !!nome && (Date.now() - ultimoAcesso) >= INTERVALO_BOAS_VINDAS_MS && typeof window._abrirComBoasVindas === 'function';
    localStorage.setItem('fin_ultimo_acesso_ts', String(Date.now()));

    prepararApp();
    const loadingVisivel = document.getElementById('loading')?.style.display !== 'none';

    if(vaiMostrarBoasVindas){
      // Boas-vindas por cima; o carregamento sai por baixo dela; depois o app entra com fade
      window._abrirComBoasVindas(nome, revelarApp);
      setTimeout(() => { hide('loading'); hide('tela-login'); }, 250);
    } else if(loadingVisivel){
      // Já estava logado (abriu o app): o logo do carregamento cresce e o app aparece por baixo
      sairDoLoadingComZoom(revelarApp);
    } else if(typeof window.irisTransition === 'function'){
      // Acabou de entrar pela tela de login: explosão dourada
      window.irisTransition(revelarApp);
    } else {
      revelarApp();
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
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const { getDatabase, ref, set, onValue } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
    const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

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
          const [role, plano] = await Promise.all([ler(`usuarios/${user.uid}/role`), ler(`usuarios/${user.uid}/plano`)]);
          window._userRole = role || 'cliente';
          window._userPlano = plano || 'gratuito';
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
