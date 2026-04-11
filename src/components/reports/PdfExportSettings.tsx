import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Settings2, ChevronDown } from 'lucide-react';
import { WORK_LOG_COLUMNS, DEFAULT_VISIBLE_COLUMNS, type WorkLogColumn } from '@/lib/pdfExportConfig';

interface PdfExportSettingsProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  visibleColumns: WorkLogColumn[];
  onVisibleColumnsChange: (columns: WorkLogColumn[]) => void;
}

export function PdfExportSettings({
  fontSize,
  onFontSizeChange,
  visibleColumns,
  onVisibleColumnsChange,
}: PdfExportSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleColumn = (key: WorkLogColumn) => {
    if (visibleColumns.includes(key)) {
      // Don't allow removing all columns
      if (visibleColumns.length <= 1) return;
      onVisibleColumnsChange(visibleColumns.filter(c => c !== key));
    } else {
      onVisibleColumnsChange([...visibleColumns, key]);
    }
  };

  const selectAll = () => onVisibleColumnsChange(DEFAULT_VISIBLE_COLUMNS);
  const selectNone = () => onVisibleColumnsChange(['date', 'account']); // minimum useful set

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1">
        <Settings2 className="h-4 w-4" />
        <span className="font-medium">PDF Export Settings</span>
        <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 bg-[hsl(var(--card))]/80 border-border/50">
          <CardContent className="pt-4 space-y-4">
            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Text Size</Label>
                <span className="text-xs text-muted-foreground font-mono">{fontSize}pt</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Small</span>
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) => onFontSizeChange(v)}
                  min={5}
                  max={12}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">Large</span>
              </div>
            </div>

            {/* Column Visibility */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Visible Columns</Label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    All
                  </button>
                  <span className="text-xs text-muted-foreground">|</span>
                  <button
                    onClick={selectNone}
                    className="text-xs text-primary hover:underline"
                  >
                    Minimal
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {WORK_LOG_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={visibleColumns.includes(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      className="h-3.5 w-3.5"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
