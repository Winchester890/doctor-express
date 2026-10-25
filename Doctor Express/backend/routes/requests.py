"""Rotas de solicitação, matching, aceitação e conclusão (RF04 - RF07, RN02, RN03)."""
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import and_

from models import db, Service, ServiceRequest, User, log_action
from routes.team import team_member_ids

requests_bp = Blueprint("requests", __name__, url_prefix="/api/requests")


def _match_providers(category: str, specialty: str, city: str):
    """RF05 — Matching automático.

    Heurística simples: prestadores ativos, validados, que tenham serviço com
    a especialidade/categoria solicitada e cidade coincidente. Ordena por
    média de avaliações (desc) e número de serviços ativos.
    """
    services = Service.query.filter(
        Service.active.is_(True),
        Service.specialty.ilike(f"%{specialty}%") if specialty else True,
    ).all()

    candidates = []
    for s in services:
        if category and category.lower() not in s.category.lower():
            continue
        if city and city.lower() not in s.city.lower():
            continue
        provider = s.provider
        if not provider or not provider.validated or not provider.active:
            continue
        score = s.to_dict()["average_rating"] or 0
        candidates.append((s, provider, score))

    candidates.sort(key=lambda c: c[2], reverse=True)
    return candidates


@requests_bp.route("/match", methods=["POST"])
@jwt_required()
def match():
    """RF05 — Retorna a lista de prestadores compatíveis com a solicitação."""
    data = request.get_json() or {}
    matches = _match_providers(
        data.get("category", ""),
        data.get("specialty", ""),
        data.get("city", ""),
    )
    return jsonify([
        {
            "service": s.to_dict(),
            "provider": p.to_dict(),
            "score": score,
        }
        for s, p, score in matches[:10]
    ]), 200


@requests_bp.route("", methods=["POST"])
@jwt_required()
def create_request():
    """RF04 — Paciente cria uma solicitação para um serviço específico."""
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"error": "Apenas pacientes podem solicitar serviços."}), 403

    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    service_id = data.get("service_id")
    if not service_id:
        return jsonify({"error": "Informe o service_id."}), 400

    service = Service.query.get(service_id)
    if not service or not service.active:
        return jsonify({"error": "Serviço indisponível."}), 404
    if not service.provider.validated:
        return jsonify({"error": "Prestador não validado."}), 403

    new_request = ServiceRequest(
        patient_id=user_id,
        service_id=service.id,
        provider_id=service.provider_id,
        status="pending",
        notes=(data.get("notes") or "").strip(),
    )
    db.session.add(new_request)
    db.session.commit()

    log_action(user_id, "request_create", f"Solicitação {new_request.id} para serviço {service.id}")
    return jsonify(new_request.to_dict()), 201


@requests_bp.route("/<int:request_id>/accept", methods=["POST"])
@jwt_required()
def accept_request(request_id):
    """RF06 / RF07 — Qualquer membro da equipe (clínica + prestadores vinculados)
    pode aceitar com controle de concorrência."""
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    if claims.get("role") != "provider":
        return jsonify({"error": "Apenas prestadores podem aceitar solicitações."}), 403

    user = User.query.get(user_id)
    team_ids = team_member_ids(user)

    # Bloqueio otimista: faz update condicional ao status pending E provider na equipe
    rows = (
        db.session.query(ServiceRequest)
        .filter(
            and_(
                ServiceRequest.id == request_id,
                ServiceRequest.provider_id.in_(team_ids),
                ServiceRequest.status == "pending",
            )
        )
        .update({"status": "accepted", "updated_at": datetime.utcnow()}, synchronize_session=False)
    )
    db.session.commit()

    if rows == 0:
        existing = ServiceRequest.query.get(request_id)
        if not existing:
            return jsonify({"error": "Solicitação não encontrada."}), 404
        if existing.provider_id not in team_ids:
            return jsonify({"error": "Solicitação não pertence à sua equipe."}), 403
        return jsonify({"error": f"Solicitação não está mais pendente (status: {existing.status})."}), 409

    req = ServiceRequest.query.get(request_id)
    log_action(user_id, "request_accept", f"Solicitação {request_id}")
    return jsonify(req.to_dict()), 200


@requests_bp.route("/<int:request_id>/refuse", methods=["POST"])
@jwt_required()
def refuse_request(request_id):
    """RF06 — Qualquer membro da equipe pode recusar."""
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    if claims.get("role") != "provider":
        return jsonify({"error": "Apenas prestadores podem recusar."}), 403

    user = User.query.get(user_id)
    req = ServiceRequest.query.get_or_404(request_id)
    if req.provider_id not in team_member_ids(user):
        return jsonify({"error": "Solicitação não pertence à sua equipe."}), 403
    if req.status != "pending":
        return jsonify({"error": "Solicitação não está pendente."}), 409

    req.status = "refused"
    db.session.commit()
    log_action(user_id, "request_refuse", f"Solicitação {request_id}")
    return jsonify(req.to_dict()), 200


@requests_bp.route("/<int:request_id>/complete", methods=["POST"])
@jwt_required()
def complete_request(request_id):
    """RN03 — Qualquer membro da equipe pode marcar como concluído."""
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    if claims.get("role") != "provider":
        return jsonify({"error": "Apenas prestadores podem concluir."}), 403

    user = User.query.get(user_id)
    req = ServiceRequest.query.get_or_404(request_id)
    if req.provider_id not in team_member_ids(user):
        return jsonify({"error": "Solicitação não pertence à sua equipe."}), 403
    if req.status != "accepted":
        return jsonify({"error": "Apenas solicitações aceitas podem ser concluídas."}), 409

    req.status = "completed"
    db.session.commit()
    log_action(user_id, "request_complete", f"Solicitação {request_id}")
    return jsonify(req.to_dict()), 200


@requests_bp.route("/<int:request_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_request(request_id):
    """RN02 — Paciente cancela; depois de aceito exige justificativa."""
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    req = ServiceRequest.query.get_or_404(request_id)

    if claims.get("role") != "patient" or req.patient_id != user_id:
        return jsonify({"error": "Sem permissão para cancelar esta solicitação."}), 403

    if req.status not in {"pending", "accepted"}:
        return jsonify({"error": "Solicitação já encerrada."}), 409

    data = request.get_json() or {}
    reason = (data.get("reason") or "").strip()

    if req.status == "accepted" and not reason:
        return jsonify({"error": "Para cancelar após aceito, é obrigatória uma justificativa."}), 400

    req.status = "cancelled"
    req.cancel_reason = reason or None
    db.session.commit()

    # RN02 - regra adicional: 3 cancelamentos sem justificativa em 30 dias = aviso ao admin
    if not reason:
        cutoff = datetime.utcnow() - timedelta(days=30)
        count = ServiceRequest.query.filter(
            ServiceRequest.patient_id == user_id,
            ServiceRequest.status == "cancelled",
            ServiceRequest.cancel_reason.is_(None),
            ServiceRequest.updated_at >= cutoff,
        ).count()
        if count > 3:
            log_action(
                user_id,
                "patient_warning",
                f"Mais de 3 cancelamentos sem justificativa em 30 dias",
            )

    log_action(user_id, "request_cancel", f"Solicitação {request_id} - motivo: {reason or 'n/a'}")
    return jsonify(req.to_dict()), 200


@requests_bp.route("/mine", methods=["GET"])
@jwt_required()
def my_requests():
    """Lista solicitações do usuário autenticado.

    - Paciente: apenas as próprias.
    - Prestador (clínica ou individual): todas da equipe (clínica + vinculados).
    - Admin: todas.
    """
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    if role == "patient":
        items = ServiceRequest.query.filter_by(patient_id=user_id).order_by(
            ServiceRequest.created_at.desc()
        ).all()
    elif role == "provider":
        user = User.query.get(user_id)
        team_ids = team_member_ids(user)
        items = (
            ServiceRequest.query.filter(ServiceRequest.provider_id.in_(team_ids))
            .order_by(ServiceRequest.created_at.desc())
            .all()
        )
    else:
        items = ServiceRequest.query.order_by(ServiceRequest.created_at.desc()).all()

    return jsonify([i.to_dict() for i in items]), 200
