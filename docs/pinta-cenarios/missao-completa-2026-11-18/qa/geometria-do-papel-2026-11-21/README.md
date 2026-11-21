# Geometria do papel e canvas da oficina — 21/11/2026

Base: `27d4e81534efd32f0a246ce708c02513039506a4`. Continuação do item 3.
Formato 8 permanece interno. Sem merge da feature em staging ou implantação.

## Implementação e revisão

O ponteiro da biblioteca ignorava a origem do mapa; o núcleo de inserção usava a
normalização densa, cortando coordenadas negativas/fracionárias. Cinco testes
reproduziram essas falhas e a admissão silenciosa de entradas não finitas. Quatro
provas adicionais mostraram o canvas da oficina desenhando o mapa regional no
lugar errado, com ou sem marcas de colisão. Os recibos vermelhos estão preservados.

`mapViewport` reúne conversões entre ponteiro, papel, mundo e célula da camada.
A origem é aplicada uma vez; janela visível e anel são recortados antes de aceitar
a posição da biblioteca. O controlador, seleção, cursor, ponto de inserção e
destino do minimapa usam os limites lógicos. `normalizeCellRect` aceita origem
opcional e recusa limites/coordenadas inválidos sem gerar uma lista de casas.

O canvas da oficina aceita o mapa autoral comum. Desenha em coordenadas globais,
compensa a origem no papel e usa um leitor por camada para a marca de colisão.
O canvas continua limitado à janela; não materializa a extensão vazia. Cores,
classes, estilos, ordem de composição, animações e orçamento do cache não mudam.
A grade ainda percorre as linhas do mapa inteiro: seu perfil/culling ficam em
mudança separada, conservando a régua de pixels já estabelecida.

A biblioteca usa a admissão estrita de objetos regionais, conservando frações,
limites assinados e deslocamento herdado. Prévia e inserção usam a mesma posição.
Uma instância de conjunto mantém o vínculo; não é achatada. A normalização densa
anterior permanece no seu ramo, e entradas inválidas são recusadas antes de criar
um objeto. Nenhuma constante de escritor, versão anunciada ou formato foi promovido.

## Verificação

- Suíte completa: 2.543 aprovados, três controles nativos omitidos pela configuração
  comum, zero falhas e 29.469 asserções. Os controles nativos não foram repetidos
  neste lote de geometria da interface; seus resultados anteriores continuam nos
  respectivos relatórios, sem nova afirmação de compatibilidade de regiões.
- 39 testes focados aprovados, zero falhas e 258 asserções. Incluem oito imagens
  nativas em origens ±64/±4096, mapa assinado grande, precisão fracionária, inversão
  das coordenadas, seleções, teclado e regras legadas da biblioteca.
- Três perfis no Chromium: desktop, viewport/toque emulado e CPU 4×. Os módulos
  reais anteriores de canvas, viewport, células e biblioteca vêm de `git show`.
  96 imagens densas conservaram o hash RGBA e 144 imagens regionais coincidiram
  com a referência densa alinhada à grade global de chunks. São 240 comparações,
  com marcas de colisão, opacidade, offsets, flags, animação, zoom e anel.
- Nos mesmos três perfis, 72 destinos legados da biblioteca, 1.443 posições de
  ponteiro e 27 seleções coincidem com os módulos anteriores. A comparação ignora
  somente o ID recém-criado de cada objeto, fixado para comparar o conteúdo.
- O documento interno com 100 milhões de casas e dois chunks é desenhado num
  canvas de 160 × 128. Extensão e 4.096 bytes de índices vêm do documento real.
  A prova registra 20.002 comandos de linha da grade antes do futuro culling;
  esse número é medição do estado atual, não contrato que exija trabalho inútil.
- 33 percursos da oficina pública aprovados, incluindo arrasto/cancelamento,
  teclado, deslocamentos de camadas, seleção, conjuntos, desfazer e reabertura.
- Tipos completos do Pinta/Estúdio, Biome e `diff --check`, fontes e hashes estão
  no `index.json` e nos recibos.

A primeira prova de navegador usou uma fixture de conjunto capturada de camadas
com deslocamento fracionário. O produtor recusou o recorte, como deve fazer.
Foi usada uma definição válida para qualificar o posicionamento; o mapa de render
com offsets continua igual. Nenhuma regra do produto ou comparação de pixels foi
relaxada para passar o ensaio. A prova anterior à correção da fixture foi preservada.

## Continuação

Esta é a preparação do papel/canvas e dos cálculos de inserção. O store público
e a oficina ainda não editam documentos 8. Movimento SVG e demais consumidores,
recursos, IO 3, Scene 4 e promoção pública continuam no plano. Não fecha as etapas
macro de geometria/interface, nem representa um fluxo regional completo no Estúdio.
Não houve medição de heap, qualificação de latência, teste com crianças ou outro
aparelho físico. O perfil de toque desta prova de canvas não simula mãos reais;
os gestos da oficina são exercitados separadamente nos percursos de regressão.
