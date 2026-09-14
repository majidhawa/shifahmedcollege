'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileQuestion,
  Loader2,
  Send,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type AssessmentType = 'quiz' | 'exam';

type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay';

type Option = {
  id: number;
  text: string;
  order: number;
};

type Question = {
  id: number;
  questionText: string;
  questionType: QuestionType | string;
  marks: number;
  questionOrder: number;
  explanation: string | null;
  options: Option[];
};

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;

  assessmentType: AssessmentType;

  totalMarks: number;
  timeLimitMinutes: number;
  attemptsAllowed: number;
  passingScore: number;
  questionCount: number;

  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;

  showResults?: boolean;
  showCorrectAnswers?: boolean;

  availableFrom?: string | null;
  availableUntil?: string | null;
};

type Attempt = {
  id: number;
  attempt_number: number;
  started_at: string;
  status: string;
};

/*
 * A student's answer can either contain:
 *
 * - selectedOptionId for MCQ
 * - answerText for True/False
 * - answerText for Short Answer
 * - answerText for Essay
 */
type StudentAnswer = {
  selectedOptionId: number | null;
  answerText: string;
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeAssessmentType(
  value: unknown
): AssessmentType {
  return String(value ?? 'quiz')
    .trim()
    .toLowerCase() === 'exam'
    ? 'exam'
    : 'quiz';
}

function normalizeQuestionType(
  value: unknown
): QuestionType | string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function isMultipleChoiceQuestion(
  questionType: string
): boolean {
  return (
    questionType === 'multiple_choice' ||
    questionType === 'mcq'
  );
}

function isTrueFalseQuestion(
  questionType: string
): boolean {
  return (
    questionType === 'true_false' ||
    questionType === 'true-false' ||
    questionType === 'boolean'
  );
}

function isOptionQuestion(
  questionType: string
): boolean {
  return (
    isMultipleChoiceQuestion(
      questionType
    ) ||
    isTrueFalseQuestion(
      questionType
    )
  );
}

function isWrittenQuestion(
  questionType: string
): boolean {
  return (
    questionType === 'short_answer' ||
    questionType === 'shortanswer' ||
    questionType === 'short-answer' ||
    questionType === 'essay'
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();

  const quizId = Number(params.id);

  const [quiz, setQuiz] =
    useState<Quiz | null>(null);

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [attempt, setAttempt] =
    useState<Attempt | null>(null);

  const [answers, setAnswers] =
    useState<
      Record<number, StudentAnswer>
    >({});

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [secondsLeft, setSecondsLeft] =
    useState<number | null>(null);

  const [started, setStarted] =
    useState(false);

  /* =======================================================
     DERIVED ASSESSMENT LABELS
  ======================================================= */

  const assessmentType =
    quiz?.assessmentType ?? 'quiz';

  const isExam =
    assessmentType === 'exam';

  const assessmentLabel =
    isExam
      ? 'Examination'
      : 'Quiz / CAT';

  const startLabel =
    isExam
      ? 'Start Examination'
      : 'Start Quiz';

  const submitLabel =
    isExam
      ? 'Submit Examination'
      : 'Submit Quiz';

  /* =======================================================
     LOAD QUIZ
  ======================================================= */

  useEffect(() => {
    if (!quizId) return;

    void loadQuiz();
  }, [quizId]);

  async function loadQuiz() {
    try {
      setLoading(true);
      setError('');

      const response =
        await fetch(
          `/api/student/quizzes/${quizId}`,
          {
            cache: 'no-store',
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to load assessment'
        );
      }

      const normalizedQuiz: Quiz = {
        ...data.quiz,

        assessmentType:
          normalizeAssessmentType(
            data.quiz?.assessmentType ??
              data.quiz?.assessment_type
          ),
      };

      const normalizedQuestions: Question[] =
        (
          data.questions || []
        ).map(
          (
            question: Question
          ) => ({
            ...question,

            id: Number(
              question.id
            ),

            questionType:
              normalizeQuestionType(
                question.questionType
              ),

            marks:
              Number(
                question.marks || 0
              ),

            questionOrder:
              Number(
                question.questionOrder ||
                  0
              ),

            options:
              Array.isArray(
                question.options
              )
                ? question.options.map(
                    (
                      option: Option
                    ) => ({
                      ...option,

                      id: Number(
                        option.id
                      ),

                      order:
                        Number(
                          option.order ||
                            0
                        ),
                    })
                  )
                : [],
          })
        );

      setQuiz(
        normalizedQuiz
      );

      setQuestions(
        normalizedQuestions
      );
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load assessment'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     START ASSESSMENT
  ======================================================= */

  async function startQuiz() {
    try {
      setStarting(true);
      setError('');

      const response =
        await fetch(
          `/api/student/quizzes/${quizId}/attempt`,
          {
            method: 'POST',
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Unable to start ${
              isExam
                ? 'examination'
                : 'quiz'
            }`
        );
      }

      setAttempt(
        data.attempt
      );

      setStarted(true);

      /*
       * Initialize timer from the actual
       * server-side attempt start time.
       */
      if (
        quiz &&
        quiz.timeLimitMinutes > 0
      ) {
        const startedAt =
          new Date(
            data.attempt.started_at
          ).getTime();

        const duration =
          quiz.timeLimitMinutes *
          60;

        const elapsed =
          Math.floor(
            (Date.now() -
              startedAt) /
              1000
          );

        setSecondsLeft(
          Math.max(
            0,
            duration - elapsed
          )
        );
      } else {
        setSecondsLeft(null);
      }
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : `Unable to start ${
              isExam
                ? 'examination'
                : 'quiz'
            }`
      );
    } finally {
      setStarting(false);
    }
  }

  /* =======================================================
     TIMER
  ======================================================= */

  useEffect(() => {
    if (
      !started ||
      secondsLeft === null
    ) {
      return;
    }

    if (secondsLeft <= 0) {
      void submitQuiz(true);
      return;
    }

    const timer =
      setInterval(() => {
        setSecondsLeft(
          (value) =>
            value === null
              ? null
              : Math.max(
                  0,
                  value - 1
                )
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    started,
    secondsLeft,
  ]);

  function formatTime(
    seconds: number
  ) {
    const hours =
      Math.floor(
        seconds / 3600
      );

    const minutes =
      Math.floor(
        (seconds % 3600) / 60
      );

    const remaining =
      seconds % 60;

    if (hours > 0) {
      return `${String(
        hours
      ).padStart(
        2,
        '0'
      )}:${String(
        minutes
      ).padStart(
        2,
        '0'
      )}:${String(
        remaining
      ).padStart(
        2,
        '0'
      )}`;
    }

    return `${String(
      minutes
    ).padStart(
      2,
      '0'
    )}:${String(
      remaining
    ).padStart(
      2,
      '0'
    )}`;
  }

  /* =======================================================
     ANSWER HELPERS
  ======================================================= */

  function getAnswer(
    questionId: number
  ): StudentAnswer {
    return (
      answers[questionId] || {
        selectedOptionId: null,
        answerText: '',
      }
    );
  }

  function isQuestionAnswered(
    question: Question
  ): boolean {
    const answer =
      answers[question.id];

    if (!answer) {
      return false;
    }

    const type =
      normalizeQuestionType(
        question.questionType
      );

    /* =====================================================
       MCQ
    ===================================================== */

    if (
      isMultipleChoiceQuestion(
        type
      )
    ) {
      return (
        answer.selectedOptionId !==
        null
      );
    }

    /* =====================================================
       TRUE / FALSE
    ===================================================== */

    if (
      isTrueFalseQuestion(
        type
      )
    ) {
      const value =
        answer.answerText
          .trim()
          .toLowerCase();

      return (
        value === 'true' ||
        value === 'false'
      );
    }

    /* =====================================================
       WRITTEN
    ===================================================== */

    if (
      isWrittenQuestion(type)
    ) {
      return (
        answer.answerText
          .trim()
          .length > 0
      );
    }

    return false;
  }

  /* =======================================================
     SAVE ANSWER
  ======================================================= */

  async function saveAnswer(
    questionId: number,
    selectedOptionId: number | null,
    answerText: string
  ) {
    if (!attempt) return;

    /*
     * Update the UI immediately.
     */
    setAnswers((previous) => ({
      ...previous,

      [questionId]: {
        selectedOptionId,
        answerText,
      },
    }));

    try {
      const response =
        await fetch(
          `/api/student/quizzes/${quizId}/attempt/${attempt.id}/answers`,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              questionId,

              selectedOptionId,

              answerText:
                answerText.trim()
                  ? answerText.trim()
                  : null,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to save answer'
        );
      }
    } catch (err: unknown) {
      console.error(
        'Failed to save answer:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save answer'
      );
    }
  }

  /* =======================================================
     SELECT MCQ ANSWER
  ======================================================= */

  async function selectMultipleChoiceAnswer(
    questionId: number,
    optionId: number
  ) {
    await saveAnswer(
      questionId,
      optionId,
      ''
    );
  }

  /* =======================================================
     SELECT TRUE / FALSE ANSWER
  ======================================================= */

  async function selectTrueFalseAnswer(
    questionId: number,
    value: 'true' | 'false'
  ) {
    /*
     * True/False deliberately does NOT use
     * selectedOptionId.
     *
     * The authoritative answer is stored
     * in lms_quiz_questions.correct_answer.
     */
    await saveAnswer(
      questionId,
      null,
      value
    );
  }

  /* =======================================================
     WRITTEN ANSWER
  ======================================================= */

  function updateWrittenAnswer(
    questionId: number,
    value: string
  ) {
    setAnswers((previous) => ({
      ...previous,

      [questionId]: {
        selectedOptionId: null,
        answerText: value,
      },
    }));
  }

  /*
   * Save the current written answer when
   * the student leaves the question.
   */
  async function saveCurrentWrittenAnswer() {
    if (!attempt) return;

    const question =
      questions[currentQuestion];

    if (!question) return;

    const type =
      normalizeQuestionType(
        question.questionType
      );

    if (
      !isWrittenQuestion(type)
    ) {
      return;
    }

    const answer =
      getAnswer(question.id);

    await saveAnswer(
      question.id,
      null,
      answer.answerText
    );
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  async function goToQuestion(
    index: number
  ) {
    await saveCurrentWrittenAnswer();

    setCurrentQuestion(index);

    setError('');
  }

  async function goPrevious() {
    if (
      currentQuestion <= 0
    ) {
      return;
    }

    await goToQuestion(
      currentQuestion - 1
    );
  }

  async function goNext() {
    if (
      currentQuestion >=
      questions.length - 1
    ) {
      return;
    }

    await goToQuestion(
      currentQuestion + 1
    );
  }

  /* =======================================================
     SUBMIT ASSESSMENT
  ======================================================= */

  async function submitQuiz(
    automatic = false
  ) {
    if (
      !attempt ||
      submitting
    ) {
      return;
    }

    /*
     * Save any written answer currently
     * being edited before submission.
     */
    await saveCurrentWrittenAnswer();

    /*
     * Automatic submission does not
     * require confirmation.
     */
    if (!automatic) {
      const unanswered =
        questions.filter(
          (question) =>
            !isQuestionAnswered(
              question
            )
        ).length;

      if (unanswered > 0) {
        const confirmed =
          window.confirm(
            `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
          );

        if (!confirmed) {
          return;
        }
      } else {
        const confirmed =
          window.confirm(
            `Are you sure you want to submit this ${
              isExam
                ? 'examination'
                : 'quiz'
            }?`
          );

        if (!confirmed) {
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const response =
        await fetch(
          `/api/student/quizzes/${quizId}/attempt/${attempt.id}/submit`,
          {
            method: 'POST',
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to submit ${
              isExam
                ? 'examination'
                : 'quiz'
            }`
        );
      }

      router.push(
        `/student/dashboard/quizzes/${quizId}/result?attemptId=${attempt.id}`
      );
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : `Failed to submit ${
              isExam
                ? 'examination'
                : 'quiz'
            }`
      );

      setSubmitting(false);
    }
  }

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const current =
    questions[currentQuestion];

  const answeredCount =
    questions.filter(
      (question) =>
        isQuestionAnswered(
          question
        )
    ).length;

  const progress =
    questions.length > 0
      ? (answeredCount /
          questions.length) *
        100
      : 0;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-green-700" />

          <p className="mt-3 text-sm text-gray-500">
            Loading{' '}
            {isExam
              ? 'examination'
              : 'quiz'}
            ...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     LOAD ERROR
  ======================================================= */

  if (error && !quiz) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-700">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6" />

            <div>
              <h2 className="font-semibold">
                Unable to load assessment
              </h2>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              router.back()
            }
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  /* =======================================================
     INTRODUCTION SCREEN
  ======================================================= */

  if (!started) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <button
          onClick={() =>
            router.push(
              '/student/dashboard/quizzes'
            )
          }
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-green-700"
        >
          <ArrowLeft className="h-4 w-4" />

          Back to Assessments
        </button>

        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="bg-gradient-to-br from-green-800 to-green-700 p-6 md:p-10 text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <FileQuestion className="h-7 w-7" />
              </div>

              <div className="mt-5">
                <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {assessmentLabel}
                </span>
              </div>

              <h1 className="mt-4 text-2xl md:text-3xl font-bold">
                {quiz.title}
              </h1>

              {quiz.description && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-green-50">
                  {quiz.description}
                </p>
              )}
            </div>

            {/* =================================================
                DETAILS
            ================================================= */}

            <div className="p-6 md:p-10">

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                <QuizInfo
                  label="Questions"
                  value={`${quiz.questionCount}`}
                />

                <QuizInfo
                  label="Total Marks"
                  value={`${quiz.totalMarks}`}
                />

                <QuizInfo
                  label="Time Limit"
                  value={
                    quiz.timeLimitMinutes
                      ? `${quiz.timeLimitMinutes} min`
                      : 'No limit'
                  }
                />

                <QuizInfo
                  label="Pass Mark"
                  value={`${quiz.passingScore}%`}
                />

              </div>

              {/* =================================================
                  INSTRUCTIONS
              ================================================= */}

              {quiz.instructions && (
                <div className="mt-8 rounded-2xl bg-gray-50 p-5">
                  <h2 className="font-bold text-gray-900">
                    Instructions
                  </h2>

                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {quiz.instructions}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* =================================================
                  START
              ================================================= */}

              <button
                onClick={startQuiz}
                disabled={starting}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-6 py-4 font-semibold text-white shadow-lg transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />

                    Starting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />

                    {startLabel}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     EMPTY QUESTIONS
  ======================================================= */

  if (!current) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-800">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 shrink-0" />

            <div>
              <h2 className="font-semibold">
                No questions available
              </h2>

              <p className="mt-1 text-sm">
                This assessment does not
                currently contain any questions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     CURRENT QUESTION
  ======================================================= */

  const currentType =
    normalizeQuestionType(
      current.questionType
    );

  const currentAnswer =
    getAnswer(current.id);

  const isCurrentMCQ =
    isMultipleChoiceQuestion(
      currentType
    );

  const isCurrentTrueFalse =
    isTrueFalseQuestion(
      currentType
    );

  const isCurrentWrittenQuestion =
    isWrittenQuestion(
      currentType
    );

  /* =======================================================
     MAIN ASSESSMENT
  ======================================================= */

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="mx-auto max-w-6xl">

        {/* =================================================
            ASSESSMENT HEADER
        ================================================= */}

        <div className="mb-5 rounded-2xl bg-white border border-gray-100 shadow-sm p-4">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <div className="flex items-center gap-2">

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  {assessmentLabel}
                </span>

              </div>

              <h1 className="mt-2 text-lg md:text-xl font-bold text-gray-900">
                {quiz.title}
              </h1>
            </div>

            {secondsLeft !== null && (
              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold ${
                  secondsLeft <= 60
                    ? 'bg-red-100 text-red-700'
                    : secondsLeft <= 300
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                <Clock className="h-5 w-5" />

                {formatTime(
                  secondsLeft
                )}
              </div>
            )}

          </div>

          {/* =================================================
              PROGRESS
          ================================================= */}

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-gray-500">

            <span>
              {answeredCount} of{' '}
              {questions.length}{' '}
              answered
            </span>

            <span>
              Question{' '}
              {currentQuestion + 1}{' '}
              of {questions.length}
            </span>

          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">

          {/* =================================================
              QUESTION CARD
          ================================================= */}

          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">

            <div className="p-5 md:p-8">

              <div className="flex items-start justify-between gap-4">

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  Question{' '}
                  {currentQuestion + 1}
                </span>

                <span className="text-sm font-semibold text-gray-500">
                  {current.marks}{' '}
                  {current.marks === 1
                    ? 'mark'
                    : 'marks'}
                </span>

              </div>

              {/* =================================================
                  QUESTION TEXT
              ================================================= */}

              <h2 className="mt-6 text-lg md:text-xl font-semibold leading-8 text-gray-900 whitespace-pre-wrap">
                {current.questionText}
              </h2>

              {/* =================================================
                  MULTIPLE CHOICE
              ================================================= */}

              {isCurrentMCQ && (
                <div className="mt-7 space-y-3">

                  {current.options.length ===
                  0 ? (
                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0" />

                        <div>
                          <p className="font-semibold">
                            No answer options available
                          </p>

                          <p className="mt-1">
                            This multiple-choice question
                            does not currently have any
                            answer options.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    current.options.map(
                      (option) => {
                        const selected =
                          currentAnswer.selectedOptionId ===
                          option.id;

                        return (
                          <button
                            key={
                              option.id
                            }
                            type="button"
                            onClick={() =>
                              void selectMultipleChoiceAnswer(
                                current.id,
                                option.id
                              )
                            }
                            className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                              selected
                                ? 'border-green-600 bg-green-50 ring-2 ring-green-100'
                                : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40'
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                                selected
                                  ? 'border-green-600 bg-green-600 text-white'
                                  : 'border-gray-300 text-gray-500'
                              }`}
                            >
                              {String.fromCharCode(
                                65 +
                                  option.order -
                                  1
                              )}
                            </span>

                            <span
                              className={`text-sm md:text-base ${
                                selected
                                  ? 'font-semibold text-green-900'
                                  : 'text-gray-700'
                              }`}
                            >
                              {
                                option.text
                              }
                            </span>
                          </button>
                        );
                      }
                    )
                  )}

                </div>
              )}

              {/* =================================================
                  TRUE / FALSE
              ================================================= */}

              {isCurrentTrueFalse && (
                <div className="mt-7 space-y-3">

                  {/*
                   * True/False intentionally does
                   * not depend on lms_quiz_options.
                   *
                   * We always provide these two
                   * choices to the student.
                   */}

                  {(
                    [
                      {
                        value: 'true',
                        label: 'True',
                        letter: 'T',
                      },
                      {
                        value: 'false',
                        label: 'False',
                        letter: 'F',
                      },
                    ] as const
                  ).map(
                    (option) => {
                      const selected =
                        currentAnswer.answerText
                          .trim()
                          .toLowerCase() ===
                        option.value;

                      return (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            void selectTrueFalseAnswer(
                              current.id,
                              option.value
                            )
                          }
                          className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                            selected
                              ? 'border-green-600 bg-green-50 ring-2 ring-green-100'
                              : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40'
                          }`}
                        >

                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                              selected
                                ? 'border-green-600 bg-green-600 text-white'
                                : 'border-gray-300 text-gray-500'
                            }`}
                          >
                            {
                              option.letter
                            }
                          </span>

                          <span
                            className={`text-base ${
                              selected
                                ? 'font-semibold text-green-900'
                                : 'text-gray-700'
                            }`}
                          >
                            {
                              option.label
                            }
                          </span>

                        </button>
                      );
                    }
                  )}

                </div>
              )}

              {/* =================================================
                  SHORT ANSWER
              ================================================= */}

              {currentType ===
                'short_answer' && (
                <div className="mt-7">

                  <label
                    htmlFor={`answer-${current.id}`}
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Your answer
                  </label>

                  <input
                    id={`answer-${current.id}`}
                    type="text"
                    value={
                      currentAnswer.answerText
                    }
                    onChange={(event) =>
                      updateWrittenAnswer(
                        current.id,
                        event.target.value
                      )
                    }
                    onBlur={() =>
                      void saveCurrentWrittenAnswer()
                    }
                    placeholder="Type your answer here..."
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Your answer will be saved automatically.
                  </p>

                </div>
              )}

              {/* =================================================
                  ESSAY
              ================================================= */}

              {currentType ===
                'essay' && (
                <div className="mt-7">

                  <label
                    htmlFor={`answer-${current.id}`}
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Your answer
                  </label>

                  <textarea
                    id={`answer-${current.id}`}
                    value={
                      currentAnswer.answerText
                    }
                    onChange={(event) =>
                      updateWrittenAnswer(
                        current.id,
                        event.target.value
                      )
                    }
                    onBlur={() =>
                      void saveCurrentWrittenAnswer()
                    }
                    rows={9}
                    placeholder="Write your answer here..."
                    className="w-full resize-y rounded-2xl border border-gray-300 bg-white px-4 py-4 text-sm leading-7 text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />

                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>
                      Your answer will be saved automatically.
                    </span>

                    <span>
                      {
                        currentAnswer
                          .answerText
                          .length
                      }{' '}
                      characters
                    </span>
                  </div>

                </div>
              )}

              {/* =================================================
                  UNKNOWN QUESTION TYPE
              ================================================= */}

              {!isOptionQuestion(
                currentType
              ) &&
                !isCurrentWrittenQuestion && (
                  <div className="mt-7 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0" />

                      <div>
                        <p className="font-semibold">
                          Unsupported question type
                        </p>

                        <p className="mt-1">
                          This question type is not
                          currently supported by the
                          student assessment interface.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* =================================================
                  NAVIGATION
              ================================================= */}

              <div className="mt-8 flex items-center justify-between gap-3">

                <button
                  type="button"
                  onClick={() =>
                    void goPrevious()
                  }
                  disabled={
                    currentQuestion ===
                    0
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />

                  Previous
                </button>

                {currentQuestion <
                questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      void goNext()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    Next

                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void submitQuiz()
                    }
                    disabled={
                      submitting
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}

                    {submitting
                      ? 'Submitting...'
                      : submitLabel}
                  </button>
                )}

              </div>

              {error && (
                <div className="mt-5 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

            </div>
          </div>

          {/* =================================================
              QUESTION NAVIGATOR
          ================================================= */}

          <aside className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 h-fit lg:sticky lg:top-5">

            <h3 className="font-bold text-gray-900">
              Questions
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Select a question to jump to it.
            </p>

            <div className="mt-5 grid grid-cols-5 gap-2">

              {questions.map(
                (
                  question,
                  index
                ) => {
                  const answered =
                    isQuestionAnswered(
                      question
                    );

                  const isCurrent =
                    index ===
                    currentQuestion;

                  return (
                    <button
                      key={
                        question.id
                      }
                      type="button"
                      onClick={() =>
                        void goToQuestion(
                          index
                        )
                      }
                      className={`h-10 rounded-lg text-sm font-bold transition ${
                        isCurrent
                          ? 'bg-green-700 text-white'
                          : answered
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                }
              )}

            </div>

            {/* =================================================
                LEGEND
            ================================================= */}

            <div className="mt-6 space-y-2 text-xs text-gray-500">

              <Legend
                className="bg-green-700"
                text="Current"
              />

              <Legend
                className="bg-green-100"
                text="Answered"
              />

              <Legend
                className="bg-gray-100"
                text="Unanswered"
              />

            </div>

            {/* =================================================
                SUBMIT FROM SIDEBAR
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                void submitQuiz()
              }
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-green-700 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />

              {submitLabel}
            </button>

          </aside>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   QUIZ INFO
========================================================= */

function QuizInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function Legend({
  className,
  text,
}: {
  className: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-3 w-3 rounded ${className}`}
      />

      {text}
    </div>
  );
}