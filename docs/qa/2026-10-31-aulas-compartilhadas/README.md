# Aulas Kids e adultas com a mesma apresentação

O ensaio local usa os dois players reais, o CommunityFrame adulto e os componentes compartilhados.
Foram conferidas larguras de 1440, 768 e 390 px no Chrome instalado. Seis cenários passaram:
Jogue nos dois renderizadores, interação no jogo em iframe isolado, lista de aulas, fala do Zappy
com seis estados SVG distintos, ausência de rolagem horizontal e recarga comum com cache ligado.
Os tamanhos medidos de texto, chip e base do documento coincidiram. Não houve requisição Rive.
A narração deste ensaio é um tom local, sem informação pessoal e sem escrever em serviços.

O fixture Kids monta o seu player, o contexto de foco e a barra superior e as abas reais. O adulto
monta a moldura real. As rotas e a identidade continuam próprias de cada comunidade. Os testes
comparam medidas e comportamento, não uma imagem inteira por pixels: marcas, dados e destinos
da navegação são próprios de cada público. Cada fixture é compilada no seu app, sem misturar
os aliases TypeScript dos dois projetos.
As fontes nos prints são o fallback Arial; o build Next é quem confere Nunito e Baloo reais.
Os prints de 390 px são emulação de viewport, não medição de desempenho em aparelho físico.

Reprodução, em uma pasta de recibos que ainda não exista:

```
node --experimental-strip-types packages/community-kids/tests/e2e/verify-lesson-parity.ts .cache/aulas-nova-tentativa
```

O script fecha cada contexto, o Chrome e o servidor local ao terminar. Os negativos de preparação
ficaram no cache privado. As tentativas iniciais de tipagem detectaram e corrigiram o acoplamento entre os aliases dos
dois apps no ensaio, e o tipo genérico de Buffer na resposta HTTP do qualificador. A primeira tentativa Bun do controlador de navegador não concluiu o
lançamento; a execução válida usa Node, como os outros qualificadores reais do repositório.
Este recibo é prova local. Não afirma implantação dessa apresentação em staging ou produção.

## Rolagem do documento, 01/11/2026

A conferência real em staging encontrou a raiz da página adulta sem o estilo da rolagem:
`body *` não seleciona `html`. As áreas internas já estavam no tema, mas a barra da janela
continuava nativa (15 px no Chrome utilizado), enquanto a do Kids tinha 14 px.

O gerador mantém agora os seletores universais e limita sua aplicação por `:where`, incluindo
a raiz e os descendentes. As condições dos dois temas continuam mutuamente exclusivas. Não há
CSS aplicado por JavaScript ou alteração de especificidade. A folha adulta foi regenerada pela
fonte canônica. O comportamento de `walkRules` foi conferido na documentação do PostCSS e o de
`:where` na MDN.

O teste unitário novo reproduziu a ausência da raiz antes da correção (5 passaram e 1 falhou).
Após a correção, os 133 testes do pacote UI passaram (1394 asserções), assim como sua tipagem.
O qualificador nativo acima passou nos seis cenários, agora comparando também a largura e a cor
da barra da raiz: 14 px e a mesma cor nos dois públicos em 1440, 768 e 390 px. Seus recibos e
prints locais estão em `.cache/edisvg-scrollbar-fix/browser-r1/`. O ensaio fecha seus próprios
processos. Estes resultados qualificam o ajuste local; a conferência no serviço publicado é
uma etapa separada.
