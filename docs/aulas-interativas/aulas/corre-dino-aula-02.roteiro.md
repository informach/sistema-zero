# Roteiro de gravação · Corre Dino · Aula 02 · O Dino aparece e a floresta passa

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 335 a 425 segundos de clipes; 757 palavras de narração, cerca de 5.5 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** a área `Ao iniciar` com três blocos, nesta ordem: `Preparar o jogo em tela cheia, tela 480 × 270, fundo` · `Mostrar a borda da tela, cor, espessura 4` · `Criar dinossauro dino em x 110 y 150 tamanho 64 cor`. O Dino está criado e invisível, e a pergunta "cadê o Dino" ficou aberta no fim da Aula 1.
- **Conceitos nomeados:** quadro, motor do jogo, limpar a tela, desenhar, camadas.
- **Dor desta aula:** O Dino está criado e invisível; o rastro discreto e a floresta sobre ele aparecem no projeto real.
- **Vitória do dia:** o Dino aparece e corre no lugar, na frente de uma floresta que passa. É o primeiro quadro desenhado do jogo dela, e é a resposta da pergunta que ficou de ontem.
- **Valores:** Floresta em velocidade 5; nome do sprite dino. A borda provisória sai.
- **Campos livres:** Cores herdadas da Aula 1.
- **Nota de produção:** Mostrar o rastro como ele realmente aparece, sem fabricar borrão. Mostrar o arraste da floresta e a retirada da borda, inclusive o desfazer.
- **O que NÃO entra, e por quê:** Não deixar duas florestas nem a borda no projeto final.

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · Hoje o seu dino aparece
**Duração alvo:** 20 a 30 segundos; recalibrar após gravar.

**Na tela:** Reabrir a aula no estado final da Aula 1: borda, cor e nenhum Dino na área do jogo.

**Narração:**
> "Lembra da pergunta de ontem? O Dino foi criado, mas ainda não apareceu. Hoje a gente resolve
> isso. No fim desta aula, ele vai estar correndo na frente da floresta."

**Na tela:** Mostrar por poucos segundos o resultado de hoje, com a floresta passando atrás do Dino.

**Narração:**
> "Hoje vamos montar o motor que põe o Dino e a floresta em movimento. Um bloco de cada vez,
> até ele aparecer no seu jogo."

## Seção 2. O jogo é um filme desenhado na hora

### Clipe `video-livrinho` · Cada página é um desenho
**Duração alvo:** 35 a 45 segundos · **Palavras:** 62

**Na tela:** Folhear um livrinho real, devagar, mostrando páginas ligeiramente diferentes.

**Narração:**
> "Você já viu um livrinho de folhear? Cada página traz um desenho um pouquinho diferente.
> Quando você passa as páginas depressa, parece que o desenho se mexe."

**Na tela:** Acelerar o folhear; mostrar uma página congelada ao lado da área do jogo.

**Narração:**
> "Um jogo faz algo parecido, só que desenha as páginas na hora. Cada página recebe um nome:
> **quadro**. Daqui a pouco você vai montar um bloco que pede um quadro novo várias vezes por
> segundo."

## Seção 3. Ligue o motor e faça o Dino aparecer

### Clipe `video-motor-e-dino` · O motor liga e o Dino aparece
**Duração alvo:** 75 a 90 segundos · **Palavras:** 138

**Na tela:** Mostrar Ao iniciar à esquerda na área de montar; abrir Áreas do projeto e soltar Enquanto estiver rodando ao lado, com espaço visível.

**Narração:**
> "Na categoria **Áreas do projeto**, pega **Enquanto estiver rodando**. Solta ao lado do **Ao
> iniciar**, com um espaço. Uma área prepara a partida; a outra guarda o que se repete enquanto
> o jogo acontece."

**Na tela:** Abrir Jogo 2D > Tempo > Quadros e intervalos; pôr A cada quadro do jogo no primeiro lugar de Enquanto estiver rodando.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Tempo**, depois **Quadros e intervalos**. Pega **A cada
> quadro do jogo** e encaixa no **Enquanto estiver rodando**, que está vazio, no primeiro lugar.
> Esse é o motor dos quadros."

**Na tela:** Abrir Jogo 2D > Sprites > Criar e trocar aparência; encaixar Desenhar o sprite no primeiro lugar de A cada quadro do jogo.

**Narração:**
> "Em **Jogo 2D**, abre **Sprites**, depois **Criar e trocar aparência**. Pega **Desenhar o
> sprite** e encaixa dentro do **A cada quadro do jogo**, que está vazio, no primeiro lugar."

**Na tela:** Abrir seletor de sprite, trocar jogador por dino; mostrar o Dino surgindo.

**Narração:**
> "O campo vem como **jogador**, mas o sprite que você criou se chama **dino**. Abre a listinha
> e escolhe dino pelo nome. Olha o seu jogo. Cadê o Dino? Está aí! Criar deixou ele pronto;
> desenhar trouxe ele para a tela."

### Clipe `video-limpar-a-tela` · Limpar antes de desenhar
**Duração alvo:** 45 a 55 segundos · **Palavras:** 105

**Na tela:** Zoom nas pernas do Dino durante a corrida, mostrando só o rastro sutil real.

**Narração:**
> "Chega perto das pernas do Dino. Fica um rastrinho pequeno, um resto do desenho de antes. O
> motor está desenhando quadros novos, mas ninguém limpa o quadro anterior."

**Na tela:** Abrir Jogo 2D > Desenho e efeitos > Efeitos; arrastar Limpar a tela para A cada quadro do jogo, logo acima de Desenhar o sprite.

**Narração:**
> "Em **Jogo 2D**, abre **Desenho e efeitos**, depois **Efeitos**. Pega **Limpar a tela** e
> encaixa dentro do **A cada quadro do jogo**, logo acima do **Desenhar o sprite**. Ele apaga o
> quadro antes do desenho seguinte, como uma lousa mágica."

**Na tela:** Mostrar o jogo e a pilha.

**Narração:**
> "Neste jogo o efeito é discreto, e logo a floresta vai pintar a tela quase toda de novo. O
> Limpar a tela fica porque essa ordem funciona também em jogos que não têm um fundo cobrindo
> tudo."

## Seção 5. O Dino sumiu

### Clipe `video-floresta-cobre` · Cadê o dino?
**Duração alvo:** 30 a 40 segundos · **Palavras:** 94

**Na tela:** Abrir Jogo 2D > Cenários > Fundos; encaixar Desenhar fundo de floresta no A cada quadro do jogo, logo abaixo de Desenhar o sprite dino.

**Narração:**
> "Agora entra a floresta, e eu vou pedir que você a coloque depois do Dino de propósito. Em
> **Jogo 2D**, abre **Cenários**, depois **Fundos**. Pega **Desenhar fundo de floresta** e
> encaixa logo abaixo do **Desenhar o sprite dino**."

**Na tela:** Mostrar campo velocidade 4; mudar para 5 e confirmar.

**Narração:**
> "A velocidade vem em **4**. Troca por **5** e clica fora. Olha o seu jogo. A floresta
> apareceu, mas o Dino sumiu! Ele estava aí há um segundo."

**Na tela:** Manter floresta cobrindo o Dino, sem mostrar conserto.

**Narração:**
> "Não é o nome do Dino que mudou. O jeito de desenhar colocou uma coisa em cima da outra. Na
> próxima parte você vai ver exatamente essa ordem."

## Seção 7. Quem é desenhado depois fica por cima

### Clipe `video-ordem-certa` · Quem é desenhado depois fica por cima
**Duração alvo:** 30 a 40 segundos · **Palavras:** 94

**Na tela:** Enquadrar a pilha: Limpar, Desenhar o sprite, Desenhar fundo de floresta. Arrastar a floresta para entre Limpar e Desenhar o sprite.

**Narração:**
> "Agora arrasta a floresta para o meio, **entre Limpar a tela e Desenhar o sprite dino**.
> Arrasta mesmo: se copiar, duas florestas passam a rodar ao mesmo tempo."

**Na tela:** Mostrar a pilha final e o Dino reaparecendo na frente da floresta.

**Narração:**
> "A pilha ficou: limpar, desenhar a floresta, desenhar o Dino. O que é desenhado depois fica
> por cima. Essa ordem tem nome: **camadas**. Olha o seu jogo. O Dino voltou, correndo na frente
> do cenário."

**Na tela:** Aproximar o limite do cenário dentro da antiga borda.

**Narração:**
> "Repara também que a floresta para certinho no limite da telinha. Ela mesma mostra onde o jogo
> acaba. A borda que usamos ontem já fez o trabalho dela e pode sair."

## Seção 8. Tire a borda sem derrubar o resto

### Clipe `video-retirar-borda` · Tirar uma peça sem derrubar as outras
**Duração alvo:** 55 a 65 segundos · **Palavras:** 106

**Na tela:** Mostrar Ao iniciar com Mostrar a borda da tela acima de Criar dinossauro. Arrastar a borda normalmente rumo à lixeira, mostrando o Dino indo junto.

**Narração:**
> "Olha a pilha do **Ao iniciar**. A borda está no meio e o Criar dinossauro fica embaixo dela.
> Se eu arrastar a borda inteira para a lixeira, levo os blocos de baixo junto. Olha: os dois
> foram."

**Na tela:** Apertar Ctrl+Z para restaurar; abrir menu contextual da borda e apontar Apagar este bloco.

**Narração:**
> "Vamos desfazer com **Control e Z**. Os dois voltaram. Agora clica com o botão direito no
> **Mostrar a borda da tela**. Em tela de toque, segura o bloco por um instante para abrir o
> mesmo menu. Escolhe **Apagar este bloco**."

**Na tela:** Mostrar a borda sumindo e o Criar dinossauro permanecendo em Ao iniciar.

**Narração:**
> "Só a borda saiu, e a pilha se ligou de novo. O Dino continua criado. Olha o seu jogo: a
> floresta marca o limite sem precisar daquele retângulo provisório."

## Seção 9. Teste, envie e fecha

### Clipe `video-fecho` · O motor e as camadas
**Duração alvo:** 45 a 60 segundos · **Palavras:** 106

**Na tela:** Enquadrar jogo: Dino correndo no lugar, floresta passando atrás.

**Narração:**
> "Confere comigo: o Dino fica no mesmo lugar e as pernas se mexem; a floresta passa atrás dele.
> É essa combinação que dá a sensação de corrida."

**Na tela:** Mostrar a pilha final com Limpar, floresta e Dino; conferir objetivos.

**Narração:**
> "Na pilha dos quadros, a ordem é **Limpar a tela**, **Desenhar fundo de floresta**, **Desenhar
> o sprite dino**. No **Ao iniciar**, a criação do Dino continua lá e a borda provisória saiu.
> Confere os objetivos da seção."

**Na tela:** Esperar Salvo e clicar Enviar para o professor; mostrar fecho e quiz.

**Narração:**
> "Quando tudo estiver certo, espera **Salvo** e clica em **Enviar para o professor**. Hoje você
> ligou o motor e aprendeu camadas: o que vem depois no desenho fica na frente. Na próxima aula,
> o Dino aprende a pular. Antes, responde ao quiz."
