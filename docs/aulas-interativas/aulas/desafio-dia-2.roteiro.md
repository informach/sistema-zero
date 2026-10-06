# Roteiro de gravação · A Chave do Farol · Dia 2

Quatro seções, quatro vídeos: a experiência da memória e, depois, uma montagem para cada ideia, sempre no mesmo projeto (recolher a chave, guardar a coleta e avisar quem joga). As seções 2 e 3 verificam sem enviar; a seção 4 verifica e envia. Retomar o projeto enviado no Dia 1; o projeto preparado do Dia 2 só é a alternativa quando não houver envio anterior. Não reconstruir nem substituir um projeto já feito pela pessoa. O vídeo da experiência é uma demonstração: o narrador faz cada gesto na primeira pessoa e explica; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. Cada montagem tem tempo para os encaixes. Só a narração é falada.

Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("então", "por isso", "mas", "agora que"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). O que é opcional é oferecido como escolha, sem dizer o que a pessoa não precisa fazer, e o que já vem pronto só entra na fala quando ajuda a ação (Diretrizes, seção 6, revisão de 06/10/2026).

## Seção 1. O jogo guardou a chave?

### Vídeo `video-d2-contexto` · O jogo guardou a chave?

**Duração alvo:** 90 a 110 segundos.

**Na tela:** mostrar brevemente, no projeto do fim do Dia 1, o personagem passando pela chave sem pegá-la. Depois abrir a experiência `collect-and-remember` e fazer cada gesto no ritmo da fala, deixando ver a chave, o aviso e `temChave` em cada teste. No "Repare neste nome aqui", apontar o mostrador `temChave`; no "tá vendo?", manter `temChave` em falso à vista. No fim, apontar a experiência para a pessoa repetir. **Meme na comparação:** na frase do caderno, o personagem anotando "peguei a chave ✔" num caderno; ao lado, o mesmo personagem sem anotar, com cara de "esqueci…". Desenho nosso no formato de meme, com o Zappy ou os personagens do jogo; sem foto de pessoa real nem meme da internet. Fica 2 a 3 segundos na tela, sem cobrir a experiência; a narração explica sozinha.

**Narração:**
> "O seu personagem já anda, mas passa pela chave sem pegar. Por isso, esta é uma experiência para a gente entender como uma variável guarda uma informação do jogo.
>
> Repare neste nome aqui: temChave. Ele é uma variável, que é um nome que guarda uma informação do jogo. Nesse caso, a informação é se o personagem está com a chave ou não, e, quando aparece falso, quer dizer que ele ainda não está com ela.
>
> Guardar uma informação é como anotar num caderno: se ninguém anota, o jogo esquece.
>
> Olha aqui: com Guardar a coleta desligado, eu clico em Encostar na chave. Encostar na chave é um evento, que é algo que acontece no jogo. E a regra Quando o personagem encostar na chave responde a esse evento: ela tira a chave do chão e muda o aviso. Mas tá vendo? temChave continua falso, porque ninguém anotou a coleta.
>
> Agora eu clico em Recomeçar a partida, ligo Guardar a coleta e clico em Encostar na chave de novo. Olha só: desta vez, temChave vira verdadeiro! O jogo anotou que a chave foi encontrada.
>
> E repare: quando eu clico em Afastar, temChave continua verdadeiro, mesmo longe da chave. É que a anotação fica guardada.
>
> Por último, eu clico em Recomeçar a partida, e temChave volta para falso, porque uma partida nova começa com o caderno em branco.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Sua vez! Faça os testes e fique de olho em temChave: compare o que some da tela com o que fica guardado.

**Conferência de produção:** o vídeo é uma demonstração: o narrador faz cada gesto na primeira pessoa, no ritmo da fala, mostra o resultado real e explica o porquê. Ele não dá ordens antes da vez da pessoa; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. A comparação do dia a dia é curta e ligada ao jogo. Sem palpite nem pergunta final. Guardar a coleta só muda com a chave no chão; por isso o recomeço vem antes de ligar.

## Seção 2. Recolha a chave

### Vídeo `video-d2-recolher` · Recolha a chave

**Duração alvo:** 2 a 3 minutos, incluindo encaixes, teste e verificação.

**Na tela:** abrir o projeto da pessoa. Começar pela retomada, antes de qualquer bloco: levar o personagem até a chave e, no "Tá vendo?", mostrar que ele passa por ela sem efeito. Em cada encaixe, primeiro deixar o destino à vista; só então abrir a categoria e pegar o bloco. O projeto ainda não tem a área **Quando acontecer**: deixar à vista um espaço vazio entre **Ao iniciar** e **Enquanto estiver rodando**, abrir **Áreas do projeto**, pegar **Quando acontecer** e soltar nesse espaço. Depois abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite ... começar a encostar no sprite ...** e soltar dentro da área nova. Escolher `personagem` no primeiro nome e `chave` no segundo.

**Narração:**
> "Lembra da experiência da seção anterior? Quando o personagem encostou na chave, a regra tirou a chave do chão. Agora a gente vai programar isso no seu jogo!
>
> Primeiro, leve o personagem até a chave. Tá vendo? Ele passa por ela e não acontece nada, porque o jogo ainda não sabe o que fazer quando os dois se encontram.
>
> Esse encontro é um evento, igual ao que você viu na experiência. Então a gente precisa ligar uma ação a esse evento, e a ação que a gente quer é tirar a chave do chão.
>
> Os eventos ficam numa área própria, chamada Quando acontecer. Mas repare: o seu projeto ainda não tem essa área, então a gente vai criar uma.
>
> Deixe à vista um espaço vazio ao lado das áreas. Se ele não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ele aparecer.
>
> Agora abra Áreas do projeto, pegue Quando acontecer e solte nesse espaço vazio.
>
> Com a área criada, abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Quando o sprite começar a encostar no sprite.
>
> Arraste para dentro de Quando acontecer e solte quando aparecer o encaixe.
>
> No primeiro nome, escolha personagem e, no segundo, escolha chave. Assim, tudo o que você colocar dentro desse bloco vai acontecer quando o personagem encostar na chave."

**Na tela:** com o espaço vazio do evento à vista, abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Destruir o sprite ...**, soltar dentro do evento e escolher `chave`.

**Narração:**
> "Agora vem a ação: tirar a chave do chão. Ela vai dentro desse encontro, então deixe à vista o espaço vazio dentro dele.
>
> Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, e pegue o bloco Destruir o sprite.
>
> Arraste para o espaço vazio dentro do encontro e escolha chave. Destruir, aqui, quer dizer tirar da partida. E repare que quem sai é a chave, não o personagem.
>
> Confira se ficou assim: dentro do encontro entre personagem e chave, está Destruir o sprite chave."

**Na tela:** depois da atualização da Pré-visualização, levar o personagem até a chave e passar de novo pelo mesmo lugar. Clicar em **Atualizar**, na barra logo acima do jogo, para começar outra partida e mostrar a chave de volta; em barra estreita, o botão aparece só como ⟳. Clicar em **Verificar esta etapa**, esperar **Salvo** e apontar **Próxima seção**. O envio não faz parte desta seção.

**Narração:**
> "Agora vamos testar! Leve o personagem até a chave. Olha só: a chave some do chão!
>
> Para ver de novo, clique em Atualizar, logo acima do jogo. Começa uma nova partida, e a chave volta para o chão.
>
> Se a chave não sumiu, confira se o encontro tem personagem e chave e se o bloco Destruir o sprite chave está dentro dele. Depois de corrigir, teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo e clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Agora faça o seu personagem pegar a chave! Programe o encontro e faça a chave sair do chão. Depois teste e clique em Verificar esta etapa.

**Conferência de produção:** a verificação confere também o movimento do Dia 1. A seção exige o vídeo e a aprovação, sem envio.

## Seção 3. Guarde que a chave foi encontrada

### Vídeo `video-d2-guardar` · Guarde que a chave foi encontrada

**Duração alvo:** 2 a 3 minutos, incluindo encaixes e verificação.

**Na tela:** mostrar o fim da área **Ao iniciar**, logo abaixo de **Ativar controles clássicos**. Abrir **Programação → Variáveis**, pegar **Criar variável ... com valor ...** e soltar ali. Trocar o nome para `temChave` e clicar fora do campo. Abrir **Programação → Lógica & Se**, pegar o bloco **verdadeiro** (no catálogo, Verdadeiro ou falso; na tela, só o menu), soltar sobre o número do bloco e escolher **falso** no menu.

**Narração:**
> "Lembra da experiência da primeira seção desta aula? Com Guardar a coleta desligado, a chave sumia, mas temChave continuava falso. O seu jogo está assim agora: a chave sai do chão, mas nada anota que ela foi encontrada. Então a gente vai ensinar o seu jogo a guardar essa informação!
>
> Primeiro, a gente precisa criar a variável temChave. Ela nasce quando o jogo começa, então encontre o fim da área Ao iniciar, logo abaixo de Ativar controles clássicos. Se esse lugar não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ele aparecer.
>
> Agora abra Programação e depois Variáveis, e pegue o bloco Criar variável com valor.
>
> Arraste e solte logo abaixo de Ativar controles clássicos.
>
> O nome chega como contador, então troque contador por temChave. Escreva tudo junto, com o C maiúsculo, e depois clique fora do campo.
>
> Repare que o valor desse bloco começa com um número. Só que temChave não guarda número: ela guarda verdadeiro ou falso. Por isso, a gente vai trocar esse número. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do número. Ele toma o lugar do número.
>
> No menu desse bloco, troque verdadeiro por falso, porque o jogo começa sem a chave.
>
> Confira se ficou assim: no fim de Ao iniciar, está Criar variável temChave com valor falso."

**Na tela:** deixar à vista o bloco **Destruir o sprite chave**, dentro do encontro. Abrir **Programação → Variáveis**, pegar **Alterar variável ... para ...** e soltar logo abaixo dele, ainda dentro do evento. Escolher `temChave`. Em **Programação → Lógica & Se**, pegar o bloco **verdadeiro**, soltar sobre o número e manter **verdadeiro**.

**Narração:**
> "Agora que temChave existe, o jogo precisa mudar essa informação quando o personagem encostar na chave. É como anotar no caderno: peguei a chave! Por isso, o próximo bloco vai logo abaixo de Destruir o sprite, dentro do encontro. Deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.
>
> Arraste e solte logo abaixo de Destruir o sprite e escolha temChave.
>
> Esse bloco também chega com um número, então troque o número do mesmo jeito: abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do número. Desta vez, deixe em verdadeiro, porque agora o personagem está com a chave.
>
> Confira se ficou assim: no encontro com a chave, primeiro vem Destruir o sprite chave e, logo abaixo, Alterar temChave para verdadeiro."

**Na tela:** apontar a declaração em **Ao iniciar** e a mudança no encontro. Clicar em **Verificar esta etapa**, esperar **Salvo** e apontar **Próxima seção**. O envio não faz parte desta seção.

**Narração:**
> "No jogo, você ainda não consegue ver temChave, porque quem vai usar essa informação é a porta do farol, no Dia 3. Por isso, desta vez quem confere o que você montou é a verificação.
>
> Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo e clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Agora ensine o seu jogo a lembrar da chave! Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar esta etapa.

**Conferência de produção:** a mudança de temChave não aparece no jogo; a experiência da seção 1 já mostrou a informação guardada. A seção exige o vídeo e a aprovação, sem envio.

## Seção 4. Avise quem está jogando

### Vídeo `video-d2-programar` · Avise quem está jogando

**Duração alvo:** 2 a 3 minutos, incluindo encaixe, testes e envio.

**Na tela:** Começar pela retomada, antes de qualquer bloco: recolher a chave no jogo e mostrar que a mensagem continua a inicial. Depois, com o bloco de `temChave` à vista dentro do encontro, abrir **Programação → Variáveis**, pegar outro **Alterar variável ... para ...**, soltar logo abaixo dele e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o número, apagar `Olá` e escrever `Você pegou a chave! Agora vá ao farol.`. Mostrar os três blocos na ordem.

**Narração:**
> "Lembra da experiência da primeira seção desta aula? Quando a chave era recolhida, o aviso mudava. Agora a gente vai fazer o aviso do seu jogo mudar também!
>
> Primeiro, pegue a chave no seu jogo. Tá vendo? Ela some, mas a mensagem continua a mesma: Encontre a chave e vá ao farol. Quem está jogando nem fica sabendo que pegou a chave, então vamos avisar.
>
> A mensagem também tem que mudar no encontro com a chave. Por isso, o próximo bloco vai logo abaixo do bloco de temChave, ainda dentro do encontro. Deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para.
>
> Arraste e solte logo abaixo do bloco de temChave e escolha aviso. É essa variável que mostra a mensagem na tela.
>
> Agora a gente precisa trocar o número desse bloco por um texto, que é a mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número.
>
> Repare que o bloco texto vem com a palavra Olá. Apague Olá e escreva: Você pegou a chave! Agora vá ao farol.
>
> Confira se ficou assim: dentro do encontro com a chave, estão três blocos. Primeiro, Destruir o sprite chave; depois, Alterar temChave para verdadeiro; e, por último, Alterar aviso para a sua mensagem."

**Na tela:** depois da atualização da Pré-visualização, recolher a chave e ler o aviso. Clicar em **Atualizar** e repetir. Depois apontar o texto encaixado em **Alterar variável aviso**, dentro do encontro; não apontar a declaração de `aviso` em **Ao iniciar** nem o bloco de `temChave`.

**Narração:**
> "Agora vamos testar! Leve o personagem até a chave. Olha só: a chave some e a mensagem muda! Repare que o aviso só mostra a mensagem para quem está jogando. Quem guarda que a chave foi pega continua sendo temChave.
>
> Se a mensagem não mudou, confira o bloco que altera aviso e o texto dentro dele. Depois de corrigir, teste de novo."

**Na tela:** clicar em **Verificar esta etapa**, mostrar o resultado ou uma pendência real e corrigir antes de verificar de novo. Depois de **Objetivo da etapa cumprido!**, esperar **Salvo**, clicar em **Enviar para o professor**, confirmar em **Enviar** sem exigir recado e aguardar. Apontar **Concluir aula**.

**Narração:**
> "Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o professor e confirme em Enviar.
>
> Quando o envio terminar, clique em Concluir aula."

**Ponte do Zappy na página (não gravar):** Agora avise quem está jogando! Mostre uma mensagem quando a chave for encontrada. Teste a coleta e clique em Verificar esta etapa antes de enviar para o professor.

**Conferência de produção:** a verificação confere também o movimento do Dia 1 e não exige copiar o texto do aviso. A seção exige o vídeo, a aprovação em **Verificar esta etapa** e o envio confirmado.
