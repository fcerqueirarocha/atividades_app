import os
import sys
from datetime import timedelta
from dotenv import load_dotenv

# Add the parent directory to sys.path to allow importing modules from "src"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, jsonify, send_from_directory

from src.extensions import db, bcrypt, jwt, cors

def create_app():
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

    app = Flask(__name__, static_folder="static", static_url_path="/")

    # Configurações do Banco de Dados
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    # Configurações usando variáveis de ambiente
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "fallback-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["FLASK_ENV"] = os.getenv("FLASK_ENV", "development")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "fallback-secret-key")


    # Configuração do JWT
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=4)  
    # Configurações de segurança baseadas no ambiente
    if app.config["FLASK_ENV"] == "production":
        # Configurações específicas para produção
        app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)  # Token expira mais rápido
        app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", "16777216"))
        app.config["PREFERRED_URL_SCHEME"] = os.getenv("PREFERRED_URL_SCHEME", "https")
        app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "True") == "True"
        app.config["SESSION_COOKIE_HTTPONLY"] = os.getenv("SESSION_COOKIE_HTTPONLY", "True") == "True"
        app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
        
    # Inicializar extensões com o app
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    # Adicione configuração de CORS
    cors.init_app(app, origins=os.getenv("CORS_ORIGINS", "http://localhost:5001").split(","))

    # Importar modelos e rotas após a inicialização do db
    from src.models import User, Activity
    from src.routes.user import user_bp
    from src.routes.activity import activity_bp

    # Registrar Blueprints
    app.register_blueprint(user_bp, url_prefix="/api")
    app.register_blueprint(activity_bp, url_prefix="/api")

    # Manipuladores de erro para JWT
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"message": "Token de acesso ausente ou inválido"}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"message": "Token de acesso inválido"}), 401

    @jwt.expired_token_loader
    def expired_token_response(callback):
        return jsonify({"message": "Token de acesso expirado"}), 401

    @jwt.revoked_token_loader
    def revoked_token_response(callback):
        return jsonify({"message": "Token de acesso revogado"}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_response(callback):
        return jsonify({"message": "Token de acesso precisa ser atualizado"}), 401

    # Manipuladores de erro HTTP genéricos
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"message": "Recurso não encontrado"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"message": "Método não permitido para esta rota"}), 405

    @app.errorhandler(500)
    def internal_server_error(error):
        # Para depuração, você pode logar o erro completo aqui
        print(f"Erro interno do servidor: {error}" , file=sys.stderr)
        return jsonify({"message": "Erro interno do servidor"}), 500

    # Rota para servir o login.html na raiz
    @app.route("/")
    def serve_index():
        return send_from_directory(app.static_folder, "login.html")

    # Criar tabelas automaticamente no banco de dados
    with app.app_context():
        db.create_all()
        
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5001, debug=True)
