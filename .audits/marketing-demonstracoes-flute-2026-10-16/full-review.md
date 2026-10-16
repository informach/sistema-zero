# Full review — demonstrações inspiradas no Flute

16/10/2026. Escopo: incremento da proposta Flute, integrado à reforma existente. Reviews anteriores: [F1](F1-review.md), [F2](F2-review.md), [F3](F3-review.md). Implementação em `feat/marketing-demonstracoes-flute`, inicialmente baseada em `b37fc3f72`, atualizada sem conflitos para `3511cd6c6` antes da regressão e dos builds finais.

## Resultado e decisão

Três receitas mantidas — detalhe/contexto, regra/resultado e antes/depois — fazem parte da timeline existente. O pedido continua em linguagem natural. As mesmas props e composição atendem Player, web, desktop e render. Revisar não exporta nem aprova automaticamente.

Flute 0.1.2 permanece referência de método, sem dependência, fork ou cópia de internals. O snapshot local fixa o fundo de `Scene` em preto (`src/react/index.tsx`); forçar a direção CDC nesse caminho exigiria contorno. A proposta autoriza encerrar a adoção diante desse bloqueio. Não foi realizado benchmark A/B nem alegada superioridade de desempenho sobre Flute.

## Revisão das fronteiras

| Fronteira | Resultado verificado |
| --- | --- |
| Contrato | Campo opcional em imagem; receitas versionadas; contagem/IDs/foco/dimensões validados. Documento antigo continua legível. Protocolo 3 impede cliente estrito antigo de sincronizar documentos que não conhece. |
| Fontes | Evidência factual, revisão exata, asset confirmado, SHA-256 e dimensões do mesmo projeto. Gravação direta e aplicação de resultado passam pela validação central. Nenhuma URL ou caminho local persistido na cena. |
| Dependências | Coleta inclui segunda imagem, evidências e revisões; contexto inclui fontes mesmo fora da pauta. Guarda do contexto existente protege contra edição concorrente. |
| Pedidos | Catálogo e guia derivam das mesmas receitas. Imagens anexadas passam pelo download autorizado e pela verificação de hash; seleção limitada a seis. Texto não anexa imagens da demonstração. |
| Escopo | Texto altera headline/rótulos; efeito altera foco/fades; identidades/fontes/receita permanecem. Clipe protegido, limites, variantes, conflitos e aplicação usam as regras existentes. |
| Render | Um relógio: frame local Remotion. Zoom e destaque preservam pixels de origem; não sintetizam trajetória do jogo. Contain usa dimensões verdadeiras. Imagem e fonte tipográfica precisam estar prontas. |
| Aprovação e distribuição | Edição inclui a revisão factual de cada cena, exige que ainda seja atual e preserva o final aprovado. A validação de entrega existente revalida esses fatos antes do envio; não há novo publicador nem segundo coletor de métricas. |
| Reprodutibilidade | Receitas têm IDs versionados; entrada entra no hash existente e build registra hash do bundle/worker. Alterações futuras de comportamento incompatíveis exigem nova versão da receita. |

Rascunhos históricos podem conservar a evidência fixada mesmo se ela mudar; a nova aprovação exige atualizar e conferir a montagem. Isso preserva o histórico sem tratar evidência antiga como autorização atual.

## Achados corrigidos no full review

1. **Geometria de texto:** o range de Nunito podia exceder o topo da caixa com headline curta. Centralizar a headline verticalmente em sua área corrigiu a composição sem enfraquecer o preflight. A prova com vinte linhas continua rejeitada.
2. **Leitura em 4:5:** manter os dois prints inteiros durante toda a comparação deixava o detalhe pequeno. A câmera agora aproxima ambos os focos durante a comparação e revela os quadros inteiros no final, sem fabricar estados intermediários. Há teste dos extremos e do ponto de foco.
3. **Seleção de mídia:** acrescentada defesa explícita contra evidência/asset de outro projeto no guia, além da validação central.
4. **Prova negativa do renderer:** `selectComposition` devolve props resolvidas. Alterar somente `inputProps` no teste não substituía essas props. A prova agora seleciona a composição novamente para cada entrada inválida; mídia ausente e overflow falham de fato.
5. **Compatibilidade de saída nativa e rollback de teste:** corrigidos durante F3 e registrados naquele review. Sem timeout maior, relaxamento de schema ou supressão de erro.

## Evidências executadas

| Verificação | Evidência |
| --- | --- |
| Contratos, produção, workbench, desktop e app | 146 testes passaram, 1.894 asserções, 32 arquivos, após atualizar a base. |
| Serviço de marketing | 331 passaram, 1.542 asserções, 52 arquivos; PostgreSQL 16 local exclusivo em 15479, com migrações atuais. 26 entradas de engajamento ficaram skipped porque dependem de outro ambiente dedicado, fora do escopo deste incremento. |
| Persistência local/sync | 10 testes Node/SQLite passaram: restart, replay, conflito, protocolo e cancelamento. |
| TypeScript | Contratos, produção, workbench, serviço e desktop passaram, todos com exit 0. Build web também executou TypeScript com sucesso. |
| Builds | Desktop completo (inclui capture, Remotion e identidade do motor) e Next.js passaram sobre `3511cd6c6`. Avisos existentes de chunks grandes/use client no Vite; nenhum erro de build. |
| Render real | Três receitas × 1080×1920 e 1080×1350; frames 89 → 0 → 45 → 89. Hash idêntico na repetição do último quadro. MP4 H.264, 1080×1920, 30000/1001 FPS, 9.009 ms, três cenas. |
| Player versus render | 18 comparações de pixels no Chrome Headless Shell: diferença média máxima por canal 0,0000066 na escala 0–255, limite declarado <1. Mesmo enquadramento/texto/tempo. |
| Interface real | `RequestPanel` e `VideoPreview` em navegador: exemplo só preenche pedido, não envia comandos; escopo texto selecionável; fontes visíveis; sem overflow horizontal a 1440/390 px e sem erros JS. Transporte é fixture. |
| Integridade/erros | Hash dos quatro originais preservado; falta de mídia e excesso de texto interrompem o render. Biome nos arquivos de código alterados e `git diff --check` sem problemas. |

[Registro de render](render-evidence.json), [comparações de Player/UI](ui-validation.json), [contato das seis composições](demonstracoes.png), [UI desktop](ui-desktop.png), [UI móvel](ui-mobile.png). A folha de contato usa o frame 45; linha superior 9:16, inferior 4:5, colunas detalhe/regra/comparação.

Fontes reais de P07/P08 já existentes, com origem e hashes registrados. Os IDs de evidência usados no ensaio são fixtures; o ensaio não cria aprovação editorial. O MP4 fica em `packages/marketing-desktop/.cache/demonstration-proof/three-recipes.mp4`, regenerável, fora do Git. O ensaio registrado levou aproximadamente 56 s após preparação do navegador em Ryzen 5 5600G / 16 GB; não é p95 nem medição de economia de produção.

## Reprodução e operação

Na raiz: `bun install --frozen-lockfile`. Em `packages/marketing-desktop`: `bun run build` e `bun run scripts/prove-demonstrations.ts`. Depois, na raiz: `node .audits/marketing-demonstracoes-flute-2026-10-16/verify-ui.mjs`. Este último usa Playwright já declarado em `packages/funnel`, o Chrome provisionado pelo renderer e somente HTTP local na porta 15478. Os scripts não acessam contas nem publicam.

No app: vincular capturas a uma evidência factual conferida da pauta; abrir uma montagem de vídeo; escolher um exemplo de demonstração ou descrever o objetivo; executar com a assinatura pessoal no desktop; revisar e aplicar a variante; pedir o final; conferir e aprovar a edição. Para corrigir texto ou foco, selecionar a cena e a parte permitida. O formato 4:5 demonstrado não implica aceitação por todo canal de distribuição.

Serviço, web e desktop devem ser atualizados em conjunto para protocolo 3. As revisões antigas continuam válidas no novo cliente; um cliente antigo recebe o diagnóstico de atualização antes do sync. Nenhuma migração de banco ou nova dependência foi introduzida por esta entrega.

## Limites de aceite preservados

Não foram comprovados aqui: duas máquinas físicas/R2 em rede real, instalador assinado, sessão autenticada de IA criando esta demonstração específica, autoria de código arbitrário em isolamento ou efeito comercial em campanha. Os testes usam composições mantidas e saída estruturada; não habilitam execução de código gerado. As lacunas já registradas da reforma principal continuam com seus critérios e não são marcadas como resolvidas por estes testes. Não houve push, publicação, ativação de campanha ou alteração dos arquivos originais.

O incremento está revisado dentro desse escopo. Não há achado bloqueante aberto nas novas receitas/contratos/integrações. Aprovação comercial e medição de compreensão/conversão permanecem atividades editoriais do piloto, sem números inventados.

## Revisão posterior

Uma nova rodada solicitada pelo usuário reabriu casos de borda na seleção e no transporte de fontes. Os achados, correções e verificações posteriores estão no [segundo full review](second-full-review.md), que prevalece como registro mais recente. Os resultados acima documentam a execução original.

## Integração local

Implementação no commit `2816e277b`. Staging estava limpo em `3511cd6c6`; o merge local não exigiu resolução de conflito. A árvore de `packages` preparada para o merge foi comparada com a branch testada e não apresentou diferenças. Este merge acrescenta apenas o fechamento documental do lote à implementação já verificada. O hash do commit de merge é verificável no histórico local de `staging`.
