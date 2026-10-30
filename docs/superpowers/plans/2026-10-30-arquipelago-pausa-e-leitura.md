# A03: pausa, movimento e tempo para ler

Desenho autorizado pela auditoria de 30/10. Executar em sequência com `executing-plans`,
sem subagentes, revisão e commit próprios em cada parte completa, merge no staging local.
Sem push, banco remoto, alteração de arte, salvamento ou CI.

## A03a: o quarto acompanha a pausa

O `Quarto` de `mundo/casa.tsx` é compartilhado pela casa própria e pela visita. Hoje habilita
`RoomMotionContext` sempre e passa `reducedMotion={false}` ao pet. O contexto do móvel inicia
ou encerra ações do mixer; apenas desativá-lo durante uma pausa faria o modelo voltar à pose
inicial. A pausa precisa conservar a pose e retomar o mesmo instante.

- [x] Propagar `jogoPausado`, a preferência de movimento reduzido do aparelho e a opção do
  conforto até o quarto. Movimento reduzido desabilita animações ambientes. Pausa congela.
- [x] Acrescentar uma entrada de pausa compatível no módulo compartilhado de modelos do quarto,
  com padrão que conserva o comportamento dos outros consumidores. Controlar o mixer próprio,
  sem alterar a cena original ou o cache. Não recomeçar o clipe ao fechar um menu.
- [x] Pet: pausa opcional compatível e relógio local para o balanço do pássaro. Não avançar
  posição, giro ou fase enquanto parado. Retomar sem recuperar o tempo passado na pausa.
- [x] Conferir a mesma regra na casa própria e na visita, incluindo menu, ferramenta e preferência
  do aparelho. Usar os GLBs e a plataforma falsa existentes, sem criar arte substituta.
- [x] Testes de comportamento, navegador nos dois tamanhos, suites de jogo/avatar-quarto,
  tipagem, Biome, documentação e revisão antes do commit e merge.

Evidência: `docs/qa/2026-10-30-quarto-pausa/`. Ferramenta coberta pela regra pura de pausa;
menu, painel e preferências exercitados no navegador. 1.297 testes do jogo aprovados, 1 de
Postgres local ignorado; 2 testes do avatar-quarto aprovados; tipagem dos dois pacotes e
Biome aprovados. Onze cenários por tamanho. Sem pedido de arte, mudança de salvamento ou push.

## A03b: a abertura espera a leitura

Conservar as oito pinturas, a história e o encerramento que abre os primeiros passos do Zappy.
O avanço deve ser por fala, inclusive as duas falas da última pintura.

- [x] Regra pura de navegação entre falas, com limites, anterior e próxima. Leitura manual como
  padrão; opção explícita para reprodução automática e pausa dessa reprodução.
- [x] Botões visíveis para anterior/próxima e estado da reprodução, no estilo da abertura.
  Teclado não deve transformar a ativação de um desses botões em avanço do palco.
- [x] Conservar pular, Esc, leitor de tela, aba escondida, interrupção pelo salvamento e limpeza
  dos listeners/timers. Desmontar não conta como abertura vista. Menos movimento continua valendo.
- [x] Testar primeira vez e rever pelo diário, última fala, tempo parado, voltar e retomar.
  Conferir 390 px e computador; preservar os testes de ciclo de vida e os primeiros passos.
- [x] Revisão, suites, tipagem, Biome e docs; commit e merge local no fechamento deste lote.

Evidência: `docs/qa/2026-10-30-leitura-abertura/`. A suíte completa teve 1.298 testes aprovados,
1 ignorado (Postgres local), tipagem e Biome aprovados. Os 50 testes dirigidos foram repetidos
após a revisão. Navegador nos dois tamanhos: espera manual, pausa, automático, nove falas,
teclado dos controles, voltar, concluir e rever. Legenda separada dos botões e botões com pelo
menos 44 px. Nenhuma alteração no roteiro, nas imagens, no salvamento ou nos primeiros passos.

## A03c: cuidado beneficia sem reduzir o ritmo básico

- [ ] Preservar o ritmo básico 1 para humor bem ou cansado e o bônus 1,1 para humor ótimo.
  Não alterar quedas das necessidades, comida, descanso ou recompensas neste lote.
- [ ] Conferir o cálculo do movimento e os percursos com necessidades baixas, sem transformar
  o cuidado numa condição oculta para conseguir atravessar ou terminar um percurso.
- [ ] Atualizar testes e a regra documentada, incluindo a distinção entre ritmo básico e bônus.
- [ ] Revisão, testes, tipagem, Biome e conferência no playground antes de commit e merge.

## Limites

Não reescrever os primeiros passos que outra sessão acabou de integrar. O ajuste de prioridades
do HUD no final pertence ao A04. Nenhum pedido de arte identificado nesta leitura.
