# Roteiro de gravação · O Jogo do Meu Jeito · Aula 07 · As suas pedras entram no jogo

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio Completo.
- **Duração:** 415 a 495 segundos de clipes; 1026 palavras de narração, cerca de 7.5 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo com a nave dela já animada, terminado na Aula 6. As pedras que caem ainda são as cinzas do Kit espaço. A arte `asteroide` já está no projeto, guardada e sem uso.
- **Conceitos nomeados:** folha de quadros por arte, nascimento repetido, apelido do novo sprite e animação de cada pedra.
- **Dor desta aula:** O kit cria pedras cinzas sem campo de imagem; a nova arte já está no projeto, mas precisa substituir o criador e ser animada a cada nascimento.
- **Vitória do dia:** o jogo inteiro com a cara dela. A nave dela voando, as pedras dela caindo e girando, e as regras, o sorteio, o placar, as vidas e o reinício exatamente como estavam. É o marco do curso.
- **Valores:** Folha-asteroide com quadros 64 por 64; criador dentro de A cada 40 quadros e Se jogando: grupo asteroides, nome asteroide, x sorteado, y -30, 40 por 40, imagem asteroide, vx 0, vy 3; girando 0 a 1 a 8 fps.
- **Campos livres:** A aparência já foi escolhida no Pinta; os valores guiados do nascimento permanecem.
- **Nota de produção:** Mostrar os dois criadores convivendo só durante a troca. Depois de mover o bloco de x aleatório, mostrar as pedras cinzas empilhadas no canto até apagar o criador velho.
- **O que NÃO entra, e por quê:** Não usar a subcategoria antiga Muitos nem chamar a pergunta de tela atual.

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · A sua nave já está lá, agora entram as suas pedras
**Duração alvo:** 25 a 35 segundos · **Palavras:** 73

**Na tela:** Mostrar partida final: nave própria voando, pedras próprias caindo e girando, tiros, placar e vidas.

**Narração:**
> "A sua nave já voa no jogo. Hoje entram as suas pedras, com o fogo e as crateras que você
> desenhou. Repara que cada uma nasce e já começa a girar."

**Na tela:** Aproximar nave criada uma vez e sequência de pedras nascendo.

**Narração:**
> "A nave é criada uma vez, no começo. As pedras nascem durante a partida inteira, uma depois da
> outra. Por isso a troca delas acontece num lugar diferente do projeto. Primeiro vamos preparar
> a folha; depois cuidar do nascimento e da animação."

## Seção 2. Prepare a folha das pedras

### Clipe `video-folha-asteroide` · A segunda folha, e o número que muda
**Duração alvo:** 95 a 110 segundos · **Palavras:** 225

**Na tela:** Na aula, apontar Abrir meu Estúdio; abrir cartão do jogo; mostrar folha da nave no Ao iniciar.

**Narração:**
> "Clica em **Abrir meu Estúdio** e abre o cartão do mesmo jogo. No **Ao iniciar**, encontra a
> folha **folha-nave** que você preparou na Aula 6. A segunda arte precisa de uma folha própria,
> sem mexer na primeira."

**Na tela:** Abrir Jogo 2D > Sprites > Animação; pegar Carregar folha de quadros da imagem com quadros de x px.

**Narração:**
> "Em **Jogo 2D**, abre **Sprites**, depois **Animação**. Pega **Carregar folha de quadros da
> imagem com quadros de x px**, o mesmo bloco que já conhece."

**Na tela:** Encaixar no Ao iniciar entre Animar sprite nave e Criar grupo de sprites tiros.

**Narração:**
> "Encaixa no **Ao iniciar**, **entre Animar sprite nave com voando e Criar grupo de sprites
> tiros**. As duas folhas vão conviver, uma de cada desenho."

**Na tela:** Nome folha-asteroide, imagem asteroide, trocar dois tamanhos 32 por 64; confirmar.

**Narração:**
> "No nome escreve **folha-asteroide**. Esse nome é da folha; **asteroide** vai ser o nome de
> cada pedra. Na imagem escolhe **asteroide**. Largura e altura do quadro vêm em **32**; troca
> as duas por **64**, o tamanho que você escolheu no Pinta para o vetor."

**Na tela:** Mostrar duas folhas na pilha e jogo ainda com pedras cinzas.

**Narração:**
> "Confere: a folha da nave continua 32 por 32, a da pedra ficou 64 por 64. O jogo ainda mostra
> pedras cinzas, e está certo. A folha foi preparada, mas nenhum bloco mandou usá-la."

**Na tela:** Mostrar a cartela de pausa com o botão **Abrir meu Estúdio**; na volta, pôr o resultado de referência à vista para comparação, sem marca de aprovação automática.

**Narração:**
> "Pause aqui e clique em **Abrir meu Estúdio**. A ferramenta abre em outra aba. Faça esta parte
> lá e volte a esta aula para comparar. No Ao iniciar há uma folha nova de 64 por 64 para o
> asteroide, enquanto a folha de 32 por 32 da nave continua? As pedras ainda cinzas são
> esperadas por enquanto."

## Seção 4. Troque a peça que cria as pedras

### Clipe `video-novo-criador` · Nove campos, e uma pecinha que muda de lugar
**Duração alvo:** 150 a 175 segundos · **Palavras:** 358

**Na tela:** Mostrar dentro do A cada 40 quadros o Se o estado do jogo é jogando e o criador cinza do kit.

**Narração:**
> "Aqui está o lugar onde cada pedra nasce: dentro do **A cada 40 quadros**, protegido por **Se
> o estado do jogo é jogando**. O bloco do kit cria as pedras cinzas. Ele não tem campo de
> imagem, então não pode usar a arte que você trouxe."

**Na tela:** Abrir Jogo 2D > Grupos > Criar e percorrer; apontar segundo bloco que termina em cor e quarto que termina em imagem.

**Narração:**
> "Em **Jogo 2D**, abre **Grupos**, depois **Criar e percorrer**. O bloco que termina em **cor**
> é parecido, mas não serve aqui. Pega o quarto da gaveta, **No grupo criar um sprite chamado em
> x y largura altura com imagem vx vy**. O final **com imagem** é a pista."

**Na tela:** Encaixar dentro do Se jogando, logo abaixo do criador velho, no mesmo A cada 40 quadros.

**Narração:**
> "Encaixa dentro do mesmo **Se**, logo abaixo do criador cinza. Os dois vão ficar juntos só
> enquanto fazemos a troca. É uma etapa de passagem, não o resultado final."

**Na tela:** Preencher grupo asteroides e nome asteroide; no x, apontar valor provisório antes da transferência; y -30.

**Narração:**
> "No grupo escolhe **asteroides**. No nome escreve **asteroide**. O campo x vai receber uma
> peça do bloco antigo já já. No y escreve **menos 30**, para a pedra nascer um pouco acima da
> tela e entrar caindo."

**Na tela:** Preencher largura 40, altura 40, imagem asteroide, vx 0 e vy 3, confirmando cada campo.

**Narração:**
> "Na largura escreve **40** e na altura **40**: é o tamanho visível no jogo, diferente dos 64
> do quadro da arte. Na imagem escolhe **asteroide**. No vx deixa **0**; no vy põe **3**.
> Confere todos os campos antes de mexer no bloco antigo."

**Na tela:** Arrastar um x aleatório na tela do x do criador velho para o x do novo, sem copiar; mostrar soquete velho vazio.

**Narração:**
> "Agora arrasta **um x aleatório na tela** do campo x do criador velho para o campo x do novo.
> Arrasta, não copia. No velho ficou um espaço vazio, que vale zero. Por isso as pedras cinzas
> podem nascer empilhadas num canto por um instante. Ele já vai sair."

**Na tela:** Cartela de pausa para montar novo criador, antes de remover o antigo.

**Narração:**
> "Pause aqui, abre o Estúdio pelo botão da seção e monta o criador novo com esses valores.
> Volta ao vídeo antes de apagar o velho, para conferir exatamente qual bloco vai embora."

**Na tela:** Mostrar as duas espécies de pedra coexistindo; botão direito no criador velho, ler Apagar este bloco e apagar.

**Narração:**
> "Com os dois ativos, caem pedras suas e pedras cinzas. Clica com o botão direito no **criador
> do Kit espaço**, lê **Apagar este bloco** e apaga só ele. Joga de novo: agora cai uma espécie
> só, com a sua imagem e o x sorteado."

**Na tela:** Mostrar o resultado de referência à vista para comparação com o projeto ou desenho da pessoa, sem marca de aprovação automática.

**Narração:**
> "Agora compare o seu resultado com este. Ao jogar, caem só as suas pedras em posições
> diferentes pela largura da tela? Se ainda cair a pedra cinza, confira o criador antigo."

## Seção 5. Faça cada pedra nova já girar

### Clipe `video-animar-cada` · A pedra rolando e pegando fogo
**Duração alvo:** 85 a 100 segundos · **Palavras:** 204

**Na tela:** Mostrar o criador novo no A cada 40 quadros dentro do Se jogando; abrir Jogo 2D > Sprites > Animação.

**Narração:**
> "As pedras já têm a sua imagem, mas ainda não giram. Cada uma nasce durante a partida, então
> cada uma precisa receber a animação logo depois de nascer. Em **Jogo 2D**, abre **Sprites**,
> depois **Animação**."

**Na tela:** Pegar Animar sprite com a folha na animação, do quadro ao a fps e encaixar no mesmo Se, logo abaixo do criador novo.

**Narração:**
> "Pega **Animar sprite com a folha na animação, do quadro ao a fps**. Encaixa dentro do mesmo
> **Se** do relógio, logo abaixo do **No grupo criar um sprite chamado asteroide com imagem**.
> Se ficar no Ao iniciar, só uma pedra poderia receber esse comando."

**Na tela:** Selecionar sprite asteroide, folha folha-asteroide, botão Escolher > girando; mostrar números 0, 1 e 8 fps.

**Narração:**
> "No sprite escolhe **asteroide**. Na folha escolhe **folha-asteroide**, não a da nave. Clica
> em **Escolher** na animação e seleciona **girando**. O bloco preenche sozinho **do quadro 0 ao
> 1, a 8 fps**, os dois desenhos da sua pedra."

**Na tela:** Começar partida, enquadrar três pedras seguidas girando; testar nave, tiro, placar e vidas.

**Narração:**
> "Clica na área do jogo, começa a partida e olha pelo menos três pedras nascerem. Todas já
> giram? Move a nave, atira e confere placar e vidas. Se só a primeira girar, olha se o bloco de
> animar está junto do criador, dentro do relógio."

**Na tela:** Mostrar a cartela de pausa com o botão **Abrir meu Estúdio**; na volta, pôr o resultado de referência à vista para comparação, sem marca de aprovação automática.

**Narração:**
> "Pause aqui e clique em **Abrir meu Estúdio**. A ferramenta abre em outra aba. Faça esta parte
> lá e volte a esta aula para comparar. Ao jogar, pelo menos três pedras seguidas já nascem
> girando, enquanto nave, tiros e placar continuam?"

## Seção 6. Envie, e o que mudou sem você pedir

### Clipe `video-fecho-v6` · O jogo inteiro com a sua cara
**Duração alvo:** 60 a 75 segundos · **Palavras:** 166

**Na tela:** Mostrar Ao iniciar com folha-asteroide 64x64 e relógio com um criador e bloco de animar logo abaixo.

**Narração:**
> "Confere as peças novas: **folha-asteroide** no Ao iniciar com quadros 64 por 64. No relógio
> de 40 quadros, dentro do Se de **jogando**, ficou um criador só, com x sorteado, y menos 30,
> 40 por 40, vx zero e vy três. Logo depois dele, a animação **girando**."

**Na tela:** Jogar partida inteira: três pedras próprias, tiro, pontos, vidas, fim e reinício; mostrar área de contato sem prometer pixel a pixel.

**Narração:**
> "Joga uma partida e vê três pedras seguidas com a sua arte. Confere tiro, pontos, vidas, fim e
> reinício. A colisão agora acompanha melhor a área pintada das imagens, mas não segue cada
> pontinha pixel por pixel. Testa uma batida real para sentir o resultado."

**Na tela:** Esperar Guardado na sua conta, selecionar projeto do jogo na entrega e enviar.

**Narração:**
> "Espera **Guardado na sua conta** e envia este mesmo projeto pela galeria da aula. O envio
> guarda a versão atual, e você ainda pode editar o jogo depois. Se o cartão não aparecer,
> confere o salvamento e atualiza a lista."

**Na tela:** Mostrar jogo com ambas as artes e gancho para publicação.

**Narração:**
> "Agora a nave e as pedras foram desenhadas por você, e o jogo do Desafio continua inteiro por
> baixo. Na próxima aula, a primeira coisa é colocar essa versão no Mural dos Criadores."
