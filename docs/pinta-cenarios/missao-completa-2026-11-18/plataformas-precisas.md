# Plataformas de mão única — fechamento da etapa 2b

Este documento registra o próximo lote, ainda não entregue. O pedido de executar
o plano inteiro autoriza esta continuação sem uma nova aprovação entre etapas.

O documento já distingue peças sólidas de plataformas. Hoje o teste do editor
ignora plataformas; o JavaScript arredonda as plataformas de conjuntos para a
grade do mundo, e os pacotes externos usam interpretações próprias. Uma peça
reduzida, deslocada ou girada pode desaparecer ou parar o corpo no lugar errado.

## Decisão de arquitetura

A cena 3 terá uma consulta comum de pouso, separada da consulta de obstáculos
sólidos. Cenas 1/2 conservam o comportamento dos jogos existentes. Não se muda a
aparência do editor nem se coloca programação no documento do cenário.

A plataforma é a peça real, com os deslocamentos de camada e a transformação
completa do conjunto. Sua face de pouso é o contorno superior no sentido da
gravidade do jogo; gravidade invertida usa o contorno inferior. Saltar de baixo
para cima continua permitido. Rotação/espelhamento não transformam a plataforma
em uma parede de duas faces. Uma peça marcada como sólida prevalece sobre a
marca de plataforma.

O cálculo considera a largura inteira do corpo. Recorta a peça ao intervalo
horizontal do corpo e calcula a superfície nesse intervalo, sem amostrar seu
centro ou criar uma grade achatada. Compara o corpo anterior ao pretendido para
impedir atravessamento durante a queda, incluindo conjuntos muito pequenos.
Contato sem penetração é apoio, e peças invisíveis não participam. Opacidade
zero permanece distinta de invisibilidade, como nas colisões sólidas.

A travessia de células e conjuntos será compartilhada com a consulta sólida:
candidatas obtidas pela caixa inversamente transformada, sem reter outra cópia
do mapa. O JavaScript portátil será gerado do núcleo; Python e GDScript terão
adaptações verificadas pela mesma fixture. A resolução precisa respeitar o teto,
as paredes e o comando existente de descer por uma plataforma.

## Execução e aceite

1. Reproduzir a queda pelo piso no editor e o arredondamento de um conjunto.
2. Testar o núcleo com pisos fracionários, conjuntos menores que uma célula,
   giros, espelhos, offsets/grupos, várias folhas, camadas ocultas, gravidade
   invertida, salto por baixo, apoio parado, velocidade alta e sólidos próximos.
3. Integrar teste lateral do editor, Jogo 2D e Avançado; preservar vista de cima
   e a interpretação antiga das cenas 1/2. Verificar pelo motor real dos blocos.
4. Integrar os adaptadores Phaser, Pygame e Godot sem depender da grade achatada.
   O jogo decide sua gravidade; a API de movimento vista de cima continua válida.
5. Ensaiar a mesma fixture no navegador e nos motores nativos. Regerar e
   qualificar o artefato Python exato antes do rollout do leitor físico.
6. Medir custo/tamanho e executar regressões, sincronia, histórico e reabertura.
   Registrar resultados e limites antes de marcar a etapa como concluída.

Terrenos, espalhamento, projeções e os demais itens continuam no plano principal;
este lote não será usado como evidência de conclusão desses recursos.
