import browserUtils from "@/utils/browserUtils";

const humanConfig = {
  debug: true,
  backend: "wasm",
  modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models",
  face: {
    enabled: true,
    detector: {
      rotation: true,
      maxDetected: 2,
      // minConfidence: 0.5,
      // return: true,
    },
    iris: { enabled: false },
    description: { enabled: false },
    emotion: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
    age: { enabled: false },
    gender: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
  async: true,
  cacheSensitivity: 0,
  deallocate: true,
};

const workers = {
  human: null,
};

const resolvers = {
  human: {},
};

const counter = {
  human: 0,
};

class useDetectFaceWorker {
  constructor() {
    this.modelsLoaded = false;
    this.useWorker = true;
  }

  setUseWorker(useWorker) {
    this.useWorker = useWorker;
  }

  async importHuman() {
    console.log("importHuman");
    if (!browserUtils.isOffscreenCanvasSupported() || !this.useWorker) {
      if (!this.human) {
        const Human = await import("@vladmandic/human");
        this.human = new Human.default(humanConfig);
        await this.human.load();
        this.modelsLoaded = true;
      }
    } else {
      if (!workers.human) {
        workers.human = new Worker(
          new URL("./worker/human-worker.js", import.meta.url),
          { type: "module" }
        );
        workers.human.onmessage = (msg) => {
          resolvers.human[msg.data.id](msg.data);
          delete resolvers.human[msg.data.id];
        };
      }
      this.modelsLoaded = true;
    }
  }

  async warmup() {
    if (!browserUtils.isOffscreenCanvasSupported()) {
      await this.human?.warmup();
    }
  }

  async detectFace(type, imageData) {
    if (!this.modelsLoaded) await this.importHuman();
    if (!browserUtils.isOffscreenCanvasSupported() || !this.useWorker) {
      let result = {};
      result = await this.human?.detect(imageData, humanConfig);
      console.log(this.human.env);
      console.log('result', result)
      // 建立一個canvas 然後用draw.all
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const drawOptions = {
        bodyLabels: `person confidence is [score]% and has ${
          this.human.result?.body?.[0]?.keypoints.length || "no"
        } keypoints`,
      };
      this.human.draw.all(canvas, ctx, result, drawOptions);
      return { result: result[type], type: type, canvas: canvas };
    } else {
      const id = counter.human++;
      workers.human?.postMessage(
        {
          id: id,
          image: imageData.data.buffer,
          width: imageData.width,
          height: imageData.height,
          config: humanConfig,
          type: type,
        },
        [imageData.data.buffer.slice(0)]
      );
      return new Promise((resolve) => (resolvers.human[id] = resolve));
    }
  }
}

export default useDetectFaceWorker;

// const detector = new useDetectFaceWorker();
// export default detector;
