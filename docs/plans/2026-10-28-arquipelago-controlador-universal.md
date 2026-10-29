# Arquipélago: controlador universal, câmera e controles

Plano escrito em 28/10/2026 a partir de quatro mensagens da dona no mesmo dia (resumo em
`docs/pesquisa/2026-10-28-animacao-camera-controles.md`):

1. "Como os jogos profissionais fazem animações e física": animação e física são sistemas
   separados; cápsula cinemática do Rapier, máquina de estados de animação com transições,
   aceleração e desaceleração, coyote time e jump buffer, passo fixo de 1/60 s, animações no lugar
   (in-place), uma sala de testes antes de ampliar o mundo.
2. A decisão dela: a base é React Three Fiber + Rapier + Blender + Three.js/Drei + GLB, para o Kids
   e o Adultos; começar por um controlador universal de personagens, reutilizável em todas as
   ilhas, com movimento e física independentes da aparência do avatar.
3. "Câmeras e controles em jogos profissionais 3D": câmera híbrida em terceira pessoa (livre na
   exploração, assistência discreta, perfis por atividade), braço com colisão e transparência,
   ações separadas dos dispositivos (teclado, mouse, controle, toque), contextos de entrada,
   joystick flutuante no celular, preferências de conforto como requisito.
4. "Como jogos profissionais criam as mecânicas físicas de exploração": movimento livre, guiado e
   especializado; modos de movimento com entrar, atualizar e sair (Psychonauts 2); o Bosque como a
   primeira grande demonstração (tronco caído, escalar, cipó, plataforma, casa na árvore, bicho
   escondido, escorregador).

## O que o jogo já tem

Conferido no código em 28/10/2026. A base que ela escolheu é a que o jogo já usa.

| Pedido | No jogo hoje | Onde |
|---|---|---|
| R3F + Rapier + Blender + GLB | Sim | `mundo/cena.tsx`, `arte/` |
| Avatar real da plataforma, esqueleto animável | Sim: o `AvatarRig` do `@sistemazero/avatar-quarto`, esqueleto Mixamo; roupas e acessórios vêm da plataforma | `personagem/avatar-do-jogo.tsx` |
| Biblioteca de animações no Blender, in-place, em GLB | Sim: Andar, Correr, Pulo, Queda, Aterrissagem, Nado, Pendurado, Escalar (`arte/avatar/locomocao.py`), mais o Idle da plataforma; só giros e a bacia | `assets/avatar/locomocao.glb` |
| Máquina de estados com transições | Sim, por pesos: andar e correr na mesma fase (o pé não patina), pulo, queda e aterrissagem pela velocidade vertical e pelo chão | `sistemas/locomocao.ts` |
| Cápsula cinemática com controlador do Rapier | Sim: degrau 0,45, sobe 52°, escorrega acima de 60°, gruda no chão | `personagem/personagem.tsx` |
| Passo fixo de 1/60 s com interpolação | Sim (desde a física viva, etapa 1) | `mundo/cena.tsx` |
| Modos especiais | Chão, nado (mar e lago), cipó, escalada | `personagem/personagem.tsx` |
| Câmera em terceira pessoa com braço e colisão | Sim: esfera (`castShape`) da cabeça à câmera, encosta na hora e volta devagar, gira para o lado livre, grua por cima do ombro | `personagem/camera.tsx`, `sistemas/camera.ts` |
| Transparência do que tapa | Sim: copas, troncos e telhados esmaecem; dentro de casa a câmera sobe e chega perto | `mundo/copas.ts` |
| Girar, inclinar e zoom com mouse e toque | Sim (arrastar, rodinha, pinça, duplo clique para as costas) | `personagem/camera.tsx` |
| Enquadramento de conversa | Sim (a Capi) | `personagem/camera.tsx` |
| Movimento relativo à câmera | Sim | `personagem/personagem.tsx` |
| Ações separadas do dispositivo | Em parte: o `Controle` já é a ação (eixo, correr, pular, usar), e teclado e toque escrevem nele | `controles/controle.ts`, `interface/toque.tsx` |
| Menos movimento | Sim (`prefers-reduced-motion` no cipó) | `estado/preferencias.ts` |

## O que falta (a sequência)

Depois da quarta mensagem (mecânicas de exploração), a arquitetura de modos ganhou uma
especificação própria: `docs/specs/2026-10-28-arquipelago-modos-de-movimento.md` (o contrato
comum, os modos que existem com os números do código e os próximos do Bosque: equilíbrio no tronco
caído, escada, agarrar a borda e escorregar). A parte 6 abaixo é separar os modos de hoje do
`personagem.tsx` nesse contrato.

### 1. Movimento com peso e tolerância (`sistemas/movimento.ts`, puro) ✅

- **Aceleração e desaceleração**: hoje a velocidade pedida vale na hora. No chão, chega na
  velocidade em uns 0,15 s e para em uns 0,1 s; no ar, a direção só corrige (já existe o
  `CONTROLE_NO_AR`); na água, mais lento para acelerar e para parar.
- **Coyote time**: pular até 0,12 s depois de sair da beirada.
- **Jump buffer**: o pulo apertado até 0,12 s antes de tocar o chão acontece ao tocar. Hoje,
  segurar o espaço pula de novo a cada aterrissagem (pulo de coelho); com o buffer, cada toque
  vale um pulo.
- Perfis de movimento por modo (`PRESETS`: chão, água), para as ilhas novas (gelo, planar,
  montaria) acrescentarem o delas sem mexer no controlador.
- Critério: testes do passo puro (aceleração, parada, coyote, buffer, sem pulo de coelho) e o
  percurso nas copas continuando dentro do tempo-alvo.

### 2. Controles: controle físico e ações ✅

- **Gamepad API** (`controles/gamepad.ts`): analógico esquerdo anda, direito gira a câmera, botão
  de baixo pula, o da direita usa, gatilho corre, clique no analógico direito recentraliza. Zona
  morta de 0,15. Lido a cada quadro e escrito no mesmo `Controle` (a ação não sabe de onde veio).
- **Recentralizar a câmera**: tecla C, analógico direito, duplo toque (já existe).
- **Joystick flutuante no celular**: nasce onde o polegar toca na metade esquerda (hoje é fixo).
- Contextos: o jogo já ignora teclas com o foco em campo ou botão e para com painel, menu ou
  ferramenta aberta (`jogoPausado`); o modo Construir, quando vier, ganha o contexto dele.

### 3. Preferências de conforto (requisito, não melhoria) ✅

- No menu: sensibilidade da câmera, inverter o eixo vertical, distância preferida (perto, normal,
  longe), recentralizar sozinha (desligada por padrão) e menos movimento da câmera (além do
  pedido do aparelho). Guardadas no aparelho (como a dica da câmera). O jogo não tem tremor de
  câmera; se um dia tiver, nasce desligável.

### 4. Sala de testes (`/movimento` no playground) ✅

- Rampa, degraus, plataformas a distâncias crescentes, uma parede, uma árvore, um laguinho, com o
  avatar real. Os cinco testes do levantamento: andar e correr com transição, degraus e rampas,
  pular entre plataformas e aterrissar, entrar e sair da água, câmera estável.
- Feita em 28/10/2026 (`playground/movimento.tsx`, `playground/sala-de-movimento.ts`). Achou duas
  coisas: de frente o degrau automático sobe uns 0,43, não 0,45; e ele também vale no ar, então o
  pulo de 1,5 m alcança beirada de uns 1,95 m e vãos mais largos que o pulo puro. As duas viraram
  números em `sistemas/corpo.ts` (`alcanceMaximoDoPulo`, `beiradaMaximaDoPulo`) e a ajuda no ar foi
  para a especificação do modo "agarrar a borda" (parte 6).

### 5. Perfis de câmera ✅

- Um gerenciador de perfis sobre a câmera que já existe: exploração, conversa (já existe), dentro
  de casa (já existe), percurso (mais aberta, antecipando o movimento), construção (alta,
  inclinada) quando o modo Construir chegar. Transição suave de perfil em 0,5 s.
- Feita em 28/10/2026 (`sistemas/perfis-de-camera.ts`): a casa e a conversa saíram do meio da
  câmera para perfis; o percurso abre (pelo menos 11 m e ângulo 0,6) e olha 0,4 s à frente. O "lá
  no alto" continua por cima, então no deque o percurso só antecipa. Construir entra quando vier.

### 6. Modos de movimento separados ✅

- Chão, nado, cipó e escalada saem do `personagem.tsx` para modos com `podeEntrar`, `entrar`,
  `passo` e `sair` (regras puras em `sistemas/`), sem mudar o comportamento (os testes e a
  conferência no navegador de hoje passando iguais). Depois, os quatro modos novos do Bosque, um por
  vez, cada um com a animação dele no Blender.
- Primeira metade feita em 28/10/2026: `sistemas/modos/` (contrato em `tipos.ts`, `chao.ts` com o
  nado, `cipo.ts`, `escalada.ts`, `trocas.ts`), o `personagem.tsx` 366 linhas menor. Conferido
  sem mudança: a sala de testes (velocidades, degraus, rampas, vãos, laguinho) e, no Bosque, o
  mesmo script no arquivo antigo e no novo (escalar até 4,1 m e pular; pegar o cipó, balançar e
  soltar) com o mesmo resultado.
- Os quatro modos novos do Bosque, feitos em 28/10/2026, cada um com a animação dele no
  `locomocao.glb`, a estação dele na sala de testes e o lugar dele no Bosque (detalhes na
  especificação): equilíbrio no tronco caído, escada reta, escorregador e agarrar a borda. Com a
  borda, o degrau automático deixou de valer no ar.

## Regras

- Movimento e física nunca dependem da aparência: roupa, cabelo e acessório só mudam o desenho.
- A assistência nunca disputa o controle com a pessoa: recentralizar sozinha nasce desligada.
- Os números iniciais dos levantamentos são hipóteses (ela mesma avisa); os do jogo ficam em
  `docs/arquipelago-regras.md` com o motivo de cada um.
