import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import './ARIAL-normal.js';
import autoTable, { Color, FontStyle, HAlignType } from 'jspdf-autotable';

@Injectable({
  providedIn: 'root',
})
export class PdfService {

  export(data: any, isBranch: boolean = false, date: string, branchName: string, typeName: string, isMonthly: boolean) {
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
          colSpan: isBranch ? 3 : isMonthly ? 3 : 4, // دمج العمودين الأول والثاني في هذا السطر
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
          colSpan: isBranch ? 3 : isMonthly ? 3 : 6, // دمج العمودين الثالث والرابع في هذا السطر
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
          colSpan: isBranch ? 3 : isMonthly ? 3 : 5, // دمج العمودين الثالث والرابع في هذا السطر
        },
      ],
    ];
    const headerRow: any[] = [];

    if (!isBranch) {
      headerRow.push(this.items({ name: 'الاصناف' }));
      headerRow.push(this.items({ name: 'الرصيد', fontSize: 7 }));
      headerRow.push(this.items({ name: 'الوحدة', fontSize: 7 }));

      if (!isMonthly) {
        headerRow.push(this.items({ name: 'المطلوب' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      }

      headerRow.push(this.items({ name: 'الاصناف' }));
      headerRow.push(this.items({ name: 'الرصيد', fontSize: 7 }));
      headerRow.push(this.items({ name: 'الوحدة', fontSize: 7 }));

      if (!isMonthly) {
        headerRow.push(this.items({ name: 'المطلوب' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      }

      headerRow.push(this.items({ name: 'الاصناف' }));
      headerRow.push(this.items({ name: 'الرصيد', fontSize: 7 }));
      headerRow.push(this.items({ name: 'الوحدة', fontSize: 7 }));

      if (!isMonthly) {
        headerRow.push(this.items({ name: 'المطلوب' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      }

    } else {
      // إذا كان isBranch = true
      headerRow.push(this.items({ name: 'الاصناف' }));

      if (isMonthly) {
        headerRow.push(this.items({ name: 'الرصيد' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      } else {
        headerRow.push(this.items({ name: 'المطلوب' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      }

      headerRow.push(this.items({ name: 'الاصناف' }));

      if (isMonthly) {
        headerRow.push(this.items({ name: 'الرصيد' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      } else {
        headerRow.push(this.items({ name: 'المطلوب' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      }

      headerRow.push(this.items({ name: 'الاصناف' }));

      if (isMonthly) {
        headerRow.push(this.items({ name: 'الرصيد' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      } else {
        headerRow.push(this.items({ name: 'المطلوب' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      }
    }

    const topHeader2 = [headerRow];

    // const topHeader2 = [
    //   [
    //     this.items({ name: 'الاصناف' }),
    //     ...(isBranch === false ? [this.items({ name: 'الرصيد', fontSize: 7 })] : []),
    //     ...(isBranch === false ? [this.items({ name: 'الوحدة', fontSize: 7 })] : []),

    //     // this.items({ name: 'الرصيد', fontSize: 7 }),
    //     // this.items({ name: 'الوحدة' }),
    //     ...(isMonthly === true ? [this.items({ name: 'المطلوب' })] : []),
    //     ...(isMonthly === true ? [this.items({ name: 'الوحده' })] : []),

    //     // this.items({ name: 'المطلوب' }),
    //     // this.items({ name: 'الوحدة' }),
    //     this.items({ name: 'الاصناف' }),
    //     ...(isBranch === false ? [this.items({ name: 'الرصيد', fontSize: 7 })] : []),
    //     ...(isBranch === false ? [this.items({ name: 'الوحدة', fontSize: 7 })] : []),
    //     // this.items({ name: 'الرصيد', fontSize: 7 }),
    //     // this.items({ name: 'الوحدة' }),
    //     ...(isMonthly === true ? [this.items({ name: 'المطلوب' })] : []),
    //     ...(isMonthly === true ? [this.items({ name: 'الوحده' })] : []),
    //     // this.items({ name: 'المطلوب' }),
    //     // this.items({ name: 'الوحدة' }),
    //     this.items({ name: 'الاصناف' }),
    //     ...(isBranch === false ? [this.items({ name: 'الرصيد', fontSize: 7 })] : []),
    //     ...(isBranch === false ? [this.items({ name: 'الوحدة', fontSize: 7 })] : []),
    //     // this.items({ name: 'الرصيد', fontSize: 7 }),
    //     // this.items({ name: 'الوحدة' }),
    //     this.items({ name: 'المطلوب' }),
    //     this.items({ name: 'الوحدة' }),
    //   ],
    // ];
    // /////
    // topHeader2[0].push(this.items({ name: 'الاصناف' }))
    // if (isBranch) {
    //   if (isMonthly) {
    //     topHeader2[0].push(this.items({ name: 'الرصيد' }))
    //   } else {
    //     topHeader2[0].push(this.items({ name: 'المطلوب' }))
    //   }
    //   topHeader2[0].push(this.items({ name: 'الوحده' }))
    // } else {

    //   if (isMonthly) {
    //     topHeader2[0].push(this.items({ name: 'الرصيد' }))
    //   } else {
    //     topHeader2[0].push(this.items({ name: 'المطلوب' }))
    //   }
    //   topHeader2[0].push(this.items({ name: 'الوحده' }))
    // }

    var rows = [];
    const maxRows = isMonthly ? 50 : 36; // total rows

    for (let index = 0; index < maxRows; index++) {
      if (isBranch == false) {
        rows.push(['', '', '', '', '', '', '', '', ''])
      } else {
        // rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
        const colCount = topHeader2[0].length;
        rows.push(new Array(colCount).fill(''));

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
    // const maxRows = isMonthly ? 50 : 36; // total rows
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
    doc.save(`${typeName}_${branchName}_Order_${date}.pdf`);
  }
  exportDaily(data: any, date: string, branchName: string) {
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
          colSpan: 3, // دمج العمودين الأول والثاني في هذا السطر
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
          colSpan: 3, // دمج العمودين الثالث والرابع في هذا السطر
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
          colSpan: 3, // دمج العمودين الثالث والرابع في هذا السطر
        },
      ],
    ];
    const headerRow: any[] = [];
    headerRow.push(this.items({ name: 'العناصر' }));
    headerRow.push(this.items({ name: 'الموجودة' }));
    headerRow.push(this.items({ name: 'المستلم' }));
    headerRow.push(this.items({ name: 'الجرد' }));
    headerRow.push(this.items({ name: 'مبيعات' }));
    headerRow.push(this.items({ name: 'وجبة موظف' }));
    headerRow.push(this.items({ name: 'تحويل' }));
    headerRow.push(this.items({ name: 'التالف' }));
    headerRow.push(this.items({ name: 'المتبقي' }));


    const topHeader2 = [headerRow];

    var rows = [];
    const maxRows = 36; // total rows

    for (let index = 0; index < maxRows; index++) {

      // rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      const colCount = topHeader2[0].length;
      rows.push(new Array(colCount).fill(''));


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
    // const maxRows = isMonthly ? 50 : 36; // total rows
    const cellsPerRow = 7; // Adjust based on your actual column count
    let currentRowIndex = 0;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const subProducts = Array.isArray(item[3]) ? item[3] : null;

      // Handle the main product row
      const mainRow = new Array(cellsPerRow).fill('');
      mainRow[0] = item[0]; // Product name
      mainRow[1] = item[1]; // موجودة
      mainRow[2] = item[2]; // مستلم
      mainRow[3] = subProducts ? '' : item[3]; // الجرد: leave empty if subProducts exist
      mainRow[4] = item[4]; // مبيعات
      mainRow[5] = item[5]; // وجبة موظف
      mainRow[6] = item[6]; // تحويل / تالف / أي شيء آخر

      rows[currentRowIndex++] = mainRow;

      // If there are subproducts, print them
      if (subProducts) {
        for (const sub of subProducts) {
          const subRow = new Array(cellsPerRow).fill('');
          subRow[0] = `↳ ${sub[0]}`; // Name with arrow
          subRow[1] = sub[1];
          subRow[2] = sub[2];
          subRow[3] = sub[3];
          subRow[4] = sub[4];
          // Fill remaining columns with empty or default values
          // Adjust index if needed
          rows[currentRowIndex++] = subRow;
        }
      }
    }






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
    doc.save(`${branchName}_Daily_${date}.pdf`);
  }

  exportPDF5(data: any[], date: string, branchName: string, note: any) {
    const doc = new jsPDF();
    doc.setFont('ARIAL', 'normal');
    const rows: any[] = [];

    for (const item of data) {
      if (Array.isArray(item.products) && item.products.length > 0) {
        const productCount = item.products.length;

        for (let i = 0; i < productCount; i++) {
          const sub = item.products[i];

          const row = [];

          // 1. اسم المنتج الفرعي (دائمًا)
          row.push({ content: sub.productName });

          // 2. openingStockQnt (خلية مدمجة rowspan فقط لأول صف)
          if (i === 0) {
            row.push({
              content: item.openingStockQnt,
              rowSpan: productCount,
              styles: { halign: 'center', valign: 'middle', ineWidth: 0, },
            });
          }
          // else {
          //   row.push({ content: '' }); // خلايا فارغة لبقية الصفوف
          // }

          // 3. recieved (نفس الطريقة)
          if (i === 0) {
            row.push({
              content: item.recieved,
              rowSpan: productCount,
              styles: { halign: 'center', valign: 'middle' },
            });
          }
          //  else {
          //   row.push({ content: '' });
          // }

          // 4. add
          console.log("addd", sub.add);

          row.push({ content: sub.add ?? '' });

          // 5. sales
          // لو sub.sales قيمته صفر أو أي قيمة أخرى، نعرضها مباشرة
          row.push({ content: sub.sales != null ? sub.sales : '--' });

          // 6. staffMeal
          row.push({ content: sub.staffMeal ?? '' });

          // 7. transfer (خلية مدمجة مثل السابق)
          if (i === 0) {
            row.push({
              content: item.transfer ?? '',
              rowSpan: productCount,
              styles: { halign: 'center', valign: 'middle' },
            });
          }
          // else {
          //   row.push({ content: '' });
          // }

          // 8. dameged
          row.push({ content: sub.dameged ?? '' });

          // 9. closeStock (خلية مدمجة)
          if (i === 0) {
            row.push({
              content: item.closeStock ?? '',
              rowSpan: productCount,
              styles: { halign: 'center', valign: 'middle' },
            });
          }
          // else {
          //   row.push({ content: '' });
          // }

          console.log("rppppw", row);




          // أخيراً، أضف الصف
          rows.push(row);
          console.log("rppppws", rows);
        }
      } else {
        // منتجات بدون منتجات فرعية
        rows.push([
          { content: item.productName },
          { content: item.openingStockQnt },
          { content: item.recieved },
          { content: item.add },
          { content: item.sales },
          { content: item.staffMeal },
          { content: item.transfer },
          { content: item.dameged },
          { content: item.closeStock },
        ]);
      }
    }

    console.log("finalRows", rows);



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
          colSpan: 3, // دمج العمودين الأول والثاني في هذا السطر
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
          colSpan: 3, // دمج العمودين الثالث والرابع في هذا السطر
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
          colSpan: 3, // دمج العمودين الثالث والرابع في هذا السطر
        },
      ],
    ];
    const headerRow: any[] = [];
    headerRow.push(this.items({ name: 'العناصر' }));
    headerRow.push(this.items({ name: 'الموجودة' }));
    headerRow.push(this.items({ name: 'المستلم' }));
    headerRow.push(this.items({ name: 'الجرد' }));
    headerRow.push(this.items({ name: 'مبيعات' }));
    headerRow.push(this.items({ name: 'وجبة موظف' }));
    headerRow.push(this.items({ name: 'تحويل' }));
    headerRow.push(this.items({ name: 'التالف' }));
    headerRow.push(this.items({ name: 'المتبقي' }));


    const topHeader2 = [headerRow];

    autoTable(doc, {
      head: [...topHeader, ...topHeader2],
      body: rows,
      styles: {
        font: 'ARIAL',
        fontStyle: 'normal',
        fontSize: 8,
        textColor: '#000000',
        halign: 'center', // Make sure all text in the table is right-aligned
      },
      headStyles: {
        halign: 'center',
        fontStyle: 'normal',
      },
      //  theme: 'striped', // optional, helps with visibility

      // styles: {
      //   fontSize: 8,
      //   cellPadding: 3,
      //   halign: 'center',
      // },

      /** 🔽 Capture where the table ends */
      didDrawPage: (data1) => {
        const notes: string[] = [];
        let counter = 1;

        // جمع كل الملاحظات (من العناصر الرئيسية أو الفرعية)
        data.forEach((element: any) => {

          if (Array.isArray(element.products)) {
            element.products.forEach((sub: any) => {
              if (sub.note) {
                var filed = ""
                var colmn = ""
                if (Number(sub?.add ?? 0) < 0) {
                  colmn = "الجرد"
                  filed = "add"
                } else if (Number(sub?.dameged ?? 0) > 0) {
                  colmn = "التالف"
                  filed = "dameged"

                }
                else if (Number(sub?.transfer ?? 0) !== 0) {
                  colmn = " التحويل"
                  filed = "transfer"

                }
                if (colmn.length > 0) {
                  notes.push(`ملاحظة في عمود ${colmn} ${sub.productName} ${sub[filed]} : ${sub.note} `);
                }

              }
            });
          }
          if (element.note) {
            var filed = ""
            var colmn = ""
            if (Number(element?.add ?? 0) < 0) {
              colmn = "الجرد"
              filed = "add"
            } else if (Number(element?.dameged ?? 0) > 0) {
              colmn = "التالف"
              filed = "dameged"

            }
            else if (Number(element?.transfer ?? 0) !== 0) {
              colmn = " التحويل"
              filed = "transfer"

            }
            if (colmn.length > 0) {
              notes.push(`ملاحظة في عمود ${colmn} ${element.productName} ${element[filed]} : ${element.note} `);
            }
          }
        });

        // عرض الملاحظات في أسفل الصفحة (بدون تكرار كلمة "ملاحظة")
        if (notes.length > 0) {
          const startY = data1.cursor!.y + 10;
          const pageWidth = doc.internal.pageSize.getWidth();
          const rightMargin = 10;
          const lineHeight = 6;

          doc.setFontSize(10);
          doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, startY);

          notes.forEach((note, index) => {
            doc.text(
              note,
              pageWidth - doc.getTextWidth(note) - rightMargin,
              startY + (index + 1) * lineHeight,
              // { align: 'right' }
            );
          });
        }
      }
      ,
      startY: 20,
      theme: 'grid',
    });

    doc.save(`${branchName}_Daily_${date}.pdf`);
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

  exportMonthlyReport(date: string, dataByDay: { date: string, data: any }[], branchName: string) {
    const doc = new jsPDF();
    doc.setFont('ARIAL', 'normal');
    dataByDay.forEach((dailyReport, index) => {
      const { date, data } = dailyReport;

      const rows: any[] = [];

      for (const item of data) {
        if (Array.isArray(item.products) && item.products.length > 0) {
          const productCount = item.products.length;

          for (let i = 0; i < productCount; i++) {
            const sub = item.products[i];

            const row = [];

            // 1. اسم المنتج الفرعي (دائمًا)
            row.push({ content: sub.productName });

            // 2. openingStockQnt (خلية مدمجة rowspan فقط لأول صف)
            if (i === 0) {
              row.push({
                content: item.openingStockQnt,
                rowSpan: productCount,
                styles: { halign: 'center', valign: 'middle', ineWidth: 0, },
              });
            }
            // else {
            //   row.push({ content: '' }); // خلايا فارغة لبقية الصفوف
            // }

            // 3. recieved (نفس الطريقة)
            if (i === 0) {
              row.push({
                content: item.recieved,
                rowSpan: productCount,
                styles: { halign: 'center', valign: 'middle' },
              });
            }
            //  else {
            //   row.push({ content: '' });
            // }

            // 4. add
            console.log("addd", sub.add);

            row.push({ content: sub.add ?? '' });

            // 5. sales
            // لو sub.sales قيمته صفر أو أي قيمة أخرى، نعرضها مباشرة
            row.push({ content: sub.sales != null ? sub.sales : '--' });

            // 6. staffMeal
            row.push({ content: sub.staffMeal ?? '' });

            // 7. transfer (خلية مدمجة مثل السابق)
            if (i === 0) {
              row.push({
                content: item.transfer ?? '',
                rowSpan: productCount,
                styles: { halign: 'center', valign: 'middle' },
              });
            }
            // else {
            //   row.push({ content: '' });
            // }

            // 8. dameged
            row.push({ content: sub.dameged ?? '' });

            // 9. closeStock (خلية مدمجة)
            if (i === 0) {
              row.push({
                content: item.closeStock ?? '',
                rowSpan: productCount,
                styles: { halign: 'center', valign: 'middle' },
              });
            }
            // else {
            //   row.push({ content: '' });
            // }

            console.log("rppppw", row);




            // أخيراً، أضف الصف
            rows.push(row);
            console.log("rppppws", rows);
          }
        } else {
          // منتجات بدون منتجات فرعية
          rows.push([
            { content: item.productName },
            { content: item.openingStockQnt },
            { content: item.recieved },
            { content: item.add },
            { content: item.sales },
            { content: item.staffMeal },
            { content: item.transfer },
            { content: item.dameged },
            { content: item.closeStock },
          ]);
        }
      }

      console.log("finalRows", rows);



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
            colSpan: 3, // دمج العمودين الأول والثاني في هذا السطر
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
            colSpan: 3, // دمج العمودين الثالث والرابع في هذا السطر
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
            colSpan: 3, // دمج العمودين الثالث والرابع في هذا السطر
          },
        ],
      ];
      const headerRow: any[] = [];
      headerRow.push(this.items({ name: 'العناصر' }));
      headerRow.push(this.items({ name: 'الموجودة' }));
      headerRow.push(this.items({ name: 'المستلم' }));
      headerRow.push(this.items({ name: 'الجرد' }));
      headerRow.push(this.items({ name: 'مبيعات' }));
      headerRow.push(this.items({ name: 'وجبة موظف' }));
      headerRow.push(this.items({ name: 'تحويل' }));
      headerRow.push(this.items({ name: 'التالف' }));
      headerRow.push(this.items({ name: 'المتبقي' }));


      const topHeader2 = [headerRow];

      autoTable(doc, {
        head: [...topHeader, ...topHeader2],
        body: rows,
        styles: {
          font: 'ARIAL',
          fontStyle: 'normal',
          fontSize: 8,
          textColor: '#000000',
          halign: 'center', // Make sure all text in the table is right-aligned
        },
        headStyles: {
          halign: 'center',
          fontStyle: 'normal',
        },
        //  theme: 'striped', // optional, helps with visibility

        // styles: {
        //   fontSize: 8,
        //   cellPadding: 3,
        //   halign: 'center',
        // },

        /** 🔽 Capture where the table ends */
        didDrawPage: (data1) => {
          const notes: string[] = [];
          let counter = 1;

          // جمع كل الملاحظات (من العناصر الرئيسية أو الفرعية)
          data.forEach((element: any) => {

            if (Array.isArray(element.products)) {
              element.products.forEach((sub: any) => {
                if (sub.note) {
                  var filed = ""
                  var colmn = ""
                  if (Number(sub?.add ?? 0) < 0) {
                    colmn = "الجرد"
                    filed = "add"
                  } else if (Number(sub?.dameged ?? 0) > 0) {
                    colmn = "التالف"
                    filed = "dameged"

                  }
                  else if (Number(sub?.transfer ?? 0) !== 0) {
                    colmn = " التحويل"
                    filed = "transfer"

                  }
                  if (colmn.length > 0) {
                    notes.push(`ملاحظة في عمود ${colmn} ${sub.productName} ${sub[filed]} : ${sub.note} `);
                  }

                }
              });
            }
            if (element.note) {
              var filed = ""
              var colmn = ""
              if (Number(element?.add ?? 0) < 0) {
                colmn = "الجرد"
                filed = "add"
              } else if (Number(element?.dameged ?? 0) > 0) {
                colmn = "التالف"
                filed = "dameged"

              }
              else if (Number(element?.transfer ?? 0) !== 0) {
                colmn = " التحويل"
                filed = "transfer"

              }
              if (colmn.length > 0) {
                notes.push(`ملاحظة في عمود ${colmn} ${element.productName} ${element[filed]} : ${element.note} `);
              }
            }
          });

          // عرض الملاحظات في أسفل الصفحة (بدون تكرار كلمة "ملاحظة")
          if (notes.length > 0) {
            const startY = data1.cursor!.y + 10;
            const pageWidth = doc.internal.pageSize.getWidth();
            const rightMargin = 10;
            const lineHeight = 6;

            doc.setFontSize(10);
            doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, startY);

            notes.forEach((note, index) => {
              doc.text(
                note,
                pageWidth - doc.getTextWidth(note) - rightMargin,
                startY + (index + 1) * lineHeight,
                // { align: 'right' }
              );
            });
          }
        }
        ,
        startY: 20,
        theme: 'grid',
      });

      // إضافة صفحة جديدة إن لم تكن الصفحة الأخيرة
      if (index < dataByDay.length - 1) {
        doc.addPage();
      }
    });

    doc.save(`${date}_${branchName}_Monthly_Report.pdf`);
  }

}
