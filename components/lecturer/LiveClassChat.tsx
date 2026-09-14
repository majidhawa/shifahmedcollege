'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type Message = {
  id: number;
  liveClassId: number;
  applicationId: number | null;
  userId: number | null;
  senderName: string;
  senderRole: 'lecturer' | 'student';
  message: string;
  messageType: string;
  createdAt: string | null;
  deletedAt: string | null;
  deletedBy: number | null;
};

type ChatResponse = {
  success: boolean;
  chatEnabled?: boolean;
  messages?: Message[];
  count?: number;
  message?: string;
  error?: string;
  class?: {
    id: number;
    title: string;
    status: string;
    isLocked: boolean;
  };
};

/*
 * The API uses "message" for the actual Message object
 * on successful POST requests, while it uses "message"
 * as a string for errors.
 *
 * This discriminated union allows TypeScript to correctly
 * understand both responses.
 */
type SendResponse =
  | {
      success: true;
      message?: Message;
    }
  | {
      success: false;
      message?: string;
      error?: string;
    };

type DeleteResponse = {
  success: boolean;
  messageId?: number;
  message?: string;
  error?: string;
};

type LiveClassChatProps = {
  classId: number | string;
  chatEnabled?: boolean;
  currentLecturerName?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function formatMessageTime(
  value: string | null,
): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mergeMessages(
  existing: Message[],
  incoming: Message[],
): Message[] {
  const map = new Map<number, Message>();

  for (const message of existing) {
    map.set(message.id, message);
  }

  for (const message of incoming) {
    map.set(message.id, message);
  }

  return Array.from(map.values()).sort(
    (a, b) => a.id - b.id,
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function LiveClassChat({
  classId,
  chatEnabled = true,
  currentLecturerName = 'Lecturer',
}: LiveClassChatProps) {
  const numericClassId = Number(classId);

  const [messages, setMessages] = useState<Message[]>(
    [],
  );

  const [messageText, setMessageText] =
    useState('');

  const [messageType, setMessageType] =
    useState<'text' | 'announcement'>(
      'text',
    );

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState('');

  const [serverChatEnabled, setServerChatEnabled] =
    useState(chatEnabled);

  const [isAtBottom, setIsAtBottom] =
    useState(true);

  const messagesContainerRef =
    useRef<HTMLDivElement | null>(null);

  const pollingRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

  const inputRef =
    useRef<HTMLTextAreaElement | null>(null);

  /* =======================================================
     FETCH MESSAGES
  ======================================================= */

  const fetchMessages = useCallback(
    async (
      showLoading = false,
    ) => {
      if (
        !Number.isInteger(numericClassId) ||
        numericClassId <= 0
      ) {
        setError(
          'Invalid live class ID.',
        );

        setLoading(false);

        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const response =
          await fetch(
            `/api/lecturer/live-classes/${numericClassId}/messages?limit=200`,
            {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            },
          );

        let data: ChatResponse;

        try {
          data =
            (await response.json()) as ChatResponse;
        } catch {
          throw new Error(
            'The server returned an invalid response.',
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              data.error ||
              'Unable to load classroom chat.',
          );
        }

        setMessages((previous) =>
          mergeMessages(
            previous,
            data.messages || [],
          ),
        );

        setServerChatEnabled(
          data.chatEnabled !== false,
        );

        setError('');
      } catch (fetchError) {
        console.error(
          'LECTURER CHAT LOAD ERROR:',
          fetchError,
        );

        if (showLoading) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Unable to load classroom chat.',
          );
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [numericClassId],
  );

  /* =======================================================
     INITIAL LOAD + POLLING
  ======================================================= */

  useEffect(() => {
    void fetchMessages(true);

    pollingRef.current =
      setInterval(() => {
        void fetchMessages(false);
      }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(
          pollingRef.current,
        );

        pollingRef.current = null;
      }
    };
  }, [fetchMessages]);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    if (!isAtBottom) {
      return;
    }

    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop =
      container.scrollHeight;
  }, [messages, isAtBottom]);

  /* =======================================================
     SCROLL HANDLER
  ======================================================= */

  const handleScroll = () => {
    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    setIsAtBottom(
      distanceFromBottom < 80,
    );
  };

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  const handleSendMessage = async (
  event: FormEvent<HTMLFormElement>,
) => {
  event.preventDefault();

  const message = messageText.trim();

  if (!message) {
    return;
  }

  if (
    !Number.isInteger(numericClassId) ||
    numericClassId <= 0
  ) {
    setError('Invalid live class ID.');
    return;
  }

  if (!serverChatEnabled || !chatEnabled) {
    setError('Chat is currently disabled.');
    return;
  }

  if (message.length > 2000) {
    setError(
      'Message cannot exceed 2000 characters.',
    );
    return;
  }

  setSending(true);
  setError('');

  try {
    const response = await fetch(
      '/api/lecturer/live-classes/' +
        numericClassId +
        '/messages',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          messageType,
        }),
      },
    );

    const data: unknown = await response.json();

    if (!response.ok) {
      let errorMessage =
        'Unable to send message.';

      if (
        typeof data === 'object' &&
        data !== null
      ) {
        const responseData =
          data as {
            message?: unknown;
            error?: unknown;
          };

        if (
          typeof responseData.error ===
          'string'
        ) {
          errorMessage =
            responseData.error;
        } else if (
          typeof responseData.message ===
          'string'
        ) {
          errorMessage =
            responseData.message;
        }
      }

      throw new Error(errorMessage);
    }

    if (
      typeof data !== 'object' ||
      data === null
    ) {
      throw new Error(
        'Invalid response from the server.',
      );
    }

    const responseData =
      data as {
        success?: unknown;
        message?: unknown;
      };

    if (
      responseData.success !== true
    ) {
      throw new Error(
        'Unable to send message.',
      );
    }

    if (
      responseData.message &&
      typeof responseData.message ===
        'object'
    ) {
      const newMessage =
        responseData.message as Message;

      setMessages((previous) =>
        mergeMessages(
          previous,
          [newMessage],
        ),
      );
    }

    setMessageText('');
    setMessageType('text');
    setIsAtBottom(true);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  } catch (sendError) {
    console.error(
      'LECTURER CHAT SEND ERROR:',
      sendError,
    );

    setError(
      sendError instanceof Error
        ? sendError.message
        : 'Unable to send message.',
    );
  } finally {
    setSending(false);
  }
};
  /* =======================================================
     DELETE MESSAGE
  ======================================================= */

  const handleDeleteMessage = async (
    messageId: number,
  ) => {
    if (
      !Number.isInteger(messageId) ||
      messageId <= 0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'Delete this message from the classroom chat?',
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(messageId);
    setError('');

    try {
      const response =
        await fetch(
          `/api/lecturer/live-classes/${numericClassId}/messages`,
          {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              messageId,
            }),
          },
        );

      let data: DeleteResponse;

      try {
        data =
          (await response.json()) as DeleteResponse;
      } catch {
        throw new Error(
          'The server returned an invalid response.',
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            data.error ||
            'Unable to delete message.',
        );
      }

      setMessages((previous) =>
        previous.map((message) =>
          message.id === messageId
            ? {
                ...message,
                deletedAt:
                  new Date().toISOString(),
                deletedBy: null,
              }
            : message,
        ),
      );
    } catch (deleteError) {
      console.error(
        'LECTURER CHAT DELETE ERROR:',
        deleteError,
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete message.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =======================================================
     CHAT STATUS
  ======================================================= */

  const effectiveChatEnabled =
    serverChatEnabled &&
    chatEnabled;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-gray-900">
              Classroom Chat
            </h2>

            <span
              aria-label={
                effectiveChatEnabled
                  ? 'Chat enabled'
                  : 'Chat disabled'
              }
              className={`h-2.5 w-2.5 rounded-full ${
                effectiveChatEnabled
                  ? 'bg-emerald-500'
                  : 'bg-gray-400'
              }`}
            />
          </div>

          <p className="mt-0.5 text-xs text-gray-500">
            {effectiveChatEnabled
              ? `${messages.length} message${
                  messages.length === 1
                    ? ''
                    : 's'
                }`
              : 'Chat disabled'}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void fetchMessages(true)
          }
          disabled={loading}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Loading...'
            : 'Refresh'}
        </button>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div
          role="alert"
          className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      {/* =====================================================
          MESSAGES
      ===================================================== */}

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-3 py-4"
      >
        {loading &&
        messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-gray-500">
              Loading classroom chat...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                💬
              </div>

              <p className="text-sm font-medium text-gray-700">
                No messages yet
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Start the conversation with your
                students.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isLecturer =
                message.senderRole ===
                'lecturer';

              const isDeleted =
                Boolean(
                  message.deletedAt,
                );

              const isAnnouncement =
                message.messageType ===
                'announcement';

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isLecturer
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex max-w-[88%] flex-col ${
                      isLecturer
                        ? 'items-end'
                        : 'items-start'
                    }`}
                  >
                    {/* ======================================
                        SENDER
                    ====================================== */}

                    <div className="mb-1 flex items-center gap-2 px-1">
                      <span className="text-[11px] font-medium text-gray-600">
                        {isLecturer
                          ? currentLecturerName
                          : message.senderName}
                      </span>

                      {isLecturer && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                          Lecturer
                        </span>
                      )}

                      {!isLecturer &&
                        isAnnouncement && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                            Announcement
                          </span>
                        )}
                    </div>

                    {/* ======================================
                        MESSAGE BUBBLE
                    ====================================== */}

                    <div
                      className={`relative rounded-2xl px-3.5 py-2.5 ${
                        isDeleted
                          ? 'bg-gray-100 text-gray-400'
                          : isAnnouncement
                            ? 'border border-amber-200 bg-amber-50 text-gray-800'
                            : isLecturer
                              ? 'bg-emerald-700 text-white'
                              : 'border border-gray-200 bg-white text-gray-800'
                      }`}
                    >
                      {isDeleted ? (
                        <p className="text-xs italic">
                          This message was
                          deleted.
                        </p>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words text-sm leading-5">
                            {message.message}
                          </p>

                          <div
                            className={`mt-1.5 flex items-center gap-2 text-[10px] ${
                              isLecturer
                                ? 'text-emerald-100'
                                : 'text-gray-400'
                            }`}
                          >
                            <span>
                              {formatMessageTime(
                                message.createdAt,
                              )}
                            </span>

                            {isAnnouncement && (
                              <span>
                                Announcement
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* ======================================
                        DELETE
                    ====================================== */}

                    {!isDeleted && (
                      <div
                        className={`mt-1 flex ${
                          isLecturer
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteMessage(
                              message.id,
                            )
                          }
                          disabled={
                            deletingId ===
                            message.id
                          }
                          className="px-1 text-[10px] text-gray-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId ===
                          message.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================
          JUMP TO LATEST
      ===================================================== */}

      {!isAtBottom &&
        messages.length > 0 && (
          <div className="border-t border-gray-200 bg-white px-3 py-2">
            <button
              type="button"
              onClick={() => {
                const container =
                  messagesContainerRef.current;

                if (container) {
                  container.scrollTop =
                    container.scrollHeight;
                }

                setIsAtBottom(true);
              }}
              className="w-full rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
            >
              ↓ Jump to latest messages
            </button>
          </div>
        )}

      {/* =====================================================
          COMPOSER
      ===================================================== */}

      <form
        onSubmit={handleSendMessage}
        className="border-t border-gray-200 bg-white p-3"
      >
        {!effectiveChatEnabled ? (
          <div className="rounded-xl bg-gray-100 px-4 py-3 text-center text-xs text-gray-500">
            Chat is currently disabled for
            this classroom.
          </div>
        ) : (
          <>
            {/* ==============================================
                MESSAGE TYPE
            ============================================== */}

            <div className="mb-2 flex items-center justify-between gap-2">
              <select
                value={messageType}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  setMessageType(
                    value ===
                      'announcement'
                      ? 'announcement'
                      : 'text',
                  );
                }}
                disabled={sending}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="text">
                  Normal message
                </option>

                <option value="announcement">
                  Announcement
                </option>
              </select>

              <span className="text-[10px] text-gray-400">
                {messageText.length}/2000
              </span>
            </div>

            {/* ==============================================
                TEXT INPUT
            ============================================== */}

            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={messageText}
                onChange={(event) => {
                  setMessageText(
                    event.target.value,
                  );

                  if (error) {
                    setError('');
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    const form =
                      event.currentTarget
                        .form;

                    if (form) {
                      form.requestSubmit();
                    }
                  }
                }}
                maxLength={2000}
                rows={2}
                disabled={sending}
                placeholder="Type a message..."
                className="min-h-[48px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-50"
              />

              <button
                type="submit"
                disabled={
                  sending ||
                  !messageText.trim()
                }
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending
                  ? 'Sending...'
                  : 'Send'}
              </button>
            </div>

            {/* ==============================================
                HELPER TEXT
            ============================================== */}

            <p className="mt-1.5 text-[10px] text-gray-400">
              Press Enter to send • Shift +
              Enter for a new line
            </p>
          </>
        )}
      </form>
    </section>
  );
}