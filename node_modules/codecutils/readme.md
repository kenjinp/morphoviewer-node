# CodecUtils
This package is a toolkit composed of static functions to help reading and writing binary formats.

## Install
```bash
$ npm install --save codecutils
```

## Use
The name `codecutils` is the name of the package, while `CodecUtils` is the name of the class that contains static methods.  
Read the [documetation](http://www.pixpipe.io/codecutils/doc/) to know about the static methods available.

### In a browser
In the browser, you cqn use the version bundled in the `dist` directory.

Somewhere in your head:
```html
<script src="./path/to/codecutils.js"></script>
```

Somewhere within `<script>...</script>` markups:
```javascript
var isMachineLittleEndian = codecutils.CodecUtils.isPlatformLittleEndian()
```

### In a Rollup project
```javascript
import { CodecUtils } from 'codecutils';
```
