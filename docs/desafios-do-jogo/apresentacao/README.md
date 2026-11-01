# Apresentação dos quadros (01/11/2026)

Retorno de quem testou a sua ilha: o Quadro das Cores não se explicava e o pedido de cada desafio
ficava escondido. Cada quadro do Quadro das Cores ganha, no conteúdo do desafio:

- **`resumo`**: a linha "o que se faz" do cartão (até 60 letras, sem "!" nem "—"), em
  `resumos.ts`. A chave é o slug sem `-adulto`: Kids e adulto usam a mesma linha.
- **`imagem`**: o print "Como fica", o jogo resolvido pelo gabarito, em
  `imagens/<slug>.webp` (320 por 192, WebP). Aparece na miniatura do cartão e na coluna da Missão
  do Estúdio de desafio.

Os dois campos são opcionais no contrato (`ConteudoDoDesafioV1Schema`): sem `resumo`, o jogo mostra
a primeira frase do enunciado (`resumoDoDesafio`); sem `imagem`, a coluna e o cartão só não mostram
o print.

## Como gerar

Todo gerador de manifesto com quadros passa por `comApresentacao` (`index.ts`), que lê as duas
fontes. Então:

1. Linha nova ou mudada: edite `resumos.ts` e rode o gerador da ilha.
2. Print novo (gabarito mudou, quadro novo):
   `SZ_CHECK_CHROMIUM=/caminho/do/chrome bun docs/desafios-do-jogo/apresentacao/imagens.ts [slug...]`
   e rode o gerador da ilha. O script desliga o controle de toque do Jogo 2D e aperta Enter para
   passar da tela de abertura.
3. Importe o manifesto no Admin (Jogo, manifestos).

Python e Pro ficam sem print (precisariam do ambiente Python e do compilador). O teste
`apresentacao.test.ts` confere que todo quadro tem a linha e que todo quadro em blocos ou na Ponte
tem o print.
