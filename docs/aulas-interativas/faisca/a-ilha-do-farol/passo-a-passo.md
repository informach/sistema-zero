# Passo a passo do projeto — A Ilha do Farol

Use o teclado para jogar: setas ou WASD. R recomeça.

## Uma ilha com profundidade

### Faça o personagem andar

1. Em Enquanto estiver rodando, deixe à vista o bloco A cada quadro da cena. Dentro dele, encontre Escrever na tela: o novo bloco vai logo antes dele.
2. Abra Jogo 3D → Movimento → Andar com o teclado. Pegue Fazer personagem andar com as setas (ou WASD) e solte antes de Escrever na tela.
3. Confira se o nome do bloco é personagem. Clique no número 3 e troque por 4.
4. Clique em Atualizar. Clique dentro do jogo e segure cada seta por um tempo: o personagem anda nas quatro direções e para quando você solta. Leve-o até a ponte e até a beirada.
5. Clique em Verificar projeto, corrija se necessário e espere Salvo.

### Confira seu primeiro percurso

1. Segure cada seta e solte para parar: ande nas quatro direções.
2. Atravesse a ponte e volte. Toque na tecla R para começar de novo.
3. Verificar projeto → aguardar Salvo → Enviar meu projeto → Enviar → Projeto enviado!.

## A chave está ao seu alcance

### Coloque a chave na ilha

1. Em Ao iniciar, deixe à vista Colocar o objeto chave em x −2 y 1 z −3.
2. Clique no −2 depois de x e troque por −3. Clique em Atualizar e observe para onde a chave foi.
3. Clique no −3 depois de z e troque por −2. Deixe y em 1.
4. Clique em Atualizar e leve o personagem até perto da chave.

### Recolha a chave

1. Em Quando acontecer, deixe à vista o espaço logo abaixo do evento da tecla R, fora do fazer dele.
2. Abra Jogo 3D → Encostar → Encostar. Pegue Quando personagem encostar em chave e solte nesse espaço.
3. Deixe à vista o fazer do novo encontro. Abra Jogo 3D → Objetos → Aparência, pegue Mostrar o objeto e solte dentro desse fazer.
4. Clique em Mostrar e escolha Esconder. Clique no nome do objeto e escolha chave.
5. Clique em Atualizar e caminhe até a chave: ela some só no encontro. Toque na tecla R e repita por outro caminho.

### Guarde que você pegou a chave

1. Deixe à vista Ao iniciar, depois da linha que cria aviso. Em Programação → Variáveis, pegue Criar variável e encaixe ali. Ele chega com o nome contador: clique em contador e escreva temChave.
2. Em Programação → Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0, no valor da variável. Clique em verdadeiro e escolha falso: a partida começa sem chave.
3. Deixe à vista o encontro com chave, depois de Esconder o objeto chave. Em Programação → Variáveis, pegue Alterar variável para e encaixe ali. Repare que ele chega com o nome contador. Clique em contador e escolha temChave.
4. Em Programação → Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1, no valor. Deixe verdadeiro.
5. Confira os dois lugares: ao começar, falso; ao recolher, verdadeiro.

### Conte que a chave foi recolhida

1. Deixe à vista o encontro com chave, depois de temChave verdadeiro. Em Programação → Variáveis, pegue Alterar variável para e encaixe ali. Repare que ele chega com o nome contador. Clique em contador e escolha aviso.
2. Em Programação → Valores, pegue o bloco texto e solte em cima do 1, no valor. Ele chega com Olá: apague Olá e escreva Você pegou a chave! Agora vá ao farol.
3. Clique em Atualizar, recolha a chave e se afaste: o aviso continua. Toque na tecla R: a chave e o aviso inicial voltam.
4. Verifique, aguarde Salvo e envie o projeto com confirmação.

## A luz volta ao farol

### O farol precisa conferir a chave

1. Em Quando acontecer, deixe à vista o espaço logo abaixo do encontro com chave, fora do fazer dele.
2. Abra Jogo 3D → Encostar → Encostar. Pegue Quando personagem encostar em chave e solte nesse espaço. Clique em chave e escolha farol.
3. No fazer desse encontro, solte Se, de Programação → Lógica e Se.
4. Arraste a pergunta x maior que 0 do Se até a lixeira. No lugar vazio, solte valor da variável, de Programação → Valores. Clique no x e escolha temChave.
5. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.
6. Dentro do senão, solte Alterar variável para, de Programação → Variáveis, e escolha aviso. Em cima do 1, no valor, solte texto, de Programação → Valores, com Falta a chave. Procure na ilha antes de voltar. Deixe o então vazio nesta parte.
7. Clique em Atualizar e vá direto ao farol, sem recolher a chave: a luz continua apagada e o aviso pede a chave.

### Acenda o farol com a chave

1. No encontro com farol, deixe à vista o então do Se temChave.
2. Jogo 3D → Objetos → 🎬 Animação do modelo: solte Tocar a animação dentro do então.
3. No primeiro espaço, escolha acender. No objeto, escolha farol. No último, escolha uma vez.
4. Logo abaixo, solte Alterar variável para, de Programação → Variáveis. Repare que ele chega com o nome contador. Clique em contador e escolha ganhou. Em cima do 1, no valor, solte o bloco verdadeiro, de Programação → Lógica e Se.
5. Ainda no então, solte mais um Alterar variável para e escolha aviso. Em cima do 1, no valor, solte texto, de Programação → Valores, e escreva Você acendeu o farol! O barco pode chegar.
6. Clique em Atualizar. Vá ao farol sem a chave; depois recolha a chave e volte. Confira a luz acendendo, o feixe girando e a chegada do barco.

### O farol acende uma vez só

1. Teste antes de montar: clique em Atualizar, pegue a chave e acenda o farol. Ande para trás pelo cais e volte ao farol. Repare: a luz apaga e acende de novo.
2. Em Quando acontecer, deixe à vista o encontro com farol e um espaço vazio ao lado dele, fora do fazer.
3. Em Programação → Lógica e Se, pegue Se e solte nesse espaço vazio.
4. Arraste a pergunta x maior que 0 do Se novo até a lixeira. Em Programação → Lógica e Se, pegue não e solte no lugar vazio da pergunta.
5. Em Programação → Valores, pegue valor da variável e solte no espaço do não. Clique no x e escolha ganhou.
6. No encontro com farol, segure o Se temChave pela palavra Se e arraste até o então do Se novo. Tudo o que está dentro dele vai junto.
7. Segure o Se novo pela palavra Se e solte dentro do fazer do encontro com farol, que ficou vazio.
8. Clique em Atualizar. Pegue a chave, acenda o farol, ande para trás pelo cais e volte: a luz continua acesa e o feixe segue girando. Toque na tecla R e vá ao farol sem a chave: ele continua pedindo a chave.

### Deixe o jogo com a sua cara

1. Em Ao iniciar, deixe à vista Criar o objeto personagem com o modelo aventureiro. Clique em aventureiro e escolha outro personagem da lista.
2. Faça o mesmo em Criar o objeto barco, chave e farol: clique no nome do modelo e escolha outro.
3. Em Criar o objeto cenario, troque praia-tropical por outro cenário: costa-rochosa, ilha-nevada ou noite-na-ilha.
4. Troque só o modelo. Deixe o nome do objeto, a cena e o tamanho como estão.
5. Clique em Atualizar e teste a combinação: vá ao farol sem a chave, depois busque a chave e volte. Confira a luz e o barco.
6. Verifique o projeto e aguarde Salvo.

### Escolha seu esconderijo e teste de verdade

1. Em Ao iniciar → Colocar o objeto chave, escolha x e z dentro da ilha. Mantenha uma altura que o personagem alcance.
2. Se quiser, escreva seus próprios avisos nas linhas de atribuição, conservando a função de cada mensagem.
3. Clique em Atualizar. Vá ao farol sem chave. Depois alcance a chave escolhida e volte ao farol.
4. Toque na tecla R depois de vencer: o farol apaga, a chave volta e você pode jogar novamente.
5. Verifique, aguarde Salvo, envie o projeto e confirme o envio.
