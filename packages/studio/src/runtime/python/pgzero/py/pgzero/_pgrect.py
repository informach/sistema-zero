"""A pure-Python pygame-ce 2.5 Rect for the Sistema Zero Studio.

Pygame Zero's ``Rect`` subclasses pygame's C ``Rect``. The browser runtime has no pygame, so
this module reproduces pygame-ce's behaviour: integer coordinates, values truncated toward zero
(``int()``) on construction and assignment, right/bottom edges exclusive, and the same results
for move, inflate, clamp, clip, union, fit and the collide family. It is checked against
pygame-ce by the differential tests in ``scripts/pgzero/tests``.
"""

import struct as _struct


def _int(value):
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value != value or value in (float('inf'), float('-inf')):
            raise TypeError('invalid rect assignment')
        return int(value)
    try:
        index = value.__index__
    except AttributeError:
        pass
    else:
        return index()
    try:
        return int(float(value))
    except (TypeError, ValueError):
        raise TypeError('invalid rect assignment') from None


def _f32(value):
    # pygame-ce computes scale_by in single precision.
    return _struct.unpack('f', _struct.pack('f', value))[0]


def _half(value):
    # C integer division truncates toward zero.
    return int(value / 2)


def _pair(value):
    try:
        a, b = value
    except (TypeError, ValueError):
        raise TypeError('Expected a sequence of 2 numbers') from None
    return _int(a), _int(b)


def _rect_values(args):
    """Accept every rect style the C Rect accepts: x, y, w, h / (x, y), (w, h) / rect-like."""
    if len(args) == 1:
        arg = args[0]
        if isinstance(arg, Rect):
            return arg._x, arg._y, arg._w, arg._h
        rect = getattr(arg, 'rect', None)
        if rect is not None and not isinstance(arg, (tuple, list)):
            if callable(rect):
                rect = rect()
            return _rect_values((rect,))
        if hasattr(arg, 'x') and hasattr(arg, 'w') and hasattr(arg, 'h') and hasattr(arg, 'y'):
            return _int(arg.x), _int(arg.y), _int(arg.w), _int(arg.h)
        try:
            args = tuple(arg)
        except TypeError:
            raise TypeError('Argument must be rect style object') from None
    if len(args) == 4:
        return tuple(_int(value) for value in args)
    if len(args) == 2:
        x, y = _pair(args[0])
        w, h = _pair(args[1])
        return x, y, w, h
    raise TypeError('Argument must be rect style object')


class Rect:
    """pygame object for storing rectangular coordinates"""

    __slots__ = ('_x', '_y', '_w', '_h')
    __hash__ = None

    def __init__(self, *args):
        self._x, self._y, self._w, self._h = _rect_values(args) if args else (0, 0, 0, 0)

    @classmethod
    def _from(cls, x, y, w, h):
        result = cls.__new__(cls)
        Rect._x.__set__(result, x)
        Rect._y.__set__(result, y)
        Rect._w.__set__(result, w)
        Rect._h.__set__(result, h)
        return result

    def _copy(self, x, y, w, h):
        return type(self)._from(x, y, w, h)

    # Scalar edges -------------------------------------------------------------------------
    def _get_x(self): return self._x
    def _set_x(self, value): self._x = _int(value)
    x = left = property(_get_x, _set_x)

    def _get_y(self): return self._y
    def _set_y(self, value): self._y = _int(value)
    y = top = property(_get_y, _set_y)

    def _get_w(self): return self._w
    def _set_w(self, value): self._w = _int(value)
    w = width = property(_get_w, _set_w)

    def _get_h(self): return self._h
    def _set_h(self, value): self._h = _int(value)
    h = height = property(_get_h, _set_h)

    @property
    def right(self): return self._x + self._w
    @right.setter
    def right(self, value): self._x = _int(value) - self._w

    @property
    def bottom(self): return self._y + self._h
    @bottom.setter
    def bottom(self, value): self._y = _int(value) - self._h

    @property
    def centerx(self): return self._x + _half(self._w)
    @centerx.setter
    def centerx(self, value): self._x = _int(value) - _half(self._w)

    @property
    def centery(self): return self._y + _half(self._h)
    @centery.setter
    def centery(self, value): self._y = _int(value) - _half(self._h)

    # Point attributes ---------------------------------------------------------------------
    def _point(get_x, get_y, set_x, set_y):
        def getter(self):
            return get_x(self), get_y(self)

        def setter(self, value):
            x, y = _pair(value)
            set_x(self, x)
            set_y(self, y)

        return property(getter, setter)

    topleft = _point(lambda r: r.left, lambda r: r.top, _set_x, _set_y)
    topright = _point(lambda r: r.right, lambda r: r.top, right.fset, _set_y)
    bottomleft = _point(lambda r: r.left, lambda r: r.bottom, _set_x, bottom.fset)
    bottomright = _point(lambda r: r.right, lambda r: r.bottom, right.fset, bottom.fset)
    midtop = _point(lambda r: r.centerx, lambda r: r.top, centerx.fset, _set_y)
    midleft = _point(lambda r: r.left, lambda r: r.centery, _set_x, centery.fset)
    midbottom = _point(lambda r: r.centerx, lambda r: r.bottom, centerx.fset, bottom.fset)
    midright = _point(lambda r: r.right, lambda r: r.centery, right.fset, centery.fset)
    center = _point(lambda r: r.centerx, lambda r: r.centery, centerx.fset, centery.fset)
    size = _point(lambda r: r.w, lambda r: r.h, _set_w, _set_h)
    del _point

    # Sequence protocol --------------------------------------------------------------------
    def __len__(self):
        return 4

    def __iter__(self):
        return iter((self._x, self._y, self._w, self._h))

    def __getitem__(self, index):
        return (self._x, self._y, self._w, self._h)[index]

    def __setitem__(self, index, value):
        values = [self._x, self._y, self._w, self._h]
        if isinstance(index, slice):
            values[index] = [_int(item) for item in value]
            if len(values) != 4:
                raise TypeError('Rect slice assignment must keep four values')
        else:
            values[index] = _int(value)
        self._x, self._y, self._w, self._h = values

    def __bool__(self):
        return self._w != 0 and self._h != 0

    def __eq__(self, other):
        try:
            return tuple(self) == _rect_values((other,))
        except TypeError:
            return NotImplemented

    def __ne__(self, other):
        result = self.__eq__(other)
        return result if result is NotImplemented else not result

    def __repr__(self):
        return f'Rect({self._x}, {self._y}, {self._w}, {self._h})'

    __str__ = __repr__

    def __copy__(self):
        return self._copy(self._x, self._y, self._w, self._h)

    def __reduce__(self):
        return (type(self), (self._x, self._y, self._w, self._h))

    def copy(self):
        return self._copy(self._x, self._y, self._w, self._h)

    def update(self, *args):
        self._x, self._y, self._w, self._h = _rect_values(args)

    # Geometry -----------------------------------------------------------------------------
    def move(self, *args):
        dx, dy = _pair(args[0] if len(args) == 1 else args)
        return self._copy(self._x + dx, self._y + dy, self._w, self._h)

    def move_ip(self, *args):
        dx, dy = _pair(args[0] if len(args) == 1 else args)
        self._x += dx
        self._y += dy

    def inflate(self, *args):
        dx, dy = _pair(args[0] if len(args) == 1 else args)
        return self._copy(self._x - _half(dx), self._y - _half(dy), self._w + dx, self._h + dy)

    def inflate_ip(self, *args):
        self._x, self._y, self._w, self._h = self.inflate(*args)

    def scale_by(self, x, y=None):
        y = x if y is None else y
        width = _f32(self._w * _f32(abs(x)))
        height = _f32(self._h * _f32(abs(y)))
        return self._copy(
            int(_f32(self._x + _half(self._w) - _f32(width / 2))),
            int(_f32(self._y + _half(self._h) - _f32(height / 2))),
            int(width),
            int(height),
        )

    def scale_by_ip(self, x, y=None):
        self._x, self._y, self._w, self._h = self.scale_by(x, y)

    def clamp(self, *args):
        ax, ay, aw, ah = _rect_values(args)
        if self._w >= aw:
            x = ax + _half(aw) - _half(self._w)
        elif self._x < ax:
            x = ax
        elif self._x + self._w > ax + aw:
            x = ax + aw - self._w
        else:
            x = self._x
        if self._h >= ah:
            y = ay + _half(ah) - _half(self._h)
        elif self._y < ay:
            y = ay
        elif self._y + self._h > ay + ah:
            y = ay + ah - self._h
        else:
            y = self._y
        return self._copy(x, y, self._w, self._h)

    def clamp_ip(self, *args):
        self._x, self._y, self._w, self._h = self.clamp(*args)

    def clip(self, *args):
        bx, by, bw, bh = _rect_values(args)
        x = max(self._x, bx)
        y = max(self._y, by)
        right = min(self._x + self._w, bx + bw)
        bottom = min(self._y + self._h, by + bh)
        if right <= x or bottom <= y:
            return self._copy(self._x, self._y, 0, 0)
        return self._copy(x, y, right - x, bottom - y)

    def union(self, *args):
        bx, by, bw, bh = _rect_values(args)
        x = min(self._x, bx)
        y = min(self._y, by)
        return self._copy(x, y, max(self._x + self._w, bx + bw) - x, max(self._y + self._h, by + bh) - y)

    def union_ip(self, *args):
        self._x, self._y, self._w, self._h = self.union(*args)

    def unionall(self, rects):
        result = self.copy()
        for rect in rects:
            result = result.union(rect)
        return result

    def unionall_ip(self, rects):
        self._x, self._y, self._w, self._h = self.unionall(rects)

    def fit(self, *args):
        bx, by, bw, bh = _rect_values(args)
        if not self._w or not self._h or not bw or not bh:
            raise ValueError('Cannot fit a zero-sized rect')
        ratio = max(self._w / bw, self._h / bh)
        w = int(self._w / ratio)
        h = int(self._h / ratio)
        return self._copy(bx + _half(bw - w), by + _half(bh - h), w, h)

    def normalize(self):
        if self._w < 0:
            self._x += self._w
            self._w = -self._w
        if self._h < 0:
            self._y += self._h
            self._h = -self._h

    def contains(self, *args):
        bx, by, bw, bh = _rect_values(args)
        return (
            self._x <= bx and self._y <= by
            and self._x + self._w >= bx + bw and self._y + self._h >= by + bh
            and self._x + self._w > bx and self._y + self._h > by
        )

    __contains__ = contains

    def clipline(self, *args):
        raise NotImplementedError(
            'Rect.clipline ainda não existe no Pygame Zero do Estúdio. '
            'Use colliderect ou collidepoint.'
        )

    # Collisions ---------------------------------------------------------------------------
    def collidepoint(self, *args):
        x, y = _pair(args[0] if len(args) == 1 else args)
        return self._x <= x < self._x + self._w and self._y <= y < self._y + self._h

    def colliderect(self, *args):
        bx, by, bw, bh = _rect_values(args)
        if not self._w or not self._h or not bw or not bh:
            return False
        return (
            min(self._x, self._x + self._w) < max(bx, bx + bw)
            and min(self._y, self._y + self._h) < max(by, by + bh)
            and max(self._x, self._x + self._w) > min(bx, bx + bw)
            and max(self._y, self._y + self._h) > min(by, by + bh)
        )

    def collidelist(self, rects):
        for index, rect in enumerate(rects):
            if self.colliderect(rect):
                return index
        return -1

    def collidelistall(self, rects):
        return [index for index, rect in enumerate(rects) if self.colliderect(rect)]

    def collideobjects(self, objects, key=None):
        for item in objects:
            if self.colliderect(key(item) if key else item):
                return item
        return None

    def collideobjectsall(self, objects, key=None):
        return [item for item in objects if self.colliderect(key(item) if key else item)]

    def collidedict(self, rects, values=False):
        for key, value in rects.items():
            if self.colliderect(value if values else key):
                return key, value
        return None

    def collidedictall(self, rects, values=False):
        return [
            (key, value) for key, value in rects.items() if self.colliderect(value if values else key)
        ]
