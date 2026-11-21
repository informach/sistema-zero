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

- [x] Inspecionar codecs/binários/limites existentes em Core e Pinta para
  reaproveitar helpers e conservar a representação histórica.
- [x] Testar DTOs, coordenadas negativas, base64 canônico, flags, orçamento
  global, descritores duplicados/futuros e rejeição antes da alocação.
- [x] Implementar `packages/core/src/creations/pinta-regions.ts` e exportar
  o contrato puro. Não anunciar suporte do editor ainda.

Contrato implementado com 14 testes focados e suíte Core completa. Os limites
são conferidos globalmente antes de ler buffers ou base64. Os leitores/escritores
densos e os números dos formatos ativos permanecem intactos. Evidências em
`docs/pinta-cenarios/missao-completa-2026-11-18/qa/regioes-autorais-contrato-2026-11-20/`.
Auditoria inicial de células registrou 89 arquivos; a integração abaixo ainda
precisa conferir os consumidores um a um. Esta primeira tarefa não conclui 8a.

## 2. Documento e operações

- [ ] Implementar acessores e edição em lote em `pinta/src/tiles/regionCells.ts`;
  adaptar `core/project.ts`, schema 8, migração explícita e versões anteriores.
- [ ] Auditar todos os leitores/escritores de células, seleção, terrenos,
  preenchimento, conjuntos, recursos, objetos, histórico e limites de trabalho.
- [ ] Evoluir `state/localChunkStorage.ts`/`assetAuthorityDb.ts` para protocolo
  físico 3; transações, IDs legados, coleta, falhas e cópias independentes.
- [ ] Repetir regressões da issue 026 e formatos antigos em navegador real.

Primeiro lote de operações implementado em `tiles/regionCells.ts`: leitura
indexada e visita por regiões ocupadas, gesto atômico com limite de trabalho,
compartilhamento dos chunks intactos e conversões densas com admissão explícita.
Comparação determinística com as operações densas existentes e testes de
recusa/histórico passaram. Tipos Pinta/Core e suíte Core passaram. Evidências
em `qa/regioes-autorais-operacoes-2026-11-20/`. A união no documento, schema 8,
consumidores e protocolo físico 3 ainda não foram ativados nem declarados prontos.

A base recebeu os leitores 24226 e 13e, preservando os seis arquivos próprios do
contrato/acessores; passaram 3.205 testes do Core e os tipos de Core/Pinta.
O leitor comum `tiles/mapCells.ts` acrescenta consultas com origem, recorte ocupado
e orçamento, com o acesso pontual existente integrado. Uma reprodução mostrou
coordenadas fracionárias consultando outra célula; o acesso agora as recusa.
Passaram 2.288 casos da suíte do Pinta, os três controles nativos ignorados nela,
tipos/lint e doze ensaios locais Pinta → Estúdio sem skip ou flaky. Evidências em
`qa/leitor-comum-de-celulas-2026-11-21/`. Isso não conclui o item 2: a união no
documento, os demais consumidores e a persistência continuam pendentes.

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
