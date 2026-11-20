# Integração do remoto publicado e foco do piloto

Em 20/11/2026, o lote publicado e8f5241b0 foi combinado com 68f3cc425, preservando
os dois pais. Os arquivos publicados do Molda permanecem idênticos. O único
conflito, no perfil do runtime, foi resolvido pelo gerador oficial.

O piloto do aluno disparava pointerdown sintético, e o Jogo 2D tentava focar
o canvas no quadro escondido. O Chromium 159 revelou a violação no console.
Delegar foco a esse quadro eliminava o aviso, mas roubava o teclado do editor:
essa tentativa foi descartada. Agora apenas ponteiros reais pedem foco; os
ponteiros sintéticos continuam atualizando o estado e chamando os callbacks.
A regressão verifica ambos os caminhos, e o navegador confere o console inteiro
e registra qualquer foco recebido pelo quadro escondido. Seu sandbox permanece
igual ao publicado. O auxiliar de erros é compartilhado com os ensaios Python.

A rodada intermediária passou nos seis testes do piloto, mas falhou em dois
auxiliares Firefox: colagem e leitura do documento durante navegação. A colagem
passou isoladamente, sem mudar o helper. A leitura nativa agora aguarda um
resultado não nulo no mesmo prazo. As tentativas anteriores foram preservadas;
a bateria final é registrada separadamente. Nenhuma referência visual, tolerância
ou prazo foi relaxado.

A fixture dos testes do aluno no Core recebeu somente a declaração de tipo
que faltava ao compilador, sem alteração dos dados ou expectativas. O CI anterior
44816630764 falhou nesse typecheck; é necessária nova qualificação do commit.

A execução em gates.json aprovou 14 verificações, incluindo a seleção completa
oficial do Estúdio, Core, ensaios nativos, integração e tipos, e recusou a
formatação global. Os pacotes permaneceram congelados durante essa execução.
A correção posterior apenas ordena reexports e inclui o novo arquivo minificado
na mesma exclusão dos demais gerados. O conjunto de exports e todos os demais
comandos do barrel foram comparados, os bytes gerados permaneceram idênticos e
o perfil oficial permaneceu igual. As seis verificações em complemento.json
aprovaram Core completo, tipos do Core, controles e observador nativos, perfil e
formatação global. Os demais testes antecedem exclusivamente esse ajuste de
formatação/configuração; não se afirma uma única execução integral verde.

Esta prova é local e usa navegadores nesta máquina. Não comprova novos aparelhos
físicos, testes com crianças, ativação da distribuição Python, gravador de nuvem
novo, ciclo autenticado completo ou conclusão das regiões expansíveis. O rollout
e a homologação da Vila continuam sendo as próximas etapas da missão.

A primeira seleção completa parou no teto de payload do Jogo 2D: 422.514 bytes
para um teto de 422.500. Remover comentários não alterou o resultado, pois o
empacotador já os retira. A chamada de foco já estava dentro de try/catch; foi
retirada sua checagem redundante de typeof, mantendo a condição isTrusted e
o mesmo tratamento de falhas. Os 194 testes focados passaram, e a seleção
completa oficial foi executada novamente. Nenhum teto foi ampliado.

Os quatro pulos do runner local são os casos de Chromium de checkRunner: o
caminho padrão /opt/pw-browsers/chromium não existe no Windows. Os mesmos
quatro foram executados com o Chrome instalado, no controle-nativo.txt, sem
mudar fontes nem expectativas. O relatório original continua mostrando os pulos.

Staging recebeu posteriormente os commits 50f1ed2d8 e 52a522168 de outra
sessão. Este corte e8 não deve ser implantado sobre eles; a integração dos
novos commits publicados e nova qualificação precedem qualquer deployment.

## Próxima integração: foco do Python em segundo plano

A reprodução real em python-segundo-plano-reproducao.json falhou: o Pygame
tomou o foco do campo do host sob um contêiner inert com opacidade zero,
com seis observações e console limpo. A distribuição era a Linux52ec e o
provedor real; a composição reproduz o mecanismo do novo executor Python
publicado, ainda ausente deste corte e8. O ensaio não substitui métodos de
foco nem devolve o foco para esconder a transição.

Essa capacidade precisa de uma política explícita de segundo plano e de
qualificação antes da ativação da próxima distribuição. A correção e o teste
da própria aba Python seguem na integração seguinte, conforme o
[plano](../../../../plans/2026-11-20-pinta-python-foco-segundo-plano.md).
Este registro é um checkpoint local, sem deployment nem conclusão da missão.
