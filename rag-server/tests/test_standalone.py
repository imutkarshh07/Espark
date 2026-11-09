import unittest
from app.core.vector_store import ChromaVectorStore
from app.rag.chunker import TextChunker
from app.services.gemini_service import GeminiService


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
        result = service.solve_doubt(
            query="Why does increasing temperature shift endothermic reactions forward?",
            subject="Chemistry",
            chapter="Chemical Equilibrium",
            context_chunks=["Le Chatelier's Principle: Adding heat to an endothermic system shifts equilibrium right."]
        )
        self.assertIn("answer", result)
        self.assertIn("key_takeaways", result)
        self.assertTrue(len(result["key_takeaways"]) > 0)
        self.assertIn("suggested_followups", result)


if __name__ == "__main__":
    unittest.main()
