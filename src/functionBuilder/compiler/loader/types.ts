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
  name: string;
  active: boolean;
  lastEditor: IExtensionEditor;
  triggers: IExtensionTrigger[];
  type: IExtensionType;
  requiredFields: string[];
  trackedFields?: string[];
  extensionBody: string;
  conditions: string;
}

export interface IRuntimeOptions {
  memory?: "128MB" | "256MB" | "512MB" | "1GB" | "2GB" | "4GB" | "8GB";
  timeoutSeconds?: number;
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
  searchIndex?: {
    id: string;
    fields: string[];
  };
  runtimeOptions: IRuntimeOptions;
  tableSchema: any;
}
