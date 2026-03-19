import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireCompanyPage } from "@/lib/auth/session";
import CompanySidebar from "@/components/company/company-sidebar";
import NotificationBell from "@/components/notifications/notification-bell";

export default async function CompanyLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireCompanyPage();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:px-6 md:py-6">
        <div className="hidden md:block">
          <CompanySidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
          <div className="flex items-center justify-between md:justify-end">
            <div className="md:hidden">
              <CompanySidebar mobile />
            </div>

            <NotificationBell />
          </div>

          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}