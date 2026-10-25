"""Rotas de avaliação (RF08, RN03)."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from models import db, Rating, ServiceRequest, log_action

ratings_bp = Blueprint("ratings", __name__, url_prefix="/api/ratings")


@ratings_bp.route("", methods=["POST"])
@jwt_required()
def create_rating():
    """RF08 — Paciente avalia o atendimento concluído (RN03)."""
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"error": "Apenas pacientes podem avaliar."}), 403

    data = request.get_json() or {}
    request_id = data.get("request_id")
    score = data.get("score")
    comment = (data.get("comment") or "").strip()

    if not request_id or score is None:
        return jsonify({"error": "request_id e score são obrigatórios."}), 400
    try:
        score = int(score)
    except (TypeError, ValueError):
        return jsonify({"error": "Score inválido."}), 400
    if score < 1 or score > 5:
        return jsonify({"error": "Score deve estar entre 1 e 5."}), 400

    req = ServiceRequest.query.get(request_id)
    if not req:
        return jsonify({"error": "Solicitação não encontrada."}), 404
    if req.patient_id != user_id:
        return jsonify({"error": "Solicitação não pertence a você."}), 403
    if req.status != "completed":
        return jsonify({"error": "Avaliação só é permitida após conclusão do atendimento."}), 409

    if Rating.query.filter_by(request_id=request_id).first():
        return jsonify({"error": "Atendimento já avaliado."}), 409

    rating = Rating(
        request_id=request_id,
        patient_id=user_id,
        provider_id=req.provider_id,
        score=score,
        comment=comment,
    )
    db.session.add(rating)
    db.session.commit()

    log_action(user_id, "rating_create", f"Avaliação {rating.id} (score {score})")
    return jsonify(rating.to_dict()), 201


@ratings_bp.route("/provider/<int:provider_id>", methods=["GET"])
def list_by_provider(provider_id):
    items = Rating.query.filter_by(provider_id=provider_id).order_by(
        Rating.created_at.desc()
    ).all()
    avg = round(sum(r.score for r in items) / len(items), 2) if items else 0.0
    return jsonify({
        "average": avg,
        "count": len(items),
        "items": [r.to_dict() for r in items],
    }), 200
