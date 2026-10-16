# Molda — Modo Animar (especificação para implementação)

> Fonte: frame `LmWoz` "Molda — Animar (proposta)" em `telas.pen`. Medidas, cores e posições lidas do arquivo de design.
> O que é **igual** às outras telas (top bar, estilo da barra lateral, projeção isométrica, grade, eixos, painéis flutuantes) está descrito em `molda-ferramenta-pivo-spec.md`, seções 3 e 4. Aqui está só o que é do **modo Animar**.
>
> Marcação usada neste doc:
> - **[DESIGN]** = está desenhado na tela, tem que ficar idêntico.
> - **[REGRA]** = comportamento que a tela não mostra, mas que é necessário para funcionar.
> - **[NOVO]** = pedido depois do design (não está desenhado). É obrigatório e está especificado aqui em detalhe: **timeline com altura ajustável arrastando** (seção 7).

---

## 1. O conceito em uma frase

A criança faz a peça se mexer guardando **poses** no tempo: arrasta a agulha até um momento, mexe a peça e aperta **"Marcar pose"**. Entre uma pose e outra, o Molda faz o movimento sozinho. Um conjunto de poses com nome e duração é um **Movimento** (ex.: "Pular", 2 s).

Exemplo da tela: o movimento **"Pular"** (2 s) está aberto, a agulha está em **0,5 s**, e a peça "corpo" está **no alto** (pose de Mover em 0,5 s). O contorno cinza no chão é a **pose anterior** (0 s), para a criança comparar.

---

## 2. Vocabulário (use estes nomes no código e na interface)

| Na interface      | No código (sugestão) | O que é                                                                     |
|-------------------|----------------------|-----------------------------------------------------------------------------|
| Movimento         | `Clip`               | animação com nome, duração e flag "repetir" (ex.: Pular 2 s)                 |
| Pose              | `Keyframe`           | valor guardado num tempo, num canal de uma peça                             |
| Canal             | `Track`              | **Mover** (posição), **Girar** (giro) ou **Tamanho** (escala) de uma peça   |
| Jeito             | `Easing`             | como a peça chega na pose: **Suave**, **Reto**, **De uma vez**               |
| Agulha            | `Playhead`           | o tempo atual                                                               |
| Marcar sozinho    | `AutoKey`            | quando ligado, mexer a peça já grava a pose sem apertar o botão              |

### Modelo de dados

```ts
type Canal = "mover" | "girar" | "tamanho";
type Jeito = "suave" | "reto" | "deUmaVez";   // ease-in-out | linear | step (constante até a próxima pose)

interface Pose   { tempo: number; valor: Vec3; jeito: Jeito }  // tempo em segundos
interface Faixa  { pecaId: string; canal: Canal; poses: Pose[] } // poses ordenadas por tempo
interface Movimento {
  id: string; nome: string;
  duracao: number;      // segundos
  repetir: boolean;
  faixas: Faixa[];
}
```

**[REGRA]** O "jeito" de uma pose define como a peça **chega** nela (interpola da pose anterior até esta). Antes da primeira pose, vale a primeira; depois da última, vale a última.

---

## 3. Layout da tela (1440 × 900)

```
┌──────────────────────────── Top Bar (60) — modo "Animar" ativo ────────────────────────────┐
├──────┬──────────────────── Centro (1016 × 840, vertical) ───────────────┬── Painel (320) ──┤
│ Tool │  Viewport 3D                    (1016 × 534 no design)           │ Movimentos (244) │
│ Rail │                                                                  │                  │
│ 104  │                                                                  │ Peças (240)      │
│      ├═══════════ borda arrastável [NOVO] ══════════════════════════════┤                  │
│      │  Linha do tempo                 (1016 × 306 no design)           │ Pose escolhida   │
│      │                                                                  │ (205)            │
└──────┴──────────────────────────────────────────────────────────────────┴──────────────────┘
```

- **[DESIGN]** A coluna **Centro** é vertical: **Viewport em cima** e **Linha do tempo embaixo**, sem espaço entre os dois. A linha do tempo tem fundo branco `#FFFFFF` e borda superior 1px `#E2E7F0`.
- **[DESIGN]** O painel direito (320) ocupa **a altura toda** e **não** é afetado pela linha do tempo.
- **[NOVO]** A divisão entre Viewport e Linha do tempo **é arrastável** (seção 7).

### 3.1 Top bar
**[DESIGN]** Igual às outras telas, mas no seletor de modos o **Animar** está ativo: fundo `#2B5BFF`, ícone `clapperboard` e texto brancos. Modelar e Pintar sem fundo, ícone e texto `#5A6478`.

### 3.2 Barra lateral (104)
**[DESIGN]** No modo Animar só existem **5 ferramentas** (não tem "Cortar" nem a seção "ADICIONAR"):

| Ferramenta | Ícone             | Atalho |
|------------|-------------------|--------|
| Escolher   | `mouse-pointer-2` | V      |
| **Mover**  | `move`            | G      |
| Girar      | `rotate-3d`       | R      |
| Tamanho    | `scaling`         | S      |
| Pivô       | `crosshair`       | P      |

Na tela, **Mover** está ativo (fundo `#2B5BFF`, ícone/texto brancos, atalho `#FFFFFF33`).

---

## 4. Viewport (no modo Animar)

Mesma cena isométrica das outras telas (grade, eixos, vinheta, sombra, peça com 3 tons, contorno de seleção amarelo `#FFC21A` 3px).

### 4.1 A peça mostra a pose do tempo atual **[DESIGN]**
A peça é desenhada **no estado interpolado do tempo da agulha**. Na tela (0,5 s) a caixa está **66px acima** de onde estava em 0 s (é o pulo). A **sombra continua no chão** (não sobe com a peça).

### 4.2 Fantasma da pose anterior **[DESIGN]**
- Contorno da peça **na pose anterior** (a última pose antes da agulha, no canal escolhido — na tela, a pose de 0 s, no chão)
- Só arestas visíveis (mesmo desenho do contorno de seleção), traço `#7B86A0`, **2px**, opacidade **60%**
- Desenhado **depois da sombra e antes da peça** (fica por trás da peça)
- Ligado/desligado pelo interruptor "Ver pose anterior" (4.4)

### 4.3 Setas da ferramenta Mover **[DESIGN]**
Saem do **centro da face de cima** da peça (na tela: (508, 192) no viewport):
- **X**: baixo-direita, Δ = (+151, +87) → ~175px · vermelho `#F0453A`
- **Z**: baixo-esquerda, Δ = (−151, +87) → ~175px · azul `#2B6BFF`
- **Y**: para cima, Δ = (0, −129) · verde `#2DBE5B`
- Cada seta: linha **5px** na cor do eixo por cima de linha **branca 9px**, ponta redonda
- Alça na ponta: círculo **24×24** na cor do eixo, borda branca 3px, sombra `#0B153333` y=2 blur 6
- Centro: círculo **16×16** branco com borda `#18202F` 2px (arrastar o centro = mover livre no chão)
- Overlay: sempre por cima da peça, tamanho fixo em pixels

**[REGRA]** Com "Marcar sozinho" **desligado**, mexer a peça muda só a prévia; a pose só é gravada ao apertar "Marcar pose". Mudar o tempo sem marcar **descarta** a mudança (a peça volta para a pose interpolada). Com "Marcar sozinho" **ligado**, soltar a alça já grava a pose no tempo da agulha.

### 4.4 Painéis flutuantes do viewport **[DESIGN]**
Todos: fundo branco, sombra `#18202F1F` y=4 blur 16, **16px** de margem da borda do viewport.

| Painel            | Canto       | Conteúdo                                                                                                                         |
|-------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------|
| Ver pose anterior | sup. esq.   | 206×36, raio 12, padding 8/12, gap 8: ícone `ghost` 17px `#7B86A0` + "Ver pose anterior" 14/800 + interruptor 34×20 **ligado** (`#2B5BFF`, bolinha branca 16 à direita) |
| Vista             | sup. dir.   | igual às outras telas (Vista livre ▾, grade, Enquadrar)                                                                          |
| Legenda eixos     | inf. esq.   | igual às outras telas                                                                                                            |
| Dica              | inf. centro | 500×48, fundo `#18202F`, raio 14, padding 10/10/10/16, gap 10: `lightbulb` 18px `#FFC21A` + "Mexa a peça e aperte Marcar pose para guardar esse momento" branco 14/700 + botão fechar 28×28 (ícone `x` 16px `#AEB6C6`) |
| Zoom              | inf. dir.   | igual às outras telas                                                                                                            |

**[REGRA]** Os painéis de baixo (Legenda, Dica, Zoom) ficam **presos à borda de baixo do viewport**, então **sobem e descem junto** quando a timeline muda de altura (seção 7). A Dica, depois de fechada, não volta mais (guardar no `localStorage`).

---

## 5. Linha do tempo

Altura no design: **306** = Controles (60) + Régua (30) + 6 linhas de 36. Largura 1016.

### 5.1 Grade horizontal (vale para Régua e todas as linhas) **[DESIGN]**
```
|← coluna de nomes 180 →|← faixa 812 →|← 24 →|
```
- Na faixa, **0 s está em x = 14** e o fim da duração em **x = 798** → `x = 14 + (tempo / duracao) × 784`
- Na tela (duração 2 s): **392 px por segundo**
- **[REGRA]** A faixa sempre mostra a duração inteira do movimento (0 s → duração). Se a área ficar mais larga, a escala aumenta.

### 5.2 Controles (altura 60, borda inferior 1px `#E2E7F0`, padding horizontal 16, gap 10, centralizado na vertical) **[DESIGN]**
Da esquerda para a direita:
1. **Ir ao começo** — 36×36, raio 10, fundo `#F3F5FA`, ícone `skip-back` 18px
2. **Tocar** — círculo 44×44, fundo `#2B5BFF`, ícone `play` branco 20px, sombra `#2B5BFF55` y=3 blur 8 · **[REGRA]** tocando, vira ícone `pause`
3. **Ir ao final** — 36×36, igual ao 1, ícone `skip-forward`
4. **Tempo** — "0,5 s" `#18202F` **20/900** + "de 2 s" `#5A6478` 13/700, gap 4 · **[REGRA]** vírgula decimal, 1 casa
5. **Repetir** (ligado) — fundo `#E8EEFF`, raio 10, padding 8/12, ícone `repeat` 16px + "Repetir" 13/800, ambos `#2B5BFF` · **[REGRA]** desligado: fundo `#F3F5FA`, ícone/texto `#5A6478`
6. *(espaço flexível)*
7. **Marcar sozinho** — borda 1px `#E2E7F0`, raio 10, padding 8/12, gap 8: bolinha vermelha 10×10 `#E5392E` + "Marcar sozinho" 13/700 + interruptor 34×20 **desligado** (trilho `#D5DAE4`, bolinha branca à esquerda)
8. **Marcar pose** — fundo amarelo `#FFC21A`, raio 12, padding 10/16, gap 8: ícone `diamond-plus` 18px + "Marcar pose" **15/900**, ambos `#18202F`

### 5.3 Régua (altura 30) **[DESIGN]**
- Coluna de nomes: chip "**Duração 2 s**" — fundo `#F3F5FA`, raio 7, padding 3/8, gap 4: ícone `timer` 13px + texto 12/800 + `chevron-down` 12px, tudo `#5A6478`. Abre um menu para trocar a duração **[REGRA: 1 s, 1,5 s, 2 s, 3 s, 5 s]**.
- Faixa: a cada **0,5 s** traço 1×12 `#B9C1D0` (de y=18 a 30) com rótulo 11/700 `#5A6478` **5px à direita** do traço ("0 s", "0,5 s", "1 s", "1,5 s"); o **último** rótulo ("2 s") fica **à esquerda** do traço para não sair da área. A cada **0,25 s** traço curto 1×7 (de y=23 a 30).
- **[REGRA]** Clicar ou arrastar na régua move a agulha.

### 5.4 Linhas (altura 36 cada) **[DESIGN]**

Hierarquia: **peça** → (se aberta) seus **canais**.

**Linha de peça** (ex.: "corpo", "roda da frente", "roda de trás"):
- Nomes: padding esquerdo 16, gap 8: chevron 14px `#5A6478` (`chevron-down` aberta / `chevron-right` fechada) + ícone do tipo 16px + nome 14px
- Peça escolhida ("corpo"): **fundo da linha toda `#F3F5FA`**, ícone `#2B5BFF`, nome 14/**800**. Outras: ícone `#5A6478`, nome 14/700.
- Faixa: **resumo** — um losango **10×10** cinza `#9AA3B2` com borda branca 1.5 em **cada tempo que tem pose em qualquer canal** dessa peça (corpo: 0 · 0,4 · 0,5 · 0,6 · 1 s; roda da frente: 0 · 1 · 2 s; roda de trás: nenhum)

**Linha de canal** (só aparece com a peça aberta):
- Nomes: padding esquerdo **44**, ícone 15px na cor do canal + nome 13/700 `#18202F`

| Canal   | Ícone       | Cor       | Poses na tela      |
|---------|-------------|-----------|--------------------|
| Mover   | `move`      | `#2B5BFF` | 0 · **0,5** · 1 s  |
| Girar   | `rotate-3d` | `#F07A1A` | 0 · 1 s            |
| Tamanho | `scaling`   | `#1E9E5A` | 0 · 0,4 · 0,6 s    |

- **Pose**: losango (quadrado girado 45°) **14×14** na cor do canal, borda branca 1.5, centrado no tempo e na linha (y = 18)
- **Pose escolhida**: losango **18×18**, mesma cor, borda **`#18202F` 2.5** (na tela: Mover em 0,5 s)
- **Ligação**: linha **2px** na cor do canal com **33% de opacidade** (`#2B5BFF55`, `#F07A1A55`, `#1E9E5A55`) ligando cada pose à próxima, na altura do centro dos losangos, **por trás** deles

### 5.5 Agulha **[DESIGN]**
- Linha vertical **2px** `#2B5BFF`, centrada no tempo atual
- Cabeça: retângulo **14×18**, raio 4, `#2B5BFF`, centrado na linha, encostado no topo da régua (+2px)
- Começa no topo da régua e vai **até o fim da última linha visível** (no mock ela para 36px antes, no fim de "roda da frente" — **isso é erro do mock; deve ir até embaixo**)
- Por cima de tudo na timeline
- **[REGRA]** Arrastável pela cabeça ou pela linha. Gruda nas poses quando estiver a ≤ 6px de uma.

### 5.6 Interações da timeline **[REGRA]**
- Clicar num losango = escolher a pose (atualiza o painel "Pose escolhida" e leva a agulha até ela)
- Arrastar um losango = mudar o tempo da pose (gruda a cada 0,05 s; não passa por cima de outra pose do mesmo canal)
- `Delete` / `Backspace` com pose escolhida = apagar a pose
- Clicar no chevron = abrir/fechar a peça
- Clicar no nome de uma peça = escolher a peça (sincroniza com a lista "Peças" e com o viewport)
- `Espaço` = tocar/pausar · `Home` / `End` = ir ao começo/final · `←` / `→` = 0,05 s para trás/frente

---

## 6. Painel direito

### 6.1 Movimentos (altura 244, padding 16, gap 10, borda inferior) **[DESIGN]**
- Cabeçalho: "Movimentos" 15/800 + botão "**Novo**" (fundo `#E8EEFF`, raio 8, ícone `plus` 14px + "Novo" 12/800, `#2B5BFF`)
- Lista (linhas 40px, raio 9, padding 0/10, gap 10):
  - **Pular** (escolhido): fundo `#E8EEFF`, borda `#2B5BFF` 1.5, ícone `circle-play` 18px, nome 14/800 e "Mais" (`ellipsis`) em `#2B5BFF`, duração "2 s" 12/700 `#5A6478`
  - **Andar** · 1 s e **Girar rodas** · 1,5 s: ícone `clapperboard` `#5A6478`, nome 14/800 `#18202F`, ícone `repeat` 13px `#9AA3B2` logo depois do nome (= movimento com Repetir ligado)
- Botão "**Usar um movimento pronto**": 288×40, raio 10, fundo `#FFF4D1`, ícone `sparkles` 16px `#B07800` + texto 13/800 `#8A5E00`, centralizado

### 6.2 Peças (altura 240) **[DESIGN]**
Mesma lista das outras telas, mas **sem** olho/cadeado; no lugar, um selo de poses à direita (66×19, raio 6, padding 2/7, gap 4: losango 8×8 + "N poses" 11/800):
- Peça escolhida ("corpo"): selo fundo **branco**, losango e texto `#2B5BFF` → "8 poses"
- Outras com poses ("roda da frente"): selo fundo `#F3F5FA`, losango `#9AA3B2`, texto `#5A6478` → "3 poses"
- Sem poses: sem selo

**[REGRA]** "N poses" = total de poses de todos os canais dessa peça no movimento aberto (corpo: 3 + 2 + 3 = 8).

### 6.3 Pose escolhida (padding 16, gap 12) **[DESIGN]**
- Cabeçalho: losango 16×16 `#2B5BFF` com borda `#18202F` 2 + "**Pose em 0,5 s**" 15/800 + chip à direita (fundo `#E8EEFF`, raio 6, ícone do canal 12px + "Mover · corpo" 11/800 `#2B5BFF`)
- Pergunta: "Como a peça chega nessa pose?" 12/800 `#5A6478`
- 3 opções lado a lado, 92×64 cada, raio 10, ícone 20px em cima + texto 12/800:
  - **Suave** (`spline`) — escolhido: fundo `#E8EEFF`, borda `#2B5BFF` 1.5, ícone e texto `#2B5BFF`
  - **Reto** (`trending-up`) e **De uma vez** (`zap`) — fundo `#F3F5FA`, ícone e texto `#18202F`
- Ações (2 botões de 141×36, raio 9, fundo `#F3F5FA`, ícone 15px + texto 13/800): "**Copiar pose**" (`copy`, `#18202F`) e "**Apagar pose**" (`trash-2`, `#D93A30`)
- **[REGRA]** A cor do losango e do chip segue o canal da pose (azul Mover, laranja Girar, verde Tamanho). Sem pose escolhida, a seção mostra "Escolha uma pose na linha do tempo" em `#5A6478`.

---

## 7. [NOVO] Linha do tempo com altura ajustável (arrastar para aumentar)

**Objetivo:** a criança (ou o professor) pode **arrastar a borda de cima da linha do tempo para cima** e ver mais linhas (mais peças e canais) ao mesmo tempo, ou arrastar para baixo para ganhar mais espaço no 3D.

### 7.1 Onde fica a alça
```
            Viewport
──────────────────────────────────────  ← borda de cima da Linha do tempo (1px #E2E7F0)
                ▬▬▬▬                    ← pegador (só aparece no hover / arrasto)
  [⏮] (▶) [⏭]  0,5 s de 2 s   ...      ← Controles
```

- **Área de pegar:** faixa invisível de **8px** de altura sobre a borda de cima da linha do tempo (4px para dentro do viewport + 4px para dentro da timeline), **largura total** (1016). Fica por cima de tudo, inclusive do canvas 3D.
- **Cursor:** `row-resize` (↕) ao passar por cima.
- **Pegador visual:** pílula **36×4**, raio 2, centralizada na horizontal, **6px abaixo da borda** (dentro dos Controles, no espaço vazio acima dos botões).
  - Normal: não aparece.
  - Mouse em cima da área: aparece em `#B9C1D0`.
  - Arrastando: pílula `#2B5BFF` **e** a borda de cima vira **2px `#2B5BFF`**.
- **Não** muda o desenho do resto da tela: sem alça visível, tudo fica exatamente como no design.

### 7.2 Limites de altura
| Situação                      | Altura da linha do tempo                                                    |
|-------------------------------|-----------------------------------------------------------------------------|
| Padrão (primeira vez)         | **306** (igual ao design)                                                   |
| Mínimo                        | **162** = Controles 60 + Régua 30 + 2 linhas de 36                          |
| Máximo                        | altura da coluna Centro **− 240** (o viewport nunca fica menor que 240px)   |
| Recolhida                     | **60** (só a barra de Controles)                                            |

- Arrastar **abaixo de 120px** → solta e **recolhe** para 60 (só Controles). Entre 120 e 162 → para em 162.
- Recolhida: o pegador continua funcionando; arrastar para cima abre de novo.
- **Duplo clique** na alça: se estiver recolhida ou diferente do padrão → volta para **306**; se já estiver em 306 → recolhe para 60.
- Se a janela diminuir e a altura salva passar do máximo, usar o máximo (sem quebrar o layout).

### 7.3 O que acontece com o conteúdo
**Linha do tempo:**
- **Controles** (60) e **Régua** (30) ficam **fixos no topo**. Só a área das **linhas** cresce/encolhe.
- Se as linhas não cabem: **rolagem vertical** só na área das linhas; **coluna de nomes e faixas rolam juntas** (nunca desalinhar nome e faixa).
- Se sobra espaço: as linhas ficam no topo e o resto fica vazio (fundo branco). Nada estica.
- A **agulha** vai sempre do topo da régua até **embaixo da área visível das linhas**, em qualquer altura.

**Viewport:**
- Diminui/aumenta na mesma medida (Viewport + Linha do tempo = altura do Centro, sempre).
- O canvas 3D precisa ser **redimensionado de verdade**: atualizar o tamanho do renderer e o aspecto/frustum da câmera (ex.: `ResizeObserver` no container do viewport). A peça **não pode esticar nem achatar**.
- A cena continua centrada no novo espaço (não precisa reenquadrar sozinho; o botão "Enquadrar" faz isso).
- Painéis de cima (Ver pose anterior, Vista) não se mexem. Painéis de baixo (Legenda eixos, Dica, Zoom) continuam a **16px da borda de baixo do viewport**, ou seja, sobem junto com a timeline.
- **[REGRA]** Se o viewport ficar baixo demais para a Dica (< 300px), esconder a Dica temporariamente.

### 7.4 Comportamento do arrasto
- Começa no `pointerdown` na área de pegar (usar `setPointerCapture` para não perder o arrasto se o mouse sair).
- Durante o arrasto: `altura = alturaInicial − (yAtual − yInicial)`, limitada pelos mínimos/máximos da 7.2. Atualizar com `requestAnimationFrame` (no máximo 1 vez por quadro).
- Durante o arrasto: **não** selecionar texto, **não** girar a câmera, **não** mover a agulha (o evento não pode vazar para o canvas nem para a timeline).
- No `pointerup`: aplicar a regra de recolher (7.2) e **salvar a altura** (`localStorage`, chave por exemplo `molda.timelineAltura`). Na próxima vez que abrir o modo Animar, usar a altura salva.
- Teclado (acessibilidade): a alça pode receber foco (`role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow` = altura); `↑` / `↓` mudam 36px (uma linha); `Enter` = mesmo que duplo clique.
- Desfazer/refazer (↶ ↷) **não** registra mudança de altura (é preferência de tela, não edição do projeto).

### 7.5 Exemplo de implementação (React, só para referência)
```tsx
const PADRAO = 306, MIN = 162, RECOLHIDA = 60, LIMITE_RECOLHER = 120, VIEWPORT_MIN = 240;

const [altura, setAltura] = useState(() => Number(localStorage.getItem("molda.timelineAltura")) || PADRAO);

function limitar(h: number, alturaCentro: number) {
  const max = alturaCentro - VIEWPORT_MIN;
  if (h < LIMITE_RECOLHER) return RECOLHIDA;
  return Math.min(Math.max(h, MIN), max);
}

function onPointerDown(e: React.PointerEvent) {
  e.preventDefault(); e.stopPropagation();
  (e.target as Element).setPointerCapture(e.pointerId);
  const y0 = e.clientY, h0 = altura, alturaCentro = centroRef.current!.clientHeight;
  let raf = 0, h = h0;
  const move = (ev: PointerEvent) => {
    h = h0 - (ev.clientY - y0);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => setAltura(Math.min(Math.max(h, RECOLHIDA), alturaCentro - VIEWPORT_MIN)));
  };
  const up = () => {
    const final = limitar(h, alturaCentro);
    setAltura(final);
    localStorage.setItem("molda.timelineAltura", String(final));
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

// Layout: <div className="centro" style={{display:"flex", flexDirection:"column"}}>
//           <Viewport style={{flex: 1, minHeight: VIEWPORT_MIN}} />        // ResizeObserver → renderer.setSize + camera update
//           <Timeline style={{height: altura, flexShrink: 0}}>
//             <Alca onPointerDown={onPointerDown} onDoubleClick={...} />   // absolute, top: -4, height: 8, width: 100%
//             <Controles /> <Regua />                                     // fixos
//             <Linhas style={{flex: 1, overflowY: "auto"}} />            // nomes + faixas no MESMO container de rolagem
//           </Timeline>
//         </div>
```

### 7.6 Checklist da altura ajustável
- [ ] Na primeira vez, a tela fica **idêntica ao design** (timeline 306, sem pegador visível)
- [ ] Mouse na borda de cima da timeline → cursor ↕ e pegador cinza 36×4
- [ ] Arrastar para cima aumenta a timeline e diminui o 3D na mesma medida, sem travar
- [ ] O 3D nunca fica menor que 240px; a timeline nunca fica menor que 162 (a não ser recolhida em 60)
- [ ] Soltar abaixo de 120 recolhe para só os Controles; arrastar de novo reabre
- [ ] Duplo clique alterna entre 306 e recolhida
- [ ] Controles e Régua não rolam; nomes e faixas rolam juntos e sempre alinhados
- [ ] A agulha vai sempre até o fim da área visível
- [ ] A peça no 3D não estica nem achata ao redimensionar
- [ ] Legenda, Dica e Zoom continuam a 16px do fundo do viewport
- [ ] Arrastar a alça não gira a câmera, não move a agulha, não seleciona texto
- [ ] Fechar e abrir de novo o modo Animar mantém a altura escolhida

---

## 8. Cores do modo Animar

| Uso                                   | Cor                         |
|---------------------------------------|-----------------------------|
| Canal Mover / ativo / agulha          | `#2B5BFF` (claro `#E8EEFF`) |
| Canal Girar                           | `#F07A1A`                   |
| Canal Tamanho                         | `#1E9E5A`                   |
| Pose no resumo da peça / inativo      | `#9AA3B2`                   |
| Fantasma da pose anterior             | `#7B86A0` a 60%             |
| Botão Marcar pose                     | `#FFC21A`                   |
| Gravação (Marcar sozinho)             | `#E5392E`                   |
| Movimento pronto                      | `#FFF4D1` / `#B07800` / `#8A5E00` |

---

## 9. Checklist geral de aceitação

- [ ] Modo "Animar" ativo no topo; barra lateral só com Escolher, Mover, Girar, Tamanho, Pivô
- [ ] A peça no 3D mostra a pose interpolada do tempo da agulha; a sombra fica no chão
- [ ] "Ver pose anterior" ligado mostra o contorno cinza 60% da pose anterior, por trás da peça
- [ ] Setas X/Y/Z com alças de 24px saindo do centro do topo da peça
- [ ] Timeline: Controles 60 + Régua 30 + linhas de 36; coluna de nomes 180; 0 s em x=14 e fim em x=798 da faixa
- [ ] Losangos: resumo cinza 10px na linha da peça; 14px na cor do canal; escolhido 18px com borda escura
- [ ] Ligações de 2px a 33% entre poses do mesmo canal
- [ ] Agulha azul 2px com cabeça 14×18, do topo da régua até embaixo
- [ ] "Marcar pose" grava a pose no tempo da agulha; "Marcar sozinho" grava ao soltar a alça
- [ ] Suave / Reto / De uma vez mudam a interpolação de verdade (ease-in-out / linear / degrau)
- [ ] Tocar, pausar, ir ao começo/final, Repetir funcionando
- [ ] Selo "N poses" na lista de peças com a contagem certa
- [ ] **Timeline com altura ajustável (seção 7)**
