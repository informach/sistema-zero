# Roteiro de gravação · Corre, Dino! · Aula 12

**Varie o lugar e a velocidade dos cactos**

Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Cactos nascendo sempre em x 560 e velocidade -5; partida completa com pontos. Saída: Nascimento com x de 500 a 560 e vx igual a -5 menos um número de 0 a 1.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare os resultados de um sorteio

### Clipe `video-sorteio-tira-na-hora` · Compare os resultados de um sorteio

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado. Começar sem sorteios. Clicar em Sortear lugar até aparecerem lugares diferentes e uma repetição marcada na régua. Clicar em Sortear velocidade até aparecerem um -5 e um -6 nas raias. Na frase da conta, mostrar a legenda -5 - 0 = -5 e -5 - 1 = -6 ao lado das raias, sem cobrir a experiência: a cena não escreve essas contas. Meme ilustrado na frase da comparação, por 2 a 3 segundos: o Zappy tirando papeizinhos de um saquinho, com os números 500, 530 e 560. Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência. Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima seção.

**Narração:**
> "Esta é uma experiência para a gente entender o sorteio, que escolhe um valor na hora em que cada cacto nasce.
>
> Olha aqui: quando eu clico em Sortear lugar (velocidade fica −5), sai um lugar na régua. Clico de novo, e sai outro. Eu continuo clicando, e alguns lugares saem de novo: a régua marca quantas vezes cada um saiu. Todos ficam entre 500 e 560, depois da borda 480, fora da tela. O sorteio respeita os limites, e um lugar pode repetir.
>
> Depois eu clico em Sortear velocidade (lugar fica 500) até sair um cacto -5 e um -6. Nas raias, o -6 chega mais longe em um segundo: ele é mais rápido. A conta é -5 menos o número sorteado. Se sair 0, fica -5. Se sair 1, fica -6.
>
> É como tirar um papelzinho de um saquinho e devolver: cada vez sai um, e o mesmo pode sair de novo. No seu jogo, você vai trocar o x 560 por um número entre 500 e 560.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Sorteie posições até comparar diferenças e repetições; depois compare as duas velocidades.

## Seção 2. Sorteie onde cada cacto nasce

### Clipe `video-lugar-diferente` · Sorteie onde cada cacto nasce

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você sorteou posições e viu que um lugar pode repetir. No seu jogo, todo cacto ainda nasce em x 560. Agora substitua esse valor fixo por um sorteio.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o x 560 do bloco No grupo criar obstáculo, dentro de Se jogando no relógio de 1.4 segundo. Abra Jogo 2D, depois Sorteios. Pegue um número entre e solte sobre o 560 do campo x.
>
> No sorteio, coloque mínimo 500 e máximo 560. A tela termina em x 480, então a faixa inteira fica além da borda direita. Mantenha tamanho 44 e velocidade -5 no criador.
>
> Comece e observe vários cactos entrarem. O lugar é sorteado na criação, então dois cactos podem receber o mesmo valor. Confira que o sorteio está no x do único criador, e que o relógio permanece em 1.4 segundo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Sorteie o x de 500 a 560 dentro do único criador de cactos.

## Seção 3. Sorteie uma variação na velocidade

### Clipe `video-velocidade-propria` · Sorteie uma variação na velocidade

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência Compare os resultados de um sorteio, você viu as contas -5 - 0 e -5 - 1. Seu jogo já sorteia o lugar, mas a velocidade ainda é sempre -5. Agora aplique a outra comparação.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar cada peça.
>
> Deixe à vista o campo vx -5 do criador de cactos. Abra Programação e depois Matemática. Pegue Conta matemática e solte sobre esse número.
>
> Na conta, coloque -5 à esquerda e escolha o sinal de menos. Deixe à vista o número à direita. Abra Jogo 2D, depois Sorteios. Pegue um número entre e solte sobre esse número. Coloque mínimo 0 e máximo 1.
>
> Confira a conta: -5 menos um número de 0 a 1. Se sair 0, a velocidade é -5. Se sair 1, é -6, que anda mais para a esquerda em cada quadro. Não use mais, pois essa conta produziria outra faixa.
>
> Comece e compare vários cactos. Cada um conserva a velocidade que recebeu ao nascer. Confira o sorteio do x e o da velocidade no mesmo criador, com tamanho 44 e relógio 1.4 preservados.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Use -5 menos um sorteio de 0 a 1 no vx do mesmo criador.

## Seção 4. Teste e envie seu jogo

### Clipe `video-entrega` · Teste e envie seu jogo

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar o projeto no estado de entrada. Localizar cada destino antes de buscar a peça. Mostrar campos, encaixes e testes sem cortes. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Sua corrida já varia os nascimentos. Jogue duas partidas, observe os cactos e confira o placar, a batida e o reinício. Não é necessário ver um resultado diferente em todo sorteio.
>
> Confira x entre 500 e 560 e a conta -5 menos um número de 0 a 1. O tamanho e o intervalo não mudaram.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Teste o resultado da aula, verifique a etapa e envie o projeto. Confirme em Enviar e clique em Concluir aula.
