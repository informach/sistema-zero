# Roteiro de produção · cade-todo-mundo-aula-1

A professora grava toda a fala principal. Na edição kids, substituir apenas os trechos da tabela. Copie o arquivo .elevenlabs.txt para gerar a voz integral. Gravação e publicação desta revisão ainda não confirmadas.

## Parte 1. Bem-vindo ao jardim

**Clipe:** `video-a1-abertura`

**Na tela:** mostrar o jogo pronto nesta parte, com os três personagens escondidos. No "Olha aqui", tocar em UM esconderijo e deixar ver o personagem aparecer. No "repare", apontar o número Achados, que virou 1. Não tocar nos outros esconderijos. No "tem mais uma coisa", falar olhando para a câmera, com entusiasmo e naturalidade, sem mostrar nada da personalização. No fim, apontar para a área jogável ao passar a vez e para **Próxima parte**. O mesmo convite deve funcionar com o jogo ao lado ou abaixo do vídeo.

**Fala para ElevenLabs:**

```text
[upbeat, welcoming voice] Oi! Você vai construir um jogo chamado Cadê Todo Mundo. Antes de montar o seu, vamos ver como ele funciona.

[engaging, energetic, conversational voice] Neste jardim, três personagens estão escondidos. [interested, animated voice] Olha aqui: quando eu toco num esconderijo, ele some e aparece quem estava atrás dele. Achei um! E repare no número Achados: ele mudou para 1, porque eu encontrei um personagem.

[curious] E os outros dois?

[engaging, energetic, conversational voice] Esses eu deixo para você descobrir.

[engaging, energetic, conversational voice] Ah, e tem mais uma coisa: no fim do curso tem uma surpresa esperando por você. Ela vai deixar o seu jogo ainda mais seu.

[upbeat, encouraging voice] Agora é a sua vez: jogue até encontrar os três personagens. Quando terminar, clique em Próxima parte.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-a1-abertura-K1 | Debinha | 1 | quem estava atrás dele. Achei um! E repare no número Achados: ele mudou para 1, porque eu encontrei um personagem. | E os outros dois? | Esses eu deixo para você descobrir. Ah, e tem mais uma coisa: no fim do curso tem uma surpresa esperando por você. Ela | [curious] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Sua vez! Jogue a versão pronta e encontre os três personagens. Depois, clique em Próxima parte.

## Parte 2. Seu passo a passo do projeto

**Clipe:** `video-a1-caderno`

**Na tela:** mostrar a capa e a página de orientação do Passo a passo do projeto, o caderno real. No "Olha aqui", apontar o material. Ao falar em baixar, apontar o botão **Baixar**, ao lado do nome do arquivo, sem clicar. Não demonstrar o download, a impressão, a divisória nem os controles do leitor. O PDF precisa estar anexado antes da gravação.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Olha, aqui está o Passo a passo do projeto. Aqui você encontra os passos para montar o seu jogo, com os blocos e o lugar de cada um. Então, se você esquecer algum passo, é só voltar aqui e abrir o material.

[upbeat, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser.

[confident, clear, unhurried voice] Agora clique em Próxima parte.
```

**Recado na página (não gravar):** Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

## Parte 3. O que um toque faz?

**Clipe:** `video-a1-toque`

**Na tela:** explicar ação e reação com a animação já produzida da pena fazendo cócegas e o Zappy rindo, com a legenda “ação: cócega · reação: risada”. Em seguida, mostrar um toque e a ideia de ligação com uma reação no jardim, sem percorrer a interface da experiência nem revelar os testes com outro esconderijo. A atividade real começa sem progresso. O Zappy da página orienta cada etapa conforme o estado; não sobrepor sua voz à professora.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Nesta parte, a gente vai entender uma ideia importante para fazer o seu jogo responder: a ação e a reação.

[interested, animated voice] Sabe quando alguém faz cócegas em você e você não consegue parar de rir? A cócega é a ação, e a risada é a reação.

[engaging, energetic, conversational voice] No seu jogo, o toque é a ação. A reação que a gente quer é um esconderijo ficar invisível, para aparecer quem está atrás dele. Essa reação precisa estar ligada ao toque para acontecer.

[upbeat, encouraging voice] Agora é a sua vez de investigar essa ligação no jardim. Observe o que acontece antes e depois de ligar a reação. O Zappy vai acompanhar cada etapa da experiência. Quando terminar, clique em Próxima parte.
```


**Falas dentro da experiência:** fonte compartilhada `packages/core/src/learning/scene/garden.ts`, exportada em `zappy-etapas.json`. Uma fala por estado; texto, botão principal e voz devem corresponder à mesma etapa. Os controles e os retornos são apresentados durante a interação, sem reproduzir uma sequência de cliques no vídeo.

**Recado na página (não gravar):** Sua vez! Investigue a ligação entre o toque e a reação no jardim. O Zappy acompanha cada etapa da experiência.

## Parte 4. Faça alguém aparecer

**Clipe:** `video-a1-programar`

**Na tela:** abrir o Estúdio incorporado com o projeto inicial. Começar pela retomada, antes de qualquer bloco: tocar num esconderijo na Pré-visualização e, no "Tá vendo?", mostrar que nada acontece. Depois da lembrança da experiência, apresentar os comandos como blocos; no "Olha aqui: neste menu", apontar a paleta de comandos, sem pegar nenhum bloco ainda. Depois trazer à vista a área **Quando acontecer**, arrastando um espaço vazio entre os blocos se ela começar fora da tela, e, no "Olha aqui: nessa área", enquadrar o evento do grupo **esconderijos**, ainda vazio. Deixar à vista o espaço ao lado de **fazer** antes de abrir a categoria na paleta. Mostrar cada gesto no ritmo da fala, com pausa suficiente para acompanhar. Não demonstrar abas, divisória, expansão ou olhinho.

**Fala para ElevenLabs:**

```text
[engaging, energetic, conversational voice] Aqui no seu jogo, toque num esconderijo. Tá vendo? Nada acontece, porque o toque ainda não tem nenhuma reação ligada a ele.

[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O arbusto só ficou invisível depois que você ligou a reação ao toque. Agora a gente vai fazer isso com os esconderijos do seu jogo!

[curious] E como faz isso no jogo?

[engaging, energetic, conversational voice] Para fazer isso, a gente precisa dizer ao jogo o que ele deve fazer. É para isso que servem os comandos, que aqui aparecem como blocos. [interested, animated voice] Olha aqui: neste menu, chamado paleta de comandos, você escolhe os blocos que vai encaixar para montar as regras do seu jogo.

[engaging, energetic, conversational voice] Para começar, encontre a área Quando acontecer. Se ela não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ela aparecer.

[interested, animated voice] Olha aqui: nessa área já tem o bloco Quando clicar ou tocar num sprite do grupo esconderijos, chamá-lo de escolhido. É ele que percebe quando alguém toca num esconderijo. Cada esconderijo é um sprite, que é um objeto do jogo. E escolhido é o nome que o jogo dá ao esconderijo que você tocar.

[engaging, energetic, conversational voice] A reação vai ficar dentro desse bloco, no espaço vazio ao lado da palavra fazer. Então deixe esse espaço à vista.

[engaging, energetic, conversational voice] Agora sim, abra Jogo 2D, depois Sprites e depois Aparência, e pegue o bloco Deixar o sprite jogador com 50% de visibilidade.

[confident, clear, unhurried voice] Arraste esse bloco até o espaço vazio ao lado de fazer e solte quando aparecer o encaixe.

[confident, clear, unhurried voice] Repare que o bloco chega com o nome jogador. Mas quem precisa ficar invisível é o esconderijo que você tocar. Então clique em jogador, desça até o fim da lista que abre e clique em escolhido.

[engaging, energetic, conversational voice] Agora falta o número. Clique no 50 e troque por 0. Com zero de visibilidade, o esconderijo fica invisível, e aí dá para ver o personagem que está atrás dele.

[upbeat, encouraging voice] Agora vamos testar no seu jogo! Toque num esconderijo. [interested, animated voice] Olha só: ele fica invisível, e o personagem que estava atrás aparece! Achados continua em zero por enquanto, porque o jogo ainda não conta quem você encontra. Depois, toque em outro esconderijo também.

[thoughtful] Talvez você esteja pensando: “No meu jogo ainda não funcionou.”

[engaging, energetic, conversational voice] Se aconteceu com você, volte aos blocos e confira se ficou assim: o bloco está dentro de Quando clicar ou tocar, o sprite é escolhido e o número é 0. [reassuring, encouraging voice] Depois de corrigir, teste de novo.

[curious] Funcionou?

[confident, clear, unhurried voice] Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.

[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar meu projeto e confirme em Enviar.

[pleased, lively voice] Pronto, você já programou a primeira regra do seu jogo! E lembra da surpresa que eu te contei lá no começo do curso? Pois é, ela está quase chegando! Na próxima aula, você já vai descobrir o que é.

[engaging, energetic, conversational voice] Quando o envio terminar, clique em Concluir aula.
```

**Substituições na edição kids:**

| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |
| --- | --- | --- | --- | --- | --- | --- |
| video-a1-programar-K1 | Debinha | 1 | ficou invisível depois que você ligou a reação ao toque. Agora a gente vai fazer isso com os esconderijos do seu jogo! | E como faz isso no jogo? | Para fazer isso, a gente precisa dizer ao jogo o que ele deve fazer. É para isso que servem os comandos, que aqui | [curious] |
| video-a1-programar-K3 | Debinha | 1 | o jogo ainda não conta quem você encontra. Depois, toque em outro esconderijo também. Talvez você esteja pensando: | No meu jogo ainda não funcionou. | Se aconteceu com você, volte aos blocos e confira se ficou assim: o bloco está dentro de Quando clicar ou tocar, o | [thoughtful] |

No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.

**Recado na página (não gravar):** Agora monte a regra do toque no seu jogo! Depois, teste nos esconderijos e clique em Verificar projeto antes de enviar o seu projeto.
