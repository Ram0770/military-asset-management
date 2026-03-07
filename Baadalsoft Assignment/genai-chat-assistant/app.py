import json
import logging
import os
import re
import threading
from typing import Dict, List, Optional, Tuple

import numpy as np
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from openai import OpenAI
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

app = Flask(__name__)
app.logger.setLevel(logging.INFO)

DOCS_FILE = "docs.json"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
LLM_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.2"))

# Retrieval controls
TOP_K = 3
SIMILARITY_THRESHOLD = 0.45
NO_CONTEXT_REPLY = "I'm sorry, but I don't have enough information in the knowledge base to answer that."
MAX_HISTORY_PAIRS = 5

# In-memory vector store
VECTOR_STORE: List[Dict] = []
SESSION_MEMORY: Dict[str, List[Dict[str, str]]] = {}
INDEX_LOCK = threading.Lock()
INDEX_STATUS = {"ready": False, "error": None}


def error_response(message: str, code: str, status: int):
    return jsonify({"error": {"code": code, "message": message}}), status


@app.errorhandler(400)
def handle_400(_):
    return error_response("Invalid request.", "bad_request", 400)


@app.errorhandler(404)
def handle_404(_):
    return error_response("Resource not found.", "not_found", 404)


@app.errorhandler(405)
def handle_405(_):
    return error_response("Method not allowed.", "method_not_allowed", 405)


@app.errorhandler(500)
def handle_500(_):
    return error_response("Internal server error.", "internal_server_error", 500)


def load_documents(file_path: str) -> List[Dict[str, str]]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Missing required file: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        docs = json.load(f)

    if not isinstance(docs, list):
        raise ValueError("docs.json must contain a JSON array of documents.")

    for i, doc in enumerate(docs):
        if "title" not in doc or "content" not in doc:
            raise ValueError(f"Document at index {i} must include 'title' and 'content'.")

    return docs


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_into_sentences(text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


def estimate_token_count(text: str) -> int:
    words = len(text.split())
    return int(words * 1.33)


def chunk_text(
    title: str,
    text: str,
    target_tokens: int = 380,
    overlap_tokens: int = 80,
) -> List[Dict[str, str]]:
    text = normalize_text(text)
    sentences = split_into_sentences(text)

    chunks: List[Dict[str, str]] = []
    current_sentences: List[str] = []
    current_tokens = 0
    chunk_index = 1

    for sentence in sentences:
        sentence_tokens = estimate_token_count(sentence)

        if current_sentences and (current_tokens + sentence_tokens > target_tokens):
            chunk_content = " ".join(current_sentences).strip()
            chunks.append(
                {
                    "chunk_id": f"{title.lower().replace(' ', '_')}_{chunk_index}",
                    "title": title,
                    "content": chunk_content,
                }
            )
            chunk_index += 1

            overlap_sentences: List[str] = []
            overlap_count = 0
            for s in reversed(current_sentences):
                t = estimate_token_count(s)
                if overlap_count + t > overlap_tokens:
                    break
                overlap_sentences.insert(0, s)
                overlap_count += t

            current_sentences = overlap_sentences.copy()
            current_tokens = overlap_count

        current_sentences.append(sentence)
        current_tokens += sentence_tokens

    if current_sentences:
        chunks.append(
            {
                "chunk_id": f"{title.lower().replace(' ', '_')}_{chunk_index}",
                "title": title,
                "content": " ".join(current_sentences).strip(),
            }
        )

    return chunks


def chunk_documents(docs: List[Dict[str, str]]) -> List[Dict[str, str]]:
    all_chunks: List[Dict[str, str]] = []
    for doc in docs:
        all_chunks.extend(chunk_text(doc["title"], doc["content"]))
    return all_chunks


def get_openai_client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing. Set it in your .env file.")
    if OPENAI_BASE_URL:
        return OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL, timeout=20.0)
    return OpenAI(api_key=OPENAI_API_KEY, timeout=20.0)


def generate_embedding(text: str) -> List[float]:
    if not text or not text.strip():
        raise ValueError("Cannot generate embedding for empty text.")

    try:
        client = get_openai_client()
        resp = client.embeddings.create(model=EMBEDDING_MODEL, input=text.strip())
        return resp.data[0].embedding
    except AuthenticationError as e:
        raise RuntimeError("Invalid OpenAI API key.") from e
    except APITimeoutError as e:
        raise RuntimeError("Embeddings API request timed out.") from e
    except RateLimitError as e:
        raise RuntimeError("Embeddings API rate limit hit.") from e
    except BadRequestError as e:
        raise RuntimeError(f"Bad embeddings request: {e}") from e
    except APIConnectionError as e:
        raise RuntimeError("Network/API connection error while generating embedding.") from e
    except APIStatusError as e:
        raise RuntimeError(f"Embeddings API status error: {e.status_code}") from e
    except Exception as e:
        message = str(e)
        if "OPENAI_API_KEY is missing" in message:
            raise RuntimeError("OPENAI_API_KEY is missing. Set it in your .env file.") from e
        raise RuntimeError(f"Unexpected embedding error: {e}") from e


def build_vector_store(chunks: List[Dict[str, str]]) -> List[Dict]:
    store: List[Dict] = []
    for idx, chunk in enumerate(chunks, start=1):
        embedding = generate_embedding(chunk["content"])
        store.append(
            {
                "chunk_id": chunk["chunk_id"],
                "title": chunk["title"],
                "content": chunk["content"],
                "embedding": embedding,
            }
        )
        if idx % 5 == 0 or idx == len(chunks):
            print(f"[Indexing] Embedded {idx}/{len(chunks)} chunks")
    return store


def ensure_vector_store() -> None:
    """Build the in-memory index on first use so the web server can boot immediately."""
    if INDEX_STATUS["ready"]:
        return

    with INDEX_LOCK:
        if INDEX_STATUS["ready"]:
            return

        INDEX_STATUS["error"] = None
        try:
            app.logger.info("Building vector store with %s chunks", len(CHUNKS))
            VECTOR_STORE.clear()
            VECTOR_STORE.extend(build_vector_store(CHUNKS))
            INDEX_STATUS["ready"] = True
            app.logger.info("Vector store ready with %s vectors", len(VECTOR_STORE))
        except Exception as exc:
            INDEX_STATUS["error"] = str(exc)
            app.logger.exception("Vector store initialization failed")
            raise


def find_similar_chunks(
    query_embedding: List[float],
    top_k: int = TOP_K,
    threshold: float = SIMILARITY_THRESHOLD,
) -> List[Dict]:
    if not VECTOR_STORE:
        return []

    query_vec = np.array(query_embedding, dtype=np.float32).reshape(1, -1)
    matrix = np.array([row["embedding"] for row in VECTOR_STORE], dtype=np.float32)

    scores = cosine_similarity(query_vec, matrix)[0]
    ranked_indices = np.argsort(scores)[::-1]

    results: List[Dict] = []
    for idx in ranked_indices:
        row = VECTOR_STORE[int(idx)]
        score = float(scores[int(idx)])
        print(f"[Search] chunk_id={row['chunk_id']} score={score:.4f}")

        if score >= threshold:
            results.append(
                {
                    "chunk_id": row["chunk_id"],
                    "title": row["title"],
                    "content": row["content"],
                    "score": score,
                }
            )
            if len(results) >= top_k:
                break

    return results


def format_history(history: List[Dict[str, str]], max_pairs: int = 3) -> str:
    if not history:
        return "No prior conversation."

    recent = history[-(max_pairs * 2) :]
    lines: List[str] = []
    for msg in recent:
        role = msg.get("role", "user").lower().strip()
        content = msg.get("content", "").strip()
        if not content:
            continue
        prefix = "User" if role == "user" else "Assistant"
        lines.append(f"{prefix}: {content}")

    return "\n".join(lines) if lines else "No prior conversation."


def trim_history(history: List[Dict[str, str]], max_pairs: int = MAX_HISTORY_PAIRS) -> List[Dict[str, str]]:
    """Keep only the latest N user-assistant pairs."""
    return history[-(max_pairs * 2) :]


def format_retrieved_context(similar_chunks: List[Dict]) -> str:
    if not similar_chunks:
        return "No relevant context retrieved."

    blocks: List[str] = []
    for i, chunk in enumerate(similar_chunks, start=1):
        blocks.append(
            f"[Context {i}] Title: {chunk['title']} | Chunk ID: {chunk['chunk_id']} | Score: {chunk['score']:.4f}\n"
            f"{chunk['content']}"
        )
    return "\n\n".join(blocks)


def build_rag_prompt(context: str, history: str, question: str) -> Tuple[str, str]:
    system_prompt = (
        "You are a support assistant for the NimbusDesk SaaS product.\n"
        "You must answer ONLY from the provided context.\n"
        "If the answer is not in the context, say exactly:\n"
        "\"I'm sorry, but I don't have enough information in the knowledge base to answer that.\"\n"
        "Do not invent features, policies, pricing, or steps.\n"
        "Be concise, accurate, and practical."
    )

    user_prompt = (
        f"Context:\n{context}\n\n"
        f"Conversation History:\n{history}\n\n"
        f"User Question:\n{question}\n"
    )
    return system_prompt, user_prompt


def get_llm_response(context: str, history: str, question: str) -> Tuple[str, Optional[int]]:
    """
    Calls LLM API with grounded prompt.
    Returns: (answer_text, tokens_used_or_none)
    """
    if LLM_TEMPERATURE < 0 or LLM_TEMPERATURE > 0.3:
        raise RuntimeError("LLM_TEMPERATURE must be between 0 and 0.3 for grounded answers.")

    system_prompt, user_prompt = build_rag_prompt(context, history, question)

    try:
        client = get_openai_client()
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        answer = (resp.choices[0].message.content or "").strip()
        if not answer:
            answer = NO_CONTEXT_REPLY

        tokens_used = resp.usage.total_tokens if resp.usage else None
        return answer, tokens_used

    except AuthenticationError as e:
        raise RuntimeError("Invalid OpenAI API key for LLM.") from e
    except APITimeoutError as e:
        raise RuntimeError("LLM request timed out.") from e
    except RateLimitError as e:
        raise RuntimeError("LLM rate limit hit. Please retry.") from e
    except BadRequestError as e:
        raise RuntimeError(f"Bad LLM request: {e}") from e
    except APIConnectionError as e:
        raise RuntimeError("Network/API connection error while calling LLM.") from e
    except APIStatusError as e:
        raise RuntimeError(f"LLM API status error: {e.status_code}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected LLM error: {e}") from e


DOCUMENTS = load_documents(DOCS_FILE)
CHUNKS = chunk_documents(DOCUMENTS)

print(f"[Startup] Loaded {len(DOCUMENTS)} documents.")
print(f"[Startup] Created {len(CHUNKS)} chunks for retrieval.")
print(f"[Startup] Embedding model set to: {EMBEDDING_MODEL}")
print(f"[Startup] LLM model set to: {LLM_MODEL}")
print(f"[Startup] Similarity threshold set to {SIMILARITY_THRESHOLD}")


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "documentsLoaded": len(DOCUMENTS),
            "chunksCreated": len(CHUNKS),
            "vectorsIndexed": len(VECTOR_STORE),
            "vectorStoreReady": INDEX_STATUS["ready"],
            "vectorStoreError": INDEX_STATUS["error"],
            "embeddingModel": EMBEDDING_MODEL,
            "llmModel": LLM_MODEL,
            "llmTemperature": LLM_TEMPERATURE,
            "topK": TOP_K,
            "similarityThreshold": SIMILARITY_THRESHOLD,
        }
    )


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/debug/ask")
def debug_ask():
    query = request.args.get("query", "").strip()
    if not query:
        return error_response("Query is required.", "validation_error", 400)

    try:
        ensure_vector_store()
        query_embedding = generate_embedding(query)
        similar = find_similar_chunks(query_embedding)

        if not similar:
            return jsonify(
                {
                    "query": query,
                    "reply": NO_CONTEXT_REPLY,
                    "tokensUsed": None,
                    "retrievedChunks": 0,
                }
            )

        context = format_retrieved_context(similar)
        history = format_history([])
        answer, tokens_used = get_llm_response(context, history, query)

        return jsonify(
            {
                "query": query,
                "reply": answer,
                "tokensUsed": tokens_used,
                "retrievedChunks": len(similar),
            }
        )
    except RuntimeError as e:
        return error_response(str(e), "upstream_error", 502)
    except Exception:
        app.logger.exception("Unhandled error in /debug/ask")
        return error_response("Internal server error.", "internal_server_error", 500)


@app.post("/api/chat")
def api_chat():
    """
    Chat endpoint for RAG flow.
    Request:
    {
      "sessionId": "abc123",
      "message": "How can I reset my password?"
    }
    """
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("Invalid JSON body.", "invalid_json", 400)

    session_id = str(payload.get("sessionId", "")).strip()
    message = str(payload.get("message", "")).strip()

    if not session_id:
        return error_response("sessionId is required.", "validation_error", 400)
    if not message:
        return error_response("message is required.", "validation_error", 400)

    try:
        ensure_vector_store()
        session_history = SESSION_MEMORY.get(session_id, [])
        session_history = trim_history(session_history, MAX_HISTORY_PAIRS)

        # 1) Embed query
        query_embedding = generate_embedding(message)

        # 2) Similarity search + top chunks
        similar_chunks = find_similar_chunks(query_embedding)

        # 3) Threshold fallback (anti-hallucination)
        if not similar_chunks:
            return jsonify(
                {
                    "reply": NO_CONTEXT_REPLY,
                    "tokensUsed": None,
                    "retrievedChunks": 0,
                }
            )

        # 4) Construct grounded prompt
        context = format_retrieved_context(similar_chunks)
        history = format_history(session_history, max_pairs=MAX_HISTORY_PAIRS)

        # 5) Call LLM
        answer, tokens_used = get_llm_response(context, history, message)

        # 6) Update per-session memory
        session_history.append({"role": "user", "content": message})
        session_history.append({"role": "assistant", "content": answer})
        SESSION_MEMORY[session_id] = trim_history(session_history, MAX_HISTORY_PAIRS)

        # 7) Return API response
        return jsonify(
            {
                "reply": answer,
                "tokensUsed": tokens_used,
                "retrievedChunks": len(similar_chunks),
            }
        )

    except ValueError as e:
        return error_response(str(e), "validation_error", 400)
    except RuntimeError as e:
        message_lower = str(e).lower()
        if "rate limit" in message_lower:
            return error_response(str(e), "rate_limited", 429)
        if "api key" in message_lower:
            return error_response(str(e), "auth_error", 401)
        if "timed out" in message_lower:
            return error_response(str(e), "timeout", 504)
        return error_response(str(e), "upstream_error", 502)
    except Exception:
        app.logger.exception("Unhandled error in /api/chat")
        return error_response("Internal server error.", "internal_server_error", 500)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
