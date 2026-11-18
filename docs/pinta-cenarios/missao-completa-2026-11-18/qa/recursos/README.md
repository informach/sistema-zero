# Evidências de recursos e animações

Executadas em 18/11/2026, nesta máquina Windows. Os dados dos cenários são fixtures de QA,
sem imagens, sessão ou credenciais da conta disponibilizada pelo usuário.

- `pinta-suite.log`: `bun test src scripts`, 2.102 testes, zero falhas, 24.620 verificações.
- `browser.json`: dez ensaios Chromium, desktop e toque, incluindo Vila e Phaser.
- `closed-browser.json`: seis ensaios de versões, animação, mapa autocontido de 48 pixels
  e cópia entre mapas, nos mesmos dois perfis.
- `cpu4x.json`: os três fluxos de recursos com CPU emulada quatro vezes mais lenta.
- `authority.json`: sete ensaios de autoridade offline, incluindo clientes antigos reais,
  clipboard novo, conflitos, tombstones, falha transacional e recuperação da issue 026.
- `cloud.log` e `lesson.log`: guards de persistência e rascunhos das aulas.
- `studio-typecheck.log`: verificação TypeScript completa do Estúdio, código de saída zero.
- `godot-vila-gpu.log` e PNG: execução real em Godot 4.7.2 com OpenGL, colisões, porta,
  animação e elemento à frente do personagem. GPU RTX 3050 desta máquina.

Comandos de navegador: Playwright com `playwright.pinta.config.ts`, filtro de recursos;
`playwright.pinta-resources.config.ts`; `playwright.pinta-authority.config.ts`.
Os relatórios JSON preservam os casos, tempos e resultados individuais.

Pygame-ce 2.5.8/Python 3.13.17 e Godot executaram os samples vermelho/verde/azul/azul
da animação sem repetição. Tiled 1.12.2 reexportou o JSON com caminhos absolutos e
`verifyTiledPackage(..., ['tiled-reexport.json'])` encontrou zero diferenças.
Scripts reproduzíveis em `packages/pinta/scripts/homologacao/`.

Esses ensaios são locais. Toque e CPU foram simulados; não se declaram outros dispositivos
físicos, participantes infantis nem o ciclo autenticado completo, ainda listado no plano.
