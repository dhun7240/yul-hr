import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireLaborPage } from "@/lib/auth/session";
import LaborSidebar from "@/components/labor/labor-sidebar";
import NotificationBell from "@/components/notifications/notification-bell";

export default async function LaborLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireLaborPage();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <div className="md:hidden">
          <div className="mb-4 flex items-center justify-between gap-3">
            <LaborSidebar mobile />
            <NotificationBell />
          </div>
        </div>

        <div className="flex min-h-screen flex-col gap-4 md:flex-row md:gap-6">
          <div className="hidden md:block">
            <LaborSidebar />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
            <div className="hidden md:flex items-center justify-end">
              <NotificationBell />
            </div>

            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}