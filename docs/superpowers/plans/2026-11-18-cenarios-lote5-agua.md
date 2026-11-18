# Lote 5 — Água — Implementation Plan

> Executar com `writing-plans` e `executing-plans`, na sessão principal, sem delegação e sem pausas de aprovação. Lotes 0–4 implementados, testados e revisados localmente. Base `staging` conferida e enviada: `40ed89058`, incluindo a atualização remota do Pinta. Somente este lote ativo; implantação e validação remotas no encerramento global.

**Goal:** construir mar, lagos preenchidos pelo relevo, rios com leito/correnteza, represas e cachoeiras na oficina aprovada, com material ajustável, área de nado coerente e autoria durável.

**Architecture:** integrar `agua-do-terreno.ts` e as operações de curva necessárias à água, conservando o campo/worker/fila do lote 4. O documento guarda superfícies declarativas e parâmetros limitados; visual, seleção, nado e exportações usam a mesma cobertura. Água não produz piso sólido. Alterações de relevo e água entram na mesma transação autoral e no mesmo passo de histórico.

**Tech Stack:** núcleo Zod/TypeScript sem IO/React/Three; Three/MeshBVH no motor; React e tokens Molda na oficina; controlador, recursos por hash e serviço Members existentes.

**Spec:** [plano do Claude](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [núcleo adiantado](../../plans/2026-11-16-cenarios-reforma/adiantamento-nucleo-lotes-4-5-6.md), [interface aprovada](../../plans/2026-11-16-cenarios-reforma/interface-aprovada.pdf), [fechamento do terreno](../../plans/2026-11-16-cenarios-reforma/revisao-lote4-terreno.md).

## Regras de integração

- Preservar terreno, máscaras/recortes, apoios, conjuntos, bibliotecas, cota, autoria, Testar, câmera e toque aprovados. Não iniciar ferramentas da aba Caminhos neste lote.
- Um mar compartilhado por cenário, com nível mundial. Lagos/represas respeitam contorno e ilhas; rios têm perfil longitudinal descendente e largura; cachoeiras têm topo/base/largura. Limitar pontos, anéis, amostras e geração de malha antes da alocação.
- Cor, transparência por profundidade, ondas e espuma são parâmetros de um material pronto; não criar editor de shaders. Material não redefine sozinho a área de nado.
- A superfície de água nunca entra como chão sólido no teste. Margens, leito e barragem só colidem quando existe geometria física correspondente.
- O lago convertido da Faísca referencia um GLB fora da lista de instâncias. Conferir suas malhas, materiais e referência local da água, com metadados explícitos por modelo/hash; não usar o pacote do jogo no motor genérico, duplicar água ou ajustar altura para uma câmera específica.
- Preenchimento/rios/represas trabalham em cópias e worker cancelável. Cancelar, trocar de cabeça, desmontar ou falhar antes da fila conserva o documento. Falha de envio usa a retomada já existente.
- Não inventar nova migração espacial, sistema de inventário, licença, aprovação artística ou homologação de desempenho em aparelhos físicos. SQL, se necessário, somente gerado por Drizzle.

## 5.1 — Contratos, hidrologia e cobertura compartilhada

**Files:** core `src/v2/{entidades-schema,documento,validacao,agua-do-terreno,curvas,index}.ts`; novos módulos de esquema/operações/consulta de água; `tests/curvas-e-agua.test.ts` e novos testes de água.

**Interfaces:** `AguaSchema` conserva os lagos/mar existentes e acrescenta dados discriminados para rio, represa e cachoeira. Aparência limitada e área de nado são dados explícitos. A consulta pura recebe água, ponto e fonte de terreno e devolve presença, nível, profundidade e correnteza; não usa o material como fonte da física.

- [x] Escrever testes de cada variante, valores inválidos, anéis/ilhas fora da margem, referências ausentes, mais de um mar e limites de pontos. Executar antes da implementação.
- [x] Auditar o núcleo existente: precisão do transbordo em intervalos estreitos de alturas, conectividade, margem simplificada, ilhas, vazamento pela borda, limites de trabalho e caso sem baixada. Corrigir por testes vermelhos/verdes.
- [x] Integrar `encherLago`/`nivelDeTransbordo`, `cavarRio`, `represar` e as funções de curva necessárias. Manter determinismo e indicar estimativas de área/volume conforme a resolução.
- [x] Definir os descritores resultantes em coordenadas documentadas, sem gravar malhas Three. Rio e barragem retornam também as regiões de terreno alteradas; o leito não sobe a jusante e a barragem não abaixa terreno existente.
- [x] Implementar cobertura/nível compartilhados: excluir ilhas, considerar transformações dos lagos importados, largura/perfil do rio, cachoeira sem volume horizontal fictício, profundidade e opção de nado. Conferir correnteza e sobreposição por nível.
- [x] Conferir autoria/inversão, cópia, organização e recursos dos tipos novos. Rodar núcleo/tipagem, revisar e preservar o recorte.

## 5.2 — Água visível e integração física no palco

**Files:** motor novos módulos `aguas/*` (malha, material e conjunto de superfícies), `Palco.ts`, `tipos.ts`, `teste/{agua,movimento}.ts`; testes de geometria/colisão e helpers browser.

**Interfaces:** `AguasDoPalco` recebe documento/fonte de terreno/modelos já carregados e fornece desenho, seleção e fontes sólidas apenas das margens/barragem. A física usa a consulta de cobertura do núcleo. Recursos têm dono e descarte explícitos; materiais/arquivos são compartilhados quando apropriado.

- [x] Construir superfície do mar, lago com ilhas, faixa do rio com cotas e queda vertical. Conferir winding, UV em metros, faces degeneradas e orçamento. Sem superfícies coplanares duplicadas.
- [x] Integrar o GLB do lago da Faísca com nível/pivô/escala medidos. Separar superfície de água de margens físicas com referências explícitas; aproveitar a cache e materiais originais sem mutar o arquivo.
- [x] Material pronto com cor rasa/profunda, transparência relacionada à profundidade, ondas e espuma de margem; iluminação diurna/noturna e correnteza no sentido correto. Ondulação visual limitada não cria piso nem muda silenciosamente o nível físico.
- [x] Ligar mar/lago/rio/represa à área de nado e correnteza limitada, conservando a cápsula e suas colisões. Desativar nado não remove visualmente a superfície nem cria colisor.
- [x] Atualizar em troca de documento/relevo e descartar em remoção/reentrada. Usar o laço de render existente; animação apenas quando necessária, respeitando movimento reduzido.
- [x] Conferir geometria real, seleção, nado/câmera e recursos após ciclos; tipagem e revisão do recorte.

## 5.3 — Gestos, worker e transação autoral

**Files:** motor captura de pontos/prévia e callbacks em `Palco.ts`; oficina processamento de água em worker e autoria sobre `terreno-autoria.ts`/controlador; testes de fila e browser.

**Interfaces:** ferramenta ativa recebe parâmetros, captura um ponto de preenchimento ou uma sequência curta de pontos e devolve uma intenção sobre uma cabeça específica. O worker devolve descritor de água, estatísticas/avisos e, quando necessário, campo/regiões. Confirmar enfileira água e terreno como uma única operação.

- [x] Clique numa baixada com prévia do lago e teto de transbordo. Explicar ausência de bacia/vazamento; confirmar antes de guardar água que alcança a borda.
- [x] Capturar nascente→foz do rio, duas pontas da barragem e ponto a montante, topo/base da cachoeira. Permitir conferir/editar pontos e cancelar com teclado ou toque, sem criar outro sistema de navegação.
- [x] Preparar leito/barragem e recursos antes da cabeça otimista; preservar um passo de desfazer para a intenção inteira. Reutilizar envio, prova e nova tentativa dos binários do terreno.
- [x] Proteger cancelamento, cabeça nova, resposta atrasada e desmontagem; bloquear Testar/retratos durante operação. Prévia não concede progresso à plataforma nem grava por quadro.
- [x] Testar no-op, falha de upload, resposta perdida, undo/redo/reabertura e recurso compartilhado. Revisar e preservar o recorte.

## 5.4 — Aba Água na identidade Molda

**Files:** oficina `useAgua.ts`, `telas/Agua.tsx` e componentes específicos de parâmetros/pontos, `telas/Oficina.tsx`, CSS prefixado. Conservar a decomposição por responsabilidade.

- [x] Rail e painel com Mar e Encher de água como entrada simples; Rio, Represa e Cachoeira no mesmo fluxo, sem botões sem comportamento.
- [x] Nível, profundidade, largura, correnteza, nado e material com limites, unidades e rótulos acessíveis. Pontos também editáveis por números/teclado; indicar direção nascente→foz.
- [x] Selecionar/renomear/apagar águas existentes, alternar visibilidade e camada, editar parâmetros e recalcular margens quando apropriado. Conservar os nomes/dados de navegação existentes.
- [x] Mostrar prévia e avisos úteis do resultado, erro claro e nova tentativa, sem expor caminhos de armazenamento ou peças internas do worker.
- [x] Conferir inspector recolhido, drawer e abas em 1440/1366/1024/390 px, claro/escuro, teclado/mouse/toque emulado; revisar o recorte.

## 5.5 — Fechamento exclusivo do lote

- [x] Estender o fragmento/área de transferência existente às águas, com referências, apoios, deslocamento e histórico. Não criar outro clipboard; a extensão de caminhos/marcadores segue nos lotes 6/7.

- [x] Conferir cada requisito da aba Água na especificação; corrigir lacunas próprias antes de expandir para caminhos.
- [x] Rodar núcleo, motor, oficina/hosts, serviço/HTTP/BFF/Postgres pertinentes, tipagem e build. Verificar contratos de terreno, conjuntos, fila, histórico, cota e referências após a integração.
- [x] Browser: preencher baixada, preservar ilha seca, impedir vazamento silencioso, mudar nível, criar rio/represa/cachoeira, cancelar, salvar/reabrir/undo/redo, falha de rede, dia/noite, seleção e toque.
- [x] Testar caminhada e nado com o mesmo avatar/cápsula, inclusive margem rasa, correnteza, ponte e lago real da Faísca. Não aceitar piso invisível na água ou perda de colisão nas margens.
- [x] Registrar capturas/vídeos, compilação do material e contagens de renderer após ciclos. Distinguir prova local/emulação de aparelhos físicos e aceite artístico.
- [x] Revisar, documentar, commitar e enviar à staging. Somente então iniciar lote 6. Full review, implantação e validação remota continuam no encerramento global.

## Registro de execução — 18/11

Somente 5.1 em andamento. A primeira auditoria reproduziu perda de precisão no teto de transbordo: `9999,123456789` tornava-se `9999,123046875` na fila de prioridade Float32. O custo passou a Float64, acompanhando o campo do lote 4. Outro teste reproduziu orçamento NaN aceito; a busca agora exige limite inteiro finito de 1 a 4097² amostras. Os dois testes falharam antes e passaram após a correção, junto dos 14 casos anteriores de curvas/água. Isso não fecha a auditoria nem o lote: esquemas novos, material, palco e interface de água permanecem pendentes.

Esquemas e consulta de cobertura integrados e revisados em recorte próprio: [checkpoint 5.1](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote5-contratos-consulta.md). O lote continua aberto; ainda faltam operações de preenchimento/escavação, vínculos à água, renderer, gestos e interface.

**Estado atual:** 5.1 implementado, testado e revisado no escopo de contratos, hidrologia e cobertura. Operações preservadas em `245487fea`/`11e545a3f`; revisão dos vínculos, clique entre vértices, saída de transbordo e armazenamento descrita no mesmo checkpoint. Só o lote 5 segue ativo, agora em **5.2**. Não há nova interface ou material entregue por este fechamento de subetapa; transação de água com binários do terreno continua em 5.3. Lotes 6–10 não iniciados.

**Continuação atual:** 5.2 implementado, testado e revisado no escopo de renderer e física. [Registro, capturas, vídeo e limites](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote5-renderer-fisica.md). O lote 5 segue aberto, agora em **5.3 — gestos, worker e transação autoral**. Ainda não há aba Água completa nem aceite artístico.

Primeira conferência de 5.3: teste vermelho reproduziu a perda de um comando de água quando as alturas não mudavam. O helper existente conserva os comandos adicionais e só emite `base.definir` quando a base realmente muda. Testes com controlador/host reais em memória conferiram água+peças em uma revisão, undo/redo após reabrir, no-op, falha de upload, resposta perdida/idempotência e mudança de cabeça durante o preparo. Tipagem da oficina e os sete testes pertinentes de fila passaram. É correção parcial de autoria; worker, captura, prévia e interface continuam pendentes.

Worker de água integrado em recorte próprio, com transferência de cópias, término/cancelamento e executor compartilhado com o terreno. [Provas e revisão da compilação](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote5-worker-autoria.md). A construção explícita preserva o reconhecimento do worker pelo Vite, conferido também pelos controles do build local. **5.3 permanece aberto:** captura, prévia, aplicação e suas proteções ainda pendem; a aba completa e o fechamento vêm depois.

Captura, projeção de prévia e helper de aplicação integrados ao palco/fila, com testes de imutabilidade, cancelamento, mudança de cabeça, seleção, no-op e histórico. Chrome conferiu restauração real do relevo e bloqueio de Testar/retratos. Detalhes no mesmo checkpoint. **5.3 segue aberto até conectar o fluxo aos controles e avisos da aba Água**; não iniciar lote 6.

**Continuação: 5.3 e 5.4 implementados, testados e revisados localmente.** [Interface, correção de cache, testes e evidências](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote5-interface.md). O lote 5 permanece aberto em **5.5**, agora fechando a extensão transversal de água à mesma área de transferência, antes de concluir a revisão do lote. Lotes 6–10 não iniciados. Sem validação remota antecipada.

**Fechamento local do lote 5:** [revisão completa](../../plans/2026-11-16-cenarios-reforma/revisao-lote5-agua.md). Transferência de água integrada e conferida com apoios, recursos, deslocamento, corte, duplicação e histórico, inclusive JSONB/replay no Postgres real. Todos os itens abaixo da implementação têm prova local, sem aprovação artística ou homologação de hardware. Preservar código/relatório/evidências na staging; então seguir exclusivamente ao lote 6. Tarefa global, CI/implantação e validação remota continuam abertos.
