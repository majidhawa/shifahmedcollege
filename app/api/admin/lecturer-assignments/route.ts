
import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AssignmentAction =
  | 'assign-program'
  | 'remove-program'
  | 'assign-unit'
  | 'remove-unit'
  | 'assign-student-unit'
  | 'remove-student-unit';

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

/* =========================================================
   GET: LOAD THE COMPLETE LECTURER ASSIGNMENT WORKSPACE
========================================================= */

export async function GET() {
  try {
    const [
      lecturers,
      programs,
      units,
      lecturerPrograms,
      lecturerUnits,
      students,
      studentAssignments,
      legacyAssignments,
    ] = await Promise.all([
      // Active lecturers
      pool.query(`
        SELECT
          id,
          name,
          email,
          phone,
          active
        FROM users
        WHERE LOWER(role) = 'lecturer'
          AND COALESCE(active, TRUE) = TRUE
        ORDER BY LOWER(COALESCE(name, '')) ASC
      `),

      // All programmes
      pool.query(`
        SELECT
          id,
          name,
          code,
          description,
          duration,
          level,
          status
        FROM lms_programs
        ORDER BY LOWER(name) ASC
      `),

      // Units and their actual programme relationships
      pool.query(`
        SELECT
          unit.id,
          unit.program_id,
          unit.code,
          unit.name,
          unit.description,
          unit.credit_hours,
          unit.year_of_study,
          unit.term_number,
          unit.status,
          program.name AS program_name,
          program.code AS program_code
        FROM lms_units unit
        INNER JOIN lms_programs program
          ON program.id = unit.program_id
        ORDER BY
          LOWER(program.name),
          unit.year_of_study NULLS LAST,
          unit.term_number NULLS LAST,
          LOWER(unit.name)
      `),

      // Explicit programme assignments and legacy programme access
      pool.query(`
        WITH programme_access AS (
          SELECT
            lp.id::BIGINT AS id,
            lp.lecturer_id,
            lp.program_id,
            lp.assigned_at
          FROM lms_lecturer_programs lp

          UNION ALL

          SELECT
            (-lu.id)::BIGINT AS id,
            lu.lecturer_id,
            unit.program_id,
            lu.assigned_at
          FROM lms_lecturer_units lu
          INNER JOIN lms_units unit
            ON unit.id = lu.unit_id
          WHERE COALESCE(lu.program_access, FALSE) = TRUE
        )
        SELECT
          MIN(pa.id) AS id,
          pa.lecturer_id,
          pa.program_id,
          MIN(pa.assigned_at) AS assigned_at,
          lecturer.name AS lecturer_name,
          lecturer.email AS lecturer_email,
          program.name AS program_name,
          program.code AS program_code,
          (
            SELECT COUNT(DISTINCT unit.id)::INTEGER
            FROM lms_units unit
            WHERE unit.program_id = pa.program_id
          ) AS assigned_unit_count
        FROM programme_access pa
        INNER JOIN users lecturer
          ON lecturer.id = pa.lecturer_id
        INNER JOIN lms_programs program
          ON program.id = pa.program_id
        GROUP BY
          pa.lecturer_id,
          pa.program_id,
          lecturer.name,
          lecturer.email,
          program.name,
          program.code
        ORDER BY
          LOWER(COALESCE(lecturer.name, '')),
          LOWER(program.name)
      `),

      // Individual lecturer-unit assignments
      pool.query(`
        SELECT
          lu.id,
          lu.lecturer_id,
          lu.unit_id,
          unit.program_id AS program_id,
          COALESCE(lu.program_access, FALSE) AS program_access,
          COALESCE(lu.direct_access, FALSE) AS direct_access,
          lu.assigned_at,
          lu.updated_at,
          lecturer.name AS lecturer_name,
          lecturer.email AS lecturer_email,
          unit.name AS unit_name,
          unit.code AS unit_code,
          program.name AS program_name,
          program.code AS program_code
        FROM lms_lecturer_units lu
        INNER JOIN users lecturer
          ON lecturer.id = lu.lecturer_id
        INNER JOIN lms_units unit
          ON unit.id = lu.unit_id
        INNER JOIN lms_programs program
          ON program.id = unit.program_id
        WHERE
          COALESCE(lu.program_access, FALSE) = TRUE
          OR COALESCE(lu.direct_access, FALSE) = TRUE
        ORDER BY
          LOWER(COALESCE(lecturer.name, '')),
          LOWER(program.name),
          LOWER(unit.name)
      `),

      // Approved students with active primary programme enrolments
      pool.query(`
        SELECT
          e.id AS enrollment_id,
          e.application_id,
          e.program_id,
          e.student_number,
          e.year_of_study,
          e.enrollment_status,
          e.enrolled_at,
          e.term_id,
          program.name AS program_name,
          program.code AS program_code,
          application.application_number,
          application.admission_number,
          application.first_name,
          application.middle_name,
          application.surname,
          TRIM(CONCAT_WS(
            ' ',
            application.first_name,
            application.middle_name,
            application.surname
          )) AS full_name,
          application.email,
          application.mobile,
          application.intake
        FROM lms_enrollments e
        INNER JOIN applications application
          ON application.id = e.application_id
        LEFT JOIN lms_programs program
          ON program.id = e.program_id
        WHERE LOWER(COALESCE(e.enrollment_status, '')) = 'active'
          AND LOWER(COALESCE(application.application_status, ''))
              IN ('approved', 'accepted')
        ORDER BY
          LOWER(TRIM(CONCAT_WS(
            ' ',
            application.first_name,
            application.middle_name,
            application.surname
          ))),
          LOWER(COALESCE(program.name, ''))
      `),

      // Lecturer assignments to exact student enrolments
      pool.query(`
        SELECT
          lsu.id,
          lsu.lecturer_id,
          lsu.application_id,
          lsu.enrollment_id,
          lsu.unit_id,
          lsu.program_id,
          lsu.assigned_at,
          lecturer.name AS lecturer_name,
          lecturer.email AS lecturer_email,
          application.application_number,
          application.admission_number,
          TRIM(CONCAT_WS(
            ' ',
            application.first_name,
            application.middle_name,
            application.surname
          )) AS student_name,
          application.email AS student_email,
          student_program.name AS student_program_name,
          unit.name AS unit_name,
          unit.code AS unit_code,
          unit.program_id AS actual_unit_program_id,
          unit_program.name AS unit_program_name,
          unit_program.code AS unit_program_code,
          enrollment.student_number,
          enrollment.enrollment_status,
          enrollment.term_id
        FROM lms_lecturer_student_units lsu
        INNER JOIN users lecturer
          ON lecturer.id = lsu.lecturer_id
        INNER JOIN applications application
          ON application.id = lsu.application_id
        INNER JOIN lms_units unit
          ON unit.id = lsu.unit_id
        INNER JOIN lms_programs unit_program
          ON unit_program.id = unit.program_id
        LEFT JOIN lms_enrollments enrollment
          ON enrollment.id = lsu.enrollment_id
        LEFT JOIN lms_programs student_program
          ON student_program.id = enrollment.program_id
        ORDER BY
          LOWER(COALESCE(lecturer.name, '')),
          LOWER(TRIM(CONCAT_WS(
            ' ',
            application.first_name,
            application.middle_name,
            application.surname
          ))),
          LOWER(unit.name)
      `),

      // Legacy student programme assignments
      pool.query(`
        SELECT
          ls.id,
          ls.lecturer_id,
          ls.application_id,
          ls.program_id,
          ls.assigned_at,
          lecturer.name AS lecturer_name,
          application.application_number,
          application.admission_number,
          TRIM(CONCAT_WS(
            ' ',
            application.first_name,
            application.middle_name,
            application.surname
          )) AS student_name,
          application.email AS student_email,
          program.name AS assigned_program_name
        FROM lms_lecturer_students ls
        INNER JOIN users lecturer
          ON lecturer.id = ls.lecturer_id
        INNER JOIN applications application
          ON application.id = ls.application_id
        LEFT JOIN lms_programs program
          ON program.id = ls.program_id
        ORDER BY
          LOWER(COALESCE(lecturer.name, '')),
          LOWER(TRIM(CONCAT_WS(
            ' ',
            application.first_name,
            application.middle_name,
            application.surname
          )))
      `),
    ]);

    return NextResponse.json({
      success: true,
      lecturers: lecturers.rows,
      programs: programs.rows,
      units: units.rows,
      lecturerPrograms: lecturerPrograms.rows,
      lecturerUnits: lecturerUnits.rows,
      students: students.rows,
      studentAssignments: studentAssignments.rows,
      legacyStudentAssignments: legacyAssignments.rows,
    });
  } catch (error) {
    console.error(
      'GET /api/admin/lecturer-assignments:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST: MANAGE LECTURER, UNIT AND STUDENT ASSIGNMENTS
========================================================= */

export async function POST(request: Request) {
  let client: PoolClient | undefined;
  let transactionStarted = false;

  try {
    const body = await request.json();

    const action = String(body.action || '') as AssignmentAction;

    const lecturerId = positiveId(body.lecturerId);
    const programId = positiveId(body.programId);
    const unitId = positiveId(body.unitId);
    const applicationId = positiveId(body.applicationId);
    const requestedEnrollmentId = positiveId(body.enrollmentId);

    const validActions: AssignmentAction[] = [
      'assign-program',
      'remove-program',
      'assign-unit',
      'remove-unit',
      'assign-student-unit',
      'remove-student-unit',
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unknown assignment action.',
        },
        { status: 400 }
      );
    }

    if (!lecturerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Select a valid lecturer.',
        },
        { status: 400 }
      );
    }

    client = await pool.connect();

    const lecturer = await client.query(
      `
        SELECT id, name
        FROM users
        WHERE id = $1
          AND LOWER(role) = 'lecturer'
          AND COALESCE(active, TRUE) = TRUE
        LIMIT 1
      `,
      [lecturerId]
    );

    if (!lecturer.rowCount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lecturer not found or inactive.',
        },
        { status: 404 }
      );
    }

    await client.query('BEGIN');
    transactionStarted = true;

    /* -----------------------------------------------------
       ASSIGN OR REMOVE A PROGRAMME
    ----------------------------------------------------- */

    if (
      action === 'assign-program' ||
      action === 'remove-program'
    ) {
      if (!programId) {
        throw new Error('Select a valid programme.');
      }

      const program = await client.query(
        `
          SELECT id
          FROM lms_programs
          WHERE id = $1
          LIMIT 1
        `,
        [programId]
      );

      if (!program.rowCount) {
        throw new Error('Programme not found.');
      }

      if (action === 'assign-program') {
        await client.query(
          `
            INSERT INTO lms_lecturer_programs (
              lecturer_id,
              program_id,
              assigned_at,
              updated_at
            )
            SELECT
              $1,
              $2,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            WHERE NOT EXISTS (
              SELECT 1
              FROM lms_lecturer_programs
              WHERE lecturer_id = $1
                AND program_id = $2
            )
          `,
          [lecturerId, programId]
        );
      } else {
        await client.query(
          `
            DELETE FROM lms_lecturer_programs
            WHERE lecturer_id = $1
              AND program_id = $2
          `,
          [lecturerId, programId]
        );

        await client.query(
          `
            UPDATE lms_lecturer_units lu
            SET
              program_access = FALSE,
              updated_at = CURRENT_TIMESTAMP
            FROM lms_units unit
            WHERE unit.id = lu.unit_id
              AND unit.program_id = $2
              AND lu.lecturer_id = $1
          `,
          [lecturerId, programId]
        );

        await client.query(
          `
            DELETE FROM lms_lecturer_units lu
            USING lms_units unit
            WHERE unit.id = lu.unit_id
              AND unit.program_id = $2
              AND lu.lecturer_id = $1
              AND COALESCE(lu.program_access, FALSE) = FALSE
              AND COALESCE(lu.direct_access, FALSE) = FALSE
          `,
          [lecturerId, programId]
        );
      }
    }

    /* -----------------------------------------------------
       ASSIGN OR REMOVE AN INDIVIDUAL UNIT
    ----------------------------------------------------- */

    else if (
      action === 'assign-unit' ||
      action === 'remove-unit'
    ) {
      if (!unitId) {
        throw new Error('Select a valid unit.');
      }

      const unit = await client.query(
        `
          SELECT id, program_id
          FROM lms_units
          WHERE id = $1
          LIMIT 1
        `,
        [unitId]
      );

      if (!unit.rowCount) {
        throw new Error('Unit not found.');
      }

      const actualProgramId = Number(unit.rows[0].program_id);

      if (action === 'assign-unit') {
        await client.query(
          `
            INSERT INTO lms_lecturer_units (
              lecturer_id,
              unit_id,
              program_id,
              program_access,
              direct_access,
              assigned_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              FALSE,
              TRUE,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT (lecturer_id, unit_id)
            DO UPDATE SET
              program_id = EXCLUDED.program_id,
              direct_access = TRUE,
              updated_at = CURRENT_TIMESTAMP
          `,
          [lecturerId, unitId, actualProgramId]
        );
      } else {
        await client.query(
          `
            UPDATE lms_lecturer_units
            SET
              direct_access = FALSE,
              updated_at = CURRENT_TIMESTAMP
            WHERE lecturer_id = $1
              AND unit_id = $2
          `,
          [lecturerId, unitId]
        );

        await client.query(
          `
            DELETE FROM lms_lecturer_units
            WHERE lecturer_id = $1
              AND unit_id = $2
              AND COALESCE(program_access, FALSE) = FALSE
              AND COALESCE(direct_access, FALSE) = FALSE
          `,
          [lecturerId, unitId]
        );
      }
    }

    /* -----------------------------------------------------
       ASSIGN OR REMOVE A STUDENT FROM A LECTURER'S UNIT

       Supports additional units belonging to a different
       programme from the student's primary enrolment.
    ----------------------------------------------------- */

    else if (
      action === 'assign-student-unit' ||
      action === 'remove-student-unit'
    ) {
      if (!unitId || !applicationId) {
        throw new Error('Select both a student and a unit.');
      }

      // Get the unit's actual programme.
      const unit = await client.query(
        `
          SELECT
            id,
            program_id,
            name
          FROM lms_units
          WHERE id = $1
          LIMIT 1
        `,
        [unitId]
      );

      if (!unit.rowCount) {
        throw new Error('Unit not found.');
      }

      const actualProgramId = Number(unit.rows[0].program_id);

      /*
       * IMPORTANT FIX:
       *
       * Do not filter the student's enrolment using
       * e.program_id = actualProgramId.
       *
       * A student can take an additional unit from another
       * programme while their primary enrolment remains
       * in their original programme.
       *
       * Resolve the exact active primary enrolment instead.
       */
      const enrollmentResult = await client.query(
        `
          SELECT
            e.id,
            e.application_id,
            e.program_id,
            e.enrollment_status,
            e.enrolled_at
          FROM lms_enrollments e
          WHERE e.application_id = $1
            AND (
              $2::INTEGER IS NULL
              OR e.id = $2
            )
            ${
              action === 'assign-student-unit'
                ? `
                  AND LOWER(
                    COALESCE(e.enrollment_status, '')
                  ) = 'active'
                `
                : ''
            }
          ORDER BY
            e.enrolled_at DESC NULLS LAST,
            e.id DESC
        `,
        [applicationId, requestedEnrollmentId]
      );

      if (!enrollmentResult.rowCount) {
        throw new Error(
          action === 'assign-student-unit'
            ? 'This student does not have an active enrolment. Check the student enrolment before assigning the unit.'
            : 'The selected student enrolment was not found.'
        );
      }

      if (
        !requestedEnrollmentId &&
        enrollmentResult.rowCount > 1
      ) {
        throw new Error(
          'This student has multiple active enrolments. Select the specific enrolment and try again.'
        );
      }

      const enrollment = enrollmentResult.rows[0];
      const enrollmentId = Number(enrollment.id);

      /*
       * Verify that the student has actually registered
       * for this specific unit.
       *
       * The unit can belong to a different programme from
       * the student's primary programme enrolment.
       */
      if (action === 'assign-student-unit') {
        const unitEnrollment = await client.query(
          `
            SELECT 1
            FROM lms_unit_enrollments ue
            WHERE ue.enrollment_id = $1
              AND ue.unit_id = $2
              AND (
                ue.status IS NULL
                OR LOWER(TRIM(ue.status::TEXT))
                    IN (
                      'active',
                      'enrolled',
                      'registered'
                    )
              )
            LIMIT 1
          `,
          [enrollmentId, unitId]
        );

        if (!unitEnrollment.rowCount) {
          throw new Error(
            'This student is not registered for the selected unit. Register the student for this unit first.'
          );
        }
      }

      /* ---------------------------------------------------
         REMOVE STUDENT UNIT ASSIGNMENT
      --------------------------------------------------- */

      if (action === 'remove-student-unit') {
        const result = await client.query(
          `
            DELETE FROM lms_lecturer_student_units
            WHERE lecturer_id = $1
              AND application_id = $2
              AND enrollment_id = $3
              AND unit_id = $4
          `,
          [
            lecturerId,
            applicationId,
            enrollmentId,
            unitId,
          ]
        );

        if (!result.rowCount) {
          throw new Error(
            'This student is not assigned to the lecturer for this unit and enrolment.'
          );
        }
      }

      /* ---------------------------------------------------
         ASSIGN STUDENT UNIT
      --------------------------------------------------- */

      else {
        // Verify approved application.
        const student = await client.query(
          `
            SELECT id
            FROM applications
            WHERE id = $1
              AND LOWER(
                COALESCE(application_status, '')
              ) IN ('approved', 'accepted')
            LIMIT 1
          `,
          [applicationId]
        );

        if (!student.rowCount) {
          throw new Error(
            'This student must have an approved application before being assigned.'
          );
        }

        /*
         * Lecturer access is checked against the SELECTED
         * UNIT'S ACTUAL PROGRAMME, not the student's
         * primary programme.
         */
        const lecturerAccess = await client.query(
          `
            SELECT 1
            WHERE
              EXISTS (
                SELECT 1
                FROM lms_lecturer_programs lp
                WHERE lp.lecturer_id = $1
                  AND lp.program_id = $3
              )
              OR EXISTS (
                SELECT 1
                FROM lms_lecturer_units lu
                WHERE lu.lecturer_id = $1
                  AND lu.unit_id = $2
                  AND COALESCE(
                    lu.direct_access,
                    FALSE
                  ) = TRUE
              )
              OR EXISTS (
                SELECT 1
                FROM lms_lecturer_units lu
                INNER JOIN lms_units assigned_unit
                  ON assigned_unit.id = lu.unit_id
                WHERE lu.lecturer_id = $1
                  AND assigned_unit.id = $2
                  AND assigned_unit.program_id = $3
                  AND COALESCE(
                    lu.program_access,
                    FALSE
                  ) = TRUE
              )
            LIMIT 1
          `,
          [
            lecturerId,
            unitId,
            actualProgramId,
          ]
        );

        if (!lecturerAccess.rowCount) {
          throw new Error(
            'This lecturer has no teaching access to the selected unit. Assign the lecturer to the unit or its actual programme first.'
          );
        }

        // Save against the exact student enrolment.
        await client.query(
          `
            INSERT INTO lms_lecturer_student_units (
              lecturer_id,
              application_id,
              enrollment_id,
              unit_id,
              program_id,
              assigned_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT DO NOTHING
          `,
          [
            lecturerId,
            applicationId,
            enrollmentId,
            unitId,
            actualProgramId,
          ]
        );
      }
    }

    await client.query('COMMIT');
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: 'Lecturer assignment updated successfully.',
    });

  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors.
      }
    }

    console.error(
      'POST /api/admin/lecturer-assignments:',
      error
    );

    const message = errorMessage(error);

    const badRequestMessages = [
      'Select ',
      'must have an approved',
      'active enrolment',
      'multiple active enrolments',
      'not registered for the selected unit',
      'no teaching access',
      'Unknown assignment',
    ];

    const status =
      message.includes('not found') ||
      message.includes('not assigned')
        ? 404
        : badRequestMessages.some((item) =>
            message.includes(item)
          )
          ? 400
          : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );

  } finally {
    client?.release();
  }
}
