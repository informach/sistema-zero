<!-- Versão adulta gerada por docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts a partir de kids/nave-contra-asteroides/nave-contra-asteroides-dia-5.roteiro.md e de qa/adulto/traducoes/nave-contra-asteroides/nave-contra-asteroides-dia-5.json. Não edite este arquivo: edite a tradução e gere de novo. -->

# Roteiro de gravação · Nave Contra Asteroides · Aula 9

**Termine e recomece a partida**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício. Saída: Jogo completo original: alvo 26, vitória, derrota, retorno à abertura e nova partida.

**Verificação das seções (nota da equipe, não gravar):** mostrar a lista Objetivos desta etapa e o resultado real de Verificar esta etapa. Aguardar a resposta do servidor; corrigir os itens pendentes e verificar novamente. Se o projeto mudar depois da conferência, verificar de novo. Conservar os valores demonstrados na montagem; os critérios aceitam as alternativas previstas sem exigir cópia da aparência. Os testes narrados do jogo continuam necessários.

**Vozes e gravação:** Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Gravar só as falas marcadas como Professora; o recado é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "ou seja", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Percebe?"). Neste curso, "então" é o encaixe do bloco Se e não aparece como palavra de ligação. O recado da página começa convidando ("Sua vez:", "Agora…", "Hora de…") e termina na ação de saída. Cada montagem que aplica uma experiência começa por uma retomada curta, nesta ordem: o teste no próprio jogo ("Percebe?", com o porquê), a lembrança da experiência numa frase e o anúncio, uma vez só, colado ao primeiro passo. Depois de montar, quem faz a aula testa direto; a lista dos blocos entra uma vez só, depois do teste ("Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …").

## Seção 1. Defina quando ganhar e perder

### Clipe `video-finais` · Defina quando ganhar e perder

**Estimativa de gravação:** aproximadamente 6 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Começar mostrando a partida que continua sem vidas. Não apresentar uma tela final ainda ausente como teste aprovado. Manter a prioridade real da derrota no empate e a comparação >= do código original. Na pergunta da derrota, a pergunta x > 0 vai para a lixeira antes de encaixar as vidas do sprite acabaram?. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado. Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “No seu jogo, comece uma partida e deixe as vidas acabarem. A partida continua, porque você ainda não programou quando ela termina. Agora faça a partida acabar quando chegar a 26 pontos ou quando as vidas acabarem.
>
> Primeiro, a meta. Os 26 pontos não mudam durante a partida, por isso a meta vai numa constante, que é um nome que guarda um valor que não muda. A constante é criada uma vez, quando o jogo começa, em Ao iniciar: deixe à vista o espaço entre Dar ao sprite nave 3 de vida e Mudar o estado do jogo para inicio.
>
> Agora abra Programação e depois Variáveis, e pegue o bloco Criar constante com valor. Arraste e solte entre Dar ao sprite nave 3 de vida e Mudar o estado do jogo para inicio. O nome chega como PI: troque PI por alvo e o 0 do valor por 26.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Com a meta pronta, agora a pergunta da vitória, que o jogo faz em todo quadro, durante a partida. Ela vai no fim do então de Se o estado do jogo é jogando, dentro de A cada quadro do jogo, logo depois de Desenhar as vidas do sprite: deixe esse lugar à vista. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse lugar.
>
> Desta vez, a pergunta que vem no Se vai ser usada. Ela é uma comparação: um valor, um sinal e outro valor. No lado esquerdo, clique em x e escolha pontos. No sinal, clique em > e escolha ≥, que quer dizer maior ou igual.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Agora o lado direito, que é onde vai a meta. Deixe à vista o 0, à direita da comparação. Abra Programação e depois Valores, pegue o bloco valor da variável e solte em cima do 0. Escolha alvo. Assim, a pergunta fica pontos maior ou igual a alvo, ou seja, a partida já chegou à meta?
>
> Deixe à vista o espaço do então dessa comparação. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro desse então e escolha vitoria.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Pronto: chegou à meta, a partida vai para a vitória. Agora a derrota, para quando as vidas acabarem. Deixe à vista o encaixe logo abaixo do Se da vitória, ainda dentro de jogando. Abra Programação e depois Lógica e Se, pegue outro Se e solte nesse encaixe. Desta vez, a pergunta x maior que 0 não serve, por isso arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado de Se.
>
> Abra Jogo 2D, depois Vida e placar e depois Vida, pegue o bloco as vidas do sprite acabaram?, solte nesse lugar e escolha nave. Depois, deixe à vista o então desse Se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro do então e escolha fim.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “E se as duas coisas acontecerem juntas? Olha aqui: a ordem no fim de jogando é primeiro o desenho das vidas, depois a pergunta da vitória e por último a da derrota. Se as duas coisas acontecerem no mesmo quadro, a derrota vem por último, e é ela que vale.
>
> Confira se ficou assim: em Ao iniciar, entre Dar ao sprite nave 3 de vida e Mudar o estado do jogo para inicio, está Criar constante alvo com valor 26. E, no fim de jogando, depois de Desenhar as vidas do sprite, estão o Se pontos ≥ alvo, que muda o estado para vitoria, e o Se as vidas do sprite nave acabaram?, que muda o estado para fim.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste.

**Professora:**

> “Agora a partida já pode terminar com vitória ou com derrota. Mas as telas da vitória e da derrota ainda não existem, por isso o jogo ainda não mostra esses finais. Desta vez, quem confere o que você montou é a verificação, e as telas vêm na próxima seção.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.”

**Recado na página (não gravar):** Agora defina quando a partida termina. Crie a meta alvo, monte as perguntas de vitória e de derrota dentro de jogando e clique em Verificar esta etapa. Depois, clique em Próxima seção.

## Seção 2. Mostre a vitória e a derrota

### Clipe `video-mostrar-telas` · Mostre a vitória e a derrota

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Começar mostrando a partida parada sem tela de fim. Criar um ramo por vez, sem remontar inicio, clicando no + que fica antes de senão se; a pergunta x > 0 de cada ramo novo vai para a lixeira. Não alegar que Enter reinicia nesta etapa. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado. Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Repare: quando as vidas acabam, a partida para, mas nenhuma tela de fim aparece. É que o Se grande de A cada quadro do jogo só tem os ramos de jogando e de inicio, e nenhum para vitoria ou fim. Agora mostre uma tela para cada final.
>
> Encontre esse Se, dentro de A cada quadro do jogo. Olha aqui: na linha de baixo dele, clique uma vez no + que fica antes de senão se, para criar o ramo da vitória.
>
> O ramo novo chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado desse senão se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha vitoria.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Agora falta a tela de vitória. Deixe à vista o espaço do então do ramo vitoria. Na mesma categoria Telas e partida, pegue o bloco Mostrar tela com título subtítulo dica fundo e solte nesse espaço.
>
> Agora os textos da vitória: no título, escreva Você ganhou!, apague o subtítulo e, na dica, escreva Aperte Enter para voltar ao início. Depois, escolha um fundo escuro com letras legíveis.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Esperar as vidas acabarem e manter a tela de derrota real visível.

**Professora:**

> “Agora a derrota, do mesmo jeito. Clique de novo no + que fica antes de senão se. O ramo novo também chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira e deixe à vista o lugar vazio. Na mesma categoria Telas e partida, pegue o estado do jogo é, solte nesse lugar e escolha fim.
>
> Deixe à vista o espaço do então do ramo fim. Pegue outro Mostrar tela com título subtítulo dica fundo, na mesma categoria, e solte nesse espaço. No título, escreva Você perdeu, apague o subtítulo e, na dica, escreva Aperte Enter para voltar ao início. Depois, escolha um fundo escuro.
>
> Agora teste: clique na área do jogo, comece com Enter e deixe as vidas acabarem. Olha só: aparece a tela Você perdeu.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste.

**Professora:**

> “Isso acontece porque a pergunta das vidas muda o estado para fim, e o ramo fim mostra essa tela. A dica já fala em voltar ao início, mas o Enter ainda não faz isso: essa resposta vem depois da próxima experiência.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no fim de jogando, a pergunta das vidas muda o estado para fim, e o Se grande tem os ramos jogando, inicio, vitoria e fim, nessa ordem. Os ramos vitoria e fim mostram as telas Você ganhou! e Você perdeu, com a dica Aperte Enter para voltar ao início. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.”

**Recado na página (não gravar):** Agora mostre a vitória e a derrota. Crie os ramos vitoria e fim depois do ramo inicio, com os textos de cada tela, e clique em Verificar esta etapa. Depois, clique em Próxima seção.

## Seção 3. Compare voltar à abertura e reiniciar

### Clipe `video-reiniciar` · Compare voltar à abertura e reiniciar

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. A experiência restart usa Apertar Enter. A abertura pode cobrir indicadores: compará-los quando a partida começa. Com Mudar o estado do jogo para inicio, clicar em Apertar Enter, esperar a batida e o fim, clicar em Apertar Enter para voltar à abertura com as pedras ainda na pista e clicar de novo para mostrar a partida que acaba na hora. No fim, trocar para Reiniciar o jogo, clicar em Apertar Enter para mostrar a abertura com a pista vazia e clicar outra vez para mostrar a partida com a pista limpa. Meme na comparação: na frase do jogo de tabuleiro, mostrar por 2 a 3 segundos o meme ilustrado nosso, uma mão arrumando as peças de um tabuleiro de volta na saída, com a legenda "Reiniciar o jogo: tudo no lugar"; desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima seção, sem palpite nem pergunta final. Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o teste em que mudar o estado mantém as pedras antigas e terminar a comparação com o tabuleiro.

**Professora:**

> “Esta é uma experiência para a gente entender como preparar uma partida nova depois do fim. Aqui, o Enter começa a partida, e dá para escolher o que ele faz no fim.
>
> Olha aqui: em No fim, o Enter faz, eu escolho Mudar o estado do jogo para inicio. Clico em Apertar Enter, e a partida começa. Uma pedra bate na nave, e a partida termina. Clico em Apertar Enter, e o jogo volta para a abertura, mas percebe? As pedras da partida continuam na pista. Clico de novo para jogar, e a partida nova começa com as pedras velhas e acaba na hora, com uma batida. Ou seja, mudar só o estado não arruma o que ficou da partida anterior.
>
> É como um jogo de tabuleiro: para jogar de novo, você volta todas as peças para a saída. Se ninguém arruma as peças, a partida nova já começa bagunçada.”

**Na tela:** Trocar para Reiniciar o jogo e mostrar abertura e nova partida com a pista limpa.

**Professora:**

> “Para recomeçar com tudo arrumado, eu troco, no fim, para Reiniciar o jogo e clico em Apertar Enter. Olha só: a abertura volta, e a pista fica vazia. Clico outra vez, e a partida começa com a pista limpa, porque Reiniciar o jogo faz de novo a preparação de Ao iniciar. No seu jogo, o Enter vai reiniciar o jogo quando a partida terminar.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção.”

**Recado na página (não gravar):** Sua vez: depois de perder, compare Mudar o estado do jogo para inicio com Reiniciar o jogo e repare nas pedras quando a partida nova começa. Quando terminar, clique em Próxima seção.

## Seção 4. Faça Enter preparar outra partida

### Clipe `video-enter` · Faça Enter preparar outra partida

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Começar pela retomada: perder, apertar Enter e, no "Percebe?", mostrar que a tela Você perdeu continua. Ampliar o evento existente, sem criar um segundo Enter, clicando no + que fica antes de senão se; a pergunta x > 0 de cada ramo novo vai para a lixeira. Verificar pontos e corações somente após começar, porque a tela de abertura os cobre. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado. Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “No seu jogo, comece uma partida, perca e aperte Enter. Percebe? Você perdeu continua na tela, porque o Enter só sabe começar a partida.
>
> Lembra da experiência da seção anterior? Reiniciar o jogo deixava tudo limpo para outra partida. Agora a gente vai ensinar isso ao Enter do seu jogo.
>
> Encontre o evento Enter em Quando acontecer. A condição dentro dele já começa a partida quando o estado é inicio, e esse pedaço fica como está. Na linha de baixo do Se que está dentro do evento Enter, clique uma vez no + que fica antes de senão se.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Esse ramo novo vai perguntar se a partida acabou. Ele chega com a pergunta x maior que 0: arraste essa pergunta para a lixeira e deixe à vista o lugar vazio ao lado de senão se. Abra Jogo 2D, depois Jogo e telas e depois Telas e partida, pegue o bloco o estado do jogo é, solte nesse lugar e escolha fim.
>
> Deixe à vista o espaço do então do ramo fim. Na mesma categoria Telas e partida, pegue o bloco Reiniciar o jogo e solte nesse espaço.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Depois de ganhar, também dá para jogar de novo. Por isso, agora a vitória, do mesmo jeito. Clique de novo no + que fica antes de senão se. Arraste a pergunta x maior que 0 do ramo novo para a lixeira e deixe à vista o lugar vazio. Na mesma categoria, pegue o estado do jogo é, solte nesse lugar e escolha vitoria. Depois, deixe à vista o então do ramo vitoria, pegue outro Reiniciar o jogo e solte nesse espaço.
>
> Agora teste: perca uma partida e aperte Enter. Olha só: a abertura volta. Aperte Enter outra vez, porque é esse segundo Enter que começa a partida nova. Repare que o placar está em zero e os três corações voltaram, porque Reiniciar o jogo fez a preparação de novo.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste.

**Professora:**

> “Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: dentro do evento Enter, o Se tem três ramos. Em inicio, o Enter muda o estado para jogando. Em fim e em vitoria, o Enter reinicia o jogo. E Dar ao sprite nave 3 de vida continua em Ao iniciar. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.”

**Recado na página (não gravar):** Agora faça o Enter preparar outra partida. Acrescente ao evento Enter os ramos fim e vitoria, com Reiniciar o jogo, e clique em Verificar esta etapa. Depois, clique em Próxima seção.

## Seção 5. Confira o que você construiu

**Recado na página (não gravar):** Hora de lembrar o que você construiu. Responda sobre o Enter, a partida e a vitória, pensando nos testes do seu jogo. Depois de clicar em Enviar quiz, leia as explicações: se alguma resposta não estiver certa, é só trocar a resposta e clicar em Enviar quiz de novo. Quando acertar todas, clique em Próxima seção.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do recado, com todas as perguntas numa página só. Leia as explicações depois de clicar em Enviar quiz; envios ilimitados, sem espera.

## Seção 6. Teste o jogo completo e compartilhe

### Clipe `video-ciclo-completo` · Teste o jogo completo e compartilhe

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Direção geral do clipe:** Gravar os testes completos, encurtando só o tempo repetido de partida. Não reduzir alvo, retirar dano ou alterar o jogo para forjar vitória. Mostrar verificação, envio, confirmação e publicação opcional, com o resumo já preenchido, Publicado!, Copiar link e Fechar. O fechamento nomeia o que a pessoa programou e o resultado no jogo; o preparo dos desenhos fica nas notas da equipe, sem ressalva na fala. Ao terminar, clicar em Verificar esta etapa, mostrar Objetivo da etapa cumprido! e seguir o encaminhamento narrado. Executar cada gesto junto da fala correspondente.

**Na tela:** Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar antes de seguir para o próximo passo.

**Professora:**

> “Agora teste o ciclo completo do seu jogo. Na abertura, clique na área do jogo e aperte a barra de espaço. Repare: não sai som de tiro, porque criar tiros e criar asteroides ficam dentro de Se jogando. Confira também nos blocos se os dois estão lá.
>
> Aperte Enter, mova a nave e atire. Depois, deixe as três vidas acabarem e confira a tela Você perdeu. Aperte Enter para voltar à abertura e mais uma vez para começar, e confira se a partida nova começa com zero pontos e três corações.”

**Na tela:** Seguir a demonstração no ritmo da próxima fala, sem corte. Manter livres os campos, os encaixes e o resultado do teste. No fim da fala, mostrar a tela Publicado!, com Copiar link à vista, e manter a janela parada.

**Professora:**

> “Agora vá atrás da vitória: nessa nova partida, tente chegar a 26 pontos para ver a tela Você ganhou!. Se perder antes, recomece e tente de novo. Na vitória, aperte a barra de espaço: não pode sair nenhum tiro. Aperte Enter para voltar à abertura e outra vez para jogar, e confira de novo os pontos e as vidas. Se algum final não funcionar, reveja a pergunta que muda o estado e o ramo que mostra aquela tela.
>
> Olha só o que você programou: os controles, os tiros, os acertos, os pontos, as vidas e as telas. É com essas regras que a sua nave enfrenta os asteroides do começo ao fim da partida. Pronto: o seu jogo está completo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, clique em Enviar para o professor e confirme em Enviar. Agora, se quiser, você pode publicar o seu jogo no Mural, ou deixar para outra hora. Para publicar, clique em Compartilhar depois do envio. O resumo do projeto já vem preenchido. Deixe como está. Depois, clique em Gerar capa e confira a imagem. Com a capa pronta, clique em Publicar e espere a confirmação. Quando aparecer Publicado!, o seu jogo já está no Mural dos Criadores.”

**Na tela:** Clicar em Copiar link e em Fechar junto da fala, sem cobrir a confirmação.

**Professora:**

> “Agora qualquer pessoa pode jogar o jogo que você criou. Clique em Copiar link e mande para os amigos, para o grupo, para quem você quiser: quem receber joga direto, até no celular. Depois de copiar o link, clique em Fechar. Por último, clique em Concluir aula.”

**Recado na página (não gravar):** Hora do teste final. Confira a derrota, a vitória e o recomeço, clique em Verificar esta etapa e envie o seu projeto ao professor. Se quiser, publique o seu jogo no Mural. Depois, clique em Concluir aula.
