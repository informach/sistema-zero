# Redesenho didático das 27 aulas

Redesenho didático completo das aulas dos três cursos de jogos (Desafio do Primeiro Jogo, Corre
Dino e O Jogo do Meu Jeito) para o formato de seções da plataforma.

**Relatório consolidado (documento para ler e comentar):**
https://claude.ai/code/artifact/2a29a025-3a65-4c66-858b-afefacaa34df

## O resultado

Contado nos manifestos em 20/09/2026, não na proposta original.

| Curso | Aulas | Seções hoje | Propostas | Clipes hoje | Propostos |
|---|---:|---:|---:|---:|---:|
| Desafio do Primeiro Jogo | 6 | 78 | 56 | 61 | 46 |
| Corre, Dino! | 13 | 127 | 91 | 86 | 72 |
| O Jogo do Meu Jeito | 8 | 76 | 56 | 55 | 48 |
| **Total** | **27** | **281** | **203** | **202** | **166** |

As 11 cenas novas foram construídas e os defeitos do catálogo, corrigidos: o catálogo foi de 45
para **56 cenas**. Os 27 manifestos usam 53 experimentações e passam no validador, sem nenhuma aula
esperando cena. As contagens da tabela vêm dos arquivos importáveis; foram conferidas novamente na
revisão didática de 20/09/2026.

## O que tem nesta pasta

| Arquivo | O que é |
|---|---|
| `BRIEFING.md` | A doutrina que governa o redesenho. Os dois eixos, as seis perguntas por conceito, o critério de experimentação contra demonstração, as regras de seção e as regras de língua herdadas. **Leia antes de mexer em qualquer aula.** |
| `CATALOGO-CENAS.json` | As **56 cenas** que existem hoje, extraídas do código da plataforma, com título, o que manipulam, metas, pistas e roteiro de demonstração |
| `REFERENCIA-PLATAFORMA.md` | **Onde cada coisa está na plataforma hoje**, lido direto do código, com a fonte citada por linha: o menu da esquerda, o recolhimento dele na aula e na ferramenta, a cor do perfil, as três ações de plataforma, os grupos do menu ⋯ do Estúdio, a lista de projetos e o Pinta. Toda fala que nomeie menu, tela ou botão confere aqui |
| `REFERENCIA-BLOCOS-JOGO-2D.json` | Os **285 tipos** da paleta do Jogo 2D, extraídos do código: família, seção, todas as linhas do rótulo, cada campo com o padrão de fábrica e a lista de cada menu na ordem da tela |
| `ESPEC-ROTEIRO.md` | O contrato do roteiro de gravação: o par de nota de produção e fala em parágrafos separados, a regra do caminho completo, o que não existe mais (botão de play, exercício de pausa) e o vocabulário travado |
| `ACHADOS-TRANSVERSAIS.md` | Os defeitos encontrados durante a análise que **não** são redesenho: critérios que reprovam quem faz certo, passo perdido, rótulos vencidos, seções duplicadas, documentação desatualizada |
| `ESPEC-MANIFESTO.md` | O contrato do `manifesto.json`: schema real do importador, a regra das duas colunas do player, a convenção do título de vídeo e a fila de dependência entre cena e aula |
| `aulas/` | O **trio de cada aula**: a proposta (`{slug}.md`), o manifesto importável (`{slug}.manifesto.json`) e o roteiro de gravação (`{slug}.roteiro.md`). Os três arquivos estão completos nas 27 aulas |
| `cenas/` | **O material para corrigir as cenas antes de mexer nas aulas.** As 11 cenas novas com especificação completa, e os ajustes das 28 cenas existentes, tudo organizado por cena e não por aula. Comece pelo `RELATORIO-CENAS.md` |

## Como ler uma análise de aula

Cada arquivo em `aulas/` segue a mesma estrutura:

1. **Resumo.** Estado de entrada, vitória do dia, seções e clipes antes e depois.
2. **Triagem dos conceitos.** Todo conceito que a aula ensina, incluindo os que NÃO ganham cena, com a justificativa de cada decisão.
3. **Diagnóstico do desenho atual.** O que está errado hoje, com as seções citadas pelo título.
4. **Proposta final.** Seção por seção, com intenção, motivo de existir, critério de conclusão e os blocos com seu conteúdo.
5. **Experiências e demonstrações.** Cada cena, dizendo se existe e serve, existe e precisa de ajuste (qual e por quê) ou precisa ser criada (especificação completa).
6. **Vídeos.** Tabela com chave, o que mostra, origem, duração alvo e se reaproveita gravação.
7. **Continuidade.** O que a aula assume da anterior, o que entrega para a seguinte e os valores canônicos.

A aula de referência é `aulas/desafio-dia-1.md`, escrita primeiro como padrão para as outras 26.

## Os manifestos

Cada aula tem, ao lado do relatório, um `aulas/{slug}.manifesto.json` pronto para importar no admin
pela função "Importar roteiro com seções". Eles seguem o mesmo formato dos manifestos v6, na versão
4, com as seções novas do redesenho.

Três coisas que o formato impôs ao desenho, e estão explicadas no `ESPEC-MANIFESTO.md`:

1. **A coluna da direita é do player, não do manifesto.** Só cena nativa e Estúdio ou Pinta
   embarcado vão para lá, e só um por seção. Pergunta curta e experiência em HTML ficam à esquerda.
   Várias seções precisaram virar duas por causa disso, e cada caso está registrado no relatório da
   aula.
2. **O formato não tem campo de título de vídeo.** A convenção travada é que a primeira linha do
   bloco de vídeo planejado é `Título: <nome>`, seguida de linha em branco e das instruções de
   produção.
3. **A fala do Zappy tem teto de 400 caracteres.** Falas mais longas viraram duas.

### Conferir os manifestos

```bash
cd C:\Users\tocha\projects\sistema-zero && bun docs/aulas-interativas/qa/validar-manifestos.ts
```

O validador usa o `isLearningManifest` real do core, o mesmo que o importador usa, e separa três
resultados: `OK`, `FALHA` (com a causa apontada campo a campo) e `AGUARDA`, que é a aula esperando
uma cena ainda não construída. A lista de `AGUARDA` é a fila de dependência entre a implementação
das cenas e a importação das aulas.

## Ordem de execução recomendada

Tudo em staging. A promoção para produção fica para depois de as aulas estarem redondas.

1. ~~Corrigir os defeitos do catálogo de cenas~~ feito
2. ~~Construir as duas ações novas do motor e as 11 cenas novas~~ feito, catálogo em 56
3. ~~Escrever os 27 manifestos~~ feito, os 27 passam no validador
4. ~~Escrever os roteiros de gravação~~ feito, 27 roteiros e 166 clipes
5. Consertar o que quebra hoje, e o que a plataforma aposentou (ver `ACHADOS-TRANSVERSAIS.md`)
6. Gravar os 166 clipes

Por curso: Desafio primeiro (tem aluno pagando), depois Meu Jeito (mais barato e o que mais
melhora), depois Corre Dino (o maior).

## A regra do trio

Cada aula tem três arquivos, e eles descrevem a mesma aula de três ângulos: a proposta diz o porquê,
o manifesto diz a estrutura, o roteiro diz a fala. **Mudou num, muda nos três.** Tirar um bloco do
manifesto sem tirar o clipe do roteiro deixa a gravação com um trecho órfão; corrigir a fala sem
corrigir a proposta faz o próximo leitor reabrir a decisão já tomada.

A lista do que obriga varredura nos três está na seção 9 do `ESPEC-MANIFESTO.md`.

## Cópia versionada

Este material também está em `sistema-zero/docs/aulas-interativas/`, sob controle de versão. Os
arquivos de `aulas/` nas duas pastas devem continuar iguais. O validador de manifestos do repositório
lê apenas a cópia versionada; o validador de roteiros (`python -X utf8 validar-roteiros.py`) funciona
em ambas as pastas.
