# Objetivos do Estúdio: um sistema só, conferido no servidor (18/10/2026)

Decisão da dona (conversa de 17 e 18/10/2026): a "Atividade (auto-correção)" do bloco Estúdio e os
"objetivos da parte" eram duas ferramentas para a mesma ideia, cada uma num lugar, com regras e
botões próprios. A atividade nunca foi usada (zero manifestos, e a autora confirmou) porque era
confusa. As duas viram UM conceito, **Objetivos**, cadastrado na parte e conferido sempre pelo
servidor, também em projetos de código e no modo Pro. Regravar o que for preciso está liberado.

## A regra de onde usar

Cada parte com Estúdio tem uma lista de Objetivos. Por objetivo a autora decide só duas coisas:

1. **Como conferir** (o tipo, abaixo).
2. **Obrigatório para seguir** ou **extra** (um desafio a mais: não trava, dá XP uma vez).

| Tipo | `rule.type` | Onde funciona | Quem confere |
|---|---|---|---|
| Usar um bloco | `usesBlock` | Blocos e Ponte | servidor, estrutura (na hora) |
| Usar uma ideia de programação | `usesLoop`, `declaresVariable`, `definesFunction`, `callsFunction` | Blocos, Ponte e Pro | servidor, estrutura dos blocos OU do código (na hora) |
| O jogo faz algo | `behavior` | Blocos, Ponte e Pro (não 3D clássico) | executor (rodando o jogo) |
| A função responde certo | `functionReturns` | Ponte e Pro | executor |
| Regra em JavaScript | `script` | Ponte e Pro | executor |

Um botão só para a criança: **Verificar esta parte**, embaixo do Estúdio, antes do envio. O painel
"Objetivo do projeto" de dentro do editor, a nota de 0 a 100 e os pesos saem.

## Modelo (core, `learning/section-progression.ts`)

`SectionProjectCheck = { id, label, rule, hint?, optional? }`, `rule` = estrutura (os 5 de sempre)
ou execução (`behavior`, `functionReturns`, `script`). Limites: 20 objetivos, rótulo e dica até 200
e 300 caracteres. A criança recebe só a VISTA (`ProjectObjectiveView = { id, label, hint?,
optional?, kind }`): a regra (e as respostas esperadas) nunca sai do members.

- A parte fecha quando todos os OBRIGATÓRIOS passam numa mesma verificação (`projectPassed`,
  pegajoso dentro da revisão, como hoje). Extras nunca trancam. Parte só com extras não tem
  critério (a publicação acusa).
- O último resultado por objetivo fica em `lesson_section_progress.objective_results` (por
  revisão) e volta na leitura do progresso: a lista se lembra ao reabrir a fase.
- Na tela, mudar o projeto depois de verificar marca o resultado como "de antes da mudança".

## Execução (etapa 3)

O members chama o `studio-runtime` (Cloudflare, contêiner sem internet com Chromium) na rota nova
`POST /v1/check`:

- **Pro**: a árvore do projeto com o `templateId` do bloco AUTORADO (nunca do cliente), compilada
  pelo Vite de sempre; função exportada é alcançada por uma entrada de teste que o runtime gera.
- **Clássico**: o members monta o documento de prévia (`@sistemazero/studio/server-preview`) e o
  runtime o serve como a página do jogo. Extensões 3D clássicas usam importações externas e o
  contêiner não tem internet: "O jogo faz algo" não vale nelas (a autoria avisa).
- Cada objetivo de execução roda numa página nova: passos (segurar/tocar tecla, clicar, esperar) e
  uma expectativa (variável, sprite, texto, console, estado do kit Pro). Resultado por objetivo e
  uma captura da tela final para a equipe.
- Executor fora do ar: "Não consegui testar o seu jogo agora. Tente de novo." Nunca aprova por
  falha. Sem mudança no projeto, o resultado é reaproveitado.
- Implementado (etapa 3): a variável do jogo clássico é lida por um leitor injetado no
  `script.js` (`@sistemazero/studio/server-check`), porque o jogo de blocos guarda tudo dentro da
  função da partida; os kits Pro recebem o clique em "Começar" antes dos passos. O members usa
  `STUDIO_PRO_RUNTIME_URL`/`STUDIO_PRO_RUNTIME_TOKEN` (os nomes do Kids e do Admin). Decisão: a
  publicação EXIGE o gabarito, mas não roda o executor (publicar não fica refém de um contêiner
  externo); quem confere o gabarito rodando é o "Testar agora", que mostra o motivo e a tela final.
- Review da etapa 3 (corrigido): a página do jogo é da criança, então ela nunca recebe a resposta
  esperada (só os argumentos das funções) e o leitor de variáveis é congelado; marcadores do
  navegador (`undefined`, `NaN`, valor grande demais) não aprovam; "mudou" exige a leitura do
  começo; página que não abre, Vite que estoura o tempo ou prazo curto viram falha do executor
  (424, nada guardado), nunca "não passou"; o prazo conta do começo do pedido e a parte tem um teto
  de 40 s somados de esperas; a captura só sai no "Testar agora".

## Etapa 4 (implementada)

- **Regra em JavaScript** (`script`): passos e o corpo de uma função que devolve `true` (pode usar
  `await`; 3 s de prazo, que contam no teto da parte). Roda num mundo isolado do navegador sobre uma
  FOTO do jogo depois dos passos: `jogo` são as variáveis no clássico e o estado do kit no Pro (vazio
  no Pro sem kit), mais `texto` e `console` (uma lista). Só na Ponte e no Pro (decisão da tabela
  acima); a autoria confere a escrita sem rodar. Review da etapa 4: o jogo não forja o veredito
  trocando `eval`, `then` ou protótipos (provado no Chromium).
- **Modelos** no Admin ("Começar de um modelo"), oferecidos só onde a autoria do bloco os aceita
  (3D clássico, paleta restrita, Pro com ou sem kit), e **sugestões do kit Pro**: mudar a meta
  (`game.goal`, lida do `src/config.ts`, com uma meta nova que cabe em cada kit), o jogo continua
  começando (extra) e mais vida no kit que a mostra (`kitStateFields`). O "Testar agora" prova o
  modelo ajustado.
- **Copiar e Colar** objetivos entre partes e aulas (JSON com marcador de formato; ids novos ao
  colar; o que não cabe vira frase).
- **Manifesto**: o bloco Estúdio aceita `solutionProject` com a régua do `initialProject`. No modo
  de preservar, reimportar sem gabarito NÃO apaga o que a professora fez no Admin (o que traz
  gabarito, manda); a substituição o tira. A prévia avisa nos dois casos (e quando o projeto inicial
  mudou e o gabarito antigo ficou). A publicação do rascunho confere o gabarito como o inicial.

## Gabarito da professora

`content.solutionProject` no bloco Estúdio (nunca sai para a criança). "Testar agora" roda os
objetivos contra o projeto inicial (deve falhar; passando, a autoria avisa) e contra o gabarito
(deve passar; não passando, a publicação recusa). Com objetivos de execução, o gabarito é
obrigatório para publicar.

## XP

- Obrigatórios da parte cumpridos pela primeira vez: `studio_passed` uma vez por bloco Estúdio (o
  mesmo prêmio que a atividade dava; mantém as conquistas do Estúdio alcançáveis).
- Extra cumprido pela primeira vez: `objective_extra`, 5 XP, sem moedas, uma vez por objetivo.

## O que sai

`content.activity` do bloco (tipos, DTO, validação, nota, pesos), o painel do Estúdio, o
executor no navegador (página escondida, script de checagens), o `STUDIO_GATE_NOT_PASSED` e a nota
nas telas da equipe. As colunas `score/results/checked_at/passed_at` de `studio_submissions` ficam
no banco (dados antigos), mas nada mais as escreve.

## Etapas

1. Base: modelo, vista da criança, cartão novo, memória, editor novo, gabarito e "Testar agora"
   (estrutura), retirada da atividade de bloco, XP. Review.
2. Código: as ideias de programação no código-fonte (clássico e Pro), no servidor. Review.
3. Executor: `/v1/check`, "O jogo faz algo" e "A função responde certo". Review.
4. Regra em JavaScript, modelos, sugestões dos kits Pro, Copiar e Colar, manifesto. Review.
5. Diretrizes, especificação do manifesto, roteiros e prints; full review final.

## Full review final (18/10/2026)

Sem achado grave. Corrigidos:

- O "Testar agora" mostra o motivo quando o executor recusa o projeto (400/413 viram problema
  "No gabarito: …"), em vez de "tente de novo".
- Parte só com desafios extras: o cartão diz que nada falta (`verificacao.soExtras`), não "ainda
  falta um objetivo" (o servidor responde `passed: false` porque não há obrigatório).
- O "Testar agora" do gabarito manda também o projeto inicial: o servidor recusa gabarito de outro
  tipo ou de outro modelo Pro, e as ideias de código contam só o que mudou desde o inicial.
- A criança com projeto recusado pelo executor lê "Não consegui testar este projeto. Peça ajuda à
  equipe."; a pendência da parte ficou neutra ("Cumpra os objetivos e verifique o seu projeto"),
  porque o botão tem nomes diferentes no Kids e no adulto.

Registrados e não mudados: o ensaio do Admin ainda mostra o veredito pela régua antiga em partes só
com extras; um gabarito e um inicial grandes juntos podem passar do teto de 2 MB do "Testar agora".

Antes de usar objetivos que rodam o jogo em produção, publicar o Worker `studio-runtime` à mão
(`bun run deploy:staging` e depois `bun run deploy` em `packages/studio-runtime`).
