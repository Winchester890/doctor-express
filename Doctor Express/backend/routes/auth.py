"""Rotas de autenticação e cadastro (RF01, RF02)."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from models import db, User, log_action
from barueri_addresses import ADDRESSES, find_address, find_by_label

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

VALID_ROLES = {"patient", "provider", "admin"}


@auth_bp.route("/register", methods=["POST"])
def register():
    """RF01 — Cadastro de usuário (paciente ou prestador individual)."""
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "patient").strip().lower()
    clinic_id = data.get("clinic_id")

    if not name or not email or not password:
        return jsonify({"error": "Nome, e-mail e senha são obrigatórios."}), 400

    if "@" not in email or "." not in email:
        return jsonify({"error": "E-mail inválido."}), 400

    if len(password) < 6:
        return jsonify({"error": "A senha deve ter pelo menos 6 caracteres."}), 400

    if role not in {"patient", "provider"}:
        return jsonify({"error": "Perfil inválido. Use 'patient' ou 'provider'."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "E-mail já cadastrado."}), 409

    # Prestadores individuais (sem CNPJ próprio) precisam estar vinculados a uma clínica/hospital
    if role == "provider":
        if not clinic_id:
            return jsonify({
                "error": "Selecione a clínica/hospital ao qual você está vinculado."
            }), 400
        clinic = User.query.get(clinic_id)
        if not clinic or clinic.role != "provider" or not clinic.cnpj:
            return jsonify({"error": "Clínica/Hospital inválido."}), 400

    user = User(
        name=name,
        email=email,
        role=role,
        specialty=data.get("specialty"),
        crm=data.get("crm"),
        city=data.get("city"),
        clinic_id=clinic_id if role == "provider" else None,
        validated=False if role == "provider" else True,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    log_action(user.id, "register", f"Cadastro como {role}")

    return jsonify({"message": "Usuário cadastrado com sucesso.", "user": user.to_dict()}), 201


@auth_bp.route("/clinics", methods=["GET"])
def list_clinics_public():
    """Lista pública de clínicas/hospitais para popular dropdowns no cadastro."""
    clinics = User.query.filter(
        User.role == "provider",
        User.cnpj.isnot(None),
        User.cnpj != "",
        User.active.is_(True),
    ).order_by(User.name.asc()).all()
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "cnpj": c.cnpj,
            "city": c.city or "",
            "address": c.address or "",
            "latitude": c.latitude,
            "longitude": c.longitude,
        }
        for c in clinics
    ]), 200


@auth_bp.route("/addresses", methods=["GET"])
def list_addresses_public():
    """Catálogo simulado de endereços de Barueri (RF10).

    Substitui a chamada à API do Google Maps Geocoding em produção.
    """
    return jsonify(ADDRESSES), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    """RF02 — Autenticação segura (login + senha + JWT)."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Informe e-mail e senha."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciais inválidas."}), 401

    if not user.active:
        return jsonify({"error": "Usuário desativado. Contate o administrador."}), 403

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "name": user.name},
    )

    log_action(user.id, "login", f"Login bem-sucedido ({user.role})")

    return jsonify({"access_token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    """Retorna o usuário autenticado a partir do JWT."""
    from flask_jwt_extended import jwt_required, get_jwt_identity

    @jwt_required()
    def _inner():
        user = User.query.get(int(get_jwt_identity()))
        if not user:
            return jsonify({"error": "Usuário não encontrado."}), 404
        return jsonify(user.to_dict()), 200

    return _inner()
