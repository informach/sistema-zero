# Roteiro de produção · desafio-dia-3

A professora grava toda a fala principal. Na edição kids, substituir apenas os trechos da tabela. Copie o arquivo .elevenlabs.txt para gerar a voz integral. Gravação e publicação desta revisão ainda não confirmadas.

## Parte 1. O que a porta precisa?

**Clipe:** `video-d3-condicao`

**Na tela:** A experiência aparece no tamanho da aula, com o personagem sem a chave. Do "Sabe quando você pergunta" até o "leva o guarda-chuva", a tela fica parada, e a edição troca esse trecho por uma criança na porta de casa olhando o céu, com um guarda-chuva fechado ao lado, sem mostrar se chove [na edição: a pergunta da chuva e o guarda-chuva]. No "a porta do farol também faz uma pergunta", a tela volta para a experiência. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e deixar a cena parada, sem apontar controles. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não dar a chave nem testar a porta: qual resposta a porta escolhe é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos, regra, então, senão nem comandos: eles ficam para a montagem (decisões de 01/11 e 02/11/2026). O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O seu jogo já guarda em temChave se o personagem pegou a chave. Agora o farol vai usar essa informação para decidir o que fazer quando o personagem chegar à porta dele.

[confident, clear, unhurried voice] Uma pergunta que o jogo faz para decidir o que acontece tem um nome: condição. E a resposta dela só pode ser sim ou não.

[engaging, energetic, conversational voice] Sabe quando você pergunta “está chovendo?” antes de sair? A resposta, sim ou não, decide se você leva o guarda-chuva.

[engaging, energetic, conversational voice] No seu jogo, a porta do farol também faz uma pergunta, com o nome que o jogo usa: temChave é verdadeiro? Essa é a condição da porta.

[curious] E se a resposta for não?

[engaging, energetic, conversational voice] O que você acha que a porta faz? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar o que a porta faz quando o personagem chega sem a chave e quando chega com a chave. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-condicao-K1 | Debinha | 1 | a porta do farol também faz uma pergunta, com o nome que o jogo usa: temChave é verdadeiro? Essa é a condição da porta. | E se a resposta for não? | O que você acha que a porta faz? Isso você vai testar na experiência. Agora você vai investigar o que a porta faz | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, exportadas em `zappy-etapas.json`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.

**Recado na página (não gravar):** Sua vez! Investigue o que a porta faz quando o personagem chega sem a chave e com a chave. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Parte 2. Avise quando faltar a chave

**Clipe:** `video-d3-sem-chave`

**Na tela:** A parte começa com o Estúdio expandido e o projeto enviado no Dia 2 [expandir estúdio]. No "segure as setas e leve o personagem até a porta do farol", segurar a seta da tela até o personagem chegar à porta do farol, na base da torre (encostar só na torre não conta). No "Tá vendo?", manter à vista o farol apagado e o aviso sem mudança. No "Encontre essa área", arrastar até a área aparecer [arrastar até "Quando acontecer"]. No "Lá dentro está o encontro com a chave", apontar o encontro com a chave [apontar bloco "Quando o sprite"] e deixar à vista o espaço logo abaixo dele. No "Agora abra Jogo 2D, depois Colisões", abrir as categorias [categoria Jogo 2D > Colisões > Encostar e bloquear]. No "Arraste e solte logo abaixo do encontro com a chave", levar o bloco novo para logo abaixo do encontro com a chave, fora dele [encaixar "Quando o sprite" abaixo de "Quando o sprite"]. No "Clique em jogador e escolha personagem", trocar o campo do bloco novo [trocar "jogador" por "personagem"]. No "Depois clique em inimigo e escolha farol", trocar o campo [trocar "inimigo" por "farol"]. No "É este bloco que percebe", apontar o encontro novo. No "Ela vai no espaço vazio ao lado da palavra fazer", apontar o espaço ao lado de **fazer** do encontro novo [apontar encaixe em "Quando o sprite"]. No "Abra Programação e depois Lógica e Se, e pegue o bloco Se", abrir as categorias [categoria Programação > Lógica & Se]. No "Arraste e solte no espaço vazio ao lado de fazer", encaixar o bloco [encaixar "Se" em "Quando o sprite"] (com dois encontros na área, conferir no Verificar plano que a mão vai ao encontro novo, o do farol). No "Repare: o Se chega com uma pergunta pronta", apontar a pergunta **x > 0** [apontar bloco "Se"]. No "segure essa pergunta pelo sinal de maior", levar a pergunta pelo sinal de maior até a lixeira, no canto de baixo, à direita, do espaço dos blocos (gesto à mão: o palco não tem verbo para a lixeira), até o lugar ao lado de **Se** ficar vazio. No "Abra Programação e depois Valores, e pegue o bloco valor da variável", abrir as categorias [categoria Programação > Valores]. No "Arraste e solte no lugar vazio ao lado de Se", encaixar o bloco [encaixar "valor da variável" em "Se" no "Se"]. No "Clique no x e escolha temChave", trocar o campo [trocar "x" por "temChave" em "valor da variável"]. No "Olha aqui: este é o espaço do então", apontar o espaço do **então**, ainda vazio [apontar encaixe em "Se" no "então"]. No "Olha aqui, na linha de baixo do bloco Se", apontar os dois sinais de mais. No "Clique no segundo sinal de mais", clicar no segundo, antes da palavra **senão**, no fim da linha (gesto à mão). No "Abra Programação e depois Variáveis", abrir as categorias [categoria Programação > Variáveis]. No "Arraste e solte dentro do senão", encaixar o bloco no espaço do **senão** [encaixar "Alterar variável" em "Se" no "senão"] (o rodapé do Se também escreve senão: conferir no Verificar plano que a mão vai ao espaço aberto). No "Clique em contador e escolha aviso", trocar o campo [trocar "contador" por "aviso" em "Alterar variável"]. No "Abra Programação e depois Valores, e pegue o bloco texto", abrir as categorias [categoria Programação > Valores] e soltar o bloco **texto** sobre o número. No "Clique em Olá", clicar em `Olá`, apagar, escrever a mensagem que a fala dita e clicar fora do campo (à mão: a mensagem tem ponto no meio, e o palco cortaria a frase do Na tela). No "Agora vamos testar! Clique em Atualizar", clicar em **Atualizar**, logo acima do jogo [clicar "Atualizar o preview"]. No "Vá até a porta do farol sem pegar a chave", segurar a seta da tela até a porta do farol, sem passar pela chave; no "Olha só", manter à vista o farol apagado e o aviso de que falta a chave. No "Funcionou? Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, segure as setas e leve o personagem até a porta do farol, lá na base da torre. Tá vendo? Nada acontece, porque o seu jogo ainda não sabe o que fazer quando o personagem chega ao farol.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? A porta perguntava se temChave é verdadeiro. Com a resposta não, ela avisava que falta a chave. Agora a gente vai ensinar o farol do seu jogo a fazer essa pergunta, começando por esse aviso!

[engaging, energetic, conversational voice] Primeiro, o jogo precisa perceber quando o personagem chega ao farol. Chegar ao farol é um encontro, como pegar a chave, e os encontros ficam na área Quando acontecer.

[confident, clear, unhurried voice] Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Lá dentro está o encontro com a chave, que você montou no Dia 2. O encontro novo vai logo abaixo dele. Deixe esse espaço à vista.

[confident, clear, unhurried voice] Agora abra Jogo 2D, depois Colisões e depois Encostar e bloquear, e pegue o bloco Quando o sprite começar a encostar no sprite.

[confident, clear, unhurried voice] Arraste e solte logo abaixo do encontro com a chave, ainda na área Quando acontecer. Não coloque um encontro dentro do outro.

[confident, clear, unhurried voice] Repare: o bloco chega com os nomes jogador e inimigo. Clique em jogador e escolha personagem.

[confident, clear, unhurried voice] Depois clique em inimigo e escolha farol.

[engaging, energetic, conversational voice] É este bloco que percebe quando o personagem chega ao farol.

[engaging, energetic, conversational voice] Agora, dentro desse encontro, o farol vai fazer a pergunta da porta. Ela vai no espaço vazio ao lado da palavra fazer. Deixe esse espaço à vista.

[engaging, energetic, conversational voice] Para fazer uma pergunta, o seu jogo usa o bloco Se. É ele que vai fazer a pergunta da porta.

[confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco Se.

[confident, clear, unhurried voice] Arraste e solte no espaço vazio ao lado de fazer.

[confident, clear, unhurried voice] Repare: o Se chega com uma pergunta pronta, x maior que 0. Não é isso que o farol precisa perguntar.

[confident, clear, unhurried voice] Por isso, segure essa pergunta pelo sinal de maior e arraste até a lixeira, no canto de baixo, à direita, do espaço dos blocos.

[confident, clear, unhurried voice] Agora o lugar ao lado de Se ficou vazio. É ali que vai a pergunta certa. Deixe esse lugar à vista.

[engaging, energetic, conversational voice] A pergunta certa é sobre temChave. O bloco que traz o que temChave guarda se chama valor da variável.

[confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco valor da variável.

[confident, clear, unhurried voice] Arraste e solte no lugar vazio ao lado de Se.

[confident, clear, unhurried voice] Repare: esse bloco chega com x. Clique no x e escolha temChave.

[engaging, energetic, conversational voice] Pronto: agora o Se pergunta se temChave é verdadeiro. A palavra verdadeiro não aparece no bloco, e nem precisa. Com temChave sozinho ao lado do Se, a pergunta já é essa.

[curious] E onde eu escrevo que falta a chave?

[engaging, energetic, conversational voice] Num espaço do próprio Se. Lembra das duas respostas da porta, o sim e o não? No bloco Se, cada resposta tem o seu espaço, com um nome.

[interested, animated voice] Olha aqui: este é o espaço do então. Nele vai a resposta do sim, para quando o personagem chega com a chave.

[engaging, energetic, conversational voice] A resposta do não fica no espaço do senão, para quando o personagem chega sem a chave. É lá que vai o aviso. Só que o Se chega sem o senão, e você vai abrir esse espaço agora.

[interested, animated voice] Olha aqui, na linha de baixo do bloco Se: tem dois sinais de mais. O primeiro fica antes de senão se, e o segundo fica antes da palavra senão, no fim da linha.

[confident, clear, unhurried voice] Clique no segundo sinal de mais. Não clique no primeiro.

[confident, clear, unhurried voice] Repare: apareceu o espaço do senão. Deixe esse espaço à vista.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte dentro do senão.

[confident, clear, unhurried voice] Esse bloco chega com contador. Clique em contador e escolha aviso.

[engaging, energetic, conversational voice] O valor desse bloco vem com um número, mas o aviso é uma mensagem. Por isso, troque o número por um texto.

[confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco texto.

[confident, clear, unhurried voice] Solte em cima do número. Ele entra no lugar do número.

[confident, clear, unhurried voice] Repare: o texto chega com Olá. Clique em Olá, apague e escreva: A porta não abriu. Falta a chave.

[engaging, energetic, conversational voice] O espaço do então fica vazio por enquanto. Você completa a resposta do sim na próxima parte.

[upbeat, encouraging voice] Agora vamos testar! Clique em Atualizar, o botão com uma seta redonda, logo acima do jogo, para começar uma partida nova.

[engaging, energetic, conversational voice] Vá até a porta do farol sem pegar a chave. [interested, animated voice] Olha só: a luz continua apagada, e o aviso diz que falta a chave. É a resposta do senão funcionando!

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de Quando acontecer está o encontro entre personagem e farol, dentro dele está o Se com temChave, e dentro do senão está o aviso de que falta a chave. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-sem-chave-K2 | Debinha | 1 | A palavra verdadeiro não aparece no bloco, e nem precisa. Com temChave sozinho ao lado do Se, a pergunta já é essa. | E onde eu escrevo que falta a chave? | Num espaço do próprio Se. Lembra das duas respostas da porta, o sim e o não? No bloco Se, cada resposta tem o seu | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora ensine o farol a avisar quando falta a chave! Monte o encontro com o farol, o bloco Se e o aviso no espaço do senão. Depois teste: vá até a porta do farol sem pegar a chave. Funcionou? Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 3. Acenda o farol com a chave

**Clipe:** `video-d3-decisao`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Aqui no seu jogo, clique em Atualizar", clicar em **Atualizar** [clicar "Atualizar o preview"], segurar a seta da tela até pegar a chave e depois até a porta do farol, na base da torre. No "Tá vendo?", manter à vista o farol apagado. No "Continue no mesmo Se", apontar o espaço do **então**, ainda vazio [apontar encaixe em "Se" no "então"]. No "Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para", abrir as categorias [categoria Programação > Variáveis]. No "Arraste e solte dentro do então", encaixar o bloco no espaço do **então** [encaixar "Alterar variável" em "Se" no "então"]. No "Clique em contador e escolha ganhou", trocar o campo [trocar "contador" por "ganhou"]. No "Abra Programação e depois Lógica e Se, e pegue o bloco verdadeiro", abrir as categorias [categoria Programação > Lógica & Se] e soltar **verdadeiro** sobre o número, mantendo **verdadeiro**. No "Esse bloco vai logo abaixo do bloco de ganhou", apontar o lugar abaixo do bloco de **ganhou** [apontar abaixo de "Alterar variável"]. No "Abra Jogo 2D, depois Sprites", abrir as categorias [categoria Jogo 2D > Sprites > Criar e trocar aparência]. No "Arraste e solte logo abaixo do bloco de ganhou", encaixar o bloco logo abaixo do bloco de **ganhou**, dentro do **então** [encaixar "Trocar imagem do sprite" abaixo de "Alterar variável"]. No "Clique no primeiro heroi e escolha farol", trocar o primeiro nome [trocar "heroi" por "farol" em "Trocar imagem do sprite"]. No "Depois clique no segundo heroi", trocar o segundo nome [trocar "heroi" por "farol-listrado-aceso" em "Trocar imagem do sprite"]. No "Abra Programação e depois Variáveis, e pegue outro bloco", abrir as categorias [categoria Programação > Variáveis]. No "Arraste e solte logo abaixo da troca de imagem", encaixar o bloco [encaixar "Alterar variável" abaixo de "Trocar imagem do sprite"]. No "Clique em contador e escolha aviso", trocar o campo [trocar "contador" por "aviso" em "Alterar variável"]. No "Abra Programação e depois Valores, e pegue o bloco texto", abrir as categorias [categoria Programação > Valores] e soltar o bloco **texto** sobre o número. No "Clique em Olá, apague e escreva", clicar em `Olá`, apagar, escrever a mensagem que a fala dita e clicar fora do campo (à mão: a mensagem tem ponto de exclamação no meio). No "Agora vamos testar o jogo inteiro", clicar em **Atualizar** [clicar "Atualizar o preview"] e segurar a seta da tela até a porta do farol, sem pegar a chave. No "sem recomeçar a partida, busque a chave", segurar a seta da tela até a chave e depois até a porta do farol; no "Olha só", manter à vista o farol aceso, o aviso novo e o barco entrando. No "É só clicar em Atualizar de novo", clicar em **Atualizar** [clicar "Atualizar o preview"] e manter à vista a chave de volta no chão. No "Vá direto até a porta do farol", segurar a seta da tela até a porta, sem pegar a chave. No "Funcionou? Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Atualizar, pegue a chave e vá até a porta do farol. Tá vendo? A luz não acende, porque o espaço do então, o da resposta do sim, ainda está vazio.

[engaging, energetic, conversational voice] Lembra da experiência da primeira parte desta aula? Com a chave, a resposta era sim, e a porta acendia o farol. Agora a gente vai pôr essa resposta no então do seu jogo!

[engaging, energetic, conversational voice] A resposta do sim vai ter três blocos, um embaixo do outro: um que chama o barco, um que acende a luz e um aviso para quem está jogando.

[confident, clear, unhurried voice] Continue no mesmo Se, dentro do encontro com o farol, e deixe à vista o espaço do então.

[engaging, energetic, conversational voice] O primeiro bloco chama o barco. Quem chama o barco é a variável ganhou: quando ganhou fica verdadeiro, o barco começa a chegar.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte dentro do então.

[confident, clear, unhurried voice] Clique em contador e escolha ganhou.

[engaging, energetic, conversational voice] Agora troque o número desse bloco por verdadeiro, do mesmo jeito que você fez com temChave no Dia 2.

[confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco verdadeiro.

[confident, clear, unhurried voice] Solte em cima do número e deixe em verdadeiro.

[engaging, energetic, conversational voice] O segundo bloco acende a luz. Para isso, o farol troca de imagem: sai o farol apagado e entra o farol aceso.

[confident, clear, unhurried voice] Esse bloco vai logo abaixo do bloco de ganhou, ainda dentro do então. Deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, e pegue o bloco Trocar imagem do sprite para.

[confident, clear, unhurried voice] Arraste e solte logo abaixo do bloco de ganhou.

[confident, clear, unhurried voice] Repare: esse bloco chega com heroi em dois lugares. Clique no primeiro heroi e escolha farol. É o farol que vai trocar de imagem.

[confident, clear, unhurried voice] Depois clique no segundo heroi e escolha a imagem farol listrado aceso. Se não achar, role a lista.

[curious] E quem está jogando vai saber que deu certo?

[engaging, energetic, conversational voice] Vai, sim! É para isso que serve o terceiro bloco: o aviso. Ele vai logo abaixo da troca de imagem, ainda dentro do então. Deixe esse lugar à vista.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para.

[confident, clear, unhurried voice] Arraste e solte logo abaixo da troca de imagem.

[confident, clear, unhurried voice] Clique em contador e escolha aviso.

[engaging, energetic, conversational voice] Agora troque o número pela mensagem, como você fez no senão.

[confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco texto.

[confident, clear, unhurried voice] Solte em cima do número.

[confident, clear, unhurried voice] Clique em Olá, apague e escreva: Você acendeu o farol! Olhe o barco chegando.

[upbeat, encouraging voice] Agora vamos testar o jogo inteiro! Clique em Atualizar e vá até a porta do farol sem pegar a chave. A luz continua apagada, e o aviso diz que falta a chave.

[engaging, energetic, conversational voice] Agora, sem recomeçar a partida, busque a chave e volte até a porta do farol, lá na base da torre. [interested, animated voice] Olha só: a luz acende, o aviso muda, e o barco vem chegando perto do farol!

[curious] Acendeu! E se eu quiser jogar de novo?

[confident, clear, unhurried voice] É só clicar em Atualizar de novo. [confident, clear, unhurried voice] Repare: a chave volta para o chão, porque começou uma partida nova, e o personagem está outra vez sem a chave.

[confident, clear, unhurried voice] Vá direto até a porta do farol, sem pegar a chave. O farol tem que avisar outra vez que falta a chave.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro do então estão ganhou verdadeiro, a imagem farol listrado aceso e o aviso de chegada, e dentro do senão está o aviso de que falta a chave. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Seu jogo é salvo automaticamente enquanto você monta. Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-decisao-K2 | Debinha | 1 | trocar de imagem. Depois clique no segundo heroi e escolha a imagem farol listrado aceso. Se não achar, role a lista. | E quem está jogando vai saber que deu certo? | Vai, sim! É para isso que serve o terceiro bloco: o aviso. Ele vai logo abaixo da troca de imagem, ainda dentro do | [curious] |
| video-d3-decisao-K3 | Debinha | 1 | até a porta do farol, lá na base da torre. Olha só: a luz acende, o aviso muda, e o barco vem chegando perto do farol! | Acendeu! E se eu quiser jogar de novo? | É só clicar em Atualizar de novo. Repare: a chave volta para o chão, porque começou uma partida nova, e o personagem | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora acenda o farol! Complete o espaço do então, onde vai a resposta do sim. Teste sem a chave, com a chave e numa partida nova. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 4. Deixe o jogo com a sua cara

**Clipe:** `video-d3-personalizar`

**Na tela:** Antes de gravar, preparar as duas versões em dois perfis de teste, cada um com o próprio Estúdio do Dia 3 já verificado (o Estúdio da aula guarda um projeto por perfil; não usar o Estúdio completo, que é vendido à parte e fica fora desta gravação): **robo**, **lancha**, **chave-prateada**, o par **farol-colorido** e **ilha-nevada**; e **mergulhador**, **veleiro**, **chave-dourada**, o par **farol-de-madeira** e **costa-rochosa** (nenhuma das duas é a combinação que o vídeo monta depois). De cada perfil, gravar um trecho de 3 a 4 segundos com a chave já recolhida: o personagem encosta na porta, o farol acende e o barco entra pela direita (ele chega em cerca de 1 segundo, por isso o trecho começa no momento em que o farol acende). Conferir que nenhum trecho mostra o nome do perfil de teste. A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. Do "Sua missão deu certo" até o "Que combinação você vai criar", a tela fica parada, e a edição troca esse trecho pelos dois trechos gravados antes, um depois do outro [na edição: as duas versões do jogo rodando]. Do "Olha aqui: estas são todas as opções" até o "com o mesmo nome", a edição mostra as páginas **A surpresa do final** do Passo a passo do projeto, com as galerias de personagens, cenários, barcos, chaves e faróis [na edição: galerias do Passo a passo do projeto]. No "Eu vou mostrar com o pirata", a tela volta para o Estúdio. No "Encontre essa área", arrastar até a área aparecer [arrastar até "Ao iniciar"]. No "Lá dentro, deixe à vista o bloco Criar sprite personagem", apontar o nome da imagem no fim do bloco [apontar bloco "Criar sprite"]. No "Clique no nome da imagem para abrir a lista", trocar a imagem [trocar "aventureiro" por "pirata"]. No "Olha só: ele aparece no mesmo lugar", manter à vista o pirata no jogo. No "no bloco Criar sprite barco, clique no nome da imagem", trocar a imagem [trocar "veleiro" por "barco-pirata"]. No "No bloco Criar sprite chave, clique no nome da imagem", trocar a imagem [trocar "chave-dourada" por "chave-de-estrela"]; no "Olha só", manter à vista a chave nova no jogo. No "no bloco Criar sprite farol, clique no nome da imagem", trocar a imagem [trocar "farol-listrado-apagado" por "farol-de-pedra-apagado"]. No "Agora, o aceso", arrastar até a área aparecer [arrastar até "Quando acontecer"]. No "No encontro do personagem com o farol, dentro do então", apontar o bloco [apontar bloco "Trocar imagem do sprite"]. No "Clique no nome da imagem, como farol listrado aceso", trocar a imagem [trocar "farol-listrado-aceso" por "farol-de-pedra-aceso"]. No "Agora falta o lugar onde a história acontece", arrastar até a área aparecer [arrastar até "Enquanto estiver rodando"]. No "no bloco Desenhar o cenário, clique no nome do cenário", trocar o cenário [trocar "praia-tropical" por "noite-na-ilha"]; no "Olha só", manter à vista a ponte e o mar no mesmo lugar. No "Agora teste a sua combinação! Clique em Atualizar", clicar em **Atualizar** [clicar "Atualizar o preview"] e segurar a seta da tela até a porta do farol, sem a chave. No "Depois busque a chave e volte até a porta", segurar a seta da tela até a chave e de volta à porta; no "Olha só", manter à vista o farol de pedra aceso e o barco pirata chegando. No "Funcionou? Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[pleased, lively voice] Sua missão deu certo! E a surpresa chegou: olha quantas versões o seu jogo pode ter: outro personagem, outro cenário, outro barco… Que combinação você vai criar?

[interested, animated voice] Olha aqui: estas são todas as opções, no seu Passo a passo do projeto.

[engaging, energetic, conversational voice] No Estúdio, a lista de imagens também mostra um desenho pequeno de cada uma, com o mesmo nome. E o que você escolher fica no seu jogo.

[engaging, energetic, conversational voice] Eu vou mostrar com o pirata. Você troca o que quiser, e o que você gostou pode ficar como está.

[engaging, energetic, conversational voice] Vamos começar pelo personagem. Ele fica na área Ao iniciar. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Lá dentro, deixe à vista o bloco Criar sprite personagem. No fim dele, depois de com imagem, fica o nome da imagem, como aventureiro.

[confident, clear, unhurried voice] Clique no nome da imagem para abrir a lista. Se não achar o que quer, role a lista. Eu escolho o pirata.

[interested, animated voice] Olha só: ele aparece no mesmo lugar e do mesmo tamanho, porque todos os personagens deste jogo foram desenhados assim.

[confident, clear, unhurried voice] Repare: o nome do sprite continua personagem, porque os outros blocos usam esse nome. Por isso, troque só a imagem e deixe os números do bloco como estão.

[engaging, energetic, conversational voice] O barco funciona do mesmo jeito. Ainda em Ao iniciar, no bloco Criar sprite barco, clique no nome da imagem, como veleiro. Eu escolho barco pirata.

[engaging, energetic, conversational voice] O barco novo ainda não aparece, porque o barco só chega quando o farol acende. Você vai ver no teste.

[engaging, energetic, conversational voice] Agora a chave. No bloco Criar sprite chave, clique no nome da imagem, como chave dourada. Eu escolho chave de estrela. [interested, animated voice] Olha só: a chave nova já aparece no jogo.

[engaging, energetic, conversational voice] O farol tem duas imagens: o farol apagado, do começo, e o farol aceso, da resposta do sim. As duas precisam ser do mesmo modelo, para o farol continuar o mesmo quando acende. Por isso, se você trocar o farol, troque as duas.

[confident, clear, unhurried voice] Primeiro, o apagado. Ainda em Ao iniciar, no bloco Criar sprite farol, clique no nome da imagem, como farol listrado apagado. Eu escolho farol de pedra apagado.

[engaging, energetic, conversational voice] Agora, o aceso. Ele fica no encontro com o farol, na área Quando acontecer. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] No encontro do personagem com o farol, dentro do então, deixe à vista o bloco Trocar imagem do sprite farol para.

[confident, clear, unhurried voice] Clique no nome da imagem, como farol listrado aceso, e escolha o mesmo modelo, agora aceso. Eu escolho farol de pedra aceso.

[confident, clear, unhurried voice] Repare: de pedra nos dois lugares, apagado no começo e aceso na resposta do sim.

[engaging, energetic, conversational voice] Agora falta o lugar onde a história acontece: o cenário. Ele fica na área Enquanto estiver rodando. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[confident, clear, unhurried voice] Dentro de A cada quadro do jogo, no bloco Desenhar o cenário, clique no nome do cenário, como praia tropical. Eu escolho noite na ilha.

[interested, animated voice] Olha só: a ponte e o mar continuam no mesmo lugar, e o caminho até o farol não muda.

[upbeat, encouraging voice] Agora teste a sua combinação! Clique em Atualizar e vá até a porta do farol sem a chave. Ele continua apagado.

[engaging, energetic, conversational voice] Depois busque a chave e volte até a porta, na mesma partida. [interested, animated voice] Olha só: o farol de pedra acende, e o barco pirata vem chegando!

[engaging, energetic, conversational voice] Agora o jogo tem a sua cara, e é com essa cara que ele vai para o Mural.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: cada imagem está no bloco do mesmo tipo, e o farol tem o mesmo modelo nos dois blocos, apagado em Ao iniciar e aceso dentro do então. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.
```

**Recado na página (não gravar):** A surpresa chegou! Que combinação você vai criar? Troque o que quiser: personagem, barco, chave, farol ou cenário. Se trocar o farol, use o mesmo modelo apagado e aceso. Teste a combinação e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.

## Parte 5. Escreva seus avisos

**Clipe:** `video-d3-farol-mensagens`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. Exemplos curtos: início `Ache a chave da ilha!`; chave pega `Chave na mão! Siga até o farol.`; sem chave `Opa! Busque a chave primeiro.`; vitória `Luz acesa! Lá vem o barco!`. Não editar temChave nem ganhou. No "O primeiro aviso fica na área Ao iniciar", arrastar até a área aparecer [arrastar até "Ao iniciar"]. No "Olha aqui: no bloco Criar variável aviso", apontar o texto **Encontre a chave e vá ao farol**. No "Clique nesse texto, apague e escreva", trocar o texto [trocar "Encontre a chave e vá ao farol" por "Ache a chave da ilha!"]. No "Os outros três avisos ficam na área Quando acontecer", arrastar até a área aparecer [arrastar até "Quando acontecer"]. No "No encontro com a chave está o aviso de quando a chave é pega", clicar no texto desse aviso, apagar e escrever o exemplo (à mão: os exemplos destes três avisos têm pontuação no meio, e o palco cortaria a frase do Na tela). No "No encontro com o farol, dentro do senão", escrever o exemplo no texto do aviso do **senão**. No "E dentro do então está a comemoração", escrever o exemplo no texto do aviso do **então**. No "Agora teste! Clique em Atualizar", clicar em **Atualizar** [clicar "Atualizar o preview"]; no "Olha só", manter à vista o aviso novo do começo. No "Vá até a porta do farol sem a chave", segurar a seta da tela até a porta, sem a chave. No "Depois busque a chave", segurar a seta da tela até a chave e depois até a porta do farol, mostrando cada aviso. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora escreva os avisos do seu jeito! O seu jogo tem quatro avisos: o do começo, o de quando a chave é pega, o de quando falta a chave e o de quando o farol acende.

[engaging, energetic, conversational voice] Em cada um, você muda só o texto, do jeito que quiser. E tudo o que você escrever fica no seu jogo.

[confident, clear, unhurried voice] O primeiro aviso fica na área Ao iniciar. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[interested, animated voice] Olha aqui: no bloco Criar variável aviso está o texto Encontre a chave e vá ao farol. É o aviso que aparece quando a partida começa.

[confident, clear, unhurried voice] Clique nesse texto, apague e escreva uma frase curta que diga o que fazer. Eu escrevo: Ache a chave da ilha!

[confident, clear, unhurried voice] Os outros três avisos ficam na área Quando acontecer. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[engaging, energetic, conversational voice] No encontro com a chave está o aviso de quando a chave é pega. Clique no texto dele e escreva o seu. Eu escrevo: Chave na mão! Siga até o farol.

[engaging, energetic, conversational voice] No encontro com o farol, dentro do senão, está o aviso de quando falta a chave. Eu escrevo: Opa! Busque a chave primeiro.

[engaging, energetic, conversational voice] E dentro do então está a comemoração, de quando o farol acende. Eu escrevo: Luz acesa! Lá vem o barco!

[confident, clear, unhurried voice] Mude só os textos. Os nomes aviso, temChave e ganhou ficam como estão, porque os outros blocos usam esses nomes.

[upbeat, encouraging voice] Agora teste! Clique em Atualizar. [interested, animated voice] Olha só: o aviso do começo já é o seu.

[engaging, energetic, conversational voice] Vá até a porta do farol sem a chave e leia o aviso de quando falta a chave.

[engaging, energetic, conversational voice] Depois busque a chave e leia o aviso de quando a chave é pega. Por fim, volte até a porta do farol para ver a comemoração.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte ao bloco daquele aviso: se a frase passou da tela, deixe mais curta; se o aviso não mudou, confira se você escreveu no texto daquele bloco. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[engaging, energetic, conversational voice] Quando terminar, clique em Próxima parte.
```

**Recado na página (não gravar):** Agora escreva os avisos do seu jeito! Mude o texto dos quatro avisos, teste o jogo e clique em Próxima parte.

## Parte 6. Como escolher um lugar para a chave

**Clipe:** `video-d3-posicao`

**Na tela:** A experiência aparece no tamanho da aula. Apresentar somente aqui as coordenadas x/y. Do "É como explicar o caminho até um tesouro" até o "para cima ou para baixo", a tela fica parada, e a edição troca esse trecho por um mapa do tesouro com setas para os lados e para cima e para baixo, na mesma arte do jogo [na edição: mapa do tesouro com setas]. No "No jogo, o lugar da chave", a tela volta para a experiência. No "Agora você vai investigar", ampliar a experiência [ampliar experiência] e deixar a cena parada, sem apontar controles. No "Quando terminar, clique em Próxima parte", voltar ao tamanho da aula [voltar à aula] e clicar em **Próxima parte** [próxima parte]. Não mover a chave: para que lado cada número leva a chave é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não prescrever números, ordem de eixos nem uma sequência obrigatória. O alvo é opcional e fica na experiência. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No seu jogo, a chave começa sempre no mesmo lugar. Daqui a pouco, você vai escolher outro lugar para ela. Para isso, a gente precisa entender como o jogo sabe onde fica cada coisa na tela.

[engaging, energetic, conversational voice] É como explicar o caminho até um tesouro num mapa: quantos passos andar para os lados e quantos passos andar para cima ou para baixo.

[engaging, energetic, conversational voice] No jogo, o lugar da chave também é dito com dois números: o x e o y. O x cuida dos lados, a direção que também se chama horizontal. O y cuida de cima e de baixo, a direção vertical.

[curious] Mas, quando o y aumenta, a chave sobe ou desce?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar para onde a chave vai quando o x e o y aumentam e quando diminuem. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-posicao-K1 | Debinha | 1 | e o y. O x cuida dos lados, a direção que também se chama horizontal. O y cuida de cima e de baixo, a direção vertical. | Mas, quando o y aumenta, a chave sobe ou desce? | O que você acha? Isso você vai testar na experiência. Agora você vai investigar para onde a chave vai quando o x e o y | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Falas dentro da experiência:** `packages/core/src/learning/scene/discovery-guidance.ts`, exportadas em `zappy-etapas.json`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.

**Recado na página (não gravar):** Sua vez! Investigue para onde a chave vai quando o x e o y aumentam e diminuem. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Parte 7. Escolha onde fica a chave

**Clipe:** `video-d3-posicionar-chave`

**Na tela:** A parte começa com o Estúdio expandido e o projeto da parte anterior, com as escolhas anteriores [expandir estúdio]. No "Aqui no seu jogo, olhe a chave", apontar a chave no jogo [apontar prévia 227 69]. No "Encontre a área Ao iniciar", arrastar até a área aparecer [arrastar até "Ao iniciar"]. No "Lá dentro, deixe à vista o bloco Criar sprite chave", apontar só os campos x e y do bloco da chave. Do "No seu Passo a passo do projeto tem três lugares" até o "com x 280 e y 160", a edição mostra a página **Escolha onde fica a chave** do Passo a passo do projeto, quadro **Três lugares para experimentar** [na edição: os três lugares do Passo a passo do projeto]. No "Você pode escolher um deles", a tela volta para o Estúdio, sem alterações durante a pergunta da Debinha. No "No campo x do bloco, troque o número", trocar o x [trocar "211" por "160"]. No "Depois, no campo y", trocar o y [trocar "53" por "250"]. No "Clique fora do campo e espere o jogo atualizar", clicar fora do campo e esperar a pré-visualização. No "Olha só: agora quem joga precisa buscar a chave", apontar a chave no lugar novo [apontar prévia 176 266]. No "Agora teste o novo caminho", clicar em **Atualizar** [clicar "Atualizar o preview"] e segurar a seta da tela até a chave e depois até a porta do farol. No "Clique em Atualizar mais uma vez", clicar em **Atualizar** [clicar "Atualizar o preview"] e manter à vista a chave de volta no lugar escolhido. No "Clique em Enviar meu projeto e confirme em Enviar", enviar e confirmar [enviar projeto]. No "Quando aparecer Projeto enviado!, clique em Próxima parte", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Próxima parte** [próxima parte].

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, olhe a chave. Tá vendo? Toda partida começa com ela neste mesmo lugar, porque o jogo usa sempre o mesmo x e o mesmo y para ela.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Um x maior levava a chave para a direita. E um y maior levava a chave para baixo, porque na tela do jogo o y começa em zero lá no alto e vai crescendo para baixo.

[engaging, energetic, conversational voice] Agora você vai escolher onde fica a chave do seu jogo!

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.

[interested, animated voice] Lá dentro, deixe à vista o bloco Criar sprite chave. Olha aqui: esse bloco tem os campos x e y. São eles que escolhem onde a chave aparece quando a partida começa.

[engaging, energetic, conversational voice] No seu Passo a passo do projeto tem três lugares para experimentar: perto da trilha, com x 211 e y 53; na parte de baixo, com x 160 e y 250; ou perto da ponte, com x 280 e y 160.

[curious] Preciso escolher um desses três lugares?

[engaging, energetic, conversational voice] Você pode escolher um deles ou experimentar outro lugar. Eu vou colocar na parte de baixo.

[confident, clear, unhurried voice] No campo x do bloco, troque o número pelo x do lugar que você escolheu, como 160.

[confident, clear, unhurried voice] Depois, no campo y, coloque o y do lugar, como 250.

[confident, clear, unhurried voice] Clique fora do campo e espere o jogo atualizar. O nome chave, a largura, a altura e a imagem ficam como estão.

[interested, animated voice] Olha só: agora quem joga precisa buscar a chave em outro lugar!

[confident, clear, unhurried voice] Repare se a chave aparece inteira. Se ela ficar atrás do farol ou da faixa do aviso, quem joga não vai achar. Se ficar em cima do personagem, ele já começa com a chave. Nesses casos, escolha um dos três lugares do Passo a passo do projeto.

[upbeat, encouraging voice] Agora teste o novo caminho. Clique em Atualizar, busque a chave no lugar escolhido e leve até a porta do farol. A luz deve acender, e o barco deve chegar.

[confident, clear, unhurried voice] Clique em Atualizar mais uma vez: a chave deve voltar ao lugar que você escolheu.

[pleased, lively voice] Agora o jogo está do seu jeito! Clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-d3-posicionar-chave-K1 | Debinha | 1 | perto da trilha, com x 211 e y 53; na parte de baixo, com x 160 e y 250; ou perto da ponte, com x 280 e y 160. | Preciso escolher um desses três lugares? | Você pode escolher um deles ou experimentar outro lugar. Eu vou colocar na parte de baixo. No campo x do bloco, troque | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora escolha onde fica a chave! Mude o x e o y no bloco Criar sprite chave, como x 160 e y 250 para a parte de baixo. Teste: busque a chave no lugar novo e leve até a porta do farol. Depois clique em Enviar meu projeto e confirme em Enviar. Se mudar alguma coisa depois de enviar, clique em Enviar de novo e confirme em Reenviar. Quando aparecer Projeto enviado!, clique em Próxima parte.

## Parte 8. Seu jogo está pronto

**Clipe:** `video-d3-fecho`

**Na tela:** A parte começa com o projeto já enviado na Parte 7, no mesmo Estúdio, expandido [expandir estúdio]. No "Para publicar, clique em Compartilhar", abrir o Compartilhar, no alto do Estúdio [compartilhar]; na aula, o botão costuma aparecer só como ícone (uma setinha para cima saindo de uma bandeja), e a janela se chama **Compartilhar no Mural dos Criadores**. No "o resumo do projeto já vem preenchido", mostrar o resumo, sem editar [apontar "Resumo do projeto"]; na aula, o título vem do curso e não aparece na janela. No "Clique em Gerar capa", gerar a capa [clicar "Gerar capa"]; no "Olha só: essa é a capa", manter à vista a imagem. Não demonstrar upload nem outra capa. No "clique em Publicar", publicar [clicar "Publicar"] e esperar **Seu jogo está no Mural!**. No "clique em Copiar link de jogar", copiar o link [clicar "Copiar link de jogar"]. No "Depois de copiar o link, clique em Fechar", fechar a janela [clicar "Fechar"], voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula].

**Fala para ElevenLabs:**

```text
[pleased, lively voice] Seu jogo está pronto! Agora, se quiser, você pode publicar o seu jogo no Mural.

[engaging, energetic, conversational voice] O Mural é o lugar da plataforma onde ficam os jogos publicados. Lá, a sua família e os seus amigos podem jogar o seu jogo.

[engaging, energetic, conversational voice] Você também pode clicar em Concluir aula e continuar a jornada sem publicar.

[engaging, energetic, conversational voice] Para publicar, clique em Compartilhar, no alto do Estúdio. Ele pode aparecer só como uma setinha para cima.

[confident, clear, unhurried voice] Abre uma janela. Repare: o resumo do projeto já vem preenchido, por isso pode deixar como está.

[engaging, energetic, conversational voice] Agora o seu jogo precisa de uma capa, a imagem que apresenta o jogo no Mural. Clique em Gerar capa e espere a imagem aparecer.

[interested, animated voice] Olha só: essa é a capa do seu jogo!

[confident, clear, unhurried voice] Confira se a capa ficou boa e clique em Publicar. Depois espere a publicação terminar.

[pleased, lively voice] Seu jogo está no Mural! Agora você, a sua família e os seus amigos podem jogar o jogo que você criou.

[engaging, energetic, conversational voice] Para mandar o jogo para eles, clique em Copiar link de jogar. Depois mande esse link para a sua família e os seus amigos, com a ajuda de um adulto se precisar.

[engaging, energetic, conversational voice] Quem receber o link pode jogar direto, até no celular.

[engaging, energetic, conversational voice] Depois de copiar o link, clique em Fechar e, por fim, em Concluir aula.
```

**Recado na página (não gravar):** Seu jogo está pronto! Se quiser, publique no Mural, copie o link de jogar e mande para a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Você também pode clicar em Concluir aula e continuar a jornada sem publicar.
