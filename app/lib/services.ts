export type CleaningServicePage = {
  slug: string;
  name: string;
  shortName: string;
  title: string;
  description: string;
  intro: string;
  bestFor: string;
  planningPoints: string[];
  process: string[];
  faqs: { question: string; answer: string }[];
};

export const serviceAreas = [
  "Mesa",
  "Gilbert",
  "Chandler",
  "Tempe",
  "Queen Creek",
  "Phoenix",
  "Scottsdale",
];

export const cleaningServices: CleaningServicePage[] = [
  {
    slug: "residential-cleaning",
    name: "Residential Cleaning",
    shortName: "Home cleaning",
    title: "Residential House Cleaning in Mesa & the East Valley",
    description:
      "Request residential house cleaning in Mesa, Gilbert, Chandler, Tempe, Queen Creek, Phoenix, or Scottsdale. Tell TC Cleaning about your home and priorities for a tailored estimate.",
    intro:
      "A home cleaning visit should fit the home and the people who live in it. TC Cleaning Services AZ LLC provides one-time residential cleaning across Mesa and nearby East Valley communities, with the task list agreed on before the appointment.",
    bestFor:
      "A one-time home refresh, help before guests arrive, or support with household upkeep.",
    planningPoints: [
      "Which rooms and surfaces should be included",
      "Home size, current condition, and any areas needing extra attention",
      "Access details, preferred timing, and household priorities",
    ],
    process: [
      "Share your home details through the online quote form.",
      "We review the requested scope and follow up if we need clarification.",
      "We confirm the estimate and appointment details with you before scheduling.",
    ],
    faqs: [
      {
        question: "Can I request only certain rooms?",
        answer:
          "Yes. Include the rooms and priorities in your request so the estimate can reflect the service you want.",
      },
      {
        question: "Do you provide a fixed price online?",
        answer:
          "The online form gathers details to prepare a personalized estimate. Final scope and pricing are reviewed with you before a booking is confirmed.",
      },
    ],
  },
  {
    slug: "recurring-cleaning",
    name: "Recurring Cleaning",
    shortName: "Recurring visits",
    title: "Recurring House Cleaning in Mesa & the East Valley",
    description:
      "Explore weekly, biweekly, triweekly, or monthly house cleaning in Mesa and surrounding East Valley cities. Request a recurring cleaning estimate from TC Cleaning.",
    intro:
      "A recurring plan can make it easier to keep up with a home over time. We offer weekly, biweekly, triweekly, and monthly visits, with the routine scope and timing discussed with you before recurring appointments are set.",
    bestFor:
      "Households looking for an agreed schedule and consistent maintenance visits.",
    planningPoints: [
      "The visit frequency that best fits your household",
      "Rooms and recurring tasks to include in the regular scope",
      "Any changes in priorities that should be reviewed before a visit",
    ],
    process: [
      "Tell us about the property and the schedule you have in mind.",
      "We discuss the recurring scope and prepare an estimate for review.",
      "Once you approve the plan, we confirm the schedule and visit details.",
    ],
    faqs: [
      {
        question: "What frequencies are available?",
        answer:
          "Weekly, biweekly, triweekly, and monthly visits are available by request. The schedule is confirmed directly with TC Cleaning.",
      },
      {
        question: "Can the cleaning priorities change over time?",
        answer:
          "Please let us know about changes in advance so we can review the scope and update the estimate or visit plan if needed.",
      },
    ],
  },
  {
    slug: "deep-cleaning",
    name: "Deep Cleaning",
    shortName: "Deep cleaning",
    title: "Deep Cleaning Services in Mesa & the East Valley",
    description:
      "Request a detailed home deep-clean estimate in Mesa, Gilbert, Chandler, Tempe, Queen Creek, Phoenix, or Scottsdale. Scope is tailored to your home and requested priorities.",
    intro:
      "When routine upkeep is not enough, a deep clean can focus more time on the areas that need it. We review the home’s condition and your priorities first, then define the included tasks and estimate with you.",
    bestFor:
      "A first visit, seasonal reset, or a home with rooms that need more detailed attention.",
    planningPoints: [
      "Kitchen and bathroom details you want prioritized",
      "Living spaces, fixtures, and surfaces needing extra attention",
      "The property’s current condition and any add-on requests",
    ],
    process: [
      "Describe the home and the areas that need the most attention.",
      "We review the condition and requested task list to estimate the work.",
      "We confirm the scope, price, and timing with you before the job is booked.",
    ],
    faqs: [
      {
        question: "How is a deep clean different from routine cleaning?",
        answer:
          "A deep clean is planned around the areas that need additional detail. The final checklist depends on the home and is agreed on when the estimate is prepared.",
      },
      {
        question: "Can I include an extra task like an oven or refrigerator?",
        answer:
          "Include requested extras in the quote form. We will confirm whether each task is available and how it affects the estimate.",
      },
    ],
  },
  {
    slug: "move-in-move-out-cleaning",
    name: "Move-In / Move-Out Cleaning",
    shortName: "Move-in / move-out",
    title: "Move-In & Move-Out Cleaning in Mesa & the East Valley",
    description:
      "Plan a move-in or move-out clean in Mesa and nearby East Valley communities. TC Cleaning reviews property condition, access, timing, and checklist before preparing an estimate.",
    intro:
      "Moving brings a lot of details to coordinate. A move-in or move-out cleaning request starts with the property condition, access, timing, and the checklist you need completed so we can prepare a clear, tailored estimate.",
    bestFor:
      "A home being prepared for a new resident, lease handoff, or move to another home.",
    planningPoints: [
      "Whether the home will be empty and when access is available",
      "Property size, current condition, and requested checklist",
      "Move or handoff timing and any access requirements",
    ],
    process: [
      "Share the property details and target dates in the quote form.",
      "We review the checklist, access, and condition to scope the work.",
      "We send the estimate for approval and confirm scheduling separately.",
    ],
    faqs: [
      {
        question: "Should the property be empty?",
        answer:
          "Tell us whether the home will be empty and what access will be available. We will confirm the plan based on the property and requested scope.",
      },
      {
        question: "Can you coordinate around a move date?",
        answer:
          "Share your preferred date as early as possible. We will check availability and confirm only after the appointment is agreed with you.",
      },
    ],
  },
  {
    slug: "commercial-cleaning",
    name: "Commercial Cleaning",
    shortName: "Commercial spaces",
    title: "Commercial Cleaning in Mesa & the East Valley",
    description:
      "Request commercial cleaning for offices and professional spaces in Mesa and the East Valley. Service scope and schedule are tailored to the property and business needs.",
    intro:
      "Every workplace has different spaces, operating hours, and cleaning priorities. TC Cleaning discusses the areas in use, access, preferred schedule, and requested scope before preparing a commercial cleaning estimate.",
    bestFor:
      "Offices and professional spaces seeking a one-time or scheduled cleaning plan.",
    planningPoints: [
      "Type and approximate size of the space",
      "Areas in use, access needs, and preferred timing",
      "One-time or recurring service requirements",
    ],
    process: [
      "Send the business and property details through the quote form.",
      "We follow up to clarify the requested scope and access.",
      "We provide an estimate for review before confirming a service schedule.",
    ],
    faqs: [
      {
        question: "Do you offer recurring commercial service?",
        answer:
          "Recurring schedules can be discussed. Availability and scope are confirmed after reviewing the location and business needs.",
      },
      {
        question: "How do you price an office cleaning?",
        answer:
          "The estimate depends on the space, condition, requested areas, access, and schedule. Share those details and we will prepare a tailored quote.",
      },
    ],
  },
  {
    slug: "rental-turnover-cleaning",
    name: "Rental & Airbnb Turnovers",
    shortName: "Rental turnovers",
    title: "Rental Turnover Cleaning in Mesa & the East Valley",
    description:
      "Request cleaning for rental turnovers and Airbnb properties in Mesa and the East Valley. Share property access, timing, and turnover checklist for a tailored estimate.",
    intro:
      "A rental turnover has its own access and timing requirements. We review the property, expected turnover window, access instructions, and checklist with you before confirming the service scope.",
    bestFor:
      "Short-term or long-term rental properties needing a one-time or recurring turnover plan.",
    planningPoints: [
      "Property size, condition, and rooms to be serviced",
      "Checkout and next-arrival timing, plus access instructions",
      "Laundry, restocking, or other requested tasks to confirm in advance",
    ],
    process: [
      "Share the property and typical turnover window with us.",
      "We confirm which checklist items can be included and prepare an estimate.",
      "We confirm availability and access details before scheduling a turnover.",
    ],
    faqs: [
      {
        question: "Can I request recurring turnovers?",
        answer:
          "You can request recurring turnover support. Timing, availability, and scope are reviewed before any dates are confirmed.",
      },
      {
        question: "Are laundry and restocking automatically included?",
        answer:
          "No. List those tasks in your request so we can confirm whether they can be included and reflect them in the estimate.",
      },
    ],
  },
];

export function getService(slug: string) {
  return cleaningServices.find((service) => service.slug === slug);
}
