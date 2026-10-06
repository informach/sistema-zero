# Roteiro de gravação · A Chave do Farol · Dia 2

Quatro seções, quatro vídeos: a experiência da memória e, depois, uma montagem para cada ideia, sempre no mesmo projeto (recolher a chave, guardar a coleta e avisar quem joga). As seções 2 e 3 verificam sem enviar; a seção 4 verifica e envia. Retomar o projeto enviado no Dia 1; o projeto preparado do Dia 2 só é a alternativa quando não houver envio anterior. Não reconstruir nem substituir um projeto já feito pela pessoa. O vídeo da experiência é uma demonstração: o narrador faz cada gesto na primeira pessoa e explica; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. Cada montagem tem tempo para os encaixes. Só a narração é falada.

Toda fala conversa com quem está fazendo a aula: diz "você", chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Viu?") e oferece o que é opcional como escolha, sem dizer o que a pessoa não precisa fazer (Diretrizes, seção 6, revisão de 06/10/2026).

## Seção 1. O jogo guardou a chave?

### Vídeo `video-d2-contexto` · O jogo guardou a chave?

**Duração alvo:** 80 a 100 segundos.

**Na tela:** mostrar brevemente, no projeto do fim do Dia 1, o personagem passando pela chave sem pegá-la. Depois abrir a experiência `collect-and-remember` e fazer cada gesto no ritmo da fala, deixando ver a chave, o aviso e `temChave` em cada teste. No fim, apontar a experiência para a pessoa repetir. **Meme na comparação:** na frase do caderno, o personagem anotando "peguei a chave ✔" num caderno; ao lado, o mesmo personagem sem anotar, com cara de "esqueci…". Desenho nosso no formato de meme, com o Zappy ou os personagens do jogo; sem foto de pessoa real nem meme da internet. Fica 2 a 3 segundos na tela, sem cobrir a experiência; a narração explica sozinha.

**Narração:**
> "Seu personagem já anda, mas passa pela chave sem pegar. Esta é uma experiência para a gente entender como uma variável guarda uma informação do jogo.
>
> O jogo guarda a coleta numa variável chamada temChave. Variável é um nome que guarda uma informação do jogo. Falso quer dizer que o personagem ainda não está com a chave. Guardar uma informação é como anotar num caderno: se ninguém anota, o jogo esquece.
>
> Olha aqui: com Guardar a coleta desligado, eu clico em Encostar na chave. Encostar na chave é um evento: algo que acontece no jogo. A regra Quando o personagem encostar na chave responde tirando a chave do chão e mudando o aviso. Mas temChave continua falso. Ninguém anotou a coleta.
>
> Agora eu clico em Recomeçar a partida, ligo Guardar a coleta e clico em Encostar na chave de novo. Olha só: desta vez, temChave vira verdadeiro. O jogo anotou que a chave foi encontrada.
>
> Repare: quando eu clico em Afastar, temChave continua verdadeiro, mesmo longe da chave. A anotação fica guardada.
>
> Por último, eu clico em Recomeçar a partida, e temChave volta para falso, porque uma partida nova começa com o caderno em branco.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Sua vez! Faça os testes e fique de olho em temChave: compare o que some da tela com o que fica guardado.

**Conferência de produção:** o vídeo é uma demonstração: o narrador faz cada gesto na primeira pessoa, no ritmo da fala, mostra o resultado real e explica o porquê. Ele não dá ordens antes da vez da pessoa; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas. A comparação do dia a dia é curta e ligada ao jogo. Sem palpite nem pergunta final. Guardar a coleta só muda com a chave no chão; por isso o recomeço vem antes de ligar.

## Seção 2. Recolha a chave

### Vídeo `video-d2-recolher` · Recolha a chave

**Duração alvo:** 2 a 3 minutos, incluindo encaixes, teste e verificação.

**Na tela:** abrir o projeto da pessoa. Começar pela retomada, antes de qualquer bloco: levar o personagem até a chave e mostrar que ele passa por ela sem efeito. Em cada encaixe, primeiro deixar o destino à vista; só então abrir a categoria e pegar o bloco. O projeto ainda não tem a área **Quando acontecer**: deixar à vista um espaço vazio entre **Ao iniciar** e **Enquanto estiver rodando**, abrir **Áreas do projeto**, pegar **Quando acontecer** e soltar nesse espaço. Depois abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite ... começar a encostar no sprite ...** e soltar dentro da área nova. Escolher `personagem` no primeiro nome e `chave` no segundo.

**Narração:**
> "Na experiência da seção anterior, quando o personagem encostou na chave, a regra tirou a chave do chão. Agora vamos programar isso no seu jogo!
>
> Primeiro, leve o personagem até a chave. Viu? Ele passa por ela e nada acontece, porque nenhuma ação está ligada a esse encontro.
>
> Encostar na chave é um evento, como você viu na experiência. Vamos ligar uma ação a esse evento: tirar a chave do chão.
>
> Os eventos ficam numa área própria, chamada Quando acontecer. Repare: o seu projeto ainda não tem essa área.
>
> Deixe à vista um espaço vazio ao lado das áreas. Se não estiver aparecendo, arraste um espaço vazio entre os blocos até ver.
>
> Abra Áreas do projeto. Pegue Quando acontecer e solte nesse espaço vazio.
>
> Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite.
>
> Arraste para dentro de Quando acontecer e solte quando aparecer o encaixe.
>
> No primeiro nome, escolha personagem. No segundo, escolha chave.
>
> Tudo o que você colocar dentro desse bloco vai acontecer quando o personagem encostar na chave."

**Na tela:** com o espaço vazio do evento à vista, abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Destruir o sprite ...**, soltar dentro do evento e escolher `chave`.

**Narração:**
> "O próximo bloco vai dentro desse encontro. Deixe à vista o espaço vazio dentro dele.
>
> Agora abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Destruir o sprite.
>
> Arraste para o espaço vazio dentro do encontro e escolha chave. Destruir quer dizer tirar da partida. Quem sai é a chave, não o personagem.
>
> Confira: dentro do encontro entre personagem e chave, está Destruir o sprite chave."

**Na tela:** depois da atualização da Pré-visualização, levar o personagem até a chave e passar de novo pelo mesmo lugar. Clicar em **Atualizar**, na barra logo acima do jogo, para começar outra partida e mostrar a chave de volta; em barra estreita, o botão aparece só como ⟳. Clicar em **Verificar esta etapa**, esperar **Salvo** e apontar **Próxima seção**. O envio não faz parte desta seção.

**Narração:**
> "Agora teste no seu jogo! Leve o personagem até a chave. Olha só: a chave some do chão!
>
> Clique em Atualizar, logo acima do jogo, para começar uma nova partida. A chave deve voltar ao chão.
>
> Se a chave não sumiu, confira personagem e chave no encontro e o bloco Destruir o sprite chave dentro dele. Corrija e teste de novo.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo. Depois clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Agora faça o seu personagem pegar a chave! Programe o encontro e faça a chave sair do chão. Depois teste e clique em Verificar esta etapa.

**Conferência de produção:** a verificação confere também o movimento do Dia 1. A seção exige o vídeo e a aprovação, sem envio.

## Seção 3. Guarde que a chave foi encontrada

### Vídeo `video-d2-guardar` · Guarde que a chave foi encontrada

**Duração alvo:** 2 a 3 minutos, incluindo encaixes e verificação.

**Na tela:** mostrar o fim da área **Ao iniciar**, logo abaixo de **Ativar controles clássicos**. Abrir **Programação → Variáveis**, pegar **Criar variável ... com valor ...** e soltar ali. Trocar o nome para `temChave` e clicar fora do campo. Abrir **Programação → Lógica & Se**, pegar o bloco **verdadeiro** (no catálogo, Verdadeiro ou falso; na tela, só o menu), soltar sobre o número do bloco e escolher **falso** no menu.

**Narração:**
> "Na experiência da primeira seção desta aula, com Guardar a coleta desligado, a chave sumia, mas temChave continuava falso. Seu jogo está assim agora: a chave sai do chão, mas nada guarda que ela foi encontrada. Agora vamos programar essa memória no seu jogo!
>
> Primeiro, crie a variável temChave.
>
> Encontre o fim da área Ao iniciar, logo abaixo de Ativar controles clássicos. Se não estiver aparecendo, arraste um espaço vazio entre os blocos até ver esse lugar.
>
> Agora abra Programação e depois Variáveis. Pegue o bloco Criar variável com valor.
>
> Arraste e solte logo abaixo de Ativar controles clássicos.
>
> No nome, troque contador por temChave. Escreva tudo junto, com o C maiúsculo, e clique fora do campo.
>
> Repare: o valor desse bloco começa com um número. Vamos trocar esse número. Abra Programação e depois Lógica e Se. Pegue o bloco verdadeiro e solte em cima do número. Ele toma o lugar do número.
>
> No menu desse bloco, troque verdadeiro por falso. O jogo começa sem a chave.
>
> Confira: no fim de Ao iniciar, está Criar variável temChave com valor falso."

**Na tela:** deixar à vista o bloco **Destruir o sprite chave**, dentro do encontro. Abrir **Programação → Variáveis**, pegar **Alterar variável ... para ...** e soltar logo abaixo dele, ainda dentro do evento. Escolher `temChave`. Em **Programação → Lógica & Se**, pegar o bloco **verdadeiro**, soltar sobre o número e manter **verdadeiro**.

**Narração:**
> "Agora o jogo precisa mudar temChave quando o personagem encostar na chave. O próximo bloco vai logo abaixo de Destruir o sprite, dentro do encontro. Deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis. Pegue o bloco Alterar variável para.
>
> Arraste e solte logo abaixo de Destruir o sprite. Escolha temChave.
>
> Agora troque o número desse bloco. Abra Programação e depois Lógica e Se. Pegue o bloco verdadeiro e solte em cima do número. Deixe em verdadeiro.
>
> Confira: no encontro com a chave, primeiro Destruir o sprite chave. Logo abaixo, Alterar temChave para verdadeiro."

**Na tela:** apontar a declaração em **Ao iniciar** e a mudança no encontro. Clicar em **Verificar esta etapa**, esperar **Salvo** e apontar **Próxima seção**. O envio não faz parte desta seção.

**Narração:**
> "No jogo, você ainda não vê temChave. Quem vai usar essa informação é a porta do farol, no Dia 3. Por isso, desta vez quem confere é a verificação.
>
> Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo. Depois clique em Próxima seção."

**Ponte do Zappy na página (não gravar):** Agora ensine o seu jogo a lembrar da chave! Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar esta etapa.

**Conferência de produção:** a mudança de temChave não aparece no jogo; a experiência da seção 1 já mostrou a informação guardada. A seção exige o vídeo e a aprovação, sem envio.

## Seção 4. Avise quem está jogando

### Vídeo `video-d2-programar` · Avise quem está jogando

**Duração alvo:** 2 a 3 minutos, incluindo encaixe, testes e envio.

**Na tela:** Começar pela retomada, antes de qualquer bloco: recolher a chave no jogo e mostrar que a mensagem continua a inicial. Depois, com o bloco de `temChave` à vista dentro do encontro, abrir **Programação → Variáveis**, pegar outro **Alterar variável ... para ...**, soltar logo abaixo dele e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o número, apagar `Olá` e escrever `Você pegou a chave! Agora vá ao farol.`. Mostrar os três blocos na ordem.

**Narração:**
> "Na experiência da primeira seção desta aula, o aviso mudava quando a chave era recolhida. Agora vamos programar esse aviso no seu jogo!
>
> Primeiro, pegue a chave no seu jogo. Viu? Ela some, mas a mensagem continua a mesma: Encontre a chave e vá ao farol.
>
> O próximo bloco vai logo abaixo do bloco de temChave, ainda dentro do encontro. Deixe esse lugar à vista.
>
> Abra Programação e depois Variáveis. Pegue outro bloco Alterar variável para.
>
> Arraste e solte logo abaixo do bloco de temChave. Escolha aviso. Essa variável já veio preparada para mostrar mensagens na tela.
>
> Agora troque o número desse bloco por um texto. Abra Programação e depois Valores. Pegue o bloco texto e solte em cima do número.
>
> Repare: o bloco texto vem com a palavra Olá. Apague Olá e escreva: Você pegou a chave! Agora vá ao farol.
>
> Confira: dentro do encontro com a chave, estão três blocos. Primeiro, Destruir o sprite chave. Depois, Alterar temChave para verdadeiro. Por último, Alterar aviso para a sua mensagem."

**Na tela:** depois da atualização da Pré-visualização, recolher a chave e ler o aviso. Clicar em **Atualizar** e repetir. Depois apontar o texto encaixado em **Alterar variável aviso**, dentro do encontro; não apontar a declaração de `aviso` em **Ao iniciar** nem o bloco de `temChave`.

**Narração:**
> "Agora teste no seu jogo! Leve o personagem até a chave. Olha só: a chave some e a mensagem muda! O aviso só mostra a mensagem; quem guarda a coleta continua sendo temChave.
>
> Se a mensagem não mudou, confira o bloco que altera aviso e o texto. Corrija e teste de novo."

**Na tela:** clicar em **Verificar esta etapa**, mostrar o resultado ou uma pendência real e corrigir antes de verificar de novo. Depois de **Objetivo da etapa cumprido!**, esperar **Salvo**, clicar em **Enviar para o professor**, confirmar em **Enviar** sem exigir recado e aguardar. Apontar **Concluir aula**.

**Narração:**
> "Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente.
>
> Quando aparecer Objetivo da etapa cumprido!, espere aparecer Salvo. Clique em Enviar para o professor e confirme em Enviar.
>
> Quando o envio terminar, clique em Concluir aula."

**Ponte do Zappy na página (não gravar):** Agora avise quem está jogando! Mostre uma mensagem quando a chave for encontrada. Teste a coleta e clique em Verificar esta etapa antes de enviar para o professor.

**Conferência de produção:** a verificação confere também o movimento do Dia 1 e não exige copiar o texto do aviso. A seção exige o vídeo, a aprovação em **Verificar esta etapa** e o envio confirmado.
