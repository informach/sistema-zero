# Lote 8.2 — Acabamento de água e leitura exata da profundidade na GPU

18/11/2026 · `staging` após `e789a003e` · **8.2 continua em andamento.**

O material de água agora fornece sua cor linear/alpha no instante zero para o acabamento portátil: profundidade, transição rasa/profunda, transparência, espuma e fios da cachoeira. A consulta lê os mesmos Float32 paginados e a mesma cobertura enviados à GPU, com interpolação triangular compartilhada com o terreno. O catálogo mantém os papéis explícitos: lâmina, margem sólida e decoração. A nova leitura de superfícies não cria colisores ou fundos.

Solo e água passam pelo mesmo rasterizador limitado, com UVs, interpolação e dilatação de bordas compartilhados. A cachoeira usa a faixa vertical. O material portátil preserva PBR e alpha; os UVs autorais e a profundidade de catálogo continuam nos atributos para restauração posterior. O manifesto identifica explicitamente quais nós têm efeito de água, conferindo entidade, parâmetros e papel do arquivo. Faces verticais declaradas como lâmina horizontal são recusadas, sem descartá-las silenciosamente.

## Defeito encontrado e corrigido na água existente

O primeiro comparativo mostrou erro médio de **5,6211**, máximo **57**, e uma borda seca diferente. A instrumentação isolou o endereço da amostra: numa página de 33×33 texels, uma divisão/mod em ponto flutuante podia arredondar para a linha anterior. Por exemplo, a altura esperada **1** era lida como **−3**. A posição interpolada do fragmento estava correta.

A regressão WebGL reproduziu **quatro leituras incorretas** antes da correção. O shader passou a calcular página, linha e coluna com inteiros e usar `texelFetch`. A versão da chave de shader foi atualizada. Depois, as **323 amostras** de três configurações, incluindo múltiplas páginas e canais, corresponderam exatamente aos Float32 enviados. [Antes](evidencias/lote8-agua-portatil/gpu-antes.json), [depois](evidencias/lote8-agua-portatil/gpu-depois.json). O teste usa framebuffer Float32; não compara apenas cores quantizadas. Dados, física de nado e regras autorais não mudaram.

## Verificação e revisão

- Núcleo completo: **346 testes / 10.571 verificações**; motor: **215 / 4.619**; oficina: **110 / 735**, sem falhas.
- Tipagem dos três pacotes, Biome e `git diff --check` passaram. Build/workers da oficina passou, mantendo o aviso conhecido de chunks acima de 500 kB.
- Ensaio Chrome headless local, gradiente de profundidade e margem seca, água com altura de ondas zero para isolar o albedo. GLB gerado e reaberto: **1 malha / 2 triângulos**. A 32 px/m, erro médio **0,2288**, máximo **11** em 145.200 amostras de canal. [Editor](evidencias/lote8-agua-portatil/agua-editor-32.png), [GLB](evidencias/lote8-agua-portatil/agua-compilada-32.png), [medição](evidencias/lote8-agua-portatil/resultado-32.json).
- A 8 px/m: erro médio **0,4621**, máximo **15**, permitindo comparar custo e resolução. [Medição](evidencias/lote8-agua-portatil/resultado-8.json). Validador Khronos dos dois arquivos: **zero erros e zero avisos**. [32 px/m](evidencias/lote8-agua-portatil/validacao-32.json), [8 px/m](evidencias/lote8-agua-portatil/validacao-8.json).
- Após compartilhar o rasterizador, a comparação anterior de pintura do solo manteve erro médio **0,2712**, máximo **3**. [Regressão](evidencias/lote8-agua-portatil/regressao-solo.json).
- Testes de atenuação/alpha, espuma, margem seca, profundidade de modelo, queda vertical, UVs originais, cancelamento, cobertura e atualização do mapa. Os testes existentes de nado e margens sólidas passaram novamente.

Estas são provas de componentes, sem afirmar qualidade artística ou desempenho de dispositivos físicos. A ondulação dinâmica da normal **não está assada neste acabamento estático**; seus parâmetros permanecem para o runtime. A partição econômica do oceano, integração da água com o restante do pacote, restauração dos efeitos nos consumidores, colisões e montagem final continuam pendentes. O compilador completo e 8.2 não estão concluídos; 8.3–8.6, lotes 9–10 e implantação continuam pendentes.
