# Passo a passo do projeto: A Estação de Reciclagem

Missão do Construtor. Aqui está um jeito de montar cada etapa das duas aulas: o que a regra faz, os blocos, onde encaixar, como testar e o que conferir. Ele chega no fim da Aula 1, depois do envio, para conferir o jogo e entender cada escolha. O seu jeito pode ser diferente e estar certo também.

## Monte a Estação de Reciclagem em 2D

### As peças chegam pelas esteiras

**Relembre:** Dois relógios criam as peças só durante a partida; o quadro do jogo as move e tira do grupo quem sai da tela.

1. Em ⚡ Quando acontecer, coloque um bloco A cada 1,6 segundos. Dentro dele, um Se o estado do jogo é jogando.
2. No então, use duas vezes o No grupo reciclaveis criar um sprite: um em x 76 e outro em x 652, os dois em y -72, largura e altura 72, com a imagem da reciclável, vx 0 e vy 3.
3. Coloque outro A cada 2,2 segundos com o mesmo Se. No então, No grupo proibidos criar um sprite em x 364, com a imagem da pilha e as mesmas medidas.
4. No A cada quadro do jogo, dentro do Se jogando que já existe, coloque Mover os sprites do grupo reciclaveis usando suas velocidades e o mesmo para proibidos.
5. Logo depois, Tirar do grupo reciclaveis quem sair da tela e o mesmo para proibidos.

**Teste:** Rode e espere sem apertar Enter: nada nasce. Aperte Enter: as peças nascem e descem.

**Se não funcionar:** Se nascerem peças na abertura, falta o Se jogando dentro do A cada. Se as peças ficarem paradas, confira o Mover os sprites do grupo.

### Ponto pela reciclável, vida pela pilha

**Relembre:** Cada encontro do coletor com um grupo tira a peça do grupo e muda uma conta uma vez só.

1. No A cada quadro do jogo, dentro do Se jogando, coloque Para cada sprite do grupo reciclaveis que colidir com o sprite coletor.
2. Dentro dele, Tirar o sprite (a peça do encontro) do grupo reciclaveis e Somar 1 em variável pontos.
3. Coloque outro Para cada sprite do grupo proibidos que colidir com o sprite coletor.
4. Dentro dele, Tirar o sprite do grupo proibidos e Machucar o sprite coletor em 1, invencível por 60 quadros.

**Teste:** Leve o coletor até uma esteira da borda: cada garrafa soma um ponto. Fique no meio: cada pilha apaga um coração.

**Se não funcionar:** Se o placar disparar, a peça não está saindo do grupo no encontro. Se a vida não cair, confira o Machucar dentro do encontro com proibidos.

### A partida termina

**Relembre:** A cada quadro, primeiro a pergunta das vidas; no senão, a pergunta da meta.

1. No A cada quadro do jogo, dentro do Se jogando, depois dos encontros, coloque um Se as vidas do sprite coletor acabaram?
2. No então, Mudar o estado do jogo para derrota.
3. No senão, outro Se pontos ≥ meta, com Mudar o estado do jogo para vitoria no então.

**Teste:** Fique no meio até as vidas acabarem: aparece a derrota. Recolha as peças até a meta: aparece a vitória. O Enter da tela final volta à abertura.

**Se não funcionar:** Se as duas telas brigarem, confira se a pergunta da meta está no senão da pergunta das vidas.

### A equipe pediu uma meta nova

**Relembre:** A vitória compara o placar com a variável meta: mudar a meta muda a vitória e o número no canto.

1. Em Ao iniciar, troque o valor de Criar variável meta para 15.
2. Confira a vitória: ela compara pontos com a variável meta, não com um número escrito.

**Teste:** Jogue: com 10 peças a partida continua, e a vitória vem no 15.

**Se não funcionar:** Se a vitória chegar no 10, a condição está com o número escrito. Troque o número pela variável meta.

## Leve a estação para o galpão 3D

### As bocas soltam as peças

**Relembre:** Dois relógios criam cópias das peças nas bocas do fundo, só durante a partida. As esteiras já levam as peças.

1. Coloque um A cada 1,6 segundos. Dentro dele, um Se estado = jogando.
2. No então, use duas vezes o Criar uma cópia de moldeReciclavel no grupo reciclaveis: em x -4 e em x 4, os dois em y 1,5 e z -34.
3. Coloque outro A cada 2,2 segundos com o mesmo Se, criando uma cópia de moldeProibido no grupo proibidos em x 0, y 1,5 e z -34.

**Teste:** Rode e espere sem apertar Enter: nada sai das bocas. Aperte Enter: as peças saem e vêm até você.

**Se não funcionar:** Se sair peça na abertura, falta o Se estado = jogando dentro do A cada.

### Os encontros no galpão

**Relembre:** Os encontros do coletor com cada grupo, com a guarda da partida.

1. Coloque Quando coletor encostar em algum do grupo reciclaveis, chamando de pecaReciclavel. Dentro, um Se estado = jogando.
2. No então: Tirar o objeto pecaReciclavel do grupo reciclaveis, Somar 1 em variável pontos e Escrever na tela no alto à direita o texto "Peças: " + pontos + " / " + meta.
3. Coloque Quando coletor encostar em algum do grupo proibidos, chamando de pecaProibida, com o mesmo Se.
4. No então: Tirar o objeto pecaProibida do grupo proibidos e Machucar coletor tirando 1 de vida.

**Teste:** Na esteira da borda, o placar sobe a cada garrafa. No meio, cada pilha tira uma vida.

**Se não funcionar:** Se a peça atravessar o coletor, confira o Tirar o objeto do grupo dentro do encontro.

### O galpão também termina a partida

**Relembre:** A cada quadro, durante a partida, primeiro a vida; no senão, a meta.

1. Dentro de A cada quadro, no começo, coloque um Se estado = jogando.
2. Nele, Se a vida de coletor ≤ 0: estado recebe "derrota", Escrever na tela embaixo um texto vazio e Fim de jogo: perdeu.
3. No senão, Se pontos ≥ meta: estado recebe "vitoria", Escrever na tela embaixo um texto vazio e Fim de jogo: ganhou.

**Teste:** Fique no meio até a vida acabar: vem a tela de quem perdeu. Recolha até a meta: vem a de quem ganhou.

**Se não funcionar:** Se o fim de jogo se repetir, confira o Se estado = jogando em volta das perguntas.

### Uma meta nova para o galpão

**Relembre:** A vitória e o texto do placar leem a variável meta.

1. Em Ao iniciar, troque o valor de Criar variável meta para 12.

**Teste:** Com 10 peças a partida continua; no 12, vem a vitória, e o placar mostra / 12.

**Se não funcionar:** Se a vitória chegar no 10, troque o número escrito na condição pela variável meta.

## Entrega

Em cada aula, o envio fecha a última etapa, a da meta nova. Antes de enviar, jogue uma partida inteira: espere na abertura sem nada nascer, aperte Enter, recolha recicláveis numa esteira da borda e deixe uma pilha chegar no meio. Depois teste os dois finais.

Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

Quando aparecer Projeto enviado!, clique em Próxima parte. Na Aula 1, lá está este Passo a passo; na Aula 2, a última parte comemora a missão cumprida. Depois clique em Concluir aula.

A missão conta quando as duas aulas estão concluídas. Ela não dá certificado nem promove sozinha: a jornada também confere os dois cursos da trilha e dois Poderes.
