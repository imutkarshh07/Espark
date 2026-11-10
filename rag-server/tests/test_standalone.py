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
        service = GeminiService()

        class ProviderError(Exception):
            code = 503

        class FakeModels:
            calls = 0

            def generate_content(self, model, contents):
                self.calls += 1
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
