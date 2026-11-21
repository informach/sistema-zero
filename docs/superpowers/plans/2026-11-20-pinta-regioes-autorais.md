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

O modelo existente foi parametrizado pelo tipo das células, conservando a grade
densa como padrão. A preparação RegionTilemapAsset reutiliza grupos, objetos e
recursos, com conversão explícita, expansão que não move dados e edição atômica
sob orçamento global. Ela continua excluída de PintaAsset e dos escritores até
completar os leitores: não ativa arquivo 8 nem armazenamento 3. Os dois módulos
preexistentes emitem JavaScript idêntico; passaram 46 testes focados, os tipos
de Pinta/Estúdio e o lint. Ver `qa/modelo-de-regioes-2026-11-21/`. O item 2 permanece aberto.

Os acessos existentes `cellAt`/`tileLayerById` aceitam agora o modelo de regiões,
com origem lógica, consulta pontual sem índice e leitor reutilizável por gesto.
Passaram 48 casos focados, 2.297 da suíte completa, os três controles nativos
Pygame separados e doze fluxos locais Pinta → Estúdio, além dos tipos e lint.
Ver `qa/acesso-do-mapa-por-regioes-2026-11-21/`. Isso não ativa schema 8, protocolo
físico 3 nem a oficina; os consumidores restantes continuam pendentes.

Lápis, borracha, lote e balde existentes foram adaptados às regiões. O balde comum
recusa gestos extensos integralmente e corrige a entrada fracionária que podia
congelar o caminho denso. Passaram 2.305 casos completos, 56 focados, tipos,
três controles nativos e doze fluxos locais de navegador. A medição isolada
reproduzível comparou 30 execuções por versão com dados idênticos; o caso denso
máximo registrou medianas de 2,96/2,15 ms. Ver `qa/pintura-e-balde-por-regioes-2026-11-21/`.
Não se anuncia UI expansível nem suporte de arquivo 8/persistência 3 neste lote.

A preparação incorporou o leitor 85 e sua fixture de preservação de materiais.
Os 16 arquivos próprios de pacote e a árvore de packages da última incorporação
ficaram idênticos. Passaram os ensaios de armazenamento, os 73 casos isolados,
tipos completos do Estúdio, perfil e lint. Ver `qa/regioes-base85-2026-11-21/`.
O próximo lote precisa implementar o leitor nativo e os metadados assinados,
reutilizando a validação existente sem alterar os formatos anteriores.

O codec interno `core/regionDocument.ts` implementou essa leitura e a escrita
JSON, com geometria assinada/fracionária, padrões explícitos, recursos embutidos
e recusa integral de metadados que seriam alterados. Reutiliza os validadores
existentes com política por formato e o serializador de artes. Passaram 2.319
casos completos, os três controles nativos, 14 focados, tipos e doze fluxos locais
de navegador. O ensaio reproduzível de cem documentos conservou dados e
snapshots; oito fixtures antigas mantiveram valores e bytes. Ver
`qa/documento-nativo-de-regioes-2026-11-21/`. As falhas intermediárias de giro,
JSON com recursos e tipos do script estão registradas com suas correções.
Isso não conclui o item 2: união pública, consumidores e persistência 3 seguem
pendentes. O formato ativo continua em 7; não há oficina expansível publicada.

## 3. Oficina e consumidores

Seleção, recorte, colagem e carimbos existentes passaram a usar leitura por
origem e escrita heterogênea comum, com recusa atômica de dados inválidos e
orçamento de 65.536 células por gesto. O caso de coluna fora da grade que
alcançava a linha seguinte foi corrigido. Passaram 2.334 casos completos,
32 comparações determinísticas de snapshots, tipos, três controles Pygame e
doze fluxos locais no navegador. Ver `qa/selecao-e-carimbos-regioes-2026-11-21/`.
O item permanece aberto: render, terreno, persistência e demais consumidores
ainda não promovem a união pública nem ativam o formato 8.

Antes de ampliar os consumidores, lápis, lote, balde e preparação para regiões
passaram a recusar índices de peças que o formato do editor não aceita. O
armazenamento genérico manteve os 12 bits e todas as transformações. Passaram
2.325 casos completos, 68 focados, tipos, três controles Pygame reais e doze
fluxos locais de navegador. As quatro fixtures inconsistentes encontradas na
primeira rodada foram corrigidas sem retirar sua cobertura. Ver
`qa/indices-de-pecas-2026-11-21/`. Seleção/carimbos e os demais consumidores
continuam pendentes; o formato público permanece em 7.

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
