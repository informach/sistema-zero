# aula-02 — O Dino aparece: quadros, limpeza e camadas

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Seu Dino foi criado e ainda está invisível. Hoje vamos desenhá-lo e pôr a floresta atrás dele.

**Saída esperada:** O Dino corre no lugar diante da floresta. A descrição e a criação permanecem; a borda provisória saiu.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Seu Dino foi criado e ainda está invisível. Hoje vamos desenhá-lo e pôr a floresta atrás dele. |
| 2. Veja como desenhos viram movimento | demonstration | Distinguir um quadro da repetição de quadros. |
| 3. Monte o motor do jogo | application | Separar preparação de repetição. |
| 4. Faça o Dino aparecer | application | Conectar o desenho ao personagem criado. |
| 5. Limpe antes de desenhar | application | Começar um quadro sem resíduos do anterior. |
| 6. O que aconteceu com o Dino? | demonstration | Perceber que um desenho posterior pode cobrir outro. |
| 7. Quem fica na frente? | exploration | Trocar apenas a ordem de dois desenhos e observar a sobreposição. |
| 8. Organize as camadas do seu jogo | application | Transferir a descoberta para a pilha real de desenho. |
| 9. Retire só a peça provisória | application | Apagar uma peça do meio preservando as demais. |
| 10. Teste e entregue sua construção | delivery | O Dino corre no lugar diante da floresta. A descrição e a criação permanecem; a borda provisória saiu. |
| 11. Veja o que você aprendeu | closing | O Dino corre no lugar diante da floresta. A descrição e a criação permanecem; a borda provisória saiu. |
| 12. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Veja como desenhos viram movimento

**Por que aqui:** A criança precisa visualizar repetição antes de receber a área nova.

**Foco:** Distinguir um quadro da repetição de quadros.

**Fala de ligação / orientação ao aluno:** “Veja três desenhos das pernas, primeiro separados e depois em sequência. Cada desenho é um quadro.”

**Fonte:** roteiro-aula-02-corre-dino.md → Parte 1. Passo 1: ligar o motor do jogo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Usar a analogia do caderno; não repetir a montagem que vem na próxima seção.

**Na tela:** Cartela com três poses do Dino, contador de quadros e reprodução curta. Mostrar um quadro por vez, sem controles de velocidade. Com movimento reduzido, trocar por cartões numerados.

**Trecho original selecionado, antes da edição:** Você já viu um daqueles livrinhos de folhear, que tem um desenho em cada página, e quando você passa as páginas bem rápido o bonequinho parece que se mexe? Cada página é um desenho um tiquinho diferente da anterior. Pois é exatamente assim que um jogo funciona. Um jogo é um filme que vai sendo desenhado na hora, uma página de cada vez. No cinema, as páginas já estão prontas. No jogo não: o computador olha como as coisas estão agora, e desenha uma página nova. E de novo. E de novo. Umas 60 vezes por segundo. E cada uma dessas páginas tem um nome: quadro. Lembra dessa palavra, porque ela vai voltar o curso inteiro. Movimento, num jogo, é ilusão: é a mesma figura desenhada um tiquinho mais pra lá a cada quadro. E quem faz essa ilusão é você.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Monte o motor do jogo

**Por que aqui:** Uma área nova e um único bloco vazio formam uma primeira montagem pequena.

**Foco:** Separar preparação de repetição.

**Fala de ligação / orientação ao aluno:** “Ao lado de Ao iniciar, coloque a área Enquanto estiver rodando. Dentro dela, encaixe A cada quadro do jogo.”

**Fonte:** roteiro-aula-02-corre-dino.md → Parte 1. Passo 1: ligar o motor do jogo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar o gesto de colocar as áreas lado a lado e o contêiner ainda vazio.

**Na tela:** **Na tela:** primeiro a categoria "Áreas do projeto": pegar o bloco "Enquanto estiver rodando" e soltar ao lado do "Ao iniciar", com um espacinho, mostrando que ficam lado a lado e nunca uma dentro da outra. Depois Jogo 2D › Tempo › Quadros e intervalos, arrastar "A cada quadro do jogo" para dentro dela, ainda vazia.

**Trecho original selecionado, antes da edição:** Pra fazer isso, o seu jogo precisa de uma área nova. Vai lá na categoria Áreas do projeto e pega o bloco Enquanto estiver rodando. Arrasta e solta ao lado do Ao iniciar, com um espacinho entre os dois. Repara que elas ficam lado a lado, nunca uma dentro da outra. A Ao iniciar, você lembra, roda uma vez só e acabou. Essa aqui não: o que estiver dentro dela fica repetindo sem parar, o tempo todo, enquanto o jogo estiver ligado. Por isso o nome, enquanto estiver rodando. Ela é o motor do seu jogo. Na categoria Jogo 2D, subcategoria Tempo e repetição, pega o bloco A cada quadro do jogo. Clica, segura, arrasta pra dentro do Enquanto estiver rodando, que está vazia, e solta. Ele vai ser o único bloco lá dentro. Faz sentido ele morar aí: desenhar quadro atrás de quadro é justamente repetir sem parar. Esse bloco é a parte mais importante do jogo, e tem um nome que os criadores usam: o loop, a parte que roda de novo e de novo, sem parar. Esse bloco não tem campo nenhum pra mexer, tem um espaço aberto dentro. Tudo que a gente colocar lá vai acontecer a cada quadro, sessenta vezes por segundo. O motor está ligado, e vazio. É isso que o segundo passo resolve: encher ele, desenhando o mundo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Encaixe A cada quadro dentro de Enquanto estiver rodando.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Faça o Dino aparecer

**Por que aqui:** Entregar logo o primeiro resultado visível, antes de discutir defeitos.

**Foco:** Conectar o desenho ao personagem criado.

**Fala de ligação / orientação ao aluno:** “Dentro de A cada quadro, coloque Desenhar o sprite. Selecione dino e veja-o aparecer.”

**Fonte:** roteiro-aula-02-corre-dino.md → Parte 2. Passo 2: desenhar o mundo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter o aparecimento. Na trilha revisada usamos dino como identificador; retirar o parágrafo sobre nomes diferentes.

**Na tela:** **Na tela:** (no fim da Parte, a sequência das ferramentas: arrastar o "Mostrar a borda da tela" pra lixeira do jeito normal e mostrar os três blocos indo junto; apertar Ctrl+Z e mostrar os três voltando; depois botão direito no bloco, menu de contexto aberto, escolher "Apagar este bloco" e mostrar a pilha se fechando sozinha). Dentro do "A cada quadro do jogo", encaixar primeiro só "Desenhar o sprite dino" (Sprites, trocando "jogador" por "dino") e rodar; depois encaixar "Limpar a tela" (Aparência) no topo; depois encaixar "Desenhar fundo de floresta" (Kits prontos › Dino, trocar 4 por 5) **abaixo** do dino, de propósito, e rodar (o dino some); por fim mover a floresta para o meio, na ordem certa.

**Trecho original selecionado, antes da edição:** Agora a gente enche o motor. E eu vou fazer com você numa ordem meio esquisita de propósito, porque tem duas coisas importantes que você só entende vendo dar errado. Começa pelo dino. Na categoria Jogo 2D, subcategoria Sprites, pega o bloco Desenhar o sprite. Clica, segura, arrasta pra dentro do A cada quadro do jogo, que está vazio, e encaixa até dar o cliquinho. Ele tem um campo só, o nome do sprite, e vem escrito jogador. Clica ali e abre uma listinha com os sprites que existem no seu jogo. O meu está escrito dino, então é nele que eu clico. E aqui vale o lembrete da aula passada: se você deu outro nome pro seu dinossauro, é ele que vai estar na lista, e é nele que você clica. Eu vou continuar falando dino o curso inteiro, porque o meu se chama assim, mas toda vez que eu disser dino, você procura o nome que você escolheu. Olha a área do jogo, ali do lado: apareceu! Aquela pergunta do fim da Aula 1, cadê o dino, era isso: criar é uma coisa, desenhar é outra. Na Aula 1 você criou ele, e agora o jogo está desenhando ele a cada quadro.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Desenhe o sprite dino dentro de A cada quadro.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Limpe antes de desenhar

**Por que aqui:** O rastro real só pode ser observado antes de entrar a floresta.

**Foco:** Começar um quadro sem resíduos do anterior.

**Fala de ligação / orientação ao aluno:** “Olhe as perninhas. Coloque Limpar a tela antes de Desenhar o sprite e compare.”

**Fonte:** roteiro-aula-02-corre-dino.md → Parte 2. Passo 2: desenhar o mundo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter o zoom no rastro sutil; não fabricar um borrão enorme. Preservar a explicação de por que limpar fica mesmo quando o fundo cobre tudo.

**Na tela:** **Na tela:** (no fim da Parte, a sequência das ferramentas: arrastar o "Mostrar a borda da tela" pra lixeira do jeito normal e mostrar os três blocos indo junto; apertar Ctrl+Z e mostrar os três voltando; depois botão direito no bloco, menu de contexto aberto, escolher "Apagar este bloco" e mostrar a pilha se fechando sozinha). Dentro do "A cada quadro do jogo", encaixar primeiro só "Desenhar o sprite dino" (Sprites, trocando "jogador" por "dino") e rodar; depois encaixar "Limpar a tela" (Aparência) no topo; depois encaixar "Desenhar fundo de floresta" (Kits prontos › Dino, trocar 4 por 5) **abaixo** do dino, de propósito, e rodar (o dino some); por fim mover a floresta para o meio, na ordem certa.

**Trecho original selecionado, antes da edição:** Agora chega perto da tela e olha as perninhas dele correndo. Repara que sobra um rastrinho, como se ficasse um restinho da perna anterior. É porque ninguém está apagando o desenho de antes. Cada quadro novo é pintado por cima do quadro velho, e o velho continua ali embaixo. Como o dino não sai do lugar, sobra só essa sujeira nas perninhas. Mas imagina se ele atravessasse a tela: ia deixar um rastro de dino do começo ao fim, igual pincel arrastado. Ainda na categoria Jogo 2D, subcategoria Aparência, pega o bloco Limpar a tela. Clica, segura, arrasta pro topo do A cada quadro do jogo, logo acima do Desenhar o sprite, e encaixa. Ele não tem campo nenhum pra mexer. É a lousa mágica: apaga tudo pro quadro novo começar do zero. Olha as perninhas agora: limpas. Daqui a pouco a floresta entra no jogo, e ela pinta a tela inteira a cada quadro. Ou seja: acaba apagando o quadro velho junto, meio sem querer. Depois que ela entrar, se você tirar o Limpar a tela quase não vai ver diferença neste jogo. Mas ele fica, e o motivo é este: nem todo jogo tem um fundo que pinta a tela inteira. No dia que você fizer um jogo com uns desenhos soltos num fundo vazio, o rastro vai aparecer com força e você vai perder um tempão procurando o motivo. Então lembra dessa regra, que vale na grande maioria dos jogos que você vai fazer: cada quadro começa com a tela limpa. O Limpar a tela é sempre o primeiro bloco do loop, por hábito, não por emergência.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Limpe a tela antes de desenhar o Dino.
- Desenhe o sprite dino dentro de A cada quadro.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### O que aconteceu com o Dino?

**Por que aqui:** A ordem errada é mostrada no exemplo pronto; a criança não precisa copiar uma montagem errada para prosseguir.

**Foco:** Perceber que um desenho posterior pode cobrir outro.

**Fala de ligação / orientação ao aluno:** “Observe: o Dino continua criado, mas a floresta desenhada depois cobre ele. Vamos comparar as duas ordens em um exemplo separado.”

**Fonte:** roteiro-aula-02-corre-dino.md → Parte 2. Passo 2: desenhar o mundo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Parar antes da explicação e antes do conserto. Mostrar as duas peças e destacar a última, sem pedir à criança que monte a ordem errada.

**Na tela:** **Na tela:** (no fim da Parte, a sequência das ferramentas: arrastar o "Mostrar a borda da tela" pra lixeira do jeito normal e mostrar os três blocos indo junto; apertar Ctrl+Z e mostrar os três voltando; depois botão direito no bloco, menu de contexto aberto, escolher "Apagar este bloco" e mostrar a pilha se fechando sozinha). Dentro do "A cada quadro do jogo", encaixar primeiro só "Desenhar o sprite dino" (Sprites, trocando "jogador" por "dino") e rodar; depois encaixar "Limpar a tela" (Aparência) no topo; depois encaixar "Desenhar fundo de floresta" (Kits prontos › Dino, trocar 4 por 5) **abaixo** do dino, de propósito, e rodar (o dino some); por fim mover a floresta para o meio, na ordem certa.

**Trecho original selecionado, antes da edição:** Agora falta a floresta. Ainda na categoria Jogo 2D, subcategoria Kit dino, pega o bloco Desenhar fundo de floresta. Clica, segura, arrasta e encaixa por último, logo abaixo do Desenhar o sprite. Ele tem um campo só, a velocidade, e vem com 4. Troca por 5. Olha o seu jogo e me diz: cadê o dino? Sumiu! Ele estava aí agorinha.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Quem fica na frente?

**Por que aqui:** A criança acabou de ver o desaparecimento e agora pode testar sua causa.

**Foco:** Trocar apenas a ordem de dois desenhos e observar a sobreposição.

**Fala de ligação / orientação ao aluno:** “Neste exemplo, compare Floresta depois do Dino e Dino depois da Floresta. Só a ordem muda.”

**Experiência nativa:** layers. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Floresta na frente; Dino na frente.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Organize as camadas do seu jogo

**Por que aqui:** Aplicação imediatamente depois da comparação, sem outra demonstração repetida.

**Foco:** Transferir a descoberta para a pilha real de desenho.

**Fala de ligação / orientação ao aluno:** “Coloque a floresta com velocidade 5 entre Limpar a tela e Desenhar o sprite. Arraste a peça, sem duplicar.”

**Fonte:** roteiro-aula-02-corre-dino.md → Parte 2. Passo 2: desenhar o mundo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Acrescentar a entrada mostrando a floresta ainda na paleta, pois a ordem errada só apareceu na demonstração. Preservar o gesto de encaixe e a fronteira do palco.

**Na tela:** **Na tela:** (no fim da Parte, a sequência das ferramentas: arrastar o "Mostrar a borda da tela" pra lixeira do jeito normal e mostrar os três blocos indo junto; apertar Ctrl+Z e mostrar os três voltando; depois botão direito no bloco, menu de contexto aberto, escolher "Apagar este bloco" e mostrar a pilha se fechando sozinha). Dentro do "A cada quadro do jogo", encaixar primeiro só "Desenhar o sprite dino" (Sprites, trocando "jogador" por "dino") e rodar; depois encaixar "Limpar a tela" (Aparência) no topo; depois encaixar "Desenhar fundo de floresta" (Kits prontos › Dino, trocar 4 por 5) **abaixo** do dino, de propósito, e rodar (o dino some); por fim mover a floresta para o meio, na ordem certa.

**Trecho original selecionado, antes da edição:** Então é só arrumar a ordem: arrasta a floresta pra ficar no meio, logo abaixo do Limpar a tela e logo acima do Desenhar o sprite. Arrasta mesmo, não copia. Agora olha a tela. E repara numa coisa: a floresta pintou só o que está dentro da borda. Ela para certinho onde a telinha do jogo termina, e o espaço em volta continua da cor que você escolheu na Aula 1.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Limpe a tela antes de desenhar a floresta.
- Desenhe a floresta com velocidade 5 antes do Dino.
- Desenhe o sprite dino dentro de A cada quadro.
- Use uma única floresta.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Retire só a peça provisória

**Por que aqui:** O vídeo já demonstra erro, desfazer e comando correto; não precisa de um laboratório adicional.

**Foco:** Apagar uma peça do meio preservando as demais.

**Fala de ligação / orientação ao aluno:** “Use Apagar este bloco na borda. Confira se a descrição e a criação do Dino continuam em Ao iniciar.”

**Fonte:** roteiro-aula-02-corre-dino.md → Parte 2. Passo 2: desenhar o mundo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar Ctrl+Z e o menu de contexto. Em tela de toque, complementar com a forma de abrir o menu usada pelo Estúdio atual. Não exigir que a criança apague três blocos de propósito.

**Na tela:** **Na tela:** (no fim da Parte, a sequência das ferramentas: arrastar o "Mostrar a borda da tela" pra lixeira do jeito normal e mostrar os três blocos indo junto; apertar Ctrl+Z e mostrar os três voltando; depois botão direito no bloco, menu de contexto aberto, escolher "Apagar este bloco" e mostrar a pilha se fechando sozinha). Dentro do "A cada quadro do jogo", encaixar primeiro só "Desenhar o sprite dino" (Sprites, trocando "jogador" por "dino") e rodar; depois encaixar "Limpar a tela" (Aparência) no topo; depois encaixar "Desenhar fundo de floresta" (Kits prontos › Dino, trocar 4 por 5) **abaixo** do dino, de propósito, e rodar (o dino some); por fim mover a floresta para o meio, na ordem certa.

**Trecho original selecionado, antes da edição:** E aí, olha só: agora a própria floresta mostra onde a telinha começa e termina. Quer dizer que a borda já fez o trabalho dela e não precisa mais ficar. Vamos tirar ela, e aqui você vai aprender três coisas do Estúdio que servem pro curso inteiro. Olha o que acontece se eu simplesmente arrastar ela pra lixeira. Clico nela, seguro, arrasto... Foram três blocos. O Descrever o jogo e o Criar dinossauro vieram junto, grudados. É assim que o Estúdio funciona: quando você arrasta um bloco, todos os que estão embaixo dele vêm junto. E o Mostrar a borda da tela estava bem no meio da pilha. Calma que não perdi nada, e essa é a primeira coisa que eu quero te ensinar. Aperta Ctrl e Z ao mesmo tempo no teclado. Olha lá: os três voltaram pro lugar. Esse é o atalho de desfazer, e ele desfaz a última coisa que você fez. Lembra dele, porque é o que te salva quando alguma coisa sair errada, e vale pro curso inteiro. Agora a segunda coisa, que é o jeito certo de tirar um bloco do meio: clica com o botão direito do mouse em cima do Mostrar a borda da tela. Abre um menuzinho, e ali você escolhe Apagar este bloco. Pronto: só ele saiu, e a pilha se fechou sozinha, como se ele nunca tivesse estado ali. Confere aí se o Descrever o jogo e o Criar dinossauro continuam no seu Ao iniciar. O retângulo continua lá, marcado pela floresta, e o seu jogo ficou limpo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Retire a borda provisória da tela.
- Mantenha o dinossauro criado em Ao iniciar.
- Mantenha a descrição do jogo em Ao iniciar.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Execute: o Dino deve aparecer na frente da floresta, com as pernas animadas. Ele fica no mesmo lugar; a floresta é que passa.

**Critérios da entrega:**

- Desenhe o sprite dino dentro de A cada quadro.
- Limpe a tela antes de desenhar a floresta.
- Desenhe a floresta com velocidade 5 antes do Dino.
- Retire a borda provisória da tela.
- Mantenha o dinossauro criado em Ao iniciar.
- Mantenha a descrição do jogo em Ao iniciar.

**Quem aparece por cima quando dois desenhos ocupam o mesmo lugar?**

- O que é desenhado por último. (correta)
- O que foi criado primeiro.

A ordem do desenho determina as camadas.

**Por que repetir o desenho a cada quadro?**

- Para atualizar a imagem que vemos. (correta)
- Para criar outro Dino a cada quadro.

A criação ocorreu em Ao iniciar; o mesmo personagem é redesenhado.

**Como retirar a borda sem apagar o Dino?**

- Usar Apagar este bloco na borda. (correta)
- Arrastar a borda e toda a pilha para a lixeira.

Apagar apenas a peça preserva as que estão abaixo.

## Orientação ao professor e à edição

- Parte 3: aproveitar a ilusão de movimento no fechamento; retirar a exploração livre das velocidades 2 e 9 e manter 5.
- Nomes dos identificadores ficam canônicos na trilha guiada; a cor do Dino pode ser escolhida.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: c93882dd5de5ee1c27966f6c98e86bf301e5066acc3d059cf1c07cf38a8bd2a1. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).

## Blocos e gravação no Estúdio atual

Edição: jogo-2d-1.0-documento-2.

Use os endereços abaixo ao gravar os gestos e a narração. As falas e âncoras identificadas como originais documentam a gravação anterior. Capture a paleta atual e substitua as indicações de localização antigas antes de publicar a aula.

No seletor Tocar efeito, escolha pulo, tiro, explosão ou derrota conforme a ação. O som fica no evento ou na colisão que o dispara. Preparar o jogo continua em Ao iniciar; seus eventos e relógios ficam nas áreas indicadas no passo a passo.

Confira com o perfil de aluno: abrir a aula, encontrar cada peça, montar, testar, conferir os critérios, guardar, reabrir e continuar na aula seguinte. Nas aulas de publicação, teste também Fazer minha versão e a edição da cópia.

| Bloco | Onde encontrar | O que faz |
| --- | --- | --- |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto | Repete enquanto o projeto estiver rodando. |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto | Roda ao abrir ou a cada nova partida. |
| Limpar a tela | Jogo 2D › Desenho e efeitos › Efeitos | Apaga tudo o que foi desenhado. Use no começo de cada quadro, antes de desenhar de novo. |
| Criar dinossauro em x y tamanho cor | Jogo 2D › Kits prontos › Dino | Cria um dinossauro desenhado (com perninhas que correm sozinhas). A pose muda quando ele pula ou abaixa. |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu com sol, nuvens, morros e uma faixa de grama que rola (parallax). Use no começo do "a cada quadro", depois de limpar a tela. O dino corre sobre a grama. |
| Descrever o jogo para leitor de tela | Jogo 2D › Jogo e telas › Telas e partida | Explica o objetivo e os controles para quem não vê o canvas. Coloque em “Ao iniciar”. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| Mostrar a borda da tela, cor espessura | Jogo 2D › Jogo e telas › Preparar a área do jogo | Desenha uma moldura colorida em volta da tela do jogo, para ver onde começa e termina a área de desenho. Ótimo para explicar o palco. Para tirar, apague o bloco. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Número | Programação › 🔣 Valores | Um valor numérico. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
