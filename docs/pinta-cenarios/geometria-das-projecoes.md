# Geometria das projeções do Pinta

O plano da missão reserva nativo 9, Scene 5 e PNG 6 para projeções. A base
geométrica tem um descritor fechado para ortogonal, isométrica em diamante ou
hexagonal. Ela pode ser usada antes da promoção desses formatos.
[Plano aprovado](../superpowers/plans/2026-11-21-pinta-missao-retomada.md)

## Coordenadas

- Uma célula tem coluna e linha assinadas. A origem e as dimensões da área
  autoral delimitam células que o documento admite. Expandir essa área deixa
  as coordenadas existentes fixas.
- O centro e o polígono de uma célula são dados em pixels do mundo. O
  descritor guarda a largura e a altura da pegada da grade. O tamanho do
  quadro da folha é um dado independente.
- A grade isométrica põe o vértice superior do diamante (0, 0) em (0, 0) do
  mundo. As coordenadas do Tiled têm a translação horizontal do arquivo.
  Seu espaço de objetos usa eixos lógicos em unidades da altura da peça.
  As conversões de arquivo devem aplicar essas duas convenções na fronteira.
  [Objetos no Tiled](https://doc.mapeditor.org/en/stable/manual/layers/#object-layers)
- A grade hexagonal guarda eixo, paridade e comprimento lateral. A paridade
  vale também em índices negativos. A pegada usa o mesmo arredondamento do
  renderizador Tiled ao dividir os deslocamentos das laterais. A consulta
  pontual testa até quatro hexágonos candidatos e resolve uma aresta
  compartilhada pela menor linha e coluna dentro dos limites informados.
  [Renderizador hexagonal Tiled 1.12.2](https://github.com/mapeditor/tiled/blob/v1.12.2/src/libtiled/hexagonalrenderer.cpp)

## Células

As grades quadradas e isométricas usam índices regionais Int16. Os
hexágonos usam UInt32 em regiões de 32 × 32. O sentinela vazio é
`0xFFFFFFFF`, o ID local ocupa 12 bits e os quatro bits superiores guardam
espelho horizontal, espelho vertical, rotação de 60° e rotação de 120°.
Os outros bits estão reservados. Na pintura, aplique os espelhos nos eixos
locais antes da rotação. Um espelho nos dois eixos permite representar as
rotações de 240° e 300°. [GIDs do Tiled](https://doc.mapeditor.org/en/stable/reference/global-tile-ids/)

O codec `u32le-base64-v1` confere os cabeçalhos de todas as camadas antes
de acessar o primeiro payload. A área conserva os limites assinados
existentes. As grades hexagonais admitem 1.024 regiões, somando até
4 MiB de índices. O codec Int16 conserva o teto de 2.048 regiões.

O documento autoral privado guarda a projeção e a opção de crescimento no
mapa. Scene 5 também admite conjuntos com uma projeção própria. As duas
formas carregam índices compactos e validam a orientação antes de ler células.
Uma cena isométrica ou hexagonal declara física precisa.

O compositor alinha a imagem da peça com a base da pegada. O recorte
considera imagens maiores que a célula e os giros hexagonais. O Canvas nativo
produziu os mesmos pixels com e sem recorte para células assinadas nas duas
projeções, em cenários de 10.000 × 10.000 com um chunk ocupado.

O Jogo 2D e o Jogo 2D Avançado executam a cena admitida pela composição
privada. As provas moveram um corpo contra o diamante, pousaram por cima
de uma plataforma e atravessaram uma porta da ilha isométrica à praia
hexagonal. As fontes, sem dados de desenhos, têm 421.286 e 463.527
caracteres frente aos tetos de 422.000 e 464.000. O validador de cabeçalhos
fica na admissão do documento, e o runtime restaura o wire já conferido.

## Integração

1. Admitir o documento projetado e aplicar crescimento e pintura na mesma
   transação usando diretórios esparsos.
2. Reutilizar centro, polígono, vizinhança, ordem de pintura e recorte no
   editor, nas seleções, nos conjuntos, no minimapa e nos runtimes.
3. Validar o round-trip e a execução nos quatro formatos externos.

Os testes desta base exercitam a admissão geométrica, os vizinhos, as
fronteiras de região e os bytes de células. O suporte no editor e nos
adaptadores será homologado ao integrar cada etapa.
