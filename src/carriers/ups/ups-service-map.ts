import type { ServiceLevel } from "../../domain/models.js";

const map: Record<ServiceLevel, string> = {
  UPS_GROUND: "03",
  UPS_2ND_DAY_AIR: "02",
  UPS_NEXT_DAY_AIR: "01"
};

const reverseMap: Record<string, ServiceLevel | undefined> = {
  "03": "UPS_GROUND",
  "02": "UPS_2ND_DAY_AIR",
  "01": "UPS_NEXT_DAY_AIR"
};

export function toUpsServiceCode(serviceLevel: ServiceLevel): string {
  return map[serviceLevel];
}

export function fromUpsServiceCode(code: string): ServiceLevel | string {
  return reverseMap[code] ?? code;
}
