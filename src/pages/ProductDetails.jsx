// src/pages/ProductDetails.jsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useCartMutations } from "../api/hooks";

export default function ProductDetails() {
  const { id } = useParams();
  const { addItem } = useCartMutations();

  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    setBusy(true);
    try {
      await addItem.mutateAsync({ productId: id, quantity: qty });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      alert("Failed to add: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* …your product UI… */}
      <div className="flex items-center gap-4">
        <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
        <span>{qty}</span>
        <button onClick={() => setQty((q) => q + 1)}>+</button>
        <button onClick={handleAdd} disabled={busy}>
          {busy ? "Adding…" : "Add to Cart"}
        </button>
      </div>
      {added && <div className="text-green-600">Added!</div>}
    </div>
  );
}
