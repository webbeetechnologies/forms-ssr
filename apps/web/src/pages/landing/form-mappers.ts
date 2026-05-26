import { form } from "@/server/form-schema";

type FormMappersOptions = {
  apiOrigin?: string;
  credentials?: RequestCredentials;
  getSessionId: () => number;
};

function apiUrl(apiOrigin: string | undefined, path: string) {
  if (!apiOrigin) return path;
  return new URL(path, apiOrigin).toString();
}

export function createFormMappers({
  apiOrigin,
  credentials,
  getSessionId,
}: FormMappersOptions) {
  return form.mappers(
    {},
    {
      uploadFile: async ({ stepId, file, name }) => {
        const body = new FormData();
        body.set("file", file, name);
        body.set("sessionId", String(getSessionId()));
        body.set("stepId", stepId);

        const response = await fetch(apiUrl(apiOrigin, "/api/upload-form-file"), {
          method: "POST",
          body,
          credentials,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(payload?.message ?? "File upload failed");
        }

        return response.json() as Promise<{
          url: string;
          name: string;
          type: string;
          size: number;
        }>;
      },
    },
  );
}
