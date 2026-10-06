# Roteiro de gravação · Nave Contra Asteroides · Aula 6

**Conte os acertos**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som. Saída: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Guarde e mostre um número

### Clipe `video-variavel` · Guarde e mostre um número

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Apontar o valor e a chave sem executar as somas. Não substituir a tarefa por metáfora de caixa.

**Narração:**
> "Seu jogo já sabe quando o tiro acerta. Agora vamos contar esses acertos. Uma variável guarda um valor que pode mudar. Nesta experiência, ela se chama pontos.
>
> No controle número guardado em pontos, aumente para 1 e depois volte para 0. Isso registra o valor inicial da experiência. Deixe Mostrar placar desligado. Clique em Somar 1 em pontos duas vezes e observe o número guardado.
>
> Ligue Mostrar placar e compare o número na tela com o número guardado. Clique em Somar 1 em pontos mais uma vez e acompanhe os dois. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Mude pontos com o placar desligado. Depois ligue Mostrar placar e compare.

## Seção 2. Some um ponto a cada acerto

### Clipe `video-pontos-e-placar` · Some um ponto a cada acerto

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o contador inicial, um erro e dois acertos. O bloco de placar fica fora da colisão e depois dela. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você guardou, mudou e mostrou um número. No seu jogo, um acerto ainda não tem placar para mostrar o ponto. Agora ligue a contagem à colisão e mostre o valor guardado.
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
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Crie pontos, some dentro da colisão e mostre o valor no placar. Teste erro e acerto antes de enviar.
