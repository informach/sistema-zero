# Sugestão de pesos: baseline do lote 109

08/09/2026. Windows, Bun 1.3.11, AMD Ryzen 5 5600G. Comando:
`bun scripts/bench-scene-skin-suggestion.ts`, em `packages/molda`.
Sem builds ou suítes executados por este agente durante a medição. Há outros
processos na máquina; resultados não isolam o sistema operacional.

Cada caso tem dois aquecimentos e cinco amostras. Malha com quatro pontos de
superfície e os demais pontos soltos, cadeia de juntas, sem imagens ou clipes.
Todos os pontos precisam de pesos no contrato nativo. Cálculo em worker real;
tempos são de CPU/transporte Bun, não eventos de navegador, GPU ou toque.

| Pontos / juntas | Preparação ms (mín / mediana / máx) | Chamada síncrona ms (mín / mediana / máx) | Total ms (mín / mediana / máx) |
| --- | --- | --- | --- |
| 1.024 / 16 | 0,880 / 1,066 / 1,600 | 0,581 / 0,914 / 1,024 | 37,384 / 42,482 / 58,170 |
| 8.192 / 64 | 4,766 / 5,886 / 9,998 | 3,700 / 4,251 / 5,405 | 88,097 / 93,809 / 103,871 |
| 131.072 / 256 | 74,767 / 83,478 / 94,122 | 74,914 / 84,032 / 105,832 | 2.865,461 / 2.990,598 / 3.139,920 |

Preparação inclui indexação e snapshot de posições mundiais. Chamada síncrona
inclui captura/validação próprias e postMessage. Total inclui ambas as etapas,
inicialização/execução do worker, retorno e expansão/validação dos pesos no caller.
O benchmark ainda não isola o custo síncrono do leitor da resposta.

Fontes ficaram idênticas e buffers de entrada continuaram anexados em todos os casos.
Sem baseline anterior, não há alegação de aceleração. O caso extremo justifica
perfilamento e redução de trabalho no caller antes da conexão aos controles.
