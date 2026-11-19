# Continuação da missão após a revisão

Referências: revisão `4c2ff6a61`, staging `42b395d93`. Worktree isolada
`sistema-zero-estudio-missao`, branch `estudio-missao-completar-20261118`.
Missão e correção dos seis achados autorizadas pelo usuário; GitHub Actions autorizado
para testes pesados. Não implantar, não mesclar staging automaticamente e não alterar
as frentes Pinta/Molda. Manter cores, fontes, componentes e percursos dos cursos.

## Contrato e desenho do primeiro lote

Reutilizar Blockly/IR, persistência, origem isolada, runtimes e Monaco. Não criar um
segundo armazenamento ou tentar garantir isolamento de processamento com timers.
O relatório de revisão continua válido como baseline, não será reescrito como se
os achados nunca tivessem existido.

1. Estabelecer CI de homologação isolada, sem secrets ou deploy, selecionável por
   branch/SHA; Linux/Windows, Chromium completo, Firefox e WebKit onde disponíveis.
   Publicar artefatos com versão do browser, ambiente, testes, medições e capturas.
2. R1: reproduzir arranjos e capacidades por motor; avaliar os contratos de origem
   e caminhos Worker existentes antes de alterar execução de jogos DOM/Canvas.
   Testes verdes no Chromium não qualificam Firefox/WebKit. Não desligar recursos
   ensinados, não chamar navegador não suportado de isolamento resolvido.
3. R3: executar somente revisão confirmada pela persistência. Remover corrida com
   timeout. Se houver edição durante uma gravação, confirmar a nova revisão antes
   de iniciar. Falha impede a intenção de Rodar, preserva buffer e execução anterior
   e oferece o diagnóstico existente; Parar cancela intenção, nunca uma mutação.
4. R6: atualizar documentação atual e nomear corretamente abertura da página e proxy
   de apresentação, conservando números e evidências históricos intactos.

## Tarefas e provas

- [x] Reproduzir R3 com testes de falha, demora e edição durante confirmação.
- [x] Implementar confirmação da revisão e estado de erro sem perda de buffers.
- [ ] Testar parar, mudança de projeto/perfil, autoridade e reload real.
- [x] Adicionar workflow de homologação sem herdar jobs de deploy do CI principal.
- [ ] Executar workflows no GitHub e revisar falhas/artefatos, sem contar disparo como aprovação.
- [ ] Fechar R1 por executor com evidência; registrar capacidades e limites reais.
- [ ] Completar baseline/cursos no host de homologação conforme acesso disponível.
- [ ] R2: carga/desenho incremental, integridade e ciclo completo 5/10 mil blocos.
- [ ] Etapa 3: execução leve, FS/perfis/limites e homologação Pro com dependências reais.
- [ ] Etapa 4: streaming nos motores existentes e fixtures D/E.
- [ ] Etapas 5–7: depuração, profiler opt-in e testes de autoria, por runtime.
- [ ] Etapas 8–10: adaptadores integrais, recuperação, export/build reprodutíveis e manuais.
- [ ] Homologação A–H e revisão final; commits coesos e PR com pendências explícitas.

Cada item exige testes pertinentes, navegador para fluxo de usuário, descarte/segurança,
evidência e commit. Serviços controlados não substituem serviços reais; runner hospedado
não substitui aparelho físico de entrada. Ausência de acesso não equivale a aprovação.

## Estado reproduzível após as primeiras rodadas GitHub

PR draft: https://github.com/informach/sistema-zero/pull/273, base staging.
Não houve merge ou deploy. O merge anterior de `origin/staging` foi feito somente
na branch isolada. O trabalho das outras sessões na árvore original foi preservado.

- R3: correção em `d22be2f75`; 24 testes de preparação/preview (96 asserts) e teste
  real de Rodar/reload sem aguardar autosave. A proteção contra interrupção tardia
  foi mantida em `3c6e02955`, com 53 testes (209 asserts) e seis casos de navegador.
- R1: o marcador tardio e o limite de console na origem são proteções adicionais,
  não fechamento do isolamento. Os dados Linux do run `44284088297` confirmam
  bloqueio no WebKit e no srcdoc do Firefox. Consultar o relatório de ambientes.
- R2, R4, R5: continuam abertos. Não substituir renderização incremental por ocultar
  SVGs após montar tudo, nem apresentar pausas cooperativas como depurador completo.
- R6: documentação atual corrigida, com métricas históricas conservadas e identificadas.
- CI: `44280842226` e `44284088297` falharam; Firefox/WebKit selecionados e uma shard
  Chromium passaram, mas isso não aprova as suítes completas. `44289781987` já confirmou
  nova medição e os casos selecionados Firefox/WebKit. Seus demais jobs e a próxima
  rodada precisam de revisão. A auditoria é um gate independente que continua falhando
  por `GHSA-fc5q-39xc-vjpf`, sem patched version publicada; não a silenciar.
- Docker: regenerado o fingerprint canônico em `57a7a6de9` depois de reproduzir a
  recusa de perfil desatualizado. Confirmar build real/validação/Python no próximo run.
- Windows: o preflight aceita grafia curta de diretórios, conservando a recusa de
  links/junctions em raiz/ancestrais/artefatos; 7 testes, 29 asserts localmente.
- Ambiente local completo: serviços e PG encerrados; dados/credenciais ignorados
  preservados. Disco insuficiente interrompeu o setup Next e uma rodada com traces.
  Remoção de caches recusada pela revisão automática; não tentar por outra via.

Retomar com `git status`, consultar `gh run list --repo informach/sistema-zero
--workflow studio-mission.yml --branch estudio-missao-completar-20261118` e revisar
logs/artefatos do SHA mais recente. O workflow usa instalação congelada e Chromium
completo; contratos incluem Chromium e WebKit para o teste real de IndexedDB.
Os novos relatórios em `docs/qa/2026-11-18-studio-*` registram comandos, resultados
e limitações. Não contabilizar execução interrompida, job disparado ou artefato de
medição com saída zero como aceite global. Depois, continuar R1/R2 e etapas 3–10
na ordem do plano, mantendo a homologação pedagógica bloqueante.

Lote adicional: corrigida a referência pública/onReady do ramo Pro compilado pelo
host e a recompilação causada apenas por novo callback `onError`. Testes reproduziram
ambas as causas antes da correção; quatro casos unitários e dois de navegador
passaram. Relatório: `docs/qa/2026-11-18-studio-host-built-controls.md`.
O job `contracts (ubuntu-24.04)` do run `44289781987` concluiu com sucesso, incluindo
suíte isolada completa e typecheck, mas corresponde a `1d486e19b`; não estender essa
aprovação aos commits posteriores. Confirmar o próximo SHA na fila do workflow.

## Atualização da revisão de 18/11, após `0fd3f3e53`

O run `44370922838` concluiu contratos Linux e Windows com sucesso, incluindo
IndexedDB real em Chromium/WebKit. O cache da conexão já aberta elimina o adiamento
do callback do idb-keyval no pagehide (`ef81ee398`). O teste CSP usa servidor HTTPS
real, sem depender da interceptação de requests de OOPIF (`0fd3f3e53`); passou no
Linux. A auditoria bruta do runtime passou nesta execução, sem filtro/exception de
advisory. Os registros anteriores de falha permanecem históricos, não atuais.

O runtime hospedado e os jobs Firefox, WebKit, Windows Chromium e duas shards Linux
Chromium passaram. A terceira falhou na abertura do kit Phaser tático, com canvas
CSS 0×0. A correção e a regressão estão descritas em
`docs/qa/2026-11-18-studio-phaser-collapsed-preview.md`. Ainda confirmar nova CI.

Há trabalho NÃO CONCLUÍDO na árvore para carga incremental do Blockly: lotes com
cerca por workspace, cancelamento, proteção de histórico/save parcial e UI de falha
com retry. Os 150 exemplos oficiais, sete projetos dos cursos e fixture headless
de 10 mil blocos mantiveram seu conteúdo. Testes completos de navegador passaram
com 2 mil e 5 mil blocos (salvar durante carga, pagehide, reabrir, editar,
desfazer/refazer e executar). Isso NÃO fecha R2: todos os SVGs ainda são criados;
não há virtualização completa das partes do programa.

O novo caso real de 10 mil identificou estouro da pilha do structured clone nativo
do IndexedDB ao gravar uma cadeia muito profunda. Não aumentar quota ou deadline
para esconder isso. A fixture por áreas é um workload separado, ainda em revisão;
nunca substituir a falha de cadeia profunda por alegação de homologação global.
O fixture original está em `packages/studio/.cache/mission/incremental/long-chain-10000.json`.
Os logs locais ignorados `.cache-incremental-*` contêm resultados intermediários,
inclusive falhas. R1, R2, R4, R5 e as etapas seguintes continuam abertos.

### Resultado posterior, `ae6e348a6`

O run `44379411806` concluiu todos os browsers com sucesso, incluindo a regressão
Phaser. Runtime hospedado, auditoria e contratos Windows passaram. Contratos Linux
falharam: WebKit recuperou `in-flight-0`, não `exit-0`, no teste de pagehide real.
Portanto o ajuste da conexão quente NÃO fecha R3. O fixture agora observa os eventos
nativos de transação/commit em `window.name`, sem modificar a execução de produção,
para diagnosticar a próxima ocorrência. Localmente passaram Chromium e WebKit
(12 recargas imediatas e conflito de duas abas em cada motor), mas isso não elimina
a falha Linux.

R2 NÃO FOI COMMITADO como funcionalidade: as comparações de mesma máquina
encontraram regressões de 15,46→36,90 s e tentativas posteriores de 77,13/92,12 s
para 5 mil. Consultar `docs/qa/2026-11-18-studio-incremental-rejected-prototypes.md`
e seus JSONs. As hipóteses que pioraram foram retiradas do fonte experimental.
Há teste de fragmentação VERMELHO na ordem restaurada; não enfraquecê-lo nem
apresentar a árvore toda como verificada. A última suíte ampla desse protótipo
teve 4/5 casos de navegador aprovados e timeout de 120 s em 10 mil.

Baseline adicional em `C:/Users/tocha/projects/sistema-zero-studio-baseline-20261118`,
HEAD destacado em `ae6e348a6`. Só lê dependências por junctions da worktree da missão;
nenhuma alteração na árvore compartilhada original. Os servidores 5301/5302 são
apenas QA e precisam estar parados antes de comparar consumo de recursos ou de
encerrar o laboratório. Não confundir bundle antigo com fonte experimental atual.

### Checkpoint preservado e fora da PR

O protótipo inteiro, suas fixtures e a regressão vermelha foram preservados no
commit `582aa52b0`, branch remota `estudio-incremental-lab-20261118`. Não integrar
essa branch como melhoria aprovada. A worktree da missão voltou para
`estudio-missao-completar-20261118`; a PR não contém o carregador experimental.
Os servidores de QA 5301 e 5302 foram encerrados após verificar seus processos.

Para reproduzir sem tocar na missão ou na árvore compartilhada:

```powershell
git worktree add C:/Users/tocha/projects/sistema-zero-incremental-lab estudio-incremental-lab-20261118
cd C:/Users/tocha/projects/sistema-zero-incremental-lab
bun install --frozen-lockfile
cd packages/studio
bun test src/blockly/__tests__/incrementalWorkspaceLoad.test.ts -t fragment
```

Esse último comando deve reprovar (391 eventos, orçamento inferior a 64). Ele é
evidência de problema preservado, não um teste a enfraquecer. O checkpoint passou
typecheck; as medições e o E2E grande continuam reprovados. Os comandos e relatórios
do protótipo estão nessa branch e os relatórios também ficam na branch da PR.


## Continuação: perda nativa de journal e cópia síncrona

O run `44386420665` concluiu todos os jobs de navegador, runtime hospedado,
auditoria bruta e contratos Windows com sucesso. Contratos Linux falharam na
primeira recarga WebKit: `exit-0` foi capturado e o commit nativo solicitado,
mas reabriu `in-flight-0`. Não reinterpretar esse resultado como sucesso.

A correção atual evolui o mesmo journal/CAS com uma cópia síncrona imutável e
codec plano versionado. Não cria outra base de projetos. Conflitos conservam
o projeto original e arquivam o journal completo junto da cópia recuperada.
Quota negada não reconhece um save e solicita confirmação nativa ao sair.
Relatório: `docs/qa/2026-11-18-studio-synchronous-exit-journal.md`.

Verificação local final deste lote: 374 testes de estado/persistência, 2068
asserções; 43 contratos pedagógicos, 192 asserções; typecheck incremental sem
erros. Chromium/WebKit passaram 12 recargas por motor e conflitos de duas abas,
inclusive com aborto nativo injetado (18,32 s). Chromium verificou diálogo
nativo e retenção dos dados ao cancelar saída com quota síncrona negada.
A suíte completa e a falha Linux original ainda precisam passar no SHA novo.

O orçamento de 2.000.000 caracteres é somente da cópia de recuperação, não é
um aumento de quota do projeto nem uma promessa de durabilidade universal.
Sem essa cópia é necessário concluir save/export antes de sair. R3 permanece
em qualificação. R1, R2, R4, R5 e as etapas profissionais pendentes continuam
abertos; o protótipo Blockly rejeitado continua fora da PR.

Reproduzir o lote, dentro de packages/studio:

```powershell
bun test src/state src/persistence
$env:STUDIO_STORAGE_BROWSER='all'
$env:STUDIO_STORAGE_EXIT_FAULT='abort'
bun test src/state/projectStorageBrowser.test.ts
$env:STUDIO_STORAGE_EXIT_FAULT=''
bunx tsc --noEmit
```

O workflow executa o caso normal Linux antes da suíte e o caso de aborto em
ambos os SOs, conserva evidências separadas e não reduz a suíte isolada completa.


## Integração remota e qualificação subsequente

Origin/staging avançou até bfb24122c (45 commits); foi integrado na branch da
missão pelo merge c8a3bc9f2, sem conflitos. Não houve merge na staging local ou
remota, deploy ou edição autoral das frentes Pinta/Molda. O relatório de
integração delimita os contratos revisados, sem alegar revisão dos 538 arquivos.
O fingerprint canônico do runtime foi regenerado e --check passou; requer nova
imagem no GitHub. Os quatro E2Es de cenas desktop/toque, 23 testes map-2d,
10 contratos Pinta e o módulo real Pygame-ce 2.5.7 passaram localmente.

A revisão 9875bcabe conserva erro de acesso negado ao localStorage, para não
confundir cópia inacessível com ausente e abrir uma revisão velha sem aviso.

O run 44397955661 aprovou contratos Linux completos e typecheck, runtime
hospedado, auditoria e Firefox/WebKit. Windows contracts falhou no encerramento
nativo do helper WebKit, após confirmar todas as revisões. A causa foi reproduzida
localmente e o helper agora é explicitamente possuído/terminado pela API pública
do Playwright; não aumentamos o prazo nem reduzimos as asserções. Consultar
`docs/qa/2026-11-18-studio-webkit-test-process.md`. A aprovação Linux desse SHA
não qualifica automaticamente o merge ou a revisão de acesso negado.

Retomar pelos jobs do SHA mais recente na PR273 e preservar o bloqueio global.
R1, R2, R4, R5 e etapas profissionais abertas não desaparecem com esses resultados.


Qualificação local final após corrigir a ordem de terminação do helper:
376 testes de estado/persistência, zero falhas, 2075 asserções, 35,35 s;
typecheck após integração aprovado. Três repetições normais e três com aborto
passaram (144 recargas, 12 conflitos entre abas, seis diálogos de quota).
O primeiro arranjo de teardown ainda falhou, e foi substituído: não fechar o
último contexto WebKit Windows antes de terminar sua árvore pelo BrowserServer.
Esse processo pertence exclusivamente ao laboratório. O relatório preserva
as tentativas reprovadas e não afirma correção do WebKit nativo.


## Retomada após CI 44402766082

A qualificação do SHA 184b32782 concluiu com falhas em dois gates. Contratos
Windows reprovaram gzip inicial (120.603 > 120.000); não foi falha do teardown
WebKit, que passou. A correção 594cb6c3c adia somente a promoção/limpeza das
cópias síncronas, mantendo a captura de saída síncrona no coordenador existente.
Gzip local final 119.713, mesmos limites; 376 testes/2075 asserções e typecheck
aprovados. A guarda do grafo também passou (31 asserções). Relatório específico:
docs/qa/2026-11-18-studio-exit-recovery-loading.md.

A shard Chromium Linux 1 parou no gate Pinta touch ANTES da suíte principal.
O trace provou edição/exportação v5 antes de sair, seguida de formato v4 após
Voltar/reload/reabrir. A repetição local passou, mas isso não elimina o achado.
Não editar a frente ativa nem esconder o teste com espera; a pendência está em
docs/qa/2026-11-18-studio-pinta-reopen-regression.md. Os gates agora executam
independentemente: a suíte principal primeiro, Pinta depois mesmo em falha.

R1/R2 e as etapas profissionais permanecem abertas. Continuar implementação,
sem tratar o checkpoint ou a aprovação parcial da CI como conclusão da missão.

## Retomada após integrar 2ab6ff9479

O merge 4bf685ecc integrou as cenas versionadas e os contratos de recursos.
O relatório `docs/qa/2026-11-18-studio-remote-integration.md` registra as
verificações. A explicação anterior do teste Pinta foi refinada no relatório
de reabertura: o teste recarregava antes da conclusão assíncrona de Voltar;
o upstream passou a aguardar a galeria. Quatorze fluxos de cenas e dois fluxos
reais Estúdio/Pinta passaram localmente. Interrupção durante salvar continua
sendo um requisito distinto.

O run 44435310978 encontrou oito blocos de consulta de mapas sem exemplos e
corpus Python não preparado. Correções, evidências e limites em
`docs/qa/2026-11-18-studio-ci-review-followup.md`. A investigação de um clique
intermitente revelou também perda de foco do menu em scroll/resize, reproduzida
em teste antes da correção. Não se alteraram identidade visual ou caminhos.

O laboratório de persistência profunda está preservado no stash
`studio-v4-transport-lab-preserved`, criado na branch
`estudio-deep-storage-v4-20261118`, base 4bf685ecc. Inclui plano, codec de grafo
e transporte experimental; ainda faltam migração completa e qualificação nativa
com dez mil blocos. O produto permanece no namespace v3. Não integrar o
laboratório antes dessas verificações. Continuar por ele e pelos gates novos,
mantendo os critérios globais R1/R2/R4/R5 abertos.

A falha de observação do journal Windows foi reproduzida com diagnóstico:
três falhas em seis repetições, todas com a edição já confirmada no documento.
O teste agora exige uma revisão inédita, verifica sua ausência antes de esconder
e recarrega ainda escondido para comprovar recuperação. Seis repetições Chromium
e os três fluxos WebKit passaram. O host E2E usa Node 24, após reproduzir o timeout
de Bun no Windows; o prazo continua 120 s. Ver relatório
`docs/qa/2026-11-18-studio-hidden-revision-and-test-host.md`.

## Snapshot remoto 5da218d5c e revisão dos inventários

O lote 0ac36108d corrigiu os inventários dos quatro blocos novos por motor e
revisou o manual Avançado para 59.881 caracteres, dentro do teto original.
Foram 461 testes aprovados antes do merge. O merge f0a357d8c incorporou o
snapshot remoto 5da218d5c e foi verificado num worktree com dependências próprias:
491 testes de contratos, matriz protegida (43), seis fluxos Pinta/Estúdio,
typecheck, perfil de validação e bundle inicial (119.732 gzip) aprovados.
Relatório: `docs/qa/2026-11-18-studio-linked-worlds-integration.md`.

O laboratório de árvores profundas foi preservado em 8d92832b1, branch
estudio-deep-storage-v4-20261118. Dez mil registros passaram no IndexedDB nativo
de Chromium/WebKit, mantendo IDs/campos; o primeiro transporte reprovou o
orçamento inicial e não entrou na PR. A branch de laboratório seguinte,
estudio-deep-storage-boundary-20261118, separa decodificação rara de captura de
saída; os resultados finais e a migração ainda precisam ser fechados. Nenhuma
chave v4 foi ativada. O stash anterior continua preservado como histórico.
