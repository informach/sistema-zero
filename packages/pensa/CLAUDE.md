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

`PensaApp` compõe `GameDefinition`, `ProjectPlan`, `MissionCard`, `PlanChangeReview`, `PensaTeamDialog` e `ProjectCare`. `usePensaProject` valida as respostas canônicas com schemas core, preserva a view durante refresh e acompanha operações persistidas. Mutações de projeto devolvem `PensaProjectView`; sair da equipe e apagar o jogo são respostas diretas, pois removem o acesso. Mutações de missão devolvem `PensaMissionHandoff`.

O host injeta `PensaHostAdapter`: `transport.request`, `viewerId`, tema, renderers de voz/narração e navegação `onOpenMission`/`onOpenGame`. Não busque capacidades no browser para decidir o plano ou recalcular a próxima missão. `nextAction` e `availability` são decisões do servidor; inclusive em equipe e no Estúdio Pro. As únicas rotas são `/api/pensa/projects`, `/missions`, `/operations` e seus recursos canônicos, além de `/credits`.

O conteúdo de missão e o painel são compartilhados: `@sistemazero/ui/pensa-mission-content`, `/pensa-mission-panel` e `/pensa-mission-session`. O host `community-kids` resolve a criação salva, confirma a gravação na conta e envia referências com `saveRevision` real. Não invente revisões, declare progresso após apenas salvar localmente nem use o navegador como autoridade de entregas.

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

Os painéis de oficina podem recolher para uma linha de título e estado. Falhas continuam visíveis. A anotação “Onde parei” não é um checklist. A preparação usa “Já preparei”; as outras conclusões descrevem a conferência do resultado.

## Desenvolvimento e verificação

Código TypeScript consumido diretamente; sem build de biblioteca. O host transpila o pacote e importa `tool-chrome.css` antes de `pensa/styles.css`.

```sh
bun run dev
bun run typecheck
bun test src
bun run e2e
```

O playground usa `playground/project-server.ts`, um servidor em memória sem provedor pago. `?vazio=1` começa antes do primeiro envio; o exemplo tem nove missões funcionais. Fixtures aceitas e rascunhos devem passar por `validatePensaPlan`, com cobertura de requisitos, dependências, teste final e recursos por missão. Não confunda passar em `parse` com um plano semanticamente válido.

Os testes de interface cobrem primeiro envio/idempotência, ajuda contextual, preparação, reconferência, links seguros e foco. A integração de salvamento, troca de perfil, entregas e navegação fica em `community-kids/tests`; os painéis em Studio/Pinta e o contrato visual em UI têm testes próprios. E2E cobre definir, aceitar e consultar o plano, equipe e tela estreita.
