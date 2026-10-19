# Experimento H — antecipar metadados da release Python

## Hipótese

No trace F1 da distribuição D, o iframe termina de carregar `frame.mjs` em aproximadamente +323 ms, enquanto o worker só começa em +451 ms. O host espera o aviso `python-frame-ready` para então buscar e verificar os metadados públicos da distribuição, antes de iniciar o worker. Esses ~128 ms podem estar no caminho crítico do primeiro desenho. A meta continua sendo 1500 ms para a execução após edição, com nova VM e worker, iframe de origem opaca, release pinada e autorização nova por execução.

## Alteração isolada

`session.ts` inicia a leitura e verificação dos metadados públicos assim que recebe a URL já aprovada do provider e assume o iframe. A operação usa o mesmo `bootSignal` cancelável, a mesma verificação de distribuição/SHA e a mesma origem; a promessa é aguardada só depois que o frame confirma challenge e suporte ao canal de boot. Nenhum snapshot, recurso executável ou autoridade é enviado ao frame antecipadamente. Um frame legado sem canal cancela a leitura especulativa e segue seu caminho anterior. O erro de leitura continua a falhar a preparação; a rejeição é observada para não produzir uma promise rejection solta enquanto o iframe carrega.

## Evidência inicial e decisão pendente

O contrato RED é a série anterior D: 13/13 funcional, mas 2/10 amostras editadas acima de 1500 ms (p50 1480,7; máximo 1563,8). O primeiro smoke de H passou 1/1 Chrome Pro F1, sem profiler, com frio 8449 ms, cache 1563,6 ms e editado 1446,3 ms; o servidor entregou 826199 bytes editados como em D. Recibo `.cache/studio-python-l0/parallel-c-f1-early-deployment-h-smoke-20261019T045045275Z-receipt.json` e report anexo. Uma amostra não aprova desempenho.

## Resultado e reversão

A série completa, sem profiler/retries/skips, passou 13/13 funcionais em Chrome Pro F1 (3 aquecimentos + 10 medições), usando a mesma distribuição D pré-construída. Frio e cache cumpriram seus limites em 10/10. Editado: p50 **1450,85 ms**, mas **2/10** amostras excederam 1500 ms (`1728,8` e `1547,2` ms). A primeira é pior que o máximo D anterior; o ganho mediano não satisfaz a confiabilidade exigida. Recibo `.cache/studio-python-l0/parallel-c-f1-early-deployment-h-series-20261019T045253790Z-receipt.json`, report no diretório correspondente. A revisão somente leitura não encontrou achado concreto de isolamento/cancelamento, mas os cinco gates de lifecycle não foram executados porque a meta principal falhou.

**H rejeitado e revertido.** `packages/studio/src/runtime/python/session.ts` voltou byte a byte ao objeto Git `6df869247ce6f94f1d22a579e88c4de72d6acf7e` (`git diff --exit-code`); a distribuição D não foi reconstruída nem alterada. A hipótese de que antecipar só os metadados removeria a cauda de latência foi refutada neste cenário. A meta editada, o timeout histórico de preparação e o frio Ponte continuam abertos.
