# Handoff — autoria Python/JS e seletor de staging

Preparado em 21/10/2026 para transferência a outra máquina. **HOLD: não iniciar
testes, serviços, navegador, build, TSC, operadores ou deploy nesta máquina.**
Este documento registra continuidade; não concede uma janela de execução nem
transforma recibos históricos em aprovação da composição nova.

## Estado exato e limites de ownership

- Worktree: `C:/Users/tocha/projects/sistema-zero-python-review`.
- Branch atual: `feat/qa-native-job-owner`.
- HEAD lido: `5c81f089edce0bc5822692a85fa7a0e8d1e4a597`.
- Antes deste handoff havia um único arquivo não rastreado:
  `docs/superpowers/plans/2026-10-21-qa-lessons-native-callers.md`. Pertence ao
  trabalho posterior de Memory/native QA; preservar sem escolher/resetar nada.
- Esta frente originalmente usou `feat/studio-python-authoring-review`; seu
  último lote próprio foi `360d21d4803d9b0fd75fe5440e57f54a167b54b8`.
  O worktree foi posteriormente reutilizado por QA nativo. Não trocar seu branch
  nem confundir esse HEAD histórico com o HEAD atual.
- Referência local `origin/staging`: `8c0bb250dc7660869c247f799f126e99e0e93d9c`.
- Root informou HEAD próprio `5503f6a245d2f2434fc91289fba05bbf6f229f29`, limpo,
  com sete commits QA/docs além de staging, sem delta produtivo nesses sete.
  Isso é checkpoint comunicado por Root, não checkout executado por esta frente.
- Coordenadora: thread `01a1452d-122a-7431-bc02-60003832b618`.
  Frente de autoria: `01a15a53-f486-74c1-84be-d4c84b80049a`.
- Não houve push, reset/rebase, alteração de provedores ou novo teste para gerar
  este handoff. Apenas leitura, hashes, manifesto e este documento.

## Entregue e efetivamente verificado

| Lote | Implementação e limite | Commit integrado / evidência |
| --- | --- | --- |
| Pinta canônico | Edição parte do recurso canônico, preservando identidade/bytes e evitando materialização incorreta. | `0076a9bc6`; Root registrou Pinta20/44 e demais recortes verdes. |
| Privacidade tutor/Zappy | Redação antes da seleção de trechos; Python com strings anotadas/prefixadas/multilinha. Expressões somente por parser e limites, preservando floor division; sem executar código autoral arbitrário. | `1964b56a3`; `tutorSafetyPython.test.ts` e `studio-zappy-python.test.ts`. Somente marcadores sintéticos, sem credenciais reais. |
| Rascunhos/persistência | Preservação de fonte e autoridade entre rascunho, salvar/exportar e reabrir. | `0000df948`; Root registrou37testes/106asserções de persistência/serviço e outros126 de contexto. |
| R20 extensão | Recusar remoção quando análise encontra referências conhecidas, com arquivo/linha; preservar fonte/Undo e permitir após correção. | `f9a638efc`; Root29testes/123asserções. Imports dinâmicos não demonstráveis não têm detecção geral prometida. |
| Browser Python Fonte/Ponte |16/16 reais, Chrome8 + Edge8, serial, zero retry/skip/flaky, fonte estável e cleanup. | HEAD `44a27bde60c6ccc5cc8d68e75310f54d172deafe`, distribuição `a8a6c625e8c35552c66265f03a7de1bcda96f44306306206d2ac5f88366b6b4a`; documento QA e recibos r5. |
| JS/Pensa/Pro | Criação/edição/Undo/salvar/reabrir; chegada tardia/recolher/reabrir missão sem remontar Monaco/Blockly. Pro exige símbolo ativo real antes de rename. | QA `c91f33a93` e `571ee793f`, depois conciliação com captura inicial de query. Oito alvos reais passaram de primeira no CI FACE, sem skip/retry desses alvos. |
| Seletor deploy | Diff desde onda ancestral CI+deploy bem-sucedida na mesma execução/tentativa; falhas de API/paginação/bootstrap recusam antes de provedores. Dispatch all/CSV/auto preservado. | Próprios `3454f0fa0` + `360d21d48`; Root `dd1ef3905`, depois refinamento canônico `e01924d04`/merge `65b6960d7`. Não restaurar helper antigo por cima deles. |
| Seletor: prova causal | Último push selecionava4 efetivos; backlog com bun.lock atingia18. Controle Git temporário→resolvedor→Bash real preserva18, com controles manuais. |70testes/157asserções verdes no lote original; revisão independente fechou run_id/path e validações Link/data. O número é histórico desse lote, não contagem dos refinamentos posteriores. |

O negativo browser r4 foi falha de cwd antes dos testes, preservado. O positivo r5
é outra tentativa; seu consolidado chama-se `authoring-review-receipt-r4.json`,
mas descreve r5. A revisão independente é o suplemento `-r4-review.json`.

A observação FACE teve uma lacuna antes da retomada real às23:57:41Z de20/10;
isso está registrado. A leitura final própria confirmou workflow e10jobs SUCCESS,
deploy concluído00:25:28Z de21/10; observer END00:28:34Z. Não inferiu serviços
publicados só pelo estado do job. Root recolheu os logs finais separadamente.

## Estado posterior confirmado com Root, sem reabrir itens fechados

Checkpoint Root recebido nesta sessão em21/10, aproximadamente08:06Z:

- CI `39548882315` terminal: nove validações e deploy SUCCESS.
- Bootstrap/source epoch e os18serviços reconciliados; cinco principais com
  última versão `8c0bb250d` confirmada por Root às07:31Z.
- Arquivo bootstrap presente: FACE
  `face8acef32f1e924f1461557e82716ea7acc3dc`, CI `39514471699`, tentativa1,
  deploy job `118956576693`, partição4CI +14extras +18ready. Contagens e arquivo
  foram lidos localmente. Seletor/CI não são pendências atuais desta frente.
- JS Pro hospedado: login/import/save/export parciais; preview excedeu o orçamento
  com WS aproximadamente2062MiB e terminou NEG. Cleanup normal, sem força.
  Investigação Vite/WASI preexistente continua; nenhuma causa raiz foi demonstrada
  por esta frente. Não classificar como leak confirmado nem aprovar desempenho.
- Par CF9e33 + imagem26b/old40ce ainda ativo. Piloto a8/7026, configuração2dc,
  promovido com quatro capacidades, **não ativado**. Esses identificadores curtos
  são referências do checkpoint; Root/infra fornecem os hashes completos.
- Leitura oficial NAMES-ONLY: duas variáveis de política Members e shared ausentes.
  Ativação, readback e revisão JS ainda pendentes. Não corrigir configuração nesta
  frente nem transportar valores privados para o relatório.

O recibo Root de execução funcional também foi lido: estado NEG,
`resourceProfile=hosted-functional-2048`, `functionalOnly=true`,
`performanceQualified=false`, `normalCleanup=true`, `operatorForceUsed=false`;
reconciliação CLOSED/remaining=[] na origem. Esse cache pertence à infra/Core e
deve ser incluído apenas pelo handoff desse owner, após sanitização própria.

## Pendências priorizadas para a máquina de destino

1. **Restaurar uma composição coerente.** Root deve consolidar seu HEAD, os commits
   QA nativo e o documento não rastreado. Validar manifesto; instalar dependências
   pelo lock. A `.git` de um worktree é um apontador para outra pasta: copiá-la
   isoladamente não restaura o histórico. Usar o pacote/bundle Git do coordenador.
2. **JS Pro funcional hospedado.** Confirmar a causa do NEG de preview e repetir
   somente o cenário e o risco alterados com o owner revisado. Máquina potente não
   autoriza relaxar orçamento/guard ou reclassificar os negativos anteriores.
3. **Ativação Python por infra/Core.** Resolver políticas ausentes pelo processo
   canônico; readback de configuração e identidades, smoke/JS de regressão e só
   então uso do piloto. Preservar runtime/manifest/profile/distribution reais.
4. **Admin/Kids/Python.** Plano `qa-lessons-native-callers.md` recomenda a rota
   staging após JS Pro: origins/runtime fechados, atores QA exclusivos, injeção do
   browser já owned e compilação Node dos mesmos cenários. Batch2b local segue HOLD;
   não criar Next/PG/host/chain só para contornar a composição.
5. **Mural/public play.** Provas reais publicar→sair da conta→`/jogar/id`, quatro
   percursos: JS clássico, JS Pro, Python clássico, Python Pro. Fonte/revisão/assets,
   input/pixels/Stop e áudio quando presente. Playground ou fixtures não qualificam
   autorização/storage/Hub público. Reusar o operador/atores exclusivos do owner.
6. **Desempenho/estabilidade final.** Anexo original/F6,30ciclos, latências e memória
   incremental, sem converter o perfil funcional2048 em prova do perfil estrito.
   Segunda máquina fraca e celulares físicos continuam com o adiamento autorizado.

Jogos, pedagogia, aulas/Admin/live e infra têm owners próprios; este relatório
informa dependências, não transfere a autoria dessas implementações para esta
frente. Não refazer critérios pedagógicos, jogos ou frameworks.

## Comandos exatos para continuidade, não executados neste handoff

No PowerShell da máquina nova, substituir somente o caminho do checkout:

```powershell
Set-Location -LiteralPath 'C:/CAMINHO/checkout-consolidado'
git status --short
git rev-parse HEAD
git branch --show-current
node --version
bun --version
```

Após Root fechar o pacote/freeze e liberar o preparo no destino:

```powershell
bun install --frozen-lockfile
node --check scripts/ci/staging-deploy-baseline.mjs
bun test ./scripts/ci/staging-deploy-baseline.test.ts ./scripts/ci/staging-deploy-transport.test.ts ./scripts/ci/staging-deploy-backlog.test.ts ./scripts/ci/staging-deploy-workflow.test.ts
bun test ./packages/studio/src/studio/tutorSafetyPython.test.ts
bun test ./packages/studio/src/python/extensions/removalReferences.test.ts
bun test ./packages/studio/src/python/extensions/operations.test.ts
bun test ./packages/studio/src/python/blocks/workspaceDraftPersistence.test.ts
git diff --check
```

Os arquivos sensíveis a globals Blockly permanecem em subprocessos separados.
Não agrupar arbitrariamente toda a suíte Bun. Para inventário, sem browser:

```powershell
Set-Location -LiteralPath 'C:/CAMINHO/checkout-consolidado/packages/studio'
node scripts/test-isolated.mjs --list
```

Para verificar os arquivos copiados, antes de qualquer teste:

```powershell
$continuity = Get-Content -LiteralPath '.cache/authoring-handoff-20261021/continuity-manifest.json' -Raw | ConvertFrom-Json
foreach ($entry in $continuity.files) {
  $actual = (Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $entry.sha256) { throw "Divergência de continuidade: $($entry.path)" }
}
```

Esse verificador deve rodar na raiz do snapshot correspondente. Se Root integrar
outro HEAD antes da mudança, gerar um adendo de pins; não editar este manifesto para
fingir correspondência. Recibos históricos conservam seus bytes e horizontes.

Não existe comando START transferível de browser/infra: novos caminhos/binários,
PID/FILETIME/Job, IP/origins, janela e binding precisam ser ligados à máquina nova
pelo owner. Não executar `.cache/authoring-browser-r*/run.mjs` nem os operadores
JS antigos: têm autoridades e caminhos fechados/históricos.

## Dependências e credenciais — somente nomes/contratos

- Bun pelo lock/CI1.3.11; Node24 no owner hospedado, PowerShell7.5+, Git e Git Bash
  para o controle Bash em Windows. O r5 antigo usou binários diferentes pinados;
  seus hashes provam o histórico, não substituem o preflight novo.
- Playwright/Chrome/Edge e builds dependem da versão instalada e do lock. Recriar
  no destino; não copiar node_modules, caches de browser/perfis ou executáveis como
  se fossem uma instalação válida. Histórico r5 exige distribuiçãoa8a6 pinada;
  execução nova requer o binding/distribuição atual do coordenador.
- Unitários acima não precisam de credenciais de provedor. O resolvedor usa
  GitHub actions-read/contents-read (`GH_TOKEN`/`GITHUB_TOKEN` no job) e checkout
  completo; não chamar CLI de push manualmente contra provedores para obter verde.
- Fluxos hospedados precisam de atores QA exclusivos, sessão nova e bindings
  per-service/runtime. Credenciais Railway/SSH (`RAILWAY_TOKEN`,
  `RAILWAY_SSH_PRIVATE_KEY`, `RAILWAY_SSH_KNOWN_HOSTS`) e Cloudflare ficam no cofre/
  mecanismo do owner. Provider envelope privado via stdin+EOF, uso único, prazo e
  limites originais; nunca env de Node/Chrome, argv, transcript ou arquivo portátil.
- Não transferir tokens, cookies/storageState, perfis de navegador, chaves,
  envelopes, `.env`, grants antigos, entradas de credencial do Git nem logs brutos.

## Recursos e política de transferência

Esta frente não possui serviço, browser, Docker, listener, observer ou janela ativa.
Observer FACE já encerrou, e os filhos de revisão terminaram. Não fiz uma varredura
global nova nem afirmo que todos os processos do host são meus/estão vazios.
Root ordenou HOLD global para transferência; não parar processos alheios por nome.

Perfil hosted estrito permanece1024MiB, reserva OS512MiB, admissão1536MiB.
Perfil explícito funcional2048 permite2048MiB, admissão2560MiB, sem qualificação de
desempenho. Heap768, amostra500ms e330/355/360s do owner continuam. Máquina mais
potente permite preparar nova janela; não muda silenciosamente esses contratos.
Local2b (pool2048/browser1024/basegrowth128/admissão2688) não foi ativado aqui.

## Arquivos exatos e hashes para o pacote

Manifesto portátil: `.cache/authoring-handoff-20261021/continuity-manifest.json`.
SHA-256: `0f069bb51edf9cbf85fb37b0e85ea5855c884b3b3df9c2f39822aa55568fa24b`.
Contém64entradas:53de snapshot/documentação e11recibos JSON históricos. Os arquivos
rastreados devem vir do Git completo consolidado, não de uma montagem parcial
desses53arquivos; a lista identifica os pontos indispensáveis desta frente.
O documento de callers não rastreado é explicitamente marcado para preservar.

Além dessas64entradas, incluir este relatório e o próprio manifesto. Não copiar os
diretórios de cache inteiros. Os JSON escolhidos foram lidos; uma checagem de campos
comuns de segredo/log bruto não encontrou token/password/authorization/cookie/
privateKey/storageState/stdout/stderr/rawLog/stack preenchidos. Isso não substitui
a revisão final do pacote pelo coordenador.

Os recibos podem referenciar caminhos/hashes de logs originais que **não** fazem
parte da transferência. Negativos continuam preservados no arquivo de origem;
não executar de novo nem apagar para limpar o pacote. O recibo antigo do seletor
diz bootstrap ausente no seu horário; o arquivo atual reconciliado prevalece para
estado atual, sem reescrever o recibo histórico.

Lista literal abaixo; caminhos relativos ao worktree indicado no início.

| Arquivo | SHA-256 |
| --- | --- |
| package.json | 535d00ee2316939dbb991f9d524e85bb743811774beec115ae206c107c3358d5 |
| bun.lock | 8a989c05e39bd7697878ee147575ff00dfa7830d6d0e96b3abbbdad14cb47dfd |
| docs/qa/2026-10-20-studio-python-authoring-browser.md | 800b140d4b675944efbb755e4503bcc8a1c3327d6a1cc953d9e30e9ef5c841f8 |
| docs/plans/2026-10-16-estudio-python-validacao-entregas.md | d4e5bdf531641216236065a9e15bafeb3b33f61a31f39fcb3582d02616f6131c |
| docs/superpowers/plans/2026-10-19-studio-python-final-acceptance.md | 818bd436676673b2c88d791db0864cfb11ace4fc3621300d904fd3cde299b8ff |
| docs/runbooks/staging-deploy-baseline.md | 2e6136a18ee06eedb41237f261fe31e6811ebf4a8db0ec202916e940516b0a98 |
| docs/superpowers/plans/2026-10-21-staging-successful-baseline.md | 84b21818a3896bfe66843dcddedf595d1c34e99093b9e4e606f3645ffcd79933 |
| docs/superpowers/plans/2026-10-21-qa-windows-native-job-ownership.md | 81c29c2c3755570e22991906e4d2212ed81598802dfaa3d20c7d5e10c2051cb8 |
| docs/superpowers/plans/2026-10-21-qa-lessons-native-callers.md | 750876520a847890ea7b3bc76a6c499df0e16ede0c0002808606f7eb8c8475d4 |
| .github/workflows/ci.yml | c1a3985d267c6bad0e05be8fe7a250780b49dd7c53b5c5dac29016d152717e40 |
| .github/staging-deploy-bootstrap-v1.json | 618957438f7326eed40592d3b97652c011e0cc6542d1108d2747106c1335c475 |
| .github/staging-deploy-epoch-v1.json | 4c506f5d3a2367ee3b6e104f1a0dcab9a5d096f6758ac48cc48855a1b916baf1 |
| scripts/ci/staging-deploy-baseline.mjs | fff676a2b385fcc4fb7d2a0e4bd23b347e960c57638cd27290f6de4114cc38ed |
| scripts/ci/staging-deploy-baseline.test.ts | e66c0dd93c6e1498c8f02087d4a618825bbee7c98c98b854a8e3a1a812b9b35a |
| scripts/ci/staging-deploy-transport.test.ts | 5d8cdfbf95679d26585fc71e013314944d5475fb2dc53f053b3882a57beb1f1d |
| scripts/ci/staging-deploy-backlog.test.ts | ecc48a21d4908ef92a8408fc5a90834f713b4821514d0d385bacf549a2ccd256 |
| scripts/ci/staging-deploy-workflow.test.ts | 10fe03b7cc568ab29996c7bd141b3cdcf4b40d75989577a39f30dc0dfd5dedac |
| packages/studio/src/components/assets/AssetsPanel.tsx | eeff1503cc26d810ae78a0a2fff1b174aaa0b8e8a3c38626a7906b969952bcf3 |
| packages/studio/src/components/assets/__tests__/AssetsPanelEditDrawing.cases.tsx | f782a67af418d46260543ee232346a3267bd477df6b6d0c4d068c7bd3f6157f4 |
| packages/studio/src/studio/tutorSafety.ts | 78bb4a4a31b44866b0b28bbff4f054df9206111e76836f5f427279827775fb62 |
| packages/studio/src/studio/tutorSafetyPython.test.ts | 8454a9b09e24cfeeabb1b670d44fbd63c074f5233162b15fefd7d9cd27f3492e |
| packages/studio/src/studio/tutorProContext.ts | d1ebbf161bb000d5928576f13af1a33b816e9a06eeb28dad22a3a497c85a463b |
| packages/member-shell/src/server/zappy-python.ts | 8b76d3d9c1c5f3f1b4989ad502ed4e352c6eb13d5cd6410063ea8773eb7cdd66 |
| packages/member-shell/src/server/zappy-safety.ts | e49a3b71dd2f867880ef9880c3b986f54977ae10b294f64d80bb2156d528efed |
| packages/member-shell/tests/studio-zappy-python.test.ts | daada532252422317f067305f330accbb59d54c9dec923847a878bca623ee847 |
| packages/studio/src/export/pythonWeb.ts | b24dee6bbbfd53df1c9cb4f218ecc87fcfcd4fe5e64afe9b2c2d8d8d79758f25 |
| packages/studio/src/persistence/service.ts | 36b266a27d5dd3ad0f6f94d737b262cc92c14e5add8bd8aa9c667d1ab0adbc74 |
| packages/studio/src/python/blocks/workspaceDraft.ts | a8dddc0704e27819c62ec11a489b21e3b535df7df1b40bb3fbcdf45fa6928d60 |
| packages/studio/src/python/blocks/workspaceDraftPersistence.test.ts | a6d6b784e3e93e1d0602ef1806176f46e4bfb2bdb7536f5dd0302370d181e67f |
| packages/studio/src/state/bridgeAuthority.ts | 89cf07106c344119e31291df2547e90a3093ff3938ba52c450c40147d0f0c48b |
| packages/studio/src/state/persistence.ts | 7d00a4eccb5b8d6f547a8457cbbee9dbb268776579887a330d310c0fdc8c5a13 |
| packages/studio/src/state/projectStore.ts | 879a5cb3af7b6ebe2f35c6961e15f348a602d40a4f39ea32d75beadab37dd2ea |
| packages/studio/src/python/extensions/operations.ts | 32b48449909732d5d7692c6b1172d4f841e5bcf5456db7b4d8297e87196378b9 |
| packages/studio/src/python/extensions/operations.test.ts | 34b50a28d526e0876a269922a31a6f73a82c89db50c8bc22a09181dbf4888af0 |
| packages/studio/src/python/extensions/removalReferences.ts | d5f8b247281cbe1f5f7371621d67814222a1dcaee92cc1b6afc1f77e1ed8b29c |
| packages/studio/src/python/extensions/removalReferences.test.ts | 4de4856757f7252dfd0a3341c4ffc631452f0a03c511e91be8a8a8c5f9c938f3 |
| packages/studio/src/components/extensions/PythonExtensionsPanel.tsx | fad20aa2bc323cad856f135797019184594acf9771c972d2fa9fc731c8585cb1 |
| packages/studio/src/components/extensions/PythonExtensionsPanel.test.tsx | 1644be1240413d9300a27a8260b02531e3bf4a0c2e69d78e50125e32469c7521 |
| packages/studio/e2e-python-editor/extension-removal.spec.ts | 1277b9f96208674a8a6d02a67253127973fdbe3283d2cceface2f9329feba4cd |
| packages/studio/e2e-python-editor/source-editor.spec.ts | 755b4fc3f24d41eb1638b615750d4bc1db59c5b4a6b820a1d4a5a09a0a6c2e07 |
| packages/studio/e2e-python-editor/bridge-workspace.spec.ts | 4e1a497d7a64bad00f653e79baf115c982e2933e7fdc1f3d799b7f179a238d7f |
| packages/studio/playwright.python-editor.config.ts | 803ec55e290ae1c145e61afc424352885e9c9336da9af976d45381b15bf839e2 |
| packages/studio/playwright.python-bridge.config.ts | ad7966ad99a3eebba827e59a733af9d0fe99ffac0a37538f2274e9648de165db |
| packages/studio/e2e/smoke.spec.ts | 3396088b5a761a2a7168b5cfcb1a88b20d625d99b5a5fba0e5dd51f7916a2ab4 |
| packages/studio/e2e/pro-workspace.spec.ts | 9307a729cf930d6e6a898ea772990933804e38b69de196ba70fd9cc7e5391f39 |
| packages/studio/playground/App.tsx | b7167aae7ec78b393215f0b5d5c7b608fcbe0f701b5e5816170ab70fa8c88d52 |
| packages/studio/playground/LandingApp.tsx | 2d3480fa412895e052d92ff3352303572c4e859ca83d1f11dd172c04328c4d51 |
| packages/studio/playground/initialQuery.ts | 2f38e4228d3dd5d7d229424b89e487ad9b25fe6c122efb3abcebfe208a54370e |
| packages/studio/src/playground-navigation.test.ts | 2bf350369ebb216ca469dd75b57ab91a3ca05a94c10128527f11c82a5c68cbe7 |
| packages/ui/tests/tool-chrome.test.ts | 6804907930a1ace5847f802d7cf6a280b0a7c2b0f527ac50f7fc2e64f0897ece |
| packages/ui/src/styles/tool-chrome.css | d86019d3f3354ed03311023281199a791c795cee674b9a0202ac61afa91481f7 |
| packages/studio/playground/styles.css | 7e9dc591edb42e6210da09cc57453d5c287dc32ab6dd628b1935802f7451bd91 |
| packages/studio/scripts/test-isolated.mjs | 887e11fe0fb3658810b1b179a0fbf490cb9263a426b19ec640baffa8d93a51c6 |
| .cache/authoring-browser-r4/receipt.json | 03154e7308c99e40113997776fbe4842364bf57132a860187765695119956966 |
| .cache/authoring-browser-r5/preflight.json | aa0ae31ccd162b377b6ef942bab472533d670ca50bdee4e2cd664f259a811172 |
| .cache/authoring-browser-r5/receipt.json | 6a8bcbf3f8acc3f214a67696b4de38f8687079b6a66dcca800248030efc994cf |
| .cache/authoring-browser-r5/cleanup-identity-check.json | c254b3c041c60c747acdb68c74e6001abbfe916e0ffa9f3c1f026d90bee8fb61 |
| .cache/authoring-review-receipt-r4.json | c36c90bd503e957e51fe67dc8b8760dfa100b4862ed4797dd2c5131b1600dc39 |
| .cache/authoring-review-receipt-r4-review.json | c2989ab6ebcdcff3e4c91f7dd95b37363e7d1e27a5651413d7f18abdb5f591f7 |
| .cache/authoring-172-convergence-r1/receipt.json | 07f6554f1b28c7041c001527f1cd024b6bacd88b704875e60186223ec3d01797 |
| .cache/authoring-js-ci-face8-r1/observer-final-attempt1-20261021T002834125Z.json | 58acbeb3cb65842cf4a8d4c9d204f3139d1d51feee6f14116e08745dba2654fe |
| .cache/authoring-js-ci-face8-r1/parent-eight-targets-receipt.json | a6b337f666a0ab26146a3c051d48da1a95fdaec7bced719dfe5452f1d3e04c39 |
| .cache/authoring-js-ci-face8-r1/source-qualification.json | 9f89ee85532029b76b6d47d5232f3ecb463e56fccc22f34f09657e330ce3037f |
| .cache/authoring-selector-backlog-r1/handoff-r1.json | f9c44a91457c0290f231b5657882ce0a9f40159e53ca01e3f6c8375c03bb0e8d |
