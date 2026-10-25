"""Mochila a Jato: flying with thrust against gravity, the two rocket parts and the three fuel
cans can be carried to the rocket, and with a full tank the rocket lifts off."""


def play(t):
    a = t.get('astronauta')
    partes = t.get('partes')
    combustivel = t.get('combustivel')
    t.get('clock').unschedule(t.get('novo_meteoro'))

    def segurar(subir, lado):
        (t.down if subir else t.up)('UP')
        t.down(lado) if lado else None
        for outro in ('LEFT', 'RIGHT'):
            if outro != lado:
                t.up(outro)
        t.step(1)

    def soltar_tudo():
        for tecla in ('UP', 'LEFT', 'RIGHT'):
            t.up(tecla)

    def em_baixo_de_plataforma():
        for p in t.get('plataformas')[1:]:
            if p.left - 24 < a.x < p.right + 24 and p.bottom <= a.top + 2:
                return p
        return None

    def voar_ate(x, y, limite=1500):
        # Como um jogador: sai de baixo da plataforma pelo lado, sobe até o corredor de cima
        # (acima de todas as plataformas), vai até x e então desce até y.
        corredor = 170
        for _ in range(limite):
            if abs(a.x - x) < 6 and abs(a.bottom - y) < 8:
                break
            teto = em_baixo_de_plataforma()
            if abs(a.x - x) >= 6 and a.bottom > corredor + 10:
                if teto is not None:
                    lado = 'LEFT' if a.x - teto.left < teto.right - a.x else 'RIGHT'
                    segurar(False, lado)
                else:
                    segurar(True, None)
            elif abs(a.x - x) >= 6:
                segurar(a.bottom > corredor, 'RIGHT' if a.x < x else 'LEFT')
            else:
                segurar(a.bottom > y + 4, None)
        soltar_tudo()


    def levar(item, onde_pegar):
        voar_ate(onde_pegar[0], onde_pegar[1] - 60)
        voar_ate(item.x, item.bottom)
        t.step(5)
        pegou = t.get('carregando')
        voar_ate(t.get('BASE_DO_FOGUETE') - 40, 150)
        voar_ate(t.get('BASE_DO_FOGUETE'), 150)
        t.step(10)
        return pegou

    y0 = a.y
    t.hold('UP', 20)
    t.check('o empurrão vence a gravidade e o astronauta sobe', a.y < y0 - 10, f'subiu {y0 - a.y:.0f}')
    t.step(60)
    t.check('sem empurrão, ele cai de volta ao chão', abs(a.bottom - 550) < 2)
    t.check('pega e encaixa a parte do meio', levar(partes[1], partes[1].midtop) and t.get('proxima') == 2)
    t.check('pega e encaixa a ponta', levar(partes[2], partes[2].midtop) and t.get('proxima') == 3)
    t.shot('foguete-montado')
    for _ in range(6):
        if t.get('tanque') == 3:
            break
        t.until(lambda: t.get('no_chao_de')(combustivel) is not None or t.get('tanque') == 3, 600)
        if t.get('tanque') < 3:
            levar(combustivel, combustivel.midtop)
    t.check('leva as três latas de combustível ao foguete', t.get('tanque') == 3, f"tanque={t.get('tanque')}")
    voar_ate(t.get('BASE_DO_FOGUETE') - 50, 550)
    t.until(lambda: t.get('decolando'), 120, key='RIGHT')
    print(f'    astronauta em {a.midbottom}, base do foguete {partes[0].midbottom}')
    t.check('com o tanque cheio, entra no foguete e decola', t.get('decolando'))
    t.step(200)
    t.shot('decolou')
    t.check('o foguete sai pelo alto da tela', partes[2].bottom < 0)
