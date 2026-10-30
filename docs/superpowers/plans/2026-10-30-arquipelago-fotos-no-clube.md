# Fotos no Clube (N08b, levantamento de 30/10)

**Pedido:** a dona decidiu implementar o interruptor "Fotos no Clube" do cartão dos pais, que só
gravava. Proposta: o modo foto ganha "Mandar para o Clube" só com a permissão ligada; a foto
sobe pelos anexos e pela moderação que o Clube já tem. ECA Digital, art. 21: restrito por
padrão, os pais liberam.

## Desenho

- **Quem pode:** criança do Kids, com "Fotos no Clube" ligado na conta, com acesso ao Clube dos
  Criadores (produto vendido à parte: sem o Clube, o botão não aparece e nada no jogo depende
  dele) e com o canal `fotos-do-arquipelago` do servidor `clube-dos-criadores` criado pela
  equipe, aberto a membros e **com aprovação prévia**. Canal sem aprovação prévia não serve:
  a foto nunca entra no Clube sem um adulto da equipe olhar.
- **Serviço do jogo:** `GET /arquipelago/clube` devolve `{ versao, fotosNoClube }` lido das
  permissões da conta da criança. Adulto e conta sem escolha: `false`.
- **BFF (`member-shell`, rotas `arquipelagoClube` e `arquipelagoFotoNoClube`):** a situação junta
  a permissão e o canal (`ligado`, `desligado`, `sem-clube`, `fora-do-ar`). O envio confere tudo
  de novo, reencoda a imagem pelo mesmo otimizador das imagens do Clube (sem EXIF, contra imagem
  bomba), sobe no R2 de UGC, registra o anexo no hub e cria o tópico no canal. O hub põe o
  tópico em `pending` pela aprovação do canal; a moderação segue a do Clube.
- **Plataforma:** `clube?: ClubeDoJogo` opcional (`situacao()` e `mandarFoto(blob)`). Só o host
  do Kids o monta. O jogo, sem ele, continua com a foto só no aparelho.
- **Jogo:** depois da foto pronta, com a situação `ligado`, aparece "Mandar para o Clube". O
  envio diz que a foto espera um adulto da equipe olhar. Sem permissão, o botão não aparece.
- Sem mudança no salvamento nem no banco do jogo.

## Verificação

Contrato e serviço (permissão por conta, adulto e bloqueio), gateway, BFF com hub e
armazenamento falsos (desligado, sem canal, canal sem aprovação, imagem inválida, envio em
moderação), host e painel da foto no navegador com a plataforma falsa (`?clube=`).
