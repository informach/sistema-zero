import type { ManifestQuiz } from '../../../packages/core/src/learning/manifest-quiz'
export const jardimQuiz: ManifestQuiz = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'memoria',
      predictionScene: 'jardim-memory',
      prompt:
        'Neste jogo, o regador sumiu, mas a informação ainda diz Não. A flor só abre com Sim; com Não, pede o regador. Quando o personagem chegar à flor, o que vai acontecer?',
      choices: [
        { id: 'a', label: 'A flor abre porque o desenho do regador sumiu.' },
        { id: 'b', label: 'A flor fica fechada e o aviso pede o regador.' },
        { id: 'c', label: 'O regador aparece de novo no chão.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'Tirar o regador da cena não muda a informação guardada. Ela ainda está em Não, por isso a flor continua fechada e o aviso pede o regador. Essa regra não manda o regador voltar. Na coleta, também precisamos guardar que ele foi pego.',
    },
    {
      id: 'outro-caso',
      prompt:
        'Você pegou o regador, chegou à flor e ela abriu. Qual teste falta para conferir a outra resposta do jogo?',
      choices: [
        { id: 'a', label: 'Começar uma nova partida e ir à flor sem pegar o regador.' },
        { id: 'b', label: 'Continuar a mesma partida e encostar de novo na flor aberta.' },
        { id: 'c', label: 'Trocar a cor do personagem e pegar o regador outra vez.' },
      ],
      correctChoiceIds: ['a'],
      explanation:
        'Uma nova partida começa sem a coleta. Indo direto à flor, você pode conferir se ela fica fechada e avisa o que falta. Encostar de novo depois do sucesso não testa a situação sem o regador.',
    },
    {
      id: 'vista',
      predictionScene: 'jardim-view',
      prompt:
        'Vamos olhar o jardim de lado, sem mover o regador nem a pedra. Quando o regador aparecer atrás da pedra, o que terá mudado?',
      choices: [
        { id: 'a', label: 'O lugar do regador no jardim.' },
        { id: 'b', label: 'A altura da pedra.' },
        { id: 'c', label: 'O lugar de onde olhamos.' },
      ],
      correctChoiceIds: ['c'],
      explanation:
        'Mudou o lugar de onde olhamos: a câmera. O regador e a pedra ficaram nas mesmas posições. Um objeto pode estar escondido na imagem e continuar ali no jardim.',
    },
    {
      id: 'altura',
      predictionScene: 'jardim-height',
      prompt:
        'De cima, o regador parece estar sobre o personagem, mas o encontro não acontece. Vamos olhar de lado. O que pode explicar isso?',
      choices: [
        { id: 'a', label: 'A cor do regador impede a coleta.' },
        { id: 'b', label: 'O regador está alto demais para encostar no personagem.' },
        { id: 'c', label: 'Olhar de cima impede todos os encontros.' },
      ],
      correctChoiceIds: ['b'],
      explanation:
        'De lado, vemos um espaço entre os dois: o regador está alto demais. Em 3D, o encontro depende também da altura. A cor e o ponto de vista não desligam a coleta.',
    },
  ],
}
