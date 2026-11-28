# Canvas "Famílias e Escolas": fonte e geradores

O Canvas publicado é https://claude.ai/artifact/6NZdjAZCjLGGB5CMMcJFfS (tipo Design, versão 3.0: 12 pranchas de estratégia e 41 telas). Ele fica na conta principal da Helena.

## O que tem aqui

- `project/`: a fonte publicada. `canvas.json` (posição e tamanho de cada quadro, post-its) e um `.dc.html` por quadro. **É a fonte de verdade.**
- `scripts/`: os geradores e as ferramentas, com caminhos relativos a esta pasta.
- `assets/`: as duas logos usadas nas telas.
- `medida/`: saída das medições (fora do git).

A especificação em texto (`../especificacao/`) sai de `project/` por `scripts/texto.mjs`.

## Ferramentas

Rode da raiz do repositório, com `node`.

| Script | O que faz |
|---|---|
| `texto.mjs` | Extrai o texto visível de cada quadro e os post-its para `../especificacao/`. |
| `arrumar.mjs` | Organiza a página "3 · Telas" em fileiras por fluxo (A a E), com título por fileira e o post-it da equipe embaixo de cada tela (`postits-telas.json`). |
| `ajustar.mjs <Quadro.dc.html> [...]` | Mede os quadros pedidos a 1440 px num Chromium (Playwright do pacote `funnel`) e grava a altura real no `$preview` do quadro e no `canvas.json`, para não haver rolagem. |
| `medir.mjs <pasta project> <pasta de saída> [quadros]` | Monta cada quadro como página comum, mede e grava HTML e PNG na saída. |
| `trocar.mjs <trocas.json>` | Aplica trocas exatas; cada troca precisa casar exatamente uma vez, senão para. |
| `acha.mjs <frases.json> [antes] [depois]` | Mostra o trecho-fonte em volta de cada frase, para montar trocas exatas. |
| `postits.mjs` | Coloca um post-it da equipe embaixo de cada tela. |
| `gerar-*.mjs`, `_gestao-colunas.mjs`, `_altura-minima.mjs` | Geram as telas a partir de modelos. |

## Regenerar as telas

Ordem usada na versão 3.0:

```bash
node docs/familias-e-escolas/canvas/scripts/gerar-telas.mjs
node docs/familias-e-escolas/canvas/scripts/gerar-v21.mjs
node docs/familias-e-escolas/canvas/scripts/gerar-v25.mjs
node docs/familias-e-escolas/canvas/scripts/gerar-contas.mjs
node docs/familias-e-escolas/canvas/scripts/gerar-v27.mjs
node docs/familias-e-escolas/canvas/scripts/gerar-v29.mjs
node docs/familias-e-escolas/canvas/scripts/_gestao-colunas.mjs
node docs/familias-e-escolas/canvas/scripts/_altura-minima.mjs
node docs/familias-e-escolas/canvas/scripts/arrumar.mjs
node docs/familias-e-escolas/canvas/scripts/ajustar.mjs $(cd docs/familias-e-escolas/canvas/project && ls *.dc.html)
node docs/familias-e-escolas/canvas/scripts/arrumar.mjs
node docs/familias-e-escolas/canvas/scripts/texto.mjs
```

**Cuidado:** alguns textos foram ajustados direto nos `.dc.html` depois de gerados. Regerar pode desfazer esses ajustes. Depois de regerar, confira `git diff docs/familias-e-escolas/canvas/project` e descarte o que não for a mudança que você queria.

Só `texto.mjs` e `arrumar.mjs` foram conferidos depois da cópia para o repositório (o primeiro reproduz a especificação igual, o segundo não muda nada). Os outros foram copiados com os caminhos trocados e não rodaram daqui.

## Publicar uma versão nova

Com a ferramenta de Artifact do Claude Code: publicar com `url` do Canvas, `root` igual a esta pasta (`docs/familias-e-escolas/canvas`), `file_path` igual a `project/canvas.json` e o mapa `files` com cada `project/*.dc.html`. Antes de publicar, `ajustar.mjs` (sem rolagem dentro dos quadros) e `texto.mjs`.
