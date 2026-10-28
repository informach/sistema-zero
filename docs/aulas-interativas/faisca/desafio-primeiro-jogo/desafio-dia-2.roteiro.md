# Roteiro de produção · desafio-dia-2

A professora grava toda a fala principal. Na edição kids, substituir apenas os trechos da tabela. Copie o arquivo .elevenlabs.txt para gerar a voz integral. Gravação e publicação desta revisão ainda não confirmadas.

## Parte 1. O jogo guardou a chave?

**Clipe:** `video-d2-contexto`

**Na tela:** Apresentar a analogia de anotar para lembrar. Mostrar a chave, o aviso e a memória como três elementos distintos. Nomear temChave e os valores falso/verdadeiro sem demonstrar a sequência inteira. A atividade permite mudar a regra, recolher, afastar e iniciar outra partida.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O seu personagem já anda. Agora o jogo vai precisar lembrar quando ele encontrou a chave. Para guardar essa informação, a gente usa uma variável, que é um lugar com nome onde o jogo guarda um valor.

[engaging, energetic, conversational voice] Sabe quando você anota uma coisa para lembrar depois? Aqui, o jogo usa a variável temChave. O nome ajuda a entender a pergunta: o personagem tem chave? Verdadeiro quer dizer sim; falso quer dizer não.

[curious] Mas a chave sumiu. Isso já quer dizer que o jogo guardou?

[engaging, energetic, conversational voice] Fazer a chave sumir, mudar o aviso e guardar a coleta são ações diferentes. A informação só fica guardada se a regra também fizer isso.

[engaging, energetic, conversational voice] Agora compare essas ações na experiência. Observe a chave, o aviso e temChave. Experimente também se afastar e recomeçar a partida. Você escolhe a ordem dos testes. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d2-contexto-K1 | Dedé | 1 | is? Aqui, o jogo usa a variável temChave. O nome ajuda a entender a pergunta: o personagem tem chave? Verdadeiro quer dizer sim; falso quer dizer não. | Mas a chave sumiu. Isso já quer dizer que o jogo guardou? | Fazer a chave sumir, mudar o aviso e guardar a coleta são ações diferentes. A informação só fica guardada se a regra também fizer isso. Agora compare  | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, exportadas em `zappy-etapas.json`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.

**Recado na página (não gravar):** Sua vez! Faça os testes e fique de olho em temChave: compare o que some da tela com o que fica guardado. Quando terminar, clique em Próxima parte.

## Parte 2. Recolha a chave

**Clipe:** `video-d2-recolher`

**Na tela:** abrir o projeto da pessoa, o enviado no Dia 1. Começar pela retomada, antes de qualquer bloco e nesta ordem: primeiro o problema (levar o personagem até a chave e, no "Tá vendo?", mostrar que ele passa por cima dela e a chave continua no chão), depois a lembrança e o anúncio. Em cada encaixe, primeiro deixar o destino à vista; só então abrir a categoria e pegar o bloco. O projeto ainda não tem a área **Quando acontecer**: deixar à vista um lugar sem blocos ao lado das áreas, abrir **Áreas do projeto**, pegar **Quando acontecer** e soltar nesse lugar. Se for preciso abrir espaço, arrastar um espaço vazio entre os blocos; na fala, "lugar sem blocos" é o destino e "espaço vazio" é só o ponto de onde se arrasta. Depois abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite ... começar a encostar no sprite ...** e soltar dentro da área nova. O bloco nasce com `jogador` e `inimigo`: no "Repare", apontar os dois nomes; clicar em `jogador` e escolher `personagem`, depois em `inimigo` e escolher `chave`.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, leve o personagem até a chave. Tá vendo? Ele passa por cima dela, e a chave continua no chão, porque o jogo ainda não sabe o que fazer quando os dois se encostam.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Quando o personagem encostava, a chave saía do chão. Agora a gente vai programar isso no seu jogo!

[engaging, energetic, conversational voice] Esse encontro é um evento, e os eventos ficam numa área própria, chamada Quando acontecer. Mas repare: o seu projeto ainda não tem essa área, por isso a gente vai criar uma.

[confident, clear, unhurried voice] Deixe à vista um lugar sem blocos, ao lado das áreas. Se não houver lugar livre na tela, arraste um espaço vazio entre os blocos até aparecer um.

[confident, clear, unhurried voice] Agora abra Áreas do projeto, pegue Quando acontecer e solte nesse lugar sem blocos.

[engaging, energetic, conversational voice] Com a área criada, abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Quando o sprite começar a encostar no sprite.

[confident, clear, unhurried voice] Arraste para dentro de Quando acontecer e solte quando aparecer o encaixe.

[confident, clear, unhurried voice] Repare que o bloco chega com dois nomes, jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha chave. Assim, tudo o que você colocar dentro desse bloco vai acontecer quando o personagem encostar na chave.

[engaging, energetic, conversational voice] Agora vem a ação: tirar a chave do chão. Essa ação vai dentro do encontro, no espaço vazio ao lado da palavra fazer. Deixe esse espaço à vista.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, e pegue o bloco Destruir o sprite.

[confident, clear, unhurried voice] Arraste e solte no espaço vazio ao lado de fazer. O bloco chega com o nome resposta: clique em resposta e escolha chave.

[curious] A chave some para sempre?

[engaging, energetic, conversational voice] Aqui, destruir só tira a chave desta partida. Quando você começa outra, ela volta. E repare que quem sai é a chave, não o personagem.

[upbeat, encouraging voice] Agora vamos testar! Leve o personagem até a chave. [interested, animated voice] Olha só: a chave some do chão!

[engaging, energetic, conversational voice] Para ver de novo, clique em Atualizar, logo acima do jogo. Começa uma nova partida, e a chave volta para o chão.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de Quando acontecer está o encontro entre personagem e chave, e dentro dele está Destruir o sprite chave. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d2-recolher-K2 | Dedé | 1 | e solte no espaço vazio ao lado de fazer. O bloco chega com o nome resposta: clique em resposta e escolha chave. | A chave some para sempre? | Aqui, destruir só tira a chave desta partida. Quando você começa outra, ela volta. E repare que quem sai é a chave, não | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora faça o seu personagem pegar a chave! Programe o encontro e faça a chave sair do chão. Depois teste e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Guarde que a chave foi encontrada

**Clipe:** `video-d2-guardar`

**Na tela:** mostrar o fim da área **Ao iniciar**, logo abaixo de **Ativar controles clássicos**. Abrir **Programação → Variáveis**, pegar **Criar variável ... com valor ...** e soltar ali. No "Repare que, logo acima", apontar as variáveis `aviso` e `ganhou` que já estão em **Ao iniciar**. Clicar em `contador` (o nome com que o bloco nasce), apagar, escrever `temChave` e clicar fora do campo. Abrir **Programação → Lógica & Se**, pegar o bloco **verdadeiro** (no catálogo, Verdadeiro ou falso; na tela, só o menu), soltar sobre o `0` do bloco e escolher **falso** no menu.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com Guardar a coleta desligado, a chave sumia, mas temChave continuava falso. O seu jogo está assim. Agora a gente vai ensinar o seu jogo a guardar que a chave foi pega!

[engaging, energetic, conversational voice] Primeiro, a gente precisa criar a variável temChave. Ela nasce quando o jogo começa. Por isso, encontre o fim da área Ao iniciar, logo abaixo de Ativar controles clássicos. Se esse lugar não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ele aparecer.

[confident, clear, unhurried voice] Agora abra Programação e depois Variáveis, e pegue o bloco Criar variável com valor.

[confident, clear, unhurried voice] Arraste e solte logo abaixo de Ativar controles clássicos. [confident, clear, unhurried voice] Repare que, logo acima, o seu jogo já tem outras variáveis, como aviso. temChave vai ficar junto delas.

[engaging, energetic, conversational voice] Esse bloco chega com o nome contador. Clique em contador, apague e escreva temChave, tudo junto e com o C maiúsculo. Depois clique fora do campo.

[engaging, energetic, conversational voice] O valor desse bloco vem com o número 0. Só que temChave não guarda número: ela guarda verdadeiro ou falso. Por isso, a gente vai trocar esse 0. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0. Ele entra no lugar do número.

[confident, clear, unhurried voice] No menu desse bloco, troque verdadeiro por falso, porque o jogo começa sem a chave.

[confident, clear, unhurried voice] Confira se ficou assim: no fim de Ao iniciar, está Criar variável temChave com valor falso.

[engaging, energetic, conversational voice] Agora que temChave existe, o jogo precisa mudar essa informação quando o personagem encostar na chave. Por isso, o próximo bloco vai logo abaixo de Destruir o sprite, dentro do encontro. Encontre a área Quando acontecer, arrastando um espaço vazio entre os blocos se precisar, e deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte logo abaixo de Destruir o sprite. Esse bloco também chega com contador: clique em contador e escolha temChave.

[engaging, energetic, conversational voice] O valor dele vem com o número 1. Troque do mesmo jeito: abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1. Desta vez, deixe em verdadeiro, porque agora o personagem está com a chave.

[confident, clear, unhurried voice] Confira se ficou assim: no encontro com a chave, primeiro vem Destruir o sprite chave e, logo abaixo, Alterar temChave para verdadeiro.

[curious] Como eu vejo se o jogo guardou a chave?

[engaging, energetic, conversational voice] No jogo, você ainda não consegue ver temChave, porque quem vai usar essa informação é a porta do farol, no Dia 3. Por isso, desta vez quem confere o que você montou é a verificação.

[confident, clear, unhurried voice] Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d2-guardar-K2 | Dedé | 1 | assim: no encontro com a chave, primeiro vem Destruir o sprite chave e, logo abaixo, Alterar temChave para verdadeiro. | Como eu vejo se o jogo guardou a chave? | No jogo, você ainda não consegue ver temChave, porque quem vai usar essa informação é a porta do farol, no Dia 3. Por | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora ensine o seu jogo a lembrar da chave! Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Avise quem está jogando

**Clipe:** `video-d2-programar`

**Na tela:** Começar pela retomada, antes de qualquer bloco e nesta ordem: primeiro o problema (levar o personagem até a chave e, no "Tá vendo?", mostrar que o aviso continua dizendo Encontre a chave e vá ao farol), depois a lembrança e o anúncio. Depois, com o bloco de `temChave` à vista dentro do encontro, abrir **Programação → Variáveis**, pegar outro **Alterar variável ... para ...**, soltar logo abaixo dele, clicar em `contador` e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, soltar sobre o `1`, clicar em `Olá`, apagar e escrever `Você pegou a chave! Agora vá ao farol.`. Mostrar os três blocos na ordem.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, leve o personagem até a chave. Tá vendo? Ela some, mas o aviso continua dizendo Encontre a chave e vá ao farol, porque nenhum bloco muda o aviso quando a chave é pega.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Quando a chave era recolhida, o aviso mudava. Agora a gente vai fazer o seu aviso mudar também!

[engaging, energetic, conversational voice] O aviso tem que mudar no encontro com a chave. Por isso, o próximo bloco vai logo abaixo do bloco de temChave, ainda dentro do encontro. Deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte logo abaixo do bloco de temChave. Clique em contador e escolha aviso. É essa variável que mostra a mensagem na tela.

[engaging, energetic, conversational voice] Agora a gente precisa trocar o número desse bloco por um texto, que é a mensagem. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do número.

[confident, clear, unhurried voice] Repare que o bloco texto vem com a palavra Olá. Clique em Olá, apague e escreva: Você pegou a chave! Agora vá ao farol.

[engaging, energetic, conversational voice] Vamos conferir no jogo! Leve o personagem até a chave. [interested, animated voice] Olha só: a chave some e o aviso muda!

[confident, clear, unhurried voice] Agora clique em Atualizar. Começa uma partida nova: a chave volta para o chão, e o aviso diz de novo Encontre a chave e vá ao farol.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro do encontro com a chave estão três blocos, primeiro Destruir o sprite chave, depois Alterar temChave para verdadeiro e, por último, Alterar aviso para a sua mensagem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Pronto, você programou a coleta da chave: ela sai do chão, o jogo guarda em temChave que ela foi pega, e o aviso muda! E lembra da surpresa que eu te contei quando o curso começou? Ela está quase aqui! Na próxima aula você vai descobrir o que é.

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Agora avise quem está jogando! Mostre uma mensagem quando a chave for encontrada. Teste a coleta e clique em Verificar projeto. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
