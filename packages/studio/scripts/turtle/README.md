# Derivação do Turtle para o navegador

`derive.py` preserva a geometria e as assinaturas da fonte CPython 3.14.2 fixada
em `vendor/` e conecta o motor ao backend de desenho do estúdio. Os arquivos
gerados ficam em `../../src/runtime/python/turtle/`; altere o gerador para mudar
`turtle.py` ou `api-reference.json`.

Na raiz de `packages/studio`, use CPython **3.14.2**, sem `-O`:

```sh
python -I scripts/turtle/derive.py
python -I scripts/turtle/test_compound.py
```

O gerador verifica a versão do interpretador e os hashes das fontes e licenças.
Ele não executa código de alunos. O teste usa o motor e o backend reais com um
transporte JSON gravador; não abre Tk, navegador ou distribuição WASM e não
certifica pixels, foco ou desempenho.

## Formas compostas

`turtle.Shape('compound')` e `forma.addcomponent(poligono, preenchimento,
contorno)` mantêm as assinaturas oficiais. `stamp()` retorna a tupla dos IDs das
partes; `clearstamp()` e `clearstamps()` removem todas as partes correspondentes.
Os blocos usam rótulos em português e geram esses mesmos nomes Python.

Antes de construir, trocar, clonar ou carimbar uma forma, o motor verifica os
polígonos transformados e as capacidades necessárias. O plano de desenho usa a
geometria efetiva: a forma visível, os três pontos que CPython usa para ocultar
cada componente ou nenhum desenho quando a atualização é adiada. Na atualização
global de `tracer(N)`, inclui as formas pendentes na ordem dos atores; no clone,
inclui antes a linha que será encerrada. Assim, uma redução posterior não
encobre um estouro intermediário, e uma redução anterior libera sua capacidade.
O plano não avança o contador de atualização nem envia operações.

Coordenadas, cores, contorno, tamanho da operação, itens e pontos da cena
continuam sujeitos aos limites do perfil. Esses erros de entrada e capacidade
verificados não deixam componentes parcialmente alocados. Isso não é uma
garantia de reversão de qualquer falha de transporte ou encerramento durante
uma operação, nem de todas as outras operações de desenho Turtle.

Os eventos `onclick`, `onrelease` e `ondrag` preservam a interpretação de uma
lista de IDs pelo Tk: uma forma composta com uma parte recebe o evento nessa
parte; formas vazias ou com várias partes não distribuem o evento entre seus
polígonos. Registrar ou remover o callback nesses casos não gera `TypeError`.
Para interações independentes dessa característica, use `Screen.onclick` e
teste a posição na sua própria lógica. A origem dessa semântica está no
[comando bind do Tk 8.6.15](https://github.com/tcltk/tk/blob/core-8-6-15/generic/tkCanvas.c#L858)
e na [interpretação de tags](https://github.com/tcltk/tk/blob/core-8-6-15/generic/tkCanvas.c#L3297).

Os codecs de formas compostas exigem a capacidade de runtime
`turtle-compound-shapes`. Uma distribuição sem essa capacidade não deve oferecer
esses blocos nem executar exemplos que a exigem. Gerar os arquivos não publica
uma distribuição; a preparação e a qualificação do candidato são etapas próprias.
