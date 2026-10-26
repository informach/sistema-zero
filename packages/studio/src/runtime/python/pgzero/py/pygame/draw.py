"""pygame.draw on screen.surface: each shape joins the same drawing as screen.draw."""
from pgzero import _sz
from pgzero.rect import Rect
from pgzero.screen import ScreenSurface


def _screen(surface):
    if not isinstance(surface, ScreenSurface):
        raise TypeError(
            'No Estúdio, pygame.draw desenha na tela: passe screen.surface como primeiro valor.'
        )


def _points(points):
    # pygame keeps each coordinate as it is and draws at its whole part (int), like here.
    result = []
    for point in points:
        x, y = point
        result.append((x, y))
    return result


def _bounds(points, width=0):
    xs = [int(x) for x, _ in points]
    ys = [int(y) for _, y in points]
    grow = max(0, width) // 2
    left, top = min(xs) - grow, min(ys) - grow
    return Rect(left, top, max(xs) - min(xs) + 1 + grow * 2, max(ys) - min(ys) + 1 + grow * 2)


def rect(surface, color, rect, width=0, border_radius=0, border_top_left_radius=-1,
         border_top_right_radius=-1, border_bottom_left_radius=-1,
         border_bottom_right_radius=-1):
    """A rectangle: filled (width=0) or its border width pixels thick."""
    _screen(surface)
    area = Rect(rect)
    if width < 0:
        return Rect(area.x, area.y, 0, 0)
    corners = (int(border_top_left_radius), int(border_top_right_radius),
               int(border_bottom_left_radius), int(border_bottom_right_radius))
    _sz.rect(area.x, area.y, area.w, area.h, color, int(width), int(border_radius), corners)
    return Rect(area)


def polygon(surface, color, points, width=0):
    """A shape with corners at the points: filled (width=0) or only its border."""
    _screen(surface)
    if width:
        # pygame draws the border of a polygon with pygame.draw.lines, closed.
        return lines(surface, color, True, points, width)
    points = _points(points)
    if len(points) < 3:
        raise ValueError('Um polígono precisa de pelo menos 3 pontos.')
    _sz.polygon(points, color, 0)
    return _bounds(points)


def circle(surface, color, center, radius, width=0, draw_top_right=None, draw_top_left=None,
           draw_bottom_left=None, draw_bottom_right=None):
    """A circle: filled (width=0) or a ring width pixels thick."""
    _screen(surface)
    x, y = center
    radius = int(radius)
    if width < 0 or radius < 1:
        return Rect(int(x), int(y), 0, 0)
    # As in pygame-ce, a quarter is drawn when its value is above zero.
    quarters = tuple(int(part or 0) for part in (draw_top_right, draw_top_left,
                                                 draw_bottom_left, draw_bottom_right))
    _sz.circle((x, y), radius, color, int(width), quarters)
    return Rect(int(x) - radius, int(y) - radius, radius * 2, radius * 2)


def ellipse(surface, color, rect, width=0):
    """An ellipse that fills the rectangle: filled (width=0) or a ring."""
    _screen(surface)
    area = Rect(rect)
    if width < 0:
        return Rect(area.x, area.y, 0, 0)
    _sz.ellipse(area.x, area.y, area.w, area.h, color, int(width))
    return Rect(area)


def arc(surface, color, rect, start_angle, stop_angle, width=1):
    """Part of the ellipse in the rectangle, between two angles in radians (counter-clockwise)."""
    _screen(surface)
    area = Rect(rect)
    if width < 0:
        return Rect(area.x, area.y, 0, 0)
    _sz.arc(area.x, area.y, area.w, area.h, start_angle, stop_angle, color, int(width))
    return Rect(area)


def line(surface, color, start_pos, end_pos, width=1):
    """A straight line width pixels thick."""
    _screen(surface)
    points = _points((start_pos, end_pos))
    if width < 1:
        return Rect(points[0][0], points[0][1], 0, 0)
    _sz.line(points[0], points[1], color, int(width))
    return _bounds(points, width)


def lines(surface, color, closed, points, width=1):
    """Lines joining the points one after the other (and the last to the first when closed)."""
    _screen(surface)
    points = _points(points)
    if len(points) < 2:
        raise ValueError('pygame.draw.lines precisa de pelo menos 2 pontos.')
    if width < 1:
        return Rect(points[0][0], points[0][1], 0, 0)
    pairs = list(zip(points, points[1:]))
    if closed and len(points) > 2:
        pairs.append((points[-1], points[0]))
    for start, end in pairs:
        _sz.line(start, end, color, int(width))
    return _bounds(points, width)


def aaline(surface, color, start_pos, end_pos, blend=1):
    """A thin line (in the Studio without the smoothing pygame gives it)."""
    return line(surface, color, start_pos, end_pos, 1)


def aalines(surface, color, closed, points, blend=1):
    return lines(surface, color, closed, points, 1)


__all__ = ['rect', 'polygon', 'circle', 'ellipse', 'arc', 'line', 'lines', 'aaline', 'aalines']
