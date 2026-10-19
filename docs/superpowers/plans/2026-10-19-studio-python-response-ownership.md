# Memória do leitor de arquivos Python

## Causa e mudança

O broker já transfere o `ArrayBuffer` ao worker. O leitor construía uma `Response` diretamente desse buffer, criando outra cópia dos bytes. A mudança usa um `ReadableStream` nativo de bytes: `enqueue` transfere a posse do buffer para o corpo da resposta. O tamanho é capturado antes dessa transferência para conservar `Content-Length` e o limite acumulado de 64 MiB. URLs permitidas, manifesto, integridade, ACKs, prazo, VM descartável e isolamento permanecem sob os mesmos contratos.

O primeiro candidato experimental deixou o tamanho ser lido depois da transferência e falhou no navegador: o buffer já estava destacado. Essa versão não foi aplicada ao produto. O experimento também corrigiu seu observador: uma microtask entre listeners não comprova que o leitor terminou; a inspeção funcional agora ocorre após a resolução das respostas. Nenhum observador de buffers participa da medição de memória.

## Evidência isolada

O controle congelado e o candidato passaram seis cenários funcionais em Chrome e Edge: consumo com hash, consumidores nativos de WASM/ZIP/JSON e quatro momentos de interrupção. Todos os workers foram encerrados. Recibo: `.cache/studio-python-l0/response-copy-ablation/run-functional-1792405489592-f580632e-a06e-4f66-9a66-8e980f0a0626/receipt.json`.

Depois foram executados quatro ciclos por navegador/variante, em duas repetições com ordem alternada e browser novo, sem GC forçado. Incrementos máximos de memória privada após o consumo nativo, em MiB:

| Navegador | Repetição | Controle | Candidato |
| --- | --- | --- | --- |
| Chrome | 1 | 132,30 | 113,50 |
| Chrome | 2 | 130,13 | 111,10 |
| Edge | 1 | 131,94 | 114,25 |
| Edge | 2 | 133,47 | 113,78 |

Recibo: `.cache/studio-python-l0/response-copy-ablation/run-memory-1792405717663-b3b26b71-1114-4b70-922f-2f7a1f3ee131/receipt.json`. A ablação usa arquivos reais, broker/store reais e compilação WASM nativa, mas não instancia CPython/MEMFS nem reproduz a topologia opaca completa. A redução sustenta testar o candidato integrado; não aprova o limite de 256 MiB do ciclo completo.

## Qualificação integrada

O produto recebeu a mudança após essa evidência. Uma regressão reproduziu a cópia anterior e passou após a alteração; outra verifica que cancelar corpos consumidos não apaga os bytes já contabilizados no limite total. Os focados de leitura/transporte/armazenamento passaram: 33 testes, 167 asserções.

O Bun 1.3.11 usado no CI apresentou comportamento diferente das APIs nativas do navegador em cancelamento BYOB e transferência de buffers. Os cinco casos que dependem dessas APIs executam sempre em um subprocesso Node 24, com fonte produtiva compilada, prazo e limpeza do diretório temporário; os demais continuam no Bun. Não há skip nem correção de produto para contornar o executor de testes. A execução final no Bun 1.3.11 passou 28 casos comuns mais cinco casos nativos; os dois wrappers não contam como comportamentos adicionais. Os 16 asserts movidos para Node preservam as verificações anteriores. Evidências: `.cache/studio-python-l0/native-boot-node24-final-receipt.json`.

Distribuição J construída: `b6aa091925ada4451bab383ceeaf92cb321e68b683d8f0de4b3abe0c9c6cef75`. Ela inclui a deduplicação de schemas da distribuição I e o novo leitor. O host mantém a leitura BYOB previamente medida. Os vendors não foram repinados ou modificados; nenhum limite foi ampliado.

**Limitação de compilador identificada antes do aceite:** essa distribuição foi compilada com Bun 1.4.3, enquanto o CI usa Bun 1.3.11. O bundle do frame mede 116.242 bytes nessa compilação contra 312.069 na anterior. Portanto, os resultados abaixo qualificam apenas esse artefato local: não comprovam o desempenho do artefato produzido pelo CI nem isolam o ganho do leitor. Uma nova distribuição, J-CI `996e6097c599d21c5d92fc7e9f03145f155d080a2d83f6d4aaa6a25785c0afd7`, foi construída com Bun 1.3.11 e aguarda repetição de smoke e ciclos nos dois navegadores. A versão do CI permanece inalterada.

A revisão independente não encontrou outro defeito no recorte. O smoke nativo passou 66 testes de inicialização, provider e Turtle nos dois navegadores. Em seguida, os 30 ciclos completos passaram sem alterar os limites:

| Medida | Chrome | Edge |
| --- | --- | --- |
| Incremento máximo de memória privada | 229.928.960 bytes (219,28 MiB) | 241.864.704 bytes (230,66 MiB) |
| Crescimento da memória retida ao final | −2,03% | −9,30% |
| Preparação aquecida P95 | 777,90 ms | 801,20 ms |
| Maior resposta de Stop | 1,90 ms | 3,50 ms |

Todos os ciclos encerraram seus workers e removeram seus frames. Relatórios: `.cache/studio-python-l0/runtime-response-j-lifecycle-chrome-20261019T103300406Z/report.json` e `runtime-response-j-lifecycle-edge-20261019T103357011Z/report.json` na mesma raiz de evidências. Os números são amostras dos processos do navegador nesta prova local de console; não são pico instantâneo nem medição de aula ao vivo com editor/vídeo/Turtle. A comparação isolada sustenta a redução de cópia, mas a diferença inteira entre execuções completas não deve ser atribuída a ela sem controlar a variabilidade do navegador.

## Repetição com a distribuição do compilador CI

J-CI `996e6097c599d21c5d92fc7e9f03145f155d080a2d83f6d4aaa6a25785c0afd7` passou os 66 testes de smoke e os 30 ciclos em cada navegador. O frame permanece com os mesmos 312.069 bytes da distribuição I. O servidor de provas Windows e os hosts de QA usam Bun 1.4.3 por um problema conhecido de herança de sockets no Bun antigo; o servidor recebe a distribuição pré-compilada, verifica seus 39 arquivos e não a recompila. Isso qualifica o artefato do runtime gerado com Bun 1.3.11, sem afirmar qualificação de todo o build Next/CI.

| Medida J-CI | Chrome | Edge |
| --- | --- | --- |
| Incremento máximo de memória privada | 252.338.176 bytes (240,65 MiB) | 240.283.648 bytes (229,15 MiB) |
| Crescimento da memória retida ao final | −1,78% | −7,51% |
| Preparação aquecida P95 | 752,70 ms | 805,30 ms |
| Maior resposta de Stop | 1,70 ms | 1,70 ms |

Relatórios na raiz `.cache/studio-python-l0/`: `runtime-response-j-ci-smoke-chrome-20261019T105101559Z/report.json`, `runtime-response-j-ci-lifecycle-chrome-20261019T105308577Z/report.json` e `runtime-response-j-ci-lifecycle-edge-20261019T105413964Z/report.json`. A revisão independente de integridade está em `response-j-ci-independent-review.json`. Quatro bundles consumidores incorporam também o leitor BYOB atual; a melhora integrada não é atribuída exclusivamente ao stream. Os limites e o escopo de console local permanecem os mesmos.

Tipos após a integração pedagógica passaram em Core, Members, Admin, Studio e MemberShell. O Studio foi novamente verificado após os últimos ajustes dos helpers nativos, com Node 24/TypeScript 5.9.3 e exit 0 (`native-boot-final-studio-types.log`). O catálogo de distribuição pública não foi alterado por este experimento. Ainda são necessárias as provas do runtime J-CI nos demais consumidores, inclusive publicação, exportação, análise e aula ao vivo; o computador de entrada continua reservado para a etapa posterior definida pelo usuário.
