export const API_V1 = "https://keneta.laratest-app.com/api/v1";

export async function login({ email, password, device_name = "react" }) {
  const form = new FormData();
  form.append("email", email);
  form.append("password", password);
  form.append("device_name", device_name);
  const res = await fetch(`${API_V1}/customer/login`, {
    method: "POST",
    body: form,
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export async function register(data) {
  const form = new FormData();
  form.append("first_name", data.first_name);
  form.append("last_name", data.last_name);
  form.append("email", data.email);
  form.append("password", data.password);
  form.append("password_confirmation", data.password_confirmation);
  const res = await fetch(`${API_V1}/customer/register`, {
    method: "POST",
    body: form,
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
}
