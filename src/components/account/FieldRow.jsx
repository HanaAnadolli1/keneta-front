export default function FieldRow({ label, children, last = false }) {
  return (
    <div className={`flex items-center justify-between py-5 ${last ? "" : "border-b border-slate-200"}`}>
      <span className="text-[15px] text-slate-600">{label}</span>
      <span className="text-[15px] text-slate-500 font-medium text-right max-w-[60%]">
        {children ?? "—"}
      </span>
    </div>
  );
}
