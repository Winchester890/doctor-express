"""Rotas administrativas (validação de prestadores, gestão de usuários, reportes, logs)."""
from functools import wraps

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from models import db, User, Report, AuditLog, log_action
from barueri_addresses import find_address, find_by_label

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if get_jwt().get("role") != "admin":
            return jsonify({"error": "Acesso restrito a administradores."}), 403
        return fn(*args, **kwargs)

    return wrapper


@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    role = request.args.get("role")
    query = User.query
    if role:
        query = query.filter_by(role=role)
    return jsonify([u.to_dict() for u in query.all()]), 200


@admin_bp.route("/users", methods=["POST"])
@jwt_required()
def create_user():
    """Cria usuário pela plataforma.

    - Admin: pode criar paciente, prestador ou outro admin.
    - Prestador: pode cadastrar apenas pacientes.
    """
    requester_role = get_jwt().get("role")
    if requester_role not in {"admin", "provider"}:
        return jsonify({"error": "Sem permissão para cadastrar usuários."}), 403

    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "").strip().lower()

    if not name or not email or not password:
        return jsonify({"error": "Nome, e-mail e senha são obrigatórios."}), 400
    if "@" not in email or "." not in email:
        return jsonify({"error": "E-mail inválido."}), 400
    if len(password) < 6:
        return jsonify({"error": "A senha deve ter pelo menos 6 caracteres."}), 400
    if role not in {"patient", "provider", "admin"}:
        return jsonify({"error": "Perfil inválido. Use 'patient', 'provider' ou 'admin'."}), 400
    if requester_role == "provider" and role != "patient":
        return jsonify({"error": "Prestadores só podem cadastrar pacientes."}), 403
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "E-mail já cadastrado."}), 409

    cnpj = data.get("cnpj")
    clinic_id = data.get("clinic_id")

    # Prestador individual (sem CNPJ próprio) precisa estar vinculado a uma clínica/hospital
    if role == "provider" and not cnpj:
        if not clinic_id:
            return jsonify({
                "error": "Selecione a clínica/hospital ao qual o prestador está vinculado."
            }), 400
        clinic = User.query.get(clinic_id)
        if not clinic or clinic.role != "provider" or not clinic.cnpj:
            return jsonify({"error": "Clínica/Hospital inválido."}), 400

    # Endereço obrigatório e validado para clínicas/hospitais (RF10)
    address_str = None
    latitude = None
    longitude = None
    if role == "provider" and cnpj:
        address_id = data.get("address_id")
        address_label = (data.get("address") or "").strip()
        addr = None
        if address_id:
            addr = find_address(address_id)
        if not addr and address_label:
            addr = find_by_label(address_label)
        if not addr:
            return jsonify({
                "error": "Endereço inválido. Selecione um endereço válido de Barueri."
            }), 400
        address_str = addr["label"]
        latitude = addr["lat"]
        longitude = addr["lng"]

    user = User(
        name=name,
        email=email,
        role=role,
        specialty=data.get("specialty"),
        cnpj=cnpj,
        crm=data.get("crm"),
        city=data.get("city"),
        address=address_str,
        latitude=latitude,
        longitude=longitude,
        clinic_id=clinic_id if role == "provider" and not cnpj else None,
        validated=True,
        active=True,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    log_action(
        int(get_jwt_identity()),
        f"{requester_role}_create_user",
        f"Usuário {user.id} criado como {role}",
    )
    return jsonify(user.to_dict()), 201


@admin_bp.route("/users/<int:user_id>/validate", methods=["POST"])
@admin_required
def validate_provider(user_id):
    """RN01 — administrador valida credenciais do prestador."""
    user = User.query.get_or_404(user_id)
    if user.role != "provider":
        return jsonify({"error": "Apenas prestadores precisam de validação."}), 400
    user.validated = True
    db.session.commit()
    log_action(int(get_jwt_identity()), "provider_validate", f"Prestador {user_id}")
    return jsonify(user.to_dict()), 200


@admin_bp.route("/users/<int:user_id>/toggle-active", methods=["POST"])
@admin_required
def toggle_active(user_id):
    user = User.query.get_or_404(user_id)
    user.active = not user.active
    db.session.commit()
    log_action(
        int(get_jwt_identity()),
        "user_toggle_active",
        f"Usuário {user_id} -> active={user.active}",
    )
    return jsonify(user.to_dict()), 200


@admin_bp.route("/reports", methods=["GET"])
@admin_required
def list_reports():
    items = Report.query.order_by(Report.created_at.desc()).all()
    return jsonify([r.to_dict() for r in items]), 200


@admin_bp.route("/reports/<int:report_id>/resolve", methods=["POST"])
@admin_required
def resolve_report(report_id):
    rep = Report.query.get_or_404(report_id)
    rep.status = "resolved"
    db.session.commit()
    log_action(int(get_jwt_identity()), "report_resolve", f"Reporte {report_id}")
    return jsonify(rep.to_dict()), 200


@admin_bp.route("/logs", methods=["GET"])
@admin_required
def list_logs():
    """RNF08 — auditoria/rastreabilidade."""
    items = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(200).all()
    return jsonify([i.to_dict() for i in items]), 200


# Reporte (RF12) — usuário comum cria, admin gerencia
@admin_bp.route("/reports", methods=["POST"])
@jwt_required()
def create_report():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    target = data.get("target_user_id")
    reason = (data.get("reason") or "").strip()
    if not target or not reason:
        return jsonify({"error": "Informe target_user_id e reason."}), 400
    if not User.query.get(target):
        return jsonify({"error": "Usuário alvo não encontrado."}), 404

    rep = Report(reporter_id=user_id, target_user_id=target, reason=reason)
    db.session.add(rep)
    db.session.commit()
    log_action(user_id, "report_create", f"Reporte sobre usuário {target}")
    return jsonify(rep.to_dict()), 201
