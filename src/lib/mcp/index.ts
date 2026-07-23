import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSaunasTool from "./tools/list-saunas";
import getSaunaTool from "./tools/get-sauna";
import findNearestSaunaTool from "./tools/find-nearest-sauna";
import getHomeSaunaTool from "./tools/get-home-sauna";
import setHomeSaunaTool from "./tools/set-home-sauna";

// Direct supabase.co issuer (never the .lovable.cloud proxy). Built from the
// project ref that Vite inlines at build time — keeps this module import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "saunas-in-ireland-mcp",
  title: "Saunas in Ireland",
  version: "0.1.0",
  instructions:
    "Tools for the Saunas in Ireland app. Use `list_saunas` and `find_nearest_sauna` to discover coastal saunas across Ireland, Wales, England, and Scotland. Use `get_home_sauna` and `set_home_sauna` to read or update the signed-in user's chosen home sauna.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listSaunasTool,
    getSaunaTool,
    findNearestSaunaTool,
    getHomeSaunaTool,
    setHomeSaunaTool,
  ],
});
