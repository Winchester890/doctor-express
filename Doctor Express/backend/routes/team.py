"""Helpers para representar a "equipe" de uma clínica/hospital.

A equipe é composta pela própria clínica + todos os prestadores individuais
vinculados (clinic_id apontando para a clínica). Todos os membros da equipe
compartilham visibilidade de serviços e solicitações da clínica.
"""
from typing import List

from models import User


def team_member_ids(user: User) -> List[int]:
    """Retorna a lista de user_ids que compõem a equipe do usuário.

    - Se for clínica/hospital (provider com cnpj): clinic.id + todos os prestadores ligados.
    - Se for prestador individual (provider sem cnpj): clínica + todos os colegas + ele mesmo.
    - Caso contrário (paciente, admin, outliers): apenas ele mesmo.
    """
    if not user or user.role != "provider":
        return [user.id] if user else []

    if user.cnpj:
        clinic_id = user.id
    elif user.clinic_id:
        clinic_id = user.clinic_id
    else:
        # Prestador sem clínica e sem cnpj — equipe só com ele mesmo
        return [user.id]

    members = {clinic_id}
    linked = User.query.filter_by(clinic_id=clinic_id, role="provider").all()
    for m in linked:
        members.add(m.id)
    members.add(user.id)
    return list(members)
