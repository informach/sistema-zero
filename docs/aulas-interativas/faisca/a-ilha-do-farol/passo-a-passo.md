# Passo a passo do projeto: A Ilha do Farol

Use o teclado para jogar: setas ou WASD. R recomeça.

## Uma ilha com profundidade

### Faça o personagem andar

1. Clique em Rodar de novo e segure uma seta: o personagem ainda fica parado.
2. Em Enquanto estiver rodando, deixe à vista o bloco A cada quadro da cena. Dentro dele já está Escrever na tela.
3. Abra Jogo 3D → Movimento → Andar com o teclado. Pegue Fazer personagem andar com as setas (ou WASD) e solte no espaço ao lado de fazer. Escrever na tela desce e fica logo abaixo.
4. Clique no 3 e troque por 4.
5. Clique em Rodar de novo e segure cada seta: o personagem anda e para quando você solta. Leve-o até a ponte e até a beirada.
6. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.

## A chave está ao seu alcance

### Coloque a chave na ilha

1. Em Ao iniciar, encontre Colocar o objeto chave em x −2 y 1 z −3.
2. Clique no −3 depois de z e troque por −2. Clique em Rodar de novo: a chave vem um pouco para a frente.
3. Clique no −2 depois de x e troque por −3. Deixe o y em 1.
4. Clique em Rodar de novo e leve o personagem até perto da chave.
5. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

### Recolha a chave

1. Clique em Rodar de novo e leve o personagem até a chave: ela continua ali.
2. Em Quando acontecer, deixe à vista o espaço logo abaixo do evento da tecla R, fora do fazer dele.
3. Abra Jogo 3D → Encostar → Encostar. Pegue Quando personagem encostar em chave e solte nesse espaço.
4. Abra Jogo 3D → Objetos → Aparência. Pegue Mostrar o objeto e solte no espaço ao lado de fazer do encontro novo.
5. Clique em Mostrar e escolha Esconder. Clique em objeto e escolha chave.
6. Clique em Rodar de novo e caminhe até a chave: ela some no encontro. Toque na tecla R e pegue de novo por outro caminho.
7. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

### Guarde que você pegou a chave

1. Em Ao iniciar, deixe à vista o bloco que cria aviso. Em Programação → Variáveis, pegue Criar variável e solte logo abaixo dele.
2. Clique em contador e escreva temChave.
3. Em Programação → Lógica e Se, pegue verdadeiro e solte em cima do 0. Clique em verdadeiro e escolha falso: a partida começa sem a chave.
4. No encontro com a chave, deixe à vista o lugar logo abaixo de Esconder o objeto chave. Em Programação → Variáveis, pegue Alterar variável para e solte ali.
5. Clique em contador e escolha temChave. Em Programação → Lógica e Se, pegue verdadeiro e solte em cima do 1. Deixe verdadeiro.
6. Confira os dois lugares e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

### Conte que a chave foi recolhida

1. Clique em Rodar de novo e pegue a chave: o aviso ainda não muda.
2. No encontro com a chave, deixe à vista o lugar logo abaixo de Alterar variável temChave. Em Programação → Variáveis, pegue Alterar variável para e solte ali.
3. Clique em contador e escolha aviso.
4. Em Programação → Valores, pegue texto e solte em cima do número. Clique em Olá, apague e escreva Você pegou a chave! Agora vá ao farol.
5. Clique em Rodar de novo e pegue a chave: o aviso novo aparece. Toque na tecla R: a chave e o aviso do começo voltam.
6. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.

## A luz volta ao farol

### O farol precisa conferir a chave

1. Clique em Rodar de novo e vá ao farol sem pegar a chave: nada acontece.
2. Em Quando acontecer, deixe à vista o espaço logo abaixo do encontro com a chave, fora do fazer dele.
3. Abra Jogo 3D → Encostar → Encostar. Pegue Quando personagem encostar em chave e solte nesse espaço. Clique em chave e escolha farol.
4. Em Programação → Lógica e Se, pegue Se e solte no espaço ao lado de fazer do encontro novo.
5. Arraste a pergunta x maior que 0 até a lixeira. Em Programação → Valores, pegue valor da variável e solte no lugar vazio ao lado de Se. Clique no x e escolha temChave.
6. Na linha de baixo do Se, clique no segundo sinal de mais, o de antes da palavra senão.
7. Em Programação → Variáveis, pegue Alterar variável para e solte dentro do senão. Clique em contador e escolha aviso.
8. Em Programação → Valores, pegue texto e solte em cima do número. Escreva Falta a chave. Procure na ilha antes de voltar. Deixe o então vazio.
9. Clique em Rodar de novo e vá direto ao farol: ele continua apagado e o aviso pede a chave.
10. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

### Acenda o farol com a chave

1. Clique em Rodar de novo, pegue a chave e vá ao farol: a luz ainda não acende.
2. No Se do encontro com o farol, deixe à vista o espaço do então.
3. Abra Jogo 3D → Objetos → Animação do modelo. Pegue Tocar a animação e solte dentro do então.
4. Clique em heroi e escolha farol. Clique em Andar e escolha acender. Clique em repetindo e escolha uma vez.
5. Logo abaixo, solte Alterar variável para, de Programação → Variáveis. Clique em contador e escolha ganhou. Em cima do número, solte verdadeiro, de Programação → Lógica e Se.
6. Logo abaixo de ganhou, solte outro Alterar variável para e escolha aviso. Em cima do número, solte texto, de Programação → Valores, e escreva Você acendeu o farol! O barco pode chegar.
7. Clique em Rodar de novo. Vá ao farol sem a chave: ele continua apagado. Depois busque a chave e volte: a luz acende, o feixe gira e o barco chega.
8. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

### O farol acende uma vez só

1. Clique em Rodar de novo, pegue a chave e acenda o farol. Ande para trás pelo cais e volte: a luz apaga e acende de novo.
2. Em Quando acontecer, deixe à vista o encontro com o farol.
3. Em Programação → Lógica e Se, pegue Se e solte no espaço ao lado de fazer do encontro com o farol. O Se temChave desce e fica logo abaixo do Se novo.
4. Arraste a pergunta x maior que 0 do Se novo até a lixeira. Em Programação → Lógica e Se, pegue não e solte no lugar vazio ao lado do Se novo. O não também chega com a pergunta x maior que 0: arraste essa pergunta até a lixeira.
5. Em Programação → Valores, pegue valor da variável e solte no espaço do não. Clique no x e escolha ganhou.
6. Segure o Se temChave pela palavra Se e arraste até o espaço do então do Se novo. Tudo o que está dentro dele vai junto.
7. Clique em Rodar de novo. Pegue a chave, acenda o farol, ande para trás e volte: a luz continua acesa. Toque na tecla R e vá ao farol sem a chave: ele continua pedindo a chave.
8. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

### Deixe o jogo com a sua cara

1. Em Ao iniciar, deixe à vista Criar o objeto personagem com o modelo aventureiro. Clique em aventureiro e escolha outro personagem.
2. Faça o mesmo em Criar o objeto barco, chave e farol: clique no nome do modelo e escolha outro.
3. Em Criar o objeto cenario, troque praia-tropical por costa-rochosa, ilha-nevada ou noite-na-ilha.
4. Troque só o modelo. Deixe o nome do objeto, a cena e o tamanho como estão.
5. Clique em Rodar de novo, pegue a chave e vá ao farol. Confira a luz e o barco.
6. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

### Escolha seu esconderijo e teste de verdade

1. Em Ao iniciar, no bloco Colocar o objeto chave, mude o x e o z para um lugar no chão da ilha. Exemplo: x −8 e z 3, perto da praia. Deixe o y em 1.
2. Clique em Rodar de novo e vá até a chave: o personagem precisa alcançar e pegar.
3. Se não conseguir, mude um número de cada vez e teste de novo.
4. Se quiser, escreva os seus avisos nos blocos que mudam aviso, sem mudar o papel de cada um: começo, chave pega, falta a chave e vitória.
5. Toque na tecla R e vá ao farol sem a chave: ele pede a chave. Depois pegue a chave e volte: o farol acende.
6. Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.
