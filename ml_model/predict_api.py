from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
import os

app = Flask(__name__)
CORS(app)

MODEL_PATH = "disaster_model_v2.h5"
model = tf.keras.models.load_model(MODEL_PATH)
CLASS_NAMES = ['cardboard', 'fire', 'glass', 'metal', 'paper', 'plastic', 'pothole', 'trash']

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']
    file.save('temp.jpg')

    img = image.load_img('temp.jpg', target_size=(224, 224))
    img_array = np.expand_dims(image.img_to_array(img)/255.0, axis=0)
    preds = model.predict(img_array)
    predicted_class = CLASS_NAMES[np.argmax(preds[0])]
    confidence = float(np.max(preds[0]))
    os.remove('temp.jpg')

    return jsonify({'class': predicted_class, 'confidence': confidence})

if __name__ == '__main__':
    app.run(port=5001, debug=True)