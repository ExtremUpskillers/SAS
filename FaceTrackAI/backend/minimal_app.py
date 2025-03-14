import os
import json
import sqlite3
from datetime import datetime

# Create a minimal API using Python's built-in HTTP server
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse as urlparse

# Initialize database
class DatabaseService:
    def __init__(self, db_file='attendance.db'):
        self.db_file = db_file
        os.makedirs(os.path.dirname(os.path.abspath(db_file)), exist_ok=True)
        self.init_db()
        
    def get_connection(self):
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
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
        
        conn.commit()
        conn.close()
        
    def get_students(self):
        """Get all students"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM students')
        students = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return students
        
    def add_student(self, student_data):
        """Add a new student"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
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
        
        student_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return student_id
        
    def get_sessions(self):
        """Get all sessions"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sessions')
        sessions = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return sessions

# Initialize the database service
db_service = DatabaseService()

# Simple HTTP request handler
class AttendanceAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse.urlparse(self.path)
        
        # Define API endpoints
        if parsed_path.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'status': 'Smart Attendance System Minimal API is running'}
            self.wfile.write(json.dumps(response).encode())
            
        elif parsed_path.path == '/api/students':
            students = db_service.get_students()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'success': True, 'students': students}
            self.wfile.write(json.dumps(response).encode())
            
        elif parsed_path.path == '/api/sessions':
            sessions = db_service.get_sessions()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'success': True, 'sessions': sessions}
            self.wfile.write(json.dumps(response).encode())
            
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'success': False, 'message': 'Endpoint not found'}
            self.wfile.write(json.dumps(response).encode())
            
    def do_POST(self):
        parsed_path = urlparse.urlparse(self.path)
        
        if parsed_path.path == '/api/students/register':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            student_data = json.loads(post_data)
            
            # Add registration timestamp
            student_data['registration_date'] = datetime.now().isoformat()
            student_data['status'] = 'active'
            
            # Register student
            student_id = db_service.add_student(student_data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'success': True, 
                'message': f'Student {student_data["name"]} registered successfully',
                'student_id': student_id
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'success': False, 'message': 'Endpoint not found'}
            self.wfile.write(json.dumps(response).encode())

def run_server(port=5000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, AttendanceAPIHandler)
    print(f'Starting minimal Attendance System API server on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()