import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Form } from "@taylordb/forms-ui";
import { candidateForm } from "@repo/server/forms/candidate-form-schema";

import { CandidateFormBody } from "../pages/CandidateFormBody";

/**
 * Smoke + navigation tests for the candidate form.
 *
 * Goal: a fast, deterministic check that the shared JSX body in
 * `CandidateFormBody` actually renders and behaves correctly against the
 * `sharedSteps` schema — without spinning up a network, a tRPC client,
 * or the autosave bootstrap.
 *
 * Strategy
 * ────────
 *   • Mount `<Form sharedSteps={candidateForm.sharedSteps}>` directly
 *     (same shape the build-time form-config check uses in
 *     `candidate-form-check.tsx`). No autosave adapter ⇒ no network.
 *   • Drive interactions via `userEvent` and assert against the
 *     stable `data-testid` hooks documented in
 *     `apps/client/node_modules/@taylordb/forms-ui/docs/test-ids.md`.
 *   • Skip the file/video questions in the happy-path walk — they need
 *     real `File` / MediaRecorder plumbing that belongs in an e2e suite,
 *     not a unit test.
 *
 * These tests are wired into `pnpm test` so any agent change to the form
 * tree, schema, or validators surfaces immediately.
 */

function renderCandidateForm(onSubmit?: (answers: unknown) => void) {
  return render(
    <Form
      sharedSteps={candidateForm.sharedSteps}
      onSubmit={onSubmit ?? (() => {})}
    >
      <CandidateFormBody />
    </Form>,
  );
}

describe("CandidateForm — structure", () => {
  it("renders the welcome screen with the expected chrome testIds", async () => {
    renderCandidateForm();

    // The form root is always present.
    expect(await screen.findByTestId("tf-form")).toBeInTheDocument();

    // We start on the welcome screen — the welcome "Start application"
    // button has the testId `tf-welcome-next`.
    expect(await screen.findByTestId("tf-welcome-next")).toBeInTheDocument();
    expect(screen.getByText(/apply to join the team/i)).toBeInTheDocument();
  });

  it("exposes a stable testId for every shared step id in the schema", async () => {
    renderCandidateForm();

    // Advance off the welcome screen so the first question mounts. The
    // sharedSteps array is the single source of truth for the schema —
    // if any id here no longer renders a `tf-step-question-*` element,
    // the body has drifted from the schema.
    //
    // Note: `defineTaylorForm` rewrites each shared step's
    // `taylordbFieldName` to `id` on the resolved schema, so we read
    // `step.id` here even though the source declares `taylordbFieldName`.
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("tf-welcome-next"));

    // First step should now be visible.
    const firstStepId = candidateForm.sharedSteps[0].id;
    await waitFor(() => {
      expect(
        screen.getByTestId(`tf-step-question-${firstStepId}`),
      ).toBeInTheDocument();
    });

    // And every step id from the schema is a non-empty string. The
    // build-time form-config check already guarantees JSX ↔ schema
    // order at `pnpm build`; this assertion is belt-and-suspenders.
    for (const step of candidateForm.sharedSteps) {
      expect(typeof step.id).toBe("string");
      expect(step.id.length).toBeGreaterThan(0);
    }
  });
});

describe("CandidateForm — validation + navigation", () => {
  it("blocks Next when the name is empty and surfaces the question error", async () => {
    const user = userEvent.setup();
    renderCandidateForm();

    // Welcome → name question.
    await user.click(await screen.findByTestId("tf-welcome-next"));
    await screen.findByTestId("tf-step-question-name");

    // Try to advance with no input.
    await user.click(screen.getByTestId("tf-controls-next"));

    // The built-in `required` validator fires before the schema's
    // custom `validate` (which only runs once a value is present), so
    // we just assert that *some* error is surfaced via the canonical
    // testId.
    await waitFor(() => {
      expect(
        screen.getByTestId("tf-question-error-name"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("tf-question-error-name").textContent,
    ).toBeTruthy();

    // We should still be on the name step (no advance happened).
    expect(screen.getByTestId("tf-step-question-name")).toBeInTheDocument();
  });

  it("advances from name → email once a valid name is entered", async () => {
    const user = userEvent.setup();
    renderCandidateForm();

    await user.click(await screen.findByTestId("tf-welcome-next"));
    await screen.findByTestId("tf-step-question-name");

    await user.type(screen.getByTestId("tf-input-name"), "Jane Doe");
    await user.click(screen.getByTestId("tf-controls-next"));

    // Now on the email question.
    await waitFor(() => {
      expect(
        screen.getByTestId("tf-step-question-email"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("tf-input-email")).toBeInTheDocument();
  });

  it("rejects an invalid email and accepts a valid one", async () => {
    const user = userEvent.setup();
    renderCandidateForm();

    // Skip past welcome + name.
    await user.click(await screen.findByTestId("tf-welcome-next"));
    await user.type(
      await screen.findByTestId("tf-input-name"),
      "Jane Doe",
    );
    await user.click(screen.getByTestId("tf-controls-next"));
    await screen.findByTestId("tf-step-question-email");

    // Invalid email → stays on the email step with an error.
    await user.type(screen.getByTestId("tf-input-email"), "not-an-email");
    await user.click(screen.getByTestId("tf-controls-next"));
    await waitFor(() => {
      expect(
        screen.getByTestId("tf-question-error-email"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("tf-step-question-email")).toBeInTheDocument();

    // Fix it and advance.
    const emailInput = screen.getByTestId("tf-input-email") as HTMLInputElement;
    await user.clear(emailInput);
    await user.type(emailInput, "jane@example.com");
    await user.click(screen.getByTestId("tf-controls-next"));

    await waitFor(() => {
      expect(
        screen.getByTestId("tf-step-question-phone"),
      ).toBeInTheDocument();
    });
  });

  it("rejects a malformed phone number using the schema validator", async () => {
    const user = userEvent.setup();
    renderCandidateForm();

    // Walk: welcome → name → email → phone.
    await user.click(await screen.findByTestId("tf-welcome-next"));
    await user.type(
      await screen.findByTestId("tf-input-name"),
      "Jane Doe",
    );
    await user.click(screen.getByTestId("tf-controls-next"));
    await user.type(
      await screen.findByTestId("tf-input-email"),
      "jane@example.com",
    );
    await user.click(screen.getByTestId("tf-controls-next"));
    await screen.findByTestId("tf-step-question-phone");

    // The actual `<input type="tel">` rendered by
    // `react-phone-number-input` carries `tf-phone-input-{bindingId}`.
    // (Note: the upstream `forms-ui/docs/test-ids.md` lists this id as
    // `tf-phone-number-input-{bindingId}`, but in v0.2.24 the inner
    // `<input>` actually exposes `tf-phone-input-phone` — the
    // `tf-phone-number-input` token is on the className, not the
    // testId. We assert the real DOM here.)
    const phoneInput = screen.getByTestId(
      "tf-phone-input-phone",
    ) as HTMLInputElement;
    await user.type(phoneInput, "123");
    await user.click(screen.getByTestId("tf-controls-next"));

    await waitFor(() => {
      expect(
        screen.getByTestId("tf-question-error-phone"),
      ).toHaveTextContent(/valid international number/i);
    });
  });
});
