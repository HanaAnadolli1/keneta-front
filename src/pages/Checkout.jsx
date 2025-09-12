import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

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
  useCustomerProfile,
  useCheckMinimumOrder,
  useSavedAddresses,
  useSaveAddress,
} from "../api/customerCheckout";

import AddressForm from "../components/AddressForm";
import AddressSelector from "../components/AddressSelector";
import ShippingOptions from "../components/ShippingOptions";
import PaymentOptions from "../components/PaymentOptions";
import CartSummary from "../components/CartSummary";
import Breadcrumbs from "../components/Breadcrumbs";

export default function Checkout() {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();

  const isLoggedIn = !!localStorage.getItem("token");

  const breadcrumbs = [{ label: "Home", path: "/" }, { label: "Checkout" }];

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
  
  // New hooks for customer profile and minimum order check
  const { data: customerProfile, isLoading: profileLoading, error: profileError } = useCustomerProfile();
  const { refetch: checkMinimumOrder } = useCheckMinimumOrder();
  const { data: savedAddresses } = useSavedAddresses();
  const saveAddressMutation = useSaveAddress();

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

  const [shipping, setShipping] = useState({
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
  });

  // Address selection states
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState(null);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState(null);
  const [useBillingForShipping, setUseBillingForShipping] = useState(true);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [saveBillingAddress, setSaveBillingAddress] = useState(false);

  // Autofill form with customer data when logged in
  useEffect(() => {
    if (isLoggedIn && customerProfile && !profileLoading) {
      const profile = customerProfile.data || customerProfile;
      const hasProfileData = profile.first_name || profile.last_name || profile.email;
      
      if (hasProfileData) {
        setBilling(prevBilling => ({
          ...prevBilling,
          // Only update fields that exist in the profile and are not empty
          ...(profile.company_name && { company_name: profile.company_name }),
          ...(profile.first_name && { first_name: profile.first_name }),
          ...(profile.last_name && { last_name: profile.last_name }),
          ...(profile.email && { email: profile.email }),
          ...(profile.phone && { phone: profile.phone }),
          // Address fields - only update if they exist
          ...(profile.address && { address: [profile.address] }),
          ...(profile.address1 && { address: [profile.address1] }),
          ...(profile.country && { country: profile.country }),
          ...(profile.city && { city: profile.city }),
          ...(profile.postcode && { postcode: profile.postcode }),
          ...(profile.state && { state: profile.state }),
        }));
        
        setAutofillMessage("Form autofilled with your profile information");
        // Clear message after 3 seconds
        setTimeout(() => setAutofillMessage(""), 3000);
      }
    }
  }, [isLoggedIn, customerProfile, profileLoading]);

  const [shippingOptions, setShippingOptions] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [autofillMessage, setAutofillMessage] = useState("");

  // Address selection handlers
  const handleBillingAddressSelect = (address) => {
    setSelectedBillingAddressId(address.id);
    setBilling({
      company_name: address.company_name || "",
      first_name: address.first_name || "",
      last_name: address.last_name || "",
      email: address.email || "",
      address: [address.address1 || ""],
      country: address.country || "",
      city: address.city || "",
      postcode: address.postcode || "",
      phone: address.phone || "",
      state: address.state || "",
      use_for_shipping: useBillingForShipping,
    });
    setShowBillingForm(false);
  };

  const handleShippingAddressSelect = (address) => {
    setSelectedShippingAddressId(address.id);
    setShipping({
      company_name: address.company_name || "",
      first_name: address.first_name || "",
      last_name: address.last_name || "",
      email: address.email || "",
      address: [address.address1 || ""],
      country: address.country || "",
      city: address.city || "",
      postcode: address.postcode || "",
      phone: address.phone || "",
      state: address.state || "",
    });
    setShowShippingForm(false);
  };

  const handleUseBillingForShippingChange = (checked) => {
    setUseBillingForShipping(checked);
    if (checked) {
      setSelectedShippingAddressId(null);
      setShowShippingForm(false);
    }
  };

  const handleShippingAddressProceed = () => {
    // For shipping address, we don't need to call the API immediately
    // Just proceed to the next step (shipping options)
    if (shippingOptions) {
      // If shipping options are already loaded, proceed
      return;
    }
    // Otherwise, we need to call the address API with shipping data
    handleAddress();
  };

  const handleAddress = async () => {
    try {
      // Save billing address if requested and user is logged in
      if (isLoggedIn && saveBillingAddress && !selectedBillingAddressId) {
        const addressData = {
          first_name: billing.first_name,
          last_name: billing.last_name,
          company_name: billing.company_name,
          address1: billing.address[0] || "",
          city: billing.city,
          state: billing.state,
          postcode: billing.postcode,
          country: billing.country,
          phone: billing.phone,
          is_default: false,
        };
        await saveAddressMutation.mutateAsync(addressData);
      }

      const ships = await addressM.mutateAsync(billing);
      setShippingOptions(ships);
    } catch (error) {
      console.error("Error saving address:", error);
    }
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
    try {
      // Check minimum order value before placing order
      if (isLoggedIn) {
        const minOrderResult = await checkMinimumOrder();
        if (minOrderResult.data?.error) {
          alert(minOrderResult.data.message || "Minimum order value not met");
          return;
        }
      }
      
      await orderM.mutateAsync();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Order placement failed:", error);
      alert("Failed to place order. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
       <Breadcrumbs items={breadcrumbs} />
       
       {/* Autofill message */}
       {autofillMessage && (
         <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
           {autofillMessage}
         </div>
       )}
       
       {/* Profile loading error */}
       {isLoggedIn && profileError && (
         <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
           Could not load profile information. Please fill in the form manually.
         </div>
       )}
       
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        <div className="lg:col-span-7 space-y-8">
          {/* Billing Address Section */}
          <div className="space-y-4">
            {isLoggedIn && !showBillingForm ? (
              <AddressSelector
                selectedAddressId={selectedBillingAddressId}
                onSelectAddress={handleBillingAddressSelect}
                onUseForm={() => setShowBillingForm(true)}
                onProceed={handleAddress}
                type="billing"
                showSaveButton={true}
                loading={addressM.isLoading}
                error={addressM.error}
              />
            ) : (
              <div className="space-y-4">
                <AddressForm
                  billing={billing}
                  onChange={setBilling}
                  onSubmit={handleAddress}
                  loading={addressM.isLoading || (isLoggedIn && profileLoading)}
                  error={addressM.error}
                  isLoggedIn={isLoggedIn}
                />
                
                {/* Save address option for logged-in users */}
                {isLoggedIn && !selectedBillingAddressId && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <input
                        id="save_billing_address"
                        type="checkbox"
                        checked={saveBillingAddress}
                        onChange={(e) => setSaveBillingAddress(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="save_billing_address" className="ml-2 block text-sm text-gray-700">
                        Save this address for future use
                      </label>
                    </div>
                  </div>
                )}
                
                {showBillingForm && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <button
                      onClick={() => setShowBillingForm(false)}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to saved addresses
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Use same address for shipping checkbox */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    id="use_same_address"
                    type="checkbox"
                    checked={useBillingForShipping}
                    onChange={(e) => handleUseBillingForShippingChange(e.target.checked)}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="use_same_address" className="ml-3 text-sm font-medium text-gray-900">
                    Use same address for shipping?
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {useBillingForShipping 
                    ? "Your billing address will be used for shipping" 
                    : "You can set a different address for shipping"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Address Section - only show if not using billing address */}
          {!useBillingForShipping && (
            <div className="space-y-4">
              {isLoggedIn && !showShippingForm ? (
                <AddressSelector
                  selectedAddressId={selectedShippingAddressId}
                  onSelectAddress={handleShippingAddressSelect}
                  onUseForm={() => setShowShippingForm(true)}
                  onProceed={handleShippingAddressProceed}
                  type="shipping"
                  showSaveButton={true}
                  loading={addressM.isLoading}
                  error={addressM.error}
                />
              ) : (
                <div className="space-y-4">
                  <AddressForm
                    billing={shipping}
                    onChange={setShipping}
                    onSubmit={() => {}} // Shipping form doesn't need separate submission
                    loading={false}
                    error={null}
                    isLoggedIn={isLoggedIn}
                    title="Shipping Address"
                  />
                  
                  {showShippingForm && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <button
                        onClick={() => setShowShippingForm(false)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to saved addresses
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
