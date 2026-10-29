# Passo a passo do projeto — O Jardim Secreto

Missão Faísca. Ajuda opcional: comece pelo resultado, relembre a ideia e abra a montagem se precisar. Você pode programar em outra ordem, repetir testes e escolher mensagens e posições.

## Faça o jardim florescer em 2D

### O personagem não anda

**Relembre:** O teclado fornece a direção. O comando dentro do quadro transforma essa direção em movimento.

1. Deixe à vista o fim de Ao iniciar. Abra Jogo 2D → Controles → Teclado, ações e toque. Arraste Ativar controles clássicos até esse fim e escolha só as quatro direções.
2. Abra Enquanto estiver rodando. Dentro de A cada quadro do jogo, deixe à vista o espaço depois do fundo e antes dos desenhos dos sprites.
3. Abra Jogo 2D → Movimento → Movimentos prontos. Arraste Mover sprite em 4 direções com setas para esse espaço. Escolha personagem e coloque velocidade 5.

**Teste:** Clique no jogo. Pressione e solte cada seta do teclado. O personagem deve andar nas quatro direções e parar quando você soltar.

**Se não funcionar:** Se não andar, confira o nome personagem e o encaixe dentro do quadro. No 2D, confira também os controles em Ao iniciar. Apertar uma tecla não adiciona o comando aos blocos.

### O personagem sai da tela

**Relembre:** Primeiro o jogo move o personagem; depois corrige a posição quando ele passa da borda.

1. Deixe à vista o comando de movimento dentro de A cada quadro do jogo.
2. Em Jogo 2D → Movimento → Bordas e rebatidas, pegue Manter o sprite dentro da tela. Encaixe imediatamente depois do movimento e antes de desenhar os sprites. Escolha personagem.

**Teste:** Ande até cada uma das quatro bordas, continue pressionando e depois volte. O personagem deve continuar visível e conseguir sair da borda.

**Se não funcionar:** Se ele escapar ou tremer, confira se o limite está depois do movimento e se os dois usam personagem.

### O regador precisa sumir no encontro

**Relembre:** O evento reconhece o encontro; os comandos dentro dele são a reação.

1. Deixe à vista um espaço dentro de Quando acontecer, depois do evento da tecla R e fora do fazer dele.
2. Abra Jogo 2D → Colisões → Encostar e bloquear. Pegue Quando o sprite jogador começar a encostar no sprite inimigo e encaixe nesse espaço. Escolha personagem no primeiro nome e regador no segundo.
3. No fazer desse encontro, encaixe o comando Destruir o sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Escolha regador.

**Teste:** Comece uma partida, observe o regador no chão e caminhe até ele. Só no encontro ele deve desaparecer. Pressione R para repetir.

**Se não funcionar:** Se o regador sumir logo no começo, confira se remover ou esconder está no encontro, não em Ao iniciar. Se não sumir, confira os dois nomes do evento e a altura no 3D.

### O jogo precisa lembrar da coleta

**Relembre:** Sumir com o desenho e guardar uma informação são ações diferentes. Use uma variável com dois valores: falso antes da coleta e verdadeiro depois.

1. Deixe à vista o fim de Ao iniciar. Em Programação → Variáveis, pegue Criar variável e encaixe ali. Escreva temRegador no nome. Pode escolher outro nome e usá-lo em todos os lugares.
2. Em Programação → Lógica e Se, pegue verdadeiro ou falso. Encaixe no valor da nova variável e escolha falso.
3. Deixe à vista o fazer do encontro com regador. Depois de remover ou esconder, encaixe Programação → Variáveis → Alterar variável. Escolha temRegador.
4. Encaixe verdadeiro ou falso no valor dessa alteração e escolha verdadeiro. Confira: Ao iniciar usa falso; o encontro com o regador usa verdadeiro.

**Teste:** Recolha o regador e se afaste. A decisão da flor, montada adiante, vai usar essa informação mesmo longe do regador.

**Se não funcionar:** Não recrie temRegador dentro do quadro. Isso apagaria a memória repetidamente. Use o mesmo nome na criação, na alteração e na pergunta da flor.

### Conte o que aconteceu

**Relembre:** A área de avisos já lê a variável aviso. Mudar seu texto muda o que aparece no jogo.

1. No fazer do encontro com regador, deixe à vista o espaço depois da alteração de temRegador.
2. Em Programação → Variáveis, pegue Alterar variável e encaixe ali. Escolha aviso.
3. Em Programação → Valores, pegue Texto, encaixe no valor e escreva Você pegou o regador! Agora vá até a flor. Você pode escrever outro aviso claro com essa mesma informação.

**Teste:** Recolha o regador e se afaste. O novo aviso deve aparecer no encontro e continuar depois dele.

**Se não funcionar:** Se o aviso não mudar, confira se você alterou aviso, sem criar uma segunda variável, e se o texto está dentro do encontro.

### A flor precisa escolher uma resposta

**Relembre:** O encontro com a flor pergunta se a coleta já aconteceu. Verdadeiro escolhe então; falso escolhe senão.

1. Dentro de Quando acontecer, deixe à vista um espaço depois do evento da coleta e fora do fazer dele. Pegue outro evento de encontro em Jogo 2D → Colisões → Encostar e bloquear. Escolha personagem e flor.
2. No fazer do encontro com a flor, encaixe Programação → Lógica e Se → Se. Clique em + senão para abrir o outro caminho.
3. Retire a comparação que veio na pergunta do Se, arrastando pelo sinal da comparação até a lixeira. Em Programação → Valores, pegue valor da variável e encaixe na pergunta vazia. Escolha temRegador, ou o nome que você usou na memória.
4. Dentro do senão, encaixe Alterar variável de Programação → Variáveis. Escolha aviso. Encaixe Texto de Programação → Valores e escreva Busque o regador primeiro. A flor espera por você.
5. Deixe à vista o então. Em Jogo 2D → Sprites → Criar e trocar aparência, pegue Trocar imagem do sprite e encaixe ali. Escolha flor e a imagem flor-aberta.
6. Depois desse comando, ainda dentro do então, encaixe Alterar variável, escolha aviso e acrescente Texto com A flor abriu! Você fez o jardim florescer. Pode escolher outra mensagem de sucesso clara.

**Teste:** Pressione R e vá direto à flor, sem recolher: ela fica fechada e o aviso pede o regador. Depois recolha, afaste-se e volte à flor: ela abre e o aviso conta o sucesso. Continue andando para conferir que ela permanece aberta.

**Se não funcionar:** Se abrir cedo, confira se a reação está dentro do então e se a pergunta lê a mesma memória da coleta. Se nunca abrir, confira a alteração para verdadeiro e o nome da imagem ou do clipe.

### Escolha seu lugar para o regador

**Relembre:** X e Y mudam o lugar do regador na tela. Mudar um valor por vez ajuda a perceber o efeito.

1. Em Ao iniciar, encontre a criação do sprite regador. Ele começa em x 300 e y 190. Escolha outro x ou y. Um exemplo é x 390, mantendo y 190.
2. Observe onde ele apareceu. Pode experimentar vários lugares e escolher outro diferente do exemplo. Deixe-o dentro do jardim, visível, separado do personagem no começo e alcançável.
3. Preserve um caminho até a flor sem passar pelo regador. Comece uma partida com a mudança. Se a prévia já reiniciou ao editar, ela já serve para esse teste; senão clique no jogo e pressione R.

**Teste:** Vá primeiro à flor sem o regador. Depois recolha no lugar novo e volte. Pressione R após o sucesso: regador disponível, flor fechada e a posição escolhida conservada.

**Se não funcionar:** Se não conseguir chegar ao regador, ajuste o lugar; no 3D confira também se você manteve a altura. Reiniciar a partida conserva o programa. Não use restaurar o projeto inicial para esse teste.

## Leve sua missão para o 3D

### O personagem não anda

**Relembre:** O teclado fornece a direção. O comando dentro do quadro transforma essa direção em movimento.

1. Abra Enquanto estiver rodando. Deixe à vista A cada quadro da cena cena e o aviso dentro dele.
2. Abra Jogo 3D → Movimento → Andar com o teclado. Arraste Fazer personagem andar com as setas (ou WASD), velocidade 3 para dentro do quadro, antes de Escrever na tela.
3. Escolha personagem no nome e coloque 4 na velocidade. A câmera, a caminhada permitida e as animações já estão em Ao iniciar; conserve esses blocos.

**Teste:** Clique no jogo. Pressione e solte cada seta do teclado. O personagem deve andar nas quatro direções e parar quando você soltar.

**Se não funcionar:** Se não andar, confira o nome personagem e o encaixe dentro do quadro. No 2D, confira também os controles em Ao iniciar. Apertar uma tecla não adiciona o comando aos blocos.

### O regador precisa sumir no encontro

**Relembre:** O evento reconhece o encontro; os comandos dentro dele são a reação.

1. Deixe à vista um espaço dentro de Quando acontecer, depois do evento da tecla R e fora do fazer dele.
2. Abra Jogo 3D → Encostar. Pegue Quando personagem encostar em chave e encaixe nesse espaço. Escolha personagem no primeiro nome e regador no segundo.
3. No fazer desse encontro, encaixe Jogo 3D → Objetos → Aparência → Esconder o objeto. Escolha regador.

**Teste:** Comece uma partida, observe o regador no chão e caminhe até ele. Só no encontro ele deve desaparecer. Pressione R para repetir.

**Se não funcionar:** Se o regador sumir logo no começo, confira se remover ou esconder está no encontro, não em Ao iniciar. Se não sumir, confira os dois nomes do evento e a altura no 3D.

### O jogo precisa lembrar da coleta

**Relembre:** Sumir com o desenho e guardar uma informação são ações diferentes. Use uma variável com dois valores: falso antes da coleta e verdadeiro depois.

1. Deixe à vista o fim de Ao iniciar. Em Programação → Variáveis, pegue Criar variável e encaixe ali. Escreva temRegador no nome. Pode escolher outro nome e usá-lo em todos os lugares.
2. Em Programação → Lógica e Se, pegue verdadeiro ou falso. Encaixe no valor da nova variável e escolha falso.
3. Deixe à vista o fazer do encontro com regador. Depois de remover ou esconder, encaixe Programação → Variáveis → Alterar variável. Escolha temRegador.
4. Encaixe verdadeiro ou falso no valor dessa alteração e escolha verdadeiro. Confira: Ao iniciar usa falso; o encontro com o regador usa verdadeiro.

**Teste:** Recolha o regador e se afaste. A decisão da flor, montada adiante, vai usar essa informação mesmo longe do regador.

**Se não funcionar:** Não recrie temRegador dentro do quadro. Isso apagaria a memória repetidamente. Use o mesmo nome na criação, na alteração e na pergunta da flor.

### Conte o que aconteceu

**Relembre:** A área de avisos já lê a variável aviso. Mudar seu texto muda o que aparece no jogo.

1. No fazer do encontro com regador, deixe à vista o espaço depois da alteração de temRegador.
2. Em Programação → Variáveis, pegue Alterar variável e encaixe ali. Escolha aviso.
3. Em Programação → Valores, pegue Texto, encaixe no valor e escreva Você pegou o regador! Agora vá até a flor. Você pode escrever outro aviso claro com essa mesma informação.

**Teste:** Recolha o regador e se afaste. O novo aviso deve aparecer no encontro e continuar depois dele.

**Se não funcionar:** Se o aviso não mudar, confira se você alterou aviso, sem criar uma segunda variável, e se o texto está dentro do encontro.

### A flor precisa escolher uma resposta

**Relembre:** O encontro com a flor pergunta se a coleta já aconteceu. Verdadeiro escolhe então; falso escolhe senão.

1. Dentro de Quando acontecer, deixe à vista um espaço depois do evento da coleta e fora do fazer dele. Pegue outro evento de encontro em Jogo 3D → Encostar. Escolha personagem e flor.
2. No fazer do encontro com a flor, encaixe Programação → Lógica e Se → Se. Clique em + senão para abrir o outro caminho.
3. Retire a comparação que veio na pergunta do Se, arrastando pelo sinal da comparação até a lixeira. Em Programação → Valores, pegue valor da variável e encaixe na pergunta vazia. Escolha temRegador, ou o nome que você usou na memória.
4. Dentro do senão, encaixe Alterar variável de Programação → Variáveis. Escolha aviso. Encaixe Texto de Programação → Valores e escreva Busque o regador primeiro. A flor espera por você.
5. Deixe à vista o então. Em Jogo 3D → Objetos → Animação do modelo, pegue Tocar a animação e encaixe ali. Escolha flor, clipe florescer e uma vez.
6. Depois desse comando, ainda dentro do então, encaixe Alterar variável, escolha aviso e acrescente Texto com A flor abriu! Você fez o jardim florescer. Pode escolher outra mensagem de sucesso clara.

**Teste:** Pressione R e vá direto à flor, sem recolher: ela fica fechada e o aviso pede o regador. Depois recolha, afaste-se e volte à flor: ela abre e o aviso conta o sucesso. Continue andando para conferir que ela permanece aberta.

**Se não funcionar:** Se abrir cedo, confira se a reação está dentro do então e se a pergunta lê a mesma memória da coleta. Se nunca abrir, confira a alteração para verdadeiro e o nome da imagem ou do clipe.

### A flor abre uma vez só

**Relembre:** A flor é o fim do jogo. Como no farol da Ilha, o encontro roda de novo a cada volta do personagem; a variável ganhou guarda que a partida já foi vencida, e o Se não ganhou faz a flor parar de responder.

1. Em Ao iniciar, depois de temRegador, crie a variável ganhou com o valor falso, do mesmo jeito que criou temRegador.
2. No então do Se temRegador, depois de Tocar a animação, encaixe Alterar variável. Escolha ganhou, encaixe verdadeiro ou falso no valor e escolha verdadeiro.
3. Em Quando acontecer, deixe à vista um espaço vazio ao lado do encontro com flor, fora do fazer. Em Programação → Lógica e Se, pegue Se e solte nesse espaço.
4. Arraste a comparação que veio na pergunta do Se novo até a lixeira. Em Programação → Lógica e Se, pegue não e encaixe no lugar vazio. Em Programação → Valores, pegue valor da variável, encaixe dentro do não e escolha ganhou.
5. Pegue o Se temRegador pela palavra Se e arraste até o então do Se novo; tudo o que está dentro dele vai junto. Depois encaixe o Se novo no fazer do encontro com flor, que ficou vazio.

**Teste:** Recolha o regador e vá à flor: ela abre. Saia de perto e volte: ela continua aberta, sem florescer de novo. Numa partida nova, vá à flor sem o regador: ela continua pedindo o regador.

**Se não funcionar:** Se a flor florescer de novo ao voltar, confira se ganhou fica verdadeiro no então e se o Se temRegador inteiro está dentro de Se não ganhou. Se nunca abrir, confira se ganhou começa em falso.

### Escolha seu lugar para o regador

**Relembre:** X e Z mudam o lugar no chão. Y muda a altura, que já está preparada para o encontro.

1. Em Ao iniciar, encontre Colocar o objeto regador. Escolha outro valor de x ou z; deixe y em 0.54, como está. Um exemplo é x −2, com o mesmo z.
2. Observe onde ele apareceu. Pode experimentar vários lugares e escolher outro diferente do exemplo. Deixe-o dentro do jardim, visível, separado do personagem no começo e alcançável.
3. Preserve um caminho até a flor sem passar pelo regador. Comece uma partida com a mudança. Se a prévia já reiniciou ao editar, ela já serve para esse teste; senão clique no jogo e pressione R.

**Teste:** Vá primeiro à flor sem o regador. Depois recolha no lugar novo e volte. Pressione R após o sucesso: regador disponível, flor fechada e a posição escolhida conservada.

**Se não funcionar:** Se não conseguir chegar ao regador, ajuste o lugar; no 3D confira também se você manteve a altura. Reiniciar a partida conserva o programa. Não use restaurar o projeto inicial para esse teste.

## Entrega

Em cada aula, verifique os objetivos, aguarde Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. Não precisa publicar na comunidade. Concluir a missão não concede certificado nem promove sozinho: a jornada também confere os dois cursos-base e um Poder distinto.
