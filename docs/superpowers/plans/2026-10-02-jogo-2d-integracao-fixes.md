# Correção da segunda revisão de Jogo 2D

**Goal:** corrigir N1–N9 da revisão, mantendo blocos simples no básico e operações combináveis no Avançado.
**Architecture:** o controlador compartilhado fornece projeção e ciclo de vida; os motores continuam donos da aparência, animação e pools. Encontros por molde recebem instâncias futuras sem funções próprias do aluno. A compactação existente remove apenas conteúdo não executável do runtime entregue.
**Tech Stack:** TypeScript, strings JavaScript, Blockly, IR/Zod, Bun, Playwright.
**Spec:** `.audits/architectural-analysis-2026-10-02-jogo-2d-pos-correcao.md`; usuário autorizou “Corrija todos os achados”. Execução direta, sem novo pedido de aprovação, commit ou deploy.

## Restrições e decisões

- Não restaurar os 19 blocos/APIs antigos nem criar compatibilidade oculta.
- Conservar o teto de 790.000 bytes do Reino Zero.
- Preferir `compactOfficialRuntimeSource` já existente a introduzir minificador ou detecção incompleta de uso por projeto. Conferir equivalência de tokens do runtime.
- Encontros por molde: novo evento específico no Avançado, `onTrackMoldEncounter(name, mold, fn)`, com seletor nativo de molde e nome local do encontrado. O evento por sprite conserva seu significado; não transformar silenciosamente instância em molde.
- A geometria projetada deve ser calculável antes do desenho; recolhimento preserva quem ainda vai entrar na vista e remove quem já passou. Barras de vida associadas à pista são desenhadas no passe dos sprites.
- HUD básico habilita sua própria pausa/continuação, sem instalar tela inicial ou decidir vitória automaticamente.

## Execução e evidências

- [x] N1: em `game-2d/runtime.ts`, compactar a fonte pela função existente; teste de tokens em `game-2d/__tests__/bundle.test.ts`; verificar orçamento E2E sem mudar o teto.
- [x] N2: em `spriteHosts.ts`, configurar folha apenas quando imagem/dimensões mudarem; promover testes de animação contínua, uma vez e troca para `snowDescentRuntime.test.ts`.
- [x] N3/N4/N6: em `spriteRuntime.ts`, `spriteContract.ts`, pool avançado e `runtime/visualEffects.ts`, centralizar liberação e projeção; verificar reciclagem no mesmo quadro, cópia e original, objetos futuros/visíveis/passados, câmera e barra de vida.
- [x] N5: propagar evento por molde pelo catálogo, seletor, IR, codecs, escopo, contexto de encontro, contrato/runtime e documentação. Testar código/blocos/código e três ondas com encontros, coleta e reutilização reais.
- [x] N7: em `codec.ts` e `generators/js.ts`, normalizar o parâmetro pelo mesmo resolvedor do corpo; testar nomes reservados e normalizados no workspace.
- [x] N8/N9: tornar a pausa do HUD independente e interromper processamento após transições globais; testar toque, P, continuar, reiniciar e duas pistas, preservando usos normais sem telas.
- [x] Validar: suíte inteira do Studio, tipos de todos os pacotes, Biome dos arquivos alterados, sincronização de neve e índice, Chromium nos três exemplos, seletores, desktop/celular e Reino Zero. Atualizar relatório com resultados novos, preservando achados como histórico. Tipos globais: executados; 26 pacotes aprovados e falha em alterações paralelas de `referrals`, registrada no relatório.

Reproduções iniciais: `bun test ./.cache/review2-native.test.ts ./.cache/review2-scene.test.ts ./.cache/review2-codec.test.ts` no Studio. A receita inválida de evento aninhado continuará inválida; sua regressão correta será a composição equivalente com evento por molde na área de eventos. Cada lote ganha testes permanentes e é verificado antes do seguinte.

Resultado: N1–N9 corrigidos; 8.712 testes do Studio e dez casos Chromium aprovados. Preview do Reino Zero em 734.712 bytes, abaixo do teto original de 790.000. Tipos do Studio aprovados após a extração de moldes/reciclagem para `runtime/pools.ts`; Biome limpo em 93 arquivos. A checagem global encontrou uma falha independente em `referrals`; nenhuma alteração foi feita nesse pacote por este trabalho. Evidências e limitações em `.audits/architectural-analysis-2026-10-02-jogo-2d-pos-correcao.md`, seção final.
