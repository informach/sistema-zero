# Arquipélago: física viva (fase1-22)

Plano escrito em 28/10/2026 a partir do levantamento que a dona enviou
(`docs/pesquisa/2026-10-28-fisica-3d-rapier.md`, "física 3D profissional com Rapier") e do pedido
dela: "explorar bem a física para todos os elementos do jogo, muito bem trabalhada". Item do
acompanhamento: fase1-22. Começa depois da parte da Capi e dos bichos
(`docs/plans/2026-10-28-arquipelago-capi-e-bichos.md`).

## O princípio

O levantamento resume o que os jogos profissionais fazem: realismo **percebido**, não científico.
Três camadas trabalham juntas: física simulada (Rapier: gravidade, colisão, juntas, forças),
física controlada (regras do jogo que deixam o movimento previsível e divertido) e o que se vê e
se ouve (shader, partículas, animação, som). Nada que é só enfeite precisa simular.

## O que o jogo já tem, comparado ao levantamento

Conferido no código em 28/10/2026.

| Tema do levantamento | No jogo hoje | Onde |
|---|---|---|
| Personagem cinemático com estados (§10, a recomendação inicial) | Sim: chão, cipó, escalada e nado, com o controlador do Rapier (degrau de 0,45, sobe até 52°, escorrega acima de 60°) | `personagem/personagem.tsx` |
| Cipó como pêndulo controlado (§4.1) | Sim: balanço num plano, bombear como no parquinho, soltar com a velocidade tangencial | `sistemas/cipo.ts` |
| Corda que se deforma (§4.2 e 4.3; na Unreal, o "cable component") | Sim, sem o Rapier: corrente Verlet de 18 elos que encosta no corpo, no tronco, nos outros cipós e no chão | `sistemas/cordas.ts`, `mundo/cipo-desenhado.ts` |
| Corda deformável do Rapier (`SoftBodyDesc.rope`) | Não existe na versão instalada: `@dimforge/rapier3d-compat` 0.19.2 não tem `SoftBody` (conferido nos arquivos do pacote). A corda Verlet continua | `node_modules/.bun/@dimforge+rapier3d-compat@0.19.2` |
| Água (§3) | Só o lago raso do Bosque: a elipse do nó `agua` vira água rasa, o avatar nada e afunda até a cintura. Sem fundo, sem empuxo, sem correnteza, sem ondulação nem respingo | `mundo/bosque-vivo.tsx`, `sistemas/` (água rasa) |
| Escorregador (§5) | O personagem desce a rampa pelo controlador; não há estado de deslizar com velocidade acumulada | `personagem/personagem.tsx` |
| Objetos que caem, rolam e se empurram (§2, §7) | Nenhum: todo corpo do mundo é `fixed` | `mundo/*.tsx` |
| Juntas e mecanismos (porta, alçapão, ponte suspensa) | Nenhum: a porta da casa abre por troca de colisor | `mundo/colisao-da-ilha-central.ts` |
| Passo físico fixo com interpolação (§9.2) | Não: `<Physics timeStep="vary">`, o passo acompanha o quadro | `mundo/cena.tsx` |
| Colisores simples, malha só no chão (§11) | Sim (regra de 28/10/2026: caixa ou cilindro arredondado, malha só no `col-terreno`) | `mundo/colisores.tsx` |
| Só a ilha ativa pesa (§11) | Sim: uma ilha completa por vez na memória; as cordas só rodam com o Bosque ativo | `mundo/ilha-completa.tsx` |

## A sequência

Cada etapa tem regras puras com testes em `sistemas/`, números em `docs/arquipelago-regras.md`,
conferência no navegador com prints e GIFs, e full review antes do commit. Medidas de custo
entram no medidor (`__arquipelagoDesenho`): corpos ativos e tempo do passo físico.

### 1. Fundação

- **Passo fixo de 1/60 s com interpolação** no `<Physics>`, como pede o §9.2. Hoje o passo varia
  com o quadro: num celular lento a física muda de comportamento. O personagem, o balanço do
  cipó e as cordas passam a usar o mesmo relógio fixo.
- **Catálogo de materiais físicos** (`sistemas/materiais-fisicos.ts`): madeira, pedra, palha,
  corda e água, com densidade, atrito, quique e se boia. Calibrados para o jogo, não copiados
  de tabela (o §9.1 avisa: tronco oco não é bloco maciço).
- **Os primeiros objetos dinâmicos** no Bosque: toras pequenas, caixotes, pinhas e pedrinhas que
  caem, rolam e dormem quando param. O personagem continua cinemático e empurra com
  `applyImpulsesToDynamicBodies` do controlador, com massa limitada (uma criança empurra um
  caixote, não a cabana).
- Critério: caixote empurrado anda, para na parede e dorme; nada atravessa o chão em nenhuma
  taxa de quadros (teste com 30, 60 e 144 quadros por segundo).

### 2. Escorregador de verdade

- Estado **deslizar** do personagem (§5.3): ao pisar na pista do escorregador, a velocidade
  cresce ao longo da descida (`a = g × (sen θ − μ × cos θ)`), o corpo segue as curvas, e na saída
  o embalo continua um pouco no chão.
- A pista ganha colisores contínuos, sem emenda que prenda (§5.3, cuidado com quinas).
- Critério: a descida do percurso nas copas fica suave e sempre igual; o tempo-alvo do percurso
  continua cabendo (teste de `percurso`).

### 3. Água viva

- **Lago com fundo** e margem em rampa (no Blender, o pendente já anotado no README de
  `arte/ilhas`), com o nado em estados: entrar, nadar, sair (§3.3).
- **Flutuação por pontos** (§3.2, os "pontoons" da Unreal): as toras e os caixotes que caem no
  lago boiam, balançam e inclinam quando a criança sobe neles.
- **Ondulação e respingo** no shader da água onde algo encosta, e um respingo de partículas ao
  cair (§3.1 A).
- **Correnteza** só onde houver rio: o Bosque não tem; entra com o Recife, como um campo de
  velocidade por posição (§3.1 D).
- Critério: uma tora jogada no lago boia, gira devagar e para na margem; a criança sobe nela e
  ela inclina.

### 4. Cordas e pontes

- **Pontes de corda que reagem à passagem** (§4.4): as tábuas balançam um pouco com o peso, com
  oscilação limitada. Corrimãos de corda com a mesma corrente Verlet dos cipós.
- Critério: atravessar a ponte comprida faz as tábuas ondularem, sem nunca tirar a criança dela.

### 5. Casa na árvore e mecanismos

- Porta e alçapão com dobradiça de verdade (`RevoluteJoint`, §6), abrindo com o empurrão.
- Um mecanismo simples: o caixote em cima de uma placa abre algo (§12, etapa 2).
- Critério: a porta abre empurrando e volta devagar; o caixote na placa abre o alçapão.

### 6. Mundo que reage

- **Plantas que se dobram quando a criança passa**: moitas, capim e flores se afastam do corpo e
  voltam como mola, no shader, com a posição dela (sem colisor por folha, §7).
- **Vento**: um campo de vento que move os cipós soltos (força na corda Verlet) e as folhas
  (shader), mais forte à tarde.
- **Coisas que quebram** preparadas antes (§6.1): um galho seco que quebra com peso, trocado por
  pedaços prontos que caem.
- **Sistemas que se combinam** (§12, etapa 6): empurrar a tora para o lago e usá-la para chegar
  a um lugar novo.

## Regras que valem para todas as etapas

- O personagem continua cinemático com estados (§10); nada de trocar para corpo dinâmico.
- Colisor sempre simples; malha só para o chão estático (regra de 28/10/2026).
- Nada decorativo simula: folha, capim e flor balançam no shader.
- Corpo parado dorme; só a ilha ativa simula; teste em celular modesto antes de cada commit.
- O que muda o jogo (física controlada) fica em `sistemas/`, puro e testado; o que só se vê fica
  em `mundo/`.
