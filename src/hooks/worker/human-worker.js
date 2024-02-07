self.importScripts(
  "https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.js"
);

let human;

onmessage = async (msg) => {
  try {
    if (!human) {
      human = new Human.default(msg.data.config);
      await human.load();
    }
    const image = new ImageData(
      new Uint8ClampedArray(msg.data.image),
      msg.data.width,
      msg.data.height
    );
    let result = {};
    console.log("run detect", msg.data.id);
    result = await human.detect(image, msg.data.config);
    console.log("detect done", msg.data.id);
    console.log(result[msg.data.type]);
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
    human.result = null;
    msg.data = null;
  } catch (err) {
    console.error(err);
  } finally {
    // 清除不再使用的資源
    // console.log("releaseResources");
    // await human.tf.dispose();
    // console.log(human.tf.memory());
  }
};
