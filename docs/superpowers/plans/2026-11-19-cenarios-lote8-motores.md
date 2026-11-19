# Lote 8.4 — Carregador compartilhado e motores — Implementation Plan

> Execução principal, com writing-plans/executing-plans, sem delegação ou aprovação intermediária. Galeria qualificada e enviada em `620e7e988`; staging local limpa antes deste recorte. Implementar/testar/revisar um motor antes do seguinte. Não iniciar publicação ou lote 9.

**Goal:** executar a revisão importada, com os mesmos recursos e física do chão, nos quatro motores existentes do Estúdio.

**Architecture:** `studio/src/three/scene3d.ts` materializa o pacote pelos IDs dos assets e chama o carregador canônico do motor por uma entrada pública restrita. O mesmo módulo será empacotado para o iframe e o export, com Three/addons externos resolvidos pelo importmap existente. Não copiar parser, renderizador ou algoritmo de terreno. Cada motor conserva sua câmera/controlador/loop e recebe um resultado completo antes de trocar a base anterior.

**Tech Stack:** Three 0.184.0 instalado nos dois pacotes, GLTFLoader/SkeletonUtils oficiais, BVH 0.9.2 já usado pelo motor, Bun 1.3.11 para a geração verificável, assets/store/bootstrap/CSP do Estúdio.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [8.4](2026-11-19-cenarios-lote8-studio.md), [galeria qualificada](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-galeria.md).

## Restrições

- Fonte, revisão, digest, licenças, transformações, relevo, recortes, águas, caminhos e atores permanecem os da cena compilada. Nada de entregar um GLB único no lugar do cenário.
- Resolver recursos por ID, conservando os caminhos lógicos e bytes. Sem nova biblioteca de materiais, fetch arbitrário, compressão no preview ou relaxamento de CSP.
- Usar os limites originais de assets e o preflight canônico antes de criar recursos. Capturar pacote/opções antes de awaits. Erro/cancelamento descarta recursos parciais.
- Uma cena só substitui a base vigente depois de carregar inteira. Remover a representação antiga, evitando terreno/água sobrepostos; falha conserva o mundo anterior.
- Compartilhar Three com o renderer do motor. O importmap legado aponta a 0.180.0, apesar dos pacotes instalarem 0.184.0: alinhar o contrato dos runtimes ao instalado e qualificar os quatro motores, sem reescrever dependências de projetos autorais Pro.
- Não escrever `boundsTree` em geometrias: o carregador canônico já administra as árvores e suas cópias.
- Preservar interface, controladores, câmeras, avatar, toque, nomes dos lugares e programas existentes. Não declarar execução JavaScript aprovada com testes só do Python.

## 1. Carregador único

**Files:** criar `studio/src/three/scene3d.ts` e testes em `studio/src/three/__tests__/scene3d.test.ts`; ampliar `molda-cenarios-motor/package.json` com a entrada `/runtime` apontando ao carregador existente, sem índice de editor/compilador.

**Interface:** `carregarCena3DDoProjeto(id, assets, sinal, opcoes?) → Promise<CenaNoThree>`. Consome `ProjectAsset[]`, `pacoteDeCena3D` e `carregarCenaNoThree`. Produz cena/raiz, alturas, colisões, águas, atores/instâncias, metadados, atualização/quadro e descarte do mesmo runtime canônico.

- [x] Testar seleção por ID, tipo/ID ausente, referências/digest incorretos, cancelamento, captura das entradas e três ciclos de descarte.
- [x] Exercitar geometria real em teste e a cena técnica completa no navegador: 20 nós, duas águas, três caminhos, pintura/alturas/buracos, propriedades e quatro clipes. Nenhum modelo/byte pago entra no Git.
- [x] Implementar a fronteira mínima e qualificar tipagem/regressão; não importar Palco ou React no carregador.

19/11: [carregador qualificado](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-carregador.md). O transporte pelo iframe e os quatro motores continuam pendentes.

## 2. Transporte e módulo do iframe

**Files:** entrada do carregador, script gerador verificável em `studio/scripts`, artefato gerado em `studio/src/three`, `preview/{assetsBridge,bootstrap,renderProject}.ts`, `runtime/javascript/classicDocument.ts`, `export/fileMap.ts` e montadores do preview do editor descobertos na revisão dos chamadores.

- [ ] Empacotar a mesma função, sem editor/autoria/conta, mantendo imports somente de Three/addons e sem uma segunda cópia do Three. Geração fixa/check e inventário verificável.
- [ ] Levar somente os assets necessários pelos canais existentes, incluindo manifesto e dados de terreno; relação por ID. Não passar JSON ao GLTFLoader. Conferir orçamento antes de embutir, sem truncar dependências silenciosamente.
- [ ] Instalar o módulo apenas em projetos que contenham cenários. Importmap/ordem/hash de scripts devem funcionar em preview, captura, /jogar e export, com CSP inalterada e texturas embutidas por imagem.
- [ ] Testar scripts hostis nos nomes/metadados, ausência de rede, resolução offline, export e descarte. Conferir orçamento do carregamento inicial e runtime portátil anterior.

## 3. Mundo 3D

**Files:** `official-extensions/world-3d/{blocks,worldIR,worldCodec,palette,runtime,manifest}.ts`, seletores existentes de materiais e contratos pertinentes descobertos pelos testes de blocos.

- [ ] Bloco/seletor Usar o cenário, com referência por ID e codec/IR de ida e volta.
- [ ] Carregar pela função compartilhada, esperar preparo no lifecycle existente e trocar terreno/água/ambiente atomicamente. `heightAt` e superfícies dirigíveis consultam os dados físicos reais, incluindo recortes e pontes; conservar avatar/carrinho/câmera e controles.
- [ ] Testes do motor, percurso real no navegador, publicação local /jogar, reabertura/export, CSP e três ciclos de recursos. Capturas/vídeo, revisão e commit antes de Canvas 3D.

## 4. Canvas 3D

- [ ] `sz_t3d_load_scene`, seletor e tradução/contratos do núcleo; usar o mesmo carregador e ciclo de recursos.
- [ ] Consultas de chão e colisões reais, preservação de câmera/loop/código, reabertura/export, testes e revisão antes do próximo motor.

## 5. Jogo 3D

- [ ] Bloco/seletor e codec/IR do motor existente; integração pelo carregador comum, conservando avatar, câmera, controles e regras.
- [ ] Regressão, percurso real, chão/colisão/água e três ciclos de recursos, reabertura/export, evidências/revisão/commit.

## 6. Jogo 3D Avançado

- [ ] Mesma integração no motor existente, conservando atores animáveis e física/colisões compatíveis.
- [ ] Regressão, quatro clipes, percurso real, reabertura/export, recursos, evidências/revisão/commit.

## 7. Fechamento

- [ ] Qualificação integrada dos quatro motores e Python pelo produto; conferência linha a linha de 8.4, tipagem, build/orçamento e full review do recorte.
- [ ] Documentar resultado/limitações reais e enviar commits. Somente então iniciar 8.5; implantação e validação real de staging continuam no encerramento global, após todos os lotes.
