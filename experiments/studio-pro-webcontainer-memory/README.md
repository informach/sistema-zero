# Memória do Estúdio Completo Pro — diagnóstico local

Diagnóstico de 21/10/2026 para os NEG hospedados do Pro JS (orçamentos de 1.024 e 2.048 MiB, ver `docs/superpowers/plans/2026-10-21-transferencia-estudio-python.md`, seção 6). Não é aceite funcional nem qualificação de desempenho: mede quanto a pilha WebContainer + npm + Vite usa no Chrome, sem app hospedado e sem Python.

## Como medir

No diretório `packages/studio`, sirva o playground: `E2E_PORT=5291 bun run serve:e2e`. Para o harness mínimo, que usa `@webcontainer/api` direto, sem o Estúdio, rode na raiz da worktree:

```sh
node experiments/studio-pro-webcontainer-memory/harness-server.mjs 5292 <fixture.szproject.json>
node experiments/studio-pro-webcontainer-memory/sample-pro-memory.mjs raw "http://127.0.0.1:5292/?vite=8.0.16" raw-8016 <saida>
node experiments/studio-pro-webcontainer-memory/sample-pro-memory.mjs studio http://127.0.0.1:5291/ studio <saida>
```

A fixture usada foi o projeto legado de seis arquivos da tentativa hospedada (`docs/continuity/2026-10-21-studio-python/snapshots/root/0342-legacy.szproject.json.snapshot`). O harness troca somente a versão do Vite no `package.json`. O modo `studio` cria um projeto Pro novo pela UI do playground (template atual, Vite 8.1.6).

O amostrador lê, a cada 500 ms, o working set de cada `chrome.exe` (`tasklist`) e o papel do processo (CDP `SystemInfo.getProcessInfo`), marcando a fase visível (boot, `npm install`, Vite, pronto). A soma de working sets pode contar páginas compartilhadas mais de uma vez; não é RAM física exclusiva, mas é a mesma métrica conservadora dos orçamentos hospedados.

## Resultado (duas rodadas cada, `results-20261021.json`)

| Cenário | Pico total | Maior processo (renderer) | Heap JS da página |
| --- | ---: | ---: | ---: |
| Harness, Vite 8.0.16 / Rolldown 1.0.3 | 2.360 e 2.447 MiB | ~1,4 GiB | — |
| Harness, Vite 8.1.6 / Rolldown 1.1.5 | 2.386 e 2.355 MiB | ~1,4 GiB | — |
| Estúdio (playground), Vite 8.1.6 | 2.686 e 2.618 MiB | ~1,4–1,5 GiB | 58 MiB |

Conclusões:

1. A atualização de segurança do Vite não muda o consumo: as duas versões ficam na mesma faixa.
2. A própria pilha WebContainer + npm + Vite precisa de cerca de 2,4 GiB nessa métrica; o Estúdio acrescenta uns 300 MiB. Um único renderer (o do WebContainer) passa de 1,4 GiB durante `npm install`/subida do Vite, enquanto o heap da página principal fica perto de 58 MiB, como no NEG hospedado.
3. Os orçamentos de 1.024 e 2.048 MiB ficam abaixo do que essa pilha usa em qualquer versão. Os NEG continuam NEG, mas não indicam regressão do Estúdio, do Python ou do Vite 8.1.6: o limite estava abaixo da linha de base.
4. A primeira tentativa local falhou no boot por download abortado da CDN do WebContainer (`WebAssembly compilation aborted`), e a repetição passou. Falha transitória de rede, não de memória.

Orçamento funcional e meta de desempenho são decisões separadas; este diagnóstico não altera nenhum limite.
