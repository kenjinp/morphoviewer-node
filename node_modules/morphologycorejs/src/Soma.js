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
    this._id = null
    this._typename = 'soma'
    this._typevalue = 1
    this._points = []
    this._radius = null
  }

  /**
   * Defines the id of this soma.
   * Note: should probably not be used after `initWithRawSection` because then
   * sections already have ids and chance to messup the id game are pretty high.
   * @param {String|Number} id - the id
   */
  setId(id) {
    this._id = id
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
    this._points.push([x, y, z])
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
    this._radius = r
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
    const nbPoints = this._points.length

    if (nbPoints === 1) {
      return this._points[0].slice()
    }

    if (nbPoints > 1) {
      const average = [0, 0, 0]
      for (let i = 0; i < nbPoints; i += 1) {
        average[0] += this._points[i][0]
        average[1] += this._points[i][1]
        average[2] += this._points[i][2]
      }
      average[0] /= nbPoints
      average[1] /= nbPoints
      average[2] /= nbPoints
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
      console.warn('Cannot init the Soma instance, no soma data provided in raw morphology.')
      return null
    }

    this._id = rawSoma.id
    this._points = rawSoma.points.map(p => p.position)
    this._radius = rawSoma.radius

    return this._id
  }
}


export default Soma
