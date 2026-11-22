# Leitura regional compartilhada — 22/11/2026

Base `446aea7c0`. O leitor de células esparsas que já atendia ao Pinta passou
para `core/creations/pinta-region-reader.ts`. O módulo do editor reexporta as
mesmas funções e mantém as operações de edição no pacote Pinta. Chaves, ordem
e índice em memória também são compartilhados pelos mutadores, sem outra
implementação paralela. Não são chaves físicas de persistência ou de contas.

A entrada continua sendo uma grade imutável admitida na fronteira nativa.
O leitor não substitui validação de formato, metadados, bounds e orçamento.
Cada contexto mantém seu próprio índice; não há cache global que retenha os
documentos/histórico. Consulta pontual conserva a célula inteira, incluindo
flags; visita por chunks ou ordem global conserva cobertura e ordem anteriores.
As regiões vazias não são materializadas. Nada muda no IO, salvamento ou formato.

## Revisão e provas

- **16.384 consultas e 512 comparações de visita** com o módulo do commit base,
  incluindo ambas as ordens e 32 padrões determinísticos. Valores, posições e
  sequência idênticos. Editor e Core usam as mesmas funções, não uma cópia.
- Cinco testes diretos do Core com **33.826 asserções**. Consulta de cada célula
  assinada é conferida com uma referência densa independente; bordas, vazios,
  oito flags, recortes, geometria inválida e buffers de documentos separados.
- Interop com o codec real: duas regiões em um mundo 10.000² mantêm somente
  4 KiB de índices. Isso mede armazenamento dos índices, não heap total ou
  abertura sob demanda.
- **34 focados**, 34.215 asserções, cinco arquivos, incluindo edição imutável,
  contador/orçamento de células e 192 comparações RGBA da cena regional.
- **3.227 testes completos do Core**, 194.231 asserções, 202 arquivos.
- **2.748 testes completos do Pinta**, 35.614 asserções, 255 arquivos,
  209,13 s. Zero falhas/omissões, incluindo quatro controles Pygame reais.
- **73 ensaios Chromium sem retry**, 61 da matriz de persistência e 12
  Pinta–Estúdio; tipos completos Core/Pinta/Estúdio, lint e whitespace aprovados.

A inspeção do consumidor encontrou o próximo cuidado: `mapTwoDSource` ainda
aceita 1–3 e cria `rows × cols` para colisões. Simplesmente admitir cena 4
materializaria o mundo vazio e também ativaria física precisa indevidamente
nos mapas migrados. O próximo lote deve usar a leitura compartilhada, preservar
o modo de física explícito e descontar a origem de cada definição/conjunto.
O compositor Python é gerado de `pinta/src/export/pygameProject.ts`; não manter
outra lógica à mão no trecho gerado do `pinta.py`.

O probe do próximo consumidor usa cenas 4 admitidas no Core e mantém controles
positivos densos: reproduz cinco lacunas nas funções de consulta anteriores
(peça ocupada, vazio negativo, corpo sobre peça, início padrão e origem do
conjunto). Esses módulos ainda não declaram cena 4 e o player público a recusa;
o probe não é um defeito anunciado em jogos publicados nem uma integração já
corrigida neste lote. Seus casos orientam o próximo trabalho.

Não há runtime regional de jogo, seleção pública 8, nova capacidade, implantação,
mudança de identidade visual ou funcional 3D neste lote. Não fecha item 4 ou
as etapas macro. Seguir aos consumidores de consulta/geometria e aos motores.
