# Revisão para publicação do Molda em staging

Revisão de todas as alterações locais do Molda acumuladas nesta sessão, incluindo a interface de componentes, faca, loop cut, seleção, extrusão, criação de faces, inset, flip, medidas, grupos, preparação da pintura e folha UV. Inclui os arquivos novos, as referências visuais e os achados da [revisão anterior](../../2026-10-17-molda-full-review.md).

## Achados

Quatro achados adicionais foram reproduzidos e corrigidos: [zoom durante arrasto](./issues/BUG-001.md), [troca de editor durante ajuste UV](./issues/BUG-002.md), [cursor de pixel](./issues/BUG-003.md) e [troca de editor durante arrasto na árvore](./issues/BUG-004.md). As regressões falharam antes das respectivas correções. Não foram ampliadas tolerâncias visuais nem removidas asserções para acomodar falhas.

## Contrato de verificação

O pacote define `bun run test`, dividido em três processos, `bun run typecheck` e Playwright em `bun run e2e`. A verificação de estilo do repositório é `bun run ci`. O playground usa Vite; o consumidor publicado é `community-kids`, com verificação de tipos própria. O CI remoto valida também os demais pacotes e libera o deploy de staging somente após seus gates.

O servidor local existente em http://127.0.0.1:5198 foi reutilizado. A ferramenta agent-browser não está instalada neste ambiente; a validação de navegador usa o Playwright oficial do pacote, com seus cenários e asserções reais, sem criar outro harness.

## Cobertura automatizada

| Fluxo | Cobertura |
| --- | --- |
| Faca, loop cut, seleção e remoção | existing-e2e: knife, component-operations, component-panel |
| Extrusão por alças, criar face/linha, inset e espelhamento | existing-e2e: component-operations |
| Medidas inteiras e decimais, flip e pivô | existing-e2e: measurements, flip-nodes, scene-workshop |
| Agrupar, renomear, arrastar e desfazer | existing-e2e: hierarchy-groups |
| Pintura 3D e 2D, camadas, UV e transferência de pintura | existing-e2e: paint-simple, simple-uv, scene-workshop |
| Responsividade, temas e identidade visual | existing-e2e: fidelity, scene-workshop-layout, simple-uv |
| Importação/exportação, histórico, persistência, workers e permissões | suítes completas do pacote e jornadas de navegador |
| Troca de store sem desmontagem | regressões de integração na API React do host |

Os cenários usam temas claro e escuro, as 15 composições visuais existentes e tamanhos de desktop, tablet e celular. O zoom e os pontos UV são exercitados em Chromium, Firefox e WebKit; a pinça usa a API de toque do Chromium. O playground não requer autenticação. A verificação do ambiente publicado será registrada após o deploy.

## Evidências finais

Verificações locais em 17/10/2026, entre 22:13 e 22:22 (America/Sao_Paulo), após as correções. Logs em `packages/molda/.cache/release-review-*.log`.

| Afirmação | Comando | Exit code | Resultado | Veredito |
| --- | --- | --- | --- | --- |
| Tipos do Molda válidos | `bun run typecheck` em packages/molda | 0 | Sem erros TypeScript | PASS |
| Consumidor Kids compatível | `bun run typecheck` em packages/community-kids | 0 | Sem erros TypeScript | PASS |
| Playground compila | `bunx vite build --config playground/vite.config.ts` | 0 | Build concluído | PASS |
| Suíte completa do Molda | `bun run test` em packages/molda | 0 | 3.356 aprovados: 1.095 + 1.161 + 1.100; zero falhas | PASS |
| Suíte do Kids | `bun run test` em packages/community-kids | 0 | 1.413 aprovados; zero falhas | PASS |
| Matriz completa de navegador | `PW_REUSE_SERVER=1 bunx playwright test` em packages/molda | 0 | 104 aprovados, quatro skips existentes, zero falhas; 9,8 minutos | PASS |
| Estilo e formatação do repositório | `bunx biome ci .` na raiz | 0 | 9.073 arquivos verificados; zero erros | PASS |
| Todos os arquivos alterados de código | `bunx biome check` nos 162 arquivos TS/TSX/CSS alterados ou novos | 0 | Zero diagnósticos | PASS |
| Integridade do diff | `git diff --check` | 0 | Sem erros | PASS |

Warnings: a checagem global manteve 12 avisos e 159 informações; a checagem dos arquivos de código alterados não teve diagnósticos. O Playwright registra o aviso de FORCE_COLOR/NO_COLOR do ambiente. Errors: nenhum nas verificações finais acima. A execução inicial do pacote incluiu a regressão UV ainda vermelha enquanto a revisão ocorria; a execução completa final, em novo processo, passou depois das correções.

As capturas finais de [UV no desktop escuro](./screenshots/desktop-uv-escuro.png) e [folha no celular](./screenshots/celular-folha.png) foram inspecionadas. A navegação permanece compacta, os controles avançados ficam recolhidos e não há transbordamento horizontal no celular. As comparações das 15 referências visuais passaram sem alterar tolerâncias.

A matriz completa terminou em 17/10/2026 às 22:25 (America/Sao_Paulo), com 104 aprovações e quatro skips existentes. Os skips são os dois cenários exclusivos do Chromium — traço 3D por seu harness de eventos e medição de heap — nos outros dois navegadores. Todas as regressões de UV passaram nos três navegadores. Log: `release-review-e2e.log`. Veredito final da revisão local: **PASS**, sem achados conhecidos abertos dentro do escopo revisado.

## Evidência de navegador

Servidor: http://127.0.0.1:5198. Autenticação: não exigida pelo playground. Foram executados 104 cenários aprovados, cobrindo os fluxos da matriz acima. Abertura e navegação pela galeria e oficina, formulários válidos/inválidos, estados de falha, recuperação, exportação e persistência têm asserções na suíte existente. As capturas anexadas correspondem ao desktop 1440×1000 e ao celular de 390 px; os cenários também verificam 1280 e 1024 px. Entradas pelo endereço do playground com `nivel=god` e, nos casos de acesso, pelo nível básico. Saídas verificadas na oficina e na galeria pelo próprio teste. Não há fluxo crítico local bloqueado por falta de automação.

O processo de publicação é commit da entrega, merge local em staging, pull da staging remota preservando os históricos, push e acompanhamento do job `deploy-staging` do CI. O workflow valida o monorepo e publica `community-kids` no SHA integrado; seu healthcheck obrigatório é `/api/healthz`.
