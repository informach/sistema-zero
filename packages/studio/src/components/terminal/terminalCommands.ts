/**
 * "Comandos úteis" do terminal do Pro (redesenho de 11/2026): botões que escrevem um comando no
 * shell (`jsh` do WebContainer). Os que terminam em Enter (`\r`) rodam; o "Instalar uma
 * biblioteca" só DIGITA `npm install ` e deixa a criança completar o nome e apertar Enter.
 * ⚠️ `npm run dev` NÃO entra: a prévia já roda o servidor, e o `server-ready` (que não filtra a
 * porta, `ProPreview.tsx`) trocaria a prévia para o servidor aberto aqui. O jogo roda pelo Rodar.
 * Módulo próprio (e não um export do `Terminal.tsx`): os testes de layout mockam aquele módulo,
 * e o bun congela os nomes do módulo mockado.
 */
export interface TerminalCommand {
  id: string
  /** Chave i18n do rótulo do botão (`terminal.commands.*`). */
  labelKey: string
  /** O que vai para o shell, com `\r` quando roda direto. */
  input: string
  /** Como o comando aparece no `title` e na apresentação. */
  display: string
}

export const TERMINAL_COMMANDS: readonly TerminalCommand[] = [
  { id: 'list', labelKey: 'terminal.commands.list', input: 'ls\r', display: 'ls' },
  {
    id: 'pieces',
    labelKey: 'terminal.commands.pieces',
    input: 'cat package.json\r',
    display: 'cat package.json',
  },
  {
    id: 'libraries',
    labelKey: 'terminal.commands.libraries',
    input: 'npm ls --depth=0\r',
    display: 'npm ls --depth=0',
  },
  {
    id: 'install',
    labelKey: 'terminal.commands.install',
    input: 'npm install ',
    display: 'npm install …',
  },
  { id: 'clear', labelKey: 'terminal.commands.clear', input: 'clear\r', display: 'clear' },
  { id: 'stop', labelKey: 'terminal.commands.stop', input: '\u0003', display: 'Ctrl+C' },
]
