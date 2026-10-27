# A Ilha do Farol

Curso do posto **Faísca**, depois de **A Chave do Farol**. Três aulas em blocos com a extensão **Jogo 3D**, sem certificado. As artes atuais são provisórias até a devolução dos projetos ajustados no Molda.

| Aula | Conceito novo e investigação | Construção no Estúdio |
| --- | --- | --- |
| [Uma ilha com profundidade](ilha-aula-1.roteiro.md) | Ponto de vista: revelar a chave sem mover os objetos | Movimento nas quatro direções, parada e reinício |
| [A chave está ao seu alcance](ilha-aula-2.roteiro.md) | X/Z no chão, Y na altura; contato em três dimensões | Posição da chave, coleta, memória e aviso |
| [A luz volta ao farol](ilha-aula-3.roteiro.md) | Revisão e aplicação dos conceitos, sem repetir experiências do 2D | Resposta sem chave, vitória com chave, personalização e teste completo |

Cada aula tem manifesto, roteiro de produção, fala integral para ElevenLabs e índice de edição. A fonte editorial é [ilha-do-farol-conteudo.ts](../../aulas-interativas-tecnico/qa/ilha-do-farol-conteudo.ts). Não editar somente os derivados. Nesta versão a professora grava o master inteiro, sem substituições por Dedé/Debinha.

- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) e [versão em texto](passo-a-passo.md).
- [Projeto final importável no Estúdio](ilha-do-farol.szproject.json).
- [Proposta e decisões pedagógicas](proposta.md).
- [Módulo, descrição do curso e ordem das aulas](modulos.md).
- [Mapa técnico e comandos de verificação](../../aulas-interativas-tecnico/modulos-a-ilha-do-farol.md).
- [Reintegração dos arquivos do Molda](reintegracao-molda.md).
- [Revisão da implementação e evidências](revisao-implementacao.md).

## Produção e publicação

Implementação e autoria locais: experiências, quiz, objetivos, projetos progressivos, manifestos, roteiros, textos de voz e PDF. O jogo usa teclado (setas/WASD e R); as experiências também têm botões, sliders e campos numéricos. O navegador precisa oferecer WebGL.

Ainda dependem de produção: artes finais do responsável, geração e escuta das vozes, gravação dos vídeos, anexação do PDF no Admin e publicação. `plannedVideo` é um molde de produção, não um vídeo publicado. O manifesto já contém os passos como material de texto para consulta; o PDF é anexado na publicação. Não houve importação remota nem implantação nesta tarefa.

O caderno é anexado uma única vez, em `materiais`, na parte 2 da primeira aula. As demais aulas remetem a ele. Seu PDF segue o mesmo template visual do Cadê Todo Mundo e da Chave do Farol, com capa ilustrada, índice, experiências, passos numerados, esquemas com as cores reais dos blocos, testes, entrega e ajuda. O encerramento oferece publicação opcional no Mural, sem transformá-la em requisito de conclusão.

Usar o curso reservado **`jornada-faisca-base-3d`**; na oferta adulta, **`jornada-faisca-base-3d-adulto`**. A projeção de destino conserva os IDs internos e a cadeia do projeto. Conferir os cursos existentes por slug antes de importar; não recriar o curso nem reiniciar progresso. O currículo aponta para esta autoria, mantendo o hash do outline original do seed. Os títulos e a montagem completos vêm destes manifestos. Havendo aulas provisórias no Admin, reconciliar sua identidade antes da publicação.

Um ensaio com iniciantes ainda é necessário para avaliar compreensão, legibilidade e tempo de exploração. Os testes de software conferem funcionamento, não comprovam aprendizagem.
