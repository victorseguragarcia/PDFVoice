import io
import logging
import re
import os
import hashlib
import edge_tts

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.realpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache", "audio"))
os.makedirs(CACHE_DIR, exist_ok=True)

EDGE_VOICES_CONFIG = {
    "es-ES-ElviraNeural": {
        "gender": "Female",
        "name": "Elvira (España)",
        "lang": "es",
        "locale": "es-ES"
    },
    "es-ES-AlvaroNeural": {
        "gender": "Male",
        "name": "Alvaro (España)",
        "lang": "es",
        "locale": "es-ES"
    },
    "es-MX-DaliaNeural": {
        "gender": "Female",
        "name": "Dalia (México)",
        "lang": "es",
        "locale": "es-MX"
    },
    "es-MX-JorgeNeural": {
        "gender": "Male",
        "name": "Jorge (México)",
        "lang": "es",
        "locale": "es-MX"
    },
    "es-AR-TomasNeural": {
        "gender": "Male",
        "name": "Tomás (Argentina)",
        "lang": "es",
        "locale": "es-AR"
    },
    "es-AR-ElenaNeural": {
        "gender": "Female",
        "name": "Elena (Argentina)",
        "lang": "es",
        "locale": "es-AR"
    },
    "en-US-AriaNeural": {
        "gender": "Female",
        "name": "Aria (US)",
        "lang": "en",
        "locale": "en-US"
    },
    "en-US-ChristopherNeural": {
        "gender": "Male",
        "name": "Christopher (US)",
        "lang": "en",
        "locale": "en-US"
    },
    "en-GB-SoniaNeural": {
        "gender": "Female",
        "name": "Sonia (UK)",
        "lang": "en",
        "locale": "en-GB"
    },
    "en-GB-RyanNeural": {
        "gender": "Male",
        "name": "Ryan (UK)",
        "lang": "en",
        "locale": "en-GB"
    },
    "fr-FR-DeniseNeural": {
        "gender": "Female",
        "name": "Denise (France)",
        "lang": "fr",
        "locale": "fr-FR"
    },
    "fr-FR-HenriNeural": {
        "gender": "Male",
        "name": "Henri (France)",
        "lang": "fr",
        "locale": "fr-FR"
    },
    "de-DE-KatjaNeural": {
        "gender": "Female",
        "name": "Katja (Germany)",
        "lang": "de",
        "locale": "de-DE"
    },
    "de-DE-ConradNeural": {
        "gender": "Male",
        "name": "Conrad (Germany)",
        "lang": "de",
        "locale": "de-DE"
    }
}

def _build_voice_list():
    voices = []
    for short_name, cfg in EDGE_VOICES_CONFIG.items():
        voices.append({
            "short_name": short_name,
            "friendly_name": f"Edge {cfg['name']}",
            "locale": cfg['locale'],
            "language": cfg['lang'],
            "gender": cfg['gender'],
        })
    return voices

ALL_VOICES = _build_voice_list()

class TTSService:
    """Stateless TTS service using Microsoft Edge TTS (cloud)."""

    @staticmethod
    async def synthesize(
        text: str,
        voice: str = "es-ES-ElviraNeural",
        rate: str = "+0%",
        pitch: str = "+0Hz",
    ):
        if not text or not text.strip():
            raise ValueError("El texto está vacío.")

        # Fallback to default voice if not found
        if voice not in EDGE_VOICES_CONFIG:
            logger.warning("Voice '%s' not found, falling back to default", voice)
            voice = "es-ES-ElviraNeural"

        clean_text = text.strip().replace("\n", " ")
        
        # 1. Generate MD5 Hash for caching
        hash_str = f"{clean_text}_{voice}_{rate}_{pitch}"
        audio_hash = hashlib.md5(hash_str.encode("utf-8")).hexdigest()
        cache_filepath = os.path.join(CACHE_DIR, f"{audio_hash}.mp3")

        # 2. If cached, stream from disk
        if os.path.exists(cache_filepath):
            logger.info("Cache hit for TTS audio: %s", audio_hash)
            try:
                with open(cache_filepath, "rb") as f:
                    while chunk := f.read(65536):  # 64KB chunks
                        yield chunk
                return
            except Exception as e:
                logger.error("Error reading from TTS cache: %s", e)
                # Fallback to re-generating if read fails

        logger.info("Cache miss for TTS audio, generating new: %s", audio_hash)

        # 3. Split text into chunks if it exceeds the Edge TTS limit (~2000 chars)
        chunks = []
        if len(clean_text) <= 2000:
            chunks = [clean_text]
        else:
            # Split by punctuation (.,!?) to avoid cutting mid-sentence
            sentences = re.split(r'(?<=[.!?])\s+', clean_text)
            current_chunk = ""
            for sentence in sentences:
                if len(current_chunk) + len(sentence) < 1900:
                    current_chunk += sentence + " "
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    # If a single sentence is crazily long, forcefully truncate it
                    if len(sentence) >= 1900:
                        chunks.append(sentence[:1900])
                        current_chunk = sentence[1900:] + " "
                    else:
                        current_chunk = sentence + " "
            if current_chunk.strip():
                chunks.append(current_chunk.strip())

        try:
            # Open file to save while streaming
            with open(cache_filepath, "wb") as f:
                for chunk in chunks:
                    communicate = edge_tts.Communicate(chunk, voice, rate=rate, pitch=pitch)
                    async for audio_chunk in communicate.stream():
                        if audio_chunk["type"] == "audio":
                            data = audio_chunk["data"]
                            f.write(data)
                            yield data
        except Exception as e:
            logger.error(f"Error in synthesize ({voice}): {e}")
            # If generation fails halfway, delete the corrupt cache file
            if os.path.exists(cache_filepath):
                os.remove(cache_filepath)
            raise RuntimeError(f"Error generando audio con {voice}: {str(e)}")

    @staticmethod
    async def list_voices() -> list[dict]:
        return ALL_VOICES
