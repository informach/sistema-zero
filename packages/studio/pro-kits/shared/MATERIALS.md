# Materiais, som e interface do jogo

O projeto continua editável. Os helpers são arquivos do projeto, sem serviço oculto. Faça uma mudança por revisão e teste no jogo antes de aprovar. Pensa ajuda a definir a missão; Pinta cria imagens/sprites; Molda cria modelos e animações. Importe a criação pelo painel Materiais do Estúdio. Criar arte pode consumir a franquia do serviço responsável; o kit não inicia geração paga.

## Direção e reuso

Antes de gerar, escreva uma especificação curta: função, paleta, vista (lateral, topo ou isométrica), tamanho em tela, frames/clips e colisão. Procure um material existente. O manifesto `public/studio-assets/manifest.json` contém ID estável, URL relativa, bytes, hash, origem e licença informada. Não use posição no array ou nome editável como identidade. Não invente licença quando ausente. Os arquivos entram no save e no ZIP, sem depender de uma URL temporária do gerador.

## Imagem, atlas e cenário

- Confira transparência sobre fundo claro e escuro; um quadriculado desenhado na imagem não é alpha.
- Uma spritesheet tem quadros constantes, base alinhada, animações nomeadas e fps explícito. No painel de materiais, confira a folha e seus metadados; no Pinta, revise os quadros e a colisão. No jogo, teste os estados e o flip. O kit Guardiões da arena inclui um pack original e o mapeamento `src/characters.ts`, além de loader, animação e hitboxes normalizadas.
- Outros kits começam com formas procedurais. Substituir a arte exige ligar o material ao renderer do kit; importar uma imagem não altera as regras automaticamente. Use o tamanho lógico do personagem como referência para escala e colisão.
- Em tilemaps, grade, tamanho de exibição, pivô e hitbox são medidas diferentes. Desenhe água, espuma opcional, chão, sombra, elevação, objetos e frente em camadas explícitas. Não transforme cada pixel da imagem em um collider.
- Rejeite frames fora da folha, clips inexistentes e imagens que excedam o orçamento antes de iniciar. Mostre falha/retry e descarte carregamentos antigos após sair do projeto.

## Modelos 3D

Use o caminho de Materiais em `modelPath` nos kits Ilha dos cristais/Jardim das luzes. O loader `src/assets.ts` mede bounds reais, coloca a base no chão e ajusta a altura. Escolha um nome de animação existente; glTF usa Y para cima, mas não determina sozinho a frente artística. Os kits táticos têm unidades procedurais; use o mesmo contrato de loader ao substituir suas formas.

O manifesto informa clips, duração quando disponível e bounds locais declarados. Bounds locais não são bounds do modelo animado no mundo. Confira movimento no preview. Clones animados precisam de esqueleto/mixer próprios; geometrias e texturas compartilhadas são liberadas pelo dono. Evite texturas gigantes e meça draw calls, geometria e memória após 20 reinícios.

## Áudio local com canais

`src/sound.ts` oferece `createSoundBank(ui)`: até 16 definições, uma música e quatro efeitos simultâneos. Música usa streaming, sem decodificar a faixa inteira em memória. Som começa desligado; o botão Som da UI é o gesto de ativação. Pausa/aba oculta suspende música e elimina efeitos. Erro de mídia aparece no status, sem impedir jogar. Música e efeitos têm volume separado, de 0 a 1.

No `main.ts`, depois de criar `ui`, use os caminhos reais copiados do painel (os caminhos abaixo são exemplos, não arquivos incluídos):

```ts
import { createSoundBank } from './sound'
const sounds = createSoundBank(ui)
sounds.define('trilha', 'studio-assets/minha-musica.ogg', 'music')
sounds.define('coleta', 'studio-assets/minha-coleta.wav', 'effects')
sounds.volume('music', 0.25)
sounds.volume('effects', 0.65)
sounds.music('trilha') // aguarda Som ligado e partida em andamento
// No evento real de coleta: sounds.effect('coleta')
// No callback existente de manageLifetime: sounds.dispose()
```

Não crie outro `manageLifetime` que deixe o primeiro sem acesso aos recursos. Inclua `sounds.dispose()` no encerramento já existente, antes de destruir `ui`. Para trocar a faixa, defina outro ID e chame `music(id)`. Para parar definitivamente, use `stop()`. Evite disparar áudio a cada frame. Avisos importantes também precisam de texto/forma; o jogador pode estar sem som.

## HUD e acessibilidade

`src/ui.ts` fornece menu, pausa, resultado, recorde, som, status e HUD. O HUD atualiza texto só quando o valor muda; informações contínuas não interrompem leitores de tela. Botões têm área mínima de 44 px e foco visível. Preserve controles de teclado/toque e pistas além de cor. Teste em 360 px e paisagem, com fonte ampliada. Use `env(safe-area-inset-bottom)` ao fixar controles na borda da tela.

Para um painel nine-slice, importe uma imagem própria e use bordas explicitamente medidas. Exemplo CSS, adaptando URL e cortes à imagem real:

```css
.game-panel {
  border: 12px solid transparent;
  border-image: var(--panel-image, none) 12 fill / 12px / 0 stretch;
  padding: 8px;
  max-width: 100%;
}
```

Defina a variável no elemento com a URL do material resolvida em relação ao HTML: `panel.style.setProperty('--panel-image', 'url("' + new URL('studio-assets/meu-painel.png', location.href).href + '")')`. Isso preserva a subpasta de publicação; o nome mostrado é um exemplo que você deve substituir pelo caminho real. Use formas estáticas como fallback até a imagem estar pronta. Feedback deve ser curto e cancelável; respeite `ui.reducedMotion`. Nenhum kit depende de flashes, tremor de câmera ou áudio para explicar a ação.

## Aceitar uma revisão

Confira importação e erro recuperável, dimensões/escala, animação, colisão, toque/teclado, mute/volume, pausa/retorno, vitória/derrota/reinício e export. Rode `npm run typecheck` e `npm run build`. No ZIP, use `npm ci` quando houver lock ou `npm install` quando ele ainda não existir. A captura ajuda a revisar composição; as regras precisam de teste de entrada e estado observado. Progresso do jogo é local a este projeto/perfil/aparelho; não é um checkpoint sincronizado do Pensa.

Referências adaptadas: ai-game-spritesheets, vibe-isometric-sprites, tinyswords-tilemap, generated-raster-asset-pipeline, audio-implementation, accessibility-design, ui-animation-pipeline, Forest Census e threejs-builder. Seus scripts externos, providers, assets sem licença e fontes não disponibilizados não acompanham o projeto.


## Som no player do Studio

Os helpers `createUI` e `createSoundBank` já respeitam o botão de som do player. Se você criar um sistema de áudio próprio, leia `window.szStudioHost?.muted` no início e escute o evento `studio:host-audio` para parar/silenciar suas vozes quando ele mudar. Preserve a escolha de som dentro do jogo: desativar o mute do player não deve ligar um som que o jogador havia desligado. No export standalone esse objeto pode não existir; mantenha o opt-in por gesto.
