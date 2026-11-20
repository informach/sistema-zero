# Renderização sob pressão — plano de implementação

**Objetivo:** reduzir o custo de mapas com working set acima do cache,
conservando os pixels, o orçamento e a interface.

**Arquitetura:** um caminho de desenho direto no compositor existente,
condicionado por pressão e equivalência de rasterização. O cache permanece
como caminho geral. TypeScript, Canvas 2D, Bun, Playwright/CDP.

**Design:** `docs/plans/2026-11-19-pinta-render-sob-pressao-design.md`.

Executar diretamente com `executing-plans`, sem subagentes ou aprovação
entre tarefas, conforme instrução do usuário. Preservar todo o trabalho 3D.

## 1. Referência e núcleo

- [x] Ajustar somente o probe para usar a suavização do palco real; repetir
  baseline com três aquecimentos/dez execuções e guardar perfil e imagens.
- [x] Criar casos em `packages/pinta/src/tiles/chunks.test.ts` para pixels,
  pressão, flags, transparência, offsets, animação e recusa de efeitos.
- [x] Implementar em `chunks.ts` uma única estratégia sob pressão; conferir
  acessos às células na arquitetura existente e não duplicar decodificação.

## 2. Consumidor real e desempenho

- [x] Exercitar Chromium com comparação completa da imagem anterior,
  palco/rolagem/edição/animação; simulações de CPU e toque separadas.
- [x] Repetir baseline, percentis, perfil e memória; não confundir os tempos
  de persistência com o tempo de composição nem prometer aparelhos físicos.

## 3. Fechamento

- [x] Executar tipos, Pinta e regressões pertinentes, revisar e corrigir.
- [ ] Documentar resultados/limites, commitar e integrar staging preservando
  as alterações concorrentes. Atualizar a etapa 8a sem encerrar o restante.
