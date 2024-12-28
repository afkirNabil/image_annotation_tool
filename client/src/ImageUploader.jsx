import React from 'react';
import { Button } from '@mui/material';

const ImageUploader = ({ onUpload }) => {
    const handleChange = (e) => {
        const file = e.target.files[0];
        if(file) {
            onUpload(file);
        }
    }

    return (
        <div>
        <Button variant="contained" component="label">
            Subir Imagen
            <input type="file" hidden onChange={handleChange}/>
        </Button>
        </div>
    );
};

export default ImageUploader;
