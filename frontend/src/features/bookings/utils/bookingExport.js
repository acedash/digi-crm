import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data, filename = 'bookings_report.xlsx') => {
  const worksheetData = data.map(item => ({
    'Booking ID': item.id,
    'Reference': item.booking_reference,
    'Client Name': item.client?.name || `${item.client?.first_name || ''} ${item.client?.last_name || ''}`.trim(),
    'Client Email': item.client?.email || 'N/A',
    'Client Phone': item.client?.phone || 'N/A',
    'Travel Date': item.travel_date || 'N/A',
    'Category': item.services?.map(s => s.detail || s.type).join(', ') || 'N/A',
    'Travelers': item.passengers_count,
    'Total Amount': `${item.currency || 'USD'} ${item.total_amount}`,
    'Status': item.status,
    'Created By': item.created_by_name || 'System',
    'Current Agent': item.agent?.name || 'Unassigned',
    'Created At': new Date(item.created_at).toLocaleDateString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
  XLSX.writeFile(workbook, filename);
};

export const exportToPDF = (data, filename = 'bookings_report.pdf') => {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFontSize(18);
  doc.text('Bookings Report', 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  const tableRows = data.map(item => [
    item.booking_reference,
    item.client?.name || `${item.client?.first_name || ''} ${item.client?.last_name || ''}`.trim(),
    item.client?.phone || 'N/A',
    item.services?.map(s => s.detail || s.type).join('\n') || 'N/A',
    item.travel_date ? new Date(item.travel_date).toLocaleDateString() : 'N/A',
    `${item.currency || 'USD'} ${item.total_amount}`,
    item.passengers_count,
    item.created_by_name || 'System'
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Ref', 'Client', 'Contact', 'Category / Details', 'Travel Date', 'Amount', 'Pax', 'Created By']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] }, // Violet color to match UI
    styles: { fontSize: 8, overflow: 'linebreak' },
    columnStyles: {
      3: { cellWidth: 50 }, // Category details
    }
  });

  doc.save(filename);
};

export const exportToJSON = (data, filename = 'bookings_report.json') => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
