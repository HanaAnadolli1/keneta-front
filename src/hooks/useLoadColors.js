import { useEffect } from "react";

export default function useLoadColors() {
  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        const res = await fetch(
          "https://admin.keneta-ks.com/api/custom-settings/colors",
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        const json = await res.json();

        if (!abort && json?.status && json?.data) {
          Object.entries(json.data).forEach(([name, value]) => {
            document.documentElement.style.setProperty(`--${name}`, value);
          });
        }
      } catch (e) {
        // Keep CSS defaults if API fails
        console.error("Color API failed; using defaults.", e);
      }
    })();

    return () => {
      abort = true;
    };
  }, []);
}
