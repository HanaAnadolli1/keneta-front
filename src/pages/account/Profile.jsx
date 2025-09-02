import React, { useEffect, useState } from "react";
import { getCustomer, updateCustomerProfile } from "../../api/customer";
import FieldRow from "../../components/account/FieldRow";
import Input from "../../components/account/Form/Input";
import Select from "../../components/account/Form/Select";
import TwoCol from "../../components/account/Form/TwoCol";
import Breadcrumbs from "../../components/Breadcrumbs";

export default function Profile() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const breadcrumbs = [
    { label: "Home", path: "/" },
    { label: "Account", path: "/account" },
    { label: "Profile" },
  ];

  const load = async () => {
    try {
      setError("");
      setMessage("");
      const res = await getCustomer();
      setData(res);
    } catch (e) {
      setError(e?.message || "Failed to load profile");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const formEl = e.currentTarget;
      const form = new FormData(formEl);

      // If user didn't enter a new password, remove all password fields
      const newPw = (form.get("new_password") || "").toString().trim();
      if (!newPw) {
        form.delete("current_password");
        form.delete("new_password");
        form.delete("new_password_confirmation");
      }

      // If no image selected, remove it
      const imgInput = formEl.elements.namedItem("image");
      if (!(imgInput && imgInput.files && imgInput.files.length)) {
        form.delete("image");
      }

      await updateCustomerProfile(form); // POST + _method=PUT as we set earlier
      await load();
      setEditing(false);
      setMessage("Profile updated successfully.");
    } catch (e) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!data)
    return (
      <div>
        <Breadcrumbs items={breadcrumbs} />
        <p>Loading…</p>
      </div>
    );

  // ===== READ MODE =====
  if (!editing) {
    return (
      <div>
        <Breadcrumbs items={breadcrumbs} />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Profile</h2>
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-[15px] hover:bg-slate-50"
          >
            Edit
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-3 text-sm text-emerald-600">{message}</p>}

        <div className="bg-white rounded-xl">
          <FieldRow label="First Name">{data.first_name}</FieldRow>
          <FieldRow label="Last Name">{data.last_name}</FieldRow>
          <FieldRow label="Gender">{data.gender}</FieldRow>
          <FieldRow label="Date of Birth">
            {data.date_of_birth && data.date_of_birth !== "0000-00-00"
              ? data.date_of_birth
              : "0000-00-00"}
          </FieldRow>
          <FieldRow label="Email" last>
            {data.email}
          </FieldRow>
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="inline-flex items-center rounded-xl bg-[#0b1446] text-white px-5 py-3 text-[15px]"
            onClick={() => alert("Implement delete endpoint when ready")}
          >
            Delete Profile
          </button>
        </div>
      </div>
    );
  }

  // ===== EDIT MODE =====
  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Profile</h2>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form
        className="space-y-5"
        onSubmit={handleSubmit}
        encType="multipart/form-data"
      >
        <TwoCol>
          <Input
            name="first_name"
            label="First Name"
            defaultValue={data.first_name}
            required
          />
          <Input
            name="last_name"
            label="Last Name"
            defaultValue={data.last_name}
            required
          />
        </TwoCol>
        <TwoCol>
          <Select
            name="gender"
            label="Gender"
            defaultValue={data.gender}
            options={["Male", "Female", "Other"]}
          />
          <Input
            name="date_of_birth"
            label="Date of Birth"
            type="date"
            defaultValue={
              data.date_of_birth && data.date_of_birth !== "0000-00-00"
                ? data.date_of_birth
                : ""
            }
          />
        </TwoCol>
        <TwoCol>
          <Input
            name="email"
            label="Email"
            type="email"
            defaultValue={data.email}
          />
          <Input name="phone" label="Phone" defaultValue={data.phone || ""} />
        </TwoCol>

        <TwoCol>
          <Input
            name="current_password"
            label="Current Password"
            type="password"
            autoComplete="current-password"
          />
          <Input
            name="new_password"
            label="New Password"
            type="password"
            autoComplete="new-password"
          />
        </TwoCol>
        <Input
          name="new_password_confirmation"
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
        />

        <div>
          <label className="block text-sm mb-1">Profile Image</label>
          <input type="file" name="image" accept="image/*" />
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-xl bg-[#0b1446] text-white px-5 py-3 text-[15px]"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-5 py-3 text-[15px] hover:bg-slate-50"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
