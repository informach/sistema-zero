import pinta

# Each Pinta drawing is read from its file only once, then reused.
drawings = {}


def drawing(name):
    if name not in drawings:
        drawings[name] = pinta.carregar_sprite(name)
    return drawings[name]


def frames(path):
    # 'fazendeiro/andar-baixo' -> the pictures of the animation 'andar-baixo' of 'fazendeiro'
    name, animation = path.split('/')
    return drawing(name).animacao(animation)


def image(path):
    # One picture cut to its painted part: the empty border around it would get in
    # the way when it is placed on the map.
    name, animation = path.split('/')
    picture = drawing(name).quadro(animation)
    return picture.subsurface(picture.get_bounding_rect())
