"""The screen (Pygame Zero 1.2.1 API), drawn by the browser.

``screen.draw.text`` keeps every ptext option Pygame Zero documents; the browser lays the text
out with Pygame Zero's own default font (FreeSansBold) and the same anchoring rules.
"""
from . import _sz
from . import loaders
from .rect import RECT_CLASSES

DEFAULT_ANCHOR = 0, 0


def round_pos(pos):
    """Round a tuple position so it can be used for drawing."""
    x, y = pos
    return round(x), round(y)


def make_color(arg):
    if isinstance(arg, tuple):
        return arg
    return tuple(_sz.Color(arg))


def _font(fontname):
    if fontname is None:
        return None
    return loaders.fonts.load(fontname)


def _text_position(pos, anchor, kwargs):
    """ptext.draw's position rules: one of pos/topleft/center…/left/top… and an anchor."""
    left = kwargs.pop('left', None)
    top = kwargs.pop('top', None)
    right = kwargs.pop('right', None)
    bottom = kwargs.pop('bottom', None)
    centerx = kwargs.pop('centerx', None)
    centery = kwargs.pop('centery', None)
    for name, (hx, vy) in (
        ('topleft', ('left', 'top')),
        ('bottomleft', ('left', 'bottom')),
        ('topright', ('right', 'top')),
        ('bottomright', ('right', 'bottom')),
        ('midtop', ('centerx', 'top')),
        ('midleft', ('left', 'centery')),
        ('midbottom', ('centerx', 'bottom')),
        ('midright', ('right', 'centery')),
        ('center', ('centerx', 'centery')),
    ):
        value = kwargs.pop(name, None)
        if value:
            a, b = value
            if hx == 'left':
                left = a
            elif hx == 'right':
                right = a
            else:
                centerx = a
            if vy == 'top':
                top = b
            elif vy == 'bottom':
                bottom = b
            else:
                centery = b
    x, y = pos or (None, None)
    hanchor, vanchor = anchor or (None, None)
    if left is not None:
        x, hanchor = left, 0
    if centerx is not None:
        x, hanchor = centerx, 0.5
    if right is not None:
        x, hanchor = right, 1
    if top is not None:
        y, vanchor = top, 0
    if centery is not None:
        y, vanchor = centery, 0.5
    if bottom is not None:
        y, vanchor = bottom, 1
    if x is None:
        raise ValueError('Não sei onde pôr o texto na horizontal: use pos, topleft, center…')
    if y is None:
        raise ValueError('Não sei onde pôr o texto na vertical: use pos, topleft, center…')
    return x, y, hanchor, vanchor


_STYLE_ARGUMENTS = {
    'fontname', 'fontsize', 'sysfontname', 'antialias', 'bold', 'italic', 'underline', 'color',
    'background', 'width', 'widthem', 'lineheight', 'strip', 'align', 'owidth', 'ocolor',
    'shadow', 'scolor', 'gcolor', 'alpha', 'angle', 'cache', 'surf',
}
_POSITION_ARGUMENTS = {
    'left', 'top', 'right', 'bottom', 'centerx', 'centery', 'topleft', 'bottomleft', 'topright',
    'bottomright', 'midtop', 'midleft', 'midbottom', 'midright', 'center',
}


def _style(kwargs):
    unknown = set(kwargs) - _STYLE_ARGUMENTS
    if unknown:
        raise TypeError('screen.draw.text não conhece a opção %r.' % sorted(unknown)[0])
    style = {key: kwargs.get(key) for key in _sz.TEXT_STYLE_KEYS if key != 'fit'}
    style['fontname'] = _font(kwargs.get('fontname'))
    align = style.get('align')
    if isinstance(align, str):
        try:
            style['align'] = ['left', 'center', 'right'].index(align) / 2
        except ValueError:
            raise ValueError('align precisa ser "left", "center" ou "right".') from None
    return style


class SurfacePainter:
    """Interface to drawing on the screen."""

    def __init__(self, screen):
        self._screen = screen

    def line(self, start, end, color):
        """Draw a line from start to end."""
        _sz.line(round_pos(start), round_pos(end), color)

    def circle(self, pos, radius, color):
        """Draw a circle."""
        _sz.circle(round_pos(pos), radius, color, 1)

    def filled_circle(self, pos, radius, color):
        """Draw a filled circle."""
        _sz.circle(round_pos(pos), radius, color, 0)

    def rect(self, rect, color):
        """Draw a rectangle."""
        if not isinstance(rect, RECT_CLASSES):
            raise TypeError("screen.draw.rect() precisa de um Rect para desenhar")
        _sz.rect(int(rect.x), int(rect.y), int(rect.w), int(rect.h), color, 1)

    def filled_rect(self, rect, color):
        """Draw a filled rectangle."""
        if not isinstance(rect, RECT_CLASSES):
            raise TypeError("screen.draw.filled_rect() precisa de um Rect para desenhar")
        _sz.rect(int(rect.x), int(rect.y), int(rect.w), int(rect.h), color, 0)

    def text(self, text, pos=None, **kwargs):
        """Draw text to the screen."""
        anchor = kwargs.pop('anchor', None)
        positioned = {key: kwargs.pop(key) for key in list(kwargs) if key in _POSITION_ARGUMENTS}
        x, y, hanchor, vanchor = _text_position(pos, anchor, positioned)
        style = _style(kwargs)
        if style.get('align') is None and hanchor is not None:
            style['align'] = hanchor
        if hanchor is None:
            hanchor = DEFAULT_ANCHOR[0]
        if vanchor is None:
            vanchor = DEFAULT_ANCHOR[1]
        _sz.text(text, x, y, hanchor, vanchor, style)

    def textbox(self, text, rect, **kwargs):
        """Draw text to the screen, wrapped to fit a box"""
        from .rect import ZRect
        rect = ZRect(rect)
        anchor = kwargs.pop('anchor', None) or (0.5, 0.5)
        hanchor, vanchor = anchor
        if 'fontsize' in kwargs or 'width' in kwargs:
            raise TypeError('screen.draw.textbox escolhe sozinho o tamanho da letra.')
        style = _style(kwargs)
        style['width'] = rect.width
        style['fit'] = rect.height
        if style.get('align') is None:
            style['align'] = hanchor
        x = rect.x + hanchor * rect.width
        y = rect.y + vanchor * rect.height
        _sz.text(text, x, y, hanchor, vanchor, style)


class Screen:
    """Interface to the screen."""

    def __init__(self, width, height):
        self.width, self.height = width, height

    def _resize(self, width, height):
        self.width, self.height = width, height

    @property
    def surface(self):
        raise NotImplementedError(
            'No Estúdio, screen.surface não está disponível. Desenhe com screen.blit e '
            'screen.draw; para ler cores, use uma imagem: images.nome.get_at((x, y)).'
        )

    def clear(self):
        """Clear the screen to black."""
        self.fill((0, 0, 0))

    def fill(self, color):
        """Fill the screen with a colour."""
        _sz.fill(make_color(color))

    def blit(self, image, pos):
        """Draw a sprite onto the screen (image name or images.something)."""
        if isinstance(image, str):
            image = loaders.images.load(image)
        _sz.blit(image, pos)

    @property
    def draw(self):
        return SurfacePainter(self)
