// What free and Pro accounts get in the studios (shown in the plans so everyone knows).
// Free: a number in total. Pro: a number every day. Change them in Vercel with the names below.
import { serverEnv } from "./env";

const n = (name, d) => Number(serverEnv(name)) || d;
export const extraLimits = () => ({
  house: { free: n("HOUSE_FREE_IMAGES", 10), pro: n("HOUSE_PRO_DAILY", 30) },
  design: { free: n("DESIGN_FREE", 10), pro: n("DESIGN_PRO_DAILY", 30) },
  slides: { free: n("SLIDES_FREE", 10), pro: n("SLIDES_PRO_DAILY", 30) },
});
