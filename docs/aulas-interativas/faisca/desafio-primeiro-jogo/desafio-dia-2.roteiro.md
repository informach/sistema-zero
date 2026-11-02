# Roteiro de produção · desafio-dia-2

A professora grava toda a fala principal. Na edição kids, substituir apenas os trechos da tabela. Copie o arquivo .elevenlabs.txt para gerar a voz integral. Gravação e publicação desta revisão ainda não confirmadas.

## Parte 1. O jogo guardou a chave?

**Clipe:** `video-d2-contexto`

**Na tela:** A experiência aparece no tamanho da aula, com a chave no chão e a memória da chave desligada. No "Sabe quando você anota um recado", mostrar o meme ilustrado (2 a 3 s) do Zappy anotando um recado num papelzinho [na edição: meme do papelzinho]. No "essa variável vai se chamar temChave", mostrar o nome temChave com as duas respostas: verdadeiro quer dizer sim e falso quer dizer não [na edição: temChave, verdadeiro e falso]. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e deixar a cena parada, sem apontar controles. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não encostar na chave nem ligar a memória: o que acontece em cada caso é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos, regra, ações nem comandos: a experiência trabalha só a ideia, e os blocos ficam para as partes seguintes (decisões de 01/11 e 02/11/2026). O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O seu personagem já anda. Agora pense na porta do farol: ela só vai abrir para quem tiver a chave. Para isso, o jogo precisa lembrar se o personagem já pegou a chave.

[engaging, energetic, conversational voice] Para lembrar uma coisa, o jogo usa uma variável: um lugar com nome onde o jogo guarda uma informação.

[engaging, energetic, conversational voice] Sabe quando você anota um recado num papelzinho para não esquecer? A variável é como esse papelzinho: o jogo escreve ali o que precisa lembrar e olha de novo quando precisar.

[engaging, energetic, conversational voice] No seu jogo, essa variável vai se chamar temChave. O nome é uma pergunta: o personagem tem chave? A resposta fica guardada como verdadeiro, que quer dizer sim, ou falso, que quer dizer não.

[curious] Mas, se a chave some do chão, isso já quer dizer que o jogo guardou?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar quando o jogo guarda que o personagem pegou a chave, e quando ele esquece. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d2-contexto-K1 | Dedé | 1 | o personagem tem chave? A resposta fica guardada como verdadeiro, que quer dizer sim, ou falso, que quer dizer não. | Mas, se a chave some do chão, isso já quer dizer que o jogo guardou? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar quando o jogo guarda que o personagem | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, exportadas em `zappy-etapas.json`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.

**Recado na página (não gravar):** Sua vez! Investigue quando o jogo guarda que o personagem pegou a chave, e quando ele esquece. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Parte 2. Recolha a chave

**Clipe:** `video-d2-recolher`

**Na tela:** A parte começa com o Estúdio expandido e o projeto enviado no Dia 1 [expandir estúdio]. No "segure uma seta da tela e leve o personagem até a chave", segurar a seta da tela até o personagem passar por cima da chave. No "Tá vendo?", manter à vista a chave ainda no chão, embaixo do personagem. No "Repare: o seu projeto ainda não tem essa área", mostrar as áreas que já existem, **Ao iniciar** e **Enquanto estiver rodando**, sem nenhuma **Quando acontecer**. No "Deixe à vista um lugar sem blocos", deixar à vista um lugar sem blocos ao lado das áreas; se for preciso, arrastar um espaço vazio entre os blocos (na fala, "lugar sem blocos" é o destino e "espaço vazio" é só o ponto de onde se arrasta). No "Agora abra Áreas do projeto e pegue Quando acontecer", abrir **Áreas do projeto** [categoria Áreas do projeto] e pegar **Quando acontecer**. No "Arraste e solte nesse lugar sem blocos", soltar a área nesse lugar. No "Abra Jogo 2D, depois Colisões e depois Encostar e bloquear", abrir as categorias [categoria Jogo 2D > Colisões > Encostar e bloquear]. No "Arraste para dentro de Quando acontecer", levar o bloco **Quando o sprite ... começar a encostar no sprite ...** para dentro da área nova [encaixar "Quando o sprite" em "Quando acontecer"]. No "Repare que o bloco chega com dois nomes", apontar os nomes **jogador** e **inimigo** [apontar bloco "Quando o sprite"]. No "Clique em jogador e escolha personagem", trocar o campo [trocar "jogador" por "personagem" em "Quando o sprite"]. No "Depois clique em inimigo e escolha chave", trocar o campo [trocar "inimigo" por "chave" em "Quando o sprite"]. No "Deixe esse espaço à vista", apontar o espaço ao lado de **fazer** [apontar encaixe em "Quando o sprite"]. No "Abra Jogo 2D, depois Sprites", abrir as categorias [categoria Jogo 2D > Sprites > Criar e trocar aparência]. No "Arraste e solte no espaço vazio ao lado de fazer", encaixar o bloco [encaixar "Destruir o sprite" em "Quando o sprite"]. No "Clique em resposta e escolha chave", trocar o campo [trocar "resposta" por "chave" em "Destruir o sprite"]. No "Segure as setas e leve o personagem até a chave", segurar a seta da tela até o personagem encostar na chave; no "Olha só", a chave já saiu do chão. No "clique em Atualizar", clicar em **Atualizar**, logo acima do jogo [clicar "Atualizar o preview"], e manter à vista a chave de volta no chão. No "Funcionou? Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, segure uma seta da tela e leve o personagem até a chave. No computador, também dá para clicar no jogo e usar as setas do teclado.

[interested, animated voice] Tá vendo? Ele passa por cima da chave, e ela continua no chão: o seu jogo ainda não sabe o que fazer nesse encontro.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Ali, a chave saía do chão. Agora a gente vai fazer isso no seu jogo!

[engaging, energetic, conversational voice] Uma coisa que acontece no jogo, como esse encontro do personagem com a chave, se chama evento. Os blocos de evento ficam numa área própria, chamada Quando acontecer.

[confident, clear, unhurried voice] Repare: o seu projeto ainda não tem essa área. Por isso, primeiro você vai criar a área Quando acontecer.

[confident, clear, unhurried voice] Deixe à vista um lugar sem blocos, ao lado das áreas que já existem. Se não houver lugar livre na tela, arraste um espaço vazio entre os blocos até aparecer um.

[confident, clear, unhurried voice] Agora abra Áreas do projeto e pegue Quando acontecer. Arraste e solte nesse lugar sem blocos.

[engaging, energetic, conversational voice] Com a área criada, falta o bloco que percebe o encontro.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Quando o sprite começar a encostar no sprite.

[confident, clear, unhurried voice] Arraste para dentro de Quando acontecer e solte quando aparecer o encaixe.

[confident, clear, unhurried voice] Repare que o bloco chega com dois nomes, jogador e inimigo. Esses dois espaços são para os sprites que se encontram. Lembra? Sprite é cada objeto do jogo que você pode programar.

[confident, clear, unhurried voice] Clique em jogador e escolha personagem. Depois clique em inimigo e escolha chave.

[engaging, energetic, conversational voice] É este bloco que percebe o encontro. Tudo o que você colocar dentro dele vai acontecer quando o personagem encostar na chave.

[engaging, energetic, conversational voice] Agora falta dizer o que acontece no encontro: a chave sai do chão. Isso vai dentro do bloco do encontro, no espaço vazio ao lado da palavra fazer. Deixe esse espaço à vista.

[engaging, energetic, conversational voice] O bloco que faz isso se chama Destruir o sprite. Destruir, aqui, quer dizer tirar a chave da partida.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, e pegue o bloco Destruir o sprite.

[confident, clear, unhurried voice] Arraste e solte no espaço vazio ao lado de fazer.

[confident, clear, unhurried voice] Repare que o bloco chega com o nome resposta. Clique em resposta e escolha chave.

[engaging, energetic, conversational voice] É este bloco que tira a chave do chão, como na experiência.

[upbeat, encouraging voice] Agora teste! Segure as setas e leve o personagem até a chave. [interested, animated voice] Olha só: a chave sai do chão!

[curious] A chave some para sempre?

[engaging, energetic, conversational voice] Não, ela só sai desta partida. Para ver, clique em Atualizar, o botão com uma seta redonda, logo acima do jogo. Começa uma partida nova, e a chave volta para o chão.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de Quando acontecer está o encontro entre personagem e chave, e dentro dele está Destruir o sprite chave. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d2-recolher-K2 | Dedé | 1 | chão, como na experiência. Agora teste! Segure as setas e leve o personagem até a chave. Olha só: a chave sai do chão! | A chave some para sempre? | Não, ela só sai desta partida. Para ver, clique em Atualizar, o botão com uma seta redonda, logo acima do jogo. Começa | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora faça o seu personagem pegar a chave! Crie a área Quando acontecer, coloque nela o encontro do personagem com a chave e faça a chave sair do chão. Depois teste e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Guarde que a chave foi encontrada

**Clipe:** `video-d2-guardar`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. Não há teste no jogo nesta retomada: temChave não aparece na tela. No "Por isso, ela vai na área Ao iniciar", apontar a área **Ao iniciar**. No "Encontre o fim da área Ao iniciar", mostrar o fim da área, logo abaixo de **Ativar controles clássicos**; se for preciso, arrastar um espaço vazio entre os blocos [arrastar até "Ativar controles clássicos"]. No "Agora abra Programação e depois Variáveis", abrir as categorias [categoria Programação > Variáveis] e pegar **Criar variável ... com valor ...**. No "Arraste e solte logo abaixo de Ativar controles clássicos", encaixar o bloco [encaixar "Criar variável" abaixo de "Ativar controles clássicos"]. No "Repare que, logo acima", apontar as variáveis **aviso** e **ganhou** que já estão em **Ao iniciar**. No "Clique em contador e apague", clicar em `contador` (o nome com que o bloco nasce), apagar, escrever `temChave` e clicar fora do campo [trocar "contador" por "temChave" em "Criar variável"]. No "Abra Programação e depois Lógica e Se", abrir as categorias [categoria Programação > Lógica & Se] e pegar o bloco **verdadeiro** (no catálogo, Verdadeiro ou falso; na tela, só o menu). No "Arraste e solte em cima do 0", soltar o bloco sobre o `0` do bloco de criar. No "Agora clique em verdadeiro e escolha falso", trocar o valor [trocar "verdadeiro" por "falso" em "Criar variável"]. No "Encontre a área Quando acontecer", arrastar até a área aparecer [arrastar até "Quando acontecer"] e deixar à vista **Destruir o sprite**. No "Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para", abrir as categorias [categoria Programação > Variáveis]. No "Arraste e solte logo abaixo de Destruir o sprite", encaixar o bloco [encaixar "Alterar variável" abaixo de "Destruir o sprite"]. No "Clique em contador e escolha temChave", trocar o campo [trocar "contador" por "temChave" em "Alterar variável"]. No "Arraste e solte em cima do 1", abrir **Programação → Lógica & Se** e soltar o bloco **verdadeiro** sobre o `1`, mantendo **verdadeiro**. No "É este bloco que liga a memória da chave", apontar **Alterar temChave para verdadeiro** [apontar bloco "Alterar variável"]. No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com a memória da chave desligada, a chave saía do chão, mas temChave continuava falso.

[engaging, energetic, conversational voice] O seu jogo está igual à memória desligada: a chave sai do chão, mas o jogo não guarda em lugar nenhum que ela foi pega. Agora a gente vai ligar a memória da chave no seu jogo!

[engaging, energetic, conversational voice] São dois passos. Primeiro, você cria temChave, começando em falso. Depois, faz o encontro com a chave guardar verdadeiro nela.

[engaging, energetic, conversational voice] temChave precisa existir desde o começo da partida. Por isso, ela vai na área Ao iniciar, que tem o que o jogo prepara quando a partida começa.

[confident, clear, unhurried voice] Encontre o fim da área Ao iniciar, logo abaixo de Ativar controles clássicos. Se esse lugar não estiver aparecendo, arraste um espaço vazio entre os blocos até ele aparecer.

[confident, clear, unhurried voice] Agora abra Programação e depois Variáveis, e pegue o bloco Criar variável com valor.

[confident, clear, unhurried voice] Arraste e solte logo abaixo de Ativar controles clássicos.

[confident, clear, unhurried voice] Repare que, logo acima, o seu jogo já tem outras variáveis, como aviso, que guarda a mensagem do jogo. temChave vai ficar junto delas.

[confident, clear, unhurried voice] Esse bloco chega com o nome contador. Clique em contador e apague. Escreva temChave, tudo junto e com o C maiúsculo. Depois clique fora do campo.

[engaging, energetic, conversational voice] No fim do bloco vem o número 0. Só que temChave não guarda número: ela guarda verdadeiro ou falso. Por isso, esse 0 vai ser trocado.

[confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco verdadeiro. Arraste e solte em cima do 0. Ele entra no lugar do número.

[confident, clear, unhurried voice] Agora clique em verdadeiro e escolha falso, porque a partida começa sem a chave.

[confident, clear, unhurried voice] Confira se ficou assim: no fim de Ao iniciar, está Criar variável temChave com valor falso.

[engaging, energetic, conversational voice] Agora o segundo passo. Quando o personagem encostar na chave, o jogo precisa guardar verdadeiro em temChave. Por isso, o próximo bloco vai dentro do encontro, logo abaixo de Destruir o sprite.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Depois deixe à vista o bloco Destruir o sprite, dentro do encontro.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte logo abaixo de Destruir o sprite.

[confident, clear, unhurried voice] Esse bloco também chega com contador. Clique em contador e escolha temChave.

[engaging, energetic, conversational voice] No fim dele vem o número 1. Ele também vai ser trocado pelo bloco verdadeiro.

[confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco verdadeiro. Arraste e solte em cima do 1.

[engaging, energetic, conversational voice] Desta vez, deixe em verdadeiro, porque agora o personagem está com a chave.

[engaging, energetic, conversational voice] É este bloco que liga a memória da chave: no encontro, ele guarda verdadeiro em temChave.

[confident, clear, unhurried voice] Confira se ficou assim: no encontro com a chave, primeiro vem Destruir o sprite chave e, logo abaixo, Alterar temChave para verdadeiro.

[curious] Como eu vejo se o jogo guardou a chave?

[engaging, energetic, conversational voice] Jogando, você não vê temChave, porque ela não aparece na tela. Quem vai usar essa informação é a porta do farol, na próxima aula. Por isso, desta vez quem confere os seus blocos é o botão Verificar projeto.

[confident, clear, unhurried voice] Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d2-guardar-K2 | Dedé | 1 | assim: no encontro com a chave, primeiro vem Destruir o sprite chave e, logo abaixo, Alterar temChave para verdadeiro. | Como eu vejo se o jogo guardou a chave? | Jogando, você não vê temChave, porque ela não aparece na tela. Quem vai usar essa informação é a porta do farol, na | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora ensine o seu jogo a lembrar da chave! Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Avise quem está jogando

**Clipe:** `video-d2-programar`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "segure as setas e leve o personagem até a chave", segurar a seta da tela até o personagem encostar na chave. No "Repare no aviso", apontar a mensagem no alto do jogo. No "Tá vendo?", manter à vista o aviso ainda dizendo **Encontre a chave e vá ao farol**. No "Encontre a área Quando acontecer", arrastar até a área aparecer [arrastar até "Quando acontecer"] e deixar à vista o bloco de `temChave` dentro do encontro. No "Abra Programação e depois Variáveis", abrir as categorias [categoria Programação > Variáveis]. No "Arraste e solte logo abaixo do bloco de temChave", encaixar outro **Alterar variável ... para ...** [encaixar "Alterar variável" abaixo de "Alterar variável"]. No "Clique em contador e escolha aviso", trocar o campo [trocar "contador" por "aviso" em "Alterar variável"]. No "Abra Programação e depois Valores", abrir as categorias [categoria Programação > Valores] e soltar o bloco **texto** sobre o `1`. No "Clique em Olá e apague", clicar em `Olá` e apagar. No "Escreva", escrever a mensagem que a fala dita e clicar fora do campo [trocar "Olá" por "Você pegou a chave! Agora vá ao farol." em "Alterar variável"]. No "Segure as setas e leve o personagem até a chave", segurar a seta da tela até o personagem encostar na chave; no "Olha só", a chave já saiu do chão e o aviso mostra a mensagem nova. No "Agora clique em Atualizar", clicar em **Atualizar**, logo acima do jogo [clicar "Atualizar o preview"], e manter à vista a chave de volta e o aviso do começo. No "Funcionou? Clique em Verificar projeto", verificar [verificar projeto]. No "clique em Enviar meu projeto e confirme em Enviar", enviar e confirmar [enviar projeto]. No "Pronto, você programou", mostrar os três blocos dentro do encontro, na ordem. No "Quando aparecer Projeto enviado!, clique em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, segure as setas e leve o personagem até a chave. Repare no aviso, a mensagem no alto do jogo.

[interested, animated voice] Tá vendo? A chave sai do chão, mas o aviso continua dizendo Encontre a chave e vá ao farol. É que o seu jogo ainda não manda o aviso mudar quando a chave é pega.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Quando o personagem pegava a chave, o aviso mudava. Agora a gente vai fazer o aviso do seu jogo mudar também!

[engaging, energetic, conversational voice] O aviso tem que mudar no encontro com a chave. Por isso, o próximo bloco vai dentro do encontro, logo abaixo do bloco de temChave.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Depois deixe à vista o bloco de temChave, dentro do encontro.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte logo abaixo do bloco de temChave.

[confident, clear, unhurried voice] Esse bloco chega com contador. Clique em contador e escolha aviso.

[engaging, energetic, conversational voice] É este bloco que muda o aviso, como na experiência. A variável aviso guarda a mensagem que aparece no alto do jogo.

[engaging, energetic, conversational voice] No fim do bloco vem o número 1. Mas o aviso guarda uma mensagem, que é um texto. Por isso, esse número vai ser trocado por um bloco de texto.

[confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco texto. Arraste e solte em cima do 1.

[confident, clear, unhurried voice] Repare que o bloco texto vem com a palavra Olá. Clique em Olá e apague. Escreva: Você pegou a chave! Agora vá ao farol. Depois clique fora do campo.

[upbeat, encouraging voice] Agora teste! Segure as setas e leve o personagem até a chave. [interested, animated voice] Olha só: a chave sai do chão, e o aviso muda para a sua mensagem!

[confident, clear, unhurried voice] Agora clique em Atualizar, o botão com uma seta redonda, logo acima do jogo. Começa uma partida nova: a chave volta para o chão, e o aviso diz de novo Encontre a chave e vá ao farol.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro do encontro com a chave estão três blocos, primeiro Destruir o sprite chave, depois Alterar temChave para verdadeiro e, por último, Alterar aviso para a sua mensagem. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Pronto, você programou o que acontece quando o personagem pega a chave: ela sai do chão, o jogo guarda em temChave que ela foi pega, e o aviso muda! E lembra da surpresa que eu te contei quando o curso começou? Ela está quase aqui! Na próxima aula você vai descobrir o que é.

[engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Agora avise quem está jogando! Faça o aviso mudar quando o personagem pegar a chave. Teste no jogo e clique em Verificar projeto. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
