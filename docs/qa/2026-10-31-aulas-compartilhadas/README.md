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
