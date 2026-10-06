# Roteiro de gravação · Nave Contra Asteroides · Aula 6

**Conte os acertos**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som. Saída: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Guarde e mostre um número

### Clipe `video-variavel` · Guarde e mostre um número

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Mudar número guardado em pontos para 1 e voltar para 0. Com Mostrar placar desligado, clicar em Somar 1 em pontos duas vezes e mostrar o número guardado em 2, com a tela sem placar. Ligar Mostrar placar e mostrar Pontos: 2 na tela; somar 1 e mostrar os dois em 3. A comparação ajuda, mas não substitui os testes nos controles reais. Meme na comparação: na frase do bloquinho, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy anotando pontos: 2 num bloquinho, ao lado de um placar de estádio mostrando 2, com a legenda "guardar · mostrar"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender a variável: o lugar onde o jogo guarda um número que pode mudar. Aqui, a variável se chama pontos.
>
> Olha aqui: eu mudo número guardado em pontos para 1 e depois volto para 0. Agora pontos existe e começa em 0, como no começo de uma partida. Com Mostrar placar desligado, eu clico em Somar 1 em pontos duas vezes. O número guardado vai para 1 e depois para 2, mas a tela do jogo não mostra nada. O jogo guardou e mudou o número sem mostrar.
>
> É como anotar os gols de um jogo num bloquinho. O número fica anotado, mesmo que ninguém esteja vendo. O placar do estádio só mostra o que já foi anotado.
>
> Agora eu ligo Mostrar placar. A tela mostra Pontos: 2, o mesmo número guardado. Clico em Somar 1 em pontos mais uma vez, e os dois vão para 3. Guardar, mudar e mostrar são três coisas diferentes. No seu jogo, a soma vai acontecer em cada acerto, e o placar vai mostrar o valor de pontos.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Mude pontos com o placar desligado. Depois ligue Mostrar placar e compare.

## Seção 2. Some um ponto a cada acerto

### Clipe `video-pontos-e-placar` · Some um ponto a cada acerto

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o contador inicial, um erro e dois acertos. O bloco de placar fica fora da colisão e depois dela. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Lembra da experiência da parte anterior? Você guardou, mudou e mostrou um número. No seu jogo, um acerto ainda não tem placar para mostrar o ponto. Agora ligue a contagem à colisão e mostre o valor guardado.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Deixe à vista o fim de Ao iniciar. Abra Programação e depois Variáveis. Pegue Criar variável com valor e encaixe no fim de Ao iniciar. Escreva pontos no nome e mantenha valor 0. Assim, cada partida começa sem pontos.
>
> Deixe à vista o fim da colisão entre tiros e asteroides, depois do som de explosão. Ainda em Programação e Variáveis, pegue Somar em variável. Encaixe no fim da colisão entre tiros e asteroides, depois de Tocar efeito explosão. Escolha pontos e confira a soma de 1. O bloco fica dentro da colisão para somar somente quando houver acerto.
>
> Deixe à vista o encaixe depois do bloco inteiro da colisão, dentro de A cada quadro do jogo. Abra Jogo 2D, depois Vida e placar e Indicadores e texto na tela. Pegue Mostrar placar e encaixe depois do bloco inteiro da colisão, ainda dentro de A cada quadro do jogo. No texto, escreva Pontos:.
>
> Deixe à vista o número do campo valor do placar. Abra Programação e depois Valores. Pegue valor da variável e solte sobre o número do campo valor do placar. Escolha pontos. O placar vai ler o valor que o jogo guardou, em vez de mostrar sempre o mesmo número.
>
> No placar, coloque x 12, y 30 e tamanho 24. Escolha a cor branca para aparecer no fundo escuro. Esses números posicionam e dimensionam o texto, não mudam a pontuação.
>
> Clique no jogo e faça um tiro passar sem acertar. O placar deve ficar igual. Depois acerte uma pedra: deve aumentar em 1. Acerte outra: deve somar mais 1. Se os pontos subirem sem parar, confira se Somar está dentro da colisão, e não solto em A cada quadro do jogo. Se o número não mudar na tela, confira se o placar lê a variável pontos.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o guia e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Crie pontos, some dentro da colisão e mostre o valor no placar. Teste erro e acerto antes de enviar.
