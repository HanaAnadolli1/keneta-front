import React, { useEffect, useState } from "react";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../../api/customer";
import Breadcrumbs from "../../components/Breadcrumbs";
import { MapPin, Plus, Edit2, Trash2 } from "lucide-react";
import Modal from "../../components/Modal";

export default function Address() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState(getEmptyAddress());

  const breadcrumbs = [
    { label: "Home", path: "/" },
    { label: "Account", path: "/account" },
    { label: "Address" },
  ];

  function getEmptyAddress() {
    return {
      company_name: "",
      first_name: "",
      last_name: "",
      email: "",
      address: [""],
      country: "",
      state: "",
      city: "",
      postcode: "",
      phone: "",
      default_address: false,
    };
  }

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAddresses();
      // The API might return { data: [...] } or just [...]
      const addressList = res?.data || res || [];
      setAddresses(Array.isArray(addressList) ? addressList : []);
    } catch (e) {
      setError(e?.message || "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        company_name: address.company_name || "",
        first_name: address.first_name || "",
        last_name: address.last_name || "",
        email: address.email || "",
        address: Array.isArray(address.address)
          ? address.address
          : [address.address || ""],
        country: address.country || "",
        state: address.state || "",
        city: address.city || "",
        postcode: address.postcode || "",
        phone: address.phone || "",
        default_address: address.default_address || false,
      });
    } else {
      setEditingAddress(null);
      setFormData(getEmptyAddress());
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAddress(null);
    setFormData(getEmptyAddress());
    setError("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "address") {
      setFormData({ ...formData, address: [value] });
    } else if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, formData);
        setMessage("Address updated successfully");
      } else {
        await createAddress(formData);
        setMessage("Address created successfully");
      }
      handleCloseModal();
      await load();
    } catch (e) {
      setError(e?.message || "Failed to save address");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      setError("");
      setMessage("");
      await deleteAddress(id);
      setMessage("Address deleted successfully");
      await load();
    } catch (e) {
      setError(e?.message || "Failed to delete address");
    }
  };

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">My Addresses</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-xl bg-[#0b1446] text-white px-4 py-2 text-[15px] hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Add New Address
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-4 bg-emerald-50 text-emerald-600 rounded-lg">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <p className="text-slate-500">Loading addresses...</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center">
          <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 mb-4">
            You haven't added any addresses yet
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b1446] text-white px-4 py-2 text-[15px] hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {addr.first_name} {addr.last_name}
                    </h3>
                    {addr.company_name && (
                      <p className="text-sm text-slate-600">
                        {addr.company_name}
                      </p>
                    )}
                  </div>
                </div>
                {addr.default_address && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>

              <div className="text-sm text-slate-600 space-y-1 mb-4">
                <p>
                  {Array.isArray(addr.address) ? addr.address[0] : addr.address}
                </p>
                <p>
                  {addr.city}, {addr.state} {addr.postcode}
                </p>
                <p>{addr.country}</p>
                <p className="pt-2">{addr.phone}</p>
                {addr.email && <p>{addr.email}</p>}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenModal(addr)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Address Form Modal */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={handleCloseModal}
          title={editingAddress ? "Edit Address" : "Add New Address"}
          size="lg"
        >
          <div className="max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                />
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                />
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={
                    Array.isArray(formData.address)
                      ? formData.address[0]
                      : formData.address
                  }
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                />
              </div>

              {/* Country & State */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                  >
                    <option value="">Select country...</option>
                    <option value="US">United States</option>
                    <option value="DE">Germany</option>
                    <option value="AL">Albania</option>
                    <option value="GB">United Kingdom</option>
                    <option value="FR">France</option>
                    <option value="IT">Italy</option>
                    <option value="ES">Spain</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                  />
                </div>
              </div>

              {/* City & Postcode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0b1446] focus:border-transparent"
                />
              </div>

              {/* Default Address */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="default_address"
                  name="default_address"
                  checked={formData.default_address}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#0b1446] border-slate-300 rounded focus:ring-[#0b1446]"
                />
                <label
                  htmlFor="default_address"
                  className="ml-2 text-sm text-slate-700"
                >
                  Set as default address
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#0b1446] text-white px-5 py-3 text-[15px] hover:opacity-90 transition"
                >
                  {editingAddress ? "Update Address" : "Add Address"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-xl border border-slate-300 px-5 py-3 text-[15px] hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
