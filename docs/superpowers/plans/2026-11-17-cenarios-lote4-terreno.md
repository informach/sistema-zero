# Lote 4 — Terreno — Implementation Plan

> Executar com as skills `writing-plans` e `executing-plans`, na sessão principal, sem delegação e sem pausas de aprovação. Lotes 0–3 fechados. Base local/remota conferida: `staging`, `e7b4ce604`. Preservar os arquivos paralelos de Pinta/Estúdio.

**Goal:** editar relevo, solo e buracos na oficina aprovada, com prévia real, histórico durável e recursos imutáveis, conservando o relevo convertido da Faísca.

**Architecture:** aproveitar os algoritmos puros do Claude, com campos de trabalho transitórios e persistência por peças/hash. Um gesto produz uma troca de base e reassenta os apoios existentes na mesma fila autoral. Alturas, pintura e buracos são recursos de terreno com formato e metadados discriminados, conferidos do navegador ao BFF e na transação Members. O motor desenha e colide a mesma superfície; não acrescenta planos sobrepostos.

**Tech Stack:** núcleo Zod/TypeScript; Uint16/Uint8, SHA-256; Three/MeshBVH; React e identidade Molda; Drizzle/Postgres e R2 existentes.

**Spec:** [plano do Claude](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [algoritmos existentes](../../plans/2026-11-16-cenarios-reforma/adiantamento-nucleo-lotes-4-5-6.md), [PDF](../../plans/2026-11-16-cenarios-reforma/interface-aprovada.pdf), [issue 267](../../plans/2026-11-16-cenarios-reforma/triagem-issue-267.md).

## Restrições

- Só o lote 4 ativo; água/caminhos/jogo/exportação/agentes continuam nos lotes seguintes.
- Uma amostra por vértice; células múltiplas de 64, até 4096 por lado, lado físico até 8192 m e passo de 0,25 a 32 m. Peças de altura com 65×65 amostras Uint16; bordas compartilhadas idênticas.
- Até oito camadas de solo; peso inteiro, soma 255 por amostra. Texturas usam referências/licenças/cota existentes. Sem editor de shaders.
- Buracos por célula e recortes poligonais importados coexistem como união; sem piso físico no espaço removido. Leitura matemática de altura continua distinta da existência de piso.
- Prévia não grava documento ou rede por quadro. Pointercancel, Escape, perda de foco, cabeça nova, erro de upload e desmontagem desfazem a prévia sem perder autoria.
- Min/max definem a quantização. Alterá-los reencoda todas as peças; tamanho/resolução reamostram em coordenadas de mundo com aviso de recorte. Não deslocar objetos para compensar geografia silenciosamente.
- Sem mutar GLBs, criar outro editor, alterar interfaces globais ou publicar em produção. Núcleo sem React/Three/IO. SQL somente gerado por Drizzle.
- Um lote só fecha implementado, testado e revisado. Implantação e prova remota somente no encerramento global.

## 4.1 — Contratos e operações puras

**Files:** core `src/v2/{terreno,recursos-de-terreno,edicao-de-terreno,campo-de-alturas,pinceis-de-terreno,receitas-de-terreno,pintura-de-chao,png-de-alturas,arquivos-referenciados,validacao,index}.ts`; testes `tests/terreno-edicao.test.ts` e `tests/terreno-esculpir.test.ts`.

**Interfaces:** `BaseDeTerreno.solo` guarda camadas nomeadas/cor/textura e referências de pintura por coluna/linha; `buracos` guarda referências por coluna/linha. `lerRecursoDeTerreno(bytes)` devolve união alturas/pintura/buracos e metadados canônicos. `referenciasDoTerreno(base)` enumera todos os recursos com o papel esperado. A serialização seleciona só peças atingidas; a edição usa `base.definir` e a inversão já existente.

- [x] Escrever testes que recusam camada duplicada, mais de oito camadas, referência fora da grade, textura inexistente e uso de pintura como altura. Executar antes da implementação.
- [x] Integrar os núcleos existentes e validar formatos canônicos, limites de coordenadas/NaN, quantidade de amostras, pesos e máscaras. Preservar SZHT já importado; pintura usa seu cabeçalho existente; buracos recebem cabeçalho discriminável sobre os 512 bytes de bits.
- [x] Conferir/corrigir o núcleo por testes de pintar camada antes zerada, soma 255, suavização, erosão conservativa, fronteiras compartilhadas, receitas/seed, PNG 8/16 bits e corrupção/tamanho descompactado.
- [x] Implementar reamostragem por tamanho/resolução e preparação das peças sujas com identidade estável. Igualdade de conteúdo não emite comando.
- [x] Validar referências de textura no solo; listar todos os recursos em cabeça, comandos e inversos para histórico/cópia/coleta.
- [x] Rodar testes e tipagem do núcleo, revisar o recorte e preservar em commit, sem declarar lote fechado.

## 4.2 — Persistência e prova de conteúdo

**Files:** Members `domain/cenarios/cenarios.ts`, serviço, HTTP, repositório e schema Drizzle; BFF `server/cenarios-conteudo.ts` e `routes/cenarios.ts`; oficina `portas.ts`, hosts; testes SQL/serviço/BFF/hosts.

**Interfaces:** o tipo de blob continua `terreno`, com metadados discriminados por formato. Reserva informa tamanho real permitido; confirmação prova hash/tamanho/formato. Ao gravar a base, cada hash precisa corresponder ao papel esperado (intervalo de alturas ou número de camadas). O limite máximo por recurso acompanha a peça de oito camadas. Os uploads continuam condicionais e isolados por espaço.

- [x] Testes de prova falsa, intervalo divergente, número de camadas divergente, recurso de outro espaço, confirmação sem referência e rollback até o COMMIT.
- [x] Estender limites e metadados tipados do contrato, validação de stream no BFF e transação de confirmação/aplicação; não confiar apenas no nome ou tamanho.
- [x] Gerar a migration que estende a restrição da coluna de metadados, mantendo os arquivos de altura existentes válidos. Aplicar somente ao Postgres QA descartável.
- [x] Conferir proteção dos três formatos no histórico/cópias e liberação após último dono; nenhuma exclusão de arquivo ainda usado.
- [x] Executar Postgres/serviço/HTTP/BFF/hosts, tipagem envolvida, revisar e preservar o recorte.

## 4.3 — Malha, materiais e gesto no palco

**Files:** motor `Terreno.ts`, `Palco.ts`, `tipos.ts`, `terreno/{gesto,material,recursos}.ts`; testes do motor e helpers browser.

**Interfaces:** sessão de pincel recebe ferramenta/parâmetros; lê um campo no início, aplica amostras espaçadas em metros e devolve região/arquivos ao fim. A prévia só atualiza peças tocadas e vizinhas para normais. A entrada é independente da taxa de eventos. O host confirma recursos antes do comando e pode recusar a prévia.

- [ ] Desenhar altura e máscara sem faces duplicadas, com normais contínuas e UV em metros; respeitar drawRange e índice de 16 bits por peça.
- [ ] Material mistura até oito camadas de cor/textura com repetição física e pesos, recursos compartilhados e descarte explícito. Mudança de camada mantém os pesos existentes conforme as operações puras.
- [ ] Gesto com anel/raio/força/dureza, órbita alternativa e toque. Rampa em dois pontos; aplainar lê altura inicial; nivelar/platô usam altura explícita; carimbos de morro/cratera e ruído/erosão usam parâmetros limitados.
- [ ] Cancelar em todos os caminhos; abortar fonte velha e não aplicar resposta atrasada sobre cabeça nova. Interditar Testar/captura enquanto gesto/upload estiver ativo.
- [ ] Reassentar apoios de terreno e raízes de conjuntos usando a mesma fonte nova, preservando offsets e relações internas. Não alterar objetos com apoio livre/objeto/água indevidamente.
- [ ] Provar com a cápsula do lote 3: relevo atualizado, borda de peça, recorte importado e buraco pintado têm a mesma malha visual/física. Conferir recursos após ciclos.

## 4.4 — Aba Terreno e arquivos

**Files:** oficina `telas/Terreno.tsx`, `useTerreno.ts`, `Oficina.tsx`, CSS prefixado; ações de arquivos/worker e browser QA.

**Interfaces:** painel mantém estado transitório separado do documento. Ações autorais entram no controlador existente, com um histórico por gesto/receita/importação. Chãos são escolhidos na biblioteca de texturas existente. Arquivos PNG entram no codec puro, sem conversão de precisão por Canvas.

- [ ] Ferramentas básicas e avançadas no rail/painel conforme PDF; receitas plano/ilha/colinas/vale com semente; parâmetros simples e controles acessíveis com unidades.
- [ ] Tamanho, resolução, intervalo de alturas e origem com resumo de cobertura e aviso antes de cortar relevo; falha não elimina terreno anterior.
- [ ] Lista de até oito camadas, adicionar/retirar, textura/cor/repetição, pintura manual e automática por faixa de altura/inclinação; explicitar a ordem das regras.
- [ ] Abrir/fechar buraco pela mesma ferramenta, sem apagar recortes importados silenciosamente.
- [ ] Importar/exportar PNG de alturas 16 bits, mapear preto/branco e mostrar mensagens claras para formatos recusados. Exportar não muda documento.
- [ ] Preservar alturas já convertidas da Faísca e a conversão do perfil do jogo, sem repetir a geografia. Toda operação permite undo/redo após reabrir.

## 4.5 — Fechamento do lote

- [ ] Conferir especificação item a item e corrigir lacunas próprias. Nenhum botão sem comportamento nem prévia promovida a entrega.
- [ ] Executar suítes pertinentes, tipagem e build; repetir contratos SQL/BFF, Testar, histórico, conjuntos e pincel de objetos após integração.
- [ ] Chrome claro/escuro em 1440/1366/1024/390 px com teclado/mouse/toque emulado; elevar/abaixar/aplainar/suavizar, receitas e avançados, pintar/automatizar, buraco, PNG e alterar resolução; salvar/reabrir/undo/redo e falha de rede.
- [ ] Registrar capturas/vídeos, métricas de recursos e ensaio da Faísca com peças reais e apoios. Não alegar aparelhos físicos por emulação nem direção de arte aprovada.
- [ ] Revisar, relatar, commitar/push em staging. Só então abrir lote 5. Full review, implantação e validação remotas continuam no encerramento global.


Recorte 4.1–4.2 implementado, testado e revisado: [contratos e persistência](../../plans/2026-11-16-cenarios-reforma/revisao-lote4-contratos-terreno.md). O lote 4 continua aberto; próximo recorte 4.3, malha/material e gestos. Nenhum lote posterior foi iniciado.
