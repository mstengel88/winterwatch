import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface WorkLogData {
  id: string;
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

export function generateWorkLogsPDF(
  workLogs: WorkLogData[],
  summary: ReportSummary,
  title: string = 'Work Logs Report'
): void {
  // Landscape orientation for wider table
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(`Generated: ${format(new Date(), 'M/d/yyyy h:mm:ss a')}`, 15, 28);
  doc.text(`Period: ${summary.dateRange}`, 15, 34);
  
  // Summary line
  doc.setFontSize(9);
  doc.text(
    `Total Services: ${summary.totalJobs} | Plow: ${summary.plowCount} | Salt: ${summary.saltCount} | Properties: ${summary.propertyCount}`,
    15,
    43
  );

  // Work logs table with columns matching the example
  if (workLogs.length > 0) {
    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Check In', 'Check Out', 'Duration', 'Account', 'Service', 'Snow', 'Salt', 'Equipment', 'Employee', 'Conditions', 'Notes']],
      body: workLogs.map((log) => [
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
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 20 },  // Date
        1: { cellWidth: 16 },  // Check In
        2: { cellWidth: 16 },  // Check Out
        3: { cellWidth: 16 },  // Duration
        4: { cellWidth: 35 },  // Account
        5: { cellWidth: 22 },  // Service
        6: { cellWidth: 14 },  // Snow
        7: { cellWidth: 14 },  // Salt
        8: { cellWidth: 26 },  // Equipment
        9: { cellWidth: 30 },  // Employee
        10: { cellWidth: 24 }, // Conditions
        11: { cellWidth: 34 }, // Notes
      },
      didDrawPage: (data) => {
        // Draw header line under column headers
        if (data.pageNumber === 1) {
          const headerBottom = (data.table?.head?.[0]?.cells?.[0]?.y ?? 50) + 
            (data.table?.head?.[0]?.cells?.[0]?.height ?? 8);
          doc.setDrawColor(0);
          doc.setLineWidth(0.5);
          doc.line(15, headerBottom, pageWidth - 15, headerBottom);
        }
      },
    });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('No work logs found for this period.', 15, 60);
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
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
