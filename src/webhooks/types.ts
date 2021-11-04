export const webhookTypes = [
  "basic",
  "typeform",
  "sendgrid",
  "shopify",
  "twitter",
  "stripe",
] as const;

export type WebhookType = typeof webhookTypes[number];

export const webhookNames: Record<WebhookType, string> = {
  sendgrid: "Sendgrid",
  typeform: "Typeform",
  shopify: "Shopify",
  twitter: "Twitter",
  stripe: "Stripe",
  basic: "Basic",
};

export interface IWebhookEditor {
  displayName: string;
  photoURL: string;
  lastUpdate: number;
}

export interface IWebhook {
  // rowy meta fields
  name: string;
  active: boolean;
  lastEditor: IWebhookEditor;
  // webhook specific fields
  endpoint: string;
  type: WebhookType;
  parser: string;
  conditions: string;
  secret?: string;
}
