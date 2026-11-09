# Corre, Dino! · Aula 3 · Faça o Dino cair e pular

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Dino parado diante da floresta.
- Resultado da aula: Gravidade e controles de pulo, com impulso de referência 14.
- Seções: 6. Vídeos: 5.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Gravidade e impulso são observados antes de cada montagem. Não é preciso programar primeiro um pulo sem gravidade para fabricar um defeito. O quiz retoma preparação, desenho, gravidade e impulso depois dos testes.

**Revisão de 02/11/2026.** Gravidade e impulso passaram à exploração livre, com a bola jogada para cima e a cama elástica, a pergunta da Debinha devolvida e o convite a investigar, sem apontar os controles. A montagem do pulo, a mais carregada do curso, virou uma fala por momento (o porquê da ordem, o destino, o bloco, "É este bloco que…", o nome, a força do pulo ligada ao impulso, o teste por tecla e o teste por toque) e começa por Atualizar, como a nota de tela pede. A gravidade diz por que o Dino ainda não se mexe sem contradizer a experiência. A retomada do pulo diz a relação ("com mais impulso, o pulo ia mais alto"), porque a criança pode não ter testado o 14. No quiz, "Criar faz o Dino existir" e "O que está faltando?".

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Gravidade | gravity antes de aplicar | Ver o que acontece no ar com e sem gravidade. |
| Impulso e pulo | impulse antes de controlar | Comparar dois saltos mantendo a gravidade. |

## Proposta final

### Seção 1. O que traz o Dino de volta?

**Tarefa:** Sua vez! Investigue o que acontece com o pulo do Dino com e sem gravidade. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-gravidade-modelo → fala-gravidade-modelo → experiencia-gravidade.

**Recado na página (não gravar):** Sua vez! Investigue o que acontece com o pulo do Dino com e sem gravidade. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-gravidade-modelo-K1: Debinha substitui “E sem gravidade, o Dino volta para o chão depois do pulo?”. Antes: “bola para cima? Ela não fica lá no alto para sempre. No seu jogo, o Dino vai pular. E o jogo pode ter gravidade ou não.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o pulo do Dino sem gravidade e com”.

**Experiência em exploração livre:** `gravity` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/gravity.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/gravity.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o pulo do Dino sem gravidade e com gravidade, de olho no número da altura. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Com a gravidade desligada, clique em Pular e observe o número da altura. Depois do pulo sem gravidade, clique em Ligar a gravidade e observe o Dino até o fim.

**Pistas, do aberto ao direto:** 1) Clique em Pular e olhe o número da altura. Ele para de crescer? 2) Com o Dino lá no alto, ligue a gravidade e observe o número. 3) Com a gravidade desligada, clique em Pular; com o Dino no ar, clique em Ligar a gravidade. Sem palpite e sem pergunta final.

### Seção 2. Deixe a gravidade pronta

**Tarefa:** Agora deixe a gravidade pronta no seu Dino! Coloque Aplicar a gravidade do mundo ao sprite depois da floresta e antes do desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-aplicar-gravidade → fala-aplicar-gravidade.

**Recado na página (não gravar):** Agora deixe a gravidade pronta no seu Dino! Coloque Aplicar a gravidade do mundo ao sprite depois da floresta e antes do desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Deixe a gravidade depois da floresta.
- Aplique gravidade ao dino dentro do quadro, antes de desenhar.

### Seção 3. Quanto o Dino sobe?

**Tarefa:** Sua vez! Investigue o que o impulso muda no pulo do Dino. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-impulso-modelo → fala-impulso-modelo → experiencia-impulso.

**Recado na página (não gravar):** Sua vez! Investigue o que o impulso muda no pulo do Dino. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-impulso-modelo-K1: Debinha substitui “E com mais impulso, até onde o Dino chega?”. Antes: “força ou com muita força. No seu jogo, você escolhe o impulso do Dino. A gravidade continua a mesma em todos os pulos.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que o impulso muda na altura dos”.

**Experiência em exploração livre:** `impulse` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/impulse.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/impulse.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare as marcas da altura dos pulos com impulsos diferentes. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Pular e espere o salto terminar. Pule com Impulso 9 e depois com Impulso 14, esperando cada salto terminar.

**Pistas, do aberto ao direto:** 1) A marca azul é o salto de antes; a laranja, o deste. 2) Mude só o impulso. A gravidade fica igual. 3) Clique em Impulso 14 e depois em Pular, e compare as marcas. Sem palpite e sem pergunta final.

### Seção 4. Dê os controles de pulo ao Dino

**Tarefa:** Agora dê os controles de pulo ao seu Dino! Coloque Controlar o dinossauro entre a gravidade e o desenho, com força do pulo 14, e teste espaço, seta para cima e um toque na parte de cima da tela. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-comando-de-pulo → fala-comando-de-pulo.

**Recado na página (não gravar):** Agora dê os controles de pulo ao seu Dino! Coloque Controlar o dinossauro entre a gravidade e o desenho, com força do pulo 14, e teste espaço, seta para cima e um toque na parte de cima da tela. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-comando-de-pulo-K1: Debinha substitui “Dá para pular de novo lá no alto?”. Antes: “porque o mesmo bloco cuida dos três controles. Se você tocar embaixo, perto do chão, o Dino se abaixa em vez de pular.”. Depois: “Vamos ver. Agora toque duas vezes na barra de espaço durante o mesmo salto. Repare: o segundo toque não faz o Dino”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Aplique gravidade ao dino antes do controle do pulo.
- Deixe a gravidade depois da floresta.
- Encaixe Controlar o dinossauro dino antes de desenhá-lo.

### Seção 5. Confira o que você construiu

**Tarefa:** Hora de lembrar o que você construiu! As perguntas falam da tela e dos movimentos do seu Dino. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam da tela e dos movimentos do seu Dino. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 6. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Teste os três controles de pulo, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Teste os três controles de pulo, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Aplique gravidade ao dino antes do controle do pulo.
- Controle o dino com a sua força de pulo, antes de desenhá-lo.
- Desenhe o sprite dino dentro de A cada quadro.
- Desenhe a floresta em movimento antes do Dino.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D → Movimento → Velocidade e gravidade |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Controlar o dinossauro , força do pulo | Jogo 2D → Kits prontos → Dino |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 3 na cadeia `corre-dino`. Entrada: etapa 2; saída: etapa 3 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
