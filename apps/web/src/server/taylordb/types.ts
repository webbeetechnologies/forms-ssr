/**
 * Copyright (c) 2025 TaylorDB
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  autoDateField,
  autoNumberField,
  checkboxField,
  defineTaylorSchema,
  numberField,
  searchField,
  textField,
} from '@taylordb/query-builder';
import type { InferTaylorDatabase } from '@taylordb/query-builder';

export const taylorSchema = defineTaylorSchema({
  attachmentTable: {
    id: autoNumberField(),
    name: textField({ required: true }),
    metadata: textField({ required: true }),
    size: numberField({ required: true }),
    fileType: textField({ required: true }),
    url: textField({ required: true }),
    searchText: searchField(),
  },
  collaborators: {
    id: autoNumberField(),
    name: textField({ required: true }),
    emailAddress: textField({ required: true }),
    avatar: textField({ required: true }),
    searchText: searchField(),
  },
    "submissions": {
      "id": autoNumberField(),
      "createdAt": autoDateField(),
      "updatedAt": autoDateField(),
      "searchText": searchField(),
      "submissionId": textField({ required: false }),
      "submitted": checkboxField({ required: false })
      }
  });

/** Generic type for plugin actions */
export type PluginActionType<I, O> = { input: I; result: O; };
export type TaylorDatabase = InferTaylorDatabase<typeof taylorSchema> & {
    _plugins: {
  };
  };
