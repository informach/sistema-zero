# Roteiro de gravação · Corre Dino · Aula 01 · A telinha do jogo e o Dino que ainda não aparece

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 290 a 365 segundos de clipes; 765 palavras de narração, cerca de 5.6 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** projeto vazio, com a extensão Jogo 2D preparada pelo professor. É o primeiro curso da trilha Iniciante 2D e não tem pré-requisito de programação: a criança pode nunca ter programado na vida. O curso pressupõe apenas que ela sabe se virar no Estúdio (achar um bloco na coluna da esquerda, arrastar, encaixar, trocar um número). A Aula 0, de tour, saiu do curso.
- **Conceitos nomeados:** Ao iniciar, tela do jogo, borda, coordenadas x e y, sprite, criar e mostrar.
- **Dor desta aula:** Depois de preparar 480 por 270, a cor ocupa a área inteira; depois de criar o Dino, ele ainda não aparece. Os dois sintomas aparecem no projeto real.
- **Vitória do dia:** a telinha de 480 por 270 aparece dentro da área do jogo, com a borda e a cor que ela escolheu. O Dino termina criado e invisível, de propósito, com a pergunta "cadê o Dino" aberta para a Aula 2.
- **Valores:** Tela 480 por 270, borda de espessura 4, dino em x 110 e y 150, tamanho 64.
- **Campos livres:** Cor do fundo, cor contrastante da borda e cor do Dino.
- **Nota de produção:** Abrir com o jogo completo; gravar a construção a partir de projeto vazio. Segurar as duas perguntas visuais sem antecipar a experiência seguinte.
- **O que NÃO entra, e por quê:** Não mostrar o Dino na tela ainda. O bloco que o desenha entra na Aula 2.

## Seção 1. Conheça o jogo que você vai fazer

### Clipe `video-abertura` · O jogo que você vai fazer
**Duração alvo:** 45 a 60 segundos · **Palavras:** 94

**Na tela:** Mostrar a tela de início do Corre, Dino! pronto; apertar Enter e deixar o Dino correr.

**Narração:**
> "Oi! Você vai criar o Corre, Dino! Olha a tela de início. Quando a partida começa, o Dino
> corre pela floresta e os cactos vêm na direção dele."

**Na tela:** Pular um cacto, enquadrar o placar subindo e a batida que termina a partida.

**Narração:**
> "Você aperta espaço para pular, ganha pontos enquanto resiste e vê o que acontece quando bate.
> Esse é o jogo inteiro que vamos construir, uma peça de cada vez."

**Na tela:** Voltar ao projeto vazio e indicar as três etapas de hoje na tela.

**Narração:**
> "Hoje são três passos: abrir o lugar que prepara o jogo, montar a telinha com a cor que você
> escolher e criar o seu Dino. No fim ele ainda não aparece. A gente vai entender por quê."

## Seção 2. Abra o lugar onde o jogo se arruma

### Clipe `video-area-e-tela` · A área que arruma o jogo, e a tela do Dino
**Duração alvo:** 70 a 85 segundos · **Palavras:** 181

**Na tela:** Enquadrar a área de montar vazia; abrir Áreas do projeto e arrastar Ao iniciar para o meio.

**Narração:**
> "Na categoria **Áreas do projeto**, pega **Ao iniciar**, segura e arrasta para a área de
> montar. Solta ali, com espaço em volta. Tudo o que ficar dentro dessa área acontece uma vez,
> quando a partida começa."

**Na tela:** Mostrar a caixa vazia, como um lugar esperando peças.

**Narração:**
> "É como preparar um jogo de tabuleiro: você abre o tabuleiro, separa as peças e dá as cartas
> antes de jogar. O **Ao iniciar** guarda essa preparação. Agora ele está vazio e vai receber a
> telinha."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Preparar a área do jogo; encaixar Preparar o jogo em tela cheia no primeiro lugar do Ao iniciar.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Jogo e telas**, depois **Preparar a área do jogo**. Pega
> **Preparar o jogo em tela cheia** e encaixa dentro do **Ao iniciar**, que está vazio, no
> primeiro lugar."

**Na tela:** Aproximar os campos; trocar largura 800 por 480 e altura 480 por 270, clicando fora de cada campo. Escolher fundo azul claro no exemplo.

**Narração:**
> "A largura vem em **800**. Troca por **480** e clica fora para confirmar. A altura vem em
> **480**. Troca por **270** e confirma também. No fundo, o meu vai ser azul bem claro. O seu
> pode ter outra cor."

**Na tela:** Manter a área do jogo inteira, pintada, sem contorno algum.

**Narração:**
> "Olha só. A cor pintou a área inteira. Você escreveu 480 por 270, mas onde está essa telinha?
> Ainda não dá para ver onde ela começa e termina. Guarda essa pergunta para a experiência que
> vem agora."

## Seção 4. Mostre o limite no seu jogo

### Clipe `video-borda` · A borda que mostra o limite
**Duração alvo:** 55 a 65 segundos · **Palavras:** 135

**Na tela:** Mostrar a pilha com Preparar o jogo em tela cheia; abrir Jogo 2D > Jogo e telas > Preparar a área do jogo.

**Narração:**
> "A experiência mostrou o limite com uma borda. Vamos trazer essa borda para o seu projeto. Na
> categoria **Jogo 2D**, abre **Jogo e telas**, depois **Preparar a área do jogo**. Pega
> **Mostrar a borda da tela**."

**Na tela:** Encaixar Mostrar a borda da tela no Ao iniciar, logo abaixo de Preparar o jogo em tela cheia; enquadrar o retângulo surgindo.

**Narração:**
> "Encaixa dentro do **Ao iniciar**, logo abaixo do **Preparar o jogo em tela cheia**. Apareceu
> um retângulo. É ele que mede 480 por 270. A parte de fora continua com a cor que você escolheu
> para o fundo."

**Na tela:** Aproximar os campos de cor e espessura; manter 4 e escolher borda cinza escura sobre o azul claro.

**Narração:**
> "A espessura já vem **4**, deixa assim. Na cor, escolhe uma que apareça sobre o seu fundo. O
> meu fundo é claro, então vou usar um cinza escuro. Agora dá para apontar onde a telinha
> termina."

**Na tela:** Mostrar jogo e pilha juntos.

**Narração:**
> "A borda é um instrumento para enxergar o limite hoje. Na próxima aula a floresta vai marcar
> esse limite sozinha, e a borda poderá sair."

## Seção 5. Onde o Dino vai ficar na tela

### Clipe `video-coordenadas` · O x, o y, e o y que cresce para baixo
**Duração alvo:** 20 a 30 segundos · **Palavras:** 81

**Na tela:** Mostrar a telinha de 480 por 270 com os eixos x e y e o canto superior esquerdo marcado 0, 0, sem mover um personagem no vídeo.

**Narração:**
> "Para criar um personagem, você precisa dizer onde ele fica. Esse endereço tem dois números. O
> **x** diz esquerda ou direita. O **y** diz cima ou baixo. O zero dos dois fica no canto de
> cima, à esquerda."

**Na tela:** Destacar a seta horizontal para a direita e a vertical para baixo.

**Narração:**
> "O x cresce para a direita. O y cresce para baixo, e isso costuma surpreender. Quanto maior o
> y, mais perto da parte de baixo da tela. Na bancada de agora, você muda um número de cada vez
> e vê o Dino acompanhar."

## Seção 6. Crie o seu dinossauro

### Clipe `video-criar-dino` · O seu dinossauro nasce
**Duração alvo:** 50 a 60 segundos · **Palavras:** 144

**Na tela:** Mostrar a pilha do Ao iniciar com a borda como último bloco; abrir Jogo 2D > Kits prontos > Dino.

**Narração:**
> "Agora vamos criar o personagem. Quem faz jogo chama cada objeto assim de **sprite**. O seu
> primeiro sprite é o Dino. Na categoria **Jogo 2D**, abre **Kits prontos**, depois **Dino**.
> Pega **Criar dinossauro**."

**Na tela:** Encaixar Criar dinossauro dentro do Ao iniciar, logo abaixo de Mostrar a borda da tela.

**Narração:**
> "Encaixa dentro do **Ao iniciar**, logo abaixo do **Mostrar a borda da tela**. Esse é o lugar
> da preparação, porque o Dino precisa existir antes de começar a partida."

**Na tela:** Zoom nos campos, um de cada vez: nome dino, x 120 para 110, y 150, tamanho 64 e cor escolhida.

**Narração:**
> "No nome já vem **dino**. Deixa assim: os próximos blocos vão procurar esse nome. O x vem em
> **120**; troca por **110** e confirma fora do campo. O y já é **150**, e o tamanho já é
> **64**. Deixa esses dois. Na cor, escolhe a sua."

**Na tela:** Mostrar a área do jogo ainda sem Dino, com a pilha visível.

**Narração:**
> "Olha a área do jogo. A borda está lá, mas o Dino não apareceu. Não mude os números para
> tentar achá-lo. Criar e mostrar são duas coisas diferentes. A próxima experiência vai deixar
> isso visível."

## Seção 8. Teste, envie e fecha

### Clipe `video-fecho` · Os três passos de hoje
**Duração alvo:** 50 a 65 segundos · **Palavras:** 130

**Na tela:** Zoom num número do bloco do Dino; clicar fora do campo para confirmar.

**Narração:**
> "Antes de conferir, lembra do gesto: sempre que escrever um número, clica fora do campo para
> ele valer. Agora olha a telinha com a borda em volta e o restante na sua cor."

**Na tela:** Enquadrar a tela vazia e a pilha inteira do Ao iniciar.

**Narração:**
> "O Dino continua invisível, e hoje é para ser assim. Confere a pilha comigo: **Ao iniciar**
> guarda a tela, depois a borda, depois o Dino criado com nome dino, x 110, y 150 e tamanho 64."

**Na tela:** Mostrar a lista de objetivos; esperar Salvo e clicar Enviar para o professor.

**Narração:**
> "Se algum objetivo estiver pendente, volta à pilha e corrige aquele bloco. Quando estiver tudo
> certo, espera aparecer **Salvo** e clica em **Enviar para o professor**."

**Na tela:** Mostrar a telinha e três cartões curtos com os passos; terminar no quiz.

**Narração:**
> "Você abriu a área que arruma o jogo, preparou a telinha e criou o Dino. Na próxima aula ele
> aparece correndo, com a floresta se mexendo atrás. Antes, responde ao quiz logo depois deste
> vídeo."
