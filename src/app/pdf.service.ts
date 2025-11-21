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
          colSpan: isBranch ? 5 : isMonthly ? 3 : 4, // دمج العمودين الأول والثاني في هذا السطر
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
          colSpan: isBranch ? 2 : isMonthly ? 3 : 5, // دمج العمودين الثالث والرابع في هذا السطر
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
        headerRow.push(this.items({ name: 'المتبقي' }));
        headerRow.push(this.items({ name: 'الوحده' }));
        headerRow.push(this.items({ name: 'المطلوب' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      }

      headerRow.push(this.items({ name: 'الاصناف' }));

      if (isMonthly) {
        headerRow.push(this.items({ name: 'الرصيد' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      } else {
        headerRow.push(this.items({ name: 'المتبقي' }));
        headerRow.push(this.items({ name: 'الوحده' }));
        headerRow.push(this.items({ name: 'المطلوب' }));
        headerRow.push(this.items({ name: 'الوحده' }));
      }

      // headerRow.push(this.items({ name: 'الاصناف' }));

      // if (isMonthly) {
      //   headerRow.push(this.items({ name: 'الرصيد' }));
      //   headerRow.push(this.items({ name: 'الوحده' }));
      // } else {
      //   headerRow.push(this.items({ name: 'المتبقي' }));
      //   headerRow.push(this.items({ name: 'الوحده' }));
      //   headerRow.push(this.items({ name: 'المطلوب' }));
      //   headerRow.push(this.items({ name: 'الوحده' }));
      // }
    }

    const topHeader2 = [headerRow];

    const maxRows = isMonthly ? 50 : 36; // total rows
    const cellsPerRow = data[0] ? data[0].length : 0; // The length of the inner array from getOrders

    // 2. Determine how many columns wide the entire table is (totalTableCols)
    const totalTableCols = topHeader2[0].length;

    // 3. Pre-fill the rows array with empty strings, ensuring correct total columns
    var rows = [];
    for (let index = 0; index < maxRows; index++) {
      // Fill each row with the exact number of columns defined in the header.
      rows.push(new Array(totalTableCols).fill(''));
    }

    // 4. Correctly map the flat data into the multi-column layout
    for (let i = 0; i < data.length; i++) {
      const rowIndex = i % maxRows;               // Which row index (0 to 35/49)
      // The starting column index for this item's block of data.
      // Each block occupies `cellsPerRow` columns.
      // The block index is Math.floor(i / maxRows) (0, 1, 2, ...)
      const colStart = Math.floor(i / maxRows) * cellsPerRow;

      // Safety check - prevent overflow outside the pre-defined columns
      if (colStart + cellsPerRow > totalTableCols) {
        console.warn(`Data item ${i} would overflow column count. Skipping.`);
        continue;
      }

      // Fill the cells for the current item
      for (let j = 0; j < cellsPerRow; j++) {
        rows[rowIndex][colStart + j] = data[i][j]; // Assign data
      }
    }
    // ... (rest o


    // var rows = [];
    // const maxRows = isMonthly ? 50 : 36; // total rows

    // for (let index = 0; index < maxRows; index++) {
    //   if (isBranch == false) {
    //     rows.push(['', '', '', '', '', '', '', '', ''])
    //   } else {
    //     // rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
    //     const colCount = topHeader2[0].length;
    //     console.log('colCount', colCount);

    //     rows.push(new Array(colCount).fill(''));

    //   }
    // }

    // const cellsPerRow = data[0].length;

    // for (let i = 0; i < data.length; i++) {



    //   const rowIndex = i % maxRows;              // Loop over rows
    //   const colStart = Math.floor(i / maxRows) * cellsPerRow; // Next 3 cells block

    //   console.log('cellsPerRow', cellsPerRow);
    //   console.log('rowIndex', rowIndex);
    //   console.log('maxRows', maxRows);
    //   console.log('colStart', colStart);
    //   // Fill 3 cells in the row
    //   for (let j = 0; j < cellsPerRow; j++) {
    //     if (!rows[rowIndex]) rows[rowIndex] = []; // Ensure row exists
    //     rows[rowIndex][colStart + j] = data[i][j]; // Assign data
    //   }
    // }
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
        // const headerRow = (data.table.head[0] as unknown) as string[];  // Cast to unknown first, then string[]
        // const columnHeaderCell = headerRow[data.column.index];  // Get the column header by index

        // if (data.section === 'body' && columnHeaderCell === 'المطلوب') {
        //   data.cell.styles.fillColor = [255, 255, 0]; // Yellow background for "المطلوب" column
        // }
        // // تنسيق الحدود
        // if (data.section === 'body') {
        //   data.cell.styles.lineWidth = { top: 0, bottom: 0.2, left: 0.2, right: 0.2 };
        //   data.cell.styles.lineColor = [0, 0, 0];
        // }

        // قم بالتلوين فقط لخلايا محتوى الجدول (body)
        if (data.section === 'body') {
          // التلوين يكون منطقياً فقط عند isBranch == true وليس شهرياً isMonthly == false
          if (isBranch && !isMonthly) {
            const colIndex = data.column.index;
            // فهارس أعمدة "المتبقي" و "الوحده" (المتبقي)
            const remainingIndices = [1, 2, 6, 7, 11, 12];
            // فهارس أعمدة "المطلوب" و "الوحده" (المطلوب)
            const requiredIndices = [3, 4, 8, 9, 13, 14];

            // لون لأعمدة المتبقي ووحدتها (مثل اللون الأزرق الفاتح)
            const remainingColor = [204, 229, 255] as any; // Light Blue
            // لون لأعمدة المطلوب ووحدتها (مثل اللون الأصفر)
            const requiredColor = [255, 255, 204] as any; // Light Yellow

            // تطبيق لون المتبقي
            if (remainingIndices.includes(colIndex)) {

              data.cell.styles.fillColor = remainingColor;
            }
            // تطبيق لون المطلوب
            else if (requiredIndices.includes(colIndex)) {
              data.cell.styles.fillColor = requiredColor;
            }
          }


          // تنسيق الحدود
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
                // var filed = ""
                // var colmn = ""
                // if (Number(sub?.add ?? 0) !== 0) {
                //   colmn = "الجرد"
                //   filed = "add"
                // } else if (Number(sub?.dameged ?? 0) > 0) {
                //   colmn = "التالف"
                //   filed = "dameged"

                // }
                // else if (Number(sub?.transfer ?? 0) !== 0) {
                //   colmn = " التحويل"
                //   filed = "transfer"
                // }
                // else if (Number(sub?.recieved ?? 0) !== 0) {
                //   colmn = " المستلم"
                //   filed = "recieved"
                // }
                // if (colmn.length > 0) {
                //   notes.push(`ملاحظة في عمود ${colmn} ${sub.productName} ${sub[filed]} : ${sub.note} `);
                // }
                var filed = ""
                var colmn = ""
                if (Number(sub?.add ?? 0) !== 0) {
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
                else if (Number(sub?.recieved ?? 0) !== 0) {
                  colmn = " المستلم"
                  filed = "recieved"
                }
                if (colmn.length > 0) {
                  notes.push(`ملاحظة في عمود ${colmn} ${sub.productName} ${sub[filed]} : ${sub.note} `);
                }

              }
            });
          }
          if (element.note) {
            // var filed = ""
            // var colmn = ""
            // if (Number(element?.add ?? 0) !== 0) {
            //   colmn = "الجرد"
            //   filed = "add"
            // } else if (Number(element?.dameged ?? 0) > 0) {
            //   colmn = "التالف"
            //   filed = "dameged"

            // }
            // else if (Number(element?.transfer ?? 0) !== 0) {
            //   colmn = " التحويل"
            //   filed = "transfer"

            // }
            // else if (Number(element?.recieved ?? 0) !== 0) {
            //   colmn = " المستلم"
            //   filed = "recieved"

            // }
            // if (colmn.length > 0) {
            //   notes.push(`ملاحظة في عمود ${colmn} ${element.productName} ${element[filed]} : ${element.note} `);
            // }
            var filed = ""
            var colmn = ""
            if (Number(element?.add ?? 0) !== 0) {
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
            else if (Number(element?.recieved ?? 0) !== 0) {
              colmn = " المستلم"
              filed = "recieved"

            }
            if (colmn.length > 0) {
              notes.push(`ملاحظة في عمود ${colmn} ${element.productName} ${element[filed]} : ${element.note} `);
            }
          }
        });

        // عرض الملاحظات في أسفل الصفحة (بدون تكرار كلمة "ملاحظة")
        // if (notes.length > 0) {
        //   const startY = data1.cursor!.y + 10;
        //   const pageWidth = doc.internal.pageSize.getWidth();
        //   const rightMargin = 10;
        //   const lineHeight = 6;

        //   doc.setFontSize(10);
        //   doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, startY);

        //   notes.forEach((note, index) => {
        //     doc.text(
        //       note,
        //       pageWidth - rightMargin,
        //       startY + (index + 1) * lineHeight,
        //       { align: 'right' }
        //     );
        //     // doc.text(
        //     //   note,
        //     //   pageWidth - doc.getTextWidth(note) - rightMargin,
        //     //   startY + (index + 1) * lineHeight,
        //     //   // { align: 'right' }
        //     // );
        //   });
        // }
        if (notes.length > 0) {
          const lineHeight = 6;
          const pageHeight = doc.internal.pageSize.getHeight();
          const pageWidth = doc.internal.pageSize.getWidth();
          const rightMargin = 10;

          let currentY = data1.cursor!.y + 10;

          // تحقق من وجود مساحة لعنوان الملاحظات
          if (currentY + lineHeight > pageHeight - 10) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(10);
          doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, currentY);
          currentY += lineHeight;

          notes.forEach((note) => {
            // تحقق إذا كنا تجاوزنا حدود الصفحة
            if (currentY + lineHeight > pageHeight - 10) {
              doc.addPage();
              currentY = 20;

              doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, currentY);
              currentY += lineHeight;
            }

            doc.text(note, pageWidth - rightMargin, currentY, { align: 'right' });
            currentY += lineHeight;
          });
        }

      }
      ,
      startY: 20,
      theme: 'grid',
    });

    doc.save(`${branchName}_Daily_${date}.pdf`);
  }

  //   exportPDF5(data: any[], date: string, branchName: string, note: any) {
  //     const doc = new jsPDF();
  //     doc.setFont('ARIAL', 'normal');
  //     const rows: any[] = [];

  //     // إعداد صفوف الجدول
  //     for (const item of data) {
  //       if (Array.isArray(item.products) && item.products.length > 0) {
  //         const productCount = item.products.length;

  //         for (let i = 0; i < productCount; i++) {
  //           const sub = item.products[i];
  //           const row = [];

  //           row.push({ content: sub.productName });

  //           if (i === 0) {
  //             row.push({ content: item.openingStockQnt, rowSpan: productCount, styles: { halign: 'center', valign: 'middle' } });
  //             row.push({ content: item.recieved, rowSpan: productCount, styles: { halign: 'center', valign: 'middle' } });
  //           }

  //           row.push({ content: sub.add ?? '' });
  //           row.push({ content: sub.sales != null ? sub.sales : '--' });
  //           row.push({ content: sub.staffMeal ?? '' });

  //           if (i === 0) {
  //             row.push({ content: item.transfer ?? '', rowSpan: productCount, styles: { halign: 'center', valign: 'middle' } });
  //           }

  //           row.push({ content: sub.dameged ?? '' });

  //           if (i === 0) {
  //             row.push({ content: item.closeStock ?? '', rowSpan: productCount, styles: { halign: 'center', valign: 'middle' } });
  //           }

  //           rows.push(row);
  //         }
  //       } else {
  //         rows.push([
  //           { content: item.productName },
  //           { content: item.openingStockQnt },
  //           { content: item.recieved },
  //           { content: item.add },
  //           { content: item.sales },
  //           { content: item.staffMeal },
  //           { content: item.transfer },
  //           { content: item.dameged },
  //           { content: item.closeStock },
  //         ]);
  //       }
  //     }

  //     // رؤوس الجدول
  //    const topHeader = [[
  //   {
  //     content: 'SABA (Authentic Yemini Cuisine)',
  //     styles: {
  //       halign: 'left' as HAlignType,
  //       fontSize: 8
  //     },
  //     colSpan: 3
  //   },
  //   {
  //     content: ` ${date} : التاريخ`,
  //     styles: {
  //       halign: 'right' as HAlignType,
  //       fontSize: 8
  //     },
  //     colSpan: 3
  //   },
  //   {
  //     content: `${branchName} : اسم الفرع`,
  //     styles: {
  //       halign: 'right' as HAlignType,
  //       fontSize: 8
  //     },
  //     colSpan: 3
  //   }
  // ]];


  //     const headerRow = [
  //       this.items({ name: 'العناصر' }),
  //       this.items({ name: 'الموجودة' }),
  //       this.items({ name: 'المستلم' }),
  //       this.items({ name: 'الجرد' }),
  //       this.items({ name: 'مبيعات' }),
  //       this.items({ name: 'وجبة موظف' }),
  //       this.items({ name: 'تحويل' }),
  //       this.items({ name: 'التالف' }),
  //       this.items({ name: 'المتبقي' }),
  //     ];

  //     autoTable(doc, {
  //     head: [...topHeader, headerRow],
  //       body: rows,
  //       styles: {
  //         font: 'ARIAL',
  //         fontStyle: 'normal',
  //         fontSize: 8,
  //         textColor: '#000000',
  //         halign: 'center',
  //       },
  //       headStyles: {
  //         halign: 'center',
  //         fontStyle: 'normal',
  //       },
  //       startY: 20,
  //       theme: 'grid',

  //       didDrawPage: (data1) => {
  //         const notes: string[] = [];

  //         // تجميع الملاحظات من العناصر الفرعية والرئيسية
  //         data.forEach((element: any) => {
  //           if (Array.isArray(element.products)) {
  //             element.products.forEach((sub: any) => {
  //               if (sub.note) {
  //                 let field = "";
  //                 let column = "";
  //                 if (Number(sub?.add ?? 0) !== 0) {
  //                   column = "الجرد"; field = "add";
  //                 } else if (Number(sub?.dameged ?? 0) > 0) {
  //                   column = "التالف"; field = "dameged";
  //                 } else if (Number(sub?.transfer ?? 0) !== 0) {
  //                   column = "التحويل"; field = "transfer";
  //                 } else if (Number(sub?.recieved ?? 0) !== 0) {
  //                   column = "المستلم"; field = "recieved";
  //                 }

  //                 if (column.length > 0) {
  //                   notes.push(`ملاحظة في عمود ${column} ${sub.productName} ${sub[field]} : ${sub.note}`);
  //                 }
  //               }
  //             });
  //           }

  //           if (element.note) {
  //             let field = "";
  //             let column = "";
  //             if (Number(element?.add ?? 0) !== 0) {
  //               column = "الجرد"; field = "add";
  //             } else if (Number(element?.dameged ?? 0) > 0) {
  //               column = "التالف"; field = "dameged";
  //             } else if (Number(element?.transfer ?? 0) !== 0) {
  //               column = "التحويل"; field = "transfer";
  //             } else if (Number(element?.recieved ?? 0) !== 0) {
  //               column = "المستلم"; field = "recieved";
  //             }

  //             if (column.length > 0) {
  //               notes.push(`ملاحظة في عمود ${column} ${element.productName} ${element[field]} : ${element.note}`);
  //             }
  //           }
  //         });

  //         // عرض الملاحظات أسفل الجدول
  //         if (notes.length > 0) {
  //           const lineHeight = 6;
  //           const pageHeight = doc.internal.pageSize.getHeight();
  //           const pageWidth = doc.internal.pageSize.getWidth();
  //           const rightMargin = 10;
  //           let currentY = data1.cursor!.y + 10;

  //           // طباعة العنوان مرة واحدة فقط
  //           doc.setFontSize(10);
  //           if (currentY + lineHeight > pageHeight - 10) {
  //             doc.addPage();
  //             currentY = 20;
  //           }
  //           doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, currentY);
  //           currentY += lineHeight;

  //           notes.forEach((note) => {
  //             if (currentY + lineHeight > pageHeight - 10) {
  //               doc.addPage();
  //               currentY = 20;
  //               doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, currentY);
  //               currentY += lineHeight;
  //             }

  //             doc.text(note, pageWidth - rightMargin, currentY, { align: 'right' });
  //             currentY += lineHeight;
  //           });
  //         }
  //       }
  //     });

  //     doc.save(`${branchName}_Daily_${date}.pdf`);
  //   }


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
                  if (Number(sub?.add ?? 0) !== 0) {
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
                  else if (Number(sub?.recieved ?? 0) !== 0) {
                    colmn = " المستلم"
                    filed = "recieved"
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
              if (Number(element?.add ?? 0) !== 0) {
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
              else if (Number(element?.recieved ?? 0) !== 0) {
                colmn = " المستلم"
                filed = "recieved"

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
                pageWidth - rightMargin,
                startY + (index + 1) * lineHeight,
                { align: 'right' }
              );
              // doc.text(
              //   note,
              //   pageWidth - doc.getTextWidth(note) - rightMargin,
              //   startY + (index + 1) * lineHeight,
              //   // { align: 'right' }
              // );
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
  // exportMonthlyReportNotes(date: string, dataByDay: { date: string, data: any }[], branchName: string) {
  //   const doc = new jsPDF();
  //   doc.setFont('ARIAL', 'normal');
  //   let currentY = 20;
  //   dataByDay.forEach((dailyReport, index) => {
  //     const { date, data } = dailyReport;


  // const topHeader = [
  //   [
  //     {
  //       content: 'SABA (Authentic Yemini Cuisine)',
  //       styles: {
  //         halign: 'left' as HAlignType,
  //         fontStyle: 'normal' as FontStyle,
  //         fontSize: 8,
  //         lineWidth: 0.2,
  //         lineColor: [0, 0, 0] as Color,
  //       },
  //       colSpan: 3, // دمج العمودين الأول والثاني في هذا السطر
  //     },
  //     {
  //       content: ` ${date} : التاريخ`,
  //       styles: {
  //         halign: 'right' as HAlignType,
  //         fontStyle: 'normal' as FontStyle,
  //         fontSize: 8,

  //         lineWidth: 0.2,
  //         lineColor: [0, 0, 0] as Color,
  //       },
  //       colSpan: 3, // دمج العمودين الثالث والرابع في هذا السطر
  //     },
  //     {
  //       content: `${branchName} : اسم الفرع`,
  //       styles: {
  //         halign: 'right' as HAlignType,
  //         fontStyle: 'normal' as FontStyle,
  //         fontSize: 8,
  //         lineWidth: 0.2,

  //         lineColor: [0, 0, 0] as Color,
  //       },
  //       colSpan: 3, // دمج العمودين الثالث والرابع في هذا السطر
  //     },
  //   ],
  // ];


  //     autoTable(doc, {
  //       head: [...topHeader],
  //       styles: {
  //         font: 'ARIAL',
  //         fontStyle: 'normal',
  //         fontSize: 8,
  //         textColor: '#000000',
  //         halign: 'center', // Make sure all text in the table is right-aligned
  //       },
  //       headStyles: {
  //         halign: 'center',
  //         fontStyle: 'normal',
  //       },
  //       //  theme: 'striped', // optional, helps with visibility

  //       // styles: {
  //       //   fontSize: 8,
  //       //   cellPadding: 3,
  //       //   halign: 'center',
  //       // },

  //       /** 🔽 Capture where the table ends */
  //       didDrawPage: (data1) => {
  //         const notes: string[] = [];
  //         let counter = 1;

  //         // جمع كل الملاحظات (من العناصر الرئيسية أو الفرعية)
  //         // جمع كل الملاحظات (من العناصر الرئيسية أو الفرعية)
  //         data.forEach((element: any) => {

  //           if (Array.isArray(element.products)) {
  //             element.products.forEach((sub: any) => {
  //               if (sub.note) {
  //                 var filed = ""
  //                 var colmn = ""
  //                 if (Number(sub?.add ?? 0) !== 0) {
  //                   colmn = "الجرد"
  //                   filed = "add"
  //                 } else if (Number(sub?.dameged ?? 0) > 0) {
  //                   colmn = "التالف"
  //                   filed = "dameged"

  //                 }
  //                 else if (Number(sub?.transfer ?? 0) !== 0) {
  //                   colmn = " التحويل"
  //                   filed = "transfer"
  //                 }
  //                 else if (Number(sub?.recieved ?? 0) !== 0) {
  //                   colmn = " المستلم"
  //                   filed = "recieved"
  //                 }
  //                 if (colmn.length > 0) {
  //                   notes.push(`ملاحظة في عمود ${colmn} ${sub.productName} ${sub[filed]} : ${sub.note} `);
  //                 }

  //               }
  //             });
  //           }
  //           if (element.note) {
  //             var filed = ""
  //             var colmn = ""
  //             if (Number(element?.add ?? 0) !== 0) {
  //               colmn = "الجرد"
  //               filed = "add"
  //             } else if (Number(element?.dameged ?? 0) > 0) {
  //               colmn = "التالف"
  //               filed = "dameged"

  //             }
  //             else if (Number(element?.transfer ?? 0) !== 0) {
  //               colmn = " التحويل"
  //               filed = "transfer"

  //             }
  //             else if (Number(element?.recieved ?? 0) !== 0) {
  //               colmn = " المستلم"
  //               filed = "recieved"

  //             }
  //             if (notes.length > 0) {
  //               const lineHeight = 6;
  //               const pageHeight = doc.internal.pageSize.getHeight();
  //               const pageWidth = doc.internal.pageSize.getWidth();
  //               const rightMargin = 10;

  //               let currentY = data1.cursor!.y + 10;

  //               // تحقق من وجود مساحة كافية لطباعة العنوان
  //               if (currentY + lineHeight > pageHeight - 10) {
  //                 doc.addPage();
  //                 currentY = 20;
  //               }

  //               doc.setFontSize(10);
  //               doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, currentY);
  //               currentY += lineHeight;

  //               notes.forEach((note) => {
  //                 // إذا لم يتبقَّ مجال للسطر الحالي، انتقل إلى صفحة جديدة
  //                 if (currentY + lineHeight > pageHeight - 10) {
  //                   doc.addPage();
  //                   currentY = 20;

  //                   // إعادة طباعة العنوان
  //                   doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, currentY);
  //                   currentY += lineHeight;
  //                 }

  //                 doc.text(note, pageWidth - rightMargin, currentY, { align: 'right' });
  //                 currentY += lineHeight;
  //               });
  //             }


  //             // if (colmn.length > 0) {
  //             //   notes.push(`ملاحظة في عمود ${colmn} ${element.productName} ${element[filed]} : ${element.note} `);
  //             // }
  //           }
  //         });

  //         // عرض الملاحظات في أسفل الصفحة (بدون تكرار كلمة "ملاحظة")
  //         if (notes.length > 0) {
  //           const startY = data1.cursor!.y + 10;
  //           const pageWidth = doc.internal.pageSize.getWidth();
  //           const rightMargin = 10;
  //           const lineHeight = 6;

  //           doc.setFontSize(10);
  //           doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, startY);

  //           notes.forEach((note, index) => {
  //             doc.text(
  //               note,
  //               pageWidth - rightMargin,
  //               startY + (index + 1) * lineHeight,
  //               { align: 'right' }
  //             );
  //             // doc.text(
  //             //   note,
  //             //   pageWidth - doc.getTextWidth(note) - rightMargin,
  //             //   startY + (index + 1) * lineHeight,
  //             //   // { align: 'right' }
  //             // );
  //           });
  //         }
  //       }
  //       ,
  //       startY: currentY,
  //       theme: 'grid',
  //     });

  //     // إضافة صفحة جديدة إن لم تكن الصفحة الأخيرة
  //     // if (index < dataByDay.length - 1) {
  //     //   doc.addPage();
  //     // }
  //   });

  //   doc.save(`${date}_${branchName}_Monthly_Report_Notes.pdf`);
  // }

  exportMonthlyReportNotes(date: string, dataByDay: { date: string, data: any }[], branchName: string) {
    const doc = new jsPDF();
    doc.setFont('ARIAL', 'normal');

    const lineHeight = 6;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightMargin = 10;

    let currentY = 20;

    dataByDay.forEach((dailyReport, index) => {
      const { date: reportDate, data } = dailyReport;

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
            content: ` ${reportDate} : التاريخ`,
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
      // رسم الهيدر باستخدام autoTable
      autoTable(doc, {
        head: [...topHeader],
        body: [],
        startY: currentY,
        styles: {
          font: 'ARIAL',
          fontSize: 8,
          halign: 'center'
        },
        headStyles: {
          fontStyle: 'normal',
          halign: 'center'
        },
        theme: 'grid',
        didDrawPage: (data1) => {
          if (data1.cursor) {
            currentY = data1.cursor.y + 10;
          } else {
            currentY += 10; // أو أي قيمة افتراضية مناسبة إذا لم تكن cursor موجودة
          }

        }
      });

      // استخراج الملاحظات لهذا اليوم
      const notes: string[] = [];

      data.forEach((element: any) => {
        if (Array.isArray(element.products)) {
          element.products.forEach((sub: any) => {
            if (sub.note) {
              let filed = '';
              let colmn = '';
              if (Number(sub?.add ?? 0) !== 0) {
                colmn = "الجرد"; filed = "add";
              } else if (Number(sub?.dameged ?? 0) > 0) {
                colmn = "التالف"; filed = "dameged";
              } else if (Number(sub?.transfer ?? 0) !== 0) {
                colmn = "التحويل"; filed = "transfer";
              } else if (Number(sub?.recieved ?? 0) !== 0) {
                colmn = "المستلم"; filed = "recieved";
              }
              if (colmn.length > 0) {
                notes.push(`ملاحظة في عمود ${colmn} ${sub.productName} ${sub[filed]} : ${sub.note}`);
              }
            }
          });
        }

        if (element.note) {
          let filed = '';
          let colmn = '';
          if (Number(element?.add ?? 0) !== 0) {
            colmn = "الجرد"; filed = "add";
          } else if (Number(element?.dameged ?? 0) > 0) {
            colmn = "التالف"; filed = "dameged";
          } else if (Number(element?.transfer ?? 0) !== 0) {
            colmn = "التحويل"; filed = "transfer";
          } else if (Number(element?.recieved ?? 0) !== 0) {
            colmn = "المستلم"; filed = "recieved";
          }
          if (colmn.length > 0) {
            notes.push(`ملاحظة في عمود ${colmn} ${element.productName} ${element[filed]} : ${element.note}`);
          }
        }

        if (notes.length === 0) {
          return;
        }
      });

      // طباعة الملاحظات
      if (notes.length > 0) {
        // تحقق من وجود مساحة لطباعة ":ملاحظات"
        if (currentY + lineHeight > pageHeight - 10) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, currentY);
        currentY += lineHeight;

        notes.forEach((note) => {
          if (currentY + lineHeight > pageHeight - 10) {
            doc.addPage();
            currentY = 20;
            doc.text(":ملاحظات", pageWidth - doc.getTextWidth(":ملاحظات") - rightMargin, currentY);
            currentY += lineHeight;
          }

          doc.text(note, pageWidth - rightMargin, currentY, { align: 'right' });
          currentY += lineHeight;
        });
      }

      // مسافة قبل اليوم التالي
      currentY += lineHeight * 2;

      // إضافة صفحة جديدة إذا اقتربنا من نهاية الصفحة
      if (currentY > pageHeight - 30 && index < dataByDay.length - 1) {
        doc.addPage();
        currentY = 20;
      }
    });

    doc.save(`${date}_${branchName}_Monthly_Report_Notes.pdf`);
  }

}
