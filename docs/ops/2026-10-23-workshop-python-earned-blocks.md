# Oficina real: conclusão e blocos Python conquistados

Em staging, uma conta de aluno fornecida para testes concluiu uma oficina própria
de QA e passou a poder criar projetos Python no Estúdio Completo. A navegação
normal atualizou a interface sem logout. Nenhum curso existente foi modificado.

## Preparação pela interface

O Admin criou um curso Kids ao vivo, sem posição na jornada, com uma aula e um
quiz obrigatório de 100%. O prêmio selecionado foi
`sz_py_turtle_module_forward`; a interface incluiu automaticamente seus sete
blocos auxiliares. A turma de QA tinha uma vaga, ocupada pela conta de teste.
Curso, aula e inscrições foram publicados/abertos pela interface.

Identidades técnicas, todas exclusivas de staging:

| Recurso | ID |
| --- | --- |
| Curso QA | `ef071a57-89e6-49f9-8aef-cf8d7b04c998` |
| Aula QA | `435f89a8-c824-4e50-8777-38b2f9b58a65` |
| Encontro | `607eb9f1-8165-4c38-847a-663c04d61a8d` |
| Projeto Python criado pelo aluno | `01M5KK0MZMXB0CQPVJQSEEJ2W5` |

## Observações reais, em 23/10/2026 UTC

| Passo | Resultado observado |
| --- | --- |
| Antes da conclusão | Novo projeto não oferecia Python à conta de teste. |
| Resposta errada | POST do quiz respondeu 200, `score: 0`, `passed: false`; Concluir permaneceu desabilitado. |
| Nova tentativa correta | POST respondeu 200, `score: 100`, `passed: true`; Concluir foi habilitado. |
| Concluir às 05:14:00 | POST respondeu 200, uma de uma aula concluída, 100%, `unitCompleted: true`. |
| Voltar ao Estúdio pela navegação normal | Novo projeto ofereceu JavaScript como padrão e Python como alternativa. |
| Criar projeto Python clássico | Projeto foi salvo na conta; commit canônico respondeu 200, formato 3. |
| Instalar Turtle | Categoria Movimento ofereceu somente `avançar · forward`; os comandos não conquistados não foram liberados em conjunto. |
| Fechar e reabrir | Projeto, extensão e paleta persistiram; o programa vazio concluiu sua execução. |
| Encerrar | Stop e retorno à galeria deixaram zero iframes. |

As respostas HTTP foram conferidas novamente após a rodada. Os identificadores
locais de captura foram 2233/2253 (quiz), 2268 (conclusão) e 2378 (commit).
Eles não são IDs permanentes do servidor. A implantação ativa dessa rodada
era `bf33cbef621865f264561f689111e01bbcdc8fe0`; a implantação posterior de
`1394cd9c9` ainda estava em andamento.

## Limites

Não houve transmissão, câmera, microfone, email ou convite. Portanto esta prova
não qualifica SFU, gravação, replay ou todos os fluxos de sala ao vivo.
A conta já tinha acesso ao Estúdio Completo; esta rodada não prova isoladamente
que a conclusão deixa de conceder o produto a quem não o possui.
O projeto criado estava vazio: não é uma prova de desenho, jogo completo,
exportação ou todas as categorias de blocos. Os exemplos Pac-Man/Space Arena e
Pinta têm evidências separadas na [validação hospedada](2026-10-22-hosted-staging-validation.md).

Os dados de QA permanecem somente em staging. Não devem ser incluídos em seeds
de produção. Nomes, emails, cookies e valores de sessão não integram este recibo.
