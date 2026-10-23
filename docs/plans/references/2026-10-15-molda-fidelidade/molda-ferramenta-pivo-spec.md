# Molda — Ferramenta Pivô (especificação para implementação)

> Fonte: frame `x7hrk` "Molda — Ferramenta Pivô" em `telas.pen`. Todas as medidas abaixo foram lidas do arquivo de design, não estimadas.
> Público: criança/iniciante. Toda a ferramenta existe para responder uma pergunta: **"em volta de qual ponto a peça vai girar?"**

---

## 1. O conceito em uma frase

O **pivô** é um ponto 3D preso à peça. Quando a peça gira, ela gira **em volta desse ponto**. Mudar o pivô **não move a peça** — só muda o centro de giro das rotações que vierem depois.

Exemplo da tela: a peça "corpo" (uma caixa) está com o pivô no **canto de baixo da frente**. Se ela girar no eixo Y, esse canto fica parado no chão e o resto da caixa "varre" em volta dele (é o que a prévia roxa mostra).

---

## 2. Modelo de dados

Cada peça guarda:

```ts
type Vec3 = { x: number; y: number; z: number };

interface Peca {
  posicao: Vec3;   // onde a peça está no mundo (origem da peça = centro da base)
  tamanho: Vec3;   // largura (X), altura (Y), profundidade (Z)
  giro: Vec3;      // graus em X, Y, Z
  pivo: Vec3;      // NOVO — offset LOCAL a partir da origem da peça (centro da base)
}
```

- **Origem da peça = centro da face de baixo** (base). Por isso Y=0 é "no chão da peça".
- O pivô é **local**: se a peça se move, o pivô vai junto.
- Os valores da tela batem com isso: tamanho `6 × 2 × 8` → pivô no canto `X = 6/2 = 3`, `Y = 0`, `Z = 8/2 = 4`.

### Presets da barra "Colocar no:"

| Botão     | Valor do pivô (local)                       | Significado               |
|-----------|---------------------------------------------|---------------------------|
| Centro    | `(0, tamanho.y/2, 0)`                       | meio do volume            |
| Embaixo   | `(0, 0, 0)`                                 | centro da base            |
| Canto     | `(+tamanho.x/2, 0, +tamanho.z/2)`           | canto de baixo da frente  |

O botão do preset que coincide com o valor atual fica **ativo** (roxo). Se o usuário arrastar o pivô para um valor que não é nenhum preset, nenhum botão fica ativo.

### Matemática da transformação (o ponto que mais gera bug)

A matriz mundo da peça é:

```
Mundo = T(posicao) · T(pivo) · R(giro) · T(-pivo) · S(tamanho)
```

Ou seja: leva o pivô para a origem, gira, devolve. Com `giro = 0` o pivô não tem efeito visual nenhum.

Em Three.js, o jeito mais simples:

```ts
// grupoPivo fica NO pivô; a malha fica deslocada ao contrário dentro dele
grupoPivo.position.set(posicao.x + pivo.x, posicao.y + pivo.y, posicao.z + pivo.z);
grupoPivo.rotation.set(rad(giro.x), rad(giro.y), rad(giro.z));
malha.position.set(-pivo.x, -pivo.y, -pivo.z);
```

**Regra obrigatória:** ao mudar o pivô de uma peça que **já está girada**, a peça **não pode pular** na tela. Calcule a posição mundo de um vértice antes e depois da troca e compense `posicao` pela diferença (ou recalcule `posicao` para manter a mesma matriz mundo).

---

## 3. Layout da tela (1440 × 900)

```
┌────────────────────────── Top Bar (60px) ──────────────────────────┐
│ ← | car2 ✎ | Salvo | ↶ ↷      [Modelar|Pintar|Animar]   ? Trazer 3D Salvar e exportar ▾ │
├──────┬────────────────────── Viewport (1016×840) ──────────┬─ Painel (320) ─┤
│Tool  │ [Escolher: Peça inteira | Face | Ponto]  [Vista livre ▾][#][Enquadrar] │ Peças         │
│Rail  │                                                      │ Peça escolhida│
│104px │            (cena 3D — ver seção 4)                   │   Posição     │
│      │                                                      │   Tamanho     │
│      │                                                      │   Pivô  ← roxo│
│      │ [X lado Y altura Z frente e fundo] [💡 dica + presets]  [+ −]  │   Giro          │
└──────┴──────────────────────────────────────────────────────┴───────────────┘
```

### 3.1 Barra de ferramentas (esquerda)

Seção "FERRAMENTAS", botões de 84×56, raio 12, ícone 22px em cima + label 13px/800 embaixo, atalho num quadradinho 18×18 no canto superior direito:

| Ferramenta | Ícone (lucide)     | Atalho |
|------------|--------------------|--------|
| Escolher   | `mouse-pointer-2`  | V      |
| Mover      | `move`             | G      |
| Girar      | `rotate-3d`        | R      |
| Tamanho    | `scaling`          | S      |
| **Pivô**   | `crosshair`        | **P**  |
| Cortar     | `slice`            | K      |

Estado **ativo** (Pivô na tela): fundo `#2B5BFF`, ícone e texto brancos, quadradinho do atalho `#FFFFFF33` com letra branca.
Estado normal: sem fundo, ícone/texto `#18202F`, atalho fundo `#EDF0F6` e letra `#5A6478`.

---

## 4. A cena 3D — o que aparece quando a ferramenta Pivô está ativa

Projeção **isométrica** (câmera ortográfica, eixos a 30° da horizontal). Na tela:
- **+X** aponta para **baixo-direita** (vermelho `#F0453A`)
- **+Z** aponta para **baixo-esquerda** (azul `#2B6BFF`)
- **+Y** aponta para **cima** (verde `#2DBE5B`)

A origem do mundo está em (508, 500) no viewport — é o **centro da base da caixa**. As linhas de eixo X e Z do chão cruzam ali (traço 2px, cores com 53% de opacidade: `#F0453A88`, `#2B6BFF88`). A grade do chão é `#C9D3E6`, 1px.

### Ordem de desenho (de trás para frente) — respeitar exatamente

1. Fundo do viewport: gradiente vertical `#FBFCFF` (topo) → `#E9EEF8` (base)
2. Grade do chão
3. Linhas de eixo X e Z
4. Vinheta radial que apaga a grade nas bordas (transparente até 35%, `#F3F6FC` a partir de 75%)
5. Sombra da peça no chão (`#1B2A6030`, blur 18)
6. A peça (caixa) com 3 tons por face: topo `#3F6CF0`, esquerda `#2449C9`, direita `#1A3BA6`
7. Contorno de seleção da peça
8. Painéis flutuantes (modo de escolha, vista, legenda, dica, zoom)
9. **Prévia do giro** (fantasma roxo)
10. **Setas X e Z do pivô** + bolinhas
11. **Marcador do pivô** + etiqueta "Pivô"
12. Etiqueta "Assim ela vai girar"

> O pivô e suas setas ficam **por cima de tudo**, inclusive da peça (sem teste de profundidade / `depthTest = false`, `renderOrder` alto).

### 4.1 Contorno de seleção
Traço `#FFC21A` (amarelo "accent"), **3px**, cantos arredondados (`linejoin: round`). Contorna a silhueta **e** as 3 arestas internas visíveis (as que saem do vértice da frente). Ou seja: wireframe só das arestas visíveis, não da caixa inteira.

### 4.2 Marcador do pivô (o elemento principal)
- Círculo **40×40**, fundo roxo **`#8B3FD9`**, borda branca **3px**
- Ícone `crosshair` branco 22×22 no centro
- Sombra: `#2A0B5555`, offset y=3, blur 10
- **O centro do círculo fica exatamente sobre o ponto do pivô projetado na tela** (na tela: o canto de baixo da frente da caixa, em (508, 599))
- Tamanho **fixo em pixels de tela** (não diminui com zoom) — é um elemento de UI, não um objeto 3D

### 4.3 Etiqueta "Pivô"
Pílula 47×28, fundo `#8B3FD9`, raio 8, texto "Pivô" branco 13px/800. Fica **à direita e um pouco abaixo** do marcador: canto superior esquerdo da etiqueta = centro do marcador + (26, 18).

### 4.4 Setas de arrastar o pivô (só X e Z)
Saem **do centro do pivô**, ao longo dos eixos do chão:
- **Seta X**: vai para baixo-direita (direção +X), comprimento ≈ **106px** de tela (Δ = +92, +53)
- **Seta Z**: vai para baixo-esquerda (direção +Z), mesmo comprimento (Δ = −92, +53)
- Cada seta = linha de **5px** na cor do eixo, ponta arredondada, desenhada **por cima de uma linha branca de 9px** (isso cria a borda branca de 2px de cada lado)
- Na ponta de cada seta: **bolinha 22×22** na cor do eixo, borda branca 3px — é a alça que se arrasta

Não há seta Y no viewport. A altura do pivô (Y) é mudada pelo painel ou pelos presets.

Arrastar a alça X move o pivô só em X local; a alça Z só em Z local. A peça **não se mexe** — só o pivô, as setas e a prévia.

### 4.5 Prévia do giro (fantasma roxo) — "Assim ela vai girar"
É o que torna a ferramenta compreensível para a criança.

- É **a mesma caixa, girada ≈ 28–30° em torno do eixo Y (vertical) que passa pelo pivô**
- Desenhada **só em arestas** (wireframe completo: base, topo e as 4 verticais), sem preencher
- Traço `#8B3FD9`, **2px**, opacidade **55%**, `linejoin: round`
- O canto onde está o pivô **coincide** com o canto da peça real (ele não se move — é essa a prova visual de que "ela gira em volta do pivô"); o resto da caixa aparece deslocado em volta dele
- Atualiza ao vivo sempre que o pivô muda

Etiqueta da prévia: pílula 155×28, fundo `#F2EAFC`, raio 8, ícone `rotate-ccw` 14px + texto "Assim ela vai girar" 13px/800, ambos `#8B3FD9`. Fica ancorada **acima e à esquerda do topo do fantasma**, perto do vértice mais alto dele.

### 4.6 Barra de dica (embaixo, centralizada no viewport)
Pílula escura 550×50, fundo `#18202F`, raio 14, sombra `#18202F1F` y=4 blur 16. Da esquerda para a direita, alinhado ao centro vertical, padding 16/10:
1. Ícone `lightbulb` 18px amarelo `#FFC21A`
2. Texto "A peça gira em volta do pivô" — branco, 14px/700
3. Divisor vertical 1×22 `#FFFFFF33`
4. Texto "Colocar no:" — `#AEB6C6`, 13px/700
5. Três botões 30px de altura, raio 8, texto branco 13px/800, padding horizontal 10:
   - **Centro** — inativo: fundo `#FFFFFF1A`
   - **Embaixo** — inativo: fundo `#FFFFFF1A`
   - **Canto** — **ativo**: fundo `#8B3FD9`

### 4.7 Outros painéis do viewport (já existentes nas outras ferramentas)
- Canto sup. esquerdo: "Escolher: [Peça inteira] [Face] [Ponto]" — "Peça inteira" ativo (fundo `#18202F`, texto branco)
- Canto sup. direito: [Vista livre ▾] [grade] [Enquadrar (fundo amarelo)]
- Canto inf. esquerdo: legenda dos eixos — quadradinho colorido com a letra + "lado" (X), "altura" (Y), "frente e fundo" (Z)
- Canto inf. direito: zoom + / −

---

## 5. Painel direito — seção "Peça escolhida"

Quatro grupos iguais (label 12px/800 + linha de 3 campos 92×38, gap 6, raio 9). Cada campo: quadradinho do eixo 20×20 (cor do eixo, letra branca 11px/900) + valor 15px/800.

| Grupo    | Label                                     | Estilo dos campos                                     | Valores na tela |
|----------|-------------------------------------------|-------------------------------------------------------|-----------------|
| Posição  | "Posição" (`#5A6478`)                     | fundo `#F3F5FA`                                       | -5, 0, -5       |
| Tamanho  | "Tamanho" (`#5A6478`)                     | fundo `#F3F5FA`                                       | 6, 2, 8         |
| **Pivô** | **"Pivô · o ponto onde a peça gira"** (`#8B3FD9`) | **fundo `#F2EAFC` + borda `#8B3FD9` 1.5px**   | **3, 0, 4**     |
| Giro     | "Giro" (`#5A6478`)                        | fundo `#F3F5FA`                                       | 0°, 0°, 0°      |

O grupo **Pivô** só aparece destacado em roxo quando a ferramenta Pivô está ativa (é o grupo "em foco"). Editar esses campos move o marcador no viewport ao vivo, e vice-versa.

---

## 6. Cor da ferramenta

**Roxo `#8B3FD9` é a cor exclusiva do pivô.** Tudo que é "pivô" usa roxo: marcador, etiqueta, preset ativo, fantasma da prévia, label e borda dos campos no painel, fundo claro `#F2EAFC`. Nada mais na tela usa roxo (exceto o ícone "Apoio" da seção Adicionar, que é outra coisa). Azul `#2B5BFF` continua sendo a cor de "seleção/ativo" geral (botão da ferramenta, peça selecionada na lista).

---

## 7. Checklist de aceitação

- [ ] Apertar **P** ou clicar em "Pivô" ativa a ferramenta (botão azul na barra lateral)
- [ ] Marcador roxo 40px aparece **exatamente** sobre o ponto do pivô, por cima da peça
- [ ] Só setas **X (vermelha, baixo-direita)** e **Z (azul, baixo-esquerda)** saindo do pivô, com borda branca e bolinha na ponta
- [ ] Arrastar uma alça move o pivô **só naquele eixo** e **a peça não se mexe**
- [ ] Fantasma roxo 55% mostra a caixa girada ~30° em Y em volta do pivô, com o canto do pivô parado
- [ ] Etiquetas "Pivô" e "Assim ela vai girar" posicionadas como descrito
- [ ] Barra escura de dica com presets Centro / Embaixo / Canto; o preset ativo fica roxo
- [ ] Clicar num preset muda o pivô, os campos do painel e a prévia na hora
- [ ] Campos "Pivô" do painel destacados em roxo e sincronizados com o viewport
- [ ] Mudar o pivô de uma peça já girada **não faz a peça pular**
- [ ] Depois, usando a ferramenta Girar, a peça gira em volta do pivô definido
