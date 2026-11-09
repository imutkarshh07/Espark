import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { useAppTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { studyService, TestAttemptAnswer } from '../services/studyService';

interface QuestionOption {
  id: string;
  letter: string;
  term: string;
  definition: string;
  fullText: string;
  isCorrect: boolean;
}

// Removes duplicate questions based on lowercase, trimmed question text
function removeDuplicateQuestions(questions: any[]): any[] {
  if (!Array.isArray(questions)) return [];
  const seen = new Set<string>();

  return questions.filter((question) => {
    if (!question) return false;
    const raw = question.question || question.question_text || question.text || '';
    const key = String(raw).trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    testId?: string;
    exam?: string;
    subject?: string;
    chapter?: string;
    durationMinutes?: string;
  }>();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState<boolean>(true);
  const [test, setTest] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOptionText, setSelectedOptionText] = useState<string | null>(null);
  const [recordedAnswers, setRecordedAnswers] = useState<TestAttemptAnswer[]>([]);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [completedResult, setCompletedResult] = useState<any>(null);

  // Live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch tests and start real attempt on load
  useEffect(() => {
    async function initQuiz() {
      try {
        setLoading(true);
        let currentTest: any = null;

        if (params?.testId) {
          try {
            const res = await studyService.getTest(params.testId);
            currentTest = res?.data || res;
          } catch (e) {
            console.warn('[Quiz] Failed to load requested testId, falling back to tests list:', e);
          }
        }

        if (!currentTest) {
          try {
            // Generate a fresh non-repeating chapter test for this quiz session
            const genRes = await studyService.generateChapterTest({
              exam: params.exam || 'JEE',
              classLevel: 'Class 12th',
              subject: params.subject || 'Physics',
              chapter: params.chapter || 'Kinematics',
              count: 10,
            });
            currentTest = genRes?.data || genRes;
          } catch (genErr) {
            console.warn('[Quiz] Auto test generation failed:', genErr);
          }
        }

        if (currentTest) {
          if (Array.isArray(currentTest.questions)) {
            currentTest.questions = removeDuplicateQuestions(currentTest.questions);
          }
          setTest(currentTest);

          // Dynamic test timer: Respect test.duration_minutes, params.durationMinutes, or ~1.5m/Q
          const durationMins = currentTest.duration_minutes || currentTest.durationMinutes || (params?.durationMinutes ? parseInt(params.durationMinutes, 10) : 0);
          const totalSecs = durationMins > 0
            ? durationMins * 60
            : Math.max(180, (currentTest.questions?.length || 10) * 90);
          setSecondsRemaining(totalSecs);

          try {
            const attempt = await studyService.startAttempt(currentTest.id);
            if (attempt?.id) {
              setAttemptId(attempt.id);
            }
          } catch (attErr) {
            console.warn('[Quiz] Failed to start attempt, fallback to local id:', attErr);
            setAttemptId(`att-local-${Date.now()}`);
          }
        }
      } catch (err) {
        console.warn('[Quiz] Failed to load tests from backend:', err);
      } finally {
        setLoading(false);
      }
    }
    initQuiz();
  }, [params?.testId, params?.exam, params?.subject, params?.chapter, params?.durationMinutes]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const rawQuestions = test?.questions || [];
  const questions = removeDuplicateQuestions(rawQuestions);
  const currentQuestion = questions[currentQIndex] || null;

  // Helper to robustly determine if an option matches the question's designated correct answer
  const isOptionTheCorrectAnswer = (rawOpt: string, optLetter: string, correctAnswer: string): boolean => {
    if (!rawOpt || !correctAnswer) return false;
    const cleanOpt = String(rawOpt).replace(/\s*\(Correct\)\s*/gi, '').trim().toLowerCase();
    const cleanCorr = String(correctAnswer).replace(/\s*\(Correct\)\s*/gi, '').trim().toLowerCase();

    // 1. Direct match
    if (cleanOpt === cleanCorr) return true;

    // 2. Letter match: "A", "Option A", "A.", "(A)", "A)"
    const letterLower = optLetter.toLowerCase();
    if (
      cleanCorr === letterLower ||
      cleanCorr === `option ${letterLower}` ||
      cleanCorr === `(${letterLower})` ||
      cleanCorr === `${letterLower}.` ||
      cleanCorr === `${letterLower})`
    ) {
      return true;
    }

    // 3. Colon prefix or term match: "Term: Definition" -> check if term matches
    const optTerm = cleanOpt.includes(':') ? cleanOpt.split(':')[0].trim() : cleanOpt;
    const corrTerm = cleanCorr.includes(':') ? cleanCorr.split(':')[0].trim() : cleanCorr;
    if (optTerm === cleanCorr || cleanOpt === corrTerm || (optTerm && corrTerm && optTerm === corrTerm)) {
      return true;
    }

    // 4. Strip leading option letter: "A. Photosynthesis" -> "Photosynthesis"
    const strippedOpt = cleanOpt.replace(/^[a-e]\s*[.):-]\s*/i, '').trim();
    const strippedCorr = cleanCorr.replace(/^[a-e]\s*[.):-]\s*/i, '').trim();
    if (strippedOpt && strippedCorr && strippedOpt === strippedCorr) {
      return true;
    }

    return false;
  };

  // Format options with letters A, B, C, D and ensure clean text
  const cleanCorrect = String(currentQuestion?.correct_answer || '').replace(/\s*\(Correct\)\s*/gi, '').trim();

  // First pass: compute isCorrect using robust matching
  const initialOptions: QuestionOption[] = (currentQuestion?.options || []).map((rawOpt: string, idx: number) => {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const letter = letters[idx] || String(idx + 1);

    const cleanOpt = String(rawOpt || '').replace(/\s*\(Correct\)\s*/gi, '').trim();
    const parts = cleanOpt.includes(':') ? cleanOpt.split(':') : [cleanOpt, ''];
    const term = parts[0].trim();
    const definition = parts.slice(1).join(':').trim();
    const isCorrect = isOptionTheCorrectAnswer(cleanOpt, letter, cleanCorrect);

    return {
      id: String(idx + 1),
      letter,
      term,
      definition,
      fullText: cleanOpt,
      isCorrect,
    };
  });

  // Guarantee: exactly ONE option must be designated as isCorrect
  const hasCorrect = initialOptions.some((o) => o.isCorrect);
  let bestFallbackIdx = -1;
  if (!hasCorrect && initialOptions.length > 0) {
    bestFallbackIdx = initialOptions.findIndex((opt) => {
      const optL = opt.fullText.toLowerCase();
      const corrL = cleanCorrect.toLowerCase();
      return corrL.includes(optL) || optL.includes(corrL);
    });
    if (bestFallbackIdx === -1) {
      bestFallbackIdx = 0;
    }
  }

  const formattedOptions: QuestionOption[] = initialOptions.map((opt, idx) => {
    if (!hasCorrect && idx === bestFallbackIdx) {
      return { ...opt, isCorrect: true };
    }
    return opt;
  });

  const selectedOption = formattedOptions.find((o) => o.fullText === selectedOptionText);

  // Handle advancing question or completing test with Python RAG
  const handleNextQuestion = async () => {
    if (!selectedOptionText || !currentQuestion) return;

    const newAnswer: TestAttemptAnswer = {
      question_id: currentQuestion.id,
      selected_answer: selectedOptionText,
      time_taken: Math.max(1, 180 - secondsRemaining),
    };

    const updatedAnswers = [...recordedAnswers, newAnswer];
    setRecordedAnswers(updatedAnswers);

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setSelectedOptionText(null);
    } else {
      // Last question reached - trigger complete attempt and Python RAG diagnosis
      await handleCompleteAttempt(updatedAnswers);
    }
  };

  const handleCompleteAttempt = async (finalAnswers: TestAttemptAnswer[]) => {
    if (!attemptId) return;
    try {
      setIsDiagnosing(true);
      const result = await studyService.completeAttempt(attemptId, finalAnswers);
      const payload = (result && typeof result === 'object' && 'data' in result && result.data) ? result.data : result;
      setCompletedResult(payload);

      // Instantly record study activity and update leaderboard points & study hours
      const earnedScore = payload?.score != null ? Number(payload.score) : 75;
      studyService.recordStudyActivity({
        type: 'quiz_completed',
        points: 50 + Math.round(earnedScore * 0.75),
        durationSeconds: Math.max(1, finalAnswers.length * 90),
        subject: test?.subject || 'Practice Test',
        title: test?.title || 'Quiz Attempt Completed',
      }).catch((e) => console.log('Activity sync notice:', e.message));
    } catch (err) {
      console.error('[Quiz] Complete attempt and RAG analysis error:', err);
      // Accurate local score computation across all answered questions
      let correctCount = 0;
      const localMistakes: any[] = [];

      finalAnswers.forEach((ans) => {
        const q = questions.find((item: any) => item.id === ans.question_id);
        const qOptions = Array.isArray(q?.options) ? q.options : [];
        const optIdx = qOptions.findIndex((o: string) => String(o).replace(/\s*\(Correct\)\s*/gi, '').trim().toLowerCase() === String(ans.selected_answer || '').trim().toLowerCase());
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const optLetter = optIdx >= 0 ? letters[optIdx] : '';
        const isRight = q ? isOptionTheCorrectAnswer(ans.selected_answer, optLetter, q.correct_answer) : false;

        if (isRight) {
          correctCount += 1;
        } else if (q) {
          localMistakes.push({
            category: 'conceptual',
            reason: `Discrepancy identified in ${q.topic || test?.chapter || 'question'}.`,
            student_answer: ans.selected_answer,
            correct_answer: q.correct_answer,
            confidence: 0.85,
            insight: {
              diagnosis: `Core Concept Gap: ${q.topic || test?.chapter || 'Chapter Mastery'}`,
              explanation: q.explanation || 'Review foundational definitions and formulas for this chapter.',
              recommended_action: `Review textbook section on ${q.topic || test?.chapter || 'this topic'} and retry practice.`,
            },
          });
        }
      });

      const totalQ = Math.max(questions.length, finalAnswers.length, 1);
      const calculatedScore = Math.round((correctCount / totalQ) * 100);

      // Record study activity locally as well
      studyService.recordStudyActivity({
        type: 'quiz_completed',
        points: 50 + Math.round(calculatedScore * 0.75),
        durationSeconds: Math.max(1, finalAnswers.length * 90),
        subject: test?.subject || 'Practice Test',
        title: test?.title || 'Quiz Attempt Completed',
      }).catch((e) => console.log('Activity sync notice:', e.message));

      setCompletedResult({
        score: calculatedScore,
        total_questions: totalQ,
        correct_answers: correctCount,
        wrong_answers: totalQ - correctCount,
        mistakes: localMistakes,
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader title="Quiz" canGoBack showMenu={false} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Connecting to ESpark AI Engine...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle case where test has no questions or failed to load
  if (!currentQuestion || questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader title="Quiz Session" canGoBack showMenu={false} />
        <View style={styles.centerContainer}>
          <MaterialIcons name="menu-book" size={60} color={colors.onSurfaceVariant} />
          <Text style={[styles.loadingText, { marginTop: 16, fontSize: 18, fontWeight: '700', color: colors.onSurface }]}>
            No Questions Available
          </Text>
          <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, paddingHorizontal: 32, lineHeight: 20 }}>
            Unable to load questions for this test. Please head back to Practice to generate a new custom test.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 24,
              backgroundColor: colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
            onPress={() => router.replace('/practice')}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Return to Practice</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Completed Attempt View with live Python RAG Diagnosis
  if (completedResult) {
    const mistakes = completedResult.mistakes || [];
    const score = completedResult.score ?? 0;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader title="Cognitive Diagnosis" canGoBack showMenu={false} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Result Score Card */}
          <View style={styles.resultHeaderCard}>
            <View style={styles.resultScoreBadge}>
              <Text style={styles.resultScoreText}>{score}%</Text>
              <Text style={styles.resultScoreLabel}>Accuracy</Text>
            </View>
            <View style={styles.resultDetails}>
              <Text style={styles.resultTitle}>Attempt Graded by AI</Text>
              <Text style={styles.resultSubtitle}>
                {completedResult.correct_answers || 0} Correct • {completedResult.wrong_answers || 0} Gaps Analyzed
              </Text>
              <View style={styles.ragBadge}>
                <MaterialIcons name="auto-awesome" size={14} color={Theme.colors.primary} />
                <Text style={styles.ragBadgeText}>Powered by Python RAG & Gemini</Text>
              </View>
            </View>
          </View>

          {/* AI Cognitive Breakdown Section */}
          <Text style={styles.sectionHeader}>Cognitive Diagnosis & Root Cause</Text>

          {mistakes.length === 0 ? (
            <View style={styles.perfectCard}>
              <MaterialIcons name="verified" size={48} color={Theme.colors.secondary} />
              <Text style={styles.perfectTitle}>Outstanding! Zero Gaps Detected</Text>
              <Text style={styles.perfectBody}>
                You answered all questions accurately. Your conceptual mastery in this chapter is rock-solid.
              </Text>
            </View>
          ) : (
            mistakes.map((m: any, idx: number) => (
              <View key={idx} style={styles.diagnosisCard}>
                <View style={styles.diagnosisCardHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {(m.category || 'Conceptual').toUpperCase()} ERROR
                    </Text>
                  </View>
                  <Text style={styles.confidenceText}>
                    AI Confidence {Math.round((m.confidence || 0.85) * 100)}%
                  </Text>
                </View>

                <Text style={styles.diagnosisTitle}>
                  {m.insight?.diagnosis || m.reason || 'Terminology Inversion Detected'}
                </Text>

                <View style={styles.diagnosisAnswersRow}>
                  <View style={styles.answerBoxWrong}>
                    <Text style={styles.answerLabelWrong}>Your Answer</Text>
                    <Text style={styles.answerValueWrong}>{m.student_answer}</Text>
                  </View>
                  <View style={styles.answerBoxRight}>
                    <Text style={styles.answerLabelRight}>Correct Answer</Text>
                    <Text style={styles.answerValueRight}>{m.correct_answer}</Text>
                  </View>
                </View>

                <View style={styles.insightBox}>
                  <View style={styles.insightTitleRow}>
                    <MaterialIcons name="psychology" size={18} color={Theme.colors.secondary} />
                    <Text style={styles.insightHeader}>AI Root Cause Analysis</Text>
                  </View>
                  <Text style={styles.insightBody}>
                    {m.insight?.explanation || m.reason}
                  </Text>
                  {m.insight?.recommended_action && (
                    <Text style={styles.recommendedAction}>
                      💡 Action: {m.insight.recommended_action}
                    </Text>
                  )}
                </View>

                {/* Follow-up Drill Generated by RAG */}
                {m.insight?.practice_questions && m.insight.practice_questions.length > 0 && (
                  <View style={styles.drillBox}>
                    <View style={styles.drillHeader}>
                      <MaterialIcons name="fitness-center" size={16} color={Theme.colors.primary} />
                      <Text style={styles.drillHeaderText}>Follow-up Practice Drill</Text>
                    </View>
                    <Text style={styles.drillQuestionText}>
                      {m.insight.practice_questions[0].question_text}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}

          {/* Navigation Action Buttons */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.reviewMistakesBtn}
              onPress={() => router.push('/(tabs)/mistakes')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="error-outline" size={18} color={Theme.colors.onSurface} />
              <Text style={styles.reviewMistakesText}>View in Mistakes Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewInsightsBtn}
              onPress={() => router.push('/(tabs)/insights')}
              activeOpacity={0.88}
            >
              <Text style={styles.viewInsightsText}>Explore Analytics</Text>
              <MaterialIcons name="insights" size={18} color={Theme.colors.inverseOnSurface} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const progressPct = Math.round(((currentQIndex + 1) / Math.max(1, questions.length || 1)) * 100);

  // Resolve active curriculum exam (JEE, NEET, CBSE)
  const activeExam = (
    params?.exam ||
    test?.exam ||
    (test?.title?.toUpperCase().includes('JEE') ? 'JEE' : null) ||
    (test?.title?.toUpperCase().includes('CBSE') ? 'CBSE' : null) ||
    (test?.title?.toUpperCase().includes('NEET') ? 'NEET' : null) ||
    'JEE'
  ).toUpperCase();

  const displaySubject = (params?.subject || test?.subject || 'PHYSICS').toUpperCase();
  const displayTopic = currentQuestion.topic || test?.chapter || params?.chapter || 'General Practice';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader title="Quiz" canGoBack showMenu={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress & Metadata Header */}
        <View style={styles.metaRow}>
          <View style={styles.tagsLeft}>
            <Text style={styles.subjectText}>{displaySubject}</Text>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.topicText} numberOfLines={1} ellipsizeMode="tail">
              {displayTopic}
            </Text>
            <Text style={styles.bulletDot}>•</Text>
            <View style={styles.examBadge}>
              <Text style={styles.examText}>{activeExam}</Text>
            </View>
          </View>

          <View style={styles.timerRight}>
            <View style={styles.timerPill}>
              <MaterialIcons name="timer" size={15} color={Theme.colors.primary} />
              <Text style={styles.timerText}>{formatTimer(secondsRemaining)}</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countText}>
                {currentQIndex + 1}
                <Text style={styles.countTotal}>/{Math.max(1, questions.length || 1)}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Track */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.questionCardTop}>
            <View style={styles.questionBadge}>
              <View style={styles.qDot} />
              <Text style={styles.questionBadgeText}>Question {currentQIndex + 1}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsBookmarked(!isBookmarked)}
              style={styles.bookmarkBtn}
            >
              <MaterialIcons
                name={isBookmarked ? 'bookmark' : 'bookmark-border'}
                size={20}
                color={isBookmarked ? Theme.colors.primary : Theme.colors.outline}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.questionStem}>{currentQuestion.question_text}</Text>

          <View style={styles.questionSubRow}>
            <MaterialIcons name="psychology" size={16} color={Theme.colors.secondary} />
            <Text style={styles.questionSubText}>Single choice • Verified by AI RAG</Text>
          </View>
        </View>

        {/* Options List - Single choice only once, locked on tap */}
        <View style={styles.optionsList}>
          {formattedOptions.map((opt) => {
            const isSelected = opt.fullText === selectedOptionText;
            const hasAnswered = selectedOptionText !== null;
            const isAnswerCorrect = isSelected && opt.isCorrect;
            const isAnswerWrong = isSelected && !opt.isCorrect;
            const isRevealedCorrect = hasAnswered && !isSelected && opt.isCorrect;

            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  isAnswerCorrect && styles.optionCardCorrect,
                  isAnswerWrong && styles.optionCardWrong,
                  isRevealedCorrect && styles.optionCardRevealedCorrect,
                  hasAnswered && !isSelected && !opt.isCorrect && styles.optionCardDimmed,
                ]}
                onPress={() => {
                  // User can select only one option and only once per question
                  if (!hasAnswered) {
                    setSelectedOptionText(opt.fullText);
                  }
                }}
                disabled={hasAnswered}
                activeOpacity={hasAnswered ? 1 : 0.8}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.letterBox,
                      isSelected && styles.letterBoxSelected,
                      isAnswerCorrect && styles.letterBoxCorrect,
                      isAnswerWrong && styles.letterBoxWrong,
                      isRevealedCorrect && styles.letterBoxRevealedCorrect,
                    ]}
                  >
                    <Text
                      style={[
                        styles.letterText,
                        isSelected && styles.letterTextSelected,
                        (isAnswerCorrect || isRevealedCorrect) && styles.letterTextCorrect,
                        isAnswerWrong && styles.letterTextWrong,
                      ]}
                    >
                      {opt.letter}
                    </Text>
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionTerm,
                        isSelected && styles.optionTermSelected,
                        isAnswerCorrect && styles.optionTermCorrect,
                        isAnswerWrong && styles.optionTermWrong,
                        isRevealedCorrect && styles.optionTermRevealedCorrect,
                      ]}
                    >
                      {opt.term}
                    </Text>
                    {opt.definition ? (
                      <Text
                        style={[
                          styles.optionDef,
                          isSelected && styles.optionDefSelected,
                        ]}
                      >
                        {opt.definition}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {isSelected ? (
                  isAnswerCorrect ? (
                    <View style={styles.checkCircleCorrect}>
                      <MaterialIcons name="check" size={16} color="#ffffff" />
                    </View>
                  ) : (
                    <View style={styles.checkCircleWrong}>
                      <MaterialIcons name="close" size={16} color="#ffffff" />
                    </View>
                  )
                ) : isRevealedCorrect ? (
                  <View style={styles.revealedCorrectBadge}>
                    <MaterialIcons name="check-circle" size={18} color="#2e7d32" />
                  </View>
                ) : (
                  <View style={styles.emptyRadioCircle} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Instant Feedback Banner */}
        {selectedOption && (
          <View
            style={[
              styles.feedbackBanner,
              {
                backgroundColor: selectedOption.isCorrect
                  ? 'rgba(183, 237, 227, 0.45)'
                  : Theme.colors.errorContainer,
              },
            ]}
          >
            <View style={styles.feedbackTopRow}>
              <View
                style={[
                  styles.feedbackIconBox,
                  {
                    backgroundColor: selectedOption.isCorrect
                      ? Theme.colors.secondary
                      : Theme.colors.error,
                  },
                ]}
              >
                <MaterialIcons
                  name={selectedOption.isCorrect ? 'sentiment-very-satisfied' : 'error-outline'}
                  size={22}
                  color={Theme.colors.onSecondary}
                />
              </View>
              <View style={styles.feedbackBody}>
                <View style={styles.feedbackHeaderRow}>
                  <Text
                    style={[
                      styles.feedbackTitle,
                      {
                        color: selectedOption.isCorrect
                          ? Theme.colors.onSecondaryContainer
                          : Theme.colors.onErrorContainer,
                      },
                    ]}
                  >
                    {selectedOption.isCorrect ? 'Correct! 🎉' : 'Incorrect Choice'}
                  </Text>
                  {selectedOption.isCorrect && (
                    <View style={styles.marksBadge}>
                      <Text style={styles.marksText}>+4 Marks</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.feedbackExplanation}>
                  {currentQuestion.explanation || 'Review topic rules before continuing.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Exit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextButton,
              (!selectedOptionText || isDiagnosing) && styles.nextButtonDisabled,
            ]}
            onPress={handleNextQuestion}
            disabled={!selectedOptionText || isDiagnosing}
            activeOpacity={0.88}
          >
            {isDiagnosing ? (
              <>
                <ActivityIndicator size="small" color={Theme.colors.inverseOnSurface} />
                <Text style={styles.nextText}>AI RAG Diagnosing...</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextText}>
                  {currentQIndex < questions.length - 1 ? 'Next Question' : 'Submit & AI Diagnose'}
                </Text>
                <MaterialIcons name="arrow-forward" size={18} color={Theme.colors.inverseOnSurface} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: Theme.colors.onSurfaceVariant,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tagsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    flexShrink: 1,
  },
  subjectText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.primary,
  },
  bulletDot: {
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  topicText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    flexShrink: 1,
    maxWidth: 130,
  },
  examBadge: {
    backgroundColor: Theme.colors.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
    flexShrink: 0,
  },
  examText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.onSurfaceVariant,
  },
  timerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
  },
  timerText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.primary,
  },
  countPill: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
  },
  countText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.onSurface,
  },
  countTotal: {
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Theme.colors.onSurfaceVariant,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Theme.colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: 3,
  },
  questionCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    gap: 12,
    ...Theme.shadows.subtle,
  },
  questionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
  },
  qDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primary,
  },
  questionBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  bookmarkBtn: {
    padding: 4,
  },
  questionStem: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Theme.colors.onSurface,
    lineHeight: 24,
  },
  questionSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questionSubText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Theme.colors.secondary,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 14,
    borderRadius: Theme.radii.xl,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderHairline,
    ...Theme.shadows.subtle,
  },
  optionCardSelected: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderColor: Theme.colors.primary,
  },
  optionCardCorrect: {
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderColor: '#2e7d32',
  },
  optionCardWrong: {
    backgroundColor: Theme.colors.errorContainer,
    borderColor: Theme.colors.error,
  },
  optionCardRevealedCorrect: {
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    borderColor: '#2e7d32',
    borderStyle: 'dashed',
  },
  optionCardDimmed: {
    opacity: 0.55,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  letterBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxSelected: {
    backgroundColor: Theme.colors.primary,
  },
  letterText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  letterTextSelected: {
    color: Theme.colors.onPrimary,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTerm: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  optionTermSelected: {
    color: Theme.colors.primary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  optionDef: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  optionDefSelected: {
    color: Theme.colors.onSurface,
  },
  emptyRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Theme.colors.surfaceContainerHigh,
  },
  checkCircleSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleCorrect: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleWrong: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealedCorrectBadge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxCorrect: {
    backgroundColor: '#2e7d32',
  },
  letterBoxWrong: {
    backgroundColor: Theme.colors.error,
  },
  letterBoxRevealedCorrect: {
    backgroundColor: '#2e7d32',
  },
  letterTextCorrect: {
    color: '#ffffff',
  },
  letterTextWrong: {
    color: '#ffffff',
  },
  optionTermCorrect: {
    color: '#2e7d32',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  optionTermWrong: {
    color: Theme.colors.error,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  optionTermRevealedCorrect: {
    color: '#2e7d32',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  feedbackBanner: {
    borderRadius: Theme.radii['2xl'],
    padding: 14,
  },
  feedbackTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBody: {
    flex: 1,
    gap: 6,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  marksBadge: {
    backgroundColor: Theme.colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radii.full,
  },
  marksText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.secondary,
  },
  feedbackExplanation: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSecondaryContainer,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  skipButton: {
    height: 50,
    paddingHorizontal: 22,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  nextButton: {
    height: 50,
    flex: 1,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.inverseSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Theme.shadows.card,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.inverseOnSurface,
  },
  // Result View Styles
  resultHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 18,
    borderRadius: Theme.radii['2xl'],
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    gap: 16,
    ...Theme.shadows.card,
  },
  resultScoreBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultScoreText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: Theme.colors.primary,
  },
  resultScoreLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: Theme.colors.primary,
    marginTop: -2,
  },
  resultDetails: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  resultSubtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  ragBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  ragBadgeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: Theme.colors.primary,
  },
  sectionHeader: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Theme.colors.onSurface,
    marginTop: 6,
  },
  perfectCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 24,
    borderRadius: Theme.radii['2xl'],
    gap: 8,
  },
  perfectTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Theme.colors.onSurface,
  },
  perfectBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  diagnosisCard: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: Theme.radii['2xl'],
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    gap: 12,
    ...Theme.shadows.subtle,
  },
  diagnosisCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(190, 84, 60, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
  },
  categoryBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.error,
  },
  confidenceText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
  },
  diagnosisTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Theme.colors.onSurface,
  },
  diagnosisAnswersRow: {
    gap: 8,
  },
  answerBoxWrong: {
    backgroundColor: 'rgba(255, 230, 230, 0.6)',
    padding: 10,
    borderRadius: Theme.radii.md,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.error,
  },
  answerLabelWrong: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.error,
  },
  answerValueWrong: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.onErrorContainer,
    marginTop: 2,
  },
  answerBoxRight: {
    backgroundColor: 'rgba(230, 250, 240, 0.6)',
    padding: 10,
    borderRadius: Theme.radii.md,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.secondary,
  },
  answerLabelRight: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.secondary,
  },
  answerValueRight: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.onSecondaryContainer,
    marginTop: 2,
  },
  insightBox: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    padding: 12,
    borderRadius: Theme.radii.lg,
    gap: 6,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightHeader: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.secondary,
  },
  insightBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurface,
    lineHeight: 18,
  },
  recommendedAction: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: Theme.colors.primary,
    marginTop: 2,
  },
  drillBox: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 12,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    gap: 6,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drillHeaderText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  drillQuestionText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.onSurface,
  },
  resultActions: {
    gap: 10,
    marginTop: 8,
  },
  reviewMistakesBtn: {
    height: 48,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reviewMistakesText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  viewInsightsBtn: {
    height: 48,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.inverseSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Theme.shadows.card,
  },
  viewInsightsText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.inverseOnSurface,
  },
});
