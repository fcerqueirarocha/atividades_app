from src.extensions import db
from datetime import datetime
import uuid


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    pass_ = db.Column('pass', db.String(255), nullable=False)  # 'pass' é palavra reservada
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com atividades
    activities = db.relationship('Activity', backref='user', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.full_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Activity(db.Model):
    __tablename__ = 'activities'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    description = db.Column(db.Text, nullable=False)
    resolution_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    users_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expected_date = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f'<Activity {self.description[:50]}>'

    def to_dict(self):
        return {
            'id': self.id,
            'description': self.description,
            'resolution_date': self.resolution_date.isoformat() if self.resolution_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'users_id': self.users_id,
            'is_pending': self.resolution_date is None,
            'expected_date': self.expected_date.isoformat() if self.expected_date else None
        }

