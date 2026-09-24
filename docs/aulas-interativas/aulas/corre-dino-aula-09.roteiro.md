# Roteiro de gravação · Corre Dino · Aula 09 · O jogo inteiro

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 350 a 440 segundos de clipes; 909 palavras de narração, cerca de 6.6 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo abre num menu com o nome que ela deu, começa com tecla, clique ou toque, e roda. O dino corre e pula, os cactos nascem, andam e saem do grupo pela faxina. E o dino atravessa o cacto como se um dos dois não estivesse ali. A partida não tem fim: só dá para parar fechando a página.
- **Conceitos nomeados:** colisão, apelido do cacto, estado fim, retorno pro jogador, reinício.
- **Dor desta aula:** O Dino atravessa o cacto sem consequência no jogo da Aula 8. A colisão passa a encerrar a partida.
- **Vitória do dia:** o jogo inteiro. Menu, partida, batida com explosão, tremida e som, tela de fim, e uma partida nova com a pista limpa. No fim desta aula alguém pode jogar o jogo dela do começo ao fim sem ela explicar nada.
- **Valores:** Estados jogando, inicio e fim; tremida 8; efeito derrota.
- **Campos livres:** Título, subtítulo e fundo da tela de fim; cor da explosão.
- **Nota de produção:** Gravar uma rodada completa sem corte na abertura e na entrega. O bloco de colisão fica dentro do Se de jogando no motor, nunca em Quando acontecer.
- **O que NÃO entra, e por quê:** Não tratar a batida como evento registrado em Quando acontecer; é pergunta feita em todo quadro.

## Seção 1. Hoje o seu jogo fica inteiro

### Clipe `video-abertura` · Hoje o seu jogo fica inteiro
**Duração alvo:** 35 a 45 segundos; recalibrar após gravar.

**Na tela:** Jogar a versão da Aula 8 até o Dino atravessar um cacto sem efeito.

**Narração:**
> "O Dino e os cactos já aparecem juntos, mas a batida ainda não muda o jogo. Hoje vamos
> ensinar o projeto a perceber quando eles se encontram."

**Na tela:** Mostrar rodada completa do resultado final: menu, toque, corrida, batida, fim e recomeço com pista vazia.

**Narração:**
> "Vamos montar a colisão, mostrar o fim e deixar você começar outra vez. Quando a aula
> terminar, o seu jogo terá começo, meio e fim."

## Seção 2. A batida acaba a partida

### Clipe `video-colisao` · A pergunta que o jogo faz em todo quadro
**Duração alvo:** 90 a 110 segundos · **Palavras:** 213

**Na tela:** No A cada quadro do jogo, abrir o Se de jogando e mostrar Desenhar o grupo seguido da faxina. Abrir Jogo 2D > Colisões > Encostar e bloquear.

**Narração:**
> "**Colisão** quer dizer que dois objetos se encostaram. Aqui o jogo vai perguntar isso em cada
> quadro. Em **Jogo 2D**, abre **Colisões**, depois **Encostar e bloquear**. Pega **Para cada
> sprite do grupo que colidir com o sprite**."

**Na tela:** Encaixar o bloco dentro do Se de jogando, entre Desenhar o grupo cactos e a faxina Tirar do grupo quem sair da tela.

**Narração:**
> "Encaixa dentro do **Se o estado do jogo é jogando**, **entre Desenhar o grupo cactos e Tirar
> do grupo quem sair da tela**. É no motor, não em **Quando acontecer**: a pergunta é refeita a
> cada quadro."

**Na tela:** Zoom nos três campos e na segunda linha do bloco: grupo cactos, sprite dino, apelido cacto.

**Narração:**
> "No grupo escolhe **cactos**. No sprite escolhe **dino**. Na segunda linha, onde diz **chamar
> o sprite de**, escreve **cacto**. Esse é um apelido para o cacto que encostou agora."

**Na tela:** Congelar quadro com três cactos; contornar o que bateu e ligar visualmente ao campo do apelido.

**Narração:**
> "São três cactos na pista. Só um bateu. Dentro deste bloco, quando a gente falar **cacto**, o
> jogo entende este aqui, o que acabou de bater, e não os outros. O contorno e a legenda apontam
> qual deles é."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; encaixar Mudar o estado do jogo para no fazer da colisão, primeiro lugar; escolher fim.

**Narração:**
> "Em **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Pega **Mudar o estado do
> jogo para** e encaixa no **fazer** da colisão, que está vazio, no primeiro lugar. Escolhe
> **fim** na lista."

**Na tela:** Clicar no jogo, iniciar e deixar bater; mostrar só a floresta depois.

**Narração:**
> "Começa a partida e deixa o Dino bater de propósito. A corrida parou, mas ficou só a floresta.
> O estado mudou para **fim**; ainda não existe nada desenhado para esse estado. Vamos dar uma
> tela a ele."

## Seção 3. O bloco vira o mapa do seu jogo

### Clipe `video-tela-fim` · Três andares, três estados, um bloco só
**Duração alvo:** 50 a 65 segundos · **Palavras:** 173

**Na tela:** No Se do quadro, mostrar andar jogando e senão se inicio; clicar mais senão se abaixo de inicio.

**Narração:**
> "No mesmo Se onde você já tem **jogando** e **inicio**, clica em **mais senão se** outra vez.
> Nasceu o terceiro andar, logo abaixo do de inicio. O jogo só entra num desses andares por
> vez."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; encaixar o estado do jogo é __ ? com fim e Mostrar tela com título subtítulo dica fundo no então.

**Narração:**
> "Em **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Encaixa **o estado do jogo
> é __ ?** na pergunta nova e escolhe **fim**. Da mesma gaveta, pega **Mostrar tela com título
> subtítulo dica fundo** e põe no **então**, no primeiro lugar."

**Na tela:** Zoom nos três textos; personalizar título e subtítulo; escrever dica combinada; manter ou escolher fundo escuro legível.

**Narração:**
> "No título escreve uma frase de fim; o meu diz **Fim de jogo**. No subtítulo, algo que convide
> a tentar de novo. A dica precisa ser igual para todos: **Aperte qualquer tecla ou toque na
> tela para jogar de novo**. O fundo vem escuro e pode ficar assim; se mudar, deixa os textos
> legíveis."

**Na tela:** Mostrar o Se inteiro, lendo ramos de cima para baixo; mostrar tela de fim.

**Narração:**
> "Lê o bloco comigo: se o estado é **jogando**, a partida acontece. Senão se é **inicio**,
> mostra o menu. Senão se é **fim**, mostra esta tela. Três andares, três estados, um bloco.
> Agora dá para ver a ideia que começamos na Aula 7."

## Seção 4. Faça a batida ser sentida

### Clipe `video-retorno` · Uma camada de cada vez
**Duração alvo:** 60 a 75 segundos · **Palavras:** 192

**Na tela:** Mostrar fazer da colisão com Mudar o estado do jogo para fim. Abrir Jogo 2D > Desenho e efeitos > Partículas.

**Narração:**
> "A batida já termina a partida, mas quase não dá para sentir. Vamos acrescentar três sinais,
> um de cada vez. Em **Jogo 2D**, abre **Desenho e efeitos**, depois **Partículas**. Pega
> **Soltar explosão no sprite cor**."

**Na tela:** Encaixar explosão acima de Mudar o estado do jogo para; selecionar apelido cacto, cor viva; bater e observar.

**Narração:**
> "Encaixa no **fazer** da colisão, logo acima do **Mudar o estado do jogo para fim**. No sprite
> escolhe **cacto**, o apelido do que bateu. A cor da explosão é sua. Começa e bate de
> propósito. Explodiu."

**Na tela:** Abrir Jogo 2D > Desenho e efeitos > Efeitos; encaixar Tremer a tela com intensidade entre explosão e mudança de estado.

**Narração:**
> "Agora em **Jogo 2D**, abre **Desenho e efeitos**, depois **Efeitos**. Pega **Tremer a tela
> com intensidade** e encaixa **entre a explosão e Mudar o estado do jogo para fim**. A
> intensidade já vem **8**; deixa. Bate de novo: explosão e tremida."

**Na tela:** Abrir Jogo 2D > Som > Efeitos prontos; encaixar Tocar efeito entre tremida e mudança de estado, escolher derrota; bater.

**Narração:**
> "Em **Jogo 2D**, abre **Som**, depois **Efeitos prontos**. Pega **Tocar efeito** e encaixa
> **entre Tremer a tela com intensidade e Mudar o estado do jogo para fim**. Ele vem com
> **moeda**; abre a lista e escolhe **derrota**, a **vigésima opção**. Bate mais uma vez: três
> sinais da mesma colisão."

**Na tela:** Mostrar batida, efeitos e texto da tela de fim também visível sem som.

**Narração:**
> "Isso se chama **retorno pro jogador**: o jogo mostra e faz sentir o que aconteceu. Mesmo sem
> áudio, a explosão, a tremida e a tela de fim deixam a batida clara."

## Seção 6. Monte o caminho de volta

### Clipe `video-caminho-de-volta` · O mesmo aperto, três respostas
**Duração alvo:** 45 a 60 segundos · **Palavras:** 128

**Na tela:** Mostrar evento Quando apertar qualquer tecla ou tocar na tela com Se inicio; clicar mais senão se.

**Narração:**
> "A tela de fim convida a jogar de novo, mas o evento ainda só sabe começar pelo estado
> **inicio**. No mesmo **Quando apertar qualquer tecla ou tocar na tela**, clica em **mais senão
> se** do Se que já está lá."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; encaixar o estado do jogo é __ ? com fim; Reiniciar o jogo no então.

**Narração:**
> "Em **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Pega **o estado do jogo é
> __ ?**, encaixa na pergunta vazia do andar novo e escolhe **fim**. Da mesma gaveta, pega
> **Reiniciar o jogo** e encaixa no **então**, no primeiro lugar. Ele não tem campo."

**Na tela:** Mostrar o evento inteiro e testar um toque na tela de fim; pista limpa.

**Narração:**
> "Lê o evento: no **inicio**, o toque começa. No **fim**, reinicia. Em **jogando**, não faz
> nada. O reinício prepara as áreas outra vez e cria um grupo vazio de cactos. Por isso a pista
> volta limpa. Toca na tela de fim e confere."

## Seção 7. A volta completa, e o jogo fica de pé

### Clipe `video-teste-e-envio` · A volta inteira antes de enviar
**Duração alvo:** 70 a 85 segundos · **Palavras:** 134

**Na tela:** Recarregar; mostrar menu; tocar; pular cactos; apertar tecla no meio da corrida sem reiniciar.

**Narração:**
> "Vamos jogar a volta inteira sem cortar. Recarrega, toca no menu e pula alguns cactos. Agora
> aperta uma tecla com a partida acontecendo. Ela continua: o evento não tem resposta para o
> estado **jogando**."

**Na tela:** Deixar Dino bater de propósito; mostrar explosão, tremida, efeito e tela de fim; tocar para reiniciar com pista vazia.

**Narração:**
> "Deixa o Dino bater. Explosão, tremida, som e tela de fim. Toca de novo: a partida recomeça
> com a pista vazia. Se um cacto antigo continuou lá, confira se o reinício está no andar de
> **fim**."

**Na tela:** Mostrar objetivos; esperar Salvo e enviar.

**Narração:**
> "Confere colisão, três estados, efeitos e reinício. Espera **Salvo** e clica em **Enviar para
> o professor**. O jogo já pode ser jogado do começo ao fim por alguém que nunca viu os blocos."

**Na tela:** Mostrar rodada curta completa e quiz.

**Narração:**
> "Você fez menu, corrida, batida e volta. Talvez tenha sentido uma batida em que o Dino parecia
> não encostar no cacto. Vamos investigar isso na próxima aula. Antes, responde ao quiz."
