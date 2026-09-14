'use client';

import {
FormEvent,
KeyboardEvent,
useCallback,
useEffect,
useRef,
useState,
} from 'react';

import {
AlertCircle,
Check,
Loader2,
MessageCircle,
RefreshCw,
Send,
User,
Wifi,
WifiOff,
X,
} from 'lucide-react';

type ChatMessage = {
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
success?: boolean;
message?: string;
chatEnabled?: boolean;
student?: {
applicationId: number;
name: string;
};
class?: {
id: number;
title: string;
programId: number;
unitId: number;
programName: string;
unitName: string;
unitCode: string | null;
roomCode: string | null;
status: string;
isLocked: boolean;
studentsCanJoinBeforeLecturer?: boolean;
};
messages?: ChatMessage[];
count?: number;
};

type ChatPanelProps = {
classId: number | string;
open?: boolean;
onClose?: () => void;
className?: string;
};

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

return new Intl.DateTimeFormat(
'en-KE',
{
hour: '2-digit',
minute: '2-digit',
},
).format(date);
}

function formatMessageDate(
value: string | null,
): string {
if (!value) {
return '';
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return '';
}

return new Intl.DateTimeFormat(
'en-KE',
{
day: 'numeric',
month: 'short',
year: 'numeric',
},
).format(date);
}

function isSameDay(
first: string | null,
second: string | null,
): boolean {
if (!first || !second) {
return false;
}

const firstDate = new Date(first);
const secondDate = new Date(second);

if (
Number.isNaN(firstDate.getTime()) ||
Number.isNaN(secondDate.getTime())
) {
return false;
}

return (
firstDate.getFullYear() ===
secondDate.getFullYear() &&
firstDate.getMonth() ===
secondDate.getMonth() &&
firstDate.getDate() ===
secondDate.getDate()
);
}

export default function ChatPanel({
classId,
open = true,
onClose,
className = '',
}: ChatPanelProps) {
const numericClassId =
Number(classId);

const [messages, setMessages] =
useState<ChatMessage[]>([]);

const [chatEnabled, setChatEnabled] =
useState(true);

const [studentName, setStudentName] =
useState('Student');

const [messageText, setMessageText] =
useState('');

const [loading, setLoading] =
useState(true);

const [refreshing, setRefreshing] =
useState(false);

const [sending, setSending] =
useState(false);

const [error, setError] =
useState<string | null>(null);

const [sendError, setSendError] =
useState<string | null>(null);

const [connected, setConnected] =
useState(true);

const messagesContainerRef =
useRef<HTMLDivElement | null>(null);

const inputRef =
useRef<HTMLTextAreaElement | null>(null);

const pollingRef =
useRef<ReturnType<
typeof setInterval
> | null>(null);

const shouldScrollRef =
useRef(true);

/* =======================================================
SCROLL TO BOTTOM
======================================================= */

const scrollToBottom =
useCallback(
(smooth = true) => {
const container =
messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth
        ? 'smooth'
        : 'auto',
    });
  },
  [],
);

/* =======================================================
LOAD MESSAGES
======================================================= */

const loadMessages =
useCallback(
async (
showLoader = false,
) => {
if (
!Number.isInteger(
numericClassId,
) ||
numericClassId <= 0
) {
setError(
'Invalid live class.',
);
setLoading(false);
return;
}
    if (showLoader) {
      setRefreshing(true);
    }

    try {
      const response =
        await fetch(
          '/api/student/live-classes/' +
            numericClassId +
            '/messages?limit=100',
          {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              Accept:
                'application/json',
              'Cache-Control':
                'no-cache',
            },
          },
        );

      const data =
        (await response.json()) as ChatResponse;

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to load classroom chat.',
        );
      }

      if (
        data.success !== true
      ) {
        throw new Error(
          data.message ||
            'Unable to load classroom chat.',
        );
      }

      setMessages(
        Array.isArray(
          data.messages,
        )
          ? data.messages
          : [],
      );

      setChatEnabled(
        data.chatEnabled !== false,
      );

      if (
        data.student?.name
      ) {
        setStudentName(
          data.student.name,
        );
      }

      setError(null);
      setConnected(true);

      shouldScrollRef.current =
        true;
    } catch (requestError) {
      console.error(
        'CHAT LOAD ERROR:',
        requestError,
      );

      setConnected(false);

      if (
        showLoader ||
        messages.length === 0
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to load classroom chat.',
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  [
    numericClassId,
    messages.length,
  ],
);

/* =======================================================
INITIAL LOAD
======================================================= */

useEffect(() => {
void loadMessages(true);
}, [loadMessages]);

/* =======================================================
POLLING

 The database API is used as the source of truth.
 Poll every 3 seconds while the panel is open.
```

======================================================= */

useEffect(() => {
if (!open) {
return;
}

pollingRef.current =
  setInterval(() => {
    void loadMessages(false);
  }, 3000);

return () => {
  if (
    pollingRef.current
  ) {
    clearInterval(
      pollingRef.current,
    );

    pollingRef.current =
      null;
  }
};
}, [
open,
loadMessages,
]);

/* =======================================================
AUTO SCROLL
======================================================= */

useEffect(() => {
if (
shouldScrollRef.current
) {
requestAnimationFrame(
() => {
scrollToBottom(false);
},
);

  shouldScrollRef.current =
    false;
}

}, [
messages,
scrollToBottom,
]);

/* =======================================================
SEND MESSAGE
======================================================= */

const sendMessage =
useCallback(
async () => {
const message =
messageText.trim();
    if (!message) {
      return;
    }

    if (sending) {
      return;
    }

    if (!chatEnabled) {
      setSendError(
        'Chat is currently disabled.',
      );
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const response =
        await fetch(
          '/api/student/live-classes/' +
            numericClassId +
            '/messages',
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/json',
              Accept:
                'application/json',
            },
            body: JSON.stringify({
              message,
              messageType:
                'text',
            }),
          },
        );

      const data =
        (await response.json()) as ChatResponse;

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to send message.',
        );
      }

      if (
        data.success !== true ||
        !data.message ||
        typeof data.message !==
          'object'
      ) {
        throw new Error(
          'The message was not accepted.',
        );
      }

      const newMessage =
        data.message as unknown as ChatMessage;

      setMessages(
        (
          currentMessages,
        ) => {
          const exists =
            currentMessages.some(
              (
                existingMessage,
              ) =>
                existingMessage.id ===
                newMessage.id,
            );

          if (exists) {
            return currentMessages;
          }

          return [
            ...currentMessages,
            newMessage,
          ];
        },
      );

      setMessageText('');
      setConnected(true);
      shouldScrollRef.current =
        true;

      requestAnimationFrame(
        () => {
          scrollToBottom(true);
        },
      );

      inputRef.current?.focus();
    } catch (requestError) {
      console.error(
        'CHAT SEND ERROR:',
        requestError,
      );

      setSendError(
        requestError instanceof
          Error
          ? requestError.message
          : 'Unable to send message.',
      );
    } finally {
      setSending(false);
    }
  },
  [
    chatEnabled,
    messageText,
    numericClassId,
    scrollToBottom,
    sending,
  ],
);

/* =======================================================
FORM SUBMIT
======================================================= */

const handleSubmit =
async (
event: FormEvent<HTMLFormElement>,
) => {
event.preventDefault();

  await sendMessage();
};

/* =======================================================
KEYBOARD HANDLER
======================================================= */

const handleInputKeyDown =
(
event: KeyboardEvent<HTMLTextAreaElement>,
) => {
if (
event.key === 'Enter' &&
!event.shiftKey
) {
event.preventDefault();
    void sendMessage();
  }
};

/* =======================================================
DETECT USER SCROLL POSITION
======================================================= */

const handleMessagesScroll =
() => {
const container =
messagesContainerRef.current;
  if (!container) {
    return;
  }

  const distanceFromBottom =
    container.scrollHeight -
    container.scrollTop -
    container.clientHeight;

  shouldScrollRef.current =
    distanceFromBottom < 120;
};

/* =======================================================
MANUAL REFRESH
======================================================= */

const handleRefresh =
async () => {
await loadMessages(true);
};

/* =======================================================
HIDDEN PANEL
======================================================= */

if (!open) {
return null;
}

/* =======================================================
RENDER
======================================================= */

return (
<aside
className={
'flex h-full min-h-0 w-full flex-col overflow-hidden ' +
'border-l border-white/10 bg-[#101817] text-white ' +
className
}
>
{/* ===================================================
HEADER
=================================================== */}

```
  <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/20 text-brand-gold">
        <MessageCircle
          size={18}
        />
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-white">
          Classroom Chat
        </h2>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/50">
          {connected ? (
            <>
              <Wifi
                size={11}
                className="text-emerald-400"
              />
              <span>
                Connected
              </span>
            </>
          ) : (
            <>
              <WifiOff
                size={11}
                className="text-amber-400"
              />
              <span>
                Reconnecting...
              </span>
            </>
          )}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() =>
          void handleRefresh()
        }
        disabled={refreshing}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        title="Refresh chat"
      >
        <RefreshCw
          size={15}
          className={
            refreshing
              ? 'animate-spin'
              : ''
          }
        />
      </button>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
          title="Close chat"
        >
          <X size={17} />
        </button>
      )}
    </div>
  </div>

  {/* ===================================================
      CHAT DISABLED
  =================================================== */}

  {!chatEnabled && (
    <div className="shrink-0 border-b border-amber-400/10 bg-amber-400/5 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertCircle
          size={15}
          className="mt-0.5 shrink-0 text-amber-400"
        />

        <div>
          <p className="text-xs font-medium text-amber-300">
            Chat is disabled
          </p>

          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
            The lecturer has temporarily
            disabled classroom chat.
          </p>
        </div>
      </div>
    </div>
  )}

  {/* ===================================================
      MESSAGES
  =================================================== */}

  <div
    ref={messagesContainerRef}
    onScroll={handleMessagesScroll}
    className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
  >
    {loading ? (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2
            size={22}
            className="animate-spin text-brand-gold"
          />

          <p className="text-xs text-white/45">
            Loading classroom chat...
          </p>
        </div>
      </div>
    ) : error &&
      messages.length === 0 ? (
      <div className="flex h-full items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-400/10 text-red-400">
            <AlertCircle
              size={19}
            />
          </div>

          <p className="mt-3 text-sm font-medium text-white">
            Unable to load chat
          </p>

          <p className="mt-1 text-xs leading-relaxed text-white/45">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadMessages(true)
            }
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <RefreshCw
              size={13}
            />
            Try Again
          </button>
        </div>
      </div>
    ) : messages.length === 0 ? (
      <div className="flex h-full items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/25">
            <MessageCircle
              size={23}
            />
          </div>

          <p className="mt-3 text-sm font-medium text-white/75">
            No messages yet
          </p>

          <p className="mt-1 text-xs leading-relaxed text-white/35">
            Be the first to say something
            to the class.
          </p>
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        {messages.map(
          (
            chatMessage,
            index,
          ) => {
            const isOwnMessage =
              chatMessage.senderRole ===
                'student' &&
              chatMessage.senderName ===
                studentName;

            const previousMessage =
              index > 0
                ? messages[
                    index - 1
                  ]
                : null;

            const showDate =
              !previousMessage ||
              !isSameDay(
                previousMessage.createdAt,
                chatMessage.createdAt,
              );

            const isLecturer =
              chatMessage.senderRole ===
              'lecturer';

            return (
              <div
                key={
                  chatMessage.id
                }
              >
                {showDate && (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/5" />

                    <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                      {formatMessageDate(
                        chatMessage.createdAt,
                      )}
                    </span>

                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                )}

                <div
                  className={
                    'flex gap-2.5 ' +
                    (isOwnMessage
                      ? 'flex-row-reverse'
                      : 'flex-row')
                  }
                >
                  {!isOwnMessage && (
                    <div
                      className={
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ' +
                        (
                          isLecturer
                            ? 'bg-brand-gold/15 text-brand-gold'
                            : 'bg-white/5 text-white/45'
                        )
                      }
                    >
                      {isLecturer ? (
                        <MessageCircle
                          size={14}
                        />
                      ) : (
                        <User
                          size={14}
                        />
                      )}
                    </div>
                  )}

                  <div
                    className={
                      'max-w-[82%] ' +
                      (
                        isOwnMessage
                          ? 'items-end'
                          : 'items-start'
                      ) +
                      ' flex flex-col'
                    }
                  >
                    {!isOwnMessage && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-white/60">
                          {
                            chatMessage.senderName
                          }
                        </span>

                        {isLecturer && (
                          <span className="rounded-full bg-brand-gold/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-brand-gold">
                            Lecturer
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className={
                        'rounded-2xl px-3 py-2.5 ' +
                        (
                          isOwnMessage
                            ? 'rounded-tr-sm bg-brand-green text-white'
                            : isLecturer
                              ? 'rounded-tl-sm border border-brand-gold/10 bg-brand-gold/10 text-white'
                              : 'rounded-tl-sm bg-white/5 text-white/80'
                        )
                      }
                    >
                      <p className="whitespace-pre-wrap break-words text-[12px] leading-relaxed">
                        {
                          chatMessage.message
                        }
                      </p>
                    </div>

                    <div
                      className={
                        'mt-1 flex items-center gap-1.5 ' +
                        (
                          isOwnMessage
                            ? 'justify-end'
                            : 'justify-start'
                        )
                      }
                    >
                      <span className="text-[9px] text-white/25">
                        {formatMessageTime(
                          chatMessage.createdAt,
                        )}
                      </span>

                      {isOwnMessage && (
                        <Check
                          size={10}
                          className="text-brand-gold"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>
    )}
  </div>

  {/* ===================================================
      SEND ERROR
  =================================================== */}

  {sendError && (
    <div className="shrink-0 border-t border-red-400/10 bg-red-400/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <AlertCircle
          size={13}
          className="shrink-0 text-red-400"
        />

        <p className="min-w-0 flex-1 text-[11px] text-red-300">
          {sendError}
        </p>

        <button
          type="button"
          onClick={() =>
            setSendError(null)
          }
          className="text-white/30 transition hover:text-white"
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )}

  {/* ===================================================
      MESSAGE COMPOSER
  =================================================== */}

  <div className="shrink-0 border-t border-white/10 bg-[#0c1312] p-3">
    <form
      onSubmit={handleSubmit}
      className="relative"
    >
      <textarea
        ref={inputRef}
        value={messageText}
        onChange={(event) =>
          setMessageText(
            event.target.value,
          )
        }
        onKeyDown={
          handleInputKeyDown
        }
        disabled={
          !chatEnabled ||
          sending
        }
        maxLength={2000}
        rows={2}
        placeholder={
          chatEnabled
            ? 'Type a message...'
            : 'Chat is disabled'
        }
        className="min-h-[72px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 pb-10 pt-3 pr-12 text-xs leading-relaxed text-white outline-none transition placeholder:text-white/25 focus:border-brand-gold/30 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="absolute bottom-2 left-3 text-[9px] text-white/20">
        {messageText.length}
        /2000
      </div>

      <button
        type="submit"
        disabled={
          !chatEnabled ||
          sending ||
          !messageText.trim()
        }
        className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/20"
        title="Send message"
      >
        {sending ? (
          <Loader2
            size={14}
            className="animate-spin"
          />
        ) : (
          <Send size={14} />
        )}
      </button>
    </form>

    <p className="mt-2 text-center text-[9px] text-white/20">
      Enter to send · Shift + Enter for new line
    </p>
  </div>
</aside>

);
}
