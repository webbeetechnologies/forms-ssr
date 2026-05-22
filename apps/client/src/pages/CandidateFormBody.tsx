import {
  Description,
  EndScreen,
  Title,
  WelcomeScreen,
} from "@taylordb/forms-ui";

/**
 * The candidate form's step tree.
 *
 * Exported separately from `CandidateFormPage` so the same JSX can be:
 *
 *   1. Rendered for real users in `CandidateFormPage.tsx`, wrapped in
 *      `<Form>` + the autosave bootstrap provider.
 *   2. Statically validated at `vite build` time by
 *      `formsFormCheckPlugin` (see `src/candidate-form-check.tsx`),
 *      which mounts a non-autosave `<Form sharedSteps={…}>` around it
 *      in jsdom to catch schema/JSX drift before deploy.
 *
 * Keep this component declarative and side-effect free — no hooks that
 * touch the network, no autosave-only context reads. Everything in here
 * must render in jsdom under the form-config check.
 *
 * To add or change a question, edit this tree AND `candidate-form-schema.ts`
 * together; the check plugin will fail the build if they drift.
 */
export function CandidateFormBody() {
  return (
    <>
      <WelcomeScreen id="welcome" buttonText="Start application">
        <Title>Apply to join the team.</Title>
        <Description>
          Takes about two minutes. Your answers save as you go — refresh
          any time to pick up where you left off.
        </Description>
      </WelcomeScreen>

      <EndScreen id="done" buttonText="Submit application">
        <Title>Ready to send it in?</Title>
        <Description>
          Thanks for taking the time. Once you submit, our team will
          review your application and get back to you.
        </Description>
      </EndScreen>
    </>
  );
}
