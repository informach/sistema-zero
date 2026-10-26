# Roteiro de produção · A luz volta ao farol

Master integral da professora. Sem intervenções de personagens nesta versão. Gerar áudio, escutar, gravar e publicar são etapas pendentes. Teclado necessário no jogo.

**Antes de gravar:** abra a aula numa aba nova após o deploy. Use uma sessão sem progresso na experiência e sem envio anterior nesta aula. Não preencha Recado (opcional) na tomada do envio. Mostre Salvo somente quando o estado aparecer de verdade. Para repetir um primeiro envio, use outro perfil de ensaio. Nas partes sem Estúdio, use a cena da própria parte; não simule botões ou estados na edição.

## Parte 1. O farol precisa conferir a chave

**Clipe:** `video-sem-chave`

**Na tela:** Partida sem chave primeiro. Encontro com portas como irmão da coleta. Se temChave com então vazio, senão aviso. Retomada breve sem experiência nova de memória/condição.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] No jogo 2D, o farol perguntava se você tinha a chave. Vamos montar essa mesma decisão na ilha 3D. Primeiro execute o jogo e vá ao farol sem recolher a chave. Ainda falta a resposta dele.

[confident, clear, unhurried voice] Volte aos blocos. Em Quando acontecer, deixe à vista um espaço depois do encontro com chaves, fora do fazer dele. Abra Jogo 3D, Encostar, Encostar. Pegue outro encontro com alguém de um grupo e encaixe nesse espaço. Escolha personagem e o grupo portas. Deixe item como está.

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

**Na tela:** Montar quatro ações no então: esconder apagado, mostrar aceso, ganhou verdadeiro, aviso. Barco reage a ganhou no laço já preparado.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] O farol já responde quando falta a chave. Agora vamos ensinar a resposta para quem trouxe a chave.

[confident, clear, unhurried voice] Nos blocos, encontre o encontro com portas e deixe à vista o então do Se temChave. Abra Jogo 3D, Objetos, Aparência. Pegue o bloco de mostrar ou esconder e encaixe dentro do então. Escolha Esconder e o objeto farol. No mesmo caminho da paleta, pegue outro bloco de visibilidade e encaixe depois dele. Neste, escolha Mostrar e o objeto farolAceso.

[interested, animated voice] São as duas versões do farol: a apagada sai, e a acesa aparece no mesmo lugar.

[confident, clear, unhurried voice] Ainda dentro do então, deixe à vista o lugar depois de Mostrar farolAceso. Em Programação, Variáveis, pegue Alterar variável variável para. Encaixe ali e escolha ganhou. Em Programação, Lógica e Se, pegue verdadeiro ou falso, coloque no valor e escolha verdadeiro. A regra do barco usa essa informação para se aproximar.

[confident, clear, unhurried voice] Depois dessa linha, encaixe mais um Alterar variável variável para. Escolha aviso e encaixe um Texto de Programação, Valores. Escreva: Você acendeu o farol! O barco pode chegar.

[upbeat, encouraging voice] Execute uma partida nova. Primeiro visite o farol sem chave: ele continua apagado. Depois pegue a chave e volte ao farol. Olha só: a luz acende, o aviso muda e o barco se aproxima. Pressione R para conferir o começo de outra partida.

[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos, confira os nomes e os encaixes que acabamos de montar e teste de novo.

[confident, clear, unhurried voice] Depois clique em Verificar projeto. Se algum objetivo faltar, leia a indicação, ajuste e verifique novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Próxima parte.
```

**Recado na página (não gravar):** Sua vez! Monte a regra, teste no seu jogo e clique em Verificar projeto. Depois de conferir os objetivos e aparecer Salvo, clique em Próxima parte.

## Revisão. O que você descobriu no 3D

Quiz sem vídeo: escolha, demonstração, explicação e nova tentativa.

**Recado na página (não gravar):** Escolha uma resposta e clique em Ver o que acontece. Observe a cena e a explicação. Você pode tentar de novo.

## Parte 3. Escolha seu esconderijo e teste de verdade

**Clipe:** `video-personalizar`

**Na tela:** Personalizar somente posição da chave e mensagens. Valor inicial exemplo −3,1,−2. Não expor upload de modelos ainda. Testar acesso pelo chão e ambos os ramos; envio atualizado.

**Fala para ElevenLabs:**

```text
[upbeat, encouraging voice] Agora escolha outro lugar para a chave. Nos blocos, abra Ao iniciar e encontre Posição do objeto chave. Mude x e z para escolher o lugar no chão. Você também pode ajustar y, mas o personagem precisa conseguir encostar na chave.

[thoughtful] Ver a chave não basta. Ela pode estar alta demais ou do outro lado da água.

[engaging, energetic, conversational voice] Por isso, execute o jogo e vá até o lugar que escolheu. Confira se a coleta acontece e se dá para voltar ao farol. Se não conseguir, volte à posição da chave, ajuste um valor por vez e teste novamente. Se quiser, escreva seus próprios avisos nas linhas que mudam aviso, conservando a mensagem de começo, coleta, falta da chave e vitória.

[upbeat, encouraging voice] Faça também uma partida sem pegar a chave: o farol deve ficar apagado e pedir que você procure. Depois recolha a chave e acenda o farol. Pressione R e confira se tudo volta ao começo.

[confident, clear, unhurried voice] Clique em Verificar projeto. Se algum objetivo faltar, leia a indicação, ajuste e teste novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.
```

**Recado na página (não gravar):** Confira o jogo e os objetivos. Aguarde Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.

## Parte 4. Sua ilha está pronta

**Clipe:** `video-fecho`

**Na tela:** Depois do envio final, mostrar o Estúdio e a publicação opcional: Compartilhar, resumo, Gerar capa, Publicar, confirmação e Fechar. Sem certificado, venda ou autoria das artes. Concluir aula.

**Fala para ElevenLabs:**

```text
[pleased, lively voice] Você transformou a ideia da Chave do Farol em um jogo 3D! Programou o movimento, escolheu um lugar alcançável para a chave e fez o farol responder à coleta. Também aprendeu a mudar o ponto de vista para investigar o que a imagem não mostra de primeira.

[upbeat, encouraging voice] Seu jogo está pronto! Se quiser publicar no Mural, clique em Compartilhar no Estúdio. O título já vem preenchido. Escreva um resumo, clique em Gerar capa e confira a imagem. Depois clique em Publicar e espere aparecer Seu jogo está no Mural!

[pleased, lively voice] Olha só: seu jogo ganhou um lugar para outras pessoas jogarem! Clique em Copiar link de jogar para mostrar à família e aos amigos. Se precisar, peça ajuda a um adulto.

[confident, clear, unhurried voice] Clique em Fechar para voltar. Você também pode continuar sem publicar. Para terminar, clique em Concluir aula.
```

**Recado na página (não gravar):** Você concluiu os testes desta aula. Clique em Concluir aula.
