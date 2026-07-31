import type { WorkLogColumn } from '@/lib/pdfExportConfig';

type ExportSummary = {
  totalJobs: number;
  plowCount: number;
  saltCount: number;
  propertyCount: number;
  dateRange: string;
};

type ExportRow = Record<string, string | undefined>;

type PrintWorkLogsReportParams = {
  fontSize: number;
  generatedAt: string;
  rows: ExportRow[];
  summary: ExportSummary;
  visibleColumns: WorkLogColumn[];
  workLogColumnLabels: Record<WorkLogColumn, string>;
};

const escapePrintHtml = (value: string | undefined) =>
  String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');

const formatTypeLabel = (type: string) => type.toLowerCase() === 'shovel' ? 'Shovel' : 'Plow';
const getTypeClass = (type: string) => type.toLowerCase() === 'shovel' ? 'type-shovel' : 'type-plow';

const getServiceClass = (serviceType: string) => {
  const normalized = serviceType.toLowerCase();
  if (normalized === 'salt') return 'service-salt';
  if (normalized === 'shovel') return 'service-shovel';
  if (normalized === 'ice_melt' || normalized === 'ice melt') return 'service-ice-melt';
  if (normalized === 'both') return 'service-both';
  return 'service-plow';
};

export function printWorkLogsReport({
  fontSize,
  generatedAt,
  rows,
  summary,
  visibleColumns,
  workLogColumnLabels,
}: PrintWorkLogsReportParams) {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    return false;
  }

  const tableHeaderHtml = visibleColumns
    .map((column) => `<th>${escapePrintHtml(workLogColumnLabels[column])}</th>`)
    .join('');

  const tableBodyHtml = rows.length > 0
    ? rows.map((log) => `
        <tr>
          ${visibleColumns.map((column) => {
            const value = log[column] ?? '-';

            if (column === 'type') {
              return `<td><span class="badge ${getTypeClass(String(value))}">${escapePrintHtml(formatTypeLabel(String(value)))}</span></td>`;
            }

            if (column === 'serviceType') {
              return `<td><span class="badge ${getServiceClass(String(value))}">${escapePrintHtml(String(value))}</span></td>`;
            }

            return `<td>${escapePrintHtml(String(value))}</td>`;
          }).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${visibleColumns.length}" class="empty-state">No work logs found for this period.</td></tr>`;

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Work Logs Report</title>
        <style>
          @page {
            size: landscape;
            margin: 12mm;
          }

          :root {
            color-scheme: light;
          }

          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            margin: 0;
            font-family: Helvetica, Arial, sans-serif;
            color: hsl(222 47% 11%);
            background: hsl(0 0% 100%);
            font-size: ${fontSize}pt;
          }

          .report {
            width: 100%;
          }

          .header {
            margin-bottom: 12pt;
          }

          .title {
            margin: 0 0 6pt;
            font-size: 18pt;
            font-weight: 700;
            color: hsl(222 47% 11%);
          }

          .meta {
            margin: 0;
            color: hsl(215 16% 47%);
            font-size: ${Math.max(fontSize - 1, 5)}pt;
            line-height: 1.5;
          }

          .summary {
            margin: 10pt 0 12pt;
            font-size: ${Math.max(fontSize, 6)}pt;
            font-weight: 600;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid hsl(214 32% 91%);
            padding: 4pt;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
          }

          th {
            background: hsl(200 90% 38%);
            color: hsl(0 0% 100%);
            font-weight: 700;
          }

          tbody tr:nth-child(even) {
            background: hsl(210 40% 98%);
          }

          .badge {
            display: inline-block;
            padding: 2pt 5pt;
            border-radius: 999px;
            font-weight: 700;
          }

          .type-plow,
          .service-plow {
            background: hsl(200 90% 38%);
            color: hsl(0 0% 100%);
          }

          .type-shovel,
          .service-shovel {
            background: hsl(262 83% 58%);
            color: hsl(0 0% 100%);
          }

          .service-salt {
            background: hsl(45 93% 47%);
            color: hsl(222 47% 11%);
          }

          .service-ice-melt {
            background: hsl(188 94% 43%);
            color: hsl(0 0% 100%);
          }

          .service-both {
            background: hsl(142 71% 45%);
            color: hsl(0 0% 100%);
          }

          .empty-state {
            text-align: center;
            color: hsl(215 16% 47%);
            padding: 18pt;
          }
        </style>
      </head>
      <body>
        <div class="report">
          <header class="header">
            <h1 class="title">Work Logs Report</h1>
            <p class="meta">Generated: ${escapePrintHtml(generatedAt)}</p>
            <p class="meta">Period: ${escapePrintHtml(summary.dateRange)}</p>
            <p class="summary">Total Services: ${summary.totalJobs} | Plow: ${summary.plowCount} | Salt: ${summary.saltCount} | Properties: ${summary.propertyCount}</p>
          </header>
          <table>
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${tableBodyHtml}
            </tbody>
          </table>
        </div>
        <script>
          window.onload = function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 150);
          };
          window.onafterprint = function () {
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}
