import { defineForm } from "@taylordb/forms-core";
import { isValidPhoneNumber } from "libphonenumber-js";

/**
 * Shared schema for the Candidate form.
 *
 * This file is imported by BOTH the server (for validation in resolvers) and
 * the client (for local validation + autosave bootstrap). Keeping it in the
 * server package and exporting via `@repo/server/forms` ensures one source of
 * truth.
 *
 * IMPORTANT: Welcome / Statement / EndScreen UI steps are NOT included here —
 * they collect no answer.
 */
export const candidateForm = defineForm({
  sharedSteps: [
    {
      id: "name",
      type: "text",
      validate(value: string) {
        return value.trim().length >= 2
          ? null
          : "Please enter your full name (at least 2 characters).";
      },
    },
    {
      id: "email",
      type: "email",
    },
    {
      id: "phone",
      type: "phone_number",
      validate(value: string) {
        const trimmed = value.trim();
        if (trimmed === "") return "Phone number is required.";
        return isValidPhoneNumber(trimmed)
          ? null
          : "Enter a valid international number with country code.";
      },
    },
    {
      id: "resume",
      type: "file_upload",
    },
    {
      id: "videoIntro",
      type: "file_upload",
      validate(value: unknown) {
        // The handler ensures it's a non-empty FileAnswer[]; here we cap duration
        // indirectly by capping size. (MediaRecorder enforces 2 min on the UI.)
        if (!Array.isArray(value) || value.length === 0) {
          return "Please record or upload a short video introduction.";
        }
        return null;
      },
    },
  ] as const,
});

export type CandidateFormValues = {
  name: string;
  email: string;
  phone: string;
  resume: { url?: string; name: string; size: number; type: string }[];
  videoIntro: { url?: string; name: string; size: number; type: string }[];
};
