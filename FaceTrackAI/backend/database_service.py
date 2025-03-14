import os
import json
import sqlite3
import time
from datetime import datetime, date

class DatabaseService:
    def __init__(self, db_file):
        """Initialize the database service with the database file path"""
        self.db_file = db_file
        
        # Create the data directory if it doesn't exist
        os.makedirs(os.path.dirname(os.path.abspath(db_file)), exist_ok=True)

    def get_connection(self):
        """Get a connection to the SQLite database"""
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        return conn

    def init_db(self):
        """Initialize the database schema"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Create Students table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY,
            student_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            email TEXT,
            course TEXT,
            registration_date TEXT,
            status TEXT DEFAULT 'active'
        )
        ''')
        
        # Create Face Encodings table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS face_encodings (
            id INTEGER PRIMARY KEY,
            student_id INTEGER NOT NULL,
            encoding_data TEXT NOT NULL,
            created_at TEXT,
            FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
        )
        ''')
        
        # Create Voice Embeddings table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS voice_embeddings (
            id INTEGER PRIMARY KEY,
            student_id INTEGER NOT NULL,
            embedding_data TEXT NOT NULL,
            created_at TEXT,
            FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
        )
        ''')
        
        # Create Sessions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            date TEXT,
            start_time TEXT,
            end_time TEXT
        )
        ''')
        
        # Create Attendance table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY,
            student_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            timestamp TEXT,
            status TEXT,
            FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        )
        ''')
        
        # Create Settings table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY,
            settings_data TEXT NOT NULL,
            updated_at TEXT
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def test_connection(self):
        """Test the database connection"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            conn.close()
            return result[0] == 1
        except Exception as e:
            raise Exception(f"Database connection test failed: {e}")
    
    #-----------------------------------------
    # Student Methods
    #-----------------------------------------
    
    def add_student(self, student_data):
        """Add a new student to the database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Insert student
        cursor.execute('''
        INSERT INTO students (student_id, name, email, course, registration_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            student_data['student_id'],
            student_data['name'],
            student_data['email'],
            student_data['course'],
            student_data['registration_date'],
            student_data['status']
        ))
        
        # Get the inserted student ID
        student_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        return student_id
    
    def get_students(self, page=1, per_page=10, query=''):
        """Get students with pagination and search"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        offset = (page - 1) * per_page
        
        # Add search condition if query is provided
        if query:
            search = f"%{query}%"
            cursor.execute('''
            SELECT * FROM students 
            WHERE student_id LIKE ? OR name LIKE ? OR email LIKE ? OR course LIKE ?
            ORDER BY id DESC LIMIT ? OFFSET ?
            ''', (search, search, search, search, per_page, offset))
            
            students = [dict(row) for row in cursor.fetchall()]
            
            # Get total matching records
            cursor.execute('''
            SELECT COUNT(*) FROM students 
            WHERE student_id LIKE ? OR name LIKE ? OR email LIKE ? OR course LIKE ?
            ''', (search, search, search, search))
        else:
            cursor.execute('SELECT * FROM students ORDER BY id DESC LIMIT ? OFFSET ?', 
                          (per_page, offset))
            
            students = [dict(row) for row in cursor.fetchall()]
            
            # Get total records
            cursor.execute('SELECT COUNT(*) FROM students')
        
        # Get the count result
        count_result = cursor.fetchone()
        total = count_result[0] if count_result else 0
        
        conn.close()
        
        return students, total
    
    def get_student_by_id(self, student_id):
        """Get a student by internal ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM students WHERE id = ?', (student_id,))
        student = cursor.fetchone()
        
        conn.close()
        
        return dict(student) if student else None
    
    def get_student_by_student_id(self, student_id):
        """Get a student by student ID (external ID)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM students WHERE student_id = ?', (student_id,))
        student = cursor.fetchone()
        
        conn.close()
        
        return dict(student) if student else None
    
    def update_student(self, student_id, student_data):
        """Update a student's information"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Build update query
        update_fields = []
        params = []
        
        if 'name' in student_data:
            update_fields.append('name = ?')
            params.append(student_data['name'])
        
        if 'email' in student_data:
            update_fields.append('email = ?')
            params.append(student_data['email'])
        
        if 'course' in student_data:
            update_fields.append('course = ?')
            params.append(student_data['course'])
        
        if 'status' in student_data:
            update_fields.append('status = ?')
            params.append(student_data['status'])
        
        # Add student ID to params
        params.append(student_id)
        
        # Execute update if there are fields to update
        if update_fields:
            query = f"UPDATE students SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, params)
            
            conn.commit()
        
        conn.close()
        
        return True
    
    def delete_student(self, student_id):
        """Delete a student from the database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM students WHERE id = ?', (student_id,))
        
        conn.commit()
        conn.close()
        
        return True
    
    #-----------------------------------------
    # Face Encoding Methods
    #-----------------------------------------
    
    def save_face_encoding(self, student_id, encoding_data):
        """Save a face encoding for a student"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if encoding already exists
        cursor.execute('SELECT id FROM face_encodings WHERE student_id = ?', (student_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing encoding
            cursor.execute('''
            UPDATE face_encodings 
            SET encoding_data = ?, created_at = ?
            WHERE student_id = ?
            ''', (encoding_data, datetime.now().isoformat(), student_id))
        else:
            # Insert new encoding
            cursor.execute('''
            INSERT INTO face_encodings (student_id, encoding_data, created_at)
            VALUES (?, ?, ?)
            ''', (student_id, encoding_data, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return True
    
    def get_face_encodings(self):
        """Get all face encodings"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT student_id, encoding_data FROM face_encodings')
        encodings = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return encodings
    
    def delete_face_encoding(self, student_id):
        """Delete a face encoding for a student"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM face_encodings WHERE student_id = ?', (student_id,))
        
        conn.commit()
        conn.close()
        
        return True
    
    #-----------------------------------------
    # Voice Embedding Methods
    #-----------------------------------------
    
    def save_voice_embedding(self, student_id, embedding_data):
        """Save a voice embedding for a student"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if embedding already exists
        cursor.execute('SELECT id FROM voice_embeddings WHERE student_id = ?', (student_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing embedding
            cursor.execute('''
            UPDATE voice_embeddings 
            SET embedding_data = ?, created_at = ?
            WHERE student_id = ?
            ''', (embedding_data, datetime.now().isoformat(), student_id))
        else:
            # Insert new embedding
            cursor.execute('''
            INSERT INTO voice_embeddings (student_id, embedding_data, created_at)
            VALUES (?, ?, ?)
            ''', (student_id, embedding_data, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return True
    
    def get_voice_embeddings(self):
        """Get all voice embeddings"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT student_id, embedding_data FROM voice_embeddings')
        embeddings = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return embeddings
    
    def delete_voice_embedding(self, student_id):
        """Delete a voice embedding for a student"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM voice_embeddings WHERE student_id = ?', (student_id,))
        
        conn.commit()
        conn.close()
        
        return True
    
    #-----------------------------------------
    # Session Methods
    #-----------------------------------------
    
    def add_session(self, session_data):
        """Add a new session to the database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Insert session
        cursor.execute('''
        INSERT INTO sessions (name, date, start_time, end_time)
        VALUES (?, ?, ?, ?)
        ''', (
            session_data['name'],
            session_data['date'],
            session_data.get('start_time'),
            session_data.get('end_time')
        ))
        
        # Get the inserted session ID
        session_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        return session_id
    
    def get_sessions(self):
        """Get all sessions"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM sessions ORDER BY date DESC, id DESC')
        sessions = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return sessions
    
    def get_session_by_id(self, session_id):
        """Get a session by ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM sessions WHERE id = ?', (session_id,))
        session = cursor.fetchone()
        
        conn.close()
        
        return dict(session) if session else None
    
    def delete_session(self, session_id):
        """Delete a session and its attendance records"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Delete attendance records for this session
        cursor.execute('DELETE FROM attendance WHERE session_id = ?', (session_id,))
        
        # Delete the session
        cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
        
        conn.commit()
        conn.close()
        
        return True
    
    def get_session_attendance_count(self, session_id):
        """Get the attendance count for a session"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM attendance WHERE session_id = ?', (session_id,))
        count = cursor.fetchone()[0]
        
        conn.close()
        
        return count
    
    #-----------------------------------------
    # Attendance Methods
    #-----------------------------------------
    
    def add_attendance(self, attendance_data):
        """Add a new attendance record"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Insert attendance
        cursor.execute('''
        INSERT INTO attendance (student_id, session_id, timestamp, status)
        VALUES (?, ?, ?, ?)
        ''', (
            attendance_data['student_id'],
            attendance_data['session_id'],
            attendance_data['timestamp'],
            attendance_data['status']
        ))
        
        # Get the inserted attendance ID
        attendance_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        return attendance_id
    
    def get_attendance_by_session(self, session_id):
        """Get attendance records for a session"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT a.*, s.name as student_name, s.student_id as student_id 
        FROM attendance a 
        JOIN students s ON a.student_id = s.id 
        WHERE a.session_id = ? 
        ORDER BY a.timestamp DESC
        ''', (session_id,))
        
        attendance = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return attendance
    
    def get_attendance_by_student_session(self, student_id, session_id):
        """Check if a student has already been marked for a session"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT * FROM attendance 
        WHERE student_id = ? AND session_id = ?
        ''', (student_id, session_id))
        
        attendance = cursor.fetchone()
        
        conn.close()
        
        return dict(attendance) if attendance else None
    
    def get_attendance_report(self, start_date=None, end_date=None, session_id=None, student_id=None):
        """Get attendance data for reports with filters"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = '''
        SELECT 
            a.id, a.timestamp, a.status,
            s.id as student_id, s.name as student_name, s.student_id as student_id_external,
            ses.id as session_id, ses.name as session_name, ses.date
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN sessions ses ON a.session_id = ses.id
        WHERE 1=1
        '''
        
        params = []
        
        # Add date filters
        if start_date:
            query += " AND ses.date >= ?"
            params.append(start_date)
        
        if end_date:
            query += " AND ses.date <= ?"
            params.append(end_date)
        
        # Add session filter
        if session_id:
            query += " AND a.session_id = ?"
            params.append(session_id)
        
        # Add student filter
        if student_id:
            query += " AND a.student_id = ?"
            params.append(student_id)
        
        # Add ordering
        query += " ORDER BY ses.date DESC, ses.name, a.timestamp"
        
        cursor.execute(query, params)
        attendance_data = []
        
        for row in cursor.fetchall():
            attendance_data.append({
                'id': row['id'],
                'timestamp': row['timestamp'],
                'status': row['status'],
                'student_id': row['student_id_external'],
                'student_name': row['student_name'],
                'session_id': row['session_id'],
                'session_name': row['session_name'],
                'date': row['date']
            })
        
        # Calculate statistics
        stats_query = '''
        SELECT 
            COUNT(DISTINCT a.session_id) as total_sessions,
            COUNT(DISTINCT a.student_id) as total_students,
            COUNT(*) as total_records
        FROM attendance a
        JOIN sessions ses ON a.session_id = ses.id
        WHERE 1=1
        '''
        
        # Add the same filters
        if start_date:
            stats_query += " AND ses.date >= ?"
        
        if end_date:
            stats_query += " AND ses.date <= ?"
        
        if session_id:
            stats_query += " AND a.session_id = ?"
        
        if student_id:
            stats_query += " AND a.student_id = ?"
        
        cursor.execute(stats_query, params)
        stats_row = cursor.fetchone()
        
        # Calculate attendance rate if we have sessions and students
        attendance_rate = 0
        if stats_row['total_sessions'] > 0 and stats_row['total_students'] > 0:
            # Get total possible attendance (students * sessions)
            cursor.execute('''
            SELECT 
                COUNT(DISTINCT s.id) as total_students,
                COUNT(DISTINCT ses.id) as total_sessions
            FROM students s
            CROSS JOIN sessions ses
            WHERE s.status = 'active'
            ''')
            
            totals = cursor.fetchone()
            possible_attendance = totals['total_students'] * stats_row['total_sessions']
            
            if possible_attendance > 0:
                attendance_rate = round((stats_row['total_records'] / possible_attendance) * 100)
        
        stats = {
            'total_sessions': stats_row['total_sessions'],
            'total_students': stats_row['total_students'],
            'total_records': stats_row['total_records'],
            'attendance_rate': attendance_rate
        }
        
        conn.close()
        
        return attendance_data, stats
    
    def get_daily_attendance_stats(self, start_date=None, end_date=None, session_id=None, student_id=None):
        """Get daily attendance stats for charts"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = '''
        SELECT 
            ses.date, 
            COUNT(*) as count
        FROM attendance a
        JOIN sessions ses ON a.session_id = ses.id
        WHERE 1=1
        '''
        
        params = []
        
        # Add date filters
        if start_date:
            query += " AND ses.date >= ?"
            params.append(start_date)
        
        if end_date:
            query += " AND ses.date <= ?"
            params.append(end_date)
        
        # Add session filter
        if session_id:
            query += " AND a.session_id = ?"
            params.append(session_id)
        
        # Add student filter
        if student_id:
            query += " AND a.student_id = ?"
            params.append(student_id)
        
        # Group by date
        query += " GROUP BY ses.date ORDER BY ses.date"
        
        cursor.execute(query, params)
        daily_stats = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return daily_stats
    
    #-----------------------------------------
    # Settings Methods
    #-----------------------------------------
    
    def save_settings(self, settings_data):
        """Save system settings"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if settings already exist
        cursor.execute('SELECT id FROM settings WHERE id = 1')
        existing = cursor.fetchone()
        
        settings_json = json.dumps(settings_data)
        
        if existing:
            # Update existing settings
            cursor.execute('''
            UPDATE settings 
            SET settings_data = ?, updated_at = ?
            WHERE id = 1
            ''', (settings_json, datetime.now().isoformat()))
        else:
            # Insert new settings
            cursor.execute('''
            INSERT INTO settings (id, settings_data, updated_at)
            VALUES (1, ?, ?)
            ''', (settings_json, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return True
    
    def get_settings(self):
        """Get system settings"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT settings_data FROM settings WHERE id = 1')
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return json.loads(row['settings_data'])
        else:
            return None
