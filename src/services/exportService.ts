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
    const html2canvas = (await import('html2canvas')).default;
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
export const exportToExcel = async (formData: any, tableRows: TrainingRow[]) => {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    // Garantir que os dados existam ou tenham fallbacks (prevenção de erro mobile)
    const dataInfo = {
      nome: formData?.nome || 'N/A',
      matricula: formData?.matricula || 'N/A',
      funcao: formData?.funcao || 'N/A',
      supervisor: formData?.supervisor || 'N/A',
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
      ['SUPERVISOR', dataInfo.supervisor.toUpperCase()],
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
 * Exporta os dados de treinamento como arquivo Word (docx) estilizado.
 */
export const exportToWord = async (formData: any, tableRows: TrainingRow[]) => {
  try {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign } = await import('docx');
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "RELATÓRIO DE PROGRESSO DE TREINAMENTO",
                bold: true,
                size: 32,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "DADOS DO COLABORADOR", bold: true, size: 24 }),
            ],
          }),
          new Paragraph({ text: `NOME: ${formData.nome?.toUpperCase() || 'N/A'}` }),
          new Paragraph({ text: `MATRÍCULA: ${formData.matricula || 'N/A'}` }),
          new Paragraph({ text: `FUNÇÃO: ${formData.funcao?.toUpperCase() || 'N/A'}` }),
          new Paragraph({ text: `SUPERVISOR: ${formData.supervisor?.toUpperCase() || 'N/A'}` }),
          new Paragraph({ text: `HORAS PREVISTAS: ${formData.horasPrevistas || 0}` }),
          new Paragraph({ text: `HORAS REALIZADAS: ${formData.horasRealizadas || 0}` }),
          new Paragraph({ text: `HORAS FALTANTES: ${formData.horasFaltantes || 0}`, spacing: { after: 400 } }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "DETALHAMENTO DAS ATIVIDADES", bold: true, size: 24 }),
            ],
            spacing: { after: 200 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  "Local", "Equipamento", "Data", "Hora", "Duração", "Instrutor", "Avaliação"
                ].map(text => new TableCell({
                  shading: { fill: "F3F4F6" },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text, bold: true, size: 20 })],
                    }),
                  ],
                })),
              }),
              ...tableRows.map(row => new TableRow({
                children: [
                  row.local, row.equipamento, row.data, row.hora, row.duracao, row.instrutor, row.avaliacao
                ].map(text => new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: text || "-", size: 18 })],
                    }),
                  ],
                })),
              }))
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Documento gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`,
                size: 16,
              })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400 },
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treinamento-${formData.matricula}-${new Date().getTime()}.docx`;
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
    const jsPDF = (await import('jspdf')).default;
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
