# Detalhes em pixel art no Molda

A criança de 9+ já conhece o Pinta Pixelart. A atividade deve reaproveitar esse gesto: escolher cor, apontar um quadradinho e pintar. A referência Blockbench é a combinação da imagem ampliada com o modelo visível, sem expor UV e materiais como requisito.

O motor atual já usa pixels inteiros, Bresenham e filtro nearest. O problema de entrada é o pincel padrão 2×2, tamanhos abstratos e a face ampliada escondida, sem grade ou zoom. Manter o motor e as texturas existentes evita apagar desenhos ou mudar a resolução de um projeto salvo.

A solução usa 1 px como padrão, tamanhos 1/2/3 px visíveis e o acesso Pintar de perto no trilho principal. A face abre numa área de detalhes com escala inteira, grade, cursor quadrado e zoom. No desktop ela divide o palco com a prévia 3D; em telas estreitas ocupa o palco e oferece retorno ao modelo. Paleta, balde, borracha e conta-gotas continuam compartilhados. A grade 3D permanece opcional. As cores, fontes e bordas usam os tokens existentes.

Verificar um clique de 1 px, arrasto sem lacunas, limites da face, precisão após zoom/rolagem, desfazer/refazer, cancelamento e atualização da prévia. Testar temas claro/escuro e tela pequena. Não reempacotar UVs, redimensionar imagens nem modificar a geometria por abrir a área de detalhes.

## Validação

142 testes de oficina, pintura, acesso por nível e transações passaram. Nove cenários Chromium passaram, incluindo um clique que grava exatamente 1 pixel, arrasto após zoom/rolagem, carimbo 2×2, borracha de 1 px, teclado e desfazer. A face abre com um clique mesmo numa peça ainda sem imagem; abrir e pintar continuam seguindo a preparação existente sem criar histórico separado. Temas claro/escuro e tela de 390 × 844 foram inspecionados. Typecheck, Biome e build passaram. As capturas estão em `packages/molda/.cache/pintura-pixel-detalhes-*.png`.
