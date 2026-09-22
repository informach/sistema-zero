# Roteiro de gravação · Corre Dino · Aula 13 · O jogo aperta, e sabe onde parar

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido e Estúdio Completo para a Ponte.
- **Duração:** 425 a 520 segundos de clipes; 992 palavras de narração, cerca de 7.2 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo da Aula 12, completo e imprevisível. Cactos nascendo a cada 1,4 s num x sorteado entre 500 e 560, com vx de `-5 - (um número de 0 a 1)`, faxina, três estados do jogo, colisão com área de 80%, placar, tela de início e tela de fim com a marca.
- **Conceitos nomeados:** variável velocidade, acelerador, limite, balanceamento e Ponte entre blocos e código.
- **Dor desta aula:** Depois de cerca de vinte segundos, a partida mantém a mesma dificuldade; o acelerador responde a quem sobrevive mais.
- **Vitória do dia:** o jogo fica mais difícil quanto mais ela sobrevive, e para de apertar num limite que ela escolheu. Ao fim da seção 7, ela vê o código de verdade que os blocos dela viraram.
- **Valores:** Base velocidade começa em -5; relógio de aceleração de 2 a 10 segundos, exemplo 5; limite de -14 a -7, exemplo -9; cada passo soma -1.
- **Campos livres:** Intervalo do acelerador e limite final dentro das faixas; valores de outras aulas permanecem.
- **Nota de produção:** Mostrar a partida longa antes e depois. No seletor de modo da barra superior, abrir Ponte e aproximar o arquivo script.js sem editar código.
- **O que NÃO entra, e por quê:** Não prometer certificado, XP ou publicação obrigatória. Publicar é escolha posterior ao envio.

## Seção 1. O seu jogo não aperta

### Clipe `video-jogo-nao-aperta` · Vinte segundos depois, está tudo igual
**Duração alvo:** 40 a 55 segundos · **Palavras:** 66

**Na tela:** Deixar uma partida acontecer por pelo menos vinte segundos, com placar crescendo e cactos mantendo o mesmo ritmo.

**Narração:**
> "No começo a corrida é gostosa. Agora olha vinte segundos depois. Os cactos ainda vêm com a
> mesma folga e a mesma velocidade. Quem já aprendeu a pular continua recebendo o mesmo
> desafio."

**Na tela:** Mostrar o mesmo percurso com tempo marcado; sem paleta nem peça nova ainda.

**Narração:**
> "É como nos jogos que ficam mais difíceis conforme você avança. O seu ainda não faz isso. Hoje
> ele vai aprender a apertar sozinho e, tão importante quanto acelerar, vai aprender onde
> parar."

## Seção 2. Um número que manda em todos os cactos

### Clipe `video-memoria-e-leitura` · A velocidade muda de endereço
**Duração alvo:** 70 a 85 segundos · **Palavras:** 171

**Na tela:** No criador de cactos, conferir que a esquerda da Conta matemática está em -5; mostrar Ao iniciar com pontos e Mudar o estado.

**Narração:**
> "Antes de começar, olha o campo vx do criador de cactos. À esquerda da conta deve estar
> **menos 5**. Se estiver diferente, devolve esse número. A nova memória vai começar exatamente
> no valor que o jogo já usa."

**Na tela:** Abrir Programação > Variáveis; encaixar Criar variável com valor no Ao iniciar, entre Criar variável pontos com valor 0 e Mudar o estado do jogo para inicio.

**Narração:**
> "Em **Programação**, abre **Variáveis**. Pega **Criar variável com valor** e encaixa no **Ao
> iniciar**, **entre Criar variável pontos com valor 0 e Mudar o estado do jogo para inicio**."

**Na tela:** Trocar nome contador por velocidade e valor 0 por -5; confirmar.

**Narração:**
> "No nome vem **contador**; troca por **velocidade**. No valor vem **0**; troca por **menos
> 5**. Essa caixinha vai guardar a velocidade base dos novos cactos."

**Na tela:** Abrir Programação > Valores; arrastar valor da variável por cima do -5 da esquerda da Conta matemática; escolher velocidade.

**Narração:**
> "Em **Programação**, abre **Valores** e pega **valor da variável**. Arrasta por cima do
> **menos 5** no lado esquerdo da **Conta matemática** do vx. Escolhe **velocidade**. O sorteio
> de zero a um do outro lado fica como estava."

**Na tela:** Mostrar partida aparentemente idêntica e dois lugares do número.

**Narração:**
> "Olha o jogo: parece igual, e está certo. A variável guarda menos 5, o mesmo número que estava
> escrito ali. Mudou de onde o bloco lê a velocidade, sem mudar a regra dos cactos. Agora
> podemos alterar a caixinha durante a partida."

## Seção 4. O acelerador, e o freio dele

### Clipe `video-acelerador` · O acelerador, e o freio dele
**Duração alvo:** 125 a 145 segundos · **Palavras:** 309

**Na tela:** Abrir Jogo 2D > Tempo > Quadros e intervalos; soltar A cada 2 segundos em Enquanto estiver rodando, ao lado dos relógios existentes.

**Narração:**
> "Em **Jogo 2D**, abre **Tempo**, depois **Quadros e intervalos**. Pega outro **A cada 2
> segundos** e solta no **Enquanto estiver rodando**, ao lado dos relógios dos cactos e dos
> pontos, com espaço. Não coloca dentro do quadro nem de outro relógio."

**Na tela:** Zoom no intervalo e escrever 5, confirmando.

**Narração:**
> "No novo relógio, o meu intervalo vai ser **5 segundos**. Esse será o tempo entre uma
> aceleração e outra. Você poderá escolher outro valor na faixa da aula, depois de ver o
> efeito."

**Na tela:** Abrir Programação > Lógica e Se; encaixar Condição se, senão se e senão no fazer do relógio, primeiro lugar; remover comparação padrão.

**Narração:**
> "Em **Programação**, abre **Lógica e Se**. Pega **Condição se, senão se e senão** e encaixa no
> **fazer** do relógio, que está vazio, no primeiro lugar. Tira a comparação de fábrica desse
> Se."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; encaixar o estado do jogo é __ ? com jogando na pergunta.

**Narração:**
> "Em **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Pega **o estado do jogo é
> __ ?**, encaixa na pergunta vazia e escolhe **jogando**. O acelerador só trabalha durante a
> partida."

**Na tela:** Abrir Programação > Lógica e Se; encaixar segundo Condição se, senão se e senão no então do primeiro, primeiro lugar; manter comparação de fábrica.

**Narração:**
> "Pega outro **Condição se, senão se e senão** em **Programação**, **Lógica e Se**, e encaixa
> no **então** do primeiro Se, que está vazio. Desta vez a comparação que vem dentro serve;
> deixa ela."

**Na tela:** No lado esquerdo da comparação, encaixar valor da variável velocidade por cima do padrão; escolher sinal maior na lista; direita -9.

**Narração:**
> "Em **Programação**, abre **Valores** e põe **valor da variável** por cima do número da
> esquerda; escolhe **velocidade**. No menu do sinal, escolhe **maior que**, o quinto item da
> lista, com o biquinho para a direita. No lado direito escreve **menos 9**. Se ficar no igual,
> a base não muda e não aparece erro."

**Na tela:** Abrir Programação > Variáveis; encaixar Somar em variável no então interno, primeiro lugar; escolher velocidade e escrever -1.

**Narração:**
> "Em **Programação**, abre **Variáveis**. Pega **Somar em variável** e encaixa no **então** do
> Se de dentro, que está vazio, no primeiro lugar. Escolhe **velocidade** e escreve **menos 1**.
> A cada cinco segundos, enquanto joga e enquanto a base for maior que menos 9, ela diminui um
> passo."

**Na tela:** Jogar partida longa, mantendo variável e cactos em quadro; apontar limite.

**Narração:**
> "Olha uma partida longa. Os novos cactos chegam mais depressa. Quando a base chega a **menos
> 9**, a pergunta deixa de dar sim e o número para. Esse é o freio. Sem ele, o jogo aceleraria
> até ficar impossível."

## Seção 6. Escolha a dificuldade, teste tudo e entregue

### Clipe `video-balanceamento` · Escolha o quanto o seu jogo aperta
**Duração alvo:** 55 a 70 segundos · **Palavras:** 162

**Na tela:** Mostrar limite -9; trocar por -7 e jogar um trecho; depois -14 e comparar.

**Narração:**
> "Vamos escolher o quanto o jogo aperta. No limite, põe **menos 7** e observa: ele para de
> acelerar mais cedo. Agora testa **menos 14**: há mais passos de aceleração e o fim fica bem
> difícil."

**Na tela:** Voltar limite provisoriamente a -9; trocar relógio de 5 para 2 e depois 10, com trechos curtos de partida.

**Narração:**
> "Volto para **menos 9**. No relógio, testa **2 segundos**: a dificuldade cresce depressa.
> Depois **10 segundos**: demora muito mais. Os dois campos controlam coisas diferentes, o ponto
> de parada e a rapidez da mudança."

**Na tela:** Escolher valores finais dentro de -14 a -7 e 2 a 10; mostrar no bloco.

**Narração:**
> "No meu ficam **menos 9** e **5 segundos**. Os seus podem ser outros dentro de **menos 14 a
> menos 7** e **2 a 10 segundos**. Ajustar esse ritmo tem nome: **balanceamento**. Escolhe os
> números que tornam o seu jogo desafiador sem tirar a chance de aprender."

**Na tela:** Jogar começo, pulo, batida, reinício e trecho longo; conferir objetivos e enviar.

**Narração:**
> "Testa começo por tecla e toque, pulo, placar, batida e reinício. Depois tenta sobreviver o
> bastante para sentir a mudança. Se perder cedo, não precisa bater recorde: a régua da
> experiência já mostrou o efeito. Confere os objetivos, espera **Salvo** e clica em **Enviar
> para o professor**."

## Seção 7. O que tem embaixo dos seus blocos

### Clipe `video-ponte` · O que tem embaixo dos seus blocos
**Duração alvo:** 60 a 75 segundos · **Palavras:** 128

**Na tela:** No Estúdio Completo com projeto aberto, mostrar o seletor de modo no meio da barra superior; clicar Ponte.

**Narração:**
> "Tem uma última coisa para olhar no seu projeto. Na barra de cima do Estúdio, no seletor de
> modos, clica em **Ponte**. Ela põe os blocos de um lado e o código do outro. Não precisa
> escrever nada: hoje vamos só ler algumas partes."

**Na tela:** Mostrar as abas do código e selecionar script.js; buscar o nome dino, depois cactos e velocidade com a busca do editor.

**Narração:**
> "Abre a aba **script.js** e procura **dino**. É o nome do sprite que você criou. Procura
> **cactos**: o grupo e os nascimentos aparecem no código. Por fim, procura **velocidade** e
> acha o número que o acelerador muda. Os nomes que você escreveu nos blocos estão aqui."

**Na tela:** Enquadrar lado a lado um bloco reconhecível e trecho correspondente, sem editar.

**Narração:**
> "Estes blocos coloridos viram código de programação de verdade. Você não estava fingindo
> programar. Montou regras que o computador consegue executar, uma peça de cada vez. A Ponte
> deixa essa ligação à vista, no seu próprio jogo."

## Seção 8. Você fez um jogo inteiro

### Clipe `video-fecho-curso` · Você fez um jogo inteiro
**Duração alvo:** 75 a 90 segundos · **Palavras:** 156

**Na tela:** Mostrar jogo completo: floresta, pulo com som, cactos, placar, colisão e fim.

**Narração:**
> "Olha o jogo que você fez: cenário em movimento, Dino que pula com som, cactos que nascem fora
> da tela em lugares sorteados, faxina para quem já saiu, colisão mais justa, placar, início e
> fim."

**Na tela:** Mostrar uma partida ficando mais rápida e voltando ao menu após derrota.

**Narração:**
> "E ele muda enquanto você joga: se você aguenta mais tempo, os novos cactos vêm mais rápidos,
> até o limite que escolheu. Você construiu isso em treze aulas, uma peça por vez."

**Na tela:** Mostrar alguém abrindo a partida para jogar; depois a entrega já feita no curso.

**Narração:**
> "Chama alguém para jogar e observa o primeiro encontro da pessoa com um cacto. O projeto que
> você enviou já conta como sua entrega. Se quiser publicar depois, o **Compartilhar** leva o
> jogo ao Mural dos Criadores, com um link para outras pessoas abrirem."

**Na tela:** Mostrar Jornada do Criador e Mural como caminhos opcionais; terminar no jogo.

**Narração:**
> "Na **Jornada do Criador** você vê os cursos e troféus que conquistou. No Mural, se decidir
> compartilhar, seu jogo fica junto dos jogos de outros criadores. Quando der vontade de criar
> outro, há mais cursos esperando na Comunidade. Por agora, aproveita o seu jogo inteiro!"
