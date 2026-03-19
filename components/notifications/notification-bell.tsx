"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

type NotificationsResponse = {
  notifications?: NotificationItem[];
  unread_count?: number;
  error?: string;
};

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationBell() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastItem, setToastItem] = useState<NotificationItem | null>(null);

  function showToast(item: NotificationItem) {
    setToastItem(item);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastItem(null);
      toastTimerRef.current = null;
    }, 4000);
  }

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent === true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/notifications?limit=20", {
        cache: "no-store",
        credentials: "include",
      });

      const json = (await res.json().catch(() => null)) as NotificationsResponse | null;

      if (!res.ok) {
        if (!silent) {
          setItems([]);
          setUnreadCount(0);
          setLoading(false);
        }
        return;
      }

      const nextItems = Array.isArray(json?.notifications) ? json.notifications : [];
      const nextUnreadCount =
        typeof json?.unread_count === "number" ? json.unread_count : 0;

      const incomingUnread = nextItems.find(
        (item) => !item.is_read && !knownIdsRef.current.has(item.id)
      );

      if (!initializedRef.current) {
        nextItems.forEach((item) => knownIdsRef.current.add(item.id));
        initializedRef.current = true;
      } else {
        nextItems.forEach((item) => knownIdsRef.current.add(item.id));
        if (incomingUnread) {
          showToast(incomingUnread);
        }
      }

      setItems(nextItems);
      setUnreadCount(nextUnreadCount);

      if (!silent) {
        setLoading(false);
      }
    } catch {
      if (!silent) {
        setItems([]);
        setUnreadCount(0);
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void load();

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void load({ silent: true });
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void load({ silent: true });
  }, [open]);

  async function markAllRead() {
    try {
      const res = await fetch("/api/notification", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mark_all_read: true,
        }),
      });

      if (!res.ok) return;

      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function markOneRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id,
          is_read: true,
        }),
      });

      if (!res.ok) return;

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-lg shadow-sm transition hover:bg-zinc-50"
          aria-label="알림"
        >
          <span>🔔</span>

          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 z-50 mt-3 w-[min(380px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 md:px-5">
              <div>
                <div className="text-sm font-extrabold text-zinc-900">알림</div>
                <div className="mt-1 text-xs text-zinc-500">
                  읽지 않은 알림 {unreadCount}건
                </div>
              </div>

              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={!unreadCount}
                className="text-xs font-bold text-orange-600 disabled:text-zinc-300"
              >
                전체 읽음
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto md:max-h-[420px]">
              {loading ? (
                <div className="px-4 py-8 text-sm text-zinc-500 md:px-5">불러오는 중...</div>
              ) : !items.length ? (
                <div className="px-4 py-8 text-sm text-zinc-500 md:px-5">
                  알림이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.link || "#"}
                      onClick={() => {
                        setOpen(false);
                        setToastItem(null);
                        if (!item.is_read) {
                          void markOneRead(item.id);
                        }
                      }}
                      className={[
                        "block px-4 py-4 transition hover:bg-zinc-50 md:px-5",
                        item.is_read ? "bg-white" : "bg-orange-50/40",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {!item.is_read ? (
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
                            ) : null}
                            <div className="truncate text-sm font-bold text-zinc-900">
                              {item.title}
                            </div>
                          </div>

                          <div className="mt-2 line-clamp-2 text-sm text-zinc-600">
                            {item.body}
                          </div>

                          <div className="mt-2 text-xs text-zinc-400">
                            {formatDateTime(item.created_at)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {toastItem ? (
        <div className="fixed left-4 right-4 top-4 z-[60] rounded-[24px] border border-orange-200 bg-white p-4 shadow-2xl md:left-auto md:right-6 md:top-6 md:w-[340px]">
          <Link
            href={toastItem.link || "#"}
            onClick={() => {
              setToastItem(null);
              if (!toastItem.is_read) {
                void markOneRead(toastItem.id);
              }
            }}
            className="block"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg">🔔</div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-zinc-900">
                  {toastItem.title}
                </div>

                <div className="mt-1 line-clamp-2 text-sm text-zinc-600">
                  {toastItem.body}
                </div>

                <div className="mt-2 text-xs text-zinc-400">
                  {formatDateTime(toastItem.created_at)}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setToastItem(null);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                aria-label="닫기"
              >
                ×
              </button>
            </div>
          </Link>
        </div>
      ) : null}
    </>
  );
}