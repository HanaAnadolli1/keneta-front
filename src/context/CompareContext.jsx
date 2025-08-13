import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const LS_KEY = "compare:v1";
const MAX_ITEMS = 4;

const snapshotFromProduct = (p) => ({
  id: Number(p.id),
  url_key: p.url_key,
  name: p.name,
  sku: p.sku ?? null,
  formatted_price: p.formatted_price ?? null,
  price: p.price ?? null,
  in_stock: !!p.in_stock,
  image:
    p?.base_image?.medium_image_url || p?.base_image?.small_image_url || "",
});

const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [justAddedId, setJustAddedId] = useState(null);

  const setAndPersist = useCallback((updater) => {
    setItems((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const ids = useMemo(() => new Set(items.map((x) => x.id)), [items]);
  const isCompared = useCallback((id) => ids.has(Number(id)), [ids]);

  const add = useCallback(
    (product) => {
      const snap = snapshotFromProduct(product);
      if (!snap?.id) return;
      setAndPersist((prev) => {
        if (prev.find((x) => x.id === snap.id)) return prev;
        if (prev.length >= MAX_ITEMS) return prev;
        return [...prev, snap];
      });
    },
    [setAndPersist]
  );

  const addWithFlash = useCallback(
    (product) => {
      add(product);
      const id = Number(product?.id);
      setJustAddedId(id);
      window.setTimeout(
        () => setJustAddedId((curr) => (curr === id ? null : curr)),
        1500
      );
    },
    [add]
  );

  const remove = useCallback(
    (id) => setAndPersist((prev) => prev.filter((x) => x.id !== Number(id))),
    [setAndPersist]
  );

  const clear = useCallback(() => setAndPersist([]), [setAndPersist]);

  const value = useMemo(
    () => ({
      items,
      add,
      addWithFlash,
      remove,
      clear,
      isCompared,
      justAddedId,
      max: MAX_ITEMS,
      count: items.length,
    }),
    [items, add, addWithFlash, remove, clear, isCompared, justAddedId]
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
