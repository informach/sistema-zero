# Caderno do Aluno · Nave Contra Asteroides

Textos e passos vêm da mesma fonte dos roteiros: `../../qa/nave-contra-asteroides.conteudo.json`. O gerador também usa os encaminhamentos de verificação e envio do gerador das aulas. Para revisar conteúdo, alterar essa fonte e regenerar os trios e o PDF.

O visual usa o CSS e as fontes Baloo 2/Nunito do caderno de Cadê Todo Mundo?, com capa escura, etapas numeradas, blocos e campos brancos. As cores são lidas das definições reais do Estúdio. Os esquemas mostram os encaixes principais; os passos escritos conservam a montagem completa. A capa é uma captura do jogo original, executado localmente, sem imagens externas.

```powershell
python docs/aulas-interativas/recursos/nave-contra-asteroides/gerar-materiais.py
```

Requer Bun, Python com Playwright e Chrome ou Edge instalado. HTML, captura, PDF temporário e relatório de limites ficam em `tmp/pdfs/nave-contra-asteroides/`. A saída é [nave-contra-asteroides-caderno.pdf](../../../../output/pdf/nave-contra-asteroides-caderno.pdf).

O gerador espera as fontes, pagina o conteúdo sem cortar parágrafos, confere imagens, cores e limites antes de substituir o PDF. A inspeção visual do PDF continua necessária, especialmente após mudar texto ou esquemas.

Anexar esse único PDF na seção 2 de Faça a nave aparecer. Consulta, download e impressão são opcionais. As perguntas dos quizzes são respondidas na plataforma; o caderno não oferece gabarito antecipado.
