interface SidebarSearchProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function SidebarSearch({ id, value, onChange }: SidebarSearchProps) {
  return (
    <div className="p-3 border-b border-border">
      <label htmlFor={id} className="sr-only">
        Search poems
      </label>
      <input
        id={id}
        type="text"
        placeholder="Search poems..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded px-3 py-2 text-sm min-h-[44px] bg-surface border border-border text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}
