# Baú animado em Rive

## Objetivo

Dar ao baú liberado da trilha uma animação de abertura que pareça uma reação do
próprio botão, sem trocar a regra de recompensa nem deixar a criança diante de
um ícone ausente quando animação, rede ou preferência do aparelho falharem.

## Decisão

Usaremos **um único `.riv`** com um artboard e uma máquina de estados. O SVG
inline atual permanece como primeiro quadro, fallback e visual de movimento
reduzido. Não haverá três arquivos, nem atraso temporizado no React.

O arquivo será configurado pela variável de build
`NEXT_PUBLIC_KIDS_CHEST_RIVE_URL`. Enquanto ela estiver vazia, o comportamento
visual atual continua integralmente em produção, sem pedido HTTP para um arquivo
inexistente. Quando o arquivo estiver pronto, ele pode ser publicado no R2
público e a variável recebe sua URL HTTPS no deploy.

## Contrato do arquivo entregue pelo Rive

O arquivo precisa conter:

- artboard `Chest`;
- máquina de estados `ChestState`, iniciando em `Closed`;
- trigger `open`, que leva de `Closed` para a animação one-shot `Opening`;
- estado terminal `Open`, sem repetir a abertura;
- a transição de `Opening` para `Open` sem condição adicional.

`Closed` pode ter um flutuar sutil em loop. `Opening` é one-shot; `Open` pode
ficar parado ou ter um idle calmo, mas nunca pode recomeçar `Opening` sozinho.

O runtime dispara `open` somente depois que o `POST .../chest/claim` responde
com sucesso. Ele escuta a entrada no estado `Open`; esse evento, e não uma
duração escrita no frontend, troca a UI para o baú aberto e mostra a recompensa.

## Fluxo e falhas

1. A criança clica no baú liberado; o botão fica indisponível enquanto o servidor
   confirma o resgate.
2. Erro ou corpo inválido preserva o baú fechado e reabilita o botão.
3. Sucesso com Rive já carregado dispara `open`; a entrada em `Open` conclui a
   interface e o diálogo de prêmio.
4. Sem Rive, em economia de dados, em movimento reduzido ou após falha do
   runtime, o SVG é a fonte visual: usa a animação CSS existente quando permitida
   e conclui pelo evento `animationend`; com movimento reduzido conclui
   imediatamente.
5. A resposta do servidor fica guardada até a conclusão visual. O servidor e o
   ledger continuam sendo a única autoridade para XP e moedas; a animação nunca
   concede nada.

## Critérios de aceite

- O texto do baú fica 2 px mais afastado do botão em todos os três estados.
- Não existe requisição de Rive enquanto a URL de configuração não existir.
- O SVG continua visível até o primeiro desenho do canvas e em toda falha.
- Um clique faz uma única requisição de claim.
- Depois do sucesso, a recompensa só aparece depois do término visual; nenhum
  `setTimeout` determina esse término.
- O arquivo Rive final é validado no navegador de staging com CORS, movimento
  reduzido e o fluxo real de resgate.
