# Desafio do Primeiro Jogo · A Chave do Farol

Materiais do curso para consulta, gravação e importação.

| Material | Arquivo |
| --- | --- |
| Título, descrições, módulos e aulas | [Módulos](modulos.md) |
| Blocos do projeto | [JSON dos blocos](blocos.json) |
| Jogo completo para importar no Estúdio | [Projeto final](projeto-final.szproject.json) |
| Passo a passo do projeto para consultar ou anexar | [PDF do passo a passo](passo-a-passo-do-projeto.pdf) |

Os arquivos de cada aula ficam nesta pasta. **Conteúdo** reúne a proposta e as orientações; **roteiro** traz a direção de produção e as substituições kids; **fala ElevenLabs** contém a aula inteira para copiar e colar; **manifesto** é o JSON para importar no Admin.

| Aula | Conteúdo | Roteiro | Manifesto | Fala ElevenLabs |
| --- | --- | --- | --- | --- |
| O personagem ganha movimento | [Abrir](desafio-dia-1.md) | [Abrir](desafio-dia-1.roteiro.md) | [JSON](desafio-dia-1.manifesto.json) | [TXT](desafio-dia-1.elevenlabs.txt) |
| A chave muda o curso | [Abrir](desafio-dia-2.md) | [Abrir](desafio-dia-2.roteiro.md) | [JSON](desafio-dia-2.manifesto.json) | [TXT](desafio-dia-2.elevenlabs.txt) |
| A luz do farol | [Abrir](desafio-dia-3.md) | [Abrir](desafio-dia-3.roteiro.md) | [JSON](desafio-dia-3.manifesto.json) | [TXT](desafio-dia-3.elevenlabs.txt) |
| Seu certificado | [Abrir](desafio-certificado.md) | [Abrir](desafio-certificado.roteiro.md) | [JSON](desafio-certificado.manifesto.json) | [TXT](desafio-certificado.elevenlabs.txt) |

## Exploração livre orientada por objetivos, 26/10/2026

Experiências atualizadas com as comparações disponíveis desde o início, testes em qualquer ordem e repetição depois da conclusão. O próximo botão sugerido usa a cor principal; outras opções permanecem utilizáveis. Reiniciar uma tentativa preserva descobertas; recomeçar a experiência limpa o ensaio. O quiz mantém previsão, cena, correção e nova tentativa. As falas de Zappy acompanham o estado da experiência e estão em `zappy-etapas.json`.

Vídeos conceituais explicam o conceito e convidam à investigação, sem ditar cliques. A montagem no Estúdio continua completa. Fontes, roteiros, manifestos e PDF foram sincronizados. Produzir áudio/vídeo, importar os materiais e publicar continuam etapas de produção. Consulte [as diretrizes de autoria](../../../aulas-interativas-tecnico/DESCOBERTA-GUIADA.md).

[Revisão da implementação, correções e evidências de validação](../../../aulas-interativas-tecnico/REVISAO-EXPLORACAO-2026-10-26.md).

## Pendências de produção da moldura nova das experiências (08/11/2026)

As experiências ganharam a moldura nova (cartões de pergunta, controles com a forma do que imitam, voz automática do Zappy, sons e a ideia no balão do Zappy). Para chegar à produção:

1. **Ordem do deploy:** members antes de kids e community (o motor e o player mudaram juntos; ver `docs/aulas-interativas-legado/raio-x-implantacao.md`).
2. **Reimportar os manifestos** deste curso no Admin. ⚠️ Reimportar recomeça o progresso em andamento nessas experiências.
3. **Gerar de novo a voz do Zappy** ("Gerar a voz do Zappy" no Admin) e publicar: as falas das experiências mudaram, e reimportar apaga as `vozes` antigas.
4. **Vídeos das experiências do Dia 1** (`video-d1-quadro` e `video-d1-limite`): desde 09/11/2026 as duas partes seguem o convite, como os Dias 2 e 3: explicam só o conceito e convidam a investigar, sem nomear nem apontar Devagar, o filme ou a cerca. Gerar a voz nova dessas partes e regravar os vídeos (a aula 1 inteira vai ser regravada). As retomadas que lembravam um controle da experiência também mudaram e precisam de voz nova: Dia 2, parte 3 (`video-d2-guardar`), e Dia 3, parte 2 (`video-d3-sem-chave`).
5. **Passo a passo do projeto (PDF)** já regenerado com os nomes novos (e de novo em 09/11/2026, com o subtítulo da página do Dia 2, parte 3, que acompanhou a fala nova); anexar a versão nova.

**Fecho único do convite (08/11/2026, decisão dela):** a instrução das experiências do Dia 1 (câmera lenta e beirada) passou a terminar em "O Zappy te mostra o que testar, e você pode repetir quando quiser.", o mesmo fecho do Faísca (`video-experiencia.test.ts`). A mudança chega com a reimportação dos manifestos acima; os vídeos do Dia 1 serão regravados (item 4).
