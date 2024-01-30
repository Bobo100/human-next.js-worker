import browserUtils from "@/utils/browserUtils";

const humanConfig = {
  debug: true,
  backend: "wasm",
  modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models",
  face: {
    enabled: true,
    emotion: { enabled: false },
    age: { enabled: false },
    gender: { enabled: false },
    iris: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
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
  }

  async importHuman() {
    console.log("importHuman");
    if (!browserUtils.isOffscreenCanvasSupported()) {
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
        // this.warmup();
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
    await this.importHuman();
    if (!browserUtils.isOffscreenCanvasSupported()) {
      let result = {};
      result = await this.human?.detect(imageData, humanConfig);
      return { result: result[type], type: type };
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
