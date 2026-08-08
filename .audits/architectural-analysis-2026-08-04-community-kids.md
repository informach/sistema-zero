# Full review — `community-kids`

**Data:** 2026-08-04  
**Pacote:** `packages/community-kids`  
**Estado analisado:** working tree atual, incluindo alterações locais ainda não commitadas  
**Veredito atual:** **GO após a remediação de 2026-08-04**

> As seções de evidência abaixo preservam o estado encontrado no review original.
> A tabela a seguir registra a remediação aplicada e verificada depois dele.

## Atualização pós-review

| ID | Estado | Remediação verificada |
|---|---|---|
| CK-01 | Corrigido | Pipeline direto em `sharp@0.35.3`; apps Next coordenados em 16.3.0; testes reais de PDF/PNG/JPEG/GIF passaram. |
| CK-02 | Corrigido | Origem, solicitação pendente, expiração, MIME, formato, tamanho e resposta única validados; quatro regressivos. |
| CK-03 | Corrigido | Hook compartilhado com estado explícito, `catch`, abort, anti-stale e retry; quatro regressivos. |
| CK-04 | Corrigido | Regra escolhida: tarefa Pensa exige produto **e** carreira. Gate aplicado no host e no `members`, com teste HTTP. |
| CK-05 | Corrigido | Cobertura e alcance estático agora são relatados separadamente e gateados; 63/294 módulos alcançáveis (21,4%). |
| CK-06 | Corrigido | `bun run check` passa em 337 arquivos. |
| CK-07 | Corrigido | Skip link, alvo de foco e áreas infantis de toque com pelo menos 44 px. |
| CK-08 | Corrigido | `aria-describedby` passou a acompanhar o ciclo de vida real do balão; regressivo DOM. |
| CK-09 | Corrigido | Handoff duplicado unificado; ciclo do editor e revisão/cooldown do quiz extraídos. |
| CK-10 | Corrigido | Validação de fronteira dos blocos e ref tipada do OrbitControls; zero `as unknown as`. |
| CK-11 | Corrigido | Os 12 módulos sem consumidores foram removidos. |
| CK-12 | Corrigido | Dimensões intrínsecas, transições específicas, `themeColor` e `color-scheme`. |

**Evidência final:** 144 testes/0 falhas; 84,68% de linhas e 74,99% de funções nos
módulos carregados; alcance estático exposto separadamente; TypeScript, Biome,
`git diff --check` e build de produção Next 16.3.0 aprovados (49 páginas).

## Resumo executivo

O pacote tem uma base arquitetural boa: Next.js 16/React 19, TypeScript estrito,
fronteiras BFF finas sobre `@sistemazero/member-shell`, isolamento de conteúdo
autoral em iframe sem `allow-same-origin`, gates financeiros separados da sessão
infantil e tratamento cuidadoso de PII. Não encontrei `any`, `@ts-ignore`, sink de
HTML cru, ciclo de importação em runtime ou bypass óbvio do parent gate.

Os gates funcionais principais também estão saudáveis: `typecheck`, 131 testes e
o build de produção passam. Porém, a release ainda não deve ser aprovada. Há uma
dependência de imagem com advisory alto e entrada não confiável, um canal de
`postMessage` que aceita downloads sem comprovar ação do usuário, dois loaders
Pensa→ferramentas que ficam presos em loading quando `fetch` rejeita e três
falhas de formatação no gate oficial. A cobertura de 88,82% exibida por Bun é
parcial: ela considera só os módulos carregados pelos testes.

| ID | Severidade | Achado | Confiança |
|---|---:|---|---|
| CK-01 | Alta | `sharp@0.34.5` vulnerável processa imagens não confiáveis | Alta |
| CK-02 | Média | `postMessage` do player público pode disparar download sem solicitação válida | Alta |
| CK-03 | Média | handoff Pensa→Pinta/Estúdio trava em loading em falha de rede | Alta |
| CK-04 | Média | posse do Estúdio e gate de carreira divergem no handoff do Pensa | Média |
| CK-05 | Média | cobertura reportada omite a maior parte da superfície real | Alta |
| CK-06 | Média | gate de `check` falha em três arquivos | Alta |
| CK-07 | Média | shell não oferece skip link; alvos infantis ficam abaixo de 44 px | Alta |
| CK-08 | Baixa | `aria-describedby` pode apontar para ID inexistente | Alta |
| CK-09 | Baixa | componentes muito grandes e lógica duplicada concentram risco | Alta |
| CK-10 | Baixa | contrato de blocos exige 12 casts duplos | Alta |
| CK-11 | Baixa | 12 módulos sem consumidores somam 153 linhas mortas | Alta |
| CK-12 | Baixa | imagens sem dimensões intrínsecas e `transition-all` | Alta |

## Escopo e inventário

- 300 arquivos `.ts`/`.tsx` em `src`, 21.805 linhas físicas.
- Aproximadamente 26,4 mil linhas ao incluir CSS, testes e scripts do pacote.
- 29 arquivos de teste; 131 testes e 687 expectativas.
- 49 unidades de prerenderização concluídas pelo build do Next.
- 12 arquivos de produção de alta confiança sem nenhum consumidor interno.
- Working tree com modificações e arquivos novos do usuário; nenhum fonte foi
  alterado por este review.

Foram revisados entry points, páginas, route handlers, proxy, sessão, gates de
produto/carreira, uploads, conteúdo público, Pensa/Pinta/Estúdio, onboarding,
componentes infantis, contratos tipados, grafo de imports, testes, dependências,
build e regras de interface/acessibilidade.

---

## Achados bloqueantes e funcionais

### CK-01 — Alta — `sharp@0.34.5` vulnerável em pipeline de imagem não confiável

**Evidência**

- `packages/community-kids/package.json:43` declara `"sharp": "^0.34.5"`.
- `bun pm why sharp` confirma resolução efetiva em `sharp@0.34.5` para
  `@sistemazero/community-kids` e `@sistemazero/member-shell`.
- `packages/member-shell/src/server/image-optimizer.ts:47` decodifica buffers com
  `sharp`; uploads UGC chegam ali em `routes/hub.ts:470,610`, capas do Estúdio em
  `routes/studio.ts:382,505` e avatar em `server/media.ts:162`.
- O advisory `GHSA-f88m-g3jw-g9cj` classifica `<0.35.0` como afetado e `0.35.0`
  como corrigido; a recomendação corrente é atualizar para `0.35.3`.

**Impacto**

O fluxo processa entrada controlada por usuários autenticados. As falhas herdadas
do libvips têm impacto de integridade e disponibilidade; portanto, limites de
tamanho/pixels existentes reduzem abuso genérico, mas não substituem a correção
da dependência.

**Recomendação**

Atualizar `sharp` de forma coordenada nos workspaces que compartilham o lock para
`>=0.35.0` — preferencialmente a versão estável mais recente —, regenerar o lock,
rodar testes de upload/avatar/capa/watermark e repetir `bun audit`. Se a atualização
for temporariamente inviável, bloquear GIF/TIFF/VIPS conforme o workaround do
advisory, sem tratar isso como correção definitiva.

### CK-02 — Média — player público aceita download por `postMessage` não solicitado

**Evidência**

Em `src/components/kids/mobile-gamepad.tsx:290-303`, o listener global aceita
qualquer mensagem cujo `data.type` seja `sz:screenshot:result`, copia `dataUrl`
para um `<a download>` e chama `click()`.

Faltam simultaneamente:

- validar `event.source === iframeRef.current?.contentWindow`;
- exigir que exista uma captura pendente iniciada pelo botão em
  `mobile-gamepad.tsx:316-318`;
- validar prefixo MIME, formato e limite de tamanho do `dataUrl`.

O jogo publicado roda em iframe sandboxed, o que protege o DOM pai, mas o próprio
código autoral dentro desse iframe consegue enviar mensagens ao `parent`. Assim,
um projeto aberto em `/jogar/:id` pode tentar produzir downloads espontâneos ou
pressionar memória com um payload grande. Validar apenas `source` não basta:
também é necessário vincular a resposta a uma ação recente do usuário.

**Recomendação**

Manter um token/ref de captura pendente, aceitar uma única resposta dentro de um
timeout curto, validar `event.source`, exigir `data:image/png;base64,` e impor
limite de bytes antes de criar o link. Adicionar teste para mensagem de outro
frame, mensagem sem captura pendente, MIME inválido, payload grande e resposta
válida única.

### CK-03 — Média — handoff fica preso em loading quando a rede rejeita

**Evidência**

- `src/components/kids/pinta-client.tsx:62-83` faz `await fetch(...)` sem
  `try/catch`, aborto ou guarda de geração.
- `src/components/kids/studio-full-client.tsx:135-156` repete a mesma lógica.
- Os estados de loading são exibidos em `pinta-client.tsx:246` e
  `studio-full-client.tsx:391` quando handoff e erro continuam nulos.

Uma resposta HTTP ruim é tratada, mas uma rejeição real de rede lança dentro do
efeito disparado com `void`. O resultado é promise rejeitada, nenhum erro visível
e loading permanente. Uma troca rápida de `tarefa` também permite que resposta
antiga sobrescreva a nova; o estado anterior não é limpo ao iniciar nova carga.

**Recomendação**

Extrair um `usePensaTaskHandoff(destination, taskId)` compartilhado com:
`AbortController`, contador de geração, limpeza de payload anterior, estado
explícito `idle/loading/success/error`, `catch` e retry. Testar rejeição de
`fetch`, JSON inválido, resposta fora de ordem, troca de tarefa e unmount.

### CK-04 — Média — capability do Pensa diverge do gate de carreira do Estúdio

**Evidência**

- `src/app/(app)/pensa/page.tsx:23-32` calcula `studioOwned` apenas pela posse de
  `estudio-completo`.
- `src/components/kids/pensa-client.tsx:67-70` navega a tarefa para
  `/estudio?tarefa=...`.
- `packages/members/src/interfaces/http/routes/pensa.routes.ts:289-305` também
  deriva a capability do handoff apenas do access ref.
- `src/app/(app)/estudio/page.tsx:47-51` exige, além da compra, que
  `resolveStudioTier(...).freeStudio` seja verdadeiro.

Uma criança Faísca cuja conta possui o Estúdio pode ver/abrir a tarefa e receber
`KidsCareerLockedStudio` antes que o handoff seja montado. Isso pode ser bug ou
uma política ainda não explicitada: a documentação local diz que criação livre
é bloqueada, mas não define se uma tarefa guiada do Pensa deveria ser exceção.

**Recomendação**

Escolher e codificar uma regra única:

1. se tarefa Pensa também exige rank, capability e botão devem considerar
   produto **e** tier;
2. se tarefa guiada é permitida antes da criação livre, `/estudio` deve montar o
   modo de tarefa antes do gate de `freeStudio`, mantendo criação livre bloqueada.

Adicionar teste E2E de `produto comprado × rank Faísca` e um contrato compartilhado
para evitar nova divergência entre host e backend.

### CK-05 — Média — 88,82% de cobertura não representa o aplicativo

`bun test --coverage` informa 81,41% de funções e 88,82% de linhas, mas Bun só
instrumenta módulos importados durante os testes. Um grafo estático partindo dos
29 arquivos de teste alcança apenas 58 dos 300 arquivos de `src` (19,3%). Esse
número não é cobertura de linha, mas demonstra a lacuna de superfície.

Ausências relevantes incluem os grandes clientes de Estúdio/Pinta, player
público/gamepad, builder de quarto, player de aula e fluxos completos de Pensa.
Os testes novos cobrem links e funções puras, não falha de rede do handoff,
divergência de capability/rank, restauração IndexedDB ou sincronização de
progresso.

**Recomendação**

Separar cobertura unitária de cobertura de integração, definir include explícito
para `src/**/*.{ts,tsx}` com zero para arquivos não carregados e criar suítes
prioritárias para CK-02/03/04. Não usar o percentual atual como release gate.

### CK-06 — Média — gate oficial de estilo não passa

`bun run check` falha com três erros de formatação:

- `src/app/(app)/estudio/page.tsx:28`;
- `src/app/(app)/pensa/page.tsx:30`;
- `tests/pensa-studio-link.test.ts:9`.

Não há erro semântico reportado pelo Biome; ainda assim, um gate obrigatório
vermelho impede afirmar que o pacote está pronto para merge.

---

## UX, acessibilidade e interface

### CK-07 — Média — navegação repetitiva e alvos pequenos no produto infantil

O shell autenticado não possui link “Pular para o conteúdo”.
`src/app/(app)/layout.tsx:86-110` renderiza a chrome antes do conteúdo e
`src/components/kids/main-container.tsx:32-47` não fornece um `id` estável/foco
ao `<main>`. Usuários de teclado precisam atravessar a navegação a cada rota.

Alvos abaixo dos 44 px recomendados para toque infantil:

- `src/components/kids/public-player.tsx:134` — toggle `size-8` (32 px);
- `src/components/kids/recados-bell.tsx:35` — `size-9` (36 px);
- `src/components/kids/clube-activity-bell.tsx:111` — `size-9`;
- `src/app/(app)/recados/[threadId]/recado-thread-client.tsx:116` — `size-9`;
- `src/components/kids/challenge-card.tsx:30,37,45` — `min-h-10` (40 px).

Adicionar skip link visível ao foco, `id="main-content"` e `tabIndex={-1}` ao
main. Aumentar a área clicável sem necessariamente aumentar o ícone visual.

### CK-08 — Baixa — descrição ARIA pode não existir no DOM

`src/app/(app)/page.tsx:118-124` fornece `child-start-guide` com base apenas no
estado do servidor. `src/components/kids/continue-hero.tsx:67-70` aplica esse ID
ao link. Porém, o passo corrente/dispensa do guia vive no cliente; durante modal
de boas-vindas, etapa do avatar ou guia já dispensado, o elemento descritor pode
não existir.

Aplicar `aria-describedby` no mesmo componente cliente que decide renderizar o
balão, somente enquanto o descritor estiver montado.

### CK-12 — Baixa — detalhes de estabilidade e animação

Ocorrências de `transition-all` devem declarar apenas propriedades animadas:

- `src/components/kids/avatar3d/configurator.tsx:64`;
- `src/components/kids/focus-mode-toggle.tsx:46`;
- `src/components/kids/kids-lesson-attachments.tsx:74`;
- `src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx:342`;
- `src/components/kids/kids-quiz.tsx:338`.

Primitivos reutilizáveis usam `<img>` sem `width`/`height` intrínsecos:

- `src/components/kids/mascot.tsx:28`;
- `src/components/kids/kids-avatar.tsx:40`;
- `src/components/kids/zappy-coin.tsx:15`.

As classes CSS já reservam parte do espaço, então o risco de CLS é baixo, mas
dimensões intrínsecas tornam o layout determinístico. `src/app/layout.tsx` também
não declara `themeColor`/`color-scheme`, o que pode deixar controles nativos
inconsistentes no tema escuro.

Pontos positivos da varredura de interface: não há bloqueio de paste, zoom
desabilitado, handlers em `div`/`span` simulando botão, `dangerouslySetInnerHTML`
ou animação indiscriminada sem alternativa óbvia; a tabbar móvel respeita safe
area.

---

## Arquitetura e manutenibilidade

### CK-09 — Baixa — componentes “god” e duplicação em fluxos críticos

Arquivos/funções mais concentrados:

- `kids-space-view-client.tsx`: 887 linhas; componente principal ~835;
- `room/room-builder.tsx`: 879 linhas; componente principal ~803;
- `app/perfis/perfis-client.tsx`: 1.020 linhas; função principal ~515;
- `avatar3d/configurator.tsx`: 574 linhas; função principal ~501;
- `lesson-player-client.tsx`: 528 linhas; função principal ~490;
- `studio-full-client.tsx`: 582 linhas; função principal ~379;
- `kids-quiz.tsx`: 499 linhas; função principal ~365;
- `room/room-canvas-3d.tsx`: cena principal ~286 linhas;
- `app/globals.css`: 1.031 linhas.

O impacto já aparece em CK-03: `loadHandoff` e `loadTask` duplicam o mesmo bug.
Não é recomendada uma reescrita. Extrair hooks por responsabilidade, reducers
para estados finitos e componentes de apresentação menores reduz risco sem
alterar contratos públicos.

### CK-10 — Baixa — contrato heterogêneo de blocos força casts duplos

Há 12 usos de `as unknown as`: 11 em
`src/components/kids/kids-lesson-blocks.tsx:101-211` e um em
`src/components/kids/room/room-canvas-3d.tsx:68`. O primeiro grupo indica que o
tipo de bloco vindo do backend não é um union discriminado suficiente para o
renderer provar a relação `type → content`.

Recomendação: validar na borda com schema/discriminated union e entregar ao
renderer um tipo refinado. Isso remove casts e transforma payload incompatível
em erro controlado, sem mascarar a incompatibilidade no componente.

### CK-11 — Baixa — 153 linhas mortas em 12 módulos

O grafo de imports não encontrou consumidores internos para:

| Linhas | Arquivo | Observação |
|---:|---|---|
| 52 | `src/components/kids/pinta-intent.ts` | bridge antigo por `sessionStorage`; o fluxo novo remove a chave em `pensa-client.tsx:48` |
| 53 | `src/components/kids/status-badge.tsx` | componente sem uso |
| 2 | `src/lib/csrf.ts` | re-export sem consumidor |
| 2 | `src/lib/download-mime.ts` | re-export sem consumidor |
| 16 | `src/server/gateway.ts` | re-export sem consumidor |
| 2 | `src/server/image-optimizer.ts` | re-export sem consumidor |
| 16 | `src/server/media.ts` | re-export sem consumidor |
| 2 | `src/server/private-delivery.ts` | re-export sem consumidor |
| 2 | `src/server/r2.ts` | re-export sem consumidor |
| 2 | `src/server/refresh.ts` | re-export sem consumidor |
| 2 | `src/server/watermark-queue.ts` | re-export sem consumidor |
| 2 | `src/server/watermark.ts` | re-export sem consumidor |

Antes de remover, confirmar que nenhum consumidor externo importa paths privados
do app; o pacote é `private`, então a probabilidade é baixa. Depois, remover em
um commit isolado e deixar TypeScript/testes confirmarem o alcance.

O `package.json` também repete várias dependências usadas primariamente pelo
`member-shell`. Não foi classificado como dead code porque algumas podem existir
para bundling/peer/standalone do Next. Auditar cada dependência com o build
standalone antes de podar.

## Controles positivos

- `strict` e `noUncheckedIndexedAccess`; nenhum `any`, `@ts-ignore` ou
  `@ts-expect-error` encontrado em `src`.
- Nenhum ciclo de importação em runtime. A única relação circular observada usa
  import type e é apagada na compilação.
- Route handlers do app são, em geral, shims pequenos sobre `member-shell`, o
  que reduz duplicação de autenticação e política.
- Proxy protege mutações same-origin; rotas multipart excluídas aplicam seus
  próprios guards de sessão/upload.
- `/jogar/:id` e `/validar/:id` validam UUID e usam `noindex`; erros públicos são
  neutros.
- Conteúdo autoral usa iframe sandbox sem `allow-same-origin`; não foi encontrado
  sink de HTML cru no app.
- Parent gate usa verificação server-side/HMAC e ações financeiras permanecem na
  sessão de conta.
- Sanitização de PII/telemetria e restrição de UGC estão coerentes com o público
  de 8–13 anos na inspeção estática.
- `git diff --check` passa.

## Verificação executada

| Comando | Resultado |
|---|---|
| `bun run typecheck` | PASS |
| `bun test` | PASS — 131 testes, 0 falhas, 687 expectativas, 29 arquivos |
| `bun test --coverage` | PASS parcial — 81,41% funções / 88,82% linhas dos módulos carregados |
| `bun run check` | FAIL — 3 erros de formatação |
| `bun run build` | PASS — 157,8 s; compilação 29,3 s, TypeScript 116 s |
| `git diff --check` | PASS |
| `bun audit` | 35 advisories no monorepo; CK-01 é o advisory alto diretamente relevante confirmado neste pacote |

O build inicial excedeu 180 s sem output e foi repetido com janela maior; a
segunda execução concluiu normalmente. O tempo alto é operacionalmente relevante
para CI, mas não foi classificado como bug sem baseline histórico.

## Ordem de remediação

1. Atualizar `sharp`, regenerar lock e repetir audit/testes de imagem.
2. Fechar o protocolo de screenshot (`source` + ação pendente + MIME/tamanho) e
   cobrir com testes.
3. Unificar o loader de handoff com catch/abort/anti-stale e testes de rede.
4. Decidir a política produto+rank do Estúdio para tarefas do Pensa e codificá-la
   numa única fronteira compartilhada.
5. Corrigir os três arquivos do Biome e tornar cobertura explícita sobre todo
   `src`.
6. Adicionar skip link, ampliar alvos de toque e corrigir a referência ARIA.
7. Extrair componentes/hook críticos e remover os 12 módulos mortos em mudanças
   pequenas e verificáveis.

## Limitações

Este foi um review estático com execução local de typecheck, testes, cobertura,
build, audit e análise de grafo. Não houve login com conta real, QA manual em
browser/dispositivo, teste de leitor de tela, inspeção de dados de produção nem
pentest ativo. CK-04 depende de uma decisão de produto que não pode ser inferida
apenas do código.
