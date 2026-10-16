# Studio Pro — execução do lote 8

Continuação do escopo aprovado, sem reduzir a matriz GameDev. O lote 7 encerrou a revisão funcional; critérios transversais permanecem no lote 9. Fontes Canvas da sessão paralela estão liberadas.

## Decisões de implementação

- `canvas-grid-arena`: portar os conceitos de PocketBomber para regras TypeScript puras, grade, obstáculos, pavio, pulsos em cruz, interrupção por parede, reação em cadeia, saída segura, vitória/derrota e reinício com a mesma semente. Visual procedural lúdico, sem copiar assets externos. Simulação em passo fixo e limites de entidades.
- `phaser-tactics`: tabuleiro com camadas visuais e unidades por turnos, seleção por teclado/toque, alcance por BFS, ocupação, mover/agir/esperar, recrutamento limitado e oponente determinístico. Grid lógico separado do tamanho do sprite, pivô e desenho. Phaser npm fixado, sem CDN.
- `three-tactics`: mesmas regras de turnos e cenário, renderização Three isométrica com seleção por raycast e teclado/toque. Reutilizar dados/regras, mantendo renderers independentes e propriedade explícita de recursos. A pasta Threejs Tactics contém referências e documentos, não os fontes completos prometidos no README; esta implementação será própria.
- Fontes físicas em `pro-kits/` e geração determinística do texto entregue ao aluno. Modelos puros importados diretamente pelos testes. Factories assíncronas incluem somente os arquivos necessários ao kit escolhido. Shared continua dono de menu, pausa, input, som opt-in, progresso local e descarte.
- Inspeção somente de leitura: adicionar dados de grade/turno/unidades/pulsos ao contrato, sem comandos de mutação. Atualizar os drivers explicitamente para cada ID, nunca tratar kit desconhecido como arcade. Testes de objetivo usam entrada real e estado observado.
- Expandir a curadoria de Zappy por tarefa (regras, arte, acessibilidade, nível, balanceamento e áudio), com poucos trechos pertinentes, origem identificada e limites de contexto. Não importar o corpus de skills no prompt.
- Completar os caminhos de configuração/inspeção de sprites, modelos, áudio e HUD usando os contratos de Materiais e os adapters Pinta/Molda/Pensa existentes. Recursos de terceiros sem licença/asset completo continuam referências identificadas, não assets disponibilizados.

## Revisão e provas do lote

1. Regras puras: propagação/bloqueios/encadeamento, determinismo, fim de jogo; movimento em turnos, alcance/ocupação, ações únicas, recrutamento/capacidade, vitória/derrota e resets.
2. Fontes entregues: geração conferida, typecheck e Vite reais, lock compatível, export independente e envelopes sem aumentar limites.
3. Chromium: menu, controles, pausa, derrota/vitória, reinício, resize/touch, retorno de aba e descarte. Reutilizar o runtime isolado e os drivers de objetivo/performance.
4. Matriz GameDev: registrar o destino de cada família/skill de pipeline e as limitações comprovadas. Desempenho final no host, soak e publicação permanecem no lote 9.

## Referências lidas novamente nesta fatia

- PocketBomber: `src/explosion.lua` (paredes bloqueiam propagação; bloco destrutível entra na explosão e a interrompe), `src/bomb.lua` (pavio por dt), inventário dos estados/input/save.
- `vibejam-starter-pack-main/.agents/skills/tinyswords-tilemap/SKILL.md`: grade 64 px, desenho que pode exceder a célula, ordem água/espuma/chão/sombra/elevação e offsets.
- Threejs Tactics: README distingue materiais públicos de fontes completos não presentes; nota de fases/cutscene recomenda bloquear entrada de batalha durante diálogo e centralizar a transição de início. Usar estados explícitos, sem copiar dependências ou personagens ausentes.
