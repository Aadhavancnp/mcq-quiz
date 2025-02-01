from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import cv2
import numpy as np
import base64
import jwt
import datetime
from functools import wraps
import google.generativeai as genai
import bcrypt

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
genai.configure(api_key="")
model = genai.GenerativeModel(model_name="gemini-1.5-flash",
                              system_instruction="You are a quiz bot.Output only valid JSON in this exact format: [{'question':string,'options':string[],'answer':number,'category':string}]")

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['mcq_quiz']

app.config['SECRET_KEY'] = 'secretkey'

# OpenCV face detection setup
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            token = token.split(" ")[1]  # Remove 'Bearer ' prefix
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(*args, **kwargs)

    return decorated


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'message': 'Missing required fields'}), 400

    existing_user = db.users.find_one({'email': data['email']})
    if existing_user:
        return jsonify({'message': 'User already exists'}), 400

    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    new_user = {
        'email': data['email'],
        'password': hashed_password,
        'name': data['name'],
        'role': data.get('role', 'user')
    }
    db.users.insert_one(new_user)
    return jsonify({'message': 'User created successfully'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    auth = request.json
    if not auth or not auth.get('email') or not auth.get('password'):
        return jsonify({'message': 'Could not verify'}), 401

    user = db.users.find_one({'email': auth.get('email')})

    if not user:
        return jsonify({'message': 'User not found'}), 401

    if bcrypt.checkpw(auth.get('password').encode('utf-8'), user['password']):
        token = jwt.encode({
            'id': str(user['_id']),
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        return jsonify({'token': token})

    return jsonify({'message': 'Could not verify'}), 401


@app.route('/api/generate-quiz', methods=['POST'])
@token_required
def generate_quiz():
    prompt = request.json['prompt']
    response = model.generate_content(prompt)
    questions = response.text.replace('```json', '').replace('```', '').strip()
    quiz_code = db.quizzes.insert_one({'questions': questions}).inserted_id
    return jsonify({'quiz_code': str(quiz_code)})


@app.route('/api/quiz/<quiz_id>')
@token_required
def get_quiz(quiz_id):
    quiz = db.quizzes.find_one({'_id': ObjectId(quiz_id)})
    if quiz:
        quiz['_id'] = str(quiz['_id'])
        return jsonify(quiz)
    return jsonify({'message': 'Quiz not found'}), 404


@app.route('/api/submit-quiz', methods=['POST'])
@token_required
def submit_quiz():
    data = request.json
    report = {
        "userId": data['userId'],
        "quizId": data['quizId'],
        "answers": data['answers'],
        "score": data['score'],
        "date": datetime.datetime.now(datetime.UTC)
    }
    result = db.reports.insert_one(report)
    return jsonify({"message": "Quiz submitted successfully", "reportId": str(result.inserted_id)})


@app.route('/api/users', methods=['GET'])
@token_required
def get_users():
    users = list(db.users.find({}, {"password": 0}))
    for user in users:
        user['_id'] = str(user['_id'])
    return jsonify(users)


@app.route('/api/users', methods=['POST'])
@token_required
def add_user():
    data = request.json
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'message': 'Missing required fields'}), 400

    existing_user = db.users.find_one({'email': data['email']})
    if existing_user:
        return jsonify({'message': 'User already exists'}), 400

    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    new_user = {
        'email': data['email'],
        'password': hashed_password,
        'name': data['name'],
        'role': data.get('role', 'user')
    }
    result = db.users.insert_one(new_user)
    return jsonify({'message': 'User created successfully', 'userId': str(result.inserted_id)}), 201


@app.route('/api/users/<user_id>', methods=['DELETE'])
@token_required
def delete_user(user_id):
    result = db.users.delete_one({'_id': ObjectId(user_id)})
    if result.deleted_count == 0:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({'message': 'User deleted successfully'})


@app.route('/api/reports')
@token_required
def get_reports():
    reports = list(db.reports.find({}))
    for report in reports:
        report['_id'] = str(report['_id'])
    return jsonify(reports)


@app.route('/api/quizzes')
@token_required
def get_quizzes():
    quizzes = list(db.quizzes.find({}, {"_id": 1, "questions": 1}))
    return jsonify([{"id": str(quiz["_id"]), "questions": quiz["questions"]} for quiz in quizzes])


@socketio.on('video_frame')
def handle_video_frame(data):
    try:
        # Decode base64 image
        image_data = base64.b64decode(data['frame'])
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Verify frame is not None and has data
        if frame is None or frame.size == 0:
            print("Error: Empty frame received")
            return

        # Perform face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Perform face detection
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100, 100)
        )

        # # Draw rectangles around detected faces (optional)
        # for (x, y, w, h) in faces:
        #     cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

        # Prepare response based on face detection
        if len(faces) == 0:
            alert = {'message': 'Face not detected', 'warning': True}
        elif len(faces) > 1:
            alert = {'message': 'Multiple faces detected', 'warning': True}
        else:
            alert = {'message': 'Face detected', 'warning': False}

        # Emit alert
        socketio.emit('proctoring_alert', alert)

        # Encode processed frame
        # _, buffer = cv2.imencode('.jpg', frame)
        # frame_bytes = base64.b64encode(buffer).decode('utf-8')
        #
        # # Emit processed frame
        # socketio.emit('video_frame', {'frame': frame_bytes})

    except Exception as e:
        print(f"Error processing video frame: {str(e)}")
        socketio.emit('proctoring_alert', {
            'message': 'Error processing video frame',
            'warning': True
        })


if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
