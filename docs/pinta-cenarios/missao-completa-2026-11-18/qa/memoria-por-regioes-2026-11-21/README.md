# Memória e histórico por regiões — 21/11/2026

Base `52ca47bbd345fb0968bd882aec904da59b735270`. Item 2 da continuação de
consumidores. O store público ainda aceita os formatos anteriores; estes testes
não promovem regiões para ele por casts nem implementam outro histórico.

## Implementação e revisão

`assetBytes` mede a capacidade efetivamente alocada de regiões e seus cabeçalhos.
Não usa a extensão lógica como tamanho de um vetor. `sharedAssetParts` enumera
cada buffer imutável de chunk e cada snapshot de arte; `snapshotShared` do editor
delega para esse núcleo. O histórico existente continua deduplicando por identidade
e descartando passos segundo o mesmo orçamento. Origem, conteúdo e flags não são
reescritos para medir memória.

Uma segunda causa apareceu na revisão: regras e propriedades das peças não
participavam da estimativa de recursos. `retainedAssetBytes` inclui esses dados
e as propriedades de camadas, sem serializar pixels ou células. O editor e novas
capturas usam essa estimativa; os limites continuam em 16.000.000 bytes no
histórico e 8 MiB/32 versões para recursos. As estimativas não são medições do
heap do motor JavaScript.

O leitor dos catálogos antigos conserva sua métrica de payload. Alterá-la de
repente recusaria projetos anteriormente válidos. O teste abre, exporta e
reimporta um catálogo legado cuja estimativa nova excede 8 MiB, preservando-o
integralmente. Acrescentar outra captura é recusado sem modificar esse mapa.
O contrato interno 8 e a migração verificam também os metadados antes de admitir
o catálogo. A função comum de leitura recebe explicitamente a métrica; não há
outro sanitizador com regras divergentes.

## Provas

Quatro reproduções do caminho anterior verificaram `NaN`, perda de granularidade
dos buffers e histórico que não descartava passos sob um orçamento pequeno.
O caso de propriedades demonstrou uma captura admitida acima de 8 MiB pela
estimativa nova; a correção recusa essa operação.

O núcleo atual mede dois chunks de 2 KiB num mundo lógico de cem milhões de
casas. Alterar um deles compartilha o outro por referência. Um documento de
32 camadas e 2.048 chunks ocupa exatamente 4 MiB de índices; cinquenta gestos
de um chunk preservam todos os passos de desfazer/refazer sob o orçamento
existente. No orçamento menor, dez gestos deixam exatamente cinco passos,
com redo íntegro. Mapas, conjuntos e recursos ligados compartilham as mesmas
identidades de payload.

Os 62 testes direcionados passaram com 299 asserções. Três ensaios Chromium
compararam os cinco módulos históricos reais com os atuais: 32 partes inválidas
passam a 2.048 buffers finitos no documento completo, e o descarte de passos
passa a respeitar o orçamento. Os perfis são desktop, viewport móvel e CPU 4×
emulados nesta máquina; o laboratório exercita funções reais, não a edição
regional pública nem o protocolo físico 3.

Suíte completa: 2.600 aprovados, três controles Pygame omitidos pela configuração
comum, zero falhas e 29.856 asserções em 230 arquivos (174,31 s). Pygame não foi
repetido neste lote de memória. Sete controles adicionais da oficina passaram,
incluindo pixels, captura, cópia de recursos, cancelamento, desfazer/refazer e
reabertura: cinco em CPU 4× e dois em desktop/toque. Total de dez ensaios sem
retries. Tipos completos do Pinta/Estúdio, Biome de 14 arquivos e diff passaram.
Os novos arquivos de laboratório e configuração foram incluídos nos verificadores
de tipos dos pacotes. Recibos, módulos históricos e fontes estão identificados
por SHA-256 no índice.

## Alcance

Não há novo limite de criação, estilo, formato público ou anúncio de leitor.
O ensaio não mede latência completa, heap, abertura, salvamento incremental,
dispositivo adicional, uso por crianças ou compatibilidade externa de regiões.
Árvore de camadas, remapeamento de peças/dependentes, store e IO continuam no
próximo item antes da promoção pública do documento.
