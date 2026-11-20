# Regiões autorais — plano de execução

**Objetivo:** expandir o mundo editável sem alocar suas áreas vazias ou
alterar os mapas anteriores, mantendo orçamento e proteção contra perda.

**Arquitetura:** DTO/codec em Core, grade imutável e acessores no Pinta,
autoridade transacional e adaptadores nas fronteiras. TypeScript, IndexedDB,
Canvas, Python, formatos externos documentados e ferramentas nativas.

**Design:** `docs/plans/2026-11-20-pinta-regioes-autorais-design.md`.
Executar diretamente com `executing-plans`, sem subagentes. A autorização do
usuário dispensa confirmações entre etapas; as exclusões 3D permanecem.

## 1. Contrato compartilhado e orçamento

- [ ] Inspecionar codecs/binários/limites existentes em Core e Pinta para
  reaproveitar helpers e conservar a representação histórica.
- [ ] Testar DTOs, coordenadas negativas, base64 canônico, flags, orçamento
  global, descritores duplicados/futuros e rejeição antes da alocação.
- [ ] Implementar `packages/core/src/creations/pinta-regions.ts` e exportar
  o contrato puro. Não anunciar suporte do editor ainda.

## 2. Documento e operações

- [ ] Implementar acessores e edição em lote em `pinta/src/tiles/regionCells.ts`;
  adaptar `core/project.ts`, schema 8, migração explícita e versões anteriores.
- [ ] Auditar todos os leitores/escritores de células, seleção, terrenos,
  preenchimento, conjuntos, recursos, objetos, histórico e limites de trabalho.
- [ ] Evoluir `state/localChunkStorage.ts`/`assetAuthorityDb.ts` para protocolo
  físico 3; transações, IDs legados, coleta, falhas e cópias independentes.
- [ ] Repetir regressões da issue 026 e formatos antigos em navegador real.

## 3. Oficina e consumidores

- [ ] Adaptar palco, culling, geometria, minimapa, navegação e controles
  existentes; verificar máximo de extensão/zoom e interação infantil.
- [ ] Evoluir contratos da cena/PNG e capacidade dos leitores, preservando
  receitas e projetos legados; integrar runtimes JS e Python/Pygame.
- [ ] Verificar autoria → Estúdio → atualização com programa preservado.

## 4. Destinos e fechamento

- [ ] Implementar Tiled infinito real, relatórios e round-trip em ferramenta.
- [ ] Adaptar pacotes Phaser, Pygame e Godot; testar culling, física, objetos,
  portas, animação e ausência/falha de regiões nos motores reais.
- [ ] Medir memória/tempo, executar gates, revisar, documentar e commitar.
- [ ] Qualificar leitores/perfis/distribuição, ensaiar rollout/rollback e
  integrar staging. Não confundir sucesso local com publicação autenticada.
