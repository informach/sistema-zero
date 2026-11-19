# Phaser: prévia inicialmente sem tamanho

O run `44370922838`, SHA `0fd3f3e53`, passou contratos Linux/Windows, runtime
hospedado, auditoria de dependências, navegadores selecionados e duas shards
Chromium. A terceira falhou no kit `phaser-tactics`: canvas presente, mas com
largura e altura CSS iguais a zero já na abertura inicial.

O trace mostra o pai `#stage` com `height:100%` acrescentado pelo Phaser.
`ScaleManager.getParent` do Phaser 3.90.0 modifica o pai quando sua medida inicial
é zero e `expandParent` está habilitado. Isso substitui a proporção definida pelo
CSS do projeto. Além disso, o desenho por invalidação adormece o loop do Phaser;
o redimensionamento precisa atualizar as medidas antes de redesenhar.

O kit passa `expandParent:false`. O ResizeObserver já existente no controlador
continua invalidando a vista; esta consulta `getParentBounds()` e chama `refresh()`
somente quando as medidas mudaram. Não há outro observer, loop contínuo ou mudança
na composição visual. As fontes distribuídas são regeneradas pelo script existente.

O teste real de artefato começa com o palco sem tamanho e revela-o depois de o jogo
estar pronto. A versão original falha com canvas oculto; a corrigida passou três
repetições locais em Chromium completo (20,5 s no total), incluindo recarga,
armazenamento, controles, pausa, reinício, qualidade e redimensionamento.
O deadline da asserção continua 5 s. Isso não substitui a nova rodada Linux.

Comando em `packages/studio`, com servidor de QA em 5301:

```powershell
$env:E2E_PORT='5301'
$env:PW_REUSE_SERVER='1'
$env:PW_CHROMIUM=node -p "require('playwright-core').chromium.executablePath()"
bunx playwright test e2e/pro-game-kits.spec.ts --project=chromium --workers=1 -g phaser-tactics --repeat-each=3
bun scripts/gen-pro-kit-grid.ts --check
```

Referência da API utilizada:
[ScaleManager 3.90.0](https://github.com/phaserjs/phaser/blob/v3.90.0/src/scale/ScaleManager.js).
