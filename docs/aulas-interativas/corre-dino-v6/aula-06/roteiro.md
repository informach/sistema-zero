# aula-06 — O que sai da tela ainda existe?

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Os cactos saem da tela, mas podem continuar guardados. Vamos medir antes de fazer a limpeza.

**Saída esperada:** Cactos fora da tela são removidos; o relógio voltou a 1,4 s e o medidor provisório saiu.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Os cactos saem da tela, mas podem continuar guardados. Vamos medir antes de fazer a limpeza. |
| 2. Monte um medidor do que está guardado | application | Ler a quantidade real do grupo, não só contar o que aparece. |
| 3. Veja o número crescer | application | Criar um teste curto que torna o acúmulo perceptível. |
| 4. Sair da tela é ser apagado? | exploration | Comparar objetos visíveis, guardados e removidos. |
| 5. Limpe os cactos que saíram | application | Remover objetos depois de atualizar suas posições. |
| 6. Volte ao ritmo da partida | application | Restaurar a configuração de jogo e remover a instrumentação. |
| 7. Teste e entregue sua construção | delivery | Cactos fora da tela são removidos; o relógio voltou a 1,4 s e o medidor provisório saiu. |
| 8. Veja o que você aprendeu | closing | Cactos fora da tela são removidos; o relógio voltou a 1,4 s e o medidor provisório saiu. |
| 9. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Monte um medidor do que está guardado

**Por que aqui:** A medida transforma um problema invisível em algo observável.

**Foco:** Ler a quantidade real do grupo, não só contar o que aparece.

**Fala de ligação / orientação ao aluno:** “No fim de A cada quadro, coloque o placar provisório. No valor dele, encaixe Quantidade de sprites no grupo cactos.”

**Fonte:** roteiro-aula-06-corre-dino.md → Parte 1. Passo 1: montar o medidor.

**Montagem:** Preservar o encaixe do valor na tomada VALUE, a posição do medidor e a leitura inicial.

**Na tela:** **Na tela:** Jogo 2D › Placar e HUD, arrastar "Mostrar placar __ valor __ em x __ y __ cor __ tamanho __" para dentro do "A cada quadro do jogo", como último bloco, logo abaixo do "Desenhar o grupo". Percorrer os seis campos na ordem do bloco: no texto escrever "Cactos"; por cima do valor, arrastar "quantos sprites tem no grupo __" (Jogo 2D › Muitos) e escolher o grupo cactos; x e y como vieram; cor azul escuro; tamanho como veio.

**Trecho original selecionado, antes da edição:** Pra investigar, a gente vai construir um medidor. Ele não vai ficar no jogo pra sempre: é o nosso instrumento, pra enxergar o invisível. Na categoria Jogo 2D, subcategoria Placar e HUD, pega o bloco Mostrar placar. Clica nele, segura, arrasta pra dentro do A cada quadro do jogo e encaixa logo abaixo do Desenhar o grupo, que hoje é o último bloco de lá, até dar o cliquinho. Ele tem seis campos, e a gente vai passar por todos. O primeiro é o texto. Apaga o que veio escrito e escreve Cactos. O segundo é o valor, e é onde entra a peça que conta. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco quantos sprites tem no grupo e arrasta ele por cima do que já está no campo do valor. No campinho de grupo dele, escolhe cactos. Esse bloquinho sabe quantos sprites estão dentro do grupo agora. Sozinho ele não mostra nada: ele só sabe o número e guarda pra ele. Por isso a gente emprestou o Mostrar placar, que é um bloco que sabe mostrar. Depois vêm o x e o y, que são o lugar do número na tela. Deixa os dois como vieram, que isso aqui é um medidor, não é o placar do jogo. O quinto é a cor. Escolhe um azul escuro, porque o céu do jogo é claro e o número precisa aparecer. E o sexto é o tamanho, que também fica como veio. Olha a área do jogo: apareceu um número no cantinho. Passo 1 feito, o medidor está montado. Bora fazer ele trabalhar.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Mostre a quantidade do grupo cactos no valor do medidor.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Veja o número crescer

**Por que aqui:** A criança observa um dado do seu próprio projeto antes da explicação.

**Foco:** Criar um teste curto que torna o acúmulo perceptível.

**Fala de ligação / orientação ao aluno:** “Troque temporariamente o relógio dos cactos para 0,1 segundo. Execute por alguns segundos e acompanhe o número, mesmo depois que cactos saem da tela.”

**Fonte:** roteiro-aula-06-corre-dino.md → Parte 2. Passo 2: provocar o problema.

**Montagem:** Não pedir longas esperas nem criar travamento. Parar a execução ao observar crescimento.

**Na tela:** **Na tela:** trocar o relógio de 1.4 para 0.1, com a câmera fixa no número do medidor subindo sem parar.

**Trecho original selecionado, antes da edição:** No ritmo normal, com o relógio em 1.4, o problema até aparece, mas tão devagar que você ia ficar um tempão olhando pro número até desconfiar. Então a gente vai apressar ele de propósito. Vai no relógio, aquele A cada 1.4 segundos, e troca o 1.4 por 0.1. Isso faz nascer cacto quase sem parar. Agora fica olhando o número do medidor. Vinte... cinquenta... cento e vinte... duzentos... e ele nunca desce. Só sobe. O que está acontecendo é isso: cada cacto que sai pela esquerda da tela continua existindo. Ele some da sua vista, mas continua lá, e o jogo continua cuidando dele: movendo, desenhando, tomando conta de um monte de cacto que ninguém nunca mais vai ver. Se você deixar assim, vira um exército de fantasmas que só cresce, e o jogo vai ficando pesado. E isso já estava acontecendo desde a Aula 5, no seu jogo, o tempo todo. Você não fazia ideia, e não era falta de atenção sua. Foi o medidor que contou. Passo 2 feito, e agora a gente conserta.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Mostre a quantidade do grupo cactos no valor do medidor.
- Mantenha a criação de cactos no relógio de 0.1 s.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Sair da tela é ser apagado?

**Por que aqui:** O laboratório revela os bastidores que a tela comum esconde.

**Foco:** Comparar objetos visíveis, guardados e removidos.

**Fala de ligação / orientação ao aluno:** “Observe os cactos que saíram. Ligue a limpeza e compare o que continua guardado. O objetivo é cuidar dos que já não são usados.”

**Experiência nativa:** cleanup. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Fora da tela, ainda no grupo; Regra retira automaticamente.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Limpe os cactos que saíram

**Por que aqui:** Aplicar a conclusão e medir novamente com a mesma carga.

**Foco:** Remover objetos depois de atualizar suas posições.

**Fala de ligação / orientação ao aluno:** “No quadro, depois de atualizar e desenhar os cactos e antes do medidor, coloque Remover do grupo cactos os sprites fora da tela.”

**Fonte:** roteiro-aula-06-corre-dino.md → Parte 3. Passo 3: a faxina.

**Montagem:** Preservar a leitura do medidor antes e depois. Explicar que a quantidade oscila enquanto novos cactos chegam; não prometer zero.

**Na tela:** **Na tela:** Jogo 2D › Muitos, encaixar "Tirar do grupo __ quem sair da tela, para cada um (chamado __ )" dentro do "A cada quadro do jogo", ENTRE o "Desenhar o grupo" e o "Mostrar placar" do medidor. Grupo cactos, apelido sprite → cacto, corpo do fazer vazio. Com o relógio ainda em 0.1, mostrar o número subindo e descendo.

**Trecho original selecionado, antes da edição:** A solução é a faxina. Na categoria Jogo 2D, subcategoria Muitos, pega o bloco Tirar do grupo quem sair da tela, aquele comprido que termina com 'para cada um, chamado'. Clica, segura, arrasta pra dentro do A cada quadro do jogo e encaixa entre o Desenhar o grupo e o Mostrar placar do medidor. Ele tem dois campos e um espaço de fazer. No campo do grupo, escolhe cactos. O apelido vem escrito sprite. Troca por cacto, pra ficar com a cara do nosso jogo. E o espaço de fazer, por dentro, deixa vazio, que a gente não precisa dele hoje. Olha o número agora, ainda com o relógio em 0.1. Ele sobe... e desce. Sobe e desce, e fica equilibrado, oscilando numa faixa em vez de crescer sem parar. Porque agora, quando o cacto sai da tela, ele é descartado de verdade. Esse número subindo e descendo é a vitória de hoje. Parece pouco, mas é o retrato de um jogo saudável: nasce, sai, é descartado, e o número fica no lugar. Isso tem nome de gente grande: chama faxina. E a regra vale sempre: todo jogo que faz coisas nascerem sem parar precisa de uma faxina pra limpar quem já foi embora. Passo 3 feito, e o seu jogo já limpa sozinho quem foi embora. Vem o quarto e último.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Remova do grupo cactos quem saiu da tela, a cada quadro.
- Mostre a quantidade do grupo cactos no valor do medidor.
- Faça a faxina antes de ler o medidor.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Volte ao ritmo da partida

**Por que aqui:** A experiência termina com um projeto limpo e pronto para a aula seguinte.

**Foco:** Restaurar a configuração de jogo e remover a instrumentação.

**Fala de ligação / orientação ao aluno:** “Compare brevemente 0,1 e 0,5 segundo no vídeo. No seu jogo, volte o relógio para 1,4 e retire só o medidor.”

**Fonte:** roteiro-aula-06-corre-dino.md → Parte 4. Passo 4: testar dois ritmos, devolver o relógio e aposentar o medidor.

**Montagem:** Manter dois ritmos como comparação observada, sem uma nova atividade obrigatória. Reaproveitar Apagar este bloco; preservar a faxina.

**Na tela:** **Na tela:** com o medidor aceso, jogar com o relógio em 0.1 e depois em 0.5, comparando o patamar do número; devolver o relógio para 1.4 e mostrar o medidor num patamar baixo, subindo e descendo. Por fim, arrastar o "Mostrar placar" do medidor para a lixeira, com o "quantos sprites tem no grupo" indo junto por estar encaixado dentro dele, e mostrar o laço ficando com oito blocos.

**Trecho original selecionado, antes da edição:** Agora, com o medidor aceso, a gente compara dois ritmos. Deixa o relógio em 0.1 e joga um pouco, olhando o número. Ele sobe e desce lá em cima, num patamar alto, porque nasce cacto quase sem parar. Agora troca o relógio por 0.5 e joga de novo, olhando o número outra vez. Ele sobe e desce bem mais baixo, porque nasce muito menos. Mas repara no que é igual nos dois: em nenhum deles o número fica só subindo. Não importa o ritmo que você escolher, a faxina dá conta. É isso que faz dela uma peça boa de verdade. Agora devolve o relógio pro valor do nosso jogo: troca de volta pra 1.4. Esse é o ritmo que a gente vai usar daqui pra frente, então é importante ele voltar pro lugar. Olha o medidor com o relógio em 1.4: um número baixo, subindo e descendo devagar. Esse é o seu jogo em paz. E agora chegou a hora de aposentar o medidor. Ele é aquele Mostrar placar lá embaixo, com o bloco de contar encaixado dentro dele. Clica nele, segura e arrasta pra lixeira. O bloco de contar vai junto, porque está encaixado lá dentro. Ele fez o trabalho dele. Mostrou pra você um problema que era invisível, você consertou, e ele mostrou que o conserto funcionou. Agora ele sai, porque ele nunca foi parte do jogo: era instrumento, e instrumento a gente guarda quando termina de usar. Esse jeito de trabalhar volta no curso: lá na Aula 10 você vai montar outro instrumento, um raio-X, usar ele pra enxergar uma coisa escondida, e guardar ele também. E lembra do Mostrar placar, viu? Porque na Aula 11 ele volta, e dessa vez pra ficar de verdade, com o placar do seu jogo. Olha o seu A cada quadro do jogo agora: ele ficou com oito blocos, do Limpar a tela até a faxina, e é assim que ele fica no fim de hoje.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Remova do grupo cactos quem saiu da tela, a cada quadro.
- Mantenha a criação de cactos no relógio de 1.4 s.
- Retire o placar provisório usado como medidor.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Execute com intervalo 1,4. Veja cactos entrando e saindo, sem medidor cobrindo a partida. O professor pode recolocar o instrumento numa cópia para conferir o grupo.

**Critérios da entrega:**

- Remova do grupo cactos quem saiu da tela, a cada quadro.
- Mantenha a criação de cactos no relógio de 1.4 s.
- Retire o placar provisório usado como medidor.

**Um cacto que saiu da tela foi necessariamente apagado?**

- Não, pode continuar guardado no grupo. (correta)
- Sim, tudo fora da tela deixa de existir.

Visibilidade e existência são coisas diferentes.

**Por que usar o mesmo ritmo antes e depois da faxina?**

- Para comparar o efeito da limpeza. (correta)
- Para mudar o tamanho do Dino.

Manter o ritmo controla uma das variáveis da comparação.

**Depois de tirar o medidor, a faxina deve ficar?**

- Sim, ela continua cuidando do grupo. (correta)
- Não, o medidor é que apaga os cactos.

O medidor informa; a rotina de limpeza remove.

## Orientação ao professor e à edição

- As Especificações antigas dizem que o medidor fica até a aula 7, mas Parte 4 e Fecho o retiram na aula 6. Seguir Parte 4/Fecho e a continuidade da aula 7.
- Retirar instrumento não é desligar a rotina de limpeza.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 3f35c3213866fcd7d6ca59e0e1c34407f370807a410233aeb5ff95b0cd831a5f. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).
