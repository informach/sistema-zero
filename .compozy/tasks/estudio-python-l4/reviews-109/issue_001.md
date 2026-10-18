---
status: resolved
file: packages/studio/scripts/python/prepare-stdlib.ts
line: 64
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Preparo da stdlib aceita resultado após retirada do chamador

## Review Comment

O helper combina o sinal do chamador com o deadline, mas a continuação `if (await readVerified(destination, signal)) return result` retorna sem conferir novamente esse lifetime. readVerified verifica o sinal antes de calcular o digest; uma retirada agendada depois do SHA e antes da continuação do await deixa a função devolver sucesso com signal.aborted=true. O retorno depois da verificação final do destino tem a mesma fronteira. Isso viola a propriedade prometida da invocação cancelável, mesmo quando o ZIP continua íntegro: o chamador retirado recebe um preparo aprovado e pode continuar a montagem.

Reprodução independente `.cache/review109-stdlib-cache-cancel.test.js`: usa o cache real afc02bfc… e o SHA nativo, sem compilar nem fabricar digest. Um wrapper isolado apenas agenda abort por queueMicrotask depois de digest retornar. Confirma uma verificação nativa e sinal retirado, mas outcome.ok=true; esperado false. `bun test ./.cache/review109-stdlib-cache-cancel.test.js` falha exit1, 0pass/1fail/3asserts. O mock vive somente nesse processo de prova e não modifica produção ou setup global. Duas tentativas iniciais corrigiram o próprio probe (binding ESM do createHash precisava ser capturado antes de mock.module); a reprodução causal final não tem essa recursão.

Extensão independente da mesma raiz em `.cache/review109-stdlib-teardown-cancel.test.js`: porta de child controlada devolve receipt correto e copia ZIP real pinado, mantendo FS e SHA reais. Depois do rmdir nativo do temporário próprio, agenda abort por microtask. O helper retorna retired=true/aborted=true/ok=true; teste falha exit1, 0pass/1fail/4asserts. Nenhum compilador/processo foi executado nessa prova de controle; ela demonstra a continuação assíncrona depois da limpeza, não comportamento de IPC nativo. Cache próprio foi removido pelo teste.

Conferir o sinal na continuação de cada await antes de aceitar o resultado e imediatamente antes da resolução final. No caminho que criou processo/temporário, essa última fence deve também suceder o teardown assíncrono: um return dentro do try ainda aguarda o finally. Preservar cleanup independente e limitado depois de retirada, sem publicar sucesso tardio. Capturar vendorDirectory/nodeExecutable na entrada também mantém estável a invocação durante o preparo.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved após revalidação independente. Helper verifica sinal após await do cache hit e moveu o retorno de miss para depois do finally, com fence após teardown; vendorDirectory/nodeExecutable capturados antes de awaits. As duas provas originais agora passam separadamente1/3 e1/4(exit0), preservando SHA/FS reais e a retirada na mesma microtask. Permanente isolado cache-cancel.cases.ts foi lido e o modo hit executado independentemente1/4(exit0); modos published/cleanup usam Node/WASM reais no log do implementador l8-stdlib-helper-tests-2.log,12pass/0fail/32asserts com concorrência/timeout/cancel-one. Nenhum compilador/TSC/browser/Docker foi executado pelo revisor neste recorte. Distribuição c4abecc6… verificou manifesto canônico e24arquivos SHA/tamanho, stdlib afc…7066273 e receita LF pinada. Severidade medium restrita à ferramenta de build; não é aprovação de código do aluno nem erro de integridade do ZIP. Nova qualificação de runtime/desempenho permanece separada e pendente; resultados L3 históricos não são reutilizados para essa conclusão.
