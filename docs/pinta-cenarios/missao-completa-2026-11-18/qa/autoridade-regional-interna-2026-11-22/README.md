# Autoridade regional interna — 22/11/2026

Base: `e66cf7966e58eda2f4496525165878c6316fe9b3`.

## Implementação

O mecanismo existente de autoridade local foi parametrizado por uma política de
formato. Os exports públicos continuam selecionando o leitor nativo 0–7. A
política interna 8 reutiliza o mesmo CAS, origem de RAM, resolução de divergência,
lápides, cópias de lotes e orçamento, junto do IO físico 3 já preparado. Não há
outro banco ou implementação paralela de conflitos.

O clonador/importador comum preserva o tipo de células ao criar IDs e religar
referências. Uma cópia regional conserva extensão assinada, camadas e chunks.
Validar o candidato não troca a origem causal por uma leitura recente: o teste
faz a observação avançar e verifica que a RAM antiga ainda vira cópia.

O espelho regional é uma referência de cinco campos: tipo, versão, capacidade,
ID e revisão. Não duplica índices ou artes; o documento autoritativo e seus
chunks permanecem a fonte única. A referência só resolve contra a mesma revisão
da autoridade. Referência órfã, divergente ou com campos futuros recusa a leitura;
um espelho legado com conteúdo ainda pode ser recuperado como cópia independente.
Formatos antigos conservam seus espelhos completos e sua política anterior.

A quota é calculada para toda a galeria conhecida na transação, pelo encoder
real e pelos tetos de JSON/buffers do arquivo 8. Se a galeria já exceder um teto,
uma exclusão estrita de documentos inalterados continua possível. Um lote que
também altera os remanescentes não ganha essa exceção. Registros futuros opacos
ficam conservados e sujeitos às proteções de consumidores desconhecidos; isso
não mede o tamanho de um formato que o leitor não entende.

## Revisão e risco corrigido

A revisão reproduziu um uso indevido do cache numérico do editor na persistência.
Se um chamador reutilizasse objetos e alterasse seus chunks, um resumo antigo
podia aceitar seis mapas cujo backup real ultrapassava 32 MiB. A reprodução
negativa fica em `region-authority-mutable-red.log.gz`. O medidor da persistência
agora nasce por transação: compartilha resumos apenas durante aquela conferência.
O cache por identidade do editor mantém seu contrato de revisões imutáveis.

Essa escolha privilegia a correção na fronteira mutável. Não demonstra uma meta
de latência: a quota ainda visita o inventário, e o IO ainda lê os chunks do
documento. Medição e otimização incremental precisam respeitar revisões causais,
sem usar horário ou identidade mutável como prova de conteúdo inalterado.

As primeiras checagens de tipos detectaram duas fixtures insuficientemente
estreitadas e um objeto negativo com campo extra construído diretamente no
argumento. Foram corrigidas com guardas e uma variável de entrada inválida,
sem casts de mapas fictícios ou relaxamento da validação. Lint detectou uma
variável de QA sem tipo e outra sem uso, ambas corrigidas.

## Evidências

- Suíte final: **2.709 aprovados, zero falhas/omissões**, 35.249 asserções,
  249 arquivos, 179,43 s, incluindo três controles Pygame reais com vídeo `dummy`.
- Focados: **72 aprovados**, 282 asserções, cinco arquivos. Dez regressões novas,
  incluindo a falha reproduzida do cache mutável e o controle de exclusão para
  liberar espaço em galeria já acima do teto.
- Chromium: **33 aprovados sem retry**, em desktop e CPU 4× emulada. Quatro
  provas da autoridade regional, oito do IO regional e 21 controles anteriores.
  A autoridade e a referência compacta usam o IndexedDB real. O fluxo completo
  de um chunk alterado grava três registros: cabeçalho, chunk e referência.
  CAS preserva ambas as versões; falha no segundo put aborta a recuperação inteira.
- Tipos completos do Pinta/Estúdio, lint dos sete arquivos e whitespace aprovados.

A primeira suíte passou 2.708 casos antes da revisão do cache mutável. O defeito
foi reproduzido separadamente, corrigido e a suíte inteira foi repetida; ambos
os recibos ficam preservados. Os recibos/hashes estão em `index.json`.

## Alcance

Este lote liga o domínio interno ao IO real no laboratório; a fábrica pública
`createPintaPersistence`, galeria/host e transporte ainda não selecionam formato
8. A integração da aplicação e o inventário parcial da nuvem continuam no plano.
Não declarar edição pública regional, rollout ou compatibilidade com motores
externos a partir dessas provas. Nativo público 7, físico 2, cena 3/PNG 4 e nuvem
6 permanecem ativos. Sem alteração de identidade visual ou funcionalidade 3D.
