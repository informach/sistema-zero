# Plataformas após integração de staging

O commit `59bcb42dd` integra `973bebd82` e conserva os 32 arquivos de implementação,
geradores e ensaios do lote `81b88e381`, conferidos pelos blobs em [fontes.json](fontes.json).
Os testes completos anteriores continuam em [plataformas precisas](../plataformas-precisas/README.md).

Após o merge, passaram novamente 94 testes do Estúdio e 85 de publicação, além dos
12 casos da interface Pinta–Estúdio. A execução final repete três desses casos:
criação do jogo lateral, atualização JavaScript e atualização Python. O relatório
JSON final contém esses três casos; o log completo registra os 12. Não são 15 casos distintos.
O TSC completo do Estúdio terminou com saída zero nesse commit. Uma execução
duplicada posterior foi cancelada e não conta como evidência.

A reconstrução do runtime conservou a distribuição local
`c4e6107747ac998e0030dad09578ab5ec12dc81941e8675970894ca8a6f8600f`.
Isso não comprova publicação ou ativação em staging. O ciclo autenticado e o
rollout do gravador continuam pendentes.

A revisão global de CI detectou evidências JSON do Pinta fora do formato do Biome.
A [normalização](normalizacao-json.json) conferiu os dados canônicos de 100 arquivos,
preservou os resultados e atualizou três inventários de hashes com a alteração registrada.
Não houve mudança no código do produto por essa formatação.

[Inventário e resultados](verificacao.json). Todos são testes nesta máquina;
toque e redução de CPU são simulações. A homologação completa da Vila permanece
distinta destes cenários pequenos de regressão.
