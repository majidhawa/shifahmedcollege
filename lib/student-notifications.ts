import pool from '@/lib/db';

export type StudentNotificationType =
  | 'general'
  | 'announcement'
  | 'admission'
  | 'payment'
  | 'document'
  | 'lesson'
  | 'assignment'
  | 'quiz'
  | 'result'
  | 'timetable'
  | 'system';

export type CreateStudentNotificationInput = {
  applicationId: number;
  title: string;
  message: string;
  type?: StudentNotificationType;
  link?: string | null;
  createdBy?: number | null;
};

export type StudentNotification = {
  id: number;
  applicationId: number;
  title: string;
  message: string;
  type: StudentNotificationType;
  link: string | null;
  isRead: boolean;
  createdBy: number | null;
  createdAt: Date;
  readAt: Date | null;
};

const ALLOWED_TYPES: StudentNotificationType[] = [
  'general',
  'announcement',
  'admission',
  'payment',
  'document',
  'lesson',
  'assignment',
  'quiz',
  'result',
  'timetable',
  'system',
];

function normalizeType(
  type: StudentNotificationType | undefined
): StudentNotificationType {
  if (!type) {
    return 'general';
  }

  if (!ALLOWED_TYPES.includes(type)) {
    return 'general';
  }

  return type;
}

function normalizeNullableString(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function validateApplicationId(applicationId: number): void {
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    throw new Error('Invalid student application ID.');
  }
}

function validateTitle(title: string): string {
  const trimmed = title.trim();

  if (!trimmed) {
    throw new Error('Notification title is required.');
  }

  if (trimmed.length > 255) {
    throw new Error(
      'Notification title must not exceed 255 characters.'
    );
  }

  return trimmed;
}

function validateMessage(message: string): string {
  const trimmed = message.trim();

  if (!trimmed) {
    throw new Error('Notification message is required.');
  }

  return trimmed;
}

function validateCreatedBy(
  createdBy: number | null | undefined
): number | null {
  if (createdBy === null || createdBy === undefined) {
    return null;
  }

  if (!Number.isInteger(createdBy) || createdBy <= 0) {
    throw new Error('Invalid notification creator ID.');
  }

  return createdBy;
}

/**
 * Creates one notification for one student.
 *
 * This function is intended for trusted server-side code only.
 * Students should never be allowed to call this function directly
 * from a client component or public API endpoint.
 */
export async function createStudentNotification(
  input: CreateStudentNotificationInput
): Promise<StudentNotification> {
  validateApplicationId(input.applicationId);

  const title = validateTitle(input.title);
  const message = validateMessage(input.message);
  const type = normalizeType(input.type);
  const link = normalizeNullableString(input.link);
  const createdBy = validateCreatedBy(input.createdBy);

  const result = await pool.query<{
    id: number;
    application_id: number;
    title: string;
    message: string;
    type: StudentNotificationType;
    link: string | null;
    is_read: boolean;
    created_by: number | null;
    created_at: Date;
    read_at: Date | null;
  }>(
    `
      INSERT INTO lms_student_notifications (
        application_id,
        title,
        message,
        type,
        link,
        is_read,
        created_by,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, FALSE, $6, CURRENT_TIMESTAMP)
      RETURNING
        id,
        application_id,
        title,
        message,
        type,
        link,
        is_read,
        created_by,
        created_at,
        read_at
    `,
    [
      input.applicationId,
      title,
      message,
      type,
      link,
      createdBy,
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to create student notification.');
  }

  return {
    id: row.id,
    applicationId: row.application_id,
    title: row.title,
    message: row.message,
    type: row.type,
    link: row.link,
    isRead: row.is_read,
    createdBy: row.created_by,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/**
 * Creates the same notification for multiple students.
 *
 * Useful later for announcements such as:
 * "Tomorrow's classes will begin at 9:00 AM."
 */
export async function createStudentNotifications(
  applicationIds: number[],
  notification: Omit<
    CreateStudentNotificationInput,
    'applicationId'
  >
): Promise<StudentNotification[]> {
  const uniqueApplicationIds = [
    ...new Set(
      applicationIds.filter(
        (id): id is number =>
          Number.isInteger(id) && id > 0
      )
    ),
  ];

  if (uniqueApplicationIds.length === 0) {
    return [];
  }

  const createdNotifications: StudentNotification[] = [];

  for (const applicationId of uniqueApplicationIds) {
    const created = await createStudentNotification({
      applicationId,
      ...notification,
    });

    createdNotifications.push(created);
  }

  return createdNotifications;
}