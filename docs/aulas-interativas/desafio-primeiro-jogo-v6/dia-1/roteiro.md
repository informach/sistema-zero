# dia-1 — A nave ganha vida

**Entrada:** Começar um projeto vazio com a extensão Jogo 2D já preparada pelo professor.

**Resultado:** Tela 800 × 480, nave visível e controlada pelas setas, sem sair das bordas.

**Tempo de percurso estimado:** 20–30 minutos. Estimativa editorial incluindo montagem; validar com crianças. Não é duração medida dos vídeos.

A demonstração é observação: o vídeo, com pausa e repetição, e às vezes uma cena que toca sozinha. A experimentação fica separada do projeto: uma cena em que a criança mexe e descobre ou, nos Dias 4 e 5, uma comparação curta em HTML. A construção usa o mesmo Estúdio da aula, sem reiniciar a cada seção.

## Percurso

| Seção | O que aparece | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | Assistir | Começar um projeto vazio com a extensão Jogo 2D já preparada pelo professor. |
| 2. Monte os dois lugares do jogo | Fazer no Estúdio | Separar a preparação da repetição. |
| 3. Prepare o espaço da nave | Fazer no Estúdio | Preparar largura e altura do jogo uma vez. |
| 4. Observe o endereço na tela | Observar | Reconhecer x horizontal, y vertical e a origem no alto à esquerda. |
| 5. Compare duas alturas | Experimentar | Descobrir o efeito de aumentar somente y. |
| 6. Crie sua nave | Fazer no Estúdio | Criar o sprite uma vez com posição e tamanho definidos. |
| 7. Criar não é desenhar | Experimentar | Distinguir o objeto preparado do desenho repetido. |
| 8. Ligue o motor de quadros | Fazer no Estúdio | Encaixar o motor na área de repetição. |
| 9. O que acontece sem limpar a tela? | Experimentar | Relacionar a limpeza com a remoção dos desenhos anteriores. |
| 10. Desenhe o espaço | Fazer no Estúdio | Limpar antes de pintar o fundo em cada quadro. |
| 11. Dê as setas e uma borda à nave | Fazer no Estúdio | Mover horizontalmente sem sair da tela. |
| 12. Faça a nave aparecer por último | Fazer no Estúdio | Desenhar a nave depois do fundo e de atualizar a posição. |
| 13. Observe como conferir uma mudança | Observar | Aprender a confirmar uma edição e testar com o foco no jogo. |
| 14. Teste e envie sua construção | Entregar | Tela 800 × 480, nave visível e controlada pelas setas, sem sair das bordas. |
| 15. Veja o que você construiu | Fechar | Tela 800 × 480, nave visível e controlada pelas setas, sem sair das bordas. |
| 16. Hora do Desafio | Fechar | Reconhecer duas relações importantes desta aula. |

## Abertura

“Oi! Hoje sua nave vai aparecer num espaço cheio de estrelas e obedecer às setas. Vamos preparar o jogo, descobrir onde a nave fica e montar um pedacinho de cada vez.”

## Monte os dois lugares do jogo

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Separar a preparação da repetição.

**Fala revisada / orientação:** “Em Áreas do projeto, coloque Ao iniciar e Enquanto estiver rodando. Deixe um espaço entre eles. O primeiro prepara as coisas; o segundo vai guardar o motor que trabalha enquanto o jogo está ligado.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 1. Passo 1: montar as áreas do projeto.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Todo jogo precisa de um lugar pra guardar os passos dele. Aqui no estúdio, esse lugar são as áreas do projeto, que são uns espaços grandes que seguram os blocos dentro deles. Hoje a gente vai usar duas. A primeira se chama Ao iniciar. Tudo o que a gente colocar dentro dela acontece uma vez só, bem no comecinho, quando o jogo liga. É a hora de preparar as coisas. É como quando você vai desenhar: primeiro você pega o papel e os lápis. Isso você faz uma vez, e depois é só criar. Vamos montar. Na categoria Áreas do projeto, pega o bloco Ao iniciar. Clica nele, segura, arrasta para essa área grande no meio e solta. Prontinho, essa é a área da arrumação do jogo. A segunda se chama Enquanto estiver rodando. Essa é diferente: tudo o que estiver dentro dela fica se repetindo sem parar, o tempo todo, enquanto o jogo estiver ligado. Pensa num ventilador: enquanto está ligado, ele gira, gira, gira, sem parar. Se desliga, para. Essa área é o motor do jogo: fica trabalhando sem parar enquanto o jogo está ligado. Vai de novo na categoria Áreas do projeto, pega o bloco Enquanto estiver rodando, arrasta e solta ao lado do Ao iniciar, com um espacinho entre eles. Primeiro passo pronto. As duas áreas estão no lugar: uma arruma o jogo, a outra é o motor. Agora vamos pro segundo passo, que é preparar a tela do jogo.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Coloque Ao iniciar.
- Coloque Enquanto estiver rodando.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Prepare o espaço da nave

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Preparar largura e altura do jogo uma vez.

**Fala revisada / orientação:** “Em Jogo 2D, Jogo e telas, encaixe Preparar o jogo em tela cheia dentro de Ao iniciar. Deixe largura 800 e altura 480. Escolha um fundo escuro para enxergar a nave e as estrelas.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 2. Passo 2: preparar a tela do jogo.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** Agora vamos preparar a tela onde o jogo acontece. A maioria dos blocos que a gente usa fica numa categoria chamada Jogo 2D, que são os cor de rosa. De vez em quando a gente pega um bloco de outra categoria, e nessas horas eu te aviso. Na categoria Jogo 2D, subcategoria Aparência, pega o bloco Preparar o jogo em tela cheia. Arrasta ele para dentro da área Ao iniciar e encaixa bem no topo, até dar aquele clique de peça entrando no lugar. Esse bloco monta a área do jogo pra você. Ele tem dois números: o primeiro é a largura da tela e o segundo é a altura. Eles já vêm preenchidos com 800 e 480, que é um tamanho ótimo pra jogo, então deixa assim mesmo. E tá vendo o quadradinho de cor no fim do bloco? Clicando nele você escolhe a cor de fundo do seu jogo. Pode deixar bem escuro, com cara de espaço de verdade, ou escolher a cor que você mais gostar. Esse jogo é seu, então essa escolha é sua. Passo 2 feito. Agora vem o terceiro, e esse é especial: a gente vai criar a sua nave.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Prepare a tela de 800 × 480 em Ao iniciar.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Observe o endereço na tela

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Reconhecer x horizontal, y vertical e a origem no alto à esquerda.

**Fala revisada / orientação:** “O x cresce para a direita. O y cresce para baixo. A marca mostra o canto de cima à esquerda da caixa da nave. Com x 400, esse canto fica no meio da tela; o centro da nave fica um pouquinho à direita.”

**Imagem:** Tela 800 × 480 com caixa 54 × 62: x de 200 para 400 com y fixo; depois y de 110 para 410 com x fixo. Marcar o canto em (400,410) e o centro x em 427, sem transformar essa conta em tarefa.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 3. Passo 3: criar a sua nave.

**Montagem:** Reaproveitar a analogia de endereço e a explicação de largura/altura. Substituir a afirmação de que x 400 centraliza exatamente a nave. Acrescentar origem e sentido dos eixos.

**Trecho original antes da edição:** Esse bloco tem uns números, e não precisa ter medo deles, eu te explico um por um. Tem um chamado x e um chamado y. O x diz se a nave fica mais para a esquerda ou mais para a direita. O y diz se ela fica mais para cima ou mais para baixo. Então x e y são só o endereço da nave na tela, é como dizer onde ela mora. Vamos colocar a nave embaixo, no meio. Como a nossa tela tem 800 de largura, a metade é 400. Então escreve 400 no x. E como a altura da tela é 480 e a gente quer a nave lá embaixo, escreve 410 no y, que é quase no fundo, com uma folguinha para aparecer o foguinho dela. Depois tem a largura e a altura, que é o tamanho da nave. Pode deixar 54 na largura e 62 na altura, que é um tamanho bom para desviar de asteroide.

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** Veja qual direção muda enquanto o outro número fica parado.

## Compare duas alturas

**Por que aqui:** Depois de ver os dois eixos, variar apenas um reduz a carga e revela a direção do y.

**Foco:** Descobrir o efeito de aumentar somente y.

**Cena:** `coordinates`, “O endereço na tela”. Formato: experimentação (a criança mexe e descobre). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: nave.

**O que a criança lê ao abrir:** “A nave começa lá em cima. Mude só o y e veja para que lado ela vai.”

**Como o palco começa:** A nave está em x 400, y 40.

**Caso preparado na aula:** a cena não parte do começo de fábrica: 2 ações preparam o palco antes de a criança entrar, e a frase acima já mostra o resultado; a missão cobra só esta descoberta: “y maior leva para baixo”.

**Previsão, antes de mexer (escrita na aula; não vale nota):** “Se o y AUMENTAR, para onde a nave vai?”

- Para cima (se ela escolher esta, a tela conta depois: “Aumentando o y, a nave desceu.”)
- Para baixo ✓ (o que acontece de verdade)

O palpite volta à tela quando ela descobre: “y maior leva para baixo”.

**O que ela precisa descobrir** (a faixa e o botão Conferir mostram o pedido; o rótulo só aparece quando a descoberta acontece):

1. Pedido: “Aumente só o y.” Ao descobrir: “y maior leva para baixo”.

**Frase de sucesso:** “y maior leva a nave para baixo. O 0 do y fica lá no alto!”

**Pistas (uma por vez, no botão Uma pista; escritas na aula):**

1. “Olhe o número do y e onde a nave está.”
2. “Deixe o x parado e aumente só o y. Olhe para onde a nave vai.”
3. “Aperte + no y três vezes, sem tocar no x.”

**Pergunta depois de descobrir (escrita na aula; conta para concluir):** “Você quer a nave mais perto da beirada de baixo da tela. O que faz com o y?”

- Diminuo o y.
- Aumento o y. ✓ (correta)

**Explicação que ela lê ao acertar:** “Na tela, o y começa em 0 lá no alto. Quanto maior o y, mais embaixo a nave fica.”

**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e a pergunta. Na revisita, a faixa mostra “✓ Você já descobriu isto.”, sem pedir a pergunta de novo.

## Crie sua nave

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Criar o sprite uma vez com posição e tamanho definidos.

**Fala revisada / orientação:** “Em Jogo 2D, Kits prontos › Espaço, encaixe Criar nave abaixo de Preparar o jogo, em Ao iniciar. Use nome nave, x 400, y 410, largura 54 e altura 62. Você escolhe as cores do corpo e das asas. Ela ainda não aparece: falta desenhar.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 3. Passo 3: criar a sua nave.

**Montagem:** Reaproveitar o gesto de criar e configurar. Encurtar os eixos, já vistos na comparação. Manter a surpresa de ainda não aparecer, sem dizer que houve erro.

**Trecho original antes da edição:** Chegou a hora da estrela do jogo: a sua nave! Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco Criar nave. Arrasta ele para dentro do Ao iniciar e encaixa logo abaixo do Preparar o jogo. Esse bloco tem uns números, e não precisa ter medo deles, eu te explico um por um. Tem um chamado x e um chamado y. O x diz se a nave fica mais para a esquerda ou mais para a direita. O y diz se ela fica mais para cima ou mais para baixo. Então x e y são só o endereço da nave na tela, é como dizer onde ela mora. Vamos colocar a nave embaixo, no meio. Como a nossa tela tem 800 de largura, a metade é 400. Então escreve 400 no x. E como a altura da tela é 480 e a gente quer a nave lá embaixo, escreve 410 no y, que é quase no fundo, com uma folguinha para aparecer o foguinho dela. Depois tem a largura e a altura, que é o tamanho da nave. Pode deixar 54 na largura e 62 na altura, que é um tamanho bom para desviar de asteroide. E agora a parte boa: esse bloco deixa você escolher a cor do corpo e a cor das asas. Clica nos quadradinhos de cor e pinta a sua nave do jeito que você quiser. Capricha, porque ela vai ser só sua. Ué, mas cadê a nave? Calma, a gente criou ela, só que ainda não desenhou ela na tela. É isso que a gente vai resolver no próximo passo. Passo 3 feito. Bora pro quarto passo, que é fazer o jogo rodar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Crie nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Criar não é desenhar

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Distinguir o objeto preparado do desenho repetido.

**Fala revisada / orientação:** “Olha: o jogo já guarda uma nave. Quando mando desenhar, ela aparece. No próximo quadro, limpo a imagem antiga e desenho essa mesma nave outra vez. É como virar as páginas de um livrinho: as imagens mudam, e a gente vê movimento.”

**Imagem:** Quadro dividido: cartão “nave criada: 1” permanece; tela muda de vazia para nave desenhada. Em seguida três quadros numerados, com uma só nave na memória.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 4. Passo 4: ligar o motor do jogo.

**Montagem:** Aproveitar a analogia do livrinho. Acrescentar a nave na memória e o desenho na tela em dois quadros. Não pedir montagem durante o clipe.

**Trecho original antes da edição:** Agora vem a parte mais importante do dia, um segredo que está dentro de todos os jogos do mundo. Você já viu aqueles livrinhos que, quando a gente passa as páginas bem rápido, parece que o bonequinho se mexe? Cada página é um desenho um pouquinho diferente, e passando rápido o seu olho enxerga movimento. Um jogo funciona igualzinho. Cada página dessas tem um nome: quadro. O jogo desenha um quadro, depois outro, depois outro, muito rápido, e é isso que faz tudo parecer que se mexe.

**Conclusão:** o clipe tem pausa e repetição. Depois dele, na mesma seção, vem a cena abaixo, e é ela que conclui a seção.


**Ajuda no mesmo objetivo:** O número de naves criadas permanece 1, mesmo quando aparecem vários quadros.

### A cena depois do clipe

**Cena:** `world`, “Faça a nave aparecer”. Formato: experimentação (a criança mexe e descobre). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: nave.

**O que a criança lê ao abrir:** “Ligue e desligue o desenho e crie a nave, na ordem que quiser. Olhe os dois lados a cada toque.”

**Como o palco começa:** Os bastidores estão vazios, com o desenho desligado.

**Previsão, antes de mexer (a de fábrica da cena; não vale nota):** “Imagine: você cria a nave com o desenho desligado. Onde fica a nave?”

- Nos bastidores, sem aparecer na tela. ✓ (o que acontece de verdade)
- Em lugar nenhum. Sem desenho, a nave não existe. (se ela escolher esta, a tela conta depois: “A ficha da nave ficou nos bastidores, com a tela vazia.”)

O palpite volta à tela quando ela descobre: “A nave existe sem aparecer”.

**O que ela precisa descobrir** (a faixa e o botão Conferir mostram o pedido; o rótulo só aparece quando a descoberta acontece):

1. Pedido: “Deixe a nave criada com o desenho desligado.” Ao descobrir: “A nave existe sem aparecer”.
2. Pedido: “Com a nave criada, ligue o desenho.” Ao descobrir: “A mesma nave aparece na tela”.

**Frase de sucesso:** “É a mesma nave dos dois lados: criar guarda, desenhar mostra!”

**Pistas (uma por vez, no botão Uma pista; as de fábrica da cena):**

1. “Olhe a ficha dos bastidores e a tela do jogo.”
2. “Toque em Criar nave e olhe os dois lados.”
3. “Ligue e desligue o desenho e compare os dois lados.”

**Pergunta depois de descobrir (a de fábrica da cena; conta para concluir):** “Por que a tela ficou sem a nave, mesmo com a nave criada?”

- Faltava ligar o desenho. ✓ (correta)
- O jogo ainda estava carregando a nave.

**Explicação que ela lê ao acertar:** “Criar guarda a nave nos bastidores. Desenhar mostra a nave na tela. São dois blocos porque são duas coisas.”

**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e a pergunta. Na revisita, a faixa mostra “✓ Você já descobriu isto.”, sem pedir a pergunta de novo.

## Ligue o motor de quadros

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Encaixar o motor na área de repetição.

**Fala revisada / orientação:** “Em Jogo 2D, Tempo › Quadros e intervalos, pegue A cada quadro do jogo e encaixe em Enquanto estiver rodando. O espaço de dentro recebe o que o jogo faz de novo a cada quadro.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 4. Passo 4: ligar o motor do jogo.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** E tem um bloco que faz exatamente isso. Na categoria Jogo 2D, subcategoria Tempo e repetição, pega o bloco A cada quadro do jogo. Arrasta ele para dentro da área Enquanto estiver rodando e encaixa. Faz sentido ele morar aí, né? O motor do jogo é a área que repete sem parar, e desenhar quadro atrás de quadro é justamente uma coisa que repete sem parar. Repara que esse bloco tem um espaço aberto dentro. Tudo o que a gente colocar nesse espaço vai acontecer de novo e de novo, a cada quadro. Passo 4 feito, o motor está ligado. Só que ele ainda está vazio. Agora o quinto passo, que é encher o motor: desenhar o mundo e dar vida pra nave.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Coloque A cada quadro do jogo em Enquanto estiver rodando.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## O que acontece sem limpar a tela?

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Relacionar a limpeza com a remoção dos desenhos anteriores.

**Cena:** `draw-loop`, “Por que o desenho se repete”. Formato: experimentação (a criança mexe e descobre). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: nave.

**O que a criança lê ao abrir:** “Aperte Avançar 1 quadro e olhe a tela e o x da nave. Depois desenhe a nave a cada quadro. Por último, ligue Limpar a tela antes.”

**Como o palco começa:** Quadro 0: 1 nave na tela.

**Previsão, antes de mexer (escrita na aula; não vale nota):** “Sem limpar antes de desenhar, o que fica na tela?”

- Um rastro de naves ✓ (o que acontece de verdade)
- Uma nave só (se ela escolher esta, a tela conta depois: “Sem limpar, as naves de antes continuaram na tela.”)

O palpite volta à tela quando ela descobre: “Sem limpar, os desenhos velhos ficam”.

**O que ela precisa descobrir** (a faixa e o botão Conferir mostram o pedido; o rótulo só aparece quando a descoberta acontece):

1. Pedido: “Com a nave na tela, desenhe só no começo, sem limpar a tela, e aperte Avançar 1 quadro.” Ao descobrir: “Sem desenhar de novo, a tela não muda”.
2. Pedido: “Desenhe a nave a cada quadro, sem limpar a tela, e deixe o tempo passar.” Ao descobrir: “Sem limpar, os desenhos velhos ficam”.
3. Pedido: “Desenhe a nave a cada quadro, ligue Limpar a tela antes e deixe o tempo passar.” Ao descobrir: “Limpando e desenhando, a nave anda”.

**Frase de sucesso:** “A cada quadro o jogo limpa a tela e desenha de novo. É assim que a nave anda!”

**Pistas (uma por vez, no botão Uma pista; as de fábrica da cena):**

1. “Aperte Avançar 1 quadro e compare a tela com o x da nave na faixa.”
2. “Escolha desenhar a cada quadro e avance dois quadros.”
3. “Ligue Limpar a tela antes e avance de novo.”

**Pergunta depois de descobrir (escrita na aula; conta para concluir):** “Quais escolhas deixam uma nave só na tela, num lugar novo?”

- Desenhar a cada quadro e limpar antes. ✓ (correta)
- Desenhar a cada quadro, sem limpar.

**Explicação que ela lê ao acertar:** “A limpeza apaga a imagem anterior. Ela não apaga a nave, que continua guardada no jogo.”

**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e a pergunta. Na revisita, a faixa mostra “✓ Você já descobriu isto.”, sem pedir a pergunta de novo.

## Desenhe o espaço

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Limpar antes de pintar o fundo em cada quadro.

**Fala revisada / orientação:** “Dentro de A cada quadro do jogo, encaixe Limpar a tela, em Jogo 2D, Desenho e efeitos. Abaixo, encaixe Desenhar fundo de estrelas, em Cenários › Fundos, com velocidade 1. A borracha vem antes do novo desenho.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 5. Passo 5: desenhar o mundo e dar vida à nave.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** O primeiro apaga a tela antes de desenhar de novo. Sabe aquelas lousas mágicas? Toda vez que a gente quer um desenho novo, primeiro apaga o antigo, senão fica tudo embolado, um desenho por cima do outro. Na categoria Jogo 2D, subcategoria Aparência, pega o bloco Limpar a tela. Arrasta para dentro do A cada quadro do jogo e encaixa bem no topo. Essa é a nossa borracha. O segundo põe as estrelinhas no céu. Na categoria Jogo 2D, subcategoria Kit espaço, pega o bloco Desenhar fundo de estrelas. Encaixa ele logo abaixo do Limpar a tela. Tá vendo o número dele? É a velocidade das estrelas: elas andam devagarzinho pra dar a sensação de que a nave está viajando pelo espaço. Vamos deixar 1 mesmo, bem suave.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Limpe antes de desenhar o fundo de estrelas.
- Desenhe as estrelas com velocidade 1 a cada quadro.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Dê as setas e uma borda à nave

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Mover horizontalmente sem sair da tela.

**Fala revisada / orientação:** “Em Jogo 2D, Movimento, coloque Mover o sprite nave com as setas, velocidade 7, abaixo das estrelas. Depois coloque Manter o sprite dentro da tela e escolha nave. Se aparecer um alerta de nome, leia e troque para o sprite que você criou.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 5. Passo 5: desenhar o mundo e dar vida à nave.

**Montagem:** Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.

**Trecho original antes da edição:** O terceiro é o que dá vida pra sua nave. Na categoria Jogo 2D, subcategoria Movimento, pega o bloco Mover o sprite nave com as setas. Encaixa embaixo do Desenhar fundo de estrelas. E aqui aparece uma palavra nova: sprite. Sprite é só o nome chique de um objeto do jogo. A sua nave é um sprite. Esse bloco faz ela andar para os lados quando você aperta a seta da esquerda e a da direita no teclado. O número dele é a velocidade. Deixa 7 por enquanto, daqui a pouco você vai poder brincar com ele. O quarto é uma cerquinha. Sem ele, se você segurasse a seta, a nave ia embora pra fora da tela e sumia. Na categoria Jogo 2D, subcategoria Movimento, pega o bloco Manter o sprite dentro da tela e encaixa logo abaixo do Mover. Opa, olha o bloco! Apareceu um iconezinho de alerta nele. Isso é o estúdio avisando que tem alguma coisinha pra ajeitar. Clica nesse iconezinho e olha: aparece uma mensagem em português explicando o problema. Ele está dizendo que não existe nenhum sprite chamado heroi no nosso jogo. E é verdade: o nosso sprite se chama nave. O bloco veio escrito heroi de fábrica, então clica no heroi e troca para nave. Pronto, o alerta some. Viu que legal? Esse aviso não é bronca, é um ajudante: ele te mostra certinho o que arrumar.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Mova nave com as setas, velocidade 7, antes de prender à tela.
- Mantenha nave dentro da tela, no motor.

**Ajuda no mesmo objetivo:** Os dois blocos devem apontar para nave. Não crie um sprite chamado heroi só para o alerta sumir.

## Faça a nave aparecer por último

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Desenhar a nave depois do fundo e de atualizar a posição.

**Fala revisada / orientação:** “Em Jogo 2D, Sprites, coloque Desenhar o sprite por último e escolha nave. Confira: limpar, estrelas, mover, manter dentro da tela, desenhar nave. Agora clique no jogo e use as setas para os dois lados.”

**Imagem:** Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 5. Passo 5: desenhar o mundo e dar vida à nave.

**Montagem:** Manter o gesto e a ordem. Substituir “as estrelas iam tampar ela” por “o que é desenhado depois pode cobrir o que veio antes”; não afirmar cobertura total por pontos de estrelas.

**Trecho original antes da edição:** E o quinto é o que finalmente mostra a nave. Na categoria Jogo 2D, subcategoria Sprites, pega o bloco Desenhar o sprite e encaixa por último, embaixo de tudo. Esse vem escrito jogador, e o iconezinho de alerta aparece de novo no bloco. Você já sabe resolver: clica no jogador e troca para nave. E sabe por que ele vem por último? Olha a ordem do nosso desenho: primeiro a gente limpa a tela, depois desenha as estrelas do fundo, depois move a nave e segura ela dentro da tela, e só no fim desenha a nave por cima de tudo, pra ela ficar na frente, bem na nossa vista. Se a gente desenhasse a nave antes das estrelas, as estrelas iam ficar por cima e tampar ela. Por isso a ordem importa tanto. Passo 5 feito, o motor está cheio e trabalhando. E agora o melhor de todos, o sexto passo, que é testar e deixar tudo do seu jeito.

**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.

- Desenhe nave depois de manter dentro da tela.
- Desenhe o sprite nave a cada quadro.
- As estrelas vêm antes do movimento da nave.

**Ajuda no mesmo objetivo:** Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.

## Observe como conferir uma mudança

**Por que aqui:** Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.

**Foco:** Aprender a confirmar uma edição e testar com o foco no jogo.

**Fala revisada / orientação:** “Depois de digitar um valor, confirme saindo do campo. Para testar as setas, clique na área do jogo. Nesta aula, deixe a velocidade em 7. Verifique se a nave vai para os dois lados e para na borda.”

**Imagem:** Campo confirmado; clique no jogo; setas esquerda e direita; nave contida nas duas bordas.

**Fonte:** roteiro-aula-dia1-desafio-primeiro-jogo.md → Parte 6. Passo 6: testar e deixar do seu jeito.

**Montagem:** Selecionar o primeiro teste; mostrar confirmar campo e focar jogo em gravação atual. Retirar convite a 12 e exploração livre. Não provocar um suposto bug de confirmação sem reproduzi-lo na interface atual.

**Trecho original antes da edição:** Agora olha pra tela do seu jogo! As estrelas estão se mexendo, e a sua nave apareceu, com as cores que você escolheu. Clica na área do jogo e aperta a seta para a esquerda e a seta para a direita. Tá vendo? Ela obedece você!

**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.


**Ajuda no mesmo objetivo:** Se a seta rolar a página, clique primeiro na área do jogo.

## Teste final e acompanhamento

Clique no jogo e teste esquerda e direita até as duas bordas. Confira que a nave aparece por cima do espaço e não deixa rastros. Deixe velocidade 7 e estrelas 1. Espere salvar e envie ao professor. As cores são suas; não há outra tarefa depois desta.

- Prepare a tela de 800 × 480 em Ao iniciar.
- Crie nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar.
- Limpe antes de desenhar o fundo de estrelas.
- Desenhe as estrelas com velocidade 1 a cada quadro.
- Mova nave com as setas, velocidade 7, antes de prender à tela.
- Mantenha nave dentro da tela, no motor.
- Desenhe nave depois de manter dentro da tela.
- Desenhe o sprite nave a cada quadro.
- As estrelas vêm antes do movimento da nave.

Os critérios verificam estrutura, valores e relações indicados; o professor confere o jogo rodando, legibilidade, som e resultado. Não prometer avaliação automática de toda a jogabilidade.

## Fecho e quiz

“Sua nave apareceu e já responde a você. Criar preparou o objeto; o motor passou a desenhar e mover. No Dia 2, ela vai aprender a atirar. Agora vamos guardar duas ideias de hoje.”

**A nave foi criada, mas não aparece. Qual ação está faltando?**

- Desenhar o sprite nave no motor de quadros. (correta)
- Criar várias naves iguais.

O objeto pode estar preparado sem ter sido desenhado.

**Onde preparar a tela e criar a nave?**

- Em Ao iniciar. (correta)
- Dentro de cada quadro, repetindo a criação.

A preparação ocorre uma vez; o motor atualiza e desenha depois.

## Decisões para edição e professor

- Preservar x 400 e y 410 para reaproveitar a gravação, explicando que são o canto da caixa. O centro horizontal seria 427 com largura 54.
- A maior fragmentação acontece aqui porque a criança está conhecendo o Estúdio; nos dias seguintes, padrões conhecidos ficam juntos.
- A escolha de cores permanece focada na nave e no fundo. Não solicitar testes de velocidade livre nem números extras para concluir.
- Demonstrações usam vídeo com pausa. As três experimentações do dia são cenas separadas do projeto (coordinates, world e draw-loop), vestidas com a nave; nenhuma copia valores para o projeto.

## Destino de todo o roteiro original

- **Especificações:** Referência de formato e ritmo; a duração interativa é estimada separadamente. 
- **Abertura:** Recortar com as substituições e imagens indicadas. Clipes: video-abertura-v6.
- **Parte 1. Passo 1: montar as áreas do projeto:** Recortar com as substituições e imagens indicadas. Clipes: video-areas.
- **Parte 2. Passo 2: preparar a tela do jogo:** Recortar com as substituições e imagens indicadas. Clipes: video-tela.
- **Parte 3. Passo 3: criar a sua nave:** Recortar com as substituições e imagens indicadas. Clipes: video-endereco, video-nave.
- **Parte 4. Passo 4: ligar o motor do jogo:** Recortar com as substituições e imagens indicadas. Clipes: video-criar-desenhar, video-quadro.
- **Parte 5. Passo 5: desenhar o mundo e dar vida à nave:** Recortar com as substituições e imagens indicadas. Clipes: video-fundo, video-mover, video-desenhar.
- **Parte 6. Passo 6: testar e deixar do seu jeito:** Recortar com as substituições e imagens indicadas. Clipes: video-teste.
- **Fecho:** Recortar com as substituições e imagens indicadas. Clipes: video-fecho-v6.

Fonte preservada, SHA-256: 047763b7d5154ab4081c2127d7330c3af9e19495d79832c9028f5453e75ce6e6. [Mapa de montagem](montagem.json) com âncoras textuais, falas novas e imagens. Os tempos ficam nulos até conferir a gravação. Cortes substituem falas; não concatenar toda a narração original com todos os complementos.

## Blocos e gravação no Estúdio atual

Edição: jogo-2d-1.0-documento-2.

Use os endereços abaixo ao gravar os gestos e a narração. As falas e âncoras identificadas como originais documentam a gravação anterior. Capture a paleta atual e substitua as indicações de localização antigas antes de publicar a aula.

No seletor Tocar efeito, escolha pulo, tiro, explosão ou derrota conforme a ação. O som fica no evento ou na colisão que o dispara. Preparar o jogo continua em Ao iniciar; seus eventos e relógios ficam nas áreas indicadas no passo a passo.

Confira com o perfil de aluno: abrir a aula, encontrar cada peça, montar, testar, conferir os critérios, guardar, reabrir e continuar na aula seguinte. Nas aulas de publicação, teste também Fazer minha versão e a edição da cópia.

| Bloco | Onde encontrar | O que faz |
| --- | --- | --- |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto | Repete enquanto o projeto estiver rodando. |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto | Roda ao abrir ou a cada nova partida. |
| Mover o sprite com as setas <- -> (velocidade ) | Jogo 2D › Movimento › Movimentos prontos | Move o sprite só na horizontal com as setas esquerda/direita. Combine com "prender o sprite na tela". |
| Manter o sprite dentro da tela | Jogo 2D › Movimento › Bordas e rebatidas | Impede o sprite de sair pelas bordas da tela (gruda na borda em vez de sumir). |
| Limpar a tela | Jogo 2D › Desenho e efeitos › Efeitos | Apaga tudo o que foi desenhado. Use no começo de cada quadro, antes de desenhar de novo. |
| Criar nave em x y largura altura , cor do corpo cor das asas | Jogo 2D › Kits prontos › Espaço | Cria uma nave desenhada (corpo + asas com as cores que você escolher, cabine e foguinho que pulsa sozinho). O foguinho já vem animado. |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu de estrelas que rola para baixo (fundo de jogo espacial). Use no começo do "a cada quadro", depois de limpar a tela. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Número | Programação › 🔣 Valores | Um valor numérico. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
