# Lote 80 — atualizações de UV no viewport

## Baseline e hipótese

`bun scripts/bench-scene-uv.ts`: Bun 1.3.11, Windows, mesma sessão; 3 aquecimentos
e 20 amostras por caso. CPU/identidade de buffers, sem WebGL, FPS ou hardware-alvo.
O custo medido inclui indexação/validação do documento e atualização de recursos,
mas não o comando autoral nem React. Oráculo integral fora da janela de atualização.

| Faces | Escopo | Atualização p50/p95/p99 ms | Kernel integral p50 ms | Atributos novos |
| --- | --- | --- | --- | --- |
| 256 | Um canto | 2,931 / 5,242 / 5,901 | 2,338 | 49.152 B |
| 256 | Todos | 2,949 / 5,459 / 6,484 | 2,485 | 49.152 B |
| 2.304 | Um canto | 24,247 / 28,035 / 33,384 | 23,011 | 442.368 B |
| 2.304 | Todos | 26,518 / 33,527 / 34,459 | 21,966 | 442.368 B |
| 9.216 | Um canto | 102,302 / 119,384 / 119,544 | 99,863 | 1.769.472 B |
| 9.216 | Todos | 99,851 / 115,442 / 121,969 | 92,809 | 1.769.472 B |

Perfil separado: `bun --cpu-prof-md --cpu-prof-name=scene-uv-l80-before.md
--cpu-prof-dir=../../.audits/molda-evolution scripts/bench-scene-uv.ts`.
O arquivo bruto registra 18,92 s e 2.398 amostras; inclui montagem inicial e
oráculo integral, portanto não representa apenas o trecho de atualização.
`buildSceneGeometry` aparece no top 5 de self time, além de triangulação,
normalização e expansões `map`/`push` em sua árvore. No maior caso, a mediana do
kernel integral isolado é próxima da atualização inteira. A hipótese é evitar
esse kernel quando só UV mudou, mantendo a validação e o caminho integral.

Oportunidade: impacto 5 × confiança 5 / esforço 3 = **8,33**.
Uma alavanca: reutilizar geometria derivada em alteração comprovadamente só de UV.
Sem alterar indexação do documento, triangulação ou scheduler neste lote.

## Prova planejada e hashes de referência

- Ordem/diagonais: reter mapeamento do canto autoral em cada vértice desenhado.
- Elegibilidade: mesma referência de posições/arestas, IDs/ordem de faces,
  material e sequência de vértices. Outras mudanças usam reconstrução integral.
- Faces com diagnóstico usam caminho integral, preservando erros/filtragem.
- Float32: conversão idêntica à expansão integral; Double autoral não é escrito.
  Validar todos os patches antes de alterar qualquer recurso visível.
- RNG/tie-breaking: não usados; o algoritmo de triangulação não muda.
- Oráculo: comparar cada Float32 com `Object.is` e SHA-256 de posições+normais+UV.
- Reversão local, se necessária: remover integração do patch no resource e usar
  `buildSceneGeometry` em mudanças de fonte; não reverter alterações alheias.

| Faces/escopo | SHA-256 |
| --- | --- |
| 256/canto | 575eaefac1e18f9fff739cca0846b9c209e0424ee18ba8f2e15f0bb4bd6b0a98 |
| 256/todos | 03fec532b7342af42f11608930c77daaa7105d3b52ab280d29b1f0202d6590b2 |
| 2304/canto | 865f567467581080d898fdc071e35b4523584fe26535316c5896ca3b2eb086bd |
| 2304/todos | 4dd6faec3c541729350c1155bf5fdf5832ab74d33ec1397ca2e151792dfa81d3 |
| 9216/canto | 8deaff31861ce779bebec15ee70f92c8dc2864e947e36088139322be38c6c672 |
| 9216/todos | d29a1668c17b917acd6aafb62ba3c4977d5f470e7e3cb22fed37343eabe5ebbc |

## Implementação e resultado

`geometryUv` prepara patches próprios de Float32 somente depois de confirmar a
elegibilidade acima. Todos são preparados antes de qualquer mutação visível;
erros posteriores em outra geometria ou imagem deixam o quadro anterior intacto.
Mapeamento Uint32 de canto acompanha a filtragem de faces colapsadas e não vai ao
GPU/documento. Custo retido adicional: 4 B por vértice expandido, ou 221.184 B no
caso maior (12,5% dos atributos espaciais+UV). Não é uma medição de heap total.

Posições, normais, UV, bounds, grupos e materiais preservam identidade. Só o buffer
UV recebe mudanças; um envelope de componentes acumula uploads pendentes sem
crescer por gesto enquanto o viewport não desenha. Esse envelope pode incluir
componentes intactos entre duas edições distantes. `onUpload` limpa o envelope,
inclusive no primeiro upload. COW cria recurso separado e depois também o reutiliza.
Mudanças Double invisíveis em Float32 atualizam a fonte sem marcar novo upload.

Primeira execução posterior, mesmo benchmark/20 amostras e hashes idênticos:

| Faces | Escopo | Atualização p50/p95/p99 ms | Montagem inicial p50/p95 ms |
| --- | --- | --- | --- |
| 256 | Um canto | 0,382 / 0,764 / 1,172 | 3,435 / 5,678 |
| 256 | Todos | 0,601 / 1,086 / 2,926 | 3,175 / 4,482 |
| 2.304 | Um canto | 1,371 / 2,380 / 4,740 | 25,629 / 31,647 |
| 2.304 | Todos | 2,527 / 4,492 / 5,154 | 24,310 / 30,719 |
| 9.216 | Um canto | 5,387 / 7,334 / 7,370 | 103,466 / 120,182 |
| 9.216 | Todos | 9,960 / 14,428 / 14,560 | 107,873 / 114,759 |

Zero bytes de atributos **recriados** em todos os casos; existem patches temporários
e o mapeamento adicional acima. A montagem inicial continua integral, sem alegação
de melhoria. Nenhuma triangulação/normalização acontece no caminho elegível.

Repetição com verificação automática dos seis hashes salvos: todos passaram.
Atualização p50/p95/p99, na mesma ordem da tabela:
`0,424/0,592/0,782`; `0,612/0,831/1,294`; `1,418/1,698/4,159`;
`2,678/5,013/5,106`; `5,346/6,547/7,438`; **`12,221/22,204/90,721`**.
O último caso apresentou dispersão também no kernel integral (p95 164,529 ms) e
na montagem inicial (p95 189,642 ms). A causa dessa variação não foi isolada;
não extrapolar latências máximas nem prometer quadro de 16 ms em hardware infantil.

Perfil posterior de atualização repetida, sem oráculo no loop:
`bun --cpu-prof-md --cpu-prof-name=scene-uv-l80-after.md
--cpu-prof-dir=../../.audits/molda-evolution scripts/bench-scene-uv.ts --profile-updates`.
300 mudanças alternadas por escopo, 9.216 faces; 5,06 s/610 amostras. Agora o maior
self time é `indexSceneDocument` (26,9% numa localização), seguido pela preparação
de UV. Esse perfil tem carga diferente do perfil inicial; percentuais não são uma
comparação direta antes/depois. Não modificar a indexação neste lote.

Verificação: **1.176 testes, zero falhas, 170 arquivos, 69,50 s**; typecheck,
Biome (534 arquivos), Vite (0,67 s) e diff-check passaram. Nove testes novos cobrem
concavidade/winding, IDs especiais, -0/subnormais, overflow atômico, identidade,
raycast real, COW/descarte, uploads antes de desenhar/ocultos, undo e fallbacks.
Sem execução visual nem GPU real. API de ranges conferida na documentação oficial
Three e em `WebGLAttributes` instalado (0.184.0), sem cópia da implementação.
