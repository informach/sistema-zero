# aula-09 — Colidir, terminar e jogar de novo

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Hoje a batida vai encerrar a partida, mostrar uma tela de fim e permitir recomeçar.

**Saída esperada:** Colisão com cactos dispara efeitos uma vez, muda para fim e permite reiniciar pelo mesmo evento de entrada.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Hoje a batida vai encerrar a partida, mostrar uma tela de fim e permitir recomeçar. |
| 2. Qual cacto participou da batida? | demonstration | Distinguir o grupo inteiro do cacto recebido pela verificação de colisão. |
| 3. Faça a batida encerrar a partida | application | Verificar a colisão a cada quadro durante a partida para mudar o estado. |
| 4. Mostre que a partida acabou | application | Acrescentar o terceiro ramo exclusivo de tela. |
| 5. Mostre e sinalize a batida | application | Encadear efeitos no fazer da colisão antes da mudança de cena. |
| 6. Jogar de novo é só trocar de tela? | exploration | Distinguir a cena de fim de uma nova partida preparada. |
| 7. Monte o caminho de volta | application | Usar a mesma entrada com ação diferente conforme o estado. |
| 8. Teste e entregue sua construção | delivery | Colisão com cactos dispara efeitos uma vez, muda para fim e permite reiniciar pelo mesmo evento de entrada. |
| 9. Veja o que você aprendeu | closing | Colisão com cactos dispara efeitos uma vez, muda para fim e permite reiniciar pelo mesmo evento de entrada. |
| 10. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Qual cacto participou da batida?

**Por que aqui:** O nome local cacto será usado na explosão; não é o nome de todo o grupo.

**Foco:** Distinguir o grupo inteiro do cacto recebido pela verificação de colisão.

**Fala de ligação / orientação ao aluno:** “Há vários cactos no grupo. O bloco de colisão aponta o que encostou no Dino; dentro do fazer, vamos chamar esse cacto de cacto.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 1. Passo 1: a colisão que acaba o jogo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Reaproveitar a apresentação do bloco de colisão. Acrescentar a visualização da referência local; não ensinar criação de variável geral antes da aula 11.

**Na tela:** Congelar três cactos. Destacar o que colidiu e uma seta até o nome cacto no bloco. Manter os outros sem destaque.

**Trecho original selecionado, antes da edição:** A palavra mais importante do dia é colisão. Colisão é quando dois objetos do jogo se encostam. Só isso mesmo. E no Estúdio o bloco fala colidir. Colidir e encostar são a mesma coisa aqui, colidir é só o jeito mais técnico de dizer encostou. Quando você ler 'que colidir com o sprite dino', lê na sua cabeça 'que encostar no dino'. Na categoria Jogo 2D, subcategoria Colisões, pega aquele bloco comprido da colisão, o Para cada sprite do grupo. É o maior de todos, dá pra achar de longe. Clica nele, segura, arrasta pra dentro do Se a tela atual é jogando e encaixa entre o Desenhar o grupo e a faxina, aquele Tirar do grupo quem sair da tela. Ele tem três campos e um espaço de fazer. No primeiro, o do grupo, escolhe cactos. No segundo, o do sprite, escolhe dino. E o terceiro é o esperto: ele diz chamar o sprite de. Escreve cacto ali. Isso é um apelido, e serve pro seguinte: são vários cactos no grupo, né? Quando um deles bate no dino, o jogo precisa de um jeito de falar 'esse aqui, o que bateu agora, não os outros'. Daqui pra frente, dentro desse bloco, quando você falar cacto, o jogo entende: é o cacto que acabou de bater. No espaço de fazer vai o que acontece na batida. Por enquanto, uma coisa só: na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Ir para a tela e encaixa lá dentro. Abre a listinha das telas dele e olha o que tem lá: inicio, jogando, e mais umas prontas que a gente ainda não usou. Uma delas se chama fim, e é exatamente a que você quer: a tela de quando o jogo acaba. Escolhe fim. Repara que você não precisou inventar nome nenhum. As telas mais comuns dos jogos já vêm prontas no Estúdio, e a do fim é uma delas. Guarda esse nome, fim, porque ele vai voltar mais três vezes hoje. Clica na área do jogo pra começar e deixa o dino bater de propósito. Olha só: o jogo parou. Ficou só a floresta passando. E é isso mesmo que era pra acontecer, porque o jogo saiu da tela jogando e foi pra tela fim, que ainda não tem nada desenhado. A gente resolve isso agora. Passo 1 feito, bater no cacto já acaba a partida. Bora pro segundo.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Faça a batida encerrar a partida

**Por que aqui:** Primeiro observar a parada da lógica; depois dar um desenho ao estado fim.

**Foco:** Verificar a colisão a cada quadro durante a partida para mudar o estado.

**Fala de ligação / orientação ao aluno:** “Dentro do Se a tela é jogando, entre Desenhar o grupo e a faxina, encaixe Para cada sprite do grupo que colidir com o sprite. Escolha grupo cactos, sprite dino e apelido cacto. No fazer, coloque Ir para a tela fim.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 1. Passo 1: a colisão que acaba o jogo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar a primeira colisão. Explicar que o fundo sem texto é esperado antes do próximo passo.

**Na tela:** **Na tela:** Jogo 2D › Colisões, arrastar "Para cada sprite do grupo __ que colidir com o sprite __ chamar o sprite de __ fazer" (rótulo literal na tela) para dentro do "Se a tela atual é jogando", ENTRE o "Desenhar o grupo" e o "Tirar do grupo quem sair da tela" (grupo cactos, sprite dino, apelido cacto). Dentro dele, só "Ir para a tela", escolhendo "fim" na listinha, que já vem pronta. Rodar e bater.

**Trecho original selecionado, antes da edição:** A palavra mais importante do dia é colisão. Colisão é quando dois objetos do jogo se encostam. Só isso mesmo. E no Estúdio o bloco fala colidir. Colidir e encostar são a mesma coisa aqui, colidir é só o jeito mais técnico de dizer encostou. Quando você ler 'que colidir com o sprite dino', lê na sua cabeça 'que encostar no dino'. Na categoria Jogo 2D, subcategoria Colisões, pega aquele bloco comprido da colisão, o Para cada sprite do grupo. É o maior de todos, dá pra achar de longe. Clica nele, segura, arrasta pra dentro do Se a tela atual é jogando e encaixa entre o Desenhar o grupo e a faxina, aquele Tirar do grupo quem sair da tela. Ele tem três campos e um espaço de fazer. No primeiro, o do grupo, escolhe cactos. No segundo, o do sprite, escolhe dino. E o terceiro é o esperto: ele diz chamar o sprite de. Escreve cacto ali. Isso é um apelido, e serve pro seguinte: são vários cactos no grupo, né? Quando um deles bate no dino, o jogo precisa de um jeito de falar 'esse aqui, o que bateu agora, não os outros'. Daqui pra frente, dentro desse bloco, quando você falar cacto, o jogo entende: é o cacto que acabou de bater. No espaço de fazer vai o que acontece na batida. Por enquanto, uma coisa só: na categoria Jogo 2D, subcategoria Telas e cenas, pega o bloco Ir para a tela e encaixa lá dentro. Abre a listinha das telas dele e olha o que tem lá: inicio, jogando, e mais umas prontas que a gente ainda não usou. Uma delas se chama fim, e é exatamente a que você quer: a tela de quando o jogo acaba. Escolhe fim. Repara que você não precisou inventar nome nenhum. As telas mais comuns dos jogos já vêm prontas no Estúdio, e a do fim é uma delas. Guarda esse nome, fim, porque ele vai voltar mais três vezes hoje. Clica na área do jogo pra começar e deixa o dino bater de propósito. Olha só: o jogo parou. Ficou só a floresta passando. E é isso mesmo que era pra acontecer, porque o jogo saiu da tela jogando e foi pra tela fim, que ainda não tem nada desenhado. A gente resolve isso agora. Passo 1 feito, bater no cacto já acaba a partida. Bora pro segundo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No então de Se jogando, confira a colisão com cactos e mude para fim.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Mostre que a partida acabou

**Por que aqui:** O estado fim já existe; falta sua representação visível.

**Foco:** Acrescentar o terceiro ramo exclusivo de tela.

**Fala de ligação / orientação ao aluno:** “No Se do quadro, depois de inicio, acrescente senão se fim. Dentro, coloque Mostrar tela com uma mensagem de fim e uma dica para jogar novamente.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 2. Passo 2: a tela de fim.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar o segundo senão se e textos. O placar numérico só entra na aula 11.

**Na tela:** **Na tela:** no mesmo bloco Se do "A cada quadro", clicar no "+ senão se" de novo e mostrar o terceiro andar nascendo, embaixo do "senão se a tela atual é inicio". Encaixar nele o "a tela atual é" com "fim" e, dentro, o "Mostrar tela" (título "Bateu no cacto!", subtítulo simples, dica "Aperte qualquer tecla ou toque na tela para jogar de novo", fundo escuro de fábrica). Zoom final no bloco inteiro, com os três andares lidos de cima pra baixo.

**Trecho original selecionado, antes da edição:** Agora a tela de fim, e essa parte você já sabe fazer, porque é igualzinha à tela de início que você montou na Aula 8. Vai naquele mesmo bloco Se do A cada quadro, o que já tem dois andares, e clica de novo no mais senão se. Nasceu o terceiro andar, embaixo do senão se a tela atual é inicio. No espacinho de pergunta dele, encaixa o a tela atual é e, dessa vez, escolhe fim na listinha. Ele aparece lá agora, porque você criou essa tela no passo anterior. Agora lê o bloco de cima pra baixo comigo, que ele virou o mapa do seu jogo: se a tela é jogando, joga; senão se é inicio, mostra o menu; senão se é fim, mostra a tela de fim. Três andares, três telas, um bloco só. Dentro desse Se, na categoria Jogo 2D, subcategoria Telas e cenas, encaixa o bloco Mostrar tela. Ele tem os mesmos quatro campos da aula passada: as três pecinhas de texto e a cor do fundo. Na pecinha do título: Bateu no cacto! Na do subtítulo, alguma coisa que dê vontade de tentar de novo, tipo Quase. Tenta mais uma vez. E na da dica: Aperte qualquer tecla ou toque na tela para jogar de novo. Repara que é a mesma promessa da tela de início, e ela vale aqui pelo mesmo motivo: quem está no celular tem que conseguir tentar de novo. A cor do fundo já nasce escura, e pra tela de fim isso cai bem, então dá pra deixar como veio. Se quiser outra, clica no quadradinho e escolhe. Joga e bate de propósito de novo. Apareceu a tela de fim, com o recado. Passo 2 feito. Só que a batida ainda é meio sem graça, né? De repente o jogo só troca de tela, sem emoção nenhuma. Bora resolver isso.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Desenhe a tela de fim no segundo senão se, quando a cena for fim.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Mostre e sinalize a batida

**Por que aqui:** Os efeitos comunicam a causa do fim, sem uma nova exploração de estética.

**Foco:** Encadear efeitos no fazer da colisão antes da mudança de cena.

**Fala de ligação / orientação ao aluno:** “No fazer do bloco de colisão, antes de Ir para fim: exploda o cacto que tocou, tremida 8 e som de derrota. Mantenha essa ordem.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 3. Passo 3: fazer você sentir a batida.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar o resultado visual e sonoro; manter texto de fim como alternativa perceptível ao áudio.

**Na tela:** **Na tela:** dentro do espaço de fazer da colisão, ANTES do "Ir para a tela fim", acrescentar na ordem: "Soltar explosão no sprite __ cor __" (Kits prontos › Espaço, sprite cacto, cor vermelha), "Tremer a tela com intensidade __" (Aparência, 8), "Tocar efeito __" (Som, derrota).

**Trecho original selecionado, antes da edição:** São três blocos, todos dentro do espaço de fazer da colisão e antes do Ir para a tela fim. O primeiro está na categoria Jogo 2D, subcategoria Kit espaço, e é o bloco Soltar explosão no sprite. Encaixa como o primeiro de lá, logo acima do Ir para a tela. Ele tem dois campos: no do sprite escolhe cacto, que é o apelido, e no da cor escolhe uma bem viva, tipo vermelho. E não estranha ele estar no Kit espaço: explosão é explosão, serve pra qualquer jogo. Bloco bom a gente reaproveita. O segundo está na subcategoria Aparência, e é o Tremer a tela com intensidade. Encaixa logo abaixo da explosão. Ele tem um campo só, e já vem com 8. Deixa assim. E o terceiro está na subcategoria Som, e é o Tocar efeito, aquele mesmo do pulo. Encaixa entre o Tremer a tela e o Ir para a tela. Ele tem um campo só, a listinha dos efeitos: escolhe derrota. Joga e bate de propósito. Explodiu, a tela sacudiu, tocou o som de derrota, e aí veio a tela de fim. Foi uma coisa só, uma batida, e o jogo respondeu de quatro jeitos ao mesmo tempo. Isso tem nome: retorno pro jogador. É tudo aquilo que o jogo faz pra você sentir o que aconteceu. Repara nos jogos que você joga: quando você acerta ou apanha, sempre tem um monte de coisinha junto. Som, tremida, luz, faísca voando. Nunca é uma coisa só. Passo 3 feito. Agora falta uma coisa importante: dar chance da pessoa jogar de novo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Exploda o cacto que colidiu antes da tremida.
- Use tremida 8 antes do som de derrota.
- Toque derrota antes de Ir para fim.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Jogar de novo é só trocar de tela?

**Por que aqui:** Entender o reset antes de montar o segundo ramo do evento de entrada.

**Foco:** Distinguir a cena de fim de uma nova partida preparada.

**Fala de ligação / orientação ao aluno:** “Neste exemplo, termine uma partida e ligue o reinício. Compare o estado de fim com a nova partida preparada.”

**Experiência nativa:** restart. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Colisão encerrou a partida; Outra partida iniciada pela ação de reinício.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Monte o caminho de volta

**Por que aqui:** Reutiliza a estrutura da aula 8, evitando eventos duplicados.

**Foco:** Usar a mesma entrada com ação diferente conforme o estado.

**Fala de ligação / orientação ao aluno:** “No Se do evento de qualquer tecla ou toque, acrescente senão se fim. Dentro, coloque Reiniciar o jogo.”

**Fonte:** roteiro-aula-09-corre-dino.md → Parte 4. Passo 4: jogar de novo.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar o evento único. Conferir que reiniciar não ficou solto nem no ramo inicio.

**Na tela:** **Na tela:** no "Quando apertar qualquer tecla ou tocar na tela", clicar no "+ senão se" do "Se a tela atual é inicio" que já existe e encaixar no andar novo o "a tela atual é fim", com "Reiniciar o jogo" (Jogo e telas › Telas e partida) dentro. Dar um zoom no evento inteiro no fim, mostrando o bloco de dois andares.

**Trecho original selecionado, antes da edição:** Perder e não poder tentar de novo é a pior coisa que tem, né? Bora arrumar. Vai lá no Quando apertar qualquer tecla ou tocar na tela, aquele que você montou na Aula 8. Dentro dele mora o Se a tela atual é inicio. Faz com ele a mesma coisa que você acabou de fazer no outro: clica no mais senão se e, no andar que nasceu, encaixa o a tela atual é, escolhendo fim. E dentro desse Se, na categoria Jogo 2D, subcategoria Telas e cenas, o bloco Reiniciar o jogo. Esse não tem campo nenhum, é só encaixar. Ele é mágico: zera tudo e recomeça o jogo do comecinho, como se você tivesse acabado de abrir. Agora olha o que esse evento virou. Se está no início, ele começa o jogo. Se está no fim, ele reinicia. E se está jogando, ele não faz nada, porque nenhuma das duas perguntas dá sim. O mesmo aperto, três respostas diferentes, dependendo de onde o jogo está. Isso é o Se trabalhando pra você. E repara numa coisa boa: você montou isso uma vez só. Como o evento aceita qualquer tecla e o toque na tela, não tem que repetir esse trabalho pra cada tecla que a pessoa possa apertar. Um bloco escuta tudo, e os dois andares do Se lá dentro decidem o que fazer. Passo 4 feito. E agora, o momento que você esperou nove aulas.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No mesmo evento de entrada, reinicie somente no senão se fim.
- Mantenha um único evento de qualquer tecla ou toque.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Faça uma rodada completa: início → partida → colisão → fim → reinício. Confira efeitos e repita o reinício pelo toque. Na nova partida, nenhum cacto antigo deve permanecer.

**Critérios da entrega:**

- No então de Se jogando, confira a colisão com cactos e mude para fim.
- Mantenha uma única verificação de colisão com os cactos.
- Desenhe a tela de fim no segundo senão se, quando a cena for fim.
- No mesmo evento de entrada, reinicie somente no senão se fim.
- Abra o jogo na tela inicio.
- Mantenha um único evento de entrada.
- Exploda o cacto que colidiu antes da tremida.
- Use tremida 8 antes do som de derrota.
- Toque derrota antes de Ir para fim.

**O nome cacto dentro do bloco de colisão indica o quê?**

- O cacto que participou daquela colisão. (correta)
- O grupo inteiro de cactos.

O bloco fornece uma referência ao membro envolvido.

**Onde colocar Reiniciar?**

- No ramo fim do evento de entrada. (correta)
- Solto dentro de A cada quadro.

Reiniciar precisa depender da intenção do jogador no estado correto.

**Por que desenhar a tela de fim em outro ramo?**

- Porque fim e jogando são estados diferentes. (correta)
- Para criar mais um Dino.

Uma cena por vez recebe seu desenho.

## Orientação ao professor e à edição

- Colisão com grupo é um comando contínuo, dentro do Se jogando em A cada quadro. Preservar a montagem do original; não transferir para a área Quando acontecer.
- Parte 5: trocar três partidas obrigatórias por uma rodada completa e uma conferência da outra entrada. Não tornar recorde, convite a amigos ou competição requisito.
- A justiça da área de colisão será investigada na aula 10; não desviar desta aula para calibrá-la.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 905dc7206a7ca7fc6264dbd2dc14661ad73e462690ba23b6d9b794d566a3c13b. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).

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
| Soltar explosão no sprite cor | Jogo 2D › Desenho e efeitos › Partículas | Solta um jato de partículas (da cor escolhida + estilhaços cinza) no centro do sprite. |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu com sol, nuvens, morros e uma faixa de grama que rola (parallax). Use no começo do "a cada quadro", depois de limpar a tela. O dino corre sobre a grama. |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro quando a criança aperta qualquer tecla ou toca na tela. É o "aperte qualquer coisa para começar" das telas de início. Segurar a tecla dispara uma vez só. |
| Quando o sprite pular | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que o sprite pula de verdade (ex.: tocar um som, contar os pulos). Vale para os três jeitos de pular: estilo plataforma, pular no chão e o kit do dinossauro. |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D › Colisões › Encostar e bloquear | Para cada sprite do grupo que encostar no seu sprite (ex.: a nave), roda o "fazer" com aquele sprite. Use dentro do "a cada quadro". |
| Tocar efeito | Jogo 2D › Som › Efeitos prontos | Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu. |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D › Grupos › Participação e limpeza | Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa). Só tira quem já foi embora de verdade: o que nasce fora da tela e ainda está vindo continua no jogo. |
| Reiniciar o jogo | Jogo 2D › Jogo e telas › Telas e partida | Use dentro de um evento, laço ou função. Limpa a partida e executa novamente as três áreas do projeto. |
| o estado do jogo é ? | Jogo 2D › Jogo e telas › Telas e partida | Verdadeiro se o jogo está naquela tela. Use dentro de um "se". |
| Mudar o estado do jogo para | Jogo 2D › Jogo e telas › Telas e partida | Guarda o estado atual, como início, jogando ou vitória. Use a pergunta sobre o estado para escolher o que desenhar e mover. A mudança não pausa o motor nem desenha uma tela. |
| Descrever o jogo para leitor de tela | Jogo 2D › Jogo e telas › Telas e partida | Explica o objetivo e os controles para quem não vê o canvas. Coloque em “Ao iniciar”. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| Tremer a tela com intensidade | Jogo 2D › Desenho e efeitos › Efeitos | Sacode a tela e para sozinho (o tremor vai diminuindo). Chame uma vez, ex.: numa colisão ou explosão. |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D › Jogo e telas › Telas e partida | Cobre a tela com um aviso central (título + subtítulo + dica). Ótimo para as telas de início, vitória e derrota. |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D › Kits prontos › Dino | Cria um obstáculo desenhado e coloca no grupo. Cacto e pedra nascem no chão (pule por cima); o pássaro vem no alto (abaixe por baixo). Ligue o x na borda direita e um vx negativo para ele vir vindo. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D › Grupos › Movimento | Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro. |
| Condição se, senão se e senão | Programação › ❓ Lógica & Se | Executa o "então" quando a condição for verdadeira. Use + para juntar "senão se" e "senão". |
| Número | Programação › 🔣 Valores | Um valor numérico. |
| texto | Programação › 🔣 Valores | Um valor de texto. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
