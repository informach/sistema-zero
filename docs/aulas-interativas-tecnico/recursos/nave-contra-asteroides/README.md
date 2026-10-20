# Caderno do Aluno · Nave Contra Asteroides

Para a criança, desde 06/10/2026, o caderno se chama **Mapa da Aventura** (Diretrizes, seção 6): capa, rodapé e título do material na fase (**Mapa da Aventura: Nave Contra Asteroides**). Os capítulos são **Fase 1** a **Fase 9**, e os textos falam de parte e dos botões novos (o envio é **Enviar meu projeto**, e quem recebe é a equipe). O nome do arquivo PDF, a chave do bloco e a da seção continuam com caderno. A primeira página convida a consultar: ler aqui na fase ou baixar para guardar, sem dizer que não precisa baixar ou imprimir.

Na revisão de 06/10/2026 (três vozes e conversa contínua), o mapa passou a falar com a criança como as falas: a primeira página abre com "Este é o seu Mapa da Aventura!" e convida a ler aqui na fase ou baixar para guardar; a capa fala do "seu jogo"; o esquema de cada fase pede "Confira se os blocos do seu jogo ficaram assim"; e a nota das revisões diz que as perguntas se respondem na própria fase. Os passos das montagens herdam da fonte o porquê de cada resultado e o "Confira se ficou assim:", mas passam pelo modo `mapa` do gerador (`falasSecao(…, 'mapa')`), que tira os chamados de atenção ("Olha aqui", "Olha só", "Tá vendo?", "Repare"): no papel não há o que apontar. Com as falas mais completas, o PDF foi de 33 para 41 páginas.

Textos e passos vêm da mesma fonte dos roteiros: `../../qa/nave-contra-asteroides.conteudo.json`. O gerador também usa os encaminhamentos de verificação e envio do gerador das aulas. Para revisar conteúdo, alterar essa fonte e regenerar os trios e o PDF.

O visual usa o CSS e as fontes Baloo 2/Nunito do caderno de Cadê Todo Mundo?, com capa escura, etapas numeradas, blocos e campos brancos. As cores são lidas das definições reais do Estúdio. Os esquemas mostram os encaixes principais; os passos escritos conservam a montagem completa. A capa é uma captura do jogo original, executado localmente, sem imagens externas.

```powershell
python docs/aulas-interativas-tecnico/recursos/nave-contra-asteroides/gerar-materiais.py
```

Requer Bun, Python com Playwright e Chrome ou Edge instalado. HTML, captura, PDF temporário e relatório de limites ficam em `tmp/pdfs/nave-contra-asteroides/`. A saída é [nave-contra-asteroides-caderno.pdf](../../../aulas-interativas/kids/nave-contra-asteroides/mapa-da-aventura.pdf).
Com `--adulto`, o mesmo comando gera o Caderno do Aluno da versão adulta em [caderno-do-aluno.pdf](../../../aulas-interativas/adulto/nave-contra-asteroides/caderno-do-aluno.pdf), com o texto de `qa/adulto/traducoes/nave-contra-asteroides/_caderno.json` e as mesmas verificações (pasta temporária `tmp/pdfs/nave-contra-asteroides-adulto/`). Quando o caderno kids muda, rode antes `bun docs/aulas-interativas-tecnico/recursos/nave-contra-asteroides/gerar-caderno.ts --coletar` e escreva a versão adulta dos textos novos ([Diretrizes da versão adulta](../../DIRETRIZES-ADULTO.md#caderno-do-aluno)).

O gerador espera as fontes, pagina o conteúdo sem cortar parágrafos, confere imagens, cores e limites antes de substituir o PDF. A inspeção visual do PDF continua necessária, especialmente após mudar texto ou esquemas.

Anexar esse único PDF na seção 2 de Faça a nave aparecer. Ler na fase, baixar e imprimir são convites e não entram na conclusão. As perguntas dos quizzes são respondidas na plataforma; o caderno não oferece gabarito antecipado.
