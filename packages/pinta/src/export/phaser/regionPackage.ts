import { phaserLicense, phaserSource } from './phaser.generated'
import { regionPhaserPlayer } from './regionPlayer.generated'

export function writeRegionPhaserFiles(put: (path: string, file: string) => void): string[] {
  put('phaser.min.js', phaserSource)
  put('PHASER-LICENSE.txt', phaserLicense)
  put('main.js', regionPhaserPlayer)
  put(
    'index.html',
    `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cenário regional do Pinta</title>
  <style>
    body{margin:0;display:grid;place-items:center;min-height:100vh;background:#e8edf4;font:16px system-ui}
    main{max-width:100%;text-align:center}canvas{max-width:100%;height:auto}
    button{min-width:44px;min-height:44px;touch-action:none}
  </style>
</head>
<body><main>
  <div id="jogo"></div>
  <p id="pinta-status" role="status">Abrindo o cenário…</p>
  <div role="group" aria-label="Mover pelo cenário">
    <button data-direction="left" aria-label="Esquerda">←</button>
    <button data-direction="up" aria-label="Cima">↑</button>
    <button data-direction="down" aria-label="Baixo">↓</button>
    <button data-direction="right" aria-label="Direita">→</button>
  </div>
</main><script src="phaser.min.js"></script><script src="main.js"></script></body>
</html>`,
  )
  return [
    'Na pasta do pacote, execute python -m http.server 8000 e abra http://localhost:8000.',
    'O pacote já inclui Phaser 3.90.0 e as imagens locais.',
    'Use as setas ou os botões para andar. As portas levam aos destinos indicados em maps.json.',
    'Quando o cenário tem peças de plataforma usadas, ↑ pula e o jogador atravessa essas peças ao subir, aterrissando por cima.',
    'pintaGame.maps consulta objetos, imagens e propriedades. Use o ID do mapa, seu nome único ou “mapa” para o lugar atual.',
  ]
}
