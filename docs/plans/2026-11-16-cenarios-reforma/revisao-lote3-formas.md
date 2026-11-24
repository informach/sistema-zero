# Lote 3 — Formas de rascunho

17/11/2026, `staging`, continuação de `531a49ee2`. **O lote 3 e a parte 3.3 continuam abertos: cor e textura por objeto ainda faltam.**

## Implementado

- Caixa, rampa, escada e cilindro pelo botão **Blocos**, na aba Objetos. Dimensões, degraus e lados limitados, em metros; diálogo no padrão existente do Molda.
- Definições autorais na tabela opcional `formas` do documento v2 e comandos `forma.definir`/`forma.remover`. Não criam arquivos, hashes GLB, bibliotecas ou licenças fictícias. A referência da instância identifica uma definição de biblioteca ou de rascunho, sem ambiguidade permitida entre as tabelas.
- Um gerador puro fornece posições, normais, UVs em metros e índices para o palco e para os exportadores futuros. Rampa e escada sobem em +Z; pivô na base. A escada usa um perfil triangulado, sem sobreposição de caixas, faces internas ou junções em T. O cilindro fecha a costura e usa UV lateral contínuo.
- Mesmas formas e medidas alimentam seleção, volumes, encaixes, espelho, transformações e escolha de colisão por malha. O teste jogável com cápsula ainda não foi implementado; os testes atuais de colisão consultam as malhas.
- Definições geométricas iguais compartilham recursos no palco, independentemente do nome/ID. Retirar a última instância libera sua geometria e material da GPU, ainda que a definição continue na autoria/histórico.
- Histórico e bloqueios preservados, inclusive ao desfazer mudanças de forma em objetos/grupos trancados. Modelos da biblioteca continuam pelo fluxo anterior.

## Verificação

| Grupo | Testes | Asserções |
|---|---:|---:|
| Núcleo | 74 | 358 |
| Motor | 31 | 490 |
| Oficina e hosts | 39 | 261 |
| Members: serviço, histórico e HTTP | 42 | 160 |
| Postgres descartável, DDL real | 18 | 134 |

Nenhuma falha. Tipagem dos três pacotes do editor e Members aprovada; Members verificado sequencialmente com heap de 6 GB. Biome dos arquivos alterados e conferência do diff aprovados.

As provas geométricas conferem bordas fechadas com orientações opostas, volume sólido, medidas exatas da malha, normais finitas, limites e altura real sobre rampa/degraus. Os testes do serviço e do Postgres confirmam gravação, cópia e undo sem blobs; também verificam espelho e contato local após o JSONB.

`verificar-formas.mjs` exercita a interface real em Chrome: claro/escuro em 1440 px e escuro em 390 px. Cria as quatro formas, ajusta posições, espelha, cancela, desfaz/refaz, apaga/restaura e reabre. Nenhum modelo GLB ou biblioteca, erro de página ou transbordamento horizontal. Capturas inspecionadas na vista livre e lateral. Ambiente estreito emulado, sem alegação de teste em dispositivo físico.

O ensaio descobriu e corrigiu o passo numérico dos campos do diálogo, que bloqueava o envio pela validação nativa. Também foi explicitado o nome acessível do seletor de forma. O teste respeita o recolhimento do painel em tela estreita, sem forçar cliques através dele.

Evidências: [evidencias/lote3-formas](evidencias/lote3-formas). São formas de rascunho, sem aprovação artística da Faísca.

## Continuidade

Na publicação deste recorte, a staging remota recebeu `29c2ab43c` e `9946171a9`, núcleos puros adiantados por outra sessão a pedido da usuária. O commit local de formas foi reaplicado sobre eles sem conflitos. A verificação integrada do núcleo passou com **104 testes / 3.160 asserções**, além da tipagem. Esses módulos continuam isolados, sem exportação no índice ou ligação à oficina, conforme [seu registro](adiantamento-nucleo-lotes-4-5-6.md); não representam conclusão ou início formal dos lotes seguintes nesta execução.

Seguir pela cor e textura por objeto na parte 3.3. Depois, continuar árvore/camadas/laço/área de transferência, espalhar, conjuntos vivos, retratos de revisão, otimizações e Testar. Nenhuma ferramenta dos lotes 4–10 foi iniciada. Validação de implantação continua reservada ao encerramento global.
