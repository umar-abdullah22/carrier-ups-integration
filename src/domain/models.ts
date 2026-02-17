import { z } from "zod";

export const AddressSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  companyName: z.string().min(1).max(100).optional(),
  addressLines: z.array(z.string().min(1).max(35)).min(1).max(3),
  city: z.string().min(1).max(30),
  stateProvinceCode: z.string().min(1).max(5).optional(),
  postalCode: z.string().min(1).max(12),
  countryCode: z.string().length(2)
});

export type Address = z.infer<typeof AddressSchema>;

export const DimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["IN", "CM"])
});

export type Dimensions = z.infer<typeof DimensionsSchema>;

export const ParcelSchema = z.object({
  weight: z.number().positive(),
  weightUnit: z.enum(["LBS", "KGS"]),
  dimensions: DimensionsSchema
});

export type Parcel = z.infer<typeof ParcelSchema>;

export const ServiceLevelSchema = z.enum([
  "UPS_GROUND",
  "UPS_2ND_DAY_AIR",
  "UPS_NEXT_DAY_AIR"
]);

export type ServiceLevel = z.infer<typeof ServiceLevelSchema>;

export const RateRequestSchema = z.object({
  shipmentId: z.string().min(1).max(64).optional(),
  origin: AddressSchema,
  destination: AddressSchema,
  parcels: z.array(ParcelSchema).min(1),
  serviceLevel: ServiceLevelSchema.optional(),
  shipDate: z.string().datetime({ offset: true }).optional()
});

export type RateRequest = z.infer<typeof RateRequestSchema>;

export const MoneySchema = z.object({
  currency: z.string().length(3),
  amount: z.number().nonnegative()
});

export type Money = z.infer<typeof MoneySchema>;

export const RateQuoteSchema = z.object({
  carrier: z.string().min(1),
  serviceLevel: z.string().min(1),
  serviceName: z.string().optional(),
  totalCharge: MoneySchema,
  billingWeight: z.number().positive().optional(),
  estimatedDeliveryDays: z.number().int().nonnegative().optional(),
  rawServiceCode: z.string().optional()
});

export type RateQuote = z.infer<typeof RateQuoteSchema>;

export const RateResponseSchema = z.object({
  requestId: z.string().optional(),
  quotes: z.array(RateQuoteSchema).min(1)
});

export type RateResponse = z.infer<typeof RateResponseSchema>;
