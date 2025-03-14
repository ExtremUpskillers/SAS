import os
import json
from datetime import datetime
from supabase import create_client, Client

# Default settings for the application
DEFAULT_SETTINGS = {
    'face_recognition_threshold': 0.5,
    'voice_recognition_threshold': 0.5,
    'require_both_auth': True,
    'camera_id': '',
    'microphone_id': ''
}

class SupabaseService:
    def __init__(self):
        """Initialize the Supabase service with the Supabase URL and API key"""
        # Get Supabase credentials from environment variables
        self.supabase_url = os.environ.get('SUPABASE_URL')
        self.supabase_key = os.environ.get('SUPABASE_KEY')
        self.supabase = None
        
        if not self.supabase_url or not self.supabase_key:
            print("Warning: Supabase credentials not found in environment variables")
            print("Using local SQLite database instead")
            self.connected = False
        else:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                self.connected = True
                print("Connected to Supabase successfully")
            except Exception as e:
                print(f"Error connecting to Supabase: {e}")
                self.connected = False
        
        # Create tables in Supabase if they don't exist
        if self.connected:
            self.init_db()
    
    def init_db(self):
        """Initialize the database schema in Supabase"""
        try:
            if not self.connected:
                print("Not connected to Supabase, skipping schema initialization")
                return

            # Note: In Supabase, tables should be created through the dashboard or migrations
            # Here we'll verify if tables exist by attempting to access them
            
            try:
                # Check students table
                self.supabase.table('students').select('count', count='exact').execute()
            except Exception as e:
                print(f"Students table not found: {e}")
            
            try:
                # Check face_encodings table
                self.supabase.table('face_encodings').select('count', count='exact').execute()
            except Exception as e:
                print(f"Face encodings table not found: {e}")
            
            try:
                # Check voice_embeddings table
                self.supabase.table('voice_embeddings').select('count', count='exact').execute()
            except Exception as e:
                print(f"Voice embeddings table not found: {e}")
            
            try:
                # Check sessions table
                self.supabase.table('sessions').select('count', count='exact').execute()
            except Exception as e:
                print(f"Sessions table not found: {e}")
            
            try:
                # Check attendance table
                self.supabase.table('attendance').select('count', count='exact').execute()
            except Exception as e:
                print(f"Attendance table not found: {e}")
            
            try:
                # Check settings table
                self.supabase.table('settings').select('count', count='exact').execute()
            except Exception as e:
                print(f"Settings table not found: {e}")

            print("Supabase schema verification complete")
            return True
        except Exception as e:
            print(f"Error verifying Supabase schema: {e}")
            return False
    
    def test_connection(self):
        """Test the Supabase connection"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # Simple query to test connection
            result = self.supabase.table('settings').select('*').execute()
            print("Supabase connection test successful")
            return True
        except Exception as e:
            print(f"Error testing Supabase connection: {e}")
            raise
    
    def add_student(self, student_data):
        """Add a new student to the database"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('students').insert(student_data).execute()
            return result.data[0]['id'] if result.data else None
        except Exception as e:
            print(f"Error adding student: {e}")
            raise
    
    def get_students(self, page=1, per_page=10, query=''):
        """Get students with pagination and search"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # Calculate offset
            offset = (page - 1) * per_page
            
            # Build query
            query_builder = self.supabase.table('students').select('*')
            
            # Add search if provided
            if query:
                query_builder = query_builder.or_(f"name.ilike.%{query}%,student_id.ilike.%{query}%,email.ilike.%{query}%")
            
            # Add pagination
            result = query_builder.range(offset, offset + per_page - 1).execute()
            
            # Get total count for pagination
            count_result = self.supabase.table('students').select('count', count='exact').execute()
            total = count_result.count if hasattr(count_result, 'count') else 0
            
            return {
                'students': result.data,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            }
        except Exception as e:
            print(f"Error getting students: {e}")
            raise
    
    def get_student_by_id(self, student_id):
        """Get a student by internal ID"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('students').select('*').eq('id', student_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error getting student by ID: {e}")
            raise
    
    def get_student_by_student_id(self, student_id):
        """Get a student by student ID (external ID)"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('students').select('*').eq('student_id', student_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error getting student by student ID: {e}")
            raise
    
    def update_student(self, student_id, student_data):
        """Update a student's information"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('students').update(student_data).eq('id', student_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error updating student: {e}")
            raise
    
    def delete_student(self, student_id):
        """Delete a student from the database"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # Delete associated face and voice data
            self.delete_face_encoding(student_id)
            self.delete_voice_embedding(student_id)
            
            # Delete student
            result = self.supabase.table('students').delete().eq('id', student_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting student: {e}")
            raise
    
    def save_face_encoding(self, student_id, encoding_data):
        """Save a face encoding for a student"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # Check if encoding exists
            check = self.supabase.table('face_encodings').select('id').eq('student_id', student_id).execute()
            
            if check.data:
                # Update existing
                result = self.supabase.table('face_encodings').update({
                    'encoding_data': encoding_data
                }).eq('student_id', student_id).execute()
            else:
                # Insert new
                result = self.supabase.table('face_encodings').insert({
                    'student_id': student_id,
                    'encoding_data': encoding_data
                }).execute()
                
            return True
        except Exception as e:
            print(f"Error saving face encoding: {e}")
            raise
    
    def get_face_encodings(self):
        """Get all face encodings"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('face_encodings').select('*').execute()
            return result.data
        except Exception as e:
            print(f"Error getting face encodings: {e}")
            raise
    
    def delete_face_encoding(self, student_id):
        """Delete a face encoding for a student"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('face_encodings').delete().eq('student_id', student_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting face encoding: {e}")
            raise
    
    def save_voice_embedding(self, student_id, embedding_data):
        """Save a voice embedding for a student"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # Check if embedding exists
            check = self.supabase.table('voice_embeddings').select('id').eq('student_id', student_id).execute()
            
            if check.data:
                # Update existing
                result = self.supabase.table('voice_embeddings').update({
                    'embedding_data': embedding_data
                }).eq('student_id', student_id).execute()
            else:
                # Insert new
                result = self.supabase.table('voice_embeddings').insert({
                    'student_id': student_id,
                    'embedding_data': embedding_data
                }).execute()
                
            return True
        except Exception as e:
            print(f"Error saving voice embedding: {e}")
            raise
    
    def get_voice_embeddings(self):
        """Get all voice embeddings"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('voice_embeddings').select('*').execute()
            return result.data
        except Exception as e:
            print(f"Error getting voice embeddings: {e}")
            raise
    
    def delete_voice_embedding(self, student_id):
        """Delete a voice embedding for a student"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('voice_embeddings').delete().eq('student_id', student_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting voice embedding: {e}")
            raise
    
    def add_session(self, session_data):
        """Add a new session to the database"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('sessions').insert(session_data).execute()
            return result.data[0]['id'] if result.data else None
        except Exception as e:
            print(f"Error adding session: {e}")
            raise
    
    def get_sessions(self):
        """Get all sessions"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('sessions').select('*').order('created_at', desc=True).execute()
            return result.data
        except Exception as e:
            print(f"Error getting sessions: {e}")
            raise
    
    def get_session_by_id(self, session_id):
        """Get a session by ID"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('sessions').select('*').eq('id', session_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error getting session by ID: {e}")
            raise
    
    def delete_session(self, session_id):
        """Delete a session and its attendance records"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # Delete attendance records for this session
            self.supabase.table('attendance').delete().eq('session_id', session_id).execute()
            
            # Delete session
            result = self.supabase.table('sessions').delete().eq('id', session_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            raise
    
    def get_session_attendance_count(self, session_id):
        """Get the attendance count for a session"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('attendance').select('count', count='exact').eq('session_id', session_id).execute()
            return result.count if hasattr(result, 'count') else 0
        except Exception as e:
            print(f"Error getting session attendance count: {e}")
            raise
    
    def add_attendance(self, attendance_data):
        """Add a new attendance record"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('attendance').insert(attendance_data).execute()
            return result.data[0]['id'] if result.data else None
        except Exception as e:
            print(f"Error adding attendance record: {e}")
            raise
    
    def get_attendance_by_session(self, session_id):
        """Get attendance records for a session"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # SQL query to join students and attendance
            query = """
            SELECT a.*, s.name, s.student_id, s.email
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.session_id = ?
            ORDER BY a.time_in DESC
            """
            
            # Note: In a real implementation, we'd use Supabase's query capabilities
            # This is a placeholder for the SQL join we'd want to do
            
            # For now, we'll do two queries and join them in Python
            attendance = self.supabase.table('attendance').select('*').eq('session_id', session_id).order('time_in', desc=True).execute()
            
            # Get student details for each attendance record
            result = []
            for record in attendance.data:
                student = self.get_student_by_id(record['student_id'])
                if student:
                    record['name'] = student['name']
                    record['student_id'] = student['student_id']
                    record['email'] = student['email']
                    result.append(record)
            
            return result
        except Exception as e:
            print(f"Error getting attendance by session: {e}")
            raise
    
    def get_attendance_by_student_session(self, student_id, session_id):
        """Check if a student has already been marked for a session"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('attendance').select('*').eq('student_id', student_id).eq('session_id', session_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error checking attendance: {e}")
            raise
    
    def get_attendance_report(self, start_date=None, end_date=None, session_id=None, student_id=None):
        """Get attendance data for reports with filters"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # Start building the query
            query = self.supabase.table('attendance').select('*')
            
            # Apply filters
            if start_date:
                query = query.gte('time_in', start_date)
            if end_date:
                query = query.lte('time_in', end_date)
            if session_id:
                query = query.eq('session_id', session_id)
            if student_id:
                query = query.eq('student_id', student_id)
            
            # Execute query
            result = query.order('time_in', desc=True).execute()
            
            # Get student and session details for each attendance record
            attendance_with_details = []
            for record in result.data:
                # Get student details
                student = self.get_student_by_id(record['student_id'])
                session = self.get_session_by_id(record['session_id'])
                
                if student and session:
                    attendance_with_details.append({
                        **record,
                        'student_name': student['name'],
                        'student_external_id': student['student_id'],
                        'session_name': session['name']
                    })
            
            return attendance_with_details
        except Exception as e:
            print(f"Error generating attendance report: {e}")
            raise
    
    def get_daily_attendance_stats(self, start_date=None, end_date=None, session_id=None, student_id=None):
        """Get daily attendance stats for charts"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # This would be a SQL query in a real implementation
            # For now, we'll get all attendance and aggregate in Python
            attendance = self.get_attendance_report(start_date, end_date, session_id, student_id)
            
            # Aggregate by date
            daily_stats = {}
            for record in attendance:
                # Extract date from timestamp
                date = record['time_in'].split('T')[0]
                
                if date not in daily_stats:
                    daily_stats[date] = 0
                
                daily_stats[date] += 1
            
            # Convert to list of objects
            stats_list = [{'date': date, 'count': count} for date, count in daily_stats.items()]
            
            # Sort by date
            stats_list.sort(key=lambda x: x['date'])
            
            return stats_list
        except Exception as e:
            print(f"Error generating daily attendance stats: {e}")
            raise
    
    def save_settings(self, settings_data):
        """Save system settings
        
        Args:
            settings_data: Dictionary with key and value for the setting
        """
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            # Get the setting key and value
            key = settings_data.get('key')
            value = settings_data.get('value')
            
            if not key:
                raise ValueError("Setting key is required")
                
            # Check if setting with this key exists
            check = self.supabase.table('settings').select('id').eq('key', key).execute()
            
            if check.data:
                # Update existing setting
                result = self.supabase.table('settings').update({
                    'value': value,
                    'updated_at': datetime.now().isoformat()
                }).eq('key', key).execute()
            else:
                # Insert new setting
                result = self.supabase.table('settings').insert({
                    'key': key,
                    'value': value,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }).execute()
                
            return True
        except Exception as e:
            print(f"Error saving settings: {e}")
            raise
    
    def get_settings(self):
        """Get system settings as a dictionary"""
        if not self.connected:
            raise Exception("Not connected to Supabase")
            
        try:
            result = self.supabase.table('settings').select('*').execute()
            
            if not result.data:
                # Return default settings if none exist
                return DEFAULT_SETTINGS
                
            # Convert list of settings to dictionary
            settings = {}
            for item in result.data:
                settings[item['key']] = item['value']
                
            # Fill in missing settings with defaults
            for key, value in DEFAULT_SETTINGS.items():
                if key not in settings:
                    settings[key] = value
                    
            return settings
        except Exception as e:
            print(f"Error getting settings: {e}")
            # Return default settings on error
            return DEFAULT_SETTINGS