# L10: correr com o fantasma de um recorde da família

Continuação da entrega integral autorizada. Não requer arte nova: o fantasma reutiliza o avatar,
sem colisão e com apresentação translúcida. A rede do barco já foi integrada em `e231b309d`.
Será uma silhueta do trajeto, sem copiar roupa ou foto do irmão. A identificação vem somente
do nome já autorizado pelo BFF da família. Não insinuar que o avatar visual é a aparência real
do outro perfil.

## Decisões de consistência

Uma trajetória versionada é um artefato separado do save V18. Não gastar os 64 KB com posições
de uma corrida. Gravar só o melhor tempo confirmado de cada percurso, por perfil e público.
Uma leitura só devolve a trajetória se seu tempo ainda corresponde ao recorde atual; nunca
mostrar o trajeto antigo como se fosse o novo recorde. Não conceder moedas, estrelas ou itens
pela trajetória, que não é prova antitrapaça de uma corrida.

Formato V1 compacto: amostra a cada 100 ms, posições em centímetros e giro em 0..65535.
Máximo de cinco minutos, 3001 amostras e 128 KB no artefato, com 1 KB adicional no envelope do comando. Corridas maiores continuam válidas
como recorde, mas mostram que não há fantasma disponível. A falta do artefato não impede correr.
Esse limite editorial cobre os percursos atuais e evita armazenamento e transporte ilimitados.

O gravador usa buffer pré-alocado; gravação e reprodução recebem o tempo ativo da corrida,
independente do FPS. Pausa não avança o fantasma. Interpolar posição e giro pelo caminho curto,
inclusive ao cruzar -pi/pi. Alocar o JSON só ao concluir, fora do laço da física.

A gravação depende de confirmar primeiro o save/revisão com o melhor tempo. Retomada local
do upload fica fora de V18 e vinculada ao perfil. A API compara o tempo do artefato com o save,
valida limites e recusa suporte. Um replay idêntico não cria outra linha nem outro prêmio.
Guardar no máximo um artefato por perfil/percurso, substituindo só um recorde correspondente.

A leitura do irmão reutiliza o serviço de visitas: mesma conta, outro perfil, jogo permitido
e `visitasDeIrmaos` ativa. Revogação vale também para fantasmas. Não há ranking de desconhecidos,
nome persistido no serviço ou caminho que aceite um id arbitrário. Adultos ficam para a porta
de consentimento de L12; não apresentar um adulto como irmão de uma conta Kids.

O artefato deve ter chave estrangeira para o salvamento/perfil e sumir na exclusão correspondente,
sem uma tabela órfã de trajetórias. A retenção é de um melhor por percurso, não de sessões antigas.

## Checkpoint inicial, preservado

Contrato, gravador e reprodutor puro implementados; quatro testes e 21 asserções passaram.
A comparação de FPS usa um trajeto linear simulado. Não é medição de FPS de um aparelho real
nem prova do personagem no mundo completo. A primeira execução encontrou a pausa invalidando
a gravação por uma pose transitória sem avanço do relógio; o gravador agora ignora a pose quando
o tempo ativo não mudou. Naquele checkpoint ainda não havia envio, persistência, seleção ou desenho.

## Implementação de 30/10

Persistência separada com a migração gerada `0014_fantasmas_dos_percursos`: um trajeto por
perfil/percurso, chave estrangeira com exclusão em cascata e comparação atômica com revisão
e recorde do save. Nenhuma mudança de V18, prêmio ou carteira. A leitura omite o artefato se
o recorde tiver mudado. Os testes usam somente o Postgres local `arquipelago_test*`.

O diário IndexedDB guarda os envios por público/perfil, fora do save. Só envia após salvar
e ler o recorde confirmado; erro conserva o diário. Reabertura, retorno à aba, reconexão e
o botão de tentar de novo retomam o envio. A confirmação antiga não apaga uma captura mais nova.

A seleção usa os nomes da lista familiar existente, a permissão das visitas no serviço e
a lista atual de irmãos do Auth no BFF. Reconfirma ao começar a corrida, a cada 15 segundos
de aba visível e ao retomá-la. Uma recusa ou falha de leitura retira a referência; a janela de
leitura é de 5 segundos. Não promete revogação por push. Adulto não lê família Kids.
A conferência periódica usa os recordes da família, sem baixar novamente o vetor de amostras.

O avatar da referência usa peças padrão, material translúcido próprio e esqueleto próprio.
A prova visual encontrou compartilhamento indevido de ossos e cores no `AvatarRig` anterior:
o componente comum agora separa esses recursos por montagem, preservando geometrias do cache.
Regressões puras e prova visual distinguem essa correção dos testes iniciais insuficientes.
O reinício foi corrigido por uma prova causal do artefato guardado: a captura começa no primeiro
quadro ativo depois do teleporte, sem registrar a chegada anterior como se fosse a largada.

Provas locais e limites em `docs/qa/2026-10-30-fantasma-familiar/README.md`. A composição inclui
os lotes locais de descarte animado, cores conquistadas, pausa, leitura e ritmo básico. O aceite autenticado completo e a
implantação continuam em L14; nenhum dado foi cadastrado em staging ou produção.

## Etapas

- [x] Contrato V1, gravador/reprodutor puro e testes de pausa, 30/60 FPS e limites.
- [x] Artefato persistido na API, migração gerada e testes em Postgres local descartável.
- [x] Retomada local, BFF/gateway/host e revogação familiar nas provas locais de rota e estado.
- [x] Gravação nos percursos e reprodução visual sem corpo físico.
- [x] Seleção familiar, plataforma falsa e aviso de indisponibilidade sem dado inventado.
- [x] Navegador local, tipagem, lint, revisão e documentação de privacidade/retenção.

Não alterar o significado de versões antigas do salvamento. Nenhuma escrita em banco remoto,
alteração de `.env`, workflow, Blender ou GLB. O aceite final exige o irmão real e os casos de
permissão revogada; a regra pura sozinha não encerra o lote.
