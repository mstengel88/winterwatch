import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface WorkLogData {
  id: string;
  date: string;
  account: string;
  employee: string;
  serviceType: string;
  duration: string;
  saltLbs?: number;
  iceMeltLbs?: number;
  notes?: string;
}

interface ReportSummary {
  totalJobs: number;
  totalHours: number;
  totalSaltLbs: number;
  totalIceMeltLbs: number;
  dateRange: string;
}

export function generateWorkLogsPDF(
  workLogs: WorkLogData[],
  summary: ReportSummary,
  title: string = 'Work Logs Report'
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('WinterWatch Pro', 14, 20);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 38);
  doc.text(`Period: ${summary.dateRange}`, 14, 44);
  doc.setTextColor(0);

  // Summary cards
  doc.setFillColor(245, 245, 245);
  const cardY = 52;
  const cardHeight = 20;
  const cardWidth = (pageWidth - 38) / 4;
  
  // Draw summary boxes
  const summaryData = [
    { label: 'Total Jobs', value: summary.totalJobs.toString() },
    { label: 'Total Hours', value: `${summary.totalHours.toFixed(1)}h` },
    { label: 'Salt Used', value: `${summary.totalSaltLbs} lbs` },
    { label: 'Ice Melt Used', value: `${summary.totalIceMeltLbs} lbs` },
  ];

  summaryData.forEach((item, index) => {
    const x = 14 + index * (cardWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(item.label, x + 4, cardY + 7);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x + 4, cardY + 15);
    doc.setFont('helvetica', 'normal');
  });

  // Work logs table
  if (workLogs.length > 0) {
    autoTable(doc, {
      startY: cardY + cardHeight + 10,
      head: [['Date', 'Account', 'Employee', 'Service', 'Duration', 'Materials', 'Notes']],
      body: workLogs.map((log) => [
        log.date,
        log.account,
        log.employee,
        log.serviceType,
        log.duration,
        log.saltLbs ? `Salt: ${log.saltLbs}lbs` : log.iceMeltLbs ? `Ice Melt: ${log.iceMeltLbs}lbs` : '-',
        log.notes || '-',
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 28 },
        6: { cellWidth: 'auto' },
      },
    });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('No work logs found for this period.', 14, cardY + cardHeight + 20);
  }

  // Footer
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

  // Save
  const fileName = `work-logs-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
      log.saltLbs ? `Salt: ${log.saltLbs}lbs` : log.iceMeltLbs ? `Ice Melt: ${log.iceMeltLbs}lbs` : '-',
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
