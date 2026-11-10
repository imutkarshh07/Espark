import json
import unittest
from unittest.mock import patch
from app.core.vector_store import ChromaVectorStore
from app.rag.chunker import TextChunker
from app.services.gemini_service import GeminiService, GeminiServiceError


class TestRAGMicroservice(unittest.TestCase):
    def test_chunker(self):
        chunker = TextChunker(chunk_size=10, chunk_overlap=2)
        pages = [
            {"page": 1, "text": "Newton's first law of motion states that an object remains at rest unless acted upon."}
        ]
        metadata = {"user_id": "u1", "document_id": "d1"}
        chunks = chunker.chunk_document(pages, metadata)
        self.assertTrue(len(chunks) > 0)
        self.assertEqual(chunks[0]["metadata"]["user_id"], "u1")
        self.assertEqual(chunks[0]["metadata"]["page"], 1)

    def test_vector_store_isolation(self):
        store = ChromaVectorStore(persist_directory="./data/test_data", collection_name="test_isolation_unit")

        # User A document
        store.add_documents(
            texts=["User A private chemistry notes"],
            embeddings=[[0.05] * 384],
            metadatas=[{"user_id": "user_a", "document_id": "chem_a"}],
            ids=["chunk_a_1"]
        )

        # User B document
        store.add_documents(
            texts=["User B confidential history essay"],
            embeddings=[[0.05] * 384],
            metadatas=[{"user_id": "user_b", "document_id": "hist_b"}],
            ids=["chunk_b_1"]
        )

        # Query as User A
        hits_a = store.query(query_embedding=[0.05] * 384, user_id="user_a")
        for hit in hits_a:
            self.assertEqual(hit["metadata"]["user_id"], "user_a")
            self.assertNotEqual(hit["metadata"]["document_id"], "hist_b")

        # Query as User B
        hits_b = store.query(query_embedding=[0.05] * 384, user_id="user_b")
        for hit in hits_b:
            self.assertEqual(hit["metadata"]["user_id"], "user_b")
            self.assertNotEqual(hit["metadata"]["document_id"], "chem_a")

    def test_gemini_fallback_diagnosis(self):
        service = GeminiService()
        result = service.analyze_mistake_with_context(
            question="Calculate force with mass 2kg and acceleration 3m/s^2",
            student_answer="5 N",
            correct_answer="6 N",
            topic="Newtonian Mechanics",
            context_chunks=["F = m * a where F is force in Newtons."]
        )
        self.assertIn("category", result)
        self.assertIn(result["category"], ["conceptual", "careless", "time_pressure", "memory", "calculation"])
        self.assertIn("confidence", result)
        self.assertIn("reason", result)
        self.assertIn("practice_questions", result)
        self.assertTrue(len(result["practice_questions"]) > 0)

    def test_quiz_generation_still_uses_configured_model(self):
        service = GeminiService(model="gemini-test-configured")
        generated_question = {
            "question_text": "Which process moves water across a selectively permeable membrane?",
            "options": ["Osmosis", "Diffusion", "Active transport", "Filtration"],
            "correct_answer": "Osmosis",
            "explanation": "Osmosis is the movement of water across a selectively permeable membrane.",
            "subject": "Biology",
            "chapter": "Cell Transport",
        }

        class FakeModels:
            calls = []

            def generate_content(self, **kwargs):
                self.calls.append(kwargs)
                return type("Response", (), {
                    "text": json.dumps({"questions": [generated_question]})
                })()

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        questions = service.generate_quiz_questions(
            exam="NEET",
            class_level="12",
            subjects=["Biology"],
            chapters={"Biology": "Cell Transport"},
            subtopic=None,
            difficulty="easy",
            count=1,
        )

        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]["correct_answer"], "Osmosis")
        self.assertEqual(service._client.models.calls[0]["model"], "gemini-test-configured")

    def test_solve_doubt(self):
        service = GeminiService()
        class FakeModels:
            def generate_content(self, model, contents):
                self.model = model
                self.contents = contents
                return type("Response", (), {
                    "text": '{"answer":"Osmosis is water movement through a selectively permeable membrane.","key_takeaways":["Water moves down its water potential gradient."],"suggested_followups":["What is a hypertonic solution?"],"confidence":0.97}'
                })()

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        result = service.solve_doubt(
            query="Explain osmosis",
            subject="Auto-Detect",
            chapter="General",
        )
        self.assertIn("selectively permeable membrane", result["answer"])
        self.assertEqual(len(result["key_takeaways"]), 1)
        self.assertEqual(len(result["suggested_followups"]), 1)
        self.assertIn("infer it from the question", service._client.models.contents[0])

    def test_solve_doubt_requires_configured_ai(self):
        service = GeminiService()
        service._client = None

        with self.assertRaises(GeminiServiceError) as raised:
            service.solve_doubt(query="Explain osmosis")

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.code, "AI_PROVIDER_NOT_CONFIGURED")

    def test_solve_doubt_maps_provider_timeout(self):
        service = GeminiService()

        class FailingModels:
            def generate_content(self, model, contents):
                raise TimeoutError("provider timed out")

        class FakeClient:
            models = FailingModels()

        service._client = FakeClient()
        with patch("app.services.gemini_service.time.sleep"):
            with self.assertRaises(GeminiServiceError) as raised:
                service.solve_doubt(query="Explain osmosis")

        self.assertEqual(raised.exception.status_code, 504)
        self.assertEqual(raised.exception.code, "AI_PROVIDER_TIMEOUT")

    def test_doubt_retries_transient_provider_error_then_succeeds(self):
        service = GeminiService(model="gemini-test-configured")

        class ProviderError(Exception):
            code = 503

        class FakeModels:
            calls = 0
            models_used = []

            def generate_content(self, model, contents):
                self.calls += 1
                self.models_used.append(model)
                if self.calls == 1:
                    raise ProviderError("temporarily unavailable")
                return "generated response"

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        with patch("app.services.gemini_service.time.sleep"):
            response = service._generate_doubt_content(["question"])

        self.assertEqual(response, "generated response")
        self.assertEqual(service._client.models.calls, 2)
        self.assertEqual(
            service._client.models.models_used,
            ["gemini-test-configured", "gemini-test-configured"],
        )

    def test_model_fallback_list_contains_only_supported_multimodal_flash_models(self):
        service = GeminiService(model="gemini-test-configured")

        self.assertEqual(
            service._get_models_to_try(),
            [
                "gemini-test-configured",
                "gemini-3.8-flash",
                "gemini-3.6-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
            ],
        )
        self.assertEqual(
            GeminiService(model="gemini-3.8-flash")._get_models_to_try(),
            [
                "gemini-3.8-flash",
                "gemini-3.6-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
            ],
        )

    def test_doubt_switches_models_on_not_found_without_retrying_missing_model(self):
        service = GeminiService(model="gemini-test-missing")

        class ModelNotFoundError(Exception):
            code = 404

        class FakeModels:
            models_used = []

            def generate_content(self, model, contents):
                self.models_used.append(model)
                if model == "gemini-test-missing":
                    raise ModelNotFoundError("model not found")
                return "fallback response"

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        response = service._generate_doubt_content(["question"])

        self.assertEqual(response, "fallback response")
        self.assertEqual(
            service._client.models.models_used,
            ["gemini-test-missing", "gemini-3.8-flash"],
        )

    def test_doubt_model_fallback_preserves_image_and_pdf_attachments(self):
        class ModelNotFoundError(Exception):
            code = 404

        for mime_type, file_bytes in (
            ("image/png", b"image bytes"),
            ("application/pdf", b"%PDF-1.4"),
        ):
            with self.subTest(mime_type=mime_type):
                service = GeminiService(model="gemini-test-missing")

                class FakeModels:
                    calls = []

                    def generate_content(self, model, contents):
                        self.calls.append((model, contents))
                        if model == "gemini-test-missing":
                            raise ModelNotFoundError("model not found")
                        return type("Response", (), {
                            "text": json.dumps({
                                "answer": "Generated attachment explanation.",
                                "key_takeaways": [],
                                "suggested_followups": [],
                                "confidence": 0.9,
                            })
                        })()

                class FakeClient:
                    models = FakeModels()

                service._client = FakeClient()
                result = service.solve_doubt(
                    query="Explain this attachment",
                    file_bytes=file_bytes,
                    file_mime_type=mime_type,
                )

                self.assertIn("Generated attachment explanation", result["answer"])
                self.assertEqual(len(service._client.models.calls), 2)
                fallback_contents = service._client.models.calls[1][1]
                self.assertEqual(fallback_contents[1].inline_data.mime_type, mime_type)
                self.assertEqual(fallback_contents[1].inline_data.data, file_bytes)

    def test_doubt_tries_next_model_after_each_model_returns_not_found(self):
        service = GeminiService(model="gemini-test-missing")

        class ModelNotFoundError(Exception):
            code = 404

        class FakeModels:
            models_used = []

            def generate_content(self, model, contents):
                self.models_used.append(model)
                raise ModelNotFoundError("model not found")

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        with self.assertRaises(GeminiServiceError) as raised:
            service._generate_doubt_content(["question"])

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.code, "AI_MODEL_UNAVAILABLE")
        self.assertEqual(service._client.models.models_used, service._get_models_to_try())

    def test_doubt_does_not_retry_invalid_provider_request(self):
        service = GeminiService()

        class ProviderError(Exception):
            code = 400

        class FakeModels:
            calls = 0

            def generate_content(self, model, contents):
                self.calls += 1
                raise ProviderError("invalid request")

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        with patch("app.services.gemini_service.time.sleep") as sleep:
            with self.assertRaises(GeminiServiceError) as raised:
                service._generate_doubt_content(["question"])

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.code, "AI_PROVIDER_INVALID_REQUEST")
        self.assertEqual(service._client.models.calls, 1)
        sleep.assert_not_called()

    def test_doubt_stops_after_maximum_transient_attempts(self):
        service = GeminiService()

        class ProviderError(Exception):
            code = 503

        class FakeModels:
            calls = 0

            def generate_content(self, model, contents):
                self.calls += 1
                raise ProviderError("temporarily unavailable")

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        with patch("app.services.gemini_service.time.sleep"):
            with self.assertRaises(GeminiServiceError) as raised:
                service._generate_doubt_content(["question"])

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.code, "AI_PROVIDER_UNAVAILABLE")
        self.assertEqual(service._client.models.calls, 3)

    def test_doubt_retries_rate_limit_and_maps_exhaustion(self):
        service = GeminiService()

        class ProviderError(Exception):
            code = 429

        class FakeModels:
            calls = 0

            def generate_content(self, model, contents):
                self.calls += 1
                raise ProviderError("rate limited")

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        with patch("app.services.gemini_service.time.sleep"):
            with self.assertRaises(GeminiServiceError) as raised:
                service._generate_doubt_content(["question"])

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.code, "AI_PROVIDER_RATE_LIMITED")
        self.assertEqual(service._client.models.calls, 3)

    def test_doubt_maps_upstream_gateway_timeout(self):
        service = GeminiService()

        class ProviderError(Exception):
            code = 504

        class FakeModels:
            def generate_content(self, model, contents):
                raise ProviderError("gateway timeout")

        class FakeClient:
            models = FakeModels()

        service._client = FakeClient()
        with patch("app.services.gemini_service.time.sleep"):
            with self.assertRaises(GeminiServiceError) as raised:
                service._generate_doubt_content(["question"])

        self.assertEqual(raised.exception.status_code, 504)
        self.assertEqual(raised.exception.code, "AI_PROVIDER_TIMEOUT")

    def test_doubt_maps_authentication_errors_without_retrying(self):
        for provider_status in (401, 403):
            with self.subTest(provider_status=provider_status):
                service = GeminiService()

                class ProviderError(Exception):
                    code = provider_status

                class FakeModels:
                    calls = 0

                    def generate_content(self, model, contents):
                        self.calls += 1
                        raise ProviderError("authentication failed")

                class FakeClient:
                    models = FakeModels()

                service._client = FakeClient()
                with patch("app.services.gemini_service.time.sleep") as sleep:
                    with self.assertRaises(GeminiServiceError) as raised:
                        service._generate_doubt_content(["question"])

                self.assertEqual(raised.exception.status_code, 503)
                self.assertEqual(raised.exception.code, "AI_PROVIDER_CONFIGURATION")
                self.assertEqual(service._client.models.calls, 1)
                sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
