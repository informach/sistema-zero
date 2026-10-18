---
status: resolved
file: packages/studio/src/runtime/python/standalonePlayer.ts
line: 160
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Callbacks reentrantes escapam das fences do player

## Review Comment

As fences depois dos callbacks event/session protegem esses dois caminhos, mas disposed/failed continuam permitindo que uma operação obsoleta altere a geração criada pelo observer. No início de run, dispose invoca observer.disposed; se o callback reiniciar, a execução aninhada cria seu frame e se torna active. A execução externa então captura a geração já alterada, cria outro frame e sobrescreve active, deixando o iframe aninhado órfão. No catch de run, observer.failed pode reiniciar; o catch antigo continua e chama dispose sobre a NOVA execução, removendo-a e sobrescrevendo o status.

Reprodução independente: `bun test ./.cache/review082-observer.test.ts`, cwd Studio, exit1/0pass2fail/4assertions. Usa o standalonePlayer real e DOM real HappyDOM com portas de sessão/loader controladas em processo próprio. Primeiro caso observer.disposed faz start.click uma vez: expected1iframe/actual2. Segundo caso primeiro session.run falha e observer.failed faz start.click: expected1iframe/actual0, pois o catch anterior encerra a nova geração. A implementação real de session.dispose encerra sessão/worker, mas não remove o iframe fornecido pelo host, confirmando que o primeiro frame realmente depende do cleanup do player. Não é prova de navegador ou SDK.

Reservar a identidade/geração da operação antes de invocar callbacks de disposal e revalidar após cada callback reentrante, inclusive failed/mount failure, antes de criar/remover frames, iniciar sessões ou alterar UI. Operações obsoletas devem limpar apenas seus próprios recursos. Acrescentar regressões que reiniciem/retirem dentro de disposed e failed, conservando os controles event/session já protegidos e o comportamento sem observer.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada independentemente. Run reserva token antes de dispose e só admite a substituta se callback não mudou geração/lifetime. Catch revalida active/token após failed; stop/failed atualizam status somente sem nova active e na geração aposentada esperada; mount catch revalida mountGeneration após callback. Reproduções originais agora passam, sem alterar a expectativa: owncache5pass/18assertions exit0, cobrindo órfão/restartfailed, stopstatus reentrante, disposed→pagehide e erro de observer reportado sem impedir cleanup. Wrapper permanente standalone.test.ts:exit0/1pass/2assertions em filho isolado; casos permanentes incluem3BFCache originais+2reentrância, com resumo positivo sem contador manual3. Nenhuma fonte alterada pelo revisor. Browser/SDK com observer novo permanecem qualificação separada, sem inferir aprovação por DOM controlado.

### Escopo complementar

Execução independente explícita `bun test ./src/runtime/python/standalone.cases.ts`, cwd Studio:exit0/5pass/33assertions, confirmando todos os casos do filho. O prefixo ./ é necessário para Bun tratar cases.ts como caminho explícito fora da descoberta .test/.spec; wrapper permanente já usa esse caminho corretamente.

python-browser-resources.mjs/python-inspect.mjs/DockerCOPY e testes lidos integralmente e comparados ao inspector anterior staged: extração mantém validação, hashes/tamanhos, realpath/confinement e mapa fechado, sem executar fontes de projeto. `bun test tests/python-browser-resources.test.js`: exit0/4pass/18assertions, incluindo junction real com bytes/hash corretos fora da raiz, corruptsize/hash/duplicate, HTTPmethod/HEAD e WebSocket. Biome6arquivos:exit0; Dockerfile é inspecionado, não arquivo formatável pelo Biome. Nenhum defeito novo confirmado nesse helper. Não há produtor headless de playtest ou qualificação remota neste recorte.
