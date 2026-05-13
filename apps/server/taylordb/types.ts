/**
 * Copyright (c) 2025 TaylorDB
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface FileInformation {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
  format: string;
  width: number;
  height: number;
}

interface UploadResponse {
  collectionName: string;
  fileInformation: FileInformation;
  metadata: {
    thumbnails: any[];
    clips: any[];
  };
  baseId: string;
  storageAdaptor: string;
  _id: string;
  __v: number;
}

export interface AttachmentColumnValue {
  url: string;
  fileType: string;
  size: number;
}

export interface AttachmentUpdateValue {
  newAttachments: Attachment[];
  deletedUrls: string[];
}

export class Attachment {
  public readonly collectionName: string;
  public readonly fileInformation: FileInformation;
  public readonly metadata: { thumbnails: any[]; clips: any[] };
  public readonly baseId: string;
  public readonly storageAdaptor: string;
  public readonly _id: string;

  constructor(data: UploadResponse) {
    this.collectionName = data.collectionName;
    this.fileInformation = data.fileInformation;
    this.metadata = data.metadata;
    this.baseId = data.baseId;
    this.storageAdaptor = data.storageAdaptor;
    this._id = data._id;
  }

  toColumnValue(): AttachmentColumnValue {
    return {
      url: this.fileInformation.path,
      fileType: this.fileInformation.mimetype,
      size: this.fileInformation.size,
    };
  }
}

type IsWithinOperatorValue =
  | 'pastWeek'
  | 'pastMonth'
  | 'pastYear'
  | 'nextWeek'
  | 'nextMonth'
  | 'nextYear'
  | 'daysFromNow'
  | 'daysAgo'
  | 'currentWeek'
  | 'currentMonth'
  | 'currentYear';

type DefaultDateFilterValue =
  | (
      | 'today'
      | 'tomorrow'
      | 'yesterday'
      | 'oneWeekAgo'
      | 'oneWeekFromNow'
      | 'oneMonthAgo'
      | 'oneMonthFromNow'
    )
  | ['exactDay' | 'exactTimestamp', string]
  | ['daysAgo' | 'daysFromNow', number];

type DateFilters = {
  '=': DefaultDateFilterValue;
  '!=': DefaultDateFilterValue;
  '<': DefaultDateFilterValue;
  '>': DefaultDateFilterValue;
  '<=': DefaultDateFilterValue;
  '>=': DefaultDateFilterValue;
  isWithIn:
    | IsWithinOperatorValue
    | { value: 'daysAgo' | 'daysFromNow'; date: number };
  isEmpty: boolean;
  isNotEmpty: boolean;
};

type DateAggregations = {
  empty: number;
  filled: number;
  unique: number;
  percentEmpty: number;
  percentFilled: number;
  percentUnique: number;
  min: number | null;
  max: number | null;
  daysRange: number | null;
  monthRange: number | null;
};

type TextFilters = {
  '=': string;
  '!=': string;
  caseEqual: string;
  hasAnyOf: string[];
  contains: string;
  startsWith: string;
  endsWith: string;
  doesNotContain: string;
  isEmpty: never;
  isNotEmpty: never;
};

export type SearchTextFilters = {
  search: string;
  contains: string;
  containsStrict: string;
  isEmpty: never;
  isNotEmpty: never;
};

type LinkFilters = {
  hasAnyOf: number[];
  hasAllOf: number[];
  isExactly: number[];
  '=': number;
  hasNoneOf: number[];
  contains: string;
  doesNotContain: string;
  isEmpty: never;
  isNotEmpty: never;
};

type SelectFilters<O extends readonly string[]> = {
  hasAnyOf: O[number][];
  hasAllOf: O[number][];
  isExactly: O[number][];
  '=': O[number];
  hasNoneOf: O[number][];
  contains: string;
  doesNotContain: string;
  isEmpty: never;
  isNotEmpty: never;
};

type LinkAggregations = {
  empty: number;
  filled: number;
  percentEmpty: number;
  percentFilled: number;
};

type NumberFilters = {
  '=': number;
  '!=': number;
  '>': number;
  '>=': number;
  '<': number;
  '<=': number;
  hasAnyOf: number[];
  hasNoneOf: number[];
  isEmpty: never;
  isNotEmpty: never;
};

type NumberAggregations = {
  sum: number;
  average: number;
  median: number;
  min: number | null;
  max: number | null;
  range: number;
  standardDeviation: number;
  histogram: Record<string, number>;
  empty: number;
  filled: number;
  unique: number;
  percentEmpty: number;
  percentFilled: number;
  percentUnique: number;
};

type CheckboxFilters = {
  '=': number;
};

/**
 *
 * Column types
 *
 */
export type ColumnType<
  S,
  U,
  I,
  R extends boolean,
  F extends { [key: string]: any } = object,
  A extends { [key: string]: any } = object,
> = {
  raw: S;
  insert: I;
  update: U;
  filters: F;
  aggregations: A;
  isRequired: R;
};

export type DateColumnType<R extends boolean> = ColumnType<
  string,
  string,
  string,
  R,
  DateFilters,
  DateAggregations
>;

export type TextColumnType<R extends boolean> = ColumnType<
  string,
  string,
  string,
  R,
  TextFilters
>;

export type SearchColumnType = ColumnType<
  string,
  string,
  string,
  false,
  SearchTextFilters
>;

export type ALinkColumnType<
  T extends string,
  S,
  U,
  I,
  R extends boolean,
  F extends { [key: string]: any } = LinkFilters,
  A extends LinkAggregations = LinkAggregations,
> = ColumnType<S, U, I, R, F, A> & {
  linkedTo: T;
};

export type LinkColumnType<
  T extends string,
  R extends boolean,
> = ALinkColumnType<
  T,
  object,
  number[] | { newIds: number[]; deletedIds: number[] },
  number[],
  R
>;

export type AttachmentColumnType<R extends boolean> = ColumnType<
  string[],
  Attachment[] | AttachmentUpdateValue | number[],
  Attachment[] | number[],
  R,
  LinkFilters,
  LinkAggregations
>;

export type SingleSelectColumnType<
  O extends readonly string[],
  R extends boolean,
> = ColumnType<O[number], O[number], O[number], R, SelectFilters<O>>;

export type MultiSelectColumnType<
  O extends readonly string[],
  R extends boolean,
> = ColumnType<O[number][], O[number][], O[number][], R, SelectFilters<O>>;

export type NumberColumnType<R extends boolean> = ColumnType<
  number,
  number,
  number,
  R,
  NumberFilters,
  NumberAggregations
>;

export type CheckboxColumnType<R extends boolean> = ColumnType<
  boolean,
  boolean,
  boolean,
  R,
  CheckboxFilters
>;

export type AutoGeneratedNumberColumnType = ColumnType<
  number,
  never,
  never,
  false,
  NumberFilters,
  NumberAggregations
>;

export type AutoGeneratedDateColumnType = ColumnType<
  string,
  never,
  never,
  false,
  DateFilters,
  DateAggregations
>;

export type TableRaws<T extends keyof TaylorDatabase> = {
  [K in keyof TaylorDatabase[T]]: TaylorDatabase[T][K] extends ColumnType<
    infer S,
    any,
    any,
    infer R,
    any,
    any
  >
    ? R extends true
      ? S
      : S | undefined
    : never;
};

export type TableInserts<T extends keyof TaylorDatabase> = {
  [K in keyof TaylorDatabase[T]]: TaylorDatabase[T][K] extends ColumnType<
    any,
    infer I,
    any,
    infer R,
    any,
    any
  >
    ? R extends true
      ? I
      : I | undefined
    : never;
};

export type TableUpdates<T extends keyof TaylorDatabase> = {
  [K in keyof TaylorDatabase[T]]: TaylorDatabase[T][K] extends ColumnType<
    any,
    any,
    infer U,
    any,
    any,
    any
  >
    ? U
    : never;
};

export type AttachmentTable = {
  id: AutoGeneratedNumberColumnType;
  name: TextColumnType<true>;
  metadata: TextColumnType<true>;
  size: NumberColumnType<true>;
  fileType: TextColumnType<true>;
  url: TextColumnType<true>;
  searchText: SearchColumnType;
};

export type CollaboratorsTable = {
  id: AutoGeneratedNumberColumnType;
  name: TextColumnType<true>;
  emailAddress: TextColumnType<true>;
  avatar: TextColumnType<true>;
  searchText: SearchColumnType;
};
/** Generic type for plugin actions */
export type PluginActionType<I, O> = { input: I; result: O; };
export type TaylorDatabase = {
  /**
   *
   *
   * Internal tables, these tables can not be queried directly.
   *
   */
  attachmentTable: AttachmentTable;
  collaborators: CollaboratorsTable;
  _plugin: {
    };
  candidates: CandidatesTable;
};
type CandidatesTable = {
  id: NumberColumnType<false>;
  createdAt: AutoGeneratedDateColumnType;
  updatedAt: AutoGeneratedDateColumnType;
  searchText: SearchColumnType;
  name: TextColumnType<false>;
  email: TextColumnType<false>;
  phone: TextColumnType<false>;
  resume: AttachmentColumnType<false>;
  videoIntro: AttachmentColumnType<false>;
  submitted: CheckboxColumnType<false>;
  };
