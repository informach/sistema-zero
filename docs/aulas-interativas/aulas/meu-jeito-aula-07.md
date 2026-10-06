# O Jogo do Meu Jeito · Aula 7 · Faça suas pedras nascerem animadas

Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](../modulos-o-jogo-do-meu-jeito.md).

## Resumo

- Entrada: Jogo com nave autoral animada; asteroide já adicionado aos materiais.
- Resultado: Nave e asteroides autorais animados no mesmo jogo, com tiro, pontos e vidas.
- Seções: 6. Vídeos: 5.

## Diagnóstico e decisão

O relógio de nascimento e a velocidade da animação são comparados antes dos encaixes. A troca do criador conserva o sorteio, o grupo e a velocidade. Animar fica logo depois de criar cada pedra, dentro da condição jogando.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Dois ritmos | Experiência two-clocks na abertura. | Nascer mais vezes não é animar mais rápido. |
| Folha 64 × 64 | Retomada da aula 6 com a dimensão do asteroide. | O tamanho escolhido no Pinta determina o recorte. |
| Criar e animar cada novo sprite | Aplicação dentro do relógio já existente. | Cada pedra recebe o comando depois que existe. |

## Proposta final

### Seção 1. Compare nascer e animar

**Tarefa / Zappy na página:** Agora mude os dois relógios e compare as pedras que nascem.

**Blocos na página:** video-dois-relogios → fala-dois-relogios → experimento-dois-relogios.

**Experiência existente:** `two-clocks`. Deixe Desenhos por segundo de cada pedra em 8 e A cada quantos quadros nasce uma pedra em 20. Clique em Voltar ao começo e no Tempo, o botão com o triângulo. Deixe nascerem três pedras e veja o número em cada uma ao entrar. Clique em Tempo para parar. Mude o nascimento para 40 e os desenhos por segundo para 16. Clique em Voltar ao começo, ligue Tempo e observe por três segundos. Sem palpite, pistas ou pergunta final.

### Seção 2. Prepare a folha do asteroide

**Tarefa / Zappy na página:** Carregue folha-asteroide com quadros de 64 por 64.

**Blocos na página:** video-folha-pedra → fala-folha-pedra.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 3. Troque a imagem das pedras que nascem

**Tarefa / Zappy na página:** Substitua o criador das pedras, preservando o grupo, o sorteio e a velocidade.

**Blocos na página:** video-trocar-pedra → fala-trocar-pedra.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 4. Anime cada pedra depois de criar

**Tarefa / Zappy na página:** Coloque a animação girando logo abaixo do criador, dentro do mesmo Se.

**Blocos na página:** video-animar-pedra → fala-animar-pedra.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação e a autoconferência visual. Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 5. Confira as artes dentro do jogo

**Tarefa / Zappy na página:** Responda sobre o que você acabou de fazer. Leia a explicação depois de enviar e corrija o que precisar; você pode tentar de novo sem espera. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Quiz formativo:** somente Zappy → quiz, sem vídeo ou ferramenta. Todas corretas, explicação após responder e tentativas ilimitadas, sem espera.

### Seção 6. Envie o jogo com as duas artes

**Tarefa / Zappy na página:** Confira: nave e pedras usam suas animações; pelo menos três pedras nasceram animadas; tiros, pontos e perda de vida continuam funcionando. Depois, envie o cartão do seu jogo para o guia pela galeria do Estúdio.

**Blocos na página:** video-entrega → fala-entrega → entrega-galeria-v6.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação e a autoconferência visual. Conclusão exige vídeo e recebimento da entrega pela galeria.

## Continuidade e produção

Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.

O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.

A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.
