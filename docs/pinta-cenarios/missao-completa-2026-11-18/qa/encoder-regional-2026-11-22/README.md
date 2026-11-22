# Encoder regional e margem da quota

O [plano](../../../../superpowers/plans/2026-11-22-pinta-custo-do-encoder-regional.md)
registra a causa perfilada e a mudança de uma linha. A validação, ordem,
little-endian e base64 continuam iguais. `Reflect.apply` recebe o mesmo vetor
interno de 2.048 bytes, na mesma ordem, sem a expansão pelo iterador do spread.
Os limites de documento, memória e prazo não mudaram.

O [A/B](abba.json) compara 20 amostras por implementação, intercaladas ABBA após
três aquecimentos, com 2.048 chunks/2.097.152 células. A saída JSON foi comparada
integralmente, com 5.655.698 bytes e SHA-256
`3c17b7cf9a4a31b27dd5f9ab241555422545ee8e4001776cfd4edcfc60c548a8`.
No Bun 1.3.11 desta máquina, o encoder passou de p50 194,47 para 92,20 ms e
p95 269,68 para 117,25 ms. A hipótese anterior de trocar apenas a leitura do
comprimento do vetor foi descartada por não apresentar ganho; seu recibo é
preservado. Não houve alteração correspondente no produto.

O [índice](index.json) identifica os hashes do profile e dos recibos comprimidos.
O caso de quota isolado passou em 8.531 ms antes e 5.937 ms depois; os nove
testes do arquivo de persistência passaram, com 52 asserções. Os contratos Core,
incluindo todos os 32.769 valores históricos, passaram em 20 testes/99 asserções.
A conservação exata do banco após recusa, os eventos, a exclusão que libera
espaço e a escrita seguinte continuam sendo conferidos pelo teste original.

A suíte completa anterior teve 2.884 aprovados e duas falhas: o timeout e uma
fixture nativa do Raylib que não compunha o leitor do backend. Este relatório
não declara a suíte completa corrigida; ela precisa ser repetida depois de
integrar a fixture. As medições também não qualificam a latência da oficina,
o IO sob demanda, aparelhos adicionais ou o desempenho sob CPU emulada.

Repetição, com Bun 1.3.11 e os commits indicados instalados no mesmo repositório:

```powershell
bun --no-env-file docs/pinta-cenarios/missao-completa-2026-11-18/qa/encoder-regional-2026-11-22/benchmark.ts 57dd5ee14 132f8cf50
```

O script lê as duas fontes pelo Git e não as altera. Cria somente dois módulos
temporários no cache, compara a saída integral e remove seus próprios arquivos
ao encerrar. Esta é uma microavaliação do encoder; o teste de quota deve ser
repetido no pacote Pinta com `bun --no-env-file test src/state/localRegionPersistence.test.ts`.
