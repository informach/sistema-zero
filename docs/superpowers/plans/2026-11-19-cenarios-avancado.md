# Lote 8.4 — Jogo 3D Avançado — Implementation Plan

> Continuidade autorizada, sem delegação ou aprovações intermediárias. Jogo 3D implementado, testado, revisado e enviado em `97028f4f3`; staging local/remota e arquivos deste motor conferidos antes deste recorte. Fechar este motor antes de Pro autoral. Não iniciar 8.5 ou implantação.

**Goal:** consumir a mesma cena completa do Molda no motor Avançado, preservando moldes, pools, gerações de entidades, FSM, física, câmera, regras, animações e identidade da interface.

**Architecture:** `SZGameKit3D.loadScene(id)` usa o SDK compartilhado sobre a Scene do motor, criada pelo `start` existente. Um fragmento local coordena pedido/preparo/chegada e empresta os triângulos ao kernel físico. `sceneStart(objeto)` é explícito, com geração/vida do handle respeitada. Não incorporar o explorador portátil nem o controlador do Jogo 3D iniciante.

**Tech Stack:** Three 0.184.0 compartilhado, SDK/BVH/cápsula/chegada canônicos, kernel cinemático e varredura de sólidos do Avançado, Blockly/IR/codec e gerador de ciclo de vida existentes.

**Referências:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [plano dos motores](2026-11-19-cenarios-lote8-motores.md), [Jogo 3D qualificado](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-jogo3d.md).

## Diagnóstico confirmado antes da alteração

- Baseline: **547 testes, 6.179 asserções, 40 arquivos**, sem falha; 20,86 s.
- O Avançado tem um mundo global, criado por `initWorld` durante `start`. A fábrica inicial define moldes/ganchos antes disso. O `start` espera `pending`, usado por sons e modelos, antes do loop/menu.
- Entrar em uma nova partida executa `resetProjectRuntime` e a fábrica novamente, preservando o renderer. Pools têm handles por geração; um objeto reciclado não pode ser ressuscitado por uma chegada atrasada.
- A física já possui varredura contínua de sólidos, subdivisão, caixa/bola/cápsula/rampa, bounce, atrito, plataformas móveis e sensores. O chão-base analítico é y=0. Não substituir esse kernel.
- O encerramento atual do Avançado ocorre também no `pagehide` persistido. Não transplantar automaticamente a política de retomada do outro motor; o cenário importado deve seguir o encerramento efetivo deste motor.
- O descarte atual encerra o renderer antes de atravessar a Scene e caches; a prova real deve conferir/corrigir a ordem, conservando propriedade e deduplicação.

## Decisões e limites

- Manter seletor `scene3d` por ID estável. Nenhum GLB achatado, novo inventário, fetch arbitrário, afrouxamento de CSP ou reescrita de dependências.
- `loadScene(id)` registra o pedido mesmo antes de existir Scene; iniciar a instalação pelo ponto de montagem do motor, antes da espera de `pending`. Evitar promessa que espere a própria entrada de `pending`.
- Primeiro preparo impede simulação sobre uma base provisória. Troca posterior preserva a base vigente até o sucesso. Falha conserva a base anterior; cancelamento/encerramento descartam resultado atrasado.
- Detalhes/recursos/ambiente pertencem ao SDK; entidades, moldes, renderer, câmera, loop e luzes/enfeites autorais continuam do motor. Retirar somente chão e luzes padrão por referências conhecidas, sem sobrepor um piso analítico aos recortes. Preservar recursos necessários para voltar ao modo sem cenário ou liberá-los pelo dono correto.
- Na reconstrução da fábrica, cancelar pedidos e chegadas da partida anterior. Se a fábrica pedir outra base, conservar a atual durante o preparo; se não pedir cenário, restaurar a experiência padrão sem deixar resíduos importados.
- `sceneStart` usa o início canônico, dimensões/pivô reais do molde ativo e apoio real dos pés. Pedido durante uma troca espera a base nova. `place` posterior cancela o pedido; reciclagem/redefinição não revive um handle morto.
- Atualizar água, clipes e ambiente no loop existente, respeitando estados/pausa e movimento reduzido onde já oferecido. Nenhum RAF concorrente nem nova câmera.
- Integrar triângulos ao passo existente: subdivisão segura para corpos rápidos/pequenos, contatos pelo método existente e normais reais, preservando bounce, sólidos autorais e caronas. Recortes continuam vazios. Manter semântica de corpos fantasmas/sensores e gravidade; não transformar todos em cápsulas sólidas.
- A cápsula contra cenário é arcade e vertical, dimensionada pelo molde; não prometer simulação rígida exata de formas arbitrárias. Manter os colisores autorais já existentes. Não criar piso sentinela ou resgate por teletransporte.
- A câmera existente continua responsável pelo enquadramento. Conferir oclusão somente nos modos de acompanhamento, consultas de mouse sobre a superfície real e frustum em cenas deslocadas/extensas; não alterar visão manual sem necessidade.
- Preservar grade espacial/pool, identidades visuais Kids/adulta e índigo da extensão, velocidades e narrativa. Limites originais de build/assets/prazos de teste permanecem.

## 1. Contratos de blocos/IR

**Files:** novos `official-extensions/game-3d-advanced/sceneIR.ts`, `sceneCodec.ts`, `__tests__/sceneBlocks.test.ts`; pontos de delegação em schema, buildIR, workspaceState, gerador/parser/nomes, lifecycle, blocks/palette/manifest/AI descobertos pela auditoria. Preferir módulo focado aos grandes arquivos históricos.

**Interfaces:** `g3k:loadScene { asset }` → `SZGameKit3D.loadScene("id")`; `g3k:sceneStart { charVar }` → `SZGameKit3D.sceneStart(personagem)`. Blocos `sz_g3k_load_scene` e `sz_g3k_scene_start`, primeiro em Ao iniciar, segundo com referência ao objeto ativo. Versão 0.23.0 → 0.24.0.

- [x] Testes vermelhos de seletor/ID, localização da paleta, aridade/referência e restrição de carregamento fora do quadro.
- [x] Ciclo código → parser de projeto → Blockly → IR → código gerenciado, com receita/ID preservados e sem rawJS para os novos comandos.
- [x] Implementar módulos/delegações, paleta e documentação. Conferir o registro dos nomes e os tipos de referência usados pelo próprio Avançado.
- [x] Rodar testes/auditorias de blocos, schema, arquitetura e drift de documentação antes do runtime.
- [x] Exemplo funcional obrigatório: Herói do Molda usa `loadScene` e `sceneStart` com cena autoral compilada, sem depender de fixtures nem acervo pago. Cobertura da paleta preservada; geradores oficiais reexecutados.

## 2. Preparo, chegada e ciclo de vida

**Files:** novo `runtimeScene.ts` e `__tests__/scene3d.test.ts`; pontos focados em `runtime.ts`, `runtimeProject.ts` e na bancada existente. Usar Three/compilador/carregador reais; somente renderer sem WebGL pode ser substituído em teste unitário.

- [x] Vermelho com cena compilada real: API ausente e carga solicitada antes do `start`, sem criar DOM/GPU no topo do módulo.
- [x] Instalar na Scene existente e ligar à espera inicial. Testar a Scene/câmera/renderer preservados, origem deslocada, duas trocas sobre a base vigente e erro na próxima.
- [x] Chegada pendente/imediata, troca com outro início, `place` posterior, reciclagem/geração e molde com dimensão/pivô próprios.
- [x] Recomeço/reconstrução com carga atrasada e sem cenário na nova fábrica; conservar caches/pools e impedir montagem de uma partida encerrada.
- [x] Atualização de água/clipes/setores/ambiente no loop existente, pausa/estados e descarte final antes de encerrar renderer/caches. Conferir o `pagehide` real do Avançado.

## 3. Física, mouse e câmera

**Files:** `runtimeScene.ts`, pontos focados de `runtimePhysics.ts`/`runtimeCamera.ts` e testes do motor.

- [x] Testar terreno fora da origem, recorte com queda, apoio em ponte/junta, salto/teto e parede fina com corpo rápido/pequeno.
- [x] Integrar contatos nativos sem apagar varredura contínua, sólidos autorais, bounce/atrito, plataformas e sensores. Testar corpos com e sem gravidade e modos fantasma.
- [x] Remover chão analítico somente com base importada ativa. Preservar o caminho legado e evitar dupla integração no mesmo quadro.
- [x] Consultas de mouse usam a superfície real; ausência de superfície não inventa acerto em y=0. Câmeras que seguem podem ser limitadas pelas superfícies, conservando o modo livre/FPS e seus controles.
- [x] Regressão de pool/geração/FSM, animações e quatro clipes, grade, colisões/rampas/carona, input e câmeras.

## 4. Qualificação e fechamento

Achados em execução (ainda não constituem fechamento):

- A junta coplanar de um teto produzia impulso lateral no resolvedor canônico por corrigir triângulos vizinhos sequencialmente. Reproduzido em vermelho; corrigido escolhendo a maior penetração na mesma pose por iteração. Borda externa continua colidindo. Suíte nativa: 255 testes, 5.234 asserções. Requalificar Mundo/Canvas/Jogo 3D e artefatos regenerados antes do corte.
- Avançado: 567 testes/6.335 asserções/42 arquivos passaram em 21,80 s; 15 integrações reais incluem troca, geração, teto/junta, queda, bounce, carona, mouse e câmera. Um timeout de troca apareceu em execução conjunta anterior; isolado e suíte integral subsequente passaram sem alterar prazo. Não atribuir causa sem evidência.
- O build revelou limites apertados: modo Blocos e, após a divisão de chunks, a carga inicial. Manual de IA passa pelo provider sob demanda já existente, com resumo operacional e teste de preservação do texto integral. Separar consulta leve de recuperação do codificador de documentos e validar persistência/grafo/orçamento sem elevar limites. Qualificação ainda pendente.
- A bancada dos exemplos espera o evento real de menu em vez de sondagem arbitrária de 300 ms; prazo original dos testes permanece. Na nova partida com cena, o teste espera a promessa real da carga antes de simular movimento.
- A revisão reproduziu o salto recusado pela alternância de apoio em superfície inclinada e a câmera seguindo a origem antes de o novo ator chegar. Ambos corrigidos com testes vermelhos/verdes, sem alterar velocidades ou prazos. A rodada final do Avançado/armazenamento/índice passou com 607 testes e 7.165 asserções. Ver [checkpoint em qualificação](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-avancado.md).

**Files:** produtor/driver em `playground/cenarios-integration`, checkpoint/evidências e checklists dos motores.

- [x] Projeto montado pelos blocos/IR reais, modelos e controlador do Avançado, reabertura canônica, preview strict/export e `/jogar` local controlado.
- [x] Três ciclos com recursos estáveis, descarte final, 441 alturas/máscara contra Raylib, água/clipes, erro/cancelamento, movimento real, curvas, salto/pouso, pausa e recomeço. Não usar teletransporte como travessia.
- [x] Conferir os quatro clipes em execução, com estados/animações e evidências próprias; não declarar aceite perceptivo/IK ou aparelhos físicos sem esses testes.
- [x] Build/orçamento original antes da tipagem integral; regressões pertinentes, geradores/check, Biome/diff, tipagem e review do recorte. Corrigir causas, sem elevar limites.
- [x] Capturas/vídeos e recibo sem bytes privados, relatório de implementação/correções/provisórios/limites, revisão final e commit/push em staging.
- [ ] Somente então iniciar Pro autoral. O fechamento integrado de 8.4, 8.5/8.6, lotes 9–10, Faísca final, full review/CI e implantação/validação real permanecem pendentes.
