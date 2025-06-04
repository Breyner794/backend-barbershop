import mongoose, { set } from "mongoose";

function capitalizeWords (value){
  if (typeof value !== 'string' || value.length === 0) return'';
  return value
  .toLowerCase()
  .split(' ')
  .map(word =>{
    if (word.length === 0) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  })
  .join(' ');
}

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      set: capitalizeWords
    },
    price: {
      type: Number,
      required: true
    },
    duration: {
      type: Number,
      required:true,
    },
    description: {
      type:String,
      set:capitalizeWords
  },
    image_Url: {
      type: String, //Tener una imagen por default si no elige alguna imagen...
      default: 'https://example.com/default-service-image.png'
    },
    isActive: {
      type: Boolean, //Poder activar el servicio o desactivarlo.
      default: true,
    },
  },
  {
    strict: true,
    timestamps: true,
  }
);

const Service = mongoose.model("Service", serviceSchema);
export default Service;
