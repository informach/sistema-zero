# Imagens de peças por regiões — 21/11/2026

Base: `79ee6613091988b271d026b6923124ef9cb9dd74`. Continuação do item 2 dos
consumidores visuais; documento 8 ainda interno. Sem merge, implantação ou
mudança de identidade visual.

## Implementação

PNG e miniatura pixel, SVG e raster vetorial usam o leitor comum de células.
O percurso opcional global linha/coluna intercala as linhas de chunks armazenados
da mesma faixa, sem visitar lacunas nem ordenar uma coleção por célula. O percurso
padrão dos consumidores existentes permanece por chunks. A imagem subtrai a
origem lógica, mantendo os offsets, giros, espelhos e recorte do documento.

O resolvedor comum conserva múltiplas folhas e versões privadas. SVG reutiliza
símbolos e definições de máscaras/gradientes, com teto durante a montagem e após
incorporar fontes. Não achata regiões numa matriz do tamanho do mundo. A galeria
usa a mesma visão geral de cores limitada do minimapa, com os estilos existentes.

Admissão do novo raster: até 8.192 pixels por lado e 16.777.216 pixels de área,
antes de criar canvas ou preparar fontes. Miniaturas até 512 pixels; SVG até
8 Mi de unidades UTF-16, com recusa do pedido inteiro. O limite de área é o mesmo
do compositor de cena anterior, agora compartilhado. São limites conservadores
do caminho interno; não houve ampliação de cotas dos destinos ou qualificação
do maior raster em outros dispositivos.

A revisão encontrou que limitar só o canvas não limitava as dimensões intrínsecas
do SVG entregue ao navegador. `withSvgRootSize`, já usado no compositor portátil,
foi extraído para o módulo vetorial comum. O raster de regiões reduz width/height
do SVG ao tamanho aprovado, conservando viewBox e geometria de origem. O caminho
portátil anterior continua usando a mesma função, sem implementação duplicada.

## Referências e evidência

A exportação antiga tem dois contratos: o caminho inicial achata a peça que vence
em cada célula; a cena completa compõe transparências de todas as camadas. Os dois
foram conservados. A primeira tentativa comparou a saída por regiões à imagem
achatada e encontrou as diferenças previstas em 18 casos básicos. A prova inicial
e o diagnóstico estão preservados. A referência de regiões agora declara a
composição completa através de um grupo neutro no caso básico, sem alterar o
código legado nem reduzir a comparação rigorosa de pixels.

O servidor de QA compila os módulos pixel/vetor reais da base histórica via
`git show`, mantendo os imports locais, e compara sua saída com a implementação
atual. Não é outro algoritmo reescrito para representar a versão anterior.

- Três testes iniciais falharam antes da implementação: ordem entre chunks,
  SVG vazio e chamada à API de matriz densa na rasterização.
- Testes focados: 121 aprovados, zero falhas, 561 asserções, incluindo o compositor
  portátil e SVGs existentes. Admissão inválida não chega a criar canvas;
  SVG excessivo recusa tudo. Mundo esparso de 100 milhões de casas conserva
  duas instâncias em menos de 2.048 caracteres, sem alterar o documento.
- Suíte final: 2.449 aprovados, três controles nativos executados à parte,
  zero falhas e 29.026 asserções.
- Três ensaios de imagens Chromium, sem retries: desktop, toque emulado e CPU 4×.
  Por perfil: 20 imagens legadas idênticas à fonte histórica e 36 imagens por
  regiões idênticas à composição completa densa. Total de 168 comparações de
  hashes dos pixels RGBA. Os dois SVGs legados distintos também conservam seus
  hashes em cada perfil. Quatro escalas, duas origens negativas (uma desalinhada
  dos chunks), múltiplas folhas, fonte privada conflitante com a galeria,
  transparência, máscaras, gradientes, colisão/visibilidade e transforms.
  Todas as imagens comparadas têm pixels visíveis; igualdade de imagens vazias
  não é aceita como prova de composição.
- Mundo 10.000 × 10.000 exercitado com PNG pixel e vetorial reais de 512 × 512.
  A prova captura o Blob SVG realmente enviado ao decoder, encaminhando a URL
  original, e verifica width/height 512 com viewBox 160.000 × 160.000. Sem
  substituição do decoder ou do desenho; a instrumentação só existe no bundle de QA.
- Seis ensaios do renderer e três da oficina/minimapa aprovados novamente,
  incluindo pressão de cache e pixels canônicos; 12 ensaios de navegador neste lote.
- Três controles com Pygame real aprovados, 4.372 asserções. São controles do
  formato público existente, não homologação do formato 8 nesses motores.

A suíte inicial encontrou somente duas entradas obsoletas na lista de acesso cru
às células. Os renderizadores adaptados já delegavam ao leitor comum; as entradas
foram retiradas sem relaxar nenhuma asserção da auditoria. A suíte, os typechecks
e o lint finais estão relacionados em `index.json`, com os logs e hashes de fontes.
Uma invocação avulsa da unidade pela raiz, sem o setup DOM do pacote, falhou e foi
corrigida executando a partir de `packages/pinta`; os resultados qualificados usam
esse diretório e a configuração oficial.

## Limites e continuação

Esse lote adapta imagens de **peças**. Objetos e conjuntos completos continuam
no compositor de cena existente; sua imagem por regiões depende do adaptador
Scene 4, ainda pendente. O item 2 continua aberto, assim como a união pública 8,
IO 3, motores, contratos externos novos, ferramentas restantes e ciclo final da Vila.
Não criar outro sistema de composição para cobrir esses objetos.

Não houve medição de heap ou aprovação dos alvos de latência. Uma máquina física,
sem ensaio com crianças ou outros aparelhos. O contrato antigo de PNG/SVG e os
fluxos públicos foram usados como regressão; as provas externas históricas não
qualificam os futuros formatos de regiões.
