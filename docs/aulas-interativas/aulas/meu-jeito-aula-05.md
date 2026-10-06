# O Jogo do Meu Jeito · Aula 5 · Anime as chamas e as crateras

Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](../modulos-o-jogo-do-meu-jeito.md).

## Resumo

- Entrada: Asteroide em vetor com corpo e crateras.
- Resultado: Nave e asteroide animados, guardados na galeria do Pinta.
- Seções: 8. Vídeos: 7.

## Diagnóstico e decisão

A ordem das formas é experimentada antes de desenhar as chamas. O tamanho da mudança é experimentado antes do segundo quadro. O nome girando identifica a animação; não promete uma rotação completa que os dois desenhos não fazem.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Ordem de sobreposição | Experiência layers antes das chamas. | Mostra por que uma forma pode encobrir outra. |
| Mudança local entre quadros | Experiência motion-amount antes do quadro 2. | Distingue detalhe animado de corpo inteiro pulando. |
| Duplicar e animar | Retomada da aula 3 aplicada ao vetor. | A regra dos quadros continua; agora as edições usam formas e pontos. |

## Proposta final

### Seção 1. Troque o que fica na frente

**Tarefa / Zappy na página:** Agora suba e desça a pedra na lista Camadas e veja qual fica na frente.

**Blocos na página:** video-camadas → fala-camadas → experimento-camadas.

**Experiência existente:** `layers`. Na lista Camadas, coloque a pedra acima da chama usando Uma camada para a frente na linha da pedra. Depois clique em Uma camada para trás nessa linha e observe o que fica coberto. Traga a pedra para a frente novamente e compare a ordem da lista. Sem palpite, pistas ou pergunta final.

### Seção 2. Desenhe fogo atrás da pedra

**Tarefa / Zappy na página:** Acrescente uma chama acima do asteroide e coloque-a atrás do corpo.

**Blocos na página:** video-chama → fala-chama.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 3. Acrescente um centro mais claro

**Tarefa / Zappy na página:** Faça uma chama menor dentro da primeira, atrás da pedra.

**Blocos na página:** video-miolo-fogo → fala-miolo-fogo.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 4. Compare mudanças entre quadros

**Tarefa / Zappy na página:** Agora mude só a cratera, depois a pedra inteira, e compare a Prévia.

**Blocos na página:** video-mudanca-pequena → fala-mudanca-pequena → experimento-tanto-que-muda.

**Experiência existente:** `motion-amount`. Deixe O tanto que a cratera anda e O tanto que a pedra inteira anda em 0 e olhe a Prévia tocar por um instante. Se ela estiver parada, clique em Tocar a Prévia. Deixe a pedra em 0 e coloque a cratera em 4; olhe outra vez. Depois coloque a pedra inteira em 10 e compare a Prévia. Sem palpite, pistas ou pergunta final.

### Seção 5. Mude detalhes no segundo quadro

**Tarefa / Zappy na página:** Duplique o quadro e altere um pouco as crateras e as pontas das chamas.

**Blocos na página:** video-quadro-pedra → fala-quadro-pedra.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 6. Confira o ritmo da pedra

**Tarefa / Zappy na página:** Nomeie a animação girando e teste dois quadros a 8 por segundo.

**Blocos na página:** video-girando → fala-girando.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 7. Confira as duas artes

**Tarefa / Zappy na página:** Responda sobre o que você acabou de fazer. Leia a explicação depois de enviar e corrija o que precisar; você pode tentar de novo sem espera. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Quiz formativo:** somente Zappy → quiz, sem vídeo ou ferramenta. Todas corretas, explicação após responder e tentativas ilimitadas, sem espera.

### Seção 8. Envie suas duas artes

**Tarefa / Zappy na página:** Confira: nave tem 32 por 32 e voando; asteroide tem 64 por 64 e girando; cada animação tem dois quadros a 8 por segundo, sem cortes nas bordas. Depois, envie a nave e o asteroide para o guia pela galeria do Pinta.

**Blocos na página:** video-entrega → fala-entrega → entrega-galeria-v6.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Conclusão exige vídeo e recebimento da entrega pela galeria.

## Continuidade e produção

Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.

O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.

A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.
