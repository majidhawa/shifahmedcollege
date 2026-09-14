'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GripVertical,
  Plus,
  Save,
  Trash2,
  AlertCircle,
  ShieldCheck,
  ListChecks,
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
  id: string;
  text: string;
  isCorrect: boolean;
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeAssessmentType(
  value: unknown
): AssessmentType {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (
    normalized === 'exam' ||
    normalized === 'examination'
  ) {
    return 'exam';
  }

  return 'quiz';
}

function getAssessmentLabel(
  assessmentType: AssessmentType
) {
  return assessmentType === 'exam'
    ? 'Examination'
    : 'Quiz / CAT';
}

function getAssessmentShortLabel(
  assessmentType: AssessmentType
) {
  return assessmentType === 'exam'
    ? 'Examination'
    : 'Quiz / CAT';
}

function createOption(
  text = '',
  isCorrect = false
): Option {
  return {
    id:
      typeof crypto !== 'undefined'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    text,
    isCorrect,
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function CreateQuizQuestionPage() {
  const router = useRouter();
  const params = useParams();

  const quizId = String(params?.id ?? '');

  /* =======================================================
     STATE
  ======================================================= */

  const [quiz, setQuiz] =
    useState<any>(null);

  const [loadingQuiz, setLoadingQuiz] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [questionText, setQuestionText] =
    useState('');

  const [questionType, setQuestionType] =
    useState<QuestionType>(
      'multiple_choice'
    );

  const [marks, setMarks] =
    useState('1');

  const [questionOrder, setQuestionOrder] =
    useState('');

  const [explanation, setExplanation] =
    useState('');

  const [correctAnswer, setCorrectAnswer] =
    useState('');

  const [options, setOptions] =
    useState<Option[]>([
      createOption(),
      createOption(),
      createOption(),
      createOption(),
    ]);

  /* =======================================================
     ASSESSMENT TYPE
  ======================================================= */

  const assessmentType: AssessmentType =
    normalizeAssessmentType(
      quiz?.assessmentType ??
        quiz?.assessment_type
    );

  const isExam =
    assessmentType === 'exam';

  const assessmentLabel =
    getAssessmentLabel(
      assessmentType
    );

  const assessmentShortLabel =
    getAssessmentShortLabel(
      assessmentType
    );

  /* =======================================================
     LOAD ASSESSMENT
  ======================================================= */

  useEffect(() => {
    if (!quizId) return;

    let cancelled = false;

    async function loadQuiz() {
      try {
        setLoadingQuiz(true);
        setError('');

        const response = await fetch(
          `/api/lecturer/quizzes/${quizId}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          throw new Error(
            'Failed to load assessment.'
          );
        }

        const data =
          await response.json();

        if (cancelled) return;

        const loadedQuiz =
          data?.quiz ?? data;

        setQuiz(loadedQuiz);

        if (
          loadedQuiz?.nextQuestionOrder !==
          undefined
        ) {
          setQuestionOrder(
            String(
              loadedQuiz.nextQuestionOrder
            )
          );
        }
      } catch (err) {
        console.error(
          'LOAD ASSESSMENT ERROR:',
          err
        );

        if (!cancelled) {
          setError(
            'Unable to load this assessment. Please refresh the page and try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingQuiz(false);
        }
      }
    }

    loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [quizId]);

  /* =======================================================
     QUESTION BEHAVIOR
  ======================================================= */

  const objectiveQuestion =
    questionType ===
      'multiple_choice' ||
    questionType ===
      'true_false';

  const canHaveOptions =
    objectiveQuestion;

  const correctOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          option.isCorrect
      ),
    [options]
  );

  /* =======================================================
     CHANGE QUESTION TYPE
  ======================================================= */

  function handleQuestionTypeChange(
    type: QuestionType
  ) {
    setQuestionType(type);
    setError('');
    setCorrectAnswer('');

    if (type === 'true_false') {
      setOptions([
        createOption(
          'True',
          false
        ),
        createOption(
          'False',
          false
        ),
      ]);

      return;
    }

    if (type === 'multiple_choice') {
      setOptions([
        createOption(),
        createOption(),
        createOption(),
        createOption(),
      ]);

      return;
    }

    setOptions([]);
  }

  /* =======================================================
     ADD OPTION
  ======================================================= */

  function addOption() {
    setOptions((current) => [
      ...current,
      createOption(),
    ]);
  }

  /* =======================================================
     REMOVE OPTION
  ======================================================= */

  function removeOption(
    optionId: string
  ) {
    setOptions((current) =>
      current.filter(
        (option) =>
          option.id !== optionId
      )
    );
  }

  /* =======================================================
     UPDATE OPTION
  ======================================================= */

  function updateOption(
    optionId: string,
    text: string
  ) {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId
          ? {
              ...option,
              text,
            }
          : option
      )
    );
  }

  /* =======================================================
     MARK CORRECT OPTION
  ======================================================= */

  function markCorrect(
    optionId: string
  ) {
    setOptions((current) =>
      current.map((option) => ({
        ...option,
        isCorrect:
          option.id === optionId,
      }))
    );
  }

  /* =======================================================
     VALIDATION
  ======================================================= */

  function validateForm() {
    const trimmedQuestion =
      questionText.trim();

    if (!trimmedQuestion) {
      return 'Please enter the question text.';
    }

    const numericMarks =
      Number(marks);

    if (
      !Number.isFinite(
        numericMarks
      ) ||
      numericMarks <= 0
    ) {
      return 'Question marks must be greater than 0.';
    }

    /* =====================================================
       MULTIPLE CHOICE
    ===================================================== */

    if (
      questionType ===
      'multiple_choice'
    ) {
      const usableOptions =
        options.filter(
          (option) =>
            option.text.trim()
              .length > 0
        );

      if (
        usableOptions.length < 2
      ) {
        return 'Multiple choice questions must have at least two answer options.';
      }

      if (
        correctOptions.length !== 1
      ) {
        return 'Please select one correct answer.';
      }

      const emptyOption =
        options.some(
          (option) =>
            option.text.trim()
              .length === 0
        );

      if (emptyOption) {
        return 'Please complete or remove all empty answer options.';
      }
    }

    /* =====================================================
       TRUE / FALSE
    ===================================================== */

    if (
      questionType ===
      'true_false'
    ) {
      if (
        options.length !== 2
      ) {
        return 'True / False questions must contain True and False options.';
      }

      if (
        correctOptions.length !== 1
      ) {
        return 'Please select either True or False as the correct answer.';
      }

      const correctOption =
        correctOptions[0];

      if (
        !correctOption ||
        !correctOption.text.trim()
      ) {
        return 'Please select a valid True / False answer.';
      }
    }

    /* =====================================================
       WRITTEN QUESTIONS
    ===================================================== */

    if (
      questionType ===
        'short_answer' ||
      questionType === 'essay'
    ) {
      if (
        !correctAnswer.trim()
      ) {
        return 'Please enter the correct/model answer.';
      }
    }

    return null;
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    try {
      setSaving(true);

      /* ===================================================
         DETERMINE CORRECT ANSWER
         
         Multiple Choice:
           Correct answer is stored in options.

         True / False:
           Correct answer MUST also be sent as
           correctAnswer because the API expects it.

         Short Answer / Essay:
           Correct answer comes from the model answer.
      =================================================== */

      let finalCorrectAnswer:
        | string
        | null = null;

      if (
        questionType ===
        'true_false'
      ) {
        const correctOption =
          correctOptions[0];

        finalCorrectAnswer =
          correctOption?.text
            ?.trim()
            .toLowerCase() || null;
      }

      if (
        questionType ===
          'short_answer' ||
        questionType === 'essay'
      ) {
        finalCorrectAnswer =
          correctAnswer.trim();
      }

      /* ===================================================
         PAYLOAD
      =================================================== */

      const payload = {
        quizId: Number(quizId),

        questionText:
          questionText.trim(),

        questionType,

        marks: Number(marks),

        questionOrder:
          questionOrder
            ? Number(
                questionOrder
              )
            : undefined,

        explanation:
          explanation.trim() ||
          null,

        /*
         * IMPORTANT:
         *
         * True / False now sends "true" or "false".
         *
         * Multiple Choice continues to use the options
         * table/JSON structure.
         */
        correctAnswer:
          finalCorrectAnswer,

        /*
         * Multiple Choice uses its options.
         *
         * True / False also sends the two options,
         * while the API uses correctAnswer to determine
         * the correct response.
         */
        options:
          objectiveQuestion
            ? options.map(
                (
                  option,
                  index
                ) => ({
                  optionText:
                    option.text.trim(),

                  isCorrect:
                    option.isCorrect,

                  optionOrder:
                    index + 1,
                })
              )
            : [],
      };

      console.log(
        'CREATE QUESTION PAYLOAD:',
        payload
      );

      /* ===================================================
         API REQUEST
      =================================================== */

      const response =
        await fetch(
          `/api/lecturer/quizzes/${quizId}/questions`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Failed to create question.'
        );
      }

      /* ===================================================
         SUCCESS
      =================================================== */

      setSuccess(
        `${assessmentLabel} question created successfully.`
      );

      setTimeout(() => {
        router.push(
          `/lecturer/dashboard/quizzes/${quizId}/questions`
        );

        router.refresh();
      }, 700);
    } catch (err) {
      console.error(
        'CREATE QUESTION ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while creating the question.'
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loadingQuiz) {
    return (
      <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          <div className="mb-5">
            <Link
              href={`/lecturer/dashboard/quizzes/${quizId}/questions`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-green"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Questions
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">

            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-green" />

            <h2 className="mt-5 text-lg font-bold text-brand-dark">
              Loading assessment...
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Please wait while we load the assessment details.
            </p>

          </div>

        </div>
      </main>
    );
  }

  /* =======================================================
     ERROR WITHOUT QUIZ
  ======================================================= */

  if (!quiz) {
    return (
      <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-5xl">

          <Link
            href="/lecturer/dashboard/quizzes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </Link>

          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-8 text-center">

            <AlertCircle className="mx-auto h-10 w-10 text-red-600" />

            <h1 className="mt-4 text-xl font-bold text-red-900">
              Unable to load assessment
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error ||
                'The requested assessment could not be found.'}
            </p>

          </div>

        </div>
      </main>
    );
  }

  /* =======================================================
     MAIN PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-5xl">

        {/* ==================================================
            BACK
        ================================================== */}

        <div className="mb-5">

          <Link
            href={`/lecturer/dashboard/quizzes/${quizId}/questions`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Questions
          </Link>

        </div>

        {/* ==================================================
            HEADER
        ================================================== */}

        <section
          className={`overflow-hidden rounded-3xl shadow-soft ${
            isExam
              ? 'bg-purple-900'
              : 'bg-brand-green'
          }`}
        >

          <div className="relative p-6 sm:p-8">

            <div className="relative z-10">

              <div className="flex flex-wrap items-center gap-2">

                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                    isExam
                      ? 'bg-purple-400/20 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >

                  {isExam ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <ClipboardList className="h-3.5 w-3.5" />
                  )}

                  {assessmentShortLabel}

                </span>

                {quiz.status && (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold capitalize text-white/80">
                    {quiz.status}
                  </span>
                )}

              </div>

              <h1 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
                Add a New Question
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
                Create a question for this{' '}
                {isExam
                  ? 'examination'
                  : 'quiz or CAT'}
                , configure its answer options
                and set the marks students will
                receive.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">

                {quiz.program?.name && (
                  <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                    {quiz.program.name}
                  </span>
                )}

                {quiz.unit?.code && (
                  <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                    {quiz.unit.code}
                  </span>
                )}

                {quiz.topic?.title && (
                  <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                    {quiz.topic.title}
                  </span>
                )}

                {quiz.lesson?.title && (
                  <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                    {quiz.lesson.title}
                  </span>
                )}

              </div>

            </div>

            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border-[45px] border-brand-gold/10" />

            <div className="pointer-events-none absolute -bottom-32 right-20 h-60 w-60 rounded-full border-[35px] border-white/5" />

          </div>

        </section>

        {/* ==================================================
            ASSESSMENT TYPE NOTICE
        ================================================== */}

        <section className="mt-6">

          <div
            className={`rounded-2xl border p-4 ${
              isExam
                ? 'border-purple-200 bg-purple-50'
                : 'border-blue-200 bg-blue-50'
            }`}
          >

            <div className="flex items-start gap-3">

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isExam
                    ? 'bg-purple-100'
                    : 'bg-blue-100'
                }`}
              >

                {isExam ? (
                  <ShieldCheck className="h-5 w-5 text-purple-700" />
                ) : (
                  <ClipboardList className="h-5 w-5 text-blue-700" />
                )}

              </div>

              <div>

                <p
                  className={`text-sm font-bold ${
                    isExam
                      ? 'text-purple-900'
                      : 'text-blue-900'
                  }`}
                >
                  Adding a question to:{' '}
                  {assessmentLabel}
                </p>

                <p
                  className={`mt-1 text-sm leading-6 ${
                    isExam
                      ? 'text-purple-800'
                      : 'text-blue-800'
                  }`}
                >
                  <strong>
                    {quiz.title}
                  </strong>{' '}
                  is configured as a{' '}
                  {assessmentLabel.toLowerCase()}.
                  This question will automatically
                  belong to that assessment.
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================
            ASSESSMENT SUMMARY
        ================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

            <div className="flex items-center gap-3">

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isExam
                    ? 'bg-purple-100'
                    : 'bg-brand-green/10'
                }`}
              >

                {isExam ? (
                  <ShieldCheck className="h-5 w-5 text-purple-700" />
                ) : (
                  <ClipboardList className="h-5 w-5 text-brand-green" />
                )}

              </div>

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Assessment
                </p>

                <p className="mt-1 text-sm font-bold text-brand-dark">
                  {quiz.title}
                </p>

              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gold/20">

                <BookOpen className="h-5 w-5 text-brand-dark" />

              </div>

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Lesson
                </p>

                <p className="mt-1 text-sm font-bold text-brand-dark">
                  {quiz.lesson?.title ||
                    'Lesson'}
                </p>

              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">

                <ListChecks className="h-5 w-5 text-brand-green" />

              </div>

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Assessment Marks
                </p>

                <p className="mt-1 text-sm font-bold text-brand-dark">
                  {quiz.totalMarks ??
                    0}{' '}
                  marks
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">

            <div className="flex items-start gap-3">

              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>

                <p className="text-sm font-bold text-red-900">
                  Unable to save question
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>

              </div>

            </div>

          </div>
        )}

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {success && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">

            <div className="flex items-center gap-3">

              <CheckCircle2 className="h-5 w-5 text-green-600" />

              <p className="text-sm font-bold text-green-800">
                {success}
              </p>

            </div>

          </div>
        )}

        {/* ==================================================
            FORM
        ================================================== */}

        <form
          onSubmit={handleSubmit}
          className="mt-6"
        >

          {/* =================================================
              QUESTION DETAILS
          ================================================= */}

          <section className="rounded-3xl border border-slate-200 bg-white shadow-soft">

            <div className="border-b border-slate-100 p-6">

              <h2 className="text-lg font-bold text-brand-dark">
                Question Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the question and configure
                how students should answer it.
              </p>

            </div>

            <div className="space-y-6 p-6">

              <div>

                <label
                  htmlFor="questionText"
                  className="text-sm font-bold text-brand-dark"
                >
                  Question Text
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <textarea
                  id="questionText"
                  value={questionText}
                  onChange={(event) =>
                    setQuestionText(
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder={
                    isExam
                      ? 'Enter the examination question students will answer...'
                      : 'Enter the question students will answer...'
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-slate-400 focus:border-brand-green focus:ring-4 focus:ring-brand-green/10"
                  required
                />

                <p className="mt-2 text-xs text-slate-400">
                  Write a clear and specific question.
                </p>

              </div>

              <div className="grid gap-5 md:grid-cols-3">

                <div>

                  <label
                    htmlFor="questionType"
                    className="text-sm font-bold text-brand-dark"
                  >
                    Question Type
                  </label>

                  <select
                    id="questionType"
                    value={questionType}
                    onChange={(event) =>
                      handleQuestionTypeChange(
                        event.target
                          .value as QuestionType
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/10"
                  >

                    <option value="multiple_choice">
                      Multiple Choice
                    </option>

                    <option value="true_false">
                      True / False
                    </option>

                    <option value="short_answer">
                      Short Answer
                    </option>

                    <option value="essay">
                      Essay
                    </option>

                  </select>

                </div>

                <div>

                  <label
                    htmlFor="marks"
                    className="text-sm font-bold text-brand-dark"
                  >
                    Marks
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    id="marks"
                    type="number"
                    min="1"
                    step="1"
                    value={marks}
                    onChange={(event) =>
                      setMarks(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/10"
                    required
                  />

                </div>

                <div>

                  <label
                    htmlFor="questionOrder"
                    className="text-sm font-bold text-brand-dark"
                  >
                    Question Order
                  </label>

                  <input
                    id="questionOrder"
                    type="number"
                    min="1"
                    step="1"
                    value={questionOrder}
                    onChange={(event) =>
                      setQuestionOrder(
                        event.target.value
                      )
                    }
                    placeholder="Auto"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/10"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Leave empty to use the next available order.
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              ANSWER OPTIONS
          ================================================= */}

          {canHaveOptions && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-soft">

              <div className="border-b border-slate-100 p-6">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <h2 className="text-lg font-bold text-brand-dark">
                      Answer Options
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {questionType ===
                      'true_false'
                        ? 'Select whether True or False is the correct answer.'
                        : 'Select the correct answer and arrange the available options.'}
                    </p>

                  </div>

                  {questionType ===
                    'multiple_choice' && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-dark"
                    >
                      <Plus className="h-4 w-4" />
                      Add Option
                    </button>
                  )}

                </div>

              </div>

              <div className="space-y-3 p-6">

                {options.map(
                  (
                    option,
                    index
                  ) => (
                    <div
                      key={option.id}
                      className={`rounded-2xl border p-4 transition ${
                        option.isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >

                      <div className="flex items-start gap-3">

                        <div className="mt-2 text-slate-300">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-brand-green shadow-sm">
                          {String.fromCharCode(
                            65 + index
                          )}
                        </div>

                        <div className="min-w-0 flex-1">

                          <input
                            type="text"
                            value={
                              option.text
                            }
                            onChange={(
                              event
                            ) =>
                              updateOption(
                                option.id,
                                event.target
                                  .value
                              )
                            }
                            disabled={
                              questionType ===
                              'true_false'
                            }
                            placeholder={`Option ${
                              index + 1
                            }`}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-slate-400 focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 disabled:bg-slate-100"
                          />

                          <label className="mt-3 inline-flex cursor-pointer items-center gap-2">

                            <input
                              type="radio"
                              name="correctOption"
                              checked={
                                option.isCorrect
                              }
                              onChange={() =>
                                markCorrect(
                                  option.id
                                )
                              }
                              className="h-4 w-4 accent-brand-green"
                            />

                            <span
                              className={`text-xs font-bold ${
                                option.isCorrect
                                  ? 'text-green-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {option.isCorrect
                                ? 'Correct answer'
                                : 'Mark as correct answer'}
                            </span>

                          </label>

                        </div>

                        {questionType ===
                          'multiple_choice' &&
                          options.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeOption(
                                  option.id
                                )
                              }
                              className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove option"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                      </div>

                    </div>
                  )
                )}

              </div>

              <div className="mx-6 mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">

                <div className="flex items-start gap-3">

                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Answer Configuration
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-900">

                      {questionType ===
                      'true_false'
                        ? 'Select exactly one answer: True or False.'
                        : 'Select exactly one correct answer. Students will see the answer options when taking the assessment.'}

                    </p>

                  </div>

                </div>

              </div>

            </section>
          )}

          {/* =================================================
              WRITTEN ANSWER
          ================================================= */}

          {!objectiveQuestion && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-soft">

              <div className="border-b border-slate-100 p-6">

                <h2 className="text-lg font-bold text-brand-dark">
                  Model Answer
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Provide the expected or model answer for
                  lecturer marking and assessment reference.
                </p>

              </div>

              <div className="p-6">

                <label
                  htmlFor="correctAnswer"
                  className="text-sm font-bold text-brand-dark"
                >
                  Correct / Model Answer

                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <textarea
                  id="correctAnswer"
                  value={correctAnswer}
                  onChange={(event) =>
                    setCorrectAnswer(
                      event.target.value
                    )
                  }
                  rows={6}
                  placeholder="Enter the correct or model answer..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-slate-400 focus:border-brand-green focus:ring-4 focus:ring-brand-green/10"
                />

              </div>

            </section>
          )}

          {/* =================================================
              EXPLANATION
          ================================================= */}

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-soft">

            <div className="border-b border-slate-100 p-6">

              <h2 className="text-lg font-bold text-brand-dark">
                Explanation

                <span className="ml-2 text-xs font-medium text-slate-400">
                  Optional
                </span>
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add an explanation to help students understand
                why the answer is correct.
              </p>

            </div>

            <div className="p-6">

              <textarea
                value={explanation}
                onChange={(event) =>
                  setExplanation(
                    event.target.value
                  )
                }
                rows={5}
                placeholder="Explain the answer or provide additional learning information..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-slate-400 focus:border-brand-green focus:ring-4 focus:ring-brand-green/10"
              />

            </div>

          </section>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

            <Link
              href={`/lecturer/dashboard/quizzes/${quizId}/questions`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-green px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >

              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving Question...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Question
                </>
              )}

            </button>

          </div>

        </form>

        {/* ==================================================
            FOOTER
        ================================================== */}

        <div className="mt-8 rounded-3xl bg-brand-green p-7 shadow-soft">

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
            SMTC Lecturer Portal
          </p>

          <h2 className="mt-2 text-xl font-bold text-white">
            Create meaningful assessments.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            Build clear questions, provide accurate answers
            and explanations, and keep your{' '}
            {assessmentLabel.toLowerCase()}
            organized for students.
          </p>

        </div>

      </div>

    </main>
  );
}