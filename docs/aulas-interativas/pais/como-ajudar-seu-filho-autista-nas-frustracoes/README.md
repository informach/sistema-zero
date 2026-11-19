# Como ajudar seu filho autista a lidar com frustrações e evitar crises

Curso bônus do Sistema Zero **para pais e responsáveis**, apresentado por Vivianne Lima, psicóloga da Laopa, em **Cursos para pais** na área dos pais do Kids. A voz é gerada no ElevenLabs e a apresentadora é o avatar da Vivianne durante toda a aula, no mesmo esquema do curso Transformando o vilão em aliado.

**De onde vem o conteúdo:** dos slides que a Vivianne preparou para o curso, que dão a ordem e os tópicos, e do material em que ela se inspirou, que enriquece cada aula. O jeito de falar foi tirado de gravações dela. O detalhamento, e a lista do que precisa da conferência dela, está em [Fontes](fontes.md).

**Sem oferta:** o curso termina com a mensagem final e o certificado. Nenhuma aula convida para compra, plano ou outro produto.

| Material | Arquivo |
| --- | --- |
| Título, descrições e organização | [Módulos](modulos.md) |
| Fontes, cobertura e pontos para a Vivianne conferir | [Fontes](fontes.md) |

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
- A voz precisa ser a da Vivianne no ElevenLabs, e o avatar, o dela. A fala foi escrita no jeito dela: "então, assim", "tá?", "gente", "os meninos", perguntas que ela mesma responde.
- O **Na tela** de cada parte cita trechos da fala e indica os textos a inserir, que correspondem aos slides da Vivianne. Não há depoimentos em vídeo.

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
5. O bloco `certificado` fica na Aula 5 e registra a conclusão.

## Estado desta entrega

Roteiros, resumos de aula, textos para o ElevenLabs e manifestos escritos em 19/11/2026. Faltam a conferência da Vivianne, a geração da voz e dos vídeos, a importação no Admin e a publicação.

**Apostila:** fica para a segunda etapa, depois da aprovação dos roteiros, com capa e cores a definir. Quando ela existir, entra o bloco de apostila na Aula 1.
