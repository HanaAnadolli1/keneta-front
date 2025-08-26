export default function Card({ title, actions, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200">
      {(title || actions) && (
        <header className="flex items-center justify-between px-5 py-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {actions}
        </header>
      )}
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}
