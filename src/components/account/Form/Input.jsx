export default function Input({ label, className = "", ...props }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input {...props} className={`w-full border rounded p-2 ${className}`} />
    </div>
  );
}
