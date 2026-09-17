# aula-08 — Uma tela de início que responde ao jogador

Revisão baseada no roteiro original gravado. Demonstração é observação: o clipe e, quando a seção tem, a cena que toca sozinha. Experimentação é uma cena separada do projeto, em que a criança mexe e descobre. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** O jogo já espera. Vamos mostrar o menu e permitir começar pelo teclado ou pelo toque.

**Saída esperada:** Menu em inicio, início por qualquer tecla ou toque e dica que corresponde aos controles.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | O jogo já espera. Vamos mostrar o menu e permitir começar pelo teclado ou pelo toque. |
| 2. Veja como escolher uma tela por vez | demonstration | Entender o ramo senão se e o texto como peça de valor. |
| 3. Monte sua tela de início | application | Mostrar instrução de início no estado correto. |
| 4. Faça o Enter começar a partida | application | Responder à entrada somente na cena de início. |
| 5. O menu funciona com toque? | exploration | Comparar acesso pelo teclado e pelo toque. |
| 6. Atenda aos dois jeitos de começar | application | Ampliar a entrada e atualizar a promessa escrita. |
| 7. Teste e entregue sua construção | delivery | Menu em inicio, início por qualquer tecla ou toque e dica que corresponde aos controles. |
| 8. Veja o que você aprendeu | closing | Menu em inicio, início por qualquer tecla ou toque e dica que corresponde aos controles. |
| 9. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Veja como escolher uma tela por vez

**Por que aqui:** São dois detalhes visuais necessários para montar o menu sem confundir campo e encaixe.

**Foco:** Entender o ramo senão se e o texto como peça de valor.

**Fala de ligação / orientação ao aluno:** “Quando não está jogando, o próximo ramo pergunta se está no início. Dentro dele, os textos são peças conectadas ao Mostrar tela.”

**Fonte:** roteiro-aula-08-corre-dino.md → Parte 1. Passo 1: desenhar a tela de início.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Usar a explicação do senão se e das peças de texto. Na construção seguinte, manter somente os gestos e a configuração.

**Na tela:** Destacar um ramo por vez. Depois aproximar título/subtítulo/dica e suas bordas; comparar com o campo de cor. Não animar tudo junto.

**Trecho original selecionado, antes da edição:** Agora a gente desenha a telinha de abertura. Olha o Se que você montou ontem, aquele que pergunta se a tela atual é jogando. Chega perto da beiradinha de baixo, do lado esquerdo. Tem dois botõezinhos escritos com um mais: mais senão se e mais senão. Eles estavam ali desde ontem, esperando. A gente podia pegar outro bloco Se e botar do lado, mas pensa comigo. O seu jogo fica em uma tela de cada vez, sempre. Se ele está na tela jogando, ele não está na tela inicio, de jeito nenhum. Então não faz sentido fazer duas perguntas soltas, como se as duas pudessem dar sim ao mesmo tempo. Clica no mais senão se. Olha o que aconteceu com o bloco: ele cresceu. Ganhou um andar novo embaixo, escrito senão se, com um espacinho de pergunta vazio esperando. E senão se quer dizer exatamente o que está escrito: se a pergunta de cima deu não, aí sim ele faz a de baixo. E se a de cima deu sim, ele nem olha a de baixo, porque já resolveu. Isso é o jeito certo de perguntar quando você sabe que só uma das respostas pode ser verdade. Agora, no espacinho vazio do senão se, encaixa a pergunta a tela atual é, lá de Jogo 2D, Telas e cenas, e escolhe inicio na listinha. Repara que dessa vez você não precisou tirar comparação nenhuma, porque o andar já nasce com o buraquinho vazio. O que vai dentro desse andar é bloco novo. Dentro dele, na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Mostrar tela e encaixa até dar o cliquinho. Ele já veio com uns textos escritos de fábrica, de outro jogo. E ele tem quatro campos: o título, o subtítulo, a dica e a cor do fundo. Antes de trocar os textos, chega perto e olha bem os três primeiros comigo. Eles não estão escritos no bloco Mostrar tela. Cada um deles tem uma bordinha em volta, porque cada texto é uma pecinha separada, encaixada num espacinho do Mostrar tela. Essa pecinha se chama texto, e é a pecinha de escrever. Ela mora na categoria Programação, subcategoria Valores, e o Mostrar tela já veio com três delas encaixadas, uma em cada espacinho. Então, pra trocar o que está escrito, você clica no textinho dentro da pecinha e digita o seu. Vamos nos três. Na pecinha do título, o nome do seu jogo. Pode ser Corre, Dino!, ou o nome que você quiser dar. Esse é o nome que vai aparecer grandão pra quem jogar. Na pecinha do subtítulo, uma frase curta explicando o que fazer: Pule os cactos e sobreviva o maior tempo que você conseguir! E na pecinha da dica, o que a pessoa precisa apertar. Escreve assim: Aperte Enter para começar. Daqui a pouco a gente volta nessa frase, guarda ela. O quarto campo é o quadradinho da cor de fundo, e esse não é pecinha, é um campo do próprio bloco. Você não precisa mexer nele: ele já nasce escuro, um azul-marinho quase preto, e fica bonito por cima da floresta. Se quiser outra cor, clica e escolhe, mas isso é gosto seu, não é obrigação. O meu eu vou deixar do jeito que veio. Olha a área do jogo: apareceu a tela de início do seu jogo! Com o nome dele e tudo. Já parece jogo de gente grande, né? E lembra dessa pecinha texto, porque ela é a razão de uma coisa muito legal que a gente vai fazer na Aula 11. Como o texto é uma peça, e não um campo, ele pode ser trocado por outra coisa. Lá na Aula 11 o subtítulo da tela de fim vai virar uma peça que junta texto com número, pra dizer quantos pontos você fez. Só que, se você apertar Enter agora, não acontece nada, porque a gente ainda não ensinou o Enter a fazer nada. É o próximo passo. Passo 1 feito, a sua tela de início já está lá com o nome do jogo. Vamos pro segundo.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Monte sua tela de início

**Por que aqui:** Transformar a espera invisível da aula 7 em um menu compreensível.

**Foco:** Mostrar instrução de início no estado correto.

**Fala de ligação / orientação ao aluno:** “No Se do quadro, acrescente senão se inicio. Dentro, coloque Mostrar tela. Escreva o título do jogo, uma frase sobre pular cactos e a dica Aperte Enter para começar.”

**Fonte:** roteiro-aula-08-corre-dino.md → Parte 1. Passo 1: desenhar a tela de início.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter título como escolha visual breve. O identificador da cena continua inicio. A dica provisória é exata para o teste seguinte.

**Na tela:** **Na tela:** zoom nos dois botõezinhos "+ senão se" e "+ senão" que ficam embaixo, à esquerda, do "Se a tela atual é jogando". Clicar no "+ senão se" e mostrar o bloco crescendo, com o andar novo e o espacinho de pergunta vazio. Encaixar nele o "a tela atual é" com "inicio" e, dentro, o "Mostrar tela" (Jogo 2D › Jogo e telas › Telas e partida). Dar um zoom nos três encaixes de valor do Mostrar tela, mostrando que dentro de cada um tem uma pecinha "texto" separada, com borda própria. Clicar no texto DENTRO da pecinha para editar. Print de conferência com o bloco inteiro: Se jogando em cima, senão se inicio embaixo.

**Trecho original selecionado, antes da edição:** Agora a gente desenha a telinha de abertura. Olha o Se que você montou ontem, aquele que pergunta se a tela atual é jogando. Chega perto da beiradinha de baixo, do lado esquerdo. Tem dois botõezinhos escritos com um mais: mais senão se e mais senão. Eles estavam ali desde ontem, esperando. A gente podia pegar outro bloco Se e botar do lado, mas pensa comigo. O seu jogo fica em uma tela de cada vez, sempre. Se ele está na tela jogando, ele não está na tela inicio, de jeito nenhum. Então não faz sentido fazer duas perguntas soltas, como se as duas pudessem dar sim ao mesmo tempo. Clica no mais senão se. Olha o que aconteceu com o bloco: ele cresceu. Ganhou um andar novo embaixo, escrito senão se, com um espacinho de pergunta vazio esperando. E senão se quer dizer exatamente o que está escrito: se a pergunta de cima deu não, aí sim ele faz a de baixo. E se a de cima deu sim, ele nem olha a de baixo, porque já resolveu. Isso é o jeito certo de perguntar quando você sabe que só uma das respostas pode ser verdade. Agora, no espacinho vazio do senão se, encaixa a pergunta a tela atual é, lá de Jogo 2D, Telas e cenas, e escolhe inicio na listinha. Repara que dessa vez você não precisou tirar comparação nenhuma, porque o andar já nasce com o buraquinho vazio. O que vai dentro desse andar é bloco novo. Dentro dele, na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Mostrar tela e encaixa até dar o cliquinho. Ele já veio com uns textos escritos de fábrica, de outro jogo. E ele tem quatro campos: o título, o subtítulo, a dica e a cor do fundo. Antes de trocar os textos, chega perto e olha bem os três primeiros comigo. Eles não estão escritos no bloco Mostrar tela. Cada um deles tem uma bordinha em volta, porque cada texto é uma pecinha separada, encaixada num espacinho do Mostrar tela. Essa pecinha se chama texto, e é a pecinha de escrever. Ela mora na categoria Programação, subcategoria Valores, e o Mostrar tela já veio com três delas encaixadas, uma em cada espacinho. Então, pra trocar o que está escrito, você clica no textinho dentro da pecinha e digita o seu. Vamos nos três. Na pecinha do título, o nome do seu jogo. Pode ser Corre, Dino!, ou o nome que você quiser dar. Esse é o nome que vai aparecer grandão pra quem jogar. Na pecinha do subtítulo, uma frase curta explicando o que fazer: Pule os cactos e sobreviva o maior tempo que você conseguir! E na pecinha da dica, o que a pessoa precisa apertar. Escreve assim: Aperte Enter para começar. Daqui a pouco a gente volta nessa frase, guarda ela. O quarto campo é o quadradinho da cor de fundo, e esse não é pecinha, é um campo do próprio bloco. Você não precisa mexer nele: ele já nasce escuro, um azul-marinho quase preto, e fica bonito por cima da floresta. Se quiser outra cor, clica e escolhe, mas isso é gosto seu, não é obrigação. O meu eu vou deixar do jeito que veio. Olha a área do jogo: apareceu a tela de início do seu jogo! Com o nome dele e tudo. Já parece jogo de gente grande, né? E lembra dessa pecinha texto, porque ela é a razão de uma coisa muito legal que a gente vai fazer na Aula 11. Como o texto é uma peça, e não um campo, ele pode ser trocado por outra coisa. Lá na Aula 11 o subtítulo da tela de fim vai virar uma peça que junta texto com número, pra dizer quantos pontos você fez. Só que, se você apertar Enter agora, não acontece nada, porque a gente ainda não ensinou o Enter a fazer nada. É o próximo passo. Passo 1 feito, a sua tela de início já está lá com o nome do jogo. Vamos pro segundo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Mostre a tela de início no senão se inicio, com a dica combinada.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Faça o Enter começar a partida

**Por que aqui:** Um caso simples permite testar a condição antes de ampliar o acesso.

**Foco:** Responder à entrada somente na cena de início.

**Fala de ligação / orientação ao aluno:** “Dentro de Quando acontecer, coloque Quando apertar Enter. Dentro, Se a tela é inicio, então Ir para jogando. Teste e depois toque no menu: esse primeiro evento só escuta Enter.”

**Fonte:** roteiro-aula-08-corre-dino.md → Parte 2. Passo 2: o jogo começa quando o jogador manda.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar o teste que funciona e o clique sem resposta. Retirar afirmações absolutas sobre inexistência de teclado em celulares; dizer que jogar por toque precisa funcionar.

**Na tela:** **Na tela:** Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro do Quando acontecer, ao lado do evento do pulo, e escolher Enter; dentro, um "Se a tela atual é inicio" com "Ir para a tela jogando". Testar com o Enter (funciona) e depois clicar no meio da tela de início várias vezes (não acontece nada), com um zoom no cursor. Depois: trocar o bloco do evento pelo "Quando apertar qualquer tecla ou tocar na tela", arrastando o Se de dentro do antigo pro novo e apagando o antigo com o botão direito. Por fim, voltar no Mostrar tela e trocar o texto da dica.

**Trecho original selecionado, antes da edição:** Falta fazer o jogo começar. Na categoria Jogo 2D, subcategoria Controles, pega o bloco Quando apertar a tecla. Clica, segura, arrasta pra dentro da área Quando acontecer e solta ao lado do evento do pulo, que já está lá. Ele tem um campo só, a listinha das teclas: escolhe Enter. Agora, dentro dele: mais um bloco Se, lá da categoria Programação, subcategoria Lógica e Se. Sem nada pra embrulhar de novo, então são as três primeiras etapas: tira a comparação de fábrica, põe no lugar a pergunta a tela atual é, e escolhe inicio. E dentro desse Se, na categoria Jogo 2D, subcategoria Telas e cenas, o bloco Ir para a tela, que também tem um campo só: escolhe jogando. Leu junto? 'Quando apertar Enter: se a tela atual é inicio, então vai para a tela jogando.' Ou seja, aperta Enter no menu e o jogo começa. E por que a gente pergunta a tela antes? Porque essa mesma coisa vai servir pra mais de um trabalho. Na próxima aula ela também vai reiniciar o jogo depois que você perder, e aí ela faz coisas diferentes dependendo de onde o jogo está. Isso é bem comum em jogos. Recarrega a página e testa. Clica na área do jogo e aperta Enter: começou. Funcionou direitinho. Agora eu quero que você faça uma coisa comigo. Recarrega de novo, pra voltar pra tela de início, e clica bem no meio da tela, em cima do nome do jogo. Nada. Clica de novo, mais umas três vezes. Nada de nada. E olha que clicar na tela é a primeira coisa que qualquer pessoa faz. Antes de procurar tecla, a gente clica. E tem uma coisa pior, que não dá nem pra mostrar aqui: no celular não existe tecla Enter. Não existe teclado nenhum. Quem abrir o seu jogo no telefone vai ver essa tela bonita, vai tocar nela, não vai acontecer nada, e vai ficar preso ali pra sempre. Sem nunca jogar. E olha, isso aqui não é o mesmo problema da Aula 4, viu? Presta atenção na diferença, porque ela é fina. Na Aula 4 a gente estava escutando o seu dedo quando devia escutar o dino. O bloco era o errado pro trabalho. Hoje é outra coisa. Aqui escutar o jogador é o certo mesmo, porque quem começa o jogo é ele. O problema é que a gente escolheu uma tecla só, e o jogador pode apertar qualquer outra, ou pode nem ter teclado. Não é o bloco errado, é o bloco estreito demais. E o conserto é trocar por um irmão dele que existe bem do lado. Na mesma subcategoria Controles, pega o bloco Quando apertar qualquer tecla ou tocar na tela. Clica, segura, arrasta pra dentro do Quando acontecer e solta ali embaixo. Esse não tem campo nenhum: o nome dele já diz tudo. Agora pega aquele Se a tela atual é inicio que está dentro do evento do Enter, com o Ir para a tela junto, arrasta e solta dentro do bloco novo. E o evento do Enter, que ficou vazio, apaga com o botão direito e Apagar este bloco. Testa de novo, e agora testa de tudo. Recarrega. Clica no meio da tela: começou. Recarrega. Aperta Enter: começou. Recarrega, aperta a barra de espaço: começou. Recarrega e aperta uma letra qualquer, o A, o M, o que você quiser: começou também. Falta uma coisa, e ela é de honestidade. Volta lá no Mostrar tela e olha a dica que você escreveu no passo 1: 'Aperte Enter para começar'. Isso agora é mentira, ou pelo menos é bem menos do que o seu jogo sabe fazer. Clica no textinho dentro da pecinha da dica e troca por: Aperte qualquer tecla ou toque na tela para começar. O que está escrito na tela é uma promessa que você faz pra quem joga. E promessa quebrada é pior do que promessa nenhuma: se a tela diz Enter, quem está no celular procura um Enter que não existe e desiste. Toda vez que você mudar o que o seu jogo faz, olha se tem algum texto na tela falando dele. Passo 2 feito, e agora o seu jogo começa do jeito que a pessoa quiser: tecla, mouse ou dedo na tela. Vem o terceiro, que é testar e deixar tudo do seu jeito.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No evento Enter, vá para jogando somente se estiver em inicio.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### O menu funciona com toque?

**Por que aqui:** A limitação foi observada no próprio jogo; agora a criança testa os dois jeitos de começar que a tela de início promete.

**Foco:** Comparar acesso pelo teclado e pelo toque.

**Cena:** `controls`, “O convite para começar”. Formato: experimentação (a criança mexe e descobre). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: Dino (o de fábrica).

**O que a criança lê ao abrir:** “A tela de início promete dois jeitos de começar: tocar na tela ou apertar Enter. Teste os dois, voltando ao início.”

**Como o palco começa:** A tela de início mostra o convite para começar.

**Previsão, antes de mexer (a de fábrica da cena; não vale nota):** “Você toca na tela de início. O que acontece?”

- A partida começa (se ela escolher esta, a tela conta depois: “A tela continuou no INÍCIO.”)
- Nada acontece ✓ (o que acontece de verdade)

O palpite volta à tela quando ela descobre: “Tocou e nada aconteceu”.

**O que ela precisa descobrir** (a faixa e o botão Conferir mostram o pedido; o rótulo só aparece quando a descoberta acontece):

1. Pedido: “Com Começar em Quando apertar Enter, toque na tela de início.” Ao descobrir: “Tocou e nada aconteceu”.
2. Pedido: “Leve Começar para Quando apertar qualquer tecla ou tocar na tela, e toque na tela de início.” Ao descobrir: “Começou tocando”.
3. Pedido: “Na tela de início, aperte Enter.” Ao descobrir: “Começou com Enter”.

**Frase de sucesso:** “Agora os dois jeitos que o convite promete começam a partida!”

**Pistas (uma por vez, no botão Uma pista; guardadas no bloco, iguais às de fábrica):**

1. “Toque na tela de início e olhe se ela muda.”
2. “Olhe em que caixa está a peça Começar.”
3. “Leve Começar para Quando apertar qualquer tecla ou tocar na tela. Teste os dois jeitos, voltando ao início.”

**Pergunta depois de descobrir (a de fábrica da cena; conta para concluir):** “Por que tocar não começava a partida?”

- O convite estava escrito errado.
- Nada no jogo escutava o toque. ✓ (correta)

**Explicação que ela lê ao acertar:** “Escrever toque na tela não liga nada. O jogo só começa quando o toque está na caixa que chama Começar. Agora o convite e o jogo dizem a mesma coisa.”

**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e a pergunta. Na revisita, a faixa mostra “✓ Você já descobriu isto.”, sem pedir a pergunta de novo.

### Atenda aos dois jeitos de começar

**Por que aqui:** Código e instrução visível precisam mudar juntos.

**Foco:** Ampliar a entrada e atualizar a promessa escrita.

**Fala de ligação / orientação ao aluno:** “Mova o mesmo Se para Quando apertar qualquer tecla ou tocar na tela. Apague o evento Enter. Na dica do menu, escreva: Aperte qualquer tecla ou toque na tela para começar”

**Fonte:** roteiro-aula-08-corre-dino.md → Parte 2. Passo 2: o jogo começa quando o jogador manda.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Usar a transferência do Se e a revisão da dica. Não duplicar o evento nem acrescentar um segundo Se separado.

**Na tela:** **Na tela:** Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro do Quando acontecer, ao lado do evento do pulo, e escolher Enter; dentro, um "Se a tela atual é inicio" com "Ir para a tela jogando". Testar com o Enter (funciona) e depois clicar no meio da tela de início várias vezes (não acontece nada), com um zoom no cursor. Depois: trocar o bloco do evento pelo "Quando apertar qualquer tecla ou tocar na tela", arrastando o Se de dentro do antigo pro novo e apagando o antigo com o botão direito. Por fim, voltar no Mostrar tela e trocar o texto da dica.

**Trecho original selecionado, antes da edição:** Falta fazer o jogo começar. Na categoria Jogo 2D, subcategoria Controles, pega o bloco Quando apertar a tecla. Clica, segura, arrasta pra dentro da área Quando acontecer e solta ao lado do evento do pulo, que já está lá. Ele tem um campo só, a listinha das teclas: escolhe Enter. Agora, dentro dele: mais um bloco Se, lá da categoria Programação, subcategoria Lógica e Se. Sem nada pra embrulhar de novo, então são as três primeiras etapas: tira a comparação de fábrica, põe no lugar a pergunta a tela atual é, e escolhe inicio. E dentro desse Se, na categoria Jogo 2D, subcategoria Telas e cenas, o bloco Ir para a tela, que também tem um campo só: escolhe jogando. Leu junto? 'Quando apertar Enter: se a tela atual é inicio, então vai para a tela jogando.' Ou seja, aperta Enter no menu e o jogo começa. E por que a gente pergunta a tela antes? Porque essa mesma coisa vai servir pra mais de um trabalho. Na próxima aula ela também vai reiniciar o jogo depois que você perder, e aí ela faz coisas diferentes dependendo de onde o jogo está. Isso é bem comum em jogos. Recarrega a página e testa. Clica na área do jogo e aperta Enter: começou. Funcionou direitinho. Agora eu quero que você faça uma coisa comigo. Recarrega de novo, pra voltar pra tela de início, e clica bem no meio da tela, em cima do nome do jogo. Nada. Clica de novo, mais umas três vezes. Nada de nada. E olha que clicar na tela é a primeira coisa que qualquer pessoa faz. Antes de procurar tecla, a gente clica. E tem uma coisa pior, que não dá nem pra mostrar aqui: no celular não existe tecla Enter. Não existe teclado nenhum. Quem abrir o seu jogo no telefone vai ver essa tela bonita, vai tocar nela, não vai acontecer nada, e vai ficar preso ali pra sempre. Sem nunca jogar. E olha, isso aqui não é o mesmo problema da Aula 4, viu? Presta atenção na diferença, porque ela é fina. Na Aula 4 a gente estava escutando o seu dedo quando devia escutar o dino. O bloco era o errado pro trabalho. Hoje é outra coisa. Aqui escutar o jogador é o certo mesmo, porque quem começa o jogo é ele. O problema é que a gente escolheu uma tecla só, e o jogador pode apertar qualquer outra, ou pode nem ter teclado. Não é o bloco errado, é o bloco estreito demais. E o conserto é trocar por um irmão dele que existe bem do lado. Na mesma subcategoria Controles, pega o bloco Quando apertar qualquer tecla ou tocar na tela. Clica, segura, arrasta pra dentro do Quando acontecer e solta ali embaixo. Esse não tem campo nenhum: o nome dele já diz tudo. Agora pega aquele Se a tela atual é inicio que está dentro do evento do Enter, com o Ir para a tela junto, arrasta e solta dentro do bloco novo. E o evento do Enter, que ficou vazio, apaga com o botão direito e Apagar este bloco. Testa de novo, e agora testa de tudo. Recarrega. Clica no meio da tela: começou. Recarrega. Aperta Enter: começou. Recarrega, aperta a barra de espaço: começou. Recarrega e aperta uma letra qualquer, o A, o M, o que você quiser: começou também. Falta uma coisa, e ela é de honestidade. Volta lá no Mostrar tela e olha a dica que você escreveu no passo 1: 'Aperte Enter para começar'. Isso agora é mentira, ou pelo menos é bem menos do que o seu jogo sabe fazer. Clica no textinho dentro da pecinha da dica e troca por: Aperte qualquer tecla ou toque na tela para começar. O que está escrito na tela é uma promessa que você faz pra quem joga. E promessa quebrada é pior do que promessa nenhuma: se a tela diz Enter, quem está no celular procura um Enter que não existe e desiste. Toda vez que você mudar o que o seu jogo faz, olha se tem algum texto na tela falando dele. Passo 2 feito, e agora o seu jogo começa do jeito que a pessoa quiser: tecla, mouse ou dedo na tela. Vem o terceiro, que é testar e deixar tudo do seu jeito.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Qualquer tecla ou toque deve iniciar apenas quando a tela for inicio.
- Retire o evento exclusivo de Enter.
- Mostre a tela de início no senão se inicio, com a dica combinada.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Clipes de abertura e fecho

### Abertura

**Ponte nova:** “O jogo já espera. Vamos mostrar o menu e permitir começar pelo teclado ou pelo toque.”

**Fonte:** roteiro-aula-08-corre-dino.md → Abertura.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Reaproveitar a retomada e o resultado de hoje. Trocar convites a exploração livre pela missão delimitada abaixo.

### Fecho

**Ponte nova:** “Sua construção está guardada. Agora responda três perguntas curtas sobre o que mudou hoje.”

**Fonte:** roteiro-aula-08-corre-dino.md → Fecho.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter a recapitulação. Parte 3: aproveitar os testes; reduzir o passeio por cores e frases a uma escolha breve de título. Não confundir esta correção com a aula 4: aqui escutar a entrada é adequado, mas precisamos atender a mais de uma entrada. Terminar indicando o quiz, sem abrir desafios extras.

## Conferência final e quiz

Reinicie a prévia. Comece por toque; reinicie e comece pelo teclado. Antes de começar, não devem nascer cactos. A dica deve descrever os dois controles.

**Critérios da entrega:**

- Abra o jogo na tela inicio.
- Mostre a tela de início no senão se inicio, com a dica combinada.
- Qualquer tecla ou toque deve iniciar apenas quando a tela for inicio.
- Retire o evento exclusivo de Enter.
- No relógio de 1,4 s, crie cactos somente se a tela for jogando.

**Quando o senão se é consultado?**

- Quando a condição anterior deu não. (correta)
- Mesmo depois de a condição anterior dar sim.

Os ramos escolhem um caminho por vez.

**Trocar o controle exige revisar o quê na tela?**

- A dica que ensina a começar. (correta)
- O tamanho do Dino.

A instrução precisa corresponder ao comportamento.

**Por que manter Se inicio dentro do evento?**

- Para começar só quando estamos no menu. (correta)
- Para tocar o som a cada quadro.

O evento pode ganhar outra função no fim da partida.

## Orientação ao professor e à edição

- Parte 3: aproveitar os testes; reduzir o passeio por cores e frases a uma escolha breve de título.
- Não confundir esta correção com a aula 4: aqui escutar a entrada é adequado, mas precisamos atender a mais de uma entrada.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 61a9981e52b892274aeeddc4ae00798d7a534530d5835205722d502f0b901139. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).

## Blocos e gravação no Estúdio atual

Edição: jogo-2d-1.0-documento-2.

Use os endereços abaixo ao gravar os gestos e a narração. As falas e âncoras identificadas como originais documentam a gravação anterior. Capture a paleta atual e substitua as indicações de localização antigas antes de publicar a aula.

No seletor Tocar efeito, escolha pulo, tiro, explosão ou derrota conforme a ação. O som fica no evento ou na colisão que o dispara. Preparar o jogo continua em Ao iniciar; seus eventos e relógios ficam nas áreas indicadas no passo a passo.

Confira com o perfil de aluno: abrir a aula, encontrar cada peça, montar, testar, conferir os critérios, guardar, reabrir e continuar na aula seguinte. Nas aulas de publicação, teste também Fazer minha versão e a edição da cópia.

| Bloco | Onde encontrar | O que faz |
| --- | --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto | Roda quando alguma coisa acontece. |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto | Repete enquanto o projeto estiver rodando. |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto | Roda ao abrir ou a cada nova partida. |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D › Movimento › Velocidade e gravidade | Soma a gravidade do mundo à velocidade vertical do sprite neste quadro. Sem definir outro valor, usa 0,6. Encaixe logo ANTES do bloco que movimenta o sprite. |
| Limpar a tela | Jogo 2D › Desenho e efeitos › Efeitos | Apaga tudo o que foi desenhado. Use no começo de cada quadro, antes de desenhar de novo. |
| Controlar o dinossauro , força do pulo | Jogo 2D › Kits prontos › Dino | Pula com ↑/Espaço ou toque na metade de cima da tela; abaixa com ↓ ou segurando o dedo embaixo. Já vem com chão e poeira. Para o dino cair, encaixe o "Aplicar a gravidade do mundo" logo acima. Use dentro do "a cada quadro". |
| Criar dinossauro em x y tamanho cor | Jogo 2D › Kits prontos › Dino | Cria um dinossauro desenhado (com perninhas que correm sozinhas). A pose muda quando ele pula ou abaixa. |
| Criar grupo de sprites | Jogo 2D › Grupos › Criar e percorrer | Cria um grupo vazio para guardar MUITOS sprites do mesmo tipo (tiros, inimigos, estrelas). |
| Desenhar o grupo | Jogo 2D › Grupos › Desenho e ordem | Desenha todos os sprites do grupo. Use a cada quadro, depois de mover. |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| A cada segundos | Jogo 2D › Tempo › Quadros e intervalos | Roda o “fazer” a cada N segundos. É uma raiz de “🔁 Enquanto estiver rodando”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”. |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu com sol, nuvens, morros e uma faixa de grama que rola (parallax). Use no começo do "a cada quadro", depois de limpar a tela. O dino corre sobre a grama. |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro quando a criança aperta qualquer tecla ou toca na tela. É o "aperte qualquer coisa para começar" das telas de início. Segurar a tecla dispara uma vez só. |
| Quando o sprite pular | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que o sprite pula de verdade (ex.: tocar um som, contar os pulos). Vale para os três jeitos de pular: estilo plataforma, pular no chão e o kit do dinossauro. |
| Quando apertar a tecla | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que a tecla é apertada (ex.: pular, atirar). |
| Tocar efeito | Jogo 2D › Som › Efeitos prontos | Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu. |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D › Grupos › Participação e limpeza | Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa). Só tira quem já foi embora de verdade: o que nasce fora da tela e ainda está vindo continua no jogo. |
| o estado do jogo é ? | Jogo 2D › Jogo e telas › Telas e partida | Verdadeiro se o jogo está naquela tela. Use dentro de um "se". |
| Mudar o estado do jogo para | Jogo 2D › Jogo e telas › Telas e partida | Guarda o estado atual, como início, jogando ou vitória. Use a pergunta sobre o estado para escolher o que desenhar e mover. A mudança não pausa o motor nem desenha uma tela. |
| Descrever o jogo para leitor de tela | Jogo 2D › Jogo e telas › Telas e partida | Explica o objetivo e os controles para quem não vê o canvas. Coloque em “Ao iniciar”. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D › Jogo e telas › Telas e partida | Cobre a tela com um aviso central (título + subtítulo + dica). Ótimo para as telas de início, vitória e derrota. |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D › Kits prontos › Dino | Cria um obstáculo desenhado e coloca no grupo. Cacto e pedra nascem no chão (pule por cima); o pássaro vem no alto (abaixe por baixo). Ligue o x na borda direita e um vx negativo para ele vir vindo. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D › Grupos › Movimento | Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro. |
| Condição se, senão se e senão | Programação › ❓ Lógica & Se | Executa o "então" quando a condição for verdadeira. Use + para juntar "senão se" e "senão". |
| Número | Programação › 🔣 Valores | Um valor numérico. |
| texto | Programação › 🔣 Valores | Um valor de texto. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
