# Patrulha Espacial

Base 3D do Construtor, em 5 aulas. As telas, estado e reinício vêm preparados. A autoria das regras evolui por pequenas montagens; a escolha de arte não altera as regras.

## Aula 1. Da tela ao espaço

**Entrada:** A nave já se move para os lados depois de Enter. Cena, câmera, três modelos, grupos vazios, percursos, abertura, estado e telas finais estão preparados. As velocidades dos grupos ainda são zero.

**Conquista:** Cada aperto de Espaço cria um laser na posição lateral da nave; ele viaja pelo Z negativo e sai do grupo ao ultrapassar o limite.

1. Conheça a Patrulha Espacial (intro).
2. Seu passo a passo do projeto (material).
3. Investigue as três direções (experience).
4. Um aperto, um laser (build).
5. O laser nasce na nave (build).
6. O laser segue para o fundo (build).
7. O laser tem um fim de caminho (delivery).

## Aula 2. Asteroides na rota

**Entrada:** Os lasers nascem no X da nave, viajam com velocidade Z -22 e são retirados depois do limite. O grupo asteroides ainda está vazio.

**Conquista:** Asteroides surgem a cada 1,5 segundo dentro da faixa lateral fornecida, aproximam-se pelo Z positivo e saem do grupo depois de passar pela nave.

1. O ritmo dos asteroides (experience).
2. Um asteroide a cada intervalo (build).
3. Uma faixa para as entradas (build).
4. Os asteroides vêm até a nave (build).
5. A pedra sai depois de passar (delivery).

## Aula 3. Acertar no espaço

**Entrada:** Tiros e asteroides percorrem a rota e saem dos grupos ao passar dos limites. Ainda não há resposta ao contato nem contador de pontos.

**Conquista:** Um contato real retira o par envolvido, consome o alvo uma única vez e soma um ponto. O placar começa em zero e mostra cada acerto.

1. Parecer junto ou encostar? (experience).
2. Um encontro que acerta (build).
3. Um lugar para guardar os pontos (build).
4. Cada acerto soma um (build).
5. Veja a contagem na tela (delivery).
6. O que faz o ponto valer? (quiz).

## Aula 4. Três chances na patrulha

**Entrada:** O laser consome um asteroide por acerto, soma pontos e atualiza o placar. A nave ainda não recebe dano.

**Conquista:** A nave começa com três vidas. No contato com uma pedra, o jogo retira apenas essa pedra e desconta uma vida, respeitando a breve proteção nativa.

1. Três chances para a nave (build).
2. Um respiro depois da batida (experience).
3. A batida tira uma vida (build).
4. Só a pedra da batida sai (delivery).

## Aula 5. Uma patrulha completa

**Entrada:** Disparos, surgimento, percursos, retirada, acertos, placar e dano funcionam. A abertura, o estado, Enter, os textos das telas finais e o botão de retorno estão preparados; ainda não existem condições que acionem os resultados.

**Conquista:** Vida zero aciona a derrota; se houver vida, vinte pontos acionam a vitória. O jogo encerra uma vez e o botão nativo prepara outra partida com zero pontos e três vidas.

1. Quando as vidas acabam (build).
2. Vinte acertos abrem a rota (build).
3. Confira a patrulha completa (delivery).
4. Por que o jogo termina? (quiz).
5. Sua patrulha está pronta (fecho).
