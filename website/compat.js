/* Root callbacks and legacy installed-app launches belong to the game.
 * This only routes credentials; the game's existing auth handler validates them.
 * Never log callback URLs or accept a user-supplied redirect destination.
 */
(function (root) {
  "use strict";
  const routes = new Set(["signup-confirmed", "email-changed", "recovery", "password-changed", "reauth"]);
  const types = new Set(["signup", "email_change", "recovery", "invite", "magiclink"]);
  function isAuthCallback(params) {
    return routes.has(params.get("auth")) ||
      Boolean(params.get("access_token")) ||
      (types.has(params.get("type")) && ["token_hash", "code", "error", "error_description"].some(key => params.has(key))) ||
      (params.has("error") && params.has("error_description"));
  }
  function gameDestination(href, standalone = false) {
    const url = new URL(href);
    if (url.pathname !== "/") return null;
    if (!standalone && !isAuthCallback(url.searchParams) && !isAuthCallback(new URLSearchParams(url.hash.slice(1)))) return null;
    return "/play" + url.search + url.hash;
  }
  if (typeof module === "object" && module.exports) module.exports = { isAuthCallback, gameDestination };
  else {
    const standalone = root.matchMedia("(display-mode: standalone)").matches || root.navigator.standalone === true;
    const destination = gameDestination(root.location.href, standalone);
    if (destination) root.location.replace(destination);
  }
})(typeof window === "undefined" ? null : window);
