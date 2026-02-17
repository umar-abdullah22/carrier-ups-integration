import { config as loadDotEnv } from "dotenv";
import { z } from "zod";
import { CarrierIntegrationError } from "../domain/errors.js";

loadDotEnv();

const EnvSchema = z.object({
  UPS_BASE_URL: z.string().url(),
  UPS_CLIENT_ID: z.string().min(1),
  UPS_CLIENT_SECRET: z.string().min(1),
  UPS_ACCOUNT_NUMBER: z.string().min(1),
  UPS_TOKEN_PATH: z.string().min(1).default("/security/v1/oauth/token"),
  UPS_RATE_PATH: z.string().min(1).default("/api/rating/v2409/Rate"),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10000)
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new CarrierIntegrationError("Invalid configuration", "CONFIG_ERROR", {
      metadata: { issues: parsed.error.issues }
    });
  }

  return parsed.data;
}
