# @sistemazero/pensa

Biblioteca React de planejamento de jogos para crianças. O propósito é definir o jogo completo escolhido, organizá-lo em missões funcionais e facilitar a retomada do projeto. A especificação vigente é [2026-10-16-pensa-reestruturacao-spec.md](../../docs/plans/2026-10-16-pensa-reestruturacao-spec.md); os lotes estão no [plano de implementação](../../docs/superpowers/plans/2026-10-16-pensa-reestruturacao.md).

## Regras do produto

- Missões mostram objetivo, regras e como conferir. Nunca transforme o plano em tutorial de blocos, linhas de código ou checklist de implementação.
- O plano cobre todos os requisitos aceitos, com dependências reais e um teste final do jogo. Não reduza silenciosamente o escopo a um protótipo.
- A definição distingue pedidos da criança, sugestões ainda não aceitas, adaptações e ideias futuras. Recursos indisponíveis precisam de alternativas viáveis e escolha explícita.
- Uma única missão `setup` prepara o jogo em blocos com extensões oficiais recomendadas. Instalar exige clique na oficina e usa o instalador nativo. No Estúdio Pro não há instalação fictícia de extensões de blocos.
- Missões futuras podem ser consultadas em leitura. Executar, concluir e reconferir seguem a disponibilidade atual fornecida pelo servidor.
- Arte pronta e arte incorporada ao jogo são resultados distintos. Não condicione a conclusão no Pinta/Molda a uma importação no Estúdio.

## Arquitetura e fronteiras

`src/index.ts` exporta `PensaApp`, tipos de chrome/adapter/transport e `PensaApiError`. `src/core/types.ts` contém somente a integração do browser. Todo contrato de domínio vem de `@sistemazero/core/pensa`; não crie schemas paralelos nos componentes ou hosts.

`PensaApp` só orquestra estado e ações e escolhe a tela (ver "Telas" abaixo). `usePensaProject` valida as respostas canônicas com schemas core, preserva a view durante refresh e acompanha operações persistidas. Mutações de projeto devolvem `PensaProjectView`; sair da equipe e apagar o jogo são respostas diretas, pois removem o acesso. Mutações de missão devolvem `PensaMissionHandoff`.

O host injeta `PensaHostAdapter`: `transport.request`, `viewerId`, tema, renderers de voz/narração e navegação `onOpenMission`/`onOpenGame`. Não busque capacidades no browser para decidir o plano ou recalcular a próxima missão. `nextAction` e `availability` são decisões do servidor; inclusive em equipe e no Estúdio Pro. As únicas rotas são `/api/pensa/projects`, `/missions`, `/operations` e seus recursos canônicos, além de `/credits`.

O painel e a sessão de missão das oficinas são compartilhados: `@sistemazero/ui/pensa-mission-content`, `/pensa-mission-panel` e `/pensa-mission-session`. Dentro do planner a missão aparece no desenho do Canvas pelo `MissionBrief` (o mesmo contrato funcional: objetivo, preparação, regras e conferências). O host `community-kids` resolve a criação salva, confirma a gravação na conta e envia referências com `saveRevision` real. Não invente revisões, declare progresso após apenas salvar localmente nem use o navegador como autoridade de entregas.

## Estado e concorrência

- Revisões aceitas são imutáveis. Mudanças são rascunhos, com impacto e versões de progresso conferidas no aceite.
- Escritas usam `requestId` e as revisões de concorrência do contrato. Repetir uma tentativa após falha de rede preserva o ID da mesma operação; uma nova intenção recebe outro ID.
- A operação em andamento é retomável. `/operations/:id/work` recebe JSON com `requestId`; falhas oferecem nova tentativa.
- Progresso, entregas, anotações, equipe e checkpoints ficam no servidor. O browser guarda apenas texto não enviado por perfil/jogo/conversa e preferências visuais.
- Não remonte o editor ao atualizar progresso. Confira identidade de perfil, missão e revisão após operações assíncronas antes de aplicar uma resposta.
- Checkpoints usam a criação real do jogo e sua revisão salva. A restauração conservadora é coordenada pelo host com `restoredSaveRevision` fornecido pelo servidor.
- Narração referencia conteúdo por identidade e revisão canônicas. Texto de ajuda aceita apenas links internos permitidos via `PensaMessageText`, sem HTML arbitrário.

## Interface

Preserve a identidade existente: Nunito/Baloo, tokens `--pz-*`, claro/escuro, chrome compartilhado, foco visível, alvos de toque e movimento reduzido. Cartões não deslocam no hover. Checkboxes/radios não recebem a largura de campos textuais. Janelas usam `useDialogFocus`, devolvem foco e impedem fechamento durante gravação.

### Telas (redesenho aprovado em 20/10/2026, Canvas "Pensa · proposta de design e copy")

O planner é uma tela da plataforma Kids com a assinatura do Pensa: chão azul-claro, cartões brancos de 24px sem borda, Baloo 2 800 nos títulos, Nunito no texto, botões com o degrau 3D (`pz-btn--action|card|danger`, afundam no aperto e não andam no hover), âmbar no ícone, nas ideias e no mapa, azul só para ação. Cada quadro do Canvas virou um componente:

| Quadro | Código |
| --- | --- |
| Meus jogos | `screens/GameList.tsx` (abas Em andamento/Guardados com contagem, cartão "Nova ideia de jogo", cartões dos jogos, "Entrar no jogo de um amigo"; no celular o botão de nova ideia fica preso no pé) |
| Nova ideia | `screens/NewIdea.tsx` (trilha ZERO, o Zappy pedindo a ideia, caixa com exemplo, voz do host e `IDEA_SEEDS`, só no Kids, que apenas preenchem a caixa) |
| Montando o plano | `screens/Generating.tsx` (os três passos saem de `operation.step`; "Parar" cancela) |
| Pergunta do Zappy | `screens/Clarify.tsx` (`pendingChoices[0]` em cartões ou resposta livre; no projeto aceito, o mesmo cartão entra no topo da coluna) |
| O plano para conferir | `screens/Proposal.tsx` + `GameCard.tsx` (carta do jogo, adaptações) + `PlanMissionList` (rodapé fixo: Agora não volta à lista sem descartar; Quero mudar uma coisa abre o campo; Este é o meu jogo aceita) |
| Projeto em andamento | `screens/ProjectWorkspace.tsx`: próxima missão na cor da oficina (`MissionBrief` em ladrilhos), `MissionMap` (trilha por etapa), carta resumida, ideias para depois e `ChatPanel` ao lado (coluna fixa) |
| No celular | o mesmo `ProjectWorkspace` com `narrow` (planner abaixo de 900px, `useNarrow` mede o contêiner): abas Plano, Conversa e Carta do jogo no pé, `MissionMapCompact` com a missão atual e as vizinhas |
| Missão aberta | `MissionDialog.tsx` (folha à direita; de baixo no celular). Ler é livre; executar segue `availability` |
| Mudar uma parte | `screens/ChangeReview.tsx` (rascunho com `baseRevisionId`: contagens do `impact`, antes/depois do resumo, missões que mudam; Deixar como está = `DELETE /draft`) |
| Equipe | `PensaTeamDialog.tsx` |
| Cuidar do jogo | `CareMenu.tsx` (três pontos: pausar, Guardados, versões, apagar; menu com setas/Esc) + `VersionsDialog`/`ProjectCare.tsx` + `ConfirmDialog` (`tone="action"` no voltar de versão) |
| Jogo pronto | `screens/Finished.tsx` (`nextAction.type === 'completed'`; "Colocar no jogo" preenche a conversa, não manda sozinho) |
| Estados | `States.tsx`: ideias acabaram (Zappy dormindo; o Enviar some), esperando a equipe, "Deu um tropeço. A sua ideia está guardada.", esqueleto, "O Pensa não abriu agora", faixa de pausado/Guardados, faixa de suporte, avisos curtos (`notify`) |

- **Contexto:** `context.tsx` (`usePensaUi`) dá a audiência, a copy (`core/copy.ts`), o medidor, o Zappy (`mascotImages`, só Kids; `speaking` cai no `happy`) e `readOnly`. Leitura do plano para a tela em `core/planView.ts` (só ordena e agrupa).
- **Adulto:** sem Zappy, sem sementes, "créditos" no medidor e na conversa. Nada de hex nos componentes: tudo `--pz-*`.
- **Suporte só leitura:** `adapter.readOnly` liga direto; sem ele, a primeira recusa `IMPERSONATION_READONLY` do BFF liga (o transporte do `PensaApp` observa). Ações que gravam ficam desligadas com "Só a criança mexe no jogo"; a conversa fica só para leitura. O `/pensa` do Kids passa `supportReadOnly={isReadonlyImpersonation(session)}` ao `PensaClient` (a faixa aparece desde o primeiro quadro); o adulto nunca monta o Pensa numa sessão de suporte só leitura (`getCreativeToolsState` devolve `readonly` e a página mostra o `ToolNotice`).
- **Estado por jogo:** a tela da mudança, o texto em edição e a missão aberta guardam o id do jogo (`changeFor`/`editingFor`/`previewState`) e somem sozinhos quando outro jogo abre; um efeito de limpeza atrasado apagava a escolha recém-feita. `?ajuda=` abre o jogo do link na aba Conversa uma vez só (`helpTabPending`).
- **Pergunta no projeto aceito:** o cartão de escolha no topo da coluna não tem campo próprio; "Responder do meu jeito na conversa" leva ao campo da conversa (dois campos com o mesmo id quebravam o rótulo e o foco). Sem ideias, a pergunta e o "Quero mudar uma coisa" mostram o cartão de ideias acabadas.
- **CSS:** `pensa.css` só tem classes `pz-*` dentro de `.pensa-planner`, resets por `:where` (especificidade zero) e o escopo de tema é `.pensa-theme-light|dark`, o seletor que o `tool-chrome.css` conhece (o antigo `data-pensa-theme` e a `sz-tool-band--cream` não casavam com nada). Tons derivados por `color-mix(in oklab, …)`. A tinta sobre o âmbar (`--pz-on-amber`) lê `--sz-tool-on-sig-pensa` do `tool-chrome.css` (âmbar escuro, 7,38:1), com a mesma conta como reserva no playground sem host.
- **Links da ajuda:** `PensaMessageText` aceita `/cursos`, `/como-fazer`, `/ajuda`, `/estudio`, `/pinta` e `/molda`.
- Elementos do Canvas sem dado no servidor ficaram de fora: "Próxima: …" no cartão da lista, nomes da equipe na capa do cartão, campos "Objetivo/Se cair/Fim" da carta, "Enquanto isso, adiante no Pinta" na espera, "Sair da visão" na faixa de suporte (a faixa global do host já faz) e "não gastou uma ideia" no tropeço.

Os painéis de oficina podem recolher para uma linha de título e estado. Falhas continuam visíveis. A anotação “Onde parei” não é um checklist. A preparação usa “Já preparei”; as outras conclusões descrevem a conferência do resultado.

## Desenvolvimento e verificação

Código TypeScript consumido diretamente; sem build de biblioteca. O host transpila o pacote e importa `tool-chrome.css` antes de `pensa/styles.css`.

```sh
bun run dev
bun run typecheck
bun test src
bun run e2e
```

O playground usa `playground/project-server.ts`, um servidor em memória sem provedor pago. `?vazio=1` começa antes do primeiro envio; o exemplo tem nove missões funcionais (uma de arte no Pinta e a integração no Estúdio). `?cena=` abre cada quadro do Canvas (`lista`, `vazio`, `organizando`, `pergunta`, `proposta`, `projeto`, `mudanca`, `pronto`, `esperando`, `tropeco`, `ideias`, `abrindo`, `falha`, `pausado`, `suporte`), `?adulto=1` liga a audiência adulta, `?theme=dark` o escuro e `?shell=0` tira a barra lateral simulada de 250px. As imagens do Zappy vêm de `community-kids/public` (`publicDir`). Fixtures aceitas e rascunhos devem passar por `validatePensaPlan`, com cobertura de requisitos, dependências, teste final e recursos por missão. Não confunda passar em `parse` com um plano semanticamente válido.

Os testes de interface cobrem primeiro envio/idempotência, ajuda contextual, preparação, reconferência, links seguros e foco (`PensaApp.functional.test.tsx`), e cada tela e estado do Canvas, abas do celular, adulto e suporte (`PensaApp.screens.test.tsx`). A integração de salvamento, troca de perfil, entregas e navegação fica em `community-kids/tests`; os painéis em Studio/Pinta e o contrato visual em UI têm testes próprios. E2E cobre definir, aceitar e consultar o plano, equipe e tela estreita.
