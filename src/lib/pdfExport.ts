import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Version for cache busting - increment when making PDF changes
const PDF_VERSION = '1.0.1';
import { format } from 'date-fns';

interface WorkLogData {
  id: string;
  type: 'plow' | 'shovel';
  date: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  account: string;
  serviceType: string;
  snowDepth: string;
  saltLbs: string;
  equipment: string;
  employee: string;
  conditions: string;
  notes?: string;
}

interface ReportSummary {
  totalJobs: number;
  totalHours: number;
  totalSaltLbs: number;
  totalIceMeltLbs: number;
  plowCount: number;
  saltCount: number;
  propertyCount: number;
  dateRange: string;
}

interface GeneratePdfOptions {
  returnBlob?: boolean;
}

export function generateWorkLogsPDF(
  workLogs: WorkLogData[],
  summary: ReportSummary,
  title: string = 'Work Logs Report',
  options?: GeneratePdfOptions
): Blob | void {
  // Landscape orientation for wider table
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // WinterWatch color scheme - service type colors
  const primaryColor: [number, number, number] = [10, 132, 183]; // Sky blue
  const plowColor: [number, number, number] = [10, 132, 183];    // Sky blue for plow
  const saltColor: [number, number, number] = [234, 179, 8];     // Yellow/amber for salt
  const shovelColor: [number, number, number] = [139, 92, 246];  // Purple for shovel
  const iceMeltColor: [number, number, number] = [6, 182, 212];  // Cyan for ice melt
  const bothColor: [number, number, number] = [34, 197, 94];     // Green for both

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'M/d/yyyy h:mm:ss a')} (v${PDF_VERSION})`, 15, 28);
  doc.text(`Period: ${summary.dateRange}`, 15, 34);
  
  // Summary line
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Total Services: ${summary.totalJobs} | Plow: ${summary.plowCount} | Salt: ${summary.saltCount} | Properties: ${summary.propertyCount}`,
    15,
    43
  );

  // Helper to get service type color
  const getServiceColor = (serviceType: string): [number, number, number] => {
    const type = serviceType.toLowerCase();
    if (type === 'plow') return plowColor;
    if (type === 'salt') return saltColor;
    if (type === 'shovel') return shovelColor;
    if (type === 'ice_melt' || type === 'ice melt') return iceMeltColor;
    if (type === 'both') return bothColor;
    return [100, 100, 100]; // Default gray
  };

  // Helper to get type color (plow vs shovel)
  const getTypeColor = (type: string): [number, number, number] => {
    if (type === 'plow') return plowColor;
    if (type === 'shovel') return shovelColor;
    return [100, 100, 100];
  };

  // Work logs table
  if (workLogs.length > 0) {
    autoTable(doc, {
      startY: 50,
      head: [['Type', 'Date', 'Check In', 'Check Out', 'Duration', 'Account', 'Service', 'Snow', 'Salt', 'Equipment', 'Employee', 'Conditions', 'Notes']],
      body: workLogs.map((log) => [
        log.type === 'plow' ? 'Plow' : 'Shovel',
        log.date,
        log.checkIn,
        log.checkOut,
        log.duration,
        log.account,
        log.serviceType,
        log.snowDepth,
        log.saltLbs,
        log.equipment,
        log.employee,
        log.conditions,
        log.notes || '-',
      ]),
      styles: {
        fontSize: 6,
        cellPadding: 1.5,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        lineWidth: 0,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [226, 232, 240], // slate-200 for more contrast
      },
      columnStyles: {
        0: { cellWidth: 16 },  // Type
        1: { cellWidth: 18 },  // Date
        2: { cellWidth: 14 },  // Check In
        3: { cellWidth: 14 },  // Check Out
        4: { cellWidth: 14 },  // Duration
        5: { cellWidth: 32 },  // Account
        6: { cellWidth: 20 },  // Service
        7: { cellWidth: 12 },  // Snow
        8: { cellWidth: 12 },  // Salt
        9: { cellWidth: 24 },  // Equipment
        10: { cellWidth: 28 }, // Employee
        11: { cellWidth: 22 }, // Conditions
        12: { cellWidth: 30 }, // Notes
      },
      didParseCell: (data) => {
        // Color the Type column (index 0) based on plow vs shovel
        if (data.section === 'body' && data.column.index === 0) {
          const type = String(data.cell.raw || '').toLowerCase();
          data.cell.styles.fillColor = getTypeColor(type);
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
        // Color the Service column (index 6) based on service type
        if (data.section === 'body' && data.column.index === 6) {
          const serviceType = String(data.cell.raw || '');
          data.cell.styles.fillColor = getServiceColor(serviceType);
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('No work logs found for this period.', 15, 60);
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Return blob or save file
  if (options?.returnBlob) {
    return doc.output('blob');
  }
  
  // Save with date range in filename
  const fileName = `work-logs-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

export function generateInvoicePDF(
  accountName: string,
  workLogs: WorkLogData[],
  dateRange: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 14, 20, { align: 'right' });
  
  doc.setFontSize(16);
  doc.text('WinterWatch Pro', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Snow Removal Services', 14, 28);
  doc.setTextColor(0);

  // Invoice info
  doc.setFontSize(10);
  doc.text(`Invoice Date: ${format(new Date(), 'MMM d, yyyy')}`, pageWidth - 14, 35, { align: 'right' });
  doc.text(`Service Period: ${dateRange}`, pageWidth - 14, 42, { align: 'right' });

  // Bill to
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 14, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(accountName, 14, 58);

  // Services table
  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Service Type', 'Duration', 'Materials Used']],
    body: workLogs.map((log) => [
      log.date,
      log.serviceType,
      log.duration,
      log.saltLbs !== '-' ? `Salt: ${log.saltLbs}` : '-',
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pageWidth - 80, finalY, 66, 30, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.text('Total Services:', pageWidth - 75, finalY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${workLogs.length} jobs`, pageWidth - 20, finalY + 10, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  const totalHours = workLogs.reduce((sum, log) => {
    const match = log.duration.match(/(\d+\.?\d*)/);
    return sum + (match ? parseFloat(match[0]) : 0);
  }, 0);
  doc.text('Total Hours:', pageWidth - 75, finalY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalHours.toFixed(1)}h`, pageWidth - 20, finalY + 20, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });

  // Save
  const fileName = `invoice-${accountName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
