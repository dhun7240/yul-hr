"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/logout-button";

function navItemClass(active: boolean) {
  return [
    "flex min-h-[48px] items-center rounded-2xl px-4 text-sm font-semibold transition",
    active
      ? "bg-orange-500 text-white shadow-sm"
      : "text-zinc-700 hover:bg-zinc-100",
  ].join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/company/dashboard") {
    return pathname === "/company" || pathname === "/company/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type CompanySidebarProps = {
  mobile?: boolean;
};

export default function CompanySidebar({
  mobile = false,
}: CompanySidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/company/dashboard", label: "대시보드" },
    { href: "/company/onboarding/company", label: "회사 정보" },
    { href: "/company/employees", label: "직원 관리" },
    { href: "/company/payroll", label: "페이롤" },
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mobile) {
    return (
      <aside className="w-[240px] shrink-0 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="border-b border-zinc-200 pb-4">
          <div className="text-xs font-extrabold tracking-wide text-orange-500">
            YUL HR ERP
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
            Company
          </div>
        </div>

        <nav className="mt-4 space-y-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navItemClass(isActive(pathname, item.href))}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-zinc-200 pt-4">
          <LogoutButton />
        </div>
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-xl shadow-sm transition hover:bg-zinc-50"
        aria-label="메뉴"
        aria-expanded={open}
      >
        ☰
      </button>

      {open ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/20"
            aria-label="메뉴 닫기"
          />

          <div className="fixed inset-x-4 top-16 z-50 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
              <div>
                <div className="text-xs font-extrabold tracking-wide text-orange-500">
                  YUL HR ERP
                </div>
                <div className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
                  Company
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <nav className="mt-4 space-y-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navItemClass(isActive(pathname, item.href))}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-6 border-t border-zinc-200 pt-4">
              <LogoutButton />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}