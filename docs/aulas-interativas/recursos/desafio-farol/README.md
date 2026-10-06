# Caderno do Aluno · A Chave do Farol

O visual acompanha o caderno de Cadê Todo Mundo: capa com arte e painel escuro, fontes Baloo 2/Nunito, cores, cartões, passos numerados, campos brancos e blocos desenhados. O CSS de referência é lido diretamente de `../cade-todo-mundo/caderno-do-aluno.template.html`; não alterar esse arquivo para corrigir só o Farol.

- `caderno-conteudo.json`: textos e passos das aulas, preservados da revisão pedagógica.
- `gerar-caderno.ts`: composição das páginas, ilustrações com a arte local do jogo, encaixes e fontes. Identifica as partes preparadas; não apresenta os desenhos como screenshots.
- As cores de cada bloco, área e valor são importadas das definições finais do Estúdio, incluindo os tons das famílias de Jogo 2D e Programação. Não usar a cor genérica da categoria nem escolher outra cor para combinar com a página. O renderizador confere a cor aplicada no navegador contra essas definições.
- `gerar-materiais.py`: prepara o HTML, confere fontes/imagens/limites no Chrome ou Edge e gera somente o PDF do aluno.

Na raiz do repositório:

```powershell
python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py
```

Requisitos: Bun, Python com `playwright` e Chrome ou Edge instalado. A geração usa arquivos locais, sem baixar fontes ou imagens. Saída: [desafio-farol-caderno.pdf](../../../../output/pdf/desafio-farol-caderno.pdf). HTML e relatório de limites ficam em `tmp/pdfs/desafio-farol/` para inspeção.

O PDF atual tem 21 páginas. Após editar passos ou diagramas, conferir também a navegação por páginas e renderizar o PDF inteiro para revisão visual. A validação de limites complementa essa revisão, não substitui a leitura. Não reduzir fonte ou omitir instruções para caber na página.

O mapa para responsáveis foi retirado por orientação de 03/10/2026. A revisão antes do certificado está implementada nos materiais locais. O caderno orienta responder na aula e corrigir com as explicações; não antecipa o gabarito.

O mesmo verificador pode gerar o caderno do Cadê Todo Mundo com `python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py cade-todo-mundo`: seis páginas com cores oficiais e verificação de limites.

## Artes personalizadas — 03/10/2026

Os sete SVGs do `pack-game-farol` e os quatro personagens desenhados em 05/10/2026 (`menina`, `marinheira`, `menino` e `exploradora`, com a caixa 64 × 64 e a área de contato do personagem original) ficam em `packages/studio/src/arte/assets/farol/`. O jogo usa `cenario-farol-limpo.svg` como fundo; `cenario-farol.svg` é a referência composta, pois já contém personagem, chave, torre e barco.

O palco tem **480 × 360**, proporção original do cenário. `packages/studio/src/arte/farol-assets.ts` compartilha as posições e as áreas de contato entre o projeto preparado, a atividade da porta e as ilustrações do caderno. A luz não é área de contato. O barco parte fora da tela e chega à água em `(387, 240)`. Os nomes dos assets e a progressão das aulas foram preservados.

Para regenerar tudo, a partir da raiz:

```powershell
python packages/studio/scripts/gen-farol-assets.py
bun docs/aulas-interativas/qa/gerar-desafio-farol.ts
python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py
bun docs/aulas-interativas/qa/gerar-preview-farol.ts
python docs/aulas-interativas/recursos/desafio-farol/capturar-artes.py
```

O gerador de arte mantém os SVGs originais e produz módulos TS sem dependência de DOM, inclusive os mesmos vetores para fundos Canvas. `--check` confere se os módulos estão atualizados. A captura requer também Pillow; testa o percurso com teclado no runtime real, reinício e proporção numa coluna de 360 px. O jogo e a capa do funil são exportados em 1280 × 960. Dimensões dos demais recortes ficam em `tmp/farol-artes/capturas.json` e em `packages/funnel/src/funnels/desafio-primeiro-jogo/visuals.ts`.

Esses comandos atualizam os arquivos locais. Não importam os manifestos no catálogo nem substituem o PDF remoto ou projetos já salvos pelos alunos.

Revisão visual: [jogo após a vitória](evidencias/jogo-personalizado.png), [três estados da experiência da porta](evidencias/porta-tres-estados.png) e [imagem na oferta pelo celular](evidencias/oferta-celular.png). O [registro da implementação](../../../superpowers/plans/2026-10-03-farol-artes-personalizadas.md) reúne os resultados de testes e builds.
