# Arquipélago: física viva (fase1-22)

Plano escrito em 28/10/2026 a partir do levantamento que a dona enviou
(`docs/pesquisa/2026-10-28-fisica-3d-rapier.md`, "física 3D profissional com Rapier") e do pedido
dela: "explorar bem a física para todos os elementos do jogo, muito bem trabalhada". Item do
acompanhamento: fase1-22. Começa depois da parte da Capi e dos bichos
(`docs/plans/2026-10-28-arquipelago-capi-e-bichos.md`).

Revisto no mesmo dia, depois da segunda mensagem dela, que destacou quatro pontos do levantamento:

1. **Vento em árvores** ("forças disponíveis; movimento e deformação");
2. **Fogo se espalhando** ("não [vem pronto]; sistema de materiais e estados");
3. **Água**: a integração Godot Rapier tem fluido por partículas, mas isso "não significa que a
   biblioteca JavaScript @dimforge/rapier3d ofereça automaticamente esse sistema de água. Para
   nosso cenário web, eu priorizaria água por superfície, empuxo e forças calculadas";
4. **O exemplo prático**: "um tronco flutuando com Rapier [...] com quatro pontos de flutuação.
   Cada ponto recebe uma força de empuxo de acordo com sua profundidade na água."

Por isso a água com o tronco que boia passou para logo depois da fundação, e o vento e o fogo
ganharam etapas próprias.

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
| Fluido por partículas (o da integração Godot Rapier) | Não existe no pacote JavaScript, como a dona apontou. Não vamos simular fluido: água é superfície, empuxo e forças calculadas | |
| Água (§3) | O mar em volta da ilha central (`NIVEL_DA_AGUA` 0, nado de verdade, a cintura boia na linha da água) e o lago do Bosque, que não tem fundo: a elipse do nó `agua` (2,2 por 1,5 m de raio) vira água rasa e o avatar afunda até a cintura com o corpo no chão. Nada boia, não há correnteza, ondulação nem respingo | `personagem/personagem.tsx`, `mundo/bosque-vivo.tsx` |
| Escorregador (§5) | O personagem desce a rampa pelo controlador; não há estado de deslizar com velocidade acumulada | `personagem/personagem.tsx` |
| Objetos que caem, rolam e se empurram (§2, §7) | Nenhum: todo corpo do mundo é `fixed` | `mundo/*.tsx` |
| Juntas e mecanismos (porta, alçapão, ponte suspensa) | Nenhum: a porta da casa abre por troca de colisor | `mundo/colisao-da-ilha-central.ts` |
| Vento (§2, tabela; §7) | Nenhum: as copas e o capim são estáticos, os cipós só se mexem com o corpo | |
| Fogo e materiais com estado (§8) | Nenhum | |
| Passo físico fixo com interpolação (§9.2) | Não: `<Physics timeStep="vary">`, o passo acompanha o quadro. O personagem e o bicho calculam o movimento no `useFrame` a partir de `translation()` | `mundo/cena.tsx`, `personagem/personagem.tsx`, `mundo/bicho-adotado.tsx` |
| Colisores simples, malha só no chão (§11) | Sim (regra de 28/10/2026: caixa ou cilindro arredondado, malha só no `col-terreno`) | `mundo/colisores.tsx` |
| Só a ilha ativa pesa (§11) | Sim: uma ilha completa por vez na memória; as cordas só rodam com o Bosque ativo | `mundo/ilha-completa.tsx` |

## A sequência

Cada etapa tem regras puras com testes em `sistemas/`, números em `docs/arquipelago-regras.md`,
conferência no navegador com prints, e full review antes do commit. Medidas de custo entram no
medidor (`__arquipelagoDesenho`): corpos ativos e tempo do passo físico.

### 1. Fundação: passo fixo e materiais

- **Passo fixo de 1/60 s com interpolação** (`<Physics timeStep={1/60} interpolate>`, §9.2). Só
  trocar o `timeStep` não basta: o `@react-three/rapier` junta o tempo e dá zero, um ou vários
  passos por quadro, e o personagem e o bicho calculam o movimento no `useFrame` a partir de
  `translation()`. Numa tela de 144 Hz, mais da metade dos quadros não teria passo, e o movimento
  calculado nesses quadros se perderia (a criança andaria a menos da metade da velocidade). Então:
  - o movimento do personagem e do bicho (controle, controlador de personagem, cipó, escalada,
    nado) passa para `useBeforePhysicsStep`, com o `dt` do passo (sempre 1/60 s);
  - o que é desenho (pose do avatar, mãos na corda, olhar, clipes, câmera) continua no
    `useFrame`, lendo a posição **interpolada** do corpo, para não tremer;
  - a ordem de cada passo segue o §9.2: entrada, forças do ambiente (empuxo, correnteza, vento),
    controladores, passo do Rapier, leitura de posições e eventos.
- **Catálogo de materiais físicos** (`sistemas/materiais-fisicos.ts`): madeira, madeira seca,
  pedra, palha, corda, folha e água, com densidade, atrito, quique, se boia e se pega fogo.
  Calibrados para o jogo, não copiados de tabela (o §9.1 avisa: tronco oco não é bloco maciço).
- Critério: andar, correr, pular, cipó, escalada e nado iguais aos de hoje em 30, 60 e 144 quadros
  por segundo (teste que roda o passo puro nas três taxas e compara as distâncias).

### 2. Água por superfície, empuxo e forças calculadas (o tronco que boia)

É a prioridade da dona para a água. Nada de fluido: a água é uma superfície com altura conhecida,
e cada corpo que boia calcula as próprias forças.

- **Empuxo por pontos** (`sistemas/empuxo.ts`, puro): o exemplo prático do levantamento. O tronco
  tem quatro pontos de flutuação ao longo do comprimento; cada um tem um quarto do volume. Em cada
  passo, para cada ponto:
  - profundidade `d` = altura da superfície menos a altura do ponto;
  - fração submersa `f` = `d / (2 × raio)` limitada entre 0 e 1 (a seção do tronco);
  - empuxo para cima `ρ_água × g × (V/4) × f`, aplicado **no ponto** (`applyImpulseAtPoint`, com
    `F × dt`): como cada ponta recebe a sua força, o tronco fica deitado, balança e inclina quando
    algo pesa numa ponta;
  - arrasto da água no ponto, contra a velocidade do ponto e proporcional a `f` (sem ele o tronco
    pula na superfície como mola).
  O resultado é conferido no teste: um tronco de madeira (densidade abaixo da água) para com
  cerca de metade do volume dentro; um de pedra afunda; inclinado, ele volta a deitar.
- **Lago com fundo** no Blender (o pendente anotado no README de `arte/ilhas`): uma bacia de uns
  0,6 m abaixo do tampo, com a margem em rampa no `col-terreno`, para a água ter onde boiar. O nado
  no lago passa a ser o mesmo do mar (a cintura na linha da água), sem o "afundar o desenho".
- **O tronco no lago do Bosque**: um corpo dinâmico (cilindro arredondado, `madeira` do catálogo)
  que boia, gira devagar e encosta na margem. A criança empurra (o controlador com
  `applyImpulsesToDynamicBodies` e massa limitada) e, em pé em cima, ele afunda um pouco e inclina
  para o lado dela.
- **Ondulação e respingo** no shader da água onde algo encosta, e um respingo de partículas ao
  cair (§3.1 A).
- **Correnteza** só onde houver rio: o Bosque não tem; entra com o Recife, como um campo de
  velocidade por posição (§3.1 D), aplicado nos mesmos pontos de flutuação.
- Critério: o tronco jogado no lago boia, gira devagar e para na margem; a criança sobe nele e ele
  inclina; nada atravessa o fundo em 30, 60 e 144 quadros por segundo.

### 3. Escorregador de verdade

- Estado **deslizar** do personagem (§5.3): ao pisar na pista do escorregador, a velocidade
  cresce ao longo da descida (`a = g × (sen θ − μ × cos θ)`, com o `μ` do material da pista), o
  corpo segue as curvas, e na saída o embalo continua um pouco no chão.
- A pista ganha colisores contínuos, sem emenda que prenda (§5.3, cuidado com quinas).
- Critério: a descida do percurso nas copas fica suave e sempre igual; o tempo-alvo do percurso
  continua cabendo (teste de `percurso`).

### 4. Cordas e pontes

- **Pontes de corda que reagem à passagem** (§4.4): as tábuas balançam um pouco com o peso, com
  oscilação limitada. Corrimãos de corda com a mesma corrente Verlet dos cipós.
- Critério: atravessar a ponte comprida faz as tábuas ondularem, sem nunca tirar a criança dela.

### 5. Casa na árvore e mecanismos

- Porta e alçapão com dobradiça de verdade (`RevoluteJoint`, §6), abrindo com o empurrão.
- Um mecanismo simples: o caixote em cima de uma placa abre algo (§12, etapa 2).
- Critério: a porta abre empurrando e volta devagar; o caixote na placa abre o alçapão.

### 6. Vento: movimento e deformação

O levantamento põe o vento como "forças disponíveis; movimento e deformação": o Rapier aplica a
força, o resto é regra nossa e shader.

- **Um campo de vento único** (`sistemas/vento.ts`, puro): direção que gira devagar, força base
  por hora do dia (mais forte à tarde) e rajadas por ruído suave no espaço e no tempo, para a
  rajada atravessar a ilha em vez de bater em tudo ao mesmo tempo. Todo o resto lê dele.
- **Árvores e plantas** (deformação no shader, sem colisor por folha, §7): as copas balançam
  pela altura (o pé parado, a ponta mais solta), o capim e as moitas se dobram na direção da
  rajada e voltam como mola; a mesma conta do campo de vento no vertex shader, então a onda de
  uma rajada passa visível pelas árvores.
- **O que é físico** (força de verdade): os cipós soltos (força em cada elo da corrente Verlet),
  as folhas e penas que caem (corpos leves com arrasto alto) e o tronco no lago (o vento empurra
  um pouco a parte de fora da água).
- **Plantas que se dobram quando a criança passa**: o mesmo shader recebe a posição dela.
- Critério: uma rajada atravessa o Bosque de um lado ao outro (as copas balançam em sequência);
  com `prefers-reduced-motion`, o balanço fica bem menor.

### 7. Materiais com estado e fogo

O levantamento é claro: o fogo "não [vem pronto]; sistema de materiais e estados". É o catálogo da
etapa 1 ganhando estado.

- **Estados por objeto** (`sistemas/estados-dos-materiais.ts`, puro): cada objeto que pode mudar
  tem material e estado: `seco`, `molhado`, `queimando`, `queimado` (e `apagado`). Molhar (chuva,
  cair no lago, regador) põe em `molhado`, que não pega fogo e seca com o tempo. Os números (quanto
  tempo queima, quanto calor passa) ficam no catálogo, por material: palha pega rápido, madeira
  seca devagar, pedra nunca.
- **Espalhar** sem simular chama: o fogo é uma grade de células de calor só onde há objetos que
  queimam; cada passo, uma célula `queimando` passa calor às vizinhas pela distância e pelo vento
  (a direção da etapa 6). Passou do ponto do material, a vizinha pega fogo. Partículas e luz são
  só desenho.
- **Para uma criança**: o fogo do jogo é de fogueira, lanterna e forno, sempre num lugar que
  segura (pedras em volta), e a água sempre apaga. Nada de casa pegando fogo nem castigo. O que a
  fogueira acesa faz no jogo (cozinhar, iluminar) a dona decide quando a etapa chegar.
- Critério: a fogueira com palha pega em segundos, com lenha molhada não pega; o vento leva a
  faísca para a palha do lado de lá; um balde de água apaga.

### 8. Mundo que reage

- **Coisas que quebram** preparadas antes (§6.1): um galho seco que quebra com peso, trocado por
  pedaços prontos que caem.
- **Sistemas que se combinam** (§12, etapa 6): empurrar o tronco para o lago e usá-lo para chegar
  a um lugar novo; o vento levando o tronco devagar até a outra margem.

## Regras que valem para todas as etapas

- O personagem continua cinemático com estados (§10); nada de trocar para corpo dinâmico.
- Colisor sempre simples; malha só para o chão estático (regra de 28/10/2026).
- Nada decorativo simula: folha, capim e flor balançam no shader.
- Água é superfície, empuxo e forças calculadas; nada de fluido por partículas.
- Corpo parado dorme; só a ilha ativa simula; teste em celular modesto antes de cada commit.
- O que muda o jogo (física controlada) fica em `sistemas/`, puro e testado; o que só se vê fica
  em `mundo/`.

## Execução desta continuação

- [x] Etapas 1 e 2 presentes na staging recebida, preservadas.
- [x] Etapa 3 conferida. O modo já existia. Teste adicional compara a mesma descida em 30, 60 e 144 quadros, mantendo passos de 1/60 s. Navegador confirma entrada, descida e saída com embalo.
- [x] Etapa 4: cordas e pontes.
- [x] Etapa 5: mecanismos implementados e conferidos na sala. Ativação na casa depende de regerar o GLB.
- [x] Etapa 6: vento.
- [ ] Etapa 7: materiais e fogo.
- [ ] Etapa 8: mundo que reage.

### Medição e acompanhamento

Protocolo: Chrome local, medidor ligado, 24 amostras de 250 ms após aquecimento, sala e Bosque no mesmo lugar. Tela estreita é 390 × 844 no computador, não um ensaio em celular físico. Etapa 3 antes: mediana de 60 FPS na sala, no Bosque e na tela estreita. Evidências locais em `.cache/arq-antes-3.json` e imagens de mesmo prefixo.

O acesso ao acompanhamento remoto falhou pela ferramenta web e o navegador compartilhado está ocupado. Nenhuma escrita sem `if_version` foi feita. Nota da etapa 3 a sincronizar no cartão `fase1-22`, coleção `itens`: "Escorregador conferido: descida suave, velocidade preservada na saída e mesmo resultado em diferentes taxas de quadros." O cartão continua pendente até todas as etapas terminarem.

Etapa 3 depois: mediana de 60 FPS nas três condições, sem erro de página. Suíte: 335 testes passaram, um teste de banco local pulado. A conferência global também encontrou arquivos do caderno dos Lumis em edição concorrente; eles não foram alterados nem incluídos neste commit.

### Etapa 4

Pontes com piso cinemático e cordas deformadas pela mesma mola limitada. A corrente Verlet dos cipós não foi alterada: a ponte pede duas pontas presas e uma deformação pequena e previsível. Review corrigiu a exclusão das plataformas cinemáticas no controlador e colocou o medidor dentro do contexto da física. Teste lê o GLB real e confere todos os trechos. Nenhum modelo foi regravado.

Navegador: personagem apoiado na ponte comprida, 0,10 m de afundamento, caminhada mantendo o apoio, sem erro de página ou shader. Medianas antes/depois: sala 60/60, Bosque 60/60, tela estreita 60/60 FPS. Uma amostra com carga mostrou 0,28 ms por passo e 50 corpos ativos, incluindo as plataformas. Não é medida em celular físico. Evidências em `.cache/arq-final-4c.json` e imagens.

Nota a sincronizar com `if_version`: "As pontes cedem e balançam com a passagem, mantendo o piso e os corrimãos seguros." O acesso ao cartão remoto continua indisponível nesta sessão.

### Etapa 5

Porta e alçapão usam dobradiças Rapier. A porta recebe o empurrão normal do personagem e uma mola a traz de volta. Caixote sobre a placa abre o alçapão; o piso permanece inteiro embaixo. A estação Mecanismos permite conferir sem alterar arte. O script do Bosque abre as paredes da casa e exporta duas âncoras para montar o mecanismo. O GLB antigo fechado não recebe uma porta por cima.

Review corrigiu a estação sobreposta a uma plataforma, o caixote baixo que virava degrau e o contato indevido da porta com a placa. Navegador: placa ligada, alçapão em 1,23 rad; porta empurrada em -1,08 rad e retorno a 0,03 rad após sair. Um caixote tombado sob o alçapão pode segurá-lo aberto, como qualquer contato físico. Medianas antes/depois: sala 60/60, Bosque 60/60, tela estreita 60/60 FPS, sem erro de página. Evidência: `.cache/arq-final-5g.json`.

Pendente de arte: regerar o Bosque com `arte/ilhas/bosque.py` e conferir a entrada da casa. Nenhum GLB ou relatório foi regravado. Nota a sincronizar com `if_version`: "Porta com dobradiça e caixote que abre o alçapão prontos e testados na sala. A casa aguarda a nova arte."

### Etapa 6

Campo único com direção lenta, força maior à tarde e rajada espacial. Shader nas copas, galhos altos, moitas e tufos; a proximidade da criança dobra a vegetação baixa. As raízes não se deslocam. A preferência de movimento reduzido baixa a deformação a 20%, sem mudar as regras físicas. Os cipós livres passaram para o passo fixo e recebem vento por elo. O tronco recebe força na fração exposta; duas peças soltas, folha e pena, caem com arrasto e dormem no chão. A folhagem decorativa não ganhou corpos.

Navegador: Bosque sem erro de shader, 78 materiais e cópias ligados ao campo, preferência de movimento reduzido confirmada em 0,2. Medianas antes/depois: sala 60/60, Bosque 60/60, tela estreita 60/60 FPS. Evidência: `.cache/arq-final-6.json`. Não foi teste em celular físico. Nenhuma mudança de arte necessária nesta etapa.

Nota a sincronizar com `if_version`: "Vento nas copas, moitas, capim, cipós e tronco do lago. Plantas se dobram com a passagem e o movimento reduzido é respeitado."

Verificação da etapa 6: 359 testes passaram, um teste local de banco pulado; typecheck sem erros. O comando de lint do pacote encontrou cinco erros de formatação/importação apenas nos arquivos novos de `sistemas/construcao`, em edição por outra sessão. O lint dos nove arquivos de código desta etapa passou. Esses arquivos externos não foram alterados nem incluídos no commit.
