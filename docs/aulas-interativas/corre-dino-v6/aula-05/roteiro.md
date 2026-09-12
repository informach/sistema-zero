# aula-05 — Cactos no ritmo certo

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Vamos criar cactos, fazê-los andar e dar espaço entre um e outro.

**Saída esperada:** O grupo cactos é atualizado e desenhado a cada quadro; um cacto nasce fora da tela a cada 1,4 segundo.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Vamos criar cactos, fazê-los andar e dar espaço entre um e outro. |
| 2. Prepare o grupo dos cactos | application | Usar um grupo para reunir vários obstáculos. |
| 3. Veja por que nascem tantos cactos | demonstration | Distinguir criar de atualizar e desenhar a cada quadro. |
| 4. Dê um intervalo aos nascimentos | exploration | Comparar criação a cada quadro e criação com relógio. |
| 5. Monte os dois ritmos do jogo | application | Criar periodicamente, mover e desenhar continuamente. |
| 6. Veja onde o cacto começa | demonstration | Relacionar x de nascimento à borda direita de 480. |
| 7. Faça o cacto entrar pela direita | application | Alterar somente a posição de nascimento. |
| 8. Por que a velocidade é negativa? | demonstration | Entender que diminuir x move para a esquerda. |
| 9. Teste e entregue sua construção | delivery | O grupo cactos é atualizado e desenhado a cada quadro; um cacto nasce fora da tela a cada 1,4 segundo. |
| 10. Veja o que você aprendeu | closing | O grupo cactos é atualizado e desenhado a cada quadro; um cacto nasce fora da tela a cada 1,4 segundo. |
| 11. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Prepare o grupo dos cactos

**Por que aqui:** Nomear o conjunto antes de operar em todos os seus membros.

**Foco:** Usar um grupo para reunir vários obstáculos.

**Fala de ligação / orientação ao aluno:** “Em Ao iniciar, crie o grupo cactos. Ele começa vazio.”

**Fonte:** roteiro-aula-05-corre-dino.md → Parte 1. Passo 1: criar o grupo dos cactos.

**Montagem:** Preservar a analogia da caixa; não confundir grupo com cacto visível.

**Na tela:** **Na tela:** Jogo 2D › Muitos, arrastar "Criar grupo de sprites" para dentro do Ao iniciar, logo ABAIXO do "Criar dinossauro"; trocar o nome para "cactos". (Ele fica sempre abaixo do Criar dinossauro; a partir da Aula 10, abaixo também do "Usar área de colisão".)

**Trecho original selecionado, antes da edição:** Quantos cactos o seu jogo vai ter? Não é um, nem dois. É um monte, um atrás do outro, sem parar. E cada um deles é um sprite, aquele nome que você aprendeu na Aula 1 pra cada coisinha do jogo. Só que seria uma loucura criar um bloquinho pra cada cacto, né? Cacto 1, cacto 2, cacto 3... Uma bagunça sem fim. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Criar grupo de sprites. Clica, segura, arrasta pra dentro do Ao iniciar e encaixa logo abaixo do Criar dinossauro. Ele tem um campo só, o nome do grupo: ali você escreve cactos, tudo junto e sem acento. Isso que você acabou de montar é um grupo, e ele funciona igual a um time: em vez de falar com cada cacto, você fala com o time inteiro de uma vez. 'Ó, grupo, todo mundo aí andar.' E todos andam. É uma das ideias mais poderosas que existem em jogos. Esse foi rapidinho, e o passo 1 já está pronto. O segundo é onde a gente começa a errar de propósito.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Crie o grupo cactos em Ao iniciar.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Veja por que nascem tantos cactos

**Por que aqui:** A avalanche é útil para observar, mas copiar dezenas de nascimentos não é uma tarefa necessária.

**Foco:** Distinguir criar de atualizar e desenhar a cada quadro.

**Fala de ligação / orientação ao aluno:** “Observe estes três comandos: criar, atualizar e desenhar. Se criar também fica a cada quadro, nasce cacto sem parar.”

**Fonte:** roteiro-aula-05-corre-dino.md → Parte 2. Passo 2: fazer o cacto nascer, andar e aparecer.

**Montagem:** Reutilizar a montagem e a avalanche como observação. A criança ainda não copia esta pilha; destacar só o comando Criar.

**Na tela:** **Na tela:** dentro do "A cada quadro do jogo", logo abaixo do "Desenhar o sprite dino", encaixar na ordem: "No grupo __ criar obstáculo" (Kit dino, grupo cactos, o resto nos valores de fábrica), "Atualizar (mover) o grupo __" e "Desenhar o grupo __" (Muitos, grupo cactos nos dois). Rodar e mostrar a avalanche.

**Trecho original selecionado, antes da edição:** Agora três blocos, e os três vão dentro do A cada quadro do jogo. O primeiro está na categoria Jogo 2D, subcategoria Kit dino, e chama No grupo criar obstáculo. Clica, segura, arrasta pra dentro do A cada quadro do jogo e encaixa logo abaixo do Desenhar o sprite dino. Ele é quem faz nascer um obstáculo dentro do grupo, e tem cinco campos. No primeiro, o grupo, escolhe cactos. O segundo é a forma, e já vem no cacto, que é justo o que a gente quer. Os três últimos são números, o x, o tamanho e o vx: não mexe em nenhum deles agora, deixa os três do jeito que vieram. Os outros dois estão na mesma categoria Jogo 2D, na subcategoria Muitos. Pega o Atualizar (mover) o grupo, arrasta e encaixa logo abaixo do criar obstáculo. Ele tem um campo só, o grupo, e ali escolhe cactos. É ele que faz todo mundo do grupo andar de uma vez. Depois pega o Desenhar o grupo, encaixa logo abaixo dele, e no campo do grupo escolhe cactos também. Esse mostra todos eles na tela. Agora olha ali na área do jogo. Nossa, que zoeira é essa? A tela virou uma parede de cacto, não dá nem pra ver o dino! Calma, está tudo certo, isso era pra acontecer mesmo. Onde a gente encaixou o bloco de criar o cacto? Dentro do A cada quadro do jogo. E o que você aprendeu na Aula 2 sobre o A cada quadro? Que ele roda 60 vezes por segundo. Então a gente pediu pro jogo criar um cacto 60 vezes por segundo. Em três segundinhos são quase duzentos cactos. O computador fez exatamente o que você mandou. Ele é obediente demais. Passo 2 feito, com avalanche e tudo. O terceiro passo é justamente consertar isso, e o conserto é uma das peças mais úteis que existem.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Dê um intervalo aos nascimentos

**Por que aqui:** Isolar o tempo de nascimento antes de introduzir posição ou velocidade.

**Foco:** Comparar criação a cada quadro e criação com relógio.

**Fala de ligação / orientação ao aluno:** “Compare os nascimentos a cada quadro. Depois ligue o relógio e observe o espaço entre os cactos.”

**Experiência nativa:** spawn. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Criação em cada quadro; Criação com intervalo.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, oferecer continuar ou rever; não acrescentar outra missão.

### Monte os dois ritmos do jogo

**Por que aqui:** Aplicar o resultado com dois contêineres irmãos na área Repetições.

**Foco:** Criar periodicamente, mover e desenhar continuamente.

**Fala de ligação / orientação ao aluno:** “Dentro de Enquanto estiver rodando, coloque A cada 1,4 segundos ao lado de A cada quadro. No relógio, crie o cacto em x 400, tamanho 44 e velocidade -5. No quadro, depois de desenhar o Dino, atualize e desenhe o grupo cactos.”

**Fonte:** roteiro-aula-05-corre-dino.md → Parte 3. Passo 3: o relógio.

**Montagem:** Complementar o início da montagem: a criança ainda não copiou a avalanche. Reaproveitar a distinção entre criar no relógio e atualizar/desenhar no quadro.

**Na tela:** **Na tela:** Jogo 2D › Tempo e repetição, arrastar "A cada __ segundos fazer" para dentro do Enquanto estiver rodando, AO LADO do "A cada quadro do jogo"; mover o bloco de criar cacto para dentro dele; trocar o 2 por 1.4. Rodar.

**Trecho original selecionado, antes da edição:** O problema não é o bloco de criar o cacto, ele está certinho. O problema é onde ele está. A gente não quer um cacto a cada quadro. A gente quer um de vez em quando. Na categoria Jogo 2D, subcategoria Tempo e repetição, pega o bloco A cada tantos segundos, aquele que tem um numerinho no meio. Clica, segura, arrasta pra dentro da área Enquanto estiver rodando e solta ao lado do A cada quadro do jogo, com um espacinho. Repara bem: ao lado, não dentro. Os dois são vizinhos, cada um com o seu ritmo. O A cada quadro é rápido, sessenta vezes por segundo. Esse novo é lento, do jeito que você mandar. Agora o bloco de criar o cacto, que está lá no meio do A cada quadro, vai mudar de lugar. E lembra da Aula 2, quando a gente arrastou um bloco do meio e os de baixo vieram junto? Aqui é a mesma coisa: embaixo do criar o cacto estão o Atualizar e o Desenhar, e eles precisam ficar onde estão. Lá na Aula 2 a gente usou o botão direito, mas ali era pra apagar o bloco. Hoje é diferente: a gente quer mudar ele de lugar, e pra isso tem outro jeito. Segura a tecla Ctrl do teclado enquanto clica e arrasta. Com o Ctrl segurado, sai só o bloco que você clicou. Então: segura o Ctrl, pega o criar o cacto, arrasta ele pra fora e solta dentro do bloco novo. Solta o Ctrl e dá uma olhada: o Atualizar e o Desenhar continuam no A cada quadro, e o criar o cacto está lá dentro do bloco novo. Se vier tudo junto sem querer, aperta Ctrl+Z e tenta de novo. Esse bloco novo tem um campo só, o número de segundos, e vem com 2. Troca por 1.4. E ó, no Estúdio, número quebrado se escreve com ponto, não com vírgula: 1 ponto 4. Olha a tela agora. Que diferença, né? Agora nasce um cacto de vez em quando, do jeito que a gente queria. Esse bloco tem um nome, e vale lembrar: é o relógio. Ele serve pra fazer uma coisa acontecer no ritmo certo, em vez de acontecer sempre. E não é só pra cacto, não: relógio serve pra um inimigo aparecer, pra um item nascer, pro veneno tirar uma vida de tempo em tempo. É uma peça que você vai usar em muito jogo daqui pra frente. Passo 3 feito. Só que tem outra coisa esquisita acontecendo na sua tela. Bora pro quarto passo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Crie um cacto em x 400, tamanho 44 e velocidade -5 a cada 1,4 s.
- Atualize o grupo cactos a cada quadro, antes de desenhá-lo.
- Desenhe o grupo cactos a cada quadro.
- Mantenha apenas um bloco de criação de cacto.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Veja onde o cacto começa

**Por que aqui:** Recuperar coordenadas da aula 1 com uma finalidade concreta.

**Foco:** Relacionar x de nascimento à borda direita de 480.

**Fala de ligação / orientação ao aluno:** “A tela acaba em x 480. Em x 400, o cacto nasce dentro dela; em x 560, começa do lado de fora e entra andando.”

**Fonte:** roteiro-aula-05-corre-dino.md → Parte 4. Passo 4: nascer fora da tela.

**Montagem:** Reaproveitar a explicação de x e o resultado antes/depois. Separar nascimento fora da tela da questão do sinal da velocidade.

**Na tela:** Mostrar o retângulo 480 × 270 e uma faixa externa à direita. Marcar 400, 480 e 560 na mesma escala. Um cacto por vez; deixar sua posição externa visível só na demonstração.

**Trecho original selecionado, antes da edição:** Olha bem pra tela e presta atenção em onde os cactos estão aparecendo. Eles estão brotando do nada, ali pertinho da beirada da direita. Não é que eles entram vindo de fora: eles simplesmente aparecem, do jeito que um mágico faz surgir um coelho. Isso é porque o bloco veio com o x em 400. E lembra o tamanho da nossa tela? A gente colocou 480 de largura. Então o 400 é dentro da tela, quase na beirada, mas dentro. Nos jogos de verdade nunca é assim. Os obstáculos nascem fora da tela e entram andando, pro jogador ver eles chegando e ter tempo de reagir. Lembra disso: nascer fora da tela é uma regra que quem cria jogo segue sempre. Então troca o x de 400 para 560. Como a tela vai até 480, o 560 é bem depois da beirada direita, do lado de fora. Olha a tela: agora eles entram vindo da direita, deslizando. Ficou bem melhor. Agora o último ajuste desse bloco: o vx, que é a velocidade. Ele veio com menos 3. Troca por menos 5. E o que é esse vx exatamente? É quantos pixels o cacto anda a cada quadro. Pixel é aquele quadradinho miúdo da tela. Então menos 5 quer dizer: cinco pixels pra esquerda, a cada quadro. E como o quadro acontece 60 vezes por segundo, ele anda bastante. E por que menos, e não mais? Porque na tela o número que cresce vai pra direita. Então, pra ir pra esquerda, o número tem que diminuir. É por isso que a velocidade dele é negativa. Quanto mais negativo, mais rápido ele vem na sua direção. Ah, e o tamanho já vem 44, que é um tamanho bom pro cacto. Deixa assim. Passo 4 feito. Agora sim parece jogo. E o quinto passo é o melhor de todos: testar.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Faça o cacto entrar pela direita

**Por que aqui:** Uma mudança pequena consolida o significado de x.

**Foco:** Alterar somente a posição de nascimento.

**Fala de ligação / orientação ao aluno:** “No bloco de criar cacto, troque x 400 por 560. Mantenha tamanho 44, velocidade -5 e relógio 1,4.”

**Fonte:** roteiro-aula-05-corre-dino.md → Parte 4. Passo 4: nascer fora da tela.

**Montagem:** Usar apenas o gesto e a entrada suave; cortar a explicação já vista na demonstração.

**Na tela:** **Na tela:** apontar o cacto materializando perto da borda direita; trocar o x de 400 para 560; depois trocar o vx de -3 para -5. Rodar.

**Trecho original selecionado, antes da edição:** Olha bem pra tela e presta atenção em onde os cactos estão aparecendo. Eles estão brotando do nada, ali pertinho da beirada da direita. Não é que eles entram vindo de fora: eles simplesmente aparecem, do jeito que um mágico faz surgir um coelho. Isso é porque o bloco veio com o x em 400. E lembra o tamanho da nossa tela? A gente colocou 480 de largura. Então o 400 é dentro da tela, quase na beirada, mas dentro. Nos jogos de verdade nunca é assim. Os obstáculos nascem fora da tela e entram andando, pro jogador ver eles chegando e ter tempo de reagir. Lembra disso: nascer fora da tela é uma regra que quem cria jogo segue sempre. Então troca o x de 400 para 560. Como a tela vai até 480, o 560 é bem depois da beirada direita, do lado de fora. Olha a tela: agora eles entram vindo da direita, deslizando. Ficou bem melhor. Agora o último ajuste desse bloco: o vx, que é a velocidade. Ele veio com menos 3. Troca por menos 5. E o que é esse vx exatamente? É quantos pixels o cacto anda a cada quadro. Pixel é aquele quadradinho miúdo da tela. Então menos 5 quer dizer: cinco pixels pra esquerda, a cada quadro. E como o quadro acontece 60 vezes por segundo, ele anda bastante. E por que menos, e não mais? Porque na tela o número que cresce vai pra direita. Então, pra ir pra esquerda, o número tem que diminuir. É por isso que a velocidade dele é negativa. Quanto mais negativo, mais rápido ele vem na sua direção. Ah, e o tamanho já vem 44, que é um tamanho bom pro cacto. Deixa assim. Passo 4 feito. Agora sim parece jogo. E o quinto passo é o melhor de todos: testar.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Crie um cacto em x 560, tamanho 44 e velocidade -5 a cada 1,4 s.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Por que a velocidade é negativa?

**Por que aqui:** Preparar a interpretação dos números negativos exigida nas aulas 12 e 13.

**Foco:** Entender que diminuir x move para a esquerda.

**Fala de ligação / orientação ao aluno:** “Veja o x diminuir: 560, 555, 550. O -5 manda andar para a esquerda. O relógio continua igual.”

**Fonte:** roteiro-aula-05-corre-dino.md → Parte 5. Passo 5: testar.

**Montagem:** Aproveitar a comparação de velocidade gravada, com a régua como complemento. Cortar o convite a escolher livremente velocidade e intervalo; encerrar em -5 e 1,4.

**Na tela:** Três posições sobre uma régua horizontal; destacar a diferença -5 e a seta para a esquerda. Não variar intervalo, tamanho ou velocidade ao mesmo tempo.

**Trecho original selecionado, antes da edição:** Clica na área do jogo e joga! Agora sim: os cactos vêm da direita, um depois do outro, e você pula pra escapar. Ah, e por enquanto, se o dino encostar num cacto, ainda não acontece nada. Ele atravessa como fantasma. É de propósito, e é justamente o que a gente resolve lá na Aula 9. Agora vamos sentir o que dois números fazem com a dificuldade do jogo inteiro. Primeiro a velocidade. No bloco de criar o cacto, troca o vx de menos 5 pra menos 3 e joga um pouco: eles vêm devagar, dá até sono. Agora põe menos 9 e joga de novo: vêm voando, e você tem que acertar o tempo do pulo na hora exata. Agora o relógio. Troca o 1.4 por 0.8 e joga: vem cacto quase colado um no outro, bem difícil. Agora põe 2.5 e joga mais uma vez: vem um de vez em quando, bem espaçado. Repara no que a gente acabou de fazer: com dois numerozinhos, mexeu na dificuldade do jogo inteiro. Rápido e junto é difícil. Devagar e espaçado é fácil. Agora, antes de fechar, põe os dois de volta nos números do nosso jogo: o vx em menos 5 e o relógio em 1.4. Esses dois são os valores que as próximas aulas usam, então eles precisam voltar pro lugar. E não é frescura minha: lá na última aula do curso você vai criar uma caixinha que começa valendo menos 5, e ela tem que combinar com o vx do cacto. Se não combinar, o jogo muda de velocidade sem você pedir, e é bem difícil de descobrir por quê.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

## Conferência final e quiz

Observe dois cactos entrando pela direita. Eles andam para a esquerda, separados no tempo. A colisão ainda não termina a partida nesta aula.

**Critérios da entrega:**

- Crie o grupo cactos em Ao iniciar.
- Crie um cacto em x 560, tamanho 44 e velocidade -5 a cada 1,4 s.
- Atualize o grupo cactos a cada quadro, antes de desenhá-lo.
- Desenhe o grupo cactos a cada quadro.
- Mantenha apenas um bloco de criação de cacto.
- Deixe a criação fora de A cada quadro.

**O que deve acontecer a cada quadro?**

- Atualizar e desenhar os cactos. (correta)
- Criar um novo cacto sempre.

O relógio decide quando nasce; o quadro cuida dos que já existem.

**Se a tela termina em x 480, onde começa um cacto em x 560?**

- Fora da tela, à direita. (correta)
- No meio da tela.

560 fica além da borda direita.

**Por que usar velocidade -5?**

- Para diminuir x e andar para a esquerda. (correta)
- Para fazer o cacto nascer a cada cinco segundos.

Velocidade e intervalo são propriedades diferentes.

## Orientação ao professor e à edição

- Não obrigar a criança a montar a avalanche: observar e experimentar já mostram a causa.
- Conservar 1,4 segundo, x 560 e velocidade -5 como estado de saída para as próximas aulas.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 7a103a2dd829c7795d691ef38ec384b3da742f02566db055e311358df080352d. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).
