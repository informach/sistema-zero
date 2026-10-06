# Roteiro de gravação · Nave Contra Asteroides · Aula 5

**Faça o tiro acertar o asteroide**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Asteroides nascem a cada 40 quadros, caem e saem do grupo; tiros ainda atravessam as pedras. Saída: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Escolha quem sai no acerto

### Clipe `video-apelidos` · Escolha quem sai no acerto

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Usar os seletores reais e o botão de tempo da cena collision-pair. Com tiros (o grupo inteiro) e asteroides (o grupo inteiro), clicar em Deixar a trombada acontecer e mostrar pedras no grupo e tiros no grupo em 0. Clicar em Voltar ao começo, escolher tiro (o apelido) e asteroide (o apelido), deixar a trombada acontecer e mostrar 2 pedras e 2 tiros. Clicar em Deixar o tempo passar até as outras duas pedras saírem pela parte de baixo. Meme na comparação: na frase da queimada, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy jogando queimada com os asteroides: a bola acerta um asteroide só, que sai da quadra, e os outros continuam, com a legenda "só quem foi acertado sai"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar em Agora é a sua vez e Próxima seção, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender os apelidos: como escolher quem sai do jogo quando um tiro acerta uma pedra. Aqui há três tiros e três pedras, e só o tiro do meio vai encontrar uma pedra.
>
> Olha aqui: em O tiro que sai, eu escolho tiros, o grupo inteiro. Em A pedra que sai, escolho asteroides, o grupo inteiro. Clico em Deixar a trombada acontecer. Só um tiro encontrou uma pedra, mas sumiram todos: pedras no grupo e tiros no grupo foram para 0. O grupo inteiro quer dizer todos os objetos do grupo.
>
> Na queimada, quando a bola acerta alguém, só essa pessoa sai. O time inteiro continua jogando.
>
> Agora eu clico em Voltar ao começo e escolho tiro, o apelido, e asteroide, o apelido. Clico em Deixar a trombada acontecer. Saem só o tiro e a pedra que se encontraram, e ficam 2 pedras e 2 tiros. O apelido aponta só para quem participou do encontro. Depois, eu clico em Deixar o tempo passar até as outras duas pedras saírem pela parte de baixo da tela. Elas continuaram o caminho. No seu jogo, o acerto vai usar os apelidos tiro e asteroide.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Compare os grupos inteiros com tiro e asteroide. No teste com os apelidos, deixe o tempo passar até as outras duas pedras saírem da tela.

## Seção 2. Programe o acerto

### Clipe `video-colisao` · Programe o acerto

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Mostrar os nomes dos dois grupos e os dois apelidos sem inverter. Seletores de objetos locais devem ser preenchidos dentro da colisão. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou tirar grupos inteiros com tirar só o tiro e a pedra do acerto. No seu jogo, atire numa pedra: o tiro ainda atravessa. Agora programe o acerto usando os apelidos.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Agora faça o acerto funcionar no seu jogo. Deixe à vista o fim de A cada quadro do jogo, depois do desenho dos asteroides. Abra Jogo 2D, depois Colisões e Encostar e bloquear. Pegue Para cada colisão entre os grupos e encaixe no fim de A cada quadro do jogo, depois de Desenhar o grupo asteroides.
>
> Escolha tiros no primeiro grupo e asteroides no segundo. Nos apelidos, escreva tiro e asteroide, nessa mesma ordem. Tiros é o grupo; tiro é o objeto desse grupo que participou do acerto. Asteroide identifica a pedra que esse tiro encontrou. Esses apelidos valem dentro da colisão.
>
> Deixe à vista o interior da colisão entre tiros e asteroides. Abra Jogo 2D, depois Grupos e Participação e limpeza. Pegue Tirar o sprite do grupo e encaixe dentro da colisão. Escolha tiro como sprite e tiros como grupo. Depois de soltar o primeiro bloco, deixe o encaixe abaixo dele à vista. Na mesma categoria Participação e limpeza, Pegue outro Tirar o sprite do grupo e encaixe abaixo. Nesse segundo, escolha asteroide como sprite e asteroides como grupo.
>
> Deixe à vista o encaixe abaixo das duas retiradas, dentro da colisão. Abra Jogo 2D, depois Desenho e efeitos e Partículas. Pegue Soltar explosão no sprite e encaixe abaixo das duas retiradas, ainda dentro da colisão. Escolha asteroide e uma cor para a explosão.
>
> Deixe à vista o encaixe abaixo da explosão, dentro da colisão. Abra Jogo 2D, depois Som e Efeitos prontos. Pegue Tocar efeito e encaixe abaixo da explosão. Escolha explosão no menu. Confira a ordem dentro da colisão: retirar tiro, retirar asteroide, soltar explosão e tocar o som.
>
> Clique no jogo e atire até acertar uma pedra. O tiro e a pedra atingidos devem sair. Os outros continuam. Se o tiro atravessar, confira os nomes dos grupos e se a colisão está dentro de A cada quadro do jogo. Se a explosão estiver no objeto errado, confira o nome asteroide no efeito.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Escolha os grupos e os apelidos. Retire o par atingido e adicione explosão e som.

## Seção 3. Confira o que você construiu

**Zappy na página (não gravar):** Responda pensando nos testes do seu jogo. Depois de enviar, leia as explicações. Se precisar, corrija e tente de novo. Quando acertar todas, clique em Próxima seção.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 4. Confira os acertos e envie

### Clipe `video-fecho` · Confira os acertos e envie

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Usar o projeto completo desta etapa. Testar sem pontos ou vidas, que ainda não foram construídos. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Teste mais de um acerto. Mova a nave, atire e confira se cada tiro nasce nela. Acerte pedras em posições diferentes.
>
> Observe o que acontece em cada encontro: saem o tiro e a pedra envolvidos, aparece a explosão e o resto do jogo continua. Se algo falhar, confira os apelidos dentro da colisão antes de enviar.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Acerte pedras de posições diferentes e confira se as outras continuam caindo.
