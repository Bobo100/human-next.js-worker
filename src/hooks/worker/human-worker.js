self.importScripts(
  "https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.js"
);

let human;

onmessage = async (msg) => {
  try {
    if (!human) {
      human = new Human.default(msg.data.config);
      await human.load();
      await human.warmup();
    }
    const image = new ImageData(
      new Uint8ClampedArray(msg.data.image),
      msg.data.width,
      msg.data.height
    );
    let result = {};
    result = await human.detect(image, msg.data.config);
    const filterResult = result[msg.data.type].map((item) => {
      return {
        mesh: item.mesh,
        annotations: item.annotations,
        size: item.size,
      };
    });
    postMessage({
      id: msg.data.id,
      result: filterResult,
      type: msg.data.type,
    });
  } catch (err) {
    console.error(err);
  }
};
