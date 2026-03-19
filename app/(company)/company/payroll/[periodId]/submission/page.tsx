import SubmissionConfirmPanel from "./_submission-confirm-panel";
import SubmissionSummarySection from "./_submission-summary-section";
import ReviewStatusSection from "./_review-status-section";
import ResultDownloadSection from "./_result-download-section";

export default async function CompanyPayrollSubmissionPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;

  return (
    <div className="space-y-5">
      <SubmissionConfirmPanel periodId={periodId} />
      <SubmissionSummarySection periodId={periodId} />
      <ReviewStatusSection periodId={periodId} />
      <ResultDownloadSection periodId={periodId} />
    </div>
  );
}