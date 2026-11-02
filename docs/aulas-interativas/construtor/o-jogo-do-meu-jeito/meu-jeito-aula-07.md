# O Jogo do Meu Jeito · Aula 7 · Faça suas pedras nascerem animadas

Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](modulos.md).

## Resumo

- Entrada: Jogo com nave autoral animada; asteroide já adicionado aos materiais.
- Resultado: Nave e asteroides autorais animados no mesmo jogo, com tiro, pontos e vidas.
- Seções: 6. Vídeos: 5.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

O relógio de nascimento e a velocidade da animação são comparados antes dos encaixes. A troca do criador conserva o sorteio, o grupo e a velocidade. Animar fica logo depois de criar cada pedra, dentro da condição jogando.

**Revisão de 02/11/2026 (decisões da responsável: experiência só com a ideia, convite à investigação e didática da aula inteira). Os dois relógios ganharam a analogia da máquina de piões; "quadro" é só o do jogo na experiência e o desenho da folha é explicado na montagem. A experiência virou exploração livre. Revisão independente de 02/11/2026: os piões não dizem mais que cada um gira no seu ritmo; as montagens abrem o Estúdio antes da partida; os campos do criador das pedras saem em frases curtas, com o que já vem no bloco.**

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Dois ritmos | Experiência two-clocks na abertura. | Nascer mais vezes não é animar mais rápido. |
| Folha 64 × 64 | Retomada da aula 6 com a dimensão do asteroide. | O tamanho escolhido no Pinta determina o recorte. |
| Criar e animar cada novo sprite | Aplicação dentro do relógio já existente. | Cada pedra recebe o comando depois que existe. |

## Proposta final

### Seção 1. Compare nascer e animar

**Tarefa / Zappy na página:** Sua vez! Investigue o que cada relógio muda nas pedras. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-dois-relogios → fala-dois-relogios → experimento-dois-relogios.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-dois-relogios-K1: Debinha substitui “Se a máquina soltar mais rápido, os piões giram mais rápido também?”. Antes: “vezes a cada segundo. Pense numa máquina que solta piões: ela solta um pião novo de tempos em tempos, e cada pião gira.”. Depois: “O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, você escolhe o relógio de nascer,”.

**Experiência em exploração livre:** `two-clocks`, com `setup.freeExploration`. Mude um relógio de cada vez, volte ao começo e deixe o tempo passar. Compare quantas pedras nascem, o giro de cada uma e o desenho que cada pedra mostra quando entra. Você escolhe a ordem dos testes e pode repetir quando quiser. Três pistas, do que observar até a sequência; sem palpite nem pergunta final.

### Seção 2. Prepare a folha do asteroide

**Tarefa / Zappy na página:** Agora prepare a folha do seu asteroide! Carregue folha-asteroide com quadros de 64 por 64 no fim de Ao iniciar. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-folha-pedra → fala-folha-pedra.

**Aplicação no Estúdio:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 3. Troque a imagem das pedras que nascem

**Tarefa / Zappy na página:** Agora troque a imagem das pedras que nascem! Substitua o criador das pedras, conservando o grupo, o sorteio e a velocidade. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-trocar-pedra → fala-trocar-pedra.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-trocar-pedra-K1: Debinha substitui “Por que a pedra ficou espremida?”. Antes: “imagem. Agora comece a partida. Olha só: as suas imagens caem em lugares diferentes, porque o sorteio continua no x.”. Depois: “É que cada pedra ainda mostra a folha inteira, com os dois desenhos. Falta ligar a animação de cada pedra, e isso fica”.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 4. Anime cada pedra depois de criar

**Tarefa / Zappy na página:** Agora anime cada pedra depois de criar! Coloque a animação girando logo abaixo do criador, dentro do mesmo Se. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-animar-pedra → fala-animar-pedra.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 5. Confira as artes dentro do jogo

**Tarefa / Zappy na página:** Agora vamos relembrar como as suas artes entraram no jogo, com três perguntas! Se errar alguma, leia o porquê, clique em Tentar de novo e responda outra vez. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Quiz formativo:** somente Zappy → quiz, sem vídeo ou ferramenta. Todas corretas, explicação após responder e tentativas ilimitadas, sem espera.

### Seção 6. Envie o jogo com as duas artes

**Tarefa / Zappy na página:** Hora de enviar o seu jogo com as duas artes! Confira se a nave e as pedras usam as suas animações. Depois clique em Escolher no Estúdio, selecione o cartão do seu jogo e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → entrega-galeria-v6.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Conclusão exige vídeo e recebimento da entrega pela galeria.

## Continuidade e produção

Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.

O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.

A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.
