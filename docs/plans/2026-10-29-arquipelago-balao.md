# Balão da Ilha das Nuvens, fase4-09

**Objetivo:** o movimento novo das Nuvens (proposta: "Movimento: Balão"; "balão nas Nuvens ... cada
um é um minijogo e um jeito de chegar"). Subir no balão parado, voar em volta da ilha segurando o
fogo e pousar de novo. É a base da corrida de balão da fase4-07.
**Arquitetura:** regra pura em `sistemas/balao.ts`, modo novo `balao` em `sistemas/modos/balao.ts`
no contrato de `tipos.ts`, desenho e interativo em `mundo/balao-das-nuvens.tsx`, montado pelo
`NuvensVivo` (só com a ilha completa ativa). Arte que já existe: a âncora `balao` do `nuvens.glb` e o
`nuvens-balao.glb` (nó `balao`, clipe `flutuar`). Nenhum `.glb` nem gerador muda.

## Decisões

- **Guiado como o barco.** O modo calcula onde o cesto vai e o corpo segue pelo controlador livre
  (`direto`): a física tem a última palavra. O corpo não nada, não pula e não pega nada no voo. O
  desenho da criança fica no cesto, que acompanha o clipe `flutuar`.
- **Entrar:** a pé, no chão, até 1,6 m do cesto parado, "Subir no balão" (E ou Usar). Um passo
  guiado de 0,7 s, com um pulinho de 0,95 m por cima da borda do cesto (0,82 m).
- **Voar** (números em `BALAO`, `sistemas/balao.ts`):
  - segurar Pular (no toque o botão vira "Subir") acende o fogo: sobe com 1,4 m/s² até 1,8 m/s;
  - soltar: desce devagar, chegando a 0,7 m/s com 0,7 m/s²;
  - o direcional empurra para os lados com 1,6 m/s², até 3 m/s, e o ar segura: sem pedido a
    velocidade cai pela metade a cada 0,8 s ("peso do ar");
  - teto de 18 m acima do tampo da ilha;
  - raio de 24 m do meio da ilha. Passando dele, uma brisa mansa traz de volta, crescendo até
    4 m/s² em 6 m (mais que o direcional, para o cesto parar dentro da faixa), e o ar tira o
    embalo de sair. Sem castigo, como a correnteza do mar;
  - fora do chão da ilha (mais de 19,2 m do meio) o ar segura o cesto a 1,5 m acima do tampo:
    não se afunda no vazio.
- **Pousar e descer:** o cesto pousa quando encosta em algo por baixo (o chão, o ninho, um degrau).
  Pousado, o vento não arrasta o cesto e aparece "Descer do balão" (E ou Usar). Descendo a até
  1,5 m do lugar do balão, a criança sai para o lado da ilha (1,4 m para o meio). Em qualquer
  outro lugar ela fica de pé onde o cesto pousou. O balão volta ao lugar dele. Descer em cima do
  ninho é o "jeito de chegar" a um lugar que antes não se alcançava.
- **Colisão:** o cesto parado tem uma caixa simples (1,1 × 0,82 × 1,1 m) que só segura o corpo
  (`gruposDoColisor(true)`), ignorada pelo corpo dentro do modo `balao`. O envelope não colide: só
  o corpo da criança conta no voo (limite anotado).
- **Câmera:** perfil `balao`, um pouco mais longe (no mínimo 11 m) e mais alta (inclinação mínima
  0,45), para ver em volta do cesto.
- **Pausa e conforto:** a pausa congela o voo e o clipe. Com menos movimento (aparelho ou menu), o
  `flutuar` toca a 35% da velocidade.
- **Salvamento:** nada. O balão sempre recomeça parado no lugar dele.
- **Lugar do balão:** a âncora `balao` (5,6; −8,4). O poste com a corda está em (4,6; 7,6), do outro
  lado: o gerador trocou o sinal do z da âncora (ver pedidos de arte). O jogo segue a âncora.

## Pedidos de arte

1. `nuvens.glb`: a âncora `balao` está em (5,6; 1; −8,4), mas o poste de amarrar
   (`col-cil-poste-balao-1`) e a corda solta estão em (4,6; 7,6), com a ponta da corda em (5,5; 7,7).
   Em `nuvens.py` a âncora entra com o z do jogo e o poste com o y do Blender. Pedido: âncora `balao`
   em (5,6; 1; 8,4), junto da ponta da corda. O jogo lê a âncora, então muda sozinho.
2. `nuvens-balao.glb`: uma âncora `passageiro` no piso do cesto, filha do nó `balao` (como no
   `barco.glb`). Hoje o código usa a base do cesto (y 0) como o piso.

## Etapas

- [x] Regras puras `sistemas/balao.ts` e testes (entrar, subir, descer, lados, teto, raio e brisa,
  pouso, sair, pausa).
- [x] Modo `balao` (`ModoDoCorpo`, `MODOS`, pedido, trocas, `EstadoDoCorpo`) e testes de modo.
- [x] `mundo/balao-das-nuvens.tsx`: carga privada, âncora, colisor do cesto, interativo, clipe, o
  desenho da criança no cesto, o medidor.
- [x] Toque ("Subir"), câmera (perfil `balao`), "Descer do balão" no alvo.
- [x] Teste contra os colisores do `nuvens.glb`: chão livre e alcance a pé até o balão.
- [x] `playground/verificar-balao-browser.ts`: subir, voar, teto, pousar, descer, pausa, computador
  e celular emulado.
- [x] Regras, `CLAUDE.md`, revisão completa, testes, tsc e biome, commit local.

## Resultado (29/10/2026)

- Testes: `balao.test.ts` (16: entrar, fogo, lados, teto, brisa, ar fora da ilha, pausa, pouso no
  chão e no ninho, apoio que sai, saída perto do lugar, o modo e o pedido) e
  `balao-das-nuvens.test.ts` (3, contra os colisores do `nuvens.glb`: cesto e envelope parados sem
  nada da ilha dentro, alcance a pé do lado do cesto e a saída em chão livre alcançável). Jogo
  inteiro: 964 aprovados, 1 pulado (Postgres local). Typecheck com 8192 MB e Biome limpos.
- Navegador: `verificar-balao-browser.ts` aprovado no computador e no celular emulado (toque e
  menos movimento). Detalhes e limites em `docs/qa/2026-10-29-nuvens-balao/README.md`.
- No celular a dica dos controles ficou só com "Subir" e "Descer do balão": com o "Para os lados"
  ela cobria o joystick.
- Salvamento: nada a guardar nesta fase (o balão sempre recomeça parado).
