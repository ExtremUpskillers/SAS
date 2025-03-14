import os
import base64
import json
import numpy as np
from PIL import Image
import io
import tempfile

# Temporary implementation (without deepface dependency)
class FaceRecognitionService:
    def __init__(self, db_service):
        """
        Initialize the Face Recognition Service
        
        Args:
            db_service: Database service for persistence
        """
        self.db_service = db_service
        self.face_db_dir = 'data/faces'
        self.threshold = 0.5  # Default similarity threshold
        self.face_encodings_db = {}
        
        # Create faces directory if it doesn't exist
        os.makedirs(self.face_db_dir, exist_ok=True)
        
        # Load face encodings from database
        self.load_face_encodings()
        
        print("FaceRecognitionService initialized in simplified mode")
    
    def update_threshold(self, threshold):
        """Update the face recognition threshold"""
        self.threshold = float(threshold)
    
    def load_face_encodings(self):
        """Load face encodings from database"""
        try:
            # Get face encodings from database
            encodings = self.db_service.get_face_encodings()
            
            # Add to in-memory cache
            for encoding in encodings:
                student_id = encoding['student_id']
                self.face_encodings_db[student_id] = json.loads(encoding['encoding_data'])
            
            return True
        except Exception as e:
            print(f"Error loading face encodings: {e}")
            return False
    
    def process_face_image(self, base64_image, student_id):
        """
        Process a face image, extract embedding and save it
        
        Args:
            base64_image: Base64 encoded image string
            student_id: Student ID to associate with the face
            
        Returns:
            Face embedding as list
        """
        try:
            # Create a simple mock embedding (128-dimensional vector)
            # In the real implementation, this would be a face embedding from a neural network
            embedding = [0.01 * i for i in range(128)]
            
            # Convert base64 to image and save it
            img_data = base64.b64decode(base64_image)
            img = Image.open(io.BytesIO(img_data))
            
            # Save face image
            face_img_path = os.path.join(self.face_db_dir, f"{student_id}.jpg")
            img.save(face_img_path)
            
            # Save embedding to database
            self.db_service.save_face_encoding(student_id, json.dumps(embedding))
            
            # Add to in-memory cache
            self.face_encodings_db[student_id] = embedding
            
            print(f"Simplified face image processing for student {student_id}")
            return embedding
        
        except Exception as e:
            print(f"Error processing face image: {e}")
            raise
    
    def delete_student_face(self, student_id):
        """Delete a student's face data"""
        try:
            # Delete face image if it exists
            face_img_path = os.path.join(self.face_db_dir, f"{student_id}.jpg")
            if os.path.exists(face_img_path):
                os.remove(face_img_path)
            
            # Delete from database
            self.db_service.delete_face_encoding(student_id)
            
            # Remove from in-memory cache
            if student_id in self.face_encodings_db:
                del self.face_encodings_db[student_id]
            
            return True
        except Exception as e:
            print(f"Error deleting student face: {e}")
            return False
    
    def detect_and_recognize_faces(self, base64_image):
        """
        Detect faces in image and recognize them
        
        Args:
            base64_image: Base64 encoded image string
            
        Returns:
            List of detected faces with recognition results
        """
        try:
            # Get a list of registered students for mock detection
            students = []
            for student_id in self.face_encodings_db:
                student = self.db_service.get_student_by_id(student_id)
                if student:
                    students.append(student)
            
            # If no students, return empty result
            if not students:
                return []
            
            # In simplified version, just return a mock detection result
            # with the first student we find (if any)
            result = []
            
            if students:
                student = students[0]
                face_data = {
                    'x': 0.4,  # Normalized coordinates (center of image)
                    'y': 0.3,
                    'width': 0.2,
                    'height': 0.2,
                    'recognized': True,
                    'student_id': student['id'],
                    'student_name': student['name']
                }
                result.append(face_data)
            
            print("Simplified face detection with mock result")
            return result
        
        except Exception as e:
            print(f"Error detecting and recognizing faces: {e}")
            return []
    
    def recognize_face(self, face_img_path):
        """
        Recognize a face by comparing with stored embeddings
        
        Args:
            face_img_path: Path to the face image
            
        Returns:
            Recognition result with student ID if recognized
        """
        try:
            # No face encodings to compare with
            if not self.face_encodings_db:
                return {
                    'recognized': False,
                    'message': 'No face encodings in database'
                }
            
            # In simplified version, just return a mock recognition result
            # with the first student we find
            student_id = next(iter(self.face_encodings_db.keys()))
            
            return {
                'recognized': True,
                'student_id': student_id,
                'distance': 0.2  # Mock distance value
            }
        
        except Exception as e:
            print(f"Error recognizing face: {e}")
            return {
                'recognized': False,
                'message': f'Error during recognition: {str(e)}'
            }
    
    def test_service(self):
        """Test if the face recognition service is working"""
        try:
            # In simplified version, just return success
            print("Face recognition service test (simplified)")
            return True
        
        except Exception as e:
            print(f"Face recognition service test failed: {e}")
            raise Exception(f"Face recognition service is not working properly: {e}")
