# Conversão dos materiais Python — prova local

Recorte: nove materiais originais do Space Arena, 24.971.993 bytes, Chrome e Edge neste computador. Não é qualificação do editor com chamada de vídeo nem do computador de 8 GB.

O perfil de CPU `runs/2026-10-16T23-46-45.497Z` atribuiu aproximadamente 2,8 segundos à conversão em `decodeProjectAsset`. Esse harness prepara o snapshot duas vezes (identidade e provider), portanto seus 4,55/4,63 segundos de preparação não representam uma conversão isolada, nem um p95. A instrumentação faz parte do custo.

Oportunidade: copiar a string binária por índice em um `Uint8Array` pré-alocado, conservando `atob`, MIME e o ramo URI. Impacto 4, confiança 5, esforço 1: score 20. Única mudança de execução; não amplia formatos, quotas ou APIs. Ordem e valores dos bytes preservados porque `atob` devolve caracteres 0–255; índice UTF-16 coincide com cada byte. Empates, ponto flutuante e RNG não se aplicam.

Benchmark independente: três aquecimentos e dez conversões completas por navegador, sem profiler. Espera por frame e hashing fora do intervalo medido. Com dez amostras, p95/p99 são o máximo observado, sem alegação estatística além deste ensaio.

| Navegador | Antes p50/p95 (ms) | Depois p50/p95 (ms) |
| --- | --- | --- |
| Chrome | 1493,4 / 1551,9 | 98,2 / 101,2 |
| Edge | 1471,3 / 1571,5 | 99,0 / 112,4 |

Baseline: `runs/2026-10-16T23-50-57.466Z/report.json`. Otimizado: `runs/2026-10-16T23-51-58.668Z/report.json`. Ambos em `.cache/studio-python-runtime`. `l4-material-results.jsonl` em `.cache/studio-python-l0` reúne medidas e goldens. Node `assert.deepEqual` confirmou os nove caminhos, MIME, tamanhos e SHA-256 idênticos nas quatro coleções. Preparação posterior instrumentada: amostras diagnósticas 1,51/1,71 segundos; não são gate de inicialização.

34 testes/195 asserts cobrem o conversor, materialização Python e regressão JS. Padding, espaços e erros nativos foram testados em browser real (2/2); happy-dom não reproduz corretamente o whitespace de `atob`. O primeiro benchmark errou a soma esperada (confundiu materiais e tamanho total do projeto); corrigido para os bytes reais antes da baseline aceita. Revisão independente limpa, incluindo 10.005 entradas diferenciais. Reversão isolada: restaurar apenas a expressão anterior `Uint8Array.from(atob(raw), c => c.charCodeAt(0))`; não desfazer políticas de materiais.
