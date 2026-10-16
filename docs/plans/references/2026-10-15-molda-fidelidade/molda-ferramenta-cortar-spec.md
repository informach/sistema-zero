# Molda — Ferramenta Cortar (especificação para implementação)

> Fonte: frame `JxSh9` "Molda — Ferramenta Cortar" em `telas.pen`. Medidas, cores e posições lidas do arquivo de design.
> Este documento complementa `molda-ferramenta-pivo-spec.md`. O que é **igual** nas duas telas (top bar, barra lateral, painel direito, projeção isométrica, grade, eixos, painéis flutuantes) está descrito lá, nas seções 3 e 4. Aqui está só o que é **da ferramenta Cortar**.
>
> Marcação usada neste doc:
> - **[DESIGN]** = está desenhado na tela, tem que ficar idêntico.
> - **[REGRA]** = comportamento que a tela não mostra, mas que é necessário para funcionar. Siga, a não ser que o dono do projeto diga outra coisa.

---

## 1. O conceito em uma frase

A criança corta uma peça em duas como se usasse uma faca: **clica em pontos nas bordas (arestas) da peça**, uma linha rosa liga os pontos por cima das faces, e ao apertar **"Cortar"** a peça vira **duas peças separadas**.

Exemplo da tela: a caixa "corpo" (tamanho 6 × 2 × 8) já tem 2 pontos marcados no **meio** de duas arestas opostas do topo. A linha rosa atravessa o topo de um lado ao outro. O mouse está no meio da aresta de baixo da face direita, e uma linha branca mostra por onde o corte continua. Resultado: a caixa vai ser cortada **ao meio em Z** (frente e fundo), virando duas caixas de `6 × 2 × 4`.

---

## 2. Como ativar

**[DESIGN]** Botão "Cortar" na barra lateral: ícone lucide `slice`, atalho **K**. Ativo = fundo azul `#2B5BFF`, ícone e texto brancos, atalho `#FFFFFF33` com letra branca (mesmo estilo de ativo das outras ferramentas).

**[REGRA]**
- Só funciona com **uma peça selecionada** e modo de escolha **"Peça inteira"**. Sem peça selecionada, a barra de dica mostra "Escolha uma peça para cortar" e não há pontos.
- Peça travada (cadeado fechado) ou escondida (olho cortado) não pode ser cortada.
- Trocar de ferramenta ou de peça **descarta** os pontos marcados (igual a "Cancelar").

---

## 3. Fluxo de uso (passo a passo)

```
[Ativar Cortar] → mouse sobre uma aresta → aparece o "Ponto atual" (bolinha branca vazada)
      ↓ clique
[Ponto 1 marcado] (bolinha rosa cheia)
      ↓ mouse em outra aresta → linha BRANCA de prévia do último ponto até o mouse
      ↓ clique
[Ponto 2 marcado] → linha ROSA entre os pontos; contador "2 pontos marcados"; botão Cortar habilitado
      ↓ (opcional) mais cliques continuam a linha pelas outras faces
[Cortar] → a peça vira 2 peças      |      [Cancelar] ou Esc → limpa tudo
```

**[REGRA] Teclado:** `Esc` = Cancelar · `Enter` = Cortar · `Backspace` = desfaz o último ponto · `K` = ativa a ferramenta.

---

## 4. A cena 3D com a ferramenta ativa

Mesma câmera isométrica, grade, eixos, sombra e caixa da tela do Pivô (+X baixo-direita vermelho, +Z baixo-esquerda azul, +Y para cima verde). A peça selecionada continua com o **contorno de seleção amarelo** `#FFC21A` 3px.

### 4.1 Ordem de desenho (de trás para frente) **[DESIGN]**

1. Fundo, grade, eixos, vinheta, sombra (iguais à tela do Pivô)
2. Peça (3 tons: topo `#3F6CF0`, esquerda `#2449C9`, direita `#1A3BA6`)
3. Contorno de seleção amarelo
4. Painéis flutuantes do viewport
5. **Linha de corte** (borda branca + rosa)
6. **Linha de prévia** (branca)
7. **Bolinhas de meio de aresta**
8. **Pontos marcados**
9. **Ponto atual** (sob o mouse)
10. **Cursor faca**
11. **Contador "N pontos marcados"**

> Tudo do item 5 em diante é **overlay**: desenhado por cima da peça, sem teste de profundidade (`depthTest = false`, `renderOrder` alto), com **tamanho fixo em pixels** (não muda com o zoom). As posições vêm da projeção dos pontos 3D na tela.

### 4.2 Bolinhas de "meio da aresta" (alvos de encaixe) **[DESIGN]**

- Círculo **8×8**, fundo branco `#FFFFFF`, borda rosa `#E8336F` **1.5px**
- Uma bolinha no **ponto médio de cada aresta visível** da peça
- **Não aparece** bolinha onde já existe ponto marcado ou o ponto atual (ali o ponto ocupa o lugar)
- Na tela: a caixa tem 9 arestas visíveis → 3 têm pontos (Ponto 1, Ponto 2, Ponto atual) → **6 bolinhas visíveis**:
  - meio da aresta de trás-direita do topo
  - meio da aresta da frente-esquerda do topo
  - meio da aresta de baixo da face esquerda
  - meio das 3 arestas verticais (esquerda, frente, direita)

**[REGRA]** Só aparecem com "Grudar no meio" **ligado**. Desligado, somem.

### 4.3 Pontos marcados **[DESIGN]**

- Círculo **16×16**, fundo rosa **`#E8336F`**, borda branca **3px**
- Sombra: `#0B153340`, offset y=2, blur 6
- Centro do círculo **exatamente** sobre o ponto 3D projetado
- Na tela: **Ponto 1** = meio da aresta de trás-esquerda do topo; **Ponto 2** = meio da aresta da frente-direita do topo (as duas arestas opostas do topo que correm na direção Z)

### 4.4 Linha de corte (entre pontos já marcados) **[DESIGN]**

- Duas linhas sobrepostas no mesmo trajeto:
  - embaixo: branca `#FFFFFF`, **8px**, ponta redonda
  - em cima: rosa **`#E8336F`**, **4px**, ponta redonda
- Resultado: linha rosa com borda branca de 2px de cada lado
- O trajeto **segue a superfície** da peça: de um ponto ao próximo atravessando a face que os dois têm em comum (é uma linha reta na face, não uma linha 3D atravessando o volume)

### 4.5 Linha de prévia (do último ponto até o mouse) **[DESIGN]**

- Branca `#FFFFFF`, **3px**, opacidade **90%**, ponta redonda, sem borda
- Vai do **último ponto marcado** até o **ponto atual**, sobre a face entre eles
- Na tela: desce **reta pela face direita**, do Ponto 2 (meio da aresta de cima) até o ponto atual (meio da aresta de baixo)

### 4.6 Ponto atual (onde o mouse está) **[DESIGN]**

- Círculo **22×22**, **fundo branco** e borda rosa `#E8336F` **3px** (é o "vazado" — o contrário do ponto marcado)
- Sombra: `#0B153340`, offset y=2, blur 6
- Só aparece quando o mouse está sobre (ou perto de) uma aresta da peça selecionada

**[REGRA]** Encaixe na aresta: considerar o mouse "sobre a aresta" se estiver a **≤ 12px de tela** dela. Fora disso, sem ponto atual e sem linha de prévia.

### 4.7 Cursor faca **[DESIGN]**

- Quadrado **34×34**, raio **10**, fundo `#E8336F`, ícone `slice` branco 18×18 centralizado
- Sombra: `#5A0B2A44`, offset y=3, blur 8
- Fica **abaixo e à direita** do ponto atual: canto superior esquerdo = centro do ponto atual + **(14, 8)**
- **[REGRA]** Acompanha o mouse; o cursor nativo do sistema fica escondido sobre o viewport enquanto a ferramenta está ativa.

### 4.8 Contador de pontos **[DESIGN]**

- Pílula **138×28**, raio 8, fundo `#FDE6EE`
- Texto "**2 pontos marcados**" — `#E8336F`, 13px / peso 800, padding 10 / 5
- Fica **acima e à esquerda do Ponto 1**: canto superior esquerdo = centro do Ponto 1 + **(−118, −44)**
- **[REGRA]** Texto: 0 pontos = não aparece · 1 = "1 ponto marcado" · N = "N pontos marcados".

### 4.9 Barra de dica (embaixo, centralizada no viewport) **[DESIGN]**

Pílula escura **642×52**, fundo `#18202F`, raio 14, sombra `#18202F1F` y=4 blur 16. Centralizada horizontalmente no viewport, com a base 68px acima da borda de baixo do viewport (fica acima da legenda de eixos). Itens alinhados ao centro vertical, gap 10, padding 16 / 10:

1. Ícone `slice` 18px rosa `#E8336F`
2. Texto "**Clique nas bordas para marcar o corte**" — branco, 14px / 700
3. Divisor vertical 1×22 `#FFFFFF33`
4. Interruptor "**Grudar no meio**":
   - trilho 34×20, raio 10, fundo `#E8336F` (ligado)
   - bolinha branca 16×16 encostada à **direita** (ligado)
   - texto "Grudar no meio" branco 13px / 700, 8px depois do trilho
   - **[REGRA]** desligado: trilho `#FFFFFF33` e bolinha encostada à esquerda
5. Botão "**Cancelar**" — 32 de altura, raio 8, fundo `#FFFFFF1A`, texto branco 13px / 800, padding 12 / 7
6. Botão "**Cortar**" — 32 de altura, raio 8, fundo **`#E8336F`**, ícone `check` branco 15px + texto "Cortar" branco 13px / 800

**[REGRA]** "Cortar" fica **desabilitado** (opacidade 40%, sem clique) com menos de 2 pontos.

### 4.10 Painel direito

**[DESIGN]** Igual à tela do Pivô, mas **nenhum grupo destacado**: o grupo "Pivô" volta a ser cinza (label `#5A6478`, campos fundo `#F3F5FA`, sem borda). Valores na tela: Posição -5, 0, -5 · Tamanho 6, 2, 8 · Pivô 0, 0, 0 · Giro 0°, 0°, 0°.

---

## 5. Cor da ferramenta

**Rosa `#E8336F` é a cor exclusiva do Cortar** (ícone da dica, interruptor ligado, botão Cortar, pontos, linha de corte, cursor faca, texto do contador; fundo claro `#FDE6EE`). Não confundir com o rosa do botão "Rampa" (`#E5397A`), que é outra coisa. Azul `#2B5BFF` continua sendo "ativo/selecionado" e amarelo `#FFC21A` continua sendo o contorno de seleção.

---

## 6. Lógica (o que precisa ser implementado por baixo)

### 6.1 Onde um ponto pode ser colocado
- Pontos **só existem em arestas** da peça selecionada (nunca no meio de uma face, nunca no vazio).
- **Grudar no meio ligado:** o ponto vai **sempre para o ponto médio** da aresta sob o mouse (é o que a tela mostra).
- **Grudar no meio desligado:** o ponto desliza livre pela aresta (projeção do mouse na aresta), e as bolinhas de meio somem.
- Guardar cada ponto como `{ arestaId, t }` (t de 0 a 1 ao longo da aresta, 0.5 = meio) **em coordenadas locais da peça** — assim girar a câmera não estraga nada.

### 6.2 Do ponto ao plano de corte
O corte é sempre **um plano** que divide a peça em duas.

- **2 pontos** (caso da tela): o plano **passa pelos 2 pontos** e é **perpendicular à face** onde a linha entre eles está.
  - Tela: pontos no meio das arestas X do topo → linha no topo ao longo de X, em z = 0 → plano perpendicular ao topo → **plano z = 0** (corta frente e fundo).
  - Isso explica a prévia branca: o plano continua descendo **reto** pela face direita até o meio da aresta de baixo — exatamente onde o ponto atual está.
- **3 ou mais pontos:** o plano passa pelos **3 primeiros pontos** (permite corte inclinado). Pontos seguintes só são aceitos se estiverem nesse plano (ou seja, a linha só continua "dando a volta" na peça). Se o mouse estiver numa aresta fora do plano, não mostra ponto atual.
- Pontos que não formam um plano válido (iguais ou alinhados numa mesma aresta) são rejeitados.

### 6.3 Desenho da linha rosa e da prévia
Desenhar a interseção do plano com as faces **visíveis**, mas só no trecho já "percorrido" pelos pontos (rosa) e no trecho do último ponto ao mouse (branca). A linha não aparece em faces escondidas atrás da peça.

### 6.4 Executar o corte (botão Cortar / Enter)
1. Dividir a geometria da peça pelo plano → **duas peças fechadas** (com tampa na face cortada, nada oco).
2. As duas novas peças **substituem** a original na lista "Peças", na mesma pasta e posição na lista.
   - Nomes: `nome (1)` e `nome (2)` → ex.: "corpo (1)" e "corpo (2)".
   - Mantêm cor, acabamento, giro, pasta.
   - Pivô de cada uma: "Embaixo" (centro da base) da nova peça.
3. A primeira peça fica selecionada. A ferramenta continua ativa, sem pontos.
4. **Uma única ação de desfazer** (↶) volta para a peça original inteira.
5. Projeto fica "não salvo" até o autosave (igual a qualquer edição).

**Atalho de implementação:** quando a peça é **Caixa** e o plano é **paralelo a uma face** (caso da tela e o mais comum para crianças), não precisa de CSG: basta gerar **duas caixas** com o tamanho dividido naquele eixo e as posições ajustadas. Ex.: caixa 6×2×8 cortada em z=0 → duas caixas 6×2×4, uma em z = −2 e outra em z = +2 (relativo ao centro da original). Para Rampa/Cilindro/Bola ou planos inclinados, usar CSG (ex.: `three-bvh-csg`: interseção com dois meio-espaços grandes, um de cada lado do plano).

### 6.5 Cancelar
Botão "Cancelar", `Esc`, trocar de ferramenta ou de peça → apaga todos os pontos, a linha e o contador. A peça não muda.

---

## 7. Estados que a implementação precisa ter

| Estado               | O que aparece                                                                                   |
|----------------------|-------------------------------------------------------------------------------------------------|
| Sem peça escolhida   | Só a barra de dica, com "Escolha uma peça para cortar"; Cortar desabilitado; sem bolinhas        |
| Peça, 0 pontos       | Bolinhas de meio nas arestas visíveis; ponto atual + cursor faca ao passar numa aresta; sem contador; Cortar desabilitado |
| 1 ponto              | Ponto rosa; prévia branca até o mouse; contador "1 ponto marcado"; Cortar desabilitado          |
| 2+ pontos (a tela)   | Linha rosa entre os pontos; prévia branca; contador "N pontos marcados"; **Cortar habilitado**  |
| Depois de cortar     | Duas peças novas na lista; primeira selecionada; volta ao estado "0 pontos"                      |

---

## 8. Checklist de aceitação

- [ ] **K** ou clique em "Cortar" ativa a ferramenta (botão azul na barra lateral)
- [ ] Bolinhas brancas 8px com borda rosa no meio de cada aresta visível
- [ ] Mouse perto de uma aresta mostra a bolinha branca vazada 22px + o cursor faca rosa 34px ao lado
- [ ] Clique marca ponto rosa 16px com borda branca, no meio da aresta (com "Grudar no meio" ligado)
- [ ] Entre pontos: linha rosa 4px com borda branca, sobre a superfície da peça
- [ ] Do último ponto ao mouse: linha branca 3px, 90% de opacidade
- [ ] Contador "N pontos marcados" em rosa sobre fundo `#FDE6EE`, acima-esquerda do primeiro ponto
- [ ] Barra de dica escura com interruptor "Grudar no meio", "Cancelar" e "Cortar" rosa
- [ ] "Cortar" só funciona com 2+ pontos
- [ ] Com os pontos da tela (meio das arestas opostas do topo), o resultado é **duas caixas 6×2×4** lado a lado em Z, sem buraco, sem a peça mudar de lugar
- [ ] As duas peças aparecem na lista no lugar da original, com cor e acabamento mantidos
- [ ] Um ↶ desfaz o corte inteiro
- [ ] Esc / Cancelar limpa os pontos sem mexer na peça
- [ ] Overlays com tamanho fixo em pixels e sempre por cima da peça
