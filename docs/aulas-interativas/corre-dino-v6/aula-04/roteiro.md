# aula-04 — O som deve escutar o pulo

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Seu Dino já pula. Hoje o som vai acompanhar o pulo, seja qual for o controle usado.

**Saída esperada:** Um único som responde ao evento de pulo; o evento provisório de espaço foi retirado.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Seu Dino já pula. Hoje o som vai acompanhar o pulo, seja qual for o controle usado. |
| 2. Monte um primeiro evento | application | Entender a área que responde a acontecimentos. |
| 3. Ligue um som e teste | application | Ouvir a resposta de um evento de entrada. |
| 4. O dedo e o Dino fazem a mesma coisa? | exploration | Separar comando de entrada e acontecimento real de pulo. |
| 5. Faça o som acompanhar o pulo | application | Trocar o evento preservando um único bloco de som. |
| 6. Teste e entregue sua construção | delivery | Um único som responde ao evento de pulo; o evento provisório de espaço foi retirado. |
| 7. Veja o que você aprendeu | closing | Um único som responde ao evento de pulo; o evento provisório de espaço foi retirado. |
| 8. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Monte um primeiro evento

**Por que aqui:** Introduzir a área Eventos e o contêiner antes de acrescentar som.

**Foco:** Entender a área que responde a acontecimentos.

**Fala de ligação / orientação ao aluno:** “Coloque a área Quando acontecer ao lado das outras. Dentro dela, encaixe Quando apertar a tecla e escolha espaço.”

**Fonte:** roteiro-aula-04-corre-dino.md → Parte 1. Passo 1: a área que escuta o teclado.

**Montagem:** Manter o evento vazio. A sequência anuncia que esta é uma primeira versão que vamos testar.

**Na tela:** **Na tela:** categoria "Áreas do projeto", arrastar "Quando acontecer" e soltar ao lado das outras duas; depois Jogo 2D › Controles, arrastar "Quando apertar a tecla" para dentro dela e escolher "barra de espaço" no menu.

**Trecho original selecionado, antes da edição:** Até agora o seu jogo tem duas áreas: a Ao iniciar, que arruma tudo no comecinho, e o motor, que repete sem parar. Hoje entra a terceira, e ela é a última. Na categoria Áreas do projeto, pega o bloco Quando acontecer. Clica, segura, arrasta e solta ao lado das outras duas, com um espacinho. Ela fica ao lado, nunca dentro delas. Essa área serve pra quando alguma coisa acontece. As outras duas rodam sozinhas: a Ao iniciar roda uma vez, o motor roda sem parar. Essa aqui fica quietinha esperando, e só faz alguma coisa quando acontece alguma coisa. Agora, na categoria Jogo 2D, subcategoria Controles, pega o bloco Quando apertar a tecla. Clica, segura, arrasta pra dentro do Quando acontecer, que está vazia, e encaixa. Ele vai ser o primeiro bloco lá dentro. Ele tem um campo só, que é uma listinha de teclas. Clica nela e escolhe a barra de espaço, que é a tecla que você usa pra pular. E isso que você acabou de montar tem um nome que os criadores de jogos usam o tempo todo: evento. Evento é isso: uma coisa acontece, e o jogo responde na hora. Todo jogo do mundo é cheio de eventos esperando a vez deles. Primeiro passo no lugar. Só que o evento ainda está vazio: ele escuta a tecla, mas não faz nada. É isso que o segundo passo resolve.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Coloque o evento da tecla espaço dentro de Quando acontecer.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Ligue um som e teste

**Por que aqui:** A primeira versão precisa ser compreendida antes de mostrar seu limite.

**Foco:** Ouvir a resposta de um evento de entrada.

**Fala de ligação / orientação ao aluno:** “Dentro do evento de espaço, encaixe Som de pulo. Ative o áudio pelo controle da página e teste.”

**Fonte:** roteiro-aula-04-corre-dino.md → Parte 2. Passo 2: o som do pulo.

**Montagem:** Manter a ativação de áudio real. Mostrar legenda ou indicador de som para quem não pode ouvi-lo.

**Na tela:** **Na tela:** Jogo 2D › Kit dino, arrastar "Tocar som de pulo" para dentro do "Quando apertar a tecla". Rodar e pular com o espaço.

**Trecho original selecionado, antes da edição:** Na categoria Jogo 2D, volta na subcategoria Kit dino, aquela mesma de onde saiu o seu dinossauro e a floresta. Lá embaixo tem o bloco Tocar som de pulo. Clica, segura, arrasta pra dentro do Quando apertar a tecla, que está vazio, e encaixa. Esse bloco não tem campo nenhum. Ele faz uma coisa só, e o nome dele já diz qual é. Clica na área do jogo e aperta o espaço. Ouviu? O seu dino pula fazendo o somzinho. Um bloquinho só, e o jogo já parece outro. Segundo passo feito. Agora eu quero testar isso direito com você, porque tem uma coisa aí que não está certa.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Encaixe Som de pulo no evento de espaço.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### O dedo e o Dino fazem a mesma coisa?

**Por que aqui:** O laboratório compara controles e repetição no ar sem obrigar a criança a reconstruir o caso.

**Foco:** Separar comando de entrada e acontecimento real de pulo.

**Fala de ligação / orientação ao aluno:** “Compare o som ligado à tecla com o som ligado ao pulo. Teste o toque e uma tentativa enquanto o Dino já está no ar.”

**Experiência nativa:** jump-sound. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Som sem novo salto; Sem salto, o som espera; Som no salto por tecla; Som no salto por toque.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Faça o som acompanhar o pulo

**Por que aqui:** Aplicar a descoberta à montagem; impedir que o som antigo continue duplicando.

**Foco:** Trocar o evento preservando um único bloco de som.

**Fala de ligação / orientação ao aluno:** “Coloque Quando o dino pular. Mova o mesmo Som de pulo para dentro dele e apague o evento de espaço que ficou vazio.”

**Fonte:** roteiro-aula-04-corre-dino.md → Parte 3. Passo 3: o som está escutando a coisa errada.

**Montagem:** Reaproveitar os quatro testes e a transferência do bloco. Encurtar a explicação já vista no laboratório; manter o gesto de mover, não copiar.

**Na tela:** **Na tela:** os quatro testes, um a um e sem pressa, com o áudio bem audível: espaço (tem som), seta pra cima (mudo), clique na parte de cima da área do jogo (mudo), e espaço com o dino no ar (som sem pulo). Depois: Jogo 2D › Controles, arrastar "Quando o sprite pular" para dentro do Quando acontecer, trocar "jogador" por "dino", arrastar o "Tocar som de pulo" de dentro do evento de tecla pra dentro do evento novo, e apagar o "Quando apertar a tecla" vazio com o botão direito. Refazer os quatro testes.

**Trecho original selecionado, antes da edição:** Vamos testar de quatro jeitos. Faz junto comigo, um de cada vez. Primeiro: clica na área do jogo e aperta o espaço. Pulou e tocou o som. Esse funcionou. Segundo: agora pula com a seta pra cima. Pulou... e não teve som nenhum. Mudo. Terceiro: clica com o mouse na parte de cima da área do jogo. Pulou também... e mudo de novo. E olha que esse é o pior dos três, porque é o jeito de jogar no celular. Quem abrir o seu jogo no telefone nunca vai ouvir o som do pulo. E o quarto é o contrário de todos: pula com o espaço e, enquanto o dino está lá no alto, aperta o espaço mais umas cinco vezes. Ouviu? O som tocou todas as vezes, e o dino não pulou nenhuma delas, porque ele já estava no ar. Então olha o tamanho do estrago: em três jeitos de pular, o som só sai em um. E ainda por cima ele sai quando não teve pulo. Agora a pergunta boa: por que aconteceu isso? Porque o bloco que a gente montou não está escutando o dino. Ele está escutando o seu dedo na barra de espaço. São coisas diferentes, e a gente confundiu as duas. Pensa assim. O seu dedo é o pedido. O pulo é o que aconteceu de verdade. Nem todo pedido vira pulo, porque o dino não pula no ar. E nem todo pulo vem de um pedido na barra de espaço, porque tem a seta e tem o dedo na tela. E aí a frase do dia, que vale pro resto da sua vida de quem faz jogo: não pergunta qual tecla foi apertada, pergunta o que aconteceu no jogo. Bora consertar, e o conserto é um bloco só. Na categoria Jogo 2D, subcategoria Controles, do lado daquele Quando apertar a tecla, tem o bloco Quando o sprite pular. Clica, segura, arrasta pra dentro do Quando acontecer e solta logo abaixo do evento que já está lá. Ele tem um campo, o nome do sprite, e nasce escrito jogador. Você já conhece essa: clica e troca pra dino. Agora presta atenção neste gesto, porque é o coração da aula. Pega o Tocar som de pulo, que está lá dentro do evento de tecla, arrasta ele e solta dentro do Quando o sprite dino pular. O mesmo bloco de som, o mesmíssimo, só que agora ele obedece a outro chefe. E o evento de tecla ficou vazio, sem servir pra nada. Clica com o botão direito em cima dele e escolhe Apagar este bloco, igual você fez na Aula 2 com a borda da tela. Agora refaz os quatro testes comigo. Espaço: som. Seta pra cima: som. Clique na parte de cima da tela: som. E com o dino lá no alto, aperta o espaço cinco vezes: silêncio. Os quatro de uma vez, com um bloco só. Porque agora quem avisa o som não é o teclado. É o próprio dino, na hora exata em que ele sai do chão.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Coloque Som de pulo dentro de Quando o dino pular.
- Mantenha apenas um bloco Som de pulo ativo.
- Retire o evento provisório de tecla.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Teste espaço, seta para cima e toque. Deve haver som em cada pulo real, sem um novo som só por apertar espaço no ar.

**Critérios da entrega:**

- Coloque Som de pulo dentro de Quando o dino pular.
- Mantenha apenas um bloco Som de pulo ativo.
- Retire o evento provisório de tecla.
- Aplique gravidade ao dino antes do controle do pulo.
- Controle o dino com força 14, antes de desenhá-lo.

**Qual evento deve tocar o som?**

- Quando o Dino realmente pula. (correta)
- Sempre que uma tecla qualquer é apertada.

O som descreve o acontecimento, não apenas o dedo.

**Por que mover o bloco de som?**

- Para não deixar dois sons ativos. (correta)
- Para mudar a altura do salto.

Uma cópia no evento antigo manteria o defeito.

**Tocar na tela também pode produzir som de pulo?**

- Sim, quando o toque produz um pulo. (correta)
- Não, som de pulo só funciona com espaço.

O evento de pulo atende aos diferentes controles.

## Orientação ao professor e à edição

- Parte 4: retirar o passeio pelos 27 sons do percurso obrigatório. Manter o som de pulo para conferir a relação evento → som.
- Não depender só da audição: a experiência nativa deve manter o contador/indicador visual de pulo e som.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 7b0c677793fae8c30bcef617c4ecc50ed6173beba622d672907eab8b72b6ab4f. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).
