# Materialização Pinta: evidência L0

Experimento isolado; não é entrega L5A. Fontes reais do Pinta produzem o baseline. Saídas e traces completos ficam no cache local, sem assets de alunos.

| Alteração isolada | Impacto | Confiança | Esforço | Pontuação |
|---|---:|---:|---:|---:|
| Rasterizar cada tile uma vez | 5 | 5 | 2 | 12,5 |
| Composição/PNG em worker | 4 | 5 | 3 | 6,7 |

Baseline `pinta-a9b9203e-4549-4c84-b479-451864325c5c`: mapa 2048², 128² células, 2 tiles × 64 retângulos. Conversão 5106,9 ms; trace UpdateLayoutTree 3081 ms, EventDispatch 1804 ms, Paint 476 ms. A tentativa original de 30 amostras excedeu 120 s e foi preservada como falha (`pinta-e01c27df-9316-4187-89d5-835c0536d756`); não há p95 baseline válido.

Primeira alteração `pinta-4c77f6aa-b183-448d-8136-49ef64e11b04`: 30 amostras, mediana 82 ms/p95 100,2 ms; pintura ainda teve intervalos p95 66,9 ms. Profiling separado atribuiu 32 ms à composição e 75,9 ms à codificação PNG em uma amostra. Mover só essas fases para worker acrescenta custo de inicialização, mas reduz bloqueio da interface.

Segunda alteração e cancelamento `pinta-757c063a-f2fc-426d-8a6f-7214a2cc74b8`: 30 amostras, mediana 96,7 ms/p95 120,9 ms/máximo 125 ms, rAF p95 16,8 ms/máximo 17,1 ms. Trinta cancelamentos depois de trabalho confirmado, resposta máxima 0,3 ms. Os294ms mediam **drenagem ao final do lote**, não encerramento individual (review006). Não são medições da máquina de referência nem em aula com vídeo.

Após a correção da coleta, `pinta-975a3769-0d65-4020-bbb5-4a4e90eb6fcc`: 30 conversões, mediana98,5ms/p95146,1ms/máximo164,1ms, rAFp9516,8ms/máximo17,3ms. Cada worker cancelado foi identificado e acompanhado até Target.targetDestroyed antes da operação seguinte; maior limite superior de liberação146,99ms, contando conservadoramente desde antes da criação. Quatro diferenciais com65536 componentes RGBA cada (transparência/sobreposição, clipping/contorno/rotação, gradients comIDs repetidos e masks/hidden/layers) tiveram zero diferenças. PNG golden e três imagens no Tk continuam válidos; outras formas/fontes/limites e integração L5A ainda precisam de qualificação.

## Preservação observada

- Ordem: `flattenLayers` existente resolve células; composição percorre linhas/colunas na mesma ordem. Nenhum comando descartado.
- Desempate: resolução de layers usa a função existente, sem nova prioridade.
- Ponto flutuante: rasterização do tile continua com a serialização vetorial existente, escala 1. Igualdade geral de formas, recortes e transparência exige diferenciais adicionais; a fixture abaixo não prova tudo.
- Aleatoriedade: não usada.
- Golden: SHA256 PNG `1d7d1bfac5908681efb4fb004d2540364d51e0e0ac27085853c7dd67130c5de9` idêntico no baseline e nas duas alternativas. Arquivo aberto no Tk oficial; dimensões, cores e alpha conferidos também no browser.
- Recursos: worker próprio por conversão, `finally` encerra worker/bitmaps; AbortSignal rejeita sem material parcial. Em caso de cancelamento, destino não é persistido.

Antes de promover ao produto: diferenciais de tiles transparentes, clipping, rotação, shapes compostas e layers; validar limites publicados; review. Rollback experimental consiste em selecionar o método `svg`; nenhuma alteração de produção foi feita. Commits finais respeitarão lotes revisados, conforme autorização do usuário.
