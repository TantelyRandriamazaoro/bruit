import type { LucideIconNode } from "@/lib/lucide-marker";

/**
 * Lucide `phone` icon node (ISC), used to rasterize MapLibre markers
 * so map pins match the React `<Phone />` icon elsewhere in the app.
 * Source: lucide-react/dist/esm/icons/phone.mjs
 */
export const PHONE_ICON_NODE: LucideIconNode = [
  [
    "path",
    {
      d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
    },
  ],
];
