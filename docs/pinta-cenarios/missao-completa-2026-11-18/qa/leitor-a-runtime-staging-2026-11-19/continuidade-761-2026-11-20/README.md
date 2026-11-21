# Continuidade do leitor de runtime — 20/11/2026

A CI 44739390650 qualificou a imagem Linux amd64 da fonte
f64ece1897b4a544c3bfcb7a22637892cfe321c8. O artefato foi baixado, conferido
por SHA-256 e configuração interna, enviado ao registro com referência imutável
e conferido novamente por digest. O perfil oficial é 761eb04c…; ele contempla
as fontes publicadas integradas no candidato desta entrega.

O dry run e a implantação somente em staging produziram o mesmo módulo.
A leitura independente confirmou o Worker 6276e3b7… com SHA-256 09a9e72e…,
perfil idêntico e leitor de colisões do Pinta presente. Os dois aplicativos de
contêiner apontam para o digest cfef5ed5…: Pro versão 33, verificador 3D versão 9.
A primeira consulta ainda mostrava a versão anterior enquanto o rollout estava
em andamento; somente a segunda leitura foi aceita. Não há alteração de fontes
funcionais 3D nesta continuidade, apenas a imagem comum qualificada.

O healthz respondeu 200 e um programa próprio com função dobro foi executado
no contêiner real: objetivo dobro(2) === 4 aprovado, HTTP 200, 15.272 ms.
Esse ensaio comprova a execução comum; não substitui a publicação autenticada
do jogo da Vila nem a execução do mundo no runtime Python novo.

As seis variáveis não secretas da configuração foram comparadas ao estado ativo
antes da implantação. O seletor Python f69814b9… permaneceu igual. A versão ativa
anterior havia mudado de ID por outra operação sem mudar os bytes do Worker;
o bloqueio inicial foi mantido até conferir versão, módulo, variáveis e buckets.
Credenciais ficaram somente em memória; nenhum segredo acompanha as evidências.

Distribuição Python 132 e gravador de nuvem 6 ainda não foram ativados. O remoto
publicou depois outra alteração de ClassicShell e um perfil 4daf3280…; essa fonte
posterior exige sua própria integração e qualificação antes de substituir a
imagem desta prova. Não declarar esta imagem compatível com fontes futuras.
