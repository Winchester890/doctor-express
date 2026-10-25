"""Rotas de publicação e busca de serviços (RF03, RF09)."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from models import db, Service, User, Rating, log_action
from routes.team import team_member_ids

services_bp = Blueprint("services", __name__, url_prefix="/api/services")


@services_bp.route("", methods=["GET"])
def list_services():
    """RF09 — Lista serviços com filtros (categoria, especialidade, cidade, avaliação mínima)."""
    category = request.args.get("category")
    specialty = request.args.get("specialty")
    city = request.args.get("city")
    min_rating = request.args.get("min_rating", type=float)

    query = Service.query.filter_by(active=True)
    if category:
        query = query.filter(Service.category.ilike(f"%{category}%"))
    if specialty:
        query = query.filter(Service.specialty.ilike(f"%{specialty}%"))
    if city:
        query = query.filter(Service.city.ilike(f"%{city}%"))

    services = [s.to_dict() for s in query.all()]

    # Apenas prestadores validados podem ter serviços visíveis ao público (RN01)
    services = [s for s in services if s["provider_validated"]]

    if min_rating is not None:
        services = [s for s in services if s["average_rating"] >= min_rating]

    return jsonify(services), 200


@services_bp.route("/<int:service_id>", methods=["GET"])
def get_service(service_id):
    service = Service.query.get_or_404(service_id)
    return jsonify(service.to_dict()), 200


@services_bp.route("", methods=["POST"])
@jwt_required()
def create_service():
    """RF03 — Prestador publica um serviço."""
    claims = get_jwt()
    if claims.get("role") != "provider":
        return jsonify({"error": "Apenas prestadores podem publicar serviços."}), 403

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user.validated:
        # RN01 — bloqueia publicação enquanto não validado
        return jsonify({"error": "Suas credenciais ainda não foram validadas pelo administrador."}), 403

    data = request.get_json() or {}
    required = ["title", "description", "category", "specialty", "city"]
    if any(not data.get(f) for f in required):
        return jsonify({"error": f"Campos obrigatórios: {', '.join(required)}."}), 400

    service = Service(
        provider_id=user_id,
        title=data["title"].strip(),
        description=data["description"].strip(),
        category=data["category"].strip(),
        specialty=data["specialty"].strip(),
        city=data["city"].strip(),
        availability=(data.get("availability") or "").strip(),
    )
    db.session.add(service)
    db.session.commit()

    log_action(user_id, "service_create", f"Serviço {service.id} - {service.title}")
    return jsonify(service.to_dict()), 201


@services_bp.route("/<int:service_id>", methods=["PUT"])
@jwt_required()
def update_service(service_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    service = Service.query.get_or_404(service_id)

    # Membros da equipe (clínica + prestadores vinculados) podem editar
    if service.provider_id not in team_member_ids(user):
        return jsonify({"error": "Você não pode editar este serviço."}), 403

    data = request.get_json() or {}
    for field in ["title", "description", "category", "specialty", "city", "availability"]:
        if field in data:
            setattr(service, field, (data[field] or "").strip())
    if "active" in data:
        service.active = bool(data["active"])

    db.session.commit()
    log_action(user_id, "service_update", f"Serviço {service.id}")
    return jsonify(service.to_dict()), 200


@services_bp.route("/<int:service_id>", methods=["DELETE"])
@jwt_required()
def delete_service(service_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    claims = get_jwt()
    service = Service.query.get_or_404(service_id)

    if service.provider_id not in team_member_ids(user) and claims.get("role") != "admin":
        return jsonify({"error": "Sem permissão para excluir."}), 403

    db.session.delete(service)
    db.session.commit()
    log_action(user_id, "service_delete", f"Serviço {service_id}")
    return jsonify({"message": "Serviço removido."}), 200


@services_bp.route("/mine", methods=["GET"])
@jwt_required()
def list_my_services():
    """Lista serviços visíveis para a equipe (clínica + prestadores vinculados)."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    ids = team_member_ids(user)
    services = (
        Service.query.filter(Service.provider_id.in_(ids))
        .order_by(Service.created_at.desc())
        .all()
    )
    return jsonify([s.to_dict() for s in services]), 200
