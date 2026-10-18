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
