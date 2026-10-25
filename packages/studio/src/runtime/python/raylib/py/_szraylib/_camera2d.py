"""Câmera 2D (rcore.c): a mesma matriz que o navegador usa para desenhar dentro de begin_mode_2d."""
import math

from . import _raymath as rm
from ._args import struct, vec2
from ._structs import Camera2D, Vector2


def camera_matrix_values(cam):
    """GetCameraMatrix2D: origem -> escala e giro -> deslocamento."""
    origin = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
              -cam.target.x, -cam.target.y, 0.0, 1.0)
    rotation = rm._rotate((0.0, 0.0, 1.0), cam.rotation * math.pi / 180.0)
    zoom = cam.zoom
    scale = (zoom, 0.0, 0.0, 0.0, 0.0, zoom, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)
    translation = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
                   cam.offset.x, cam.offset.y, 0.0, 1.0)
    return rm._mul(rm._mul(origin, rm._mul(scale, rotation)), translation)


def get_camera_matrix_2d(camera, /):
    return rm._make(camera_matrix_values(struct(camera, Camera2D, 'get_camera_matrix_2d', 'camera')))


def get_world_to_screen_2d(position, camera, /):
    f = 'get_world_to_screen_2d'
    x, y = vec2(position, f, 'position')
    m = camera_matrix_values(struct(camera, Camera2D, f, 'camera'))
    return Vector2(m[0] * x + m[4] * y + m[12], m[1] * x + m[5] * y + m[13])


def get_screen_to_world_2d(position, camera, /):
    f = 'get_screen_to_world_2d'
    x, y = vec2(position, f, 'position')
    m = rm._invert(camera_matrix_values(struct(camera, Camera2D, f, 'camera')))
    return Vector2(m[0] * x + m[4] * y + m[12], m[1] * x + m[5] * y + m[13])
