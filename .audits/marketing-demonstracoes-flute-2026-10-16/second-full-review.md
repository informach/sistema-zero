# Segundo full review — demonstrações de marketing

Revisão solicitada em 16/10/2026 após a integração original. Base: `staging` local em `4db993ba8`, incluindo a implementação `2816e277b`. Trabalho isolado na branch `fix/marketing-demonstracoes-full-review`; arquivos de outras worktrees preservados.

## Escopo e achados corrigidos

O review percorreu contratos e protocolo, referências e retenção, contexto de execução, aprovação, seleção de fontes, transporte multimodal, edição por escopo, preview e render. A arquitetura permanece subordinada à reforma editorial: os mesmos projetos, revisões, evidências, assets, pedidos e edições aprovadas. Não há novo motor, dependência, migração, protocolo ou fluxo paralelo.

| Achado | Causa e correção | Regressão |
| --- | --- | --- |
| P1 — foco sobre imagem rotacionada ou com dimensões divergentes | As coordenadas usam pixels codificados, mas a imagem do navegador obedece ao EXIF. A elegibilidade compartilhada exige orientação zero e dimensões representáveis. O desktop decodifica e confere dimensões/orientação antes de anexar ou renderizar, além da verificação de hash. Uma origem inadequada exige cópia normalizada e vínculo factual explícito. | Rejeição de `null`, 90°, 180° e 270° no domínio/guia; JPEGs reais com EXIF e dimensões adulteradas; gravação em lote no PostgreSQL. |
| P2 — referências repetidas ocultavam fontes distintas | O limite de seis era aplicado a pares evidência/asset. A seleção agora deduplica por asset antes de limitar e prioriza o par exato asset/revisão da cena. A ordem independe da ordem de chegada das evidências. | Sete fatos para a mesma imagem não escondem a segunda; duas fontes conservam suas revisões mesmo quando os fatos compartilham arquivos. |
| P1 — pedido com 24 imagens para um limite de 18 | Três gravações forneciam 18 amostras e as demonstrações acrescentavam seis. Um orçamento comum distribui as vagas restantes entre as gravações, mantendo amostras do início e fim do intervalo observado. As referências no prompt correspondem exatamente aos anexos; cache e análise completa permanecem intactos. | Três gravações + seis demonstrações resultam em 18 imagens; amostras, ordem, metadados, pausas e imutabilidade conferidos. Sem demonstração, as 18 amostras originais permanecem. |
| P1 — capturas grandes excediam os limites de bytes | Um PNG válido de 4,8 MB era anexado diretamente e recusado pelo cliente nativo. Entradas visuais grandes recebem uma visualização temporária WebP, proporcional, sem recorte, com até 1 MB por imagem. O mesmo preparo atende Codex e Claude. O prompt informa a redução; render, evidência e hashes continuam usando os originais. | PNG real com alta entropia; proporção e bytes originais preservados; 18 referências preparadas aceitas pelo serializador real `claudeInput`. |
| P2 — edição textual podia alterar campo invisível | A exceção genérica para `clip.text` também valia para demonstrações. O servidor agora permite apenas headline/rótulos nessa modalidade; foco e fades mantêm seu escopo próprio. Prompt e seletor usam o texto efetivamente exibido pela cena. | A proposta que altera apenas o campo invisível é rejeitada. A prova de UI inclui metadado legado concorrente e exige o headline no seletor. |

As reproduções falharam antes das respectivas correções. Uma segunda passagem identificou e corrigiu também o desempate por revisão quando dois fatos compartilham ambas as imagens. Não se aumentaram limites do provedor nem se omitiu a validação de origem.

## Evidência desta revisão

- Clientes, contratos, produção e workbench: **154 testes passaram**, 1.947 asserções, 36 arquivos. Execução dividida entre as pastas `tests` e os testes em `src`/`marketing-app`.
- Serviço: **336 passaram, 26 skipped, zero falhas**, 1.556 asserções, 52 arquivos. PostgreSQL 16 exclusivo em `127.0.0.1:15479/marketing_review`, com migrações reais. Os skips pertencem à suíte de engajamento que exige outro banco dedicado.
- Persistência/sync local: **10 testes Node/SQLite passaram**.
- TypeScript: contratos, produção, workbench, serviço e desktop passaram. O primeiro passe apontou um tipo opcional na expectativa de um teste, corrigido e verificado novamente sem relaxar o compilador.
- Builds completos do desktop e do app Next.js passaram. Permanecem os avisos existentes de tamanho de chunks e diretivas de módulos no Vite.
- Biome nos arquivos de código alterados e `git diff --check`: sem problemas.
- Nova prova de render: três receitas × 1080×1920 e 1080×1350, com frames 89 → 0 → 45 → 89 e repetição idêntica. MP4 H.264 de 9.009 ms, 30000/1001 FPS; originais preservados; mídia ausente e excesso de texto rejeitados. Execução de aproximadamente 40 s, sem medir p95 ou ganho comercial.
- Player/UI: 18 comparações de pixels passaram, diferença média por canal de até 0,0000066 nas execuções (limite <1). Interface em 1440/390 px, sem overflow ou erros JS; seletor mostra o headline mesmo com `clip.text` legado; exemplo não envia comando. Inspeção visual da folha de contato e da interface móvel concluída. O texto de ajuda agora informa **até** seis amostras, coerente com o orçamento compartilhado.

Artefatos regenerados: [render](render-evidence.json), [Player/UI](ui-validation.json), [composições](demonstracoes.png), [interface móvel](ui-mobile.png) e [desktop](ui-desktop.png).

Comandos principais: `bun test` no serviço com `MARKETING_TEST_DATABASE_URL` do banco exclusivo; `bun run typecheck` nos cinco pacotes; `bun run test:local` e `bun run build` no desktop; `bun run build` no app; `bun run scripts/prove-demonstrations.ts` no desktop; `node .audits/marketing-demonstracoes-flute-2026-10-16/verify-ui.mjs` na raiz.

## Limites e integração

As verificações de transporte usam o serializador nativo e arquivos reais, sem chamada autenticada ou paga de IA. UI usa componentes reais e transporte de fixture. O ensaio não comprova duas máquinas físicas, R2 em rede real, instalador assinado, autoria de código arbitrário isolado ou resultado comercial. Esses critérios continuam no plano da reforma principal.

Todos os achados desta revisão foram corrigidos; não há achado conhecido pendente neste incremento. O staging permaneceu limpo em `4db993ba8` na conferência anterior à integração. Commit e merge local seguem após o fechamento documental; seus hashes ficam no histórico Git e na entrega ao usuário. Sem push ou publicação.
