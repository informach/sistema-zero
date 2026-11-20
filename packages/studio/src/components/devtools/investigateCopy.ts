/**
 * Os textos da aba Investigar. Moram junto do painel, que só baixa quando a criança abre a aba
 * (no dicionário do editor entrariam no pacote de abertura do modo Blocos, que tem teto). O
 * rótulo da aba (`pro.dock.investigate`) continua no dicionário, porque a aba aparece fechada.
 */
import type { Locale } from '../../core/i18n/translator'

export const INVESTIGATE_COPY: Record<Locale, Record<string, string>> = {
  'pt-BR': {
    'inv.start': 'Investigar o jogo',
    'inv.stop': 'Parar de investigar',
    'inv.off':
      'Pause o jogo, avance um quadro de cada vez e veja os valores. Ao investigar, o jogo começa de novo.',
    'inv.notRunning': 'Rode o jogo para investigar.',
    'inv.waiting': 'Esperando o jogo começar…',
    'inv.running': 'O jogo está rodando',
    'inv.frame': 'Quadro {frame}',
    'inv.pause': 'Pausar',
    'inv.cantPause':
      'Este tipo de jogo ainda não pausa pelo Estúdio. Os valores mudam enquanto ele roda.',
    'inv.paused': 'O jogo está pausado',
    'inv.paused.before': 'A cada quadro, o jogo faz uma vez tudo o que está em ',
    'inv.paused.loop': 'A cada quadro do jogo',
    'inv.paused.after': '. Avance um quadro e veja o que muda nos valores.',
    'inv.resume': 'Continuar',
    'inv.step': 'Avançar 1 quadro',
    'inv.values': 'Valores agora',
    'inv.values.frame': 'no quadro {frame}',
    'inv.values.none': 'O jogo ainda não tem variáveis para mostrar.',
    'inv.changed': 'mudou',
    'inv.showBlock': 'Mostrar o bloco',
    'inv.stopped': 'O jogo parou no quadro {frame}',
    'inv.stopped.noFrame': 'O jogo parou',
    'inv.runAgain': 'Rodar de novo',
    'inv.askZappy': 'Perguntar ao Zappy',
    'inv.path': 'O caminho até o erro',
    'inv.path.from': 'de onde o jogo veio',
    'inv.path.here': 'aqui o jogo parou',
    'inv.path.line': 'Linha {line} do código',
    'inv.path.none': 'O computador não disse por onde o jogo passou.',
    'inv.stoppedValues': 'Valores no momento do erro: {values}',
  },
  en: {
    'inv.start': 'Investigate the game',
    'inv.stop': 'Stop investigating',
    'inv.off':
      'Pause the game, step one frame at a time and see the values. Investigating starts the game over.',
    'inv.notRunning': 'Run the game to investigate.',
    'inv.waiting': 'Waiting for the game to start…',
    'inv.running': 'The game is running',
    'inv.frame': 'Frame {frame}',
    'inv.pause': 'Pause',
    'inv.cantPause':
      "This kind of game can't be paused by the Studio yet. The values change while it runs.",
    'inv.paused': 'The game is paused',
    'inv.paused.before': 'Each frame, the game runs once everything inside ',
    'inv.paused.loop': 'Every game frame',
    'inv.paused.after': '. Step one frame and see what changes in the values.',
    'inv.resume': 'Continue',
    'inv.step': 'Step 1 frame',
    'inv.values': 'Values now',
    'inv.values.frame': 'at frame {frame}',
    'inv.values.none': 'The game has no variables to show yet.',
    'inv.changed': 'changed',
    'inv.showBlock': 'Show the block',
    'inv.stopped': 'The game stopped at frame {frame}',
    'inv.stopped.noFrame': 'The game stopped',
    'inv.runAgain': 'Run again',
    'inv.askZappy': 'Ask Zappy',
    'inv.path': 'The way to the error',
    'inv.path.from': 'where the game came from',
    'inv.path.here': 'the game stopped here',
    'inv.path.line': 'Line {line} of the code',
    'inv.path.none': "The computer didn't say where the game went.",
    'inv.stoppedValues': 'Values when the error happened: {values}',
  },
}
