from abc import ABC, abstractmethod
from typing import AsyncGenerator
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()


class BaseLLMClient(ABC):
    """
    Abstract interface for LLM text generation.
    Supports both single-turn completion and asynchronous streaming.
    """
    @abstractmethod
    async def chat(self, prompt: str) -> str:
        """
        Sends a single prompt to the LLM and returns the full response string.
        """
        pass

    @abstractmethod
    async def chat_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """
        Sends a single prompt to the LLM and yields response chunks asynchronously.
        """
        pass


class LocalLLMClient(BaseLLMClient):
    """
    Local LLM implementation using the Ollama AsyncClient.
    Maintains embeddings and DB queries strictly local.
    """
    def __init__(self, model_name: str = "llama3:8b"):
        import ollama
        self.model_name = model_name
        self.async_client = ollama.AsyncClient()

    async def chat(self, prompt: str) -> str:
        import ollama
        try:
            res = await self.async_client.chat(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}]
            )
            return res["message"]["content"]
        except Exception as e:
            # Fallback to synchronous ollama.chat if async client fails
            try:
                res = ollama.chat(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}]
                )
                return res["message"]["content"]
            except Exception as inner_e:
                raise RuntimeError(f"Ollama local generation failed: {inner_e}") from e

    async def chat_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            stream_res = await self.async_client.chat(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            )
            async for chunk in stream_res:
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield content
        except Exception as e:
            raise RuntimeError(f"Ollama local streaming generation failed: {e}") from e


class GeminiLLMClient(BaseLLMClient):
    """
    Gemini API client implementing the BaseLLMClient interface.
    Uses the new Google GenAI SDK to handle high-speed generation when LLM_PROVIDER=gemini.
    """
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    async def chat(self, prompt: str) -> str:
        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text or ""
        except Exception as e:
            raise RuntimeError(f"Gemini API generation failed: {e}") from e

    async def chat_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            response = await self.client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=prompt
            )
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            raise RuntimeError(f"Gemini API streaming generation failed: {e}") from e


class LLMFactory:
    """
    Factory class that dynamically instantiates and returns the configured
    LLM client singleton based on the LLM_PROVIDER environment variable.
    """
    _instance = None

    @staticmethod
    def get_client() -> BaseLLMClient:
        if LLMFactory._instance is None:
            load_dotenv()
            provider = os.getenv("LLM_PROVIDER", "local").lower().strip()
            if provider == "gemini":
                api_key = os.getenv("GEMINI_API_KEY")
                if not api_key:
                    raise ValueError("GEMINI_API_KEY is not set in environment or .env file.")
                model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
                LLMFactory._instance = GeminiLLMClient(api_key=api_key, model_name=model_name)
            elif provider == "local":
                model_name = os.getenv("LOCAL_MODEL", "llama3:8b").strip()
                LLMFactory._instance = LocalLLMClient(model_name=model_name)
            else:
                raise ValueError(
                    f"Unsupported LLM_PROVIDER: '{provider}'. Supported providers are 'gemini' and 'local'."
                )
        return LLMFactory._instance
