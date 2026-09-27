# O Jogo do Meu Jeito · Aula 2 · Desenhe a sua nave

## Resumo

- **Estado de entrada:** o jogo do Dia 5 está importado no Estúdio Completo, num projeto dela, e
  fica intocado hoje. A galeria do Pinta está vazia, e é a primeira vez que ela abre a ferramenta.
- **Vitória do dia:** a nave dela desenhada, pintada e com volume, num cartão da galeria.
- **Seções hoje:** 11 · **Seções propostas:** 8
- **Clipes hoje:** 8 · **Clipes propostos:** 7
- **Cenas:** 2 (as duas já existem, as duas com ajuste)
- **Testes de múltipla escolha hoje:** 4 no meio da aula, mais 2 no quiz final ·
  **Propostos:** 0 no meio da aula, 2 no quiz final (um deles trocado). Dois dos quatro viram
  experiência.
- **Textos corridos:** 0. Os 5 que existiam saíram em 20/09/2026 (ver a nota de decisão abaixo)
- **Manifesto:** `aulas/meu-jeito-aula-02.manifesto.json`, 24 blocos e 8 seções

> **Nota de decisão de produto, 20/09/2026.** Nos cursos infantis não existe texto corrido. Os 5
> blocos de texto desta aula saíram do manifesto, e as cinco seções que os tinham já tinham clipe.
> O conteúdo de cada um virou instrução de produção do clipe da própria seção, para ser executado
> e conferido na tela em vez de lido: `orientacao-novo-desenho` foi para o `video-novo-desenho`,
> `orientacao-contorno` foi para o `video-contorno`, `orientacao-cor-base` foi para o
> `video-cor-base`, `orientacao-volume` foi para o `video-volume` e `orientacao-entrega-v6` foi
> para o `video-fecho`. Só um deles deixou balão do Zappy, o `fala-so-a-nave`, que diz que a
> entrega de hoje é só o desenho e que ninguém precisa baixar imagem nem pôr a nave no jogo ainda.
> Os outros quatro não geraram balão: cada uma dessas seções já tem duas falas com o passo a
> passo, e o clipe cobre o resto, então um balão seria eco. Nenhum desses textos era critério de
> conclusão, então nenhuma regra de conclusão mudou. A chave `orientacao-entrega-v6` passou para
> `retireBlockKeys`, porque ela existia no rascunho v6.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Pixel art e vetor, a teoria dos dois estilos | Sim, mas hoje ela não tem com que comparar | **Sim, e não aqui.** A concretização é a cena `pixel-vector`, na Aula 4 | Experimentação, daqui a duas aulas | Depois de ela ter desenhado nos dois estilos | Comparar borda de pixel com borda de vetor antes de ter desenhado qualquer um dos dois é comparar duas palavras. Hoje a fala explica em três frases, com os dois cartões na tela, e a prova chega quando ela puder reconhecer as duas |
| Personagem, 32 × 32 e o nome nave | Não. Os números estão escritos dentro dos cartões | Não | | Lidos antes do clique | Clicar num tamanho já avança para a pergunta do nome, então o número é lido antes. É leitura de tela, não ideia |
| O Espelho lado a lado | Sim. A cópia aparece do outro lado do meio enquanto ela desenha, e isso não se explica em palavra | **Sim** | Experimentação (`symmetry`) | Antes do contorno, porque é a ferramenta do contorno | Testar no desenho dela custaria o desenho dela: ela teria que traçar, olhar e desfazer. A cena isola os três estados sem tocar na nave |
| O espelho não funciona com o Balde de tinta | Sim, e é armadilha de verdade: a linha-guia continua na tela com o balde na mão | **Sim**, dentro da mesma cena do espelho | Experimentação (`symmetry`, meta nova) | Junto com o espelho | É a mesma ideia, o alcance do espelho, e partir ao meio obrigaria a voltar ao mesmo palco duas vezes |
| O Balde enche a região fechada onde você clica | Não. Ela clica na outra asa e enche | Não | | Dentro do gesto | A ferramenta responde em um segundo, na tela dela |
| A faixa vazia embaixo da nave | Não é conceito, é a única regra de desenho do dia | Não | | Dita como exceção, no gesto do contorno | O motivo é a Aula 3, e a consequência aparece lá de verdade. Hoje vira critério de conferência e pergunta do quiz |
| Cor base, cabine e detalhes, e a proporção entre eles | Não. É critério de ofício, e ele se vê na nave do Júlio ao lado da dela | Não | | Dito no gesto | O olho compara sozinho a área que cada cor ocupa |
| Luz e sombra: por que dois tons a mais deixam a forma redonda | **Sim.** Nada na tela sugere que tirar e pôr dois tons muda o volume, e errar aqui estraga o desenho pronto | **Sim** | Experimentação (`shading`, hoje demonstração) | Depois da cor base e antes de ela riscar na nave dela | É a metade concreta da explicação. Sem sentir o antes e o depois, ela risca escuro sem saber quanto |
| Cada cor recebe sombra e luz da própria família | Sim | **Sim**, dentro da mesma cena | Experimentação (`shading`) | Junto | A cena usa três tons do mesmo azul, que é exatamente essa ideia. Cena separada repetiria o palco |
| Uma direção de luz só, do começo ao fim | Sim | **Sim**, dentro da mesma cena | Experimentação (`shading`, meta `side`) | Junto | Mudar o sol de lado e ver a sombra trocar é a meta que já existe |
| Salvo, e Guardado na sua conta | Não é conceito, são dois selos vizinhos na mesma barra | Não | | Uma frase no fecho | Hoje ocupa uma seção inteira com clipe próprio |
| Voltar à galeria pela setinha | Operação de interface | Não | | Dentro do gesto | |

Doze coisas, quatro concretizações, todas em duas cenas. É essa triagem que tira a aula de 11 para
8 seções sem perder nenhum assunto.

## Diagnóstico do desenho atual

**A única relação de volume da aula está travada numa demonstração sem controles.** A seção 6
(*Observe: a luz dá volume*) usa a cena `shading` no formato "Ver acontecer", que toca as três
partes de uma vez. A cena tem três metas prontas no motor (`flat`, `volume`, `side`), pistas em
escada e uma frase de sucesso, e nada disso é usado. Quem faz a aula assiste a bola ficar redonda em vez
de deixar ela redonda.

**A armadilha do Balde virou pergunta.** A seção 5 (*Pinte o corpo, a cabine e os detalhes*) termina
perguntando por que o Balde pintou só uma asa. O problema real dessa etapa é outro e está no código:
com o Espelho lado a lado ligado, a linha tracejada do meio **continua na tela com o balde na mão**,
sugerindo que os dois lados vão encher juntos. A aula avisa por fala, e depois cobra por pergunta um
comportamento vizinho.

**Quatro perguntas de múltipla escolha para conferir gestos que respondem sozinhos.** Ler o número
do cartão, deixar quatro fileiras livres, clicar de novo na outra asa e clarear a cabine são coisas
que a tela mostra no segundo seguinte. Nenhuma delas verifica o desenho, porque o próprio README diz
que a plataforma não inspeciona o trabalho externo.

**Uma seção inteira ensina a olhar dois selos.** A seção 8 (*Observe: salvo e guardado na conta*)
tem clipe próprio para dizer onde ficam o Salvo e o Guardado na sua conta. ⚠️ **Corrigido em
20/09/2026, medido no código:** os dois ficam **lado a lado, na mesma barra do desenho**, depois do
desfazer e do refazer (`pinta/src/components/editor/EditorScreen.tsx`, o `HostCloudStatus` logo
depois do `SaveBadge`). O selo da conta saiu da linha própria acima do editor em 07/09/2026, e a
descrição herdada dos prints de 2026-08-22 estava vencida. É informação de gravação, não seção.

**A teoria dos dois estilos está no lugar certo, e isso merece registro.** A seção 2 já explica
pixel art e vetor com os dois cartões na tela, e não antes. Esse é o modelo correto, e é o que a
proposta mantém.

## Proposta final

> **Nota de arquitetura.** A regra das duas colunas do player manda só uma coisa para a direita por
> seção: ou a cena, ou a ferramenta embarcada. **Nenhuma seção desta aula precisou ser dividida.** As
> duas cenas moram em seções próprias, a 3 e a 6, uma em cada, e o trabalho no Pinta acontece sempre
> na ferramenta externa (`externalTool: "pinta"`), nunca num Pinta embarcado. Sem `workspaceKey` em
> nenhuma seção, a coluna da direita nunca fica disputada. A conferência antes de voltar à aba da
> ferramenta deixou de ser bloco em 20/09/2026: ela agora acontece dentro do clipe, na tela, e o
> que sobra do lado esquerdo são clipes e falas, que ficam à esquerda do mesmo jeito. Na seção 6 o
> clipe e a
> cena convivem sem briga: o clipe vai para a esquerda e a cena para a direita, que é exatamente o
> desenho pretendido, as duas metades da mesma ideia lado a lado.
>
> **Duas consequências no texto das falas.** Primeira: a fala do Zappy tem limite de 400 caracteres,
> então as instruções longas das seções 2, 3, 4, 5, 7 e 8 viraram duas falas seguidas cada. Elas
> ficam na mesma coluna e na mesma ordem, e são lidas como uma fala só. Segunda: a abertura da seção
> 3 não pode dizer "experimenta o espelho aqui embaixo", porque acima de 1080 px de coluna a cena
> fica ao lado, e não embaixo. A fala passa a dizer "na bancada desta seção".

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** quem faz a aula precisa ver o nível de acabamento da nave antes de traçar a primeira
  linha, e precisa ouvir que o desenho é dela.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "A nave do Júlio, pronta"). A nave do Júlio pronta, com cor e volume, e a fórmula do modelo de
     autoria: "no fim da aula você vai ter uma nave parecida com essa aqui. Essa é a minha, e a sua
     vai ter o formato e as cores que você escolher." Mais a apresentação do Júlio em três frases, a
     única vez do curso. Duração alvo: 30 a 40 segundos.

### Seção 2. Abra o Pinta e prepare a tela da sua nave

- **Intenção:** construção
- **Por que existe:** o assistente de quatro perguntas é uma ação completa, com começo e fim, e é
  onde os dois estilos são explicados com os cartões na frente dela.
- **Conclui quando:** 90% do clipe assistido, com o desenho `nave` aberto em pixel art, Personagem,
  32 × 32
- **Blocos:**
  1. `dialogue` (`fala-novo-desenho`). "Esta seção tem o botão Abrir meu Pinta. Clica nele: o Pinta
     abre em outra aba, e esta aula continua aberta. Essa tela chama Meus desenhos, e é a sua galeria.
     Clica no Criar novo.
     Na pergunta Como você quer desenhar, clica no Pixel art. Em O que você quer criar, clica em
     Personagem."
     **A fala abre a ferramenta pelo botão da seção, e não pelo menu da esquerda.** Dentro de uma
     aula esse menu começa recolhido, e o Pinta é filho de Criar, então "no menu da esquerda, clica
     no Pinta" errava duas vezes na mesma frase. A regra inteira está na nota de decisão de
     plataforma de `meu-jeito-aula-01.md`.
  2. `dialogue` (`fala-tamanho-e-nome`). Continuação da mesma fala, partida pelo limite de 400
     caracteres do balão. "Em Qual o tamanho, olha o número embaixo do nome de cada cartão antes de
     clicar: embaixo do Médio está escrito 32 por 32, e é esse. O Pequeno já vem marcado, e não é
     ele. Em Qual o nome, escreve nave, tudo em letra minúscula. Clica em Começar a desenhar."
  3. `video` (`video-novo-desenho`, "Quatro perguntas antes de desenhar"). O assistente inteiro, com a teoria dos dois estilos dita no
     momento em que os dois cartões estão na tela. **Retirar a afirmação sobre o Celeste**, que o
     próprio README manda substituir por exemplo produzido no Pinta. **Manter a leitura do número
     antes do clique**, porque clicar num tamanho já avança para a pergunta do nome. **Manter** a
     leitura em voz alta da frase de ajuda do campo do nome, que é o primeiro sinal de que as duas
     ferramentas conversam. Duração alvo: 60 a 75 segundos. **A chamada para pausar e ir fazer e a
     conferência entram dentro do clipe**: pixel art, Personagem, quadro 32 × 32, nome nave, a
     grade à vista, e o conserto de quem caiu no Pequeno e ficou com 16 × 16.

**O texto de orientação saiu daqui, e não virou balão.** As duas falas da seção já dão o passo a
passo e já avisam para ler o número antes de clicar. O atalho **Abrir meu Pinta** continua onde
estava: ele é o `externalTool` da seção, não um bloco.

**Autoconferência no fim do clipe `video-novo-desenho`:** "No seu Pinta, o desenho se chama nave e a grade de pixel art tem 32 por 32 quadradinhos? Se aparecer 16 por 16, volte à escolha do tamanho."

### Seção 3. O que o espelho faz com o seu traço

- **Intenção:** conceito
- **Por que existe:** o espelho é a ferramenta do contorno, e quem faz a aula precisa saber onde a cópia
  cai antes de traçar a primeira lateral. Testar isso na nave dela custaria a nave dela.
- **Conclui quando:** as quatro metas de `symmetry` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-espelho`). "Uma nave é simétrica: o lado direito é igual ao esquerdo. Para
     desenhar coisa simétrica, o Júlio usa o Espelho lado a lado, que fica na caixa de ferramentas e
     é um interruptor: enquanto ele estiver aceso, tudo que você desenhar de um lado aparece do
     outro na mesma hora."
  2. `dialogue` (`fala-espelhos-vizinhos`). "Ali perto tem o Espelhar na horizontal e o Espelhar na
     vertical, que são outra coisa e a gente não usa hoje. Experimenta o espelho na bancada desta
     seção antes de traçar a sua nave."
  3. `interactive` (`experimento-espelho`). Cena `symmetry`, "O que o espelho faz com o seu traço?", com a meta nova do
     Balde. Cenário: `meu-jeito`. Sem elenco: a cena desenha a grade da nave, não personagem.

**Sem vídeo, de propósito.** O clipe de hoje que explica o espelho está dentro do clipe do contorno,
e a cena mostra os três estados melhor do que a narração conseguiria. A fala que sobra é a
localização do botão e a desambiguação dos dois vizinhos de nome parecido, que cabe num `dialogue`.

### Seção 4. O contorno da sua nave, e o espaço do motor

- **Intenção:** construção
- **Por que existe:** é o primeiro resultado do dia, a nave de pé, e é onde entra a única regra de
  desenho da aula.
- **Conclui quando:** 90% do clipe assistido, com o contorno fechado e cerca de quatro fileiras
  livres embaixo
- **Blocos:**
  1. `dialogue` (`fala-contorno`). "Escolhe um corpo e um par de asas entre as referências desta
     aula. Vai na paleta e pega o preto, que é o que mais separa o desenho do fundo. Liga o Espelho
     lado a lado, pega a Linha na caixa de ferramentas e traça a lateral do corpo. Se um traço não
     ficar bom, desfaz na setinha curva da barra de cima, ou no Control e o Z juntos, e traça de
     novo."
  2. `dialogue` (`fala-espaco-do-motor`). Continuação da mesma fala, partida pelo limite de 400
     caracteres do balão. "E tem uma coisa que eu preciso te pedir, que é a única regra do desenho
     de hoje: deixa umas quatro fileiras de quadradinhos vazias embaixo da nave. É dali que o fogo
     do motor vai sair na próxima aula."
  3. `video` (`video-contorno`, "A nave de pé, e o espaço do motor"). **Oferecer duas ou três referências dentro da própria aula**, sem
     mandar pesquisar na internet. **Encurtar a explicação do espelho**, que a cena já deu, e ficar
     no gesto: o botão aceso, a linha tracejada do meio, a Linha, o desfazer, e a faixa livre
     embaixo com zoom. **Manter** o "isso não é errar, é desenhar", que é reenquadramento e continua
     valendo. Duração alvo: 70 a 85 segundos. **A chamada para pausar e ir fazer e a conferência
     entram dentro do clipe**: contorno reconhecível de nave, com partes fechadas que podem
     receber cor, e a faixa de cerca de quatro fileiras livres embaixo.

**O texto de orientação saiu daqui, e não virou balão.** O `fala-espaco-do-motor` já diz que o
espaço embaixo é a única regra do dia, e o clipe já carrega o resto.

**Autoconferência no fim do clipe `video-contorno`:** "A sua nave tem áreas fechadas para pintar e sobra uma faixa de cerca de quatro fileiras vazias embaixo para o motor? O formato das asas é escolha sua."

### Seção 5. Pinte o corpo, a cabine e os detalhes

- **Intenção:** construção
- **Por que existe:** é a segunda vitória visível do dia, a nave colorida, e é a etapa em que a
  proporção entre as cores vira critério de ofício.
- **Conclui quando:** 90% do clipe assistido, com as áreas fechadas preenchidas e a cabine
  distinguível
- **Blocos:**
  1. `dialogue` (`fala-cor-base`). "Antes da tinta, desliga o Espelho lado a lado clicando nele de
     novo, porque o espelho não funciona com o Balde de tinta. Escolhe uma cor média para o corpo,
     nem muito clara nem muito escura, porque na cor mais escura que existe não sobra para onde
     escurecer."
  2. `dialogue` (`fala-cabine-e-detalhes`). "Pega o Balde de tinta na caixa de ferramentas e clica
     dentro de cada área fechada. Depois escolhe outra cor para a cabine, e o Lápis para um ou dois
     detalhes pequenos."
  3. `video` (`video-cor-base`, "Balde de tinta, área por área"). **Manter** o clique área por área e a proporção entre cor base,
     cabine e detalhe, que é o conteúdo real do passo. **Retirar a explicação de por que o espelho
     não pinta**, que a cena da seção 3 entregou com quem faz a aula mexendo. **Corrigir** as referências
     a tons que a paleta ativa pode não ter. Duração alvo: 60 a 75 segundos. **A chamada para
     pausar e ir fazer e a conferência entram dentro do clipe**: cor base na maior parte do corpo,
     cabine distinguível, e fundo e espaço do motor ainda transparentes.

**O texto de orientação saiu daqui, e não virou balão.** O aviso de que o Balde preenche a região
conectada do clique já estava previsto na narração do clipe, e repetir num balão seria eco.

**Autoconferência no fim do clipe `video-cor-base`:** "Você distingue a cabine do corpo e ainda vê o fundo e o espaço do motor transparentes? As cores podem ser as que você escolheu."

### Seção 6. A luz dá volume

- **Intenção:** conceito
- **Por que existe:** a nave pintada parece um adesivo, e nada na tela sugere que dois tons a mais
  resolvem isso. É o único conceito visual da aula.
- **Conclui quando:** as três metas de `shading` caem e a pergunta final é respondida
- **Blocos:**
  1. `video` (`video-luz`, "A mesma nave, chapada e com volume"). A mesma nave chapada e com volume, no mesmo tamanho e na mesma posição,
     com a seta da luz fora da arte. Mais a decisão que é dela: de que lado vem a luz. **Retirar a
     teoria das famílias de cor da narração**, porque a cena entrega isso com ela mexendo. Duração
     alvo: 25 a 35 segundos.
  2. `interactive` (`experiencia-luz`). Cena `shading`, "A luz dá volume", **promovida de demonstração para
     experimentação**. Cenário: `meu-jeito`. Sem elenco.

**O clipe e a cena ficam na mesma seção**, porque são as duas metades de uma ideia só. O clipe
mostra o problema no objeto dela, a nave chapada, e a cena deixa ela resolver.

### Seção 7. Dê luz e sombra à sua nave

- **Intenção:** construção
- **Por que existe:** a regra que ela acabou de sentir vira poucos riscos na nave dela, e é a
  vitória final do dia.
- **Conclui quando:** 90% do clipe assistido, com uma direção de luz só e a silhueta ainda legível
- **Blocos:**
  1. `dialogue` (`fala-volume`). "Escolhe de que lado vem a luz e fica nesse lado até o fim. Pega o
     Lápis, que vai ficar na sua mão o passo inteiro. Faz todas as sombras primeiro e todas as luzes
     depois, assim você não troca de cor a cada risco. Cada cor recebe a sombra e a luz da própria
     família dela."
  2. `dialogue` (`fala-pouca-coisa`). Continuação da mesma fala, partida pelo limite de 400
     caracteres do balão. "Num detalhe de dois quadradinhos não cabe o par, então escolhe um dos
     dois. E sombra e luz são pouca coisa: duas ou três linhas finas fazem o trabalho. No fim, olha
     a sua nave inteira com calma e vê se ficou alguma coisa faltando, que o Lápis ainda está na sua
     mão."
  3. `video` (`video-volume`, "Sombras primeiro, luzes depois"). **Manter** a ordem sombras primeiro e luzes depois, o zoom nas partes
     com a nave inteira à vista do lado para conferir proporção, e o antes e depois no fim.
     **Retirar** a exigência de sombra numa cabine que já está escura. **Evitar** afirmar que toda
     cor da paleta tem duas vizinhas da mesma família. Duração alvo: 70 a 85 segundos. **A chamada
     para pausar e ir fazer e a conferência entram dentro do clipe**: uma direção de luz do começo
     ao fim, tons da própria família de cada cor ou o disponível mais próximo, e silhueta, cabine
     e espaço do motor ainda legíveis.

**O texto de orientação saiu daqui, e não virou balão.** O conserto de quando a nave fica escura
demais já estava previsto na narração do clipe, e as duas falas da seção cobrem o resto.

**Autoconferência no fim do clipe `video-volume`:** "A luz aparece do mesmo lado nas partes da sua nave e ainda dá para reconhecer a cabine e o contorno? Você escolhe de que lado vem a luz."

### Seção 8. Confira, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o dia com a nave pronta e prepara a retomada dela na Aula 3.
- **Conclui quando:** a entrega é enviada, o clipe de fecho é assistido e as duas perguntas do quiz
  são respondidas
- **Blocos:**
  1. `dialogue` (`fala-salvamento`). Absorve a seção do salvamento: "Você não precisa fazer nada
     para salvar. Na barra de cima do desenho, depois das duas setinhas do desfazer e do refazer,
     aparece Salvo sozinho toda vez que você para de desenhar por um segundinho."
  2. `dialogue` (`fala-guardado-e-galeria`). Continuação da mesma fala, partida pelo limite de 400
     caracteres do balão. "Logo do lado do Salvo, na mesma barra, aparece Guardado na sua
     conta, que quer dizer que o seu desenho subiu para a sua conta. Para voltar para a galeria,
     clica na setinha apontando para a esquerda, na ponta esquerda da barra."
     **Localização conferida no código:** o Pinta completo mostra Salvo e Guardado na sua conta
     lado a lado na barra do editor. Na aula embutida, o selo da conta não aparece.
  3. `dialogue` (`fala-so-a-nave`). "A entrega de hoje é só o desenho nave. Você não precisa
     baixar imagem nem pôr a nave dentro do jogo: isso vem nas próximas aulas."
  4. `studio` (`entrega-galeria-v6`). Entrega pela galeria do Pinta, uma criação.
  5. `video` (`video-fecho`, "A sua nave na galeria"). Retoma a nave pronta e anuncia o motor da
     Aula 3. Duração alvo: 50 a 65 segundos. **O gesto de entregar acontece dentro do clipe**,
     antes do corte final: esperar o Guardado na sua conta, escolher só o cartão da nave, enviar,
     e conferir na tela os critérios que antes estavam escritos.
  6. `quiz` (`quiz-v6`). Duas perguntas, com a segunda trocada (ver abaixo).

**O texto de entrega saiu daqui.** Os critérios viraram parte do `video-fecho`, e a nota de
correção de quem errou o espaço embaixo ou deixou contorno aberto ficou lá também, marcada como
instrução para o professor e não para a narração. O único pedaço que virou balão foi o limite do
dia, que nenhum outro bloco dizia.

## Destino de cada pergunta de múltipla escolha

### No meio da aula (`activity.type: 'question'`)

| Pergunta | Seção de hoje | Destino | Por quê |
|---|---|---|---|
| "Para escolher o tamanho certo, o que você deve olhar?" (`conferir-novo-desenho`) | 2. Prepare a tela da sua nave | **Some** | É leitura de tela, e a instrução já manda ler o número antes do clique, porque clicar num tamanho avança sozinho. A armadilha de verdade, a de que Médio não quer dizer a mesma coisa nos dois estilos, só existe quando há dois estilos para comparar, e é tratada na Aula 4 |
| "Por que deixamos uma faixa vazia embaixo da nave?" (`conferir-contorno`) | 4. Desenhe o contorno e reserve o motor | **Vira pergunta do quiz final** | A fala acabou de dizer o motivo. Perguntar em seguida é eco. No quiz ela vira aplicação numa situação curta, que é a função declarada do quiz, e a conferência do espaço continua na revisão do professor |
| "O Balde pintou só uma das asas. O que isso indica?" (`conferir-cor-base`) | 5. Pinte o corpo, a cabine e os detalhes | **Vira experiência** | Vira a meta nova `fill-ignores-mirror` da cena `symmetry`. O problema real desta etapa não é o Balde encher uma região por clique, que a tela mostra no clique seguinte: é a linha-guia do espelho continuar na tela com o balde na mão, sugerindo que os dois lados vão encher. Isso tem botão e vira experiência |
| "A cabine já está azul-escura. Como realçar o lado iluminado?" (`conferir-volume`) | 7. Dê luz e sombra à sua nave | **Vira experiência** | É a relação central da cena `shading`, promovida a experimentação nesta proposta. As três metas dela cobrem o caso da cabine: um tom mais claro da mesma família, do lado do sol. A pergunta final da cena substitui o teste, com correção no servidor |

**Dois dos quatro testes viram experiência**, e os dois que somem são leitura de tela e eco de fala.

**O que substitui a pergunta como critério de conclusão.** Nas seções de aplicação, o clipe do gesto
em 90% mais a lista de conferência que se lê antes de voltar à aba da aula. A verificação do
desenho continua sendo a entrega da galeria revisada pelo professor, que é o que o manifesto já
declara: cor, formato e fidelidade ao desenho do Júlio não recebem gabarito.

### No quiz final

| Pergunta | Destino | Por quê |
|---|---|---|
| "Você quer mudar apenas um detalhe pequeno na asa. Qual ferramenta cabe melhor?" | **Fica** | Escolha de ferramenta numa situação nova, e nada mais na aula cobra isso |
| "Com a luz vindo da direita, onde faz sentido colocar a sombra principal?" | **Trocada** | Passa a ser exatamente a meta `side` da cena `shading`, dentro da seção 6. Repetir no fim é eco |

**Pergunta nova no lugar da segunda:** "Você terminou o contorno e a nave ocupou o quadro inteiro,
até a última fileira de baixo. O que isso custa na próxima aula?"

- O fogo do motor não vai ter onde caber dentro do quadro. (correta)
- A nave vai ficar com menos cores disponíveis.

**Devolutiva:** "O espaço embaixo é uma decisão de desenho para preparar a animação. Se ele sumir,
o fogo não tem para onde crescer."

Ela recupera, no lugar certo, o conteúdo da pergunta que saiu da seção 4.

## Experiências e demonstrações desta aula

### 1. `symmetry`. O que o espelho faz com o seu traço? · **AJUSTADA NO CATÁLOGO**

- **Situação:** já existe e já é experimentação, com pistas em escada, palpite e pergunta final. O
  uso atual está correto e é um dos
  poucos acertos do v6 neste curso.
- **Estado do catálogo em 19/09/2026, depois da construção:** a cena tem as **quatro** metas, na
  ordem `one-side`, `two-sides`, `axis-decides` e `fill-ignores-mirror`, todas com o rótulo e o
  pedido que esta análise pedia, e nenhuma delas é `soNoCaso`. O ajuste que este relatório cobrava
  está feito.
- **Ajuste 1, e é o que vem da pergunta que sai:** a quarta meta, `fill-ignores-mirror`, com rótulo
  "Com o espelho ligado, o Balde encheu um lado só" e pedido
  "Deixe ligado o Espelho lado a lado e encha a asa com o Balde de tinta", **está no catálogo**. Ela
  transforma a
  armadilha em experiência dentro do mesmo palco. O motivo está no código: o espelho é aplicado no
  ponto de plotagem, então pega Lápis, Linha, Borracha, Retângulo e Círculo, e não pega o Balde nem
  o Trocar uma cor. E a linha-guia tracejada continua na tela com o balde na mão, que é o que
  engana.
- **Ajuste 2:** a pergunta final da aula hoje é "O que os dois espelhos fazem com o traço que você
  pinta?". Com a meta nova, ela passa a cobrar o alcance: "Com o Espelho lado a lado ligado, o que
  aparece dos dois lados?", com as alternativas "O que você pinta com o Lápis, com a Linha e com a
  Borracha" (correta) e "Tudo, inclusive o que você enche com o Balde de tinta".
- **Ação no motor:** a `fill` já está construída, do lado do `trace`. As outras ações da cena
  (`clear-paper`, `mirror-mode`, `dot`) ficaram como estavam.
- **Elenco e cenário:** cenário `meu-jeito`. Esta cena não desenha personagem do elenco: ela desenha
  a grade da nave.
- **Metas declaradas no manifesto:** `one-side`, `two-sides`, `axis-decides`, `fill-ignores-mirror`.
- **Onde mais serve:** qualquer curso futuro que ensine desenho simétrico no Pinta, e a lista de
  ferramentas cresce junto com o curso, como o próprio comentário do motor prevê.

### 2. `shading`. A luz dá volume · **EXISTE, SEM MUDANÇA NO CATÁLOGO**

- **Situação:** a cena existe inteira e é boa. Três metas no motor (`volume`, `flat`, `side`), três
  pistas em escada, frase de sucesso e pergunta extra. Hoje a aula usa ela como **demonstração no
  meio do texto**, com um botão Ver acontecer que toca as três partes de uma vez, e nenhuma das três
  metas é cobrada.
- **Ajuste, e é o principal desta aula:** promover a cena a **experimentação**. Pelo critério do
  briefing, a relação tem botão e a frase se escreve inteira: "quando eu mudo o sol de lado, o tom
  escuro troca de lado". Quem faz a aula liga a sombra e a luz, desliga para comparar, e leva o sol para o
  outro lado. O roteiro de demonstração continua existindo no motor e serve a quem revisar a cena,
  mas a aula passa a abrir na bancada.
- **Ajuste 2:** a pergunta que conta para concluir passa a ser a que hoje está solta no teste da
  seção 7, reescrita para a cena: "Uma parte do seu desenho já está numa cor escura. Como mostrar
  que a luz bate nela?", com "Pondo poucos pixels de um tom mais claro da mesma família" (correta) e
  "Cobrindo a parte inteira com a cor da sombra do corpo".
- **Por que não fica como demonstração:** demonstração é para processo no tempo, o que não é o caso.
  Aqui não há ordem a acompanhar, há uma chave para virar e um lado para escolher. Além disso, o
  formato de demonstração guiada termina com o botão "Agora é sua vez", e essa é uma das fórmulas
  banidas pela decisão de 01/08/2026. Como experimentação, quem faz a aula já começa na bancada e o botão
  deixa de existir.
- **Elenco e cenário:** cenário `meu-jeito`. Esta cena não desenha personagem do elenco: ela desenha
  a bola de três tons de azul.
- **Metas declaradas no manifesto:** `volume`, `flat`, `side`.
- **Onde mais serve:** a Aula 5 deste curso, quando a chama ganha ponta clara e base escura, e
  qualquer curso de pixel art ou de vetor que ensine volume.

### Cenas que foram consideradas e não entram

- **`pixel-vector`.** É a concretização de pixel art contra vetor, e o lugar dela é a Aula 4, depois
  de ter desenhado nos dois estilos. Trazer para cá, com ela ainda sem nenhum desenho
  pronto, faria a comparação virar decoração.
- **`layers`.** A ordem das formas é assunto do vetor e entra na Aula 5, com a chama atrás da pedra.
  No pixel art desta aula se trabalha numa camada só, e o painel Camadas nem é nomeado.
- **`frames` e `onion-skin`.** São da Aula 3. Hoje a nave tem um quadro só.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem (chave v6) | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | A nave do Júlio, pronta | a nave pronta e a apresentação do Júlio | `video-abertura-v6` | 30 a 40 s | fala sim, com a fórmula do modelo de autoria |
| `video-novo-desenho` | Quatro perguntas antes de desenhar | o assistente de quatro perguntas, os dois estilos, a pausa para ir fazer e a conferência ao retomar | `video-novo-desenho` mais o texto de orientação | 60 a 75 s | fala sim, com o corte do Celeste |
| `video-contorno` | A nave de pé, e o espaço do motor | referências, espelho aceso, Linha, desfazer, a faixa livre, a pausa para ir fazer e a conferência ao retomar | `video-contorno` mais o texto de orientação | 70 a 85 s | fala sim, com a teoria do espelho encurtada |
| `video-cor-base` | Balde de tinta, área por área | Balde área por área, cabine, detalhes, a pausa para ir fazer e a conferência ao retomar | `video-cor-base` mais o texto de orientação | 60 a 75 s | fala sim, com o aviso do espelho encurtado |
| `video-luz` | A mesma nave, chapada e com volume | a mesma nave chapada e com volume, e a escolha do lado | `video-luz-demo` | 25 a 35 s | fala parcial, com a teoria das famílias retirada |
| `video-volume` | Sombras primeiro, luzes depois | sombras primeiro, luzes depois, o antes e depois, a pausa para ir fazer e a conferência ao retomar | `video-volume` mais o texto de orientação | 70 a 85 s | fala sim |
| `video-fecho` | A sua nave na galeria | o gesto de entregar na tela com a conferência dos critérios, a nave pronta e o anúncio do motor | `video-fecho-v6` mais o texto de entrega | 50 a 65 s | fala sim |

**Sai um clipe:** o `video-salvamento`, que vira três frases no fecho. **Saldo:** de 8 para 7
clipes, com queda maior de minutagem em dois deles, porque a teoria do espelho e a das famílias de
cor saíram da narração e foram para as cenas. **Nenhum clipe novo entrou com a saída do texto
corrido:** as cinco seções que tinham texto já tinham clipe, e o que era lista escrita virou gesto
e conferência dentro do clipe que já existia. A minutagem de cada um pode subir um pouco por causa
disso, e as faixas de duração continuam valendo.

> A primeira linha de cada `plannedVideo` no manifesto é `Título: <nome do vídeo>`, e é a coluna
> "Título do vídeo" desta tabela que manda nela.

## Estado da importação

O manifesto `aulas/meu-jeito-aula-02.manifesto.json` passa no validador, com zero avisos. As duas
cenas existem no catálogo, então nada aqui fica esperando construção de cena.

**As quatro metas da `symmetry` estão construídas**, com o rótulo e o pedido que esta análise pedia.
Por isso o bloco `experimento-espelho` passa a declarar `setup.goals` com `one-side`, `two-sides`,
`axis-decides` e `fill-ignores-mirror`: a seção só fecha depois dos quatro estados do espelho, que é
o que a instrução do bloco já mandava fazer. A ordem de trabalho que o relatório segurava, importar
só depois do ajuste, caiu junto.

**O bloco `experiencia-luz`, da `shading`, declara `volume`, `flat` e `side`**, as três de fábrica.

Nenhum dos dois blocos escreve pistas próprias: os dois herdam a escada da cena, e ela é melhor que
uma lista copiada, porque pula o degrau cuja meta já caiu.

## Continuidade

- **O que esta aula assume da anterior:** o jogo importado e o projeto de teste estão na lista do
  Estúdio, e ela sabe voltar à lista pela marca Sistema Zero Studio. Nenhum dos dois é aberto hoje.
  Ela já abriu uma ferramenta pelo botão da própria seção, na Aula 1, e sabe que ele abre em outra
  aba.
- **O que esta aula entrega para a seguinte:** o desenho `nave` na galeria do Pinta, pixel art,
  Personagem, 32 × 32, com silhueta fechada, cor base, cabine, um ou dois detalhes, luz e sombra de
  uma direção só, e cerca de quatro fileiras de quadradinhos vazias embaixo da nave. A animação
  ainda se chama `parado` e tem um quadro.
- **Valores canônicos que saem daqui:** estilo pixel art · tipo Personagem · tamanho 32 × 32, que é
  o Médio no pixel e precisa de clique porque o Pequeno vem marcado · nome do desenho `nave` ·
  faixa de cerca de quatro fileiras livres embaixo · fundo e espaço do motor transparentes.
- **Campos livres:** o formato da nave, todas as cores, o lado da luz e os detalhes. A Aula 3 não
  cita nenhuma cor como fato, e o único compromisso que ela cobra é o espaço embaixo.
