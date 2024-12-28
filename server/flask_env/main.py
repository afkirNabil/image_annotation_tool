from flask import Flask, request, jsonify
from flask_cors import CORS
import os, json
from werkzeug.utils import secure_filename
from PIL import Image

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ANNOTATIONS_FOLDER = 'annotations'
CLASSES_FILE = 'classes.json'  # archivo donde guardamos las clases de los bounding boxes
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ANNOTATIONS_FOLDER, exist_ok=True)

#ruta y funcion para guardar la imagen subida en el directorio uploads
@app.route('/upload', methods=['POST'])
def upload_image():
    file = request.files['image']
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    return jsonify({"success": True, "filename": filename})

#ruta y funcion para guardar las anotaciones de la imagen subida en el directorio annotations
@app.route('/annotations', methods=['POST'])
def save_annotations():
    data = request.get_json()
    filename = data['filename']
    boxes = data['boxes']
    image_width = data['imageWidth']
    image_height = data['imageHeight']
    txt_filename = os.path.splitext(filename)[0] + ".txt"
    txt_path = os.path.join(ANNOTATIONS_FOLDER, txt_filename)
    with open(txt_path, 'w') as f:
        for box in boxes:
            x = box['x']
            y = box['y']
            w = box['width']
            h = box['height']
            class_id = box.get('classId', 0)

            x_center = (x + w/2) / image_width
            y_center = (y + h/2) / image_height
            w_norm = w / image_width
            h_norm = h / image_height

            line = f"{class_id} {x_center} {y_center} {w_norm} {h_norm}\n"
            f.write(line)

    return jsonify({"success": True, "message": "Annotations saved."})

# Manejo de clases de los bounding boxes, para hacerlas persistentes en el servidor
# Funciones auxiliares para cargar y guardar las clases
def load_classes():
    """ Carga la lista de clases desde classes.json. Si no existe o está vacío, devuelve lista vacía. """
    if not os.path.exists(CLASSES_FILE):
        return []
    with open(CLASSES_FILE, 'r') as f:
        try:
            data = json.load(f)
            if isinstance(data, list):
                return data
            else:
                return []
        except:
            return []

def save_classes(classes_list):
    """ Guarda la lista de clases en classes.json (sobrescribe). """
    with open(CLASSES_FILE, 'w') as f:
        json.dump(classes_list, f, indent=2)

# Rutas para manejar las clases de los bounding boxes
@app.route('/classes', methods=['GET'])
def get_classes():
    """ Devuelve la lista de clases en formato JSON. """
    classes_list = load_classes()
    return jsonify(classes_list)

@app.route('/classes', methods=['POST'])
def add_class():
    """ Añade una nueva clase a la lista (si no existe ya) y la guarda. """
    data = request.get_json()
    new_class = data.get('className', '').strip()

    if not new_class:
        return jsonify({"success": False, "message": "Class name is empty"}), 400
    
    classes_list = load_classes()
    if new_class in classes_list:
        return jsonify({"success": False, "message": "Class already exists"}), 400
    
    classes_list.append(new_class)
    save_classes(classes_list)
    return jsonify({"success": True, "classes": classes_list}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
