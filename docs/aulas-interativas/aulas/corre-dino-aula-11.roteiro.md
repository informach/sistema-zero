# Roteiro de gravação · Corre, Dino! · Aula 11

**Conte e mostre os pontos**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Corrida completa com colisão ajustada, ainda sem placar. Saída: Variável pontos em 0, mostrador, um ponto por segundo somente jogando e resultado na tela de fim.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare guardar, mudar e mostrar

### Clipe `video-guardar-mudar-mostrar` · Compare guardar, mudar e mostrar

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "Seu jogo ainda não conta pontos. Uma variável guarda um valor; o mostrador pode ler esse valor. Compare essas duas partes antes de montar.
>
> Na experiência, coloque o número guardado em 1 e depois em 0. Deixe Mostrar placar desligado. Clique em Somar 1 em pontos duas vezes e observe o número guardado.
>
> Ligue Mostrar placar. Compare o que aparece na tela com o número guardado. Clique em Somar 1 em pontos mais uma vez e acompanhe os dois.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Mude a memória com o placar desligado e depois acompanhe os dois juntos.

## Seção 2. Prepare os pontos em zero

### Clipe `video-caixinha-dos-pontos` · Prepare os pontos em zero

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você guardou um número e mudou esse valor. Seu projeto ainda não tem uma variável de pontos. Primeiro, prepare zero no começo de cada partida.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o fim de Ao iniciar. Abra Programação e depois Variáveis. Pegue Criar variável com valor e encaixe nesse fim. No nome, troque contador por pontos. Mantenha o valor em 0.
>
> Confira pontos e 0 em Ao iniciar. Ainda não há mostrador na tela; guardar um número não desenha o placar. Quando Reiniciar o jogo repetir essa preparação, o valor voltará a zero.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Crie pontos com valor 0 em Ao iniciar.

## Seção 3. Mostre o número guardado

### Clipe `video-numero-na-tela` · Mostre o número guardado

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência Compare guardar, mudar e mostrar, você ligou o placar para ler a memória. Sua variável pontos já existe, mas ainda não aparece. Agora desenhe esse valor durante a partida.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o fim do então de Se jogando, depois da limpeza do grupo cactos. Abra Jogo 2D, depois Vida e placar e Indicadores e texto na tela. Pegue Mostrar placar e encaixe nesse fim.
>
> No texto, escreva Pontos:. Deixe à vista o número do campo valor. Abra Programação e depois Valores. Pegue valor da variável e solte sobre esse número. Escolha pontos.
>
> No placar, coloque x 12, y 30 e tamanho 24. Escolha uma cor escura que apareça sobre a floresta. Comece uma partida: o placar deve mostrar zero. Ele ainda não cresce, pois não há uma regra de soma.
>
> Confira o leitor de pontos no valor do placar e o placar dentro de jogando. Se aparecer no início ou no fim, confira esse encaixe. Se não aparecer, confira a cor e as posições.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Mostre Pontos: lendo a variável pontos somente dentro de jogando.

## Seção 4. Compare quando somar os pontos

### Clipe `video-quando-o-placar-cresce` · Compare quando somar os pontos

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar a experiência no estado inicial e apontar os controles citados. Deixar os testes para quem faz a aula, sem antecipar os resultados.

**Narração:**
> "Seu placar já mostra zero. Antes de programar a soma, compare quantas vezes ela acontece e em quais estados.
>
> Na experiência, coloque Somar ponto em A cada quadro do jogo e deixe Tempo passar um segundo. Observe o placar.
>
> Deixe Somar ponto solto, fora do relógio e da condição. Na tela de início, deixe passar mais um segundo e observe.
>
> Leve Somar ponto para dentro de o estado do jogo é jogando ?, no relógio de um segundo. Ainda no início, deixe Tempo passar. Clique em Próxima tela até Jogando e observe os pontos crescerem. Depois clique em Próxima tela até Fim e deixe passar mais tempo.
>
> Depois dos testes, clique em Próxima seção."

**Zappy na página (não gravar):** Compare o ritmo da soma e depois os estados início, jogando e fim.

## Seção 5. Some um ponto por segundo de partida

### Clipe `video-relogio-dos-pontos` · Some um ponto por segundo de partida

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou o ritmo e o estado da soma. No seu jogo os pontos ainda ficam em zero. Agora some um por segundo enquanto a partida acontece.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista um espaço em Enquanto estiver rodando, fora do quadro e do relógio dos cactos. Abra Jogo 2D, depois Tempo e Quadros e intervalos. Pegue A cada 2 segundos, encaixe nesse espaço e mude o intervalo para 1.
>
> Deixe à vista o interior do novo relógio. Abra Programação e depois Lógica e Se. Pegue Se e encaixe ali. Retire a comparação x > 0.
>
> Deixe à vista a pergunta vazia. Abra Jogo 2D, depois Jogo e telas e Telas e partida. Pegue o estado do jogo é ?, encaixe e escolha jogando.
>
> Deixe à vista o então desse Se. Abra Programação e depois Variáveis. Pegue Somar em variável e encaixe dentro de então. Escolha pontos e deixe a soma em 1.
>
> Comece uma partida e observe dois pontos subirem. O intervalo de referência é 1 segundo; você pode escolher de 0.5 a 3 para comparar ritmos. Confira que só existe um Somar em variável pontos e que o relógio dos cactos continua em 1.4.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Some 1 em pontos dentro de um relógio próprio protegido por Se jogando.

## Seção 6. Mostre os pontos na tela de fim

### Clipe `video-frase-da-tela-de-fim` · Mostre os pontos na tela de fim

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Seu placar já lê a variável durante a partida. Use essa mesma leitura na mensagem final para mostrar quantos pontos ficaram guardados quando a corrida terminou.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o subtítulo Boa tentativa! da tela no ramo fim, dentro do Se do quadro. Abra Programação e depois Valores. Pegue juntar texto e solte sobre esse subtítulo, substituindo o texto anterior.
>
> Clique três vezes no + do bloco juntar texto. Ele cria três entradas, que começam com números. Vamos preencher texto, valor e texto, nessa ordem.
>
> Deixe à vista a primeira entrada. Ainda em Programação e Valores, pegue o bloco de texto que mostra Olá e solte sobre o primeiro número. Escreva Você fez e deixe um espaço depois de fez.
>
> Deixe à vista a entrada do meio. Em Programação e Valores, pegue valor da variável, solte sobre o número do meio e escolha pontos.
>
> Deixe à vista a última entrada. Em Programação e Valores, pegue outro texto Olá e solte sobre o último número. Escreva um espaço no começo, seguido de pontos. Tente bater essa marca!
>
> Comece, espere o placar crescer e deixe ocorrer uma batida. Leia a mensagem: Você fez, o número da partida e o restante da frase devem aparecer juntos. Se aparecer um zero escrito ou faltar espaço, confira as três entradas e a leitura de pontos no meio.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Monte a frase com texto, valor de pontos e texto no subtítulo final.

## Seção 7. Confira o que você construiu

**Zappy na página (não gravar):** Retome a memória e o placar nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 8. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Sua corrida já conta os pontos e mostra o resultado. Espere na abertura: o placar não deve aparecer. Comece e observe os pontos crescerem.
>
> Deixe ocorrer uma batida e confira o número na frase final. Volte à abertura, espere um pouco e comece outra partida: o placar deve começar do zero. Se a contagem continuar fora da partida, confira Se jogando no relógio da soma.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
