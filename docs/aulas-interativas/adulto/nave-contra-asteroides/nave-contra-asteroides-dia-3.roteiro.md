<!-- Versão adulta gerada por docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts a partir de kids/nave-contra-asteroides/nave-contra-asteroides-dia-3.roteiro.md e de qa/adulto/traducoes/nave-contra-asteroides/nave-contra-asteroides-dia-3.json. Não edite este arquivo: edite a tradução e gere de novo. -->

# Roteiro de gravação · Nave Contra Asteroides · Aula 5

**Faça o tiro acertar o asteroide**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Asteroides nascem a cada 40 quadros, caem e saem do grupo; tiros ainda atravessam as pedras. Saída: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som.

**Verificação das seções (nota da equipe, não gravar):** mostrar a lista Objetivos desta etapa e o resultado real de Verificar esta etapa. Aguardar a resposta do servidor; corrigir os itens pendentes e verificar novamente. Se o projeto mudar depois da conferência, verificar de novo. Conservar os valores demonstrados na montagem; os critérios aceitam as alternativas previstas sem exigir cópia da aparência. Os testes narrados do jogo continuam necessários.

**Vozes e gravação:** Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Gravar só as falas marcadas como Professora; o recado é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "ou seja", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Percebe?"). Neste curso, "então" é o encaixe do bloco Se e não aparece como palavra de ligação. O recado da página começa convidando ("Sua vez:", "Agora…", "Hora de…") e termina na ação de saída. Cada montagem que aplica uma experiência começa por uma retomada curta, nesta ordem: o teste no próprio jogo ("Percebe?", com o porquê), a lembrança da experiência numa frase e o anúncio, uma vez só, colado ao primeiro passo. Depois de montar, quem faz a aula testa direto; a lista dos blocos entra uma vez só, depois do teste ("Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …").

## Seção 1. Escolha quem sai no acerto

### Clipe `video-apelidos` · Escolha quem sai no acerto

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Usar os seletores reais e o botão de tempo da cena collision-pair. Com tiros (o grupo inteiro) e asteroides (o grupo inteiro), clicar em Deixar a trombada acontecer e mostrar pedras no grupo e tiros no grupo em 0. Clicar em Voltar ao começo, escolher tiro (o apelido) e asteroide (o apelido), deixar a trombada acontecer e mostrar 2 pedras e 2 tiros. Clicar em Deixar o tempo passar até as outras duas pedras saírem pela parte de baixo. Meme na comparação: na frase do tiro ao alvo, mostrar por 2 a 3 segundos o meme ilustrado nosso, uma barraca de tiro ao alvo de parque com asteroides no lugar dos patinhos: só o asteroide atingido cai, e os outros continuam passando, com a legenda "só quem foi acertado sai"; desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima seção, sem palpite nem pergunta final. Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir a colisão com os grupos inteiros e deixar os dois contadores em zero.

**Professora:**

> “Esta é uma experiência para a gente entender os apelidos: como escolher quem sai do jogo quando um tiro acerta uma pedra. Aqui há três tiros e três pedras, e só o tiro do meio vai encontrar uma pedra.
>
> Olha aqui: em O tiro que sai, eu escolho tiros, o grupo inteiro, e, em A pedra que sai, escolho asteroides, o grupo inteiro. Clico em Deixar a trombada acontecer. Percebe? Só um tiro encontrou uma pedra, mas sumiram todos: pedras no grupo e tiros no grupo foram para 0. É que o grupo inteiro quer dizer todos os objetos do grupo.”

**Na tela:** Explicar a comparação com o tiro ao alvo, voltar ao começo e escolher os apelidos antes de testar novamente.

**Professora:**

> “Mas, no jogo, só deve sair quem participou do acerto. É como na barraca de tiro ao alvo do parque: quando você acerta um patinho, só aquele patinho cai, e os outros continuam passando.
>
> Agora eu clico em Voltar ao começo e escolho tiro, o apelido, e asteroide, o apelido. Clico em Deixar a trombada acontecer. Olha só: saem só o tiro e a pedra que se encontraram, e ficam 2 pedras e 2 tiros, porque o apelido aponta só para quem participou do encontro. Depois, eu clico em Deixar o tempo passar até as outras duas pedras saírem pela parte de baixo da tela: elas continuaram o caminho. No seu jogo, o acerto vai usar os apelidos tiro e asteroide.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção.”

**Recado na página (não gravar):** Sua vez: compare os grupos inteiros com os apelidos e, no teste dos apelidos, deixe o tempo passar até as outras duas pedras saírem. Quando terminar, clique em Próxima seção.

## Seção 2. Programe o acerto

### Clipe `video-colisao` · Programe o acerto

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Começar pela retomada: atirar numa pedra e, no "Percebe?", mostrar o tiro atravessando. Mostrar os nomes dos dois grupos e os dois apelidos sem inverter. Seletores de objetos locais devem ser preenchidos dentro da colisão. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado. Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Clique no seu jogo e atire numa pedra. Percebe? O tiro atravessa a pedra, porque o acerto ainda não existe no jogo.
>
> Lembra da experiência da seção anterior? Com os apelidos, saíam só o tiro e a pedra do encontro. Agora a gente vai programar esse acerto no seu jogo.
>
> O jogo confere os encontros em todo quadro, depois que tudo já andou e foi desenhado. Por isso, deixe à vista o fim de A cada quadro do jogo, logo depois de Desenhar o grupo asteroides.
>
> Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Para cada colisão entre os grupos. Arraste e solte no fim de A cada quadro do jogo, logo depois de Desenhar o grupo asteroides.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Mas como o jogo sabe qual tiro acertou qual pedra? Repare no que o bloco já traz: os grupos tiros e asteroides e, na linha de baixo, chamar os sprites de tiro e asteroide, que são os apelidos do tiro e da pedra daquele acerto. Confira se ficou tiros e asteroides nos grupos e tiro e asteroide nos apelidos, nessa ordem. Esses apelidos valem só dentro da colisão.
>
> Agora as ações do acerto, que vão dentro da colisão. Deixe à vista o espaço de dentro da colisão entre tiros e asteroides. Abra Jogo 2D, depois Grupos e depois Participação e limpeza, pegue o bloco Tirar o sprite do grupo e solte nesse espaço. Escolha tiro como sprite e tiros como grupo.
>
> Deixe à vista o encaixe logo abaixo desse bloco. Na mesma categoria Participação e limpeza, pegue outro Tirar o sprite do grupo e solte nesse encaixe. Nesse segundo, o sprite já vem asteroide e o grupo já vem asteroides, que é o certo: mantenha os dois.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir a montagem e o teste; deixar os outros tiros e pedras continuarem no jogo.

**Professora:**

> “Deixe à vista o encaixe logo abaixo das duas retiradas, ainda dentro da colisão. Abra Jogo 2D, depois Desenho e efeitos e depois Partículas, pegue o bloco Soltar explosão no sprite e solte nesse encaixe. O sprite já vem asteroide, para a explosão sair no lugar da pedra: mantenha e escolha uma cor para a explosão.
>
> Deixe à vista o encaixe logo abaixo da explosão. Abra Jogo 2D, depois Som e depois Efeitos prontos, pegue o bloco Tocar efeito, solte nesse encaixe e escolha explosão no menu.
>
> Agora teste: clique na área do jogo e atire até acertar uma pedra. Olha só: o tiro e a pedra atingidos saem, aparece a explosão e os outros continuam.”

**Na tela:** Conferir a sequência completa para quem não obteve esse resultado e seguir a saída da seção.

**Professora:**

> “Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no fim de A cada quadro do jogo está a colisão entre tiros e asteroides, e dentro dela estão Tirar o sprite tiro do grupo tiros, Tirar o sprite asteroide do grupo asteroides, Soltar explosão no sprite asteroide e Tocar efeito explosão, nessa ordem. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.”

**Recado na página (não gravar):** Agora faça o tiro acertar a pedra. Monte a colisão com os apelidos, tire o par atingido, coloque a explosão e o som e clique em Verificar esta etapa. Depois, clique em Próxima seção.

## Seção 3. Confira o que você construiu

**Recado na página (não gravar):** Hora de lembrar o que você construiu. Responda sobre o acerto e o lugar de onde o tiro sai, pensando nos testes do seu jogo. Depois de clicar em Enviar quiz, leia as explicações: se alguma resposta não estiver certa, é só trocar a resposta e clicar em Enviar quiz de novo. Quando acertar todas, clique em Próxima seção.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do recado, com todas as perguntas numa página só. Leia as explicações depois de clicar em Enviar quiz; envios ilimitados, sem espera.

## Seção 4. Confira os acertos e envie

### Clipe `video-fecho` · Confira os acertos e envie

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Usar o projeto completo desta etapa. Testar sem pontos ou vidas, que ainda não foram construídos. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado.

**Professora:**

> “Agora teste os acertos do seu jogo. Mova a nave, atire e confira se cada tiro nasce nela. Depois, acerte pedras em lugares diferentes da tela.
>
> Repare no que acontece em cada encontro: saem o tiro e a pedra envolvidos, aparece a explosão e o resto do jogo continua, porque os apelidos apontam só para quem se encontrou. Se alguma coisa falhar, confira os apelidos dentro da colisão antes de enviar.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Enviar para o professor e confirme em Enviar. Quando aparecer Projeto enviado ao professor, clique em Concluir aula.”

**Recado na página (não gravar):** Hora de testar os acertos. Acerte pedras em lugares diferentes, confira se as outras continuam caindo, clique em Verificar esta etapa e envie o seu projeto ao professor. Depois, clique em Concluir aula.
