/**
 * Complete and approve this pricing matrix before enabling public dollar estimates.
 * Known reference: $135 per crew-hour for deep cleaning.
 * $135 was discussed as a proposal only and is NOT activated here.
 */
export type ServiceType = "standard" | "deep" | "move" | "recurring";
export type PropertyCondition = "light" | "average" | "heavy";
export type AddOnId = "inside-fridge" | "inside-oven" | "interior-windows" | "baseboards";

export const SERVICE_LABELS: Record<ServiceType, string> = {
  standard: "Standard cleaning",
  recurring: "Recurring cleaning",
  deep: "Deep cleaning",
  move: "Move-in / move-out cleaning",
};
export const ADD_ON_LABELS: Record<AddOnId, string> = {
  "inside-fridge": "Inside refrigerator",
  "inside-oven": "Inside oven",
  "interior-windows": "Interior windows",
  baseboards: "Detailed baseboards",
};

export const PRICING_CONFIG = {
  approvedForPublicDisplay: false,
  crewHourRate: {
    standard: null as number | null,
    recurring: null as number | null,
    deep: 135 as number | null,
    move: null as number | null,
  },
  // Each entry is [minimum crew-hours, maximum crew-hours].
  // Fill using TC Cleaning's actual completed-job history.
  bedrooms: {
    1: null as [number, number] | null, 2: null, 3: null,
    4: null, 5: null, 6: null,
  } as Record<number, [number, number] | null>,
  bathrooms: {
    1: null as [number, number] | null, 2: null, 3: null,
    4: null, 5: null, 6: null,
  } as Record<number, [number, number] | null>,
  squareFeet: [
    { max: 1000, hours: null as [number, number] | null },
    { max: 1500, hours: null }, { max: 2000, hours: null },
    { max: 2500, hours: null }, { max: 3000, hours: null },
    { max: 4000, hours: null }, { max: 5000, hours: null },
    { max: Number.POSITIVE_INFINITY, hours: null },
  ],
  conditionMultiplier: {
    light: null as number | null,
    average: null as number | null,
    heavy: null as number | null,
  },
  addOnPrices: {
    "inside-fridge": null as number | null,
    "inside-oven": null as number | null,
    "interior-windows": null as number | null,
    baseboards: null as number | null,
  } satisfies Record<AddOnId, number | null>,
  upperRangeBufferPercent: null as number | null,
  roundUpTo: 10,
};
