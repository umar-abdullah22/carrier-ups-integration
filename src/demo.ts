import { createDefaultService } from "./index.js";

async function run() {
  const service = createDefaultService();
  const rates = await service.getRates("UPS", {
    shipmentId: "sample-001",
    origin: {
      name: "Warehouse",
      addressLines: ["123 Shipper St"],
      city: "Atlanta",
      stateProvinceCode: "GA",
      postalCode: "30301",
      countryCode: "US"
    },
    destination: {
      name: "Customer",
      addressLines: ["55 Main Ave"],
      city: "Austin",
      stateProvinceCode: "TX",
      postalCode: "73301",
      countryCode: "US"
    },
    parcels: [
      {
        weight: 2.5,
        weightUnit: "LBS",
        dimensions: {
          length: 12,
          width: 8,
          height: 4,
          unit: "IN"
        }
      }
    ]
  });

  console.log(JSON.stringify(rates, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
