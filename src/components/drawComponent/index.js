import { useEffect, useState, useMemo, useRef } from "react";
import useDetectFaceWorker from "@/hooks/use-detect-face-worker";
import _size from "lodash/size";
import _slice from "lodash/slice";
import _range from "lodash/range";
import _includes from "lodash/includes";
import _get from "lodash/get";
import _filter from "lodash/filter";

const relativeRect = {
  top: 241.2915360501567,
  left: 323.23510971786834,
  right: 520.7272727272727,
  bottom: 482.23197492163007,
};

export default function DrawComponent() {
  const canvasRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (!imageSrc) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      // 设置 canvas 大小与图片一致
      canvas.width = image.width;
      canvas.height = image.height;

      // 在 canvas 上绘制图像
      ctx.drawImage(image, 0, 0);

      // 设置矩形的样式
      ctx.strokeStyle = "red"; // 矩形边框颜色
      ctx.lineWidth = 2; // 矩形边框宽度

      // 绘制相对矩形
      const { top, bottom, left, right } = relativeRect;
      const rectWidth = right - left;
      const rectHeight = bottom - top;
      ctx.strokeRect(left, top, rectWidth, rectHeight);
    };
  }, [imageSrc, relativeRect]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
