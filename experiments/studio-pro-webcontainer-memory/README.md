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
| Harness, Vite 8.0.16 / Rolldown 1.0.3 | 2.360 e 2.447 MiB | 1.386 e 1.457 MiB | — |
| Harness, Vite 8.1.6 / Rolldown 1.1.5 | 2.386 e 2.355 MiB | 1.436 e 1.373 MiB | — |
| Estúdio (playground), Vite 8.1.6 | 2.686 e 2.618 MiB | 1.548 e 1.430 MiB | 37–58 MiB |

Conclusões, válidas para esta máquina (32 GB, Chrome 155 headless):

1. A atualização de segurança do Vite não muda o consumo nesta medição: as duas versões ficam na mesma faixa.
2. A própria pilha WebContainer + npm + Vite chega a cerca de 2,4 GiB nessa métrica; o Estúdio acrescenta ~200–300 MiB. Um único renderer, provavelmente o do WebContainer (o CDP informa só o papel `renderer`, não o frame), chega a ~1,35–1,5 GiB durante `npm install`/subida do Vite, enquanto o heap JS da página principal fica entre 37 e 58 MiB.
3. Os orçamentos de 1.024 e 2.048 MiB ficam abaixo do que essa pilha usou aqui, nas duas versões. Os NEG hospedados continuam NEG. O ambiente hospedado é outro (lá o maior renderer chegou a ~1.019 MiB antes da interrupção), e não há medição de uma versão antiga do Estúdio; por isso este diagnóstico não descarta regressão, só mostra que a pilha base já passa desses orçamentos.
4. A primeira tentativa local falhou no boot por download abortado da CDN do WebContainer (`WebAssembly compilation aborted`), e a repetição passou. Falha transitória de rede, não de memória.

Orçamento funcional e meta de desempenho são decisões separadas; este diagnóstico não altera nenhum limite.
