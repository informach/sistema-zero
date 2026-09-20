# Roteiro de gravação · Corre Dino · Aula 10 · A caixa que decide a batida

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 260 a 315 segundos de clipes; 590 palavras de narração, cerca de 4.3 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo está completo desde a aula 9. Tem tela de início, partida, batida com explosão, tremida, som de derrota, tela de fim e reinício. No `Ao iniciar`, o último bloco é o `Mudar o estado do jogo para inicio`. Dentro do `Se o estado do jogo é jogando ?`, o último bloco é o `Tirar do grupo cactos quem sair da tela`. O dino foi criado com tamanho 64.
- **Conceitos nomeados:** caixa de colisão, área de colisão, instrumento de visualização e ajuste de dificuldade.
- **Dor desta aula:** Uma batida sem contato visível precisa ser capturada numa partida real; o raio-X revela o retângulo usado pelo jogo.
- **Vitória do dia:** duas, e as duas se veem. A primeira é o contorno rosa aparecendo em volta do dino, que é o invisível virando visível. A segunda é passar raspando num cacto e escapar.
- **Valores:** Dino tamanho 64; área de colisão de 70 a 85 por cento, exemplo 80. Extremos de demonstração 40 e 100.
- **Campos livres:** Percentual final da área entre 70 e 85.
- **Nota de produção:** Não fabricar a batida na edição. Manter o contorno ligado ao testar os extremos e retirá-lo só depois da conferência final.
- **O que NÃO entra, e por quê:** Não prometer colisão pixel a pixel: o ajuste altera a caixa retangular, não o desenho do Dino.

## Seção 1. A batida que você não deu

### Clipe `video-batida-injusta` · A batida que você não deu
**Duração alvo:** 25 a 35 segundos · **Palavras:** 75

**Na tela:** Jogar a versão da Aula 9 até uma batida sem toque visual; congelar o quadro real e aproximar o vão.

**Narração:**
> "Olha esta batida de novo, bem devagar. O Dino não encostou no cacto. Ainda tem um espaço
> entre os desenhos, mas a partida terminou. O jogo contou uma batida que os seus olhos não
> viram."

**Na tela:** Mostrar desenho do Dino e cacto no quadro congelado, sem inserir efeito de colisão.

**Narração:**
> "Não vamos fingir outra batida para explicar. Este quadro veio de uma partida real. Há uma
> forma que o jogo usa para decidir o contato e que ainda está escondida. Hoje vamos mostrar
> essa forma e ajustar o tamanho dela."

## Seção 2. Ligue o raio-X

### Clipe `video-raio-x` · O contorno que aparece em volta do dino
**Duração alvo:** 60 a 70 segundos · **Palavras:** 148

**Na tela:** Abrir Jogo 2D > Colisões > Área de contato; apontar Mostrar a caixa de colisão do sprite, distinto do bloco comprido acima.

**Narração:**
> "Vamos ligar o raio-X do jogo. Em **Jogo 2D**, abre **Colisões**, depois **Área de contato**.
> Pega **Mostrar a caixa de colisão do sprite**. É o bloco que mostra, não o bloco comprido que
> muda o tamanho."

**Na tela:** Encaixar no Se de jogando, logo abaixo da faxina, no fim do ramo; selecionar dino no campo.

**Narração:**
> "Encaixa dentro do **Se o estado do jogo é jogando**, logo abaixo da **faxina dos cactos**,
> que era o último bloco desse ramo. No campo do sprite, abre a listinha e escolhe **dino**."

**Na tela:** Clicar no jogo, iniciar partida e mostrar contorno rosa; congelar Dino para apontar vazios.

**Narração:**
> "Começa a partida. Apareceu um retângulo cor de rosa em volta do Dino. Repara no espaço vazio
> em cima da cabeça, na frente do focinho e entre os pés. O jogo mede o contato por esse
> retângulo, a **caixa de colisão**."

**Na tela:** Apontar retângulo sem alterar desenho.

**Narração:**
> "O contorno não é uma parte pintada do dinossauro. É um instrumento para enxergar a **área de
> colisão** que o jogo usa. Agora dá para entender como uma batida pode ser contada antes dos
> desenhos se tocarem."

## Seção 4. Deixe a caixa do tamanho do seu dino

### Clipe `video-ajustar-area` · A caixa encolhe, o dino continua igual
**Duração alvo:** 55 a 65 segundos · **Palavras:** 134

**Na tela:** Manter o raio-X ligado; abrir Jogo 2D > Colisões > Área de contato e pegar Usar área de colisão de % do tamanho para o sprite.

**Narração:**
> "Na mesma categoria **Jogo 2D**, abre **Colisões**, depois **Área de contato**. Pega **Usar
> área de colisão de 80 % do tamanho para o sprite**. Esse é o bloco que muda a caixa."

**Na tela:** Encaixar no Ao iniciar, logo abaixo de Mudar o estado do jogo para inicio, depois de Criar dinossauro.

**Narração:**
> "Encaixa no **Ao iniciar**, logo abaixo de **Mudar o estado do jogo para inicio**. Ele fica
> depois de **Criar dinossauro**, porque só dá para ajustar um Dino que já existe. Isso é
> preparação, então acontece uma vez no começo."

**Na tela:** Zoom nos campos: porcentagem 80 e sprite dino; mostrar contorno encolhendo e desenho intacto.

**Narração:**
> "O percentual já vem em **80**; deixa por enquanto. No sprite, escolhe **dino**. Olha o
> raio-X: a caixa encolheu, mas o desenho do Dino ficou exatamente do mesmo tamanho. A área de
> contato mudou; a arte não mudou."

**Na tela:** Jogar uma passagem rente ao cacto com o contorno visível.

**Narração:**
> "Passa bem perto de um cacto. Agora dá para escapar raspando. A caixa menor faz a batida
> combinar melhor com o que o jogador vê."

## Seção 5. O dial de dificuldade

### Clipe `video-dial` · O botão que decide o quanto o jogo perdoa
**Duração alvo:** 60 a 70 segundos · **Palavras:** 106

**Na tela:** Com raio-X ligado, trocar percentual por 40 e jogar uma passagem; mostrar caixa minúscula.

**Narração:**
> "Esse número é um ajuste de dificuldade. Vamos aos extremos para sentir o efeito. Põe **40**,
> confirma e olha a caixa: ficou pequena demais. O cacto parece atravessar partes do Dino sem
> encerrar a partida."

**Na tela:** Trocar por 100, jogar; mostrar caixa grande e batida precoce.

**Narração:**
> "Agora põe **100**. A caixa volta a ocupar o tamanho inteiro, com aqueles cantos vazios.
> Voltaram as batidas que parecem acontecer cedo demais."

**Na tela:** Voltar a 80 e indicar faixa 70 a 85; testar mais uma passagem.

**Narração:**
> "No meu jogo, **80** fica bom. O seu pode ficar em qualquer número entre **70 e 85**. Escolhe
> o que faz a batida parecer justa na sua arte. Não existe um percentual certo para todo jogo; o
> número depende do desenho e da experiência que você quer criar."

## Seção 6. Teste, guarde o raio-X e entregue

### Clipe `video-teste-e-envio` · Raspar, bater e tirar o raio-X
**Duração alvo:** 60 a 75 segundos · **Palavras:** 127

**Na tela:** Com contorno visível, jogar uma passagem rente ao cacto e depois uma batida real.

**Narração:**
> "Antes de guardar o raio-X, confere os dois lados: uma passagem rente sem perder e uma batida
> de verdade que termina a partida. A caixa menor deixou espaço para escapar, mas não desligou a
> colisão."

**Na tela:** Mostrar Mostrar a caixa de colisão como último bloco do Se; arrastar sozinho para a lixeira, deixando ajuste no Ao iniciar.

**Narração:**
> "Agora arrasta **Mostrar a caixa de colisão do sprite** para a lixeira. Ele é o último bloco
> desse ramo, então só ele sai. O ajuste de **80 por cento** continua no **Ao iniciar**. Repara
> que o contorno sumiu, mas o jeito da batida continua."

**Na tela:** Jogar curto sem contorno; conferir objetivos, esperar Salvo e enviar.

**Narração:**
> "Confere o percentual que você escolheu e a retirada do instrumento. Depois espera **Salvo** e
> clica em **Enviar para o professor**. Na Aula 6 você usou um medidor; hoje usou um raio-X.
> Quando algo do jogo parecer estranho, um instrumento pode mostrar o que estava escondido."
