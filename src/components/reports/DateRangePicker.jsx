import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function DateRangePicker({ dateFrom, dateTo, setDateFrom, setDateTo }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-background border-border text-white text-xs h-8" />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-background border-border text-white text-xs h-8" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" className="text-xs h-6 px-2" onClick={() => {
          setDateFrom(format(startOfMonth(new Date()), "yyyy-MM-dd"));
          setDateTo(format(endOfMonth(new Date()), "yyyy-MM-dd"));
        }}>Este Mes</Button>
        <Button variant="outline" size="sm" className="text-xs h-6 px-2" onClick={() => {
          const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
          setDateFrom(format(startOfMonth(prev), "yyyy-MM-dd"));
          setDateTo(format(endOfMonth(prev), "yyyy-MM-dd"));
        }}>Mes Anterior</Button>
      </div>
    </div>
  );
}