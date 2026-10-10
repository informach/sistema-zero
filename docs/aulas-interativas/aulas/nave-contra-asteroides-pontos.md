# Nave Contra Asteroides · Aula 6 · Conte os acertos

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Cada colisão retira somente o tiro e o asteroide envolvidos, com explosão e som.
- Resultado da aula: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar.
- Seções: 2. Vídeos: 2.

**Vozes e edição:** Professora conduz; Dedé é o avatar desta aula inteira. A criança entra, fala e sai nos pontos marcados, sem cobrir o jogo, os campos ou os encaixes. Não interromper um arraste de bloco. A professora retoma antes de passar a vez a quem assiste. Zappy não tem voz dentro do vídeo; seu diálogo e o botão Ouvir pertencem à página. Nos clipes sem participação marcada, fala só a professora. Gravação, edição e publicação desta versão não confirmadas. [Direção de produção](../AVATARES-NOS-VIDEOS.md).

## Diagnóstico e decisão

Separa contagem de vidas. A experiência distingue guardar, alterar e mostrar um valor.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Variável | variable antes da montagem | O número pode mudar sem estar visível; mostrar é outra ação. |
| Lugar da soma | Teste de tiro que erra e tiro que acerta | Um ponto por colisão, sem soma solta no quadro. |

## Proposta final

### Seção 1. Guarde e mostre um número

**Tarefa:** Sua vez! Mude pontos com o placar desligado, depois ligue Mostrar placar e compare. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-variavel → fala-caixa-de-pontos → experiencia-variavel.

**Zappy na página (não gravar):** Sua vez! Mude pontos com o placar desligado, depois ligue Mostrar placar e compare. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-variavel-avatar-01. Professora até “O placar do estádio só mostra o que já foi anotado.”. Antes: Somar dois pontos com o placar desligado e concluir a comparação com o bloquinho. Dedé: “Como eu mostro os pontos que já estão guardados?”. Retomada da professora: “Agora eu ligo Mostrar placar.”. Depois: Ligar Mostrar placar e comparar o valor da tela com o valor guardado.

**Experiência existente:** `variable`. Mude pontos para 1 e volte para 0 com Mostrar placar desligado. Some 1 duas vezes e observe o número guardado. Ligue Mostrar placar, compare e some 1 novamente. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Some um ponto a cada acerto

**Tarefa:** Agora faça o seu jogo contar os pontos! Crie pontos, some 1 no acerto e mostre o placar. Depois, teste, clique em Verificar esta parte e envie o seu projeto. Por último, clique em Concluir fase.

**Blocos na página:** video-pontos-e-placar → fala-placar → projeto.

**Zappy na página (não gravar):** Agora faça o seu jogo contar os pontos! Crie pontos, some 1 no acerto e mostre o placar. Depois, teste, clique em Verificar esta parte e envie o seu projeto. Por último, clique em Concluir fase.

**Participação no vídeo:** Dedé entra com os gestos parados em cada ponto e sai antes da resposta. Zappy não tem voz no vídeo. Gravação, edição e publicação desta versão não confirmadas.

ID video-pontos-e-placar-avatar-01. Professora até “O valor já vem em 0: mantenha, porque cada partida começa sem pontos.”. Antes: Concluir Criar variável pontos com valor 0 em Ao iniciar; soltar o mouse antes da entrada. Dedé: “Onde eu coloco o bloco que soma?”. Retomada da professora: “O ponto só pode ser somado quando um tiro acerta uma pedra.”. Depois: Localizar o fim da colisão, mostrar onde a soma entra e soltar Somar em variável nesse lugar. Depois, deixar à vista o encaixe logo depois da colisão, sem pegar o placar antes da próxima entrada.

ID video-pontos-e-placar-avatar-02. Professora até “Agora o placar, que precisa aparecer em todo quadro, e não só no acerto. Por isso, ele fica fora da colisão: deixe à vista o encaixe logo depois do bloco inteiro da colisão, ainda dentro de A cada quadro do jogo.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Mesmo sem acertar outra pedra, eu vou ver quantos pontos tenho!”. Retomada da professora: “Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela, pegue o bloco Mostrar placar e solte nesse encaixe.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-pontos-e-placar-avatar-03. Professora até “O número do placar precisa ler o valor guardado em pontos. Deixe à vista o número do campo valor do placar. Abra Programação e depois Valores, pegue o bloco valor da variável, solte em cima desse número e escolha pontos. Assim, o placar mostra o número que o jogo guardou, em vez de mostrar sempre o mesmo número.”. Antes: Concluir o gesto descrito pela professora e manter à vista o bloco ou o resultado que ela acabou de mostrar. Não iniciar o próximo passo antes da reação. Dedé: “Se eu acertar mais uma pedra, o número muda junto!”. Retomada da professora: “O placar já vem em x 12, y 30 e tamanho 24: mantenha.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

ID video-pontos-e-placar-avatar-04. Professora até “Olha só: Pontos vai para 1!”. Antes: Manter o primeiro ponto visível, sem fazer outro disparo durante a fala. Dedé: “Acertei e ganhei um ponto!”. Retomada da professora: “E, se você acertar outra, o placar soma mais 1.”. Depois: Retomar a demonstração somente depois da saída do avatar, no ritmo da próxima fala. Manter livres os campos, os encaixes e o resultado do teste.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie a variável pontos com 0 em Ao iniciar.
- Some 1 em pontos dentro da colisão tiros × asteroides.
- Mantenha um único Somar 1 em pontos.
- Mostre Pontos: lendo a variável pontos, em x 12, y 30, tamanho 24.

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
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada quadros | Jogo 2D → Tempo → Quadros e intervalos |
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| Para cada colisão entre os grupos e | Jogo 2D → Colisões → Encostar e bloquear |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| um x aleatório na tela | Jogo 2D → Sorteios → Números e posições |
| Tirar o sprite do grupo | Jogo 2D → Grupos → Participação e limpeza |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar um asteroide em x y tamanho cor com vx vy | Jogo 2D → Kits prontos → Espaço |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D → Grupos → Criar e percorrer |
| a posição y do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| Número | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 6 na cadeia `nave-contra-asteroides`. Entrada: etapa 5; saída: etapa 6 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
