# Lote 0: referência e review

Base `b030c443e`, Windows, Ryzen 5 5600G, 16 GB, RTX 3050, Bun 1.3.11, Node 24.15.0. Fixtures sintéticas sem dados de alunos.

## Provas coletadas

- `cpu-baseline.json`: 30 amostras por busca/ZIP; caso extremo de 100 diagnósticos em arquivo de 1,84 milhão de caracteres usa 3 amostras devido ao custo. É microbenchmark, não latência de browser. A tentativa exploratória de 30 amostras desse extremo foi interrompida; não entra no resultado.
- `browser-baseline.json`: build Vite de produção do editor real com serviços controlados; 30 aberturas, mais de 200 caracteres e 30 ciclos de layout. Sem erro de página e sem troca de models/conteúdo nos ciclos.
- Browser: abertura p95 1.150 ms; entrada até segundo frame p95 46 ms; ida/volta de layout p95 220 ms (inclui duas ações e auto-wait Playwright, não comparar diretamente ao teto de 100 ms de uma troca).
- CPU: busca sem resultado p95 0,59 ms/7,29 ms/44,40 ms em 120k/1,44M/7,8M caracteres. Filtro extremo de diagnósticos p50 2.536 ms, máximo 2.984 ms. ZIP de 1,44M caracteres incluindo descompactação/verificação p95 73,80 ms.
- `baseline.cpuprofile`: amostragem de 9,76 s; `sha256Base64` ocupa as primeiras posições (55,7% e 20,0% em duas localizações); o filtro acumula 88,4%. `cpu-profile-run.json` é uma repetição instrumentada, separada da referência comparativa.

## Portões desta execução

| Caminho | Teto de laboratório | Prova adicional |
| --- | --- | --- |
| Busca de conteúdo | 200 ms até fronteira remota, 1 s na fronteira local | Ordem, Unicode, CRLF, limites, arquivos fechados e resultado vazio idênticos |
| Filtro de 100 diagnósticos em arquivo grande | 100 ms CPU | Rejeitar hash antigo e não reter documento encerrado |
| Entrada até segundo frame | 60 ms p95 para a proxy local | Não é a meta de pixel exato de 50 ms; validar texto aceito e ausência de erro |
| Abertura do fixture | 2 s p95 aquecida; 10 s primeira abertura local | Capturar primeiro valor separado e declarar rede/cache |
| Layout ida/volta | 300 ms p95 para as duas ações via Playwright | Mesmos models, conteúdo e sessão |
| ZIP | 500 ms total para fixture remota; compressão sem tarefa síncrona longa no browser para lote grande | Conteúdo descompactado idêntico, sem consumir buffer do projeto; tempo total pode incluir criação de worker |
| Memória/recursos | 0 models/listeners/workers exclusivos retidos após encerramento; caches compartilhados limitados à política atual | Medida de heap isolada não comprova ausência de vazamento; medir ciclos e dono |

As metas da proposta para hardware físico de entrada, pixel exato, host Kids autenticado, carga 3D concorrente, flush/linguagem e estudo com alunos não estão comprovadas por este fixture. Não ampliar a alegação das provas; documentar cobertura adicional no review final. Limites de laboratório acima complementam, não substituem, esses critérios externos.

## Oportunidades e ordem

| Mudança | Impacto × confiança / esforço | Decisão |
| --- | --- | --- |
| Hash por arquivo no filtro e geração de diagnósticos | 5 × 5 / 1 = 25 | Primeiro: elimina repetição, mesma validação |
| Busca por linhas sem alocação de todos os trechos, somente quando visível | 4 × 5 / 2 = 10 | Segundo: preservar resultados literais/posições |
| ZIP assíncrono com paralelismo limitado | 4 × 5 / 3 = 6,7 | Verificar biblioteca/worker e bytes antes/depois |
| Símbolos pela fonte ativa; preparação coalescida | 3 × 4 / 3 = 4 | Manter invalidação semântica e revisão; sem segundo compilador |

## Review

Corrigidos no harness: caminho explícito `./scripts/...` exigido pelo Bun; número de amostras do extremo registrado; métricas de Playwright/proxy separadas das metas do produto. Os resultados funcionais possuem SHA-256 para comparação antes/depois. O browser não simula um teste completo de Kids/WebContainer e não faz inferência paga.

Cobertura existente a reutilizar: `workspace`, `proWorkspaceOperations`, `proRevision`, `proFsSync`, `proAssetSync`, `languageService`, `sourceExport`, `zip`, `initialBundleBudget`; E2E workspace/builder/Zappy; provas de export dos kits; gates de acesso do member-shell/Kids. O lote 1 pode prosseguir com as correções mensuráveis, mantendo as limitações externas explícitas.
