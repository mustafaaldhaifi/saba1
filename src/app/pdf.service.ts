import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import './ARIAL-normal.js';
import autoTable, { Color, FontStyle, HAlignType } from 'jspdf-autotable';

@Injectable({
  providedIn: 'root',
})
export class PdfService {

  export(data: any, isBranch: boolean = false, date: string, branchName: string) {
    const doc = new jsPDF();
    doc.setFont('ARIAL', 'normal');
    doc.setFontSize(12);

    const topHeader = [
      [
        {
          content: 'SABA (Authentic Yemini Cuisine)',
          styles: {
            halign: 'left' as HAlignType,
            fontStyle: 'normal' as FontStyle,
            fontSize: 8,
            lineWidth: 0.2,
            lineColor: [0, 0, 0] as Color,
          },
          colSpan: isBranch ? 3 : 4, // دمج العمودين الأول والثاني في هذا السطر
        },
        {
          content: ` ${date} : التاريخ`,
          styles: {
            halign: 'right' as HAlignType,
            fontStyle: 'normal' as FontStyle,
            fontSize: 8,

            lineWidth: 0.2,
            lineColor: [0, 0, 0] as Color,
          },
          colSpan: isBranch ? 3 : 6, // دمج العمودين الثالث والرابع في هذا السطر
        },
        {
          content: `${branchName} : اسم الفرع`,
          styles: {
            halign: 'right' as HAlignType,
            fontStyle: 'normal' as FontStyle,
            fontSize: 8,
            lineWidth: 0.2,

            lineColor: [0, 0, 0] as Color,
          },
          colSpan: isBranch ? 3 : 5, // دمج العمودين الثالث والرابع في هذا السطر
        },
      ],
    ];

    const topHeader2 = [
      [
        this.items({ name: 'الاصناف' }),
        ...(isBranch === false ? [this.items({ name: 'الرصيد', fontSize: 7 })] : []),
        ...(isBranch === false ? [this.items({ name: 'الوحدة', fontSize: 7 })] : []),

        // this.items({ name: 'الرصيد', fontSize: 7 }),
        // this.items({ name: 'الوحدة' }),
        this.items({ name: 'المطلوب' }),
        this.items({ name: 'الوحدة' }),
        this.items({ name: 'الاصناف' }),
        ...(isBranch === false ? [this.items({ name: 'الرصيد', fontSize: 7 })] : []),
        ...(isBranch === false ? [this.items({ name: 'الوحدة', fontSize: 7 })] : []),
        // this.items({ name: 'الرصيد', fontSize: 7 }),
        // this.items({ name: 'الوحدة' }),
        this.items({ name: 'المطلوب' }),
        this.items({ name: 'الوحدة' }),
        this.items({ name: 'الاصناف' }),
        ...(isBranch === false ? [this.items({ name: 'الرصيد', fontSize: 7 })] : []),
        ...(isBranch === false ? [this.items({ name: 'الوحدة', fontSize: 7 })] : []),
        // this.items({ name: 'الرصيد', fontSize: 7 }),
        // this.items({ name: 'الوحدة' }),
        this.items({ name: 'المطلوب' }),
        this.items({ name: 'الوحدة' }),
      ],
    ];

    var rows = [];

    for (let index = 0; index < 36; index++) {
      if (isBranch == false) {
        rows.push(['', '', '', '', '', '', '', '', ''])
      } else {
        rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      }
    }


    // for (let index = 0; index < data.length; index++) {
    //   var array: any = rows[index]
    //   for (let index2 = 0; index2 < array.length; index2++) {
    //     array[index2] = data[index][index2];
    //   }
    //   rows[index] = array;
    // }
    // for (let i = 0; i < data.length; i++) {
    //   // const dataRow = data[i];
    //   // const row:any = rows[i] || [];

    //   // for (let j = 0; j < dataRow.length; j++) {
    //   //   row[j] = dataRow[j];
    //   // }

    //   // rows[i] = row;

    // }
    const maxRows = 35; // total rows
    const cellsPerRow = data[0].length;

    for (let i = 0; i < data.length; i++) {
      const rowIndex = i % maxRows;              // Loop over rows
      const colStart = Math.floor(i / maxRows) * cellsPerRow; // Next 3 cells block

      // Fill 3 cells in the row
      for (let j = 0; j < cellsPerRow; j++) {
        if (!rows[rowIndex]) rows[rowIndex] = []; // Ensure row exists
        rows[rowIndex][colStart + j] = data[i][j]; // Assign data
      }
    }

    // const rows = [
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   ['', 2, 4, '', 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    //   // ['النوع 2', '200', 'كيس', '30', 'كيس'],
    //   // ['النوع 3', '150', 'علبة', '20', 'علبة'],
    //   // Add more rows as necessary
    // ];



    // Create new PDF document
    // const doc = new jsPDF();

    // Add table with right-aligned columns
    autoTable(doc, {
      head: [...topHeader, ...topHeader2], // Combine topHeader and topHeader2 into one array
      body: rows,
      styles: {
        font: 'ARIAL',
        fontStyle: 'normal',
        fontSize: 8,
        textColor: '#000000',
        halign: 'center', // Make sure all text in the table is right-aligned
      },
      headStyles: {
        halign: 'right',
        fontStyle: 'normal',
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
      margin: { horizontal: 10 },
      startY: 25,
      theme: 'striped', // optional, helps with visibility
      didParseCell: function (data) {
        // Convert `data.table.head[0]` to `unknown` first, then to `string[]`
        const headerRow = (data.table.head[0] as unknown) as string[];  // Cast to unknown first, then string[]
        const columnHeaderCell = headerRow[data.column.index];  // Get the column header by index

        if (data.section === 'body' && columnHeaderCell === 'المطلوب') {
          data.cell.styles.fillColor = [255, 255, 0]; // Yellow background for "المطلوب" column
        }
        // تنسيق الحدود
        if (data.section === 'body') {
          data.cell.styles.lineWidth = { top: 0, bottom: 0.2, left: 0.2, right: 0.2 };
          data.cell.styles.lineColor = [0, 0, 0];
        }
      },
    });

    // Save the document
    doc.save(`${branchName}_${date}.pdf`);
  }

  items({
    name,
    align = 'center',
    fontStyle = 'normal',
    lineWidth = 0.2,
    lineColor = [0, 0, 0],
    fontSize = 6,
  }: {
    name: string;
    align?: string;
    fontStyle?: string;
    lineWidth?: number;
    lineColor?: number[];
    fontSize?: number;
  }) {
    return {
      content: name,
      styles: {
        halign: align as HAlignType,
        fontStyle: fontStyle as FontStyle,
        fontSize,
        lineWidth,
        lineColor: lineColor as Color,
        border: [true, false, true, false], // [left, top, right, bottom]
      },
    };
  }
}
