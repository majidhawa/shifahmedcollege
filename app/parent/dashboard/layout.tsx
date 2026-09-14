import { redirect } from 'next/navigation';

import {
  getParentSession,
} from '@/lib/parent-auth';

import {
  getParentDashboardData,
} from '@/lib/parent-dashboard';

import ParentDashboardShell from '@/components/parent/ParentDashboardShell';

export default async function ParentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session =
    await getParentSession();

  if (!session) {
    redirect('/parent/login');
  }

  const dashboardData =
    await getParentDashboardData(
      session.parentId
    );

  if (!dashboardData) {
    redirect('/parent/login');
  }

  const parent =
    dashboardData.parent;

  const student =
    dashboardData.student;

  const parentName =
    parent.name?.trim() ||
    'Parent';

  const studentName = student
    ? [
        student.first_name,
        student.middle_name,
        student.surname,
      ]
        .filter(
          (
            value: string | null
          ): value is string =>
            Boolean(
              value &&
                value.trim()
            )
        )
        .join(' ') || 'Student'
    : 'No Linked Student';

  const applicationNumber =
    student?.application_number ||
    'Application';

  const parentInitial =
    parentName
      .charAt(0)
      .toUpperCase() || 'P';

  const studentInitial =
    studentName
      .charAt(0)
      .toUpperCase() || 'S';

  return (
    <ParentDashboardShell
      parentName={parentName}
      studentName={studentName}
      applicationNumber={applicationNumber}
      parentInitial={parentInitial}
      studentInitial={studentInitial}
    >
      {children}
    </ParentDashboardShell>
  );
}