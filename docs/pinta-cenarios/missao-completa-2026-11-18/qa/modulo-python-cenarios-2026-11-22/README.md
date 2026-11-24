# Cenários do Pinta fornecidos pelo ambiente Python

A prova usa Chrome e o servidor de qualificação local, com arquivos verificados no manifesto gerado pelo Bun 1.4.3. Os testes importam `pinta` do diretório da extensão ativa. O programa do projeto contém as chamadas do jogo e o PNG original fica nos materiais.

Candidato `842f92c7b82db61441765d963f6d7a4b5d436438e27e54ec1e507ac90cf38d0e`, autorização local `0e48765f11c9e438fe3aab777de6d22518885a3cb0492b971bd4108d2a3b07d8`. Build sobre o merge local `6ebf3f660` de `2e33e0cad` com `3ecd92a04`, após as correções de `9b95ecf4d`.

| Artefato | Bytes | SHA-256 |
| --- | ---: | --- |
| Pygame-ce | 194.640 | `acbe915b4bddb6ba4bfd54b8955184b63b149a8eaf2aa25569efa521ec2ac8e8` |
| Pygame Zero | 112.139 | `1ee2c24c29a6b95e802f28a853a8b61a6b7ef1915f08b1fb80edd940f73e48cf` |
| Raylib 2D | 112.507 | `3a5db4ac67b85bb99a19c94ad3e19690fdca0dd281ee9477640c4a1de8a25560` |

O build padrão `92e85994ab235d525c6cf60a253b7f66dc610877441c7921a671bf34ff1582b5` conservou a lista de features sem a capacidade regional e a lista de artefatos sem os três módulos novos. `pygame/pinta.py` tem SHA-256 `bbcbeb402deb64d6c7d67abc709e6d79b5a94f3678936e8f24c49cf5f0ba0fee` na fonte e nas duas construções.

## Execução

- Chrome, 8 casos. Pygame-ce 1× e 2× com SDL Wasm real, teste de mutação de um byte do módulo, PGZero e Raylib 2D com os bridges da distribuição, controles de PNG comum e Raylib 3D, PyDew Valley com entrada e pixels.
- O primeiro candidato falhou no boot de CE porque o worker opaco não oferecia SubtleCrypto. O candidato acima confere o SHA antes de montar o projeto com `hashlib` da stdlib verificada. A prova de mutação passou com o módulo do mesmo tamanho e SHA diferente. A preparação falhou sem entregar sessão pronta ou executar a fonte do projeto. O ensaio de armazenamento cobre falha após escrita parcial, SHA incorreto e falha de leitura, com remoção do temporário.
- Bun focado no Studio, 84 testes e 503 asserções. Os três backends nativos executaram o mesmo `main.py` que receberam do exportador e importaram o arquivo gerado. CPython 3.12.10, pygame-ce 2.5.8, pgzero 1.2.1 e raylib 6.0.1.0. Os testes confirmaram os pixels da Cabana, o recurso compartilhado com a Vila e o cenário anterior após erro de textura.
- Bun focado no Pinta, 49 testes e 573 asserções. PNGs de mapas 1–4 produzidos pelo escritor legado e PNG5 produzido pelo escritor regional passam pelo compositor. A matriz cobre atlas original com segunda folha, escala, porta, física por versão, ordem de passagens, imagens inválidas e limites regionais.

## Repetição

Construa com `buildPythonRuntimeDistribution({ pintaScenes: true, vendorDirectory, outputDirectory, standardLibrary })`. Os caminhos são de QA. O builder confere os hashes dos bytes do vendor e da stdlib antes de selar o manifesto. Rode `experiments/studio-python-runtime/server.ts` com `PYTHON_PROBE_DISTRIBUTION_DIRECTORY`, `PYTHON_PROBE_DISTRIBUTION_SHA256`, `PYTHON_PROBE_PINTA_SCENES=1` e uma porta de loopback. Use o mesmo `PYTHON_PROBE_PORT` e `PYTHON_PROBE_PINTA_SCENES=1` no Playwright. Em `packages/studio`:

```powershell
node node_modules/@playwright/test/cli.js test --config playwright.pinta-python-regional.config.ts --project chrome
node node_modules/@playwright/test/cli.js test --config playwright.pinta-python-2d-browser.config.ts --project chrome
node node_modules/@playwright/test/cli.js test --config playwright.python-pygame.config.ts --project chrome -g pydew-valley
bun --no-env-file test src/runtime/python/pintaScenesModule.test.ts src/runtime/python/pintaScenesModuleBrowser.test.ts src/runtime/python/session.test.ts src/python/extensions/operations.test.ts src/python/blocks/authoring.test.ts src/export/__tests__/pygameDesktop.test.ts src/export/__tests__/pgzeroDesktop.test.ts src/export/__tests__/raylibDesktop.test.ts src/export/__tests__/pythonSource.test.ts
```

Aponte `PYTHON` e `PINTA_RAYLIB_PYTHON` para os executáveis com as bibliotecas nativas. Para Raylib, a prova requer um contexto OpenGL real. A comparação A/B repete o builder sem `pintaScenes` e compara os arquivos legados nos dois manifestos.
