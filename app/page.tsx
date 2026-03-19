import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";

export default async function HomePage() {
  try {
    const session = await getSessionContext();

    if (session.role === "labor") {
      redirect("/labor/dashboard");
    }

    if (session.role === "company" && !session.companyId) {
      redirect("/company/onboarding/company");
    }

    if (session.role === "company") {
      redirect("/company/dashboard");
    }

    redirect("/login");
  } catch {
    redirect("/login");
  }
}