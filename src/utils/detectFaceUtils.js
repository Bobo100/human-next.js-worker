import _get from "lodash/get";

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
};

export default utils;
