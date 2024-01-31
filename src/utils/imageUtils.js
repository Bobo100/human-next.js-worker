import _last from "lodash/last";
import _padStart from "lodash/padStart";
import _get from "lodash/get";
import _split from "lodash/split";
import _slice from "lodash/slice";
import UTIF from "utif";
import fileSignatures from "./fileSignatures";

const validExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".gif"];
const validMIMETypes = ["image/jpeg", "image/png", "image/tiff", "image/gif"];
const mimeToExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/tiff": ".tiff",
  "image/gif": ".gif",
};

const utils = {
  getFileExtension: (blob) => {
    const { name } = blob;
    return _last(_slice(_split(name, "."), 1)) || "";
  },
  blob2ArrayBuffer: (blob) => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsArrayBuffer(blob);
    });
  },
  tiffArrayBufferToImageData: (buffer) => {
    const ifds = UTIF.decode(buffer);
    UTIF.decodeImage(buffer, ifds[0]);
    const array = new Uint8ClampedArray(UTIF.toRGBA8(ifds[0]));
    const imageData = new ImageData(array, ifds[0].width, ifds[0].height);
    const { width, height, colorSpace } = imageData;
    if (width > 4096 || height > 4096) {
      const ratio = 4096 / Math.max(width, height);
      const newImageData = new ImageData(width * ratio, height * ratio, {
        colorSpace,
      });
      for (let i = 0; i < newImageData.width; i += 1) {
        for (let j = 0; j < newImageData.height; j += 1) {
          const newWidth = parseInt(i / ratio);
          const newHeight = parseInt(j / ratio);
          const index = i * 4 + j * newImageData.width * 4;
          const newIndex = newWidth * 4 + newHeight * imageData.width * 4;
          newImageData.data[index] = array[newIndex];
          newImageData.data[index + 1] = array[newIndex + 1];
          newImageData.data[index + 2] = array[newIndex + 2];
          newImageData.data[index + 3] = array[newIndex + 3];
        }
      }
      return newImageData;
    }
    return imageData;
  },
  getTiffImageData: async (blob) =>
    utils.blob2ArrayBuffer(blob).then(utils.tiffArrayBufferToImageData),
  imageDataToBlob: (imageData, type = "image/jpeg") => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);
    const dataURL = canvas.toDataURL(type);
    return utils.base64ToBlob(dataURL);
  },
  base64ToBlob: (base64) => {
    if (base64 instanceof Blob) {
      return base64;
    }

    const sliceSize = 512;
    let b64Data = base64.replace(/^[^,]+,/, "");
    b64Data = b64Data.replace(/\s/g, "");
    let byteCharacters = window.atob(b64Data);
    let byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize);

      let byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      let byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }
    const type = base64.match(/image\/[^;]+/);
    return new Blob(byteArrays, { type: type });
  },
  getGIFFirstFrameBlob: async (blob, type = "image/jpeg") => {
    const img = await utils.newImage(blob);
    const canvas = document.createElement("canvas");
    let width = img.width;
    let height = img.height;
    if (width > 4096 || height > 4096) {
      const ratio = 4096 / Math.max(width, height);
      width = width * ratio;
      height = height * ratio;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height);
    const dataURL = canvas.toDataURL(type);
    return utils.base64ToBlob(dataURL);
  },
  downscaleIfNecessary: async (blob) => {
    const type = await utils.getFileTypeFromBlob(blob);
    if (type === "image/tiff") {
      const imageData = await utils.getTiffImageData(blob);
      const newBlob = utils.imageDataToBlob(imageData);
      newBlob.name = blob.name;
      newBlob.lastModified = blob.lastModified;
      blob = newBlob;
    } else if (type === "image/gif") {
      const newBlob = await utils.getGIFFirstFrameBlob(blob);
      newBlob.name = blob.name;
      newBlob.lastModified = blob.lastModified;
      blob = newBlob;
    }
    const img = await utils.newImage(blob);
    const base64 = utils.downscaleImage(img);
    const newBlob = utils.base64ToBlob(base64);
    newBlob.name = utils.extractBlobName(blob, type);
    newBlob.lastModified = blob.lastModified;
    return [newBlob, base64];
  },
  downscaleForAvatar: async (blob, maxWidth = 4096, maxHeight = 4096) => {
    const type = await utils.getFileTypeFromBlob(blob);
    if (type === "image/tiff") {
      const imageData = await utils.getTiffImageData(blob);
      const newBlob = utils.imageDataToBlob(imageData);
      newBlob.name = blob.name;
      newBlob.lastModified = blob.lastModified;
      blob = newBlob;
    } else if (type === "image/gif") {
      const newBlob = await utils.getGIFFirstFrameBlob(blob);
      newBlob.name = blob.name;
      newBlob.lastModified = blob.lastModified;
      blob = newBlob;
    }
    const img = await utils.newImage(blob);
    const base64 = utils.downscaleImage(img, "image/jpeg", maxWidth, maxHeight);
    const newBlob = utils.base64ToBlob(base64);
    newBlob.name = utils.extractBlobName(blob, type);
    newBlob.lastModified = blob.lastModified;
    blob = null;
    return [newBlob, base64];
  },
  extractBlobName: (blob, mimeType) => {
    const { name } = blob;
    const format = utils.getFileExtension(blob);
    if (!validExtensions.includes("." + format)) {
      return name + _get(mimeToExtensions, mimeType, ".jpg");
    } else {
      return name;
    }
  },
  downscaleImage: (
    img,
    type = "image/jpeg",
    maxWidth = 4096,
    maxHeight = 4096
  ) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const downscaleRatio = Math.max(
      img.width / maxWidth,
      img.height / maxHeight,
      1
    );
    canvas.width = img.width / downscaleRatio;
    canvas.height = img.height / downscaleRatio;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(type);
  },
  newImage: (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(img);
      img.src = URL.createObjectURL(blob);
    });
  },
  getFileTypeFromBlob: async (blob) => {
    try {
      const arrayBuffer = await utils.blob2ArrayBuffer(blob.slice(0, 4));
      const view = new DataView(arrayBuffer);
      let hexString = "";
      for (let i = 0; i < view.byteLength; i += 1) {
        const b = Number(view.getUint8(i)).toString(16).toUpperCase();
        hexString += _padStart(b, 2, "0");
      }
      return _get(fileSignatures, hexString, _get(blob, "type", ""));
    } catch (e) {
      return _get(blob, "type", "");
    }
  },
};

export default utils;
export { validExtensions };
