import { ReactNode } from "react";
import PayrollPeriodSidebar from "@/components/payroll/payroll-period-sidebar";

export default async function CompanyPayrollPeriodLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-10">
        <div className="space-y-4 md:hidden">
          <div className="flex justify-start">
            <PayrollPeriodSidebar periodId={periodId} mobile />
          </div>
          <div className="min-w-0">{children}</div>
        </div>

        <div className="hidden items-start gap-6 md:flex">
          <PayrollPeriodSidebar periodId={periodId} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}