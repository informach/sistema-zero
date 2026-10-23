# Preparação paralela dos metadados Python

Objetivo: retirar uma dependência serial medida na preparação do iframe, preservando validação, cancelamento e isolamento. Não trocar runtime, distribuição, metas ou topologia de workers.

Baseline local J-CI996e6097..., Chrome Pro F1, três aquecimentos e dez amostras sem profiler: primeira execução p95=8497,90ms/12000; cache p95=1529,60ms/3000; edição p95=1546,30ms/1500 (uma amostra acima). Todos os13cenários funcionais passaram. Prova em `.cache/studio-python-l0/jci-f1-baseline-chrome-pro-20261019T191220803Z/`; não é homologação com vídeo ou computador de referência.

Perfil diagnóstico separado: janela edição1461,30ms; metadados imutáveis começam303,98ms, após frame.mjs, e acabam393,84ms. Worker não começa antes dessa etapa. Evidência em `jci-f1-profile-chrome-pro-20261019T191659482Z/edited-{cpu-summary,network-tasks}.json`. CPU e tarefas paralelas não devem ser somadas ao tempo de parede. Oportunidade: antecipar esse I/O independente; impacto3, confiança4, esforço2, score6. Nenhuma atribuição de gargalo ao tamanho do bundle sem prova.

Desenho: depois de validar posse do iframe, URL/hash aprovados, atividade e sinal, instalar listeners e começar uma única preparação pública de boot junto à navegação. Observar sua rejeição imediatamente. Hello continua exigindo source, origin null, protocolo e challenge corretos. Somente hello bootResources1 consome o resultado; ausência legado não depende de metadados/CacheStorage nem recebe broker. Pode haver HTTP antecipado no legado. Antes da transferência, revalidar active/closed/signal. Fechar ou abortar cancela a mesma preparação; nenhum resultado tardio cria canal. Não iniciar worker, executar código, abrir cache de bytes ou entregar snapshot antes do hello válido. Não guardar metadados como autorização nem reutilizar concessões de execução.

Parecer independente favorável a essas fronteiras: `.cache/studio-python-l0/python-boot-metadata-prefetch-design-review-20261019.md`.

- [x] Provar causalmente, com sessão e host reais e barreiras nos limites DOM/rede, início de metadados antes do hello, sem transferência antecipada.
- [x] Cobrir hello falso, falha antecipada, legado, abort antes/durante preparação e resposta tardia, sem unhandled rejection ou broker posterior.
- [x] Implementar somente a sobreposição em session.ts; repetir controles de boot/canal/semântica e tipos pertinentes.
- [x] Repetir provas funcionais F1 e três aquecimentos/dez medições sem profiler; preservar falhas e comparar identidade da distribuição.
- [x] Rever diferença e resultados. Se não houver ganho com comportamento preservado, retirar o candidato. Rollback do lote por git revert após commit, sem alterar a release imutável.

Preservação: ordem dos comandos e dos efeitos do programa, geometrias/cores, sementes, biblioteca Python e floating point permanecem iguais. Muda somente o começo da leitura/verificação de metadados públicos já pinados. Screenshots, saída f1-ready, segunda linha azul e recibos de fechamento são os oráculos funcionais existentes; não relaxar suas asserções para atingir a meta.

Resultado local do candidato em `jci-f1-overlap-candidate-chrome-pro-20261019T192837787Z/`: 13/13 funcionais, dez amostras medidas após três aquecimentos. Cold p95=8395,70ms; cache p95=1428,40ms; edição p95=1429,90ms, nenhuma amostra acima de1500ms. A edição melhorou116,40ms no p95 e167,00ms na mediana em relação ao baseline. Mesma distribuição imutável J-CI; memória livre inicial menor no candidato (~1,3GiB), sem atribuir a melhora a condições de máquina idênticas. Não qualifica vídeo, Edge/Classic nem o computador de referência.

Provas focadas após ajuste do tipo do mock fetch:37testes/187asserções em quatro arquivos, com subtestes Node24 nativos aprovados. A primeira checagem completa de tipos Studio recusou somente o mock novo, pois Bun exige a propriedade preconnect de fetch. O mock agora preserva essa propriedade conforme o padrão existente; a repetição completa StudioTSC com Node24/TS5.9.3 passou exit0/log vazio (`python-metadata-overlap-studio-typecheck-green-20261019.log`). Nenhum cast ou alteração de código produtivo para acomodar o runner. Os sete hashes de fontes/harness registrados na coleta do candidato continuam iguais após o gate de tipos; só teste/documentação foram ajustados depois da coleta.
