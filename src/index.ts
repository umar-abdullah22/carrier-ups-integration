import { ShippingService } from "./app/shipping-service.js";
import { UpsCarrierClient } from "./carriers/ups/ups-carrier-client.js";
import { loadConfig } from "./config/config.js";
import type { CarrierName } from "./carriers/base/carrier.js";
import { FetchHttpClient } from "./http/http-client.js";

export { ShippingService } from "./app/shipping-service.js";
export { UpsCarrierClient } from "./carriers/ups/ups-carrier-client.js";
export { CarrierIntegrationError } from "./domain/errors.js";
export * from "./domain/models.js";

export function createDefaultService() {
  const config = loadConfig();
  const httpClient = new FetchHttpClient();
  const ups = new UpsCarrierClient(httpClient, config);

  const carriers = new Map<CarrierName, UpsCarrierClient>();
  carriers.set("UPS", ups);
  return new ShippingService(carriers);
}
