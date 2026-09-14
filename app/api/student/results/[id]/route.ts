
import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type ResultType = 'assignment' | 'quiz' | 'exam';

type ParsedResultId = {
  type: ResultType;
  id: number;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type QuestionRow = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  marks: number | string | null;
  question_order: number | string | null;
  explanation: string | null;
  correct_answer: string | null;
  answer_id: number | null;
  selected_option_id: number | null;
  answer_text: string | null;
  marks_awarded: number | string | null;
  is_correct: boolean | null;
  lecturer_feedback: string | null;
  graded_at: Date | string | null;
};

type OptionRow = {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean | null;
  option_order: number | string | null;
};

type AssignmentQuestionRow = {
  id: number;
  assignment_id: number;
  question_number: number | string | null;
  question: string;
  marks: number | string | null;
};

type AssignmentAnswerRow = {
  id: number;
  submission_id: number;
  question_id: number;
  answer_text: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size: number | string | null;
  mime_type: string | null;
  marks_awarded: number | string | null;
  lecturer_feedback: string | null;
  graded_at: Date | string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function calculatePercentage(
  obtained: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Number(
    ((obtained / total) * 100).toFixed(2)
  );
}

function calculateGrade(
  percentage: number
): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';

  return 'E';
}

function calculatePassed(
  percentage: number,
  passingScore = 50
): boolean {
  return percentage >= passingScore;
}

function parseResultId(
  value: string
): ParsedResultId | null {
  let decoded: string;

  try {
    decoded = decodeURIComponent(value).trim();
  } catch {
    return null;
  }

  const match = decoded.match(
    /^(assignment|quiz|exam)-(\d+)$/i
  );

  if (!match) {
    return null;
  }

  const rawType =
    match[1].toLowerCase();

  const type: ResultType =
    rawType === 'assignment'
      ? 'assignment'
      : rawType === 'exam'
        ? 'exam'
        : 'quiz';

  const id = Number(match[2]);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return {
    type,
    id,
  };
}

function normalizeStatus(
  value: unknown
): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function isWrittenQuestionType(
  value: unknown
): boolean {
  const type = String(value ?? '')
    .trim()
    .toLowerCase();

  return (
    type === 'short_answer' ||
    type === 'short answer' ||
    type === 'essay' ||
    type === 'long_answer' ||
    type === 'long answer'
  );
}

function isQuestionGraded(
  question: QuestionRow
): boolean {
  /*
   * For manually graded questions, marks_awarded alone
   * is not enough because NULL means not graded while
   * 0 means explicitly graded zero.
   *
   * The grading API uses is_correct as the completion
   * marker for written questions:
   *
   *   NULL  = not graded
   *   false = graded zero
   *   true  = graded positive/partial/full
   */
  if (
    isWrittenQuestionType(
      question.question_type
    )
  ) {
    return (
      question.is_correct !== null ||
      question.marks_awarded !== null
    );
  }

  /*
   * MCQ / True-False are automatically graded.
   * A non-null is_correct means grading has completed.
   */
  return question.is_correct !== null;
}

function normalizeMarks(
  value: unknown
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function toIsoOrNull(
  value: Date | string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

/* =========================================================
   GET /api/student/results/[id]
========================================================= */

export async function GET(
  request: Request,
  context: RouteContext
) {
  void request;

  try {
    /* =======================================================
       AUTHENTICATION
    ======================================================= */

    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Student session has expired.',
        },
        { status: 401 }
      );
    }

    const studentId =
      Number(
        session.applicationId
      );

    if (
      !Number.isInteger(studentId) ||
      studentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid student session.',
        },
        { status: 401 }
      );
    }

    /* =======================================================
       RESULT ID
    ======================================================= */

    const params =
      await context.params;

    const parsed =
      parseResultId(
        params.id
      );

    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid result identifier.',
        },
        { status: 400 }
      );
    }

    /* =======================================================
       ASSIGNMENT RESULT
    ======================================================= */

    if (
      parsed.type === 'assignment'
    ) {
      const assignmentId =
        parsed.id;

      /* =====================================================
         GET LATEST STUDENT SUBMISSION
      ===================================================== */

      const submissionResult =
        await pool.query(
          `
            SELECT
              s.id AS submission_id,

              s.assignment_id,

              s.application_id,

              s.submission_text,

              s.file_name,

              s.file_url,

              s.file_size,

              s.mime_type,

              s.status AS submission_status,

              s.submitted_at,

              s.total_marks,

              s.marks_awarded,

              s.lecturer_feedback,

              s.graded_at,

              s.graded_by,

              a.title AS assignment_title,

              a.description AS assignment_description,

              a.due_date,

              a.status AS assignment_status,

              a.total_marks AS assignment_total_marks,

              l.id AS lesson_id,

              l.title AS lesson_title,

              t.id AS topic_id,

              t.title AS topic_title,

              u.id AS unit_id,

              u.name AS unit_name,

              p.id AS program_id,

              p.name AS program_name,

              p.code AS program_code

            FROM lms_assignment_submissions s

            INNER JOIN lms_assignments a
              ON a.id = s.assignment_id

            INNER JOIN lms_lessons l
              ON l.id = a.lesson_id

            INNER JOIN lms_topics t
              ON t.id = l.topic_id

            INNER JOIN lms_units u
              ON u.id = t.unit_id

            INNER JOIN lms_programs p
              ON p.id = u.program_id

            WHERE s.assignment_id = $1

              AND s.application_id = $2

              AND EXISTS (
                SELECT 1
                FROM lms_enrollments e
                WHERE e.application_id = $2
                  AND e.program_id = p.id
                  AND (
                    e.enrollment_status IS NULL
                    OR LOWER(
                      e.enrollment_status::text
                    ) NOT IN (
                      'cancelled',
                      'dropped'
                    )
                  )
              )

            ORDER BY
              s.id DESC

            LIMIT 1
          `,
          [
            assignmentId,
            studentId,
          ]
        );

      if (
        submissionResult.rows.length ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Assignment result not found.',
          },
          { status: 404 }
        );
      }

      const submission =
        submissionResult.rows[0];

      /* =====================================================
         GET ASSIGNMENT QUESTIONS
      ===================================================== */

      const questionsResult =
        await pool.query<AssignmentQuestionRow>(
          `
            SELECT
              aq.id,

              aq.assignment_id,

              aq.question_number,

              aq.question,

              aq.marks

            FROM lms_assignment_questions aq

            WHERE aq.assignment_id = $1

            ORDER BY
              aq.question_number ASC,
              aq.id ASC
          `,
          [assignmentId]
        );

      /* =====================================================
         GET STUDENT ANSWERS

         We intentionally select all answers and retain
         the latest row for each question.
      ===================================================== */

      const answersResult =
        await pool.query<AssignmentAnswerRow>(
          `
            SELECT
              aa.id,

              aa.submission_id,

              aa.question_id,

              aa.answer_text,

              aa.file_name,

              aa.file_url,

              aa.file_size,

              aa.mime_type,

              aa.marks_awarded,

              aa.lecturer_feedback,

              aa.graded_at

            FROM lms_assignment_answers aa

            WHERE aa.submission_id = $1

            ORDER BY
              aa.question_id ASC,
              aa.id DESC
          `,
          [
            submission.submission_id,
          ]
        );

      /* =====================================================
         MAP LATEST ANSWER BY QUESTION
      ===================================================== */

      const answerMap =
        new Map<
          number,
          AssignmentAnswerRow
        >();

      for (
        const answer
        of answersResult.rows
      ) {
        const questionId =
          Number(
            answer.question_id
          );

        if (
          !answerMap.has(
            questionId
          )
        ) {
          answerMap.set(
            questionId,
            answer
          );
        }
      }

      /* =====================================================
         DETERMINE ASSIGNMENT GRADING STATE
      ===================================================== */

      const assignmentQuestions =
        questionsResult.rows;

      const totalAssignmentQuestions =
        assignmentQuestions.length;

      let gradedAssignmentQuestions = 0;

      for (
        const question
        of assignmentQuestions
      ) {
        const answer =
          answerMap.get(
            Number(question.id)
          );

        if (
          answer &&
          answer.marks_awarded !== null
        ) {
          gradedAssignmentQuestions += 1;
        }
      }

      const assignmentMarksAwarded =
        submission.marks_awarded !==
          null &&
        submission.marks_awarded !==
          undefined;

      const submissionStatus =
        normalizeStatus(
          submission.submission_status
        );

      const assignmentGradingStatus =
        assignmentMarksAwarded ||
        submissionStatus === 'graded'
          ? 'graded'
          : totalAssignmentQuestions > 0 &&
              gradedAssignmentQuestions > 0
            ? 'partially_graded'
            : 'awaiting_grading';

      const assignmentManualGradingRequired =
        !assignmentMarksAwarded;

      /* =====================================================
         BUILD QUESTION RESULTS
      ===================================================== */

      const questions =
        assignmentQuestions.map(
          (question) => {
            const questionId =
              Number(
                question.id
              );

            const answer =
              answerMap.get(
                questionId
              );

            const marks =
              normalizeMarks(
                question.marks
              );

            const marksAwarded =
              answer &&
              answer.marks_awarded !==
                null
                ? normalizeMarks(
                    answer.marks_awarded
                  )
                : 0;

            const questionGraded =
              Boolean(
                answer &&
                answer.marks_awarded !==
                  null
              );

            return {
              id: questionId,

              questionNumber:
                Number(
                  question.question_number
                ),

              question:
                question.question,

              marks,

              marksAwarded,

              graded:
                questionGraded,

              status:
                questionGraded
                  ? 'graded'
                  : 'awaiting_grading',

              answer: answer
                ? {
                    id:
                      Number(
                        answer.id
                      ),

                    answerText:
                      answer.answer_text ||
                      null,

                    fileName:
                      answer.file_name ||
                      null,

                    fileUrl:
                      answer.file_url ||
                      null,

                    fileSize:
                      answer.file_size !==
                      null
                        ? Number(
                            answer.file_size
                          )
                        : null,

                    mimeType:
                      answer.mime_type ||
                      null,

                    lecturerFeedback:
                      answer.lecturer_feedback ||
                      null,

                    gradedAt:
                      toIsoOrNull(
                        answer.graded_at
                      ),
                  }
                : null,
            };
          }
        );

      /* =====================================================
         MARKS
      ===================================================== */

      const totalMarks =
        Number(
          submission.total_marks ??
            submission.assignment_total_marks ??
            0
        );

      const marksObtained =
        assignmentMarksAwarded
          ? normalizeMarks(
              submission.marks_awarded
            )
          : questions.reduce(
              (
                total: number,
                question
              ) =>
                total +
                normalizeMarks(
                  question.marksAwarded
                ),
              0
            );

      const finalGraded =
        assignmentGradingStatus ===
        'graded';

      const percentage =
        finalGraded
          ? calculatePercentage(
              marksObtained,
              totalMarks
            )
          : null;

      const grade =
        percentage !== null
          ? calculateGrade(
              percentage
            )
          : null;

      const passed =
        percentage !== null
          ? calculatePassed(
              percentage
            )
          : null;

      /* =====================================================
         RESPONSE
      ===================================================== */

      return NextResponse.json(
        {
          success: true,

          result: {
            id:
              `assignment-${assignmentId}`,

            type: 'assignment',

            sourceId:
              assignmentId,

            submissionId:
              Number(
                submission.submission_id
              ),

            title:
              submission.assignment_title ||
              'Assignment',

            description:
              submission.assignment_description ||
              null,

            status:
              finalGraded
                ? 'graded'
                : submission.submission_status,

            gradingStatus:
              assignmentGradingStatus,

            manualGradingRequired:
              assignmentManualGradingRequired,

            finalized:
              finalGraded,

            provisional:
              !finalGraded,

            marksObtained,

            totalMarks,

            percentage,

            grade,

            passed,

            passingScore: 50,

            submittedAt:
              toIsoOrNull(
                submission.submitted_at
              ),

            gradedAt:
              toIsoOrNull(
                submission.graded_at
              ),

            dueDate:
              toIsoOrNull(
                submission.due_date
              ),

            feedback:
              submission.lecturer_feedback ||
              null,

            submission: {
              submissionText:
                submission.submission_text ||
                null,

              fileName:
                submission.file_name ||
                null,

              fileUrl:
                submission.file_url ||
                null,

              fileSize:
                submission.file_size !==
                null
                  ? Number(
                      submission.file_size
                    )
                  : null,

              mimeType:
                submission.mime_type ||
                null,
            },

            program: {
              id:
                Number(
                  submission.program_id
                ),

              name:
                submission.program_name ||
                'Program',

              code:
                submission.program_code ||
                null,
            },

            unit: {
              id:
                submission.unit_id !==
                null
                  ? Number(
                      submission.unit_id
                    )
                  : null,

              name:
                submission.unit_name ||
                null,
            },

            topic: {
              id:
                submission.topic_id !==
                null
                  ? Number(
                      submission.topic_id
                    )
                  : null,

              title:
                submission.topic_title ||
                null,
            },

            lesson: {
              id:
                submission.lesson_id !==
                null
                  ? Number(
                      submission.lesson_id
                    )
                  : null,

              title:
                submission.lesson_title ||
                null,
            },

            grading: {
              totalQuestions:
                totalAssignmentQuestions,

              gradedQuestions:
                gradedAssignmentQuestions,

              pendingQuestions:
                Math.max(
                  totalAssignmentQuestions -
                    gradedAssignmentQuestions,
                  0
                ),
            },

            questions,
          },
        },
        {
          status: 200,

          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate, proxy-revalidate',

            Pragma: 'no-cache',

            Expires: '0',
          },
        }
      );
    }

    /* =======================================================
       QUIZ / FINAL EXAM RESULT

       The ID is the ATTEMPT ID.
    ======================================================= */

    const attemptId =
      parsed.id;

    /* =====================================================
       GET ATTEMPT + QUIZ + COURSE CONTEXT
    ===================================================== */

    const attemptResult =
      await pool.query(
        `
          SELECT
            qa.id AS attempt_id,

            qa.quiz_id,

            qa.student_id,

            qa.attempt_number,

            qa.started_at,

            qa.submitted_at,

            qa.score,

            qa.total_marks,

            qa.percentage,

            qa.status AS attempt_status,

            q.title AS quiz_title,

            q.description AS quiz_description,

            q.instructions,

            q.total_marks AS quiz_total_marks,

            q.time_limit_minutes,

            q.attempts_allowed,

            q.passing_score,

            q.show_results,

            q.show_correct_answers,

            q.shuffle_questions,

            q.shuffle_options,

            q.assessment_type,

            q.status AS quiz_status,

            l.id AS lesson_id,

            l.title AS lesson_title,

            t.id AS topic_id,

            t.title AS topic_title,

            u.id AS unit_id,

            u.name AS unit_name,

            p.id AS program_id,

            p.name AS program_name,

            p.code AS program_code

          FROM lms_quiz_attempts qa

          INNER JOIN lms_quizzes q
            ON q.id = qa.quiz_id

          INNER JOIN lms_lessons l
            ON l.id = q.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_programs p
            ON p.id = u.program_id

          WHERE qa.id = $1

            AND qa.student_id = $2

            AND EXISTS (
              SELECT 1
              FROM lms_enrollments e
              WHERE e.application_id = $2
                AND e.program_id = p.id
                AND (
                  e.enrollment_status IS NULL
                  OR LOWER(
                    e.enrollment_status::text
                  ) NOT IN (
                    'cancelled',
                    'dropped'
                  )
                )
            )

          LIMIT 1
        `,
        [
          attemptId,
          studentId,
        ]
      );

    if (
      attemptResult.rows.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Quiz or examination result not found.',
        },
        { status: 404 }
      );
    }

    const attempt =
      attemptResult.rows[0];

    /* =====================================================
       CHECK RESULT STATUS
    ===================================================== */

    const attemptStatus =
      normalizeStatus(
        attempt.attempt_status
      );

    if (
      attemptStatus ===
      'in_progress'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This assessment has not been submitted yet.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       DETERMINE ASSESSMENT TYPE

       Prefer the database assessment_type.

       This is important because a Final Examination
       must remain "exam" even if its title happens to
       contain other wording.
    ===================================================== */

    const databaseAssessmentType =
      normalizeStatus(
        attempt.assessment_type
      );

    let resultType: ResultType;

    if (
      databaseAssessmentType ===
      'exam'
    ) {
      resultType = 'exam';
    } else if (
      databaseAssessmentType ===
      'quiz'
    ) {
      resultType = 'quiz';
    } else {
      /*
       * Safe fallback for older records that may not
       * have assessment_type populated.
       */
      const quizTitle =
        String(
          attempt.quiz_title ||
            'Quiz'
        ).toLowerCase();

      const looksLikeExam =
        quizTitle.includes('exam') ||
        quizTitle.includes(
          'examination'
        ) ||
        quizTitle.includes(
          'end term'
        ) ||
        quizTitle.includes(
          'final'
        );

      resultType =
        looksLikeExam
          ? 'exam'
          : parsed.type === 'exam'
            ? 'exam'
            : 'quiz';
    }

    const quizTitle =
      String(
        attempt.quiz_title ||
          (resultType === 'exam'
            ? 'Final Examination'
            : 'Quiz')
      );

    /* =====================================================
       RESULT VISIBILITY
    ===================================================== */

    const showResults =
      attempt.show_results !==
      false;

    const showCorrectAnswers =
      attempt.show_correct_answers ===
      true;

    /* =====================================================
       LOAD QUESTIONS

       We use LEFT JOIN LATERAL to select exactly one
       answer row for each attempt/question.

       This protects the result page from duplicate
       legacy answer rows.
    ===================================================== */

    let questionRows:
      QuestionRow[] = [];

    let optionRows:
      OptionRow[] = [];

    if (showResults) {
      const questionsResult =
        await pool.query<QuestionRow>(
          `
            SELECT
              qq.id,

              qq.quiz_id,

              qq.question_text,

              qq.question_type,

              qq.marks,

              qq.question_order,

              qq.explanation,

              qq.correct_answer,

              answer_row.answer_id,

              answer_row.selected_option_id,

              answer_row.answer_text,

              answer_row.marks_awarded,

              answer_row.is_correct,

              answer_row.lecturer_feedback,

              answer_row.graded_at

            FROM lms_quiz_questions qq

            LEFT JOIN LATERAL (
              SELECT
                qa.id AS answer_id,

                qa.selected_option_id,

                qa.answer_text,

                qa.marks_awarded,

                qa.is_correct,

                qa.lecturer_feedback,

                qa.graded_at

              FROM lms_quiz_answers qa

              WHERE qa.question_id = qq.id

                AND qa.attempt_id = $1

              ORDER BY
                qa.id ASC

              LIMIT 1
            ) answer_row
              ON TRUE

            WHERE qq.quiz_id = $2

            ORDER BY
              qq.question_order ASC,
              qq.id ASC
          `,
          [
            attemptId,
            attempt.quiz_id,
          ]
        );

      questionRows =
        questionsResult.rows;

      const optionsResult =
        await pool.query<OptionRow>(
          `
            SELECT
              qo.id,

              qo.question_id,

              qo.option_text,

              qo.is_correct,

              qo.option_order

            FROM lms_quiz_options qo

            INNER JOIN lms_quiz_questions qq
              ON qq.id = qo.question_id

            WHERE qq.quiz_id = $1

            ORDER BY
              qo.question_id ASC,
              qo.option_order ASC,
              qo.id ASC
          `,
          [
            attempt.quiz_id,
          ]
        );

      optionRows =
        optionsResult.rows;
    }

    /* =====================================================
       DETERMINE GRADING STATE

       Written questions:
         short_answer
         essay
         long_answer

       These require lecturer marking.

       MCQ / True-False are automatically graded.
    ===================================================== */

    const writtenQuestions =
      questionRows.filter(
        (question) =>
          isWrittenQuestionType(
            question.question_type
          )
      );

    const autoGradedQuestions =
      questionRows.filter(
        (question) =>
          !isWrittenQuestionType(
            question.question_type
          )
      );

    const gradedWrittenQuestions =
      writtenQuestions.filter(
        (question) =>
          isQuestionGraded(
            question
          )
      );

    const pendingWrittenQuestions =
      writtenQuestions.filter(
        (question) =>
          !isQuestionGraded(
            question
          )
      );

    const gradedAutoQuestions =
      autoGradedQuestions.filter(
        (question) =>
          isQuestionGraded(
            question
          )
      );

    const pendingAutoQuestions =
      autoGradedQuestions.filter(
        (question) =>
          !isQuestionGraded(
            question
          )
      );

    const manualGradingRequired =
      pendingWrittenQuestions.length >
      0;

    const totalQuestions =
      questionRows.length;

    const gradedQuestions =
      gradedWrittenQuestions.length +
      gradedAutoQuestions.length;

    let gradingStatus:
      | 'not_required'
      | 'awaiting_grading'
      | 'partially_graded'
      | 'graded';

    if (
      writtenQuestions.length === 0
    ) {
      gradingStatus =
        pendingAutoQuestions.length ===
        0
          ? 'not_required'
          : 'awaiting_grading';
    } else if (
      gradedWrittenQuestions.length ===
      0
    ) {
      gradingStatus =
        'awaiting_grading';
    } else if (
      pendingWrittenQuestions.length >
      0
    ) {
      gradingStatus =
        'partially_graded';
    } else {
      gradingStatus =
        'graded';
    }

    /*
     * The batch grading API changes the attempt status
     * to "graded" only after all written questions are
     * complete.
     *
     * We therefore require BOTH:
     *   1. all written questions graded
     *   2. attempt status = graded
     *
     * before treating the final result as finalized.
     */
    const attemptIsGraded =
      attemptStatus ===
      'graded';

    const finalized =
      gradingStatus ===
        'graded' &&
      attemptIsGraded;

    const provisional =
      !finalized;

    /* =====================================================
       SCORE
    ===================================================== */

    const storedScore =
      Number(
        attempt.score ?? 0
      );

    const totalMarks =
      Number(
        attempt.total_marks ??
          attempt.quiz_total_marks ??
          0
      );

    /*
     * When grading is incomplete, expose the currently
     * awarded marks as a provisional score.
     *
     * When grading is complete, use the final stored score.
     */
    let displayedScore =
      storedScore;

    if (
      !finalized &&
      showResults
    ) {
      displayedScore =
        questionRows.reduce(
          (
            total: number,
            question
          ) =>
            total +
            normalizeMarks(
              question.marks_awarded
            ),
          0
        );
    }

    const percentage =
      finalized
        ? calculatePercentage(
            displayedScore,
            totalMarks
          )
        : null;

    const passingScore =
      attempt.passing_score !==
      null
        ? Number(
            attempt.passing_score
          )
        : 50;

    const grade =
      finalized
        ? calculateGrade(
            percentage ?? 0
          )
        : null;

    const passed =
      finalized
        ? calculatePassed(
            percentage ?? 0,
            passingScore
          )
        : null;

    /* =====================================================
       BUILD BASE RESPONSE
    ===================================================== */

    const result: Record<
      string,
      unknown
    > = {
      id:
        `${resultType}-${attemptId}`,

      type:
        resultType,

      sourceId:
        Number(attemptId),

      quizId:
        Number(
          attempt.quiz_id
        ),

      attemptId:
        Number(
          attempt.attempt_id
        ),

      attemptNumber:
        Number(
          attempt.attempt_number
        ),

      title:
        quizTitle,

      description:
        attempt.quiz_description ||
        null,

      instructions:
        attempt.instructions ||
        null,

      assessmentType:
        resultType,

      status:
        finalized
          ? 'graded'
          : attempt.attempt_status,

      gradingStatus,

      manualGradingRequired,

      finalized,

      provisional,

      showResults,

      showCorrectAnswers,

      submittedAt:
        toIsoOrNull(
          attempt.submitted_at
        ),

      startedAt:
        toIsoOrNull(
          attempt.started_at
        ),

      program: {
        id:
          Number(
            attempt.program_id
          ),

        name:
          attempt.program_name ||
          'Program',

        code:
          attempt.program_code ||
          null,
      },

      unit: {
        id:
          attempt.unit_id !== null
            ? Number(
                attempt.unit_id
              )
            : null,

        name:
          attempt.unit_name ||
          null,
      },

      topic: {
        id:
          attempt.topic_id !== null
            ? Number(
                attempt.topic_id
              )
            : null,

        title:
          attempt.topic_title ||
          null,
      },

      lesson: {
        id:
          attempt.lesson_id !== null
            ? Number(
                attempt.lesson_id
              )
            : null,

        title:
          attempt.lesson_title ||
          null,
      },

      grading: {
        totalQuestions,

        gradedQuestions,

        pendingQuestions:
          Math.max(
            totalQuestions -
              gradedQuestions,
            0
          ),

        writtenQuestions:
          writtenQuestions.length,

        gradedWrittenQuestions:
          gradedWrittenQuestions.length,

        pendingWrittenQuestions:
          pendingWrittenQuestions.length,

        autoGradedQuestions:
          autoGradedQuestions.length,

        gradedAutoQuestions:
          gradedAutoQuestions.length,

        pendingAutoQuestions:
          pendingAutoQuestions.length,
      },
    };

    /* =====================================================
       ADD SCORE INFORMATION

       When results are hidden, do not expose score,
       percentage, grade, pass/fail or marks.
    ===================================================== */

    if (showResults) {
      result.marksObtained =
        displayedScore;

      result.totalMarks =
        totalMarks;

      result.percentage =
        percentage;

      result.grade =
        grade;

      result.passed =
        passed;

      result.passingScore =
        passingScore;
    }

    /* =====================================================
       BUILD QUESTION RESULTS
    ===================================================== */

    if (showResults) {
      /* ===================================================
         GROUP OPTIONS
      =================================================== */

      const optionsMap =
        new Map<
          number,
          Array<{
            id: number;
            text: string;
            order: number;
            isCorrect?: boolean;
          }>
        >();

      for (
        const option
        of optionRows
      ) {
        const questionId =
          Number(
            option.question_id
          );

        if (
          !optionsMap.has(
            questionId
          )
        ) {
          optionsMap.set(
            questionId,
            []
          );
        }

        const mappedOption: {
          id: number;
          text: string;
          order: number;
          isCorrect?: boolean;
        } = {
          id:
            Number(
              option.id
            ),

          text:
            option.option_text,

          order:
            Number(
              option.option_order
            ),
        };

        /*
         * NEVER expose correctness when the assessment
         * has disabled correct-answer visibility.
         */
        if (
          showCorrectAnswers
        ) {
          mappedOption.isCorrect =
            Boolean(
              option.is_correct
            );
        }

        optionsMap
          .get(questionId)!
          .push(
            mappedOption
          );
      }

      /* ===================================================
         BUILD QUESTIONS
      =================================================== */

      const questions =
        questionRows.map(
          (question) => {
            const questionId =
              Number(
                question.id
              );

            const written =
              isWrittenQuestionType(
                question.question_type
              );

            const graded =
              isQuestionGraded(
                question
              );

            const marks =
              normalizeMarks(
                question.marks
              );

            /*
             * Important:
             * NULL means no mark has been awarded yet.
             * It must not automatically become "graded 0".
             */
            const marksAwarded =
              question.marks_awarded !==
                null &&
              question.marks_awarded !==
                undefined
                ? normalizeMarks(
                    question.marks_awarded
                  )
                : 0;

            let questionStatus:
              | 'graded'
              | 'awaiting_grading'
              | 'correct'
              | 'incorrect';

            if (written) {
              questionStatus =
                graded
                  ? 'graded'
                  : 'awaiting_grading';
            } else if (
              question.is_correct ===
              true
            ) {
              questionStatus =
                'correct';
            } else if (
              question.is_correct ===
              false
            ) {
              questionStatus =
                'incorrect';
            } else {
              questionStatus =
                'awaiting_grading';
            }

            const questionResult:
              Record<
                string,
                unknown
              > = {
                id:
                  questionId,

                questionNumber:
                  Number(
                    question.question_order
                  ),

                question:
                  question.question_text,

                questionType:
                  question.question_type,

                marks,

                marksAwarded,

                graded,

                status:
                  questionStatus,

                selectedOptionId:
                  question.selected_option_id !==
                  null
                    ? Number(
                        question.selected_option_id
                      )
                    : null,

                answerText:
                  question.answer_text ||
                  null,

                /*
                 * isCorrect remains useful for automatic
                 * questions. For written questions it is
                 * also used internally by the grading
                 * workflow, but the frontend should rely
                 * on status/graded for marking state.
                 */
                isCorrect:
                  question.is_correct !==
                  null
                    ? Boolean(
                        question.is_correct
                      )
                    : null,

                lecturerFeedback:
                  question.lecturer_feedback ||
                  null,

                gradedAt:
                  toIsoOrNull(
                    question.graded_at
                  ),

                options:
                  optionsMap.get(
                    questionId
                  ) || [],
              };

            /* =================================================
               CORRECT ANSWER DATA

               Only expose when explicitly enabled.
            ================================================= */

            if (
              showCorrectAnswers
            ) {
              questionResult.explanation =
                question.explanation ||
                null;

              /*
               * For True/False and other question types,
               * correct_answer may contain the answer even
               * when there is no option row.
               */
              questionResult.correctAnswer =
                question.correct_answer ??
                null;

              const correctOption =
                optionRows.find(
                  (option) =>
                    Number(
                      option.question_id
                    ) ===
                      questionId &&
                    option.is_correct ===
                      true
                );

              questionResult.correctOptionText =
                correctOption
                  ?.option_text ||
                null;
            }

            return questionResult;
          }
        );

      result.questions =
        questions;
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        result,
      },
      {
        status: 200,

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',

          Pragma: 'no-cache',

          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error(
      'STUDENT RESULT DETAIL API ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to load this result at the moment.',
      },
      { status: 500 }
    );
  }
}

