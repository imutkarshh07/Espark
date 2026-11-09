import os
from openai import OpenAI
from pydantic import BaseModel, Field


class AnswerOutput(BaseModel):
    answer: str
    should_say_insufficient_context: bool = False


class LLMGenerator:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")

    def answer(self, query: str, context: str) -> AnswerOutput:
        system_prompt = """
You are the Study Insights educational assistant.

Use the supplied study material to answer the student's question.

Rules:
1. Prefer the retrieved study material.
2. Do not invent scientific facts.
3. If the material is insufficient, clearly say that the available study material
   does not contain enough information.
4. Explain at a student-friendly level.
5. Keep the answer concise but useful.
6. Give a simple example when it helps.
"""

        response = self.client.responses.parse(
            model=self.model,
            input=[
                {"role": "developer", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Study material:\n{context}\n\nQuestion:\n{query}",
                },
            ],
            text_format=AnswerOutput,
        )

        parsed = getattr(response, "output_parsed", None)
        if parsed is not None:
            return parsed

        # Compatibility fallback for SDK versions where output_parsed is unavailable.
        if getattr(response, "output_text", None):
            return AnswerOutput.model_validate_json(response.output_text)

        raise RuntimeError("The model returned no usable structured output.")
