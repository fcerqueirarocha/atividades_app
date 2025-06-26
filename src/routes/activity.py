from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import Activity, db
from datetime import datetime
from sqlalchemy import func, case


activity_bp = Blueprint('activity', __name__)

@activity_bp.route('/activities', methods=['GET'])
@jwt_required()
def get_activities():
    """R3 - Listar atividades (pendentes ou finalizadas)"""
    try:
        user_id = int(get_jwt_identity())
        
        # Parâmetro para filtrar pendentes (default: True)
        show_pending = request.args.get('pending', 'true').lower() == 'true'
        
        if show_pending:
            # Listar atividades pendentes (resolution_date é null)
            activities = Activity.query.filter_by(
                users_id=int(user_id),
                resolution_date=None
            ).order_by(Activity.created_at.asc()).all()
        else:
            # Listar atividades finalizadas (resolution_date não é null)
            activities = Activity.query.filter(
                Activity.users_id == int(user_id),
                Activity.resolution_date.isnot(None)
            ).order_by(Activity.resolution_date.desc()).all()
        
        return jsonify({
            'activities': [activity.to_dict() for activity in activities],
            'pending': show_pending,
            'count': len(activities)
        }), 200
        
    except Exception as e:
        # Retorna o erro detalhado
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@activity_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """R3 - Listar atividades (pendentes ou finalizadas)"""
    try:
        user_id = int(get_jwt_identity())
        
        stats = db.session.query(
            func.count(Activity.id).label("total"),
            func.count(case((Activity.resolution_date == None, 1))).label("pending"),
            func.count(case((Activity.resolution_date != None, 1))).label("completed")
        ).filter(Activity.users_id == user_id).first()

        return jsonify({
            "total": stats.total,
            "pending": stats.pending,
            "completed": stats.completed
        }), 200        
    except Exception as e:
        # Retorna o erro detalhado
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@activity_bp.route('/activities', methods=['POST'])
@jwt_required()
def create_activity():
    """Criar nova atividade"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        description = data.get('description', '').strip()
        if not description:
            return jsonify({'error': 'Descrição é obrigatória'}), 400
        
        activity = Activity(
            description=description,
            users_id=user_id
        )
        
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'message': 'Atividade criada com sucesso',
            'activity': activity.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        # Retorna o erro detalhado
        return jsonify({'error': f'Erro ao criar atividade: {str(e)}'}), 500

@activity_bp.route('/activities/<activity_id>', methods=['PUT'])
@jwt_required()
def update_activity(activity_id):
    """Atualizar atividade (descrição)"""
    try:
        user_id = int(get_jwt_identity())
        activity = Activity.query.filter_by(id=activity_id, users_id=user_id).first()
        
        if not activity:
            return jsonify({'error': 'Atividade não encontrada'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        if 'description' in data:
            description = data['description'].strip()
            if not description:
                return jsonify({'error': 'Descrição não pode estar vazia'}), 400
            activity.description = description
        
        activity.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Atividade atualizada com sucesso',
            'activity': activity.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        # Retorna o erro detalhado
        return jsonify({'error': f'Erro ao atualizar atividade: {str(e)}'}), 500

@activity_bp.route('/activities/<activity_id>/toggle', methods=['PUT'])
@jwt_required()
def toggle_activity_status(activity_id):
    """R3 - Marcar/desmarcar atividade como finalizada"""
    try:
        user_id = int(get_jwt_identity())

        activity = Activity.query.filter_by(id=activity_id, users_id=user_id).first()
        if not activity:
            return jsonify({'error': 'Atividade não encontrada'}), 404

        data = request.get_json(silent=True) or {}
        completed = data.get('completed', False)

        if completed:
            if activity.resolution_date is None:
                activity.resolution_date = datetime.utcnow()
                message = 'Atividade marcada como finalizada'
            else:
                message = 'Atividade já estava finalizada'
        else:
            if activity.resolution_date is not None:
                activity.resolution_date = None
                message = 'Atividade marcada como pendente'
            else:
                message = 'Atividade já estava pendente'

        activity.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': message,
            'activity': activity.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@activity_bp.route('/activities/bulk-toggle', methods=['PUT'])
@jwt_required()
def bulk_toggle_activities():
    """R3 - Marcar/desmarcar múltiplas atividades"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'activities' not in data:
            return jsonify({'error': 'Lista de atividades não fornecida'}), 400
        
        activity_updates = data['activities']  # Lista de {id, completed}
        updated_activities = []
        
        for update in activity_updates:
            activity_id = update.get('id')
            completed = update.get('completed', False)
            
            activity = Activity.query.filter_by(id=activity_id, users_id=user_id).first()
            if activity:
                if completed and activity.resolution_date is None:
                    activity.resolution_date = datetime.utcnow()
                elif not completed and activity.resolution_date is not None:
                    activity.resolution_date = None
                
                activity.updated_at = datetime.utcnow()
                updated_activities.append(activity.to_dict())
        
        db.session.commit()
        
        return jsonify({
            'message': f'{len(updated_activities)} atividades atualizadas',
            'activities': updated_activities
        }), 200
        
    except Exception as e:
        db.session.rollback()
        # Retorna o erro detalhado
        return jsonify({'error': f'Erro ao atualizar atividades em massa: {str(e)}'}), 500

@activity_bp.route('/activities/<activity_id>', methods=['DELETE'])
@jwt_required()
def delete_activity(activity_id):
    """Excluir atividade"""
    try:
        user_id = int(get_jwt_identity())
        activity = Activity.query.filter_by(id=activity_id, users_id=user_id).first()
        
        if not activity:
            return jsonify({'error': 'Atividade não encontrada'}), 404
        
        db.session.delete(activity)
        db.session.commit()
        
        return jsonify({'message': 'Atividade excluída com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        # Retorna o erro detalhado
        return jsonify({'error': f'Erro ao excluir atividade: {str(e)}'}), 500
