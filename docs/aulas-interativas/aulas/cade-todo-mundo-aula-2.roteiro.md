# Roteiro falado — Cadê Todo Mundo? — Aula 2

Um vídeo por seção. A criança pode voltar dias depois; mostrar o jardim e o que já funciona antes de apresentar o novo passo. Na prática, gravar o Estúdio incorporado e ensinar cada gesto sem presumir que ela lembra onde estão os controles. Não mandar iniciar a Pré-visualização: o jogo acompanha as mudanças automaticamente.

## 1. Volte ao seu jardim — vídeo de retomada (35–45 s)

**Na tela:** mostrar o jardim com a reação da Aula 1 pronta, vindo do projeto salvo ou da cópia de retomada. Tocar em um esconderijo. O personagem aparece; **Achados** continua em zero. Não encaixar o bloco novo nem mostrar a solução.

**Narração:**

> “Oi de novo! Lembra do jardim? Na última aula, você fez os esconderijos desaparecerem quando alguém toca neles. Assim, o personagem que estava atrás aparece. Olha só: toquei aqui e encontrei um! Mas este número, Achados, ainda está em zero. O jogo mostrou o personagem, só que não contou a descoberta. Hoje você vai fazer esse número mudar e completar a busca. Vamos?”

## 2. Um número que acompanha a busca — vídeo conceitual (45–60 s)

**Na tela:** partir do número **Achados: 0** mostrado na retomada. Usar a imagem simples de marcar numa folha cada personagem encontrado; apontar para o nome e o valor atual no jogo. Não acionar os botões da experiência, não mostrar o resultado dos testes nem abrir a paleta do Estúdio.

**Narração:**

> “Se você estivesse procurando personagens escondidos num desenho de papel, poderia fazer uma marquinha cada vez que encontrasse um. Assim não precisaria guardar a contagem só na cabeça. No nosso jogo, quem lembra é este número chamado Achados. Um número que guarda uma contagem assim se chama contador. E, na programação, a gente chama de variável um lugar que guarda um valor que pode mudar. `achados` é o nome da nossa variável. Ela mostra quantos personagens você encontrou nesta busca. Mas será que esse número muda toda vez que você procura? E o que acontece quando começa outra busca? Experimente no jardim desta seção.”

**Zappy abaixo do vídeo:** “Agora teste no jardim quando Achados muda e quando fica igual.”

**Experiência — instrução do Zappy junto da ação:** “O que acontece com Achados quando você encontra alguém, procura sem achar e começa outra busca?” A cena começa em **0** e mostra só o valor atual. O botão **Procurar aqui** sinaliza um espaço vazio; os outros espaços sem esconderijo também aceitam toque. A criança pode tocar novamente em um personagem encontrado. **Recomeçar a busca** é o único controle para zerar a busca e registrar essa descoberta. A frase abaixo da cena confirma cada toque, inclusive quando a contagem não muda. Não há palpite nem quiz. As pistas dão a ordem exata se a criança precisar. O vídeo assistido e a experiência concluída são necessários para avançar.

## 3. Cada personagem vale um achado — vídeo prático (4–5 min)

**Na tela:** Estúdio incorporado com o projeto da criança ou, se não houver projeto salvo, a cópia de retomada. Começar a gravação com a Pré-visualização no estado inicial: três esconderijos fechados e **Achados: 0**. Mostrar os blocos e o teste sem acelerar; a atualização do jogo ocorre automaticamente. Terminar esta seção em **Enviar para o professor**. Não demonstrar **Compartilhar** aqui.

**Narração:**

> “Na experiência, você viu que Achados pode mudar durante a busca. Agora vamos ensinar o seu jogo a fazer essa contagem quando alguém encontra um personagem. O esconderijo já desaparece com o toque; falta somar o achado nesse mesmo momento.
>
> Olha o Estúdio aqui na própria aula. Na área do projeto Quando acontecer, encontra o bloco grande ‘Quando clicar ou tocar num sprite do grupo esconderijos, chamá-lo de escolhido’. Dentro dele já está a ação que deixa o esconderijo tocado invisível. Por isso o personagem aparece. Vamos pôr mais uma ação nesse mesmo toque: contar o achado.
>
> Na paleta, abre Programação. Depois abre Variáveis. Pega o bloco ‘Somar ___ em variável ___’. Arrasta para dentro daquele mesmo bloco grande, logo abaixo de ‘Deixar o sprite com 0% de visibilidade’. Quando aparecer o encaixe, solta. No primeiro campo já tem 1; deixa assim, porque cada personagem encontrado vale um achado. No segundo campo, abre a lista e escolhe `achados`. É nessa variável que o jogo guarda a contagem mostrada lá em cima.
>
> Confere comigo: os dois blocos estão dentro de Quando clicar ou tocar. Primeiro o esconderijo escolhido fica invisível; embaixo, o jogo soma 1 em `achados`. Agora vamos olhar o jardim na Pré-visualização. Se o Estúdio estiver estreito, toca na aba Pré-visualização. Se os blocos e o jogo já estiverem lado a lado, olha a área do jogo à direita. Se ela estiver escondida, aperta o olhinho para mostrar. Espera um instante para o jogo acompanhar a mudança, sem apertar nada para começar.
>
> Toca num esconderijo. O personagem apareceu e Achados virou 1? Agora toca em outro e vê se chegou a 2. Falta mais um. Quando você encontrar o terceiro, Achados chega a 3 e aparece ‘Você achou todo mundo!’. Essa mensagem já estava preparada no jogo. E se você tocar no mesmo lugar de novo? A contagem não aumenta, porque o esconderijo que ficou invisível não recebe outro toque. Se o número não mudar, volta para Blocos, se precisar, e confere: o bloco de somar está abaixo do bloco de visibilidade? O primeiro campo está em 1 e o segundo em `achados`?
>
> Se esquecer algum passo, o Caderno do Aluno está na seção Seu Caderno do Aluno, lá na Aula 1. Ele também tem os passos desta aula. Agora espera aparecer Salvo e aperta Enviar para o professor. Pronto, essa é a entrega da sua atividade. Você completou a busca!”

**Zappy fora do Estúdio:** “Você já testou a contagem. Agora ensine o seu jogo a somar cada personagem encontrado.”

**Nota de gravação:** confirmar o caminho **Programação > Variáveis**, o rótulo do bloco e a opção `achados` no seletor em nível `iniciante-2d`. Mostrar a Pré-visualização no formato de aba e no formato lado a lado apenas quando citar cada um. Não apresentar **Reproduzir** ou **Atualizar** como botão necessário para começar. A mensagem de vitória já veio preparada; dizer isso com honestidade. O único PDF do caderno fica na Aula 1; não anexar nem mostrar uma segunda cópia nesta aula.

## 4. Sua busca está completa — vídeo de fechamento (80–100 s)

**Na tela:** o mesmo Estúdio da prática permanece ao lado do vídeo, com o jogo da criança. Mostrar rapidamente os três personagens encontrados, o contador em 3 e os dois blocos que ela acrescentou nas Aulas 1 e 2. Depois apontar **Compartilhar** no topo do Estúdio, a janela com o resumo pronto, **Gerar capa**, **Publicar** e **Copiar link de jogar**. O botão **Ver no Mural dos Criadores** pode aparecer no resultado, mas não mandar usá-lo: o acesso ao Mural depende do acesso recebido. Não trocar o projeto da criança por outra demonstração.

**Narração:**

> “Olha só a sua busca completa! O jardim, os personagens e a comemoração já estavam preparados. Mas foi você que ensinou o jogo a abrir um esconderijo com um toque e a contar cada personagem encontrado. Uma descoberta, duas, três! Você fez essas duas regras com blocos e viu o jogo responder.
>
> Seu jogo já foi enviado para o professor. Se você quiser que outras pessoas também joguem, pode compartilhar. O seu Estúdio continua nesta seção. Aperta Compartilhar, lá em cima, onde estou apontando. Se o Estúdio estiver pequeno, pode aparecer só o desenho do botão. Na janela, o resuminho do jogo já está escrito. Aperta Gerar capa para fazer a imagem que vai aparecer com o jogo. Quando ela aparecer, aperta Publicar.
>
> Pronto! Enviar para o professor entregou sua atividade. Publicar criou uma cópia do jogo e um link para outras pessoas jogarem. Se quiser mostrar para alguém, aperta Copiar link de jogar. Você pode pedir ajuda a um responsável para mandar o link para a família ou para um amigo. Compartilhar é uma escolha sua: se não quiser fazer isso agora, pode ir direto para a próxima aula. E, se já compartilhou, não precisa fazer de novo. Seu certificado está esperando por você!”

**Nota de gravação:** confirmar que **Compartilhar** habilita depois de **Enviar para o professor**, que **Gerar capa** funciona com este projeto e que a criança consegue acompanhar a demonstração no próprio Estúdio nesta seção, sem voltar à prática. O vídeo mostra a publicação, mas ela não é exigida para concluir. Não prometer acesso permanente ao Mural: o resgate pelo link do embaixador está sendo preparado em outra frente para dar acesso por sete dias. Não antecipar compras, cursos bloqueados ou assinatura.
