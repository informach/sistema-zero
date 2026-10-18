---
status: resolved
file: packages/studio-runtime/runtime/python-inspect.mjs
line: 51
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Validador local do runner recusa dotfiles portáveis válidos

## Review Comment

O regex portablePath local exige primeiro caractere alfanumérico/underscore/hífen em cada segmento. O contrato Core isStudioPortablePath aceita dotfiles, exceto os nomes explicitamente proibidos. Assim um entrypoint válido .main.py passa pelo snapshot, pelo coordenador e pelo analisador, mas o preflight Node recusa o recurso e o runner não consegue inspecionar essa revisão. Também existe uma segunda política de profundidade/nome independente da canônica, propensa a divergências futuras.

Prova independente `.cache/review069-runner-path.test.ts` no pacote studio-runtime: coordinator real faz staging da revisão e dos bytes aprovados; o probe executa o prefixo EXATO de python-inspect.mjs até antes de browser launch, removendo somente o import Playwright não usado nessa fase. main.py passa o preflight, .main.py é validado pelo Core e depois falha com Invalid inspection resource no Node. `bun test ./.cache/review069-runner-path.test.ts`:exit1,1 pass,1 fail,7 verificações. Nenhum browser/Docker é iniciado e nenhuma produção é alterada pelo revisor.

Reusar o leaf canônico de paths no runner, sem manter um segundo regex. Preservar realpath/isFile, contenção no diretório, limites e lista fechada de recursos, além de traversal/nomes reservados/depth do Core. Cobrir entrypoint e segmentos ocultos válidos, com negativas canônicas.

## Triage

- Decision: `VALID`
- Final verification: Biome fresh dos oito arquivos exit0. `.cache/review069-final-check.ts` exit0 confirma inclusão do módulo gerado no fingerprint atual `70f43469c1ff770b11d6026bd00ee7b8517a7659f9deeff4203aee5202f6dfa2` e YAML/metadados 2/2/0. Essa verificação somente lê arquivos; não reconstrói nem qualifica a imagem nova.
- Notes: Implementador confirmou e removeu o regex local. Runner importa isStudioPortablePath do módulo Node gerado do leaf Core, incluído no fingerprint e copiado readonly para a imagem; --check exige byte-equivalência do asset gerado antes de conferir o profile. Prova independente adaptada `.cache/review069-runner-path.test.ts` copia/importa o módulo GERADO REAL e executa o preflight Node exato, sem browser: main.py, .main.py e .source/.main.py passam. Uma matriz de18 paths confronta o módulo Node real com Core, cobrindo dotfiles, limite240/241, profundidade16/17, traversal, segmentos vazios, WindowsCON, .git/.venv/node_modules e nomes protótipos.4 pass,0 fail,14 verificações,exit0. Combinado com os testes do coordenador/config/JS:36 pass,0 fail,190 verificações,exit0. Pipeline/fingerprint/COPY/Biome-exclusion narrow revisados; leitura independente recalcula fingerprint e confirma inclusão do generated leaf, sem executar build. Nenhuma produção alterada pelo revisor; imagem Docker com o novo asset não foi reconstruída pelo revisor. Não duplica064, cujo consumidor era a ferramenta do Builder.
