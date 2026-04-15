import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { TrainingRow } from '../types';

/**
 * Exporta o formulário de treinamento como PNG.
 */
export const exportToPNG = async (element: HTMLElement) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f9fafb'
    });
    const imgData = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = imgData;
    a.download = 'formulario-treinamento.png';
    a.click();
  } catch (error) {
    console.error('Erro ao gerar PNG:', error);
    throw error;
  }
};

/**
 * Exporta os dados de treinamento como Excel.
 */
export const exportToExcel = (formData: any, tableRows: TrainingRow[]) => {
  try {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Dados do Treinamento'],
      [],
      ['Nome', formData.nome],
      ['Matrícula', formData.matricula],
      ['Supervisor', formData.supervisor],
      ['Função', formData.funcao],
      ['Horas Previstas', formData.horasPrevistas],
      ['Horas Realizadas', formData.horasRealizadas],
      ['Horas Faltantes', formData.horasFaltantes],
      [],
      ['Local', 'Equipamento', 'Data', 'Hora', 'Duração', 'Instrutor', 'Avaliação']
    ];
    
    tableRows.forEach(row => {
      wsData.push([row.local, row.equipamento, row.data, row.hora, row.duracao, row.instrutor, row.avaliacao]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Treinamento');
    XLSX.writeFile(wb, 'formulario-treinamento.xlsx');
  } catch (error) {
    console.error('Erro ao gerar Excel:', error);
    throw error;
  }
};

/**
 * Exporta os dados de treinamento como arquivo Word (docx).
 */
export const exportToWord = async (formData: any, tableRows: TrainingRow[]) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: "Dados do Treinamento", bold: true, size: 28 })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `Nome: ${formData.nome}` }),
          new Paragraph({ text: `Matrícula: ${formData.matricula}` }),
          new Paragraph({ text: `Supervisor: ${formData.supervisor}` }),
          new Paragraph({ text: `Função: ${formData.funcao}` }),
          new Paragraph({ text: `Horas Previstas: ${formData.horasPrevistas}` }),
          new Paragraph({ text: `Horas Realizadas: ${formData.horasRealizadas}` }),
          new Paragraph({ text: `Horas Faltantes: ${formData.horasFaltantes}` }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Local", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Equipamento", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Data", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hora", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Duração", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Instrutor", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Avaliação", bold: true })] })] }),
                ]
              }),
              ...tableRows.map(row => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(row.local)] }),
                  new TableCell({ children: [new Paragraph(row.equipamento)] }),
                  new TableCell({ children: [new Paragraph(row.data)] }),
                  new TableCell({ children: [new Paragraph(row.hora)] }),
                  new TableCell({ children: [new Paragraph(row.duracao)] }),
                  new TableCell({ children: [new Paragraph(row.instrutor)] }),
                  new TableCell({ children: [new Paragraph(row.avaliacao)] }),
                ]
              }))
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formulario-treinamento.docx";
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar Word:', error);
    throw error;
  }
};

/**
 * Exporta o formulário de treinamento como PDF.
 */
export const exportToPDF = async (element: HTMLElement) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f9fafb'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('formulario-treinamento.pdf');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};
