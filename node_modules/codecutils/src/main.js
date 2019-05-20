import traverse from "traverse";

/**
* The CodecUtils class gather some static methods that can be useful while
* encodeing/decoding data.
* CodecUtils does not have a constructor, don't try to instanciate it.
*/
class CodecUtils {


  /**
  * Get whether or not the platform is using little endian.
  * @return {Boolen } true if the platform is little endian, false if big endian
  */
  static isPlatformLittleEndian() {
    var a = new Uint32Array([0x12345678]);
    var b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    return (b[0] != 0x12);
  }


  /**
  * convert an ArrayBuffer into a unicode string (2 bytes for each char)
  * Note: this method was kindly borrowed from Google Closure Compiler:
  * https://github.com/google/closure-library/blob/master/closure/goog/crypt/crypt.js
  * @param {ArrayBuffer} buf - input ArrayBuffer
  * @return {String} a string compatible with Unicode characters
  */
  static arrayBufferToUnicode( buff ) {
    var buffUint8 = new Uint8Array(buff)
    var out = [], pos = 0, c = 0;

    while (pos < buffUint8.length) {
      var c1 = buffUint8[pos++];
      if (c1 < 128) {
        if((c1 < 32 && c1 != 10 && c1 != 13 && c1 != 9) || c1 == 127){
          console.warn("Invalid string: non-printable characters");
          return null;
        }
        out[c++] = String.fromCharCode(c1);
      } else if (c1 > 191 && c1 < 224) {
        var c2 = buffUint8[pos++];
        out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
      } else if (c1 > 239 && c1 < 365) {
        // Surrogate Pair
        var c2 = buffUint8[pos++];
        var c3 = buffUint8[pos++];
        var c4 = buffUint8[pos++];
        var u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 0x10000;
        out[c++] = String.fromCharCode(0xD800 + (u >> 10));
        out[c++] = String.fromCharCode(0xDC00 + (u & 1023));
      } else {
        var c2 = buffUint8[pos++];
        var c3 = buffUint8[pos++];
        var code = (c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63;
        if(code === 0xFFFD){
          console.warn("Invalid string: a REPLACEMENT CHARACTER was spotted");
          return null;
        }
        out[c++] = String.fromCharCode(code);
      }
    }
    return out.join('');
  };


  /**
  * convert a unicode string into an ArrayBuffer
  * Note that the str is a regular string but it will be encoded with
  * 2 bytes per char instead of 1 ( ASCII uses 1 byte/char ).
  * Note: this method was kindly borrowed from Google Closure Compiler:
  * https://github.com/google/closure-library/blob/master/closure/goog/crypt/crypt.js
  * @param {String} str - string to encode
  * @return {ArrayBuffer} the output ArrayBuffer
  */
  static unicodeToArrayBuffer( str ) {
    var out = [], p = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 128) {
        out[p++] = c;
      } else if (c < 2048) {
        out[p++] = (c >> 6) | 192;
        out[p++] = (c & 63) | 128;
      } else if (
          ((c & 0xFC00) == 0xD800) && (i + 1) < str.length &&
          ((str.charCodeAt(i + 1) & 0xFC00) == 0xDC00)) {
        // Surrogate Pair
        c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
        out[p++] = (c >> 18) | 240;
        out[p++] = ((c >> 12) & 63) | 128;
        out[p++] = ((c >> 6) & 63) | 128;
        out[p++] = (c & 63) | 128;
      } else {
        out[p++] = (c >> 12) | 224;
        out[p++] = ((c >> 6) & 63) | 128;
        out[p++] = (c & 63) | 128;
      }
    }

    // make a buffer out of the array
    return new Uint8Array(out).buffer;
  };


  /**
  * Convert an ArrayBuffer into a ASCII string (1 byte for each char)
  * @param {ArrayBuffer} buf - buffer to convert into ASCII string
  * @return {String} the output string
  */
  static arrayBufferToString8( buf ) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }


  /**
  * Convert a ASCII string into an ArrayBuffer.
  * Note that the str is a regular string, it will be encoded with 1 byte per char
  * @param {String} str - string to encode
  * @return {ArrayBuffer}
  */
  static string8ToArrayBuffer( str ) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i=0; i < str.length; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }


  /**
  * Write a ASCII string into a buffer
  * @param {String} str - a string that contains only ASCII characters
  * @param {ArrayBuffer} buffer - the buffer where to write the string
  * @param {Number} byteOffset - the offset to apply, in number of bytes
  */
  static setString8InBuffer( str, buffer, byteOffset = 0 ){
    if( byteOffset < 0){
      console.warn("The byte offset cannot be negative.");
      return;
    }

    if( !buffer || !(buffer instanceof ArrayBuffer)){
      console.warn("The buffer must be a valid ArrayBuffer.");
      return;
    }

    if( (str.length + byteOffset) > buffer.byteLength ){
      console.warn("The string is too long to be writen in this buffer.");
      return;
    }

    var bufView = new Uint8Array(buffer);

    for (var i=0; i < str.length; i++) {
      bufView[i + byteOffset] = str.charCodeAt(i);
    }
  }


  /**
  * Extract an ASCII string from an ArrayBuffer
  * @param {ArrayBuffer} buffer - the buffer
  * @param {Number} strLength - number of chars in the string we want
  * @param {Number} byteOffset - the offset in number of bytes
  * @return {String} the string, or null in case of error
  */
  static getString8FromBuffer( buffer, strLength, byteOffset=0 ){
    if( byteOffset < 0){
      console.warn("The byte offset cannot be negative.");
      return null;
    }

    if( !buffer || !(buffer instanceof ArrayBuffer)){
      console.warn("The buffer must be a valid ArrayBuffer.");
      return null;
    }

    if( (strLength + byteOffset) > buffer.byteLength ){
      console.warn("The string is too long to be writen in this buffer.");
      return null;
    }

    return String.fromCharCode.apply(null, new Uint8Array(buffer, byteOffset, strLength));
  }


  /**
  * Serializes a JS object into an ArrayBuffer.
  * This is using a unicode JSON intermediate step.
  * @param {Object} obj - an object that does not have cyclic structure
  * @return {ArrayBuffer} the serialized output
  */
  static objectToArrayBuffer( obj ){
    var buff = null;
    var objCleanClone = CodecUtils.makeSerializeFriendly(obj)

    try{
      var strObj = JSON.stringify( objCleanClone );
      buff = CodecUtils.unicodeToArrayBuffer(strObj)
    }catch(e){
      console.warn(e);
    }

    return buff;
  }


  /**
  * Convert an ArrayBuffer into a JS Object. This uses an intermediate unicode JSON string.
  * Of course, this buffer has to come from a serialized object.
  * @param {ArrayBuffer} buff - the ArrayBuffer that hides some object
  * @return {Object} the deserialized object
  */
  static ArrayBufferToObject( buff ){
    var obj = null;

    try{
      var strObj = CodecUtils.arrayBufferToUnicode( buff );
      obj = JSON.parse( strObj )
    }catch(e){
      console.warn(e);
    }

    return obj;
  }


  /**
  * Get if wether of not the arg is a typed array
  * @param {Object} obj - possibly a typed array, or maybe not
  * @return {Boolean} true if obj is a typed array
  */
  static isTypedArray( obj ){
    return ( obj instanceof Int8Array         ||
             obj instanceof Uint8Array        ||
             obj instanceof Uint8ClampedArray ||
             obj instanceof Int16Array        ||
             obj instanceof Uint16Array       ||
             obj instanceof Int32Array        ||
             obj instanceof Uint32Array       ||
             obj instanceof Float32Array      ||
             obj instanceof Float64Array )
  }


  /**
  * Merge some ArrayBuffes in a single one
  * @param {Array} arrayOfBuffers - some ArrayBuffers
  * @return {ArrayBuffer} the larger merged buffer
  */
  static mergeBuffers( arrayOfBuffers ){
    var totalByteSize = 0;

    for(var i=0; i<arrayOfBuffers.length; i++){
      totalByteSize += arrayOfBuffers[i].byteLength;
    }

    var concatArray = new Uint8Array( totalByteSize );

    var offset = 0
    for(var i=0; i<arrayOfBuffers.length; i++){
      concatArray.set( new Uint8Array(arrayOfBuffers[i]), offset);
      offset += arrayOfBuffers[i].byteLength
    }

    return concatArray.buffer;
  }


  /**
  * In a browser, the global object is `window` while in Node, it's `GLOBAL`.
  * This method return the one that is relevant to the execution context.
  * @return {Object} the global object
  */
  static getGlobalObject(){
    var constructorHost = null;

    try{
      constructorHost = window; // in a web browser
    }catch( e ){
      try{
        constructorHost = global; // in node
      }catch( e ){
        console.warn( "You are not in a Javascript environment?? Weird." );
        return null;
      }
    }
    return constructorHost;
  }


  /**
  * Extract a typed array from an arbitrary buffer, with an arbitrary offset
  * @param {ArrayBuffer} buffer - the buffer from which we extract data
  * @param {Number} byteOffset - offset from the begining of buffer
  * @param {Function} arrayType - function object, actually the constructor of the output array
  * @param {Number} numberOfElements - nb of elem we want to fetch from the buffer
  * @return {TypedArray} output of type given by arg arrayType - this is a copy, not a view
  */
  static extractTypedArray( buffer, byteOffset, arrayType, numberOfElements ){
    if( !buffer ){
      console.warn("Input Buffer is null.");
      return null;
    }

    if(! (buffer instanceof ArrayBuffer) ){
      console.warn("Buffer must be of type ArrayBuffer");
      return null;
    }

    if(numberOfElements <= 0){
      console.warn("The number of elements to fetch must be greater than 0");
      return null;
    }

    if(byteOffset < 0){
      console.warn("The byte offset must be possitive or 0");
      return null;
    }

    if( byteOffset >= buffer.byteLength ){
      console.warn("The offset cannot be larger than the size of the buffer.");
      return null;
    }

    if( arrayType instanceof Function && !("BYTES_PER_ELEMENT" in arrayType)){
      console.warn("ArrayType must be a typed array constructor function.");
      return null;
    }

    if( arrayType.BYTES_PER_ELEMENT * numberOfElements + byteOffset > buffer.byteLength ){
      console.warn("The requested number of elements is too large for this buffer");
      return;
    }

    var slicedBuff = buffer.slice(byteOffset, byteOffset + numberOfElements*arrayType.BYTES_PER_ELEMENT)
    return new arrayType( slicedBuff )
  }


  /**
  * Get some info about the given TypedArray
  * @param {TypedArray} typedArray - one of the typed array
  * @return {Object} in form of {type: String, signed: Boolean, bytesPerElements: Number, byteLength: Number, length: Number}
  */
  static getTypedArrayInfo( typedArray ){
    var type = null;
    var signed = false;

    if( typedArray instanceof Int8Array ){
      type = "int";
      signed = false;
    }else if( typedArray instanceof Uint8Array ){
      type = "int";
      signed = true;
    }else if( typedArray instanceof Uint8ClampedArray ){
      type = "int";
      signed = true;
    }else if( typedArray instanceof Int16Array ){
      type = "int";
      signed = false;
    }else if( typedArray instanceof Uint16Array ){
      type = "int";
      signed = true;
    }else if( typedArray instanceof Int32Array ){
      type = "int";
      signed = false;
    }else if( typedArray instanceof Uint32Array ){
      type = "int";
      signed = true;
    }else if( typedArray instanceof Float32Array ){
      type = "float";
      signed = false;
    }else if( typedArray instanceof Float64Array ){
      type = "float";
      signed = false;
    }

    return {
      type: type,
      signed: signed,
      bytesPerElements: typedArray.BYTES_PER_ELEMENT,
      byteLength: typedArray.byteLength,
      length: typedArray.length
    }
  }


  /**
  * Counts the number of typed array obj has as attributes
  * @param {Object} obj - an Object
  * @return {Number} the number of typed array
  */
  static howManyTypedArrayAttributes( obj ){
    var typArrCounter = 0;
    traverse(obj).forEach(function (x) {
      typArrCounter += CodecUtils.isTypedArray(x);
    });
    return typArrCounter;
  }


  /**
  * Check if the given object contains any circular reference.
  * (Circular ref are non serilizable easily, we want to spot them)
  * @param {Object} obj - An object to check
  * @return {Boolean} true if obj contains circular refm false if not
  */
  static hasCircularReference( obj ){
    var hasCircular = false;
    traverse(obj).forEach(function (x) {
      if (this.circular){
        hasCircular = true;
      }
    });
    return hasCircular;
  }


  /**
  * Remove circular dependencies from an object and return a circularRef-free version
  * of the object (does not change the original obj), of null if no circular ref was found
  * @param {Object} obj - An object to check
  * @return {Object} a circular-ref free object copy if any was found, or null if no circ was found
  */
  static removeCircularReference( obj ){
    var hasCircular = false;
    var noCircRefObj = traverse(obj).map(function (x) {
      if (this.circular){
        this.remove();
        hasCircular = true;
      }
    });
    return hasCircular ? noCircRefObj : null;
  }


  /**
  * Clone the object and replace the typed array attributes by regular Arrays.
  * @param {Object} obj - an object to alter
  * @return {Object} the clone if ant typed array were changed, or null if was obj didnt contain any typed array.
  */
  static replaceTypedArrayAttributesByArrays( obj ){
    var hasTypedArray = false;

    var noTypedArrClone = traverse(obj).map(function (x) {
      if (CodecUtils.isTypedArray(x)){
        // here, we cannot call .length directly because traverse.map already serialized
        // typed arrays into regular objects
        var origSize = Object.keys(x).length;
        var untypedArray = new Array( origSize );

        for(var i=0; i<origSize; i++){
          untypedArray[i] = x[i];
        }
        this.update( untypedArray );
        hasTypedArray = true;
      }
    });
    return hasTypedArray ? noTypedArrClone : null;
  }


  /**
  * Creates a clone, does not alter the original object.
  * Remove circular dependencies and replace typed arrays by regular arrays.
  * Both will make the serialization possible and more reliable.
  * @param {Object} obj - the object to make serialization friendly
  * @return {Object} a clean clone, or null if nothing was done
  */
  static makeSerializeFriendly( obj ){
    var newObj = obj;
    var noCircular = CodecUtils.removeCircularReference(newObj);

    if( noCircular )
      newObj = noCircular;

    var noTypedArr = CodecUtils.replaceTypedArrayAttributesByArrays(newObj);

    if( noTypedArr )
      newObj = noTypedArr;

    return newObj;
  }


  /**
  * Check if a string is valid or not. A string is considered as invalid if it has
  * unicode "REPLACEMENT CHARACTER" or non-printable ASCII characters.
  * @param {String} str - string to test
  * @param {Boolean} forceAll - test the whole string instead of a sample of 1000 charaters
  * @return {Boolean} true is the string is valid, false if invalid.
  */
  static isValidString( str, forceAll=false ){
    var strLen = str.length;
    var nbSamples = forceAll ? strLen : Math.min( 1000, strLen ); //  a sample of 1000 should be enough
    var flagChar = 0xFFFD;
    var redFlags = 0;
    for(var i=0; i<nbSamples; i++){
      var code = str.charCodeAt( Math.floor(Math.random() * nbSamples) );
      if( code === flagChar || (code < 32 && code != 10 && code != 13 && code != 9) || code == 127){
        redFlags ++
      }
    }
    return !(redFlags > 0);
  }

} /* END of class CodecUtils */

export { CodecUtils }
