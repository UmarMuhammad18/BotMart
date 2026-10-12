/** Shared by the server layout (inline <head> script) and the client hook. */
export const THEME_KEY = "botmart-theme";

/** Runs in <head> before React: no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
