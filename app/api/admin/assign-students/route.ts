
import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AssignmentType = 'program' | 'unit';

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

function positiveId(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

async function rollback(client: PoolClient) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Ignore rollback errors.
  }
}

/* =========================================================
   GET
   LOAD STUDENTS, PROGRAMMES, UNITS AND MULTIPLE LECTURERS
========================================================= */

export async function GET() {
  const client = await pool.connect();

  try {
    const [
      studentsResult,
      programsResult,
      unitsResult,
      lecturersResult,
      lecturerProgramsResult,
      enrollmentsResult,
      lecturerStudentsResult,
    ] = await Promise.all([
      // 1. Approved students
      client.query(`
        SELECT
          a.id,
          a.id AS application_id,
          a.application_number,
          a.admission_number,
          a.first_name,
          a.middle_name,
          a.surname,

          TRIM(CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          )) AS full_name,

          a.email,
          a.mobile,
          a.course,
          a.intake,
          a.application_status,
          a.payment_status,
          a.created_at,
          a.approved_at

        FROM applications a

        WHERE LOWER(TRIM(a.application_status))
          IN ('approved', 'accepted')

        ORDER BY
          LOWER(TRIM(CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          ))) ASC
      `),

      // 2. LMS programmes
      client.query(`
        SELECT
          id,
          name,
          code,
          duration,
          level,
          status
        FROM lms_programs
        ORDER BY LOWER(name) ASC
      `),

      // 3. LMS units
      client.query(`
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
          LOWER(unit.name)
      `),

      // 4. Active lecturers
      client.query(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.active

        FROM users u

        WHERE LOWER(u.role) = 'lecturer'
          AND COALESCE(u.active, TRUE) = TRUE

        ORDER BY LOWER(COALESCE(u.name, '')) ASC
      `),

      // 5. Lecturer programme authorizations
      client.query(`
        SELECT
          lp.id,
          lp.lecturer_id,
          lp.program_id,
          lp.assigned_at,
          lp.updated_at,

          u.name AS lecturer_name,
          u.email AS lecturer_email,

          p.name AS program_name,
          p.code AS program_code

        FROM lms_lecturer_programs lp

        INNER JOIN users u
          ON u.id = lp.lecturer_id

        INNER JOIN lms_programs p
          ON p.id = lp.program_id

        ORDER BY
          LOWER(COALESCE(u.name, '')),
          LOWER(COALESCE(p.name, ''))
      `),

      // 6. Student programme enrolments
      client.query(`
        SELECT
          e.id,
          e.application_id,
          e.program_id,
          e.term_id,
          e.student_number,
          e.year_of_study,

          e.enrollment_status AS status,
          e.enrollment_status,

          e.enrolled_at,
          e.completed_at,
          e.lecturer_id,

          p.name AS program_name,
          p.code AS program_code,

          u.name AS lecturer_name,
          u.email AS lecturer_email

        FROM lms_enrollments e

        LEFT JOIN lms_programs p
          ON p.id = e.program_id

        LEFT JOIN users u
          ON u.id = e.lecturer_id

        ORDER BY e.id DESC
      `),

      /*
       * 7. ALL lecturer-student assignments.
       *
       * Programme assignments:
       * lms_lecturer_students
       *
       * Unit assignments:
       * lms_lecturer_student_units
       *
       * Legacy unit assignments in lms_lecturer_students
       * are also included for backward compatibility.
       */
      client.query(`
        WITH all_assignments AS (

          -- Programme-level assignments
          SELECT
            ls.id::BIGINT AS id,
            ls.lecturer_id,
            ls.application_id,
            NULL::INTEGER AS enrollment_id,
            ls.program_id,
            NULL::INTEGER AS unit_id,
            'program'::TEXT AS assignment_type,
            ls.assigned_at

          FROM lms_lecturer_students ls

          WHERE ls.unit_id IS NULL

          UNION ALL

          -- Legacy unit-level assignments
          SELECT
            ls.id::BIGINT AS id,
            ls.lecturer_id,
            ls.application_id,
            NULL::INTEGER AS enrollment_id,
            ls.program_id,
            ls.unit_id,
            'unit'::TEXT AS assignment_type,
            ls.assigned_at

          FROM lms_lecturer_students ls

          WHERE ls.unit_id IS NOT NULL

          UNION ALL

          -- Current unit-level assignments
          SELECT
            lsu.id::BIGINT AS id,
            lsu.lecturer_id,
            lsu.application_id,
            lsu.enrollment_id,
            lsu.program_id,
            lsu.unit_id,
            'unit'::TEXT AS assignment_type,
            lsu.assigned_at

          FROM lms_lecturer_student_units lsu
        )

        SELECT
          assignment.id,
          assignment.lecturer_id,
          assignment.application_id,
          assignment.enrollment_id,
          assignment.program_id,
          assignment.unit_id,
          assignment.assignment_type,
          assignment.assigned_at,

          lecturer.name AS lecturer_name,
          lecturer.email AS lecturer_email,

          student.application_number,
          student.admission_number,

          TRIM(CONCAT_WS(
            ' ',
            student.first_name,
            student.middle_name,
            student.surname
          )) AS student_name,

          student.email AS student_email,

          program.name AS program_name,

          unit.name AS unit_name,
          unit.program_id AS actual_unit_program_id,

          unit_program.name AS unit_program_name,

          enrollment.student_number,
          enrollment.enrollment_status

        FROM all_assignments assignment

        INNER JOIN users lecturer
          ON lecturer.id = assignment.lecturer_id

        INNER JOIN applications student
          ON student.id = assignment.application_id

        LEFT JOIN lms_programs program
          ON program.id = assignment.program_id

        LEFT JOIN lms_units unit
          ON unit.id = assignment.unit_id

        LEFT JOIN lms_programs unit_program
          ON unit_program.id = unit.program_id

        LEFT JOIN lms_enrollments enrollment
          ON enrollment.id = assignment.enrollment_id

        ORDER BY
          assignment.assigned_at DESC NULLS LAST,
          LOWER(COALESCE(lecturer.name, '')),
          LOWER(COALESCE(student.first_name, ''))
      `),
    ]);

    return NextResponse.json({
      success: true,

      students: studentsResult.rows,

      programs: programsResult.rows,

      units: unitsResult.rows,

      lecturers: lecturersResult.rows,

      lecturerPrograms: lecturerProgramsResult.rows,

      enrollments: enrollmentsResult.rows,

      lecturerAssignments: lecturerStudentsResult.rows,
    });
  } catch (error) {
    console.error(
      'GET /api/admin/assign-students:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   POST
   CREATE PROGRAMME ENROLMENTS AND LECTURER ASSIGNMENTS

   Multiple lecturers are supported.

   Programme assignment:
   lms_lecturer_students

   Unit assignment:
   lms_lecturer_student_units

   lms_enrollments.lecturer_id is NOT used as the
   authoritative lecturer assignment.
========================================================= */

export async function POST(request: Request) {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const body = await request.json();

    const applicationId = positiveId(
      body.applicationId ?? body.studentId
    );

    const programId = positiveId(body.programId);
    const lecturerId = positiveId(body.lecturerId);
    const unitId = positiveId(body.unitId);
    const requestedEnrollmentId = positiveId(
      body.enrollmentId
    );

    const assignmentType: AssignmentType =
      body.assignmentType === 'unit'
        ? 'unit'
        : 'program';

    const termId = positiveId(body.termId);
    const yearOfStudy = positiveId(body.yearOfStudy);

    if (!applicationId) {
      throw new ApiError(
        'A valid student application is required.'
      );
    }

    if (!programId) {
      throw new ApiError(
        'A valid LMS programme is required.'
      );
    }

    if (!lecturerId) {
      throw new ApiError(
        'Select a lecturer.'
      );
    }

    if (assignmentType === 'unit' && !unitId) {
      throw new ApiError(
        'Select a valid unit for this assignment.'
      );
    }

    await client.query('BEGIN');
    transactionStarted = true;

    /* -----------------------------------------------------
       1. VERIFY APPLICATION
    ----------------------------------------------------- */

    const applicationResult = await client.query(
      `
        SELECT
          id,
          application_number,
          admission_number,
          first_name,
          middle_name,
          surname,
          email,
          course,
          intake,
          application_status

        FROM applications

        WHERE id = $1

        LIMIT 1
        FOR UPDATE
      `,
      [applicationId]
    );

    if (!applicationResult.rowCount) {
      throw new ApiError(
        'Student application not found.',
        404
      );
    }

    const application = applicationResult.rows[0];

    const applicationStatus = String(
      application.application_status || ''
    ).trim().toLowerCase();

    if (
      !['approved', 'accepted'].includes(applicationStatus)
    ) {
      throw new ApiError(
        'Only approved students can be assigned to the LMS.'
      );
    }

    /* -----------------------------------------------------
       2. VERIFY STUDENT PROGRAMME
    ----------------------------------------------------- */

    const programResult = await client.query(
      `
        SELECT
          id,
          name,
          code
        FROM lms_programs
        WHERE id = $1
        LIMIT 1
      `,
      [programId]
    );

    if (!programResult.rowCount) {
      throw new ApiError(
        'LMS programme not found.',
        404
      );
    }

    const program = programResult.rows[0];

    /* -----------------------------------------------------
       3. VERIFY LECTURER
    ----------------------------------------------------- */

    const lecturerResult = await client.query(
      `
        SELECT
          id,
          name,
          email
        FROM users
        WHERE id = $1
          AND LOWER(role) = 'lecturer'
          AND COALESCE(active, TRUE) = TRUE
        LIMIT 1
      `,
      [lecturerId]
    );

    if (!lecturerResult.rowCount) {
      throw new ApiError(
        'Lecturer not found or inactive.',
        404
      );
    }

    const lecturer = lecturerResult.rows[0];

    /* -----------------------------------------------------
       4. VERIFY UNIT AND LECTURER AUTHORIZATION
    ----------------------------------------------------- */

    let unit: {
      id: number;
      program_id: number;
      name: string;
    } | null = null;

    if (assignmentType === 'unit') {
      const unitResult = await client.query(
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

      if (!unitResult.rowCount) {
        throw new ApiError(
          'Selected unit not found.',
          404
        );
      }

      unit = unitResult.rows[0];

      const actualUnitProgramId = Number(
        unit!.program_id
      );

      /*
       * Lecturer authorization is checked against the
       * actual programme that owns the selected unit.
       *
       * This allows an additional course unit to be taught
       * without changing the student's primary programme.
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
                AND COALESCE(lu.direct_access, FALSE) = TRUE
            )

            OR EXISTS (
              SELECT 1
              FROM lms_lecturer_units lu
              INNER JOIN lms_units assigned_unit
                ON assigned_unit.id = lu.unit_id
              WHERE lu.lecturer_id = $1
                AND assigned_unit.id = $2
                AND assigned_unit.program_id = $3
                AND COALESCE(lu.program_access, FALSE) = TRUE
            )

          LIMIT 1
        `,
        [
          lecturerId,
          unitId,
          actualUnitProgramId,
        ]
      );

      if (!lecturerAccess.rowCount) {
        throw new ApiError(
          'This lecturer is not authorized to teach the selected unit. Assign the lecturer to the unit or its programme first.'
        );
      }
    } else {
      // Programme-level lecturer authorization
      const authorizationResult = await client.query(
        `
          SELECT 1
          FROM lms_lecturer_programs
          WHERE lecturer_id = $1
            AND program_id = $2
          LIMIT 1
        `,
        [lecturerId, programId]
      );

      if (!authorizationResult.rowCount) {
        throw new ApiError(
          'The selected lecturer is not authorized for this programme. Authorize the lecturer for the programme first.'
        );
      }
    }

    /* -----------------------------------------------------
       5. FIND OR CREATE THE STUDENT ENROLMENT

       Programme-level:
       Find/create the enrolment for this application
       and programme.

       Unit-level:
       Use the exact requested enrolment, or resolve
       the student's active enrolment for the selected
       programme.

       Never overwrite another programme enrolment.
       Never overwrite lecturer_id.
    ----------------------------------------------------- */

    let enrollmentId: number;

    if (requestedEnrollmentId) {
      const enrollmentResult = await client.query(
        `
          SELECT
            id,
            application_id,
            program_id,
            enrollment_status
          FROM lms_enrollments
          WHERE id = $1
            AND application_id = $2
          LIMIT 1
          FOR UPDATE
        `,
        [requestedEnrollmentId, applicationId]
      );

      if (!enrollmentResult.rowCount) {
        throw new ApiError(
          'The selected student enrolment was not found.',
          404
        );
      }

      const selectedEnrollment = enrollmentResult.rows[0];

      if (
        assignmentType === 'program' &&
        Number(selectedEnrollment.program_id) !== programId
      ) {
        throw new ApiError(
          'The selected enrolment does not belong to the chosen programme.'
        );
      }

      if (
        String(selectedEnrollment.enrollment_status || '')
          .trim()
          .toLowerCase() !== 'active'
      ) {
        throw new ApiError(
          'The selected student enrolment is not active.'
        );
      }

      enrollmentId = Number(selectedEnrollment.id);
    } else {
      const existingEnrollment = await client.query(
        `
          SELECT
            id,
            program_id,
            enrollment_status
          FROM lms_enrollments
          WHERE application_id = $1
            AND program_id = $2
            AND LOWER(
              COALESCE(enrollment_status, '')
            ) = 'active'
          ORDER BY
            enrolled_at DESC NULLS LAST,
            id DESC
          LIMIT 1
          FOR UPDATE
        `,
        [applicationId, programId]
      );

      if (existingEnrollment.rowCount) {
        enrollmentId = Number(
          existingEnrollment.rows[0].id
        );
      } else if (assignmentType === 'unit') {
        throw new ApiError(
          'The student does not have an active enrolment for the selected programme. Select the correct existing enrolment first.'
        );
      } else {
        const studentNumber =
          application.admission_number ||
          application.application_number ||
          `LMS-${application.id}`;

        const enrollmentInsert = await client.query(
          `
            INSERT INTO lms_enrollments (
              application_id,
              program_id,
              term_id,
              student_number,
              year_of_study,
              enrollment_status,
              enrolled_at,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              'active',
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
            RETURNING id
          `,
          [
            applicationId,
            programId,
            termId,
            studentNumber,
            yearOfStudy,
          ]
        );

        enrollmentId = Number(
          enrollmentInsert.rows[0].id
        );
      }
    }

    /* -----------------------------------------------------
       6. UPDATE ENROLMENT DETAILS ONLY FOR PROGRAMME
          ASSIGNMENTS

       Unit assignment must never modify the student's
       primary programme enrolment.
    ----------------------------------------------------- */

    if (assignmentType === 'program') {
      const studentNumber =
        application.admission_number ||
        application.application_number ||
        `LMS-${application.id}`;

      await client.query(
        `
          UPDATE lms_enrollments
          SET
            term_id = COALESCE($1, term_id),
            student_number = COALESCE($2, student_number),
            year_of_study = COALESCE($3, year_of_study),
            enrollment_status = 'active',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `,
        [
          termId,
          studentNumber,
          yearOfStudy,
          enrollmentId,
        ]
      );
    }

    /* -----------------------------------------------------
       7. SAVE THE LECTURER ASSIGNMENT

       Multiple lecturers are allowed.

       Programme assignment:
       lms_lecturer_students

       Unit assignment:
       lms_lecturer_student_units
    ----------------------------------------------------- */

    if (assignmentType === 'program') {
      /*
       * Add this lecturer without deleting or updating
       * assignments belonging to other lecturers.
       *
       * Do not use lms_enrollments.lecturer_id here.
       */
      await client.query(
        `
          INSERT INTO lms_lecturer_students (
            lecturer_id,
            application_id,
            program_id,
            unit_id,
            assigned_at,
            updated_at
          )
          SELECT
            $1,
            $2,
            $3,
            NULL,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          WHERE NOT EXISTS (
            SELECT 1
            FROM lms_lecturer_students
            WHERE lecturer_id = $1
              AND application_id = $2
              AND program_id = $3
              AND unit_id IS NULL
          )
        `,
        [
          lecturerId,
          applicationId,
          programId,
        ]
      );
    } else {
      /*
       * Verify the student's registration for the unit.
       *
       * A unit can belong to a different programme from
       * the student's primary programme.
       */
      const unitEnrollment = await client.query(
        `
          SELECT 1
          FROM lms_unit_enrollments ue
          WHERE ue.enrollment_id = $1
            AND ue.unit_id = $2
            AND (
              ue.status IS NULL
              OR LOWER(TRIM(ue.status::TEXT))
                IN ('active', 'enrolled', 'registered')
            )
          LIMIT 1
        `,
        [enrollmentId, unitId]
      );

      if (!unitEnrollment.rowCount) {
        throw new ApiError(
          'The student is not registered for this unit. Register the student for the unit before assigning a lecturer.'
        );
      }

      /*
       * Add a lecturer to this exact student enrolment
       * and unit.
       *
       * Other lecturers assigned to the same unit
       * remain untouched.
       */
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
          Number(unit!.program_id),
        ]
      );
    }

    /* -----------------------------------------------------
       8. COMMIT
    ----------------------------------------------------- */

    await client.query('COMMIT');
    transactionStarted = false;

    return NextResponse.json({
      success: true,

      message:
        assignmentType === 'program'
          ? `${lecturer.name} has been assigned to ${application.first_name} for ${program.name}.`
          : `${lecturer.name} has been assigned to ${application.first_name} for ${unit!.name}.`,

      applicationId,
      enrollmentId,
      programId,
      programName: program.name,

      lecturerId,
      lecturerName: lecturer.name,

      assignmentType,
      unitId: assignmentType === 'unit' ? unitId : null,
      unitName: unit?.name || null,
    });
  } catch (error) {
    if (transactionStarted) {
      await rollback(client);
    }

    console.error(
      'POST /api/admin/assign-students:',
      error
    );

    const status =
      error instanceof ApiError
        ? error.status
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      { status }
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE
   REMOVE ONE LECTURER OR A STUDENT PROGRAMME ENROLMENT

   Removing one lecturer never removes other lecturers.
========================================================= */

export async function DELETE(request: Request) {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const body = await request.json();

    const applicationId = positiveId(
      body.applicationId ?? body.studentId
    );

    const lecturerId = positiveId(body.lecturerId);
    const unitId = positiveId(body.unitId);
    const programId = positiveId(body.programId);
    const enrollmentId = positiveId(body.enrollmentId);

    const type = String(body.type || 'lecturer');

    if (!applicationId) {
      throw new ApiError(
        'A valid student application is required.'
      );
    }

    await client.query('BEGIN');
    transactionStarted = true;

    /* -----------------------------------------------------
       1. REMOVE ONE LECTURER ASSIGNMENT
    ----------------------------------------------------- */

    if (type === 'lecturer') {
      if (!lecturerId) {
        throw new ApiError(
          'Select the lecturer you want to remove. Other lecturer assignments will be preserved.'
        );
      }

      let deletedCount = 0;

      if (unitId) {
        // Remove this lecturer from this exact student unit.
        const currentUnitAssignment = await client.query(
          `
            DELETE FROM lms_lecturer_student_units
            WHERE application_id = $1
              AND lecturer_id = $2
              AND unit_id = $3
              AND (
                $4::INTEGER IS NULL
                OR enrollment_id = $4
              )
            RETURNING id
          `,
          [
            applicationId,
            lecturerId,
            unitId,
            enrollmentId,
          ]
        );

        deletedCount += currentUnitAssignment.rowCount || 0;

        // Also remove any legacy unit assignment.
        const legacyUnitAssignment = await client.query(
          `
            DELETE FROM lms_lecturer_students
            WHERE application_id = $1
              AND lecturer_id = $2
              AND unit_id = $3
              AND (
                $4::INTEGER IS NULL
                OR program_id = $4
              )
            RETURNING id
          `,
          [
            applicationId,
            lecturerId,
            unitId,
            programId,
          ]
        );

        deletedCount += legacyUnitAssignment.rowCount || 0;
      } else {
        /*
         * Remove only the programme-level assignment.
         * Do not remove the lecturer's unit assignments.
         */
        const programmeAssignment = await client.query(
          `
            DELETE FROM lms_lecturer_students
            WHERE application_id = $1
              AND lecturer_id = $2
              AND unit_id IS NULL
              AND (
                $3::INTEGER IS NULL
                OR program_id = $3
              )
            RETURNING id
          `,
          [
            applicationId,
            lecturerId,
            programId,
          ]
        );

        deletedCount += programmeAssignment.rowCount || 0;
      }

      if (deletedCount === 0) {
        throw new ApiError(
          'The selected lecturer assignment was not found.',
          404
        );
      }

      /*
       * Do not delete lms_enrollments.
       * Do not clear lms_enrollments.lecturer_id.
       * Do not remove lms_lecturer_units authorization.
       *
       * These belong to separate enrolment and lecturer
       * authorization workflows.
       */

      await client.query('COMMIT');
      transactionStarted = false;

      return NextResponse.json({
        success: true,
        message: 'Lecturer assignment removed successfully.',
        applicationId,
        lecturerId,
        unitId,
        programId,
      });
    }

    /* -----------------------------------------------------
       2. REMOVE A STUDENT PROGRAMME ENROLMENT
    ----------------------------------------------------- */

    if (type === 'program') {
      if (!programId && !enrollmentId) {
        throw new ApiError(
          'Select the programme or exact enrolment to remove.'
        );
      }

      // Resolve the exact enrolments to remove.
      const targetEnrollments = await client.query(
        `
          SELECT
            id,
            application_id,
            program_id
          FROM lms_enrollments
          WHERE application_id = $1
            AND (
              $2::INTEGER IS NULL
              OR program_id = $2
            )
            AND (
              $3::INTEGER IS NULL
              OR id = $3
            )
          FOR UPDATE
        `,
        [
          applicationId,
          programId,
          enrollmentId,
        ]
      );

      if (!targetEnrollments.rowCount) {
        throw new ApiError(
          'The selected student programme enrolment was not found.',
          404
        );
      }

      const enrollmentIds = targetEnrollments.rows.map(
        (row) => Number(row.id)
      );

      const programIds = [
        ...new Set(
          targetEnrollments.rows.map(
            (row) => Number(row.program_id)
          )
        ),
      ];

      // Remove unit-level lecturer assignments for these enrolments.
      await client.query(
        `
          DELETE FROM lms_lecturer_student_units
          WHERE application_id = $1
            AND enrollment_id = ANY($2::INTEGER[])
        `,
        [applicationId, enrollmentIds]
      );

      // Remove student registrations for these enrolments.
      await client.query(
        `
          DELETE FROM lms_unit_enrollments
          WHERE enrollment_id = ANY($1::INTEGER[])
        `,
        [enrollmentIds]
      );

      // Remove programme-level lecturer assignments.
      await client.query(
        `
          DELETE FROM lms_lecturer_students
          WHERE application_id = $1
            AND program_id = ANY($2::INTEGER[])
        `,
        [applicationId, programIds]
      );

      // Finally remove the exact programme enrolments.
      await client.query(
        `
          DELETE FROM lms_enrollments
          WHERE application_id = $1
            AND id = ANY($2::INTEGER[])
        `,
        [applicationId, enrollmentIds]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return NextResponse.json({
        success: true,
        message: 'Student programme enrolment removed successfully.',
        applicationId,
        enrollmentIds,
        programIds,
      });
    }

    throw new ApiError(
      'Invalid delete type.'
    );
  } catch (error) {
    if (transactionStarted) {
      await rollback(client);
    }

    console.error(
      'DELETE /api/admin/assign-students:',
      error
    );

    const status =
      error instanceof ApiError
        ? error.status
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      { status }
    );
  } finally {
    client.release();
  }
}
