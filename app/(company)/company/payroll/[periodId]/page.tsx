import EmployeeChangePanel from "./_employee-change-panel";
import PayrollDirectSection from "./_payroll-direct-section";

export default async function CompanyPayrollDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;

  return (
    <div className="space-y-5">
      <EmployeeChangePanel periodId={periodId} />
      <PayrollDirectSection periodId={periodId} />
    </div>
  );
}