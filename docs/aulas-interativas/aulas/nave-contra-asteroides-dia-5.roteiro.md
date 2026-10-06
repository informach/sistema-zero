# Roteiro de gravação · Nave Contra Asteroides · Aula 9

**Termine e recomece a partida**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício. Saída: Jogo completo original: alvo 26, vitória, derrota, retorno à abertura e nova partida.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Defina quando ganhar e perder

### Clipe `video-finais` · Defina quando ganhar e perder

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Não apresentar uma tela final ainda ausente como teste aprovado. Manter a prioridade real da derrota no empate e a comparação >= do código original. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Agora vamos encerrar a partida ao chegar a 26 pontos ou ficar sem vidas. Deixe à vista o espaço entre Dar 3 de vida e Mudar o estado para inicio, dentro de Ao iniciar. Abra Programação e depois Variáveis. Pegue Criar constante com valor. Encaixe em Ao iniciar, depois de Dar ao sprite nave 3 de vida e antes de Mudar o estado do jogo para inicio. Escreva alvo no nome e 26 no valor. Uma constante guarda um valor que não muda durante a partida. Aqui, ela guarda a meta de pontos.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Vá ao fim do então de Se o estado do jogo é jogando, dentro de A cada quadro do jogo. Abra Programação e depois Lógica e Se. Pegue Se e encaixe depois de Desenhar as vidas do sprite, ainda dentro de jogando.
>
> Vamos perguntar se pontos chegou ao alvo. Mantenha a comparação que veio na condição. No lado esquerdo, escolha pontos no bloco valor da variável. No sinal, escolha maior ou igual. Deixe à vista o número à direita da comparação. Abra Programação e depois Valores. Pegue valor da variável e solte sobre o número do lado direito da comparação. Escolha alvo. Confira: pontos maior ou igual a alvo.
>
> Deixe à vista o então da condição que acabou de montar. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue Mudar o estado do jogo para, encaixe dentro do então dessa comparação e escolha vitoria.
>
> Deixe à vista o encaixe abaixo da condição de vitória, dentro de jogando. Agora monte a derrota. Abra Programação e depois Lógica e Se. Pegue outra Se e encaixe logo depois da condição de vitória, ainda dentro de jogando. Retire a comparação que veio nesse novo bloco.
>
> Deixe à vista a condição vazia da derrota. Abra Jogo 2D, depois Vida e placar e Vida. Pegue as vidas do sprite acabaram?, encaixe na condição vazia e escolha nave. Deixe à vista o então da condição que acabou de montar. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue Mudar o estado do jogo para, encaixe no então dessa condição e escolha fim.
>
> Confira a ordem no fim da partida: desenho das vidas, condição de vitória e condição de derrota. Se as duas condições acontecerem no mesmo quadro, a de derrota vem por último. As telas desses finais ainda não foram montadas. Nesta etapa, confira os encaixes; vamos mostrar os resultados na próxima seção.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Crie a meta e acrescente as condições de vitória e derrota dentro de jogando.

## Seção 2. Mostre a vitória e a derrota

### Clipe `video-mostrar-telas` · Mostre a vitória e a derrota

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Criar um ramo por vez, sem remontar inicio. Não alegar que Enter reinicia nesta etapa. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Vamos mostrar uma tela para cada final. Encontre a condição maior, dentro de A cada quadro do jogo. Ela já tem jogando e o senão se de inicio. Clique no + ao lado de senão se, na parte de baixo do bloco, uma vez para criar o ramo da vitória.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Retire a comparação do ramo novo. Deixe à vista a condição do ramo novo. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe nessa condição e escolha vitoria. Deixe à vista o então do ramo vitoria. Na mesma categoria, pegue Mostrar tela com título subtítulo dica fundo e encaixe no então desse ramo.
>
> No título, escreva Você ganhou!. Apague o subtítulo e deixe vazio. Na dica, escreva Aperte Enter para voltar ao início. Escolha um fundo escuro com letras legíveis.
>
> Clique no + ao lado de senão se, na parte de baixo do bloco, outra vez para criar o ramo da derrota. Retire a comparação. Deixe à vista a condição do ramo novo. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe nessa condição e escolha fim. Deixe à vista o então do ramo fim. Pegue Mostrar tela com título subtítulo dica fundo na mesma categoria e encaixe no então desse ramo.
>
> No título, escreva Você perdeu. Deixe o subtítulo vazio. Na dica, escreva Aperte Enter para voltar ao início. Escolha um fundo escuro. Confira os ramos: primeiro jogando, depois inicio, depois vitoria e depois fim.
>
> Clique no jogo, comece com Enter e deixe as vidas acabarem. A tela Você perdeu deve aparecer. Se não aparecer, confira se a condição das vidas muda para fim e se o ramo dessa tela pergunta por fim. A dica já fala em voltar ao início, mas essa resposta do Enter será montada depois da experiência.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Acrescente os ramos vitoria e fim depois do ramo inicio, com os textos de cada tela.

## Seção 3. Compare voltar à abertura e reiniciar

### Clipe `video-reiniciar` · Compare voltar à abertura e reiniciar

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** A experiência restart usa Apertar Enter. Mostrar onde escolher a ação final, sem realizar os dois ciclos. A abertura pode cobrir indicadores: compará-los quando a partida começa.

**Narração:**
> "Para jogar de novo, precisamos preparar uma nova partida. Vamos comparar mudar somente o estado com reiniciar o jogo.
>
> Nesta experiência, em No fim, o Enter faz, escolha Mudar o estado do jogo para inicio. Clique em Apertar Enter para começar e espere a partida terminar. Clique em Apertar Enter para voltar à abertura e clique outra vez para tentar jogar. Observe os valores e o que ficou da partida anterior.
>
> Quando estiver no final novamente, troque para Reiniciar o jogo. Clique em Apertar Enter para voltar à abertura. Clique outra vez para começar e observe os valores da nova partida.
>
> Depois da comparação, clique em Próxima seção."

**Zappy na página (não gravar):** Depois de perder, compare mudar para inicio com Reiniciar o jogo. Observe os valores ao começar outra partida.

## Seção 4. Faça Enter preparar outra partida

### Clipe `video-enter` · Faça Enter preparar outra partida

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Ampliar o evento existente, sem criar um segundo Enter. Verificar pontos e corações somente após começar, porque a tela de abertura os cobre. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou mudar apenas o estado com reiniciar a preparação. No seu jogo, deixe as vidas acabarem e toque em Enter: ele ainda não volta à abertura. Agora acrescente essa resposta.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Reiniciar o jogo executa a preparação de Ao iniciar de novo. Assim, pontos volta a zero, a nave recebe três vidas, os grupos são preparados e o estado volta para inicio.
>
> Encontre o evento Enter em Quando acontecer. A condição dentro dele já começa a partida quando o estado é inicio. Vamos manter essa parte. Clique no + ao lado de senão se, na parte de baixo do bloco, uma vez.
>
> Retire a comparação do ramo novo. Deixe à vista a condição do ramo novo. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe na condição e escolha fim. Deixe à vista o então do ramo fim. Na mesma categoria, pegue Reiniciar o jogo e encaixe no então desse ramo.
>
> Clique no + ao lado de senão se, na parte de baixo do bloco, outra vez. Retire a comparação. Deixe à vista a condição do ramo novo. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe na nova condição e escolha vitoria. Deixe à vista o então do ramo vitoria. Pegue outro Reiniciar o jogo na mesma categoria e encaixe no então.
>
> Confira o evento inteiro: em inicio, Enter muda para jogando. Em fim e em vitoria, Enter reinicia o jogo. Se estiver jogando, Enter não faz nenhuma dessas três ações.
>
> Teste uma derrota e toque em Enter. A abertura deve voltar. Toque em Enter outra vez: é esse segundo Enter que começa a partida nova. Agora confira o placar em zero e os três corações. Se as vidas não voltarem, confira se usou Reiniciar o jogo e se Dar 3 de vida continua em Ao iniciar.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Amplie o evento Enter com os ramos fim e vitoria. Em cada um, use Reiniciar o jogo.

## Seção 5. Confira o que você construiu

**Zappy na página (não gravar):** Responda pensando nos testes do seu jogo. Depois de enviar, leia as explicações. Se precisar, corrija e tente de novo. Quando acertar todas, clique em Próxima seção.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 6. Teste o jogo completo e compartilhe

### Clipe `video-ciclo-completo` · Teste o jogo completo e compartilhe

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Gravar os testes completos, encurtando só o tempo repetido de partida. Não reduzir alvo, retirar dano ou alterar o jogo para forjar vitória. Mostrar verificação, Salvo, envio, confirmação e publicação opcional. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Agora teste o ciclo completo do jogo. Na abertura, clique na área do jogo e toque na barra de espaço. Não deve sair som de tiro. Confira também os blocos: criar tiros e criar asteroides precisam estar dentro de Se jogando.
>
> Toque em Enter, mova a nave e atire. Deixe as três vidas acabarem e confira a tela Você perdeu. Toque em Enter para voltar à abertura e mais uma vez para começar. Confira zero pontos e três corações.
>
> Nessa nova partida, tente chegar a 26 pontos para conferir Você ganhou!. Se perder antes, recomece e tente de novo. Na vitória, teste a barra de espaço: não deve haver disparo. Toque em Enter para voltar à abertura e outra vez para jogar. Confira de novo os pontos e as vidas. Se algum final não funcionar, reveja a condição que muda o estado e o ramo que desenha aquela tela.
>
> Você montou os controles, os tiros, os acertos, os pontos, as vidas e as telas. Os blocos de nave, estrelas e efeitos já traziam esses desenhos prontos; você programou como eles participam do jogo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Se quiser mostrar o jogo no Mural, clique em Compartilhar depois do envio. Confira o título e escreva um resumo do seu jogo. Clique em Gerar capa e confira a imagem. Depois clique em Publicar. Espere a mensagem Seu jogo está no Mural! e clique em Fechar. Publicar é opcional; você também pode deixar para outra hora. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste derrota, vitória e reinício. Verifique, envie e escolha se quer publicar no Mural.
