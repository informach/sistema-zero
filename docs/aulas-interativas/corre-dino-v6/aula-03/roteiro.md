# aula-03 — Pular e voltar: gravidade e impulso

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Hoje o Dino vai saltar e voltar ao chão. Primeiro vamos descobrir por que ele ainda não consegue pular.

**Saída esperada:** O Dino recebe gravidade antes do controle e pula com força 14.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Hoje o Dino vai saltar e voltar ao chão. Primeiro vamos descobrir por que ele ainda não consegue pular. |
| 2. Dê o comando de pulo | application | Adicionar controle e reconhecer o estado inicial suspenso. |
| 3. O que faz o Dino voltar? | exploration | Comparar a trajetória com e sem aplicar gravidade. |
| 4. Traga o Dino para o chão | application | Aplicar gravidade antes do controle a cada quadro. |
| 5. O que muda a altura? | exploration | Comparar dois impulsos mantendo a mesma gravidade. |
| 6. Prepare o salto do seu jogo | application | Fixar uma força adequada ao percurso que será construído. |
| 7. Teste e entregue sua construção | delivery | O Dino recebe gravidade antes do controle e pula com força 14. |
| 8. Veja o que você aprendeu | closing | O Dino recebe gravidade antes do controle e pula com força 14. |
| 9. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Dê o comando de pulo

**Por que aqui:** O sintoma real do roteiro motiva a gravidade: este Dino ainda não está apoiado.

**Foco:** Adicionar controle e reconhecer o estado inicial suspenso.

**Fala de ligação / orientação ao aluno:** “Coloque Controlar o dinossauro antes de desenhá-lo. Selecione dino e deixe a força 15 por enquanto. Ao testar, ele ainda não pula: falta chegar ao chão.”

**Fonte:** roteiro-aula-03-corre-dino.md → Parte 1. Passo 1: dar o comando de pulo ao dino.

**Montagem:** Preservar o Dino flutuando e parado; não substituir pelo salto sem retorno do modelo simplificado.

**Na tela:** **Na tela:** categoria "Jogo 2D", subcategoria "Kit dino", arrastar "Controlar o dinossauro" pra dentro do "A cada quadro do jogo", logo abaixo de "Desenhar fundo de floresta" e logo acima de "Desenhar o sprite dino". Deixar a força do pulo em 15. Aproximar o zoom no dino pra mostrar a pose travada e os pés no ar. Apertar espaço e a seta pra cima várias vezes, mostrando que nada acontece.

**Trecho original selecionado, antes da edição:** Na categoria Jogo 2D, subcategoria Kit dino, pega o bloco Controlar o dinossauro. Clica, segura, arrasta pra dentro do loop A cada quadro do jogo e encaixa logo abaixo do Desenhar fundo de floresta e logo acima do Desenhar o sprite dino, até dar o cliquinho. Ele tem dois campos. O primeiro é o nome do sprite, e já vem escrito dino, que é justo o nome que você deu ao seu dinossauro na Aula 1. Confere se está dino e deixa assim. O segundo é o número da força do pulo, que decide a altura do salto: vem com 15, e por enquanto deixa em 15, que no fim da aula a gente brinca com ele. Agora olha a área do jogo, porque uma coisa esquisita aconteceu. O dino parou de correr. As perninhas dele congelaram, e ele ficou com aquela cara de quem está no meio de um pulo, só que parado. Ele está lá, no mesmo lugar, sem se mexer. E aperta o espaço. Nada. Aperta a seta pra cima. Nada de novo. Espera, mas eu não acabei de encaixar o bloco do comando? Encaixou. O bloco está lá e ele está funcionando. O problema é outro, e ele está na tela, na frente dos seus olhos: olha os pés do dino. Os pés dele não estão encostando na grama. Tem um espacinho ali embaixo. Ele está flutuando. E é por isso que ele ficou com essa cara. Pro jogo, o dino está no ar, no meio de um pulo que nunca acaba. Por isso as perninhas pararam: quem está no ar não corre, quem está no ar está voando. E agora vem a parte mais importante do dia, então presta atenção nesta frase: ninguém consegue pular sem ter chão embaixo do pé. Pensa em você. Pra pular, você dobra o joelho, empurra o chão e sobe. Se você estivesse boiando no meio do ar, sem nada embaixo, você ia empurrar o quê? Nada. Não tem como pular. O seu dino está exatamente assim. O comando de pular está montado e funcionando, mas ele não tem em que se apoiar. Passo 1 feito, e ele te deu o problema de bandeja. Falta uma coisa nesse jogo, e é ela que vai trazer o dino pro chão.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Controle o dino com força 15, antes de desenhá-lo.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### O que faz o Dino voltar?

**Por que aqui:** Isolar a ação da gravidade sem acrescentar força variável.

**Foco:** Comparar a trajetória com e sem aplicar gravidade.

**Fala de ligação / orientação ao aluno:** “Este exemplo já dá um impulso ao Dino. Compare a subida sem gravidade com a volta ao chão quando você liga a gravidade. No seu projeto, ele primeiro precisa cair até o chão.”

**Experiência nativa:** gravity. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Subida sem aplicar gravidade; Volta ao chão com gravidade.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Traga o Dino para o chão

**Por que aqui:** Voltar do modelo à correção concreta e aos controles reais.

**Foco:** Aplicar gravidade antes do controle a cada quadro.

**Fala de ligação / orientação ao aluno:** “Antes de Controlar o dinossauro, coloque Aplicar gravidade ao sprite dino. Teste espaço, seta para cima e toque na parte de cima do jogo.”

**Fonte:** roteiro-aula-03-corre-dino.md → Parte 2. Passo 2: a gravidade traz o dino pro chão.

**Montagem:** Preservar a queda inicial, o pouso e o primeiro pulo. Relembrar y crescendo para baixo em uma frase, sem abrir outra aula de coordenadas.

**Na tela:** **Na tela:** categoria "Jogo 2D", subcategoria "Movimento", arrastar "Aplicar a gravidade do mundo ao sprite" e encaixar logo ACIMA do "Controlar o dinossauro". Mostrar o campo escrito "jogador", clicar e trocar pra "dino". Mostrar o dino descendo, pousando na grama e as perninhas voltando a correr. Depois pular com espaço, com a seta pra cima, com o clique na parte de cima da área do jogo, e abaixar com a seta pra baixo e com o clique segurado embaixo. Cartela ilustrando a bolinha subindo, perdendo força, parando no alto e voltando.

**Trecho original selecionado, antes da edição:** Ainda na categoria Jogo 2D, mas agora numa gaveta nova: a subcategoria Movimento. Pega ali o bloco Aplicar a gravidade do mundo ao sprite. Clica, segura, arrasta pra dentro do A cada quadro do jogo e encaixa ele logo acima do Controlar o dinossauro, entre o Desenhar fundo de floresta e ele. Esse bloco tem um campo só, o nome do sprite, e ele nasce escrito jogador. Igualzinho ao Desenhar o sprite lá da Aula 2, lembra? O Estúdio não sabe qual bicho você quer, então ele chuta um nome. Clica nesse campo e troca pra dino. Agora olha a área do jogo. Ele desceu! Encostou na grama, e as perninhas voltaram a correr. O seu dino está pisando no chão pela primeira vez. Clica na área do jogo e aperta a barra de espaço. Pulou! E olha o que ele fez: subiu, foi perdendo força, parou lá no alto um tiquinho, e voltou pro chão sozinho. Aperta de novo pra ver. Esse bloco que você acabou de encaixar tem um nome de gente grande, e ele está escrito ali: gravidade. Sabe quando você joga uma bolinha pra cima? Ela sobe, vai perdendo força, para lá no alto e volta caindo. A força que puxa ela de volta é a gravidade. É a mesma que faz a sua bola cair, a mesma que segura você no chão, e agora é a mesma que existe dentro do seu jogo, porque você colocou ela lá. Repara que ela faz as duas coisas de uma vez. Foi ela que trouxe o dino pra grama, e é ela que traz o dino de volta depois de cada pulo. Sem ela, o dino subia e ia embora pra sempre, e nunca mais voltava. E repara também: esse bloco não tem número nenhum. A força é do mundo do seu jogo, quer dizer, ela é igualzinha pra qualquer coisa que use ela, e você não regula ela por bicho. Mas presta atenção nesta parte, que é esperta: a gravidade só age em quem recebe esse bloco. Hoje só o seu dino recebeu, então só ele cai. Se amanhã você puser uma coisa voadora no seu jogo, ela não vai cair sozinha, e isso é ótimo, porque nem tudo dentro de um jogo tem que obedecer à gravidade. Agora que o pulo funciona, tenta os outros jeitos de pular, porque não é só o espaço. Aperta a seta pra cima: pula igual. Usa a que for mais confortável pra sua mão. E o teclado não é o único jeito de mandar no dino. Clica com o mouse na parte de cima da área do jogo: ele pula também. Isso é ótimo, porque no celular e no tablet não tem teclado, e encostar o dedo em cima faz a mesma coisa. Quando você for mostrar o seu jogo pra alguém no celular, já vai funcionar. E tem mais uma coisa que o Controlar o dinossauro sabe fazer. Aperta a seta pra baixo e segura: o dino se abaixa e fica pequenininho. Solta a tecla e ele levanta. Com o mouse dá também: clica e segura lá embaixo, em cima do dino, e ele abaixa do mesmo jeito. No Corre, Dino! só vem cacto no chão, então abaixar não vai resolver nada aqui. Mas lembra disso: se um dia você colocar um pássaro voando alto no seu jogo, o seu dino já sabe passar por baixo dele. Passo 2 feito, e olha a diferença: o seu dino te obedece. Falta o terceiro, que é o mais divertido.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Aplique gravidade ao dino antes do controle do pulo.
- Controle o dino com força 15, antes de desenhá-lo.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### O que muda a altura?

**Por que aqui:** Só introduzir o segundo parâmetro depois de estabilizar a explicação da gravidade.

**Foco:** Comparar dois impulsos mantendo a mesma gravidade.

**Fala de ligação / orientação ao aluno:** “Agora a gravidade fica igual. Faça um salto, aumente o impulso e compare as marcas de altura.”

**Experiência nativa:** impulse. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Um salto completo; Outra altura com a mesma gravidade.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Prepare o salto do seu jogo

**Por que aqui:** Encerrar a comparação com uma configuração comum para as próximas aulas.

**Foco:** Fixar uma força adequada ao percurso que será construído.

**Fala de ligação / orientação ao aluno:** “No seu jogo, deixe a força do pulo em 14. Teste um salto completo: subir, descer e pousar.”

**Fonte:** roteiro-aula-03-corre-dino.md → Parte 3. Passo 3: você escolhe a altura.

**Montagem:** Pode reaproveitar a comparação gravada de 2 e 30 como demonstração breve no clipe. Substituir a escolha livre de 12 a 18 pelo fechamento em 14; não alegar equivalência numérica com o laboratório.

**Na tela:** **Na tela:** trocar a força do pulo pra 2, clicar na área do jogo e pular; depois pra 30 e pular, mostrando o dino saindo da tela e o tempo que demora pra voltar. Por fim, deixar em 14 e testar pular por cima de um cacto imaginário.

**Trecho original selecionado, antes da edição:** O bloco do comando está montado, mas tem um número lá dentro que eu ainda não expliquei: a força do pulo, que veio em 15. Pra entender o que ele faz, a gente vai nos extremos. Põe 2 na força do pulo, clica na área do jogo e pula. O coitado do dino mal descola do chão, né? Dá um pulinho de nada, e um cacto ia passar por cima dele. Agora põe 30 e pula de novo. Agora ele vai parar lá em cima, some da tela e demora uma eternidade pra voltar. Repara que ele volta, viu, e quem traz ele de volta é a gravidade que você encaixou no passo 2. Só que se um cacto viesse nessa hora, você estaria no ar sem ver nada. Nenhum dos dois presta pra jogar. Então o número bom está no meio do caminho. Põe 14 e pula: agora sim. Ele sobe o suficiente pra passar por cima de um cacto e volta rápido pro chão, pronto pro próximo. O 14 é o número do meu jogo. Testa uns entre 12 e 18 e para naquele que te deu mais vontade de jogar, que o seu pode ser outro. E lembra desse jeito de trabalhar, porque ele é de gente que cria jogo de verdade: exagera pra um lado, exagera pro outro, e aí você entende o que o número faz. Depois é só escolher o ponto certo, no meio. Isso vale pra qualquer número de qualquer jogo, e você vai usar isso o curso inteiro.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Aplique gravidade ao dino antes do controle do pulo.
- Controle o dino com força 14, antes de desenhá-lo.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Execute e faça um salto com teclado e outro com toque. O Dino deve voltar ao chão; a floresta continua atrás dele.

**Critérios da entrega:**

- Aplique gravidade ao dino antes do controle do pulo.
- Controle o dino com força 14, antes de desenhá-lo.
- Desenhe o sprite dino dentro de A cada quadro.
- Desenhe a floresta com velocidade 5 antes do Dino.

**Com a mesma gravidade, um impulso maior tende a fazer o quê?**

- Produzir um salto mais alto. (correta)
- Mudar a cor do Dino.

A comparação isolou o impulso inicial.

**Que ação faz o Dino cair de volta?**

- Aplicar gravidade ao personagem. (correta)
- Desenhar a floresta por último.

Gravidade muda o movimento; desenho muda a imagem.

**Qual ordem usamos no quadro?**

- Gravidade, controle, desenho. (correta)
- Desenho, controle, gravidade.

Calculamos o movimento antes de mostrar o personagem.

## Orientação ao professor e à edição

- Cortar o convite a testar agachamento para pássaros nesta aula; o objetivo é o salto.
- O modelo de gravidade é ilustrativo. O sintoma inicial do Estúdio é flutuar sem conseguir pular, não sair voando.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 98f59a849d4d2f0fb36aa23422de7cb453cb6bf39057665cdfc4fac573495b3b. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).
