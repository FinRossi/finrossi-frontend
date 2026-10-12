// js/app/12-manual.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── MANUAL DE USO ────────────────────────────────────────────────────────────
const MANUAL_SECTIONS=[
  {icon:'📊',titulo:'Dashboard',cor:'var(--green)',desc:'A tela principal do FinRossi. Mostra um resumo completo do mês selecionado.',itens:[
    'Use o <strong>filtro de mês</strong> no topo para navegar entre períodos',
    'Os <strong>cards de métricas</strong> mostram receitas, despesas, saldo e total investido',
    'O <strong>comparativo</strong> mostra a variação em relação ao mês anterior (▲ subiu, ▼ caiu)',
    'As <strong>parcelas em andamento</strong> mostram progresso de cada compra parcelada',
    'Clique em qualquer <strong>mês na tabela</strong> para filtrar o dashboard inteiro'
  ]},
  {icon:'💰',titulo:'Lançamentos',cor:'var(--blue)',desc:'Registre todas as movimentações financeiras em 3 abas.',itens:[
    '<strong>Receita:</strong> salário, freelance, dividendos, vendas',
    '<strong>Despesa:</strong> escolha a categoria e informe se é parcelado. O sistema divide automaticamente e lança cada parcela no mês correto',
    '<strong>Investimento:</strong> registre aportes em renda fixa, ações, CDB etc.',
    'Despesas parceladas: informe o <strong>valor total</strong> e o <strong>nº de parcelas</strong> — o sistema faz o restante'
  ]},
  {icon:'📈',titulo:'Investimentos',cor:'var(--blue)',desc:'Acompanhe sua carteira de investimentos.',itens:[
    'Cadastre cada posição com nome, valor, tipo e rentabilidade',
    'O gráfico de distribuição mostra quanto está em cada tipo de investimento',
    'O total investido aparece no dashboard e nas metas automaticamente'
  ]},
  {icon:'🎯',titulo:'Metas',cor:'var(--purple)',desc:'Defina objetivos financeiros e acompanhe o progresso.',itens:[
    'Clique em <strong>"+ Nova meta"</strong> e defina nome, valor alvo e quanto já investiu',
    'Atualize o valor investido clicando em <strong>"atualizar saldo"</strong> ou no ✏',
    'A <strong>simulação de aportes</strong> calcula em quanto tempo você atinge cada meta',
    'Selecione uma meta no <strong>Dashboard</strong> para ver o gráfico de progresso'
  ]},
  {icon:'✅',titulo:'Objetivos',cor:'var(--amber)',desc:'Organize suas tarefas financeiras por período.',itens:[
    'Crie objetivos para <strong>Hoje, Esta semana ou Este mês</strong>',
    'Defina a <strong>prioridade</strong> (Alta, Média, Baixa) para organizar melhor',
    'Clique no <strong>quadradinho</strong> para marcar como concluído',
    'Abra o <strong>Dashboard</strong> clicando na flecha para ver o resumo de conclusões'
  ]},
  {icon:'📦',titulo:'Assinaturas',cor:'var(--purple)',desc:'Controle todos os serviços que você paga mensalmente.',itens:[
    'Cadastre Netflix, Spotify, academia, softwares — tudo em um lugar',
    'Informe o <strong>dia de vencimento</strong> para ver alertas quando estiver próximo',
    'Assinaturas <strong>pausadas</strong> não somam no total mensal',
    'Veja o total mensal e anual de assinaturas nos cards de métricas'
  ]},
  {icon:'🔄',titulo:'Contas Recorrentes',cor:'var(--teal)',desc:'Cadastre contas fixas e gere os lançamentos automaticamente.',itens:[
    'Cadastre aluguel, luz, água, internet uma única vez',
    'Todo mês clique em <strong>"Gerar lançamentos"</strong> para criar todas as despesas do mês automaticamente',
    'O sistema verifica se já foi lançado — não vai duplicar',
    'Cada conta mostra se já foi <strong>lançada</strong> ou está <strong>pendente</strong> no mês atual'
  ]},
  {icon:'📅',titulo:'Calendário Financeiro',cor:'var(--green)',desc:'Visualize todos os seus vencimentos no calendário.',itens:[
    'Vermelho = vencido, Âmbar = vence hoje, Verde = futuro, Azul = receita',
    'Clique em <strong>‹ ›</strong> para navegar entre meses',
    'Dias com eventos têm um <strong>ponto colorido</strong> e mostram o nome do lançamento',
    'A lista abaixo do calendário mostra todos os eventos do mês em ordem'
  ]},
  {icon:'📝',titulo:'Notas',cor:'var(--amber)',desc:'Um bloco de anotações integrado ao seu perfil.',itens:[
    'Crie notas com título, conteúdo, categoria e cor',
    'Use a <strong>busca</strong> para encontrar notas rapidamente',
    'Cada nota tem data e hora de criação automáticas',
    'Edite qualquer nota clicando no ✏'
  ]},
  {icon:'💵',titulo:'Renda Passiva',cor:'var(--green)',desc:'Calcule quanto precisa investir para viver de renda. (Disponível no perfil Pessoal)',itens:[
    'Informe a <strong>taxa mensal</strong> dos seus investimentos e o IR',
    'Veja quanto patrimônio precisa para gerar R$5k, R$10k ou R$120k por mês',
    'Compare dois cenários de taxa lado a lado',
    'A simulação mostra o prazo com o seu aporte mensal atual'
  ]},
];

