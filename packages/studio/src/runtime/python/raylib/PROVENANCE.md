# Raylib no Estúdio: origem e adaptação

Este diretório contém uma implementação para navegador dos módulos Python `pyray` e `raylib`, com a API de referência fixada em **raylib-python-cffi 6.0.1.0 / raylib 6.0** (`contract.ts`). Não é a biblioteca C original, nem contém uma janela ou dispositivo gráfico nativo. O Python roda no Pyodide e envia operações ao renderer WebGL2 do Estúdio.

| Arquivos | Origem e adaptação |
| --- | --- |
| `py/pyray/`, `py/raylib/`, `_api.py`, `_names.py`, `_constants.py`, `_colors.py`, `_structs.py`, `_ffi.py` | Nomes, constantes, cores e estruturas da API de referência; implementação Python do Estúdio para os tipos, validações e despacho, sem carregar o CFFI nativo. |
| `_default_font.py` | Dados da fonte padrão extraídos de `rtext.c` do Raylib pelo script `scripts/raylib/extract-default-font.py`; origem zlib preservada no arquivo gerado. |
| `_raymath.py`, `_random.py`, `_camera2d.py`, `_camera3d.py`, `_collide2d.py`, `_collide3d.py`, `_shapes.py`, `_float32.py`, `_floatvec.py` | Portes/adaptações dos cálculos e comportamentos do Raylib (raymath, rcore, rcamera, rmodels, par_shapes e cgltf), com as contas em float operação por operação como no C (`_float32.py`, e `_floatvec.py` para muitos números de uma vez); testes CPython, os diferenciais de `scripts/raylib/tests` (bit a bit, `compare.py`) e cenas de referência comparam a execução com a biblioteca desktop. Não são cópias binárias da biblioteca C. |
| `_draw2d.py`, `_draw3d.py`, `_text.py`, `_models.py`, `_gltf.py`, `_shaders.py` | Implementação Python das operações de desenho, texto, modelos GLB/glTF e shaders, enviada ao protocolo do navegador. |
| `_core.py`, `_rt.py`, `_args.py`, `_assets.py`, `_audio.py` | Integração do Estúdio: ciclo de quadros, relógio, entrada, arquivos do projeto, imagens, áudio e checkpoint autoritativo das atividades. |
| `renderer.ts`, `renderer3d.ts`, `raylibShaders.ts`, `protocol.ts` e auxiliares TypeScript | Backend do Estúdio em WebGL2, carregamento e descarte de recursos e adaptação de shaders desktop GLSL para GLSL ES. |

Os avisos originais estão em `LICENSE-raylib.txt` (zlib) e `LICENSE-raylib-python-cffi.txt` (EPL-2.0, com os termos adicionais presentes nesse arquivo). O construtor da distribuição inclui ambos e um `SOURCES.txt` que aponta para este documento. Não se devem remover esses avisos nem representar os arquivos adaptados como os originais sem alterações.

Os recursos implementados são os declarados e testados pelo contrato do navegador. APIs que dependem de funcionalidades nativas indisponíveis não ganham implementações silenciosas: permanecem explicitamente não suportadas. Exportar para o computador usa o pacote desktop fixado no contrato; a implementação WebGL2 não substitui esse pacote no projeto exportado.
