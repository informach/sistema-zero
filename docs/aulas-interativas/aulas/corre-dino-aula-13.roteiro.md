# Roteiro de gravação · Corre, Dino! · Aula 13

**Aumente a dificuldade com um limite**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Corrida completa com placar e sorteios, usando base fixa -5. Saída: Base velocidade começa em -5, diminui a cada 5 segundos até -9, com variação de 0 a 1; descrição dos três controles e publicação opcional.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare os números negativos

### Clipe `video-regua-negativos` · Compare os números negativos

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "Seu jogo usa velocidades negativas para andar para a esquerda. Antes de aumentar a dificuldade, compare esses números numa régua.
>
> Clique em Somar -1 três vezes e observe o marcador. Clique em Voltar ao começo. No sinal da pergunta, escolha maior que, o símbolo >.
>
> Observe a resposta com o marcador em -5. Depois leve o marcador até -9 e compare a resposta.
>
> Clique em Voltar ao começo novamente. Escolha o sinal de igual e clique em Somar -1 quatro vezes. Acompanhe quando a pergunta muda de resposta.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Compare os sinais e acompanhe a régua de -5 até -9.

## Seção 2. Compare a base com cada cacto

### Clipe `video-o-que-o-freio-segura` · Compare a base com cada cacto

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "A régua mostrou como a base pode mudar. Agora compare essa base com a velocidade que cada cacto recebe ao nascer.
>
> Deixe a condição ligada. Clique em Passar 5 segundos cinco vezes. Observe a base e os números escritos nos cactos que já nasceram.
>
> Com a base em -9 e a condição ligada, continue clicando em Passar 5 segundos até aparecer um cacto com -10. Compare a conta desse cacto com a base.
>
> Desligue a condição e clique em Passar 5 segundos mais cinco vezes. Compare até onde a base foi e observe se os cactos antigos trocaram de número.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Compare base, cactos novos e antigos; depois desligue a condição e avance.

## Seção 3. Guarde a velocidade base

### Clipe `video-numero-que-manda` · Guarde a velocidade base

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou a base com a velocidade dos cactos. No seu criador, o lado esquerdo da conta ainda contém -5 escrito. Agora guarde essa base numa variável que poderá mudar.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o fim de Ao iniciar, depois de Criar variável pontos. Abra Programação e depois Variáveis. Pegue Criar variável com valor e encaixe no fim. Troque contador por velocidade e o valor por -5.
>
> Deixe à vista o -5 à esquerda da Conta matemática no vx do criador de cactos. Abra Programação e depois Valores. Pegue valor da variável e solte sobre esse -5. Escolha velocidade. Preserve o sinal de menos e o sorteio de 0 a 1 à direita.
>
> Comece uma partida. O comportamento continua igual, pois a variável guarda o mesmo -5 de antes. Confira onde esse número é preparado e onde é lido. Ainda não há regra para mudar a base durante a corrida.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Prepare velocidade em -5 e use sua leitura à esquerda da conta do vx.

## Seção 4. Prepare o relógio da dificuldade

### Clipe `video-relogio-da-dificuldade` · Prepare o relógio da dificuldade

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência Compare a base com cada cacto, o tempo disparava uma mudança na base. Seu jogo ainda não tem esse relógio. Prepare outro intervalo, separado dos cactos e dos pontos.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista um espaço em Enquanto estiver rodando, fora do quadro e dos dois relógios existentes. Abra Jogo 2D, depois Tempo e Quadros e intervalos. Pegue A cada 2 segundos, encaixe nesse espaço e mude o valor para 5.
>
> Deixe à vista o interior desse relógio. Abra Programação e depois Lógica e Se. Pegue Se e encaixe ali. Retire a pergunta x > 0.
>
> Deixe à vista o lugar da pergunta. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe e escolha jogando.
>
> Confira três relógios separados: cactos em 1.4 segundo, pontos no intervalo escolhido e dificuldade em 5 segundos. O então do novo relógio ainda está vazio; não muda a base nesta etapa.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Prepare um relógio de 5 segundos com Se jogando, separado dos outros.

## Seção 5. Diminua a base até o limite

### Clipe `video-acelerador-e-freio` · Diminua a base até o limite

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência Compare a base com cada cacto, a condição impedia a base de passar do limite. Seu relógio de dificuldade já espera a partida, mas ainda não faz nada. Agora programe a mudança com essa condição.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o então vazio de Se jogando no relógio de 5 segundos. Abra Programação e depois Lógica e Se. Pegue outro Se e encaixe dentro desse então. Mantenha a comparação que veio nele.
>
> Deixe à vista o lado esquerdo da comparação do Se de dentro. Abra Programação e depois Valores. Pegue valor da variável, solte sobre o valor da esquerda e escolha velocidade.
>
> No sinal, escolha maior que, o símbolo >. No lado direito, escreva -9. A pergunta fica velocidade maior que -9. Na régua, -5 fica à direita de -9 e é maior; ao chegar a -9, a resposta deixa de ser sim.
>
> Deixe à vista o então do Se de dentro. Abra Programação e depois Variáveis. Pegue Somar em variável e encaixe ali. Escolha velocidade e coloque -1 no valor da soma.
>
> Confira: no relógio de 5 segundos, Se jogando contém Se velocidade > -9, e só dentro dele fica Somar -1 em velocidade. Há um único bloco de soma para essa variável.
>
> Teste uma partida longa. A base dos cactos novos muda aos poucos; os que já nasceram conservam sua velocidade. Se perder cedo, a comparação completa continua disponível na experiência. Se a base não mudar, confira o sinal > e a posição do Somar dentro dos dois então.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Some -1 em velocidade somente jogando e enquanto a base for maior que -9.

## Seção 6. Complete a descrição dos controles

### Clipe `video-descricao-completa` · Complete a descrição dos controles

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu jogo aceita três controles de pulo. A descrição escrita na aula 2 citava apenas espaço. Complete essa frase para quem usa o leitor de tela.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista Descrever o jogo para leitor de tela, em Ao iniciar. No texto, escreva Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela.
>
> Confira a frase inteira e teste os três controles no jogo. A descrição explica os controles existentes; não cria um controle novo. O objetivo e as três entradas precisam estar no texto.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Descreva a tarefa e os três controles que já funcionam.

## Seção 7. Confira o que você construiu

**Zappy na página (não gravar):** Retome os sorteios e a dificuldade da corrida nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 8. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu Corre, Dino! já tem começo, pulo com som, obstáculos, pontos, derrota, reinício e dificuldade que aumenta. Teste esse ciclo inteiro, por tecla e por toque, no projeto que você construiu.
>
> O exemplo usa intervalo 5 e limite -9. Se quiser ajustar, teste um intervalo entre 2 e 10 segundos e um limite entre -14 e -7. Escolha um valor por vez e compare. O limite segura a base; o sorteio ainda pode produzir um cacto uma unidade mais rápido.
>
> Confira o reinício depois de uma derrota: pontos voltam a zero, a base volta a -5 e a abertura aparece. Comece outra partida e confira os três controles.
>
> Os desenhos do Dino, da floresta e dos efeitos vêm nos blocos. Você montou as regras que fazem essas partes funcionar juntas. Depois de enviar, pode compartilhar o seu jogo no Mural se quiser.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Se quiser mostrar o jogo no Mural, clique em Compartilhar depois do envio. Confira o título e escreva um resumo do seu jogo. Clique em Gerar capa e confira a imagem. Depois clique em Publicar. Espere a mensagem Seu jogo está no Mural! e clique em Fechar. Publicar é opcional; você também pode deixar para outra hora. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
