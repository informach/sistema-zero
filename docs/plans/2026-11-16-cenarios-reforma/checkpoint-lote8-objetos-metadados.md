# Lote 8.2 — Objetos estáticos e metadados

18/11/2026 · `staging` após `bfb24122c` · **8.2 em andamento; não fecha o lote 8.**

Templates estáticos reutilizam as representações do palco para espelho, cor e acabamento. A geometria permanece local, com transformação mundial separada no manifesto. UVs métricos incorporam a escala do objeto sem assar sua posição. Cópias de geometria e material têm descarte próprio; texturas continuam com o carregador. Modelos com clipes, pele ou morph são recusados neste caminho para impedir perda silenciosa de animação.

O registro lógico conserva hierarquia, propriedades, ocultação herdada, montagens, âncoras e volumes independentemente da geometria. Marcadores podem continuar associados a entidades ocultas; estas não geram nós visuais ou colisores. A procedência dos conjuntos usa as definições autorais. O hash do documento usa o serializador canônico já compartilhado pela plataforma, antes da expansão.

A revisão identificou que Zod descartava silenciosamente uma chave própria `__proto__` nas propriedades. A entrada agora é recusada explicitamente, com regressão; outros nomes de propriedades continuam dados escalares. Não foi alterado o formato de hashes antigos.

## Verificação

- Núcleo: **340 testes / 10.542 verificações**, sem falhas.
- Motor: **182 testes / 4.110 verificações**, sem falhas.
- Oficina: **110 testes / 735 verificações**; Members: **51 / 244**; PostgreSQL isolado: **41 / 369**, sem falhas nos registros desta etapa.
- Tipagem da oficina e do Members executada após a integração; sem erros. Biome e `git diff --check` passaram.
- Comparação no Chrome headless local entre a instância do editor e o GLB reaberto: textura métrica, cor, espelho, escala não uniforme e giro. **46.263 amostras de canal, erro médio e máximo 0**. [Editor](evidencias/lote8-objetos/objeto-editor.png), [GLB](evidencias/lote8-objetos/objeto-compilado.png), [medição](evidencias/lote8-objetos/resultado.json). Fixture próprio, sem arte licenciada.

Isso comprova este recorte, não um compilador completo nem desempenho em aparelhos físicos. Seguem pendentes aparência dos atores, superfícies portáteis, colisões, montagem e conferência binária final, comparações e ciclos. 8.3–8.6, lotes 9–10 e implantação permanecem pendentes.
