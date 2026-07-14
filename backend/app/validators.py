"""Validadores de domínio (CPF, etc.)."""


def normalizar_cpf(cpf: str) -> str:
    """Mantém apenas os dígitos."""
    return "".join(filter(str.isdigit, cpf or ""))


def cpf_valido(cpf: str) -> bool:
    """Valida CPF pelos dígitos verificadores (algoritmo oficial)."""
    cpf = normalizar_cpf(cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    for i in range(9, 11):
        soma = sum(int(cpf[num]) * ((i + 1) - num) for num in range(i))
        dig = (soma * 10) % 11
        if dig == 10:
            dig = 0
        if dig != int(cpf[i]):
            return False
    return True
