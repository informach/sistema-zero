# Transformando o vilão em aliado

Minicurso gratuito para pais, com a Helena na câmera. São seis aulas curtas, de 6 a 10 minutos (a confirmar depois da gravação), em **Cursos para pais**, na área dos pais do Kids. A família recebe o curso de presente por uma campanha, e no fim ganha o Cadê Todo Mundo por 7 dias.

**O caminho do curso:** da preocupação ao primeiro passo. Cada aula muda uma crença do responsável, traz uma prova (exemplo, depoimento ou pesquisa), entrega uma ferramenta para usar em casa e tem um quiz de situação.

| Material | Arquivo |
| --- | --- |
| Título, descrições, módulo e aulas | [Módulos](modulos.md) |
| Base de conhecimento, depoimentos, referências e cuidados (uso interno) | [Fontes](fontes.md) |
| Apostila do curso para consultar ou anexar | [PDF da apostila](apostila.pdf) |

Cada aula tem **conteúdo** (objetivo, crença que muda, estrutura e ferramenta), **roteiro** (a fala completa da Helena e o que aparece na tela) e **manifesto** (o JSON para importar no Admin). Este curso não tem fala de ElevenLabs: a Helena grava.

| Aula | Conteúdo | Roteiro | Manifesto |
| --- | --- | --- | --- |
| 1. A pergunta certa sobre telas | [Abrir](transformando-o-vilao-em-aliado-aula-1.md) | [Abrir](transformando-o-vilao-em-aliado-aula-1.roteiro.md) | [JSON](transformando-o-vilao-em-aliado-aula-1.manifesto.json) |
| 2. Consumir ou criar: o que muda por dentro | [Abrir](transformando-o-vilao-em-aliado-aula-2.md) | [Abrir](transformando-o-vilao-em-aliado-aula-2.roteiro.md) | [JSON](transformando-o-vilao-em-aliado-aula-2.manifesto.json) |
| 3. Programar é organizar a vida | [Abrir](transformando-o-vilao-em-aliado-aula-3.md) | [Abrir](transformando-o-vilao-em-aliado-aula-3.roteiro.md) | [JSON](transformando-o-vilao-em-aliado-aula-3.manifesto.json) |
| 4. O interesse do seu filho é a porta de entrada | [Abrir](transformando-o-vilao-em-aliado-aula-4.md) | [Abrir](transformando-o-vilao-em-aliado-aula-4.roteiro.md) | [JSON](transformando-o-vilao-em-aliado-aula-4.manifesto.json) |
| 5. Quando fica difícil: foco, erro e o seu papel | [Abrir](transformando-o-vilao-em-aliado-aula-5.md) | [Abrir](transformando-o-vilao-em-aliado-aula-5.roteiro.md) | [JSON](transformando-o-vilao-em-aliado-aula-5.manifesto.json) |
| 6. Da criação à conversa, e o primeiro passo | [Abrir](transformando-o-vilao-em-aliado-aula-6.md) | [Abrir](transformando-o-vilao-em-aliado-aula-6.roteiro.md) | [JSON](transformando-o-vilao-em-aliado-aula-6.manifesto.json) |

## Como gravar

- Uma gravação por parte com vídeo, com o nome do clipe do roteiro (`video-a1-pergunta` e assim por diante): 13 clipes no total. As partes de quiz não têm gravação.
- A fala do roteiro é para teleprompter. Dá para falar com as próprias palavras, desde que nenhuma ideia se perca.
- **Na tela** diz o que aparece em cada momento e onde entra cada vídeo de depoimento (ver [Fontes](fontes.md)). Todo depoimento leva legenda com nome e vínculo ("Débora, mãe do Bernardo"), para não confundir com a Débora, filha da Helena.
- A Aula 3 tem alguns segundos de gravação de tela do Estúdio (blocos coloridos) e a grade do desafio do caminho.

## Como publicar

1. No Admin, criar o curso com audiência Kids e **Para quem: Pais** (fora da Jornada, só gravado). Título e descrições em [Módulos](modulos.md).
2. Criar as seis aulas e importar cada manifesto. Os vídeos entram como vídeo planejado; depois, vincular cada gravação.
3. Anexar a [apostila](apostila.pdf) no bloco de materiais da Aula 1 (`apostila`, com prévia em livro).
4. **Presente do fim (Aula 6):** acrescentar ao bloco `presente` o item de link da campanha do Cadê (`/bolsa/<código>`).
5. **O minicurso de presente:** criar no catálogo uma oferta do curso (acesso sem prazo, sem Mural) e uma campanha em Embaixadores que dê essa oferta de presente.

## Pendências de produção

- Gravar os 13 clipes e editar com os depoimentos.
- Confirmar a autorização da família da Isabela para o vídeo num curso.
- Arte final da capa da apostila e do curso: a provisória usa uma ilustração de 880 px; a receita pede pelo menos 1300 px de largura.
