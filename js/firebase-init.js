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

  const irParaLogin = () => { sairDoLoadingComZoom(() => { show('tela-login','flex'); hide('tela-app'); }); };
  const irParaApp   = (nome) => {
    hide('loading');

    // Decide ANTES se a tela de boas-vindas vai aparecer — ela já tem sua
    // própria entrada em sequência, então não precisa da explosão por cima
    const INTERVALO_BOAS_VINDAS_MS = 30 * 60 * 1000; // 30 minutos — ajuste aqui se quiser mudar
    const ultimoAcesso = parseInt(localStorage.getItem('fin_ultimo_acesso_ts') || '0', 10);
    const vaiMostrarBoasVindas = !!nome && (Date.now() - ultimoAcesso) >= INTERVALO_BOAS_VINDAS_MS;
    localStorage.setItem('fin_ultimo_acesso_ts', String(Date.now()));

    const trocarTela = () => {
      hide('tela-login');
      if(vaiMostrarBoasVindas){
        // Delega para função global (definida no script principal)
        window._abrirComBoasVindas(nome, () => show('tela-app','flex'));
      } else {
        show('tela-app','flex');
      }
    };

    if(vaiMostrarBoasVindas){
      // A tela de boas-vindas é a transição — sem explosão por cima dela
      trocarTela();
    } else if(typeof window.irisTransition === 'function'){
      window.irisTransition(trocarTela);
    } else {
      trocarTela();
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
          window._userRole = 'socio';
          window._userPlano = 'patrimonio';
        } else {
          try{
            const snap = await new Promise((res,rej) => {
              const u = onValue(ref(db,`usuarios/${user.uid}/role`), s=>{ u(); res(s); }, {onlyOnce:true});
              setTimeout(()=>rej(), 3000);
            });
            window._userRole = snap.val() || 'cliente';
          }catch(e){ window._userRole = 'cliente'; }
          try{
            const snapP = await new Promise((res,rej) => {
              const u = onValue(ref(db,`usuarios/${user.uid}/plano`), s=>{ u(); res(s); }, {onlyOnce:true});
              setTimeout(()=>rej(), 3000);
            });
            window._userPlano = snapP.val() || 'gratuito';
          }catch(e){ window._userPlano = 'gratuito'; }
        }
        _userRole = window._userRole;
        _userPlano = window._userPlano;
        const nome = user.displayName || user.email?.split('@')[0] || '';
        irParaApp(nome);
        const nEl = document.getElementById('user-nome');
        if(nEl) nEl.textContent = user.displayName || user.email;
        setTimeout(()=>setupPerfilUI(), 100);
        setTimeout(()=>{initSidebar();initCursorFx();}, 150);
        setTimeout(()=>initAvatar(), 300);
        setTimeout(()=>iniciarSistemaNotificacoes(), 1000);
        setTimeout(()=>{ loadCategorias(); populateCatSelects(); }, 200);
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
