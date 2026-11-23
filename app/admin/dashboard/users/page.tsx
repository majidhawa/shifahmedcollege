
'use client';

import { useEffect, useState } from 'react';

import {
  UserPlus,
  Users,
  ShieldCheck,
  GraduationCap,
  UserRound,
  Loader2,
  Trash2,
  Edit3,
  X,
  BookOpen,
  Check,
  UserRoundCheck,
  Link2,
  RefreshCw,
  Search,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type UserRole = 'admin' | 'lecturer' | 'parent';

type LinkedStudent = {
  application_id: number;
  student_name: string;
  admission_number: string | null;
  application_number: string | null;
  relationship: string | null;
};

type ParentContact = {
  application_id: number;
  application_number: string | null;
  student_name: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  contact_type: 'Guardian' | 'Sponsor';
};

type User = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at?: string;
  program_ids?: number[];
  programs?: Program[];
  linked_students?: LinkedStudent[];
};

type Program = {
  id: number;
  name: string;
  code: string | null;
  description?: string | null;
  duration?: string | null;
  level?: string | null;
  status?: string | null;
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  programIds: number[];
};

const initialForm: FormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'lecturer',
  programIds: [],
};

/* =========================================================
   PAGE
========================================================= */

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(initialForm);

  /* =====================================================
     PARENT CONTACT STATES
  ===================================================== */

  const [parentContacts, setParentContacts] = useState<ParentContact[]>([]);
  const [loadingParentContacts, setLoadingParentContacts] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [showParentContacts, setShowParentContacts] = useState(false);
  const [selectedParentContact, setSelectedParentContact] =
    useState<ParentContact | null>(null);

  /* =====================================================
     LOAD USERS
  ===================================================== */

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/users', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load users.');
      }

      setUsers(
        Array.isArray(data.users)
          ? data.users.map((user: User) => ({
              ...user,
              linked_students: Array.isArray(user.linked_students)
                ? user.linked_students
                : [],
              program_ids: Array.isArray(user.program_ids)
                ? user.program_ids.map(Number)
                : [],
              programs: Array.isArray(user.programs)
                ? user.programs
                : [],
              email: user.email || null,
              phone: user.phone || null,
            }))
          : []
      );
    } catch (error) {
      console.error('LOAD USERS ERROR:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load users.'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     LOAD PROGRAMS
  ===================================================== */

  async function loadPrograms() {
    try {
      setLoadingPrograms(true);

      const response = await fetch('/api/admin/users/programs', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load courses.');
      }

      setPrograms(
        Array.isArray(data.programs) ? data.programs : []
      );
    } catch (error) {
      console.error('LOAD PROGRAMS ERROR:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load courses.'
      );
    } finally {
      setLoadingPrograms(false);
    }
  }

  /* =====================================================
     SEARCH PARENT / GUARDIAN / SPONSOR CONTACTS
  ===================================================== */

  async function searchParentContacts(search = '') {
    try {
      setLoadingParentContacts(true);
      setError('');
      setShowParentContacts(true);

      const response = await fetch(
        `/api/admin/users/parent-contacts?q=${encodeURIComponent(search)}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to load parent contacts.'
        );
      }

      setParentContacts(
        Array.isArray(data.contacts) ? data.contacts : []
      );
    } catch (error) {
      console.error('PARENT CONTACT SEARCH ERROR:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load parent contacts.'
      );

      setParentContacts([]);
    } finally {
      setLoadingParentContacts(false);
    }
  }

  /* =====================================================
     SELECT PARENT CONTACT
  ===================================================== */

  function selectParentContact(contact: ParentContact) {
    setSelectedParentContact(contact);

    setForm((current) => ({
      ...current,
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
    }));

    setParentSearch(contact.name);
    setShowParentContacts(false);
    setError('');
  }

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadUsers();
    loadPrograms();
  }, []);

  /* =====================================================
     RESET PARENT CONTACT SELECTOR
  ===================================================== */

  function resetParentSelector() {
    setParentContacts([]);
    setParentSearch('');
    setSelectedParentContact(null);
    setShowParentContacts(false);
    setLoadingParentContacts(false);
  }

  /* =====================================================
     OPEN ADD MODAL
  ===================================================== */

  function openAddModal() {
    setEditingUser(null);
    setForm({ ...initialForm });

    resetParentSelector();

    setError('');
    setSuccess('');
    setShowModal(true);
  }

  /* =====================================================
     OPEN EDIT MODAL
  ===================================================== */

  function openEditModal(user: User) {
    setEditingUser(user);

    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.role,
      programIds: Array.isArray(user.program_ids)
        ? user.program_ids.map(Number)
        : [],
    });

    resetParentSelector();

    setError('');
    setSuccess('');
    setShowModal(true);
  }

  /* =====================================================
     CLOSE MODAL
  ===================================================== */

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingUser(null);
    setForm({ ...initialForm });

    resetParentSelector();

    setError('');
    setSuccess('');
  }

  /* =====================================================
     FORM CHANGE
  ===================================================== */

  function updateForm(
    field: keyof FormData,
    value: string | number[]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* =====================================================
     TOGGLE COURSE
  ===================================================== */

  function toggleProgram(programId: number) {
    setForm((current) => {
      const exists = current.programIds.includes(programId);

      return {
        ...current,
        programIds: exists
          ? current.programIds.filter((id) => id !== programId)
          : [...current.programIds, programId],
      };
    });
  }

  /* =====================================================
     REMOVE COURSE
  ===================================================== */

  function removeProgram(programId: number) {
    setForm((current) => ({
      ...current,
      programIds: current.programIds.filter(
        (id) => id !== programId
      ),
    }));
  }

  /* =====================================================
     SAVE USER
  ===================================================== */

  async function saveUser(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!form.name.trim()) {
        throw new Error('Full name is required.');
      }

      if (form.role !== 'parent' && !form.email.trim()) {
        throw new Error(
          'Email address is required for administrators and lecturers.'
        );
      }

      if (!editingUser && !form.password.trim()) {
        throw new Error('Password is required.');
      }

      if (form.password && form.password.length < 8) {
        throw new Error(
          'Password must be at least 8 characters.'
        );
      }

      if (
        form.role === 'lecturer' &&
        form.programIds.length === 0
      ) {
        throw new Error(
          'Please assign at least one course to this lecturer.'
        );
      }

      if (
        form.role === 'parent' &&
        !form.phone.trim() &&
        !form.email.trim()
      ) {
        throw new Error(
          'Please provide at least a phone number or an email address for the parent.'
        );
      }

      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';

      const method = editingUser ? 'PATCH' : 'POST';

      const body: {
        name: string;
        email: string | null;
        phone: string;
        role: UserRole;
        password?: string;
        programIds: number[];
      } = {
        name: form.name.trim(),
        email: form.email.trim()
          ? form.email.trim().toLowerCase()
          : null,
        phone: form.phone.trim(),
        role: form.role,
        programIds:
          form.role === 'lecturer' ? form.programIds : [],
      };

      if (!editingUser || form.password.trim()) {
        body.password = form.password.trim();
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to save user.'
        );
      }

      setSuccess(
        editingUser
          ? 'User updated successfully.'
          : 'User created successfully.'
      );

      await loadUsers();

      window.setTimeout(() => {
        setShowModal(false);
        setEditingUser(null);
        setForm({ ...initialForm });
        resetParentSelector();
        setSuccess('');
      }, 900);
    } catch (error) {
      console.error('SAVE USER ERROR:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Unable to save user.'
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     DELETE USER
  ===================================================== */

  async function deleteUser(user: User) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${user.name}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(user.id);
      setError('');
      setSuccess('');

      const response = await fetch(
        `/api/admin/users/${user.id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to delete user.'
        );
      }

      setSuccess('User deleted successfully.');

      await loadUsers();
    } catch (error) {
      console.error('DELETE USER ERROR:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Unable to delete user.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =====================================================
     ROLE ICON
  ===================================================== */

  function RoleIcon({ role }: { role: UserRole }) {
    if (role === 'admin') {
      return <ShieldCheck className="h-4 w-4" />;
    }

    if (role === 'lecturer') {
      return <GraduationCap className="h-4 w-4" />;
    }

    return <UserRound className="h-4 w-4" />;
  }

  /* =====================================================
     ROLE LABEL
  ===================================================== */

  function roleLabel(role: UserRole) {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'lecturer':
        return 'Lecturer';
      case 'parent':
        return 'Parent';
      default:
        return role;
    }
  }

  /* =====================================================
     LINKED STUDENTS
  ===================================================== */

  function LinkedStudents({ user }: { user: User }) {
    if (user.role !== 'parent') {
      return (
        <span className="text-xs text-slate-400">—</span>
      );
    }

    const students = user.linked_students || [];

    if (students.length === 0) {
      return (
        <div className="min-w-[170px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <Link2 className="h-3.5 w-3.5" />
            No students linked
          </span>

          <p className="mt-1 text-[11px] text-slate-400">
            {user.active
              ? 'Awaiting student association'
              : 'Parent account inactive'}
          </p>
        </div>
      );
    }

    return (
      <div className="min-w-[220px] max-w-[320px] space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
            <UserRoundCheck className="h-3.5 w-3.5" />
            {students.length}{' '}
            {students.length === 1 ? 'Student' : 'Students'}
          </span>
        </div>

        {students.map((student, index) => (
          <div
            key={`${student.application_id}-${index}`}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <p className="text-xs font-bold text-brand-dark">
              {student.student_name || 'Unnamed student'}
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              {student.admission_number ||
                student.application_number ||
                `Application ID: ${student.application_id}`}
            </p>

            {student.relationship && (
              <p className="mt-1 text-[10px] font-semibold capitalize text-brand-green">
                {student.relationship}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalUsers = users.length;

  const adminCount = users.filter(
    (user) => user.role === 'admin'
  ).length;

  const lecturerCount = users.filter(
    (user) => user.role === 'lecturer'
  ).length;

  const parentCount = users.filter(
    (user) => user.role === 'parent'
  ).length;

  const activeCount = users.filter(
    (user) => user.active
  ).length;

  const linkedParentCount = users.filter(
    (user) =>
      user.role === 'parent' &&
      (user.linked_students?.length || 0) > 0
  ).length;

  const unlinkedParentCount =
    parentCount - linkedParentCount;

  const totalLinkedStudents = users
    .filter((user) => user.role === 'parent')
    .reduce(
      (total, user) =>
        total + (user.linked_students?.length || 0),
      0
    );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-bold text-brand-dark sm:text-3xl">
              Manage Users
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Create and manage LMS accounts for administrators,
              lecturers and parents. Monitor parent-to-student
              associations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                loadUsers();
                loadPrograms();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        {/* ALERTS */}

        {error && !showModal && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && !showModal && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {/* STATISTICS */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green/10">
                <Users className="h-5 w-5 text-brand-green" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="mt-1 text-2xl font-bold text-brand-dark">
                  {totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50">
                <ShieldCheck className="h-5 w-5 text-green-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Administrators</p>
                <p className="mt-1 text-2xl font-bold text-brand-dark">
                  {adminCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Lecturers</p>
                <p className="mt-1 text-2xl font-bold text-brand-dark">
                  {lecturerCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50">
                <UserRound className="h-5 w-5 text-purple-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Parents</p>
                <p className="mt-1 text-2xl font-bold text-brand-dark">
                  {parentCount}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* PARENT LINKING SUMMARY */}

        {!loading && parentCount > 0 && (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                <Link2 className="h-5 w-5 text-purple-600" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-brand-dark">
                  Parent–Student Connections
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Overview of parent accounts connected to student applications.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Linked Parents</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {linkedParentCount}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Unlinked Parents</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {unlinkedParentCount}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Linked Student Records
                </p>
                <p className="mt-1 text-2xl font-bold text-brand-dark">
                  {totalLinkedStudents}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT STATUS */}

        {!loading && totalUsers > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-brand-dark">
                  Account Status
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Currently active system accounts
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {activeCount}
                </p>

                <p className="text-xs text-slate-500">
                  of {totalUsers} active
                </p>
              </div>
            </div>
          </div>
        )}

        {/* USERS TABLE */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-brand-dark">
              System Users
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              User accounts, lecturer course assignments and parent–student links.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-green" />

                <p className="mt-3 text-sm text-slate-500">
                  Loading users...
                </p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <Users className="h-12 w-12 text-slate-200" />

              <h3 className="mt-4 text-sm font-bold text-brand-dark">
                No users found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create your first LMS user.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
              >
                Add User
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1350px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      User
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Role
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Courses
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Linked Students
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Phone
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr
                      key={`${user.role}-${user.id}`}
                      className="transition hover:bg-slate-50"
                    >
                      {/* USER */}

                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-brand-dark">
                          {user.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {user.email || 'No email provided'}
                        </p>
                      </td>

                      {/* ROLE */}

                      <td className="px-5 py-4">
                        <span
                          className={`
                            inline-flex items-center gap-1.5
                            rounded-full px-3 py-1
                            text-xs font-bold
                            ${
                              user.role === 'admin'
                                ? 'bg-green-50 text-green-700'
                                : user.role === 'lecturer'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-purple-50 text-purple-700'
                            }
                          `}
                        >
                          <RoleIcon role={user.role} />
                          {roleLabel(user.role)}
                        </span>
                      </td>

                      {/* COURSES */}

                      <td className="px-5 py-4">
                        {user.role !== 'lecturer' ? (
                          <span className="text-xs text-slate-400">
                            —
                          </span>
                        ) : user.programs &&
                          user.programs.length > 0 ? (
                          <div className="flex max-w-[260px] flex-wrap gap-1.5">
                            {user.programs.map((program) => (
                              <span
                                key={program.id}
                                className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green"
                              >
                                <BookOpen className="h-3 w-3" />
                                {program.code || program.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-amber-600">
                            No courses assigned
                          </span>
                        )}
                      </td>

                      {/* LINKED STUDENTS */}

                      <td className="px-5 py-4 align-top">
                        <LinkedStudents user={user} />
                      </td>

                      {/* PHONE */}

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {user.phone || '—'}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <span
                          className={`
                            inline-flex rounded-full
                            px-3 py-1 text-xs font-bold
                            ${
                              user.active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            }
                          `}
                        >
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            disabled={deletingId !== null}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-brand-green transition hover:border-brand-green/30 hover:bg-brand-green/5 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteUser(user)}
                            disabled={deletingId === user.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === user.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}

                            {deletingId === user.id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          ADD / EDIT USER MODAL
      =================================================== */}

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-brand-dark">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingUser
                    ? 'Update this LMS user and manage course assignments.'
                    : 'Create a new LMS user and assign courses if they are a lecturer.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={saveUser}
              className="space-y-5 px-6 py-6"
            >

              {/* NAME */}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Full Name *
                </label>

                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) =>
                    updateForm('name', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
                  placeholder="Enter full name"
                />
              </div>

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email Address{' '}
                  {form.role !== 'parent' ? '*' : '(Optional)'}
                </label>

                <input
                  type="email"
                  required={form.role !== 'parent'}
                  value={form.email}
                  onChange={(event) =>
                    updateForm('email', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
                  placeholder={
                    form.role === 'parent'
                      ? 'Optional — parent@example.com'
                      : 'user@example.com'
                  }
                />

                {form.role === 'parent' && (
                  <p className="mt-2 text-xs text-slate-400">
                    Parents without an email address can register using
                    their phone number.
                  </p>
                )}
              </div>

              {/* PHONE */}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Phone Number
                  {form.role === 'parent' ? ' *' : ''}
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateForm('phone', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
                  placeholder="07XXXXXXXX"
                />

                {form.role === 'parent' && (
                  <p className="mt-2 text-xs text-slate-400">
                    Provide at least a phone number or email address.
                    The phone number should match the guardian or sponsor
                    details in the student's application.
                  </p>
                )}
              </div>

              {/* ROLE */}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  User Role *
                </label>

                <select
                  required
                  value={form.role}
                  onChange={(event) => {
                    const role = event.target.value as UserRole;

                    setForm((current) => ({
                      ...current,
                      role,
                      programIds:
                        role === 'lecturer'
                          ? current.programIds
                          : [],
                    }));

                    resetParentSelector();
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
                >
                  <option value="admin">Administrator</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              {/* ADMIN INFORMATION */}

              {form.role === 'admin' && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />

                    <div>
                      <h3 className="text-sm font-bold text-green-900">
                        Administrator Account
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-green-800">
                        Administrator accounts have elevated system
                        permissions. Only assign this role to trusted
                        personnel who require administrative access.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* COURSE ASSIGNMENT */}

              {form.role === 'lecturer' && (
                <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green/10">
                      <BookOpen className="h-5 w-5 text-brand-green" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-brand-dark">
                        Assign Courses
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Select one or more courses this lecturer will teach.
                      </p>
                    </div>
                  </div>

                  {/* SELECTED COURSES */}

                  {form.programIds.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Selected Courses ({form.programIds.length})
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {form.programIds.map((programId) => {
                          const program = programs.find(
                            (item) => item.id === programId
                          );

                          if (!program) return null;

                          return (
                            <span
                              key={program.id}
                              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-green shadow-sm ring-1 ring-brand-green/10"
                            >
                              <Check className="h-3.5 w-3.5" />

                              {program.code
                                ? `${program.code} — ${program.name}`
                                : program.name}

                              <button
                                type="button"
                                onClick={() =>
                                  removeProgram(program.id)
                                }
                                disabled={saving}
                                className="ml-1 rounded-full p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* COURSE LIST */}

                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Available Courses
                    </p>

                    {loadingPrograms ? (
                      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-green" />

                        <span className="ml-2 text-xs text-slate-500">
                          Loading courses...
                        </span>
                      </div>
                    ) : programs.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-xs font-medium text-amber-700">
                        No courses are currently available in the LMS.
                      </div>
                    ) : (
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                        {programs.map((program) => {
                          const selected = form.programIds.includes(
                            program.id
                          );

                          return (
                            <button
                              type="button"
                              key={program.id}
                              onClick={() =>
                                toggleProgram(program.id)
                              }
                              disabled={saving}
                              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                selected
                                  ? 'border-brand-green/30 bg-brand-green/5'
                                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                  selected
                                    ? 'border-brand-green bg-brand-green text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {selected && (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-brand-dark">
                                  {program.name}
                                </span>

                                <span className="mt-0.5 block text-xs text-slate-400">
                                  {[
                                    program.code,
                                    program.level,
                                    program.duration,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {form.programIds.length === 0 && (
                    <p className="mt-3 text-xs font-medium text-amber-600">
                      At least one course must be assigned to a lecturer.
                    </p>
                  )}
                </div>
              )}

              {/* =================================================
                  PARENT CONTACT SELECTOR
              ================================================= */}

              {form.role === 'parent' && (
                <div className="space-y-4">

                  {/* SEARCH CONTACTS */}

                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                        <Search className="h-5 w-5 text-purple-700" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-purple-900">
                          Find Parent / Guardian / Sponsor
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-purple-800">
                          Search existing student application records
                          to find a guardian or sponsor. Selecting a
                          contact automatically fills in their details.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="search"
                          value={parentSearch}
                          onChange={(event) => {
                            setParentSearch(event.target.value);
                            setShowParentContacts(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              searchParentContacts(parentSearch.trim());
                            }
                          }}
                          disabled={saving}
                          placeholder="Search by name, phone or email..."
                          className="w-full rounded-xl border border-purple-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          searchParentContacts(parentSearch.trim())
                        }
                        disabled={
                          loadingParentContacts ||
                          saving ||
                          !parentSearch.trim()
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loadingParentContacts ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}

                        Search
                      </button>
                    </div>

                    {/* SEARCH RESULTS */}

                    {showParentContacts && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-purple-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                          <p className="text-xs font-bold text-slate-700">
                            Search Results
                          </p>

                          <button
                            type="button"
                            onClick={() => setShowParentContacts(false)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {loadingParentContacts ? (
                          <div className="flex items-center justify-center gap-2 px-4 py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />

                            <span className="text-xs text-slate-500">
                              Searching application contacts...
                            </span>
                          </div>
                        ) : parentContacts.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <UserRound className="mx-auto h-8 w-8 text-slate-300" />

                            <p className="mt-2 text-sm font-bold text-slate-700">
                              No contacts found
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Try another name, phone number or email address.
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                            {parentContacts.map((contact, index) => (
                              <button
                                type="button"
                                key={`${contact.application_id}-${contact.contact_type}-${index}`}
                                onClick={() =>
                                  selectParentContact(contact)
                                }
                                disabled={saving}
                                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-purple-50 disabled:opacity-50"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100">
                                  <UserRound className="h-4 w-4 text-purple-700" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-bold text-brand-dark">
                                      {contact.name || 'Unnamed contact'}
                                    </p>

                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                        contact.contact_type === 'Guardian'
                                          ? 'bg-blue-50 text-blue-700'
                                          : 'bg-amber-50 text-amber-700'
                                      }`}
                                    >
                                      {contact.contact_type}
                                    </span>
                                  </div>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {contact.phone || 'No phone provided'}
                                    {contact.email
                                      ? ` • ${contact.email}`
                                      : ''}
                                  </p>

                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Student: {contact.student_name || 'Unknown'}
                                    {contact.application_number
                                      ? ` • ${contact.application_number}`
                                      : ` • Application ID: ${contact.application_id}`}
                                  </p>

                                  {contact.relationship && (
                                    <p className="mt-1 text-[11px] font-semibold capitalize text-purple-700">
                                      Relationship: {contact.relationship}
                                    </p>
                                  )}
                                </div>

                                <div className="shrink-0 self-center">
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700">
                                    Select
                                    <Check className="h-4 w-4" />
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SELECTED CONTACT */}

                    {selectedParentContact && (
                      <div className="mt-4 rounded-xl border border-green-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                              <Check className="h-5 w-5 text-green-700" />
                            </div>

                            <div>
                              <p className="text-xs font-bold text-green-800">
                                Contact Selected
                              </p>

                              <p className="mt-1 text-sm font-bold text-brand-dark">
                                {selectedParentContact.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {selectedParentContact.contact_type}
                                {selectedParentContact.relationship
                                  ? ` • ${selectedParentContact.relationship}`
                                  : ''}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Student: {selectedParentContact.student_name}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-400">
                                Application ID: {selectedParentContact.application_id}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedParentContact(null);
                              setParentSearch('');
                              setParentContacts([]);
                              setShowParentContacts(false);
                            }}
                            disabled={saving}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Clear selected contact"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="mt-3 border-t border-green-100 pt-3 text-[11px] leading-5 text-green-700">
                          Contact details have been populated below.
                          You can still edit them before creating the account.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* PARENT ACCOUNT INFORMATION */}

                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                    <div className="flex items-start gap-3">
                      <UserRoundCheck className="mt-0.5 h-5 w-5 shrink-0 text-purple-700" />

                      <div>
                        <h3 className="text-sm font-bold text-purple-900">
                          Parent Account
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-purple-800">
                          Parent accounts are associated with student
                          applications using matching contact details.
                          An email address is not compulsory. A matching
                          phone number can identify the parent from
                          guardian or sponsor information supplied
                          during student application.
                        </p>
                      </div>
                    </div>

                    {editingUser && (
                      <div className="mt-3 border-t border-purple-200 pt-3">
                        <p className="text-xs font-semibold text-purple-900">
                          Currently linked students:{' '}
                          {editingUser.linked_students?.length || 0}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PASSWORD */}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {editingUser ? 'New Password' : 'Password *'}
                </label>

                <input
                  type="password"
                  required={!editingUser}
                  value={form.password}
                  onChange={(event) =>
                    updateForm('password', event.target.value)
                  }
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
                  placeholder={
                    editingUser
                      ? 'Leave blank to keep current password'
                      : 'Minimum 8 characters'
                  }
                />

                {editingUser && (
                  <p className="mt-2 text-xs text-slate-400">
                    Leave this field blank if you do not want to change
                    the current password.
                  </p>
                )}
              </div>

              {/* ALERTS */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || loadingPrograms}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
