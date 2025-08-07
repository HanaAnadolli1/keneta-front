import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 🟢 Both flows
import {
  useCheckoutAddress,
  useCheckoutShippingMethod,
  useCheckoutPaymentMethod,
  usePlaceOrder,
} from "../api/checkout";
import {
  useCustomerCheckoutAddress,
  useCustomerCheckoutShippingMethod,
  useCustomerCheckoutPaymentMethod,
  useCustomerPlaceOrder,
} from "../api/customerCheckout";

import AddressForm from "../components/AddressForm";
import ShippingOptions from "../components/ShippingOptions";
import PaymentOptions from "../components/PaymentOptions";
import CartSummary from "../components/CartSummary";

export default function Checkout() {
  const navigate = useNavigate();

  const isLoggedIn = !!localStorage.getItem("token");

  // 💡 Dynamically select correct hooks
  const addressM = isLoggedIn
    ? useCustomerCheckoutAddress()
    : useCheckoutAddress();
  const shippingM = isLoggedIn
    ? useCustomerCheckoutShippingMethod()
    : useCheckoutShippingMethod();
  const paymentM = isLoggedIn
    ? useCustomerCheckoutPaymentMethod()
    : useCheckoutPaymentMethod();
  const orderM = isLoggedIn ? useCustomerPlaceOrder() : usePlaceOrder();

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

  const [shippingOptions, setShippingOptions] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState("");

  const handleAddress = async () => {
    const ships = await addressM.mutateAsync(billing);
    setShippingOptions(ships);
  };

  const handleShippingProceed = async () => {
    const pays = await shippingM.mutateAsync(selectedShipping);
    console.log("✅ Payment methods set in state:", pays); // Add this!
    setPaymentMethods(pays);
  };

  const handlePaymentSelect = (method) => {
    setSelectedPayment(method); // immediately update UI
    paymentM.mutate(method); // fire async request
  };

  const handlePlaceOrder = async () => {
    await orderM.mutateAsync();
    navigate("/", { replace: true });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <AddressForm
            billing={billing}
            onChange={setBilling}
            onSubmit={handleAddress}
            loading={addressM.isLoading}
            error={addressM.error}
          />
          {shippingOptions && (
            <ShippingOptions
              methods={shippingOptions}
              selected={selectedShipping}
              onSelect={setSelectedShipping}
              onProceed={handleShippingProceed}
              loading={shippingM.isLoading}
              error={shippingM.error}
            />
          )}
          {paymentMethods && (
            <PaymentOptions
              methods={paymentMethods}
              selected={selectedPayment}
              onSelect={handlePaymentSelect}
              loading={paymentM.isLoading}
              error={paymentM.error}
            />
          )}
        </div>
        <div className="lg:col-span-3">
          <CartSummary
            selectedPayment={selectedPayment}
            onPlaceOrder={handlePlaceOrder}
            placing={orderM.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
