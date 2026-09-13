/** Fontes didáticos usados para gerar a IR dos exemplos e verificar o round-trip. */
export const NUMEROS_SOURCE = `
let pontos = 0;
let vidas = 3;
const numeros = SZGame2D.createGroup();
const jogador = SZGame2D.createSprite({x: 270, y: 350, w: 60, h: 24, color: '#38bdf8'});
const comecar = SZGame2D.createTextSprite('Começar / jogar de novo', 100, 290);
SZGame2D.setTextStyle(comecar, 24, '#ffffff');
SZGame2D.setTextBox(comecar, 400, 'center', 14, '#166534');
for (let n = 1; n < 101; n += 1) {
  const numero = SZGame2D.spawnTextInGroup(numeros, n, SZGame2D.randomBetween(12, 530), -n * 60);
  SZGame2D.setSpriteData(numero, 'valor', n);
  SZGame2D.setTextStyle(numero, 28, '#fde047');
  numero.vx = 0; numero.vy = 3;
}
SZGame2D.setScene('inicio');
SZGame2D.onSpriteClick(comecar, function () {
  if (SZGame2D.sceneIs('inicio')) { SZGame2D.setScene('jogando'); }
  else { SZGame2D.restart(); }
});
SZGame2D.onKey('Enter', function () {
  if (SZGame2D.sceneIs('inicio')) { SZGame2D.setScene('jogando'); }
  else { if (!SZGame2D.sceneIs('jogando')) { SZGame2D.restart(); } }
});
SZGame2D.gameLoop(function () {
  SZGame2D.clear();
  if (SZGame2D.sceneIs('jogando')) {
    SZGame2D.arrowsX(jogador, 6);
    if (SZGame2D.pointerDown()) { SZGame2D.dragX(jogador); }
    SZGame2D.clampToScreen(jogador, ctx);
    SZGame2D.updateGroup(numeros);
    SZGame2D.overlapSpriteGroup(() => jogador, numeros, function (numero) {
      if (SZGame2D.spriteData(numero, 'valor', 0) % 2 === 0) { pontos += 1; }
      else { vidas -= 1; }
      SZGame2D.removeFromGroup(numeros, numero);
    });
    SZGame2D.pruneOffscreen(ctx, numeros, 40, function (numero) {});
    SZGame2D.drawGroup(ctx, numeros);
    SZGame2D.drawSprite(ctx, jogador);
    SZGame2D.drawScore(ctx, 'Pares:', pontos, 12, 28, '#ffffff', 24);
    SZGame2D.drawScore(ctx, 'Vidas:', vidas, 450, 28, '#ffffff', 24);
    if (pontos >= 10) { SZGame2D.setScene('vitoria'); }
    else { if (vidas <= 0 || SZGame2D.countGroup(numeros) === 0) { SZGame2D.setScene('derrota'); } }
  } else {
    if (SZGame2D.sceneIs('inicio')) {
      SZGame2D.showScreen(ctx, 'Chuva de números', 'Pegue 10 números pares e desvie dos ímpares. Você tem 3 vidas.', 'Use as setas ou mova o dedo na tela.', '#102030');
    } else {
      if (SZGame2D.sceneIs('vitoria')) { SZGame2D.showScreen(ctx, 'Você conseguiu!', '10 números pares coletados!', 'Enter ou toque para jogar de novo.', '#102030'); }
      else { SZGame2D.showScreen(ctx, 'Vamos tentar de novo?', 'Procure números que terminam em 0, 2, 4, 6 ou 8.', 'Enter ou toque para jogar de novo.', '#102030'); }
    }
    SZGame2D.drawSprite(ctx, comecar);
  }
});
`

export const QUIZ_SOURCE = `
let pergunta = 0;
let pontos = 0;
let escolhida = false;
let mensagem = '';
const perguntas = ['Quanto é 3 + 5?', 'Qual destes números é ímpar?'];
const alternativas = ['6', '8', '9', '12', '7', '20'];
const gabarito = [1, 1];
const respostas = SZGame2D.createGroup();
const proxima = SZGame2D.createTextSprite('Próxima pergunta', 140, 315);
SZGame2D.setTextStyle(proxima, 24, '#ffffff');
SZGame2D.setTextBox(proxima, 320, 'center', 10, '#166534');
for (let i = 0; i < 3; i++) {
  const resposta = SZGame2D.spawnTextInGroup(respostas, (i + 1) + ': ' + alternativas[i], 190, 95 + i * 65);
  SZGame2D.setTextStyle(resposta, 26, '#ffffff');
  SZGame2D.setTextBox(resposta, 220, 'center', 10, '#334155');
  SZGame2D.setSpriteData(resposta, 'indice', i);
  SZGame2D.setSpriteData(resposta, 'correta', i === gabarito[pergunta]);
}
SZGame2D.setScene('jogando');
function responder(indiceEscolhido) {
  if (SZGame2D.sceneIs('jogando') && !escolhida) {
    SZGame2D.forEachInGroup(respostas, function (resposta) {
      if (SZGame2D.spriteData(resposta, 'indice', 0) === indiceEscolhido) {
        escolhida = true;
        if (SZGame2D.spriteData(resposta, 'correta', false)) {
          pontos += 1; mensagem = 'Acertou! Você escolheu ' + alternativas[pergunta * 3 + indiceEscolhido] + '.';
          SZGame2D.setTextBox(resposta, 220, 'center', 10, '#166534');
        } else {
          mensagem = 'Quase! A resposta correta é ' + alternativas[pergunta * 3 + gabarito[pergunta]] + '.';
          SZGame2D.setTextBox(resposta, 220, 'center', 10, '#991b1b');
          SZGame2D.forEachInGroup(respostas, function (opcao) {
            if (SZGame2D.spriteData(opcao, 'correta', false)) { SZGame2D.setTextBox(opcao, 220, 'center', 10, '#166534'); }
          });
        }
      }
    });
  }
}
function avancar() {
  if (SZGame2D.sceneIs('fim')) { SZGame2D.restart(); }
  else {
    if (escolhida) {
      pergunta += 1;
      if (pergunta >= perguntas.length) {
        SZGame2D.setScene('fim'); SZGame2D.setSpriteText(proxima, 'Jogar de novo');
      } else {
        escolhida = false; mensagem = '';
        SZGame2D.forEachInGroup(respostas, function (resposta) {
          const indice = SZGame2D.spriteData(resposta, 'indice', 0);
          SZGame2D.setSpriteText(resposta, (indice + 1) + ': ' + alternativas[pergunta * 3 + indice]);
          SZGame2D.setSpriteData(resposta, 'correta', indice === gabarito[pergunta]);
          SZGame2D.setTextBox(resposta, 220, 'center', 10, '#334155');
        });
      }
    }
  }
}
SZGame2D.onGroupClick(respostas, function (resposta) { responder(SZGame2D.spriteData(resposta, 'indice', 0)); });
SZGame2D.onSpriteClick(proxima, function () { avancar(); });
SZGame2D.onKey('1', function () { responder(0); });
SZGame2D.onKey('2', function () { responder(1); });
SZGame2D.onKey('3', function () { responder(2); });
SZGame2D.onKey('Enter', function () { avancar(); });
SZGame2D.gameLoop(function () {
  SZGame2D.clear();
  if (SZGame2D.sceneIs('jogando')) {
    SZGame2D.drawLabel(ctx, perguntas[pergunta], 300, 48, '#ffffff', 25, 'center');
    SZGame2D.drawLabel(ctx, 'Use 1, 2 ou 3 para responder. Enter avança.', 300, 76, '#cbd5e1', 16, 'center');
    SZGame2D.drawGroup(ctx, respostas);
    SZGame2D.drawLabel(ctx, mensagem, 300, 293, '#fde047', 20, 'center');
    if (escolhida) { SZGame2D.drawSprite(ctx, proxima); }
  } else {
    SZGame2D.showScreen(ctx, 'Quiz concluído!', 'Cada resposta foi um sprite criado da lista.', 'Enter ou toque em jogar de novo para recomeçar.', '#102030');
    SZGame2D.drawScore(ctx, 'Acertos:', pontos, 230, 110, '#fde047', 28);
    SZGame2D.drawSprite(ctx, proxima);
  }
});
`
