---
status: resolved
file: packages/studio-runtime/runtime/python-playtest.mjs
line: 88
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Receita com stdin perde relatório de falha do programa

## Review Comment

O loop de stdin espera inputPending OU erro OU conclusão, mas quando acorda sem inputPending lança uma exceção e sai antes de collector.finish e da escrita de python-playtest-result.json. Assim um ImportError/programa encerrado antes de solicitar a entrada devolve relatório failed com receita vazia, mas vira falha genérica de transporte/execução quando a receita inclui stdin. O diagnóstico original pode aparecer em stderr, porém a evidência estruturada da revisão, observações e cleanup se perde, embora o collector já saiba produzir reportfailed com erro e receita incompleta.

Reprodução independente: `bun test ./.cache/review083-node-driver.test.ts`, cwd Runtime, exit1/0pass1fail. Importa o produtor MJS real, utiliza recursos filesystem/Core e collector reais, com porta Playwright controlada sem browser. O collector registra running seguido de ImportError antes de input, recipe stdin=[Lia]; o produtor lança ImportError na linha89 e não grava relatório. A prova esperava relatório failed com erro, stdinSubmitted0 e confirmação de parada. Não é falso sucesso nem qualificação de browser/CPython por esta porta.

Ao observar falha do programa ou conclusão sem entrada, interromper as ações restantes e finalizar a coleta para devolver evidência failed, sem completar artificialmente counters. Reservar throw/erro de infraestrutura para falhas do próprio produtor, protocolo, navegador, bytes ou filesystem. Cobrir também erro/conclusão antes de keys/clicks, para que controles ausentes por falha do programa não ocultem o relatório.

## Triage

- Decision: `VALID`
- Notes: Correção completa revalidada. Caminho stdin abandona ações em erro/conclusão sem input e finaliza collector. Guard performAction agora envolve ação inteira: focus/press/dispatched e waitFor/boundingBox/nullcheck/click/dispatched. Revalidação independente `bun test ./.cache/review083-node-driver.test.ts -t stdin`:exit0/1pass/5assertions; `-t click-race`:exit0/1pass/5assertions. Ambos salvam reportfailed com erro original, input não fabricado e stoppedtrue/browserclosed. Controle `-t infra-race`:exit0/1pass/3assertions; nullbbox SEM erro autoral continua rejeitando como infraestrutura, sem gravar report indevido. A extensão click-race havia falhado antes do último guard. Casos usam processos separados, pois Bun reutiliza o entryMJS apesar do query cachebuster; combo de dois imports não é evidência de produto.

### Evidência complementar

Native4 real do implementador: sete cenários em `.cache/studio-python-l0/playtest-native/ed3c02a4-5e00-4e1e-87f3-c9e324c77f55`, antes do último guard de ação. Conferência independente leve `.cache/review083-native-artifacts.ts <uuid>` exit0: Core valida revision/runtime/receita/status, hash/tamanho de todos os runtimes/fontes, reportfailed ImportError+stdin e completedmissinginput, console/helper, vazio, Turtle com stdout de input/key/click e PNG separado/hash/capture; modifiedfile é recusado sem report. A última corrida assíncrona foi coberta pelas portas controladas atuais, não falsamente atribuída ao Native4 histórico.

Native5 posterior ao último guard: mesma conferência independente dos sete cenários em `2ce8c17c-dbfc-49a1-bfff-597bbc2855a2`, exit0/verifiedtrue. Permanente `bun test tests/python-playtest-driver.test.ts` executado independentemente: exit0/5pass/10assertions, cada cenário em processo isolado (stdin, completed sem stdin, click-race, key-race e infra-click). Nenhum browser ou SDK foi iniciado pelo revisor.
