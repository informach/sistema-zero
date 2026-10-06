# Roteiro de gravação · Nave Contra Asteroides · Aula 6

**Conte os acertos**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som. Saída: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "ou seja", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste curso, "então" é o encaixe do bloco Se e não aparece como palavra de ligação. A ponte do Zappy começa convidando ("Sua vez!", "Agora…!", "Hora de…!") e termina na ação de saída. Cada montagem que aplica uma experiência começa por uma retomada curta, nesta ordem: o teste no próprio jogo ("Tá vendo?", com o porquê), a lembrança da experiência numa frase e o anúncio, uma vez só, colado ao primeiro passo. Depois de montar, a criança testa direto; a lista dos blocos entra uma vez só, depois do teste ("Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …").

## Seção 1. Guarde e mostre um número

### Clipe `video-variavel` · Guarde e mostre um número

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Mudar número guardado em pontos para 1 e voltar para 0. Com Mostrar placar desligado, clicar em Somar 1 em pontos duas vezes e mostrar o número guardado em 2, com a tela sem placar. Ligar Mostrar placar e mostrar Pontos: 2 na tela; somar 1 e mostrar os dois em 3. A comparação ajuda, mas não substitui os testes nos controles reais. Meme na comparação: na frase do bloquinho, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy anotando pontos: 2 num bloquinho, ao lado de um placar de estádio mostrando 2, com a legenda "guardar · mostrar"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima parte, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender a variável: o lugar onde o jogo guarda um número que pode mudar. Aqui, a variável se chama pontos.
>
> Olha aqui: eu mudo número guardado em pontos para 1 e depois volto para 0. Agora pontos existe e começa em 0, como no começo de uma partida. Com Mostrar placar desligado, eu clico em Somar 1 em pontos duas vezes. Tá vendo? O número guardado vai para 1 e depois para 2, mas a tela do jogo não mostra nada. Ou seja, o jogo guardou e mudou o número sem mostrar.
>
> É como anotar os gols de um jogo num bloquinho: o número fica anotado, mesmo que ninguém esteja vendo. O placar do estádio só mostra o que já foi anotado.
>
> Agora eu ligo Mostrar placar. Olha só: a tela mostra Pontos: 2, o mesmo número guardado. Clico em Somar 1 em pontos mais uma vez, e os dois vão para 3. Guardar, mudar e mostrar são três coisas diferentes. No seu jogo, a soma vai acontecer em cada acerto, e o placar vai mostrar o valor de pontos.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte."

**Zappy na página (não gravar):** Sua vez! Mude pontos com o placar desligado, depois ligue Mostrar placar e compare. Quando terminar, clique em Próxima parte.

## Seção 2. Some um ponto a cada acerto

### Clipe `video-pontos-e-placar` · Some um ponto a cada acerto

**Estimativa de gravação:** aproximadamente 5 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Começar pela retomada: acertar uma pedra e, no "Tá vendo?", mostrar que nenhum placar aparece. Mostrar o contador inicial, um erro e dois acertos. O bloco de placar fica fora da colisão e depois dela. Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Clique no seu jogo e acerte uma pedra. Tá vendo? Nenhum ponto aparece, porque o jogo ainda não conta os acertos.
>
> Lembra da experiência da parte anterior? A variável pontos guardava o número, e o placar mostrava esse número na tela. Agora a gente vai contar os pontos no seu jogo!
>
> A variável nasce quando o jogo começa, no fim de Ao iniciar: deixe esse lugar à vista.
>
> Agora abra Programação e depois Variáveis, e pegue o bloco Criar variável com valor. Arraste e solte no fim de Ao iniciar. Repare: o nome chega como contador. Troque contador por pontos e clique fora do campo. O valor já vem em 0: mantenha, porque cada partida começa sem pontos.
>
> O ponto só pode ser somado quando um tiro acerta uma pedra. Por isso, a soma vai dentro da colisão entre tiros e asteroides, no fim, logo depois de Tocar efeito explosão: deixe esse lugar à vista.
>
> Ainda em Programação e Variáveis, pegue o bloco Somar em variável e solte logo depois de Tocar efeito explosão, dentro da colisão. Escolha pontos. O número já vem em 1: mantenha, porque cada acerto vale um ponto.
>
> Agora o placar, que precisa aparecer em todo quadro, e não só no acerto. Por isso, ele fica fora da colisão: deixe à vista o encaixe logo depois do bloco inteiro da colisão, ainda dentro de A cada quadro do jogo.
>
> Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela, pegue o bloco Mostrar placar e solte nesse encaixe. O texto já vem Pontos:, que é o que aparece antes do número: mantenha.
>
> O número do placar precisa ler o valor guardado em pontos. Deixe à vista o número do campo valor do placar. Abra Programação e depois Valores, pegue o bloco valor da variável, solte em cima desse número e escolha pontos. Assim, o placar mostra o número que o jogo guardou, em vez de mostrar sempre o mesmo número.
>
> O placar já vem em x 12, y 30 e tamanho 24: mantenha. Escolha a cor branca, para aparecer no fundo escuro. Esses números só posicionam e dimensionam o texto, e não mudam a pontuação.
>
> Agora teste: clique na área do jogo e deixe um tiro passar sem acertar. O placar tem que ficar igual, porque nenhum tiro acertou. Depois, acerte uma pedra. Olha só: Pontos vai para 1! E, se você acertar outra, o placar soma mais 1.
>
> Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Criar variável pontos com valor 0. Dentro da colisão entre tiros e asteroides, depois de Tocar efeito explosão, está Somar 1 em variável pontos. E, logo depois da colisão, ainda dentro de A cada quadro do jogo, está Mostrar placar Pontos:, com o valor da variável pontos, em x 12, y 30 e tamanho 24. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar meu projeto e confirme em Enviar. Quando o envio terminar, clique em Concluir fase."

**Zappy na página (não gravar):** Agora faça o seu jogo contar os pontos! Crie pontos, some 1 no acerto e mostre o placar. Depois, teste, clique em Verificar esta parte e envie o seu projeto. Por último, clique em Concluir fase.
