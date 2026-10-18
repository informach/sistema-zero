# Ajustar pintura visualmente

Para crianças a partir de 9 anos, pintar direto no 3D continua sendo o caminho principal. A preparação automática da pintura já cria o mapa. Ajustar o mapa é opcional e deve lembrar uma folha de pixel art, usando os tokens existentes da plataforma.

No editor opcional, mostrar a textura sob os contornos, permitir escolher faces no mapa ou no 3D, arrastar os pontos e mover a seleção inteira. Encaixar nos pixels da textura por padrão; as setas usam um pixel por eixo. Oferecer giro de 90 graus e espelhamento sem exigir números. Preservar a seleção compartilhada e um desfazer por gesto; cancelar em Escape, perda de foco ou troca do documento.

Recolher coordenadas, passo livre, projeção, costura e organização manual em Avançado. Sem imagem, explicar que pintar a peça prepara seus quadradinhos; não apresentar uma resolução fictícia como pixels reais. Se a seleção usar imagens diferentes, só oferecer a edição numérica avançada até escolher uma face da mesma imagem.

Referência de comportamento: https://github.com/JannisX11/blockbench/blob/master/js/uv/uv.js. Implementação própria, sem copiar código do Blockbench. Mover UV muda onde a pintura aparece, sem redesenhar os pixels ou alterar a geometria 3D.

Verificar arraste com resolução retangular, troca de seleção, cancelamento, teclado, desfazer, preservação das imagens e visibilidade dos campos avançados no navegador, em ambos os temas.

## Resultado e verificação

O mapa mostra a textura e sua grade, respeitando a proporção da imagem. Pontos ficam ativos por padrão; arrastar o interior move a seleção. Cantos de faces selecionadas que compartilham vértice e UV continuam juntos, sem soldar costuras existentes. Giro de 90 graus usa pixels reais mesmo em imagens retangulares. Campos e projeções ficam recolhidos em Avançado. Os nomes visíveis são Mapa da pintura e Organizar quadradinhos.

Corrigida também a perda do cursor de teclado na pintura de perto quando o foco provoca rolagem. O teste de navegador reproduz essa rolagem explicitamente.

Verificações: integração da oficina (99 testes), regressão de pintura/UV/permissões (47 testes), pontos compartilhados/canvas/geometria UV (14 testes), 11 cenários de navegador de pintura e UV aprovados, com os quatro cenários UV repetidos após a revisão final. Typecheck, build do playground, Biome nos 16 arquivos tocados de código/testes e git diff --check aprovados. Imagens dos temas claro e escuro inspecionadas em packages/molda/.cache/uv-visual-*.png.
