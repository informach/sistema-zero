# Remediação completa do Reino Zero Ultra

Data: 2026-08-12  
Status: aprovado

## Objetivo

Transformar o Reino Zero Ultra em um jogo de plataforma autoral completo,
profissional e sem extensões. O projeto continuará usando somente blocos
nativos de HTML, CSS, Canvas, Programação e Som, sem código bruto, assets
externos ou propriedade intelectual da Nintendo.

A remediação corrige todos os achados do full review e substitui as 32 fases
formulaicas por uma campanha autoral. A fidelidade ao jogo de referência será
mecânica e estrutural, nunca visual ou nominal.

## Arquitetura

O exemplo separará campanha, simulação, sessão, persistência, replay, input e
apresentação. O gerador reunirá essas fontes e continuará produzindo IR nativa
editável. Nenhum subsistema dependerá de `rawJS`, `rawHTML`, `rawCSS` ou de um
runtime de extensão.

A simulação terá passo fixo e não acessará DOM, áudio nem `localStorage`. Ela
receberá estado e entradas e emitirá eventos de domínio. A sessão aplicará esses
eventos, tocará áudio e persistirá progresso somente durante uma partida real.
Replay e testes usarão a mesma simulação com efeitos externos bloqueados.

A campanha terá 32 fases escritas individualmente. O schema validará estrutura,
IDs, referências, spawn, saída, dimensões, limites e requisitos semânticos. Um
validador de jogabilidade fará uma busca conservadora por rotas e sinalizará
fases sem caminho possível.

## Conteúdo e mecânicas

Os oito mundos serão campo, subterrâneo, costa, cânion, floresta, gelo, vulcão
e fortaleza celeste. Cada mundo terá introdução, combinação, desafio especial e
guardião.

O motor oferecerá corrida, aceleração, atrito, agachamento, salto variável,
coyote time, jump buffer, natação, escadas, plataformas móveis, plataformas
frágeis e trampolins. Poços, lava, espinhos, água, esmagamento e tempo esgotado
causarão dano ou morte conforme a regra da fase.

Blocos quebráveis, blocos de recompensa, blocos usados e segredos liberarão
moedas ou itens. O jogador poderá ficar fortalecido, usar poder elemental e
ganhar invencibilidade temporária. A campanha incluirá vidas extras, moedas,
gemas persistentes, checkpoints, canos, portais, salas bônus, rotas secretas,
atalhos e chegadas com pontuação contextual.

Os inimigos cobrirão arquétipos terrestres, cascos, espinhos, plantas,
voadores, arremessadores, perseguidores aéreos, projéteis e criaturas
aquáticas. Oito guardiões terão movimentos e ataques próprios. A arte será
vetorial e o áudio, procedural, com música por tema e estado.

## Modos de jogo

O título oferecerá 1 jogador, 2 jogadores em turnos e 2 jogadores cooperativos.
No modo alternado, cada jogador manterá vidas, score, poderes e turno. No
cooperativo, a câmera enquadrará os dois participantes e recuperará com
segurança quem ficar para trás. O save registrará o modo e seu progresso sem
misturar estados incompatíveis.

## Persistência e replay

O save v2 terá schema estrito e identificará colecionáveis por `fase:entidade`.
O sistema manterá um slot primário e o último backup válido. O carregamento
tentará, nesta ordem: save v2, backup v2, migração do v1 e estado inicial. A
migração validará e limitará cada campo. A interface informará qualquer
recuperação. A exclusão de progresso exigirá confirmação.

O replay guardará versão, fase, modo, seed, snapshot inicial e entradas
compactadas. Um checksum detectará truncamento ou adulteração. A reprodução
usará uma sessão isolada e nunca alterará score, vidas, itens, desbloqueios,
conquistas ou armazenamento.

## Controles, acessibilidade e desempenho

Teclado, gamepad e toque alimentarão ações semânticas comuns. O sistema lerá o
gamepad uma vez por frame. Cada ponteiro de toque terá captura própria e será
liberado em `pointerup`, `pointercancel`, `lostpointercapture`, `blur`, mudança
de visibilidade e teardown.

O Canvas terá descrição textual, foco visível, layout responsivo, suporte a
`prefers-reduced-motion` e resolução ajustada ao `devicePixelRatio`. A região
`aria-live` anunciará somente mudanças relevantes. Partículas e projéteis serão
reciclados ou removidos; renderização e atualização usarão culling.

Cada exemplo core terá seu próprio import dinâmico. Abrir o Reino Zero Ultra
não baixará as IRs dos demais exemplos.

## Erros e recuperação

Dados inválidos serão recusados na fronteira. Mensagens identificarão a fase,
entidade ou campo incorreto. O runtime nunca dependerá de posições opcionais em
arrays. Falhas de save preservarão o último estado válido e produzirão feedback
para o jogador.

## Verificação

Cada defeito terá uma regressão mínima que falha antes da correção. A matriz
cobrirá física, poços, mecânicas, economia, vidas, chefes, plataformas, limpeza
de objetos, 32 playthroughs, save, migração, recuperação, replay, três modos de
jogo, controles, acessibilidade, DPR, áudio e carregamento lazy.

O E2E concluirá uma fase, recarregará o progresso, reproduzirá uma partida e
exercitará teclado, toque cancelado e os três modos. A validação final executará
Biome, typecheck, build, testes focados, suíte completa e E2E afetados. As
falhas globais de integração registradas no review também serão corrigidas sem
sobrescrever mudanças concorrentes.
