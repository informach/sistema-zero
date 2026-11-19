# Plataformas de mão única — fechamento da etapa 2b

Este lote está em verificação local. O pedido de executar o plano inteiro
autoriza esta continuação sem uma nova aprovação entre etapas. A missão completa,
o rollout do leitor físico e a escrita de nuvem continuam no plano principal.

O documento já distinguia peças sólidas de plataformas. A reprodução mostrou o
personagem atravessando o piso em `y=40,25` e parando apenas em `y≈192`. O teste
do editor ignorava plataformas; o JavaScript arredondava as dos conjuntos para
a grade do mundo, e os pacotes externos usavam interpretações próprias.

## Decisão de arquitetura

A cena 3 usa uma consulta comum de pouso, separada da consulta de obstáculos
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

A travessia de células e conjuntos é compartilhada com a consulta sólida:
candidatas obtidas pela caixa inversamente transformada, sem reter outra cópia
do mapa. O JavaScript portátil é gerado do núcleo; Python e GDScript têm
adaptações verificadas pela mesma fixture. A resolução respeita o teto,
as paredes e o comando existente de descer por uma plataforma.

O percurso escolhe a primeira superfície e só depois consulta os sólidos. Não
faz outra varredura de sólidos para cada peça candidata. O Python visita apenas
as células candidatas do documento, sem acrescentar uma lista permanente de
polígonos de plataformas. O Godot reutiliza as vistas de camadas e sua transformação
real. Pygame/Godot admitem o arredondamento de coordenadas float32; não usam uma
tolerância fixa de um pixel que apagaria conjuntos pequenos.

O formato autoral permanece 7, a cena permanece 3 e o PNG de dados permanece 4:
não há campo autoral novo neste lote. O runtime físico ainda está em homologação
local e precisa do rollout controlado antes da liberação da escrita. A consulta
nova não promove cenas antigas nem reescreve o programa de jogos já salvos.

## Uso na oficina e nos motores

Marque a peça como plataforma no editor de peças. Em um mapa com os contornos
precisos ativados, a mesma peça pode ficar dentro de um conjunto reduzido, girado
ou espelhado. **Testar com personagem → Vista de lado** permite pousar e saltar
por baixo; a vista de cima atravessa plataformas. Os controles existentes foram
reutilizados, sem outra identidade visual.

O bloco de colisão do cenário usa o pouso no Jogo 2D e no Avançado. O Jogo 2D
respeita gravidade invertida; o Avançado conserva seu comando de descer pela
plataforma. No Phaser, a gravidade vem do corpo e do mundo do Arcade; gravidade
zero conserva o exemplo visto de cima. No Godot, `pouso(anterior, desejado,
gravidade)` devolve um `Rect2` apoiado ou `null`, para o jogo decidir como mover.

Em Python, `mapa.pouso(antes, jogador, gravidade=1)` devolve um `pygame.FRect`
apoiado ou `None`, sem alterar os corpos recebidos. Há o bloco **corpo apoiado na
plataforma**. O programa aplica gravidade e move o personagem, resolve paredes
e então usa a consulta de pouso. Para descer por uma plataforma, omite a consulta
durante a queda. No pacote portátil, `Mundo.mover(dx, dy, gravidade=1)` integra
o pouso; o valor padrão 0 conserva o movimento visto de cima. A consulta não
aplica aceleração nem cria eventos dentro do documento do Pinta.

## Jogo criado automaticamente

O ensaio completo encontrou duas falhas no programa que **Jogar meu mapa** criava:
ele ignorava plataformas dentro de conjuntos e não aplicava gravidade antes do
controle lateral. A cena 3 agora consulta as peças visíveis na geometria comum.
Os novos programas de plataforma usam a sequência oficial `applyGravity` →
`platformerWithTerrain` → colisão, sem inventar um piso na borda da tela.

O ajuste da sequência vale para projetos novos; projetos já salvos mantêm seu
IR, arquivos e blocos. O ensaio local criou o jogo pela interface, executou o
personagem, mudou o deslocamento da camada no Pinta e confirmou o novo pouso,
comparando programa/blocos antes e depois e reabrindo o projeto salvo. Isso é
evidência local de integração, distinta da homologação autenticada de staging.

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
