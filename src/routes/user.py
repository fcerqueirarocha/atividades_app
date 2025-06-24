from flask import Blueprint, jsonify, request
from src.models.user import User
from src.extensions import db
from flask_bcrypt import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime

user_bp = Blueprint("user", __name__)

@user_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Dados não fornecidos"}), 400

    full_name = data.get("full_name").strip()
    email = data.get("email").strip()
    password = data.get("password").strip()

    if not full_name or not email or not password:
        return jsonify({"error": "Nome, email e senha são obrigatórios"}), 400

    if len(password) < 6:
        return jsonify({"error": "A senha deve ter no mínimo 6 caracteres"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email já cadastrado"}), 409

    hashed_password = generate_password_hash(password).decode("utf-8")
    new_user = User(full_name=full_name, email=email, pass_=hashed_password)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Usuário registrado com sucesso!"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Erro ao registrar usuário: {str(e)}"}), 500

@user_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Dados não fornecidos"}), 400

    email = data.get("email").strip()
    password = data.get("password").strip()

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.pass_, password):
        return jsonify({"error": "Email ou senha inválidos"}), 401

    # Convertendo user.id para string antes de criar o token
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email
        }
    }), 200

@user_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    return jsonify({
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }), 200

@user_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Dados não fornecidos"}), 400

    if "full_name" in data:
        user.full_name = data["full_name"].strip()
    if "email" in data:
        new_email = data["email"].strip()
        if new_email != user.email and User.query.filter_by(email=new_email).first():
            return jsonify({"error": "Email já cadastrado"}), 409
        user.email = new_email
    if "password" in data:
        new_password = data["password"].strip()
        if len(new_password) < 6:
            return jsonify({"error": "A nova senha deve ter no mínimo 6 caracteres"}), 400
        user.pass_ = generate_password_hash(new_password).decode("utf-8")

    user.updated_at = datetime.utcnow()
    try:
        db.session.commit()
        return jsonify({"message": "Perfil atualizado com sucesso!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Erro ao atualizar perfil: {str(e)}"}), 500
