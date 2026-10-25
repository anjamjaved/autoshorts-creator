import json
import os
from typing import Any, Callable, Dict, List, Optional
import warnings

warnings.filterwarnings("ignore", message=".*Triton.*")


WHISPER_SPECS = {
    "tiny": {"vram": "~0.5 GB (Faster)", "desc": "Ultra rápido, precisión básica", "recommended": False},
    "base": {"vram": "~0.7 GB (Faster)", "desc": "Rápido y ligero", "recommended": False},
    "small": {"vram": "~1.2 GB (Faster)", "desc": "Equilibrado para pruebas rápidas", "recommended": False},
    "medium": {"vram": "~2.5 GB (Faster)", "desc": "Gran precisión para la mayoría de audios", "recommended": False},
    "large-v3-turbo": {"vram": "~3.2 GB (Faster)", "desc": "Máxima velocidad + Altísima precisión (Recomendado para RTX 2060 12GB)", "recommended": True},
    "large-v3": {"vram": "~4.5 GB (Faster)", "desc": "Máxima precisión absoluta en español y jerga gamer", "recommended": False},
}


def faster_whisper_available() -> bool:
    try:
        import faster_whisper
        return True
    except ImportError:
        return False


def get_installed_whisper_models() -> List[Dict[str, Any]]:
    installed_ids = set()

    # Check faster-whisper Hugging Face cache
    hf_hub_dir = os.path.expanduser("~/.cache/huggingface/hub")
    if os.path.exists(hf_hub_dir):
        for d in os.listdir(hf_hub_dir):
            dl = d.lower()
            if "faster-whisper" in dl:
                for mid in ["large-v3-turbo", "large-v3", "medium", "small", "base", "tiny"]:
                    if mid in dl:
                        installed_ids.add(mid)

    models = []
    ordered_ids = ["large-v3-turbo", "large-v3", "medium", "base", "small", "tiny"]
    for mid in ordered_ids:
        spec = WHISPER_SPECS.get(mid, {"vram": "~2 GB", "desc": "Modelo estándar", "recommended": False})
        is_installed = mid in installed_ids or (mid == "large-v3-turbo" and "turbo" in installed_ids)
        models.append({
            "id": mid,
            "name": mid,
            "vram": spec["vram"],
            "desc": spec["desc"],
            "recommended": spec["recommended"],
            "downloaded": is_installed
        })
    return models


def whisper_available() -> bool:
    return faster_whisper_available()


def transcribe_local(
    audio_path: str,
    model_name: str = "large-v3-turbo",
    progress_callback: Optional[Any] = None,
    is_cancelled: Optional[Callable[[], bool]] = None
) -> Dict[str, Any]:
    import torch

    if is_cancelled and is_cancelled():
        raise InterruptedError("Transcripción cancelada antes de cargar el modelo.")

    if not faster_whisper_available():
        raise RuntimeError("faster-whisper no está instalado. Ejecuta: pip install faster-whisper")

    from faster_whisper import WhisperModel

    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    gamer_initial_prompt = (
        "clutch, headshot, rushear, lootear, drop, respawn, hitbox, nerfeo, buff, "
        "streamer, lag, ping, push, dault, noob, ace, pentakill, clip, directo, "
        "discord, twitch, youtube, shorts, partida, gameplay, sniper, kill"
    )

    print(f"🚀 Using faster-whisper CTranslate2 '{model_name}' on {device} ({compute_type})...")

    if progress_callback:
        try:
            progress_callback(5)
        except Exception:
            pass

    try:
        model = WhisperModel(model_name, device=device, compute_type=compute_type)

        if is_cancelled and is_cancelled():
            del model
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            raise InterruptedError("Transcripción cancelada por el usuario.")

        segments_gen, info = model.transcribe(
            audio_path,
            language="es",
            initial_prompt=gamer_initial_prompt,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )

        total_duration = float(info.duration) if info and info.duration else 1.0
        segments = []
        words = []

        for seg in segments_gen:
            if is_cancelled and is_cancelled():
                del model
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                raise InterruptedError("Transcripción cancelada por el usuario.")

            if progress_callback:
                pct = min(99, max(5, int((float(seg.end) / total_duration) * 100)))
                try:
                    progress_callback(pct)
                except Exception:
                    pass

            segments.append({
                "start": float(seg.start),
                "end": float(seg.end),
                "speaker": "S1",
                "text": str(seg.text).strip()
            })

            if getattr(seg, "words", None):
                for w in seg.words:
                    words.append({
                        "text": str(w.word).strip(),
                        "start": float(w.start),
                        "end": float(w.end),
                        "speaker": "S1"
                    })

        if progress_callback:
            try:
                progress_callback(100)
            except Exception:
                pass

        del model
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return {
            "language": getattr(info, "language", "es") or "es",
            "duration": total_duration,
            "speakers": ["S1"],
            "words": words,
            "segments": segments
        }

    except InterruptedError:
        print("🛑 Transcripción con faster-whisper cancelada.")
        raise
    except Exception as e:
        print(f"❌ Error en faster-whisper: {e}")
        raise
