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
