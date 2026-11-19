# Implementação da etapa 5: level design

Execução direta com `executing-plans`, seguindo a autorização da missão.

**Objetivo:** fechar autoria e consumo das ferramentas profissionais existentes.

**Arquitetura:** operações puras, componentes atuais e contrato de cena comum.
**Tecnologias:** TypeScript, React, Bun e Playwright existentes.
**Especificação:** `docs/plans/2026-11-19-pinta-level-design-design.md`.

- [x] Reproduzir o modelo girado cortado pela UI atual. Implementar
  `tiles/objectTemplate.ts` e testes, reutilizando geometria e conjuntos.
  Integrar `MapLibraryPanel.tsx`, recusando limites antes de salvar.
- [x] Ensaiar no navegador guardar/reutilizar modelo transformado, histórico e
  reabertura; verificar recursos, propriedades e relações pelos adaptadores.
- [x] Ensaiar autoria de formas/caminhos/zonas/portas/colisões, propriedades
  de objeto/camada, grupos, frente, parallax e animação. Conferir documento salvo
  e consultas/render dos consumidores. Corrigir causas reais com regressões.
- [ ] Rever, executar gates, registrar evidência por ambiente e limitações,
  commit e integração de staging conforme autorização. Não alterar projeto 3D.
