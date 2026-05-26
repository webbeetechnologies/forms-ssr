import { Form } from "@taylordb/forms-ui";

import { FormBody } from "@/pages/landing/FormBody";
import { purpleTheme } from "@/pages/landing/form-theme";
import { form } from "@/server/form-schema";

export default function FormCheck() {
  // Build-time configuration check:
  // - Shared schema is the single source of truth (`form.sharedSteps`)
  // - The JSX tree validates that step ids in `<Question id="...">` match sharedSteps
  // - Welcome/end screens are UI-only and intentionally omitted from sharedSteps
  return (
    <Form sharedSteps={form.sharedSteps} theme={purpleTheme}>
      <FormBody />
    </Form>
  );
}
