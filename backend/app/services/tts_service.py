import io
import torch
import torchaudio
import logging

logger = logging.getLogger(__name__)

class TTSService:
    """
    Text-to-Speech service using local Silero TTS.
    """
    _instance = None
    _model = None
    _device = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = TTSService()
        return cls._instance

    def __init__(self):
        self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Loading Silero TTS model on {self._device}...")
        try:
            # Download/load model from torch hub
            self._model, _ = torch.hub.load(
                repo_or_dir='snakers4/silero-models',
                model='silero_tts',
                language='es',
                speaker='v3_es'
            )
            self._model.to(self._device)
            logger.info("Silero TTS model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Silero TTS model: {e}")
            raise e

    @classmethod
    async def synthesize(
        cls,
        text: str,
        voice: str = "es_1",
        rate: str = "+0%",
        pitch: str = "+0Hz",
    ) -> io.BytesIO:
        """
        Synthesize text into WAV audio using Silero TTS.
        """
        if not text or not text.strip():
            raise ValueError("El texto está vacío.")

        instance = cls.get_instance()
        if instance._model is None:
            raise RuntimeError("El modelo TTS no está inicializado.")

        # Ensure valid voice fallback
        if voice not in ["es_0", "es_1", "es_2"]:
            voice = "es_1"

        try:
            sample_rate = 24000
            
            # Replace some common markdown/PDF symbols that Silero might stumble on
            clean_text = text.strip().replace("\n", " ")

            # Apply Silero TTS
            audio = instance._model.apply_tts(
                text=clean_text,
                speaker=voice,
                sample_rate=sample_rate
            )

            # Convert to BytesIO
            audio_io = io.BytesIO()
            torchaudio.save(audio_io, audio.unsqueeze(0), sample_rate, format="wav")
            audio_io.seek(0)
                
            return audio_io
        except Exception as e:
            logger.error(f"Error in Silero TTS synthesize: {e}")
            raise RuntimeError(f"Error generando audio: {str(e)}")

    @classmethod
    async def list_voices(cls) -> list[dict]:
        """Returns Silero default voices."""
        return [
            {
                "short_name": "es_0",
                "friendly_name": "Silero Voz 1 (Masculina)",
                "locale": "es-ES",
                "language": "es",
                "gender": "Male"
            },
            {
                "short_name": "es_1",
                "friendly_name": "Silero Voz 2 (Femenina)",
                "locale": "es-ES",
                "language": "es",
                "gender": "Female"
            },
            {
                "short_name": "es_2",
                "friendly_name": "Silero Voz 3 (Femenina Alt)",
                "locale": "es-ES",
                "language": "es",
                "gender": "Female"
            }
        ]
