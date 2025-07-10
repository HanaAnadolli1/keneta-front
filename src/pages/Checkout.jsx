// src/pages/Checkout.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCheckoutAddress,
  useCheckoutShippingMethod,
  useCheckoutPaymentMethod,
  usePlaceOrder,
} from "../api/checkout";
import AddressForm from "../components/AddressForm";
import ShippingOptions from "../components/ShippingOptions";
import PaymentOptions from "../components/PaymentOptions";

export default function Checkout() {
  const navigate = useNavigate();

  // — form + selection state —
  const [billing, setBilling] = useState({
    company_name: "",
    first_name: "",
    last_name: "",
    email: "",
    address: [""],
    country: "",
    city: "",
    postcode: "",
    phone: "",
    state: "",
    use_for_shipping: true,
  });
  const [selectedShipping, setSelectedShipping] = useState("");
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState("");

  // — API hooks —
  const addressM = useCheckoutAddress();
  const shippingM = useCheckoutShippingMethod();
  const paymentM = useCheckoutPaymentMethod();
  const orderM = usePlaceOrder();

  // Step 1: submit address → get shippingMethods
  const handleAddress = async () => {
    try {
      await addressM.mutateAsync(billing);
    } catch (err) {
      alert("❌ Address step failed: " + err.message);
    }
  };

  // Step 2: when you click “Proceed” under shipping
  const handleShippingProceed = async () => {
    if (!selectedShipping) return;
    try {
      const pm = await shippingM.mutateAsync(selectedShipping);
      setPaymentMethods(pm);
    } catch (err) {
      alert("❌ Shipping step failed: " + err.message);
    }
  };

  // Step 3: pick a payment method (just persists it, no order yet)
  const handlePaymentSelect = async (method) => {
    try {
      await paymentM.mutateAsync(method);
      setSelectedPayment(method);
    } catch (err) {
      alert("❌ Saving payment method failed: " + err.message);
    }
  };

  // Step 4: actually place the order once “Place Order” is clicked
  const handlePlaceOrder = async () => {
    try {
      const result = await orderM.mutateAsync();
      alert(
        `✅ Order placed!` +
          (result?.data?.order_id ? ` Order #${result.data.order_id}` : "")
      );
      navigate("/", { replace: true });
    } catch (err) {
      alert("❌ Placing order failed: " + err.message);
    }
  };

  return (
    <div>
      {/* — Step 1: Address Form — */}
      <AddressForm
        billing={billing}
        onChange={setBilling}
        onSubmit={handleAddress}
        loading={addressM.isLoading}
        error={addressM.error}
      />

      {/* — Step 2: Shipping Options & Proceed — */}
      {addressM.isSuccess && (
        <>
          <ShippingOptions
            methods={addressM.data}
            selected={selectedShipping}
            onSelect={setSelectedShipping}
            loading={shippingM.isLoading}
            error={shippingM.error}
          />

          <button
            onClick={handleShippingProceed}
            disabled={!selectedShipping || shippingM.isLoading}
            style={{ margin: "1rem 0" }}
          >
            {shippingM.isLoading ? "Loading…" : "Proceed"}
          </button>
        </>
      )}

      {/* — Step 3: Payment Options — */}
      {paymentMethods && (
        <PaymentOptions
          methods={paymentMethods}
          selected={selectedPayment}
          onSelect={handlePaymentSelect}
          loading={paymentM.isLoading}
          error={paymentM.error}
        />
      )}

      {/* — Step 4: Place Order Button — */}
      {selectedPayment && (
        <button
          onClick={handlePlaceOrder}
          disabled={orderM.isLoading}
          style={{ marginTop: "1rem" }}
        >
          {orderM.isLoading ? "Placing Order…" : "Place Order"}
        </button>
      )}
    </div>
  );
}
