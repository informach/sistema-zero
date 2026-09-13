# aula-08 — Uma tela de início que responde ao jogador

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

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

**Montagem:** Usar a explicação do senão se e das peças de texto. Na construção seguinte, manter somente os gestos e a configuração.

**Na tela:** Destacar um ramo por vez. Depois aproximar título/subtítulo/dica e suas bordas; comparar com o campo de cor. Não animar tudo junto.

**Trecho original selecionado, antes da edição:** Agora a gente desenha a telinha de abertura. Olha o Se que você montou ontem, aquele que pergunta se a tela atual é jogando. Chega perto da beiradinha de baixo, do lado esquerdo. Tem dois botõezinhos escritos com um mais: mais senão se e mais senão. Eles estavam ali desde ontem, esperando. A gente podia pegar outro bloco Se e botar do lado, mas pensa comigo. O seu jogo fica em uma tela de cada vez, sempre. Se ele está na tela jogando, ele não está na tela inicio, de jeito nenhum. Então não faz sentido fazer duas perguntas soltas, como se as duas pudessem dar sim ao mesmo tempo. Clica no mais senão se. Olha o que aconteceu com o bloco: ele cresceu. Ganhou um andar novo embaixo, escrito senão se, com um espacinho de pergunta vazio esperando. E senão se quer dizer exatamente o que está escrito: se a pergunta de cima deu não, aí sim ele faz a de baixo. E se a de cima deu sim, ele nem olha a de baixo, porque já resolveu. Isso é o jeito certo de perguntar quando você sabe que só uma das respostas pode ser verdade. Agora, no espacinho vazio do senão se, encaixa a pergunta a tela atual é, lá de Jogo 2D, Telas e cenas, e escolhe inicio na listinha. Repara que dessa vez você não precisou tirar comparação nenhuma, porque o andar já nasce com o buraquinho vazio. O que vai dentro desse andar é bloco novo. Dentro dele, na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Mostrar tela e encaixa até dar o cliquinho. Ele já veio com uns textos escritos de fábrica, de outro jogo. E ele tem quatro campos: o título, o subtítulo, a dica e a cor do fundo. Antes de trocar os textos, chega perto e olha bem os três primeiros comigo. Eles não estão escritos no bloco Mostrar tela. Cada um deles tem uma bordinha em volta, porque cada texto é uma pecinha separada, encaixada num espacinho do Mostrar tela. Essa pecinha se chama texto, e é a pecinha de escrever. Ela mora na categoria Programação, subcategoria Valores, e o Mostrar tela já veio com três delas encaixadas, uma em cada espacinho. Então, pra trocar o que está escrito, você clica no textinho dentro da pecinha e digita o seu. Vamos nos três. Na pecinha do título, o nome do seu jogo. Pode ser Corre, Dino!, ou o nome que você quiser dar. Esse é o nome que vai aparecer grandão pra quem jogar. Na pecinha do subtítulo, uma frase curta explicando o que fazer: Pule os cactos e sobreviva o maior tempo que você conseguir! E na pecinha da dica, o que a pessoa precisa apertar. Escreve assim: Aperte Enter para começar. Daqui a pouco a gente volta nessa frase, guarda ela. O quarto campo é o quadradinho da cor de fundo, e esse não é pecinha, é um campo do próprio bloco. Você não precisa mexer nele: ele já nasce escuro, um azul-marinho quase preto, e fica bonito por cima da floresta. Se quiser outra cor, clica e escolhe, mas isso é gosto seu, não é obrigação. O meu eu vou deixar do jeito que veio. Olha a área do jogo: apareceu a tela de início do seu jogo! Com o nome dele e tudo. Já parece jogo de gente grande, né? E lembra dessa pecinha texto, porque ela é a razão de uma coisa muito legal que a gente vai fazer na Aula 11. Como o texto é uma peça, e não um campo, ele pode ser trocado por outra coisa. Lá na Aula 11 o subtítulo da tela de fim vai virar uma peça que junta texto com número, pra dizer quantos pontos você fez. Só que, se você apertar Enter agora, não acontece nada, porque a gente ainda não ensinou o Enter a fazer nada. É o próximo passo. Passo 1 feito, a sua tela de início já está lá com o nome do jogo. Vamos pro segundo.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Monte sua tela de início

**Por que aqui:** Transformar a espera invisível da aula 7 em um menu compreensível.

**Foco:** Mostrar instrução de início no estado correto.

**Fala de ligação / orientação ao aluno:** “No Se do quadro, acrescente senão se inicio. Dentro, coloque Mostrar tela. Escreva o título do jogo, uma frase sobre pular cactos e a dica Aperte Enter para começar.”

**Fonte:** roteiro-aula-08-corre-dino.md → Parte 1. Passo 1: desenhar a tela de início.

**Montagem:** Manter título como escolha visual breve. O identificador da cena continua inicio. A dica provisória é exata para o teste seguinte.

**Na tela:** **Na tela:** zoom nos dois botõezinhos "+ senão se" e "+ senão" que ficam embaixo, à esquerda, do "Se a tela atual é jogando". Clicar no "+ senão se" e mostrar o bloco crescendo, com o andar novo e o espacinho de pergunta vazio. Encaixar nele o "a tela atual é" com "inicio" e, dentro, o "Mostrar tela" (Jogo 2D › Telas e cenas). Dar um zoom nos três encaixes de valor do Mostrar tela, mostrando que dentro de cada um tem uma pecinha "texto" separada, com borda própria. Clicar no texto DENTRO da pecinha para editar. Print de conferência com o bloco inteiro: Se jogando em cima, senão se inicio embaixo.

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

**Montagem:** Preservar o teste que funciona e o clique sem resposta. Retirar afirmações absolutas sobre inexistência de teclado em celulares; dizer que jogar por toque precisa funcionar.

**Na tela:** **Na tela:** Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro do Quando acontecer, ao lado do evento do pulo, e escolher Enter; dentro, um "Se a tela atual é inicio" com "Ir para a tela jogando". Testar com o Enter (funciona) e depois clicar no meio da tela de início várias vezes (não acontece nada), com um zoom no cursor. Depois: trocar o bloco do evento pelo "Quando apertar qualquer tecla ou tocar na tela", arrastando o Se de dentro do antigo pro novo e apagando o antigo com o botão direito. Por fim, voltar no Mostrar tela e trocar o texto da dica.

**Trecho original selecionado, antes da edição:** Falta fazer o jogo começar. Na categoria Jogo 2D, subcategoria Controles, pega o bloco Quando apertar a tecla. Clica, segura, arrasta pra dentro da área Quando acontecer e solta ao lado do evento do pulo, que já está lá. Ele tem um campo só, a listinha das teclas: escolhe Enter. Agora, dentro dele: mais um bloco Se, lá da categoria Programação, subcategoria Lógica e Se. Sem nada pra embrulhar de novo, então são as três primeiras etapas: tira a comparação de fábrica, põe no lugar a pergunta a tela atual é, e escolhe inicio. E dentro desse Se, na categoria Jogo 2D, subcategoria Telas e cenas, o bloco Ir para a tela, que também tem um campo só: escolhe jogando. Leu junto? 'Quando apertar Enter: se a tela atual é inicio, então vai para a tela jogando.' Ou seja, aperta Enter no menu e o jogo começa. E por que a gente pergunta a tela antes? Porque essa mesma coisa vai servir pra mais de um trabalho. Na próxima aula ela também vai reiniciar o jogo depois que você perder, e aí ela faz coisas diferentes dependendo de onde o jogo está. Isso é bem comum em jogos. Recarrega a página e testa. Clica na área do jogo e aperta Enter: começou. Funcionou direitinho. Agora eu quero que você faça uma coisa comigo. Recarrega de novo, pra voltar pra tela de início, e clica bem no meio da tela, em cima do nome do jogo. Nada. Clica de novo, mais umas três vezes. Nada de nada. E olha que clicar na tela é a primeira coisa que qualquer pessoa faz. Antes de procurar tecla, a gente clica. E tem uma coisa pior, que não dá nem pra mostrar aqui: no celular não existe tecla Enter. Não existe teclado nenhum. Quem abrir o seu jogo no telefone vai ver essa tela bonita, vai tocar nela, não vai acontecer nada, e vai ficar preso ali pra sempre. Sem nunca jogar. E olha, isso aqui não é o mesmo problema da Aula 4, viu? Presta atenção na diferença, porque ela é fina. Na Aula 4 a gente estava escutando o seu dedo quando devia escutar o dino. O bloco era o errado pro trabalho. Hoje é outra coisa. Aqui escutar o jogador é o certo mesmo, porque quem começa o jogo é ele. O problema é que a gente escolheu uma tecla só, e o jogador pode apertar qualquer outra, ou pode nem ter teclado. Não é o bloco errado, é o bloco estreito demais. E o conserto é trocar por um irmão dele que existe bem do lado. Na mesma subcategoria Controles, pega o bloco Quando apertar qualquer tecla ou tocar na tela. Clica, segura, arrasta pra dentro do Quando acontecer e solta ali embaixo. Esse não tem campo nenhum: o nome dele já diz tudo. Agora pega aquele Se a tela atual é inicio que está dentro do evento do Enter, com o Ir para a tela junto, arrasta e solta dentro do bloco novo. E o evento do Enter, que ficou vazio, apaga com o botão direito e Apagar este bloco. Testa de novo, e agora testa de tudo. Recarrega. Clica no meio da tela: começou. Recarrega. Aperta Enter: começou. Recarrega, aperta a barra de espaço: começou. Recarrega e aperta uma letra qualquer, o A, o M, o que você quiser: começou também. Falta uma coisa, e ela é de honestidade. Volta lá no Mostrar tela e olha a dica que você escreveu no passo 1: 'Aperte Enter para começar'. Isso agora é mentira, ou pelo menos é bem menos do que o seu jogo sabe fazer. Clica no textinho dentro da pecinha da dica e troca por: Aperte qualquer tecla ou toque na tela para começar. O que está escrito na tela é uma promessa que você faz pra quem joga. E promessa quebrada é pior do que promessa nenhuma: se a tela diz Enter, quem está no celular procura um Enter que não existe e desiste. Toda vez que você mudar o que o seu jogo faz, olha se tem algum texto na tela falando dele. Passo 2 feito, e agora o seu jogo começa do jeito que a pessoa quiser: tecla, mouse ou dedo na tela. Vem o terceiro, que é testar e deixar tudo do seu jeito.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No evento Enter, vá para jogando somente se estiver em inicio.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### O menu funciona com toque?

**Por que aqui:** A limitação foi observada no próprio jogo; agora a criança testa a ligação que falta.

**Foco:** Comparar acesso pelo teclado e pelo toque.

**Fala de ligação / orientação ao aluno:** “Neste exemplo, comece pelo teclado e depois pelo toque. Ligue o toque para que os dois caminhos funcionem.”

**Experiência nativa:** controls. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Toque ainda não conectado; Partida iniciada por toque; Partida iniciada por Enter.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Atenda aos dois jeitos de começar

**Por que aqui:** Código e instrução visível precisam mudar juntos.

**Foco:** Ampliar a entrada e atualizar a promessa escrita.

**Fala de ligação / orientação ao aluno:** “Mova o mesmo Se para Quando apertar qualquer tecla ou tocar na tela. Apague o evento Enter. Na dica do menu, escreva: Aperte qualquer tecla ou toque na tela para começar”

**Fonte:** roteiro-aula-08-corre-dino.md → Parte 2. Passo 2: o jogo começa quando o jogador manda.

**Montagem:** Usar a transferência do Se e a revisão da dica. Não duplicar o evento nem acrescentar um segundo Se separado.

**Na tela:** **Na tela:** Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro do Quando acontecer, ao lado do evento do pulo, e escolher Enter; dentro, um "Se a tela atual é inicio" com "Ir para a tela jogando". Testar com o Enter (funciona) e depois clicar no meio da tela de início várias vezes (não acontece nada), com um zoom no cursor. Depois: trocar o bloco do evento pelo "Quando apertar qualquer tecla ou tocar na tela", arrastando o Se de dentro do antigo pro novo e apagando o antigo com o botão direito. Por fim, voltar no Mostrar tela e trocar o texto da dica.

**Trecho original selecionado, antes da edição:** Falta fazer o jogo começar. Na categoria Jogo 2D, subcategoria Controles, pega o bloco Quando apertar a tecla. Clica, segura, arrasta pra dentro da área Quando acontecer e solta ao lado do evento do pulo, que já está lá. Ele tem um campo só, a listinha das teclas: escolhe Enter. Agora, dentro dele: mais um bloco Se, lá da categoria Programação, subcategoria Lógica e Se. Sem nada pra embrulhar de novo, então são as três primeiras etapas: tira a comparação de fábrica, põe no lugar a pergunta a tela atual é, e escolhe inicio. E dentro desse Se, na categoria Jogo 2D, subcategoria Telas e cenas, o bloco Ir para a tela, que também tem um campo só: escolhe jogando. Leu junto? 'Quando apertar Enter: se a tela atual é inicio, então vai para a tela jogando.' Ou seja, aperta Enter no menu e o jogo começa. E por que a gente pergunta a tela antes? Porque essa mesma coisa vai servir pra mais de um trabalho. Na próxima aula ela também vai reiniciar o jogo depois que você perder, e aí ela faz coisas diferentes dependendo de onde o jogo está. Isso é bem comum em jogos. Recarrega a página e testa. Clica na área do jogo e aperta Enter: começou. Funcionou direitinho. Agora eu quero que você faça uma coisa comigo. Recarrega de novo, pra voltar pra tela de início, e clica bem no meio da tela, em cima do nome do jogo. Nada. Clica de novo, mais umas três vezes. Nada de nada. E olha que clicar na tela é a primeira coisa que qualquer pessoa faz. Antes de procurar tecla, a gente clica. E tem uma coisa pior, que não dá nem pra mostrar aqui: no celular não existe tecla Enter. Não existe teclado nenhum. Quem abrir o seu jogo no telefone vai ver essa tela bonita, vai tocar nela, não vai acontecer nada, e vai ficar preso ali pra sempre. Sem nunca jogar. E olha, isso aqui não é o mesmo problema da Aula 4, viu? Presta atenção na diferença, porque ela é fina. Na Aula 4 a gente estava escutando o seu dedo quando devia escutar o dino. O bloco era o errado pro trabalho. Hoje é outra coisa. Aqui escutar o jogador é o certo mesmo, porque quem começa o jogo é ele. O problema é que a gente escolheu uma tecla só, e o jogador pode apertar qualquer outra, ou pode nem ter teclado. Não é o bloco errado, é o bloco estreito demais. E o conserto é trocar por um irmão dele que existe bem do lado. Na mesma subcategoria Controles, pega o bloco Quando apertar qualquer tecla ou tocar na tela. Clica, segura, arrasta pra dentro do Quando acontecer e solta ali embaixo. Esse não tem campo nenhum: o nome dele já diz tudo. Agora pega aquele Se a tela atual é inicio que está dentro do evento do Enter, com o Ir para a tela junto, arrasta e solta dentro do bloco novo. E o evento do Enter, que ficou vazio, apaga com o botão direito e Apagar este bloco. Testa de novo, e agora testa de tudo. Recarrega. Clica no meio da tela: começou. Recarrega. Aperta Enter: começou. Recarrega, aperta a barra de espaço: começou. Recarrega e aperta uma letra qualquer, o A, o M, o que você quiser: começou também. Falta uma coisa, e ela é de honestidade. Volta lá no Mostrar tela e olha a dica que você escreveu no passo 1: 'Aperte Enter para começar'. Isso agora é mentira, ou pelo menos é bem menos do que o seu jogo sabe fazer. Clica no textinho dentro da pecinha da dica e troca por: Aperte qualquer tecla ou toque na tela para começar. O que está escrito na tela é uma promessa que você faz pra quem joga. E promessa quebrada é pior do que promessa nenhuma: se a tela diz Enter, quem está no celular procura um Enter que não existe e desiste. Toda vez que você mudar o que o seu jogo faz, olha se tem algum texto na tela falando dele. Passo 2 feito, e agora o seu jogo começa do jeito que a pessoa quiser: tecla, mouse ou dedo na tela. Vem o terceiro, que é testar e deixar tudo do seu jeito.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Qualquer tecla ou toque deve iniciar apenas quando a tela for inicio.
- Retire o evento exclusivo de Enter.
- Mostre a tela de início no senão se inicio, com a dica combinada.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

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
