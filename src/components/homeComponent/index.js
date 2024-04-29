import { useEffect, useState, useMemo } from "react";
import useDetectFaceWorker from "@/hooks/use-detect-face-worker";
import imageUtils from "@/utils/imageUtils";
import detectFaceUtils from "@/utils/detectFaceUtils";
import _size from "lodash/size";
import _slice from "lodash/slice";
import _range from "lodash/range";
import _includes from "lodash/includes";
import _get from "lodash/get";
import _filter from "lodash/filter";
import { v4 as uuidv4 } from "uuid";
import styles from "./index.module.scss";
import ProgressBar from "@/components/common/progressbar/progressbar";
const detector = new useDetectFaceWorker();

export default function HomeComponent() {
  const [useWorker, setUseWorker] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [fileQueue, setFileQueue] = useState([]);
  const [removedQueue, setRemovedQueue] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [runDownscale, setRunDownscale] = useState(false);

  const handleLoadModels = async () => {
    if (modelsLoaded) return;
    detector.setUseWorker(useWorker);
    await detector.importHuman();
    setModelsLoaded(detector.modelsLoaded);
  };

  useEffect(() => {
    if (!modelsLoaded || !_size(fileQueue)) return;
    processImage(fileQueue);
  }, [modelsLoaded, fileQueue]);

  useEffect(() => {
    if (!_size(removedQueue)) return;
    processRemovedQueue();
  }, [removedQueue]);

  const processRemovedQueue = () => {
    const nextPhotos = _filter(
      photos,
      (photo) => !removedQueue.includes(photo.id)
    );
    setPhotos(nextPhotos);
    setRemovedQueue([]);
  };

  const handleOnChange = async (e) => {
    const files = e.target.files;
    const fileList = [];
    for (let idx = 0; idx < files.length; idx++) {
      fileList.push(files[idx]);
    }
    if (!modelsLoaded) {
      setFileQueue(fileList);
      await detector.importHuman();
    } else {
      processImage(fileList);
    }
    e.target.value = null;
  };

  const processImage = async (files) => {
    const size = _size(files);
    setPhotos((ps) => [
      ...ps,
      ..._range(size).map(() => ({
        id: uuidv4(),
        blob: null,
        thumbnail: null,
        results: null,
        checked: false,
        progress: 10,
        progressBarComplete: false,
        checksum: null,
      })),
    ]);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    for (let idx = 0; idx < size; idx++) {
      let result = {
        blob: null,
        results: {},
      };

      // 不做downscale
      let newBlob = files[idx];
      if (runDownscale) {
        const [blob] = await imageUtils.downscaleForAvatar(
          files[idx],
          4096,
          4096
        );
        newBlob = blob;
      }
      let image = await imageUtils.newImage(newBlob);
      const { width, height } = image;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(image, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height);
      console.log("detectFace");
      const resultFromWorker = await detector.detectFace("face", data);
      const results = await detectFaceUtils.detectFace(resultFromWorker, {
        width,
        height,
      });
      console.log("resultFromWorker", resultFromWorker);
      console.log("detectFace done", results);
      const { canvas: faceCanvas } = resultFromWorker;      
      result.blob = newBlob;
      result.results = results;
      ctx.clearRect(0, 0, width, height);

      setPhotos((ps) => [
        ..._slice(ps, 0, _size(ps) - size + idx),
        {
          ...ps[_size(ps) - size + idx],
          checked: true,
          blob: _get(result, "blob") || ps[_size(ps) - size + idx].thumbnail,
          results: _get(result, "results.message", []),
          progress: 100,
        },
        ..._slice(ps, _size(ps) - size + idx + 1),
      ]);
    }
  };

  const filteredPhotos = useMemo(() => {
    return _filter(photos, (photo) => !removedQueue.includes(photo.id));
  }, [photos, removedQueue]);

  const onRemove = (removeId) => {
    setRemovedQueue((ps) => [...ps, removeId]);
  };

  const onProgressBarComplete = (id) => {
    setPhotos((ps) =>
      ps.map((photo) => {
        if (photo.id === id) {
          return {
            ...photo,
            progressBarComplete: true,
          };
        }
        return photo;
      })
    );
  };

  return (
    <>
      <div>
        <div className={styles.checkboxWrapper}>
          <label
            className={styles.checkboxLabel}
            onClick={() => setUseWorker(!useWorker)}
          >
            use Worker or not
          </label>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={useWorker}
            onChange={() => setUseWorker(!useWorker)}
          />
        </div>
        <button
          className={styles.loadModelsButton}
          onClick={handleLoadModels}
          disabled={modelsLoaded}
        >
          {modelsLoaded ? "Models已經Load了" : "Load Models"}
        </button>
        <div>This is a simple demo of face detection</div>
        <div>Only input images and process using Human Package</div>
        <div className={styles.checkboxWrapper}>
          <label
            className={styles.checkboxLabel}
            onClick={() => setRunDownscale(!runDownscale)}
          >
            run Downscale or not
          </label>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={runDownscale}
            onChange={() => setRunDownscale(!runDownscale)}
          />
        </div>
        <input
          type="file"
          multiple={true}
          accept="image/*"
          disabled={!modelsLoaded}
          onChange={handleOnChange}
        />
      </div>
      <div className={styles.selection}>
        {filteredPhotos.map((photo) => {
          return (
            <div key={photo.id} className={styles.outerWrapper}>
              <div className={styles.innerWrapper}>
                <div className={styles.imageWrapper}>
                  <>
                    {photo.blob && (
                      <img
                        className={`${styles.image} ${
                          !photo.progressBarComplete ? styles.blur : ""
                        }`}
                        src={URL.createObjectURL(photo.blob)}
                        alt=""
                      />
                    )}
                    {!photo.progressBarComplete && (
                      <div className={styles.imageMask} />
                    )}
                    {!photo.progressBarComplete && (
                      <ProgressBar
                        progress={photo.progress || 0}
                        onComplete={() => onProgressBarComplete(photo.id)}
                      />
                    )}
                    {photo.progressBarComplete && (
                      <canvas
                        id={`canvas-${photo.id}`}
                        className={styles.canvas}
                      />
                    )}
                  </>
                  <div
                    className={
                      photo.progressBarComplete
                        ? styles.checked
                        : styles.checking
                    }
                  >
                    {photo.checked && (
                      <img
                        className={styles.close}
                        src="/icon_close.svg"
                        alt=""
                        onClick={() => onRemove(photo.id)}
                      />
                    )}
                    {!!_size(photo.results) && (
                      <>
                        <div className={styles.errorWrapper}>
                          {_get(photo, "results.0")}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
