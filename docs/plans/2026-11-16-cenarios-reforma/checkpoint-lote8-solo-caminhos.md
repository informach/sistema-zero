# Lote 8.2 — Setores, pintura portátil e encontros de caminhos

18/11/2026 · `staging` após `f13e0961f` · **8.2 continua em andamento.**

`particionarTerrenoCompilado` separa os triângulos existentes por setor de 64 células, incluindo o piso simplificado que reúne várias peças. Reutiliza a divisão numérica do núcleo, agora capaz de respeitar fronteiras explícitas de regiões. Conserva atributos, winding e transformação, com coordenadas locais para evitar perda de precisão longe da origem. Não gera outro relevo nem depende de câmera/LOD. Um triângulo que atravesse setores indevidamente é recusado.

Os decals do editor usam `polygonOffset` e `depthWrite`, que o glTF não preserva. `RecortesVisuaisDosCaminhos` elimina somente o solo **visual** sob triângulos coplanares do caminho, com o mesmo recortador puro usado pelo Molda. Um índice de volumes limita as consultas, com orçamentos de trabalho e saída. A tolerância de 0,0001 m serve para classificar o contato, sem deslocar vértices. Pontes e peças elevadas não removem o terreno; colisões e campo físico permanecem intactos.

`prepararSoloCompilado` usa os pesos e imagens reais para gerar o mapa PNG por parte, conservando geometria e altura. Retira os canais que multiplicariam novamente a cor no glTF. Solo sem camadas conserva o material/cores existentes. Leitura de imagens autorizadas e encoder Canvas2D têm limites, cancelamento e recursos próprios, sem buscar URLs novas. Materiais, texturas e geometrias temporários têm descarte idempotente.

## Verificação e revisão

- Núcleo completo: **345 testes / 10.568 verificações**; motor: **209 / 4.587**, sem falhas. Tipagem dos dois pacotes e da oficina passou. Biome e `git diff --check` passaram.
- Build da oficina e workers passou. Permanece o aviso do Vite sobre chunks maiores que 500 kB; o build não constitui aceite de desempenho de dispositivos.
- Partição comparada triângulo por triângulo, incluindo atributos e winding, em terreno detalhado e piso de quatro peças, com origem próxima de 100 km e coordenadas locais preservadas.
- Encontro de duas trilhas: área visual conservada, atributos interpolados e colisão do chão preservada. Raycast no solo visual recortado passa pelo espaço do caminho; no collider original continua encontrando o chão. Peças elevadas/estruturais não abrem esse recorte.
- Ensaio no Chrome headless local: terreno com relevo e caminhos reais dos geradores, GLB reaberto com **3 malhas / 8.575 triângulos**, maior parte com 21.651 vértices. **Zero diferença de pixels** nas vistas [superior antes](evidencias/lote8-solo-caminhos/superior-editor.png)/[depois](evidencias/lote8-solo-caminhos/superior-compilado.png), [aproximação antes](evidencias/lote8-solo-caminhos/aproximacao-editor.png)/[depois](evidencias/lote8-solo-caminhos/aproximacao-compilado.png) e [rasante antes](evidencias/lote8-solo-caminhos/rasante-editor.png)/[depois](evidencias/lote8-solo-caminhos/rasante-compilado.png). [Medições](evidencias/lote8-solo-caminhos/resultado.json).
- [Movimento da câmera](evidencias/lote8-solo-caminhos/camera-compilada.mp4): 3 segundos, 640×360, 12 quadros/s; [contato de nove quadros](evidencias/lote8-solo-caminhos/contato-camera.png) inspecionado. É um ensaio de câmera/superfície, não de animação do avatar. Validador Khronos: **zero erros e avisos**, três informações sobre UVs sem uso pelo material. [Validação](evidencias/lote8-solo-caminhos/validacao.json).
- Pintura pelo novo acabamento/encoder, comparada com o shader do editor: mapa 128×128, erro médio **0,2712** e máximo **3** por canal de 0–255. [Antes](evidencias/lote8-solo-acabamento/solo-editor.png), [depois](evidencias/lote8-solo-acabamento/solo-compilado.png), [PNG](evidencias/lote8-solo-acabamento/pintura.png), [medição](evidencias/lote8-solo-acabamento/resultado.json).

Fixtures próprios, sem arte licenciada. Não é aprovação artística da Faísca nem medição de FPS em aparelhos físicos. A montagem final ainda precisa integrar estes componentes, água portátil e colisões, validar o pacote completo e executar comparações/ciclos. 8.3–8.6, lotes 9–10 e implantação continuam pendentes.
