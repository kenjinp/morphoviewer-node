import { MorphoViewer } from "morphoviewer-node";
import { SwcParser } from "swcmorphologyparser";
import { readFileSync } from "fs";
import { resolve } from "path";

const logWithDate = startDate => message =>
  console.log(`${Date.now() - startDate} ${message}`);

export default () => {
  const log = logWithDate(Date.now());
  const morphoViewer = new MorphoViewer();
  // return canvas.toBuffer(mimeType);
  log("reading file");
  const data = readFileSync(resolve(__dirname, "./Morphology.swc"), "utf8");

  log("parsing file");
  const swcParser = new SwcParser();
  swcParser.parse(data);
  const rawMorpho = swcParser.getRawMorphology();
  log("done parsing file");
  if (rawMorpho) {
    // we display a morpho, second param is it's name (null: a autogenarated will do)
    // last param is "do we focus the camera on it"
    morphoViewer.addMorphology(rawMorpho, {
      focusOn: true, // do we want the camera to focus on this one when it's loaded?
      asPolyline: false, // with polylines of with cylinders?
      onDone: null, // what to do when it's loaded?
      //color: Math.floor(Math.random() * 0xFFFFFF), // if not present, all neurones will have there axon in blue, basal dendrite in red and apical dendrite in green
      somaMode: "fromOrphanSections"
      //somaMode: "default",
    });
    log("added Morpho to new scene");
    log("taking screenie");
    const imageData = morphoViewer.takeScreenshot();
    morphoViewer.destroy();
    return imageData;
  } else {
    throw new Error("no morpho");
  }
};
