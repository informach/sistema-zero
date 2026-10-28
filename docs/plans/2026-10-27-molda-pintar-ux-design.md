# Molda: aba Pintar, layout e pele (27/10/2026)

Ajuste de aparência e funcionalidade da aba **Pintar** da oficina 3D, para crianças de 9+.
Desenho aprovado com o responsável em 27/10/2026. Plano de execução:
[`2026-10-27-molda-pintar-ux-implementacao.md`](./2026-10-27-molda-pintar-ux-implementacao.md).

## Diagnóstico (playground, 1440 e 1024 px, três níveis)

1. A cor mora longe do pincel: ferramentas na coluna da esquerda, paleta no fim do painel da
   direita. O olho e o mouse atravessam a tela inteira a cada troca de cor, a ação mais frequente.
2. A coluna da esquerda mistura ferramenta, tamanho, espelho e, no fim, "Criar textura" e
   "Importar textura" desligados em cinza com um texto espremido: parece quebrado.
3. Ruído: o quadro "Ferramentas que vêm por aí", as letras de atalho em todo ladrilho, a legenda
   "1 px" sob o "1 2 3".
4. O tamanho do traço é abstrato: "1 2 3" não mostra a espessura.
5. "Pintar em: Todas as peças / Só a escolhida" flutua no palco com palavras que a criança
   precisa decifrar.
6. O toast ("Importei 1 projeto!") cai em cima da pílula de dica no pé do palco.
7. Em 1024 px: "Toque numa peça para pi…" cortado, coluna esquerda apertada, sobra branca à
   direita.
8. Amostras pequenas (~32 px) e a "Usadas agora" num tamanho diferente das outras.

Foco escolhido: cor perto do pincel, limpar o ruído, mais visual. Layout escolhido entre três
(barra no palco, estojo na esquerda, tudo na direita): **barra de cores no palco**, o arranjo do
Tux Paint (ferramentas à esquerda, cores embaixo).

## 1. Três zonas

- **Esquerda: o que a mão faz.** Ferramenta e o jeito dela (tamanho, modo da borracha, alcance
  do balde, espelho, só nesta peça).
- **Pé da área central: a tinta.** A barra de cores.
- **Direita: onde e com quê.** Peças, a peça escolhida, textura, opções avançadas.

## 2. A barra de cores

- Faixa ENCAIXADA no pé da área central (~64 px), não flutuante: não cobre o modelo.
- Com a Folha de pintura aberta, a barra atravessa a largura toda, sob a folha e o 3D (os dois
  pintam com a mesma cor).
- Da esquerda para a direita: **potinho** (a cor atual em 48 px, nome embaixo, "Verde") → as
  **15 cores da paleta** (40 px, cantos de 10 px) → separador → as **favoritas** → **"+"**, que abre
  um popover com "Criar outra cor" (o `SceneColorPicker` + "Guardar cor favorita") e "Usadas agora".
- Estreita: a fila rola de lado, o potinho fica preso na ponta esquerda e um esmaecido na ponta
  direita avisa que há mais cores.
- A dica, o zoom e a legenda X/Y/Z seguem flutuando no palco, acima da barra. O toast sobe acima
  da pílula de dica: nunca se sobrepõem.
- Nomes acessíveis inalterados (`COPY.a11y.colorSwatch(index, hex)`, `aria-pressed`): leitor de
  tela e e2e continuam valendo.
- A troca de paleta ("Paletas: Arcade") NÃO entra na barra: muda as cores do modelo inteiro e é
  rara. Fica no painel da direita.

## 3. A coluna da esquerda

1. **Ferramentas**: Pincel, Balde, Borracha, Pegar cor, Pintar de perto (os mesmos ladrilhos).
2. **Jeito** (contextual):
   - Pincel: tamanho em três bolinhas crescentes no lugar do "1 2 3"; some a legenda "1 px";
     o nome acessível continua "1 px", "2 px", "3 px".
   - Borracha: as bolinhas + dois ladrilhos pequenos "Apagar tinta" / "Deixar vazado" (vêm do
     painel da direita).
   - Balde: "Só esta área" / "Fundo da peça" (vêm do painel; o segundo segue o portão
     `model.finish` de hoje).
   - Pegar cor, Pintar de perto: a frase curta que já existe.
3. **Ajudas**: Espelhar (como hoje) e **"Só nesta peça"**, alternância que substitui o
   "Pintar em" do palco. Desligada = pinta qualquer peça (o padrão de hoje).

Sai da coluna: "Criar textura", "Importar textura", "Vestir com textura", o texto "Escolha uma
peça para…" e a prévia de pintura animada (vão para o painel da peça, seção 4).

**Letras de atalho**: saem de cima dos ladrilhos no Pintar E no Modelar. O atalho continua
funcionando e aparece no `title` ("Pincel (B)") e no `aria-keyshortcuts`.

## 4. O painel da direita

1. Peças e grupos (como hoje).
2. **Cartão da peça**:
   - sem peça: "Pinte direto no modelo. Toque numa peça para ver as opções dela." (o texto atual,
     "Toque numa peça para pintar.", engana: já dá para pintar sem escolher);
   - com peça: "Peça escolhida: caixa" + ajuda (?) + **Criar textura**, **Usar imagem** (o antigo
     "Importar textura") e "Vestir com textura", só quando há peça (nunca desligados em cinza);
   - com textura: "Pintando no modelo: Textura", o cartão "Peça pronta para pintar" e a prévia
     da pintura animada quando houver.
3. Preparar para pintar (faces tortas), como hoje.
4. **Paleta do modelo**: "Paletas: Arcade" recolhida.
5. Nível intermediário em diante: Fundo transparente, Gradiente e "Mais jeitos de pintar"
   SEM MUDANÇA (o gradiente acabou de ser ajustado em `faf627c6f`).
6. Mais opções da peça (lado interno, girar a pintura), como hoje.

Sai do painel: "Ferramentas que vêm por aí" (só no Pintar), o bloco de cores inteiro (vai para
a barra) e "Ajustes da ferramenta" (vai para a coluna da esquerda). Abaixo de 1024 px a gaveta
"Peças / Pintura" segue igual, com menos conteúdo.

## 5. Pele e retorno visual

- **Pingo de tinta**: no canto do ladrilho do Pincel e do Balde (onde ficava a letra), um pingo
  redondo na cor atual. Não tingir o ícone inteiro: amarelo e branco sumiriam no ladrilho claro.
- **Bolinhas de tamanho na cor da tinta.**
- **Potinho**: um salto curto (160 ms) ao trocar de cor; com `prefers-reduced-motion`, só troca.
- **Amostras**: a escolhida sobe 2 px e ganha anel duplo (branco por dentro, destaque por fora),
  visível sobre branco e preto nos dois temas; cores claras (branco, bege, azul claro) ganham
  borda interna fina; hover sobe de leve e o `title` dá o nome ("Vermelho" / "Cor personalizada").
- **Barra**: receita `.mld-color-bar` em `molda.css` (`@layer components`), fundo
  `--mld-surface`, borda superior fina, sombra suave, tema escuro.

## Fora do escopo (deliberado)

Cursor de pincel sobre o modelo; gradiente e "Mais jeitos de pintar"; as paletas em si; o
"Usar textura pronta" continua uma ação separada dos pincéis (regra do CLAUDE.md de 24/10).

## Verificação

- Componentes: `SceneWorkshop.paint.test`, `SceneWorkshop.toolAccess.test`,
  `SceneWorkspaceAreas.test`, `SceneWorkshop.test` (nomes acessíveis preservados).
- e2e: atualizar `paint-simple`, `palette-panel-layout`, `scene-workshop-layout` e os do ladrilho
  do Modelar; novo caso: a barra não cobre o palco e a dica não fica sob o toast.
- Capturas 1440 / 1024 / 768, claro e escuro, três níveis, antes e depois.
- `bun run typecheck`, `bun run test`, `bun run check`, `bun run e2e` e
  `bun test tests/copy-vocabulario.test.ts` em `packages/community-kids`.
- CLAUDE.md do Molda: atualizar a nota "`keyHint` só para atalho que existe".
