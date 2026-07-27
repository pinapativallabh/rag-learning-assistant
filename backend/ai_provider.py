import os
from typing import AsyncGenerator
from abc import ABC, abstractmethod
from dotenv import load_dotenv

load_dotenv()

# --- Chat Models ---

class BaseChatClient(ABC):
    @abstractmethod
    async def chat(self, prompt: str) -> str:
        pass

    @abstractmethod
    async def chat_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

class OllamaChatClient(BaseChatClient):
    def __init__(self, model_name: str, base_url: str = None):
        import ollama
        self._model_name = model_name
        self.client = ollama.AsyncClient(host=base_url)
        self.sync_client = ollama.Client(host=base_url)

    @property
    def model_name(self) -> str:
        return self._model_name

    async def chat(self, prompt: str) -> str:
        try:
            res = await self.client.chat(
                model=self._model_name,
                messages=[{"role": "user", "content": prompt}]
            )
            return res["message"]["content"]
        except Exception as e:
            try:
                res = self.sync_client.chat(
                    model=self._model_name,
                    messages=[{"role": "user", "content": prompt}]
                )
                return res["message"]["content"]
            except Exception as inner_e:
                raise RuntimeError(f"Ollama local generation failed: {inner_e}") from e

    async def chat_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            stream_res = await self.client.chat(
                model=self._model_name,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            )
            async for chunk in stream_res:
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield content
        except Exception as e:
            raise RuntimeError(f"Ollama local streaming generation failed: {e}") from e

class GeminiChatClient(BaseChatClient):
    def __init__(self, api_key: str, model_name: str):
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self._model_name = model_name

    @property
    def model_name(self) -> str:
        return self._model_name

    async def chat(self, prompt: str) -> str:
        try:
            response = await self.client.aio.models.generate_content(
                model=self._model_name,
                contents=prompt
            )
            return response.text or ""
        except Exception as e:
            raise RuntimeError(f"Gemini API generation failed: {e}") from e

    async def chat_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            response = await self.client.aio.models.generate_content_stream(
                model=self._model_name,
                contents=prompt
            )
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            raise RuntimeError(f"Gemini API streaming generation failed: {e}") from e

# --- Embedding Models ---

class BaseEmbeddingClient(ABC):
    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        pass

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        pass

class OllamaEmbeddingClient(BaseEmbeddingClient):
    def __init__(self, model_name: str, base_url: str = None):
        import ollama
        import asyncio
        self.model_name = model_name
        self.client = ollama.AsyncClient(host=base_url)
        self.sem = asyncio.Semaphore(10)

    async def embed(self, text: str) -> list[float]:
        res = await self.client.embeddings(model=self.model_name, prompt=text)
        return res["embedding"]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        import asyncio
        batch_size = 50
        all_embeddings = []
        
        print(f"\n[DEBUG] Starting embedding generation using Ollama")
        print(f"[DEBUG] Model: {self.model_name}")
        print(f"[DEBUG] Total input chunks: {len(texts)}")

        async def embed_text(text: str):
            async with self.sem:
                res = await self.client.embeddings(model=self.model_name, prompt=text)
                return res

        for i in range(0, len(texts), batch_size):
            batch_num = (i // batch_size) + 1
            chunk = texts[i:i + batch_size]
            print(f"[DEBUG] Batch {batch_num} | Size: {len(chunk)}")
            
            tasks = [embed_text(t) for t in chunk]
            results = await asyncio.gather(*tasks)
            
            if results:
                print(f"[DEBUG] Type of response (first item): {type(results[0])}")
                try:
                    print(f"[DEBUG] Repr of response schema keys: {list(results[0].keys())}")
                except Exception:
                    pass

            batch_embeddings = [res["embedding"] for res in results]
            
            if batch_embeddings:
                print(f"[DEBUG] Vectors returned in batch {batch_num}: {len(batch_embeddings)}")
                print(f"[DEBUG] Dimension of first vector: {len(batch_embeddings[0])}")
                
            all_embeddings.extend(batch_embeddings)
            print(f"[DEBUG] Running total: {len(all_embeddings)}")

        print(f"[DEBUG] Final total chunks: {len(texts)}")
        print(f"[DEBUG] Final total embeddings: {len(all_embeddings)}")
        
        return all_embeddings

class GeminiEmbeddingClient(BaseEmbeddingClient):
    def __init__(self, api_key: str, model_name: str):
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    async def embed(self, text: str) -> list[float]:
        res = await self.client.aio.models.embed_content(
            model=self.model_name,
            contents=text
        )
        return res.embeddings[0].values

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        import asyncio
        batch_size = 50
        all_embeddings = []
        
        print(f"\n[DEBUG] Starting embedding generation using Gemini")
        print(f"[DEBUG] Model: {self.model_name}")
        print(f"[DEBUG] Total input chunks: {len(texts)}")
        
        sem = asyncio.Semaphore(15)
        
        async def embed_single(text: str):
            async with sem:
                res = await self.client.aio.models.embed_content(
                    model=self.model_name,
                    contents=text
                )
                return res
                
        for i in range(0, len(texts), batch_size):
            batch_num = (i // batch_size) + 1
            chunk = texts[i:i + batch_size]
            print(f"[DEBUG] Batch {batch_num} | Size: {len(chunk)}")
            
            tasks = [embed_single(t) for t in chunk]
            results = await asyncio.gather(*tasks)
            
            if results:
                print(f"[DEBUG] Type of response (first item): {type(results[0])}")
                try:
                    print(f"[DEBUG] Repr of response: {repr(results[0])}")
                except Exception as e:
                    pass
                
            batch_embeddings = []
            for res in results:
                # The response has an 'embeddings' attribute which is a list of Embedding objects
                batch_embeddings.append(res.embeddings[0].values)
            
            if batch_embeddings:
                print(f"[DEBUG] Vectors returned in batch {batch_num}: {len(batch_embeddings)}")
                print(f"[DEBUG] Dimension of first vector: {len(batch_embeddings[0])}")
            
            all_embeddings.extend(batch_embeddings)
            print(f"[DEBUG] Running total: {len(all_embeddings)}")
            
        print(f"[DEBUG] Final total chunks: {len(texts)}")
        print(f"[DEBUG] Final total embeddings: {len(all_embeddings)}")
        return all_embeddings

# --- Factories ---

class AIProvider:
    _chat_instance = None
    _embed_instance = None

    @staticmethod
    def get_chat_client() -> BaseChatClient:
        if AIProvider._chat_instance is None:
            load_dotenv()
            provider = os.getenv("AI_PROVIDER")
            if not provider:
                raise ValueError("AI_PROVIDER is not set in environment or .env file. Example: AI_PROVIDER=ollama")
            provider = provider.lower().strip()
            
            if provider == "gemini":
                api_key = os.getenv("GEMINI_API_KEY")
                if not api_key:
                    raise ValueError("GEMINI_API_KEY is required when AI_PROVIDER is 'gemini'.")
                model_name = os.getenv("AI_MODEL")
                if not model_name:
                    raise ValueError("AI_MODEL is required when AI_PROVIDER is 'gemini'.")
                AIProvider._chat_instance = GeminiChatClient(api_key=api_key, model_name=model_name)
            
            elif provider == "ollama":
                model_name = os.getenv("AI_MODEL")
                if not model_name:
                    raise ValueError("AI_MODEL is required when AI_PROVIDER is 'ollama'.")
                base_url = os.getenv("OLLAMA_BASE_URL")
                AIProvider._chat_instance = OllamaChatClient(model_name=model_name, base_url=base_url)
            
            else:
                raise ValueError(f"Unsupported AI_PROVIDER: '{provider}'. Supported providers are 'gemini' and 'ollama'.")
        
        return AIProvider._chat_instance

    @staticmethod
    def get_embedding_client() -> BaseEmbeddingClient:
        if AIProvider._embed_instance is None:
            load_dotenv()
            provider = os.getenv("EMBEDDING_PROVIDER")
            if not provider:
                raise ValueError("EMBEDDING_PROVIDER is not set in environment or .env file. Example: EMBEDDING_PROVIDER=ollama")
            provider = provider.lower().strip()
            
            if provider == "gemini":
                api_key = os.getenv("GEMINI_API_KEY")
                if not api_key:
                    raise ValueError("GEMINI_API_KEY is required when EMBEDDING_PROVIDER is 'gemini'.")
                model_name = os.getenv("EMBEDDING_MODEL")
                if not model_name:
                    raise ValueError("EMBEDDING_MODEL is required when EMBEDDING_PROVIDER is 'gemini'.")
                AIProvider._embed_instance = GeminiEmbeddingClient(api_key=api_key, model_name=model_name)
            
            elif provider == "ollama":
                model_name = os.getenv("EMBEDDING_MODEL")
                if not model_name:
                    raise ValueError("EMBEDDING_MODEL is required when EMBEDDING_PROVIDER is 'ollama'.")
                base_url = os.getenv("OLLAMA_BASE_URL")
                AIProvider._embed_instance = OllamaEmbeddingClient(model_name=model_name, base_url=base_url)
            
            else:
                raise ValueError(f"Unsupported EMBEDDING_PROVIDER: '{provider}'. Supported providers are 'gemini' and 'ollama'.")
        
        return AIProvider._embed_instance
