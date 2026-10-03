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

O PDF atual tem 15 páginas. Após editar passos ou diagramas, conferir também a navegação por páginas e renderizar o PDF inteiro para revisão visual. A validação de limites complementa essa revisão, não substitui a leitura. Não reduzir fonte ou omitir instruções para caber na página.

O mapa para responsáveis foi retirado por orientação de 03/10/2026. A revisão antes do certificado está implementada nos materiais locais. O caderno orienta responder na aula e corrigir com as explicações; não antecipa o gabarito.

O mesmo verificador pode gerar o caderno do Cadê Todo Mundo com `python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py cade-todo-mundo`: seis páginas com cores oficiais e verificação de limites.
