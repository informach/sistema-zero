# UV simples para pintar no 3D

O usuário pediu pixels com tamanho parecido e alinhamento entre faces vizinhas, tomando o Blockbench como referência. A interface de detalhes sozinha não corrige a UV. A preparação anterior projetava cada face pelo primeiro triângulo e ajustava a escala para preencher o atlas, deixando origens fracionárias e separando faces coplanares cortadas.

A nova preparação da malha usa uma base orientada pela altura da peça, projeção métrica com a transformação de mundo e a densidade existente do projeto. Faces conectadas no mesmo plano e com o mesmo material compartilham coordenadas. Quinas, junções não manifold e sobreposições ficam separadas. O empacotamento usa posições inteiras em pixels, margem e dimensão potência de dois, sem encolher as ilhas para caber. Se exceder o limite, a operação é recusada inteira.

A projeção usa a parte linear da transformação: mover a peça no mundo ou adicionar um ponto de construção solto não muda a grade. Não há conversão para Float32 na medição. A transferência usa cobertura conservadora nos pixels das bordas para não apagar uma face estreita cujo centro de pixel fica fora do triângulo.

As formas nativas permanecem formas ao começar a pintar. Seu tamanho de textura passa a considerar o alongamento dos eixos UV pela transformação da peça e dos grupos. Em superfícies curvas a densidade usa o alongamento médio ponderado, mantendo as superfícies paramétricas existentes.

Para criações já pintadas, o botão **UV simples** no painel de cores aplica um comando explícito à peça escolhida. Ele organiza a UV, transfere cada camada por correspondência dos triângulos com vizinho mais próximo e preserva nomes, visibilidade e opacidade. Os materiais e imagens anteriores permanecem na biblioteca; outras instâncias, inclusive travadas, não são alteradas. A operação tem um passo de desfazer e repetir sem mudanças não cria histórico. Reamostrar pode alterar detalhes pequenos, informado junto do botão. Pintura animada e mapas de relevo/brilho mantêm seus mapas e recebem uma recusa contextual, pois exigem tratamento conjunto.

O botão mostra a grade ao concluir. Quando aplicado explicitamente a uma forma paramétrica, ele cria a malha visualmente equivalente; começar a pintar uma forma, por outro lado, mantém a geometria paramétrica.

Referência de comportamento: [gerador de texturas do Blockbench](https://github.com/JannisX11/blockbench/blob/master/js/texturing/texture_generator.js), especialmente densidade, combinação de polígonos e organização da imagem. O código do Molda reutiliza suas próprias rotinas de topologia, projeção, empacotamento e pintura.

Validar continuidade dos vértices, densidade e escala anisotrópica, ausência de sobreposição, conservação das camadas, cópias compartilhadas, limites, histórico e o botão nos temas claro/escuro. Não reorganizar a UV de uma pintura existente automaticamente ao entrar na aba.

## Verificação

606 testes do domínio/captura de pintura e 138 testes da oficina passaram. Nove cenários Chromium passaram; os dois cenários de UV simples foram repetidos após a revisão final. Eles verificam continuidade das faces, transferência de pintura existente, traço no 3D atravessando uma divisão interna e desfazer/refazer. Biome, typecheck e build do playground passaram. As capturas estão em `packages/molda/.cache/uv-simples-*.png`.
