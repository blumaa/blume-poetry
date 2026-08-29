import { Input } from '@/components/mds';

interface SidebarSearchProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function SidebarSearch({ id, value, onChange }: SidebarSearchProps) {
  return (
    <div className="p-3 border-b border-border">
      <Input
        id={id}
        type="search"
        size="sm"
        aria-label="Search poems"
        placeholder="Search poems..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClear={() => onChange('')}
        clearLabel="Clear search"
      />
    </div>
  );
}
