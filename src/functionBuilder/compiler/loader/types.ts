export type IExtensionType =
  | "task"
  | "docSync"
  | "historySnapshot"
  | "algoliaIndex"
  | "meiliIndex"
  | "bigqueryIndex"
  | "slackMessage"
  | "sendgridEmail"
  | "apiCall"
  | "twilioMessage";

export type IExtensionTrigger = "create" | "update" | "delete";

export interface IExtensionEditor {
  displayName: string;
  photoURL: string;
  lastUpdate: number;
}

export interface IExtension {
  // rowy meta fields
  name: string;
  active: boolean;
  lastEditor: IExtensionEditor;

  // ft build fields
  triggers: IExtensionTrigger[];
  type: IExtensionType;
  requiredFields: string[];
  extensionBody: string;
  conditions: string;
}
export type TriggerPathType =
  | "collection"
  | "collectionGroup"
  | "subCollection";
export interface TableConfig {
  derivativeColumns: any[];
  defaultValueColumns: any[];
  documentSelectColumns: any[];
  fieldTypes: any;
  extensions: IExtension[];
}
