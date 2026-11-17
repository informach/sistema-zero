# Lote 3.7 — Retratos das versões e eficiência — Implementation Plan

> Executar com `executing-plans`, sem delegação nem aprovação intermediária. Base local e remota conferida: `c65428c9d`. Somente o lote 3 está ativo. Preservar o trabalho paralelo do Pinta.

**Goal:** associar cada fotografia à revisão capturada, tornar a escolha/restauração visual e evitar transferência/varredura integral de objetos durante movimentos.

**Architecture:** histórico e blobs atuais, com associação de retrato por revisão; nenhuma cópia integral de documento por gesto. Instâncias continuam agrupadas por geometria/material, com faixas sujas e índice espacial de caixas no motor. Narrow phase usa `SceneSurfaceQuery` do Molda, sem modificar `boundsTree` nem os GLBs.

**Tech Stack:** TypeScript, React, Three/MeshBVH existentes; Members/Drizzle/Postgres, BFF e protocolo atual de imagens.

**Spec:** [parte 3.7 do lote](2026-11-17-cenarios-lote3-objetos-ensaio.md), [plano aprovado](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), interface do PDF.

## Restrições

- Não modificar narrativa, geografia ou física do jogo. Motor genérico, núcleo sem Three/React/IO.
- Uma verificação pesada por vez; fontes congeladas durante ensaio do navegador.
- Preservar orçamento de 20.000 objetos, referências fixadas e licença/espaço dos recursos.
- Não confundir tema claro/escuro com iluminação do cenário nem emulação com aparelho físico.
- O lote 3 só fecha depois de 3.8, revisão integral e verificações pertinentes. Implantação apenas ao final global.
- Existem falhas globais em publicação de cursos e mapeamento `map-set`, registradas no fechamento de 3.6. Não apresentar tipagem global aprovada; conferir/resolver antes de fechar o lote.

## 1. Transferência de instâncias e limites de volume

**Files:** `molda-cenarios-motor/src/{lotes,indice-de-caixas}.ts`; testes novos do índice e dos lotes.

- [x] Reproduzir atualização de um objeto entre 20.000 enviando o buffer inteiro. Conferir matrizes, cores, capacidade, remoção/reordenação e materiais compartilhados.
- [x] Usar `DynamicDrawUsage`, comparar valores Float32 efetivos, publicar somente faixas alteradas e limpar faixas quando o Three confirmar o upload. Não marcar um atributo inalterado.
- [x] Manter volumes conservadores sem recalcular todas as instâncias a cada quadro. Índice de caixas com construção balanceada e refit das folhas modificadas; sem perder formas/espelhos ou partes do GLB.
- [x] Testar consultas e refit contra varredura de referência, inclusive dentro da caixa, negativos, elementos coincidentes, vazio e milhares de objetos.

## 2. Picking e câmera

**Files:** `motor/src/{superficies,Palco,alvos-de-edicao,previa-dos-apoios}.ts`; testes de superfícies/câmera e navegador.

- [x] Usar o índice de caixas antes de consultar triângulos; manter ordem de desempate e raízes autorais. Picking continua aceitando representação pendente; encaixe usa somente geometria real.
- [x] Atualizar caixas/matrizes dos selecionados e apoiados na prévia. Não deixar seleção nem encaixe consultar posições antigas depois de movimento.
- [x] Evitar `InstancedMesh.raycast` varrendo todas as instâncias no clique. Reutilizar `SceneSurfaceQuery`, sem outra árvore de triângulos por instância.
- [x] Derivar alcance de órbita e recorte dos limites reais da cena/base. Conferir terreno de 8.192 m, objetos distantes, peças pequenas, zoom próximo e fotografias sem recorte.
- [x] Perfil browser com GLBs/instâncias reais: registrar bytes transferidos e candidatos consultados, sem deduzir desempenho físico por contagem de polígonos.

## 3. Retratos duráveis do histórico

**Files:** Members domínio/porta/repositório/schema, DDL gerada; serviço/HTTP/BFF/gateway; hosts; `Oficina.tsx`, `Versoes.tsx`; testes SQL/HTTP/browser.

- [ ] Inspecionar reserva/confirmação de capa e revisão esparsa. Definir associação imagem–revisão sem tornar cada gesto um snapshot JSON completo.
- [ ] Conferir revisão e autorização na confirmação atômica do recurso. Imagem atrasada vai somente à sua revisão; a capa da cabeça não recebe retrato antigo. Não confirmar blob órfão em falha.
- [ ] Incluir retratos nas consultas do histórico e proteção/GC. Apagar cenário/mundo libera imagens não usadas; duplicação não atribui histórico de outra identidade ao novo cenário.
- [ ] Gerar DDL com `bun run db:generate`; não editar SQL gerado nem implantar nesta etapa.
- [ ] UI mostra retrato ou reserva honesta, permite inspecionar/restaurar, respeita concorrência e cancela captura/envio ao sair/trocar perfil. Congelar revisão junto à captura; não usar a revisão lida depois de gerar a imagem.
- [ ] Captura por estabilização/ação explícita, fila limitada ao estado pertinente; nada de gerar PNG e fotografar JSON integral a cada frame/gesto.
- [ ] Testes com resposta atrasada, cabeça nova, falha até commit, arquivo compartilhado, cota, isolamento entre espaços e restauração/undo.

## 4. Revisão do recorte

- [ ] Regressões de conjuntos, clipboard, pincel, árvore, superfície e recursos; quatro layouts, teclado/toque, claro/escuro e cena diurna/noturna.
- [ ] Núcleo/motor/oficina, Members/BFF/gateway e Postgres; tipagem/build pertinentes, sem ocultar falhas globais.
- [ ] Revisar limites, descarte, uploads, arquivos e algoritmos; registrar evidências e limitações reais, commit/push dos caminhos próprios.
- [ ] Só depois seguir à parte 3.8. Não fechar o lote 3 ou a tarefa global.

## Checkpoint de eficiência — parte 3.7 ainda aberta

As seções 1 e 2 passaram em testes e revisão local. [Evidências e medidas](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-eficiencia-objetos.md). Continuar na seção 3: retratos duráveis do histórico. Não confundir as miniaturas de conjuntos já entregues com as imagens das revisões do cenário, ainda pendentes. Não iniciar 3.8 nem lote 4.
