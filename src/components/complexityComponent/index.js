import { useEffect, useState, useMemo } from "react";
import useDetectFaceWorker from "@/hooks/use-detect-face-worker";
import imageUtils from "@/utils/imageUtils";
import imageCropUtils from "@/utils/imageCropUtils";
import detectFaceUtils from "@/utils/detectFaceUtils";
import _size from "lodash/size";
import _slice from "lodash/slice";
import _range from "lodash/range";
import _includes from "lodash/includes";
import _get from "lodash/get";
import _filter from "lodash/filter";
import { v4 as uuidv4 } from "uuid";
import md5 from "md5";
import styles from "./index.module.scss";
import ProgressBar from "@/components/common/progressbar/progressbar";
const detector = new useDetectFaceWorker();

export default function ComplexityComponent() {
  const [photos, setPhotos] = useState([]);
  const [fileQueue, setFileQueue] = useState([]);
  const [removedQueue, setRemovedQueue] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    async function loadDetector() {
      await detector.importHuman();
      setModelsLoaded(detector.modelsLoaded);
    }
    loadDetector();
  }, []);

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
    const checksumList = photos.map((photo) => photo.checksum);
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
    for (let idx = 0; idx < size; idx++) {
      const [blob] = await imageUtils.downscaleForAvatar(files[idx], 512, 512);
      const uInt8Array = new Uint8Array(await blob.arrayBuffer());
      const checksum = md5(uInt8Array);
      checksumList.push(checksum);
      setPhotos((ps) => [
        ..._slice(ps, 0, _size(ps) - size + idx),
        {
          ...ps[_size(ps) - size + idx],
          thumbnail: blob,
          progress: 50,
          checksum,
        },
        ..._slice(ps, _size(ps) - size + idx + 1),
      ]);
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    for (let idx = 0; idx < size; idx++) {
      const prevChecksumList = _slice(
        checksumList,
        0,
        _size(checksumList) - size + idx
      );
      const checksum = checksumList[_size(checksumList) - size + idx];
      const isDuplicated = _includes(prevChecksumList, checksum);
      let result = {
        blob: null,
        results: {},
      };
      if (isDuplicated) {
        result.results = { message: ["avatar.error.duplicated"] };
      } else {
        const [blob] = await imageUtils.downscaleForAvatar(
          files[idx],
          4096,
          4096
        );
        const image = await imageUtils.newImage(blob);
        const { width, height } = image;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height);
        const resultFromWorker = await detector.detectFace("face", data);
        const results = await detectFaceUtils.detectFace(resultFromWorker, {
          width,
          height,
        });
        const { eyePoints, message } = results;
        const cropBlob =
          !eyePoints || _size(message)
            ? imageCropUtils.cropRect(image)
            : imageCropUtils.cropFaceForAvatar(image, eyePoints);
        result.blob = cropBlob;
        result.results = results;
        ctx.clearRect(0, 0, width, height);
      }
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
        <div>This is a complex version of Huma Package</div>
        <div>It uses many features in image processing</div>
        <div></div>
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
                    {photo.thumbnail && (
                      <img
                        className={`${styles.image} ${
                          !photo.progressBarComplete ? styles.blur : ""
                        }`}
                        src={URL.createObjectURL(
                          photo.checked ? photo.blob : photo.thumbnail
                        )}
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
