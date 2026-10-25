from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """Usuário do sistema. Pode ser paciente, prestador ou administrador."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # patient | provider | admin

    # Campos opcionais usados por prestadores
    specialty = db.Column(db.String(120))
    cnpj = db.Column(db.String(20))
    crm = db.Column(db.String(30))
    city = db.Column(db.String(120))
    validated = db.Column(db.Boolean, default=False)  # RN01 - prestador validado pelo admin
    active = db.Column(db.Boolean, default=True)

    # Vínculo de prestador individual com uma clínica/hospital (outro User com role=provider e cnpj)
    clinic_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # Geolocalização (RF10) — usado por clínicas/hospitais
    address = db.Column(db.String(255))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    services = db.relationship("Service", backref="provider", lazy=True)
    requests_made = db.relationship(
        "ServiceRequest",
        backref="patient",
        foreign_keys="ServiceRequest.patient_id",
        lazy=True,
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        clinic_name = None
        if self.clinic_id:
            clinic = db.session.get(User, self.clinic_id)
            clinic_name = clinic.name if clinic else None
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "specialty": self.specialty,
            "cnpj": self.cnpj,
            "crm": self.crm,
            "city": self.city,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "validated": self.validated,
            "active": self.active,
            "clinic_id": self.clinic_id,
            "clinic_name": clinic_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Service(db.Model):
    """Serviço médico publicado por um prestador (RF03)."""

    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(80), nullable=False)
    specialty = db.Column(db.String(120), nullable=False)
    city = db.Column(db.String(120), nullable=False)
    availability = db.Column(db.String(255))  # texto livre: "Seg/Qua 09h-12h"
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        avg = 0.0
        count = 0
        clinic_id = None
        clinic_name = None
        clinic_address = None
        clinic_lat = None
        clinic_lng = None
        if self.provider:
            ratings = [r.score for r in Rating.query.filter_by(provider_id=self.provider_id).all()]
            count = len(ratings)
            avg = round(sum(ratings) / count, 2) if count else 0.0

            # Se o prestador é a própria clínica (tem cnpj), ela é a entidade
            clinic_user = None
            if self.provider.cnpj:
                clinic_user = self.provider
            elif self.provider.clinic_id:
                clinic_user = db.session.get(User, self.provider.clinic_id)

            if clinic_user:
                clinic_id = clinic_user.id
                clinic_name = clinic_user.name
                clinic_address = clinic_user.address
                clinic_lat = clinic_user.latitude
                clinic_lng = clinic_user.longitude

        return {
            "id": self.id,
            "provider_id": self.provider_id,
            "provider_name": self.provider.name if self.provider else None,
            "provider_validated": self.provider.validated if self.provider else False,
            "clinic_id": clinic_id,
            "clinic_name": clinic_name,
            "clinic_address": clinic_address,
            "clinic_latitude": clinic_lat,
            "clinic_longitude": clinic_lng,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "specialty": self.specialty,
            "city": self.city,
            "availability": self.availability,
            "active": self.active,
            "average_rating": avg,
            "rating_count": count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ServiceRequest(db.Model):
    """Solicitação de serviço feita pelo paciente (RF04-RF07)."""

    __tablename__ = "service_requests"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # pending | accepted | refused | completed | cancelled
    status = db.Column(db.String(20), nullable=False, default="pending")
    notes = db.Column(db.Text)
    cancel_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    service = db.relationship("Service", backref="requests")
    provider = db.relationship("User", foreign_keys=[provider_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "patient_name": self.patient.name if self.patient else None,
            "service_id": self.service_id,
            "service_title": self.service.title if self.service else None,
            "service_specialty": self.service.specialty if self.service else None,
            "service_city": self.service.city if self.service else None,
            "provider_id": self.provider_id,
            "provider_name": self.provider.name if self.provider else None,
            "status": self.status,
            "notes": self.notes,
            "cancel_reason": self.cancel_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Rating(db.Model):
    """Avaliação de um atendimento concluído (RF08, RN03)."""

    __tablename__ = "ratings"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(
        db.Integer, db.ForeignKey("service_requests.id"), nullable=False, unique=True
    )
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    score = db.Column(db.Integer, nullable=False)  # 1 a 5
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "request_id": self.request_id,
            "patient_id": self.patient_id,
            "provider_id": self.provider_id,
            "score": self.score,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Report(db.Model):
    """Reporte de comportamento inadequado / violações (RF12)."""

    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    target_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="open")  # open | reviewed | resolved
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        reporter = User.query.get(self.reporter_id)
        target = User.query.get(self.target_user_id)
        return {
            "id": self.id,
            "reporter_id": self.reporter_id,
            "reporter_name": reporter.name if reporter else None,
            "target_user_id": self.target_user_id,
            "target_user_name": target.name if target else None,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AuditLog(db.Model):
    """Log de auditoria (RNF08)."""

    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    action = db.Column(db.String(80), nullable=False)
    detail = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "detail": self.detail,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def log_action(user_id, action: str, detail: str = "") -> None:
    """Registra um evento de auditoria."""
    entry = AuditLog(user_id=user_id, action=action, detail=detail)
    db.session.add(entry)
    db.session.commit()
