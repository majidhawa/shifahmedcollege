import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Lecturer = { id: number | string; name?: string; email?: string; phone?: string };
type WorkEntry = { date: string; topic: string; subTopic: string; remarks: string };

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

async function getAuthenticatedLecturer(): Promise<Lecturer | null> {
  const lecturer = await requireLecturer();
  return lecturer ? (lecturer as Lecturer) : null;
}

export async function GET(request: NextRequest) {
  try {
    const lecturer = await getAuthenticatedLecturer();
    if (!lecturer) return fail('Unauthorized', 401);

    const programId = request.nextUrl.searchParams.get('programId');

    if (programId) {
      const parsedProgramId = Number(programId);
      if (!Number.isInteger(parsedProgramId) || parsedProgramId <= 0) {
        return fail('Invalid programme selected.');
      }

      const assigned = await pool.query(
        `SELECT 1
         FROM lms_programs p
         WHERE p.id = $2 AND (
           EXISTS (SELECT 1 FROM lms_lecturer_programs lp WHERE lp.lecturer_id = $1 AND lp.program_id = p.id)
           OR EXISTS (SELECT 1 FROM lms_lecturer_units lu INNER JOIN lms_units u ON u.id = lu.unit_id WHERE lu.lecturer_id = $1 AND u.program_id = p.id)
         ) LIMIT 1`,
        [lecturer.id, parsedProgramId]
      );
      if (!assigned.rowCount) return fail('This programme is not assigned to your account.', 403);

      const units = await pool.query(
        `SELECT u.id,
                COALESCE(to_jsonb(u)->>'name', to_jsonb(u)->>'unit_name', to_jsonb(u)->>'title', 'Unit ' || u.id::text) AS name
         FROM lms_units u
         WHERE u.program_id = $1
           AND (
             EXISTS (SELECT 1 FROM lms_lecturer_units lu WHERE lu.lecturer_id = $2 AND lu.unit_id = u.id)
             OR EXISTS (SELECT 1 FROM lms_lecturer_programs lp WHERE lp.lecturer_id = $2 AND lp.program_id = u.program_id)
           )
         ORDER BY name`,
        [parsedProgramId, lecturer.id]
      );
      return NextResponse.json({ success: true, units: units.rows });
    }

    const [programs, records] = await Promise.all([
      pool.query(
        `SELECT DISTINCT p.id,
                COALESCE(to_jsonb(p)->>'name', to_jsonb(p)->>'program_name', to_jsonb(p)->>'title', 'Programme ' || p.id::text) AS name,
                COALESCE(to_jsonb(p)->>'level', to_jsonb(p)->>'course_level', '') AS level
         FROM lms_programs p
         WHERE EXISTS (SELECT 1 FROM lms_lecturer_programs lp WHERE lp.lecturer_id = $1 AND lp.program_id = p.id)
            OR EXISTS (SELECT 1 FROM lms_lecturer_units lu INNER JOIN lms_units u ON u.id = lu.unit_id WHERE lu.lecturer_id = $1 AND u.program_id = p.id)
         ORDER BY name`,
        [lecturer.id]
      ),
      pool.query(
        `SELECT id, reference_number, program_name, unit_name, competency_area,
                intake, status, created_at, updated_at
         FROM lms_records_of_work
         WHERE lecturer_id = $1
         ORDER BY updated_at DESC`,
        [lecturer.id]
      ),
    ]);

    return NextResponse.json({ success: true, programs: programs.rows, records: records.rows });
  } catch (error) {
    console.error('GET lecturer records of work:', error);
    return fail('Unable to load records of work.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const lecturer = await getAuthenticatedLecturer();
    if (!lecturer) return fail('Unauthorized', 401);

    const body = await request.json();
    const programId = Number(body.programId);
    const unitId = body.unitId ? Number(body.unitId) : null;
    const trainerName = String(body.trainerName || lecturer.name || '').trim();
    const programName = String(body.programName || '').trim();
    const unitName = String(body.unitName || '').trim();
    const entries: WorkEntry[] = Array.isArray(body.entries) ? body.entries : [];

    if (!Number.isInteger(programId) || programId <= 0) return fail('Select a valid assigned programme.');
    if (!trainerName || !programName) return fail('Trainer name and programme are required.');
    if (unitId !== null && (!Number.isInteger(unitId) || unitId <= 0)) return fail('Invalid unit selected.');

    const assigned = await pool.query(
      `SELECT 1 FROM lms_programs p
       WHERE p.id = $2 AND (
         EXISTS (SELECT 1 FROM lms_lecturer_programs lp WHERE lp.lecturer_id = $1 AND lp.program_id = p.id)
         OR ($3::integer IS NOT NULL AND EXISTS (SELECT 1 FROM lms_lecturer_units lu WHERE lu.lecturer_id = $1 AND lu.unit_id = $3))
       ) LIMIT 1`,
      [lecturer.id, programId, unitId]
    );
    if (!assigned.rowCount) return fail('You cannot create a record for an unassigned programme.', 403);

    if (unitId !== null) {
      const validUnit = await pool.query(
        `SELECT 1 FROM lms_units u
         WHERE u.id = $1 AND u.program_id = $2
           AND (
             EXISTS (SELECT 1 FROM lms_lecturer_units lu WHERE lu.lecturer_id = $3 AND lu.unit_id = u.id)
             OR EXISTS (SELECT 1 FROM lms_lecturer_programs lp WHERE lp.lecturer_id = $3 AND lp.program_id = u.program_id)
           ) LIMIT 1`,
        [unitId, programId, lecturer.id]
      );
      if (!validUnit.rowCount) return fail('The selected unit does not belong to this programme.');
    }

    const year = new Date().getFullYear();
    const sequenceResult = await pool.query(`SELECT nextval('lms_records_of_work_ref_seq')::int AS sequence`);
    const reference = `SMTC/RWC/${year}/${String(sequenceResult.rows[0].sequence).padStart(3, '0')}`;

    const result = await pool.query(
      `INSERT INTO lms_records_of_work
       (reference_number, lecturer_id, program_id, unit_id, program_name, course_level, unit_name,
        trainer_name, trainer_phone, trainer_email, competency_area, intake, student_count,
        record_date, record_time, supervisor_name, supervisor_signature, entries, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NULLIF($15,''),$16,$17,$18::jsonb,$19)
       RETURNING id, reference_number`,
      [
        reference, lecturer.id, programId, unitId, programName, body.courseLevel || '', unitName,
        trainerName, body.trainerPhone || lecturer.phone || '', body.trainerEmail || lecturer.email || '',
        body.competencyArea || '', body.intake || '', body.studentCount ? Number(body.studentCount) : null,
        body.recordDate || null, body.recordTime || '', body.supervisorName || '', body.supervisorSignature || '',
        JSON.stringify(entries), body.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
      ]
    );

    return NextResponse.json({ success: true, record: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST lecturer record of work:', error);
    return fail('Unable to save the record. Check that the Records of Work database migration has been run.', 500);
  }
}
