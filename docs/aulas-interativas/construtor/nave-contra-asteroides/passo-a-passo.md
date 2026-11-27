# Passo a passo do projeto · Nave Contra Asteroides

Construa as regras de Nave Contra Asteroides: faça a nave se mover, crie lasers e asteroides, programe os acertos, conte pontos e cuide das vidas. Depois, use as condições de vitória e derrota para fechar a partida e teste o reinício. As escolhas de nave, espaço, asteroide e laser mudam a aparência. Você pode consultar cada parte quando precisar de um passo.

## Aula 1. Prepare o voo da sua nave

### Jogue antes de construir

Sua vez! Comece com Enter, mova a nave com as setas e toque em Espaço para disparar. Jogue o quanto quiser. Quando terminar, clique em Próxima parte.

1. Clique no jogo e pressione Enter.
2. Segure as setas esquerda e direita para mover; solte para parar.
3. Toque em Espaço para disparar. Cada novo toque cria um laser.
4. Depois do resultado, Enter volta ao início; outro Enter começa novamente.

**Teste no jogo:**

- Experimente a versão completa. A participação basta para seguir.

### Seu passo a passo do projeto

Este é o seu Passo a passo do projeto! Você pode consultar aqui ou baixar para guardar. Quando quiser continuar, clique em Próxima parte.

1. Consulte o Passo a passo do projeto quando precisar de um encaixe ou de um teste.
2. Se quiser guardar o PDF, clique em Baixar.
3. Os links do Como fazer ajudam a usar a plataforma; Preciso de ajuda permite pedir orientação sobre o jogo.

### Escolha a nave e o cenário

Escolha a nave e o cenário

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Procure o bloco que cria o sprite chamado nave. Deixe esse bloco à vista.
3. Clique no campo da imagem, onde aparece um nome como nave-falcao-azul. Escolha a nave que você quiser entre as três imagens de nave.
4. Conserve a largura em 56, a altura em 64 e os outros números. Assim, a troca muda o desenho e mantém o espaço ocupado pela nave.
5. Ainda em Ao iniciar, procure Pôr o cenário atrás de tudo.
6. Clique na imagem do cenário, como cenario-aurora, e escolha o espaço que quiser. Você pode trocar só uma imagem, as duas ou manter as que gostou.

**Teste no jogo:**

- Clique no jogo e pressione Enter. A abertura dá lugar ao espaço, com a nave que você escolheu. Ela ainda fica parada, porque o movimento será sua próxima construção.

### A nave em câmera lenta

Observe os passinhos da nave com a seta pressionada e solta.

1. Observe os passinhos da nave com a seta pressionada e solta.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Faça a nave responder às setas

Faça a nave responder às setas

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de A cada quadro do jogo, encontre o Se com a pergunta o estado do jogo é jogando. Deixe à vista o espaço vazio do então.
3. Abra Jogo 2D, depois Movimento e depois Movimentos prontos.
4. Pegue Mover o sprite nave com as setas esquerda e direita e solte dentro do então desse Se.
5. O nome já é nave. No campo velocidade, troque 6 por 5.
6. Pense na placa de aberto ou fechado de uma loja. O jogo também tem uma placa, chamada estado: na abertura ela diz início, depois do Enter ela vira jogando e, no fim, vitória ou derrota. Esse Se olha a placa e só deixa a nave andar quando ela diz jogando. É por isso que, na abertura, a nave fica quietinha.

**Teste no jogo:**

- Clique no jogo e pressione Enter se a abertura estiver aparecendo. Segure a seta da direita por um instante, solte e faça o mesmo com a esquerda. A nave acompanha as setas e para quando você solta.

### A beirada da tela

Compare a nave perto da beirada com o limite ligado e desligado.

1. Compare a nave perto da beirada com o limite ligado e desligado.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Mantenha a nave na tela

Mantenha a nave na tela

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Encontre o movimento dentro de Se jogando e deixe o encaixe logo abaixo dele à vista.
3. Abra Jogo 2D, depois Movimento e depois Bordas e rebatidas.
4. Pegue Manter o sprite dentro da tela e solte logo abaixo do movimento, ainda dentro do então.
5. O bloco chega com heroi. Clique nesse nome e escolha nave.

**Teste no jogo:**

- Clique no jogo e pressione Enter se estiver na abertura. Segure a seta da esquerda até a borda e depois a da direita. A nave deve permanecer inteira na tela, mesmo enquanto você segura a seta.

### Mostre os controles e envie

Mostre os controles e envie

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de A cada quadro do jogo, encontre Desenhar o sprite nave. Deixe o encaixe logo abaixo dele à vista, antes das perguntas que desenham as telas.
3. Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela. Pegue Escrever e encaixe nesse lugar.
4. No campo do texto, troque Nave contra Asteroides por esta legenda: SETAS: mover   ESPAÇO: disparar. Deixe uns espaços entre os dois controles.
5. Coloque 400 no x, 60 no y e 15 no tamanho, e escolha o alinhamento no centro. Assim a legenda fica no alto da tela, longe da nave: 400 é o meio da largura.

**Teste no jogo:**

- Comece a partida e teste as duas setas até as bordas. Confira também a legenda. O disparo ainda será construído na próxima aula; agora, o movimento já funciona.

## Aula 2. Faça o laser nascer na nave

### Quando sai o tiro?

Compare o disparo ligado à tecla com a criação repetida em todo quadro.

1. Compare o disparo ligado à tecla com a criação repetida em todo quadro.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Faça Espaço responder

Faça Espaço responder

1. Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Deixe à vista o encaixe depois do evento de Enter, fora do fazer dele. O novo evento vai ser um vizinho do Enter.
3. Abra Jogo 2D, depois Controles e depois Teclado, ações e toque. Pegue Quando apertar a tecla e encaixe no lugar separado que você deixou à vista.
4. Clique no campo da tecla e escolha barra de espaço.
5. Deixe à vista o espaço fazer do evento de Espaço. Abra Programação e depois Lógica e Se. Pegue Se e solte dentro desse fazer.
6. Retire a pergunta x maior que zero que nasceu no Se e leve só essa pergunta para a lixeira.
7. Com o lugar da pergunta à vista, abra Jogo 2D, depois Jogo e telas e depois Telas e partida. Pegue o estado do jogo é e encaixe no lugar vazio.
8. No nome do estado, escolha jogando. Esse é o mesmo cuidado usado no movimento.
9. Deixe à vista o então desse Se. Abra Jogo 2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito dentro do então e escolha tiro grande.

**Teste no jogo:**

- Clique em Rodar de novo. Na abertura, toque em Espaço e escute. Depois, pressione Enter e toque em Espaço novamente. O som do tiro deve responder durante a partida. Deixe o som do aparelho ligado para ouvir.

### Objetos que entram e saem

Compare o que aparece na tela com os objetos que continuam guardados no grupo.

1. Compare o que aparece na tela com os objetos que continuam guardados no grupo.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Crie e mostre os lasers

Crie e mostre os lasers

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Deixe à vista o encaixe depois de Criar sprite painelMensagem e antes de Mudar o estado do jogo para inicio. Abra Jogo 2D, depois Grupos e depois Criar e percorrer.
3. Pegue Criar grupo de sprites e encaixe ali. No nome que chega como asteroides, escreva tiros.
4. Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
5. No evento de Espaço, encontre o então de Se jogando e deixe o encaixe antes do som à vista.
6. Em Jogo 2D, Grupos, Criar e percorrer, pegue No grupo criar um sprite com imagem. Solte antes do som, dentro do mesmo então.
7. O grupo chega como inimigos. Clique nele e escolha tiros. Deixe vazio o nome opcional depois de chamado.
8. Coloque 395 no x e 372 no y. Esses números vão deixar o primeiro laser na frente da posição inicial da nave.
9. Coloque 10 na largura e 28 na altura. No campo da imagem, escolha laser-ciano. Deixe vx e vy em zero por enquanto.
10. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
11. Dentro de A cada quadro do jogo, deixe à vista o encaixe depois de Limpar a tela e antes de Desenhar o sprite nave. Esse lugar fica fora do Se jogando.
12. Abra Jogo 2D, depois Grupos e depois Desenho e ordem. Pegue Desenhar o grupo, encaixe nesse lugar e troque asteroides por tiros.

**Teste no jogo:**

- Comece a partida e toque em Espaço. Um laser aparece na frente da posição inicial da nave, ainda parado. Mova a nave e dispare de novo: por enquanto, o laser continua nascendo no mesmo lugar.

### Onde o laser nasce?

Compare a origem dos disparos quando o lugar é fixo e quando acompanha a nave.

1. Compare a origem dos disparos quando o lugar é fixo e quando acompanha a nave.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Faça o laser nascer na nave

Faça o laser nascer na nave

1. Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Encontre o bloco que cria o laser no evento de Espaço. Deixe o número 395 do x à vista.
3. Abra Programação e depois Matemática. Pegue a conta com dois números e um sinal no meio e encaixe sobre 395.
4. Clique no sinal da conta e escolha menos. Deixe os dois números em zero por enquanto.
5. Deixe o zero da esquerda da conta à vista. Abra Jogo 2D, depois Movimento e depois Posição e tamanho. Pegue o centro x do sprite e encaixe sobre esse primeiro zero.
6. No nome do sprite desse valor, troque jogador por nave. No zero que ficou à direita da conta, coloque 5. Como o laser tem dez de largura, tirar cinco coloca o centro dele no centro da nave.
7. Agora deixe o número 372 do y do laser à vista. Abra Programação e depois Matemática. Encaixe outra conta sobre esse número e escolha menos.
8. No zero da esquerda, encaixe a posição y do sprite, em Jogo 2D, Movimento, Posição e tamanho. Troque jogador por nave. No zero que ficou à direita da conta, coloque 24.
9. A posição y menos 24 deixa a maior parte do laser acima da nave. Conserve largura 10, altura 28 e as velocidades zero nesta parte.

**Teste no jogo:**

- Comece o jogo e dispare com a nave no centro, depois à esquerda e depois à direita. Cada novo laser nasce na frente da nave. Eles ainda ficam parados, porque o voo será a próxima construção.

### Confira e envie a origem dos lasers

Confira e envie a origem dos lasers

1. Clique em Rodar de novo para começar o teste na abertura.

**Teste no jogo:**

- Antes de Enter, toque em Espaço. Nenhum laser deve aparecer. Pressione Enter e dispare uma vez no centro.
- Leve a nave para a esquerda e dispare. Depois vá para a direita e dispare novamente. Cada novo laser deve nascer na frente da nave; os anteriores continuam onde nasceram.
- Nesta versão, os lasers ainda ficam parados. Na próxima aula você vai construir o voo deles e a retirada quando saírem da tela.

## Aula 3. Faça os lasers voar e sair do jogo

### Para que lado o laser anda?

Compare o sentido do laser com velocidades verticais positivas e negativas.

1. Compare o sentido do laser com velocidades verticais positivas e negativas.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Faça os lasers voar

Faça os lasers voar

1. Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. No bloco que cria o laser, encontre o último número, logo depois de vy. Troque esse zero por menos 7. Deixe vx em zero, porque o laser não deve andar para os lados.
3. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
4. Dentro de A cada quadro do jogo, encontre Se jogando e deixe o encaixe depois do limite da nave à vista.
5. Abra Jogo 2D, depois Grupos e depois Movimento. Pegue Mover os sprites do grupo usando suas velocidades e encaixe nesse lugar.
6. O grupo chega como asteroides. Clique nesse nome e escolha tiros.

**Teste no jogo:**

- Comece o jogo e toque em Espaço. O laser deve subir. Segure Espaço por um instante: esse toque cria um laser, sem uma rajada automática. Solte e toque novamente para criar outro.

### Retire os lasers que saíram

Retire os lasers que saíram

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de Se jogando, deixe à vista o encaixe depois de Mover os sprites do grupo tiros.
3. Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue Tirar do grupo quem sair da tela e encaixe nesse lugar.
4. Troque o grupo asteroides por tiros. No nome depois de chamado, escreva foraDaTela.
5. Deixe o fazer desse bloco vazio. Retirar já é a ação do bloco; não há outra resposta para executar quando um laser sai.

**Teste no jogo:**

- Comece o jogo, dispare alguns lasers e espere eles atravessarem a tela. O voo continua igual. A retirada do grupo acontece nos bastidores e será conferida em Verificar projeto.

### Teste e envie os lasers

Teste e envie os lasers

1. Clique em Rodar de novo para começar o teste na abertura.

**Teste no jogo:**

- Antes de Enter, toque em Espaço. Nenhum laser deve nascer. Pressione Enter e dispare uma vez no centro.
- Mova para a esquerda e dispare. Depois vá para a direita e dispare novamente. Os novos lasers devem sair da nave e subir.
- Espere os lasers saírem da tela e confira o bloco que os retira do grupo. A verificação também vai acompanhar essa retirada.

## Aula 4. Faça os asteroides cair

### Quando nasce outro asteroide?

Compare os nascimentos sem intervalo e com uma espera. Depois, compare quantos nascem em quatro segundos com intervalos de um e de dois segundos.

1. Compare os nascimentos sem intervalo e com uma espera. Depois, compare quantos nascem em quatro segundos com intervalos de um e de dois segundos.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Prepare o grupo e o relógio

Prepare o grupo e o relógio

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Deixe à vista o encaixe depois de Criar grupo de sprites tiros. Abra Jogo 2D, depois Grupos e depois Criar e percorrer.
3. Pegue outro Criar grupo de sprites e encaixe depois do grupo tiros. O nome já é asteroides; conserve esse nome.
4. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
5. Encontre A cada quadro do jogo e siga até o fim desse bloco. Deixe o encaixe de baixo à vista, fora do fazer. O relógio vai ficar depois dele, como outro bloco da área.
6. Abra Jogo 2D, depois Tempo e depois Quadros e intervalos. Pegue A cada segundos e encaixe fora do laço de quadros, nesse lugar.
7. Troque o 2 pelo valor 1.5, com ponto entre o um e o cinco. Isso significa um segundo e meio.
8. Deixe o fazer do relógio à vista. Abra Programação e depois Lógica e Se. Encaixe um Se dentro desse fazer.
9. Leve a pergunta x maior que zero do Se para a lixeira. Com o espaço da pergunta à vista, abra Jogo 2D, Jogo e telas, Telas e partida, e encaixe o estado do jogo é.
10. Escolha jogando no estado e deixe o então vazio por enquanto. Assim, os futuros nascimentos também vão esperar a partida começar.

### Onde nasce cada asteroide?

Observe onde cada sorteio coloca a pedra e como ela entra na tela.

1. Observe onde cada sorteio coloca a pedra e como ela entra na tela.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Crie os asteroides caindo

Crie os asteroides caindo

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Encontre A cada 1.5 segundos. Dentro dele, deixe o então de Se jogando à vista.
3. Abra Jogo 2D, depois Grupos e depois Criar e percorrer. Pegue No grupo criar um sprite com imagem e encaixe nesse então.
4. Troque o grupo inimigos por asteroides. Deixe vazio o nome opcional depois de chamado.
5. Deixe o número do x à vista. Abra Programação e depois Valores. Pegue número aleatório de até e solte sobre esse número.
6. No sorteio, coloque 24 no primeiro número e 728 no segundo. Essa faixa deixa espaço para a largura do asteroide, nas duas beiradas.
7. No y da criação, coloque menos 52. Na largura e na altura, coloque 48.
8. Escolha a imagem asteroide-rocha-lunar. Deixe vx em zero. No último número, logo depois de vy, coloque 2, para a pedra seguir para baixo.
9. Agora encontre A cada quadro do jogo. Dentro de Se jogando, deixe à vista o encaixe depois de Mover os sprites do grupo tiros e antes da retirada dos tiros.
10. Abra Jogo 2D, depois Grupos e depois Movimento. Encaixe Mover os sprites do grupo usando suas velocidades nesse lugar. O grupo já é asteroides; conserve.
11. Mais abaixo no laço de quadros, deixe à vista o encaixe depois de Limpar a tela e antes de Desenhar o grupo tiros, fora do Se.
12. Abra Jogo 2D, depois Grupos e depois Desenho e ordem. Encaixe Desenhar o grupo nesse lugar e conserve o nome asteroides.

**Teste no jogo:**

- Clique no jogo e pressione Enter. Espere alguns segundos: novas pedras entram por cima, em lugares sorteados, e caem. Dispare também. Por enquanto, os lasers atravessam os asteroides, porque o acerto ainda será programado.

### Retire os asteroides que escapam

Retire os asteroides que escapam

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de A cada quadro do jogo e de Se jogando, deixe à vista o encaixe depois de Tirar do grupo tiros quem sair da tela.
3. Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Encaixe outro Tirar do grupo quem sair da tela nesse lugar.
4. O grupo já é asteroides. Conserve esse nome e escreva foraDaTela no nome depois de chamado.
5. Deixe o fazer vazio. Neste jogo, um asteroide que escapa não tira vida e não dá ponto.

**Teste no jogo:**

- Comece a partida e deixe algumas pedras atravessarem a tela. Elas continuam entrando por cima e saindo por baixo. A retirada é conferida nos blocos; ver uma pedra desaparecer da janela não mostra sozinho o que ficou no grupo.

### Confira tiros e asteroides

Confira o que ficou claro no seu jogo. Escolha uma resposta em cada pergunta e veja a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em Próxima parte.



### Teste e envie a chuva de asteroides

Teste e envie a chuva de asteroides

1. Clique em Rodar de novo e observe a abertura por alguns segundos.

**Teste no jogo:**

- Nenhuma pedra deve nascer na abertura. Clique no jogo, pressione Enter e espere a chegada dos asteroides.
- Observe o espaço de tempo entre os nascimentos e os lugares de entrada. O sorteio pode repetir um lugar; ele não precisa alternar entre esquerda e direita.
- Dispare e acompanhe uma pedra até ela sair por baixo. Nesta versão, o tiro ainda atravessa a pedra, e a saída da tela não tem outra reação.

## Aula 5. Faça o tiro acertar o asteroide

### Quem sai do jogo no acerto?

Compare retirar o grupo inteiro com retirar só os dois objetos do encontro.

1. Compare retirar o grupo inteiro com retirar só os dois objetos do encontro.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Retire o par que se encontrou

Retire o par que se encontrou

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de A cada quadro do jogo, encontre Se jogando. Deixe à vista o encaixe depois da retirada dos asteroides.
3. Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue Para cada colisão entre os grupos e encaixe nesse lugar.
4. Os grupos já são tiros e asteroides. Os nomes do par já são tiro e asteroide. Conserve esses quatro nomes.
5. Deixe o fazer desse encontro à vista. Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue Tirar o sprite do grupo e solte dentro do fazer.
6. No sprite que chega como asteroide, escolha tiro. No grupo, escolha tiros. Essa instrução retira o laser que participou do encontro.
7. Deixe o encaixe abaixo dessa retirada à vista. Pegue outro Tirar o sprite do grupo na mesma gaveta e solte ali, ainda dentro do encontro.
8. Nesse segundo bloco, conserve o sprite asteroide e o grupo asteroides. Ele retira somente a pedra do par.

**Teste no jogo:**

- Comece o jogo e alinhe a nave com uma pedra. Dispare: o laser e a pedra devem sumir no acerto. Observe outra pedra que estava longe desse encontro; ela continua caindo.

### Mostre o acerto

Mostre o acerto

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Encontre o encontro entre tiros e asteroides. Dentro do fazer, deixe à vista o encaixe depois das duas retiradas.
3. Abra Jogo 2D, depois Desenho e efeitos e depois Partículas. Pegue Soltar explosão no sprite e encaixe nesse lugar.
4. Conserve o nome asteroide. Se quiser, clique no quadradinho de cor desse bloco e escolha a cor da explosão na paleta. A cor é escolha sua: ela não muda o jogo.
5. Deixe o encaixe logo abaixo da explosão à vista. Abra Jogo 2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito e escolha explosão.

**Teste no jogo:**

- Comece o jogo e acerte uma pedra. Veja o brilho no lugar dela e escute o som. Depois dispare sem acertar: o efeito do acerto deve esperar um encontro.

### Teste e envie os acertos

Teste e envie os acertos

1. Clique em Rodar de novo e comece com Enter.

**Teste no jogo:**

- Alinhe um disparo com um asteroide. Confira a retirada do par, o brilho e o som. Os outros asteroides devem continuar na tela.
- Dispare por uma coluna vazia. O laser atravessa a tela sem provocar uma explosão de acerto. Ainda não há placar nesta versão.

## Aula 6. Conte os acertos

### Guardar e mostrar um número

Compare o número guardado com o número mostrado na tela.

1. Compare o número guardado com o número mostrado na tela.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Prepare o placar

Prepare o placar

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Deixe à vista o encaixe depois dos dois grupos, antes de Mudar o estado do jogo para inicio.
3. Abra Programação e depois Variáveis. Pegue Criar variável com valor e encaixe nesse lugar.
4. Troque o nome contador por pontos. O valor já é zero; deixe assim.
5. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
6. Dentro de A cada quadro do jogo, encontre Desenhar o sprite nave. Deixe o encaixe depois dele à vista, antes da legenda e das telas.
7. Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela. Pegue Mostrar placar e encaixe nesse lugar.
8. No rótulo que chega como Pontos:, escreva Acertos: com dois-pontos no fim. Coloque 22 no x, 32 no y e 23 no tamanho.
9. O placar chega branco, que aparece bem no espaço. Se quiser outra cor clara, escolha no quadradinho de cor. Agora deixe o número do valor do placar à vista.
10. Abra Programação e depois Valores. Pegue o valor de variável, que chega com x, e encaixe sobre o número do placar. Clique nesse x e escolha pontos.

**Teste no jogo:**

- Comece a partida e olhe o canto superior esquerdo. Acertos deve mostrar zero. Mesmo acertando uma pedra, o zero ainda fica, porque a soma será construída na próxima parte.

### Some no lugar do acerto

Some no lugar do acerto

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de Se jogando, encontre o encontro entre tiros e asteroides. Deixe à vista o encaixe no fim do fazer, depois do som da explosão.
3. Abra Programação e depois Variáveis. Pegue Somar 1 em variável e encaixe nesse lugar.
4. Deixe o número em 1. Clique no nome que chega como contador e escolha pontos.

**Teste no jogo:**

- Comece o jogo e acerte uma pedra. Acertos passa de zero para um. Acerte outra: passa para dois.
- Dispare sem alvo e deixe uma pedra passar sem acertar. A contagem deve ficar igual nesses dois casos.

### Confira a contagem

Confira o que ficou claro no seu jogo. Escolha uma resposta em cada pergunta e veja a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em Próxima parte.



### Teste e envie seu placar

Teste e envie seu placar

1. Clique em Rodar de novo e comece a partida com Enter. Confira Acertos em zero.

**Teste no jogo:**

- Acerte dois asteroides, um de cada vez, e acompanhe o placar. Ele deve somar um em cada acerto.
- Deixe um laser passar sem alvo e uma pedra escapar. O número deve continuar igual. Quando o par já saiu, esperar mais alguns quadros também não soma outro ponto pelo mesmo acerto.

## Aula 7. Dê três vidas à nave

### Três chances para pilotar

Compare preparar as vidas uma vez com preparar de novo a cada quadro.

1. Compare preparar as vidas uma vez com preparar de novo a cada quadro.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Prepare e mostre as três vidas

Prepare e mostre as três vidas

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Deixe à vista o encaixe depois de Criar variável pontos e antes de Mudar o estado do jogo para inicio.
3. Abra Jogo 2D, depois Vida e placar e depois Vida.
4. Pegue Dar ao sprite jogador 3 de vida e solte depois da criação de pontos. Troque jogador por nave e conserve 3 de vida.
5. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
6. Dentro de A cada quadro do jogo, encontre o placar Acertos. Deixe à vista o encaixe depois dele e antes da legenda dos controles.
7. Na mesma categoria Vida, pegue Desenhar as vidas do sprite e solte nesse encaixe.
8. Troque jogador por nave. Conserve a opção corações. No tamanho, coloque 21; no x, 22; e no y, 52.
9. Clique no quadradinho de cor e escolha na paleta a cor que você quiser para os corações.

**Teste no jogo:**

- Clique no jogo e pressione Enter. Confira os três corações. Por enquanto, os asteroides ainda atravessam a nave sem tirar vida: você preparou as chances, e a batida vem na próxima parte.

### Encontre a pedra que bateu na nave

Encontre a pedra que bateu na nave

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de A cada quadro do jogo, encontre o então de Se jogando. Deixe à vista o encaixe depois do bloco inteiro que confere tiros com asteroides.
3. Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue Para cada sprite do grupo que colidir com o sprite e solte nesse encaixe.
4. Conserve grupo asteroides e sprite nave. Em chamar o sprite de, troque inimigo por atingiuNave, tudo junto, com N maiúsculo.
5. Deixe o fazer dessa nova colisão à vista. Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue Tirar o sprite do grupo e solte dentro desse fazer.
6. No nome do sprite, troque asteroide por atingiuNave. O grupo continua asteroides. Esse nome indica só a pedra dessa batida.
7. Abra Jogo 2D, depois Desenho e efeitos e depois Partículas. Pegue Soltar explosão no sprite e solte depois da retirada, dentro da mesma colisão. Escolha atingiuNave no nome do sprite.
8. Se quiser, clique no quadradinho de cor da explosão e escolha outra cor na paleta. Uma cor diferente da explosão do tiro ajuda a perceber que a nave foi atingida.
9. Abra Jogo 2D, depois Som e depois Efeitos prontos. Pegue Tocar efeito e solte depois da explosão, dentro dessa colisão. Escolha o efeito batida.

**Teste no jogo:**

- Comece a partida e deixe uma pedra encostar na nave. Só essa pedra desaparece, com explosão e som. Os três corações continuam iguais, porque o dano será sua próxima construção.

### Um respiro depois da batida

Compare contatos próximos com e sem o tempo de proteção.

1. Compare contatos próximos com e sem o tempo de proteção.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Tire uma vida e dê um respiro

Tire uma vida e dê um respiro

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Encontre Para cada sprite do grupo asteroides que colidir com o sprite nave. Dentro dele, deixe à vista o encaixe depois da explosão e antes do som de batida.
3. Abra Jogo 2D, depois Vida e placar e depois Vida. Pegue Machucar o sprite e deixá-lo invencível e solte nesse encaixe.
4. Troque jogador por nave. Conserve o dano em 1. No tempo de proteção, troque 45 por 60 quadros. O jogo desenha uns sessenta quadros por segundo, então são mais ou menos um segundo de proteção.

**Teste no jogo:**

- Clique no jogo, comece a partida e deixe uma pedra bater na nave. Um coração deve desaparecer. Afaste-se e espere um pouco; numa batida depois da proteção, outra vida pode ser perdida. Ao chegar a zero, o jogo ainda continua: a regra de terminar virá na última aula.

### Confira as chances da nave e envie

Confira as chances da nave e envie

1. Clique em Rodar de novo para conferir a preparação desde o começo.

**Teste no jogo:**

- Pressione Enter. Confira três corações, deixe uma pedra bater e observe a vida perdida. Desvie de outra pedra: uma pedra que passa sem encostar não tira vida.
- Espere a proteção acabar e teste outra batida. Confira também um acerto de laser: ele deve continuar somando ponto, sem tirar vida da nave.

## Aula 8. Confira o início e escolha o visual

### A hora de jogar

Compare as ações antes e depois de a partida começar.

1. Compare as ações antes e depois de a partida começar.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Investigue: e se o laser não esperasse a partida?

Investigue: e se o laser não esperasse a partida?

1. Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Encontre o evento de Espaço. Dentro dele, o Se jogando guarda a criação do laser e o som.
3. Arraste No grupo tiros criar um sprite para fora do então e solte logo abaixo do Se, ainda dentro do evento. O som vem junto, grudado embaixo.
4. Clique em Rodar de novo. Na abertura, antes do Enter, aperte Espaço algumas vezes. O que aconteceu? O laser sai mesmo com a placa dizendo início: sem a guarda, a regra não espera a partida.
5. Agora conserte. Arraste No grupo tiros criar um sprite de volta para dentro do então do Se jogando.
6. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
7. Confira também as outras duas guardas: o Se jogando de A cada quadro do jogo, com o movimento e as colisões, e o Se jogando do relógio A cada 1,5 segundos, com o asteroide.
8. Clique em Rodar de novo para voltar à abertura.

**Teste no jogo:**

- Antes de pressionar Enter, segure uma seta, toque em Espaço e espere um pouco. Agora a abertura espera de verdade: a nave não anda, não sai laser e não nasce pedra.
- Agora pressione Enter. Confira que as setas, o laser e as pedras funcionam durante a partida.

### Escolha a aparência das pedras e dos lasers

Escolha a aparência das pedras e dos lasers

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. No relógio de um segundo e meio, encontre o bloco que cria um sprite no grupo asteroides. Clique na imagem, como asteroide-rocha-lunar, e escolha rocha lunar, gelo azul ou cristal violeta. Você também pode manter a imagem atual.
3. Conserve largura 48, altura 48, o sorteio da posição, a velocidade e o intervalo. A sua escolha muda só a aparência.
4. Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
5. No evento de Espaço, encontre o bloco que cria o sprite no grupo tiros. Clique na imagem, como laser-ciano, e escolha a aparência que quiser entre os três lasers. Manter o atual também vale.
6. Conserve largura 10, altura 28, a origem lida da nave e as velocidades. Se quiser rever nave e cenário, os dois campos de imagem continuam em Ao iniciar.

**Teste no jogo:**

- Comece a partida e confira sua combinação. Mova, dispare e acerte uma pedra. O jogo continua com as mesmas regras, enquanto os desenhos mostram suas escolhas.

### Confira o começo e envie seu visual

Confira o começo e envie seu visual

1. Clique em Rodar de novo. Confira a abertura e pressione Enter para entrar na partida.

**Teste no jogo:**

- Confira as imagens da nave, do cenário, das pedras e dos lasers. Teste movimento, um acerto que soma ponto e uma batida que tira vida. As regras continuam funcionando juntas.

## Aula 9. Termine e recomece a partida

### O acerto que completa a missão

Compare os acertos com a meta de vinte e descubra quando a missão está completa.

1. Compare os acertos com a meta de vinte e descubra quando a missão está completa.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Prepare a meta e mostre o progresso

Prepare a meta e mostre o progresso

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Encontre Criar variável pontos. Deixe à vista o encaixe depois dela e antes de dar vidas à nave.
3. Abra Programação e depois Variáveis. Pegue Criar variável e solte nesse encaixe. Troque contador por meta e o valor 0 por 20.
4. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
5. Encontre o placar Acertos. Deixe o encaixe depois dele à vista. Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela.
6. Pegue Mostrar placar e solte depois de Acertos, antes dos corações. Troque Pontos: por Meta:. No x, coloque 650; no y, 32; e no tamanho, 21.
7. Abra Programação e depois Valores. Pegue valor da variável e solte em cima do número do placar Meta. Troque x por meta nesse bloco de valor.
8. Deixe à vista o encaixe depois de Desenhar as vidas e antes da legenda. Volte a Jogo 2D, Vida e placar, Indicadores e texto na tela. Pegue Barra de e solte nesse encaixe.
9. Na barra, coloque x 280, y 23, largura 240 e altura 11.
10. Clique no quadradinho de cor da barra e escolha na paleta uma cor bem viva: é ela que vai encher conforme você acerta.
11. Abra Programação, Valores. Encaixe valor da variável no valor da barra e escolha pontos. Encaixe outro valor da variável no total e escolha meta. A barra vai comparar o que você já conseguiu com a missão completa.

**Teste no jogo:**

- Comece e acerte algumas pedras. Acertos aumenta, a barra vai preenchendo e Meta continua em 20. Ainda falta construir a pergunta que termina a partida.

### Chame a vitória ao completar a meta

Chame a vitória ao completar a meta

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de A cada quadro do jogo, encontre o então de Se jogando. Deixe à vista o encaixe depois do bloco inteiro da colisão da nave.
3. Abra Programação e depois Lógica & Se. Pegue Se e solte depois da colisão, ainda dentro de Se jogando.
4. Na pergunta que chegou com x maior que 0, clique no sinal de maior e escolha maior ou igual. Abra Programação, Valores, e encaixe valor da variável no lugar de x. Escolha pontos.
5. Encaixe outro valor da variável no lugar do 0 do lado direito e escolha meta. A pergunta fica: pontos é maior ou igual a meta?
6. Deixe o então desse novo Se à vista. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida. Pegue Mudar o estado do jogo e solte dentro desse então.
7. Troque inicio por vitoria, sem acento, nesse bloco. A regra seleciona a tela pronta quando você completa a missão.

**Teste no jogo:**

- Comece a partida e acerte vinte asteroides. Quando a contagem alcançar a meta, aparece Rota aberta!. Depois da vitória, setas e Espaço não continuam a partida. Pressione Enter para voltar ao início. A derrota será acrescentada na próxima parte.

### Escolha um único resultado

Escolha um único resultado

1. Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Dentro de Se jogando, encontre a pergunta de vitória que você acabou de construir. Deixe à vista o encaixe antes dela, logo depois da colisão da nave.
3. Abra Programação, Lógica & Se. Pegue outro Se e solte entre a colisão da nave e a pergunta de vitória.
4. Esse novo Se chega com x maior que 0. Pegue essa pergunta pelo sinal de maior e leve à lixeira. Conserve o Se.
5. Abra Jogo 2D, Vida e placar, Vida. Pegue as vidas do sprite acabaram? e solte no espaço da pergunta vazia. Troque jogador por nave.
6. Deixe o então desse Se à vista. Abra Jogo 2D, Jogo e telas, Telas e partida. Pegue Mudar o estado do jogo e solte no então. Troque inicio por derrota.
7. No Se das vidas, encontre os dois sinais de mais. Clique no segundo mais, o que fica antes da palavra senão. Isso abre o espaço que será usado quando as vidas ainda não acabaram.
8. Pegue a pergunta de vitória inteira pela palavra Se. Leve esse bloco, com o Mudar para vitoria que está dentro, para o espaço do senão do Se das vidas.

**Teste no jogo:**

- Comece uma partida e deixe a nave perder as três vidas, esperando a proteção entre as batidas. Aparece a tela Tente outra rota. Setas e Espaço devem parar de agir.
- Pressione Enter para voltar à abertura e Enter outra vez para começar. Confira a vitória numa partida em que você completa vinte acertos com vida. Só um resultado deve aparecer.

### Uma partida de verdade começa de novo

Compare voltar só à tela inicial com preparar uma nova partida.

1. Compare voltar só à tela inicial com preparar uma nova partida.
2. Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.

### Confira as regras da missão

Confira o que ficou claro no seu jogo. Escolha uma resposta em cada pergunta e veja a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em Próxima parte.



### Teste a missão completa e envie

Teste a missão completa e envie

1. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.
2. Encontre o bloco que descreve o jogo para quem usa leitor de tela. No texto, escreva: Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início.
3. Clique em Rodar de novo para testar desde a abertura.

**Teste no jogo:**

- Antes de Enter, confira que setas e Espaço aguardam. Comece. Teste as duas direções, um laser por aperto, acertos somando pontos e batidas tirando vida com proteção.
- Teste uma partida com vitória e outra com derrota. Depois de cada resultado, confira que a nave não continua a se mover, atirar ou receber novas pedras.
- Depois do resultado, pressione Enter. A abertura volta. Pressione Enter outra vez. Confira zero acertos, três vidas e uma partida sem tiros ou pedras da rodada anterior. Sua combinação de imagens continua a mesma.

### Mostre sua rota espacial

Seu projeto já foi enviado! Se quiser, compartilhe o jogo no Mural e copie o link para mostrar à sua família. Você também pode concluir a aula sem publicar. Quando terminar, clique em Concluir aula.

1. Opcional: clique em Compartilhar, confira título e descrição, gere e confira a capa.
2. Se quiser publicar, clique em Publicar e espere a confirmação.
3. Copie o link de jogar para mostrar a quem você escolher; peça ajuda a um adulto se precisar.
4. Você também pode concluir sem publicar. Feche a janela e clique em Concluir aula.

**Teste no jogo:**

- O projeto já foi enviado na parte anterior; compartilhar não é uma nova entrega nem uma condição para concluir.
