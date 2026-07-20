# Correções do ciclo de vida e das áreas de Comportamento

## Objetivo

Consolidar a divisão do bloco **Comportamento** nas áreas **Ao iniciar**, **Eventos** e **Durante o jogo**, corrigindo contratos de posicionamento, ciclo de vida de recursos gerados, catálogo das extensões oficiais e documentação.

## Regras aprovadas

- Comandos contínuos podem aparecer no corpo de loops e no corpo de funções ou métodos.
- Comandos contínuos não podem aparecer diretamente em **Ao iniciar**, eventos ou construtores.
- Recursos persistentes e comandos de disparo único podem iniciar em **Ao iniciar**, eventos, funções ou métodos, mas são proibidos dentro de loops.
- Reiniciar um projeto gerenciado no mesmo documento deve cancelar listeners, timers, intervalos e animações da execução anterior.

## Desenho

### Contratos de posicionamento

Um contrato tipado e central será a fonte de verdade para blocos contínuos. Blockly e validação semântica usarão a mesma classificação bloco → statement, evitando regras divergentes entre toolbox, conexões físicas e IR.

O validador de ciclo de vida distinguirá contexto contínuo de profundidade de loop sintático. Assim, um comando contínuo será aceito em loops do motor, loops sintáticos e funções/métodos, sem conceder semântica de `break`/`continue` a callbacks do motor. Construtores permanecerão excluídos.

Os comandos persistentes/de disparo único identificados no Game Kit serão incorporados ao contrato de criadores de recursos já existente, que os impede de executar repetidamente sob loops.

### Recursos da execução gerenciada

O `ProjectRunContext` continuará como proprietário da execução. O gerador registrará limpeza explícita para listeners nomeados, timeouts, intervalos e `requestAnimationFrame`, além dos recursos que já eram gerenciados. O JavaScript continuará legível e o parser reconhecerá apenas o invólucro exato produzido pelo gerador, preservando o round-trip do IR.

### Catálogo e documentação

Todos os blocos contínuos das extensões afetadas serão auditados por semântica, não apenas pelo texto da tooltip. Versões das extensões com contrato público alterado serão incrementadas. As referências internas, o guia de extensões e a pesquisa histórica serão atualizados para descrever as três áreas e as regras reais de ciclo de vida.

## Estratégia de verificação

Cada causa-raiz receberá primeiro um teste de regressão que falhe no estado atual. Depois da implementação serão executados testes focais, round-trip, suíte completa de `src`, typecheck, Biome e os cenários E2E de comportamento. Alterações não relacionadas já presentes no worktree serão preservadas.
