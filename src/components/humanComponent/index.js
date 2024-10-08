import { useEffect, useState, useMemo } from "react";
import imageUtils from "@/utils/imageUtils";
import _size from "lodash/size";
import _slice from "lodash/slice";
import _range from "lodash/range";
import _includes from "lodash/includes";
import _get from "lodash/get";
import _filter from "lodash/filter";
import detectFaceUtils from "@/utils/detectFaceUtils";

const HUMAN_VERSION = "3.2.2";

const humanConfig = {
  debug: true,
  backend: "wasm",
  modelBasePath: `https://cdn.jsdelivr.net/npm/@vladmandic/human@${HUMAN_VERSION}/models/`,
  // modelBasePath: "/assets/models/",
  filter: { enabled: false },
  face: {
    enabled: true,
    detector: {
      rotation: false,
      maxDetected: 20,
      minConfidence: 0.2,
      /** should face detection return processed and cropped face tensor that can with an external model for addtional processing?
       * if enabled it must be manually deallocated to avoid memory leak */
      return: false,
      // scale: 1,
    },
    iris: { enabled: false },
    description: { enabled: true },
    emotion: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
  async: true,
  cacheModels: false, // set to false for use the new model version
  softwareKernels: true,
  warmup: "face",
  cacheSensitivity: 0,
  // deallocate: false,
};

export default function HumanComponent() {
  const [human, setHuman] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    importHuman();
  }, []);

  const importHuman = async () => {
    await import("@vladmandic/human").then(async (Human) => {
      const instance = new Human.default(humanConfig);
      await instance.load().then(() => {
        instance.warmup().then(() => {
          setHuman(instance);
          setModelsLoaded(true);
        });
      });
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 将文件转化为 Blob 对象
    const blob = new Blob([file], { type: file.type });

    // 创建图像对象并加载 Blob 数据
    const image = new Image();
    image.src = URL.createObjectURL(blob);

    // 当图像加载完成时
    image.onload = async () => {
      const canvas = document.getElementById("faceCanvas");
      const ctx = canvas.getContext("2d");

      // 设置 canvas 尺寸
      const { width, height } = image;
      canvas.width = width;
      canvas.height = height;

      // 将图像绘制到 canvas 上
      ctx.drawImage(image, 0, 0, width, height);

      // 获取 ImageData 对象
      const data = ctx.getImageData(0, 0, width, height);

      // 使用 Human 库进行脸部检测
      const result = await human.detect(data);
      detectFaceUtils.addFaceSize(result);
      detectFaceUtils.filterEmptyFaces(result);
      detectFaceUtils.adjustDetectionSize(result, image.width, image.height);
      console.log("result", result);
      setResult(result);
      const drawOptions = {
        bodyLabels: `person confidence is [score]% and has ${
          human.result?.body?.[0]?.keypoints.length || "no"
        } keypoints`,
      };
      human.draw.all(canvas, result, drawOptions);

      // 处理结果（可以在这里进行绘制或者其他操作）
      result.face.forEach((face) => {
        face.mesh.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        });
        const faceMesh = face.mesh.map(([x, y]) => [x, y]);
        const faceRect = detectFaceUtils.calculateBoxPoints(faceMesh);
        const { topLeft, topRight, bottomLeft, bottomRight } = faceRect;
        const faceRectWidth = Math.abs(topRight.x - topLeft.x);
        const faceRectHeight = Math.abs(bottomLeft.y - topLeft.y);
        console.log(
          "faceRectWidth",
          faceRectWidth,
          "faceRectHeight",
          faceRectHeight
        );

        // 设置绘制样式
        ctx.strokeStyle = "green"; // 设置边框颜色
        ctx.lineWidth = 3; // 设置线条宽度

        // 绘制矩形框
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomLeft.x, bottomLeft.y);
        ctx.closePath(); // 可选：闭合路径
        ctx.stroke(); // 描边绘制线条

        console.log("face", face);
        // face.box 是一個array作者說是[x, y, width, height]
        // 我們也用黃色框框框起來
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        ctx.strokeRect(face.box[0], face.box[1], face.box[2], face.box[3]);
      });
    };
    // 然後要把檔案清空
    e.target.value = "";
  };

  const handleDownloadCanvas = () => {
    const canvas = document.getElementById("faceCanvas");
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "face.png";
    a.click();
  };

  const handleResultToTxt = () => {
    const text = JSON.stringify(result, null, 2);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "result.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div>
        <input
          type="file"
          id="imageInput"
          accept="image/*"
          onChange={handleImageChange}
        />
        <button
          onClick={handleDownloadCanvas}
          disabled={!_size(result)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Download Canvas
        </button>
        <button
          onClick={handleResultToTxt}
          disabled={!_size(result)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Download Result
        </button>
        <canvas id="faceCanvas"></canvas>
      </div>
    </>
  );
}
