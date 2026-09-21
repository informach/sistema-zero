# Máscaras e âncoras de rotação no Pinta — desenho técnico

## Objetivo

O editor vetorial do Pinta deve permitir que uma forma fechada limite a área visível de outras
formas sem destruir o desenho original. O caso principal é mostrar apenas o rosto do vagalume
dentro da janela circular da nave. O editor também deve permitir mover a âncora de rotação para o
centro, uma ponta ou qualquer ponto fora do objeto.

Os dois recursos devem sobreviver a salvar, desfazer, duplicar, animar e exportar. O editor, as
prévias e os arquivos exportados devem mostrar a mesma composição.

## Decisões de produto

- A máscara é não destrutiva e removível.
- A forma fechada mais à frente da seleção vira a máscara e deixa de aparecer como arte.
- O conteúdo mascarado pode conter várias formas e grupos existentes.
- O conjunto mascarado se comporta como uma unidade para seleção, transformação, ordem,
  visibilidade e bloqueio.
- A máscara pode ser editada separadamente sem mover o conteúdo.
- A âncora é livre e pode ficar dentro ou fora da caixa do objeto.
- Mover a âncora preserva a pose atual. Apenas rotações posteriores usam o novo ponto.
- A âncora funciona em formas, grupos, conjuntos mascarados e seleções múltiplas.
- Esta entrega implementa recorte geométrico. Transparência suave e máscaras aninhadas ficam fora
  do escopo.

## Modelo de dados

`VectorShapeBase` recebe dois campos opcionais:

- `rotationPivot?: Vec2`: ponto absoluto de rotação no espaço do quadro;
- `maskId?: string`: `id` da forma que recorta aquela forma.

A ausência de `rotationPivot` mantém a semântica atual: o centro da caixa geométrica. Assim,
projetos antigos preservam o mesmo resultado e não precisam de migração.

A máscara continua no vetor de formas. As formas recortadas apontam para seu `id`; qualquer forma
referenciada como máscara deixa de ser pintada. O modelo não precisa de um novo nó contêiner e não
altera `groupId`. Uma forma pode apontar para uma única máscara, enquanto uma máscara pode recortar
várias formas.

O sanitizador individual aceita somente pontos finitos e identificadores seguros. O sanitizador do
quadro remove referências ausentes, autorreferências, ciclos e máscaras aninhadas. Uma referência
inválida libera o conteúdo como arte normal, em vez de escondê-lo.

Operações de clonagem usam duas passagens: primeiro criam o mapa de IDs antigos para novos; depois
reescrevem `maskId`. Duplicar quadro preserva `motionId`, troca `id` e remapeia a máscara. Duplicar ou
colar formas troca `id` e `motionId`, preserva os vínculos internos e nunca aponta para a seleção
original.

## Geometria da âncora

Um helper único calcula o pivô efetivo: `rotationPivot` quando presente ou o centro da caixa quando
ausente. Renderização, hit-test, amostragem de cor, achatamento, gradientes e exportação usam esse
helper.

Ao mover a âncora de uma forma já girada, o editor compensa as coordenadas da geometria para manter
a imagem no mesmo lugar. A alteração entra no histórico como uma única ação no fim do gesto.

As transformações mantêm estas invariantes:

- mover uma forma move seu pivô pela mesma distância;
- redimensionar transforma o pivô em torno da mesma âncora de resize;
- espelhar reflete o pivô no mesmo eixo;
- girar uma seleção transforma cada forma e seu pivô em torno do pivô comum;
- editar pontos de um caminho mantém o pivô absoluto até o usuário movê-lo ou centralizá-lo.

Ao posicionar a âncora de uma seleção, o editor grava o mesmo pivô em todos os membros e compensa
cada forma. A seleção passa a girar rigidamente ao redor desse ponto. **Centralizar âncora** remove
os valores personalizados e restaura o centro geométrico da forma ou da união selecionada.

## Relação de máscara e seleção

O editor expande a seleção pelo fechamento das relações de grupo e máscara. Selecionar o conteúdo,
a fonte da máscara ou um membro agrupado alcança todos os membros da unidade. Essa mesma expansão
alimenta mover, redimensionar, girar, apagar, duplicar, ordenar, ocultar, bloquear e a proteção de
formas bloqueadas.

**Criar máscara** exige pelo menos duas formas visíveis e desbloqueadas. A forma mais à frente deve
ser um retângulo, elipse, polígono ou caminho fechado. Linha, texto, imagem e caminho aberto não
definem máscara nesta versão. A operação rejeita formas já mascaradas e fontes de outra máscara.

O modo **Editar máscara** seleciona somente a fonte para o gesto em andamento, desenha seu contorno
tracejado sobre a composição e mantém o conteúdo no lugar. Sair do modo restaura a seleção da
unidade. **Soltar máscara** remove `maskId` do conteúdo e volta a pintar a forma usada como máscara
na posição original da pilha.

## Interface

A barra de seleção recebe as ações **Criar máscara**, **Editar máscara**, **Soltar máscara** e
**Centralizar âncora** conforme o estado atual. Mensagens curtas explicam seleção insuficiente,
forma aberta, vínculo existente e bloqueio.

O palco mostra um alvo pequeno no pivô da seleção. O alvo aceita arraste livre dentro ou fora do
objeto e permanece disponível junto ao puxador de rotação. Durante o arraste, uma linha liga o alvo
ao centro visual da seleção. O marcador some durante desenho, edição de nós e outros gestos
incompatíveis.

O painel de camadas identifica a fonte com o rótulo **Máscara**. A composição continua plana; o
painel não cria uma segunda árvore de grupos. Clicar na fonte oferece a entrada para edição da
máscara, enquanto as ações comuns operam sobre a unidade completa.

## Renderização e exportação

O funil SVG passa a resolver máscaras antes de emitir formas:

1. encontra as fontes referenciadas;
2. cria um `clipPath` por fonte com a geometria e a transformação da máscara;
3. omite a fonte da pintura normal;
4. aplica `clip-path` a cada conteúdo sem alterar sua posição na ordem de camadas.

Aplicar o recorte em cada forma preserva a ordem Z mesmo quando outras formas aparecem entre os
membros no vetor plano. Os IDs de `clipPath` recebem o mesmo prefixo seguro já usado por gradientes.

`VectorFrameSvg` e o gerador textual compartilham a resolução de cena. SVG estático, PNG, GIF,
spritesheet, ZIP, miniaturas e ponte com o Studio passam pelo mesmo resultado. A máscara necessária
entra em `<defs>` mesmo sem ser pintada.

O exportador de SVG animado usa o pivô efetivo nas rotações interpoladas. Se qualquer pose contiver
máscara, ele exporta poses completas com alternância discreta de visibilidade. Esse fallback mantém
o recorte exato e evita interpolar relações de máscara. A regra de redução de movimento continua
mostrando o primeiro quadro completo.

## Compatibilidade e falhas

- Campos opcionais mantêm backups e assets antigos válidos.
- Desfazer e refazer cobrem criar, editar e soltar a máscara, além de mover e centralizar a âncora.
- O guard central de formas bloqueadas recebe sempre a seleção expandida.
- Ocultar ou bloquear uma composição aplica a mudança à unidade. A fonte continua disponível em
  `<defs>` quando houver conteúdo visível que dependa dela.
- Uma máscara inválida importada libera o conteúdo e nunca produz uma referência SVG quebrada.
- Pathfinder e operações que substituem geometria exigem soltar a máscara antes; a interface
  explica a restrição.
- O limite atual de formas continua valendo. Criar uma máscara não cria formas novas.

## Testes

- Modelo: sanitização dos campos, referências ausentes, ciclos, máscaras aninhadas e round-trip
  JSON.
- Clonagem: duplicar forma, seleção, quadro e animação remapeia IDs e preserva `motionId` conforme o
  contrato atual.
- Geometria: pivô padrão, pivô externo, preservação visual, mover, resize, flip, rotação individual
  e rotação rígida de grupos.
- Interação: criar, editar e soltar máscara; alvo arrastável; centralização; undo/redo; lock; seleção
  por grupo e máscara.
- Renderização: `clipPath`, prefixos, ordem Z, fonte omitida, pivô no `transform`, hit-test e
  amostragem de cor dentro e fora do recorte.
- Exportação: SVG estático, poses discretas no SVG animado, PNG/GIF/spritesheet e payload do Studio.
- Regressão: documentos sem os campos novos mantêm snapshots e comportamento atuais.
- QA no navegador: montar o rosto do vagalume na janela, editar a máscara, mover a âncora para uma
  ponta, girar, duplicar o quadro, reproduzir e exportar.

## Fora do escopo

- Máscaras por luminância ou transparência suave.
- Máscaras aninhadas ou uma pilha de máscaras por forma.
- Interpolação suave da geometria da máscara no SVG animado.
- Hierarquia nova de grupos com filhos aninhados.
- Conversão automática de texto, imagem ou linha em caminho de máscara.
- Snapping da âncora a vértices ou guias.
