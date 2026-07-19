import { describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import { parseProjectFiles } from '#parsers'
import { buildWorkspaceStateFromIR, type SerializedBlocklyBlock } from '../workspaceState'

// Script real do "Jogo da Memória" que a aluna trouxe — exercita quase todos os
// padrões novos (Fases 0–5). Backticks e `${}` internos estão escapados para
// preservar o código exatamente como o aluno escreveu.
const SCRIPT = `// Emojis usados no jogo
const emojis = ['🐶', '🐱', '🦊', '🐸', '🐼', '🦄'];

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let lockBoard = false;

const board = document.getElementById('board');
const movesDisplay = document.getElementById('moves');
const message = document.getElementById('message');
const restartBtn = document.getElementById('restartBtn');

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function startGame() {
    cards = shuffle([...emojis, ...emojis]);

    board.innerHTML = '';
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    lockBoard = false;

    movesDisplay.textContent = moves;
    message.textContent = '';

    cards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.classList.add('card');

        card.dataset.emoji = emoji;
        card.dataset.index = index;

        card.innerHTML = \`
            <div class="card-face front">?</div>
            <div class="card-face back">\${emoji}</div>
        \`;

        card.addEventListener('click', flipCard);

        board.appendChild(card);
    });
}

function flipCard() {
    if (
        lockBoard ||
        this.classList.contains('flip') ||
        flippedCards.length === 2
    ) return;

    this.classList.add('flip');
    flippedCards.push(this);

    if (flippedCards.length === 2) {
        moves++;
        movesDisplay.textContent = moves;
        checkMatch();
    }
}

function checkMatch() {
    const [card1, card2] = flippedCards;

    if (card1.dataset.emoji === card2.dataset.emoji) {
        matchedPairs++;
        flippedCards = [];

        if (matchedPairs === emojis.length) {
            message.textContent =
                \`🎉 Vitória! Você venceu em \${moves} jogadas!\`;
        }

    } else {
        lockBoard = true;

        setTimeout(() => {
            card1.classList.remove('flip');
            card2.classList.remove('flip');

            flippedCards = [];
            lockBoard = false;
        }, 1000);
    }
}

restartBtn.addEventListener('click', startGame);

startGame();`

function files(script: string): {
  'index.html': string
  'style.css': string
  'script.js': string
} {
  return {
    'index.html': '<div id="board"></div><p id="moves"></p><p id="message"></p>',
    'style.css': '',
    'script.js': script,
  }
}

function collectTypes(blocks: SerializedBlocklyBlock[]): string[] {
  const out: string[] = []
  const visit = (b: SerializedBlocklyBlock) => {
    out.push(b.type)
    if (b.inputs) {
      for (const input of Object.values(b.inputs)) {
        if (input.block) visit(input.block)
        if (input.shadow) visit(input.shadow)
      }
    }
    if (b.next) visit(b.next.block)
  }
  for (const b of blocks) visit(b)
  return out
}

function rawCount(stmts: JSStatement[]): number {
  let n = 0
  const walk = (list: JSStatement[]) => {
    for (const s of list) {
      if (s.type === 'rawJS') n += 1
      else if (s.type === 'if') {
        walk(s.then)
        if (s.else) walk(s.else)
      } else if ('body' in s && Array.isArray((s as { body?: unknown }).body)) {
        walk((s as { body: JSStatement[] }).body)
      }
    }
  }
  walk(stmts)
  return n
}

describe('Jogo da Memória — round-trip código↔blocos', () => {
  const parsed1 = parseProjectFiles(files(SCRIPT))
  const regenerated = generateProjectFiles({ ir: parsed1, projectName: 'Memoria' })
  const parsed2 = parseProjectFiles(regenerated)

  it('o ciclo bloco↔texto é estável (parse → gerar → parse não degrada)', () => {
    // A IR depois de um ciclo completo é idêntica — garante os dois sentidos.
    expect(parsed2.behavior).toEqual(parsed1.behavior)
  })

  it('reconhece os padrões novos como blocos de primeira classe', () => {
    const types = collectTypes(buildWorkspaceStateFromIR(parsed1).blocks.blocks)
    for (const expected of [
      'sz_js_function', // function shuffle/startGame/flipCard/checkMatch
      'sz_js_call_function', // checkMatch(); startGame();
      'sz_val_call_function', // shuffle([...])
      'sz_val_shuffle', // array.sort(() => Math.random() - 0.5)
      'sz_val_concat_arrays', // [...emojis, ...emojis]
      'sz_js_for_each', // cards.forEach((emoji, index) => …)
      'sz_js_create_element', // document.createElement('div')
      'sz_js_class_op', // card.classList.add('card') / this.classList.*
      'sz_js_set_dataset', // card.dataset.emoji = emoji
      'sz_val_join', // template literal `…${emoji}…`
      'sz_js_append_child', // board.appendChild(card)
      'sz_js_on_event_named', // addEventListener('click', flipCard/startGame)
      'sz_val_this', // push(this)
      'sz_val_bool', // lockBoard = false
      'sz_val_array_index', // const [card1, card2] = flippedCards
      // --- condições complexas agora viram blocos (antes eram código avançado) ---
      'sz_js_if_else', // todos os if/else do jogo
      'sz_val_compare', // card1.dataset.emoji === card2.dataset.emoji; .length === 2
      'sz_val_logic', // lockBoard || this.classList.contains('flip') || …
      'sz_val_class_contains', // this.classList.contains('flip')
      'sz_val_array_length', // flippedCards.length / emojis.length
      'sz_js_return_void', // if (…) return;
      'sz_js_set_timeout', // setTimeout(() => …, 1000) dentro do else
      'sz_js_var_increment', // moves++ / matchedPairs++ dentro dos if
    ]) {
      expect(types, `faltou o bloco ${expected}`).toContain(expected)
    }
  })

  it('o jogo inteiro vira blocos — nada sobra como código avançado', () => {
    // Com if por soquete de condição + comparação/lógica/return como blocos,
    // todos os trechos do jogo são representáveis (rawCount == 0).
    expect(rawCount(behaviorStatements(parsed1))).toBe(0)
  })
})
