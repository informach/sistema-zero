# Cadê Todo Mundo?

Materiais do curso para consulta, gravação e importação.

**Ilustrações já preparadas:** reaproveitar as cócegas e a risada do Zappy na Aula 1 e o placar de futebol na Aula 2, nas duas versões. A revisão da narração não exige refazer esses exemplos. [Análise e notas para a edição](../../../continuity/2026-10-21-unificacao-aulas-plataforma/reaproveitamento-cade.md).

| Material | Arquivo |
| --- | --- |
| Título, descrições, módulos e aulas | [Módulos](modulos.md) |
| Blocos do projeto | [JSON dos blocos](blocos.json) |
| Jogo completo para importar no Estúdio | [Projeto final](projeto-final.szproject.json) |
| Passo a passo do projeto para consultar ou anexar | [PDF do passo a passo](passo-a-passo-do-projeto.pdf) |

Os arquivos de cada aula ficam nesta pasta. **Conteúdo** reúne a proposta e as orientações; **roteiro** traz a direção de produção e as substituições kids; **fala ElevenLabs** contém a aula inteira para copiar e colar; **manifesto** é o JSON para importar no Admin.

| Aula | Conteúdo | Roteiro | Manifesto | Fala ElevenLabs |
| --- | --- | --- | --- | --- |
| O primeiro achado | [Abrir](cade-todo-mundo-aula-1.md) | [Abrir](cade-todo-mundo-aula-1.roteiro.md) | [JSON](cade-todo-mundo-aula-1.manifesto.json) | [TXT](cade-todo-mundo-aula-1.elevenlabs.txt) |
| Complete a busca | [Abrir](cade-todo-mundo-aula-2.md) | [Abrir](cade-todo-mundo-aula-2.roteiro.md) | [JSON](cade-todo-mundo-aula-2.manifesto.json) | [TXT](cade-todo-mundo-aula-2.elevenlabs.txt) |
| Seu certificado | [Abrir](cade-todo-mundo-certificado.md) | [Abrir](cade-todo-mundo-certificado.roteiro.md) | [JSON](cade-todo-mundo-certificado.manifesto.json) | [TXT](cade-todo-mundo-certificado.elevenlabs.txt) |

## Revisão de descoberta guiada, 25/10/2026

Aplicada ao código e aos materiais locais conforme [as diretrizes](../../../aulas-interativas-tecnico/DESCOBERTA-GUIADA.md). Os dois vídeos conceituais preparam a investigação; as experiências orientam cada teste pelo estado. O quiz tem previsão, cena resultante e correção por pergunta. Os objetivos conferem comportamento em execução. [Falas internas do Zappy](zappy-etapas.json) registram os textos por etapa.

Produção de áudio, escuta, edição dos clipes, importação no curso de destino e publicação são etapas separadas. Os arquivos plannedVideo não representam vídeo novo publicado.

[Implementação, evidências de validação e etapas de produção restantes](REVISAO-2026-10-25.md).

## Exploração livre orientada por objetivos, 26/10/2026

Experiências atualizadas com as comparações disponíveis desde o início, testes em qualquer ordem e repetição depois da conclusão. O próximo botão sugerido usa a cor principal; outras opções permanecem utilizáveis. Reiniciar uma tentativa preserva descobertas; recomeçar a experiência limpa o ensaio. O quiz mantém previsão, cena, correção e nova tentativa. As falas de Zappy acompanham o estado da experiência e estão em `zappy-etapas.json`.

Vídeos conceituais explicam o conceito e convidam à investigação, sem ditar cliques. A montagem no Estúdio continua completa. Fontes, roteiros, manifestos e PDF foram sincronizados. Produzir áudio/vídeo, importar os materiais e publicar continuam etapas de produção. Consulte [as diretrizes de autoria](../../../aulas-interativas-tecnico/DESCOBERTA-GUIADA.md).

[Revisão da implementação, correções e evidências de validação](../../../aulas-interativas-tecnico/REVISAO-EXPLORACAO-2026-10-26.md).

## Pendências de produção da moldura nova das experiências (08/11/2026)

As experiências ganharam a moldura nova (cartões de pergunta, controles com a forma do que imitam, voz automática do Zappy, sons e a ideia no balão do Zappy). Para chegar à produção:

1. **Ordem do deploy:** members antes de kids e community (o motor e o player mudaram juntos; ver `docs/aulas-interativas-legado/raio-x-implantacao.md`).
2. **Reimportar os manifestos** deste curso no Admin. ⚠️ Reimportar recomeça o progresso em andamento nessas experiências.
3. **Gerar de novo a voz do Zappy** ("Gerar a voz do Zappy" no Admin) e publicar: as falas das experiências mudaram, e reimportar apaga as `vozes` antigas.
4. **Gerar a voz nova e regravar as aulas 1 e 2.** Desde 09/11/2026 (decisão dela) o vídeo da experiência não explica a experiência: as partes `video-a1-toque` e `video-a2-variavel` explicam só o conceito e terminam no convite ("Agora você vai investigar …" e o fecho comum), e o **Na tela** delas só amplia a experiência e aponta o Zappy, sem apontar nem tocar controles (`convite-da-experiencia.test.ts` e `video-experiencia.test.ts`). A lembrança da experiência no `video-a1-programar` também mudou: lembra o conceito ("O toque só deixava o esconderijo invisível quando a reação estava ligada a ele."), não o botão antigo "Ligar a reação ao toque". Gerar de novo no ElevenLabs a voz da professora desses três clipes (a fala de Debinha no `video-a1-programar` não mudou, só a âncora dela), gerar de novo o plano no EdiAula e regravar as duas aulas.

**Fecho único do convite (08/11/2026, decisão dela):** a instrução das experiências das aulas 1 e 2 (o toque e os achados) passou a terminar em "Você escolhe a ordem e pode repetir quando quiser.", o mesmo fecho do Faísca (`video-experiencia.test.ts`). A mudança chega com a reimportação dos manifestos acima. Desde 09/11/2026 o recado da página dessas duas partes também segue o formato do convite ("Sua vez! Investigue …", terminando em "Quando terminar, clique em Próxima parte.").
