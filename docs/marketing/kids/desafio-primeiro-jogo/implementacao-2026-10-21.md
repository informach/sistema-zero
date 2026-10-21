# Desafio do Primeiro Jogo: as três páginas de oferta (21/10/2026)

As três páginas do Canvas "Desafio do Primeiro Jogo · três páginas" foram para o código. A proposta e o review ficam no Canvas: https://claude.ai/artifact/DsuTdUUBjhXri2BPaRMRta

## Decisões da dona

- A faixa Kids passou a ser de 9 a 17 anos, na página, no quiz e no Termo.
- O adulto tem a mesma oferta do Kids:
  - R$ 67 de referência, sempre vindo do catálogo;
  - pagamento único e 30 dias de acesso;
  - 7 dias de garantia, com cupom aceito.
- Os relatos do Rafael, da Débora e do André ficam, com a legenda do código.
- A copy Kids fala de "seu filho" e "ele", porque a maioria dos alunos são meninos.

## O que mudou no site

| Endereço | Página |
| --- | --- |
| `/kids/desafio-primeiro-jogo/oferta` | 9 a 17 anos (`Desafio917Body`) |
| `/kids/desafio-primeiro-jogo/oferta/criar-junto` | menor de 9, criando com um adulto (`DesafioMenor9Body`) |
| `/pro/desafio-primeiro-jogo/oferta` | adultos, tema arcade (`DesafioAdultoBody`, funil novo), registrado no mesmo dia depois que a variável foi criada no Railway |

As antigas `/oferta/tempo-de-tela`, `/oferta/iniciacao-tecnologica` e `/oferta/primeiro-jogo` fazem 301 para `/oferta`, mantendo a query (atribuição e cupom).

O quiz do Desafio virou `desafio-farol-v4`:
- a pergunta de idade ganhou "15 a 17" e "18 ou mais";
- todo resultado leva à mesma `/oferta`;
- quem marca menos de 9 recebe o link da página "criar junto", e quem marca 18 ou mais recebe o da página adulta.

O quiz antigo continua legível pela regra de versão.

O Termo Kids subiu para `desafio-2026-10-21`. Ele passou a dizer que a criança menor de 9 usa o Desafio junto com o responsável. O adulto tem Termo próprio (`desafio-adulto-2026-10-21`).

## Peças fora do funil

- **Catálogo:** o seed cria o produto `desafio-primeiro-jogo-adulto`, um curso com o mesmo `courseRef`. Também cria a oferta `desafio-primeiro-jogo-adulto-30-dias`:
  - 6700 centavos, `one_time`, `fixed`, 30 dias;
  - garantia de 7 dias, cupom aceito;
  - o Mural adulto completo como item.
- **Members:**
  - Depois dos 30 dias, quem comprou a oferta adulta fica com a visita permanente ao Mural adulto, como o Kids fica com a do Mural Kids.
  - Os avisos de prazo e progresso têm versões adultas (`challenge-*-adult`), com os links do app adulto. Eles dependem da env `COMMUNITY_URL` no members.
- **Funil:** a env `FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO` é obrigatória, porque sem ela o funil não sobe. Ela está no `.env.example` e em `.railway/variables.ts`.

## Segunda rodada, no mesmo dia: o adulto completo

A dona criou as variáveis no Railway, em staging e em produção:

| Serviço | Variável | Valor |
| --- | --- | --- |
| funnel | `FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO` | `desafio-primeiro-jogo-adulto-30-dias` |
| members | `COMMUNITY_URL` | URL do app adulto (a mesma do funil) |

Com elas:

- **Página adulta ativada.** O funil `DESAFIO_ADULTO` foi registrado depois da Comunidade adulta. Os dois nomes estão em `.railway/variables.ts`, e a oferta e o Termo entraram no sitemap.
- **E-mails do adulto.** São oito templates `-adult` no Messaging, com as mesmas variáveis do Kids, falando com a própria pessoa:
  - o funil manda `challenge-access-approved-adult` (e-mail e WhatsApp), com a data final, e cai no `welcome`/`new-access` enquanto o seed não roda;
  - o members manda os avisos de ativação, início, Dia 1, conclusão, 7 dias, 3 dias e fim;
  - o "mais forte" de cada público é a chave-mestra dele, `all_courses` no adulto.
- **Telas.**
  - O jogo e os blocos são os mesmos do Kids, porque o projeto final e os blocos adultos são idênticos. Por isso as legendas perderam "versão Kids".
  - A página do Caderno agora é a do PDF adulto (página 18, `/img/desafio-adulto/farol-caderno.png`).

## O que ainda falta

- **Curso adulto:** precisa estar importado e publicado no ambiente.
- **Os 4 passos da aula:** ainda são telas do Kids, com a nota dizendo isso. A troca depende de duas coisas:
  - o curso adulto publicado em staging;
  - uma conta adulta de teste com os cookies exportados, para um script de captura no molde do `captura-telas-kids.ts`.
- **Deploy:** o build do Railway estava fora do ar em 21/10/2026. O deploy de staging sai quando ele voltar. Antes de qualquer aviso adulto sair, o `templates:seed` do Messaging roda no deploy dele.

## Espelhos e testes

- Espelhos da copy: `bun scripts/espelho-copy-desafio.ts` gera os arquivos em `copy/pagina-9-a-17.md`, `copy/pagina-menor-9.md` e `copy/pagina-adulto.md`.
- Testes:
  - `tests/unit/desafio-offer-copy.test.ts`;
  - `tests/unit/comunidade-offer-css.test.ts`;
  - `tests/unit/desafio-quiz.test.ts`;
  - o browser `tests/browser/desafio-farol.ts`;
  - no Members, `tests/application/grant.test.ts`, `tests/unit/challenge-lifecycle.test.ts`, `tests/unit/renewal-reminder.test.ts` e, com banco, `tests/db/challenge-lifecycle.repository.test.ts` e `tests/db/renewal-reminder.repository.test.ts`;
  - no Messaging, `tests/challenge-adult-copy.test.ts`;
  - no funil, `tests/unit/welcome-email.test.ts`.
