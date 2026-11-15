# Prints da área dos pais redesenhada (15/11/2026)

A área dos pais ganhou menu lateral (Início, Família, Cursos para pais, Oficinas, Conta, Ajuda) e
a página de cada filho virou abas (Progresso, Aparelhos, No jogo, Perfil).

**FEITO em 15/11/2026.** Os 11 prints foram tirados na staging com a área nova (conta de
superadmin de staging, filhos André Rocha e Débora; a Débora é um perfil de teste criado para os
prints, com o Notebook do quarto Liberado e o Computador de casa Encerrado), em 1280x800 com escala
2 (2560x1600), no estilo dos anteriores (tela escurecida, alvo com anel laranja e cursor). WebP no
R2 público (`kids/como-fazer/<slug>/<passo>-<sha16>.webp`, conferidos byte a byte pelo CDN) e os
dois tutoriais publicados pelo BFF do Admin nos bancos de STAGING e PRODUÇÃO, a pedido da dona,
depois de conferir que cada banco batia com o lote anterior (sem edição do Admin pendente).
⚠️ A produção publicou antes do deploy de produção da área nova (pedido dela): até esse deploy,
os dois tutoriais descrevem a área nova.

O que cada print mostra:

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
