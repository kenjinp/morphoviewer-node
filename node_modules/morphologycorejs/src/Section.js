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
}

const TYPENAME_2_TYPEVALUE = {
  undefined: 0,
  soma: 1,
  axon: 2,
  basal_dendrite: 3,
  apical_dendrite: 4,
  custom: 5,
}


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
    this._id = null
    this._parent = null
    this._children = []
    this._typename = null
    this._typevalue = null
    this._points = null
    this._radiuses = null
    this._morphology = morphology
  }


  /**
   * Defines the id of this seciton.
   * Note: should probably not be used after `initWithRawSection` because then
   * sections already have ids and chance to messup the id game are pretty high.
   * @param {String|Number} id - the id
   */
  setId(id) {
    this._id = id
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
      this._typename = tn
      this._typevalue = TYPENAME_2_TYPEVALUE[tn]
    } else {
      console.warn(`The typename must be one of ${Object.key(TYPENAME_2_TYPEVALUE).join(' ')}`)
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
    this._typevalue = tv
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
    this._points.push([x, y, z])
    this._radiuses.push(r)
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
    this._id = rawSection.id

    this._points = rawSection.points.map(p => p.position)
    this._radiuses = rawSection.points.map(p => p.radius)

    // in some cases, we have only the typename or the typevalue, in this case we perform  a lookup
    if (rawSection.typename || rawSection.typevalue) {
      this._typename = rawSection.typename || TYPEVALUE_2_TYPENAME[rawSection.typevalue]
      this._typevalue = rawSection.typevalue || TYPENAME_2_TYPEVALUE[rawSection.typename]
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
      this._parent = section
      return true
    }

    console.warn('A section cannot be the parent of itself.')
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
        console.warn('The given section is already one of the child to this one.')
      } else {
        this._children.push(section)
      }
      return true
    }
    console.warn('A section cannot be the child of itself.')
    return false
  }


  /**
   * Checks if a given section is already one of the children of _this_ section
   * @param {Section} section - a section to test
   * @return {Boolean} true if the given section is already a child of _this_ section, false if not.
   */
  hasChild(section) {
    if (!this._children) return false

    const candidateId = section.getId()

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
    let sum = 0
    for (let i = 0; i < this._points.length - 1; i += 1) {
      const p1 = this._points[i]
      const p2 = this._points[i + 1]
      const dx = p1[0] - p2[0]
      const dy = p1[1] - p2[1]
      const dz = p1[2] - p2[2]
      sum += Math.sqrt(dx * dx + dy * dy + dz * dz)
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

export default Section
