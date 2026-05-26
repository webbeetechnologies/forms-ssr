import React from "react";
import { createRoot } from "react-dom/client";
import {
  Form,
  createAutosaveBootstrap,
  createFetchAutosaveClient,
} from "@taylordb/forms-ui";
import formStyles from "@taylordb/forms-ui/styles.css?inline";

import { FormBody } from "@/pages/landing/FormBody";
import { createFormMappers } from "@/pages/landing/form-mappers";
import { purpleTheme } from "@/pages/landing/form-theme";
import { form } from "@/server/form-schema";
import { FORM_ID } from "@/shared/form.constants";

import { localStorageSessionStorage } from "./session-storage";

type AutosaveClientWithSession = Awaited<
  ReturnType<typeof createFetchAutosaveClient>
>;

type EmbedConfig = {
  apiOrigin: string;
  formId: string;
};

const mountedRoots = new WeakSet<Element>();
const initialScript = currentScript();

function currentScript() {
  return document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null;
}

function scriptOrigin(script: HTMLScriptElement | null) {
  if (script?.src) return new URL(script.src).origin;
  return window.location.origin;
}

function readConfig(mount: HTMLElement, script: HTMLScriptElement | null): EmbedConfig {
  const apiOrigin =
    mount.dataset.apiOrigin ?? script?.dataset.apiOrigin ?? scriptOrigin(script);
  const formId =
    mount.dataset.taylordbForm ??
    script?.dataset.formId ??
    FORM_ID;

  return { apiOrigin, formId };
}

function findMounts(script: HTMLScriptElement | null) {
  const target = script?.dataset.target;
  if (target) {
    const mount = document.querySelector<HTMLElement>(target);
    return mount ? [mount] : [];
  }

  const mounts = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[data-taylordb-form="${FORM_ID}"]`,
    ),
  );

  if (mounts.length > 0) return mounts;
  if (!script?.parentElement) return [];

  const mount = document.createElement("div");
  mount.dataset.taylordbForm = FORM_ID;
  script.insertAdjacentElement("beforebegin", mount);
  return [mount];
}

function injectStyles(shadowRoot: ShadowRoot) {
  const style = document.createElement("style");
  style.textContent = `
:host {
  display: block;
  color-scheme: light;
}

*, *::before, *::after {
  box-sizing: border-box;
}

${formStyles}
`;
  shadowRoot.append(style);
}

function mountForm(mount: HTMLElement, script: HTMLScriptElement | null) {
  if (mountedRoots.has(mount)) return;
  mountedRoots.add(mount);

  const { apiOrigin, formId } = readConfig(mount, script);
  const shadowRoot = mount.shadowRoot ?? mount.attachShadow({ mode: "open" });
  shadowRoot.textContent = "";
  injectStyles(shadowRoot);

  const appRoot = document.createElement("div");
  shadowRoot.append(appRoot);

  let activeClient: AutosaveClientWithSession | null = null;
  const client = createFetchAutosaveClient({
    formId,
    apiUrl: new URL("/api/forms", apiOrigin).toString(),
    sessionStorage: localStorageSessionStorage(
      `taylordb_forms_session_${formId}`,
    ),
  }).then((createdClient) => {
    activeClient = createdClient;
    return createdClient;
  });

  const Provider = createAutosaveBootstrap({
    client,
    sharedSteps: form.sharedSteps,
    mappers: createFormMappers({
      apiOrigin,
      getSessionId: () => {
        if (activeClient === null) {
          throw new Error("Form session is not ready yet.");
        }
        return activeClient.sessionId;
      },
    }),
  });

  createRoot(appRoot).render(
    <React.StrictMode>
      <Provider fallback={null}>
        <Form keyboard theme={purpleTheme}>
          <FormBody />
        </Form>
      </Provider>
    </React.StrictMode>,
  );
}

function boot() {
  const script = currentScript() ?? initialScript;
  for (const mount of findMounts(script)) {
    mountForm(mount, script);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
