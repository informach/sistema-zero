# Passo a passo do projeto — A Ilha do Farol

Use o teclado para jogar: setas ou WASD. R recomeça.

## Uma ilha com profundidade

### Faça o personagem andar

1. Abra Enquanto estiver rodando e deixe à vista A cada quadro da cena cena.
2. Antes de Mover o grupo jogadores, encaixe Jogo 3D → Movimento → Andar com o teclado → Mover jogador com o teclado (WASD/setas), 3 por segundo.
3. Troque jogador por personagem e 3 por 4.
4. Execute o jogo. Pressione e solte cada seta: ande nas quatro direções e pare ao soltar. Confira a ponte e a beirada.
5. Verifique o projeto, corrija se necessário e espere Salvo.

### Confira seu primeiro percurso

1. Ande nas quatro direções e solte as teclas para parar.
2. Atravesse a ponte e volte. Pressione R para começar novamente.
3. Verificar projeto → aguardar Salvo → Enviar meu projeto → Enviar → Projeto enviado!.

## A chave está ao seu alcance

### Coloque a chave na ilha

1. Em Ao iniciar, encontre Posição do objeto chave em x −2 y 1 z −3.
2. Mude x para −3 e teste. Depois mude z para −2 e teste. Mantenha y em 1.
3. Confira a chave na ilha e leve o personagem até perto dela.

### Recolha a chave

1. Deixe à vista um espaço dentro de Quando acontecer, depois do evento da tecla R.
2. Jogo 3D → Encostar → Encostar: arraste Quando personagem encostar em algum do grupo chaves, chamando de item.
3. Dentro do fazer, encaixe Jogo 3D → Objetos → Aparência → Esconder o objeto chave.
4. Jogue até a chave. Confira que ela some apenas no encontro. Pressione R para repetir.

### Guarde que você pegou a chave

1. Deixe à vista Ao iniciar, depois da linha que cria aviso. Em Programação → Variáveis, pegue Criar variável e encaixe ali. Escreva temChave no nome.
2. No valor da variável, encaixe verdadeiro ou falso de Programação → Lógica e Se. Escolha falso: a partida começa sem chave.
3. Deixe à vista o encontro com chaves, depois de Esconder o objeto chave. Encaixe Alterar variável, de Programação → Variáveis. Escolha temChave e encaixe o valor verdadeiro, de Programação → Lógica e Se.
4. Confira os dois lugares. A coleta deve guardar a informação até o reinício.

### Conte que a chave foi recolhida

1. Deixe à vista o encontro com chaves, depois de temChave verdadeiro. Em Programação → Variáveis, pegue Alterar variável e encaixe ali. Escolha aviso.
2. Em Programação → Valores, pegue Texto e encaixe no valor. Escreva Você pegou a chave! Agora vá ao farol.
3. Jogue, recolha e se afaste. O aviso deve continuar. Reinicie: chave e aviso inicial voltam.
4. Verifique, aguarde Salvo e envie o projeto com confirmação.

## A luz volta ao farol

### O farol precisa conferir a chave

1. Deixe à vista Quando acontecer, depois do evento da coleta e fora do fazer dele. Em Jogo 3D → Encostar → Encostar, pegue outro encontro com alguém de um grupo. Encaixe ali, escolha personagem e portas e deixe item como está.
2. No fazer desse encontro, encaixe Programação → Lógica e Se → Se; clique em + senão.
3. Retire a comparação x maior que zero da pergunta do Se. No lugar dela, encaixe valor da variável, de Programação → Valores, e escolha temChave.
4. Deixe à vista o senão. Encaixe Alterar variável, de Programação → Variáveis, e escolha aviso. Encaixe Texto, de Programação → Valores, com Falta a chave. Procure na ilha antes de voltar. Deixe então vazio nesta parte.
5. Reinicie e vá direto ao farol sem recolher a chave. Confira o aviso e a luz apagada.

### Acenda o farol com a chave

1. No encontro com portas, deixe à vista o então do Se temChave.
2. Jogo 3D → Objetos → Aparência: encaixe Esconder o objeto farol.
3. No mesmo então, encaixe Mostrar o objeto farolAceso.
4. Depois de Mostrar farolAceso, encaixe Alterar variável, de Programação → Variáveis. Escolha ganhou. Encaixe verdadeiro ou falso, de Programação → Lógica e Se, e escolha verdadeiro.
5. Ainda no então, encaixe mais um Alterar variável e escolha aviso. No valor, encaixe Texto, de Programação → Valores, e escreva Você acendeu o farol! O barco pode chegar.
6. Teste sem chave; depois recolha e volte ao farol. Confira a luz e a chegada do barco.

### Escolha seu esconderijo e teste de verdade

1. Em Ao iniciar → Posição do objeto chave, escolha x e z dentro da ilha. Mantenha uma altura que o personagem alcance.
2. Se quiser, escreva seus próprios avisos nas linhas de atribuição, conservando a função de cada mensagem.
3. Reinicie. Vá ao farol sem chave. Depois alcance a chave escolhida e volte ao farol.
4. Reinicie após vencer: o farol apaga, a chave retorna e você pode jogar novamente.
5. Verifique, aguarde Salvo, envie o projeto e confirme o envio.
