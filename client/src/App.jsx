import React, { useState, useEffect } from 'react';
import {
  Box, 
  Button, 
  Container, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem 
} from '@mui/material';
import ImageUploader from './ImageUploader.jsx';
import CanvasStage from './CanvasStage.jsx';
import axios from 'axios';
import JSZip from "jszip";
import { saveAs } from "file-saver";

function App() {
  // Clases iniciales
  const [classes, setClasses] = useState([]);
  // Mapeo clase => color
  const [classColors, setClassColors] = useState({});
  // Nueva clase a añadir
  const [newClassName, setNewClassName] = useState("");
  // Variables de imagenes
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [boundingBoxes, setBoundingBoxes] = useState([]); // {x, y, width, height, classId}
  const [selectedImageName, setSelectedImageName] = useState("");
  const [imageWidth, setImageWidth] = useState(null);
  const [imageHeight, setImageHeight] = useState(null);
  // Estado para el diálogo de asignar clase
  const [openDialog, setOpenDialog] = useState(false);
  const [pendingBox, setPendingBox] = useState(null); // Caja recién dibujada antes de asignar clase
  const [selectedClass, setSelectedClass] = useState("");

  // --- AL MONTAR EL COMPONENTE, CARGAMOS LAS CLASES DESDE EL BACKEND ---
  useEffect(() => {
    fetchClassesFromServer();
  }, []);

  // Generar color sin repetir
  const generateRandomColor = (existingMap) => {
    let color = '';
    do {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      color = `rgb(${r}, ${g}, ${b})`;
    } while (Object.values(existingMap).includes(color));
    return color;
  };

  const handleUploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post('http://localhost:5000/upload', formData);
    if(response.data.success){
      setSelectedImageName(response.data.filename);
      const url = URL.createObjectURL(file);
      setImageDataUrl(url);
    }
  };

  // Cuando cambia imageDataUrl, cargamos la imagen para obtener sus dimensiones
  useEffect(() => {
    if (imageDataUrl) {
      const img = new Image();
      img.src = imageDataUrl;
      img.onload = () => {
        setImageWidth(img.width);
        setImageHeight(img.height);
      };
    }
  }, [imageDataUrl]);

  // Guadar las anotaciones en el servidor
  const handleSaveAnnotations = async () => {
    // Enviar boundingBoxes al backend
    if (imageWidth && imageHeight) {
      await axios.post('http://localhost:5000/annotations', {
        filename: selectedImageName,
        boxes: boundingBoxes,
        imageWidth: imageWidth,
        imageHeight: imageHeight
      });
      alert('Anotaciones guardadas correctamente');
    } else {
      alert('No se han podido obtener las dimensiones de la imagen.');
    }
  };

  // Cuando dibujas una caja en el Canvas
  const handleNewBoxDrawn = (box) => {
    // box: {x, y, width, height}
    // Guardamos la caja en un estado temporal y abrimos el diálogo para seleccionar clase
    setPendingBox(box);
    setSelectedClass(classes[0] ?? "");
    setOpenDialog(true);
  };

  // Cerrar diálogo sin asignar
  const handleDialogClose = () => {
    setOpenDialog(false);
    setPendingBox(null);
  };

  // Asignar clase al bounding box
  const handleAssignClass = () => {
    if (pendingBox && selectedClass) {
      // classId será el índice en el array de clases
      const classId = classes.indexOf(selectedClass); 
      const newBox = {...pendingBox, classId};
      setBoundingBoxes((prev) => [...prev, newBox]);
    }
    setOpenDialog(false);
    setPendingBox(null);
  };

  // Función para obtener las clases del servidor
  const fetchClassesFromServer = async () => {
    try {
      const response = await axios.get('http://localhost:5000/classes');
      if (response.status === 200) {
        const serverClasses = response.data; // array de strings
        setClasses(serverClasses);

        // Generar colores si lo usas
        const colorMap = {};
        serverClasses.forEach((c) => {
          if (!colorMap[c]) {
            colorMap[c] = generateRandomColor(colorMap);
          }
        });
        setClassColors(colorMap);
      }
    } catch (error) {
      console.error('Error al obtener clases:', error);
    }
  };

  // Añadir clase nueva al backend y actualizar el estado
  const handleAddClass = async () => {
    const className = newClassName.trim();
    if (!className) return;

    try {
      const response = await axios.post('http://localhost:5000/classes', {
        className
      });
      if (response.data.success) {
        // response.data.classes => lista actualizada
        setClasses(response.data.classes);

        // Actualizar el map de colores
        setClassColors((prevMap) => {
          // Clonar el map anterior
          const newMap = { ...prevMap };
          // Agregar color si no existe
          if (!newMap[className]) {
            newMap[className] = generateRandomColor(newMap);
          }
          return newMap;
        });
        setNewClassName("");
      } else {
        alert(response.data.message || 'Error al añadir la clase');
      }
    } catch (error) {
      console.error('Error al añadir clase:', error);
      alert('No se pudo añadir la clase');
    }
  };

  return (
    <Container>
      <Box mt={2}>
        <ImageUploader onUpload={handleUploadImage} />
      </Box>

      { imageDataUrl && (
        <>
          <Box mt={2}>
            <CanvasStage 
              imageUrl={imageDataUrl} 
              boxes={boundingBoxes} 
              onNewBox={handleNewBoxDrawn}
              classColors={classColors}
              classes={classes}
            />
          </Box>
          <Box mt={2}>
            <Button variant="contained" onClick={handleSaveAnnotations}>
              Guardar Etiquetas
            </Button>
          </Box>
          {imageWidth && imageHeight && (
            <p>Dimensiones: {imageWidth} x {imageHeight}</p>
          )}
        </>
      )}

      <Box mt={2} display="flex" gap="10px">
        <TextField 
          label="Nueva Clase" 
          variant="outlined" 
          size="small"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
        />
        <Button variant="contained" onClick={handleAddClass}>
          Añadir Clase
        </Button>
      </Box>

      {/* Diálogo para asignar clase al bounding box recién creado */}
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Selecciona la clase para la caja</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel>Clase</InputLabel>
            <Select
              value={selectedClass}
              label="Clase"
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.map((c, i) => (
                <MenuItem key={i} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleAssignClass}>Asignar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App;
