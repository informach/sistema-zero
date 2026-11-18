# Compatibilidade com o Tiled

Revisado em 18/11/2026. O importador aceita mapas ortogonais de tamanho fixo em JSON ou TMX,
com folhas embutidas ou externas (TSX e JSON). A galeria recebe os arquivos do mapa e as
dependências, ou um ZIP, em **Trazer mapa**. A escolha do mapa e o relatório de conversão
aparecem antes de fechar.

O programa Tiled não foi executado nesta entrega (não realizado). A compatibilidade abaixo é a
do nosso leitor e do nosso gravador, conferida pelos testes de `packages/pinta/src/export/tiled/`.
Os arquivos em `__fixtures__/tiled-real/` foram escritos à mão seguindo o formato do Tiled 1.10;
não saíram do programa.

## O que é convertido

| Recurso | Tratamento |
|---|---|
| Gids e as oito combinações de espelho e giro | bits do Tiled para a célula do Pinta e de volta |
| Grupos, visibilidade, opacidade, deslocamento e parallax | preservados; opacidade e parallax fora da faixa são ajustados com aviso |
| Dados em XML, CSV, base64, base64 com zlib e com gzip | lidos; o fluxo compactado é cortado no tamanho do mapa |
| Ponto, retângulo, elipse, polígono e polilinha | preservados com giro |
| Objeto de peça | âncora de baixo à esquerda convertida; espelhos e o bit diagonal viram giro de 90° e espelhos do objeto |
| Propriedades | texto, verdadeiro/falso, inteiro, decimal, cor, objeto e arquivo, pelo `type` (sem `type` é texto) |
| Animação de peça | quadros e duração; duração fora de 16 a 60000 ms é ajustada com aviso |
| Terrenos Wang | canto, borda e misto, com as cores |
| Conjuntos vinculados do Pinta | objeto original e definição em propriedades `pinta:*`; a expansão visual gerada para outros leitores é reconhecida e não duplica |
| Texto de várias linhas em atributo do TMX | gravado com `&#10;`, `&#13;` e `&#9;` |

## O que entra com aviso no relatório

| Caso | O que acontece |
|---|---|
| Camada com peças de várias folhas | vira uma camada por folha |
| Nome de camada, objeto, folha ou terreno com mais de 48 sinais | encurtado |
| Texto de propriedade com mais de 200 sinais | cortado |
| Nome de propriedade com espaço, acento ou mais de 32 sinais | propriedade não trazida |
| Mais de 16 propriedades | as últimas não são trazidas |
| Propriedade de tipo próprio do Tiled (`class`) | não trazida |
| Propriedades do mapa (as que não são `pinta:*`) | não trazidas |
| Classe da camada | guardada como a propriedade `class` (se já existir uma, a classe não é trazida) |
| Cor de fundo, classe e origem do parallax do mapa | não trazidas |
| Objeto com modelo (`template`) | entra só com o lugar, o nome e as propriedades do mapa |
| Objeto escondido | entra visível |
| Objeto de texto | não convertido |
| Camada de imagem | não convertida |
| Mistura (`mode`) ou tonalidade (`tintcolor`) da camada | não convertidas |
| Ordem de desenho "de cima para baixo" numa camada com objetos de peça | os objetos ficam na ordem da lista |
| Chance de sorteio, formas de colisão e classe das peças | não trazidas |
| Alinhamento de objetos da folha diferente de baixo à esquerda | objetos de peça podem sair do lugar |
| Deslocamento de desenho e cor transparente da folha | não trazidos |
| Nomes das cores de terreno | não trazidos |
| Mais de 64 quadros numa animação, mais de 16 terrenos numa folha | ficam os primeiros |
| Arte com mais de 63 cores ou transparência parcial | reduzida para a paleta do Pinta |

## O que é recusado, com frase para a criança

- Mapa infinito, isométrico, hexagonal ou escalonado.
- Peças não quadradas; mapa com mais de 256 × 256 casas; mais de 32 camadas (contando grupos e
  camadas divididas por folha); mais de 2.097.152 casas somadas; grupos além de 4 níveis.
- Folha com margem ou espaçamento, com mais de 256 peças, de tamanho diferente das casas do
  mapa, ou feita de imagens soltas. Mais de 32 folhas.
- Mapa sem nenhuma folha de peças.
- Mais de 512 objetos numa camada; objeto ou deslocamento além de 12.288 pixels; forma com mais
  de 256 pontos.
- Gid acima da última peça da folha, em camada ou em objeto. Animação ou terreno que aponta
  para peça ou cor que não existe.
- Camada compactada com zstd; camada cujo tamanho não bate com o mapa (maior ou menor);
  dados corrompidos.
- XML com DTD ou ENTITY; XML inválido.
- No pacote: caminho com `..` que sai da pasta, caminho absoluto, endereço de internet; arquivo
  acima de 32 MiB; ZIP que abre em mais de 128 MiB.
- Na conversão para o editor: peças de tamanho diferente de 16, 32 ou 48 pixels; desenho de
  objeto acima de 512 × 512.

Um erro que não esteja nesta lista aparece como um recado geral, nunca como texto técnico.

## Ida e volta

Propriedades `pinta:*` conservam identificações, papéis, frente, colisão e conjuntos. Os testes
de ida e volta comparam a cena inteira (`toEqual`) em JSON, TMX com folha externa e TMX com
folha embutida, nas quatro codificações de camada. Os caminhos de imagem são resolvidos em
relação à folha externa.

O [registro de homologação](homologacao.md) diz o que tem teste automático e o que não foi
realizado.
