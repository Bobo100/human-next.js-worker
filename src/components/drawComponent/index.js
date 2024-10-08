import { useEffect, useState, useMemo, useRef } from "react";
import useDetectFaceWorker from "@/hooks/use-detect-face-worker";
import _size from "lodash/size";
import _slice from "lodash/slice";
import _range from "lodash/range";
import _includes from "lodash/includes";
import _get from "lodash/get";
import _filter from "lodash/filter";
import detectFaceUtils from "@/utils/detectFaceUtils";

const relativeRect = {
  top: 95,
  bottom: 157,
  left: 747,
  right: 796,
};

const point = [];

const rejectRect = [
  // {
  //   top: 536,
  //   bottom: 575,
  //   left: 885,
  //   right: 917,
  // },
];

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
      console.log("rectWidth", rectWidth, "rectHeight", rectHeight);
      ctx.strokeRect(left, top, rectWidth, rectHeight);

      // rejectRect
      _filter(rejectRect, (rect) => {
        const { top, bottom, left, right } = rect;
        const rectWidth = right - left;
        const rectHeight = bottom - top;
        // 改用藍色
        console.log("rejectRect", rectWidth, rectHeight);
        ctx.strokeStyle = "blue";
        ctx.strokeRect(left, top, rectWidth, rectHeight);
      });

      // // 也把人脸关键点绘制出来
      const faceMesh = point.map(([x, y]) => [x, y]);
      faceMesh.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = "green";
        ctx.fill();
      });
      console.log("detectFaceUtils", detectFaceUtils);
      const faceRect = detectFaceUtils.calculateBoxPoints(faceMesh);
      console.log("faceRect", faceRect);
      const { topLeft, topRight, bottomLeft, bottomRight } = faceRect;
      ctx.strokeStyle = "green";
      // 然後化成一個矩形
      const faceRectWidth = topRight.x - topLeft.x;
      const faceRectHeight = bottomLeft.y - topLeft.y;
      ctx.strokeRect(topLeft.x, topLeft.y, faceRectWidth, faceRectHeight);
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
