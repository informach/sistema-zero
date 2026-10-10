# Nave Contra Asteroides · Aula 3 · Faça a nave atirar

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.
- Resultado da aula: Tiros saem da nave, sobem, têm som e são retirados do grupo ao sair da tela.
- Seções: 7. Vídeos: 7.

**Vozes e edição:** Professora conduz; Debinha é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

## Diagnóstico e decisão

O evento é ensinado no próprio projeto. Duas experiências cobrem informações invisíveis: ler a posição no disparo e retirar objetos que não aparecem mais.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Evento | once-vs-always com tiro antes do disparo | Comparar espera pela tecla e repetição automática. |
| Posição lida | fixed-vs-read antes da origem do tiro | Comparar número fixo e posição atual da nave. |
| Velocidade vertical | velocity antes de vx e vy | Observar o sinal e a mudança do y. |
| Grupo e limpeza | cleanup antes da retirada | Distinguir sair da tela de sair do grupo. |

## Proposta final

### Seção 1. Compare esperar a tecla e repetir tiros

**Tarefa:** Sua vez! Compare Criar um tiro em Quando acontecer e em Enquanto estiver rodando. No primeiro teste, espere parar e só depois clique em Apertar a tecla. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-tecla-e-repeticao → fala-tecla-e-repeticao → experiencia-tres-areas.

**Zappy na página (não gravar):** Sua vez! Compare Criar um tiro em Quando acontecer e em Enquanto estiver rodando. No primeiro teste, espere parar e só depois clique em Apertar a tecla. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-tecla-e-repeticao-avatar-01. Professora até “e ninguém clicou em Apertar a tecla.”. Antes: Deixar o primeiro teste terminar sem tiros e apontar 0 vezes na peça. Debinha: “Ah! Sem a tecla, o tiro não nasce!”. Retomada da professora: “Isso mesmo. Agora eu clico em Apertar a tecla.”. Depois: Clicar em Apertar a tecla depois da resposta e continuar a comparação com a repetição.

**Experiência existente:** `once-vs-always`. Coloque Criar um tiro em Quando acontecer. Clique em Começar o jogo e espere o teste parar, sem clicar em Apertar a tecla. Observe o contador de tiros. Depois clique em Apertar a tecla e observe de novo. Leve Criar um tiro para Enquanto estiver rodando. Clique em Começar o jogo e espere o teste parar. Compare com o primeiro teste. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Faça o tiro acompanhar a nave

**Tarefa:** Sua vez! Atire de dois lugares com cada opção de x e depois ligue Marcas da caixa e atire de novo. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-escrito-e-lido → fala-escrito-e-lido → experiencia-escrito-e-lido.

**Zappy na página (não gravar):** Sua vez! Atire de dois lugares com cada opção de x e depois ligue Marcas da caixa e atire de novo. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-escrito-e-lido-avatar-01. Professora até “Para acertar, é preciso olhar o relógio na hora.”. Antes: Concluir os disparos com o número fixo, com a nave em 640 e o tiro distante; terminar a comparação com o relógio. Debinha: “Como o tiro descobre onde a nave está agora?”. Retomada da professora: “Agora eu troco para O centro x da nave e clico em Atirar.”. Depois: Trocar para O centro x da nave e testar o disparo em 640 e em 200.

**Experiência existente:** `fixed-vs-read`. Com O número 400, atire, mude x da nave e atire de novo. Repita com O centro x da nave. Depois ligue Marcas da caixa e atire mais uma vez, mantendo O centro x da nave. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 3. Compare a direção do tiro

**Tarefa:** Sua vez! Compare -9 e 9 em velocidade para baixo, avançando os quadros e olhando o y. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-direcao-do-tiro → fala-direcao-do-tiro → experiencia-direcao.

**Zappy na página (não gravar):** Sua vez! Compare -9 e 9 em velocidade para baixo, avançando os quadros e olhando o y. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-direcao-do-tiro-avatar-01. Professora até “na tela, y menor fica mais para cima.”. Antes: Avançar com -9 e mostrar o tiro subindo, com os valores de y à vista. Debinha: “E se eu tirar o sinal de menos?”. Retomada da professora: “Agora eu troco velocidade para baixo para 9 e avanço outros quadros, e o y aumenta 9 em cada quadro: o tiro desce.”. Depois: Trocar para 9 e mostrar a descida antes de explicar a diferença.

**Experiência existente:** `velocity`. Na experiência, mantenha velocidade para o lado em 0. Coloque velocidade para baixo em -9 e clique em Avançar 1 quadro algumas vezes. Observe o tiro e o y. Troque velocidade para baixo para 9 e avance outros quadros. Compare a direção e o y nos dois testes. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 4. Monte o disparo da barra de espaço

**Tarefa:** Agora faça a sua nave atirar! Crie o grupo tiros, monte o disparo da barra de espaço e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-criar-tiro → fala-criar-tiro.

**Zappy na página (não gravar):** Agora faça a sua nave atirar! Crie o grupo tiros, monte o disparo da barra de espaço e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-criar-tiro-avatar-01. Professora até “Agora abra Jogo 2D, depois Grupos e depois Criar e percorrer, e pegue o bloco Criar grupo de sprites. Arraste e solte no fim de Ao iniciar. Repare: o nome chega como asteroides, mas este grupo é o dos tiros. Troque asteroides por tiros e clique fora do campo.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “O grupo dos tiros está pronto!”. Retomada da professora: “Agora o disparo.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-criar-tiro-avatar-02. Professora até “Deixe à vista o espaço de dentro de Quando acontecer. Abra Jogo 2D, depois Controles e depois Teclado, ações e toque, e pegue o bloco Quando apertar a tecla. Arraste para dentro de Quando acontecer e solte quando aparecer o encaixe. No menu da tecla, escolha barra de espaço.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “Vou poder atirar com a barra de espaço!”. Retomada da professora: “O tiro nasce dentro desse evento: deixe à vista o espaço vazio dentro de Quando apertar a tecla.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-criar-tiro-avatar-03. Professora até “Agora o lugar de onde o tiro sai: o x vai ler a posição da nave. Deixe à vista o número do campo x do tiro. Abra Jogo 2D, depois Movimento e depois Posição e tamanho, pegue o bloco o centro x do sprite e solte em cima desse número. Ele toma o lugar do número. Escolha nave.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “E a altura de onde sai o tiro?”. Retomada da professora: “Faça o mesmo com o y: deixe à vista o número do campo y do tiro.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-criar-tiro-avatar-04. Professora até “Por último, o som. Deixe à vista o encaixe logo abaixo de Criar tiro, ainda dentro da tecla. Abra Jogo 2D, depois Som e depois Efeitos prontos, pegue o bloco Tocar efeito e solte logo abaixo de Criar tiro. No menu, escolha tiro grande.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “O disparo também vai ter som!”. Retomada da professora: “Confira se ficou assim: no fim de Ao iniciar está Criar grupo de sprites tiros.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Crie o grupo tiros em Ao iniciar.
- Em Quando acontecer, coloque Quando apertar a tecla: barra de espaço.
- Dentro de Espaço, crie o tiro usando centro x e posição y da nave.
- No evento Espaço, use Tocar efeito e escolha tiro grande.
- No evento Espaço: tiro com vx 0, vy −9 e depois som de tiro.
- Mantenha apenas um comando de criar tiro.

### Seção 5. Mova e desenhe os tiros

**Tarefa:** Agora faça os tiros voarem! Mova e desenhe o grupo tiros em cada quadro, atire de dois lugares e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-tiros-voam → fala-tiros-voam.

**Zappy na página (não gravar):** Agora faça os tiros voarem! Mova e desenhe o grupo tiros em cada quadro, atire de dois lugares e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-tiros-voam-avatar-01. Professora até “Agora abra Jogo 2D, depois Grupos e depois Movimento, e pegue o bloco Mover os sprites do grupo usando suas velocidades. Arraste e solte logo depois de Desenhar o sprite nave e escolha tiros. Esse bloco faz cada tiro andar com a velocidade que ele recebeu ao nascer, ou seja, vy -9, para cima.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “Já tem movimento. Falta desenhar!”. Retomada da professora: “Deixe à vista o encaixe logo abaixo do movimento dos tiros.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-tiros-voam-avatar-02. Professora até “Olha só: o tiro sai da nave e sobe!”. Antes: Esperar o tiro aparecer e subir, depois interromper os controles para a fala. Debinha: “O tiro saiu da nave!”. Retomada da professora: “Depois, mova a nave para outro lugar e atire de novo.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Mova o grupo tiros a cada quadro.
- Desenhe o grupo tiros a cada quadro.

### Seção 6. O tiro saiu da tela. E do grupo?

**Tarefa:** Sua vez! Deixe dois tiros saírem com a limpeza desligada, depois ligue a regra e compare o grupo. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-tiro-fora-da-tela → fala-tiro-que-sai-da-tela → experiencia-faxina.

**Zappy na página (não gravar):** Sua vez! Deixe dois tiros saírem com a limpeza desligada, depois ligue a regra e compare o grupo. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-tiro-fora-da-tela-avatar-01. Professora até “É como a lista de convidados de uma festa: se um convidado vai embora, o nome dele continua na lista. Só sai da lista se alguém riscar.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “Como eu tiro os que já foram embora?”. Retomada da professora: “Agora eu ligo Tirar do grupo quem sair da tela.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Experiência existente:** `cleanup`. Use Tempo para soltar o tempo se estiver parado. Com Tirar do grupo quem sair da tela desligado, deixe dois tiros saírem e observe o grupo. Depois ligue a regra, deixe o tempo passar novamente e compare. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 7. Retire os tiros que saíram

**Tarefa:** Agora limpe o grupo dos tiros! Coloque a limpeza entre mover e desenhar os tiros, teste os disparos, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Blocos na página:** video-faxina → fala-faxina → projeto.

**Zappy na página (não gravar):** Agora limpe o grupo dos tiros! Coloque a limpeza entre mover e desenhar os tiros, teste os disparos, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Participação no vídeo:** Debinha entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-faxina-avatar-01. Professora até “Agora abra Jogo 2D, depois Grupos e depois Participação e limpeza, e pegue o bloco Tirar do grupo quem sair da tela. Arraste e solte entre Mover os sprites do grupo e Desenhar o grupo dos tiros, quando aparecer o encaixe.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “Qual grupo eu escolho aqui?”. Retomada da professora: “No grupo, escolha tiros.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-faxina-avatar-02. Professora até “Confira se ficou assim: dentro de A cada quadro do jogo, a sequência dos tiros é Mover os sprites do grupo tiros, Tirar do grupo tiros quem sair da tela e Desenhar o grupo tiros, nessa ordem.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Debinha: “Vou conferir se os tiros continuam saindo da nave!”. Retomada da professora: “Agora teste: clique na área do jogo, dispare algumas vezes, mude a nave de lugar e dispare de novo.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar.
- Crie o grupo tiros em Ao iniciar.
- No evento Espaço, use Tocar efeito e escolha tiro grande.
- No evento Espaço: tiro com vx 0, vy −9 e depois som de tiro.
- Mantenha apenas um comando de criar tiro.
- Mova tiros antes de limpar o grupo.
- Retire os tiros que saem e depois desenhe esse grupo.
- Desenhe o grupo tiros a cada quadro.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Mover o sprite com as setas <- -> (velocidade ) | Jogo 2D → Movimento → Movimentos prontos |
| o centro x do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Manter o sprite dentro da tela | Jogo 2D → Movimento → Bordas e rebatidas |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Criar grupo de sprites | Jogo 2D → Grupos → Criar e percorrer |
| Criar nave em x y largura altura , cor do corpo cor das asas | Jogo 2D → Kits prontos → Espaço |
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D → Grupos → Criar e percorrer |
| a posição y do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 3 na cadeia `nave-contra-asteroides`. Entrada: etapa 2; saída: etapa 3 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
