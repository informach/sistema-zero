# Ativação da nova Jornada do Criador — 26/10/2026

A usuária confirmou a substituição da configuração antiga pela proposta de pares 2D/3D,
missões, Poderes, extras e Maestrias em Kids e adultos. Antes da operação, as quatro políticas
(dois públicos em dois ambientes) eram versão 1 e não continham `curriculum`.

## Fonte e operação

Manifesto: `packages/members/src/infrastructure/config/creator-journey-curriculum.json`.
SHA-256: `b148a2d47c9524b47838725ec5cd5f18e6161cfa37614af9bf7316b6f56e3601`.
Members staging: `b2cf04e94ded79463752099123c390c6dcf1f444`.
Members produção: `6000391444d24d38e4b88236ecd9f62a77c428fe`.

O CLI `seed-creator-journey.ts plan/apply` foi executado nos containers correspondentes,
conferindo projeto, ambiente, SHA da aplicação e hash editorial. A conexão foi explicitamente
passada como `CREATOR_JOURNEY_DATABASE_URL`; nenhuma credencial foi escrita no relatório.
O nome exato do banco foi confirmado pelo operador antes do apply.

As políticas foram publicadas pelas rotas autenticadas normais do Admin. Kids passou por
preview, preparação, captura da coorte, avanço até `ready` e publicação com versão e hashes
conferidos. O ator foi derivado da sessão pela API, não fabricado pelo operador. Adultos
passou pelo configure versionado, com captura dos direitos anteriores na mesma transação.

## Resultados

| Ambiente | Cursos novos em rascunho | Cursos reutilizados | Perfis Kids preparados | Kids | Adultos |
|---|---:|---:|---:|---|---|
| Staging | 288 | 6 | 5 | v2 publicada | v2 publicada |
| Produção | 290 | 4 | 13 | v2 publicada | v2 publicada |

Cada público tem sete pares 2D/3D, sete missões, 34 Poderes, 20 extras e seis áreas de Maestria.
Cada área possui três níveis. Após o apply, o plan retornou zero criações e 294 cursos
preservados em cada ambiente. As diferenças de reutilização refletem os catálogos existentes;
os UUIDs reais foram resolvidos separadamente por ambiente e público.

Os previews não encontraram bloqueios de integridade. Os avisos eram de curso ainda não
publicado: 142 referências Kids em staging e 143 em produção. Não foram convertidos em
aulas prontas: novos cursos/aulas continuam em rascunho, com os gates editoriais normais.
Cursos anteriores, vídeos e conclusões não foram sobrescritos pelo seed. Os três campos
editoriais de encerramento apontados pelo relatório seguem revisão separada, não importação
automática de manifestos por cima do conteúdo remoto.

## Conferência da autoridade publicada

Leituras autenticadas retornaram HTTP 200, versão 2 e `curriculum` nos quatro casos. Os
hashes abaixo usam JSON canônico com chaves ordenadas e conferem exatamente com cada plano:

| Ambiente/público | SHA-256 do currículo |
|---|---|
| Staging Kids | `90268c3b93a80dcf43524f93a89c155046b27528f38fceba3983f6bb72cce87d` |
| Staging adulto | `0e5d525346d80e3d2fbfd4e416fed4b9be2f99a71b9ed5b54d8f45ff47c3f1e0` |
| Produção Kids | `0f5e9a31aad71a14859c1500c31d176ea5b91ef0fa94bf171db4fbd742248bc1` |
| Produção adulto | `979cfab03b1745a0a207b7f17e982ea39635c612680a0bd4e709d33c6b2f4590` |

Ao recarregar o Admin adulto de produção, a interface passou ao editor de currículo com
Poderes e Maestrias, sem alertas. A política histórica continua registrada para auditoria e
preservação; com `curriculum` presente ela não governa a nova progressão.

## Sequência 2D → 3D

Essa regra já está na projeção e na autorização compartilhadas: base 2D primeiro; conclusão
libera a base 3D do posto; o par completo abre missão, Poderes e extras. Promoção exige par,
missão e Poderes distintos. Acessos legitimamente conquistados continuam preservados.
Prova fresca: `bun test tests/creator-curriculum.test.ts`, em Core, 21 testes e 96 asserções,
sem falhas, incluindo bloqueio antes do 2D, desbloqueio após a conclusão, pausa e curso 3D
ainda em rascunho. A regra não depende de esconder um botão na interface.

Esta ativação não significa que os 294 cursos estejam produzidos ou publicados nem substitui
uma nova homologação de todos os percursos de aluno. Não houve concessão comercial, cobrança,
mensagem a cliente ou aprovação de Maestria por esta operação.
