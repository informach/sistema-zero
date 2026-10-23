# Handoff — jogos de referência — 21/10/2026

## Situação e origem

HOLD por transferência de máquina. Não iniciar testes, serviços, navegador, Tk, Docker, build, TSC ou performance até o coordenador retomar o trabalho. Nenhuma janela antiga autoriza execução na máquina nova. Este relatório é documentação de continuidade; não altera jogos, observadores, critérios ou infraestrutura.

- Worktree: `C:/Users/tocha/projects/sistema-zero-python-games`.
- Branch: `feat/studio-python-games-acceptance`.
- HEAD: `9557e17bcafbe529d0079c8d941485b7f67061c4`; base `0226839ac`.
- Estado antes deste handoff: limpo. WIP novo: este relatório e seu manifesto JSON adjacente, sem commit/push.
- Thread Games: `01a15a4f-d555-7c81-80a2-a0fe887e9bbf`.
- Coordenador: `01a1452d-122a-7431-bc02-60003832b618`; worktree Root `C:/Users/tocha/projects/sistema-zero-python`.
- Root integra e faz push. Não resetar/rebasear esta branch nem copiar o cache antigo por cima de outro ambiente.
- Root informou integração mínima Pac-Man em `8c0bb250dc7660869c247f799f126e99e0e93d9c`, CI/deploy aprovados e checkpoint posterior `5503f6a`. São relatos do coordenador; esta entrega não revalida deploy nem congela o HEAD atual do Root.

O manifesto `2026-10-21-handoff-games-files.json`, no mesmo diretório, é a lista exata de arquivos selecionados, com caminhos absolutos, papéis, tamanhos e SHA256 medidos nesta preparação. Não contém cookies, tokens, storageState, .env ou logs brutos. Os arquivos permanecem em seus locais; nenhuma cópia de cache foi feita. `git-tracked` se obtém do histórico Git; `transfer-*` identifica a seleção de continuidade; `verify-existing-environment` documenta o ambiente antigo e não instrui copiar um venv.

## Entregue e limites das provas

### Correções e fonte

| Commit Games | Mudança |
| --- | --- |
| `3fb786474677ff8d7bc946dfddf8e53fc61eb058` | Preserva diagnóstico de falha de input Space no browser |
| `6f74df94b63748e538c06c68480651db7fc9dda5` | Loop Space usa um tick oficial Turtle ontimer e atende eventos pausado |
| `2e673524ffb04781c090a7e0b84247d12a482af0` | Conclusão QA nativa capturada na fronteira correta do callback |
| `9557e17bcafbe529d0079c8d941485b7f67061c4` | Pac-Man agenda encerramento uma vez por Screen após registro bem-sucedido |

Space atual é portable-audio1.2; Pac-Man é portable-audio1.1. A correção Pac-Man preserva física, ordem e delays16/2500/3000ms. Main Pac-Man SHA `3ccbfc081e26b5ac8c3bab5e44dae35841dc0cd54e956af81a3ca5d913edcb76`; corpus `689bbeced12887dd08a44765c0e49151be1cf78e273f910e7e380d9278b1609d`; gameVariants `37f1c769827aaac2d71ac757022e20e2293ba199c47d1fc6c2ee79f629d14ea9`.

Os testes focais já realizados constam dos documentos rastreados. Games verificou seis controles Python, dez testes Bun/84 expects e Biome em quatro arquivos para o último lote; Root relatou depois53Bun+6Python. Não repetir esses controles sem fonte nova/falha nova; isso não equivale a build/TSC completo nem aceite de jogo.

### Space: provas reais

- Browser1.2: input DOM real,19eventos trusted/13callbacks; p/P/c/C, pausa1,2064s com simulação congelada, Parar/reinício e cleanup de mídia. Root cache `games-space-input-eventloop-r1`; execução20/10 22:59:22–23:00:10UTC.
- Browser1.2: Q02–Q07 causais em lotes separados, distribuição `a8a6c625…`. Revisões próprias e semânticas Root estão listadas no manifesto. Não são uma partida completa nem prova de performance.
- Nativo1.2: Q02 em20/10 23:46:09.454–23:46:25.577UTC; Q03–Q07 em23:48:47.868–23:50:08.468UTC. CPython3.14.2/Tk8.6.15/WASAPI reais, Map0/Destroy1, áudio liberado, temp removido, export estável, errors[], sem deadline/sinal. Tela retirada por desenho do observador; não houve teclas físicas.

| Caso nativo1.2 | SHA256 result/native.json |
| --- | --- |
| Q02 | `d343310c94c9737faffee5c67e469f3e59388416ebdbdfcb1d3525fa6817bdd3` |
| Q03 | `a8c2d6b384778e3f55696cc6edadc30711af1081a43b8d16b0fb19101871d126` |
| Q04 | `02a3d5b7541b664dcaf9207213574bf884120a4500540102801b0ac77ab2de8c` |
| Q05 | `58fdeb3e161a94dbb1fe579683c7dec2745593fa9f0baf63e122c653b6219780` |
| Q06 | `134bcb7e4d099c158f01cbed82eee3b28f1f4c0ad54c18c78d2a92fc13524d45` |
| Q07 | `1580b85d7782a0b868375a3d0bbacd0eea57c68e16393ef90b0a93e0a0a1519f` |

### Pac-Man: provas reais e negativo preservado

Seis casos nativos1.1 positivos consolidados em `games-functional-r1/pacman11-native-consolidated-r1/receipt-index.json` SHA `7e6fd9f3b7d2c355e6379ef46087f117e8b7b689cf2f6906e0772f2b43fe012f` e `HANDOFF.md` SHA `f164bf1f362c468209697d0ebcfb5fedd362c650e470ec7d71458d0aaec48c84`.

| Caso | SHA256 recibo nativo | Escopo |
| --- | --- | --- |
| victory-near-end | `589a3752863d672851816f4a394ca1b751087e1b8b5ac5efe03815d711501f14` | Estado próximo da vitória injetado; bye3000 uma vez, encerramento natural |
| defeat paired | `71df7bed03744b94a250135002069d71d1e176fd71da7043feff08c4012fa937` | Diagnóstico aditivo de relógios; critério QPC>=3 preservado |
| pellet | `d0f14c5237b322dce724c8b47c8c07561d43488eb8c75f1ab94271546bb26ee1` | Injeção declarada; score+2/pellets355→354 |
| power | `9eb5018a8b8d22a758ffdd1f69fe61962c946599843249bd95403e0f0d96dbbf` | +50/speed5→8→5/reset_speed real3,012s |
| death | `399cb2dcaa6c0571920b12ba48cd708ddd22de3ca04a69ab9170c3a5d4e2aa77` | Colisão/lives2/respawn |
| observe | `cbd062901a54415ad751a455714407deb6a91311d62c46e593fbf52103555662` | Sete inimigos e quatro bindings autorais, sem teclado físico |

Negativo original defeat `479502a434ca9a59055aab22d5d54d65e5645537bb0debce3faaf068b40fea97`: QPC2,9973143999814056s falhou estritamente>=3, embora bye3000 agendado/disparado1/1, término natural e cleanup limpo. O lote parou imediatamente. O controle isolado de três timers e o diagnóstico paired posteriores não reproduziram o adiantamento. Causa segue não confirmada; não reclassificar o negativo como PASS nem relaxar oráculo.

No paired, Python26360 e launcher20136 foram registrados, mas o NodePID não foi capturado enquanto vivo. Há exit0 síncrono e testemunho de filhos exatos ausentes; não inventar PID. Nos quatro casos seguintes, os pares Node/Python foram29676/10180,23832/36704,30280/15828,29740/29700 e foram confirmados ausentes. Todos seis tiveram Map0/Destroy1/WASAPI/cleanup; quatro usam conclusão QA, dois término natural. Geometria32+AI10 anteriores pertencem à versão1.0; não ampliar sua validade à1.1.

Outros negativos históricos permanecem nos documentos/revisões: Space Q03r1 e ajuste r2, falha antiga de input antes do loop1.2, controlador Q06/Q07 esperava3 títulos para2 testes embora payloads tenham passado, e sampler/cache Root com risco estático de omitir CreationDate nulo. Não confundir falha de controlador com falha do jogo nem apagar os recibos. Não foi demonstrado que esse risco estático causou um falso PASS real.

## Pendências priorizadas

1. **Retomada da transferência:** Root confirma repositório/commits, hashes dos arquivos copiados, toolchain e memória no novo host. Venv e autoridades com caminhos antigos não são portáveis. Recriar/admitir ambiente sem alterar export/fingerprint/oráculos; emitir novo mapeamento de caminhos e janela.
2. **Space Q08-pause nativo:** pacote pronto, nunca executado. É um novo caso S08 no loop completo1.2: pausa/câmera/timerFPS/event-pump/resume/pools. Target18s estimado;30s cooperativo/40s externo; proposta60s. Sem autorização atual. Não repetir Q02–Q07.
3. **Pac-Man1.1 browser:** primeiro lote mínimo são os dois encerramentos serializados. Exige host atual, kernel comum de supervisão Root aprovado, configuração que descubra explicitamente Rootspec e autoridade nova. Um browser/uma página/um worker/retries0/maxFailures1. Os outros casos funcionais vêm depois por lote acordado.
4. **Space Q08-bgm:** separado do pause, ainda nunca executado. Replay autoral120000ms;150s cooperativo/160s externo; proposta180s. Exige revisão/janela/output próprios.
5. **Aceite de produto e estabilidade:** partidas completas/input/foco/raster que ainda faltarem, salvar→reabrir→executar, Pro/publicação/Mural, áudio ouvido,10min e30reinícios/performance. Pedagogia é de outra sessão; Root coordena integração e dependências infra. Não atribuir aceite global aos fixtures causais.

## Arquivos e artefatos indispensáveis

Raiz Games abaixo significa `C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/`.

| Artefato | SHA256 |
| --- | --- |
| `space-arena-canonical12-face-r1/source.zip` | `14b95ac84cf7eefc9ff3bdcd6abc6c743c230dd52c0632eaf2c1a0659608a6c1` |
| Space receipt.json | `9acc5ea7b0d1d4fc4f9239299df2062f39281a894d39a45dc8ba3238efa3d419` |
| Space inventory.json | `d70276fa5443b3617fcf44f4297503e6eb758f9ae3e8f7ac7f4a739c379224a5` |
| `pacman-canonical11-9557-r1/source.zip` | `8de6df6a881a579a6aed4918318cfb92ff249d99b361f924073cbfc9389f4ce9` |
| Pac-Man receipt.json | `4aff52e28081d67691c5fead0b8da1f59a0a87e83eb5d91a3c78b09a29debc09` |
| Pac-Man inventory.json | `be69c945a62b19ef5fa84d50abc98d09cbb6cdb59dea57e802a3be053b233e6b` |
| `games-functional-r1/space12-native-q08-pause-package-r1/packet.json` | `b6f60e6551dca748be2ee2cac3d3e09c3a5ad07592d8b429071c2c6164df9ac8` |
| Q08 PROPOSAL.md | `0a2484dd5823ce0a1c40f8ef39cd34036b4b51fd1690230bbb979b35073a6140` |
| `games-functional-r1/current-host-browser-package-r8/source-freeze.json` | `b4f70d586a34f2b1db2ca6a485d7364daad409abd4e5b40daf0881316711df7a` |
| `games-functional-r1/pacman11-browser-root-functional-r1/root-functional-inputs.json` | `33f3dcf586de866650ec61730c021e05df8670f1984b4930121f265dd89a65df` |

O manifesto inclui os arquivos específicos de observadores, propostas, recibos nativos (positivos e negativo), revisões semânticas e36paths rastreados alterados desde a base. Os ZIPs contêm mídias e módulo de áudio; são artefatos QA, sem nova autorização de redistribuição das mídias. Não é preciso copiar o cache inteiro, node_modules, venv, export extraído, perfis Chrome ou logs.

Distribuição browser reutilizável no Root: `.cache/studio-python-l0/final-c9d-r1/execution/distributions/a8a6c625e8c35552c66265f03a7de1bcda96f44306306206d2ac5f88366b6b4a`. São41payloads declarados no array files de distribution.json, mais o próprio metadado distribution.json:42arquivos físicos. A comparação de conjuntos confirmou que só esse metadado fica fora do array; os41payloads existem e seus tamanhos/SHA256 conferem. distribution.json tem13940bytes e SHA `988df6ad0cd9417365ab3fb5252be73c0cc2950e891de9299de3089c85575d3d`. Não há payload adicional nem divergência de bytes nessa verificação. O manifesto de transferência lista os42arquivos; Root deve transportar também o release/provedor/manifesto correspondentes pela frente infra. Release python-probe/probe-1, manifestSHA `0123ab8fd02e3aff2d4383fb8e8f93304c337d4018ad1263c21e8d1eafd0fb0e`. Isso não autoriza um host novo automaticamente.

O freezeR8 e packets antigos registram fontes/caminhos históricos. Não editar para fingir continuidade. Gerar novo binding/admission documentando o mapeamento e comparar bytes. Alguns packets dizem PROPOSED/NOT-EXECUTED porque foram congelados antes dos resultados; os recibos reais e o índice consolidado determinam o que efetivamente rodou.

## Dependências e credenciais

- Windows x64 para reproduzir o ambiente nativo observado. CPython3.14.2/TclTk8.6.15 oficiais. Novo sistema operacional/backend não herda automaticamente qualificação WASAPI.
- Node24.22.0 SHA `ba93f9a70bd86fce3ebbb39ec758501458453467aa92a34a0a3602d1e3fc2b9c`; Bun1.4.3 SHA `095db4abae203d42f29fdec26da4a882fcde6333cdd84e40c0c7828c0cf543f6`.
- Audio: miniaudio1.71, cffi2.1.1, pycparser3.11; setuptools84.2.0 para build. Instalar o pacote local de áudio do ZIP, preservando os sete hashes de sz_audio no packet. O pyvenv.cfg antigo contém caminhos absolutos; recriar venv.
- Playwright1.60.0; CLI SHA `79e23e6a249176295b8490567daa7717448a75866d6ea6f6b296ff3d23305c69`. Chromechannel e revisão exata precisam de admissão nova. Dependências conforme lockfile do commit de destino; não atualizar frameworks.
- Fixtures nativos locais não precisam de conta/token. Browser autenticado e salvar/publicar requerem conta QA e credenciais fornecidas pelo gestor de segredos; não incluídas. Pro depende de backend/WS/serviços da frente infra. Não copiar token, cookie, storageState, .env nem valores de configuração de nuvem.
- Variáveis da configuração browser: `SZ_GAMES_CURRENT_URL`, `SZ_GAMES_HOST_AUTHORITY`, `SZ_GAMES_SOURCE_FREEZE`, `SZ_GAMES_OUTPUT`, `SZ_GAMES_BUDGET_MS`. São nomes, não autorização nem valores de segredo. Usar origin autorizado e diretórios novos; nenhuma sessão de login é transportada aqui.

## Comandos de retomada

Os comandos desta seção são referências para a retomada pelo coordenador, **não para executar durante o HOLD**. Substituir caminhos somente por mapeamento revisado, preservar bytes e usar autoridade/janela nova. Não incluir os6fixtures verdes em um lote automático de retomada.

Verificar arquivos selecionados depois da cópia (o manifesto precisa de mapeamento se o caminho absoluto mudar):

```powershell
$m = Get-Content -LiteralPath 'C:/Users/tocha/projects/sistema-zero-python-games/docs/superpowers/plans/2026-10-21-handoff-games-files.json' -Raw | ConvertFrom-Json
foreach ($f in $m.files) {
  if ((Get-FileHash -LiteralPath $f.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $f.sha256) { throw ('Hash divergente: ' + $f.path) }
}
```

Q08-pause, argv completo do pacote existente na máquina de origem; último argumento deve ser um novo prazoUTC literal aprovado. O operador deve usar Start-Process Hidden/PassThru com esses mesmos argv para registrar NodePID/StartTime antes de aguardar e PythonPID de owner.json. Não executar diretamente sem essa captura:

```powershell
& 'C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/node-v24.22.0/node-v24.22.0-win-x64/node.exe' --max-old-space-size=384 'C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-functional-r1/space12-native-q08-pause-package-r1/run_space_arena_native.mjs' 'C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-native-env-r1/Scripts/python.exe' 'C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/space-arena-canonical12-face-r1' 'C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/space12-native-q08-pause-r1' 'Q08-pause' $NativeWindowEnd
```

Antes do filho: comparar packetSHA b6f60, os4files/3artifactPins/14nativeEnvironmentPins/7installedAudioMatches e NodeSHA; verificar relógio, RAM, ausência do output e40s completos restantes. O supervisor revalidaUTC antes do spawn. Existing pause elapsed>=1.2 continua estrito; se negativo, parar, preservar e diagnosticar sem tolerância/retry. O output Q08 ainda não existe na origem.

Browser: o comando Playwright abaixo só fica executável após Root fornecer a configuração comum aprovada/autoridade/host atuais. `$ReviewedRootGamesConfig` e `$ReviewedEndingTitleFilter` são dependências ainda abertas; não improvisar uma config nem apontar o config histórico Games para fingir descobrir Rootspec:

```powershell
& $PinnedNode --max-old-space-size=384 $PinnedPlaywrightCLI test --config $ReviewedRootGamesConfig --project chrome --workers 1 --retries 0 --max-failures 1 --grep $ReviewedEndingTitleFilter
```

Rootspec atual conhecido SHA `587b398827ce89f38a3bf7e9e5ebdc30664eedf44b5ee033923a7c26e5cb26ab`; Games spec SHA `fc1cd837710ae64db2d4ce0ef3537b5867e10931cefb2cdade0de089ffff0d5b`. Diferença: guards explícitos de arrays, não critérios. Root não tinha os dois paths `packages/studio/playwright.python-games-current.config.ts` e `qualification/current_games_host.ts` da worktree Games. O config histórico tem testDir relativo e selecionaria Games spec. Não criar novo supervisor/CIM/overlay/servidor: reutilizar o kernel comum Root após revisão.

Critério de endings browser: histórico inteiro de bye3000 named com scheduled1/fired1, mesmo relógio, elapsed>=3 e close natural uma vez; reset_speed é independente. Não aceitar apenas o último fragmento do histórico ou estados QA fechados como término natural.

## Recursos e cleanup

Nenhum processo persistente de Games está reservado/ativo ou serviço iniciado por esta preparação. Inventário pontual, quando disponível, consta de `resourceCheck` no manifesto; não é garantia sobre processos futuros ou serviços das outras frentes. Não há execução Q08 nem janela vigente. Root informou stacks fechadas anteriormente, mas deve inventariar a frente infra separadamente.

Na retomada, um Node pequeno e um CPython/Tk por caso serial. Heap384MiB não é limite RSS. Orçamento histórico sugeria1536MiB livres para nativo, sujeito ao preflight atual. Prova browser/performance requer orçamento novo no host potente; não reutilizar janela de20/10 nem tratar transferência como aceite.

Registrar START/END no topo do status local e diretamente ao coordenador; guardar identidades exatas, saídas e ausência pós-exit. Cleanup normal deve fechar Screen real, restaurar hooks, desligar áudio, confirmar export estável e remover só temp próprio. Exigir Map0/Destroy1/audioReleased/ownedTempAbsent/exportTreeUnchanged/errors[]/exit0/sem deadline/sinal. Kill forçado é NEG; nunca limpar por nome de processo ou apagar cache global. Não repetir para obter verde.

## Verificação deste handoff

Preparação apenas documental: arquivos selecionados foram lidos/hasheados, manifesto JSON validado e estado Git conferido. Nenhum jogo, observador nativo, serviço, browser, build, TSC ou performance foi executado. O coordenador recebe caminho absoluto e SHA do relatório/manifesto para consolidar com aulas e infraestrutura. Sem push.
