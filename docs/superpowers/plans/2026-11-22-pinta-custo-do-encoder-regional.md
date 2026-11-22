# Custo do encoder na quota regional

A suíte completa em `57dd5ee14` excedeu os dez segundos do ensaio que conserva
cinco mapas de 2.048 chunks e recusa o sexto atomicamente. O caso isolado passou
em 8.531 ms; com profiler, excedeu novamente. A comparação exata do banco custou
3 ms no ensaio instrumentado. O profile atribui 37,3% das amostras ao encoder
i16/base64 dentro da medição JSON, incluindo a expansão de 2.048 bytes como
argumentos de `String.fromCharCode`. Não aumentar o prazo nem a quota de 32 MiB.

Uma alavanca: substituir o spread do `Uint8Array` interno de tamanho fixo por
`Reflect.apply`, que entrega os mesmos argumentos em ordem sem passar pelo
iterador. Os bytes são criados dentro do encoder e sempre têm o tamanho de um
chunk. Validação, little-endian, ordem, base64, limites e dados persistidos
permanecem iguais. Impacto 4 × confiança 4 / esforço 1 = 16.

ABBA no Bun 1.3.11, três aquecimentos e 20 medições por implementação: 2.097.152
células, JSON idêntico de 5.655.698 bytes, SHA-256
`3c17b7cf9a4a31b27dd5f9ab241555422545ee8e4001776cfd4edcfc60c548a8`.
Encoder p50 194,47 → 92,20 ms; p95 269,68 → 117,25 ms nesta máquina, com
interpolação linear dos percentis. Uma hipótese
anterior de apenas fixar o limite do laço foi descartada: não produziu ganho.
Esses valores não medem a oficina, o salvamento completo ou o carregamento.

Antes do commit, executar os contratos Core, a comparação de bytes históricos,
o ensaio completo de quota sem alterar suas asserções/prazo e as provas de
persistência correlatas. Repetir a suíte completa do Pinta após integrar a
fixture nativa corrigida e os demais lotes locais. Reverter o commit isolado se
qualquer saída válida ou contrato de admissão mudar.
