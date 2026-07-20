# Correções da revisão do Jogo 2D

## Escopo

Corrigir os defeitos encontrados no runtime da extensão Jogo 2D sem quebrar projetos salvos. Todos os blocos `sz_g2d_*` pertencem ao nível `iniciante-2d`; as aulas controlam quais deles aparecem. A regra não abrange a extensão Jogo 2D Avançado (`sz_gk_*`).

## Desenho

- Restaurar o estado do canvas com `try/finally` em toda alteração temporária de pilha ou opacidade.
- Associar cada redraw assíncrono à imagem que ainda pertence ao sprite. Quando a carga terminar, passar pela pipeline normal de desenho para respeitar câmera, rotação, flip e opacidade.
- Definir um único retângulo visível em coordenadas de mundo e usá-lo nos limites, no chão e na poda de tiros dos inimigos prontos.
- Suspender o driver de animação durante a pausa, zerar o relógio acumulado e reiniciá-lo ao continuar.
- Usar `GAME_TWO_D_LIFECYCLE_GUIDANCE` nas instruções consumidas pela extensão para manter uma fonte pedagógica única.
- Resolver qualquer tipo `sz_g2d_*` como `iniciante-2d` e remover exceções contraditórias dos conjuntos intermediário e avançado.

### Vidas

- Substituir, na paleta, o bloco manual de corações por um bloco que recebe o sprite e lê sua vida atual. O bloco oferece o seletor `corações`/`barra`; `x`, `y`, tamanho e cor continuam configuráveis. O bloco manual permanece registrado, porém oculto, para abrir projetos antigos.
- Em corações, `tamanho` representa o diâmetro de cada coração. Em barra, representa a largura; a altura é calculada automaticamente e a proporção preenchida usa vida atual e vida máxima.
- Adicionar o repórter positivo `as vidas do sprite acabaram?`. Ele só retorna verdadeiro quando a vida foi inicializada e chegou a zero. Para sprites sem vida inicializada, retorna falso e emite uma orientação pedagógica uma única vez.
- Manter `ainda tem vida?` para compatibilidade e adicionar o repórter de vida máxima.
- Preservar o invariante `0 <= vida atual <= vida máxima`: normalizar valores iniciais, rejeitar alterações inválidas e orientar quando alguém tenta alterar uma vida ainda não inicializada.
- Marcar a inicialização de vidas como configuração inicial, evitando que o bloco seja repetido no loop principal. Para dano contínuo, fornecer um bloco genérico de dano com quadros de invencibilidade e reutilizar a mesma regra nos kits prontos.

### Temporizadores, kits e colisões

- Normalizar intervalos fracionários ou inválidos de `a cada N quadros` para pelo menos um quadro.
- Tornar cada bloco de recarga independente, usando uma chave estável gerada pelo próprio bloco, sem quebrar chamadas antigas do runtime.
- Fazer os kits responsivos recalcularem sua geometria quando o tamanho lógico do palco mudar, preservando fase, pontuação e progresso.
- Adicionar uma fase ampla às colisões entre grupos grandes, mantendo a ordem determinística dos pares e a semântica de remoção durante callbacks.

### Acessibilidade e ensino

- Adicionar um bloco inicial para descrever objetivo e controles do jogo a leitores de tela, com suporte completo no IR, gerador, parser, runtime e documentação.
- Usar esse bloco nos exemplos interativos que hoje só desenham instruções no canvas.
- Reorganizar a documentação por tarefas de criação, sem linguagem de níveis ou versões, mantendo todas as categorias encontráveis.
- Continuar classificando toda a extensão Jogo 2D como `iniciante-2d`; o volume da paleta será administrado pelas aulas, não por mudança de nível.

## Verificação

Cada defeito terá um teste de regressão que falha antes da correção e passa depois dela. A entrega também exige testes da extensão, testes globais do Studio, typecheck, Biome e os cenários E2E do Jogo 2D em Chromium.
