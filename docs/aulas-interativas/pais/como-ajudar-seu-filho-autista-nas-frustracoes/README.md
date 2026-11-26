# Como ajudar seu filho autista a lidar com frustrações e evitar crises

Curso bônus do Sistema Zero **para pais e responsáveis**, apresentado por Vivianne Lima, psicóloga da Laopa, em **Cursos para pais** na área dos pais do Kids. A voz é gerada no ElevenLabs e a apresentadora é o avatar da Vivianne durante toda a aula, no mesmo esquema do curso Transformando o vilão em aliado.

**De onde vem o conteúdo:** dos slides que a Vivianne preparou para o curso, que dão a ordem e os tópicos, e do material em que ela se inspirou, que enriquece cada aula. O jeito de falar foi tirado de gravações dela. O detalhamento, e a lista do que precisa da conferência dela, está em [Fontes](fontes.md).

**Sem oferta:** o curso termina com a mensagem final e o certificado. Nenhuma aula convida para compra, plano ou outro produto.

| Material | Arquivo |
| --- | --- |
| Título, descrições e organização | [Módulos](modulos.md) |
| Fontes, cobertura e pontos para a Vivianne conferir | [Fontes](fontes.md) |
| Consulta opcional | [Apostila](apostila.pdf) |

| Aula | Conteúdo | Roteiro | Texto para o ElevenLabs | Importação no Admin |
| --- | --- | --- | --- | --- |
| 1. Crise não é desobediência, é comunicação | [Conteúdo](como-ajudar-seu-filho-autista-nas-frustracoes-aula-1.md) | [Fala e produção](como-ajudar-seu-filho-autista-nas-frustracoes-aula-1.roteiro.md) | [Copiar](como-ajudar-seu-filho-autista-nas-frustracoes-aula-1.elevenlabs.txt) | [Manifesto](como-ajudar-seu-filho-autista-nas-frustracoes-aula-1.manifesto.json) |
| 2. De onde vem a frustração | [Conteúdo](como-ajudar-seu-filho-autista-nas-frustracoes-aula-2.md) | [Fala e produção](como-ajudar-seu-filho-autista-nas-frustracoes-aula-2.roteiro.md) | [Copiar](como-ajudar-seu-filho-autista-nas-frustracoes-aula-2.elevenlabs.txt) | [Manifesto](como-ajudar-seu-filho-autista-nas-frustracoes-aula-2.manifesto.json) |
| 3. Antes da crise: de pais reativos a pais estrategistas | [Conteúdo](como-ajudar-seu-filho-autista-nas-frustracoes-aula-3.md) | [Fala e produção](como-ajudar-seu-filho-autista-nas-frustracoes-aula-3.roteiro.md) | [Copiar](como-ajudar-seu-filho-autista-nas-frustracoes-aula-3.elevenlabs.txt) | [Manifesto](como-ajudar-seu-filho-autista-nas-frustracoes-aula-3.manifesto.json) |
| 4. Durante a crise: a intervenção inteligente | [Conteúdo](como-ajudar-seu-filho-autista-nas-frustracoes-aula-4.md) | [Fala e produção](como-ajudar-seu-filho-autista-nas-frustracoes-aula-4.roteiro.md) | [Copiar](como-ajudar-seu-filho-autista-nas-frustracoes-aula-4.elevenlabs.txt) | [Manifesto](como-ajudar-seu-filho-autista-nas-frustracoes-aula-4.manifesto.json) |
| 5. Depois da crise: onde a magia acontece | [Conteúdo](como-ajudar-seu-filho-autista-nas-frustracoes-aula-5.md) | [Fala e produção](como-ajudar-seu-filho-autista-nas-frustracoes-aula-5.roteiro.md) | [Copiar](como-ajudar-seu-filho-autista-nas-frustracoes-aula-5.elevenlabs.txt) | [Manifesto](como-ajudar-seu-filho-autista-nas-frustracoes-aula-5.manifesto.json) |

## Voz e edição

- São **12 clipes**. Cada roteiro traz a **Fala para ElevenLabs** com as tags de direção, e cada aula tem o seu `.elevenlabs.txt`: é abrir, selecionar tudo e colar. As partes vêm separadas por `[long pause]`.
- O `.elevenlabs.txt` é derivado do roteiro. Mudou a fala? Mude no `.roteiro.md` e gere o `.txt` de novo (o `validar-roteiros.py` recusa o arquivo desatualizado).
- A voz precisa ser a da Vivianne no ElevenLabs, e o avatar, o dela. A fala segue a construção conversada dela: exemplos de casa, primeira pessoa na demonstração, perguntas que ela mesma desenvolve e expressões como "tá?", "gente" e "uai", usadas com medida.
- O **Na tela** de cada parte cita trechos da fala e indica os textos e exemplos a inserir para desenvolver os tópicos dos slides da Vivianne. Não há depoimentos em vídeo.

| Aula | Chave do clipe | Título da parte |
| --- | --- | --- |
| 1 | `video-a1-abertura` | Boas-vindas |
| 1 | `video-a1-comunicacao` | O que ninguém te contou sobre a crise |
| 2 | `video-a2-raizes` | As quatro raízes da frustração |
| 2 | `video-a2-funcao` | Função ou julgamento? |
| 3 | `video-a3-rotina` | Rotina visual e clareza do que vai acontecer |
| 3 | `video-a3-treino` | Treino de pequenas frustrações |
| 3 | `video-a3-pedir` | Ensinar um jeito de pedir |
| 4 | `video-a4-ambiente` | O ambiente e o seu tom |
| 4 | `video-a4-auge` | O que não fazer no auge |
| 5 | `video-a5-acolher` | Acolher e ensinar para a próxima vez |
| 5 | `video-a5-analise` | O gatilho, a consequência e os ajustes |
| 5 | `video-a5-fechamento` | Hoje eu escuto melhor |

## Publicação

1. Antes de gerar a voz, a Vivianne confere o texto: os roteiros desenvolvem os tópicos dos slides dela. Os pontos a conferir estão em [Fontes](fontes.md).
2. No Admin, criar o curso com o slug `como-ajudar-seu-filho-autista-nas-frustracoes`, audiência Kids e **Para quem: Pais**, fora da Jornada, no formato gravado. Criar as cinco aulas com os slugs dos manifestos.
3. Preencher título e descrições conforme [Módulos](modulos.md) e importar os cinco manifestos.
4. Os vídeos estão como `plannedVideo`. Vincular as gravações.
5. O bloco `apostila` fica na Aula 1, como no outro curso para pais.
6. O bloco `certificado` fica na Aula 5 e registra a conclusão.

## Arquivos para publicação e restauração

Os materiais finais ficam **nesta pasta do curso**:

| Arquivo | Uso |
| --- | --- |
| `arte-base.png` | Imagem original fornecida pela responsável. |
| `capa-do-curso.png` | Ilustração centralizada, sem texto, para o cartão do curso. |
| `capas-das-aulas/aula-0N-parte-0M.png` | As 12 capas dos vídeos, com título e numeração da parte. |
| `capa-apostila.png` | Capa da apostila, sem quantidade de aulas. |
| `apostila.pdf` | Apostila completa de dez páginas. |
| `certificado.png` | Fundo do certificado, com mãe e filho à esquerda e psicóloga à direita, junto ao rodapé. O centro fica livre para os dados dinâmicos. |
| `certificado-demonstracao.pdf` e `.png` | Simulação pelo gerador real com nome longo, data, QR, número e duas assinaturas fictícias. Não são certificados emitidos. |
| `prompts-das-artes.json` | Ferramenta, referências e prompts das imagens geradas. |
| `publicacao-staging.json` e `publicacao-production.json` | IDs, vínculos dos vídeos, capas, apostila e configuração do certificado por ambiente. |
| `cadastro-publicado-staging.json` e `cadastro-publicado-production.json` | Cópia do cadastro e dos documentos das aulas publicados. |
| `conferencia-slides-2026-11-25.md` | Conferência dos nove slides com as falas dos roteiros. |

### Posição dos materiais

A apostila é mencionada no fim da **Aula 1, Parte 2, O que ninguém te contou sobre a crise**. O bloco `apostila`, com o título **Materiais da aula**, fica imediatamente abaixo desse vídeo, em uma única coluna. Ele contém somente o PDF para baixar, sem bloco de livro 3D ou texto de resumo. O download é opcional e não bloqueia a conclusão. O certificado fica na **Aula 5, Parte 3, Hoje eu escuto melhor**, e integra a conclusão.

### Como refazer

Os geradores ficam em `docs/aulas-interativas-tecnico/recursos/como-ajudar-seu-filho-autista-nas-frustracoes/`:

```powershell
bun docs/aulas-interativas-tecnico/recursos/como-ajudar-seu-filho-autista-nas-frustracoes/gerar-capas.ts
python docs/aulas-interativas-tecnico/recursos/como-ajudar-seu-filho-autista-nas-frustracoes/renderizar-capas.py
bun docs/aulas-interativas-tecnico/recursos/como-ajudar-seu-filho-autista-nas-frustracoes/gerar-caderno.ts
```

As capas das partes usam a imagem original. A capa do curso foi recomposta com os personagens centralizados, sem texto. A capa da apostila segue a receita visual dos cursos Kids e usa esse mesmo enquadramento. A apostila mantém o conteúdo de consulta em `caderno-conteudo.json`, na pasta do gerador.

Para restaurar o cadastro, use os cinco manifestos editoriais, os arquivos finais e os vínculos do recibo do ambiente. Os documentos `cadastro-publicado-*.json` são cópias de segurança para consulta, não são os arquivos de importação do editor. Os vídeos originais continuam na pasta de Downloads informada pela responsável; seus arquivos não foram duplicados no repositório.

O fluxo de publicação é staging e depois promoção para produção pelo operador canônico de [publicação de cursos](../../../operations/cursos-passo-a-passo.md). Este curso tem audiência Kids e `learner=parents`, fica fora da Jornada e não é copiado para a comunidade adulta.
