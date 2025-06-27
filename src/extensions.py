from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Extensões da aplicação
db = SQLAlchemy()            # Banco de dados
bcrypt = Bcrypt()            # Criptografia de senhas
jwt = JWTManager()           # Autenticação JWT
cors = CORS()                # Cross-Origin Resource Sharing