def _processar_repasse_recepcao(db: Session, user, ag_id, valor, nome_pac, forma_pagamento):
    "Verifica se a recepcionista possui repasse por consulta e lança SAÍDA no caixa do dia."
    ag = db.query(clinica_models.Agendamento).filter(clinica_models.Agendamento.id == ag_id).first()
    if not ag:
        return
    
    rep = db.query(clinica_models.RepasseRecepcionista).filter(
        clinica_models.RepasseRecepcionista.recepcionista_id == user.id
    ).first()
    if not rep or not rep.valor:
        return
        
    tipo = rep.tipo or ""
    repasse_final = 0
    if "Percentual" in tipo:
        repasse_final = (valor or 0) * (rep.valor / 100.0)
    elif "por Consulta" in tipo and "Fixo" in tipo:
        repasse_final = rep.valor
        
    if repasse_final > 0:
        nome_recep = user.nome if user else "Recepção"
        saida = clinica_models.CaixaLancamento(
            empresa_id=user.empresa_id, unidade_id=ag.unidade_id, tipo="SAIDA",
            descricao=f"Comissão Recepção - {nome_recep} ({nome_pac})", 
            paciente_id=ag.paciente_id, profissional_id=user.id, valor=repasse_final,
            forma_pagamento=forma_pagamento, data=date.today(), criado_por=user.id,
        )
        db.add(saida)
        db.flush()
