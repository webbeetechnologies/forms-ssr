import {
  Description,
  EndScreen,
  FileUpload,
  Form,
  PhoneInput,
  Question,
  TextInput,
  Title,
  VideoQuestion,
  WelcomeScreen,
  createAutosaveBootstrap,
  createFileUploadMapper,
  createTrpcAutosaveClient,
  lightTheme,
  useAutosaveStatus,
  type FormTheme,
  type UploadMediaFileInput,
  type UploadedMediaFile,
} from "@taylordb/forms-ui";
import { candidateForm } from "@repo/server/forms/candidate-form-schema";

import { trpcVanilla } from "../lib/trpc-vanilla";

/**
 * Purple-themed Typeform-like candidate form.
 *
 * The schema (`candidateForm`) lives in the server package and is imported by
 * both sides so client and server validators stay in lockstep.
 *
 * Files (resume + 2-min video intro) are uploaded through a dedicated tRPC
 * mutation (`upload.uploadCandidateFile`) which writes the bytes to the
 * candidate row's attachment column. The form itself only stores
 * `FileAnswer[]` metadata, so on autosave the resume/videoIntro saveAnswer
 * resolvers are no-ops — the attachment is already on the row.
 */

// ----- Brand theme -------------------------------------------------------
const purpleTheme: FormTheme = {
  ...lightTheme,
  accent: "#8b5cf6",
  surface: "rgba(139, 92, 246, 0.08)",
};

// ----- File upload bridge ------------------------------------------------
//
// The `createTrpcAutosaveClient` is created once at module scope (Promise);
// we await it inside the bootstrap below. To upload files we need the
// resolved sessionId, so we expose a getter that reads it after bootstrap.

const autosaveClientPromise = createTrpcAutosaveClient(
  trpcVanilla.candidateForm,
  { formId: "candidate" },
);

async function uploadCandidateFile(
  column: "resume" | "videoIntro",
  input: UploadMediaFileInput,
): Promise<UploadedMediaFile> {
  const client = await autosaveClientPromise;
  const fd = new FormData();
  fd.set("file", input.file, input.name);
  fd.set("sessionId", String(client.sessionId));
  fd.set("column", column);
  return trpcVanilla.upload.uploadCandidateFile.mutate(fd);
}

const mappers = candidateForm.mappers({
  resume: {
    toApiValue: createFileUploadMapper({
      uploadFile: (input) => uploadCandidateFile("resume", input),
    }),
  },
  videoIntro: {
    toApiValue: createFileUploadMapper({
      uploadFile: (input) => uploadCandidateFile("videoIntro", input),
    }),
  },
});

const CandidateAutosaveProvider = createAutosaveBootstrap({
  client: autosaveClientPromise,
  mappers,
  sharedSteps: candidateForm.sharedSteps,
});

// ----- Status badge -------------------------------------------------------
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

export default function CandidateFormPage() {
  return (
    <CandidateAutosaveProvider
      fallback={
        <div style={{ padding: 32, textAlign: "center" }}>
          Starting session…
        </div>
      }
      errorFallback={(error) => (
        <div style={{ padding: 32, color: "#b91c1c" }}>
          <h1>Could not start a session.</h1>
          <p>{error.message}</p>
        </div>
      )}
    >
      <Form keyboard theme={purpleTheme}>
        <SessionBanner />

        <WelcomeScreen id="welcome" buttonText="Start application">
          <Title>Apply to join the team.</Title>
          <Description>
            Takes about two minutes. Your answers save as you go — refresh any
            time to pick up where you left off.
          </Description>
        </WelcomeScreen>

        <Question id="name" required>
          <Title>What's your full name?</Title>
          <TextInput autoFocus placeholder="Jane Doe" />
        </Question>

        <Question id="email" required>
          <Title>Where can we email you?</Title>
          <Description>We'll only use this to follow up on your application.</Description>
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
            Up to two minutes. Tell us a little about yourself and why you're
            applying.
          </Description>
          <VideoQuestion maxDurationSeconds={120} />
        </Question>

        <EndScreen id="done" buttonText="Submit application">
          <Title>Ready to send it in?</Title>
          <Description>
            Thanks for taking the time. Once you submit, our team will review
            your application and get back to you.
          </Description>
        </EndScreen>
      </Form>
    </CandidateAutosaveProvider>
  );
}
