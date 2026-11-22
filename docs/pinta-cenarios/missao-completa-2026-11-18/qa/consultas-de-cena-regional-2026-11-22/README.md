# Consultas da cena regional — 22/11/2026

Base `b29f25237`. `createRegionSceneQueries` prepara um contexto para um
snapshot imutável de cena 4 já admitido. Reutiliza o leitor compartilhado do
Core, com índices por grade em WeakMap pertencente ao contexto. A visão contém
funções: não é documento serializável, loader, capacidade publicada ou validação
de conta. Outro snapshot exige outro contexto.

Objetos, início, consulta pontual, movimento e geometria continuam nos núcleos
existentes. A consulta de corpo visita células armazenadas em ordem global,
recortadas pelos bounds assinados; não cria uma matriz da extensão do mundo.
Conjuntos descontam sua própria origem antes de aplicar escala, giro e reflexos;
a consulta inversa soma essa origem. Conserva offsets de grupos, geometrias,
IDs derivados e referências de propriedades locais.

## Revisão e correções

O probe arquivado no lote anterior tinha uma expectativa incorreta para o
início padrão: expandir um mundo à esquerda não deve deslocar o início `(8, 8)`
se ele continua válido. Preservamos o recibo anterior. O probe v2 usa um mundo
inteiramente negativo para o caso de fallback e acrescenta um controle de
expansão que mantém `(8, 8)`. São cinco lacunas do consumidor privado anterior
e um controle positivo; agora os seis resultados conferem. Marcadores autorais
não são limitados ou movidos silenciosamente. Não era defeito em jogos
publicados: esses consumidores anteriores não declaravam cena 4.

A primeira geração portátil excedeu os tetos dos motores. O gerador captura
as mesmas funções antes do build e encurta identificadores locais numa closure
controlada, com aliases explícitos da API. Não houve aumento de orçamento ou
nova dependência. A fonte passa de 12.881 caracteres na base para 10.171, mesmo
incluindo a nova consulta regional; o Jogo 2D completo mede 391.828 e o Avançado
433.734, abaixo de seus tetos. Tempos de compilação no recibo foram coletados
sob carga e não qualificam desempenho. O gerador mantém a guarda contra
templates e seu `--check`; a CI e este laboratório usam Bun 1.3.11.

A primeira fixture de navegador tentou pintar um grupo, em vez de uma camada
de peças. A operação recusou corretamente a edição. A fixture agora encontra
a camada e exige uma mudança real antes de exportar; as expectativas de
colisão foram mantidas. Flags opcionais das fixtures também seguem o contrato
estrito (`true` ou ausência), sem afrouxar o leitor.

## Evidências

- 50 testes focados de consulta, geometria e plataformas, 17.777 asserções.
  Incluem origens fora da divisão de 32, grupos, offsets fracionários,
  contato, formas, giros, reflexos, pouso, gravidade invertida e movimento.
- 18.560 comparações com os módulos da base em 64 cenas legadas da Vila/Cabana:
  consultas, objetos, início, movimento e funções portáteis idênticos em JSON.
- Mundo 10.000² com um chunk: consulta de toda a extensão lê no máximo 1.025
  índices armazenados nesta prova, conserva o chunk e reutiliza o mesmo índice
  no contexto. Não é medição de heap total, carregamento sob demanda ou fluidez.
- 3.241 testes completos Core, 211.020 asserções, 203 arquivos.
- 2.748 testes completos Pinta, 35.621 asserções, 255 arquivos, 219,11 s,
  incluindo quatro controles reais de Pygame; executados sem outro job pesado
  desta sessão. Zero falhas/omissões nas duas suítes.
- 44 testes dos dois motores e seus caminhos de host, 6.338 asserções,
  incluindo os tetos e a conservação do programa após compactação.
- 85 ensaios Chromium sem retry: 63 da matriz regional/persistência,
  12 Pinta–Estúdio e dez Phaser real, com desktop, toque emulado e CPU 4×
  nas matrizes indicadas pelos relatórios. Uma só máquina física.
- A Vila expandida reabre seu PNG de dados 5 em outra página: 4.095 comparações
  por perfil, colisão e varredura em peça negativa, objetos/início conservados,
  contexto portátil igual e leitor público anterior ainda recusando cena 4.
- Tipos completos Core/Pinta/Estúdio, lint dos oito arquivos, whitespace e
  verificadores oficiais dos gerados JavaScript/Python aprovados. O gerado
  Python não mudou.

## Limites e sequência

`physics` não é escolhido por estes métodos geométricos. A física de cena 4
migrada precisa conservar a interpretação legada; o raster atual de colisões
do player JavaScript ainda deve ser substituído por consultas orçadas. Este
lote não aceita cena 4 no player público, não carrega mundos PNG 5 completos e
não integra gameplay regional no Python. Os ensaios de Estúdio/Phaser são
regressões dos formatos atuais, não homologação regional nesses motores.

Seguir aos adaptadores, inclusive Python/Pygame e suas extensões, antes de
promover nativo 8, físico 3, cena 4 ou dados PNG 5. A proteção do inventário
parcial de nuvem, IO sob demanda e as demais etapas macro continuam abertas.
Sem alteração de CSS/identidade, funcional 3D, implantação ou merge em staging.
