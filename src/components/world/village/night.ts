import { createContext, useContext } from "react";

/**
 * Dark mode draws the village at night. `lights` adds real point lights at
 * porches and in the court; it's off on low-quality frames to save fill rate.
 */
export const NightContext = createContext({ night: false, lights: false });
export const useNight = () => useContext(NightContext);
