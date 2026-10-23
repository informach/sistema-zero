# L0 — Resultado da qualificação técnica local

Data: 16/10/2026. Escopo: decidir a arquitetura antes da integração no produto. Não é aceite do Estúdio Python completo. Ambiente: Windows 11, Ryzen 5 5600G, 16 GB, Chrome/Edge locais; CPython 3.14.2/Tk 8.6.15; Pyodide 314.0.7; Pyright 1.1.414 em Linux/Docker real.

## Decisão e limites

A direção é viável para a implementação: CPython WASM em worker dentro de iframe opaco, bootstrap Blob clássico, CSP/Trusted Types para impedir workers descendentes, entrada/eventos suspensíveis e adapter Turtle próprio. A fonte autoral permanece Python. Os testes de referência usam CPython/Tk oficial; não exportam o adapter browser como substituto de Turtle desktop.

As hipóteses rejeitadas estão preservadas. A meta original de recolher fisicamente qualquer worker em 1 s **falhou**. O contrato adotado separa corte de efeitos/ACK imediato da liberação nativa em até 3 s na carga qualificada. [ADR 001](../../.compozy/tasks/estudio-python-l0/adrs/001-worker-stop.md) contém evidência, alternativas descartadas e a limitação do interrupt opcional. Não houve relaxamento de origem, `allow-same-origin`, headers de vídeo ou sobrescrita de APIs do navegador.

O aceite desta direção permite L1; não habilita Python na interface. O aceite final continua dependendo de L1–L8, catálogo completo contratado, jogos, integrações, desempenho com editor/vídeo e revisão global.

## Evidência por requisito

Todos os artefatos citados ficam em `.cache/studio-python-l0/`. Os probes registram versões e hashes de suas fontes. O cache e os binários não entram no produto.

| Requisito local | Resultado e evidência |
| --- | --- |
| Distribuição fixa | `runtime-manifest.json` fixa os cinco arquivos e SHA-256. CPython desktop oficial e imagem Linux também fixados. Não existe download arbitrário indicado pelo projeto. |
| Python real e suspensão | Chrome `browser-probes-2026-10-16T19-43-34.198Z-90e4e5cf-5d83-4c39-a8ae-87549df055d9.json`; Edge `browser-probes-2026-10-16T19-50-56.240Z-24e20979-3cf5-4e8b-8c97-2eae76557388.json`. Aritmética, espera síncrona, entrada/EOF, cancelamento e reinício. |
| Turtle e eventos | Oito fixtures: geometria, evento/update, timers, sleep, input, movimento em timer, reentrância e erro de callback. Mesmo comportamento observado nos browsers e em `desktop-2026-10-16T19-27-58.905Z-c943af9c-e59c-479f-88a1-3b723c5a9f69.json`. Tecla real durante movimento; geração antiga não recebe novas entradas. É um recorte da API, não catálogo completo. |
| Isolamento no navegador | `security-chrome-abcc6f61-1e31-4b9d-97e7-78eb24e3b5f8.json` e `security-edge-3935ef71-6804-4d8c-95d5-7d83fcde296d.json`: acesso ao pai negado, zero requests no canário de rede, filho/policies bloqueados, flood de objetos e primitivas limitado, erros malformados sem coerção hostil, recuperação e rejeição dos bootstraps alternativos. |
| Encerramento físico | Chrome `termination-chrome-3c9ab124-7750-4875-8e46-fe1923334740.json`; Edge `termination-edge-1f4c508a-86c9-4d48-8d4a-d6c5a4277a4b.json`. 26 amostras por navegador, target/CPU observados, loop iniciado antes de Parar e reinício posterior. Busy loop normalmente permanece cerca de 2 s após o ACK. SAB acelera muitos casos, mas não garante 1 s nem em loop comum. Nenhuma amostra protegida excedeu o contrato de 3 s. |
| Memória nativa | `resources-chrome-55fdf2eb-c31b-4b5a-96d7-e9f636b989ee.json`: 30 execuções, processos pertencentes ao navegador próprio, sem forçar GC. Maior incremento amostrado de memória privada: 202.805.248 bytes (193,4 MiB), abaixo do orçamento do recorte de 256 MiB. Retenção final média 5,61% menor que a aquecida. Não mede pico instantâneo nem o editor/Ponte com analisador adicional. |
| Portabilidade de script | `entrypoint-9316ea68-fdc6-48b3-aa0b-5cdded00d66e/evidence.json`: mesmos quatro arquivos no browser e CPython, imports locais/pacote, asset relativo, `__main__`, `__file__`, `sys.argv`, `sys.path[0]`, package/spec/loader. Fonte autoral inalterada. O ZIP de produto será entregue em L7. |
| Serviço de linguagem isolado | `lsp-2026-10-16T19-02-22.529Z-ea8a42c0-fa7d-4da4-ac7f-34ed841057dc.json`: 50 arquivos/20 mil linhas, 30 edições, completion, cancelamento e recuperação. UID1000, rede none, filesystem readonly, cgroup256MiB/1CPU/64PIDs, seccomp/no-new-privileges. Configurações executáveis externas ao snapshot não entram no container. |
| Reidratação da análise | `lsp-2026-10-16T19-59-01.083Z-9146fc0b-83e0-4b2f-a454-b64050c9954a.json`: novo container/processo carrega snapshot de 50 fontes; hash conferido e hover `Literal[30]` confirma a última edição. Não substitui reconexão de gateway autenticado, RTT ou carga de 30 alunos. |
| Pinta real → PNG → Tk | `pinta-975a3769-0d65-4020-bbb5-4a4e90eb6fcc/evidence.json`: bitmap, frame vetorial e mapa2048²; PNG golden idêntico e leitura no Tk com transparência. 30 conversões, p95 146,1 ms; intervalo rAF p95 16,8 ms. Quatro diferenciais completos, zero componentes RGBA diferentes. Cada um dos 30 cancelamentos foi associado ao seu target até destruição; maior limite superior observado146,99ms. |
| Preservação JS inicial | Baseline de 164 testes/731 asserts/23 arquivos passou. Isso não é a regressão final nem demonstra consumidores já migrados. |
| Prova externa | Kit Windows preparado e ensaiado localmente. Por instrução explícita do usuário, será atualizado e usado somente depois da implementação/validação completa aqui. Não é gate de L0/L1. |

## Falhas que mudaram a solução

- Worker HTTP direto e bootstrap Blob módulo não funcionaram na topologia Chromium exigida. Somente o bootstrap clássico qualificado permanece aceito no perfil protegido.
- Remover/navegar o iframe não garantiu interrupção rápida. Filho ocupado podia levar o recolhimento a aproximadamente 4 s. A solução bloqueia criação de descendentes na fronteira nativa Trusted Types.
- Aceleração por SAB não pode ser exigida globalmente: páginas com vídeo têm restrições de COEP. Mesmo onde disponível, houve amostra Edge de aproximadamente 2 s. Os resultados abaixo de 1 s não são uma garantia.
- SVG integral do mapa Pinta demorou segundos; profiling encontrou layout dominante. Rasterização por tile e composição/PNG em worker mantiveram os pixels e reduziram o bloqueio. Não é licença para reduzir resolução ou apagar formas.
- Montar o projeto inteiro no Pyright permitia hook `.pnp.cjs`. Snapshot restrito a fontes `.py`/`.pyi`, com configuração confiável separada, remove essa entrada de execução. Permissões Node no Windows não foram tratadas como isolamento Linux.
- Erro em callback Turtle inicialmente abortava o browser; Tk reporta e continua. O adapter foi corrigido e ganhou fixture de regressão.

## Revisão e continuidade

Rodadas001–007: 18 achados resolvidos; frontmatter e contagens conferidos. Revisão final008 encontrou ainda um problema de relatório: falha de limpeza/integridade podia coexistir com `qualification` aprovado. A finalização comum agora invalida o resultado sem descartar as amostras. Revisor reavaliou a correção e não encontrou outro bloqueio no escopo. Testes atuais do harness: **10 pass, 0 fail**, TypeScript exit0, Biome45arquivos sem alterações. Essa correção muda o veredito de falhas tardias; não altera execução Python, protocolo ou medições bem-sucedidas acima. Os artefatos anteriores foram conferidos sem `failure`/`cleanupFailure`. L0 aprovado para avançar a L1, sob o contrato revisado da ADR001.

Permanecem para os lotes de produto: quatro variantes documentais e migrações; JS sem regressões; runtime/publicação versionados; linguagem/Blocos/Ponte; Turtle contratado; Pro/Pyright com autorização; Pinta integrado; admin/aulas/salas; mural/exportação/Zappy; Pac-Man e Space Arena completos; editor com vídeo, responsividade e avaliação global. A proteção web não oferece quota rígida de RAM contra toda alocação hostil; não afirmar imunidade a OOM. Firefox/Safari/iOS não estão homologados por estes resultados.
