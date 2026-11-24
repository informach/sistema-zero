# Lote 8.2 — Espelho e acabamento de atores

18/11/2026 · `staging` após `200fd35c7` · **8.2 continua aberto.**

A normalização animável agora aceita espelhos em torno da caixa real, tonalidade e textura métrica. A matriz de espelho foi extraída da representação existente e é compartilhada com o palco. Reflexos mudam a base de coordenadas da hierarquia, geometria, binds e canais de movimento; não congelam a pose nem deixam uma escala negativa nos nós das peles. Winding, normais e tangentes acompanham a reflexão. Os materiais são cópias próprias, preservando as texturas da fonte.

O acabamento projeta UVs com a mesma função métrica do editor, usando a pose inicial somente como referência. Posições-base, pesos, juntas e morphs permanecem animáveis. Faces temporariamente colapsadas são mantidas para os demais quadros. A expansão por triângulo tem orçamento conferido antes da cópia. Canais de morph que o Three instalado não preserva são recusados tanto na inspeção da fonte quanto na gravação, sem descarte silencioso.

## Evidências e revisão

- Motor completo: **195 testes / 4.231 verificações**, sem falhas; tipagem e Biome passaram.
- Sete combinações de espelho, translação da raiz, rotação, pele e morph: posições comparadas em quatro instantes; fonte, materiais e matrizes inversas originais preservados. Peça rígida animada também conserva transformação, winding e normais.
- UV métrico comparado com a projeção existente do palco, incluindo espelho e escala não uniforme. Regressões de pose colapsada, orçamento de expansão e canais sem suporte.
- Ensaio Chrome headless local, fixture próprio com **65.001 vértices**: GLB espelhado gerado/reaberto, partes de 64.998 e 3 vértices, clipe com corpo/osso/morph. Diferença máxima amostrada **0 m**; validador Khronos **zero erros e zero avisos**. [Medição](evidencias/lote8-acabamento-atores/fixture-resultado.json), [validação](evidencias/lote8-acabamento-atores/fixture-validacao.json).
- Cute real com **espelho, cor e textura**: seis peças e quatro clipes preservados após exportação/reabertura; altura original/compilada 1,1700404965322315 m. Diferença máxima amostrada menor que **0,0001 m**. Validador: **zero erros e zero avisos**, duas informações sobre UVs conservados. [Medição](evidencias/lote8-acabamento-atores/cute-resultado.json), [validação](evidencias/lote8-acabamento-atores/cute-validacao.json). GLBs licenciados continuam privados em `output`.

São provas de dados e movimento amostrado, sem afirmar aprovação perceptiva de IK/animação, qualidade artística ou desempenho em dispositivos físicos. A primeira abertura do ensaio real foi interrompida pela otimização de dependências do Vite; a execução após esse recarregamento passou. A montagem completa, superfícies/colisões portáteis, conferência final e ciclos continuam pendentes antes de fechar 8.2 e iniciar 8.3.
