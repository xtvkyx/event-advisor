"""Speech to text with Whisper (faster-whisper, runs on CPU). The model loads once, on first use.

    pip install -r server/requirements-whisper.txt
    WHISPER_MODEL=base   (tiny / base / small; larger is more accurate and slower)
"""
import os
import threading

_model = None
_lock = threading.Lock()


def available():
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def model_name():
    return os.environ.get('WHISPER_MODEL', 'base')


def _load():
    global _model
    with _lock:
        if _model is None:
            from faster_whisper import WhisperModel
            _model = WhisperModel(model_name(), device='cpu', compute_type='int8')
    return _model


def transcribe(path, max_seconds=600, names=()):
    """Returns {'language', 'duration', 'segments': [{start, end, text}]}; stops after max_seconds of audio.
    names: event / place names to hint, so proper names like «Tantora» are not misheard."""
    m = _load()
    prompt = ', '.join(n for n in names if n) or None
    segs, info = m.transcribe(path, vad_filter=True, beam_size=1, initial_prompt=prompt)
    out = []
    for s in segs:
        if s.start > max_seconds:
            break
        out.append({'start': s.start, 'end': s.end, 'text': s.text.strip()})
    return {'language': info.language, 'duration': round(info.duration or 0, 1), 'segments': out}
