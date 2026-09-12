# aula-09 — Colidir, terminar e jogar de novo

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Hoje a batida vai encerrar a partida, mostrar uma tela de fim e permitir recomeçar.

**Saída esperada:** Colisão com cactos dispara efeitos uma vez, muda para fim e permite reiniciar pelo mesmo evento de entrada.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Hoje a batida vai encerrar a partida, mostrar uma tela de fim e permitir recomeçar. |
| 2. Qual cacto participou da batida? | demonstration | Distinguir o grupo inteiro do membro recebido pelo evento. |
| 3. Faça a batida encerrar a partida | application | Usar a colisão como evento que muda o estado. |
| 4. Mostre que a partida acabou | application | Acrescentar o terceiro ramo exclusivo de tela. |
| 5. Mostre e sinalize a batida | application | Encadear efeitos no evento antes da mudança de cena. |
| 6. Recomeçar é só trocar de tela? | exploration | Distinguir a cena de fim de uma nova partida preparada. |
| 7. Monte o caminho de volta | application | Usar a mesma entrada com ação diferente conforme o estado. |
| 8. Teste e entregue sua construção | delivery | Colisão com cactos dispara efeitos uma vez, muda para fim e permite reiniciar pelo mesmo evento de entrada. |
| 9. Veja o que você aprendeu | closing | Colisão com cactos dispara efeitos uma vez, muda para fim e permite reiniciar pelo mesmo evento de entrada. |
| 10. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Qual cacto participou da batida?

**Por que aqui:** O nome local cacto será usado na explosão; não é o nome de todo o grupo.

**Foco:** Distinguir o grupo inteiro do membro recebido pelo evento.

**Fala de ligação / orientação ao aluno:** “Há vários cactos no grupo. O evento aponta só o que encostou no Dino; dentro dele, vamos chamar esse cacto de cacto.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 1. Passo 1: a colisão que acaba o jogo.

**Montagem:** Reaproveitar a apresentação do evento. Acrescentar a visualização da referência local; não ensinar criação de variável geral antes da aula 11.

**Na tela:** Congelar três cactos. Destacar o que colidiu e uma seta até o nome cacto no evento. Manter os outros sem destaque.

**Trecho original selecionado, antes da edição:** A palavra mais importante do dia é colisão. Colisão é quando dois objetos do jogo se encostam. Só isso mesmo. E no Estúdio o bloco fala colidir. Colidir e encostar são a mesma coisa aqui, colidir é só o jeito mais técnico de dizer encostou. Quando você ler 'que colidir com o sprite dino', lê na sua cabeça 'que encostar no dino'. Na categoria Jogo 2D, subcategoria Colisões, pega aquele bloco comprido da colisão, o Para cada sprite do grupo. É o maior de todos, dá pra achar de longe. Clica nele, segura, arrasta pra dentro do Se a tela atual é jogando e encaixa entre o Desenhar o grupo e a faxina, aquele Tirar do grupo quem sair da tela. Ele tem três campos e um espaço de fazer. No primeiro, o do grupo, escolhe cactos. No segundo, o do sprite, escolhe dino. E o terceiro é o esperto: ele diz chamar o sprite de. Escreve cacto ali. Isso é um apelido, e serve pro seguinte: são vários cactos no grupo, né? Quando um deles bate no dino, o jogo precisa de um jeito de falar 'esse aqui, o que bateu agora, não os outros'. Daqui pra frente, dentro desse bloco, quando você falar cacto, o jogo entende: é o cacto que acabou de bater. No espaço de fazer vai o que acontece na batida. Por enquanto, uma coisa só: na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Ir para a tela e encaixa lá dentro. Abre a listinha das telas dele e olha o que tem lá: inicio, jogando, e mais umas prontas que a gente ainda não usou. Uma delas se chama fim, e é exatamente a que você quer: a tela de quando o jogo acaba. Escolhe fim. Repara que você não precisou inventar nome nenhum. As telas mais comuns dos jogos já vêm prontas no Estúdio, e a do fim é uma delas. Guarda esse nome, fim, porque ele vai voltar mais três vezes hoje. Clica na área do jogo pra começar e deixa o dino bater de propósito. Olha só: o jogo parou. Ficou só a floresta passando. E é isso mesmo que era pra acontecer, porque o jogo saiu da tela jogando e foi pra tela fim, que ainda não tem nada desenhado. A gente resolve isso agora. Passo 1 feito, bater no cacto já acaba a partida. Bora pro segundo.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Faça a batida encerrar a partida

**Por que aqui:** Primeiro observar a parada da lógica; depois dar um desenho ao estado fim.

**Foco:** Usar a colisão como evento que muda o estado.

**Fala de ligação / orientação ao aluno:** “Dentro de Quando acontecer, use Quando o sprite dino tocar o grupo cactos, chamando o que tocou de cacto. Dentro, vá para a tela fim.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 1. Passo 1: a colisão que acaba o jogo.

**Montagem:** Preservar a primeira colisão. Explicar que o fundo sem texto é esperado antes do próximo passo.

**Na tela:** **Na tela:** Jogo 2D › Colisões, arrastar "Para cada sprite do grupo __ que colidir com o sprite __ chamar o sprite de __ fazer" (rótulo literal na tela) para dentro do "Se a tela atual é jogando", ENTRE o "Desenhar o grupo" e o "Tirar do grupo quem sair da tela" (grupo cactos, sprite dino, apelido cacto). Dentro dele, só "Ir para a tela", escolhendo "fim" na listinha, que já vem pronta. Rodar e bater.

**Trecho original selecionado, antes da edição:** A palavra mais importante do dia é colisão. Colisão é quando dois objetos do jogo se encostam. Só isso mesmo. E no Estúdio o bloco fala colidir. Colidir e encostar são a mesma coisa aqui, colidir é só o jeito mais técnico de dizer encostou. Quando você ler 'que colidir com o sprite dino', lê na sua cabeça 'que encostar no dino'. Na categoria Jogo 2D, subcategoria Colisões, pega aquele bloco comprido da colisão, o Para cada sprite do grupo. É o maior de todos, dá pra achar de longe. Clica nele, segura, arrasta pra dentro do Se a tela atual é jogando e encaixa entre o Desenhar o grupo e a faxina, aquele Tirar do grupo quem sair da tela. Ele tem três campos e um espaço de fazer. No primeiro, o do grupo, escolhe cactos. No segundo, o do sprite, escolhe dino. E o terceiro é o esperto: ele diz chamar o sprite de. Escreve cacto ali. Isso é um apelido, e serve pro seguinte: são vários cactos no grupo, né? Quando um deles bate no dino, o jogo precisa de um jeito de falar 'esse aqui, o que bateu agora, não os outros'. Daqui pra frente, dentro desse bloco, quando você falar cacto, o jogo entende: é o cacto que acabou de bater. No espaço de fazer vai o que acontece na batida. Por enquanto, uma coisa só: na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Ir para a tela e encaixa lá dentro. Abre a listinha das telas dele e olha o que tem lá: inicio, jogando, e mais umas prontas que a gente ainda não usou. Uma delas se chama fim, e é exatamente a que você quer: a tela de quando o jogo acaba. Escolhe fim. Repara que você não precisou inventar nome nenhum. As telas mais comuns dos jogos já vêm prontas no Estúdio, e a do fim é uma delas. Guarda esse nome, fim, porque ele vai voltar mais três vezes hoje. Clica na área do jogo pra começar e deixa o dino bater de propósito. Olha só: o jogo parou. Ficou só a floresta passando. E é isso mesmo que era pra acontecer, porque o jogo saiu da tela jogando e foi pra tela fim, que ainda não tem nada desenhado. A gente resolve isso agora. Passo 1 feito, bater no cacto já acaba a partida. Bora pro segundo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Ao o dino tocar o grupo cactos, mude para a tela fim.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Mostre que a partida acabou

**Por que aqui:** O estado fim já existe; falta sua representação visível.

**Foco:** Acrescentar o terceiro ramo exclusivo de tela.

**Fala de ligação / orientação ao aluno:** “No Se do quadro, depois de inicio, acrescente senão se fim. Dentro, coloque Mostrar tela com uma mensagem de fim e uma dica para jogar novamente.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 2. Passo 2: a tela de fim.

**Montagem:** Preservar o segundo senão se e textos. O placar numérico só entra na aula 11.

**Na tela:** **Na tela:** no mesmo bloco Se do "A cada quadro", clicar no "+ senão se" de novo e mostrar o terceiro andar nascendo, embaixo do "senão se a tela atual é inicio". Encaixar nele o "a tela atual é" com "fim" e, dentro, o "Mostrar tela" (título "Bateu no cacto!", subtítulo simples, dica "Aperte qualquer tecla ou toque na tela para jogar de novo", fundo escuro de fábrica). Zoom final no bloco inteiro, com os três andares lidos de cima pra baixo.

**Trecho original selecionado, antes da edição:** Agora a tela de fim, e essa parte você já sabe fazer, porque é igualzinha à tela de início que você montou na Aula 8. Vai naquele mesmo bloco Se do A cada quadro, o que já tem dois andares, e clica de novo no mais senão se. Nasceu o terceiro andar, embaixo do senão se a tela atual é inicio. No espacinho de pergunta dele, encaixa o a tela atual é e, dessa vez, escolhe fim na listinha. Ele aparece lá agora, porque você criou essa tela no passo anterior. Agora lê o bloco de cima pra baixo comigo, que ele virou o mapa do seu jogo: se a tela é jogando, joga; senão se é inicio, mostra o menu; senão se é fim, mostra a tela de fim. Três andares, três telas, um bloco só. Dentro desse Se, na categoria Jogo 2D, subcategoria Telas e cenas, encaixa o bloco Mostrar tela. Ele tem os mesmos quatro campos da aula passada: as três pecinhas de texto e a cor do fundo. Na pecinha do título: Bateu no cacto! Na do subtítulo, alguma coisa que dê vontade de tentar de novo, tipo Quase. Tenta mais uma vez. E na da dica: Aperte qualquer tecla ou toque na tela para jogar de novo. Repara que é a mesma promessa da tela de início, e ela vale aqui pelo mesmo motivo: quem está no celular tem que conseguir tentar de novo. A cor do fundo já nasce escura, e pra tela de fim isso cai bem, então dá pra deixar como veio. Se quiser outra, clica no quadradinho e escolhe. Joga e bate de propósito de novo. Apareceu a tela de fim, com o recado. Passo 2 feito. Só que a batida ainda é meio sem graça, né? De repente o jogo só troca de tela, sem emoção nenhuma. Bora resolver isso.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Desenhe a tela de fim no segundo senão se, quando a cena for fim.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Mostre e sinalize a batida

**Por que aqui:** Os efeitos comunicam a causa do fim, sem uma nova exploração de estética.

**Foco:** Encadear efeitos no evento antes da mudança de cena.

**Fala de ligação / orientação ao aluno:** “No evento da colisão, antes de Ir para fim: exploda o cacto que tocou, tremida 8 e som de derrota. Mantenha essa ordem.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 3. Passo 3: fazer você sentir a batida.

**Montagem:** Preservar o resultado visual e sonoro; manter texto de fim como alternativa perceptível ao áudio.

**Na tela:** **Na tela:** dentro do espaço de fazer da colisão, ANTES do "Ir para a tela fim", acrescentar na ordem: "Soltar explosão no sprite __ cor __" (Kit espaço, sprite cacto, cor vermelha), "Tremer a tela com intensidade __" (Aparência, 8), "Tocar efeito __" (Som, derrota).

**Trecho original selecionado, antes da edição:** São três blocos, todos dentro do espaço de fazer da colisão e antes do Ir para a tela fim. O primeiro está na categoria Jogo 2D, subcategoria Kit espaço, e é o bloco Soltar explosão no sprite. Encaixa como o primeiro de lá, logo acima do Ir para a tela. Ele tem dois campos: no do sprite escolhe cacto, que é o apelido, e no da cor escolhe uma bem viva, tipo vermelho. E não estranha ele estar no Kit espaço: explosão é explosão, serve pra qualquer jogo. Bloco bom a gente reaproveita. O segundo está na subcategoria Aparência, e é o Tremer a tela com intensidade. Encaixa logo abaixo da explosão. Ele tem um campo só, e já vem com 8. Deixa assim. E o terceiro está na subcategoria Som, e é o Tocar efeito, aquele mesmo do pulo. Encaixa entre o Tremer a tela e o Ir para a tela. Ele tem um campo só, a listinha dos efeitos: escolhe derrota. Joga e bate de propósito. Explodiu, a tela sacudiu, tocou o som de derrota, e aí veio a tela de fim. Foi uma coisa só, uma batida, e o jogo respondeu de quatro jeitos ao mesmo tempo. Isso tem nome: retorno pro jogador. É tudo aquilo que o jogo faz pra você sentir o que aconteceu. Repara nos jogos que você joga: quando você acerta ou apanha, sempre tem um monte de coisinha junto. Som, tremida, luz, faísca voando. Nunca é uma coisa só. Passo 3 feito. Agora falta uma coisa importante: dar chance da pessoa jogar de novo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Exploda o cacto que colidiu antes da tremida.
- Use tremida 8 antes do som de derrota.
- Toque derrota antes de Ir para fim.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Recomeçar é só trocar de tela?

**Por que aqui:** Entender o reset antes de montar o segundo ramo do evento de entrada.

**Foco:** Distinguir a cena de fim de uma nova partida preparada.

**Fala de ligação / orientação ao aluno:** “Neste exemplo, termine uma partida e ligue o reinício. Compare o estado de fim com a nova partida preparada.”

**Experiência nativa:** restart. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Colisão encerrou a partida; Outra partida iniciada pela ação de reinício.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, oferecer continuar ou rever; não acrescentar outra missão.

### Monte o caminho de volta

**Por que aqui:** Reutiliza a estrutura da aula 8, evitando eventos duplicados.

**Foco:** Usar a mesma entrada com ação diferente conforme o estado.

**Fala de ligação / orientação ao aluno:** “No Se do evento de qualquer tecla ou toque, acrescente senão se fim. Dentro, coloque Reiniciar o jogo.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 4. Passo 4: jogar de novo.

**Montagem:** Preservar o evento único. Conferir que reiniciar não ficou solto nem no ramo inicio.

**Na tela:** **Na tela:** no "Quando apertar qualquer tecla ou tocar na tela", clicar no "+ senão se" do "Se a tela atual é inicio" que já existe e encaixar no andar novo o "a tela atual é fim", com "Reiniciar o jogo" (Telas e cenas) dentro. Dar um zoom no evento inteiro no fim, mostrando o bloco de dois andares.

**Trecho original selecionado, antes da edição:** Perder e não poder tentar de novo é a pior coisa que tem, né? Bora arrumar. Vai lá no Quando apertar qualquer tecla ou tocar na tela, aquele que você montou na Aula 8. Dentro dele mora o Se a tela atual é inicio. Faz com ele a mesma coisa que você acabou de fazer no outro: clica no mais senão se e, no andar que nasceu, encaixa o a tela atual é, escolhendo fim. E dentro desse Se, na categoria Jogo 2D, subcategoria Telas e cenas, o bloco Reiniciar o jogo. Esse não tem campo nenhum, é só encaixar. Ele é mágico: zera tudo e recomeça o jogo do comecinho, como se você tivesse acabado de abrir. Agora olha o que esse evento virou. Se está no início, ele começa o jogo. Se está no fim, ele reinicia. E se está jogando, ele não faz nada, porque nenhuma das duas perguntas dá sim. O mesmo aperto, três respostas diferentes, dependendo de onde o jogo está. Isso é o Se trabalhando pra você. E repara numa coisa boa: você montou isso uma vez só. Como o evento aceita qualquer tecla e o toque na tela, não tem que repetir esse trabalho pra cada tecla que a pessoa possa apertar. Um bloco escuta tudo, e os dois andares do Se lá dentro decidem o que fazer. Passo 4 feito. E agora, o momento que você esperou nove aulas.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No mesmo evento de entrada, reinicie somente no senão se fim.
- Mantenha um único evento de qualquer tecla ou toque.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Faça uma rodada completa: início → partida → colisão → fim → reinício. Confira efeitos e repita o reinício pelo toque. Na nova partida, nenhum cacto antigo deve permanecer.

**Critérios da entrega:**

- Ao o dino tocar o grupo cactos, mude para a tela fim.
- Desenhe a tela de fim no segundo senão se, quando a cena for fim.
- No mesmo evento de entrada, reinicie somente no senão se fim.
- Abra o jogo na tela inicio.
- Mantenha um único evento de entrada.
- Exploda o cacto que colidiu antes da tremida.
- Use tremida 8 antes do som de derrota.
- Toque derrota antes de Ir para fim.

**O nome cacto dentro do evento indica o quê?**

- O cacto que participou daquela colisão. (correta)
- O grupo inteiro de cactos.

O evento fornece uma referência ao membro envolvido.

**Onde colocar Reiniciar?**

- No ramo fim do evento de entrada. (correta)
- Solto dentro de A cada quadro.

Reiniciar precisa depender da intenção do jogador no estado correto.

**Por que desenhar a tela de fim em outro ramo?**

- Porque fim e jogando são estados diferentes. (correta)
- Para criar mais um Dino.

Uma cena por vez recebe seu desenho.

## Orientação ao professor e à edição

- Parte 5: trocar três partidas obrigatórias por uma rodada completa e uma conferência da outra entrada. Não tornar recorde, convite a amigos ou competição requisito.
- A justiça da área de colisão será investigada na aula 10; não desviar desta aula para calibrá-la.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 905dc7206a7ca7fc6264dbd2dc14661ad73e462690ba23b6d9b794d566a3c13b. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).
