import pgzrun

WIDTH = 800
HEIGHT = 600
TITLE = 'Atirador Espacial'
# As pedras de cada onda estão neste arquivo de texto: mude ele para mudar o jogo.
ARQUIVO_DAS_ONDAS = 'inimigos.txt'
VELOCIDADE_DA_NAVE = 5
VELOCIDADE_DO_TIRO = 10
TEMPO_ENTRE_TIROS = 0.3
VIDAS = 3
TEMPO_PROTEGIDA = 2.0
# Cada onda nova é esta fração mais rápida que a anterior.
ACELERACAO_POR_ONDA = 0.2
PONTOS = {'pedra_pequena': 30, 'pedra_media': 20, 'pedra_grande': 10}

nave = Actor('nave')
tiros = []
pedras = []
explosoes = []
# As pedras da onda, lidas do arquivo: cada uma é um dicionário.
roteiro = []
fim_da_onda = 10
aviso = ''
estado = 'inicio'
pontos = 0
vidas = VIDAS
onda = 1
relogio = 0
recarga = 0
protegida = 0
espera = 0
rolagem = 0


def ler_ondas():
    global fim_da_onda, aviso
    roteiro.clear()
    aviso = ''
    try:
        with open(ARQUIVO_DAS_ONDAS, 'r') as arquivo:
            numero = 0
            for linha in arquivo:
                numero = numero + 1
                linha = linha.strip()
                # Linha vazia ou que começa com # é só explicação.
                if linha == '' or linha.startswith('#'):
                    continue
                partes = linha.split(',')
                try:
                    if partes[1].strip() == 'fim':
                        fim_da_onda = float(partes[0])
                    elif partes[1].strip() in PONTOS:
                        roteiro.append({
                            'tempo': float(partes[0]),
                            'imagem': partes[1].strip(),
                            'x': int(partes[2]),
                            'velocidade': float(partes[3]),
                            'vida': int(partes[4]),
                        })
                    else:
                        aviso = 'A linha ' + str(numero) + ' de ' + ARQUIVO_DAS_ONDAS + ' tem uma imagem que não existe.'
                except (ValueError, IndexError):
                    aviso = 'A linha ' + str(numero) + ' de ' + ARQUIVO_DAS_ONDAS + ' tem um erro.'
    except OSError:
        aviso = 'Não achei o arquivo ' + ARQUIVO_DAS_ONDAS + '.'
    except ValueError:
        # Uma letra que o computador não soube ler (acontece com alguns acentos no Windows).
        aviso = 'Não consegui ler uma letra do arquivo ' + ARQUIVO_DAS_ONDAS + '.'


def novo_jogo():
    global estado, pontos, vidas, onda, relogio, recarga, protegida
    ler_ondas()
    tiros.clear()
    pedras.clear()
    explosoes.clear()
    nave.pos = (400, 520)
    estado = 'jogando'
    pontos = 0
    vidas = VIDAS
    onda = 1
    relogio = 0
    recarga = 0
    protegida = 0


def soltar(linha):
    pedra = Actor(linha['imagem'])
    pedra.midbottom = (linha['x'], 0)
    pedra.velocidade = linha['velocidade'] * (1 + ACELERACAO_POR_ONDA * (onda - 1))
    pedra.vida = linha['vida']
    pedras.append(pedra)


def explodir(pos):
    explosoes.append({'pos': pos, 'raio': 5})
    sounds.explosao.play()


def mover_nave():
    if keyboard.left:
        nave.x = nave.x - VELOCIDADE_DA_NAVE
    if keyboard.right:
        nave.x = nave.x + VELOCIDADE_DA_NAVE
    if keyboard.up:
        nave.y = nave.y - VELOCIDADE_DA_NAVE
    if keyboard.down:
        nave.y = nave.y + VELOCIDADE_DA_NAVE
    # A nave não sai da tela.
    nave.x = min(max(nave.x, nave.width / 2), WIDTH - nave.width / 2)
    nave.y = min(max(nave.y, HEIGHT / 2), HEIGHT - nave.height / 2)


def atirar(dt):
    global recarga
    recarga = recarga - dt
    if keyboard.space and recarga <= 0:
        tiro = Actor('tiro')
        tiro.midbottom = nave.midtop
        tiros.append(tiro)
        recarga = TEMPO_ENTRE_TIROS
        sounds.tiro.play()


def soltar_pedras(dt):
    global relogio, onda
    antes = relogio
    relogio = relogio + dt
    # Solta as pedras cuja hora chegou neste quadro.
    for linha in roteiro:
        if antes <= linha['tempo'] < relogio:
            soltar(linha)
    if relogio >= fim_da_onda:
        onda = onda + 1
        relogio = 0


def acertar_pedras():
    global pontos
    for tiro in list(tiros):
        tiro.y = tiro.y - VELOCIDADE_DO_TIRO
        if tiro.bottom < 0:
            tiros.remove(tiro)
            continue
        for pedra in pedras:
            if tiro.colliderect(pedra):
                tiros.remove(tiro)
                pedra.vida = pedra.vida - 1
                if pedra.vida <= 0:
                    pontos = pontos + PONTOS[pedra.image]
                    pedras.remove(pedra)
                    explodir(pedra.pos)
                break


def mover_pedras():
    global vidas, protegida, estado, espera
    for pedra in list(pedras):
        pedra.y = pedra.y + pedra.velocidade
        pedra.angle = pedra.angle + 1
        if pedra.top > HEIGHT:
            pedras.remove(pedra)
        elif protegida <= 0 and nave.colliderect(pedra):
            pedras.remove(pedra)
            explodir(nave.pos)
            vidas = vidas - 1
            protegida = TEMPO_PROTEGIDA
            if vidas == 0:
                estado = 'fim'
                espera = 1.0


def update(dt):
    global rolagem, protegida, espera
    rolagem = (rolagem + 1) % HEIGHT
    for explosao in list(explosoes):
        explosao['raio'] = explosao['raio'] + 2
        if explosao['raio'] > 40:
            explosoes.remove(explosao)
    if estado == 'fim':
        espera = espera - dt
    if estado != 'jogando':
        return
    protegida = protegida - dt
    mover_nave()
    atirar(dt)
    soltar_pedras(dt)
    acertar_pedras()
    mover_pedras()


def on_key_down(key):
    if key == keys.SPACE:
        if estado == 'inicio' or (estado == 'fim' and espera <= 0):
            novo_jogo()


def draw():
    # O fundo desce sem parar: duas cópias, uma em cima da outra.
    screen.blit('fundo', (0, rolagem - HEIGHT))
    screen.blit('fundo', (0, rolagem))
    for pedra in pedras:
        pedra.draw()
    for tiro in tiros:
        tiro.draw()
    # Protegida depois de uma batida, a nave pisca.
    if estado == 'jogando' and (protegida <= 0 or int(protegida * 10) % 2 == 0):
        nave.draw()
    for explosao in explosoes:
        screen.draw.filled_circle(explosao['pos'], explosao['raio'], 'orange')
        screen.draw.filled_circle(explosao['pos'], explosao['raio'] / 2, 'yellow')
    screen.draw.text('Pontos: ' + str(pontos), topleft=(20, 15), fontsize=36, color='white')
    screen.draw.text('Onda ' + str(onda), midtop=(400, 15), fontsize=36, color='white')
    screen.draw.text('Vidas: ' + str(vidas), topright=(780, 15), fontsize=36, color='white')
    if aviso != '':
        screen.draw.text(aviso, midbottom=(400, 590), fontsize=28, color='yellow')
    if estado == 'inicio':
        screen.draw.text('Atirador Espacial', center=(400, 250), fontsize=72, color='white', owidth=2, ocolor='purple')
        screen.draw.text('Setas: pilotar   Espaço: atirar', center=(400, 330), fontsize=36, color='white')
        screen.draw.text('Aperte espaço para começar', center=(400, 380), fontsize=36, color='yellow')
    if estado == 'fim':
        screen.draw.text('Fim de jogo', center=(400, 250), fontsize=72, color='white', owidth=2, ocolor='red')
        screen.draw.text('Você chegou à onda ' + str(onda) + ' com ' + str(pontos) + ' pontos', center=(400, 320), fontsize=36, color='white')
        if espera <= 0:
            screen.draw.text('Espaço: jogar de novo', center=(400, 370), fontsize=36, color='yellow')


ler_ondas()
pgzrun.go()
