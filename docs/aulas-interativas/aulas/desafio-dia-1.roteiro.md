# Roteiro de gravação · A Chave do Farol · Dia 1

Três seções, três vídeos. A criança começa sem experiência em programação. Falar de modo conversado; fazer pausas reais enquanto encaixa blocos. Tudo entre **Na tela** é direção de gravação, não narração. O projeto abre com cenário, personagens e desenho por quadro prontos, mas sem movimento nem direcional.

## Seção 1. A aventura começa no farol

### Vídeo `video-d1-chegada` · Uma luz precisa acender

**Na tela:** jogo completo por alguns segundos: personagem anda, chave desaparece ao ser encontrada, farol acende e barco chega. Depois abrir o projeto inicial do Dia 1 e apontar os elementos sem mexer em blocos.

**Narração:**
> "Hoje começa A Chave do Farol. Um barco precisa encontrar a costa, só que o farol está apagado. O personagem vai procurar a chave para acender a luz. Este é o jogo que vamos terminar juntos. Olha o caminho, a chave e o farol. Os desenhos e o cenário já estão aqui para você. O que ainda falta no seu projeto é uma regra importante: o personagem está parado. Hoje você vai ensinar o jogo a ouvir as direções que você escolher."

**Na tela:** no projeto inicial, tentar uma seta do teclado e depois tocar numa região neutra da prévia; o personagem não se move. Não sugerir que o jogo está quebrado.

**Narração:**
> "Se eu apertar uma seta agora, nada acontece. É esperado: o jogo ainda não recebeu a instrução de andar. Vamos construir essa primeira parte."

## Seção 2. Quatro caminhos para seguir

### Vídeo `video-d1-movimento` · Como o personagem vai andar?

**Na tela:** mostrar só o mapa, não a paleta. Com uma marca temporária da gravação, apontar para cima, baixo, esquerda, direita e para as bordas do mapa. Não acrescentar blocos neste vídeo.

**Narração:**
> "Pensa que você está ajudando esse personagem a passear pelo mapa. Ele pode ir para cima, para baixo, para a esquerda ou para a direita. São quatro direções. No celular ou tablet, você vai escolher a direção tocando nas setas que vamos colocar na tela. No teclado, pode usar as setas das teclas. E tem uma coisa para observar: o que será que acontece se ele continuar andando quando chega à beirada do mapa? Vamos testar no jogo."

## Seção 3. O mapa tem uma borda

### Vídeo `video-d1-borda` · Faça o personagem andar dentro do mapa

**Na tela:** abrir o Estúdio da seção. Enquadrar a área **Ao iniciar** sem destacar a variável preparada `ganhou`. Abrir **Jogo 2D → Controles → Teclado, ações e toque** e arrastar **Ativar controles clássicos** para o fim de **Ao iniciar**. No menu do bloco, escolher **só as quatro direções**. Se a prévia não atualizar sozinha, clicar **Atualizar**. Mostrar as quatro setas, sem A/B.

**Narração:**
> "Agora vamos fazer juntos. O Estúdio já tem os desenhos e o caminho. Primeiro, o jogo precisa mostrar como você vai mandar o personagem andar. Abra Jogo 2D, depois Controles, e entre em Teclado, ações e toque. Pegue Ativar controles clássicos e encaixe no fim da área Ao iniciar, logo depois dos blocos que já estão lá. Neste menu, escolha só as quatro direções. Se as setas ainda não apareceram no jogo, aperte Atualizar. Viu? São quatro setas, sem botões que este jogo não usa."

**Na tela:** apontar a área **Enquanto estiver rodando**, abrir o bloco **A cada quadro** já preparado. Abrir **Jogo 2D → Movimento → Movimentos prontos**, arrastar **Mover sprite em 4 direções com setas, velocidade** e encaixar logo depois de **Desenhar o cenário cenario** e antes da regra preparada do barco. Selecionar `personagem`, valor `3`; sair do campo numérico clicando num espaço vazio.

**Narração:**
> "Mostrar as setas ainda não faz ninguém andar. O jogo também precisa repetir o movimento enquanto estiver rodando. Na área Enquanto estiver rodando, abra A cada quadro. Volte à paleta: Jogo 2D, Movimento, Movimentos prontos. Pegue Mover sprite em 4 direções com setas. Encaixe logo abaixo do bloco que desenha o cenário. No campo sprite, escolha personagem. A velocidade diz quanto ele anda enquanto você segura a seta. No espaço da velocidade, coloque o número três e clique fora para confirmar. Agora o jogo sabe quem deve andar e em que ritmo."

**Na tela:** segurar direita no controle de toque, voltar ao começo do jogo se preciso e apertar uma seta no teclado depois de focar a prévia. Levar o personagem em direção à borda e parar quando parte dele sair ou parecer desaparecer. Não inserir ainda a solução.

**Narração:**
> "Teste com uma seta da tela. Se estiver no computador, clique dentro do jogo e teste também uma seta do teclado. Funcionou? Agora continue até a beirada. O personagem pode ir para fora e sumir. Aí fica difícil explorar. Precisamos de uma regra que segure o personagem dentro do mapa."

**Na tela:** abrir **Jogo 2D → Movimento → Bordas e rebatidas**, pegar **Manter o sprite dentro da tela** e encaixar logo depois do bloco de movimento. Escolher `personagem`. Testar as quatro bordas por toque e, se possível, por teclado.

**Narração:**
> "Abra Jogo 2D, Movimento, Bordas e rebatidas. Pegue Manter o sprite dentro da tela. Encaixe logo depois do bloco que move o personagem e escolha personagem. Teste outra vez. Agora, quando ele chega ao limite, fica visível. Experimente cima, baixo, esquerda e direita. Você fez três coisas importantes: colocou as setas na tela, ensinou o personagem a se mover e protegeu a borda do mapa."

**Na tela:** mostrar **Salvo** na barra do Estúdio depois da alteração persistir. Clicar **Enviar para o professor**, mostrar a confirmação e o estado de enviado. Sem prometer salvamento infalível ou entrega automática.

**Narração:**
> "Antes de seguir, olha esta palavra: Salvo. Ela mostra que a mudança ficou guardada no seu trabalho. Salvar e entregar não são a mesma coisa. Para eu ver o que você fez, aperte Enviar para o professor e confirme. Se quiser, pode testar mais uma vez antes de enviar. Amanhã vamos fazer a chave ter uma função de verdade."
