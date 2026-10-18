---
provider: manual
pr:
round: 2
created_at: 2026-10-16T23:30:49Z
---

## Summary

- Total: 6
- Resolved: 6
- Unresolved: 0

## Scope

Renderer/protocolo/imagens Turtle e integração com interpreter, worker, supervisor, frame e builder. Rodada001 fechada; não repetir seus achados. Sem ativação de catálogo/UI, conformance completa dos grandes jogos, áudio ou conclusão de L4. Manifesto de assinaturas com fixtureFamily null continua rascunho conhecido.

## Evidence

- Leitura integral de graphicsProtocol/images/renderer, interpreter.ts, worker, workerEvents/supervisor, frame, protocol/contract e builder; revisão da instalação privada em interpreter.py.
- Unitários executados agora: `bun test src/runtime/python/workerEvents.test.ts src/runtime/python/workerSupervisor.test.ts src/runtime/python/turtle/graphicsProtocol.test.ts` em packages/studio: 17 pass, 0 fail, 101 verificações, exit 0. Esses testes não cobrem os seis casos registrados.
- Tk real CPython3.14.2: seleção de polígonos sobrepostos, top sem binding, top transparente e fill/outline ambos vazios; bounds multiline; erro recuperável de PNG truncado; reabertura de Screen após bye.
- Execuções isoladas da implementação com doubles de DOM/Canvas/transporte confirmam seleção incorreta de item, ausência de layout multiline, rota terminal da falha gráfica, RAF sem alterações e recusa da tela nova. Não são provas de rasterização nem de desempenho browser.
- Build Bun em memória confirma parser gráfico no bundle inicial, sem criar distribuição. PNG inválido de 33 bytes preservado em `.cache/studio-python-turtle/review002-invalid.png`.
- Não foi iniciado Playwright nem alterada implementação pelo revisor. A rodada real64/64 comunicada pelo implementador não substitui as reproduções específicas; novas provas browser são necessárias após as correções.

## Revalidation

- Cinco issues resolvidos;003 parcialmente corrigido, pendente por perda de eventos no envelope de erro de imagem. Reprodução independente e sugestão registradas no próprio issue.
- Inspeção direta do relatório real `.cache/studio-python-runtime/runs/2026-10-16T23-33-04.863Z/report.json`:20 esperados/aprovados,0 unexpected/flaky/skipped,39,53s,10 testes por Chrome/Edge. Casos novos: seleção sobreposta, texto multiline e move/right, inatividade sem RAF com despertar por tecla/timer, reabertura, PNG inválido capturado seguido de GIF válido.
- Distribuição observada no anexo:59811a1bf0f6b0bc07860ccd982fa67d4f7beb4407ace8c986b7d2bfed5a5efa. Release ad408aab0a4bc23b32c88308351c35139cb13dd074d4012abc995e230b291644; contém17arquivos incluindo turtle-protocol.mjs separado. Essas identidades pertencem à prova examinada, não a alterações posteriores.
- Novo Bun.build independente em memória: parser/renderer/decoder ausentes do worker inicial, referência dinâmica turtle-protocol.mjs presente;1.147.252bytes não minificados.
- Unitários focados repetidos após correções:17pass/0fail/101verificações, exit0. Ensaio isolado: dez presents limpos→zeroRAF; dispose durante wait rejeita; decode concluído após dispose fecha bitmap exatamente uma vez e não entrega resultado.
- Relatório nativo engine-1792193576783158500.json inspecionado: dez pares aprovados. Não se executou Playwright em paralelo nem se alterou implementação.

## Final revalidation

- Seis achados resolvidos. A correção final do issue003 preserva a fila de entrada no erro de imagem. Ensaio independente do renderer: erro com events vazio, próxima troca entrega teclas a/b em ordem, terceira troca vazia. Ensaio CPython confirma captura de TclError e despacho único das duas teclas em updates posteriores. Ambos exit 0.
- As provas browser de recuperação da imagem e os demais cinco comportamentos pertencem à rodada real de 20 testes inspecionada acima; a última alteração da fila foi verificada localmente sem repetir Playwright.
- Novos arquivos/perfis/cotas que estão sendo introduzidos pelo implementador após esta revisão não estão aprovados por este fechamento e serão examinados no recorte seguinte.
