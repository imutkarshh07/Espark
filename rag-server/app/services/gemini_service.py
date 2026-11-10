import json
import logging
import re
import random
import time
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_REQUEST_TIMEOUT_MS = 25000
GEMINI_MAX_ATTEMPTS = 3
GEMINI_RETRY_BASE_DELAY_SECONDS = 0.5
GEMINI_RETRY_MAX_DELAY_SECONDS = 2.0
RETRYABLE_PROVIDER_STATUSES = {408, 429, 500, 502, 503, 504}


class GeminiServiceError(RuntimeError):
    def __init__(self, status_code: int, code: str, public_message: str):
        super().__init__(public_message)
        self.status_code = status_code
        self.code = code
        self.public_message = public_message


class GeminiService:
    """
    Interfaces with Google Gemini API for structured reasoning, mistake diagnosis,
    and adaptive practice question synthesis.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = settings.GEMINI_MODEL):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model
        self._client = None
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                from google import genai
                from google.genai import types

                self._client = genai.Client(
                    api_key=self.api_key,
                    http_options=types.HttpOptions(
                        timeout=GEMINI_REQUEST_TIMEOUT_MS,
                        retry_options=types.HttpRetryOptions(attempts=1),
                    ),
                )
            except Exception as e:
                logger.error("Gemini client initialization failed (%s)", type(e).__name__)
                self._client = None

    def generate_quiz_questions(
        self,
        exam: str,
        class_level: str,
        subjects: List[str],
        chapters: Dict[str, str],
        subtopic: Optional[str],
        difficulty: str,
        count: int,
        excluded_questions: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Generate fresh MCQs for the main quiz directly with Gemini.

        The main quiz has no static-question fallback: if Gemini cannot provide
        the requested questions, the request fails instead of silently mixing
        hard-coded questions into an AI-generated test.
        """
        if self._client is None:
            raise RuntimeError("Gemini API is not configured. Set GEMINI_API_KEY in rag-server/.env")

        requested = max(1, min(int(count), 150))
        excluded = []
        seen = set()
        for item in (excluded_questions or []):
            text = str(item or "").strip()
            key = text.lower()
            if text and key not in seen:
                seen.add(key)
                excluded.append(text)

        subject_text = ", ".join(subjects) if subjects else "General"
        chapter_lines = []
        for subject in subjects:
            chapter = chapters.get(subject) or chapters.get(subject.lower()) or "General"
            chapter_lines.append(f"{subject}: {chapter}")
        chapter_text = "\n".join(chapter_lines) if chapter_lines else "General"
        difficulty_text = difficulty if difficulty and difficulty != "all" else "mixed easy, medium, and hard"

        all_questions: List[Dict[str, Any]] = []
        all_seen = set(seen)
        remaining = requested
        batch_number = 0

        # Smaller batches make large tests (50/75/100/150) much more reliable
        # than asking one model response to emit a very large JSON document.
        while remaining > 0:
            batch_number += 1
            batch_size = min(25, remaining)
            exclusion_text = "\n".join(f"- {q}" for q in list(all_seen)[-500:]) or "None"

            exam_norm = (exam or "NEET").strip().upper()
            if "JEE" in exam_norm:
                exam_directive = """ACADEMIC DIRECTIVE (JEE MAIN & ADVANCED):
- Rigorously prioritize analytical problem-solving, multi-concept reasoning, and numerical precision.
- Integrate vector calculus, coordinate geometry, or multi-step derivations in Physics and Mathematics.
- For Chemistry, emphasize mechanism-driven organic pathways, stoichiometry, and thermodynamic principles.
- Distractors must trap common calculation, sign (+/-), and vector direction mistakes."""
            elif "CBSE" in exam_norm:
                exam_directive = """ACADEMIC DIRECTIVE (CBSE BOARD EXAMINATION):
- Strictly adhere to CBSE Board Class 10/11/12 NCERT curriculum standards and official NCERT exemplars.
- Focus on foundational definitions, core principles, balanced chemical equations, labeled anatomical/cellular mechanisms, and standard board-pattern questions.
- Distractors should address common conceptual ambiguities in board answers."""
            else:
                exam_directive = """ACADEMIC DIRECTIVE (NEET UG MEDICAL ENTRANCE):
- Strictly follow NCERT Biology (Botany & Zoology), Chemistry, and Physics textbooks line-by-line.
- Biology questions must use exact NCERT terminology and factual accuracy without ambiguity.
- Chemistry and Physics must emphasize high-yield formula application and standard NTA NEET-UG calculation patterns."""

            prompt = f"""You are the question-generation engine for a serious Indian competitive-exam practice app called Study Insights ({exam} / {class_level}).
Generate ORIGINAL multiple-choice questions strictly from the chosen curriculum chapter. Do NOT copy or paraphrase any excluded question.

{exam_directive}

CRITICAL CURRICULUM & CHAPTER BOUNDARY:
- Every single question in this batch MUST strictly and exclusively belong to:
  {chapter_text}
- SUBJECTS: {subject_text}
- SUBTOPIC: {subtopic or 'All core subtopics of this chapter'}
- DIFFICULTY: {difficulty_text}
- Under NO circumstances include questions from other chapters, unrelated subjects, or generic trivia.
- Questions must directly assess syllabus-aligned formulas, laws, reaction mechanisms, cellular structures, or problem-solving techniques specifically taught in this chapter.

OPTIONS, ANSWER ACCURACY & EXPLANATION RULES:
1. Provide exactly 4 options per question.
2. The `correct_answer` MUST be an exact string match with one of the 4 options.
3. The designated `correct_answer` must be mathematically, scientifically, and factually undeniable according to the official NCERT syllabus.
4. Distractors must be plausible, reflecting common student misconceptions or sign/unit errors.
5. Do NOT use predictable patterns such as always selecting option A.
6. The `explanation` MUST be comprehensive: provide step-by-step reasoning or mathematical proof explaining why the correct option follows from the underlying principles, and why the distractors are incorrect.
7. Return exactly {batch_size} questions in this batch.

PREVIOUSLY USED QUESTIONS TO AVOID:
{exclusion_text}

Respond ONLY with valid JSON in this exact structure:
{{
  "questions": [
    {{
      "question_text": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "...",
      "explanation": "...",
      "subject": "Name of Subject",
      "chapter": "Name of Chapter"
    }}
  ]
}}
"""

            batch_result: List[Dict[str, Any]] = []
            last_error = None
            for model_name in self._get_models_to_try():
                try:
                    try:
                        response = self._client.models.generate_content(
                            model=model_name,
                            contents=prompt,
                            config={"response_mime_type": "application/json"}
                        )
                    except Exception as json_mode_err:
                        print(f"[GeminiService] Structured JSON mode note ({json_mode_err}), trying standard generation with {model_name}...")
                        response = self._client.models.generate_content(
                            model=model_name,
                            contents=prompt,
                        )
                    output_text = response.text if hasattr(response, "text") else str(response)
                    parsed = self._extract_json(output_text)
                    raw_questions = None
                    if isinstance(parsed, dict):
                        raw_questions = parsed.get("questions") or parsed.get("mcqs") or parsed.get("data")
                    elif isinstance(parsed, list):
                        raw_questions = parsed

                    if not isinstance(raw_questions, list):
                        raise ValueError("Gemini response did not contain a questions array")

                    local_seen = set(all_seen)
                    primary_subject = subjects[0] if subjects else "General"
                    primary_chapter = (chapters.get(primary_subject) or chapters.get(primary_subject.lower()) or "General") if subjects else "General"

                    for item in raw_questions:
                        if not isinstance(item, dict):
                            continue
                        question_text = str(item.get("question_text", "")).strip()
                        options = item.get("options")
                        correct_answer = str(item.get("correct_answer", "")).strip()
                        explanation = str(item.get("explanation", "")).strip()
                        if not question_text or not isinstance(options, list):
                            continue
                        options = [str(x).strip() for x in options if str(x).strip()]
                        option_keys = {x.lower() for x in options}
                        key = question_text.lower()
                        if len(options) < 4 or len(option_keys) != len(options):
                            continue
                        # Verify correct answer matches one of the options
                        matching_option = next((opt for opt in options if opt.lower() == correct_answer.lower()), None)
                        if not matching_option:
                            continue
                        if key in local_seen or key in all_seen:
                            continue
                        local_seen.add(key)
                        all_seen.add(key)
                        shuffled_opts = list(options[:4])
                        random.shuffle(shuffled_opts)
                        q_subject = str(item.get("subject", "")).strip() or primary_subject
                        q_chapter = str(item.get("chapter", "")).strip() or chapters.get(q_subject) or chapters.get(q_subject.lower()) or primary_chapter
                        batch_result.append({
                            "question_text": question_text,
                            "options": shuffled_opts,
                            "correct_answer": matching_option,
                            "explanation": explanation or f"Derived directly from standard principles and formulas of {q_chapter}.",
                            "subject": q_subject,
                            "chapter": q_chapter,
                        })
                        if len(batch_result) >= batch_size:
                            break

                    if len(batch_result) > 0:
                        break
                    last_error = ValueError(
                        f"Gemini returned 0 valid unique questions in this attempt"
                    )
                except Exception as e:
                    last_error = e
                    print(f"[GeminiService] Quiz generation error with model {model_name}: {e}")
                    import time
                    time.sleep(1.0)

            if len(batch_result) == 0:
                raise RuntimeError(f"Gemini question generation failed: {last_error}")

            all_questions.extend(batch_result)
            remaining -= len(batch_result)

        return all_questions[:requested]

    def _get_models_to_try(self) -> List[str]:
        models = [
            self.model,
            "gemini-3.8-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
        ]
        return list(dict.fromkeys(model for model in models if model))

    @staticmethod
    def _provider_status(error: Exception) -> Optional[int]:
        status = getattr(error, "code", None) or getattr(error, "status_code", None)
        try:
            return int(status)
        except (TypeError, ValueError):
            return None

    @classmethod
    def _provider_error(cls, error: Exception) -> GeminiServiceError:
        status = cls._provider_status(error)
        if status == 400:
            return GeminiServiceError(
                400,
                "AI_PROVIDER_INVALID_REQUEST",
                "The AI service could not process this request. Please check the question or attachment.",
            )
        if status == 429:
            return GeminiServiceError(503, "AI_PROVIDER_RATE_LIMITED", "The AI service is busy. Please try again shortly.")
        if status in {401, 403}:
            return GeminiServiceError(503, "AI_PROVIDER_CONFIGURATION", "The AI service is not configured correctly. Please contact support.")
        if status == 404:
            return GeminiServiceError(503, "AI_MODEL_UNAVAILABLE", "The configured AI model is unavailable. Please contact support.")
        if status in {408, 504} or "timeout" in type(error).__name__.lower():
            return GeminiServiceError(504, "AI_PROVIDER_TIMEOUT", "The AI service took too long to respond. Please try again.")
        if status in {500, 502, 503}:
            return GeminiServiceError(503, "AI_PROVIDER_UNAVAILABLE", "The AI service is temporarily unavailable. Please try again.")
        return GeminiServiceError(502, "AI_PROVIDER_ERROR", "The AI service could not complete this request. Please try again.")

    @classmethod
    def _is_retryable_provider_error(cls, error: Exception) -> bool:
        status = cls._provider_status(error)
        if status is not None:
            return status in RETRYABLE_PROVIDER_STATUSES
        error_name = type(error).__name__.lower()
        return isinstance(error, (TimeoutError, ConnectionError)) or any(
            marker in error_name for marker in ("timeout", "network", "connection")
        )

    def _generate_doubt_content(self, contents: List[Any]) -> Any:
        last_model_error = None
        for model_name in self._get_models_to_try():
            for attempt in range(1, GEMINI_MAX_ATTEMPTS + 1):
                started_at = time.monotonic()
                try:
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=contents,
                    )
                    latency_ms = int((time.monotonic() - started_at) * 1000)
                    logger.info(
                        "Gemini doubt request succeeded model=%s attempt=%s latency_ms=%s",
                        model_name,
                        attempt,
                        latency_ms,
                    )
                    return response
                except Exception as error:
                    latency_ms = int((time.monotonic() - started_at) * 1000)
                    status = self._provider_status(error)
                    category = self._provider_error(error).code
                    retryable = self._is_retryable_provider_error(error)
                    logger.warning(
                        "Gemini doubt request failed model=%s attempt=%s status=%s category=%s latency_ms=%s retryable=%s",
                        model_name,
                        attempt,
                        status if status is not None else "unknown",
                        category,
                        latency_ms,
                        retryable,
                    )
                    if status == 404:
                        last_model_error = error
                        logger.info("Gemini model unavailable; moving to the next fallback after model=%s", model_name)
                        break
                    if not retryable or attempt == GEMINI_MAX_ATTEMPTS:
                        raise self._provider_error(error) from error

                    delay = min(
                        GEMINI_RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1)),
                        GEMINI_RETRY_MAX_DELAY_SECONDS,
                    )
                    time.sleep(delay + random.uniform(0, delay * 0.2))

        if last_model_error is not None:
            raise self._provider_error(last_model_error) from last_model_error
        raise RuntimeError("Gemini doubt generation completed without a response or provider error")



    def analyze_mistake_with_context(
        self,
        question: str,
        student_answer: str,
        correct_answer: str,
        topic: str,
        context_chunks: List[str]
    ) -> Dict[str, Any]:
        """
        Synthesizes mistake diagnosis and generates practice questions based on retrieved study material.
        """
        # Formulate structured prompt
        context_block = "\n---\n".join(context_chunks) if context_chunks else "No textbook excerpts available."
        prompt = f"""You are an expert diagnostic tutor. A student made an error on an exam question.
Analyze their mistake, identify the root cause category, and generate 1-2 targeted follow-up practice questions.

STUDY MATERIAL CONTEXT:
{context_block}

QUESTION:
{question}

STUDENT'S ANSWER:
{student_answer}

CORRECT ANSWER:
{correct_answer}

TOPIC:
{topic}

REQUIREMENTS:
1. Classify the mistake into exactly ONE category:
   - conceptual: Misunderstood the underlying principle, definition, or concept.
   - careless: Rushed, misread the question, selected wrong unit, or made a minor oversight.
   - time_pressure: Left incomplete or answered haphazardly due to lack of time.
   - memory: Forgot a specific formula, fact, date, or constant.
   - calculation: Arithmetic error, sign error, or calculation mistake.
2. Provide confidence (0.0 to 1.0).
3. Provide a concise 'reason' for the error.
4. Provide a clear 'explanation' contrasting the student's reasoning with the correct reasoning.
5. Provide a 'recommended_action' for the student.
6. Generate 1-2 targeted practice questions formatted as multiple choice (question_text, options array, correct_answer, explanation).

Respond ONLY with valid JSON in this exact structure:
{{
  "category": "conceptual",
  "confidence": 0.88,
  "reason": "Brief summary of error",
  "explanation": "Detailed explanation using study context",
  "recommended_action": "Actionable advice",
  "practice_questions": [
    {{
      "question_text": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "explanation": "..."
    }}
  ]
}}
"""

        if self._client is not None:
            for model_name in self._get_models_to_try():
                try:
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    output_text = response.text if hasattr(response, "text") else str(response)
                    parsed = self._extract_json(output_text)
                    if parsed:
                        return self._validate_response_schema(parsed)
                except Exception as e:
                    print(f"[GeminiService] Error with model {model_name} in analyze_mistake: {e}")

        # High quality fallback diagnosis if Gemini is offline or API key is not configured
        return self._generate_fallback_diagnosis(question, student_answer, correct_answer, topic)

    def _safe_json_parse(self, s: str) -> Optional[Any]:
        if not s:
            return None
        try:
            return json.loads(s, strict=False)
        except Exception:
            pass
        try:
            fixed = re.sub(r'\\(?!["])', r'\\\\', s)
            return json.loads(fixed, strict=False)
        except Exception:
            pass
        try:
            fixed2 = s.replace('\\', '\\\\')
            return json.loads(fixed2, strict=False)
        except Exception:
            return None

    def _extract_json(self, text: str) -> Optional[Any]:
        if not text:
            return None
        try:
            # 1. Check for markdown code blocks ```json ... ```
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
            if match:
                res = self._safe_json_parse(match.group(1).strip())
                if res is not None:
                    return res

            # 2. Try direct parse
            cleaned = text.strip()
            if (cleaned.startswith('{') and cleaned.endswith('}')) or (cleaned.startswith('[') and cleaned.endswith(']')):
                res = self._safe_json_parse(cleaned)
                if res is not None:
                    return res

            # 3. Find outermost { ... }
            start = cleaned.find('{')
            end = cleaned.rfind('}')
            if start != -1 and end > start:
                res = self._safe_json_parse(cleaned[start:end+1])
                if res is not None:
                    return res

            # 4. Find outermost [ ... ]
            start_arr = cleaned.find('[')
            end_arr = cleaned.rfind(']')
            if start_arr != -1 and end_arr > start_arr:
                arr_res = self._safe_json_parse(cleaned[start_arr:end_arr+1])
                if isinstance(arr_res, list):
                    return {"questions": arr_res}
        except Exception as e:
            print(f"[GeminiService] _extract_json parsing note: {e}")
            return None
        return None

    def _validate_response_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        valid_categories = {"conceptual", "careless", "time_pressure", "memory", "calculation"}
        category = str(data.get("category", "conceptual")).lower().strip()
        if category not in valid_categories:
            category = "conceptual"

        confidence = float(data.get("confidence", 0.80))
        confidence = max(0.0, min(1.0, confidence))

        return {
            "category": category,
            "confidence": round(confidence, 2),
            "reason": str(data.get("reason", "Concept gap identified.")),
            "explanation": str(data.get("explanation", "Review the underlying definitions.")),
            "recommended_action": str(data.get("recommended_action", "Revisit textbook sections for this topic.")),
            "practice_questions": data.get("practice_questions", [])
        }

    def _generate_fallback_diagnosis(
        self,
        question: str,
        student_answer: str,
        correct_answer: str,
        topic: str
    ) -> Dict[str, Any]:
        # Intelligent heuristic based on answers
        is_numeric = any(char.isdigit() for char in student_answer) and any(char.isdigit() for char in correct_answer)
        category = "calculation" if is_numeric else "conceptual"

        return {
            "category": category,
            "confidence": 0.85,
            "reason": f"Discrepancy identified between student response '{student_answer}' and correct answer '{correct_answer}' for {topic}.",
            "explanation": f"The question evaluated core mastery in {topic}. Review the essential equations and theorems relevant to '{question[:60]}...'",
            "recommended_action": f"Practice 3 additional problems focusing on {topic} fundamentals.",
            "practice_questions": [
                {
                    "question_text": f"Follow-up Practice on {topic}: Which of the following statements is unconditionally correct?",
                    "options": [
                        f"Standard definition of {topic} (Correct)",
                        "Alternative formulation without boundary condition",
                        "Common distractor option",
                        "None of the above"
                    ],
                    "correct_answer": f"Standard definition of {topic} (Correct)",
                    "explanation": f"Solid understanding of {topic} requires recognizing its foundational property."
                }
            ]
        }

    def solve_doubt(
        self,
        query: str,
        subject: str = "General",
        chapter: str = "General",
        context_chunks: Optional[List[str]] = None,
        file_context: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        file_mime_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes an academic explanation for a student's doubt using retrieved textbook context
        and any uploaded document text or file attachment (image/pdf).
        Minimizes symbols and removes asterisk clutter.
        """
        if self._client is None:
            raise GeminiServiceError(
                503,
                "AI_PROVIDER_NOT_CONFIGURED",
                "The AI service is not configured. Please contact support.",
            )

        all_context = []
        if file_context:
            all_context.append(f"UPLOADED ATTACHMENT EXCERPTS:\n{file_context[:3000]}")
        if context_chunks:
            all_context.append("STUDY MATERIAL / TEXTBOOK CONTEXT:\n" + "\n---\n".join(context_chunks))
        
        context_block = "\n\n".join(all_context) if all_context else "Standard NCERT & Exam Curriculum Knowledge"

        subject_context = (
            "the appropriate academic subject (infer it from the question and attachment)"
            if subject in {"General", "Auto-Detect"}
            else subject
        )
        prompt = f"""You are an elite tutor for competitive exams (JEE, NEET, CBSE).
A student has a doubt in {subject_context} ({chapter}).
Provide a clear, student-friendly, step-by-step explanation.

CONTEXT:
{context_block}

STUDENT DOUBT:
{query}

CRITICAL FORMATTING & SYMBOL MINIMIZATION RULES:
- Minimize symbols. NEVER use asterisks (*) or double asterisks (**) anywhere in your response.
- Do NOT use markdown bolding (like **bold**) or italic asterisks (*italic*).
- Do NOT use markdown hashtags (###, ####) or backticks (`).
- Use clean, standard uppercase section headings on their own line (e.g. CONCEPT OVERVIEW, STEP 1: RESOLVING EQUATIONS, STEP 2: APPLYING VALUES, FINAL ANSWER).
- For bulleted items, use clean numbered lists (1., 2., 3.) or simple clean dashes (-) or clean bullet points (•).
- For mathematical equations, write them in plain standard notation using standard math symbols (e.g. use "×" for multiplication instead of "*", write "F = m × a", "v = u + at").
- Write in clean, elegant, human-readable paragraphs without cluttering symbols.

REQUIREMENTS:
1. Explain the underlying concept clearly with formulas, principles, or derivations where relevant.
2. If an image or PDF attachment is provided, examine it closely and solve the exact problem or diagram depicted.
3. Break down the answer into structured steps.
4. List 3 key takeaways for revision.
5. Suggest 2-3 logical follow-up questions to test understanding.

Respond ONLY with valid JSON in this exact structure:
{{
  "answer": "Clean explanation with plain headings, clear steps, and readable formulas without any asterisks",
  "key_takeaways": [
    "Key principle 1",
    "Key principle 2",
    "Key principle 3"
  ],
  "suggested_followups": [
    "Follow-up question 1",
    "Follow-up question 2"
  ],
  "confidence": 0.95
}}
"""
        contents: List[Any] = [prompt]
        if file_bytes and file_mime_type:
            try:
                from google.genai import types
                contents.append(types.Part.from_bytes(data=file_bytes, mime_type=file_mime_type))
            except Exception as error:
                logger.warning("Failed to prepare doubt attachment (%s)", type(error).__name__)
                raise GeminiServiceError(
                    400,
                    "INVALID_ATTACHMENT",
                    "The attached file could not be prepared. Please choose another file.",
                ) from error

        try:
            response = self._generate_doubt_content(contents)
        except GeminiServiceError:
            raise

        output_text = getattr(response, "text", None)
        if not isinstance(output_text, str) or not output_text.strip():
            logger.warning(
                "Gemini doubt response invalid model=%s category=empty_response",
                self.model,
            )
            raise GeminiServiceError(
                502,
                "AI_PROVIDER_INVALID_RESPONSE",
                "The AI service returned an invalid response. Please try again.",
            )

        parsed = self._extract_json(output_text)
        if isinstance(parsed, dict) and isinstance(parsed.get("answer"), str) and parsed["answer"].strip():
            try:
                confidence = float(parsed.get("confidence", 0.95))
            except (TypeError, ValueError):
                confidence = 0.95
            takeaways = parsed.get("key_takeaways")
            followups = parsed.get("suggested_followups")
            return {
                "answer": self.clean_symbol_formatting(parsed["answer"]),
                "key_takeaways": [
                    self.clean_symbol_formatting(item)
                    for item in (takeaways if isinstance(takeaways, list) else [])
                    if isinstance(item, str) and item.strip()
                ],
                "suggested_followups": [
                    self.clean_symbol_formatting(item)
                    for item in (followups if isinstance(followups, list) else [])
                    if isinstance(item, str) and item.strip()
                ],
                "confidence": min(1.0, max(0.0, confidence)),
            }

        answer = self.clean_symbol_formatting(output_text)
        if not answer:
            raise GeminiServiceError(502, "AI_PROVIDER_INVALID_RESPONSE", "The AI service returned an empty answer. Please try again.")
        return {
            "answer": answer,
            "key_takeaways": [],
            "suggested_followups": [],
            "confidence": 0.85,
        }

    def clean_symbol_formatting(self, text: str) -> str:
        """Sanitizes text by eliminating asterisks, raw hashtags, and symbol clutter."""
        if not text:
            return ""
        # 1. Strip markdown bold / italic asterisks (e.g. ***word***, **word**, *word*)
        cleaned = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
        # 2. Strip leading markdown headers (###, ####, etc.)
        cleaned = re.sub(r'^[ \t]*#{1,6}[ \t]*', '', cleaned, flags=re.MULTILINE)
        # 3. Replace asterisk bullets with clean round bullet
        cleaned = re.sub(r'^[ \t]*\*[ \t]+', '• ', cleaned, flags=re.MULTILINE)
        # 4. Replace multiplication asterisks between numbers (e.g. 5 * 10 -> 5 × 10)
        cleaned = re.sub(r'(\d+)[ \t]*\*[ \t]*(\d+)', r'\1 × \2', cleaned)
        # 5. Strip any stray asterisks
        cleaned = cleaned.replace('*', '')
        # 6. Remove backticks
        cleaned = cleaned.replace('`', '')
        # 7. Normalize multiple newlines
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        return cleaned.strip()
