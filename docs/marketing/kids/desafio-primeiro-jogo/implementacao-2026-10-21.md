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
| `/pro/desafio-primeiro-jogo/oferta` | adultos, tema arcade (`DesafioAdultoBody`, funil novo); entra no ar com a variável do Railway |

As antigas `/oferta/tempo-de-tela`, `/oferta/iniciacao-tecnologica` e `/oferta/primeiro-jogo` fazem 301 para `/oferta`, mantendo a query (atribuição e cupom).

O quiz do Desafio virou `desafio-farol-v4`:
- a pergunta de idade ganhou "15 a 17" e "18 ou mais";
- todo resultado leva à mesma `/oferta`;
- quem marca menos de 9 recebe o link da página "criar junto", e quem marca 18 ou mais recebe o da página adulta assim que ela estiver no ar.

O quiz antigo continua legível pela regra de versão.

O Termo Kids subiu para `desafio-2026-10-21`. Ele passou a dizer que a criança menor de 9 usa o Desafio junto com o responsável. O adulto tem Termo próprio (`desafio-adulto-2026-10-21`).

## Peças fora do funil

- **Catálogo:** o seed cria o produto `desafio-primeiro-jogo-adulto`, um curso com o mesmo `courseRef`. Também cria a oferta `desafio-primeiro-jogo-adulto-30-dias`:
  - 6700 centavos, `one_time`, `fixed`, 30 dias;
  - garantia de 7 dias, cupom aceito;
  - o Mural adulto completo como item.
- **Members:**
  - Depois dos 30 dias, quem comprou a oferta adulta fica com a visita permanente ao Mural adulto, como o Kids fica com a do Mural Kids.
  - Os avisos `challenge-*` de prazo e progresso continuam só no Kids, porque falam com o responsável e com a Área dos pais.
- **Funil:** quando o funil adulto for registrado, a env `FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO` passa a ser obrigatória, porque sem ela o funil não sobe. Ela já está no `.env.example`.

## O que ainda falta

- **Ativar a página adulta.** O funil adulto está pronto e testado, mas ainda não está registrado. Registrado sem a env `FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO`, o funil inteiro não sobe, e esta sessão não tem acesso ao Railway. A ordem é:
  1. criar a variável no painel do Railway, em staging e em produção, com o valor `desafio-primeiro-jogo-adulto-30-dias`;
  2. registrar `DESAFIO_ADULTO` no `FUNNELS`, depois da Comunidade adulta;
  3. declarar o nome em `.railway/variables.ts`;
  4. pôr a oferta e o Termo no sitemap;
  5. trocar o teste "pronto e fora do registro" pelo teste da ordem.

  Até lá, as rotas adultas dão 404, e a tela de idade do quiz Kids, para quem marca 18 ou mais, mostra a orientação genérica.
- **Curso adulto:** o curso adulto precisa estar importado e publicado no ambiente.
- **Comunicação do adulto:** o e-mail de boas-vindas com a data final e os avisos de prazo do adulto ainda não existem. Hoje o adulto recebe o boas-vindas genérico (`welcome`/`new-access`).
- **Telas do curso:** a página adulta usa as telas do curso Kids, com legenda dizendo isso. Elas devem ser trocadas por capturas da área adulta quando houver.

## Espelhos e testes

- Espelhos da copy: `bun scripts/espelho-copy-desafio.ts` gera os arquivos em `copy/pagina-9-a-17.md`, `copy/pagina-menor-9.md` e `copy/pagina-adulto.md`.
- Testes:
  - `tests/unit/desafio-offer-copy.test.ts`;
  - `tests/unit/comunidade-offer-css.test.ts`;
  - `tests/unit/desafio-quiz.test.ts`;
  - o browser `tests/browser/desafio-farol.ts`;
  - no Members, `tests/application/grant.test.ts`.
