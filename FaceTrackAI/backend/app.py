import os
import json
import base64
import tempfile
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import services
from face_recognition_service import FaceRecognitionService
from voice_recognition_service import VoiceRecognitionService
from supabase_service import SupabaseService

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize services
db_service = SupabaseService()
face_service = FaceRecognitionService(db_service)
voice_service = VoiceRecognitionService(db_service)

# Create data directories if they don't exist
os.makedirs('data/faces', exist_ok=True)
os.makedirs('data/voices', exist_ok=True)

# Default settings
DEFAULT_SETTINGS = {
    'face_recognition_threshold': 0.5,
    'voice_recognition_threshold': 0.5,
    'camera_id': '',
    'microphone_id': '',
    'require_both_auth': True
}

# Initialize settings in Supabase
def init_settings():
    try:
        # Get current settings
        settings = db_service.get_settings()
        
        # If no settings exist, initialize with defaults
        missing_settings = {}
        for key, value in DEFAULT_SETTINGS.items():
            if key not in settings:
                missing_settings[key] = value
        
        # Save any missing settings to the database
        for key, value in missing_settings.items():
            db_service.save_settings({
                'key': key,
                'value': value
            })
            print(f"Setting '{key}' initialized in database")
        
        if missing_settings:
            print("Default settings initialized in database")
            # Reload settings after initialization
            settings = db_service.get_settings()
        
        # Update recognition thresholds in services
        if settings:
            if 'face_recognition_threshold' in settings:
                face_service.update_threshold(settings['face_recognition_threshold'])
                print(f"Face recognition threshold set to: {settings['face_recognition_threshold']}")
            if 'voice_recognition_threshold' in settings:
                voice_service.update_threshold(settings['voice_recognition_threshold'])
                print(f"Voice recognition threshold set to: {settings['voice_recognition_threshold']}")
    except Exception as e:
        print(f"Error initializing settings: {e}")

# Initialize settings
init_settings()

@app.route('/')
def index():
    return jsonify({'status': 'Smart Attendance System API is running'})

# --------------------------------
# Student API Endpoints
# --------------------------------

@app.route('/api/students', methods=['GET'])
def get_students():
    """Get all students, with optional pagination and search"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        query = request.args.get('query', '')
        
        students, total = db_service.get_students(page, per_page, query)
        
        return jsonify({
            'success': True,
            'students': students,
            'total': total
        })
    except Exception as e:
        app.logger.error(f"Error getting students: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting students: {str(e)}"
        }), 500

@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    """Get a single student by ID"""
    try:
        student = db_service.get_student_by_id(student_id)
        
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
        
        return jsonify({
            'success': True,
            'student': student
        })
    except Exception as e:
        app.logger.error(f"Error getting student: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting student: {str(e)}"
        }), 500

@app.route('/api/students/register', methods=['POST'])
def register_student():
    """Register a new student with face and voice data"""
    try:
        # Get student info
        student_id = request.form.get('student_id')
        name = request.form.get('name')
        email = request.form.get('email')
        course = request.form.get('course')
        
        # Check for required fields
        if not all([student_id, name, email, course]):
            return jsonify({
                'success': False,
                'message': 'Missing required student information'
            }), 400
        
        # Check if student ID already exists
        existing_student = db_service.get_student_by_student_id(student_id)
        if existing_student:
            return jsonify({
                'success': False,
                'message': f'Student ID {student_id} already exists'
            }), 400
        
        # Get face image data
        face_image = request.form.get('face_image')
        if not face_image:
            return jsonify({
                'success': False,
                'message': 'Missing face image data'
            }), 400
        
        # Get voice sample
        if 'voice_sample' not in request.files:
            return jsonify({
                'success': False,
                'message': 'Missing voice sample'
            }), 400
        
        voice_sample = request.files['voice_sample']
        
        # Create new student record
        new_student = {
            'student_id': student_id,
            'name': name,
            'email': email,
            'course': course,
            'registration_date': datetime.now().isoformat(),
            'status': 'active'
        }
        
        # Save student to database
        student_id_db = db_service.add_student(new_student)
        
        # Process and save face image
        face_encoding = face_service.process_face_image(face_image, student_id_db)
        
        # Save voice sample
        voice_file_path = os.path.join('data/voices', f'{student_id_db}.wav')
        voice_sample.save(voice_file_path)
        
        # Process voice for embedding
        voice_embedding = voice_service.process_voice_sample(voice_file_path, student_id_db)
        
        return jsonify({
            'success': True,
            'message': f'Student {name} registered successfully',
            'student_id': student_id_db
        })
    except Exception as e:
        app.logger.error(f"Error registering student: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error registering student: {str(e)}"
        }), 500

@app.route('/api/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    """Update student information"""
    try:
        data = request.json
        
        # Check if student exists
        student = db_service.get_student_by_id(student_id)
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
        
        # Update student in database
        db_service.update_student(student_id, data)
        
        return jsonify({
            'success': True,
            'message': 'Student updated successfully'
        })
    except Exception as e:
        app.logger.error(f"Error updating student: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error updating student: {str(e)}"
        }), 500

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    """Delete a student and associated data"""
    try:
        # Check if student exists
        student = db_service.get_student_by_id(student_id)
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
        
        # Delete face encoding
        face_service.delete_student_face(student_id)
        
        # Delete voice sample
        voice_file_path = os.path.join('data/voices', f'{student_id}.wav')
        if os.path.exists(voice_file_path):
            os.remove(voice_file_path)
        
        # Delete from database
        db_service.delete_student(student_id)
        
        return jsonify({
            'success': True,
            'message': 'Student deleted successfully'
        })
    except Exception as e:
        app.logger.error(f"Error deleting student: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error deleting student: {str(e)}"
        }), 500

# --------------------------------
# Session API Endpoints
# --------------------------------

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get all sessions"""
    try:
        sessions = db_service.get_sessions()
        
        # Get attendance count for each session
        for session in sessions:
            session['attendance_count'] = db_service.get_session_attendance_count(session['id'])
        
        return jsonify({
            'success': True,
            'sessions': sessions
        })
    except Exception as e:
        app.logger.error(f"Error getting sessions: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting sessions: {str(e)}"
        }), 500

@app.route('/api/sessions', methods=['POST'])
def create_session():
    """Create a new session"""
    try:
        data = request.json
        
        # Check for required fields
        if 'name' not in data:
            return jsonify({
                'success': False,
                'message': 'Session name is required'
            }), 400
        
        # Set default date to today if not provided
        if 'date' not in data:
            data['date'] = datetime.now().strftime('%Y-%m-%d')
        
        # Create session in database
        session_id = db_service.add_session(data)
        
        return jsonify({
            'success': True,
            'message': 'Session created successfully',
            'session_id': session_id
        })
    except Exception as e:
        app.logger.error(f"Error creating session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error creating session: {str(e)}"
        }), 500

@app.route('/api/sessions/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session and its attendance records"""
    try:
        # Check if session exists
        session = db_service.get_session_by_id(session_id)
        if not session:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        # Delete session and attendance records
        db_service.delete_session(session_id)
        
        return jsonify({
            'success': True,
            'message': 'Session deleted successfully'
        })
    except Exception as e:
        app.logger.error(f"Error deleting session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error deleting session: {str(e)}"
        }), 500

# --------------------------------
# Attendance API Endpoints
# --------------------------------

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    """Get attendance records for a session"""
    try:
        session_id = request.args.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        attendance = db_service.get_attendance_by_session(session_id)
        
        return jsonify({
            'success': True,
            'attendance': attendance
        })
    except Exception as e:
        app.logger.error(f"Error getting attendance: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting attendance: {str(e)}"
        }), 500

@app.route('/api/attendance/mark', methods=['POST'])
def mark_attendance():
    """Mark attendance for a student in a session"""
    try:
        data = request.json
        
        # Check for required fields
        if 'student_id' not in data or 'session_id' not in data:
            return jsonify({
                'success': False,
                'message': 'Student ID and Session ID are required'
            }), 400
        
        student_id = data['student_id']
        session_id = data['session_id']
        
        # Check if student exists
        student = db_service.get_student_by_id(student_id)
        if not student:
            return jsonify({
                'success': False,
                'message': 'Student not found'
            }), 404
        
        # Check if session exists
        session = db_service.get_session_by_id(session_id)
        if not session:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        # Check if attendance already marked
        existing_attendance = db_service.get_attendance_by_student_session(student_id, session_id)
        if existing_attendance:
            return jsonify({
                'success': False,
                'message': 'Attendance already marked for this student in this session'
            }), 400
        
        # Mark attendance
        attendance_id = db_service.add_attendance({
            'student_id': student_id,
            'session_id': session_id,
            'timestamp': datetime.now().isoformat(),
            'status': 'present'
        })
        
        return jsonify({
            'success': True,
            'message': 'Attendance marked successfully',
            'attendance_id': attendance_id,
            'student_name': student['name']
        })
    except Exception as e:
        app.logger.error(f"Error marking attendance: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error marking attendance: {str(e)}"
        }), 500

# --------------------------------
# Recognition API Endpoints
# --------------------------------

@app.route('/api/recognition/detect-face', methods=['POST'])
def detect_face():
    """Detect and recognize faces in an image"""
    try:
        data = request.json
        
        # Check for required fields
        if 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'Image data is required'
            }), 400
        
        # Get session ID if provided
        session_id = data.get('session_id')
        
        # Detect and recognize faces
        result = face_service.detect_and_recognize_faces(data['image'])
        
        # Return result
        return jsonify({
            'success': True,
            'faces': result
        })
    except Exception as e:
        app.logger.error(f"Error detecting faces: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error detecting faces: {str(e)}"
        }), 500

@app.route('/api/recognition/verify-voice', methods=['POST'])
def verify_voice():
    """Verify a voice sample against a student's recorded voice"""
    try:
        # Check for required fields
        if 'voice_sample' not in request.files or 'student_id' not in request.form:
            return jsonify({
                'success': False,
                'message': 'Voice sample and student ID are required'
            }), 400
        
        student_id = request.form.get('student_id')
        voice_sample = request.files['voice_sample']
        
        # Save temporary voice file
        temp_dir = tempfile.gettempdir()
        temp_voice_path = os.path.join(temp_dir, f"temp_voice_{student_id}.wav")
        voice_sample.save(temp_voice_path)
        
        # Verify voice
        result = voice_service.verify_voice(temp_voice_path, int(student_id))
        
        # Delete temporary file
        if os.path.exists(temp_voice_path):
            os.remove(temp_voice_path)
        
        return jsonify({
            'success': result['match'],
            'message': result['message'],
            'score': result['score'] if 'score' in result else None
        })
    except Exception as e:
        app.logger.error(f"Error verifying voice: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error verifying voice: {str(e)}"
        }), 500

# --------------------------------
# Reports API Endpoints
# --------------------------------

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """Get attendance reports based on filters"""
    try:
        # Get filter parameters
        date_range = request.args.get('date_range')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        session_id = request.args.get('session_id')
        student_id = request.args.get('student_id')
        
        # Process date range
        if date_range:
            today = datetime.now().date()
            
            if date_range == 'today':
                start_date = today.isoformat()
                end_date = today.isoformat()
            elif date_range == 'yesterday':
                yesterday = today - timedelta(days=1)
                start_date = yesterday.isoformat()
                end_date = yesterday.isoformat()
            elif date_range == 'this_week':
                start_date = (today - timedelta(days=today.weekday())).isoformat()
                end_date = today.isoformat()
            elif date_range == 'last_week':
                last_week_start = today - timedelta(days=today.weekday() + 7)
                last_week_end = last_week_start + timedelta(days=6)
                start_date = last_week_start.isoformat()
                end_date = last_week_end.isoformat()
            elif date_range == 'this_month':
                start_date = today.replace(day=1).isoformat()
                end_date = today.isoformat()
        
        # Get attendance data
        attendance_data, stats = db_service.get_attendance_report(
            start_date, end_date, session_id, student_id
        )
        
        # Get daily stats for chart
        daily_stats = db_service.get_daily_attendance_stats(
            start_date, end_date, session_id, student_id
        )
        
        return jsonify({
            'success': True,
            'attendance': attendance_data,
            'stats': stats,
            'daily_stats': daily_stats
        })
    except Exception as e:
        app.logger.error(f"Error generating report: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating report: {str(e)}"
        }), 500

@app.route('/api/reports/export', methods=['GET'])
def export_reports():
    """Export attendance reports as CSV"""
    try:
        # Get filter parameters (same as reports endpoint)
        date_range = request.args.get('date_range')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        session_id = request.args.get('session_id')
        student_id = request.args.get('student_id')
        
        # Process date range
        if date_range:
            today = datetime.now().date()
            
            if date_range == 'today':
                start_date = today.isoformat()
                end_date = today.isoformat()
            elif date_range == 'yesterday':
                yesterday = today - timedelta(days=1)
                start_date = yesterday.isoformat()
                end_date = yesterday.isoformat()
            elif date_range == 'this_week':
                start_date = (today - timedelta(days=today.weekday())).isoformat()
                end_date = today.isoformat()
            elif date_range == 'last_week':
                last_week_start = today - timedelta(days=today.weekday() + 7)
                last_week_end = last_week_start + timedelta(days=6)
                start_date = last_week_start.isoformat()
                end_date = last_week_end.isoformat()
            elif date_range == 'this_month':
                start_date = today.replace(day=1).isoformat()
                end_date = today.isoformat()
        
        # Get attendance data
        attendance_data, _ = db_service.get_attendance_report(
            start_date, end_date, session_id, student_id
        )
        
        # Generate CSV content
        csv_content = "Date,Session,Student ID,Student Name,Time,Status\n"
        
        for record in attendance_data:
            date = record['date']
            session_name = record['session_name']
            student_id = record['student_id']
            student_name = record['student_name']
            timestamp = datetime.fromisoformat(record['timestamp']).strftime('%H:%M:%S')
            status = record['status']
            
            csv_content += f"{date},{session_name},{student_id},{student_name},{timestamp},{status}\n"
        
        return jsonify({
            'success': True,
            'csv_content': csv_content
        })
    except Exception as e:
        app.logger.error(f"Error exporting report: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error exporting report: {str(e)}"
        }), 500

# --------------------------------
# Settings API Endpoints
# --------------------------------

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get system settings"""
    try:
        settings = db_service.get_settings()
        
        # Use default settings if none exist
        if not settings:
            settings = DEFAULT_SETTINGS
            db_service.save_settings(settings)
        
        return jsonify({
            'success': True,
            'settings': settings
        })
    except Exception as e:
        app.logger.error(f"Error getting settings: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting settings: {str(e)}"
        }), 500

@app.route('/api/settings', methods=['POST'])
def save_settings():
    """Save system settings"""
    try:
        data = request.json
        
        # Validate settings
        required_keys = [
            'face_recognition_threshold', 
            'voice_recognition_threshold', 
            'require_both_auth'
        ]
        
        for key in required_keys:
            if key not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required setting: {key}'
                }), 400
        
        # Save settings to database
        db_service.save_settings(data)
        
        # Update threshold in recognition services
        face_service.update_threshold(data['face_recognition_threshold'])
        voice_service.update_threshold(data['voice_recognition_threshold'])
        
        return jsonify({
            'success': True,
            'message': 'Settings saved successfully'
        })
    except Exception as e:
        app.logger.error(f"Error saving settings: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving settings: {str(e)}"
        }), 500

# --------------------------------
# Diagnostics API Endpoints
# --------------------------------

@app.route('/api/diagnostics/test-recognition', methods=['GET'])
def test_recognition():
    """Test recognition services"""
    try:
        result = {
            'face_recognition': False,
            'voice_recognition': False,
            'database': False,
            'message': ''
        }
        
        # Test database
        try:
            db_service.test_connection()
            result['database'] = True
        except Exception as e:
            result['message'] += f"Database error: {str(e)}. "
        
        # Test face recognition
        try:
            face_service.test_service()
            result['face_recognition'] = True
        except Exception as e:
            result['message'] += f"Face recognition error: {str(e)}. "
        
        # Test voice recognition
        try:
            voice_service.test_service()
            result['voice_recognition'] = True
        except Exception as e:
            result['message'] += f"Voice recognition error: {str(e)}. "
        
        # Set overall success
        result['success'] = all([
            result['face_recognition'],
            result['voice_recognition'],
            result['database']
        ])
        
        if result['success']:
            result['message'] = "All services are functioning correctly."
        
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error testing recognition services: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error testing recognition services: {str(e)}"
        }), 500

# Run the Flask app
if __name__ == '__main__':
    # Create database tables if they don't exist
    db_service.init_db()
    
    # Run the app
    app.run(host='0.0.0.0', port=8001, debug=True)
