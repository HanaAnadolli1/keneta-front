import React from "react";

export default function AddressForm({
  billing,
  onChange,
  onSubmit,
  loading,
  error,
}) {
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    const next = {
      ...billing,
      address: Array.isArray(billing.address) ? billing.address : [""],
    };
    if (name === "use_for_shipping") next.use_for_shipping = checked;
    else if (name === "address") next.address = [value];
    else next[name] = value;
    onChange(next);
  };

  const streetLine = Array.isArray(billing.address) ? billing.address[0] : "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-white shadow rounded-lg p-8 space-y-6"
    >
      <h2 className="text-2xl font-semibold text-gray-800">Billing Address</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            name="company_name"
            value={billing.company_name}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            name="first_name"
            required
            value={billing.first_name}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            name="last_name"
            required
            value={billing.last_name}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Email */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            value={billing.email}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Street */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            name="address"
            required
            value={streetLine}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            name="country"
            required
            value={billing.country}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select country…</option>
            <option value="US">United States</option>
            <option value="DE">Germany</option>
            <option value="AL">Albania</option>
          </select>
        </div>
        {/* State */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            State <span className="text-red-500">*</span>
          </label>
          <input
            name="state"
            required
            value={billing.state}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
          </label>
          <input
            name="city"
            required
            value={billing.city}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Zip/Postcode */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Zip/Postcode <span className="text-red-500">*</span>
          </label>
          <input
            name="postcode"
            required
            value={billing.postcode}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Telephone */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Telephone <span className="text-red-500">*</span>
          </label>
          <input
            name="phone"
            required
            value={billing.phone}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="use_for_shipping"
          name="use_for_shipping"
          type="checkbox"
          checked={billing.use_for_shipping}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <label
          htmlFor="use_for_shipping"
          className="ml-2 block text-sm text-gray-700"
        >
          Use same address for shipping
        </label>
      </div>

      {error && <div className="text-red-500">{error.message}</div>}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full md:w-auto
          bg-[#0b0c2c] text-white
          py-3 px-6
          rounded-full
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:opacity-90
          transition
        "
      >
        {loading ? "Saving…" : "Proceed"}
      </button>
    </form>
  );
}
