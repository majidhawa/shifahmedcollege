import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const fail = (message: string, status = 400) => NextResponse.json({ success: false, message }, { status });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const lecturer = await requireLecturer();
    if (!lecturer) return fail('Unauthorized', 401);
    const { id } = await context.params;
    const result = await pool.query(
      `SELECT * FROM lms_records_of_work WHERE id = $1 AND lecturer_id = $2 LIMIT 1`,
      [Number(id), lecturer.id]
    );
    if (!result.rowCount) return fail('Record not found.', 404);
    return NextResponse.json({ success: true, record: result.rows[0] });
  } catch (error) {
    console.error('GET lecturer record:', error);
    return fail('Unable to load this record.', 500);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const lecturer = await requireLecturer();
    if (!lecturer) return fail('Unauthorized', 401);
    const { id } = await context.params;
    const body = await request.json();
    const programId = Number(body.programId);
    const unitId = body.unitId ? Number(body.unitId) : null;

    const current = await pool.query(
      `SELECT id FROM lms_records_of_work WHERE id = $1 AND lecturer_id = $2`,
      [Number(id), lecturer.id]
    );
    if (!current.rowCount) return fail('Record not found.', 404);

    const assigned = await pool.query(
      `SELECT 1 FROM lms_lecturer_programs WHERE lecturer_id = $1 AND program_id = $2 LIMIT 1`,
      [lecturer.id, programId]
    );
    if (!assigned.rowCount) return fail('This programme is not assigned to your account.', 403);

    if (unitId !== null) {
      const validUnit = await pool.query(
        `SELECT 1 FROM lms_units WHERE id = $1 AND program_id = $2 LIMIT 1`,
        [unitId, programId]
      );
      if (!validUnit.rowCount) return fail('The selected unit does not belong to this programme.');
    }

    const result = await pool.query(
      `UPDATE lms_records_of_work SET
        program_id=$1, unit_id=$2, program_name=$3, course_level=$4, unit_name=$5,
        trainer_name=$6, trainer_phone=$7, trainer_email=$8, competency_area=$9,
        intake=$10, student_count=$11, record_date=$12, record_time=$13,
        supervisor_name=$14, supervisor_signature=$15, entries=$16::jsonb,
        status=$17, updated_at=NOW()
       WHERE id=$18 AND lecturer_id=$19 RETURNING id, reference_number, status`,
      [programId, unitId, body.programName, body.courseLevel || '', body.unitName || '',
       body.trainerName, body.trainerPhone || '', body.trainerEmail || '', body.competencyArea || '',
       body.intake || '', body.studentCount ? Number(body.studentCount) : null,
       body.recordDate || null, body.recordTime || '', body.supervisorName || '',
       body.supervisorSignature || '', JSON.stringify(Array.isArray(body.entries) ? body.entries : []),
       body.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT', Number(id), lecturer.id]
    );
    return NextResponse.json({ success: true, record: result.rows[0] });
  } catch (error) {
    console.error('PUT lecturer record:', error);
    return fail('Unable to update this record.', 500);
  }
}
