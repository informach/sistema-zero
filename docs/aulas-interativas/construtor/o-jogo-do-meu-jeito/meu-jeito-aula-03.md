# O Jogo do Meu Jeito · Aula 3 · Faça o motor da nave pulsar

Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](modulos.md).

## Resumo

- Entrada: Nave em pixel art com espaço reservado para o fogo.
- Resultado: Nave com animação voando de dois quadros a 8 quadros por segundo.
- Seções: 7. Vídeos: 6.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

A comparação entre desenhos parados, ritmo e fantasma vem antes da edição. O segundo quadro muda só o motor. A revisão formativa fica separada da galeria.

**Revisão de 02/11/2026 (decisões da responsável: experiência só com a ideia, convite à investigação e didática da aula inteira). "Quadro" é sempre o desenho da animação; a faixa Spritesheet é apresentada antes do uso. Quadros e Fantasma viraram exploração livre, e a conclusão do Fantasma saiu do vídeo para a investigação. Revisão independente de 02/11/2026: o vídeo dos quadros não responde à pergunta das páginas rápidas e o convite diz o que comparar, sem sequência de botões; o Fantasma e a folha fina param na situação.**

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Quadros e velocidade | Experiência frames antes de desenhar o fogo. | Distingue alternância de desenhos de deslocamento do corpo. |
| Fantasma do quadro anterior | Experiência onion-skin antes da duplicação e edição. | Compara o segundo fogo ao primeiro. |
| Renomear animação | Aplicação direta em Spritesheet. | O nome será usado no Estúdio; não é um teste de memorização do menu. |

## Proposta final

### Seção 1. Compare dois desenhos e uma animação

**Tarefa / Zappy na página:** Sua vez! Investigue quando o fogo da nave parece se mexer e quando ele fica parado. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-quadros → fala-quadros → experiencia-quadros.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-quadros-K1: Debinha substitui “E se as páginas passarem bem rápido?”. Antes: “em cada página? Quando você passa as páginas, o desenho muda de uma página para a outra. Cada página é um quadro.”. Depois: “O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, estes botões mostram o Quadro 1 e o”.

**Experiência em exploração livre:** `frames`, com `setup.freeExploration`. Compare os dois quadros com a Prévia parada. Depois ponha a Prévia para tocar rápido e devagar, pare a Prévia e teste os dois quadros iguais. Observe o fogo em cada teste. Você escolhe a ordem dos testes e pode repetir quando quiser. Três pistas, do que observar até a sequência; sem palpite nem pergunta final.

### Seção 2. Desenhe o primeiro fogo

**Tarefa / Zappy na página:** Agora desenhe o primeiro fogo da sua nave! No quadro 1, faça uma chama pequena logo abaixo do motor. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-primeiro-fogo → fala-primeiro-fogo.

**Aplicação no Pinta:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 3. Desenhe olhando o quadro anterior

**Tarefa / Zappy na página:** Sua vez! Investigue o que o Fantasma mostra e use ele para acertar o tamanho do fogo 2. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-fantasma → fala-fantasma → experiencia-fantasma.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-fantasma-K1: Debinha substitui “Dá para acertar o tamanho do fogo sem o Fantasma?”. Antes: “fina por cima de um desenho? Dá para ver as linhas de baixo através dela. O Fantasma funciona como essa folha fina.”. Depois: “O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, estes botões mostram o Quadro 1 e o”.

**Experiência em exploração livre:** `onion-skin`, com `setup.freeExploration`. No quadro 2, mude o tamanho do fogo com o Fantasma desligado e com ele ligado. Tente deixar o fogo 2 um pouco maior que o fogo 1, sem passar da borda. Você escolhe a ordem dos testes e pode repetir quando quiser. Três pistas, do que observar até a sequência; sem palpite nem pergunta final.

### Seção 4. Mude só o fogo no segundo quadro

**Tarefa / Zappy na página:** Agora mude só o fogo no segundo quadro! Duplique o quadro e aumente um pouco a chama, mantendo o corpo no lugar. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-segundo-fogo → fala-segundo-fogo.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-segundo-fogo-K1: Debinha substitui “Ainda está igual. Qual pedaço eu mudo?”. Antes: “quadro anterior. Repare: por enquanto, você não vê diferença, porque o quadro 2 é uma cópia igual e cobre o fantasma.”. Depois: “Só a ponta do fogo muda. Com Selecionar e mover, cerque somente a ponta do fogo e mova essa ponta um quadradinho para”.

**Aplicação no Pinta:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 5. Dê nome e ritmo à animação

**Tarefa / Zappy na página:** Agora dê nome e ritmo à animação! Nomeie a animação voando e deixe dois quadros a 8 por segundo. Quando aparecer Guardado na sua conta, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-voando → fala-voando.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 6. Confira sua nave animada

**Tarefa / Zappy na página:** Agora vamos relembrar o que você fez na sua nave, com três perguntas! Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Quiz formativo:** somente Zappy → quiz, sem vídeo ou ferramenta. Todas corretas, explicação após responder e tentativas ilimitadas, sem espera.

### Seção 7. Envie a nave animada

**Tarefa / Zappy na página:** Hora de enviar a sua nave animada! Confira se a animação voando tem dois quadros a 8 por segundo. Depois clique em Escolher no Pinta, selecione a nave e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → entrega-galeria-v6.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Conclusão exige vídeo e recebimento da entrega pela galeria.

## Continuidade e produção

Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.

O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.

A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.
