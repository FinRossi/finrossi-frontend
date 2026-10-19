# FinRossi — Frontend

Site e app publicados em **finrossi.com.br** (GitHub Pages, sem etapa de build).

## Estrutura

```
index.html                  App (HTML das telas + tags que carregam CSS/JS)
404.html                    Página "não encontrada" + redireciona endereços antigos (/landing.html, /legal/...)
favicon.ico                 Fica na raiz: navegadores e Google procuram aqui
img/                        Ícones e imagens (favicons, ícones do PWA/notificações)
landing/index.html          Página de vendas / planos  → finrossi.com.br/landing/
landing/legal/              Termos, privacidade, LGPD, cookies, contrato
css/                        Estilos do app (01 → 04, a ordem afeta a cascata)
js/firebase-init.js         Conexão com Firebase + login automático (module)
js/app/                     Código usado por todos os planos
acessos/                    Acessos da equipe (Master, Sócio, Admin, Dev): perfis, Clientes, Sócios, preview, Ver como
planos/                     Somente planos dos CLIENTES
planos/18-regras-planos.js  PLANOS_CONFIG — o que cada plano libera
planos/essencial/           Investimentos
planos/evolucao/            Metas, objetivos, recorrentes, calendário, notas, assinaturas, cartões
planos/patrimonio/          Renda passiva + patrimonio.js (score, insights, desafios, projeções, personalização)
sw.js / manifest.json       PWA
```

## Regras para não quebrar

1. **O número no nome do arquivo é a ordem de carregamento** (01 → 33), mesmo entre pastas diferentes.
   O `index.html` carrega na mesma ordem. Ao criar um arquivo novo, encaixe o número e a tag `<script>` na posição certa.
2. Todos os arquivos de `js/app/` e `planos/` são scripts comuns (não-module) e compartilham o mesmo escopo global —
   funções chamadas pelo HTML (`onclick="..."`) precisam continuar globais.
3. Código que roda **na hora** (fora de função ou evento) só pode usar o que foi declarado em arquivos de número **menor**.
   A inicialização fica em `js/app/33-pwa-init.js`, por isso ele é o último.
4. Separar por pasta é organização: quem bloqueia acesso é `PLANOS_CONFIG` + `verComoPlanoPermite()` (`acessos/27-ver-como.js`).
   Acessos de equipe: só o **Master** (o dono) cria/altera — conferido também no servidor.
5. Ao alterar um CSS/JS, aumente o `?v=` da tag no `index.html` para os navegadores baixarem a versão nova.
6. O `sw.js` guarda no aparelho, na instalação, tudo que o `index.html` carrega (lê as tags sozinho — não há lista para manter).
   Ao mudar o próprio `sw.js`, aumente o `CACHE_NAME`. A versão nova não recarrega o app no meio do uso:
   aparece o aviso "Nova versão" (ou troca sozinha se o app acabou de abrir).
