# Comunidade dos Criadores — imagens da página de vendas (prompts + prints)

## O que FICA e o que SAI

**Ficam (reaproveitados do Desafio, decisão 13/07):** os bonecos dos balões de fala
`zappy-fala.webp`, `dede-fala.webp`, `debinha-fala.webp` E os três avatares de depoimento
`depo-rafael.webp`, `depo-debora.webp`, `depo-andre.webp` (as mesmas crianças do Desafio).
**A PÁGINA ESTÁ VISUALMENTE COMPLETA (13/07).** As 4 ilustrações (hero, ilustra-dor,
ilustra-virada, ilustra-vitoria) e os 6 prints (print-estudio/mural/carreira/mundo/clube/recados)
estão no ar. A foto da família (`autoridade-familia`) fica com o placeholder do Desafio
(`familia-helena-julio-kids.webp`) por decisão da Helena. Pra TROCAR qualquer imagem depois, salve
o arquivo novo **com o MESMO nome** em `packages/funnel/public/img/comunidade-dos-criadores/`.
Os prints são screenshots (sem chroma): converta pra WebP ~1100px (qualidade 84) e pronto — nos
blocos 09/15 já viram `<figure class="shot">` (card) ou `.shot-feat` (bloco de suporte). ⚠️ O
frame do card usa **`object-fit: contain` + fundo `#F0F9FF`** (o azul-céu da própria plataforma):
mostra o print INTEIRO, NUNCA corta (senão não dá pra ler a UI), e o vão é preenchido compondo com
o fundo dos prints. Não voltar pra `cover`/crop.

**Como recortar o chroma (o script está pronto):** gere a arte com fundo verde chroma e rode
`scratchpad/recortar-cdc.py` (função `recortar(im, rect=None)`).
- **Cena SEM verde na tela** (dor com TV escura, OU jogo de deserto/espaço sem verde): `rect=None`
  → corte simples + despill global (o mais limpo; peça pra IA fazer o joguinho SEM verde quando der).
- **Cena COM verde na tela do monitor** (jogo com colinas/dino verdes ≈ chroma): passe o RETÂNGULO
  da tela `rect=(x0,y0,x1,y1)` medido na imagem. VÁRIOS monitores → passe uma LISTA de retângulos
  (ex.: a virada tem dois). O script protege o conteúdo da tela (flood do céu/branco + preenche
  buracos internos, sem auréola) e remove o chroma em volta, inclusive bolsões presos e o gap
  entre telas. Meça os retângulos escaneando a moldura preta (ver histórico do script).
Sempre confira a PRÉVIA composta sobre creme (`scratchpad/previa-*.png`) antes de dar por pronto.

**Pipeline:** gere no ChatGPT com o fundo **verde chroma `#00B140`** (todos os prompts abaixo já
pedem), corte o fundo e converta pra WebP com o `preparar-assets-funil-kids.py` do fluxo-criativo.
As ilustrações entram na página como RECORTE flutuando sobre o fundo (mesmo acabamento do hero e
dos balões de fala): sem moldura, sem canto arredondado.

**Dimensões:** o ChatGPT gera em 3 formatos — **1024×1024 (quadrado)**, **1536×1024 (paisagem)** e
**1024×1536 (retrato)**. Cada prompt abaixo diz qual usar. Depois do corte, o script já deixa no
tamanho certo; não precisa redimensionar na mão.

---

## Ilustrações para gerar (8 prompts prontos, é só copiar e colar)

### 1. `hero.webp` — dobra 1 ✅ PRONTO (referência de personagens para as demais)

Gerado e recortado em 13/07 (menino de óculos apontando pro jogo + Zappy comemorando + estrelinhas,
chroma verde). O menino desta arte é a **referência de consistência** para as outras ilustrações:
menino brasileiro ~11 anos, pele morena clara, cabelo castanho escuro curto e bagunçado, óculos de
armação preta, camiseta azul-marinho, calça preta, tênis vermelho.

### 2. `ilustra-dor.webp` — bloco "a dor" (formato: PAISAGEM 1536×1024)

> Ilustração 3D estilizada no estilo Pixar para público infantil, cores vibrantes, acabamento fofo
> e arredondado. Cena compacta, sem cenário ao redor: o mesmo menino brasileiro de uns 11 anos
> (pele morena clara, cabelo castanho escuro curto bagunçado, óculos de armação preta, camiseta
> azul-marinho) sentado no canto de um sofá pequeno cinza-azulado, corpo inclinado para a frente,
> ombros curvados, segurando um controle de videogame azul com as duas mãos. O rosto dele está
> hiperconcentrado, expressão neutra e absorta (nem triste nem feliz), boca levemente entreaberta,
> olhos arregalados fixos à frente, iluminado por uma luz azulada fria vinda de uma televisão que
> aparece só de quina na borda da imagem, de costas para quem vê. A luz fria da tela contrasta com
> a iluminação quente e suave do resto do personagem. Nenhum outro personagem. Enquadramento
> lateral de corpo inteiro, composição horizontal. Fundo TOTALMENTE liso e uniforme na cor verde
> chroma #00B140, sem sombra projetada no chão, sem reflexo. Sem nenhum texto, logotipo ou marca
> d'água.

### 3. `ilustra-virada.webp` — bloco "a virada de chave" (formato: PAISAGEM 1536×1024)

> Ilustração 3D estilizada no estilo Pixar para público infantil, cores vibrantes e alegres,
> acabamento fofo e arredondado, iluminação quente e acolhedora. Cena compacta, sem cenário ao
> redor: o mesmo menino brasileiro de uns 11 anos (pele morena clara, cabelo castanho escuro curto
> bagunçado, óculos de armação preta, camiseta azul-marinho) sentado ereto e sorrindo confiante em
> uma mesa de madeira clara com DOIS monitores lado a lado: no monitor da esquerda, blocos de
> programação coloridos que se encaixam como peças de quebra-cabeça (azuis, laranjas, verdes e
> rosas, apenas formas, sem letras); no monitor da direita, o mesmo joguinho de plataforma
> colorido rodando (personagem quadradinho laranja, plataformas verdes, moedas amarelas). Acima da
> cabeça do menino, uma lâmpada amarela acesa estilizada com raiozinhos. À direita da mesa flutua
> o robô branco e azul de rosto de tela preta com olhos ciano sorridentes, antena de bolinha
> amarela e estrela amarela no peito, apontando animado para o monitor dos blocos. Enquadramento
> de corpo inteiro, composição horizontal. Fundo TOTALMENTE liso e uniforme na cor verde chroma
> #00B140, sem sombra no chão, sem reflexo. Sem nenhum texto, logotipo ou marca d'água.

### 4. `ilustra-vitoria.webp` — oferta final (formato: QUADRADO 1024×1024)

> Ilustração 3D estilizada no estilo Pixar para público infantil, cores vibrantes e festivas,
> acabamento fofo e arredondado, iluminação alegre. Cena compacta, sem cenário ao redor: um menino
> brasileiro de uns 11 anos (pele morena clara, cabelo castanho escuro curto bagunçado, óculos de
> armação preta, camiseta azul-marinho) e uma menina brasileira de uns 10 anos (pele parda, cabelo
> castanho cacheado na altura dos ombros, óculos de armação rosa, camiseta rosa-claro) lado a
> lado, pulando de braços erguidos em comemoração, sorrindo muito. Entre eles, um monitor sobre
> uma mesinha mostra um troféu dourado grande e brilhante na tela, cercado de estrelinhas (apenas
> formas, sem letras). Acima deles, o robô branco e azul de rosto de tela preta com olhos ciano
> sorridentes, antena de bolinha amarela e estrela amarela no peito, voando de braços abertos.
> Poucos confetes GRANDES e coloridos (rosa, azul, amarelo, verde) flutuando perto dos
> personagens, presos à composição. Enquadramento de corpo inteiro, composição quadrada. Fundo
> TOTALMENTE liso e uniforme na cor verde chroma #00B140, sem sombra no chão, sem reflexo. Sem
> nenhum texto, logotipo ou marca d'água.

### 5. `autoridade-familia.webp` — bloco "quem está por trás" (formato: RETRATO 1024×1536)

Se preferirem, aqui cabe uma **foto real** de vocês três (fundo limpo, boa luz). Para a versão
ilustrada, no mesmo universo da página:

> Ilustração 3D estilizada no estilo Pixar, retrato de família caloroso, cores vibrantes,
> acabamento fofo e arredondado, iluminação de estúdio suave. Cena compacta, sem cenário: uma
> família brasileira de três pessoas abraçada e sorrindo para frente. A mãe, uns 38 anos, pele
> clara, cabelo castanho escuro cacheado na altura dos ombros, óculos de armação escura, blusa
> azul-marinho. O pai, uns 40 anos, pele clara, cabelo escuro curto, óculos de armação escura,
> camiseta azul-escura. Entre os dois, na frente, um menino de uns 11 anos, pele morena clara,
> cabelo castanho escuro curto bagunçado, óculos de armação preta, camiseta azul-marinho, segurando
> um notebook fechado junto ao peito com um adesivo de estrela amarela na tampa. Os três com
> postura orgulhosa e acolhedora, mãos dos pais nos ombros do menino. Enquadramento dos joelhos
> para cima, composição vertical. Fundo TOTALMENTE liso e uniforme na cor verde chroma #00B140,
> sem sombra no chão, sem reflexo. Sem nenhum texto, logotipo ou marca d'água.

### Avatares dos depoimentos ✅ MANTIDOS DO DESAFIO

`depo-rafael.webp`, `depo-debora.webp` e `depo-andre.webp` seguem sendo as mesmas três crianças
do Desafio (decisão da Helena 13/07) — nada a gerar.

### Opcional. `ilustra-metodo.webp` — bloco do Z.E.R.O. (formato: PAISAGEM 1536×1024)

O bloco já se sustenta nos 4 cards coloridos; esta é a menos urgente.

> Ilustração 3D estilizada no estilo Pixar para público infantil, cores vibrantes, acabamento fofo.
> Cena compacta, sem cenário ao redor: uma trilha de tabuleiro flutuante e serpenteante feita de
> plaquinhas arredondadas, subindo suavemente da esquerda para a direita, com QUATRO estações
> redondas maiores nas cores rosa, azul, laranja e verde (nessa ordem), todas vazias, sem letras.
> No topo da trilha, uma bandeirinha amarela tremulando. Caminhando na trilha, o menino brasileiro
> de óculos de armação preta e camiseta azul-marinho, animado, e ao lado dele flutuando o robô
> branco e azul de rosto de tela preta com olhos ciano sorridentes, antena de bolinha amarela e
> estrela amarela no peito. Enquadramento aberto da trilha inteira, composição horizontal. Fundo
> TOTALMENTE liso e uniforme na cor verde chroma #00B140, sem sombra no chão, sem reflexo. Sem
> nenhum texto, logotipo ou marca d'água.

---

## Prints da plataforma (capturar, não gerar — os 6 estão como slot tracejado na página)

Conta demo com dados bonitos (jogos com capa, níveis subindo), **tema claro**, janela desktop
**1280 px de largura ou mais**, sem nome/foto de criança real (LGPD). Capture a área útil (sem a
barra do navegador) e salve com estes nomes:

| Arquivo | O que capturar |
|---|---|
| `print-estudio.webp` | Estúdio aberto num projeto colorido: blocos à esquerda + jogo rodando à direita. |
| `print-mural.webp` | Mural com a grade de jogos publicados (capas + contador de jogadas; um card mostrando o QR). |
| `print-carreira.webp` | Tela da Carreira com os níveis Faísca→Lenda e conquistas. |
| `print-mundo.webp` | Quarto 3D do Mundo do Criador com troféus expostos e o avatar. |
| `print-clube.webp` | Fórum do Clube com alguns tópicos (nomes fictícios). |
| `print-recados.webp` | Conversa dos Recados com o professor respondendo um envio. |

Quando os arquivos existirem, me chame: eu troco os slots tracejados pelos `<img>` com moldura nos
blocos 09 e 15 (2 minutos).

## Capa do checkout

`checkout-capa.webp` (a arte "Corre, Dino!") **já está no ar** — card do checkout, og:image e
JSON-LD. Nada a fazer.
