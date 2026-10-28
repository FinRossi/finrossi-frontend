// js/i18n-en.js — inglês (Austrália). Baixado só quando o idioma é inglês (js/i18n.js).
// ─── Como funciona ───────────────────────────────────────────────────────────
// O app e a landing continuam escritos em português. Este arquivo troca, na tela, cada texto que
// tem tradução no dicionário (comparação exata, sem tradutor automático): textos fixos, o que os
// scripts desenham depois (MutationObserver), alertas/confirmações, título da página e rótulos dos
// gráficos. Texto sem tradução continua em português — nada quebra. Valores digitados (input,
// textarea), scripts e trechos marcados com data-sem-traducao nunca são mexidos. Os valores salvos
// (categorias, tipos, planos) continuam em português no banco; só o que aparece é traduzido.
(function(){
  var D = window.I18N_EN = { textos: {}, padroes: [] };

  // ── Motor ──────────────────────────────────────────────────────────────────
  var norm = function(s){ return String(s).replace(/\s+/g, ' ').trim(); };
  var temLetra = /[A-Za-zÀ-ú]/;
  function traduzir(texto){
    var k = norm(texto);
    if(!k) return null;
    if(!temLetra.test(k)){
      // Número escrito à mão no formato brasileiro (ex.: telinha de exemplo da landing): 48.320,00 → 48,320.00.
      // Os valores do app já saem no formato do idioma (fmtMoeda) e não caem aqui.
      var nb = k.match(/^([+−-]?\s?)(\d{1,3}(?:\.\d{3})*),(\d{2})$/);
      return nb ? nb[1] + nb[2].replace(/\./g, ',') + '.' + nb[3] : null;
    }
    if(Object.prototype.hasOwnProperty.call(D.textos, k)) return D.textos[k];
    for(var i = 0; i < D.padroes.length; i++){
      var p = D.padroes[i];
      if(p[0].test(k)) return k.replace(p[0], p[1]);
    }
    return null;
  }
  window.t = function(texto){ var r = traduzir(texto); return r == null ? texto : r; };
  function traduzLinhas(txt){ return String(txt).split('\n').map(function(l){ var r = traduzir(l); return r == null ? l : r; }).join('\n'); }

  // Campos (input/textarea): traduz a dica (placeholder/title), nunca o valor digitado
  var PULA_TAG = { SCRIPT:1, STYLE:1, NOSCRIPT:1, CODE:1, PRE:1 };
  var ATRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function podeElemento(el){
    return !(PULA_TAG[el.tagName] || (el.hasAttribute && (el.hasAttribute('data-sem-traducao') || el.getAttribute('contenteditable') === 'true')));
  }
  function traduzNoTexto(n){
    var p = n.parentElement;
    if(!p || p.tagName === 'TEXTAREA' || !podeElemento(p) || p.closest('[data-sem-traducao]')) return;
    var v = n.nodeValue, r = traduzir(v);
    if(r != null && r !== norm(v)){
      var ini = v.match(/^\s*/)[0], fim = v.match(/\s*$/)[0];
      n.nodeValue = ini + r + fim;
    }
  }
  function traduzAtributos(el){
    for(var i = 0; i < ATRS.length; i++){
      var v = el.getAttribute(ATRS[i]);
      if(v){ var r = traduzir(v); if(r != null && r !== norm(v)) el.setAttribute(ATRS[i], r); }
    }
    if(el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value){
      var rv = traduzir(el.value); if(rv != null) el.value = rv;
    }
  }
  function percorrer(raiz){
    if(!raiz) return;
    if(raiz.nodeType === 3){ traduzNoTexto(raiz); return; }
    if(raiz.nodeType !== 1 || !podeElemento(raiz) || raiz.closest('[data-sem-traducao]')) return;
    traduzAtributos(raiz);
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function(n){ return (n.nodeType === 1 && !podeElemento(n)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    var n;
    while((n = w.nextNode())){ if(n.nodeType === 3) traduzNoTexto(n); else traduzAtributos(n); }
  }

  // Gráficos (Chart.js desenham no canvas): traduz rótulos e nomes das séries antes de desenhar
  function registrarGraficos(){
    if(!window.Chart || window.Chart._i18nOk) return !!window.Chart;
    window.Chart._i18nOk = true;
    window.Chart.register({ id: 'i18nRotulos', beforeUpdate: function(c){
      if(c.data && Array.isArray(c.data.labels)) c.data.labels = c.data.labels.map(function(l){ return typeof l === 'string' ? window.t(l) : l; });
      (c.data && c.data.datasets || []).forEach(function(d){ if(typeof d.label === 'string') d.label = window.t(d.label); });
    }});
    return true;
  }

  window.iniciarTraducao = function(){
    if(window._traducaoAtiva) return;
    window._traducaoAtiva = true;
    // Alertas e confirmações
    var a = window.alert, c = window.confirm, p = window.prompt;
    window.alert = function(m){ return a.call(window, traduzLinhas(m)); };
    window.confirm = function(m){ return c.call(window, traduzLinhas(m)); };
    window.prompt = function(m, v){ return p.call(window, traduzLinhas(m), v); };
    var comecar = function(){
      if(document.title){ var tt = traduzir(document.title); if(tt) document.title = tt; }
      percorrer(document.body);
      document.documentElement.classList.remove('i18n-espera');
      new MutationObserver(function(muts){
        for(var i = 0; i < muts.length; i++){
          var m = muts[i];
          if(m.type === 'characterData') traduzNoTexto(m.target);
          else if(m.type === 'attributes') { if(m.target.nodeType === 1 && podeElemento(m.target)) traduzAtributos(m.target); }
          else for(var j = 0; j < m.addedNodes.length; j++) percorrer(m.addedNodes[j]);
        }
      }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRS });
      if(!registrarGraficos()){ var tentativas = 0, int = setInterval(function(){ if(registrarGraficos() || ++tentativas > 40) clearInterval(int); }, 250); }
    };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', comecar); else comecar();
  };

  // ── Dicionário ─────────────────────────────────────────────────────────────
  // Textos: português exatamente como aparece na tela (espaços normalizados) → inglês australiano.
  // Padrões: textos com números ou valores ([expressão, substituição]).
  window.I18N_EN_ADD = function(textos, padroes){
    for(var k in textos) if(Object.prototype.hasOwnProperty.call(textos, k)) D.textos[norm(k)] = textos[k];
    (padroes || []).forEach(function(p){ D.padroes.push(p); });
  };
})();

// ═══ App — menus, botões e telas ═══════════════════════════════════════════
I18N_EN_ADD({
  // Menu e navegação
  'Dashboard': 'Dashboard', 'Início': 'Home', 'Lançar': 'Add', 'Lançamentos': 'Transactions', 'Investimentos': 'Investments',
  'Histórico': 'History', 'Metas': 'Goals', 'Objetivos': 'Tasks', 'Renda Passiva': 'Passive income', 'Score de Saúde': 'Health score',
  'Score': 'Score', 'Relatórios': 'Reports', 'Notas': 'Notes', 'Assinaturas': 'Subscriptions', 'Recorrentes': 'Recurring',
  'Contas Recorrentes': 'Recurring bills', 'Calendário': 'Calendar', 'Calendário Financeiro': 'Financial calendar', 'Calendário financeiro': 'Financial calendar',
  'Cartões': 'Cards', 'Cartões de Crédito': 'Credit cards', 'Cartões de crédito': 'Credit cards', 'Manual': 'Guide', 'Manual de uso': 'User guide',
  'Minha Assinatura': 'My subscription', 'Minha conta': 'My account', 'Minha área': 'My space', 'Minhas finanças': 'My finances', 'Pessoal': 'Personal',
  'Menu': 'Menu', 'Controles': 'Tools', 'Mais': 'More', 'Aplicativo': 'App', 'Configurações': 'Settings', 'Sair': 'Log out', 'Sair da conta': 'Log out',
  'Perfil': 'Profile', 'Painel pessoal': 'Personal dashboard', 'Conta': 'Account', 'Sua conta': 'Your account', 'Faturas e gastos': 'Bills and spending',
  'Netflix, Spotify...': 'Netflix, Spotify...', 'Aluguel, luz, água...': 'Rent, power, water...', 'Próximos vencimentos e pagamentos': 'Upcoming due dates and payments',
  'Anotações financeiras': 'Financial notes', 'Aprenda a usar o FinRossi': 'Learn how to use FinRossi', 'Como usar o FinRossi': 'How to use FinRossi',
  'Itens do Menu lateral': 'Side menu items', 'Barra de atalhos': 'Shortcut bar',
  // Ações
  'Salvar': 'Save', 'Salvar alterações': 'Save changes', 'Cancelar': 'Cancel', 'Fechar': 'Close', 'Confirmar': 'Confirm', 'Remover': 'Remove',
  'Limpar': 'Clear', 'Limpar tudo': 'Clear all', 'editar': 'edit', 'Excluir': 'Delete', '+ Adicionar': '+ Add', 'Cadastrar': 'Add',
  'Entrar': 'Log in', 'Voltar': 'Back', 'Dispensar': 'Dismiss', 'Fazer agora': 'Do it now', 'Minimizar': 'Minimise', 'Compartilhar': 'Share',
  'Instalar': 'Install', 'Agora não': 'Not now', 'Baixar PDF': 'Download PDF', 'Exportar Excel': 'Export to Excel', 'Assinar': 'Subscribe',
  'Ativar notificações': 'Turn on notifications', '+ Nova': '+ New', '+ Novo': '+ New', '+ Nova meta': '+ New goal', '"+ Nova meta"': '"+ New goal"',
  '+ Nova nota': '+ New note', '+ Nova assinatura': '+ New subscription', '+ Nova conta': '+ New bill', '+ Novo cartão': '+ New card',
  '+ Cadastrar cartão': '+ Add card', '+ Novo objetivo': '+ New task', '+ Registrar pagamento': '+ Record payment', 'Salvar cor': 'Save colour',
  'Salvar nota': 'Save note', 'Salvar preferências': 'Save preferences', '"Gerar lançamentos"': '"Create transactions"', '"atualizar saldo"': '"update balance"',
  // Dashboard
  'Bom dia': 'Good morning', 'Boa tarde': 'Good afternoon', 'Boa noite': 'Good evening',
  'Patrimônio líquido': 'Net worth', 'Receitas': 'Income', 'Despesas': 'Expenses', 'Saldo disponível': 'Available balance', 'Saldo': 'Balance',
  'Evolução do patrimônio': 'Net worth over time', 'Gastos por categoria': 'Spending by category', 'Receitas e despesas': 'Income and expenses',
  'Receitas e Despesas': 'Income and expenses', 'Todos os meses': 'All months', 'atual': 'current', 'sem mudança': 'no change',
  'sem mudança no mês': 'no change this month', 'subiu no mês': 'up this month', 'caiu no mês': 'down this month', 'este mês': 'this month',
  'Personalizar dashboard': 'Customise dashboard', 'Primeiros passos': 'Getting started', 'Registre sua primeira receita': 'Record your first income',
  'Salário, freela ou qualquer entrada.': 'Salary, freelance work or any money coming in.', 'Registre sua primeira despesa': 'Record your first expense',
  'Mercado, aluguel, transporte…': 'Groceries, rent, transport…', 'Crie uma meta': 'Create a goal',
  'Defina quanto quer juntar, como a reserva de emergência.': 'Set how much you want to save, like an emergency fund.',
  'Vencimentos próximos': 'Upcoming due dates', 'Próximos vencimentos': 'Upcoming due dates', 'Vence hoje': 'Due today', 'Vence amanhã': 'Due tomorrow',
  'parcelas em andamento': 'instalments in progress', 'Local': 'Local', 'Modo local': 'Offline mode',
  'Valores em reais. Toque num mês para ver o dashboard dele.': 'Tap a month to see its dashboard.', 'Cards do Dashboard': 'Dashboard cards',
  'Sem despesas este mês': 'No expenses this month', 'O que os números dizem': 'What the numbers say', 'Insights': 'Insights',
  'Desafios': 'Challenges', 'Projeções': 'Projections', 'Ver todos os cartões': 'See all cards', 'Patrimônio necessário': 'Wealth needed',
  'Total investido': 'Total invested', 'Escolha quais informações aparecem na sua tela inicial.': 'Choose what shows on your home screen.',
  'Comparativo': 'Comparison', 'comparativo': 'comparison', 'Despesa:': 'Expense:', 'Receita:': 'Income:', 'Investimento:': 'Investment:',
  'mais escolhido': 'most popular', 'por mês': 'per month', 'estimado': 'estimated', 'pausadas': 'paused', 'pendente': 'pending', 'lançada': 'added',
  // Lançamentos
  'Receita': 'Income', 'Despesa': 'Expense', 'Investimento': 'Investment', 'Nova receita': 'New income', 'Nova despesa': 'New expense',
  'Novo investimento': 'New investment', 'Adicionar receita': 'Add income', 'Adicionar despesa': 'Add expense', 'Adicionar investimento': 'Add investment',
  'Descrição': 'Description', 'Valor (R$)': 'Amount', 'Valor total (R$)': 'Total amount', 'valor total': 'total amount', 'Data': 'Date',
  'Categoria': 'Category', 'Observação': 'Note', 'Opcional': 'Optional', '(opcional)': '(optional)', 'Anexo (opcional)': 'Attachment (optional)',
  'Tipo de lançamento': 'Transaction type', 'Método de pagamento': 'Payment method', 'Método de recebimento': 'Received by',
  'Forma de pagamento': 'Payment method', 'Dinheiro': 'Cash', 'Débito': 'Debit', 'Crédito': 'Credit', 'Pix': 'PayID',
  'Transferência': 'Bank transfer', 'Boleto': 'BPAY', 'Depósito': 'Deposit', 'Cartão': 'Card', 'Cartão de crédito': 'Credit card',
  'Selecione o cartão usado': 'Choose the card used', 'Parcelado': 'In instalments', 'À vista': 'Paid in full', 'Nº de parcelas': 'Number of instalments',
  'nº de parcelas': 'number of instalments', 'Cada parcela:': 'Each instalment:', 'Tirar foto': 'Take photo', 'Escolher da galeria': 'Choose from gallery',
  'Galeria': 'Gallery', 'Fotografe a nota fiscal ou o comprovante. O app lê e preenche para você conferir.': 'Take a photo of the receipt. The app reads it and fills in the details for you to check.',
  'Foto anexada': 'Photo attached', 'Depois de adicionar, o anexo não pode ser trocado nem removido.': 'Once added, the attachment can’t be changed or removed.',
  'Editar lançamento': 'Edit transaction', 'Banco / Plataforma': 'Bank / platform', 'Rentabilidade': 'Return', 'Tipo': 'Type',
  'Ex: Aluguel, Energia...': 'e.g. Rent, Electricity...', 'Aluguel, Farmácia...': 'Rent, Pharmacy...', 'Salário, Freelance...': 'Salary, Freelance...',
  'Nubank, Inter...': 'Bank, platform...', 'Gerenciar categorias': 'Manage categories', 'Lance as despesas': 'Add your expenses',
  // Categorias e tipos (os valores salvos continuam em português)
  'Moradia': 'Housing', 'Alimentação': 'Food', 'Saúde': 'Health', 'Transporte': 'Transport', 'Educação': 'Education', 'Lazer': 'Leisure',
  'Parcela': 'Instalment', 'Serviços': 'Services', 'Outros': 'Other', 'Outro': 'Other', 'Outra': 'Other', 'Salário': 'Salary',
  'Freelance': 'Freelance', 'Aluguel recebido': 'Rent received', 'Dividendos': 'Dividends', 'Venda': 'Sale', 'Reserva de emergência': 'Emergency fund',
  'Todas as categorias': 'All categories', 'Categorias de Despesa': 'Expense categories', 'Categorias personalizadas': 'Custom categories',
  'Nova categoria...': 'New category...', 'Personalize as categorias do seu perfil. As padrão não podem ser removidas.': 'Customise the categories in your profile. Default ones can’t be removed.',
  'Crie categorias próprias de despesa e receita. Ficam salvas no seu perfil.': 'Create your own expense and income categories. They’re saved to your profile.',
  'Padrão': 'Default', 'padrão': 'default', 'inativa': 'inactive', 'Streaming': 'Streaming', 'Música': 'Music', 'Compras e entregas': 'Shopping and delivery',
  'Apps e software': 'Apps and software', 'Nuvem e armazenamento': 'Cloud storage', 'Jogos': 'Games', 'Saúde e academia': 'Health and fitness',
  'Leitura e notícias': 'Reading and news', 'Telefone e internet': 'Phone and internet', 'Geral': 'General', 'Financeiro': 'Finance', 'Reunião': 'Meeting',
  'Ideia': 'Idea', 'Importante': 'Important', 'Tarefa': 'Task', 'Conta a pagar': 'Bill to pay',
  // Histórico
  'Todos os lançamentos': 'All transactions', 'Todos os tipos': 'All types', 'Todos': 'All', 'Mês': 'Month', 'Período': 'Period',
  'Nenhum lançamento encontrado. Ajuste os filtros ou registre um lançamento.': 'No transactions found. Adjust the filters or add a transaction.',
  'Nenhum lançamento neste período': 'No transactions in this period', 'Nenhum registro ainda': 'Nothing recorded yet',
  // Investimentos
  'Acompanhe sua carteira de investimentos.': 'Track your investment portfolio.', 'Carteira e posições ativas': 'Portfolio and active holdings',
  'Posições': 'Holdings', 'Distribuição': 'Allocation', 'Nenhum investimento ainda': 'No investments yet', 'Nenhum investimento cadastrado': 'No investments added',
  'Renda fixa': 'Fixed income', 'Renda variável': 'Shares and growth assets', 'Renda Fixa — CDB': 'Fixed income — Term deposit',
  'Renda Fixa — CDI': 'Fixed income — Cash account', 'Renda Fixa — LCI/LCA': 'Fixed income — Bonds', 'Renda Fixa — Poupança': 'Savings account',
  'Renda Fixa — Tesouro Direto': 'Government bonds', 'Renda Variável — Ações': 'Shares', 'Renda Variável — FII': 'Property trusts (REITs)',
  'Criptomoedas': 'Crypto', 'Total já investido (R$)': 'Total already invested', 'Já investido (R$)': 'Already invested',
  // Metas e objetivos
  'Nova meta': 'New goal', 'Nenhuma meta ainda': 'No goals yet', 'Valor alvo (R$)': 'Target amount', 'Data limite': 'Deadline',
  'Aporte mensal (R$)': 'Monthly contribution', 'Simulação de aportes': 'Contribution simulator', 'simulação de aportes': 'contribution simulator',
  'Prazo estimado com aportes mensais': 'Estimated time with monthly contributions', 'Usar o total da minha carteira': 'Use my total portfolio',
  'Crie uma meta para ver em quanto tempo chega lá.': 'Create a goal to see how long it will take to get there.',
  'Defina um valor para juntar, como a reserva de emergência ou uma viagem, e acompanhe quanto falta.': 'Set an amount to save, like an emergency fund or a trip, and see how much is left.',
  'Quanto falta para cada objetivo de dinheiro': 'How much is left for each savings goal', 'Metas e objetivos': 'Goals and tasks',
  'Novo objetivo': 'New task', 'Descreva o objetivo...': 'Describe the task...', 'Prioridade': 'Priority', 'prioridade': 'priority',
  'Alta': 'High', 'Média': 'Medium', 'Baixa': 'Low', 'Hoje': 'Today', 'Esta semana': 'This week', 'Este mês': 'This month',
  'Concluídos — Hoje': 'Done — Today', 'Concluídos — Semana': 'Done — Week', 'Concluídos — Mês': 'Done — Month',
  'Pendentes — Hoje': 'Pending — Today', 'Pendentes — Semana': 'Pending — Week', 'Pendentes — Mês': 'Pending — Month',
  'Defina objetivos financeiros e acompanhe o progresso.': 'Set financial tasks and track your progress.',
  'Organize suas tarefas financeiras por período.': 'Organise your financial tasks by period.', 'Tarefas do dia, da semana e do mês': 'Tasks for the day, week and month',
  'Nada por aqui. Toque em "+ Novo objetivo" para incluir.': 'Nothing here yet. Tap "+ New task" to add one.',
  'A simulação mostra o prazo com o seu aporte mensal atual': 'The simulator shows the time frame with your current monthly contribution',
  // Renda passiva
  'Quanto preciso investir para viver de renda?': 'How much do I need to invest to live off passive income?', 'Renda desejada': 'Target income',
  'Nova renda desejada': 'New target income', 'Salvar renda': 'Save income', 'Rendas que você quer alcançar': 'Income targets',
  'Salve a renda mensal que é o seu objetivo. O app calcula o patrimônio que cada uma exige e quanto você já tem.': 'Save the monthly income you’re aiming for. The app works out the wealth each one needs and how much you already have.',
  'CDI mensal (%)': 'Monthly interest rate (%)', 'IR sobre rendimento (%)': 'Tax on returns (%)', 'Taxa CDI atual (%/mês)': 'Current interest rate (%/month)',
  'Taxa personalizada (%/mês)': 'Custom rate (%/month)', 'Parâmetros': 'Settings', 'Calculadora de renda passiva': 'Passive income calculator',
  'Comparando os dois cenários de taxa lado a lado': 'Comparing both rate scenarios side by side', 'Compare dois cenários de taxa lado a lado': 'Compare two rate scenarios side by side',
  'taxa mensal': 'monthly rate', 'ao mês)': 'a month)', 'Calcule quanto precisa investir para viver de renda. (Disponível no perfil Pessoal)': 'Work out how much you need to invest to live off passive income. (Available in the Personal profile)',
  'Renda mensal, ex.: 8.000': 'Monthly income, e.g. 8,000',
  // Score / Patrimônio / Relatórios
  'Saúde do patrimônio': 'Wealth health', 'Saúde do seu patrimônio': 'Your wealth health',
  'Registre suas receitas e despesas do mês pra começar a calcular a saúde do seu patrimônio.': 'Record this month’s income and expenses to start measuring your wealth health.',
  'Score, insights, desafios e projeções — um retrato de como está sua saúde financeira agora': 'Score, insights, challenges and projections — a snapshot of your financial health right now',
  'A análise da sua semana ou do seu mês, pronta para salvar em PDF': 'An analysis of your week or month, ready to save as PDF',
  'Tipo de relatório': 'Report type', 'Período do relatório': 'Report period', 'Semanal': 'Weekly', 'Mensal': 'Monthly', 'Relatório mensal': 'Monthly report',
  'Escolha outro período acima ou registre receitas e despesas para o relatório ter o que analisar.': 'Choose another period above, or record income and expenses so the report has something to analyse.',
  'dados suficientes': 'enough data',
  // Notas
  'Nova nota': 'New note', 'Editar nota': 'Edit note', 'Nenhuma nota ainda': 'No notes yet', 'Buscar notas...': 'Search notes...', 'Título': 'Title',
  'Conteúdo': 'Content', 'Cor': 'Colour', 'Escreva sua anotação aqui...': 'Write your note here...', 'Guarde ideias, combinados e lembretes.': 'Keep ideas, agreements and reminders.',
  'Anotações, ideias e lembretes': 'Notes, ideas and reminders', 'Um bloco de anotações integrado ao seu perfil.': 'A notepad built into your profile.',
  'Ex: Reunião com cliente, Ideia de negócio...': 'e.g. Client meeting, Business idea...',
  // Assinaturas
  'Nova assinatura': 'New subscription', 'Nenhuma assinatura cadastrada': 'No subscriptions added', 'Controle de serviços recorrentes': 'Recurring services',
  'Controle todos os serviços que você paga mensalmente.': 'Keep track of every service you pay for each month.', 'Total mensal': 'Monthly total',
  'Total anual': 'Yearly total', 'Pausadas': 'Paused', 'Total serviços': 'Services', 'Ativa': 'Active', 'Pausada': 'Paused', 'Gastos por tipo': 'Spending by type',
  'Assinaturas por dia de cobrança': 'Subscriptions by billing day', 'Dia de vencimento': 'Billing day', 'Personalizar os tipos de assinatura': 'Customise subscription types',
  'Ex: Netflix, Spotify...': 'e.g. Netflix, Spotify...', 'Tipos de assinatura': 'Subscription types', 'Novo tipo...': 'New type...',
  'Cadastre streaming, música, academia e outros serviços para ver quanto eles somam por mês.': 'Add streaming, music, gym and other services to see how much they cost each month.',
  'Cadastre Netflix, Spotify, academia, softwares — tudo em um lugar': 'Add Netflix, Spotify, the gym, software — all in one place',
  'Veja o total mensal e anual de assinaturas nos cards de métricas': 'See your monthly and yearly subscription totals in the summary cards',
  'Assinaturas em dólar australiano em breve': 'Subscriptions in Australian dollars coming soon', 'Entendi': 'Got it',
  'Estamos preparando o pagamento em A$. Enquanto isso, continue usando o FinRossi normalmente: avisaremos por e-mail assim que os planos estiverem disponíveis.': 'We’re getting payments in AUD ready. In the meantime, keep using FinRossi as normal — we’ll email you as soon as plans are available.',
  // Contas recorrentes e calendário
  'Nova conta recorrente': 'New recurring bill', 'Nenhuma conta recorrente': 'No recurring bills', 'Contas ativas': 'Active bills', 'Contas cadastradas': 'Bills added',
  'Cadastre contas fixas e gere os lançamentos automaticamente.': 'Add fixed bills and create the transactions automatically.',
  'Cadastre aluguel, energia, internet e outros gastos fixos. Depois, um toque lança todos nas despesas do mês.': 'Add rent, electricity, internet and other fixed costs. Then one tap adds them all to this month’s expenses.',
  'Cadastre aluguel, luz, água, internet uma única vez': 'Add rent, power, water and internet just once', 'Cadastre uma vez, lança todo mês automaticamente': 'Add once, recorded every month automatically',
  'Lançar contas do mês': 'Add this month’s bills', 'Gerar lançamentos de': 'Create transactions for', 'e assinaturas ativas': 'and active subscriptions',
  'Gera automaticamente todos os lançamentos de contas recorrentes': 'Automatically creates all transactions for recurring bills',
  'do mês atual que ainda não foram lançados.': 'for the current month that haven’t been added yet.', 'Vencimentos do mês': 'Due this month',
  'Visualize todos os seus vencimentos no calendário.': 'See all your due dates on the calendar.', 'Nada para pagar ou receber neste mês.': 'Nothing to pay or receive this month.',
  'Vencimento / Próx. cobrança': 'Due date / next charge', 'Vencida': 'Overdue', 'no mês atual': 'in the current month',
  'Seg': 'Mon', 'Ter': 'Tue', 'Qua': 'Wed', 'Qui': 'Thu', 'Sex': 'Fri', 'Sáb': 'Sat', 'Dom': 'Sun',
  // Cartões
  'Novo cartão': 'New card', 'Nenhum cartão cadastrado': 'No cards added', 'Nome do cartão': 'Card name', 'Banco': 'Bank', 'Bandeira': 'Card network',
  'Modelo': 'Design', 'Limite (R$)': 'Limit', 'Fechamento (dia)': 'Statement closes (day)', 'Vencimento (dia)': 'Due (day)', 'Ex: Nubank, Itaú Platinum...': 'e.g. CommBank, ANZ Platinum...',
  'Controle de faturas e gastos': 'Bills and spending', 'Acompanhe a fatura': 'Track your statement', 'Cadastre o cartão': 'Add your card',
  'Cadastre seus cartões para acompanhar a fatura, o limite disponível e as despesas feitas em cada um.': 'Add your cards to track the statement, available limit and spending on each one.',
  'Em Lançamentos, adicione uma despesa e selecione o cartão. Entra na fatura automaticamente.': 'In Transactions, add an expense and choose the card. It goes on the statement automatically.',
  'Veja fatura atual, limite disponível, gastos por categoria e alertas de limite.': 'See the current statement, available limit, spending by category and limit alerts.',
  'All Black': 'All Black', 'Carbono + brilho': 'Carbon + shine', 'Cor sólida premium': 'Premium solid colour', 'Preto fosco + friso': 'Matte black + trim',
  'Linhas finas': 'Fine lines', 'Personalizado': 'Custom',
  // Minha assinatura
  'Plano atual': 'Current plan', 'Plano': 'Plan', 'Plano e pagamentos': 'Plan and payments', 'Plano, pagamentos e status da conta': 'Plan, payments and account status',
  'Cliente desde': 'Customer since', 'Forma de acesso': 'Access type', 'O que o seu plano inclui': 'What your plan includes', 'Escolha seu plano': 'Choose your plan',
  'Assine aqui mesmo, na sua conta. Seus dados continuam todos com você.': 'Subscribe right here in your account. All your data stays with you.',
  'Seus dados ficam na sua conta. Ao mudar de plano, nada é apagado: o que não fizer parte do novo plano só fica bloqueado e volta a aparecer quando o recurso for liberado.': 'Your data stays in your account. Changing plans never deletes anything: features outside your new plan are just locked and come back when they’re unlocked.',
  'Ajuda e documentos': 'Help and documents', 'Enviar e-mail ao suporte': 'Email support', 'Termos de uso': 'Terms of use', 'Privacidade': 'Privacy',
  'Contrato': 'Subscription agreement', 'Período de teste': 'Free trial', 'Teste gratuito': 'Free trial', 'Gratuito': 'Free', 'Essencial': 'Essential',
  'Evolução': 'Growth', 'Patrimônio': 'Wealth', 'Atendimento prioritário': 'Priority support', 'Lançamentos ilimitados e investimentos.': 'Unlimited transactions and investments.',
  'Metas, cartões, contas fixas, calendário, renda passiva e lançar por foto.': 'Goals, cards, fixed bills, calendar, passive income and photo entry.',
  'Tudo do Evolução + relatórios, saúde do patrimônio e app personalizável.': 'Everything in Growth + reports, wealth health and a customisable app.',
  'Tudo do Evolução + saúde do patrimônio, relatórios em PDF, app personalizável e atendimento prioritário.': 'Everything in Growth + wealth health, PDF reports, a customisable app and priority support.',
  'Tudo do Essencial + metas, objetivos, cartões, assinaturas, contas recorrentes, calendário, notas, calculadora de renda passiva e lançar por foto.': 'Everything in Essential + goals, tasks, cards, subscriptions, recurring bills, calendar, notes, the passive income calculator and photo entry.',
  'Assinaturas e contas recorrentes': 'Subscriptions and recurring bills', 'Relatórios semanais e mensais em PDF': 'Weekly and monthly PDF reports',
  'Lançar por foto e anexos': 'Photo entry and attachments', 'App personalizável': 'Customisable app', ', ilimitados': ', unlimited',
  'Ativo': 'Active', 'Inativo': 'Inactive', 'Pagamento pendente': 'Payment pending', 'Aguardando pagamento': 'Awaiting payment', 'Inativa': 'Inactive',
  'Assinatura paga': 'Paid subscription', 'Mudar de plano': 'Change plan', 'Mudar para este': 'Switch to this', 'Seu plano': 'Your plan',
  'Cancelar assinatura': 'Cancel subscription', 'Assinar o FinRossi': 'Subscribe to FinRossi', 'Cobrança': 'Billing', 'Anual · 20% off': 'Yearly · 20% off',
  'Continuar para o pagamento': 'Continue to payment', 'Preparando o pagamento…': 'Preparing your payment…', 'Falta só pagar': 'Just pay to finish',
  'Pagar agora': 'Pay now', 'Total': 'Total',
  // Configurações
  'Aparência': 'Appearance', 'Tema': 'Theme', 'Escuro': 'Dark', 'Claro': 'Light', 'Azul': 'Blue', 'Cores': 'Colours', 'Cor do app': 'App colour',
  'Dourado': 'Gold', 'Verde': 'Green', 'Vermelho': 'Red', 'Roxo': 'Purple', 'Lilás': 'Lilac', 'Teal': 'Teal', 'Âmbar': 'Amber', 'Efeitos': 'Effects',
  'Cursor neon': 'Neon cursor', 'Anel luminoso que acompanha o mouse': 'A glowing ring that follows the mouse', 'Padrão FinRossi': 'FinRossi default',
  'Usar Padrão FinRossi': 'Use FinRossi default', 'Escolha qualquer cor': 'Choose any colour', 'Escolher outra cor': 'Choose another colour',
  'Escolha uma cor abaixo e toque em "Salvar cor" para guardá-la aqui.': 'Choose a colour below and tap "Save colour" to keep it here.',
  'Pinta o fundo do app inteiro na cor escolhida. O dourado continua nos destaques; em cores claras, as letras ficam pretas.': 'Paints the whole app background in the chosen colour. Gold stays on highlights; on light colours, text turns black.',
  'Notificações': 'Notifications', 'Alertas de vencimento': 'Due date alerts', 'Avisos no celular, por e-mail e no painel': 'Alerts on your phone, by email and in the app',
  'Quando contas estiverem próximas': 'When bills are coming up', 'Nome de exibição': 'Display name', 'Seu nome': 'Your name', 'E-mail': 'Email', 'Email': 'Email',
  'Para alterar o email entre em contato com o suporte.': 'To change your email, contact support.', 'Toque na foto para trocar': 'Tap the photo to change it',
  'Meus dados financeiros': 'My financial data', 'Cada perfil tem suas próprias preferências de menu.': 'Each profile has its own menu preferences.',
  'As 4 telas da barra de baixo no celular. No computador, elas sobem para o topo do menu lateral.': 'The 4 screens in the bottom bar on your phone. On a computer, they move to the top of the side menu.',
  'Não suportado': 'Not supported', 'Bloqueado': 'Blocked', 'Desativado': 'Off', 'Idioma': 'Language', 'Português': 'Português', 'English': 'English',
  // Instalar o app (PWA)
  'Instalar o FinRossi': 'Install FinRossi', 'Instalar FinRossi': 'Install FinRossi', 'Instalar o app': 'Install the app', 'Instalar app': 'Install app',
  'Instalar aplicativo': 'Install app', 'Instalar agora': 'Install now', 'Abra direto da tela inicial, como um aplicativo': 'Open it straight from your home screen, like an app',
  'Abra o FinRossi direto da tela inicial': 'Open FinRossi straight from your home screen', 'Acesso rápido na tela inicial': 'Quick access from your home screen',
  'Adicionar à Tela de Início': 'Add to Home Screen', 'Adicionar à tela inicial': 'Add to home screen', 'No iPhone, são dois toques no Safari': 'On iPhone, it’s two taps in Safari',
  'na barra do Safari': 'in the Safari bar', 'Pelo menu do navegador, em dois toques': 'From the browser menu, in two taps', 'Toque no menu do navegador': 'Tap the browser menu',
  'Abrir no navegador': 'Open in browser', 'Para instalar, abra o app pelo endereço seguro': 'To install, open the app at the secure address',
  '. Pelo endereço de teste (sem o cadeado), os celulares não oferecem a instalação.': '. On the test address (without the padlock), phones don’t offer to install it.',
  'Você abriu o link dentro de outro app (Instagram, WhatsApp...), e por ali não dá para instalar. Toque no menu': 'You opened the link inside another app (Instagram, WhatsApp...), and it can’t be installed from there. Tap the menu',
  '— Safari no iPhone, Chrome no Android. Depois é só instalar por lá.': '— Safari on iPhone, Chrome on Android. Then install it from there.',
  '(os três pontos no canto)': '(the three dots in the corner)', 'Instalação cancelada.': 'Installation cancelled.', 'Não instalado': 'Not installed',
  // Login
  'Bem-vindo ao FinRossi': 'Welcome to FinRossi', 'Digite seu email e senha para acessar': 'Enter your email and password to log in', 'Senha': 'Password',
  'Esqueci minha senha': 'Forgot my password', 'Entrar na conta': 'Log in', 'Entrar com Google': 'Sign in with Google', 'Não tem conta?': 'Don’t have an account?',
  'Conheça os planos': 'See the plans', 'Redefinir senha': 'Reset password', 'Enviar link de redefinição': 'Send reset link', 'Voltar ao login': 'Back to login',
  'Digite seu email cadastrado e enviaremos um link para criar uma nova senha.': 'Enter your account email and we’ll send you a link to create a new password.',
  'Verificando...': 'Checking...', 'Verificando credenciais...': 'Checking your details...', 'Carregando...': 'Loading...', 'carregando...': 'loading...',
  'email@exemplo.com': 'email@example.com', 'seu@email.com': 'you@email.com', 'Aplicativo para construir sua riqueza': 'The app for building your wealth',
  'Controle financeiro pessoal simples e inteligente': 'Simple, smart personal finance', 'FinRossi, controle financeiro pessoal': 'FinRossi, personal finance',
  'FinRossi — Aplicativo para construir sua riqueza': 'FinRossi — The app for building your wealth', 'Precisa de ajuda?': 'Need help?',
  'Entre em contato com o suporte do FinRossi pelo WhatsApp ou e-mail.': 'Contact FinRossi support by WhatsApp or email.',
  'Ainda não tem conta? Conheça os planos e crie a sua →': 'Don’t have an account yet? See the plans and create yours →',
  // Manual (trechos)
  'Este manual explica cada funcionalidade do app. Navegue pelas seções abaixo para aprender a usar tudo. Se tiver dúvidas, entre em contato pelo suporte.': 'This guide explains every feature of the app. Browse the sections below to learn how to use everything. If you have questions, contact support.',
  'A tela principal do FinRossi. Mostra um resumo completo do mês selecionado.': 'FinRossi’s main screen. It shows a full summary of the selected month.',
  'Registre receitas e despesas': 'Record income and expenses', 'Como funciona': 'How it works', 'Funcionalidade': 'Feature', 'Conheça': 'Learn more',
  'O sistema verifica se já foi lançado — não vai duplicar': 'The app checks whether it’s already been added — no duplicates',
  'O total investido aparece no dashboard e nas metas automaticamente': 'The total invested shows on the dashboard and in your goals automatically',
  'O gráfico de distribuição mostra quanto está em cada tipo de investimento': 'The allocation chart shows how much is in each type of investment',
  'Cadastre cada posição com nome, valor, tipo e rentabilidade': 'Add each holding with its name, amount, type and return',
  'Crie notas com título, conteúdo, categoria e cor': 'Create notes with a title, content, category and colour',
  'Cada nota tem data e hora de criação automáticas': 'Each note gets its creation date and time automatically', 'Edite qualquer nota clicando no ícone de lápis': 'Edit any note by tapping the pencil icon',
  'A lista abaixo do calendário mostra todos os eventos do mês em ordem': 'The list below the calendar shows every event of the month in order',
  'Vermelho = vencido, Âmbar = vence hoje, Verde = futuro, Azul = receita': 'Red = overdue, Amber = due today, Green = upcoming, Blue = income',
  'calcula em quanto tempo você atinge cada meta': 'works out how long it will take to reach each goal', 'mostram receitas, despesas, saldo e total investido': 'show income, expenses, balance and total invested',
  'mostra a variação em relação ao mês anterior (▲ subiu, ▼ caiu)': 'shows the change from the previous month (▲ up, ▼ down)', 'mostram progresso de cada compra parcelada': 'show the progress of each instalment purchase',
  'para filtrar o dashboard inteiro': 'to filter the whole dashboard', 'para navegar entre meses': 'to move between months', 'para ver o gráfico de progresso': 'to see the progress chart',
  'para marcar como concluído': 'to mark as done', 'para encontrar notas rapidamente': 'to find notes quickly', 'para ver alertas quando estiver próximo': 'to get alerts when it’s close',
  'para criar todas as despesas do mês automaticamente': 'to create all of the month’s expenses automatically', 'no topo para navegar entre períodos': 'at the top to move between periods',
  'e mostram o nome do lançamento': 'and show the transaction name', 'dos seus investimentos e o IR': 'of your investments and the tax',
  'registre aportes em renda fixa, ações, CDB etc.': 'record contributions to fixed income, shares, term deposits, etc.',
  'salário, freelance, dividendos, vendas': 'salary, freelance work, dividends, sales', 'e defina nome, valor alvo e quanto já investiu': 'and set a name, target amount and how much you’ve already invested',
  'escolha a categoria e informe se é parcelado. O sistema divide automaticamente e lança cada parcela no mês correto': 'choose the category and say if it’s in instalments. The app splits it automatically and adds each instalment in the right month',
  'Clique em': 'Tap', 'Clique em qualquer': 'Tap any', 'Clique no': 'Tap the', 'Toque em': 'Tap', 'Use a': 'Use the', 'Use o': 'Use the', 'Defina a': 'Set the',
  'Informe a': 'Enter the', 'Informe o': 'Enter the', 'Abra o': 'Open', 'Selecione uma meta no': 'Choose a goal in the', 'Crie objetivos para': 'Create tasks for',
  'Todo mês clique em': 'Each month, tap', 'Atualize o valor investido clicando em': 'Update the amount invested by tapping', 'Cada conta mostra se já foi': 'Each bill shows whether it’s already been',
  'Dias com eventos têm um': 'Days with events have a', 'Despesas parceladas: informe o': 'Instalment expenses: enter the', 'ponto colorido': 'coloured dot',
  'quadradinho': 'checkbox', 'busca': 'search', 'cards de métricas': 'summary cards', 'filtro de mês': 'month filter', 'mês na tabela': 'month in the table',
  'clicando na flecha para ver o resumo de conclusões': 'by tapping the arrow to see a summary of what’s done', 'dia de vencimento': 'due date', 'ou': 'or', 'e o': 'and the',
  'e escolha': 'and choose', 'ou está': 'or is', 'ou no ícone de lápis': 'or the pencil icon', '— o sistema faz o restante': '— the app does the rest',
  '(Alta, Média, Baixa) para organizar melhor': '(High, Medium, Low) to stay organised', 'Hoje, Esta semana ou Este mês': 'Today, This week or This month',
  'não somam no total mensal': 'aren’t included in the monthly total', '(só você vê)': '(only you can see this)',
});

// ═══ App — mensagens (alertas, confirmações, avisos) ════════════════════════
I18N_EN_ADD({
  'Apagar todos os lançamentos deste perfil?': 'Delete all transactions in this profile?', 'As duas senhas não são iguais.': 'The two passwords don’t match.',
  'Atalhos voltaram ao padrão': 'Shortcuts reset to default', 'Cada posição precisa de uma tela diferente': 'Each position needs a different screen',
  'Dia inválido (1-31)': 'Invalid day (1–31)', 'Digite a renda mensal que você quer, por exemplo 8.000': 'Enter the monthly income you want, e.g. 8,000',
  'Digite seu email.': 'Enter your email.', 'Digite um nome válido.': 'Enter a valid name.', 'Email inválido — verifique o formato.': 'Invalid email — check the format.',
  'Escolha um arquivo de imagem.': 'Choose an image file.', 'Escreva algo antes de salvar': 'Write something before saving', 'Essa renda já está salva': 'That income is already saved',
  'Excluir este cartão?': 'Delete this card?', 'Excluir esta assinatura?': 'Delete this subscription?', 'Excluir esta meta?': 'Delete this goal?', 'Excluir esta nota?': 'Delete this note?',
  'Excluir este lançamento?': 'Delete this transaction?', 'Excluir este investimento?': 'Delete this investment?', 'Excluir esta conta?': 'Delete this bill?',
  'Habilitar nas configurações do navegador': 'Turn on in browser settings', 'Informe a descrição': 'Enter a description', 'Informe o nome': 'Enter a name',
  'Informe os 4 dígitos finais': 'Enter the last 4 digits', 'Lançamento não encontrado': 'Transaction not found', 'Valor inválido': 'Invalid amount', 'Valor alvo inválido': 'Invalid target amount',
  'Lido da foto. Confira os dados e toque em "Adicionar" para salvar.': 'Read from the photo. Check the details and tap "Add" to save.',
  'Nenhum dado para exportar.': 'Nothing to export.', 'Notificações bloqueadas. Acesse as configurações do navegador para permitir.': 'Notifications are blocked. Allow them in your browser settings.',
  'Não consegui abrir o anexo agora. Verifique a internet e tente de novo.': 'Couldn’t open the attachment. Check your internet connection and try again.',
  'Não consegui preparar a planilha. Verifique a internet e tente de novo.': 'Couldn’t prepare the spreadsheet. Check your internet connection and try again.',
  'Não deu para abrir esta imagem. Tente outra (JPG ou PNG).': 'Couldn’t open this image. Try another one (JPG or PNG).',
  'Não deu para salvar agora. Tente de novo.': 'Couldn’t save right now. Please try again.', 'Selecione ao menos uma opção.': 'Choose at least one option.',
  'Todos os lançamentos deste mês já foram gerados': 'All of this month’s transactions have already been created',
  'Toque em "Permitir" para o FinRossi usar a câmera.': 'Tap "Allow" so FinRossi can use the camera.', '✓ Preferências salvas!': '✓ Preferences saved!',
  'Código copiado ✓': 'Code copied ✓', 'Notificações ativadas! Você será avisado sobre vencimentos.': 'Notifications are on! You’ll be alerted about due dates.',
  'FinRossi: vencimento próximo': 'FinRossi: payment due soon', 'Este navegador não suporta notificações. Instale o app para receber alertas.': 'This browser doesn’t support notifications. Install the app to get alerts.',
  'No iPhone, as notificações funcionam com o FinRossi instalado: toque em Compartilhar → "Adicionar à Tela de Início" e abra o app por lá.': 'On iPhone, notifications work once FinRossi is installed: tap Share → "Add to Home Screen" and open the app from there.',
  'Ainda não sei responder isso. Vou passar sua pergunta para a equipe do FinRossi.': 'I can’t answer that yet. I’ll pass your question on to the FinRossi team.',
  'Não foi possível concluir agora. Tente de novo em instantes.': 'Couldn’t finish right now. Please try again shortly.',
  'Não foi possível falar com o servidor. Ele pode estar fora do ar.': 'Couldn’t reach the server. It may be down.',
  'O servidor demorou para responder. Tente de novo em instantes.': 'The server took too long to respond. Please try again shortly.',
  'Entre na sua conta para continuar.': 'Log in to continue.',
  // Restos visíveis ao cliente (1ª conferência em inglês)
  '* Fórmula: Patrimônio = Renda ÷ (taxa × (1 − IR%)). Já desconta o imposto de renda.': '* Formula: Wealth = Income ÷ (rate × (1 − tax%)). Tax on returns is already taken into account.',
  '/mês': '/month', '/ano': '/year', 'Ainda não temos': 'We don’t have', 'As': 'The', 'Os': 'The', 'Até': 'Until', 'De': 'From',
  'Cenário 1 (CDI)': 'Scenario 1 (cash rate)', 'Cenário 1: CDI atual (': 'Scenario 1: current cash rate (', 'Cenário 2 (sua taxa)': 'Scenario 2 (your rate)',
  'Cenário 2: sua taxa (': 'Scenario 2: your rate (', 'Registre todas as movimentações financeiras em 3 abas.': 'Record every financial movement across 3 tabs.',
  'Nome': 'Name', 'Um emoji, se quiser': 'An emoji, if you like', 'Ícone (opcional)': 'Icon (optional)', 'Teste (sem cobrança)': 'Trial (no charge)',
}, [
  // Textos com números e valores
  [/^(\d+) de (\d+) concluídos$/, '$1 of $2 done'],
  [/^(\d+) ativas$/, '$1 active'],
  [/^(\d+) ativos$/, '$1 active'],
  [/^(\d+)a (\d+)m$/, '$1y $2m'],
  [/^Falta acumular (.+), você tem (\d+)%$/, '$1 still to go — you have $2%'],
  [/^Você tem (\d+)% do necessário$/, 'You have $1% of what you need'],
  [/^Renda de (.+) por mês$/, 'Income of $1 per month'],
  [/^Remover renda de (.+)$/, 'Remove income of $1'],
  [/^(.+) por mês$/, '$1 per month'],
  [/^(.+) \(atual\)$/, '$1 (current)'],
  [/^Em (\d+) dias$/, 'In $1 days'],
  [/^Cobra em (\d+) dias?$/, 'Charges in $1 day(s)'],
  [/^Cobra hoje$/, 'Charges today'],
  [/^Faltam (\d+) dias? do período de teste\.$/, '$1 day(s) left in your free trial.'],
  [/^Gratuito \((\d+) dias\)$/, 'Free ($1 days)'],
  [/^Últimos (\d+) meses$/, 'Last $1 months'],
  [/^(\d+) lançamento\(s\) gerado\(s\) com sucesso!$/, '$1 transaction(s) created!'],
  [/^(\d+) parcelas de (.+) adicionadas!$/, '$1 instalments of $2 added!'],
  [/^Senha incorreta \((\d+) de 5\)\.$/, 'Wrong password ($1 of 5).'],
  [/^Muitas tentativas\. Tente de novo em (\d+) min\.$/, 'Too many attempts. Try again in $1 min.'],
  [/^Você pode salvar até (\d+) rendas\. Remova uma para incluir outra\.$/, 'You can save up to $1 incomes. Remove one to add another.'],
  [/^(.+) vence hoje$/, '$1 is due today'],
  [/^(.+) vence amanhã \(dia (\d+)\)$/, '$1 is due tomorrow (day $2)'],
  [/^Número final \((\d+) dígitos\)$/, 'Last $1 digits'],
  [/^Data 1ª parcela$/, 'First instalment date'],
  [/^Informe nome, banco, 4 dígitos finais, limite e dia de vencimento\.$/, 'Enter the name, bank, last 4 digits, limit and due day.'],
  [/^(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro) de (\d{4})$/i, function(m, mes, ano){ return I18N_MESES_EN[mes.toLowerCase()] + ' ' + ano; }],
]);
var I18N_MESES_EN = { janeiro:'January', fevereiro:'February', 'março':'March', abril:'April', maio:'May', junho:'June', julho:'July', agosto:'August', setembro:'September', outubro:'October', novembro:'November', dezembro:'December' };

// ═══ Landing (finrossi.com.br) ═════════════════════════════════════════════
// Pagamento e dúvidas adaptados à Austrália (sem Pix, boleto, CPF ou Asaas, que são do Brasil)
I18N_EN_ADD({
  'FinRossi — início': 'FinRossi — home', 'Tela do app FinRossi': 'FinRossi app screen', 'Início': 'Home', 'Planos': 'Plans', 'Dúvidas': 'FAQ',
  'O app': 'The app', 'Como funciona': 'How it works', 'Acessar o FinRossi →': 'Open FinRossi →', 'Já tenho conta': 'I already have an account',
  'Seu dinheiro,': 'Your money,', 'finalmente organizado.': 'finally organised.', 'Testar grátis': 'Try it free', 'Começar grátis': 'Start free',
  'Criar conta grátis': 'Create a free account', 'Gratuito para começar. Sem cartão de crédito.': 'Free to start. No credit card needed.',
  'Controle suas receitas, despesas, investimentos e metas em um só lugar. Simples, inteligente e acessível.': 'Track your income, expenses, investments and goals in one place. Simple, smart and affordable.',
  'Controle financeiro pessoal simples e inteligente. Receitas, despesas, investimentos e metas — tudo em um só lugar, no celular e no computador.': 'Simple, smart personal finance. Income, expenses, investments and goals — all in one place, on your phone and computer.',
  'Controle financeiro pessoal': 'Personal finance', '— Controle financeiro pessoal simples e inteligente': '— Simple, smart personal finance',
  // Telinha do app (exemplo)
  'Saldo do mês': 'Balance this month', 'Patrimônio líquido': 'Net worth', '↑ 4,2% no mês': '↑ 4.2% this month', 'R$ 31.400': '$31,400', 'R$ 48.320': '$48,320',
  'R$ 6.800': '$6,800', 'R$ 900': '$900', 'R$ 900,00': '$900.00', 'R$ 100,00': '$100.00', 'R$ 99,00': '$99.00', 'R$ 21,90': '$21.90', 'R$ 44,90': '$44.90',
  'R$ 2.879,60': '$2,879.60', '+ R$ 5.000,00': '+ $5,000.00', '− R$ 1.500,00': '− $1,500.00', '− R$ 620,40': '− $620.40', 'de R$ 20.000': 'of $20,000',
  'R$0 para começar': 'Free to start', 'Mercado': 'Groceries', 'Aluguel': 'Rent', 'Aluguel,': 'Rent,', 'Academia': 'Gym', 'Netflix': 'Netflix', 'Spotify': 'Spotify',
  'Aluguel, todo dia 25': 'Rent, every 25th', 'Internet, todo dia 20': 'Internet, every 20th', 'Vence em 3 dias': 'Due in 3 days',
  'Meta: viagem para a Europa': 'Goal: trip to Europe', 'Viagem Europa': 'Europe trip', 'Reserva emergência': 'Emergency fund',
  // Recursos
  'Simples de usar,': 'Simple to use,', 'poderoso nos dados.': 'powerful with your data.',
  'Do lançamento diário até o planejamento de longo prazo — simples o suficiente para usar todo dia.': 'From daily entries to long-term planning — simple enough to use every day.',
  'Lance entradas e saídas rapidamente. Categorize, filtre por mês e veja exatamente para onde vai seu dinheiro.': 'Record money in and out quickly. Categorise, filter by month and see exactly where your money goes.',
  'Visualize sua evolução mensal, gastos por categoria e saldo em gráficos claros e modernos.': 'See your monthly progress, spending by category and balance in clear, modern charts.',
  'Registre seus investimentos em renda fixa e variável. Acompanhe o total investido e a distribuição da carteira.': 'Record your investments, from term deposits to shares. Track your total invested and how your portfolio is spread.',
  'Defina metas com valor alvo e acompanhe o progresso. Simule quanto tempo falta para atingir cada objetivo.': 'Set goals with a target amount and track your progress. See how long it will take to reach each one.',
  'Crie objetivos diários, semanais e mensais. Marque como concluído e acompanhe sua produtividade financeira.': 'Create daily, weekly and monthly tasks. Tick them off and keep your finances on track.',
  'Controle Netflix, Spotify, academia e todos os serviços mensais. Saiba exatamente quanto gasta por mês.': 'Keep track of Netflix, Spotify, the gym and every monthly service. Know exactly what you spend each month.',
  'Cadastre aluguel, luz, internet uma vez. O sistema gera os lançamentos automaticamente todo mês.': 'Add rent, power and internet once. The app records them for you every month.',
  'Veja todos os seus vencimentos no calendário. Nunca mais esqueça uma conta — tudo organizado por data.': 'See every due date on the calendar. Never forget a bill again — everything organised by date.',
  'Um bloco de notas integrado para anotar ideias, lembretes e decisões financeiras importantes.': 'A built-in notepad for ideas, reminders and important money decisions.',
  'Gráficos e relatórios': 'Charts and reports', 'Metas financeiras': 'Financial goals', 'Objetivos diários e mensais': 'Daily and monthly tasks',
  'Contas recorrentes': 'Recurring bills', 'Calendário de vencimentos': 'Due date calendar', 'Notas e anotações': 'Notes',
  'Acompanhe a evolução': 'Track your progress', 'Comece em menos': 'Get started in less', 'de 5 minutos.': 'than 5 minutes.',
  'Crie sua conta': 'Create your account', 'Email e senha. Acessa pelo celular, notebook ou tablet — sempre sincronizado.': 'Email and password. Use it on your phone, laptop or tablet — always in sync.',
  'Lance seus primeiros dados': 'Add your first entries', 'Receitas, despesas e investimentos em poucos cliques. Interface simples e rápida.': 'Income, expenses and investments in a few taps. Simple and fast.',
  'Veja gráficos, metas e calendário de vencimentos. Tudo atualizado em tempo real.': 'See charts, goals and your due date calendar. Everything updates in real time.',
  'Sem complicação. Sem planilha. Sem instalação.': 'No fuss. No spreadsheets. No installing.', 'Online — celular e notebook': 'Online — phone and laptop',
  // Planos
  'Escolha o plano': 'Choose the plan', 'ideal para você.': 'that suits you.', 'Escolha seu plano': 'Choose your plan', 'Planos disponíveis': 'Available plans',
  'Gratuito para experimentar ou assine direto o plano que faz sentido para você.': 'Try it free, or go straight to the plan that suits you.',
  'Comece grátis. Faça upgrade quando quiser. Cancele a qualquer momento.': 'Start free. Upgrade whenever you like. Cancel anytime.',
  'Para experimentar': 'To try it out', 'Para começar': 'To get started', 'Mais popular': 'Most popular', 'Premium': 'Premium',
  '30 dias para conhecer a plataforma.': '30 days to explore the platform.', 'Controle básico do dia a dia.': 'Everyday basics.',
  'Controle financeiro completo, do seu jeito.': 'Complete money management, your way.', 'O FinRossi completo, com relatórios e a saúde do seu patrimônio.': 'The complete FinRossi, with reports and your wealth health.',
  'Até 20 lançamentos': 'Up to 20 transactions', 'Gráfico básico': 'Basic chart', 'Lançamentos ilimitados': 'Unlimited transactions', 'Gráficos completos': 'Full charts',
  'Investimentos simples': 'Simple investments', 'Tudo do Essencial': 'Everything in Essential', 'Tudo do Evolução': 'Everything in Growth',
  'Metas de investimento': 'Investment goals', 'Assinaturas e recorrentes': 'Subscriptions and recurring bills', 'Calendário e recorrentes': 'Calendar and recurring bills',
  'Calculadora renda passiva': 'Passive income calculator', 'Relatórios semanais e mensais': 'Weekly and monthly reports', 'Lançar por foto, com anexos': 'Photo entry, with attachments',
  'App personalizável, do seu jeito': 'An app you can customise', 'Suporte prioritário': 'Priority support', 'Suporte': 'Support', 'Cancele quando quiser': 'Cancel anytime',
  'Sem cartão de crédito': 'No credit card', 'Anual': 'Yearly', 'Mensal': 'Monthly', 'Assinar Essencial': 'Get Essential', 'Assinar Evolução': 'Get Growth',
  'Assinar Patrimônio': 'Get Wealth', 'Plano selecionado': 'Selected plan', 'Plano:': 'Plan:', 'Plano ativado:': 'Plan activated:',
  'Gratuito — 30 dias grátis': 'Free — 30-day free trial', 'Os planos pagos em A$ chegam em breve. Comece pelo teste grátis.': 'Paid plans in AUD are coming soon. Start with the free trial.',
  'Pagamento por cartão, boleto ou Pix. Cancele quando quiser, sem fidelidade.': 'Paid plans billed securely in AUD. Cancel anytime, no lock-in contract.',
  // Dúvidas
  'Perguntas': 'Frequently asked', 'frequentes.': 'questions.', 'Funciona no celular e no computador?': 'Does it work on my phone and computer?',
  'Sim! O FinRossi funciona em qualquer dispositivo com navegador. Você pode instalar como app no celular Android e iPhone, e acessar pelo computador pelo mesmo link. Os dados ficam sincronizados automaticamente.': 'Yes! FinRossi works on any device with a web browser. You can install it as an app on Android and iPhone, and use it on your computer from the same link. Your data syncs automatically.',
  'Meus dados ficam seguros?': 'Is my data safe?',
  'Sim. Os dados ficam armazenados de forma segura no Firebase (Google). Cada usuário acessa somente seus próprios dados, e a equipe do FinRossi não acessa as suas informações financeiras.': 'Yes. Your data is stored securely on Google Firebase. Each user can only access their own data, and the FinRossi team doesn’t access your financial information.',
  'O que muda entre o Essencial e o Evolução?': 'What’s the difference between Essential and Growth?',
  'O Essencial tem o básico: lançamentos ilimitados, gráficos e investimentos simples. O Evolução inclui tudo isso mais metas, objetivos, calendário financeiro, controle de assinaturas, contas recorrentes, a calculadora de renda passiva e o lançamento por foto. As notas estão em todos os planos.': 'Essential covers the basics: unlimited transactions, charts and simple investments. Growth includes all of that plus goals, tasks, a financial calendar, subscription tracking, recurring bills, the passive income calculator and photo entry. Notes are included in every plan.',
  'Como funciona o plano Patrimônio?': 'How does the Wealth plan work?',
  'O Patrimônio é o plano completo do FinRossi: tudo do Evolução mais a saúde do patrimônio, relatórios semanais e mensais em PDF, app personalizável do seu jeito e atendimento prioritário. O FinRossi é uma ferramenta de organização financeira: não presta consultoria nem recomenda investimentos.': 'Wealth is the complete FinRossi plan: everything in Growth plus wealth health, weekly and monthly PDF reports, a customisable app and priority support. FinRossi is a money organisation tool: it doesn’t provide financial advice or recommend investments.',
  'Como é feito o pagamento?': 'How does payment work?',
  'Via cartão de crédito ou boleto no plano mensal, e Pix no plano anual — tudo processado pelo Asaas. Seguro, rápido e sem dados do cartão armazenados no sistema.': 'Paid plans are billed in AUD by card through a secure payment partner. Your card details are never stored by FinRossi. Paid plans in Australia are coming soon — start with the free trial today.',
  'Posso cancelar quando quiser?': 'Can I cancel anytime?',
  'Sim, sem burocracia. Peça o cancelamento quando quiser pelo próprio app, em Minha Assinatura. Você continua com acesso até o fim do período pago.': 'Yes, no hassle. Cancel whenever you like in the app, under My subscription. You keep access until the end of the period you’ve paid for.',
  // Cadastro
  'Criar conta': 'Create account', 'Nome completo': 'Full name', 'Seu nome': 'Your name', 'Senha': 'Password', 'Mínimo 6 caracteres': 'At least 6 characters',
  'WhatsApp': 'Mobile', 'Quero receber dicas, lembretes e ofertas do FinRossi por e-mail e WhatsApp. Posso cancelar quando quiser.': 'I’d like tips, reminders and offers from FinRossi by email and SMS. I can opt out anytime.',
  'Ao criar sua conta você concorda com nossos': 'By creating an account you agree to our', 'termos de uso': 'terms of use', 'e': 'and', 'política de privacidade': 'privacy policy',
  'Conta criada!': 'Account created!', 'Criando conta...': 'Creating account...', 'Preencha todos os campos.': 'Please fill in all fields.',
  'A senha deve ter pelo menos 6 caracteres.': 'Your password must be at least 6 characters.', 'Celular inválido — ex.: 0412 345 678.': 'Invalid mobile number — e.g. 0412 345 678.',
  'Email já cadastrado': 'This email already has an account', 'Informe seu nome.': 'Enter your name.', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.': 'Too many attempts. Wait a few minutes and try again.',
  'Os planos pagos em A$ chegam em breve. Comece pelo teste grátis': 'Paid plans in AUD are coming soon. Start with the free trial',
  // Rodapé
  'Política de Privacidade': 'Privacy Policy', 'Termos de Uso': 'Terms of Use', 'Contrato SaaS': 'Subscription agreement', 'LGPD': 'Data protection (Brazil)',
  'Cookies': 'Cookies', '© 2026 FinRossi. Todos os direitos reservados.': '© 2026 FinRossi. All rights reserved.',
  'Comece a controlar': 'Start managing', 'seu dinheiro hoje.': 'your money today.', 'Pagar agora →': 'Pay now →',
}, [
  // Mês abreviado (Out/26 → Oct/26)
  [/^(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\/(\d{2})$/, function(m, mes, ano){ return { Jan:'Jan', Fev:'Feb', Mar:'Mar', Abr:'Apr', Mai:'May', Jun:'Jun', Jul:'Jul', Ago:'Aug', Set:'Sep', Out:'Oct', Nov:'Nov', Dez:'Dec' }[mes] + '/' + ano; }],
]);
