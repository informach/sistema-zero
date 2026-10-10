import json, subprocess
from pathlib import Path
from faster_whisper import WhisperModel
root=Path('output/instagram/avaliacoes/2026-10-09/fontes')
selections=[('daniel',57,20),('harle',64,36),('flavia',52,12)]
for name,start,duration in selections:
    subprocess.run(['ffmpeg','-y','-ss',str(start),'-i',str(root/f'{name}.wav'),'-t',str(duration),'-ar','16000','-ac','1',str(root/f'{name}-trecho.wav')],check=True,capture_output=True)
model=WhisperModel('medium',device='cpu',compute_type='int8',cpu_threads=6)
for name,start,duration in selections:
    segments,info=model.transcribe(str(root/f'{name}-trecho.wav'),language='pt',beam_size=5,word_timestamps=True,condition_on_previous_text=False)
    result=[{'start':s.start+start,'end':s.end+start,'text':s.text.strip(),'words':[{'start':w.start+start,'end':w.end+start,'text':w.word} for w in s.words]} for s in segments]
    (root/f'{name}-trecho-conferido.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(name,json.dumps(result,ensure_ascii=False),flush=True)
