# Roteiro de produção · A luz volta ao farol

Master integral da professora. Sem intervenções de personagens nesta versão. Gerar áudio, escutar, gravar e publicar são etapas pendentes. Teclado necessário no jogo.

**Antes de gravar:** abra a aula numa aba nova após o deploy. Use uma sessão sem progresso na experiência e sem envio anterior nesta aula. Não preencha Recado (opcional) na tomada do envio. Mostre Salvo somente quando o estado aparecer de verdade. Para repetir um primeiro envio, use outro perfil de ensaio. Nas partes sem Estúdio, use a cena da própria parte; não simule botões ou estados na edição.

## Parte 1. O farol precisa conferir a chave

**Clipe:** `video-sem-chave`

**Na tela:** Partida sem chave primeiro. Encontro com farol como irmão da coleta. Se temChave com então vazio, senão aviso. Retomada breve sem experiência nova de memória/condição.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No jogo 2D, o farol perguntava se você tinha a chave. Vamos montar essa mesma decisão na ilha 3D. Primeiro execute o jogo e vá ao farol sem recolher a chave. Ainda falta a resposta dele.

[confident, clear, unhurried voice] Volte aos blocos. Em Quando acontecer, deixe à vista um espaço depois do encontro com chave, fora do fazer dele. Abra Jogo 3D, Encostar, Encostar. Pegue Quando personagem encostar em chave e encaixe nesse espaço. Escolha personagem no primeiro nome e farol no segundo.

[confident, clear, unhurried voice] Deixe à vista o fazer desse novo encontro. Abra Programação, Lógica e Se e pegue Se. Encaixe dentro do fazer. O Se chega com a pergunta x maior que zero. Arraste essa comparação pelo sinal de maior até a lixeira para deixar o lugar da pergunta vazio. Em Programação, Valores, pegue valor da variável e encaixe nesse lugar. Troque x por temChave. Depois clique em mais senão, no próprio bloco Se, para abrir o segundo caminho.

[engaging, energetic, conversational voice] Verdadeiro escolhe o então; falso escolhe o senão. Agora vamos construir a resposta para quem está sem chave.

[confident, clear, unhurried voice] Deixe à vista o senão. Em Programação, Variáveis, pegue Alterar variável variável para e encaixe dentro dele. Escolha aviso. Em Programação, Valores, pegue Texto e encaixe no valor. Escreva: Falta a chave. Procure na ilha antes de voltar. Deixe o então vazio nesta parte.

[upbeat, encouraging voice] Execute uma partida nova e vá direto ao farol, sem passar pela chave. O farol deve continuar apagado e o aviso deve pedir a chave.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos, confira os nomes e os encaixes que acabamos de montar e teste de novo.

[confident, clear, unhurried voice] Depois clique em Verificar projeto. Se algum objetivo faltar, leia a indicação, ajuste e verifique novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Monte a regra, teste no seu jogo e clique em Verificar projeto. Depois de conferir os objetivos e aparecer Salvo, clique em Próxima parte.

## Parte 2. Acenda o farol com a chave

**Clipe:** `video-decisao`

**Na tela:** Projeto sem-chave. Montar três ações no então: Tocar a animação acender em farol uma vez, ganhou verdadeiro e aviso. Mostrar a regra pronta em Enquanto estiver rodando que troca para aceso repetindo e aproxima o barco. Testar sem chave e com chave; o feixe gira depois de acender.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O farol já responde quando falta a chave. Agora vamos ensinar a resposta para quem trouxe a chave.

[interested, animated voice] No jogo 2D, a gente trocava a imagem do farol apagado pela do farol aceso. Aqui o farol é um modelo só, e ele sabe acender: o modelo tem animações, como o personagem, que já anda e respira sozinho.

[confident, clear, unhurried voice] Nos blocos, encontre o encontro com farol e deixe à vista o então do Se temChave. Abra Jogo 3D, Objetos, Animação do modelo. Pegue Tocar a animação e encaixe dentro do então. No primeiro espaço, escolha acender. No objeto, escolha farol. No último espaço, escolha uma vez.

[engaging, energetic, conversational voice] Uma vez quer dizer que a luz acende e para no fim, acesa. Repetindo faria a animação recomeçar sem parar.

[confident, clear, unhurried voice] Ainda dentro do então, deixe à vista o lugar depois de Tocar a animação. Em Programação, Variáveis, pegue Alterar variável variável para. Encaixe ali e escolha ganhou. Em Programação, Lógica e Se, pegue verdadeiro ou falso, coloque no valor e escolha verdadeiro.

[interested, animated voice] Agora olhe em Enquanto estiver rodando: já existe uma regra pronta que usa ganhou. Quando a animação acender termina, ela deixa o farol aceso, com o feixe girando, e aproxima o barco.

[confident, clear, unhurried voice] Volte ao então e, depois de ganhou, encaixe mais um Alterar variável variável para. Escolha aviso e encaixe um Texto de Programação, Valores. Escreva: Você acendeu o farol! O barco pode chegar.

[upbeat, encouraging voice] Execute uma partida nova. Primeiro visite o farol sem chave: ele continua apagado. Depois pegue a chave e volte ao farol. Olha só: a luz acende, o feixe começa a girar, o aviso muda e o barco se aproxima. Pressione R para conferir o começo de outra partida.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos, confira os nomes e os encaixes que acabamos de montar e teste de novo.

[confident, clear, unhurried voice] Depois clique em Verificar projeto. Se algum objetivo faltar, leia a indicação, ajuste e verifique novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Monte a regra, teste no seu jogo e clique em Verificar projeto. Depois de conferir os objetivos e aparecer Salvo, clique em Próxima parte.

## Revisão. O que você descobriu no 3D

Quiz sem vídeo: escolha, demonstração, explicação e nova tentativa.

**Recado na página (não gravar):** Escolha uma resposta e clique em Ver o que acontece. Observe a cena e a explicação. Você pode tentar de novo.

## Parte 3. Deixe o jogo com a sua cara

**Clipe:** `video-aparencia`

**Na tela:** Projeto decisao. Antes de gravar, preparar duas combinações em perfis de teste (robo, lancha, chave-prateada, farol-colorido, ilha-nevada; mergulhador, veleiro, chave-dourada, farol-de-madeira, costa-rochosa) e gravar 3 a 4 segundos de cada com o farol acendendo e o barco chegando. Depois, ao vivo: em Ao iniciar, abrir a lista do modelo de cada Criar o objeto e escolher pirata, barco-pirata, chave-de-estrela, farol-de-pedra e noite-na-ilha. Não mudar nome do objeto nem tamanho.

**Fala para ElevenLabs:**

```text
[curious] O seu farol já acende! E agora chegou uma surpresa: olha quantas versões o seu jogo pode ter. Outro personagem, outro barco, outra chave, outro farol e até outro cenário.

[interested, animated voice] São as mesmas opções da Chave do Farol, com os mesmos nomes, agora em 3D.

[engaging, energetic, conversational voice] Eu vou mostrar com o pirata. Você escolhe o que quiser, e o que você gostou pode ficar como está.

[confident, clear, unhurried voice] Nos blocos, abra Ao iniciar e deixe à vista Criar o objeto personagem com o modelo aventureiro. Clique no nome aventureiro para abrir a lista e escolha outro. Eu escolho o pirata.

[interested, animated voice] Olha só: ele aparece no mesmo lugar e do mesmo tamanho, porque todos os personagens deste jogo foram feitos com a mesma medida. E ele também anda e respira, como o aventureiro.

[confident, clear, unhurried voice] Repare que o nome do objeto continua personagem, porque os outros blocos usam esse nome. Troque só o modelo e deixe o nome e o tamanho como estão.

[engaging, energetic, conversational voice] Os blocos Criar o objeto barco, chave e farol funcionam do mesmo jeito: clique no nome do modelo e escolha outro. Eu vou escolher barco pirata, chave de estrela e farol de pedra.

[interested, animated voice] No 2D, o farol tinha duas imagens, apagada e acesa. Aqui cada farol é um modelo só, e todos sabem acender. Por isso basta trocar num lugar.

[engaging, energetic, conversational voice] Agora falta o lugar onde a história acontece. O primeiro Criar o objeto, o cenario, é a ilha inteira: o mar, o chão, a ponte, as árvores e o céu. Clique em praia tropical e escolha outro. Eu vou usar noite na ilha.

[interested, animated voice] Olha só: o caminho, a ponte e o lugar do farol continuam os mesmos.

[upbeat, encouraging voice] Agora teste a sua combinação! Vá até o farol sem a chave: ele continua apagado. Depois busque a chave e volte. Olha só: o farol de pedra acende, e o barco pirata vem chegando!

[reassuring, encouraging voice] Se algo não funcionou, volte aos blocos e confira se você trocou só o modelo, e se cada modelo está no bloco do mesmo tipo: personagem no personagem, barco no barco.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos, confira os nomes e os encaixes que acabamos de montar e teste de novo.

[confident, clear, unhurried voice] Depois clique em Verificar projeto. Se algum objetivo faltar, leia a indicação, ajuste e verifique novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Monte a regra, teste no seu jogo e clique em Verificar projeto. Depois de conferir os objetivos e aparecer Salvo, clique em Próxima parte.

## Parte 4. Escolha seu esconderijo e teste de verdade

**Clipe:** `video-personalizar`

**Na tela:** Projeto aparencia, com a combinação escolhida na parte anterior. Personalizar posição da chave e mensagens. Valor inicial exemplo −3,1,−2. Testar acesso pelo chão e ambos os ramos; envio atualizado.

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Agora escolha outro lugar para a chave. Nos blocos, abra Ao iniciar e encontre Colocar o objeto chave. Mude x e z para escolher o lugar no chão. Você também pode ajustar y, mas o personagem precisa conseguir encostar na chave.

[thoughtful] Ver a chave não basta. Ela pode estar alta demais ou do outro lado da água.

[engaging, energetic, conversational voice] Por isso, execute o jogo e vá até o lugar que escolheu. Confira se a coleta acontece e se dá para voltar ao farol. Se não conseguir, volte à posição da chave, ajuste um valor por vez e teste novamente. Se quiser, escreva seus próprios avisos nas linhas que mudam aviso, conservando a mensagem de começo, coleta, falta da chave e vitória.

[upbeat, encouraging voice] Faça também uma partida sem pegar a chave: o farol deve ficar apagado e pedir que você procure. Depois recolha a chave e acenda o farol. Pressione R e confira se tudo volta ao começo.

[confident, clear, unhurried voice] Clique em Verificar projeto. Se algum objetivo faltar, leia a indicação, ajuste e teste novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Recado na página (não gravar):** Confira o jogo e os objetivos. Aguarde Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.

## Parte 5. Sua ilha está pronta

**Clipe:** `video-fecho`

**Na tela:** Depois do envio final, mostrar o Estúdio e a publicação opcional: Compartilhar, resumo, Gerar capa, Publicar, confirmação e Fechar. Sem certificado, venda ou autoria das artes. Concluir aula.

**Fala para ElevenLabs:**

```text
[pleased, lively voice] Você transformou a ideia da Chave do Farol em um jogo 3D! Programou o movimento, escolheu um lugar alcançável para a chave, fez o farol acender com a coleta e deixou o jogo com a sua cara. Também aprendeu a mudar o ponto de vista para investigar o que a imagem não mostra de primeira.

[upbeat, encouraging voice] Seu jogo está pronto! Se quiser publicar no Mural, clique em Compartilhar no Estúdio. O título já vem preenchido. Escreva um resumo, clique em Gerar capa e confira a imagem. Depois clique em Publicar e espere aparecer Seu jogo está no Mural!

[pleased, lively voice] Olha só: seu jogo ganhou um lugar para outras pessoas jogarem! Clique em Copiar link de jogar para mostrar à família e aos amigos. Se precisar, peça ajuda a um adulto.

[confident, clear, unhurried voice] Clique em Fechar para voltar. Você também pode continuar sem publicar. Para terminar, clique em Concluir aula.
```

**Recado na página (não gravar):** Você concluiu os testes desta aula. Clique em Concluir aula.
