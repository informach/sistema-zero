<!-- Versão adulta gerada por docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts a partir de kids/desafio-primeiro-jogo/desafio-dia-2.roteiro.md e de qa/adulto/traducoes/desafio-primeiro-jogo/desafio-dia-2.json. Não edite este arquivo: edite a tradução e gere de novo. -->

# Roteiro de gravação · A Chave do Farol · Dia 2

**Conferência da equipe, 19/10/2026 (não gravar):** exemplos privados por seção, conforme o manifesto e sua fonte geradora. recolher, guardar e programar-chave têm soluções distintas: retirar a chave; guardar a informação sem aviso; acrescentar o aviso. Cada entrada conserva a etapa anterior. O projeto inicial e a continuidade permanecem; a entrada para ensaio não substitui o baseline da verificação. Cores, imagens, textos e magnitude de velocidade do exemplo não são respostas únicas. A direção precisa continuar coerente e zero não demonstra movimento. Os objetivos atuais deste piloto conferem estrutura; os testes jogados do roteiro continuam necessários e não foram certificados automaticamente como comportamento. Não informa gravação, publicação nem ensaio com adultos.

**Vozes e gravação:** Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada. As notas **Na tela** não são locução.

**Gravação:** não cobrir controles, blocos, mostradores ou resultados. As durações cobrem a fala estimada a 137 palavras por minuto e, nas montagens, os gestos sem fala; conferir a montagem final sem acelerar.

**Notas de gravação:** gravar a experiência da seção 1 numa sessão sem progresso nesse bloco, com o estado inicial da cena: chave no chão, Guardar a coleta desligado, temChave falso e o aviso Encontre a chave e vá ao farol. Abrir a aula numa aba nova depois do último deploy. Gravar o envio da seção 4 numa sessão sem envio anterior nesta aula: Recomeçar não apaga o envio; para repetir a tomada, usar outro perfil de ensaio. Mostrar o selo **Salvo na sua conta** só quando ele aparecer de verdade. Confirmar em **Enviar** sem preencher o **Recado para o professor**.

Quatro seções, quatro vídeos: a experiência da memória e, depois, uma montagem para cada ideia, sempre no mesmo projeto (recolher a chave, guardar a coleta e avisar quem joga). As seções 2 e 3 verificam sem enviar; a seção 4 verifica e envia. Retomar o projeto enviado no Dia 1; o projeto preparado do Dia 2 só é a alternativa quando não houver envio anterior. Não reconstruir nem substituir um projeto já feito pela pessoa. O vídeo da experiência é uma demonstração: o narrador faz cada gesto na primeira pessoa e explica; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. Cada montagem tem tempo para os encaixes.

**Continuidade das imagens:** o projeto traz o catálogo ampliado de personagens, cenários, barcos, chaves e pares de faróis. Nesta montagem, os nomes dos sprites continuam personagem e chave; não trocar por nomes de imagens nos campos do encontro. As escolhas ficam no Dia 3.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "ou seja", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Percebe?"). Neste curso, "então" não serve de palavra de ligação: é o nome de um espaço do bloco Se. O que é opcional é oferecido como escolha, sem dizer o que a pessoa não precisa fazer, e o que já vem pronto só entra na fala quando ajuda a ação (Diretrizes, seção 6, revisão de 06/10/2026; tom adulto em DIRETRIZES-ADULTO.md).

## Seção 1. O jogo guardou a chave?

### Vídeo `video-d2-contexto` · O jogo guardou a chave?

**Duração alvo:** 160 a 190 segundos.

**Na tela:** abrir direto na experiência `collect-and-remember`, com a chave no chão. Na primeira frase, apontar o personagem e a chave da cena; o teste no projeto da pessoa fica para a retomada da seção 2. Depois demonstrar a coleta com Guardar a coleta desligado, no ritmo da fala. No "Repare neste nome aqui", apontar o mostrador `temChave`. No "Olha só", deixar ver a chave subindo e sumindo e o aviso novo na faixa do jogo. No "A regra da coleta", apontar a regra na bancada, começando pelo bloco do evento. No "percebe?", manter `temChave` em falso à vista. **Meme na comparação:** na frase do caderno, o personagem anotando "peguei a chave ✔" num caderno; ao lado, o mesmo personagem sem anotar, com cara de "esqueci…". Desenho nosso no formato de meme, com os personagens do jogo; sem foto de pessoa real nem meme da internet. Fica 2 a 3 segundos na tela, sem cobrir a experiência; a narração explica sozinha.

**Professora:**

> "O seu personagem já anda, mas passa pela chave sem pegar. Para o jogo saber que a chave foi pega, ele precisa guardar essa informação. Esta é uma experiência para a gente entender como uma variável guarda uma informação do jogo.
>
> Repare neste nome aqui: temChave. temChave é uma variável: um lugar com nome onde o jogo guarda uma informação. O próprio nome é uma pergunta: o personagem tem chave? E a resposta só pode ser verdadeiro, que quer dizer sim, ou falso, que quer dizer não. Agora está falso, porque ele ainda não pegou a chave.
>
> Guardar uma informação é como anotar num caderno para não esquecer: se ninguém anota, ninguém lembra depois. No seu jogo, temChave é o caderno, e anotar é mudar temChave para verdadeiro.
>
> Olha aqui: com Guardar a coleta desligado, eu clico em Encostar na chave. Olha só: a chave saiu do chão, e o aviso mudou. Encostar na chave é um evento, que é uma coisa que acontece no jogo. A regra da coleta responde a esse evento: ela tira a chave do chão e muda o aviso. Mas percebe? temChave continua falso."

**Na tela:** Mostrar o valor falso ao responder e, no "Olha aqui na regra", apontar a linha Alterar temChave para verdadeiro com a marca (desligado). Depois recomeçar a partida antes de ligar Guardar a coleta; ao ligar, deixar ver a marca (desligado) sumir da linha antes de clicar em Encostar na chave. No "Olha só", deixar ver a chave sumir, o aviso novo e `temChave` em verdadeiro. Depois afastar e reiniciar conforme a fala.

**Professora:**

> "Mas por que continua falso, se a chave sumiu? É que tirar a chave do chão não guarda essa informação. Olha aqui na regra: a linha Alterar temChave para verdadeiro está desligada. Falta anotar que a chave foi pega. E é essa anotação que a porta do farol vai conferir.
>
> A regra só pode mudar com a chave no chão. Por isso, eu clico em Recomeçar a partida, ligo Guardar a coleta e clico em Encostar na chave de novo. Olha só: a chave sumiu e o aviso mudou do mesmo jeito, mas desta vez temChave virou verdadeiro. O jogo anotou que a chave foi pega.
>
> E quando eu clico em Afastar, temChave continua verdadeiro, mesmo longe da chave. É que a anotação fica guardada.
>
> Por último, eu clico em Recomeçar a partida, e temChave volta para falso, porque uma partida nova começa com o caderno em branco.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Recado na página (não gravar):** Sua vez: faça os testes e fique de olho em temChave. Compare o que some da tela com o que fica guardado. Quando terminar, clique em Próxima seção.

**Conferência de produção:** o vídeo é uma demonstração: o narrador faz cada gesto na primeira pessoa, no ritmo da fala, mostra o resultado real e explica o porquê. Ele não dá ordens antes da vez da pessoa; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. A comparação do dia a dia é curta e ligada ao jogo. Sem palpite nem pergunta final. Guardar a coleta só muda com a chave no chão; por isso o recomeço vem antes de ligar.

## Seção 2. Recolha a chave

### Vídeo `video-d2-recolher` · Recolha a chave

**Duração alvo:** 4 a 5 minutos, incluindo encaixes, teste e verificação.

**Na tela:** abrir o projeto da pessoa, o enviado no Dia 1. Começar pela retomada, antes de qualquer bloco e nesta ordem: primeiro o problema (levar o personagem até a chave e, no "Percebe?", mostrar que ele passa por cima dela e a chave continua no chão), depois a lembrança e o anúncio. Em cada encaixe, primeiro deixar o destino à vista; só então abrir a categoria e pegar o bloco. O projeto ainda não tem a área **Quando acontecer**: deixar à vista um lugar sem blocos ao lado das áreas, abrir **Áreas do projeto**, pegar **Quando acontecer** e soltar nesse lugar. Se for preciso abrir espaço, arrastar um espaço vazio entre os blocos; na fala, "lugar sem blocos" é o destino e "espaço vazio" é só o ponto de onde se arrasta. Depois abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite ... começar a encostar no sprite ...** e soltar dentro da área nova. O bloco nasce com `jogador` e `inimigo`: no "Repare", apontar os dois nomes; clicar em `jogador` e escolher `personagem`, depois em `inimigo` e escolher `chave`.

**Professora:**

> "Aqui no seu jogo, leve o personagem até a chave. Percebe? Ele passa por cima dela, e a chave continua no chão, porque o jogo ainda não sabe o que fazer quando os dois se encostam.
>
> Lembra da experiência da seção anterior? Quando o personagem encostava, a chave saía do chão. Agora a gente vai programar isso no seu jogo.
>
> Esse encontro é um evento, e os eventos ficam numa área própria, chamada Quando acontecer. Mas repare: o seu projeto ainda não tem essa área, por isso a gente vai criar uma.
>
> Deixe à vista um lugar sem blocos, ao lado das áreas. Se não houver lugar livre na tela, arraste um espaço vazio entre os blocos até aparecer um.
>
> Agora abra Áreas do projeto, pegue Quando acontecer e solte nesse lugar sem blocos.
>
> Com a área criada, abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Quando o sprite começar a encostar no sprite.
>
> Arraste para dentro de Quando acontecer e solte quando aparecer o encaixe.
>
> Repare que o bloco chega com dois nomes, jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha chave. Assim, tudo o que você colocar dentro desse bloco vai acontecer quando o personagem encostar na chave."

**Na tela:** Mostrar o espaço vazio ao lado de **fazer**, dentro do encontro, antes de buscar Destruir o sprite. Com esse espaço à vista, abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Destruir o sprite ...**, soltar ao lado de **fazer**, clicar em `resposta` (o nome com que o bloco nasce) e escolher `chave`.

**Professora:**

> "Agora vem a ação: tirar a chave do chão. Essa ação vai dentro do encontro, no espaço vazio ao lado da palavra fazer. Deixe esse espaço à vista.
>
> Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, e pegue o bloco Destruir o sprite.
>
> Arraste e solte no espaço vazio ao lado de fazer. O bloco chega com o nome resposta: clique em resposta e escolha chave."

**Na tela:** Explicar com o bloco já encaixado. A coleta e o reinício serão demonstrados logo a seguir; não inventar uma perda permanente.

**Professora:**

> "E a chave some para sempre? Não: aqui, destruir só tira a chave desta partida. Quando você começa outra, ela volta. E repare que quem sai é a chave, não o personagem."

**Na tela:** depois da atualização da Pré-visualização, levar o personagem até a chave e passar de novo pelo mesmo lugar. Clicar em **Atualizar**, na barra logo acima do jogo, para começar outra partida e mostrar a chave de volta; em barra estreita, o botão aparece só como ⟳. Clicar em **Verificar esta etapa** e apontar **Próxima seção**. O envio não faz parte desta seção.

**Professora:**

> "Agora vamos testar. Leve o personagem até a chave. Olha só: a chave some do chão.
>
> Para ver de novo, clique em Atualizar, logo acima do jogo. Começa uma nova partida, e a chave volta para o chão.
>
> Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de Quando acontecer está o encontro entre personagem e chave, e dentro dele está Destruir o sprite chave. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção."

**Recado na página (não gravar):** Agora faça o seu personagem pegar a chave. Programe o encontro e faça a chave sair do chão. Depois teste e clique em Verificar esta etapa. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.

**Conferência de produção:** a verificação confere também o movimento do Dia 1. A seção exige o vídeo e a aprovação, sem envio.

## Seção 3. Guarde que a chave foi encontrada

### Vídeo `video-d2-guardar` · Guarde que a chave foi encontrada

**Duração alvo:** 4 a 5 minutos, incluindo encaixes e verificação.

**Na tela:** mostrar o fim da área **Ao iniciar**, logo abaixo de **Ativar controles clássicos**. Abrir **Programação → Variáveis**, pegar **Criar variável ... com valor ...** e soltar ali. No "Repare que, logo acima", apontar as variáveis `aviso` e `ganhou` que já estão em **Ao iniciar**. Clicar em `contador` (o nome com que o bloco nasce), apagar, escrever `temChave` e clicar fora do campo. Abrir **Programação → Lógica & Se**, pegar o bloco **verdadeiro** (no catálogo, Verdadeiro ou falso; na tela, só o menu), soltar sobre o `0` do bloco e escolher **falso** no menu.

**Professora:**

> "Lembra da experiência da primeira seção desta aula? Com Guardar a coleta desligado, a chave sumia, mas temChave continuava falso. O seu jogo está assim. Agora a gente vai ensinar o seu jogo a guardar que a chave foi pega.
>
> Primeiro, a gente precisa criar a variável temChave. Ela nasce quando o jogo começa. Por isso, encontre o fim da área Ao iniciar, logo abaixo de Ativar controles clássicos. Se esse lugar não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ele aparecer.
>
> Agora abra Programação e depois Variáveis, e pegue o bloco Criar variável com valor.
>
> Arraste e solte logo abaixo de Ativar controles clássicos. Repare que, logo acima, o seu jogo já tem outras variáveis, como aviso. temChave vai ficar junto delas.
>
> Esse bloco chega com o nome contador. Clique em contador, apague e escreva temChave, tudo junto e com o C maiúsculo. Depois clique fora do campo.
>
> O valor desse bloco vem com o número 0. Só que temChave não guarda número: ela guarda verdadeiro ou falso. Por isso, a gente vai trocar esse 0. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0. Ele toma o lugar do número.
>
> No menu desse bloco, troque verdadeiro por falso, porque o jogo começa sem a chave.
>
> Confira se ficou assim: no fim de Ao iniciar, está Criar variável temChave com valor falso."

**Na tela:** No "Repare", manter à vista **Criar variável temChave com valor falso**, no fim de **Ao iniciar**. Depois trazer à vista a área **Quando acontecer**, arrastando um espaço vazio se for preciso, e mostrar o encontro que vai mudar a informação depois da coleta. Deixar à vista o bloco **Destruir o sprite chave**, dentro do encontro. Abrir **Programação → Variáveis**, pegar **Alterar variável ... para ...** e soltar logo abaixo dele, ainda dentro do evento. Clicar em `contador` (o nome com que o bloco nasce) e escolher `temChave` na lista. Em **Programação → Lógica & Se**, pegar o bloco **verdadeiro**, soltar sobre o `1` e manter **verdadeiro**.

**Professora:**

> "Repare: como temChave começa em falso, toda partida nova começa sem a chave. Agora que temChave existe, o jogo precisa mudar essa informação quando o personagem encostar na chave. Por isso, o próximo bloco vai logo abaixo de Destruir o sprite, dentro do encontro. Encontre a área Quando acontecer, arrastando um espaço vazio entre os blocos se precisar, e deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.
>
> Arraste e solte logo abaixo de Destruir o sprite. Esse bloco também chega com contador: clique em contador e escolha temChave.
>
> O valor dele vem com o número 1. Troque do mesmo jeito: abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1. Desta vez, deixe em verdadeiro, porque agora o personagem está com a chave.
>
> Confira se ficou assim: no encontro com a chave, primeiro vem Destruir o sprite chave e, logo abaixo, Alterar temChave para verdadeiro."

**Na tela:** Apontar a declaração em **Ao iniciar** e a mudança no encontro. Clicar em **Verificar esta etapa** e apontar **Próxima seção**. O envio não faz parte desta seção.

**Professora:**

> "E como saber se o jogo guardou a chave? No jogo, você ainda não consegue ver temChave, porque quem vai usar essa informação é a porta do farol, no Dia 3. Por isso, desta vez quem confere o que você montou é a verificação.
>
> Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção."

**Recado na página (não gravar):** Agora ensine o seu jogo a lembrar da chave. Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar esta etapa. Quando aparecer Objetivo da etapa cumprido!, clique em Próxima seção.

**Conferência de produção:** a mudança de temChave não aparece no jogo; a experiência da seção 1 já mostrou a informação guardada. A seção exige o vídeo e a aprovação, sem envio.

## Seção 4. Avise quem está jogando

### Vídeo `video-d2-programar` · Avise quem está jogando

**Duração alvo:** 3 a 4 minutos, incluindo encaixe, testes e envio.

**Na tela:** Começar pela retomada, antes de qualquer bloco e nesta ordem: primeiro o problema (levar o personagem até a chave e, no "Percebe?", mostrar que o aviso continua dizendo Encontre a chave e vá ao farol), depois a lembrança e o anúncio. Depois, com o bloco de `temChave` à vista dentro do encontro, abrir **Programação → Variáveis**, pegar outro **Alterar variável ... para ...**, soltar logo abaixo dele, clicar em `contador` e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o `1`, clicar em `Olá`, apagar e escrever `Você pegou a chave! Agora vá ao farol.`. Mostrar os três blocos na ordem.

**Professora:**

> "Aqui no seu jogo, leve o personagem até a chave. Percebe? Ela some, mas o aviso continua dizendo Encontre a chave e vá ao farol, porque nenhum bloco muda o aviso quando a chave é pega.
>
> Lembra da experiência da primeira seção desta aula? Quando a chave era recolhida, o aviso mudava. Agora a gente vai fazer o seu aviso mudar também.
>
> O aviso tem que mudar no encontro com a chave. Por isso, o próximo bloco vai logo abaixo do bloco de temChave, ainda dentro do encontro. Deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para.
>
> Arraste e solte logo abaixo do bloco de temChave. Clique em contador e escolha aviso. É essa variável que mostra a mensagem na tela.
>
> Agora a gente precisa trocar o número desse bloco por um texto, que é a mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número.
>
> Repare que o bloco texto vem com a palavra Olá. Clique em Olá, apague e escreva: Você pegou a chave! Agora vá ao farol."

**Na tela:** Depois da atualização da Pré-visualização, levar o personagem até a chave e ler o aviso novo. No "clique em Atualizar", clicar em **Atualizar**, na barra logo acima do jogo, e mostrar a chave de volta no chão e o aviso inicial. Na conferência, apontar o texto encaixado em **Alterar variável aviso**, dentro do encontro; não apontar a declaração de `aviso` em **Ao iniciar** nem o bloco de `temChave`.

**Professora:**

> "Com esse aviso, quem joga sabe para onde ir. Vamos conferir no jogo. Leve o personagem até a chave. Olha só: a chave some e o aviso muda.
>
> Agora clique em Atualizar. Começa uma partida nova: a chave volta para o chão, e o aviso diz de novo Encontre a chave e vá ao farol.
>
> Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro do encontro com a chave estão três blocos, primeiro Destruir o sprite chave, depois Alterar temChave para verdadeiro e, por último, Alterar aviso para a sua mensagem. Depois de corrigir, teste de novo."

**Na tela:** clicar em **Verificar esta etapa**, mostrar o resultado ou uma pendência real e corrigir antes de verificar de novo. Depois de **Objetivo da etapa cumprido!**, clicar em **Enviar para o professor**, confirmar em **Enviar** sem preencher o **Recado para o professor** e aguardar. Gravar numa sessão sem envio anterior nesta aula (ver as notas de gravação). No "lembra da surpresa", lembrar sem mostrar nada dela. Apontar **Concluir aula**.

**Professora:**

> "Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, clique em Enviar para o professor e confirme em Enviar.
>
> Pronto, você programou a coleta da chave: ela sai do chão, o jogo guarda em temChave que ela foi pega, e o aviso muda. E lembra da surpresa que eu te contei no começo do curso? Ela está quase aqui. Na próxima aula você vai descobrir o que é.
>
> Quando aparecer Projeto enviado ao professor, clique em Concluir aula."

**Recado na página (não gravar):** Agora avise quem está jogando. Mostre uma mensagem quando a chave for encontrada. Teste a coleta e clique em Verificar esta etapa. Depois clique em Enviar para o professor e confirme em Enviar. Quando aparecer Projeto enviado ao professor, clique em Concluir aula.

**Conferência de produção:** a verificação confere também o movimento do Dia 1 e não exige copiar o texto do aviso. Antes de Concluir aula, a fala lembra uma vez só a surpresa plantada no Dia 1, sem dizer o que é (decisão do responsável, 07/10/2026). A seção exige o vídeo, a aprovação em **Verificar esta etapa** e o envio confirmado.
