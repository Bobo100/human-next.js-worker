import _get from "lodash/get";
import _forEach from "lodash/forEach";
import _filter from "lodash/filter";
import _map from "lodash/map";

const utils = {
  boundingBox: (points) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    return { minX, minY, maxX, maxY };
  },
  radianToDegree: (radian) => {
    return (radian * 180) / Math.PI;
  },
  calculateBoxPoints: (faceMesh) => {
    const { minX, minY, maxX, maxY } = utils.boundingBox(faceMesh);

    return {
      topLeft: { x: minX, y: minY },
      topRight: { x: maxX, y: minY },
      bottomLeft: { x: minX, y: maxY },
      bottomRight: { x: maxX, y: maxY },
    };
  },
  detectFace: async (detections, image) => {
    let message = [];
    const { result } = detections;
    if (result.length === 0) {
      message.push("avatar.face.detect.error.face");
      return { message, boxPoints: null, eyePoints: null };
    }
    if (result.length > 1) {
      message.push("avatar.face.detect.error.face.multiple");
      return { message, boxPoints: null, eyePoints: null };
    }

    const faceData = result[0];

    const faceMesh = faceData.mesh.map((item) => {
      return [item[0], item[1]];
    });

    const { minX, minY, maxX, maxY } = utils.boundingBox(faceMesh);
    const boxPoints = {
      topLeft: {
        x: minX,
        y: minY,
      },
      topRight: {
        x: maxX,
        y: minY,
      },
      bottomLeft: {
        x: minX,
        y: maxY,
      },
      bottomRight: {
        x: maxX,
        y: maxY,
      },
    };

    // faceData.annotations.leftEyeUpper0
    // faceData.annotations.leftEyeLower0
    console.log("faceData.annotations", faceData.annotations);

    const leftEyeUpper = faceData.annotations.leftEyeUpper0.map((item) => {
      return { x: item[0], y: item[1] };
    });
    const leftEyeLower = faceData.annotations.leftEyeLower0.map((item) => {
      return { x: item[0], y: item[1] };
    });
    const rightEyeUpper = faceData.annotations.rightEyeUpper0.map((item) => {
      return { x: item[0], y: item[1] };
    });
    const rightEyeLower = faceData.annotations.rightEyeLower0.map((item) => {
      return { x: item[0], y: item[1] };
    });

    const eyePoints = {
      left: [...leftEyeUpper, ...leftEyeLower],
      right: [...rightEyeUpper, ...rightEyeLower],
    };

    const faceArea =
      ((faceData.size[0] * faceData.size[1]) / (image.height * image.width)) *
      100;

    if (
      (faceData.size[0] <= 256 || faceData.size[1] <= 256) &&
      faceArea < 6.25
    ) {
      message.push("avatar.face.detect.error.face.area");
    }

    const pitch = _get(faceData, "rotation.angle.pitch");
    const yaw = _get(faceData, "rotation.angle.yaw");
    const roll = _get(faceData, "rotation.angle.roll");

    if (pitch) {
      console.log("pitch (tilt)", utils.radianToDegree(pitch));
    }
    if (yaw) {
      console.log("yaw (pan)", utils.radianToDegree(yaw));
    }
    if (roll) {
      console.log("roll (roll)", utils.radianToDegree(roll));
    }

    return {
      message,
      boxPoints,
      eyePoints,
      faceAnnotations: faceData.annotations,
    };
  },
  getFaceInfosAndBlobForHairStyle: (image, faceRect, scale) => {
    const { width: imgWidth, height: imgHeight } = image;
    const { top, bottom, left, right } = faceRect;
    const rectWidth = right - left;
    const rectHeight = bottom - top;
    const cx = (right + left) / 2;
    const cy = (bottom + top) / 2;
    const longerSide = Math.max(rectWidth, rectHeight);
    const cropLeft = Math.max(parseInt(cx - 1.75 * longerSide), 0);
    const cropRight = Math.min(parseInt(cx + 1.75 * longerSide), imgWidth);
    const cropTop = Math.max(parseInt(cy - 1.5 * longerSide), 0);
    const cropBottom = Math.min(parseInt(cy + 2.75 * longerSide), imgHeight);
    const cropWidth = cropRight - cropLeft;
    const cropHeight = cropBottom - cropTop;
    const blob = utils.drawScaleCropImage(
      image,
      {
        cropLeft,
        cropRight,
        cropTop,
        cropBottom,
      },
      scale
    );
    const faceRectInCroppedImage = {
      top: Math.max((top - cropTop) * scale, 0),
      bottom: Math.min((bottom - cropTop) * scale, cropHeight * scale),
      left: Math.max((left - cropLeft) * scale, 0),
      right: Math.min((right - cropLeft) * scale, cropWidth * scale),
    };

    return {
      scale,
      cropRect: {
        cropLeft: cropLeft * scale,
        cropRight: cropRight * scale,
        cropTop: cropTop * scale,
        cropBottom: cropBottom * scale,
      },
      cropBlob: blob,
      cropUrl: URL.createObjectURL(blob),
      originalImage: {
        width: imgWidth,
        height: imgHeight,
      },
      relativeRect: faceRectInCroppedImage,
      faceRect: {
        top: top * scale,
        bottom: bottom * scale,
        left: left * scale,
        right: right * scale,
      },
    };
  },
  addFaceSize: (detections) => {
    _forEach(_get(detections, "face"), (f) => {
      if (!f.size) {
        f.size = [_get(f, "box.2", 0), _get(f, "box.3", 0)];
      }
    });
    detections.width = detections?.canvas?.width || 0;
    detections.height = detections?.canvas?.height || 0;
  },
  filterEmptyFaces: (detections) => {
    detections.face = _filter(detections.face, (f) => {
      const [width, height] = f.size;
      return width !== 0 && height !== 0;
    });
  },
  adjustDetectionSize: (detections, width, height) => {
    /** maximum size of Human@2.3.2 is 2048 pixels, if width/height is larger than
     * 2048 pixels, need to recalculate detection size */
    /*
    Human@3.2.2 is 3048 pixels
    */
    const canvasWidth = detections?.canvas?.width || 0;
    const canvasHeight = detections?.canvas?.height || 0;
    if (canvasWidth === 0 || canvasHeight === 0) return;
    if (width <= canvasWidth && height <= canvasHeight) return;
    const scale = width / canvasWidth;
    // rescale detections width/height
    detections.width *= scale;
    detections.height *= scale;
    // rescale detections face(s)
    _forEach(detections.face, (f) => {
      // type 1: [point1, point2, point3]
      _forEach(["box", "size"], (key) => {
        f[key] = _map(f[key], (point) => point * scale);
      });
      // type 2: Array[[point1, point2, point3]]
      _forEach(["mesh"], (key) => {
        f[key] = _map(f[key], (points) => {
          return _map(points, (point) => point * scale);
        });
      });
      // type 3: Object{Array[[point1, point2, point3]]}
      _forEach(["annotations"], (key) => {
        _forEach(f[key], (_, subKey) => {
          f[key][subKey] = _map(f[key][subKey], (points) => {
            return _map(points, (point) => point * scale);
          });
        });
      });
    });
  },
};

export default utils;
