# Perfil infantil e curso Kids por padrão

## Objetivo

Explicar por que um perfil com 18 anos completos não pode ser criado e fazer o formulário de
novo curso do Admin começar na plataforma Kids.

## Regra de idade

- O cadastro aceita apenas crianças com menos de 18 anos na data da criação.
- O Auth calcula a idade por ano, mês e dia. Uma pessoa com 18 anos completos já fica fora da
  faixa; uma pessoa com 17 anos continua aceita.
- Um perfil válido não perde acesso quando completa 18 anos. Enviar novamente a mesma data de
  nascimento ao editar nome ou visibilidade vira um no-op e não revalida a idade atual.
- Trocar a data de um perfil por uma data que represente 18 anos ou mais continua proibido.

O Auth devolve um código específico, `PROFILE_AGE_RESTRICTED`, com HTTP 400. O BFF preserva esse
envelope. A tela reconhece o código e também valida o campo antes do envio, sem depender apenas do
texto retornado pelo servidor.

## Mensagem aos responsáveis

O campo mostra que a comunidade atende crianças menores de 18 anos. Quando a data estiver fora da
faixa, a tela explica o bloqueio e orienta o responsável:

> Esta comunidade é para crianças menores de 18 anos. Para conhecer nossa comunidade para adultos,
> fale com a gente no Instagram @criecomhelenaejulio.

O nome do Instagram será um link para `https://www.instagram.com/criecomhelenaejulio/`.

## Novo curso no Admin

O estado inicial do formulário muda de `adult` para `kids`. Cursos existentes preservam a
audiência recebida da API, e o fallback de compatibilidade para registros antigos continua
`adult`. O default do endpoint do Members também continua `adult`; a mudança vale apenas para o
fluxo de criação no Admin e não altera integrações antigas.

## Verificação

- Testes de domínio para 17 anos, 18 anos e data inalterada de um perfil que envelheceu.
- Teste HTTP para o código `PROFILE_AGE_RESTRICTED`.
- Teste do formulário para a mensagem amigável, o link do Instagram e o bloqueio antes do envio.
- Teste do formulário de curso para o padrão Kids.
- Typecheck, Biome, testes dos pacotes afetados e builds dos dois aplicativos alterados.
