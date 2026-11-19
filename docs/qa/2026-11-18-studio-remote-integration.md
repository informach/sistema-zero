# Integração dos contratos remotos de cenas

## Referências e isolamento

A branch da missão recebeu origin/staging em bfb24122c (45 commits adicionais
sobre a referência anterior). Merge sem conflitos, somente na worktree isolada.
Nenhuma alteração autoral em Pinta/Molda ou na árvore compartilhada original.
Isso não significa revisão completa dos 538 arquivos de outras frentes.

## Pontos do Estúdio conferidos

- A geometria afim dos conjuntos 2D agora vem do contrato canônico compartilhado.
  O runtime declara a aproximação de colisão por grade para giros livres.
- O trecho do cenário continua lazy e condicionado ao uso da API; jogos dos cursos
  sem cenário conservam o motor anterior. Os tetos absolutos não aumentaram.
- O módulo Python consome a mesma cena portátil, com testes de geometria e pixels.
- Novos fluxos reais do Pinta/Phaser ficaram em configs próprias. A CI da missão
  agora os executa em uma shard Linux, sem retirar os testes Chromium completos.

## Evidência local

- Adaptador map-2d: 23 testes, 6248 asserções, zero falhas.
- Contratos Pinta no core: 10 testes, 147 asserções, zero falhas.
- Playwright pinta-scenes: quatro fluxos, desktop/toque emulado, todos aprovados em 21,6 s.
  Exercitam importar/editar/desfazer/refazer/reabrir, renderização Phaser,
  deslocamento, colisões e portas. Não são prova de streaming de mundos grandes.
- Pygame-ce real 2.5.7, SDL 2.32.10, Python 3.13.17, ambiente virtual isolado:
  `test-pinta-module.py` aprovou; não foi instalado pygame globalmente.
- Modo de lógica pura: 46 conferências aprovadas, identificado como tal.
- Geradores de cena Python e transformação geométrica: --check aprovados.
- Typecheck após a integração: aprovado.

## Fingerprint e CI

O verificador canônico reproduziu a recusa de fingerprint desatualizado após os
novos fontes compartilhados. gen:validation-profile atualizou somente o JSON do
perfil; os contratos gerados permaneceram iguais. check:validation-profile passou.
A imagem hospedada precisa ser reconstruída e qualificada no novo SHA.

O run 44397955661 refere-se ao SHA 69901bd64, ANTERIOR a esta integração.
No Windows, seu teste de aborto preservou todas as 12 revisões no Chromium e
no WebKit, conforme artefatos baixados sem modificar os números. O subprocesso
atingiu o limite de 55 s durante o fechamento do WebKit. O job continua reprovado;
nenhum prazo foi aumentado. Foram acrescentados tempos por fase ao medidor,
para separar custo de recuperação de encerramento do navegador na próxima CI.
Os três ensaios locais de repetição e a CI devem ser revistos antes do aceite.

A missão global e a homologação de hardware continuam abertas.


## Snapshot remoto adicional 200fd35c7

Durante a qualificação, staging publicou um novo contrato de objetos estáticos
e metadados do Molda Cenários. O snapshot 200fd35c7 também foi integrado sem
conflitos na worktree isolada. Não contém alterações nos fontes do Estúdio ou
no core/studio. O lockfile mudou apenas para declarar a dependência workspace
entre Molda Cenários Core e core; bun install --frozen-lockfile passou.

Passaram 12 testes do contrato/fonte/propriedades (49 asserções), seis testes
de metadados/objeto estático (34 asserções) e o typecheck do Estúdio após esse
snapshot. Esses testes foram incluídos no CI da missão. Não são evidência de
que o Estúdio já executa o novo pacote compilado em um jogo real: a etapa 8 e
sua homologação integrada continuam abertas. Nenhum formato foi modificado
unilateralmente por esta sessão.


## Snapshot adicional 2ab6ff947

Integrados 13 commits remotos adicionais, mantendo as frentes de Pinta/Molda sem
edições autorais desta sessão. Há recursos e referências versionadas de cenário,
consultas nos motores e atualização de artes vinculadas no Estúdio. O conflito
no fingerprint gerado foi resolvido pelo gerador canônico sobre os fontes
integrados; check:validation-profile passou. Não foi escolhido um hash antigo.

Qualificação local: 31 testes de mapas/orçamento, 6292 asserções; dez contratos
Pinta no core, 155 asserções; 43 contratos pedagógicos, 192 asserções; 14 fluxos
de cenas e dois fluxos do Estúdio real com Pinta; módulo Pygame-ce real e gerador
Python de cenas aprovados. Typecheck aprovado; bundle inicial 368.465 bytes crus,
119.712 gzip e as mesmas guardas (31 asserções). Não houve aumento de orçamento
da lista ou do motor sem cenário. O teto absoluto do motor completo permaneceu
437.900/426.000; o fragmento de mapas foi ampliado pela frente produtora para
15.500, com medição de 15.138 e consultas/recursos adicionais, sem entrar no
caminho de jogos sem cena. A CI do novo snapshot e demais aceites continuam
necessários; não se declara homologação de mundos grandes a partir desses casos.
