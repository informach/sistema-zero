/**
 * Como conquistar cada troféu do "Meu espaço 3D", na voz da comunidade ADULTA (prancha de
 * 18/10/2026): curso e partes da oficina no lugar de aventura e fases, sem exclamação. O Mural tem
 * o mesmo nome nas duas comunidades. Mesmas chaves do `TROPHY_HINT` do Kids (travado em
 * `tests/adult-cosmetics.test.ts`); a página `/quarto` passa este mapa ao `RoomBuilder`.
 *
 * ⚠️ Mora AQUI, e não no member-shell: o guarda de vocabulário do Kids varre o member-shell inteiro
 * e a criança nunca lê "curso" (como as conquistas adultas, em `adult-badges.ts`).
 */
export const ADULT_TROPHY_HINTS: Readonly<Record<string, string>> = {
  'trofeu-primeiro-jogo': 'Publique o seu primeiro jogo no Mural.',
  'trofeu-diploma': 'Conclua um curso inteiro.',
  'trofeu-chama': 'Mantenha uma sequência de 30 dias.',
  'trofeu-medalha-mil': 'Acerte tudo em 10 quizzes.',
  'trofeu-foguete': 'Conclua um projeto com o Pensa.',
  'trofeu-console': 'Cumpra os objetivos do Estúdio em 3 aulas.',
  'trofeu-estrela-do-mural': 'Tenha um jogo seu jogado 100 vezes.',
  'trofeu-oficina-completa': 'Conclua todas as partes de uma oficina ao vivo.',
  'estante-trofeus': 'Conquiste o seu primeiro troféu e a estante vem junto.',
}
