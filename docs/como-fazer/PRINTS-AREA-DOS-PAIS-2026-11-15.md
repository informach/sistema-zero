# Prints a refazer: área dos pais redesenhada (15/11/2026)

A área dos pais ganhou menu lateral (Início, Família, Cursos para pais, Oficinas, Conta, Ajuda) e
a página de cada filho virou abas (Progresso, Aparelhos, No jogo, Perfil). Os textos dos dois
tutoriais abaixo já descrevem a tela nova no `como-fazer.json`; os prints ainda são da área antiga.

**Quando:** depois do deploy da área nova na staging (PR #260). Conta do responsável com dois
filhos (Leninha e Débora), 1440 de largura, como os prints de 02/10 e 26/10. Publicar em produção
só quando a área nova estiver em produção: antes disso, o texto descreveria uma tela que a
produção ainda não tem.

## plataforma-preparar-acesso-da-crianca

| Passo | O que mostrar | Destaque |
| --- | --- | --- |
| `entrar` | Não muda (tela de entrada). | |
| `crianca` | Família, com o menu lateral e "Seus filhos" com o cartão da Leninha. | Acesso nos aparelhos |
| `autorizar` | Página da Leninha, aba Aparelhos, formulário de autorizar aberto. | Em outro aparelho e Neste aparelho |
| `prazo` | Nome do aparelho preenchido e 90 dias escolhido, com a data de término. | 90 dias |
| `neste` | Confirmação "Este navegador está liberado para Débora". | Ir para a área da criança |
| `outro` | Cartão "Código para Leninha", código embaçado. | Copiar |
| `conferir` | Lista de aparelhos com o Notebook do quarto Liberado e o aviso Pronto!. | o aviso |

## plataforma-renovar-ou-encerrar-acesso

| Passo | O que mostrar | Destaque |
| --- | --- | --- |
| `abrir` | Aba Aparelhos da Leninha: um aparelho Liberado e um Encerrado. | Renovar prazo e ⋯ |
| `renovar` | Janela Renovar prazo. | Confirmar novo prazo |
| `encerrar` | Janela Encerrar este acesso?. | Encerrar acesso |
| `irmaos` | Família, "Seus filhos" com os cartões da Leninha e da Débora. | os dois Acesso nos aparelhos |
| `voltar` | Lista com um acesso Encerrado. | Autorizar aparelho |

Caminho de publicação: o mesmo das rodadas anteriores (WebP no R2 público
`kids/como-fazer/<slug>/<passo>-<sha16>.webp`, `imageUrl` trocado no JSON, publicação pelo
`capture → prepare → dry-run → publish → verify → http` em cada banco).
