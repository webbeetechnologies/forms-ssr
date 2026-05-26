import {
  Description,
  EndScreen,
  Title,
  WelcomeScreen,
} from "@taylordb/forms-ui";

/**
 * Shared, side-effect-free form body used by both:
 * - the runtime page (`pages/landing/FormPage.tsx`)
 * - the build-time form-config check (`src/form-check.tsx`)
 *
 * Keep this component free of autosave/session wiring — the wrappers own
 * transport and bootstrap.
 */
export function FormBody() {
  return (
    <>
      <WelcomeScreen id="welcome" buttonText="Start application">
        <Title>Tell Taylor what form you want and instantly get your dream form.</Title>
        <Description>
          Takes about two minutes. Your answers save as you go — refresh any time to pick up where you left off.
        </Description>
      </WelcomeScreen>

      {/* At the moment sharedSteps is empty; once you add questions, add
       * `<Question id=\"...\">` blocks here to match `form.sharedSteps`. */}
      <EndScreen id="done" buttonText="Submit application">
        <Title>Ready to send it in?</Title>
        <Description>
          Thanks for taking the time. Once you submit, our team will review your application and get back to you.
        </Description>
      </EndScreen>
    </>
  );
}
