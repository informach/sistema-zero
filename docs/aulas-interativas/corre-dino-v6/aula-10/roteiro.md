# aula-10 — Uma colisão mais justa

Revisão baseada no roteiro original gravado. Demonstração é observação: o clipe e, quando a seção tem, a cena que toca sozinha. Experimentação é uma cena separada do projeto, em que a criança mexe e descobre. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** A batida pode parecer acontecer antes do toque. Vamos enxergar a área usada pela colisão e ajustá-la.

**Saída esperada:** Área de colisão do Dino em 80%, desenho do personagem preservado e instrumento retirado.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | A batida pode parecer acontecer antes do toque. Vamos enxergar a área usada pela colisão e ajustá-la. |
| 2. Veja a área que o jogo usa | application | Adicionar um instrumento que revela a geometria de colisão. |
| 3. O contorno e o desenho são iguais? | demonstration | Perceber espaços vazios do desenho dentro da área de colisão. |
| 4. Ajuste só a área de colisão | exploration | Comparar a detecção mantendo os desenhos na mesma posição. |
| 5. Leve o ajuste para o seu jogo | application | Configurar a área sem redimensionar o sprite. |
| 6. Retire o instrumento, mantenha o ajuste | application | Distinguir instrumento temporário de regra permanente. |
| 7. Teste e entregue sua construção | delivery | Área de colisão do Dino em 80%, desenho do personagem preservado e instrumento retirado. |
| 8. Veja o que você aprendeu | closing | Área de colisão do Dino em 80%, desenho do personagem preservado e instrumento retirado. |
| 9. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Veja a área que o jogo usa

**Por que aqui:** Partir do próprio jogo e de um problema reconhecível depois da aula 9.

**Foco:** Adicionar um instrumento que revela a geometria de colisão.

**Fala de ligação / orientação ao aluno:** “No fim de A cada quadro, coloque Desenhar área de colisão do sprite dino. Veja o contorno ao redor dele.”

**Fonte:** roteiro-aula-10-corre-dino.md → Parte 1. Passo 1: ligar o raio-X.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar o contorno. Não tratar o desenho da hitbox como a própria configuração da colisão.

**Na tela:** **Na tela:** Jogo 2D › Colisões, arrastar "Mostrar a caixa de colisão do sprite" para dentro do "Se a tela atual é jogando", no fim, abaixo do "Tirar do grupo cactos quem sair da tela"; escolher o dino. Rodar e mostrar o contorno rosa em volta do dino.

**Trecho original selecionado, antes da edição:** Tem uma coisa acontecendo no seu jogo que você não consegue ver. Hoje a gente vai ver. Na categoria Jogo 2D, subcategoria Aparência, pega o bloco Mostrar a caixa de colisão do sprite. Clica nele, segura, arrasta pra dentro do Se a tela atual é jogando e solta lá no fim de tudo, embaixo do Tirar do grupo cactos quem sair da tela, que hoje é o último bloco de lá. Ele tem um campo só, que é o sprite. Abre a listinha e escolhe o dino. Clica na área do jogo, aperta Enter pra começar e olha em volta do seu dino: apareceu um contorno cor-de-rosa. Esse retângulo é a caixa de colisão. É a forma que o jogo usa de verdade pra saber se alguma coisa encostou no dino. E repara: o jogo não olha pro desenho do dinossauro. Ele olha pra esse retângulo. Pro computador, o seu dino é essa caixa. Passo 1 feito, o invisível ficou visível. O segundo passo é entender o que essa caixa tem a ver com a batida injusta.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Desenhe a área de colisão do dino a cada quadro.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### O contorno e o desenho são iguais?

**Por que aqui:** Um close parado explica melhor a geometria do que exigir precisão motora numa partida.

**Foco:** Perceber espaços vazios do desenho dentro da área de colisão.

**Fala de ligação / orientação ao aluno:** “Olhe o espaço vazio junto do corpo. O desenho tem recortes, mas a área de colisão é mais simples.”

**Fonte:** roteiro-aula-10-corre-dino.md → Parte 2. Passo 2: por que a batida pareceu roubada.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar a explicação dos espaços transparentes. Corrigir qualquer referência a ajustar o cacto: nesta aula o ajuste é do Dino.

**Na tela:** Congelar um contato com a área marcada. Alternar desenho e contorno na mesma posição. Não mover o obstáculo enquanto compara os contornos.

**Trecho original selecionado, antes da edição:** Olha com atenção o seu dino dentro da caixa. O dinossauro é um bichinho cheio de pontas e curvas, sem nada de reto nele: tem o rabo pra trás, o focinho pra frente, as perninhas embaixo. Mas a caixa é um retângulo, certinho, quadradão. Então sobra espaço vazio. Aqui em cima da cabeça tem um pedaço de caixa sem dino nenhum. Aqui na frente também. Aqui embaixo, entre os pés, também. E é aí que mora a batida injusta: quando o cacto encosta num desses cantinhos vazios da caixa, o jogo entende que bateu, mesmo que na tela pareça que passou longe. Não foi o jogo que roubou de você. Foi a caixa que é maior que o bichinho. Segundo passo entendido. E o conserto disso tudo é um bloco só, que é o que a gente pega agora.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Ajuste só a área de colisão

**Por que aqui:** Permitir uma comparação controlada que seria difícil de repetir numa corrida real.

**Foco:** Comparar a detecção mantendo os desenhos na mesma posição.

**Cena:** `hitbox`, “Onde a batida acontece?”. Formato: experimentação (a criança mexe e descobre). Fica separada da criação da criança: nada do que ela faz aqui muda o projeto ou o desenho.

**Elenco:** personagem: Dino (o de fábrica) e obstáculo: cacto (o de fábrica).

**O que a criança lê ao abrir:** “Traga o cacto um toque de cada vez até aparecer BATEU. Depois deixe o cacto no mesmo lugar e mude só a área do Dino.”

**Como o palco começa:** O cacto está a 149 do Dino. As áreas pontilhadas ainda não se encostam.

**Antes de escolher:** “Nesta experiência, vamos comparar a área que encosta com o desenho que aparece no jogo.”

**Hoje vamos usar:** A área de colisão.

**Seu palpite, antes de abrir a cena (o de fábrica da cena; não vale nota):** “Com esta área grande, quando vai aparecer BATEU?”

- Antes de os desenhos se encostarem ✓ (o que acontece de verdade)
- Só quando os desenhos se encostarem (se ela escolher esta, a tela conta depois: “Apareceu BATEU com um vão entre os dois desenhos.”)

O palpite volta à tela quando ela descobre: “BATEU com os desenhos ainda longe”.

**O que ela precisa descobrir** (a faixa e o botão Conferir mostram o pedido; o rótulo só aparece quando a descoberta acontece):

1. Pedido: “Aproxime o cacto do Dino com a Distância do cacto, um toque de cada vez.” Ao descobrir: “BATEU com os desenhos ainda longe”.
2. Pedido: “Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino.” Ao descobrir: “Área menor, mesmo lugar: a batida sumiu”.

**Frase de sucesso:** “O Dino ficou do mesmo tamanho. Só a área mudou, e a batida ficou justa!”

**Pistas (uma por vez, no botão Uma pista; guardadas no bloco, iguais às de fábrica):**

1. “Aproxime o cacto um toque de cada vez e olhe os dois desenhos quando aparecer BATEU.”
2. “Deixe o cacto onde bateu. Mude só a área do Dino.”
3. “Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino até 80% e veja o BATEU sumir.”

**Pergunta depois de descobrir (a de fábrica da cena; conta para concluir):** “O que o jogo usa para saber que houve batida?”

- Áreas invisíveis em volta de cada um. ✓ (correta)
- Os pixels coloridos de cada desenho.

**Explicação que ela lê ao acertar:** “O desenho é para os olhos; a área é para a conta. Diminuir só a área deixa a batida justa, sem mudar o tamanho do Dino.”

**Na tela da cena:** Conferir responde com o pedido da descoberta que falta. Quando tudo cai, aparece “✓ Você descobriu!” e a pergunta. Na revisita, a faixa mostra “✓ Você já descobriu isto.”, sem pedir a pergunta de novo.

### Leve o ajuste para o seu jogo

**Por que aqui:** Aplicar a descoberta uma única vez na preparação da partida.

**Foco:** Configurar a área sem redimensionar o sprite.

**Fala de ligação / orientação ao aluno:** “Em Ao iniciar, depois de criar o dino, ajuste a área de colisão dele para 80%. Mantenha o tamanho do Dino em 64.”

**Fonte:** roteiro-aula-10-corre-dino.md → Parte 3. Passo 3: ajustar a área de colisão.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Reaproveitar a montagem e o teste com contorno; manter a cor e o desenho iguais.

**Na tela:** **Na tela:** Jogo 2D › Colisões, arrastar "Usar área de colisão de __ % do tamanho para o sprite __" para o Ao iniciar, encaixando como **último bloco**, embaixo do "Ir para a tela inicio"; deixar 80 e escolher o dino. Com o raio-X ainda ligado, mostrar a caixa menor.

**Trecho original selecionado, antes da edição:** Na categoria Jogo 2D, subcategoria Colisões, pega aquele bloco bem comprido, o Usar área de colisão de tanto por cento do tamanho para o sprite. Clica nele, segura e arrasta pra dentro do Ao iniciar. Encaixa ele no fim de tudo, embaixo do último bloco que está lá, o Ir para a tela inicio. Ele tem dois campos. O primeiro é a porcentagem, e já vem 80, que é justamente o que a gente quer, então deixa como veio. No segundo, que é o sprite, escolhe o dino. Esse bloco mora no Ao iniciar, e não no motor, porque é coisa de preparação: acontece uma vez só, quando o jogo liga. E aqui dentro a ordem não faz diferença, porque tudo isso acontece antes de o jogo começar a rodar. O que importa é que ele venha depois do Criar dinossauro, senão ele ajustaria um dino que ainda não existe. Olha o raio-X agora: a caixa encolheu. Ela virou oitenta por cento do tamanho do dino, bem mais grudadinha no bichinho, e aqueles cantos vazios diminuíram bastante. E repara que o desenho do dino não mudou nada. Ele continua do mesmo tamanho na tela. O que mudou foi só a caixa invisível que o jogo usa pra medir a batida. Agora clica na área do jogo e passa raspando num cacto de propósito. Aquelas perdas injustas sumiram: quando você passa perto e escapa, o jogo concorda com você que escapou. Passo 3 feito. E agora o quarto passo, que é onde você vira o dono do jogo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Em Ao iniciar, ajuste a área de colisão do dino para 80%.
- Desenhe a área de colisão do dino a cada quadro.
- Crie o Dino com tamanho 64 antes do ajuste de colisão.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Retire o instrumento, mantenha o ajuste

**Por que aqui:** Encerrar com o jogo visualmente limpo, sem desfazer a solução.

**Foco:** Distinguir instrumento temporário de regra permanente.

**Fala de ligação / orientação ao aluno:** “Depois de testar, apague apenas Desenhar área de colisão. O ajuste de 80% fica em Ao iniciar.”

**Fonte:** roteiro-aula-10-corre-dino.md → Parte 4. Passo 4: você escolhe o quanto perdoar.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Pode aproveitar a comparação 40/100 como observação rápida, mas remover a tarefa de escolher livremente. Encerrar em 80 e retirar o contorno.

**Na tela:** **Na tela:** trocar o 80 por 40 (jogar e ver como fica fácil demais), depois por 100 (voltar a ser injusto), depois voltar pra um número entre 70 e 85; por fim, apagar o bloco do raio-X.

**Trecho original selecionado, antes da edição:** Esse número da porcentagem é muito mais poderoso do que parece. Os criadores de jogos chamam ele de dial de dificuldade, que é tipo um botão de ajuste. E vamos ver o que ele faz. Troca o 80 por 40 e joga um pouco. Com 40 a caixa fica minúscula, quase no meio do dino, e o jogo fica fácil demais, porque o cacto passa praticamente por dentro dele e não acontece nada. Chega a parecer que o jogo está com pena de você, e aí perde a graça também. Agora troca por 100 e joga de novo. A caixa voltou ao tamanho cheio, e voltaram aquelas batidas injustas do começo da aula. Então lembra desta regra, que vale na grande maioria dos jogos que você vai fazer: pra coisa que machuca o jogador, área menor que 100 deixa o jogo mais justo. É o cacto do seu jogo. O jogador sente que só perde quando merece. Agora põe um número entre 70 e 85, testa e escolhe o que deixou o seu jogo mais gostoso. O meu está em 80, e o seu pode ser outro. E pra fechar, apaga o bloco Mostrar a caixa de colisão, arrastando ele pra lixeira. Ele era o nosso raio-X e já cumpriu a missão. Mas lembra dele: sempre que uma colisão do seu jogo estiver esquisita, liga o raio-X e olha. É assim que se investiga.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Em Ao iniciar, ajuste a área de colisão do dino para 80%.
- Retire o desenho provisório da área de colisão.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Clipes de abertura e fecho

### Abertura

**Ponte nova:** “A batida pode parecer acontecer antes do toque. Vamos enxergar a área usada pela colisão e ajustá-la.”

**Fonte:** roteiro-aula-10-corre-dino.md → Abertura.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Reaproveitar a retomada e o resultado de hoje. Trocar convites a exploração livre pela missão delimitada abaixo.

### Fecho

**Ponte nova:** “Sua construção está guardada. Agora responda três perguntas curtas sobre o que mudou hoje.”

**Fonte:** roteiro-aula-10-corre-dino.md → Fecho.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter a recapitulação. 80% é a escolha desta versão do Corre Dino; não ensinar que uma área sempre menor é universalmente mais justa. Evitar comparar tentativas com posições diferentes como prova do ajuste. A experiência nativa mantém o caso de comparação. Terminar indicando o quiz, sem abrir desafios extras.

## Conferência final e quiz

Jogue uma rodada. A batida deve continuar funcionando com a margem escolhida; o Dino não encolheu e o contorno não aparece mais.

**Critérios da entrega:**

- Em Ao iniciar, ajuste a área de colisão do dino para 80%.
- Retire o desenho provisório da área de colisão.
- Crie o Dino com tamanho 64 antes do ajuste de colisão.

**Ao ajustar a área para 80%, o desenho precisa encolher?**

- Não, a área de colisão e o desenho são diferentes. (correta)
- Sim, são sempre a mesma coisa.

O ajuste atua na geometria da detecção.

**O que manter igual ao comparar duas áreas?**

- As posições do Dino e do cacto. (correta)
- Apenas a música.

Mudar a posição junto impediria saber a causa do resultado.

**Apagar o desenho da área apaga o ajuste?**

- Não, o ajuste continua em Ao iniciar. (correta)
- Sim, o instrumento é a própria regra.

Um bloco mostra; outro configura.

## Orientação ao professor e à edição

- 80% é a escolha desta versão do Corre Dino; não ensinar que uma área sempre menor é universalmente mais justa.
- Evitar comparar tentativas com posições diferentes como prova do ajuste. A experiência nativa mantém o caso de comparação.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: bdc328d620c6cb758db35578544f6beb4f2916714bf30bf0e4e6a0aad7f6519c. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).

## Blocos e gravação no Estúdio atual

Edição: jogo-2d-1.0-documento-2.

Use os endereços abaixo ao gravar os gestos e a narração. As falas e âncoras identificadas como originais documentam a gravação anterior. Capture a paleta atual e substitua as indicações de localização antigas antes de publicar a aula.

No seletor Tocar efeito, escolha pulo, tiro, explosão ou derrota conforme a ação. O som fica no evento ou na colisão que o dispara. Preparar o jogo continua em Ao iniciar; seus eventos e relógios ficam nas áreas indicadas no passo a passo.

Confira com o perfil de aluno: abrir a aula, encontrar cada peça, montar, testar, conferir os critérios, guardar, reabrir e continuar na aula seguinte. Nas aulas de publicação, teste também Fazer minha versão e a edição da cópia.

| Bloco | Onde encontrar | O que faz |
| --- | --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto | Roda quando alguma coisa acontece. |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto | Repete enquanto o projeto estiver rodando. |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto | Roda ao abrir ou a cada nova partida. |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D › Movimento › Velocidade e gravidade | Soma a gravidade do mundo à velocidade vertical do sprite neste quadro. Sem definir outro valor, usa 0,6. Encaixe logo ANTES do bloco que movimenta o sprite. |
| Limpar a tela | Jogo 2D › Desenho e efeitos › Efeitos | Apaga tudo o que foi desenhado. Use no começo de cada quadro, antes de desenhar de novo. |
| Controlar o dinossauro , força do pulo | Jogo 2D › Kits prontos › Dino | Pula com ↑/Espaço ou toque na metade de cima da tela; abaixa com ↓ ou segurando o dedo embaixo. Já vem com chão e poeira. Para o dino cair, encaixe o "Aplicar a gravidade do mundo" logo acima. Use dentro do "a cada quadro". |
| Criar dinossauro em x y tamanho cor | Jogo 2D › Kits prontos › Dino | Cria um dinossauro desenhado (com perninhas que correm sozinhas). A pose muda quando ele pula ou abaixa. |
| Criar grupo de sprites | Jogo 2D › Grupos › Criar e percorrer | Cria um grupo vazio para guardar MUITOS sprites do mesmo tipo (tiros, inimigos, estrelas). |
| Desenhar o grupo | Jogo 2D › Grupos › Desenho e ordem | Desenha todos os sprites do grupo. Use a cada quadro, depois de mover. |
| Mostrar a caixa de colisão do sprite | Jogo 2D › Colisões › Área de contato | Desenha um contorno rosa na área de colisão do sprite (para depurar colisões). |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| A cada segundos | Jogo 2D › Tempo › Quadros e intervalos | Roda o “fazer” a cada N segundos. É uma raiz de “🔁 Enquanto estiver rodando”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”. |
| Soltar explosão no sprite cor | Jogo 2D › Desenho e efeitos › Partículas | Solta um jato de partículas (da cor escolhida + estilhaços cinza) no centro do sprite. |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu com sol, nuvens, morros e uma faixa de grama que rola (parallax). Use no começo do "a cada quadro", depois de limpar a tela. O dino corre sobre a grama. |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro quando a criança aperta qualquer tecla ou toca na tela. É o "aperte qualquer coisa para começar" das telas de início. Segurar a tecla dispara uma vez só. |
| Quando o sprite pular | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que o sprite pula de verdade (ex.: tocar um som, contar os pulos). Vale para os três jeitos de pular: estilo plataforma, pular no chão e o kit do dinossauro. |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D › Colisões › Encostar e bloquear | Para cada sprite do grupo que encostar no seu sprite (ex.: a nave), roda o "fazer" com aquele sprite. Use dentro do "a cada quadro". |
| Tocar efeito | Jogo 2D › Som › Efeitos prontos | Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu. |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D › Grupos › Participação e limpeza | Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa). Só tira quem já foi embora de verdade: o que nasce fora da tela e ainda está vindo continua no jogo. |
| Reiniciar o jogo | Jogo 2D › Jogo e telas › Telas e partida | Use dentro de um evento, laço ou função. Limpa a partida e executa novamente as três áreas do projeto. |
| o estado do jogo é ? | Jogo 2D › Jogo e telas › Telas e partida | Verdadeiro se o jogo está naquela tela. Use dentro de um "se". |
| Usar área de colisão de % do tamanho para o sprite | Jogo 2D › Colisões › Área de contato | Muda o tamanho da área de colisão do sprite: menor que 100% = colisão mais justa para DANO; maior = mais fácil de PEGAR (moedas). Vale para as perguntas de encostar; "impedir de atravessar" continua usando o tamanho cheio. Veja a área real com "Mostrar a caixa de colisão". |
| Mudar o estado do jogo para | Jogo 2D › Jogo e telas › Telas e partida | Guarda o estado atual, como início, jogando ou vitória. Use a pergunta sobre o estado para escolher o que desenhar e mover. A mudança não pausa o motor nem desenha uma tela. |
| Descrever o jogo para leitor de tela | Jogo 2D › Jogo e telas › Telas e partida | Explica o objetivo e os controles para quem não vê o canvas. Coloque em “Ao iniciar”. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| Tremer a tela com intensidade | Jogo 2D › Desenho e efeitos › Efeitos | Sacode a tela e para sozinho (o tremor vai diminuindo). Chame uma vez, ex.: numa colisão ou explosão. |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D › Jogo e telas › Telas e partida | Cobre a tela com um aviso central (título + subtítulo + dica). Ótimo para as telas de início, vitória e derrota. |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D › Kits prontos › Dino | Cria um obstáculo desenhado e coloca no grupo. Cacto e pedra nascem no chão (pule por cima); o pássaro vem no alto (abaixe por baixo). Ligue o x na borda direita e um vx negativo para ele vir vindo. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D › Grupos › Movimento | Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro. |
| Condição se, senão se e senão | Programação › ❓ Lógica & Se | Executa o "então" quando a condição for verdadeira. Use + para juntar "senão se" e "senão". |
| Número | Programação › 🔣 Valores | Um valor numérico. |
| texto | Programação › 🔣 Valores | Um valor de texto. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
