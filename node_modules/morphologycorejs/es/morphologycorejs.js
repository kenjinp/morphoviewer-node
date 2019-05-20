/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  Apache License 2.0
* Lab      Blue Brain Project, EPFL
*/


/*
Standardized swc files (www.neuromorpho.org)
0 - undefined
1 - soma
2 - axon
3 - (basal) dendrite
4 - apical dendrite
5+ - custom
*/
const TYPEVALUE_2_TYPENAME = {
  0: 'undefined',
  1: 'soma',
  2: 'axon',
  3: 'basal_dendrite',
  4: 'apical_dendrite',
  5: 'custom',
};

const TYPENAME_2_TYPEVALUE = {
  undefined: 0,
  soma: 1,
  axon: 2,
  basal_dendrite: 3,
  apical_dendrite: 4,
  custom: 5,
};


/**
 * A section is a list of 3D points and some metadata. A section can have one parent
 * and multiple children when the dendrite or axone divide into mutliple dendrites
 * and axons.
 * A section instance can be built from scratch of it can be built using a raw object,
 * usually from a JSON description.
 */
class Section {
  /**
   * To construct a section, we need a reference to the morphology instance that
   * 'hosts' them. This may seem a bit a bit counter intuitive to have a reference
   * in that direction but it can be very convenient, when knowing a section, to
   * know to which morphology it belongs (i.e. raycasting a section)
   * @param {Morphology} morphology - the Morphology instance that host _this_ section
   */
  constructor(morphology = null) {
    this._id = null;
    this._parent = null;
    this._children = [];
    this._typename = null;
    this._typevalue = null;
    this._points = null;
    this._radiuses = null;
    this._morphology = morphology;
  }


  /**
   * Defines the id of this seciton.
   * Note: should probably not be used after `initWithRawSection` because then
   * sections already have ids and chance to messup the id game are pretty high.
   * @param {String|Number} id - the id
   */
  setId(id) {
    this._id = id;
  }


  /**
   * Get the id of _this_ section
   * @return {String|Number}
   */
  getId() {
    return this._id
  }


  /**
   * Define the typename, like in the SWC spec. Must be one of:
   *  - "undefined"
   *  - "soma" (even though this one should be used to build a Soma instance)
   *  - "axon"
   *  - "basal_dendrite"
   *  - "apical_dendrite"
   *  - "custom"
   * Not that this method automaically sets the typevalue accordingly.
   * For more info, go to http://www.neuronland.org/NLMorphologyConverter/MorphologyFormats/SWC/Spec.html
   * @param {String} tn - the typename
   */
  setTypename(tn) {
    if (tn in TYPENAME_2_TYPEVALUE) {
      this._typename = tn;
      this._typevalue = TYPENAME_2_TYPEVALUE[tn];
    } else {
      console.warn(`The typename must be one of ${Object.key(TYPENAME_2_TYPEVALUE).join(' ')}`);
    }
  }


  /**
   * Get the typename as a String
   * @return {String}
   */
  getTypename() {
    return this._typename
  }


  /**
   * Defnies the typevalue, which is the integer that goes in pair with the type name.
   * According to SWC spec. Must be one of:
   * - 0, for undefined
   * - 1, for soma (even though this one should be used to build a Soma instance)
   * - 2, for axon
   * - 3, for basal dendrite
   * - 4, for apical dendrite
   * - 5, for custom
   * Note that defining the type value will automatically set the type name accordingly.
   * @param {Number} tv - the type value
   */
  setTypeValue(tv) {
    this._typevalue = tv;
  }


  /**
   * Get the type value
   * @return {Number}
   */
  getTypevalue() {
    return this._typevalue
  }


  /**
   * Add a point to _this_ current section
   * @param {Number} x - the x coordinate of the point to add
   * @param {Number} y - the y coordinate of the point to add
   * @param {Number} z - the z coordinate of the point to add
   * @param {Number} r - the radius at the point to add. (default: 1)
   */
  addPoint(x, y, z, r = 1) {
    this._points.push([x, y, z]);
    this._radiuses.push(r);
  }


  /**
   * Get all the points of _this_ section as an array
   * @return {Array} each element are of form [x: Number, y: Number, y: Number]
   */
  getPoints() {
    return this._points
  }


  /**
   * Get all the radiuses of the point in _this_ section
   * @return {Array}
   */
  getRadiuses() {
    return this._radiuses
  }


  /**
   * Build a section using a raw section object.
   * @param {Object} rawSection - usually comes from a JSON file
   */
  initWithRawSection(rawSection) {
    this._id = rawSection.id;

    this._points = rawSection.points.map(p => p.position);
    this._radiuses = rawSection.points.map(p => p.radius);

    // in some cases, we have only the typename or the typevalue, in this case we perform  a lookup
    if (rawSection.typename || rawSection.typevalue) {
      this._typename = rawSection.typename || TYPEVALUE_2_TYPENAME[rawSection.typevalue];
      this._typevalue = rawSection.typevalue || TYPENAME_2_TYPEVALUE[rawSection.typename];
    }

    return this._id
  }


  /**
   * Define the parent section of _this_ section, as an object reference.
   * The only verification perfomed by this method is that a section is not added
   * as its own parent.
   * @param {Section} section - the section that is the parent of this one
   * @return {Boolean} true if parent was successfully defined, false if not.
   */
  setParent(section) {
    if (section && section.getId() !== this._id) {
      this._parent = section;
      return true
    }

    console.warn('A section cannot be the parent of itself.');
    return false
  }


  /**
   * Get the parent section of _this_ section
   * @return {Section} the parent
   */
  getParent() {
    return this._parent
  }


  /**
   * Make a given section the child of _this_ one.
   * Two verifications are perfomed before: ids must be diferent so that we are
   * not allowing a section to be the child of itself, and that _this_ section
   * does not already have the given section as a children (=> avoid doublons)
   * @param {Section} section - The section to add as a child
   * @return {Boolean} true if successfully added (of if already has the given child),
   * false if the candidate cannot be a child
   */
  addChild(section) {
    if (section.getId() !== this._id) {
      if (this.hasChild(section)) {
        console.warn('The given section is already one of the child to this one.');
      } else {
        this._children.push(section);
      }
      return true
    }
    console.warn('A section cannot be the child of itself.');
    return false
  }


  /**
   * Checks if a given section is already one of the children of _this_ section
   * @param {Section} section - a section to test
   * @return {Boolean} true if the given section is already a child of _this_ section, false if not.
   */
  hasChild(section) {
    if (!this._children) return false

    const candidateId = section.getId();

    for (let i = 0; i < this._children.length; i += 1) {
      if (this._children[i].getId() === candidateId) return true
    }
    return false
  }


  /**
   * Get the size of _this_ section
   * @return {Number}
   */
  getSize() {
    let sum = 0;
    for (let i = 0; i < this._points.length - 1; i += 1) {
      const p1 = this._points[i];
      const p2 = this._points[i + 1];
      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      const dz = p1[2] - p2[2];
      sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    return sum
  }


  /**
   * Get the morphology object that contains this section
   * @return {Morphology}
   */
  getMorphology() {
    return this._morphology
  }


  /**
   * Get all the children as an Array
   * @return {Array}
   */
  getChildren() {
    return this._children
  }
}

/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  Apache License 2.0
* Lab      Blue Brain Project, EPFL
*/


/**
 * The soma is the cell body of a neurone and thus is sort of a simplified version
 * of a Section, in term of datastructure.
 * A soma can be made of a single point (then it's just a center point) or of several,
 * then it's a more accurate description of a soma. When described with several points,
 * the representation is usually as a 2D polygon (even though it's in a 3D space)
 */
class Soma {
  constructor() {
    this._id = null;
    this._typename = 'soma';
    this._typevalue = 1;
    this._points = [];
    this._radius = null;
  }

  /**
   * Defines the id of this soma.
   * Note: should probably not be used after `initWithRawSection` because then
   * sections already have ids and chance to messup the id game are pretty high.
   * @param {String|Number} id - the id
   */
  setId(id) {
    this._id = id;
  }


  /**
   * Get the id of _this_ soma
   * @return {String|Number}
   */
  getId() {
    return this._id
  }


  /**
   * Add a point to the soma description
   * @param {Number} x - the x coordinate of the point to add
   * @param {Number} y - the y coordinate of the point to add
   * @param {Number} z - the z coordinate of the point to add
   */
  addPoint(x, y, z) {
    this._points.push([x, y, z]);
  }


  /**
   * Get all the points of the soma
   * @return {Array} each element of the array if of form [x: Number, y: Number, z: Number]
   */
  getPoints() {
    return this._points
  }


  /**
   * Define the radius of the soma
   * @param {Number} r - the radius
   */
  setRadius(r) {
    this._radius = r;
  }


  /**
   * Get the radius of the soma.
   * @return {Number}
   */
  getRadius() {
    return this._radius
  }


  /**
   * Return the center of the soma.
   * If the soma is made of a single point and a radius, this method returns the
   * single point. If the soma is made of several points, this method returns the
   * average.
   * @return {Array|null} coordinate of the center as [x: Number, y: Number, z: Number]
   */
  getCenter() {
    const nbPoints = this._points.length;

    if (nbPoints === 1) {
      return this._points[0].slice()
    }

    if (nbPoints > 1) {
      const average = [0, 0, 0];
      for (let i = 0; i < nbPoints; i += 1) {
        average[0] += this._points[i][0];
        average[1] += this._points[i][1];
        average[2] += this._points[i][2];
      }
      average[0] /= nbPoints;
      average[1] /= nbPoints;
      average[2] /= nbPoints;
      return average
    }
    return null
  }


  /**
   * Build a soma using a raw soma object.
   * @param {Object} rawSoma - usually comes from a JSON file
   */
  initWithRawSection(rawSoma) {
    if (!rawSoma) {
      console.warn('Cannot init the Soma instance, no soma data provided in raw morphology.');
      return null
    }

    this._id = rawSoma.id;
    this._points = rawSoma.points.map(p => p.position);
    this._radius = rawSoma.radius;

    return this._id
  }
}

/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  Apache License 2.0
* Lab      Blue Brain Project, EPFL
*/


/**
 * A morphology is the data representation of a neurone's anatomy. It is composed
 * of one soma (cell body) and sections. Sections can be axons, dendrites, etc.
 * A Morphology instance can be built from scratch (though it can be a bit tedious)
 * but will generally be built using a JSON description.
 */
class Morphology {
  constructor() {
    this._id = null;
    this._sections = {};
    this._soma = null;

    // these are catgories of sections that we may need. Look at `getOrphanSections`
    // and `_findSpecialSection`
    this._specialSections = {};
  }


  /**
   * Set the ID of _this_ morphology
   * @param {String|Number} id - the id
   */
  setId(id) {
    this._id = id;
  }


  /**
   * Get the ID of _this_ morphology
   * @return {String|Number}
   */
  getId() {
    return this._id
  }


  /**
   * Build a morphology from a raw dataset, that usually comes from a JSON file.
   * Note that some files do not provide any data about the soma. In this case, the Soma
   * instance remains `null`
   * @param {Object} rawMorphology - a flat tree description of a morphology
   */
  buildFromRawMorphology(rawMorphology) {
    // Sometimes, we have no data about the soma
    if (rawMorphology.soma) {
      this._soma = new Soma();
      this._soma.initWithRawSection(rawMorphology.soma);
    }

    // Build the Section instances.
    // This first step does not define parents nor children
    for (let i = 0; i < rawMorphology.sections.length; i += 1) {
      const s = new Section(this);
      const sId = s.initWithRawSection(rawMorphology.sections[i]);
      this._sections[sId] = s;
    }

    // Now we define parent and children
    for (let i = 0; i < rawMorphology.sections.length; i += 1) {
      const currentRawSection = rawMorphology.sections[i];
      const currentSection = this._sections[currentRawSection.id];

      // adding a parent if there is one
      // can be 0 but cannot be null (in JS, 0 and null are diff)
      if (currentRawSection.parent !== null) {
        const parent = this._sections[currentRawSection.parent];
        currentSection.setParent(parent);
      }

      const children = currentRawSection.children.map(c => this._sections[c]);
      for (let c = 0; c < children.length; c += 1) {
        currentSection.addChild(children[c]);
      }
    }
  }


  /**
   * Retrieve the total number of section in this morphology
   * @return {Number}
   */
  getNumberOfSections() {
    return Object.keys(this._sections)
  }


  /**
   * Get a section, given its id
   * @param {String|Number} id - the id of a section
   * @return {Section|null} the requested section or null if the id is invalid
   */
  getSection(id) {
    if (id in this._sections) {
      return this._sections[id]
    }
    return null
  }


  /**
   * Get all the sections of _this_ morphology as an array, because sometimes it's
   * more convenient for iterating.
   * @return {Array} array of Section instances
   */
  getArrayOfSections() {
    return Object.values(this._sections)
  }


  /**
   * Get the soma Object
   * @return {Soma}
   */
  getSoma() {
    return this._soma
  }


  /**
   * Get all the section with no parent (_parent = null)
   * Those are directly tied to the soma
   * @param {Boolean} force - if true, the fetching among the sections will be done again
   * @return {Array} array of Sections
   */
  getOrphanSections(force = false) {
    const speciality = 'orphans';

    // extract, if not done before
    this._findSpecialSection(
      'orphans',
      s => !s.getParent(),
      force,
    );

    return this._specialSections[speciality]
  }


  /**
   * @private
   * Helper function to build a subset of Sections based on the selections perfomed by `selector`
   * @param {String} specialityName - name of the spaciality
   * @param {Function} selector - function that takes a Section and returns a boolean.
   * if true is return, a section will be selected
   * @param {Boolean} force - if true: rebuild the list, if false:
   * just return the list previously build
   */
  _findSpecialSection(specialityName, selector, force = false) {
    if (!(specialityName in this._specialSections)) {
      this._specialSections[specialityName] = null;
    }

    if (force || !this._specialSections[specialityName]) {
      this._specialSections[specialityName] = [];
      const allSections = Object.values(this._sections);
      for (let i = 0; i < allSections.length; i += 1) {
        if (selector(allSections[i])) {
          this._specialSections[specialityName].push(allSections[i]);
        }
      }
    }
    return this._specialSections[specialityName]
  }
}

var index = ({
  Morphology,
});


// export default Morphology

export default index;
//# sourceMappingURL=morphologycorejs.js.map
