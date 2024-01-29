import imageUtils from '@/utils/imageUtils';
import _get from 'lodash/get';
import _sumBy from 'lodash/sumBy';
import _size from 'lodash/size';

const utils = {
  cropFaceForAvatar: (
    image,
    eyePoints,
    edgeFactor = 5.5,
    upscaleFactor = 1
  ) => {
    const { width, height } = image;
    const upWidth = parseInt(width * upscaleFactor);
    const upHeight = parseInt(height * upscaleFactor);
    const { eyeCenter, eyeDistance } = utils.getEyePointsInfo(
      eyePoints,
      upscaleFactor
    );
    const targetEdge = Math.min(
      parseInt(eyeDistance * edgeFactor),
      upWidth,
      upHeight
    );
    let cropLeft = Math.max(eyeCenter.x - targetEdge / 2, 0);
    let cropRight = eyeCenter.x + targetEdge / 2;
    cropLeft =
      cropRight > upWidth
        ? parseInt(cropLeft - (cropRight - upWidth))
        : cropLeft;
    cropRight = Math.min(cropRight, upWidth);
    let cropTop = Math.max(eyeCenter.y - targetEdge * 0.4, 0);
    let cropBottom = Math.min(eyeCenter.y + targetEdge * 0.6, upHeight);
    cropTop =
      cropBottom > upHeight
        ? parseInt(cropTop - (cropBottom - upHeight))
        : cropTop;
    cropBottom = Math.min(cropBottom, upHeight);
    return utils.drawSquareCropImage(image, {
      cropLeft,
      cropRight,
      cropTop,
      cropBottom,
    });
  },
  drawSquareCropImage: (image, cropInfo) => {
    const { cropLeft, cropRight, cropTop, cropBottom } = cropInfo;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const size = Math.min(cropRight - cropLeft, cropBottom - cropTop);
    const left = parseInt((cropRight + cropLeft - size) / 2);
    const top = parseInt((cropBottom + cropTop - size) / 2);
    ctx.drawImage(image, left, top, size, size, 0, 0, 512, 512);
    const b64 = canvas.toDataURL();
    return imageUtils.base64ToBlob(b64);
  },
  getEyePointsInfo: (eyePoints, upscaleFactor) => {
    const { left, right } = eyePoints || {};
    const avgEyePoints = {
      left: {
        x: (upscaleFactor * _sumBy(left, (point) => point.x)) / _size(left),
        y: (upscaleFactor * _sumBy(left, (point) => point.y)) / _size(left),
      },
      right: {
        x: (upscaleFactor * _sumBy(right, (point) => point.x)) / _size(right),
        y: (upscaleFactor * _sumBy(right, (point) => point.y)) / _size(right),
      },
    };
    const eyeCenter = {
      x: parseInt(
        (_get(avgEyePoints, 'left.x', 0) + _get(avgEyePoints, 'right.x', 0)) / 2
      ),
      y: parseInt(
        (_get(avgEyePoints, 'left.y', 0) + _get(avgEyePoints, 'right.y', 0)) / 2
      ),
    };
    const eyeDistance =
      ((_get(avgEyePoints, 'left.x', 0) - _get(avgEyePoints, 'right.x', 0)) **
        2 +
        (_get(avgEyePoints, 'left.y', 0) - _get(avgEyePoints, 'right.y', 0)) **
          2) **
      0.5;
    return { eyeCenter, eyeDistance };
  },
  cropRect: (image) => {
    const { width, height } = image;
    const cropSize = Math.min(width, height);
    const cropLeft = Math.max(parseInt((width - cropSize) / 2), 0);
    const cropRight = Math.min(parseInt((width + cropSize) / 2), width);
    const cropTop = Math.max(parseInt((height - cropSize) / 2), 0);
    const cropBottom = Math.min(parseInt((height + cropSize) / 2), height);
    return utils.drawSquareCropImage(image, {
      cropLeft,
      cropRight,
      cropTop,
      cropBottom,
    });
  },  
};

export default utils;
