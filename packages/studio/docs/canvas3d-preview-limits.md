# Canvas 3D: o que NÃO roda no preview (e por quê)

A categoria **Canvas 3D** do núcleo ensina three.js CRU — os blocos geram o código
real da biblioteca. Quase tudo do three roda dentro do preview do Studio, mas o
preview é um iframe sandboxado com **rede morta por design de segurança infantil**
(CSP `connect-src 'none'`, `worker-src 'none'`, `script-src` sem `https:` genérico,
importmap pinado em `esm.sh/three@0.180.0`). Esta tabela é a fonte da verdade do
que fica FORA, por quê, e o que muda quando a criança **exporta** o projeto
(deploy real, fora do sandbox).

⚠️ O próprio three é **buscado pelo carregador de módulos do navegador** via `script-src`
(no `esm.sh`) — o design offline-safe não intercepta esse caminho, nem poderia. Então o
preview do Canvas 3D **exige internet**: um projeto 2D (tudo embutido em `data:`) roda
offline, o 3D não.

| Recurso | Por que NÃO roda no preview | No export/deploy |
|---|---|---|
| **DRACOLoader / KTX2Loader** (malhas/texturas comprimidas) | O decoder é WASM rodando em **worker**: `worker-src 'none'` barra o worker e `setDecoderPath` faz **fetch** do `.wasm` (`connect-src 'none'`). Comentário canônico em `core/project.ts` (ASSET_3D_SPECS). | Também não, a menos que o deploy hospede o decoder. Use **GLB não-comprimido** — o upload de `.glb` do projeto é servido ao `GLTFLoader` pelo resolvedor de assets. |
| **Gamepad** (`navigator.getGamepads()`) | `navigator` é global denylistado no parser (vira rawJS) e o permissionGuard não expõe gamepad. | **Funciona** (como rawJS/código PRO). |
| **GSAP e qualquer CDN externa** | O importmap só resolve `three` e `three/addons/…` (pinados); `script-src` não aceita origem nova. Tween "na unha" é ensinado com `lerp`/`lerpColors` + `dt` (Passeio 3D, Portas do Castelo). | Funciona se o projeto exportado incluir a lib (a criança já está fora do Studio). |
| **fetch de URL de rede** (`loader.load('https://…')`, APIs) | `connect-src 'none'` + permissionGuard. Os loaders SÓ enxergam assets DO PROJETO por **nome** (`carregador.load('modelo')` / `('motor')`), servidos pelo resolvedor local do `assetsBridge` — GLB, HDR e **sons** (AudioLoader). | fetch real funciona; os assets por nome também (o export embute o mesmo resolvedor). |
| **TextGeometry/FontLoader** (fonte `.json` typeface) | `FontLoader.load` fetcha a fonte e "fonte" não é um kind de asset do projeto. **O folio real nem usa**: todo texto 3D dele é canvas 2D → `CanvasTexture` — é o que o macro **"criar letreiro 🪧"** (`sz_t3d_sign`) expande. | Funciona com a fonte hospedada junto. |
| **Marcas no chão / decals por render target** | Roda (é só WebGL), mas é receita avançada demais para bloco (WebGLRenderTarget + câmera ortográfica + cena de decal ≈ 3-4× o macro de bloom). Fica como código avançado no Monaco/modo PRO. | Igual. |

## Gotchas que RODAM, mas têm manha

- **Pointer lock / modo FPS** (`requestPointerLock`, `PointerLockControls`): RODA no
  preview — os iframes têm `allow-pointer-lock` no sandbox (`PreviewIframe`/
  `StudioProjectPlayer`). Manha: como o áudio, o navegador exige um **gesto** (clique)
  para conceder o lock; chame `controls.lock()` dentro de um `click`, nunca no boot.
- **Áudio precisa de GESTO** (autoplay policy do Chrome): o `AudioContext` do
  `AudioListener` nasce suspenso. Chame `listener.context.resume()` dentro de um
  `keydown`/clique antes do primeiro `play()` (o Passeio 3D faz exatamente isso).
- **`AudioLoader.load('nome', …)`** resolve o som ENVIADO no painel de Imagens
  (🔊 Enviar som) pelo nome, com ou sem extensão. Qualquer URL que não é asset
  segue bloqueada.
- **ShaderMaterial com GLSL do aluno** roda (GPU local, sem rede), mas é "opaco"
  para os blocos por decisão — os macros (grama/água/letreiro/bloom) são o caminho
  pedagógico; o GLSL cru é território do Monaco.

Mexeu na CSP/importmap/sandbox? Atualize esta tabela e os testes de
`src/preview/__tests__/`.
