import { useEffect, useState, useMemo, useRef } from "react";
import useDetectFaceWorker from "@/hooks/use-detect-face-worker";
import _size from "lodash/size";
import _slice from "lodash/slice";
import _range from "lodash/range";
import _includes from "lodash/includes";
import _get from "lodash/get";
import _filter from "lodash/filter";

const cropRect = {
  cropLeft: 0,
  cropRight: 893.1500484027106,
  cropTop: 0,
  cropBottom: 979.3920619554696,
};

const rejectRect = [
  // {
  //   top: 142.51188051595383,
  //   bottom: 440.74405974202307,
  //   left: 231.49490835030548,
  //   right: 507.4813306177868,
  // },
];

export default function CropRecoverComponent() {
  const [originalImage, setOriginalImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const canvasRef = useRef(null);

  const handleOriginalImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const image = new Image();
      image.onload = () => {
        setOriginalImage(image);
      };
      image.src = URL.createObjectURL(file);
    }
  };

  const handleCroppedImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const image = new Image();
      image.onload = () => {
        setCroppedImage(image);
      };
      image.src = URL.createObjectURL(file);
    }
  };

  const drawImages = () => {
    if (originalImage && croppedImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Example cropRect, replace with your actual values

      // Set canvas size to the size of the original image
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;

      // Draw the original image on the canvas
      ctx.drawImage(originalImage, 0, 0);

      // Calculate the width and height of the cropped image
      const cropWidth = cropRect.cropRight - cropRect.cropLeft;
      const cropHeight = cropRect.cropBottom - cropRect.cropTop;

      // Draw the cropped image onto the original image at the specified position
      ctx.drawImage(
        croppedImage,
        0,
        0,
        croppedImage.width,
        croppedImage.height, // Source coordinates and size
        cropRect.cropLeft,
        cropRect.cropTop, // Destination coordinates on the original image
        cropWidth,
        cropHeight // Size of the cropped image to draw
      );
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleOriginalImageUpload}
      />
      <input type="file" accept="image/*" onChange={handleCroppedImageUpload} />
      <canvas ref={canvasRef} />
      <button onClick={drawImages}>Overlay Images</button>
    </div>
  );
}
