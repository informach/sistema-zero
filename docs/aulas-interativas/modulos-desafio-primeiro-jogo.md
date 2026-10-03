# Módulos do Desafio do Primeiro Jogo

**Título do curso:** Desafio do Primeiro Jogo · A Chave do Farol

**Descrição curta:** Programe sua primeira aventura: encontre a chave e acenda o farol para guiar um barco.

**Descrição:** Conheça a aventura jogando uma versão pronta. Depois, em três dias, programe as regras do seu jogo: faça o personagem andar pelo mapa, recolher a chave e abrir a porta do farol quando estiver com ela. O cenário, os desenhos e o movimento do barco já vêm preparados. Você constrói as regras que ligam esses momentos, testa cada parte e aprende a publicar seu jogo no Mural. O Estúdio aparece dentro das aulas. Não é preciso usar o Pinta nem o Estúdio completo.

Revisão de 03/10/2026: aplicação do formato testado no Cadê Todo Mundo. Contexto pertinente antes de cada tarefa, instruções completas, menos navegação obrigatória, verificação antes do envio e publicação orientada.

## Módulo 1 · Sua aventura no farol

| Aula | Seções | Resultado |
| --- | --- | --- |
| [A aventura começa aqui](aulas/desafio-introducao.md) | 2 | Conhecer o jogo, jogar a versão pronta e encontrar o caderno opcional. |
| [O personagem ganha movimento](aulas/desafio-dia-1.md) | 1 | Construir controles, movimento e limite das bordas. |
| [A chave muda a aventura](aulas/desafio-dia-2.md) | 2 | Programar o encontro e guardar a coleta. |
| [A luz do farol](aulas/desafio-dia-3.md) | 3 | Comparar a condição, programar a porta e publicar o mesmo jogo. |
| [Seu certificado](aulas/desafio-certificado.md) | 1 | Reconhecer a autoria e guardar a conquista. |

São nove seções com nove vídeos. A introdução deixa de ser um tour, mas apresenta a aventura antes do convite para jogar. No Dia 1, as explicações antes separadas entram na montagem. A experiência da porta continua no Dia 3. A seção comercial obrigatória sai do certificado.

## Projeto e conclusão

Identificador do curso e cadeia: `desafio-primeiro-jogo`. Aulas: `boas-vindas`, `dia-1`, `dia-2`, `dia-3`, `certificado`. Preservar esses destinos e a chave `projeto` em cada dia.

A cadeia prioriza o envio anterior da criança. Os projetos embutidos dos Dias 2 e 3 são retomadas somente quando não há trabalho anterior. O jogo pronto da introdução é uma atividade isolada e nunca deve substituir o projeto da criança.

Cada entrega ensina testar, **Verificar esta etapa**, corrigir pendências, conferir **Objetivo da etapa cumprido!**, esperar **Salvo**, **Enviar para o professor** e confirmar **Enviar**. Testes manuais do comportamento complementam a verificação dos blocos.

No Dia 3, a seção de publicação usa o mesmo Estúdio da montagem. **Compartilhar** fica disponível após o envio. O título e o resumo vêm preenchidos; ensinar gerar capa, publicar e esperar a confirmação. Publicar é a tarefa, mas o vídeo segue como critério técnico daquela seção. Não criar bloqueio novo por acesso expirado ao Mural.

## Materiais de consulta

- **Caderno do Aluno:** [desafio-farol-caderno.pdf](../../output/pdf/desafio-farol-caderno.pdf). PDF único com passos de montagem, testes, entrega, publicação e ajuda. Anexar em `materiais-farol`, com `bookPreview: true`.
- **Como Fazer:** links contextuais na introdução, primeira montagem e publicação. Abrem na mesma aba e permitem voltar à aula. Não exigir consulta, impressão ou download para concluir.

O gerador dos PDFs fica em `recursos/desafio-farol/gerar-materiais.py`. O caderno deve ser anexado antes da gravação que o apresenta.

O conteúdo do caderno acompanha as seções reais: visão geral, passos de montagem, testes, publicação, certificado e ajuda. Não existe um mapa como material ou atividade adicional. O antigo PDF de mapa para responsáveis não integra esta versão do curso; preservar o arquivo histórico, sem anexá-lo à aula ou ao leitor do caderno.

## Atualização de aulas existentes

Os cinco manifestos locais são fontes de autoria, com `plannedVideo`. **Não importar cegamente sobre aulas publicadas.** Antes de aplicar no admin:

1. Registrar o estado atual: IDs das seções/blocos, vídeos vinculados, anexos e alunos com progresso.
2. Conferir o diff preservando as chaves mantidas, a cadeia e o bloco de certificado. Usar a reconciliação de seções para não criar projetos paralelos.
3. Tratar `retireBlockKeys` explicitamente. Retiram-se o tour final da introdução, os dois vídeos sem prática do Dia 1 e o pitch do certificado. Não apagar mídia apenas porque o molde local contém `plannedVideo`.
4. Gravar e vincular os nove vídeos revisados. O vídeo antigo de fechamento do Dia 3 não serve para ensinar publicação.
5. Atualizar o caderno, preservando anexos que já existem até a substituição ser conferida. Retirar da aula a referência ao mapa antigo, se houver, sem apagar a mídia armazenada.
6. Ensaiar com conta nova e conta com progresso, inclusive certificado já emitido. Conferir avanço após as seções retiradas, retomada do projeto e retorno do Como Fazer.
7. Publicar somente depois de conferir mídia, conclusão e a experiência completa.

## Escopo comercial e outros cursos

A oferta atual do Desafio concede 30 dias de curso e Mural completo, seguidos de Mural visitante. Ofertas históricas podem ter outros direitos. Esta adaptação editorial não muda preço, prazo, catálogo, funil ou concessões.

O curso antigo de nave está em [Nave Contra Asteroides](modulos-nave-contra-asteroides.md), com outro identificador. Não alterar seus cinco dias.

## Verificações

```powershell
bun docs/aulas-interativas/qa/gerar-desafio-farol.ts
bun test docs/aulas-interativas/qa/desafio-farol-manifestos.test.ts docs/aulas-interativas/qa/desafio-farol-projeto.test.ts
bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-
python docs/aulas-interativas/validar-roteiros.py desafio-
bun docs/como-fazer/validar.ts
python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py
```

Além dos checks locais, ensaiar em navegador por toque e teclado, tela estreita, Estúdio ampliado, retorno de ajuda, duas situações da porta, verificação, envio, publicação e certificado. Fazer novo ensaio com crianças: os ajustes vieram do Cadê Todo Mundo, mas a compreensão deste Desafio ainda precisa ser observada. Estes arquivos não significam que o curso publicado já foi atualizado.
