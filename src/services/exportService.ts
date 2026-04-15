import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { TrainingRow } from '../types';

/**
 * Função auxiliar para capturar um elemento com alta fidelidade (Método DSS).
 * Cria um clone invisível com largura de desktop para garantir layout perfeito no mobile.
 */
const captureElementHighRes = async (element: HTMLElement | null): Promise<HTMLCanvasElement> => {
  if (!element) {
    throw new Error('Elemento para captura não encontrado. Certifique-se de que os dados do colaborador estão visíveis.');
  }
  // 1. Clonar o elemento
  const clone = element.cloneNode(true) as HTMLElement;
  
  // 2. Estilizar o clone para captura perfeita
  // - Largura fixa (desktop) para evitar o layout espremido do mobile
  // - Remover botões de ação (lixeira, dropdowns, botões de adicionar)
  // - Fundo branco sólido
  Object.assign(clone.style, {
    position: 'absolute',
    top: '-9999px',
    left: '0',
    width: '1200px', // Força layout Desktop
    padding: '40px',
    backgroundColor: '#ffffff',
    zIndex: '-1',
    transform: 'none',
    boxShadow: 'none'
  });

  // Remover elementos que não devem sair na "foto"
  const elementsToRemove = clone.querySelectorAll('button, .no-export, .opacity-0');
  elementsToRemove.forEach(el => (el as HTMLElement).style.display = 'none');

  // Ajustar inputs para parecerem texto plano ou inputs limpos
  const inputs = clone.querySelectorAll('input');
  inputs.forEach(input => {
    input.style.border = 'none';
    input.style.backgroundColor = 'transparent';
    input.style.padding = '4px 0';
  });

  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 3, // Resolução "Retina"
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      onclone: (clonedDoc) => {
        // Garantir que animações do motion/react estejam no estado final
        const clonedEl = clonedDoc.body.querySelector('[style*="-9999px"]') as HTMLElement;
        if (clonedEl) clonedEl.style.transform = 'none';
      }
    });
    return canvas;
  } finally {
    document.body.removeChild(clone);
  }
};

/**
 * Exporta o formulário de treinamento como PNG de alta resolução.
 */
export const exportToPNG = async (element: HTMLElement) => {
  try {
    const canvas = await captureElementHighRes(element);
    const imgData = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = imgData;
    a.download = `formulario-treinamento-${new Date().getTime()}.png`;
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
    
    // Garantir que os dados existam ou tenham fallbacks (prevenção de erro mobile)
    const dataInfo = {
      nome: formData?.nome || 'N/A',
      matricula: formData?.matricula || 'N/A',
      funcao: formData?.funcao || 'N/A',
      previstas: formData?.horasPrevistas || 0,
      realizadas: formData?.horasRealizadas || 0,
      faltantes: formData?.horasFaltantes || 0
    };

    const wsData = [
      ['RELATÓRIO DE PROGRESSO DE TREINAMENTO'],
      [],
      ['NOME DO COLABORADOR', dataInfo.nome.toUpperCase()],
      ['MATRÍCULA', dataInfo.matricula],
      ['FUNÇÃO', dataInfo.funcao.toUpperCase()],
      ['HORAS PREVISTAS', dataInfo.previstas],
      ['HORAS REALIZADAS', dataInfo.realizadas],
      ['HORAS FALTANTES', dataInfo.faltantes],
      [],
      ['DETALHAMENTO DAS ATIVIDADES'],
      ['Local', 'Equipamento', 'Data', 'Hora', 'Duração', 'Instrutor', 'Avaliação']
    ];
    
    tableRows.forEach(row => {
      wsData.push([
        row.local || '', 
        row.equipamento || '', 
        row.data || '', 
        row.hora || '', 
        row.duracao || '', 
        row.instrutor || '', 
        row.avaliacao || ''
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajustar larguras das colunas
    ws['!cols'] = [
      { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Treinamento');
    XLSX.writeFile(wb, `treinamento-${dataInfo.matricula}-${new Date().getTime()}.xlsx`);
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
 * Exporta o formulário de treinamento como PDF de alta resolução (Método DSS).
 */
export const exportToPDF = async (element: HTMLElement) => {
  try {
    const canvas = await captureElementHighRes(element);
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Se a imagem for maior que uma página A4, ela será redimensionada para caber na largura
    // mas o ideal é que o formulário não seja excessivamente longo.
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    pdf.save(`formulario-treinamento-${new Date().getTime()}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};
