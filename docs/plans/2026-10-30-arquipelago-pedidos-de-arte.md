# Pedidos de arte para completar a entrega integral

## Situação atual: cinco portos recebidos

O commit remoto `080b6a3d2` entregou os cinco modelos, relatórios e provas da arte. Eles foram
integrados ao trabalho local em 30/10/2026, sem regeneração de GLB. A espera pelo chão foi
ampliada na direção dos deques e conferida contra todos os seus vértices. O pedido abaixo
fica preservado como especificação da entrega. Não resta pedido de arte destes cinco portos.
A rede ampliada e as boias estão implementadas no recorte L10 de 30/10, com plano e provas
em `docs/superpowers/plans/2026-10-30-arquipelago-rede-do-barco.md`.

Base conferida: staging `6461f19c0`, em 30/10/2026. Pedido derivado da leitura dos GLBs e do
plano `docs/superpowers/plans/2026-10-30-arquipelago-mapa-descoberto.md`. Esta sessão não altera
geradores nem GLBs. A dona encaminha a implementação à sessão de Blender.

## Prioridade 1: cinco pontos de embarque para a rede do barco

Faltam as âncoras de porto nos seguintes modelos:

| Ilha | Modelo de destino |
| --- | --- |
| Bosque dos Bichos | `packages/arquipelago/src/assets/ilhas/bosque.glb` |
| Vila Doce | `packages/arquipelago/src/assets/ilhas/vila-doce.glb` |
| Pico Gelado | `packages/arquipelago/src/assets/ilhas/pico.glb` |
| Vale dos Dinos | `packages/arquipelago/src/assets/ilhas/vale-dos-dinos.glb` |
| Ilha das Nuvens | `packages/arquipelago/src/assets/ilhas/nuvens.glb` |

Conservar os caminhos já consumidos pelo jogo, sem criar um modelo paralelo.

Em cada modelo, entregar:

1. Um deque visível com ligação caminhável ao terreno da ilha.
2. Empty `barco`, na posição de atracação na superfície do mar. Sua orientação deve apontar
   a proa local em +X, como no porto atual. Não é um barco estático novo dentro da ilha:
   o jogo reutiliza `ilhas/barco.glb` e o seu Empty `passageiro` já existente.
3. Empty `cais`, no ponto livre do tampo em que os pés ficam ao embarcar/desembarcar.
   Não colocar o ponto em estaca, guarda-corpo, corda ou malha decorativa.
4. Colisores simples `col-cais-*`, no padrão já lido pelo jogo. O tampo e o caminho até
   o terreno precisam ter apoio real. Evitar uma malha visual sem chão de colisão.
5. Uma aproximação do barco livre de pedras, pontes, cabos e elementos do deque. O motor
   atual trabalha com corredor de navegação de meia largura 5 m; a rota final será medida
   e testada no jogo, inclusive nas aberturas das boias.

Posição candidata no referencial local dos modelos: lado externo da ilha, próximo de
`x=-20, z=0`, oposto à chegada da ponte em `x=11,5..11,6`. É uma proposta de implantação,
não uma coordenada final medida. Ajustar para não atravessar caverna, escavação, árvores,
atrações ou caminhos. Registrar as coordenadas finais, em vez de assumir que todas as
ilhas aceitam a mesma posição. A superfície do mar usada pelo barco é `y=0` no mundo.

Para a passagem a pé, a cápsula tem raio 0,35 m, altura total 1,80 m e degrau automático
de 0,45 m. Referência editorial segura para a arte: faixa livre de pelo menos 1,5 m,
altura livre de 2,4 m e degraus de no máximo 0,30 m. Rampas devem ficar confortavelmente
abaixo dos 52 graus máximos do controlador. Estes valores são folgas propostas; o aceite
final usa os colisores exportados e a busca de caminho do jogo.

### Particularidade das Nuvens

O porto aquático fica junto ao mar e o terreno fica em torno de `y=8`. Entregar uma ligação
visível e segura entre `cais` e o terreno, com apoio contínuo, seguindo os limites acima.
A solução mais simples para esta entrega é um acesso fixo caminhável. Não adicionar
elevador, teleporte, plataforma animada ou novo modo de transporte sem um contrato próprio.
Se esse acesso comprometer a composição da ilha, devolver a alternativa com medidas antes
de exportar. A ponte existente não pode ser tratada como um cais na água.

## O que já existe e deve ser preservado

- Porto da ilha central: `mundo/pier.glb`, âncoras `barco` e `embarque`.
- Porto do Recife: `ilhas/recife.glb`, âncoras `barco` e `cais`.
- Barco: `ilhas/barco.glb`, Empty `passageiro` filho do nó animado `barco`.
- As quatro plataformas móveis das Nuvens e os seus tampos já foram entregues; não há
  novo pedido de arte para essa mecânica nesta revisão.
- Não remover ou renomear nós, colisores, clipes e materiais existentes. Conservar a
  origem, escala e rotação usadas pelo carregamento atual das ilhas.

## Entrega esperada da sessão de arte

Atualizar os geradores e exportações na máquina com Blender. Incluir os cinco GLBs,
os relatórios de arte e os seguintes dados no relatório de cada ilha:

- Coordenadas e rotação finais de `barco` e `cais`.
- Lista e limites dos novos colisores, inclinação/degraus do acesso e ponto de conexão ao terreno.
- Caixa ocupada pelo deque e trecho livre para a aproximação do casco.
- Diferença da caixa total da ilha, para recalcular o raio de espera/carregamento.
- No caso das Nuvens, o percurso completo entre o mar e o terreno elevado.

Depois dessa entrega, esta sessão liga a rede, mede as rotas, confere pontes/boias e testa
embarque, desembarque, colisão, pausa e carregamento no navegador. Um GLB exportado não
significa que a rede de barcos já esteja implementada.

## Outros lotes

Ainda não há um pedido de Blender suficientemente especificado para o catálogo de roupas,
as ampliações ou a terraformação de L11. Primeiro serão aproveitados o avatar e os módulos
existentes. Se a revisão desses trechos encontrar uma peça ausente, o pedido será acrescentado
a este documento com nome, medidas e finalidade. Não produzir modelos por suposição.
O fantasma familiar é gravação/reprodução do avatar existente e não exige personagem novo.

## Pedido do levantamento de 30/10: o lote do iglu no Pico (E04)

A proposta põe "construir o iglu" no Pico. O código está pronto (`CabanaDaIlha` com
`ilha="pico"`, tetos do iglu no contrato, `LIMITES_DO_IGLU`) e espera o lote no modelo, como a
cabana do Bosque. A busca no `pico.glb` atual (chão plano com variação de até 12 cm, nada
acima até 3 m, dentro do raio de 12 m) só achou a praça de chegada da ponte (x 6 a 11, z -2 a
3), onde uma construção fecharia a entrada da ilha.

Entregar em `packages/arquipelago/src/assets/ilhas/pico.glb`:

1. Uma clareira plana de pelo menos 5 × 5 m, fora do caminho da ponte, da subida ao cume, do
   palco do festival, da caverna e do iglu do Floco. Neve plana, sem pedra solta nem pinheiro.
2. Os Empty `lote-cabana-a` e `lote-cabana-b` em dois cantos opostos dela, na altura do chão
   (o jogo arredonda x e z para o metro e usa o y da âncora `-a` como piso).
3. Nada de colisor sobre a clareira até 3 m de altura; o caminho a pé até ela com as folgas do
   pedido dos portos (faixa de 1,5 m, degraus de até 0,30 m).

O aceite: `tests/cabana.test.ts` troca o teste "ainda não traz as âncoras" por um que confere o
lote plano e livre contra os colisores do modelo.

