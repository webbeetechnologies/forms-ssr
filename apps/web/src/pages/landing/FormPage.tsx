import { useMemo } from "react";
import {
  Form,
  FormAdapterProvider,
  createSsrFetchAutosaveClient,
  useAutosaveStatus,
  useFormSession,
  type SerializableFormSession,
} from "@taylordb/forms-ui";

import { FormBody } from "@/pages/landing/FormBody";
import { createFormMappers } from "@/pages/landing/form-mappers";
import { purpleTheme } from "@/pages/landing/form-theme";
import { FORM_ID } from "@/shared/form.constants";
import { form } from "@/server/form-schema";

function SessionBanner() {
  const { saveStatus, saveError, isHydrating } = useAutosaveStatus();

  const label = (() => {
    if (isHydrating) return "Restoring previous session…";
    if (saveStatus === "saving") return "Saving…";
    if (saveStatus === "saved") return "Saved";
    if (saveStatus === "error") return `Save failed: ${saveError ?? "unknown"}`;
    return "Idle";
  })();

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontFamily: "var(--tf-font-family)",
        background:
          saveStatus === "error"
            ? "rgba(255, 90, 90, 0.18)"
            : saveStatus === "saved"
              ? "rgba(72, 187, 120, 0.18)"
              : "var(--tf-surface)",
        color: "var(--tf-text)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
      }}
    >
      {label}
    </div>
  );
}

type FormPageProps = {
  initialSession: SerializableFormSession;
};

export default function FormPage({ initialSession }: FormPageProps) {
  const client = useMemo(
    () =>
      createSsrFetchAutosaveClient({
        formId: FORM_ID,
        apiUrl: "/api/forms",
        sessionId: initialSession.sessionId,
      }),
    [initialSession.sessionId],
  );

  const mappers = useMemo(
    () =>
      createFormMappers({
        credentials: "include",
        getSessionId: () => client.sessionId,
      }),
    [client],
  );

  const session = useFormSession({
    client,
    sharedSteps: form.sharedSteps,
    mappers,
    initialSession,
  });

  if (!session.ready) {
    return null;
  }

  return (
    <FormAdapterProvider
      adapter={session.adapter}
      defaultValues={session.defaultValues}
      sharedSteps={form.sharedSteps}
    >
      <Form keyboard theme={purpleTheme}>
        <SessionBanner />
        <FormBody />
      </Form>
    </FormAdapterProvider>
  );
}
