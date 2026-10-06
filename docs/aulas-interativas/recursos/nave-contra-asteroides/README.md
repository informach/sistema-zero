# Caderno do Aluno · Nave Contra Asteroides

Para a criança, desde 06/10/2026, o caderno se chama **Mapa da Aventura** (Diretrizes, seção 6): capa, rodapé e título do material na fase (**Mapa da Aventura: Nave Contra Asteroides**). Os capítulos são **Fase 1** a **Fase 9**, e os textos falam de parte, guia e dos botões novos. O nome do arquivo PDF, a chave do bloco e a da seção continuam com caderno. A primeira página convida a consultar: ler aqui na fase ou baixar para guardar, sem dizer que não precisa baixar ou imprimir.

Textos e passos vêm da mesma fonte dos roteiros: `../../qa/nave-contra-asteroides.conteudo.json`. O gerador também usa os encaminhamentos de verificação e envio do gerador das aulas. Para revisar conteúdo, alterar essa fonte e regenerar os trios e o PDF.

O visual usa o CSS e as fontes Baloo 2/Nunito do caderno de Cadê Todo Mundo?, com capa escura, etapas numeradas, blocos e campos brancos. As cores são lidas das definições reais do Estúdio. Os esquemas mostram os encaixes principais; os passos escritos conservam a montagem completa. A capa é uma captura do jogo original, executado localmente, sem imagens externas.

```powershell
python docs/aulas-interativas/recursos/nave-contra-asteroides/gerar-materiais.py
```

Requer Bun, Python com Playwright e Chrome ou Edge instalado. HTML, captura, PDF temporário e relatório de limites ficam em `tmp/pdfs/nave-contra-asteroides/`. A saída é [nave-contra-asteroides-caderno.pdf](../../../../output/pdf/nave-contra-asteroides-caderno.pdf).

O gerador espera as fontes, pagina o conteúdo sem cortar parágrafos, confere imagens, cores e limites antes de substituir o PDF. A inspeção visual do PDF continua necessária, especialmente após mudar texto ou esquemas.

Anexar esse único PDF na seção 2 de Faça a nave aparecer. Ler na fase, baixar e imprimir são convites e não entram na conclusão. As perguntas dos quizzes são respondidas na plataforma; o caderno não oferece gabarito antecipado.
