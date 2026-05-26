import { createFileRoute } from "@tanstack/react-router";

import FormPage from "@/pages/landing/FormPage";
import { getFormSession } from "@/server/form.functions";

export const Route = createFileRoute("/")({
  loader: () => getFormSession(),
  component: LandingPage,
});

function LandingPage() {
  const initialSession = Route.useLoaderData();
  return <FormPage initialSession={initialSession} />;
}
