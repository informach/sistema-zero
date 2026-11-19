# Plano: pincel de objetos e conjuntos

Execução direta na worktree isolada, usando `executing-plans` e verificação antes
dos commits. A missão já autoriza seguir sem aprovação entre etapas.

**Objetivo:** pintar decorações com densidade, afastamento, variação determinística,
prévia e um histórico por gesto.

**Arquitetura:** núcleo genérico em `tiles/objectScatter.ts`, clonagem e inserção
em lote compartilhadas; hook de gesto no editor; controles e ferramenta na
oficina existente. Sem dependência ou formato novo.

**Especificação:** `docs/plans/2026-11-19-pinta-espalhar-objetos-design.md`.

- [ ] Testar e implementar clonagem com IDs estáveis de prévia e inserção em lote,
  preservando normalização, referências, bloqueio e o comportamento da inserção única.
- [ ] Testar e implementar o núcleo de amostras, semente, distância, transformações,
  clipping e teto transacional; reutilizar os algoritmos existentes.
- [ ] Registrar ferramenta/atalho/curadoria e painel de opções; implementar o gesto
  com prévia, interpolação, commit e cancelamentos seguros. Conferir recusas do host.
- [ ] Testar o editor completo, incluindo conflito/recuperação, teclado, histórico
  e persistência; executar o fluxo no navegador com mouse, toque e CPU reduzida.
- [ ] Revisar, executar gates, registrar provas e limites, commit e integração
  em staging conforme a autorização vigente. Não interferir no Molda.
