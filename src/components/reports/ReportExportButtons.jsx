import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export default function ReportExportButtons({ id, loading, onGenerate }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 gap-1.5"
        disabled={!!loading} onClick={() => onGenerate("pdf")}>
        {loading === `${id}-pdf` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        PDF
      </Button>
      <Button size="sm" variant="outline" className="flex-1 gap-1.5"
        disabled={!!loading} onClick={() => onGenerate("xlsx")}>
        {loading === `${id}-xlsx` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Excel
      </Button>
    </div>
  );
}