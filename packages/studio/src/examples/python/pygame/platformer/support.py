from settings import *

# The images now come from the Pinta drawings (pinta.carregar_sprite, pinta.carregar_mapa),
# so import_image and import_folder are no longer needed. The sounds still come from a folder.

def audio_importer(*path):
    audio_dict = {}
    for folder_path, _, file_names in walk(join(*path)):
        for file_name in file_names:
            # assets/ also holds the drawings: only the sound files become sounds
            if file_name.endswith('.wav') or file_name.endswith('.ogg'):
                full_path = join(folder_path, file_name)
                audio_dict[file_name.split('.')[0]] = pygame.mixer.Sound(full_path)
    return audio_dict
