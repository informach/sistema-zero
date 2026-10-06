# O Jogo do Meu Jeito · Aula 3 · Faça o motor da nave pulsar

Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](../modulos-o-jogo-do-meu-jeito.md).

## Resumo

- Entrada: Nave em pixel art com espaço reservado para o fogo.
- Resultado: Nave com animação voando de dois quadros a 8 quadros por segundo.
- Seções: 7. Vídeos: 6.

## Diagnóstico e decisão

A comparação entre desenhos parados, ritmo e fantasma vem antes da edição. O segundo quadro muda só o motor. A revisão formativa fica separada da galeria.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Quadros e velocidade | Experiência frames antes de desenhar o fogo. | Distingue alternância de desenhos de deslocamento do corpo. |
| Fantasma do quadro anterior | Experiência onion-skin antes da duplicação e edição. | Compara o segundo fogo ao primeiro. |
| Renomear animação | Aplicação direta em Spritesheet. | O nome será usado no Estúdio; não é um teste de memorização do menu. |

## Proposta final

### Seção 1. Compare dois desenhos e uma animação

**Tarefa / Zappy na página:** Com a Prévia parada, escolha o quadro 1 e o 2. Coloque a velocidade em 2 quadros por segundo, ligue a Prévia e observe duas trocas. Mude para 8, observe por um segundo e pare a Prévia. Ligue de novo, marque Quadro 2 igual ao quadro 1 e observe por um segundo.

**Blocos na página:** video-quadros → fala-quadros → experiencia-quadros.

**Experiência existente:** `frames`. Com a Prévia parada, escolha o quadro 1 e o 2. Coloque a velocidade em 2 quadros por segundo, ligue a Prévia e observe duas trocas. Mude para 8, observe por um segundo e pare a Prévia. Ligue de novo, marque Quadro 2 igual ao quadro 1 e observe por um segundo. Sem palpite, pistas ou pergunta final.

### Seção 2. Desenhe o primeiro fogo

**Tarefa / Zappy na página:** No primeiro quadro, desenhe uma chama pequena abaixo do motor.

**Blocos na página:** video-primeiro-fogo → fala-primeiro-fogo.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 3. Use o quadro anterior como guia

**Tarefa / Zappy na página:** Escolha o quadro 2, deixe Fantasma desligado e mude o tamanho do fogo 2. Ligue Fantasma. Ajuste o tamanho até o fogo 2 ficar um pouco maior que a guia, inteiro dentro do quadro.

**Blocos na página:** video-fantasma → fala-fantasma → experiencia-fantasma.

**Experiência existente:** `onion-skin`. Escolha o quadro 2, deixe Fantasma desligado e mude o tamanho do fogo 2. Ligue Fantasma. Ajuste o tamanho até o fogo 2 ficar um pouco maior que a guia, inteiro dentro do quadro. Sem palpite, pistas ou pergunta final.

### Seção 4. Mude só o fogo no segundo quadro

**Tarefa / Zappy na página:** Duplique o quadro e aumente um pouco a chama, mantendo o corpo no lugar.

**Blocos na página:** video-segundo-fogo → fala-segundo-fogo.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 5. Dê nome e ritmo à animação

**Tarefa / Zappy na página:** Nomeie a animação voando e confira os dois quadros a 8 por segundo.

**Blocos na página:** video-voando → fala-voando.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 6. Confira sua nave animada

**Tarefa / Zappy na página:** Responda sobre o que você acabou de fazer. Leia a explicação depois de enviar e corrija o que precisar; você pode tentar de novo sem espera. Quando acertar todas, clique em Próxima seção.

**Blocos na página:** fala-revisao → quiz.

**Quiz formativo:** somente Zappy → quiz, sem vídeo ou ferramenta. Todas corretas, explicação após responder e tentativas ilimitadas, sem espera.

### Seção 7. Entregue a nave animada

**Tarefa / Zappy na página:** Confira nave tem quadros de 32 por 32; voando tem dois quadros a 8 por segundo; só o fogo muda e cabe inteiro na grade. Envie a arte desta aula pela galeria do Pinta desta seção.

**Blocos na página:** video-entrega → fala-entrega → entrega-galeria-v6.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Conclusão exige vídeo e recebimento da entrega pela galeria.

## Continuidade e produção

Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.

O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.

A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.
