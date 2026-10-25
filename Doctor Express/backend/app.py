"""Doctor Express — Aplicação principal (Flask).

Sistema de informação distribuído para conectar pacientes a profissionais
de saúde, conforme especificação acadêmica do projeto Doctor Express.
"""
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db, User
from routes.auth import auth_bp
from routes.services import services_bp
from routes.requests import requests_bp
from routes.ratings import ratings_bp
from routes.admin import admin_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(services_bp)
    app.register_blueprint(requests_bp)
    app.register_blueprint(ratings_bp)
    app.register_blueprint(admin_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "Doctor Express API"}), 200

    with app.app_context():
        db.create_all()
        _migrate_schema()
        _backfill_clinic_addresses()
        _seed_admin()

    return app


def _backfill_clinic_addresses() -> None:
    """Atribui endereços do catálogo de Barueri a clínicas/hospitais sem coordenadas.

    Necessário para retrocompatibilidade: clínicas cadastradas antes da
    inclusão de geolocalização (RF10) ficavam com latitude/longitude nulas.
    Distribui de forma determinística (round-robin pelo id) para que clínicas
    diferentes apareçam em pontos distintos do mapa.
    """
    from barueri_addresses import ADDRESSES

    clinics = (
        User.query.filter(
            User.role == "provider",
            User.cnpj.isnot(None),
            User.cnpj != "",
            User.latitude.is_(None),
        )
        .order_by(User.id.asc())
        .all()
    )
    if not clinics:
        return

    for idx, clinic in enumerate(clinics):
        addr = ADDRESSES[idx % len(ADDRESSES)]
        clinic.address = addr["label"]
        clinic.latitude = addr["lat"]
        clinic.longitude = addr["lng"]

    db.session.commit()


def _migrate_schema() -> None:
    """Migrações simples para SQLite: adiciona colunas novas se não existirem."""
    from sqlalchemy import inspect, text

    inspector = inspect(db.engine)
    if "users" not in inspector.get_table_names():
        return
    columns = [c["name"] for c in inspector.get_columns("users")]
    new_columns = {
        "clinic_id": "INTEGER",
        "address": "VARCHAR(255)",
        "latitude": "FLOAT",
        "longitude": "FLOAT",
    }
    with db.engine.begin() as conn:
        for col, col_type in new_columns.items():
            if col not in columns:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))


def _seed_admin() -> None:
    """Cria um administrador padrão se não houver nenhum."""
    if not User.query.filter_by(role="admin").first():
        admin = User(
            name="Administrador",
            email="admin@doctorexpress.com",
            role="admin",
            validated=True,
            active=True,
        )
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()


if __name__ == "__main__":
    application = create_app()
    application.run(host="0.0.0.0", port=5000, debug=True)
