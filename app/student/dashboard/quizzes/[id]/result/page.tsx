'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileQuestion,
  Loader2,
  Trophy,
  XCircle,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type AssessmentType = 'quiz' | 'exam';

type QuestionResult = {
  questionId: number;
  questionText: string;
  questionType: string;
  marks: number;
  marksAwarded: number;
  isCorrect: boolean | null;
  answerText: string | null;
  selectedOptionText: string | null;
  correctOptionText: string | null;
  status?: string;
};

type QuizResult = {
  attemptId: number;
  attemptNumber: number;

  assessmentType: AssessmentType;

  score: number;
  totalMarks: number;
  percentage: number;

  passingScore: number;
  passed: boolean;

  status: string;

  manualGradingRequired: boolean;

  timedOut?: boolean;

  submittedAt?: string;
};

type QuizInfo = {
  id: number;
  title: string;
  assessmentType: AssessmentType;
  showCorrectAnswers?: boolean;
};

type ResultResponse = {
  success: boolean;

  resultsHidden?: boolean;

  message?: string;

  quiz: QuizInfo;

  result: QuizResult;

  questions?: QuestionResult[];
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

function isWrittenQuestion(
  questionType: string
): boolean {
  const type =
    questionType
      .trim()
      .toLowerCase();

  return (
    type === 'short_answer' ||
    type === 'shortanswer' ||
    type === 'essay'
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function QuizResultPage() {
  const params = useParams();

  const searchParams =
    useSearchParams();

  const quizId =
    Number(params.id);

  const attemptId =
    Number(
      searchParams.get(
        'attemptId'
      )
    );

  const [data, setData] =
    useState<ResultResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  /* =======================================================
     LOAD RESULT
  ======================================================= */

  useEffect(() => {
    if (
      !quizId ||
      !attemptId
    ) {
      setError(
        'Invalid assessment or attempt.'
      );

      setLoading(false);

      return;
    }

    void loadResult();
  }, [
    quizId,
    attemptId,
  ]);

  async function loadResult() {
    try {
      setLoading(true);
      setError('');

      const response =
        await fetch(
          `/api/student/quizzes/${quizId}/result?attemptId=${attemptId}`,
          {
            cache: 'no-store',
          }
        );

      const result =
        (await response.json()) as ResultResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            'Failed to load result'
        );
      }

      if (result.quiz) {
        result.quiz.assessmentType =
          normalizeAssessmentType(
            result.quiz.assessmentType
          );
      }

      if (result.result) {
        result.result.assessmentType =
          normalizeAssessmentType(
            result.result.assessmentType
          );
      }

      setData(result);
    } catch (err: unknown) {
      console.error(
        'LOAD RESULT ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load result'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-green-700" />

          <p className="mt-3 text-sm text-gray-500">
            Loading your result...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">

          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 shrink-0" />

            <div>
              <h1 className="font-bold">
                Unable to load result
              </h1>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>

          <Link
            href="/student/dashboard/quizzes"
            className="mt-5 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Assessments
          </Link>

        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  /* =======================================================
     RESULT HIDDEN
  ======================================================= */

  if (data.resultsHidden) {
    const isExam =
      normalizeAssessmentType(
        data.quiz?.assessmentType
      ) === 'exam';

    const assessmentLabel =
      isExam
        ? 'Examination'
        : 'Quiz / CAT';

    return (
      <div className="p-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">

          <Clock className="mx-auto h-12 w-12 text-gray-400" />

          <span className="mt-5 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            {assessmentLabel}
          </span>

          <h1 className="mt-4 text-xl font-bold text-gray-900">
            Result Submitted
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Your {isExam ? 'examination' : 'quiz'} has been
            submitted successfully. The lecturer has
            chosen not to display the result yet.
          </p>

          <Link
            href="/student/dashboard/quizzes"
            className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
          >
            Back to Assessments
          </Link>

        </div>
      </div>
    );
  }

  const result =
    data.result;

  const quiz =
    data.quiz;

  const isExam =
    normalizeAssessmentType(
      result.assessmentType ??
        quiz.assessmentType
    ) === 'exam';

  const assessmentLabel =
    isExam
      ? 'Examination'
      : 'Quiz / CAT';

  const passed =
    Boolean(result.passed);

  const manualGrading =
    Boolean(
      result.manualGradingRequired
    );

  const questions =
    data.questions || [];

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">

      <div className="mx-auto max-w-4xl">

        {/* =================================================
            RESULT CARD
        ================================================= */}

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className={`p-8 text-center md:p-10 ${
              manualGrading
                ? 'bg-green-800'
                : passed
                ? 'bg-green-700'
                : 'bg-gray-800'
            } text-white`}
          >

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15">

              {manualGrading ? (
                <Clock className="h-10 w-10" />
              ) : passed ? (
                <Trophy className="h-10 w-10" />
              ) : (
                <XCircle className="h-10 w-10" />
              )}

            </div>

            <div className="mt-5">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                {assessmentLabel}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold">
              {manualGrading
                ? 'Assessment Submitted'
                : passed
                ? 'Congratulations!'
                : isExam
                ? 'Examination Completed'
                : 'Quiz Completed'}
            </h1>

            <p className="mt-2 text-sm text-white/80">
              {quiz.title}
            </p>

          </div>

          {/* =================================================
              SCORE
          ================================================= */}

          <div className="p-6 md:p-10">

            <div className="text-center">

              <p className="text-sm font-medium text-gray-500">
                {manualGrading
                  ? 'Current Score'
                  : 'Your Score'}
              </p>

              <p className="mt-2 text-5xl font-black text-gray-900">
                {Number(
                  result.percentage || 0
                ).toFixed(2)}
                %
              </p>

              <p className="mt-2 text-sm font-medium text-gray-500">
                {Number(
                  result.score || 0
                )}{' '}
                /{' '}
                {Number(
                  result.totalMarks || 0
                )}{' '}
                marks
              </p>

            </div>

            {/* =================================================
                MANUAL GRADING NOTICE
            ================================================= */}

            {manualGrading && (
              <div className="mt-8 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">

                <div className="flex gap-3">

                  <Clock className="h-6 w-6 shrink-0 text-yellow-700" />

                  <div>

                    <h2 className="font-bold text-yellow-900">
                      Lecturer grading pending
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-yellow-800">
                      This assessment contains written
                      questions such as Short Answer or
                      Essay questions. Your automatically
                      graded score is shown above, but your
                      final result may change after the
                      lecturer completes manual grading.
                    </p>

                  </div>

                </div>
              </div>
            )}

            {/* =================================================
                RESULT INFORMATION
            ================================================= */}

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">

              <ResultCard
                icon={
                  <FileQuestion className="h-5 w-5" />
                }
                label="Attempt"
                value={`#${result.attemptNumber}`}
              />

              <ResultCard
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
                label="Pass Mark"
                value={`${result.passingScore}%`}
              />

              <ResultCard
                icon={
                  <Clock className="h-5 w-5" />
                }
                label="Status"
                value={
                  manualGrading
                    ? 'Pending Grading'
                    : result.status ===
                      'graded'
                    ? 'Graded'
                    : result.status
                }
              />

            </div>

            {/* =================================================
                TIMEOUT
            ================================================= */}

            {result.timedOut && (
              <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">

                <div className="flex gap-3">

                  <Clock className="h-5 w-5 shrink-0 text-orange-700" />

                  <div>
                    <p className="font-semibold text-orange-900">
                      Time expired
                    </p>

                    <p className="mt-1 text-sm text-orange-800">
                      The assessment was automatically
                      submitted when the time limit expired.
                    </p>
                  </div>

                </div>

              </div>
            )}

            {/* =================================================
                PASS / FAIL
            ================================================= */}

            {!manualGrading && (
              <div
                className={`mt-6 rounded-2xl p-5 text-center ${
                  passed
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >

                <div className="flex justify-center">

                  {passed ? (
                    <CheckCircle2 className="h-7 w-7" />
                  ) : (
                    <XCircle className="h-7 w-7" />
                  )}

                </div>

                <p className="mt-2 font-bold">
                  {passed
                    ? 'PASSED'
                    : 'NOT PASSED'}
                </p>

                <p className="mt-1 text-sm">
                  {passed
                    ? `You achieved the required passing score of ${result.passingScore}%.`
                    : `You did not reach the required passing score of ${result.passingScore}%.`}
                </p>

              </div>
            )}

            {/* =================================================
                PENDING FINAL RESULT
            ================================================= */}

            {manualGrading && (
              <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-center text-blue-800">

                <p className="font-bold">
                  Final result pending
                </p>

                <p className="mt-1 text-sm">
                  Please wait for the lecturer to
                  complete grading of the written
                  questions.
                </p>

              </div>
            )}

            {/* =================================================
                QUESTION REVIEW
            ================================================= */}

            {questions.length > 0 && (
              <div className="mt-10">

                <div className="mb-5">

                  <h2 className="text-lg font-bold text-gray-900">
                    Question Review
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Review your answers and marks.
                  </p>

                </div>

                <div className="space-y-4">

                  {questions.map(
                    (
                      question,
                      index
                    ) => {
                      const written =
                        isWrittenQuestion(
                          question.questionType
                        );

                      const pending =
                        written &&
                        question.isCorrect ===
                          null;

                      return (
                        <div
                          key={
                            question.questionId
                          }
                          className="rounded-2xl border border-gray-200 bg-white p-5"
                        >

                          {/* QUESTION HEADER */}

                          <div className="flex items-start justify-between gap-4">

                            <div className="flex gap-3">

                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                                {index + 1}
                              </span>

                              <div>

                                <p className="font-semibold leading-6 text-gray-900">
                                  {question.questionText}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {question.marks}{' '}
                                  {question.marks ===
                                  1
                                    ? 'mark'
                                    : 'marks'}
                                </p>

                              </div>

                            </div>

                            <div className="shrink-0 text-right">

                              <p className="font-bold text-gray-900">
                                {question.marksAwarded}{' '}
                                /{' '}
                                {question.marks}
                              </p>

                              {pending ? (
                                <span className="text-xs font-medium text-yellow-700">
                                  Pending
                                </span>
                              ) : question.isCorrect ===
                                true ? (
                                <span className="text-xs font-medium text-green-700">
                                  Correct
                                </span>
                              ) : question.isCorrect ===
                                false ? (
                                <span className="text-xs font-medium text-red-700">
                                  Incorrect
                                </span>
                              ) : null}

                            </div>

                          </div>

                          {/* STUDENT ANSWER */}

                          <div className="mt-5 rounded-xl bg-gray-50 p-4">

                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                              Your Answer
                            </p>

                            {question.answerText ? (
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                {question.answerText}
                              </p>
                            ) : question.selectedOptionText ? (
                              <p className="mt-2 text-sm font-medium text-gray-800">
                                {question.selectedOptionText}
                              </p>
                            ) : (
                              <p className="mt-2 text-sm italic text-gray-400">
                                No answer submitted
                              </p>
                            )}

                          </div>

                          {/* WRITTEN QUESTION NOTICE */}

                          {pending && (
                            <div className="mt-3 rounded-xl bg-yellow-50 px-4 py-3 text-xs leading-5 text-yellow-800">
                              This question requires
                              lecturer grading. The marks
                              may be updated after manual
                              assessment.
                            </div>
                          )}

                          {/* CORRECT ANSWER */}

                          {data.quiz.showCorrectAnswers &&
                            !written &&
                            question.correctOptionText && (
                              <div className="mt-3 rounded-xl bg-green-50 p-4">

                                <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                                  Correct Answer
                                </p>

                                <p className="mt-2 text-sm font-medium text-green-900">
                                  {
                                    question.correctOptionText
                                  }
                                </p>

                              </div>
                            )}

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            )}

            {/* =================================================
                BACK BUTTON
            ================================================= */}

            <Link
              href="/student/dashboard/quizzes"
              className="mt-8 flex w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
            >
              Back to My Assessments
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   RESULT CARD
========================================================= */

function ResultCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4 text-center">

      <div className="flex justify-center text-green-700">
        {icon}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-900">
        {value}
      </p>

    </div>
  );
}