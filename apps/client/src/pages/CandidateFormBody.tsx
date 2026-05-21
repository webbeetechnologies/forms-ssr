import {
  Description,
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
      <WelcomeScreen id="welcome" buttonText="Prompt Taylor to build a form">
        <Title>Build your dream form.</Title>
        <Description>
          Ask Taylor to build your desired form. It will replace this placeholder with your form!
        </Description>
      </WelcomeScreen>

      {/*
      <Question id="name" required>
        <Title>What's your full name?</Title>
        <TextInput autoFocus placeholder="Jane Doe" />
      </Question>

      <Question id="email" required>
        <Title>Where can we email you?</Title>
        <Description>
          We'll only use this to follow up on your application.
        </Description>
        <TextInput placeholder="jane@example.com" />
      </Question>

      <Question id="phone" required>
        <Title>What's the best phone number to reach you?</Title>
        <PhoneInput defaultCountry="US" placeholder="+1 555 123 4567" />
      </Question>

      <Question id="resume" required>
        <Title>Upload your resume.</Title>
        <Description>PDF, DOC, or DOCX. Max 10&nbsp;MB.</Description>
        <FileUpload
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          maxSize={10 * 1024 * 1024}
        />
      </Question>

      <Question id="videoIntro" required>
        <Title>Record a short video introduction.</Title>
        <Description>
          Up to two minutes. Tell us a little about yourself and why
          you're applying.
        </Description>
        <VideoQuestion maxDurationSeconds={120} />
      </Question>

      <Question id="workAuthorization" required>
        <Title>What's your work authorization?</Title>
        <Description>
          We use this to figure out next steps for visa or sponsorship
          paperwork — pick whichever fits best.
        </Description>
        <Dropdown placeholder="Select your status…" searchable>
          <Dropdown.Option value="US citizen">US citizen</Dropdown.Option>
          <Dropdown.Option value="Permanent resident">
            Permanent resident (green card)
          </Dropdown.Option>
          <Dropdown.Option value="Visa holder">
            Currently on a work visa
          </Dropdown.Option>
          <Dropdown.Option value="Need sponsorship">
            Will need sponsorship
          </Dropdown.Option>
          <Dropdown.Option value="Other">Something else</Dropdown.Option>
        </Dropdown>
      </Question>

      <Question id="marketingConsent">
        <Title>Can we keep you in mind for future roles?</Title>
        <Description>
          If this one doesn't work out, we'd love to reach back out when
          something else opens up. Totally optional.
        </Description>
        <YesNo yesLabel="Yes, please" noLabel="No thanks" />
      </Question>
      */}

      {/* <EndScreen id="done" buttonText="Submit application">
        <Title>Ready to send it in?</Title>
        <Description>
          Thanks for taking the time. Once you submit, our team will
          review your application and get back to you.
        </Description>
      </EndScreen> */}
    </>
  );
}