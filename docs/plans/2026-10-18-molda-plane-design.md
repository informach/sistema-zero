# Objeto Plano no Molda

Decisão confirmada: o botão **Plano** aparece junto das formas em **Adicionar**.
A peça nasce deitada no plano XZ, com 2 × 2 unidades e sem espessura. Pode ser
girada, movida, redimensionada, duplicada e pintada pelos controles existentes.

A geometria usa a malha nativa com quatro vértices, uma face e UV quadrado;
o material permite visualizar a mesma pintura pelos dois lados. Isso conserva o
formato atual de projeto e a exportação GLB. “Puxar” pode dar volume à face.

Foi escolhida uma face real, em vez de achatar uma caixa ou criar um formato novo
de geometria. A caixa manteria faces sobrepostas; um novo formato ampliaria os
contratos de importação e exportação sem necessidade para esta peça.

A criação respeita o grupo de destino, a colocação ao lado, os acessos por nível
e o histórico existente. Dimensões sem extensão permanecem em zero; os outros
eixos podem ser ajustados sem produzir uma transformação singular.

Verificar criação, posição, seleção, pintura e extrusão; tamanho em eixos planos;
duplicação, desfazer e leitura/escrita/exportação do documento. Conferir o botão
no navegador e manter os tokens e os alvos de interação da oficina.
