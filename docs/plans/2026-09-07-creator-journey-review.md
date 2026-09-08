# Revisão da implementação da Carreira do Criador

Revisão realizada em 07/09/2026, na branch `staging`, sobre a implementação descrita
em [Evolução do Sistema Zero](2026-09-07-creator-journey-evolution.md).

**Resultado:** seis problemas confirmados e corrigidos: dois P1 e quatro P2.
Os testes que reproduzem esses problemas falharam antes das correções e passaram
depois. A verificação final executou 2.742 testes, sem falhas, além de TypeScript,
Biome e build de produção do Kids. Não ficou aberto nenhum dos seis achados.

O escopo foi a jornada implementada: regras e concessões da carreira, autoria,
publicação e entrega do marco, missões, navegação, trabalhos, Pensa → Molda,
prática, responsáveis, comunidade adulta e contexto de entregas no admin.
O trabalho paralelo existente no núcleo de `packages/molda` foi preservado; a
correção de retomada ficou no host Kids e no teste de seu contrato com o editor.

## Achados corrigidos

### R1 · P1 — Uma aula “em breve” podia deixar a carreira sem publicação utilizável

**Gatilho:** manter duas atividades de publicação, sendo uma em uma aula com
`coming_soon`, e remover a outra. Também era possível adicionar o aviso “em breve”
à única aula com publicação, ou converter outro bloco dessa aula nesse aviso.

**Causa:** a prontidão verificava aula publicada e Estúdio com vitrine habilitada,
mas ignorava que `coming_soon` esconde o conteúdo da aula. A autoria permitia
remover a última atividade realmente utilizável, e o detalhe do curso podia
indicar uma aula que não mostrava o Estúdio ao aluno.

**Correção:** o predicado de disponibilidade agora exclui essas aulas tanto da
prontidão quanto da seleção da aula de publicação. Criar/converter um aviso
revalida a disponibilidade da aula inteira sob o mesmo lock de curso usado nas
remoções concorrentes. Cursos legados incompletos continuam reparáveis.

Código: [disponibilidade da aula](../../packages/members/src/infrastructure/persistence/drizzle/lesson-availability.ts),
[autoria](../../packages/members/src/infrastructure/persistence/drizzle/content-admin.repository.ts),
[consulta do curso](../../packages/members/src/infrastructure/persistence/drizzle/course.repository.ts).
Prova: testes PostgreSQL em
[career-readiness.test.ts](../../packages/members/tests/db/career-readiness.test.ts),
incluindo remoção concorrente, criação e conversão de aviso.

### R5 · P1 — Uma aba antiga podia iniciar prática para o perfil recém-selecionado

**Gatilho:** abrir a prática no perfil A, trocar para B em outra aba e iniciar
uma sessão na tela antiga. Se B também pudesse praticar aquele conteúdo, a nova
sessão era registrada para B.

**Causa:** o BFF usava a sessão atual do navegador sem conferir a identidade do
perfil que originou a tela. O isolamento por dono no banco não evita uma escrita
atribuída ao dono errado já na entrada.

**Correção:** leituras e escritas da prática enviam `x-sz-viewer`; o BFF exige que
ele corresponda à sessão ativa antes de chamar Members. Uma troca retorna 409 com
orientação para atualizar a página. A interface apresenta essa orientação e
preserva as escolhas locais. O header não concede acesso: a sessão autenticada
continua sendo a autoridade.

Código: [rotas de prática](../../packages/member-shell/src/routes/practice.ts),
[oficina](../../packages/community-kids/src/components/kids/practice-workshop.tsx).
Provas: [BFF](../../packages/member-shell/tests/practice-routes.test.ts) e
[interface](../../packages/community-kids/tests/practice-workshop.test.tsx).

### R3 · P2 — A primeira conclusão podia omitir a orientação para publicar

**Gatilho:** entrar em um curso obrigatório sem marcos anteriores e concluir suas
aulas nessa visita.

**Causa:** `GetMyCourse` retornava `milestones` ausente quando o aluno ainda não
tinha eventos do curso. A celebração procurava `showcased === false`, portanto
não reconhecia esse caso como publicação pendente.

**Correção:** o detalhe Kids retorna explicitamente os dois marcos como `false`
quando ainda não existem. O contrato da comunidade adulta permanece opcional.

Código: [GetMyCourse](../../packages/members/src/application/get-my-course/get-my-course.service.ts).
Prova: [jornada de publicação](../../packages/members/tests/integration/course-publication-journey.test.ts).

### R4 · P2 — A aprovação de um plano não reconferia acesso ao Pinta e ao Estúdio

**Gatilho:** gerar um plano, perder acesso a uma dessas ferramentas e aprovar ou
revisar o plano depois, com o catálogo de blocos ainda compatível.

**Causa:** a auditoria recebia apenas a disponibilidade do Molda. O bloqueio do
handoff continuava protegendo a ferramenta, mas o aluno podia receber um plano
aprovado que não conseguiria executar.

**Correção:** a auditoria exige as três disponibilidades atuais. Tanto a geração
da revisão quanto o avanço de aprovação passam esse conjunto e recusam cartões
que dependam de uma ferramenta indisponível.

Código: [auditoria](../../packages/member-shell/src/server/pensa-agents/plan-audit.ts).
Prova: [capacidades do Pensa](../../packages/member-shell/tests/pensa-capabilities.test.ts).

### R2 · P2 — Reabrir a mesma criação pelo guia do Molda podia não fazer nada

**Gatilho:** abrir uma criação, usar o Voltar do editor e clicar em “Abrir criação
vinculada”, inclusive depois de entrar por um link com o mesmo ID.

**Causa:** o host reutilizava o ID como estado e chave do editor. O contrato
`initialAssetId` é consumido na montagem; repetir o mesmo valor não criava uma
nova abertura.

**Correção:** cada pedido de abertura tem uma revisão própria para remontar o
editor depois da guarda de fechamento. O ID da criação e sua persistência são
preservados.

Código: [host do Molda](../../packages/community-kids/src/components/kids/molda-client.tsx).
Prova: [teste do host](../../packages/community-kids/tests/molda-client.test.tsx),
com duas reaberturas sucessivas e um editor substituto que respeita o contrato de
abertura inicial. Esse teste não exerce o viewport WebGL real.

### R6 · P2 — Navegar pelo menu perdia marcações ainda não enviadas do guia

**Gatilho:** marcar passos/critérios ou selecionar uma criação no guia e sair por
um link interno antes de guardar o progresso.

**Causa:** os campos existiam apenas no estado React. O aviso `beforeunload` não
é disparado pela navegação interna da aplicação.

**Correção:** cada alteração grava um rascunho local por perfil e tarefa. A
retomada exige a mesma revisão e o mesmo timestamp de progresso do servidor;
rascunho antigo não substitui uma atualização feita em outra aba. Confirmação do
servidor remove o rascunho; falha de armazenamento apresenta orientação. O host
também reinicia ao trocar de perfil.

Código: [rascunho](../../packages/community-kids/src/components/kids/molda-task-draft.ts),
[guia](../../packages/community-kids/src/components/kids/molda-task-guide.tsx).
Prova: [teste do guia](../../packages/community-kids/tests/molda-task-guide.test.tsx),
com desmontagem/remontagem, outro perfil e versão posterior do servidor.

## Verificação final

Execução nova após as correções. Logs locais em `.audits/creator-review/`.

| Pacote | Testes aprovados | TypeScript |
| --- | ---: | --- |
| Members | 983 | Passou |
| Kids | 615 | Passou no build |
| member-shell | 472 | Passou |
| Hub | 140 | Passou |
| API gateway | 216 | Passou |
| Admin | 218 | Passou |
| Pensa | 39 | Passou |
| Core | 54 | Passou |
| Comunidade adulta | 5 | Passou |
| **Total** | **2.742** | |

`bun run test` foi executado nos nove pacotes. `bun run typecheck` foi executado
nos oito pacotes além do Kids; neste, `bun run build` compilou, verificou os tipos
e gerou as 59 páginas. `bun run check` passou nos nove pacotes; a conferência Biome
dos 148 arquivos de código/configuração do conjunto acompanhado também passou.
`git diff --check` desse conjunto passou.

Os testes PostgreSQL exercitaram as consultas e a proteção concorrente da autoria,
elegibilidade/união de concessões, outbox e rollback de publicação, prática e
suas regras de imutabilidade, isolamento e exclusão. A inspeção também conferiu
o congelamento de concessões dentro da transação do marco, as rotas explícitas
no gateway e a ordem das migrações aditivas.

Os logs `publication-red`, `pensa-red`, `molda-red`, `profile-red` e
`guide-draft-red` registram as reproduções anteriores às correções; seus pares
`*-green` e as suítes completas registram a verificação posterior.

## Limites e pendências de implantação

- O navegador conectado retornou `[]`. Não foi possível validar visualmente as
  telas, o comportamento responsivo real, o viewport 3D ou os percursos completos
  entre serviços. Inspeção de código e testes de componentes não aprovam essa etapa.
- Os testes usam dados sintéticos. O inventário do catálogo real e a execução das
  migrações no ambiente de destino seguem pendentes. A incompatibilidade histórica
  `0029`/`0030` de Members em banco vazio é anterior e não foi modificada.
- Não houve teste de carga nem medição com crianças/responsáveis. Clareza da nova
  navegação, adequação pedagógica da prática e efeitos no engajamento dependem do
  processo de avaliação descrito no [guia operacional](creator-journey-rollout.md).
- Esta revisão não implantou serviços, não aplicou migrações em produção, não
  enviou relatórios. A fase de outros conhecimentos contém uma proposta editorial,
  ainda sem interface e rotas.

Também foi corrigida a documentação interna do congelamento de blocos, que ainda
descrevia apenas a conciliação na leitura.

## Preparação do commit para staging — 08/09/2026

O conjunto foi separado das alterações paralelas do Molda, inclusive nos arquivos
compartilhados e no lockfile, e materializado em um checkout independente. Nenhum
arquivo do núcleo de `packages/molda` ou de `packages/studio` entra neste commit.
O guia usa o contrato público já publicado do Molda; a listagem por resumo é uma
capacidade opcional, sem depender dos novos exports do trabalho paralelo.

A instalação com `bun install --frozen-lockfile --ignore-scripts` passou. As nove
suítes desse conjunto executaram **2.695 testes, sem falhas**: Members 968, Kids 597,
member-shell 458, Hub 140, gateway 216, admin 218, Pensa 39, Core 54 e adulto 5.
A diferença para 2.742 corresponde aos testes do trabalho paralelo que ficaram
fora do commit. Biome passou nos nove pacotes e o build de produção Kids passou,
incluindo TypeScript e as 59 páginas. Os logs desta verificação estão em
`.audits/creator-review/commit/`.

O conteúdo do índice de Git foi comparado ao checkout validado antes do commit.
O [guia operacional](creator-journey-rollout.md) descreve as migrations, a validação
do conjunto em staging e a promoção para produção após aprovação do responsável
pelo produto.
