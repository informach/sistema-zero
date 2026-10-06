# O Jogo do Meu Jeito · Aula 4 · Desenhe um asteroide com formas

Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](../modulos-o-jogo-do-meu-jeito.md).

## Resumo

- Entrada: Nave animada salva no Pinta.
- Resultado: Arte asteroide em vetor, 64 × 64, com corpo arredondado e crateras.
- Seções: 6. Vídeos: 6.

## Diagnóstico e decisão

A diferença entre pixel e vetor já foi experimentada. Preenchimento e contorno são comparados antes da pintura. Construir a forma, suavizar pontos e acrescentar crateras tornam-se aplicações separadas.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Preenchimento e contorno | Experiência fill-stroke antes de desenhar. | Separa cor interna de linha da borda. |
| Vetor | Retomada da experiência da aula 2. | Não repetir a mesma bancada só para cumprir uma estrutura. |
| Caneta, pontos suaves e formas | Três aplicações no Pinta. | Cada ação tem uma consequência visível no desenho e um teste próprio. |

## Proposta final

### Seção 1. Separe o miolo da borda

**Tarefa / Zappy na página:** Deixe Preenchimento com cor e Contorno em Sem cor. Depois ligue Contorno e deixe Preenchimento em Sem cor. Por fim deixe os dois com cor. Compare as três versões.

**Blocos na página:** video-preenchimento-contorno → fala-preenchimento-contorno → experiencia-cores.

**Experiência existente:** `fill-stroke`. Deixe Preenchimento com cor e Contorno em Sem cor. Depois ligue Contorno e deixe Preenchimento em Sem cor. Por fim deixe os dois com cor. Compare as três versões. Sem palpite, pistas ou pergunta final.

### Seção 2. Prepare o desenho em vetor

**Tarefa / Zappy na página:** Crie um personagem em Vetor, tamanho Médio, chamado asteroide.

**Blocos na página:** video-novo-asteroide → fala-novo-asteroide.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 3. Feche a forma da pedra

**Tarefa / Zappy na página:** Desenhe uma pedra com a Caneta e feche a forma.

**Blocos na página:** video-forma-pedra → fala-forma-pedra.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 4. Arredonde os pontos

**Tarefa / Zappy na página:** Transforme alguns cantos em curvas para dar forma à pedra.

**Blocos na página:** video-curvas → fala-curvas.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 5. Acrescente crateras

**Tarefa / Zappy na página:** Desenhe pequenas formas dentro da pedra.

**Blocos na página:** video-crateras → fala-crateras.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 6. Entregue seu asteroide

**Tarefa / Zappy na página:** Confira asteroide é Vetor de 64 por 64; tem forma fechada, curvas e crateras dentro do corpo; sobra espaço acima para as chamas. Envie a arte desta aula pela galeria do Pinta desta seção.

**Blocos na página:** video-entrega → fala-entrega → entrega-galeria-v6.

**Aplicação no Pinta:** o roteiro inclui o caminho, a ação e a autoconferência visual. Conclusão exige vídeo e recebimento da entrega pela galeria.

## Continuidade e produção

Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.

O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.

A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.
