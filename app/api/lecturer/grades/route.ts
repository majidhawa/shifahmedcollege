import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
TYPES
========================================================= */

type GradeRow = {
  id: number;
  student_id: number;
  student_name: string | null;
  admission_number: string | null;
  program_name: string | null;
  unit_name: string | null;
  unit_code: string | null;
  assessment_name: string | null;
  assessment_type: string | null;
  score: number | string | null;
  total_marks: number | string | null;
  percentage: number | string | null;
  passing_score: number | string | null;
  grade: string | null;
  grade_point: number | string | null;
  status: string | null;
  submitted_at: string | Date | null;
};

type NormalizedGrade = {
  id: number;
  studentId: number;
  studentName: string;
  admissionNumber: string;
  programName: string;
  unitName: string;
  unitCode: string;
  assessmentName: string;
  assessmentType: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  status: string;
  submittedAt: string | null;
};

/* =========================================================
HELPERS
========================================================= */

function toNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

/* =========================================================
GRADE CALCULATION
========================================================= */

function calculateGrade(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 75) return 'A-';
  if (percentage >= 70) return 'B+';
  if (percentage >= 65) return 'B';
  if (percentage >= 60) return 'B-';
  if (percentage >= 55) return 'C+';
  if (percentage >= 50) return 'C';
  if (percentage >= 45) return 'C-';
  if (percentage >= 40) return 'D+';
  if (percentage >= 35) return 'D';
  if (percentage >= 30) return 'D-';

  return 'E';
}

function calculateGradePoint(percentage: number): number {
  if (percentage >= 80) return 4.0;
  if (percentage >= 75) return 3.7;
  if (percentage >= 70) return 3.3;
  if (percentage >= 65) return 3.0;
  if (percentage >= 60) return 2.7;
  if (percentage >= 55) return 2.3;
  if (percentage >= 50) return 2.0;
  if (percentage >= 45) return 1.7;
  if (percentage >= 40) return 1.3;
  if (percentage >= 35) return 1.0;
  if (percentage >= 30) return 0.7;

  return 0.0;
}

/* =========================================================
STATUS NORMALIZATION
========================================================= */

function normalizeStatus(status: unknown): string {
  const value = String(status ?? '')
    .trim()
    .toLowerCase();

  if (value === 'graded') {
    return 'Graded';
  }

  if (
    value === 'submitted' ||
    value === 'pending'
  ) {
    return 'Pending Grading';
  }

  if (value === 'passed') {
    return 'Passed';
  }

  if (value === 'failed') {
    return 'Failed';
  }

  return value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : 'Pending Grading';
}

/* =========================================================
ASSESSMENT TYPE NORMALIZATION
========================================================= */

function normalizeAssessmentType(
  assessmentType: unknown
): string {
  const value = String(assessmentType ?? '')
    .trim()
    .toLowerCase();

  if (value === 'exam') {
    return 'Final Examination';
  }

  if (value === 'quiz') {
    return 'CAT';
  }

  if (value === 'assignment') {
    return 'Assignment';
  }

  return value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : 'Assessment';
}

/* =========================================================
PERCENTAGE CALCULATION
========================================================= */

function calculatePercentage(
  score: number,
  totalMarks: number,
  storedPercentage: unknown
): number {
  const storedPercentageNumber =
    Number(storedPercentage);

  /*
    Prefer the stored percentage when it is valid.
    Otherwise calculate it from score / total marks.
  */

  if (
    Number.isFinite(
      storedPercentageNumber
    )
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        Number(
          storedPercentageNumber.toFixed(2)
        )
      )
    );
  }

  if (totalMarks <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Number(
        (
          (score / totalMarks) *
          100
        ).toFixed(2)
      )
    )
  );
}

/* =========================================================
FINALIZED STATUS
========================================================= */

function isFinalizedStatus(
  status: string
): boolean {
  const value = status
    .trim()
    .toLowerCase();

  return (
    value === 'graded' ||
    value === 'passed' ||
    value === 'failed'
  );
}

/* =========================================================
GET LECTURER GRADES

GET /api/lecturer/grades

Returns:

- Quiz/CAT results
- Final Examination results
- Assignment results
- Summary statistics

Only results belonging to programs assigned to the
authenticated lecturer are returned.
========================================================= */

export async function GET() {
  const client = await pool.connect();

  try {
    /* =====================================================
    1. AUTHENTICATE LECTURER
    ===================================================== */

    const lecturer = await requireLecturer();

    /*
      requireLecturer() may return null when there is
      no valid lecturer session.

      We MUST check this before accessing lecturer.id.
    */

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized. Lecturer authentication required.',
          grades: [],
          summary: {
            totalStudents: 0,
            totalAssessments: 0,
            totalGraded: 0,
            averageScore: 0,
            passRate: 0,
          },
        },
        {
          status: 401,
        }
      );
    }

    const lecturerId = Number(
      lecturer.id
    );

    if (
      !Number.isInteger(lecturerId) ||
      lecturerId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lecturer session.',
          grades: [],
          summary: {
            totalStudents: 0,
            totalAssessments: 0,
            totalGraded: 0,
            averageScore: 0,
            passRate: 0,
          },
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
    2. QUIZ / CAT / FINAL EXAMINATION RESULTS
    ===================================================== */

    /*
      Curriculum relationship:

      lms_quiz_attempts
          ↓ quiz_id
      lms_quizzes
          ↓ lesson_id
      lms_lessons
          ↓ topic_id
      lms_topics
          ↓ unit_id
      lms_units
          ↓ program_id
      lms_programs

      Lecturer access is checked through:

      lms_lecturer_programs
    */

    const quizResult =
      await client.query<GradeRow>(
        `
        SELECT DISTINCT ON (qa.id)

          qa.id,

          qa.student_id,

          CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          ) AS student_name,

          a.admission_number,

          p.name AS program_name,

          u.name AS unit_name,

          u.code AS unit_code,

          q.title AS assessment_name,

          q.assessment_type,

          COALESCE(
            qa.score,
            0
          ) AS score,

          COALESCE(
            qa.total_marks,
            0
          ) AS total_marks,

          CASE
            WHEN COALESCE(
              qa.total_marks,
              0
            ) > 0
            THEN ROUND(
              (
                COALESCE(
                  qa.score,
                  0
                )::numeric
                /
                qa.total_marks::numeric
              ) * 100,
              2
            )
            ELSE 0
          END AS percentage,

          COALESCE(
            q.passing_score,
            50
          ) AS passing_score,

          NULL::text AS grade,

          NULL::numeric AS grade_point,

          COALESCE(
            qa.status,
            'submitted'
          ) AS status,

          qa.submitted_at

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

        LEFT JOIN applications a
          ON a.id = qa.student_id

        WHERE
          qa.submitted_at IS NOT NULL

          AND EXISTS (
            SELECT 1
            FROM lms_lecturer_programs lp
            WHERE
              lp.program_id = p.id
              AND lp.lecturer_id = $1
          )

        ORDER BY
          qa.id,
          qa.submitted_at DESC
        `,
        [lecturerId]
      );

    /* =====================================================
    3. ASSIGNMENT RESULTS
    ===================================================== */

    const assignmentResult =
      await client.query<GradeRow>(
        `
        SELECT

          s.id,

          s.application_id AS student_id,

          CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          ) AS student_name,

          a.admission_number,

          p.name AS program_name,

          u.name AS unit_name,

          u.code AS unit_code,

          ass.title AS assessment_name,

          'Assignment' AS assessment_type,

          COALESCE(
            s.marks_awarded,
            0
          ) AS score,

          COALESCE(
            s.total_marks,
            ass.total_marks,
            0
          ) AS total_marks,

          CASE
            WHEN COALESCE(
              s.total_marks,
              ass.total_marks,
              0
            ) > 0

            THEN ROUND(
              (
                COALESCE(
                  s.marks_awarded,
                  0
                )::numeric
                /
                COALESCE(
                  s.total_marks,
                  ass.total_marks,
                  1
                )::numeric
              ) * 100,
              2
            )

            ELSE 0
          END AS percentage,

          50 AS passing_score,

          NULL::text AS grade,

          NULL::numeric AS grade_point,

          CASE
            WHEN
              s.status = 'graded'
              OR s.graded_at IS NOT NULL
            THEN 'graded'

            ELSE 'submitted'
          END AS status,

          s.submitted_at

        FROM lms_assignment_submissions s

        INNER JOIN lms_assignments ass
          ON ass.id = s.assignment_id

        INNER JOIN lms_lessons l
          ON l.id = ass.lesson_id

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        INNER JOIN lms_programs p
          ON p.id = u.program_id

        INNER JOIN applications a
          ON a.id = s.application_id

        WHERE
          s.submitted_at IS NOT NULL

          AND EXISTS (
            SELECT 1
            FROM lms_lecturer_programs lp
            WHERE
              lp.program_id = p.id
              AND lp.lecturer_id = $1
          )

        ORDER BY
          s.submitted_at DESC,
          s.id DESC
        `,
        [lecturerId]
      );

    /* =====================================================
    4. NORMALIZE QUIZ RESULTS
    ===================================================== */

    const quizGrades: NormalizedGrade[] =
      quizResult.rows.map(
        (
          row: GradeRow
        ): NormalizedGrade => {
          const score =
            toNumber(row.score);

          const totalMarks =
            toNumber(
              row.total_marks
            );

          const percentage =
            calculatePercentage(
              score,
              totalMarks,
              row.percentage
            );

          const passingScore =
            Math.max(
              0,
              Math.min(
                100,
                toNumber(
                  row.passing_score
                )
              )
            );

          const rawStatus =
            String(
              row.status ??
                'submitted'
            )
              .trim()
              .toLowerCase();

          const isGraded =
            rawStatus === 'graded';

          let finalStatus: string;

          if (!isGraded) {
            finalStatus =
              'Pending Grading';
          } else if (
            percentage >=
            passingScore
          ) {
            finalStatus =
              'Passed';
          } else {
            finalStatus =
              'Failed';
          }

          return {
            id: Number(row.id),

            studentId:
              Number(
                row.student_id
              ) || 0,

            studentName:
              row.student_name ||
              'Unknown Student',

            admissionNumber:
              row.admission_number ||
              '',

            programName:
              row.program_name ||
              'Unknown Program',

            unitName:
              row.unit_name ||
              'Unknown Unit',

            unitCode:
              row.unit_code ||
              '',

            assessmentName:
              row.assessment_name ||
              'Assessment',

            assessmentType:
              normalizeAssessmentType(
                row.assessment_type
              ),

            score,

            totalMarks,

            percentage,

            grade:
              isGraded
                ? calculateGrade(
                    percentage
                  )
                : '-',

            gradePoint:
              isGraded
                ? calculateGradePoint(
                    percentage
                  )
                : 0,

            status:
              finalStatus,

            submittedAt:
              row.submitted_at
                ? new Date(
                    row.submitted_at
                  ).toISOString()
                : null,
          };
        }
      );

    /* =====================================================
    5. NORMALIZE ASSIGNMENT RESULTS
    ===================================================== */

    const assignmentGrades: NormalizedGrade[] =
      assignmentResult.rows.map(
        (
          row: GradeRow
        ): NormalizedGrade => {
          const score =
            toNumber(row.score);

          const totalMarks =
            toNumber(
              row.total_marks
            );

          const percentage =
            calculatePercentage(
              score,
              totalMarks,
              row.percentage
            );

          const passingScore =
            toNumber(
              row.passing_score
            ) || 50;

          const rawStatus =
            String(
              row.status ?? ''
            )
              .trim()
              .toLowerCase();

          const isGraded =
            rawStatus === 'graded' ||
            rawStatus === 'passed' ||
            rawStatus === 'failed';

          let finalStatus: string;

          if (!isGraded) {
            finalStatus =
              'Pending Grading';
          } else if (
            percentage >=
            passingScore
          ) {
            finalStatus =
              'Passed';
          } else {
            finalStatus =
              'Failed';
          }

          return {
            id: Number(row.id),

            studentId:
              Number(
                row.student_id
              ) || 0,

            studentName:
              row.student_name ||
              'Unknown Student',

            admissionNumber:
              row.admission_number ||
              '',

            programName:
              row.program_name ||
              'Unknown Program',

            unitName:
              row.unit_name ||
              'Unknown Unit',

            unitCode:
              row.unit_code ||
              '',

            assessmentName:
              row.assessment_name ||
              'Assignment',

            assessmentType:
              'Assignment',

            score,

            totalMarks,

            percentage,

            grade:
              isGraded
                ? calculateGrade(
                    percentage
                  )
                : '-',

            gradePoint:
              isGraded
                ? calculateGradePoint(
                    percentage
                  )
                : 0,

            status:
              finalStatus,

            submittedAt:
              row.submitted_at
                ? new Date(
                    row.submitted_at
                  ).toISOString()
                : null,
          };
        }
      );

    /* =====================================================
    6. COMBINE AND SORT RESULTS
    ===================================================== */

    const grades: NormalizedGrade[] = [
      ...quizGrades,
      ...assignmentGrades,
    ].sort(
      (
        first: NormalizedGrade,
        second: NormalizedGrade
      ) => {
        const firstTime =
          first.submittedAt
            ? new Date(
                first.submittedAt
              ).getTime()
            : 0;

        const secondTime =
          second.submittedAt
            ? new Date(
                second.submittedAt
              ).getTime()
            : 0;

        return (
          secondTime -
          firstTime
        );
      }
    );

    /* =====================================================
    7. SUMMARY STATISTICS
    ===================================================== */

    const finalizedGrades =
      grades.filter(
        (
          grade: NormalizedGrade
        ) =>
          isFinalizedStatus(
            grade.status
          )
      );

    /* -----------------------------------------------------
       UNIQUE STUDENTS
    ----------------------------------------------------- */

    const studentIds =
      new Set<number>();

    for (
      const grade of grades
    ) {
      if (
        grade.studentId > 0
      ) {
        studentIds.add(
          grade.studentId
        );
      }
    }

    const totalStudents =
      studentIds.size;

    /* -----------------------------------------------------
       TOTAL RESULTS
    ----------------------------------------------------- */

    const totalAssessments =
      grades.length;

    /* -----------------------------------------------------
       TOTAL GRADED
    ----------------------------------------------------- */

    const totalGraded =
      finalizedGrades.length;

    /* -----------------------------------------------------
       AVERAGE SCORE
    ----------------------------------------------------- */

    const averageScore =
      totalGraded > 0
        ? finalizedGrades.reduce(
            (
              total: number,
              grade: NormalizedGrade
            ) =>
              total +
              grade.percentage,
            0
          ) / totalGraded
        : 0;

    /* -----------------------------------------------------
       PASSED
    ----------------------------------------------------- */

    const passed =
      finalizedGrades.filter(
        (
          grade: NormalizedGrade
        ) =>
          grade.status
            .toLowerCase() ===
          'passed'
      ).length;

    /* -----------------------------------------------------
       PASS RATE
    ----------------------------------------------------- */

    const passRate =
      totalGraded > 0
        ? (
            passed /
            totalGraded
          ) * 100
        : 0;

    /* =====================================================
    8. RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        grades,

        summary: {
          totalStudents,

          totalAssessments,

          totalGraded,

          averageScore:
            Number(
              averageScore.toFixed(
                2
              )
            ),

          passRate:
            Number(
              passRate.toFixed(
                2
              )
            ),
        },
      },
      {
        status: 200,

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',

          Pragma:
            'no-cache',

          Expires:
            '0',
        },
      }
    );
  } catch (error: unknown) {
    /* =====================================================
    ERROR HANDLING
    ===================================================== */

    console.error(
      'GET /api/lecturer/grades ERROR:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to load lecturer grades.';

    const normalizedMessage =
      message.toLowerCase();

    const isUnauthorized =
      normalizedMessage.includes(
        'unauthorized'
      ) ||
      normalizedMessage.includes(
        'authentication'
      );

    return NextResponse.json(
      {
        success: false,

        message,

        grades: [],

        summary: {
          totalStudents: 0,
          totalAssessments: 0,
          totalGraded: 0,
          averageScore: 0,
          passRate: 0,
        },
      },
      {
        status:
          isUnauthorized
            ? 401
            : 500,
      }
    );
  } finally {
    client.release();
  }
}

