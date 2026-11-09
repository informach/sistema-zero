# Roteiro de produção · Cada moeda conta

Master integral da professora. Montagem guiada completa no vídeo, um gesto por vez, com o destino à vista antes da peça. Sem intervenções de personagens. Voz, escuta, gravação e publicação pendentes.

**Antes de gravar:** use um perfil de ensaio sem envio nesta aula. Mostre o projeto da dimensão correta. Não preencha Recado no envio. Mostre Objetivo cumprido! e Projeto enviado! só quando esses estados aparecerem de verdade.

## Parte 1. Moedas no caminho do Farol

**Clipe:** `video-abertura`

**Na tela:** Jogo pronto 2D. Mostrar as seis moedas, o baú no gramado de baixo e o placar ao lado do ícone. Pegar uma moeda e mostrar o número subir para 1; não abrir o baú nem mostrar os blocos.

**Fala para ElevenLabs:**

```text
[upbeat, welcoming voice] O caminho do Farol ganhou moedas! O personagem continua indo atrás da chave para acender o farol, mas agora tem seis moedas pelo caminho e um baú escondido no gramado.

[interested, animated voice] Olha aqui: quando o personagem encosta numa moeda, ela some e o número ao lado do ícone sobe para 1. E o baú? Ele só abre com moedas suficientes.

[upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo aqui na página e use as setas do teclado. Tente o baú com poucas moedas e depois com cinco ou mais. A tecla R começa uma nova partida. Você pode seguir mesmo sem terminar a partida: é só clicar em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Clique no jogo e use as setas do teclado. Pegue moedas e tente o baú com poucas e com cinco ou mais. A tecla R começa outra partida. Depois clique em Próxima parte.

## Parte 2. O seu Passo a passo do projeto

**Clipe:** `video-material`

**Na tela:** Abrir o Passo a passo do projeto no bloco Consulte. Mostrar a parte da experiência, a parte 2D e a parte 3D, os títulos das montagens e o botão Baixar. Não inventar anexo antes do PDF produzido.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olha aqui: este é o seu Passo a passo do projeto! Ele tem o que investigar na experiência e cada montagem das duas aulas, com o caminho na paleta, o nome do bloco, onde encaixar e como testar.

[engaging, energetic, conversational voice] Tem uma parte para o jogo 2D e outra para a ilha em 3D, que você vai fazer na próxima aula.

[reassuring, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. Depois clique em Próxima parte.
```

**Recado na página (não gravar):** Este é o seu Passo a passo do projeto. Se quiser, leia aqui mesmo ou clique em Baixar para guardar. Depois clique em Próxima parte.

## Parte 3. O contador de moedas

**Clipe:** `video-experiencia`

**Na tela:** Vídeo conceitual. Meme ilustrado por 2 a 3 segundos: o Zappy deixando uma moeda cair num cofrinho, com o número do cofrinho passando de 3 para 4. Na frase das duas perguntas, mostrar uma plaquinha com pelo menos 5 e outra com exatamente 5. No convite, ampliar a experiência e mostrar a cena parada, com as moedas no caminho, o baú e o número moedas em zero, sem apontar controles nem testar: quando o número muda e o que o baú responde é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos, regra, grupo, Se, então nem senão (decisões de 01/11 e 02/11/2026). O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Para saber quantas moedas o personagem já pegou, o jogo precisa contar. Ele guarda essa conta numa variável: um número que o jogo guarda e que pode mudar durante a partida.

[curious] Sabe quando você guarda moedas num cofrinho? Cada moeda que cai lá dentro faz o total crescer um pouco.

[engaging, energetic, conversational voice] No seu jogo, o cofrinho é uma variável chamada moedas. Quando a partida começa, ela está em zero.

[engaging, energetic, conversational voice] E o baú faz uma pergunta sobre esse número, como quando você confere se tem moedas suficientes para comprar alguma coisa. Só que dá para perguntar de dois jeitos: moedas é pelo menos cinco? Ou moedas é exatamente cinco?

[curious] E se o personagem voltar ao lugar de uma moeda que ele já pegou, ela conta de novo?

[engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência.

[upbeat, encouraging voice] Agora você vai investigar quando o número moedas muda e quando continua igual, e o que o baú responde com cada pergunta. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.
```

**Falas dentro da experiência:** `packages/core/src/learning/scene/guidance-moedas.ts`, exportadas em `zappy-etapas.json`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.

**Recado na página (não gravar):** Sua vez! Investigue quando o número moedas muda e quando continua igual, e o que o baú responde com cada pergunta. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

## Parte 4. Crie o contador

**Clipe:** `video-contador`

**Na tela:** Projeto inicial. Mostrar o fim de Ao iniciar, abrir Programação → Variáveis, encaixar Criar variável, trocar contador por moedas e manter o 0. Mostrar Verificar projeto e Objetivo cumprido!.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora crie o cofrinho do seu jogo. Lembra da experiência da parte anterior? O número moedas começava em zero e mudava durante a partida. Esse número ainda não existe no seu jogo, por isso a gente vai criar ele agora!

[engaging, energetic, conversational voice] O cofrinho tem que existir desde o começo da partida. Por isso, ele nasce na área Ao iniciar.

[confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis. Pegue o bloco Criar variável e encaixe no fim de Ao iniciar. É este bloco que cria o cofrinho quando o jogo começa.

[confident, clear, unhurried voice] Repare que o bloco chega com contador. Clique em contador, apague e escreva moedas.

[engaging, energetic, conversational voice] O valor já vem em 0; deixe assim. É com zero moedas que toda partida começa.

[confident, clear, unhurried voice] Esse número ainda não aparece no jogo, por isso confira se ficou assim: o bloco está dentro de Ao iniciar, o nome é moedas e o valor é 0.

[confident, clear, unhurried voice] Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.
```

**Recado na página (não gravar):** Agora crie a variável moedas no fim de Ao iniciar, começando em 0. Clique em Verificar projeto e depois em Próxima parte.

## Parte 5. Cada moeda soma um

**Clipe:** `video-coleta`

**Na tela:** Começar pela retomada: levar o personagem por cima de uma moeda e mostrar que nada acontece. Depois, em Quando acontecer, montar o encontro com o grupo, Tirar o sprite do grupo e Somar em variável, um bloco por vez, sempre com o destino à vista antes de abrir a paleta. Testar pegando moedas e voltando ao lugar de uma delas.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora faça cada moeda contar. Clique no jogo e leve o personagem até uma moeda. Tá vendo? Ele passa por cima e nada acontece, porque o encontro com as moedas ainda não tem nenhuma reação ligada a ele.

[engaging, energetic, conversational voice] Lembra da experiência da terceira parte desta aula? Cada moeda somava um no cofrinho. E a moeda que sumia depois de pega não contava de novo. Agora a gente vai montar isso no seu jogo!

[engaging, energetic, conversational voice] As seis moedas estão num grupo. Um grupo junta vários objetos parecidos, para uma regra valer para todos de uma vez. Por isso, o encontro vai ser com alguma moeda do grupo.

[confident, clear, unhurried voice] Encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar em algum do grupo, chamando de, e encaixe nesse espaço. É este bloco que percebe quando o personagem encosta numa moeda.

[confident, clear, unhurried voice] Repare que o bloco chega com jogador. Clique em jogador e escolha personagem. Depois clique em moedas, o nome do grupo, e escolha moedasDoCaminho. É o grupo onde estão as seis moedas.

[engaging, energetic, conversational voice] O último nome já vem moeda; deixe assim. É por esse nome que os blocos de dentro falam da moeda que o personagem acabou de encostar.

[engaging, energetic, conversational voice] Agora a reação. Primeiro, a moeda some. Deixe à vista o espaço ao lado da palavra fazer, dentro desse encontro.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue o bloco Tirar o sprite do grupo e encaixe dentro do fazer. É este bloco que faz a moeda sumir, e por isso ela não conta de novo.

[confident, clear, unhurried voice] Esse bloco chega com asteroide e asteroides. Clique em asteroide e escolha moeda. Depois clique em asteroides e escolha moedasDoCaminho.

[engaging, energetic, conversational voice] Depois, a moeda soma um no cofrinho. Deixe à vista o espaço embaixo de Tirar o sprite do grupo, ainda dentro do fazer.

[confident, clear, unhurried voice] Abra Programação e depois Variáveis. Pegue o bloco Somar em variável e encaixe ali. É este bloco que soma um em moedas, como na experiência.

[confident, clear, unhurried voice] Repare que ele chega com contador. Clique em contador e escolha moedas. O número já vem em 1; deixe assim.

[engaging, energetic, conversational voice] Agora teste. Clique no jogo e leve o personagem pelas moedas do caminho. Cada uma deve sumir no encontro. O número ainda não aparece na tela: ele vai aparecer na próxima parte.

[engaging, energetic, conversational voice] Depois volte ao lugar de uma moeda que já sumiu. Repare que nada acontece, porque ela já saiu do grupo.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e moedasDoCaminho, Tirar o sprite do grupo usa moeda e moedasDoCaminho, e Somar 1 em variável moedas está dentro do mesmo fazer. Depois de corrigir, teste de novo.

[confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.
```

**Recado na página (não gravar):** Hora de montar a coleta! No encontro com as moedas, a moeda sai do grupo e soma 1 em moedas. Teste, clique em Verificar projeto e depois em Próxima parte.

## Parte 6. Mostre as moedas na tela

**Clipe:** `video-placar`

**Na tela:** Retomada: pegar duas moedas e mostrar que nada diz quantas foram. Em Enquanto estiver rodando, no fim de A cada quadro do jogo, encaixar Mostrar placar, trocar o rótulo, soltar valor da variável sobre o 0 e ajustar x, y e tamanho. Testar o placar subindo, a volta ao lugar de uma moeda e a tecla R.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora mostre o número das moedas na tela. Clique no jogo e pegue duas moedas. Tá vendo? Elas somem, mas não dá para saber quantas você já pegou, porque o número está guardado em moedas e nada mostra esse valor na tela.

[engaging, energetic, conversational voice] Lembra da experiência da terceira parte desta aula? Lá, você via o número moedas mudar durante a partida. Agora a gente vai colocar esse número na tela do seu jogo!

[engaging, energetic, conversational voice] O placar precisa mostrar o número de agora o tempo todo. Por isso, ele vai num lugar que roda a cada quadro do jogo.

[confident, clear, unhurried voice] Encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Dentro de A cada quadro do jogo, deixe à vista o fim dele, depois do último bloco, Escrever.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela. Pegue o bloco Mostrar placar e encaixe no fim de A cada quadro do jogo. É este bloco que mostra o número na tela.

[confident, clear, unhurried voice] Repare que o placar chega com o rótulo Pontos, com dois-pontos. Clique em Pontos, apague e escreva Moedas, também com dois-pontos no fim.

[confident, clear, unhurried voice] Agora o valor, que chega com o número 0. Abra Programação e depois Valores. Pegue o bloco valor da variável e solte em cima desse 0. É este bloco que lê o número guardado no cofrinho.

[confident, clear, unhurried voice] Repare que esse bloco chega com a letra x. Clique nessa letra e escolha moedas.

[confident, clear, unhurried voice] Agora o lugar do placar. Clique no número do x do placar, que vem com 12, e coloque 38. Depois clique no número do y, que vem com 30, e coloque 60. Assim o placar fica ao lado do ícone da moeda.

[confident, clear, unhurried voice] A cor já vem branca; deixe assim. Clique no número do tamanho, que vem com 24, e coloque 20.

[engaging, energetic, conversational voice] Agora teste. Clique no jogo. O placar começa em Moedas 0. Pegue as moedas e repare que o número sobe de um em um.

[engaging, energetic, conversational voice] Volte ao lugar de uma moeda que você já pegou: o número continua igual. Depois toque na tecla R. O placar volta para 0, e as moedas voltam para o caminho.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: Mostrar placar está dentro de A cada quadro do jogo, e no valor está valor da variável moedas, e não o número 0. Depois de corrigir, teste de novo.

[confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.
```

**Recado na página (não gravar):** Agora mostre as moedas na tela, com Mostrar placar no fim de A cada quadro do jogo. Teste, clique em Verificar projeto e depois em Próxima parte.

## Parte 7. O baú pede pelo menos 5

**Clipe:** `video-bau`

**Na tela:** Retomada: levar o personagem ao baú e mostrar que nada acontece. Em Quando acontecer, montar o encontro com o baú, o Se, abrir o senão pelo segundo sinal de mais, trocar x, o sinal e o 0 da pergunta, e montar o então e o senão. Na frase do maior ou igual, mostrar por 2 a 3 segundos as plaquinhas pelo menos 5 e exatamente 5 do vídeo conceitual. Testar sem moedas, com cinco e depois da tecla R.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Agora faça o baú decidir pela quantidade. Clique no jogo e leve o personagem até o baú, no gramado de baixo. Tá vendo? Nada acontece, porque o encontro com o baú ainda não faz nenhuma pergunta.

[engaging, energetic, conversational voice] Lembra da experiência da terceira parte desta aula? Com menos de cinco moedas, o baú ficava fechado e avisava o que faltava. E, com mais de cinco moedas, a pergunta pelo menos cinco abria o baú, e a pergunta exatamente cinco não. Agora a gente vai montar essa pergunta no seu jogo!

[confident, clear, unhurried voice] Primeiro, encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista um espaço vazio depois do encontro com as moedas, fora do fazer dele.

[confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. É este bloco que percebe quando o personagem chega ao baú.

[confident, clear, unhurried voice] Esse bloco chega com jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha bau.

[engaging, energetic, conversational voice] Uma pergunta de sim ou não, que ajuda o jogo a decidir, se chama condição. Quem faz uma condição no jogo é o bloco Se. Deixe à vista o espaço ao lado da palavra fazer, dentro do encontro com o baú.

[confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. É este bloco que faz a pergunta do baú, como na experiência.

[engaging, energetic, conversational voice] O baú tem duas respostas, por isso o Se precisa de mais um espaço. O então guarda a resposta do sim, e o senão guarda a resposta do não.

[engaging, energetic, conversational voice] Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. O primeiro fica antes de senão se, e o segundo fica antes da palavra senão, no fim da linha. Clique no segundo. Não clique no primeiro.

[confident, clear, unhurried voice] Repare que o Se já vem com uma pergunta: x maior que 0. Desta vez ela serve, só que com outras partes. Clique no x e escolha moedas.

[engaging, energetic, conversational voice] Agora o sinal. Lembra das duas perguntas do baú? Pelo menos cinco quer dizer cinco ou mais. O sinal que pergunta isso é o maior ou igual, que tem um tracinho embaixo. Se fosse o sinal de igual, o baú só abriria com exatamente cinco, e com seis ele ficaria fechado, como você viu na experiência.

[confident, clear, unhurried voice] Clique no sinal de maior e escolha o sinal de maior ou igual. Por último, clique no 0 e coloque 5.

[engaging, energetic, conversational voice] Pronto: agora a pergunta é se moedas é maior ou igual a cinco, ou seja, se o personagem tem pelo menos cinco moedas.

[confident, clear, unhurried voice] Agora o então, que roda quando a resposta é sim. Deixe à vista o espaço dentro do então. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Trocar imagem do sprite e encaixe ali.

[confident, clear, unhurried voice] Ele chega com heroi duas vezes. Clique no primeiro heroi e escolha bau. Depois clique no segundo e escolha bau-aberto.

[confident, clear, unhurried voice] Deixe à vista o espaço embaixo dele, ainda dentro do então. Abra Programação e depois Variáveis, pegue o bloco Alterar variável e encaixe ali. Clique em contador e escolha aviso.

[confident, clear, unhurried voice] O valor chega com o número 1. Abra Programação e depois Valores, pegue o bloco texto e solte em cima desse 1. Repare que o texto vem com a palavra Olá. Clique em Olá, apague e escreva: O baú abriu! Você juntou moedas suficientes.

[confident, clear, unhurried voice] Agora o senão, que roda quando a resposta é não. Deixe à vista o espaço dentro do senão. Pegue outro Alterar variável, de Programação e Variáveis, e encaixe ali. Clique em contador e escolha aviso. Solte um texto em cima do 1, apague Olá e escreva: O baú pede pelo menos 5 moedas.

[engaging, energetic, conversational voice] Agora teste os dois casos. Clique no jogo, toque na tecla R e vá direto ao baú, sem pegar moedas. O baú continua fechado, e o aviso diz que ele pede pelo menos cinco.

[engaging, energetic, conversational voice] Depois pegue as cinco moedas do caminho e volte ao baú. Olha só: ele abre! Toque na tecla R mais uma vez e confira que o baú volta fechado e o placar volta para 0.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e bau, a pergunta é moedas maior ou igual a 5, a troca de imagem e o aviso de sucesso estão dentro do então, e o aviso que pede moedas está dentro do senão. Depois de corrigir, teste de novo.

[confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.
```

**Recado na página (não gravar):** Hora de ensinar o baú a decidir! Com pelo menos 5 moedas ele abre; com menos, ele avisa. Teste os dois casos, clique em Verificar projeto e depois em Próxima parte.

## Parte 8. Pense nas moedas

Sem vídeo: diálogo do Zappy e quiz. Alternativas equivalentes antes da escolha; resposta corrigida pelo servidor.

**Recado na página (não gravar):** Hora de pensar nas regras das moedas! As perguntas retomam o baú, a comparação, a coleta e os testes. Em cada uma tem uma explicação, e você pode tentar de novo. Nas perguntas com cena, escolha e clique em Ver o que acontece; na outra, clique em Responder.

## Parte 9. Envie o seu jogo com moedas

**Clipe:** `video-entrega`

**Na tela:** Projeto atual, objetivos, Enviar meu projeto, confirmação Enviar e Projeto enviado!. Não preencher Recado nem simular o envio.

**Fala para ElevenLabs:**

```text
[pleased, lively voice] Olha só o que você programou: cada moeda soma um e conta uma vez só, o número aparece na tela e o baú decide pela quantidade! Na próxima aula, você leva essa ideia para a ilha, em três dimensões.

[confident, clear, unhurried voice] Antes de enviar, jogue uma partida inteira: pegue as moedas e abra o baú, e acenda o farol com a chave. Depois toque na tecla R e confira que o número volta para 0 e o baú volta fechado.

[confident, clear, unhurried voice] Clique em Verificar projeto e corrija o que faltar. Quando os objetivos estiverem cumpridos, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
```

**Recado na página (não gravar):** Confira os objetivos e clique em Enviar meu projeto. Confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.
