import os
import hashlib
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def gerar_pdf_fechamento(fechamento, itens, assinatura_medico, assinatura_recepcao, output_dir="uploads/recibos"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    filename = f"fechamento_{fechamento.id}.pdf"
    filepath = os.path.join(output_dir, filename)
    
    doc = SimpleDocTemplate(filepath, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Heading1'],
        alignment=1, # Center
        spaceAfter=20
    )
    
    normal_style = styles['Normal']
    
    elements = []
    
    # Title
    elements.append(Paragraph("Recibo Interno de Repasse Médico", title_style))
    elements.append(Paragraph(f"<b>Data do Fechamento:</b> {fechamento.data_fechamento}", normal_style))
    elements.append(Paragraph(f"<b>Status:</b> {fechamento.status}", normal_style))
    elements.append(Spacer(1, 12))
    
    # Items Table
    data = [["Paciente", "Valor Base", "Taxa Aplicada", "Valor Repasse"]]
    for item in itens:
        data.append([
            item.paciente_nome or "Desconhecido",
            f"R$ {item.valor_procedimento:.2f}",
            f"{item.percentual_aplicado or 0}%",
            f"R$ {item.valor_repasse:.2f}"
        ])
    
    data.append(["TOTAL", "", "", f"R$ {fechamento.valor_total:.2f}"])
    
    table = Table(data, colWidths=[3*inch, 1.2*inch, 1.2*inch, 1.2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 30))
    
    # Signatures Info
    elements.append(Paragraph("<b>Trilha de Auditoria - Assinaturas Eletrônicas</b>", styles['Heading3']))
    
    if assinatura_recepcao:
        elements.append(Paragraph("<b>Responsável (Recepção)</b>", normal_style))
        elements.append(Paragraph(f"Data/Hora: {assinatura_recepcao.timestamp}", normal_style))
        elements.append(Paragraph(f"IP: {assinatura_recepcao.ip_address}", normal_style))
        elements.append(Paragraph(f"User Agent: {assinatura_recepcao.user_agent}", normal_style))
        elements.append(Spacer(1, 10))
        
    if assinatura_medico:
        elements.append(Paragraph("<b>Aceite do Médico (Autenticado com Senha)</b>", normal_style))
        elements.append(Paragraph(f"Data/Hora: {assinatura_medico.timestamp}", normal_style))
        elements.append(Paragraph(f"IP: {assinatura_medico.ip_address}", normal_style))
        elements.append(Paragraph(f"User Agent: {assinatura_medico.user_agent}", normal_style))
        elements.append(Spacer(1, 10))
        
    # Document Hash (Integrity)
    elements.append(Spacer(1, 20))
    hash_note = f"Identificador Único (SHA-256): {fechamento.hash_documento or 'Gerando...'}"
    elements.append(Paragraph(f"<font size=8>{hash_note}</font>", normal_style))
    elements.append(Paragraph("<font size=8>Assinado eletronicamente nos termos do art. 10, §2º da MP 2.200-2/2001.</font>", normal_style))
    
    doc.build(elements)
    
    # Calculate file hash
    with open(filepath, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
        
    return filepath, file_hash
