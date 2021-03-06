"use strict";

/// !doc
/// 
/// # Compiler and file loader
///  
/// `var compiler = require('streamline/lib/compiler/compile')`
/// 
var fs = require("fs");
var fspath = require("path");

function _exists(callback, fname) {
	fspath.exists(fname, function(result) {
		callback(null, result);
	})
}

function mtime(_, fname) {
	return _exists(_, fname) ? fs.stat(fname, _).mtime : 0;
}

function _getTransform(options) {
	if (options.fibers) {
		// req variable prevents client side require from getting it as a dependency
		var req = require;
		return req("../fibers/transform");
	} else {
		return require("../callbacks/transform");
	}
}

function _banner(version) {
	// important: no newline, to support lines-preserve option!
	return "/*** Generated by streamline " + version + " - DO NOT EDIT ***/";
}

function _extend(obj, other) {
	for (var i in other) {
		obj[i] = other[i];
	}
	return obj;
}

function _transform(transform, source, options) {
	var sourceOptions = /streamline\.options\s*=\s*(\{.*\})/.exec(source);
	if (sourceOptions) {
		_extend(options, JSON.parse(sourceOptions[1]));
	}
	options.source = source;
	options.callback = options.callback || "_";
	options.lines = options.lines || "mark";
	return transform.transform(source, options);
}

function parseShebang(content) {
	if (content[0] === '#' && content[1] === '!') {
		var n = content.indexOf("\n");
		var le = "\n";
		if (n != -1) {
			var shebang = content.substr(0, n);
			if (shebang[shebang.length - 1] == "\r") {
				le = "\r\n";
				shebang = shebang.substr(0, shebang.length - 1);
			}
			content = content.substr(n + 1);
			return [shebang, content, le];
		}
	}
	return ['', content, ''];
}

exports.compileFile = function(_, js_, options) {
	options = _extend({}, options || {});
	var ext = fspath.extname(js_);
	var language = ext.substring(2);
	var basename = fspath.basename(js_, ext);
	var dirname = fspath.dirname(js_);
	var js = dirname + "/" + basename + ".js";
	var mtimejs_ = mtime(_, js_);
	var mtimejs = mtime(_, js);
	var transform = _getTransform(options);

	var banner = _banner(transform.version);
	options.sourceName = js_;
	var content = fs.readFile(js_, 'utf8', _);
	var shebangparse = parseShebang(content);
	var shebang = shebangparse[0];
	var le = shebangparse[2];
	content = shebangparse[1];

  if (language === "coffee") {
    var coffee = require("coffee-script");
    content = coffee.compile(content, { filename: js_ });
  }

	banner = shebang + le + banner;
	var transformed = mtimejs && fs.readFile(js, 'utf8', _);
	if (transformed && mtimejs_ < mtimejs && transformed.substring(0, banner.length) == banner && !options.force) {
		return transformed;
	}
	if (options.verbose) {
		console.log("streamline: transforming: " + js_ + " to " + js)
	}
	var transformed = shebang + banner + _transform(transform, content, options);
	if (options.action === 'compile' || !dontSave) {
		// try/catch because write will fail if file was installed globally (npm -g)
		try {
			fs.writeFile(js, transformed, 'utf8');
		} catch (ex) {}
	}
}

var streamlineRE = /require\s*\(\s*['"]streamline\/module['"]\s*\)\s*\(\s*module\s*,?\s*([^)]*)?\s*\)/;
// * `script = compiler.loadFile(_, path, options)`  
//   Loads Javascript file and transforms it if necessary.  
//   Returns the transformed source.  
//   If `path` is `foo_.js`, the source is transformed and the result
//   is *not* saved to disk.  
//   If `path` is `foo.js` and if a `foo_.js` file exists,
//   `foo_.js` is transformed if necessary and saved as `foo.js`.  
//   If `path` is `foo.js` and `foo_.js` does not exist, the contents
//   of `foo.js` is returned.  
//   `options` is a set of options passed to the transformation engine.  
//   If `options.force` is set, `foo_.js` is transformed even if 
//   `foo.js` is more recent.
exports.loadFile = function(_, path, options) {
	options = _extend({}, options || {});

	var ext = fspath.extname(path);
	if (ext !== '.js' && ext !== '._js') {
		// special hack for streamline-require
		if (_exists(_, path + '._js')) path = path + (ext = '._js');
		else if (_exists(_, path + '.js')) path = path + (ext = '.js');
		else return;
	}
	var basename = fspath.basename(path, ext);
	var dirname = fspath.dirname(path);

	var mtimejs, mtimejs_;
	var dontSave = basename[basename.length - 1] == '_';
	var jsbase = dontSave ? basename.substr(0, basename.length - 1) : basename;
	var js = dirname + '/' + jsbase + ext;
	var js_ = dirname + '/' + jsbase + '_' + ext;
	var fiberjs = dirname + '/' + jsbase + '--fibers' + ext;
	if (options.fibers && (mtimejs = mtime(_, fiberjs))) {
		js = fiberjs;
	} else {
		mtimejs = mtime(_, js);
	}
	mtimejs_ = mtime(_, js_);
	options.lines = options.lines || (dontSave ? "preserve" : "mark");

	var transform = _getTransform(options);
	var banner = _banner(transform.version);
	if (mtimejs_) {
		options.sourceName = js_;
		var content = fs.readFile(js_, 'utf8', _);
		var shebangparse = parseShebang(content);
		var shebang = shebangparse[0];
		var le = shebangparse[2];
		content = shebangparse[1];

		banner = shebang + le + banner;
		var transformed = mtimejs && fs.readFile(js, 'utf8', _);
		if (transformed && mtimejs_ < mtimejs && transformed.substring(0, banner.length) == banner && !options.force) {
			return transformed;
		}
		if (options.verbose) {
			console.log("streamline: transforming: " + js_ + " to " + js)
		}
		var transformed = shebang + banner + _transform(transform, content, options);
		if (options.action === 'compile' || !dontSave) {
			// try/catch because write will fail if file was installed globally (npm -g)
			try {
				fs.writeFile(js, transformed, 'utf8');
			} catch (ex) {}
		}
		return transformed;
	} else {
		options.sourceName = js;
		var content = fs.readFile(js, 'utf8', _);
		var matches;
		if (ext === '._js') {
			return cachedTransform(_, content, path, transform, banner, options);
		} else if (matches = streamlineRE.exec(content)) {
			try {
				matches[1] && _extend(options, JSON.parse(matches[1]));
			} catch (ex) {
				throw new Error("Invalid JSON syntax for streamline options: " + matches[1]);
			}
			content = content.substring(0, matches.index) + "true" + content.substring(matches.index + matches[0].length);
			return cachedTransform(_, content, path, transform, banner, options);
		} else {
			return content;
		}
	}
}

function mtimeSync(fname) {
	try {
		return fs.statSync(fname).mtime;
	} catch (ex) {
		return 0;
	}
}

exports.transformModule = function(content, path, options) {
	options = _extend({}, options || {});

	var ext = fspath.extname(path);
	var basename = fspath.basename(path, ext);
	var dirname = fspath.dirname(path);

	var mtimejs, mtimejs_;
	var dontSave = basename[basename.length - 1] == '_';
	var jsbase = dontSave ? basename.substr(0, basename.length - 1) : basename;
	var js = dirname + '/' + jsbase + ext;
	var js_ = dirname + '/' + jsbase + '_' + ext;
	var fiberjs = dirname + '/' + jsbase + '--fibers' + ext;
	if (options.fibers && (mtimejs = mtimeSync(fiberjs))) {
		js = fiberjs;
	} else {
		mtimejs = mtimeSync(js);
	}
	mtimejs_ = mtimeSync(js_);
	options.lines = options.lines || (dontSave ? "preserve" : "mark");

	var transform = _getTransform(options);
	var banner = _banner(transform.version);

	if (mtimejs_) {
		options.sourceName = js_;
		if (!dontSave) // reload content from js_ file.
		content = fs.readFileSync(js_, 'utf8');
		var shebangparse = parseShebang(content);
		var shebang = shebangparse[0];
		var le = shebangparse[2];
		content = shebangparse[1];

		banner = shebang + le + banner;
		var transformed = mtimejs && fs.readFileSync(js, 'utf8');
		if (transformed && mtimejs_ < mtimejs && transformed.substring(0, banner.length) == banner && !options.force) return transformed;
		if (options.verbose) console.log("streamline: transforming: " + js_)
		var transformed = banner + _transform(transform, content, options);
		if (!dontSave) {
			// try/catch because write will fail if file was installed globally (npm -g)
			try {
				fs.writeFileSync(js, transformed, 'utf8');
			} catch (ex) {}
		}
		return transformed;
	} else {
		options.sourceName = path;
		var matches;
		if (ext !== '.js' && ext !== '.coffee') {
			// we don't care about shebang here, but keep line ending if it had a shebang for line counts
			var shebangparse = parseShebang(content);
			var shebang = shebangparse[0];
			content = shebangparse[2] + shebangparse[1];
			return transform.transform(content, options);
		} else if (matches = streamlineRE.exec(content)) {
			try {
				matches[1] && _extend(options, JSON.parse(matches[1]));
			} catch (ex) {
				throw new Error("Invalid JSON syntax for streamline options: " + matches[1]);
			}
			content = content.substring(0, matches.index) + "true" + content.substring(matches.index + matches[0].length);
			return cachedTransformSync(content, path, transform, banner, options);
		} else {
			return content;
		}
	}
}

if (process.env.HOME === undefined && process.env.HOMEDRIVE === undefined) throw new Error("HOME not found, unable to store Streamline callback cache");
var root = (process.env.HOME || (process.env.HOMEDRIVE + process.env.HOMEPATH).replace(/\\/g, '/')) + "/.streamline";

var dirMode = parseInt('777', 8);

function mkdirs(_, path) {
	var p = "",
		i = 0;
	var segs = path.split('/').slice(0, -1);
	while (i < segs.length) {
		var seg = segs[i];
		p += (i++ ? '/' : '') + seg;
		if (i > 1 && !_exists(_, p)) fs.mkdir(p, dirMode, _);
	}
}

function cachedTransform(_, content, path, transform, banner, options) {
	path = path.replace(/\\/g, '/');
	var i = path.indexOf('node_modules/');
	if (i < 0) i = path.lastIndexOf('/');
	else i += 'node_modules'.length;

	var dir = root + '/' + (options.fibers ? 'fibers' : 'callbacks');
	dir += '/' + path.substring(0, i).replace(/[\/\:]/g, '__');
	var f = dir + path.substring(i);
	mkdirs(_, f);
	var transformed;
	if (mtime(_, f) > mtime(_, path)) {
		transformed = fs.readFile(f, "utf8", _);
		if (transformed.substring(0, banner.length) === banner) return transformed;
	}
	// no luck in cache
	if (options.verbose) console.log("streamline: transforming: " + path);
	options.lines = "preserve";
	transformed = banner + _transform(transform, content, options);
	if (path.indexOf('/tmp--') < 0) fs.writeFile(f, transformed, "utf8", _);
	return transformed;
}

function mkdirsSync(path) {
	var p = "",
		i = 0;
	path.split('/').slice(0, -1).forEach(function(seg) {
		p += (i++ ? '/' : '') + seg;
		if (i > 1 && !fspath.existsSync(p)) fs.mkdirSync(p, dirMode);
	});
}

function cachedTransformSync(content, path, transform, banner, options) {
	path = path.replace(/\\/g, '/');
	var i = path.indexOf('node_modules/');
	if (i < 0) i = path.lastIndexOf('/');
	else i += 'node_modules'.length;

	var dir = root + '/' + (options.fibers ? 'fibers' : 'callbacks');
	dir += '/' + path.substring(0, i).replace(/[\/:]/g, '__');
	var f = dir + path.substring(i);
	mkdirsSync(f);
	var transformed;
	if (mtimeSync(f) > mtimeSync(path)) {
		transformed = fs.readFileSync(f, "utf8");
		if (transformed.substring(0, banner.length) === banner) return transformed;
	}
	// no luck in cache
	if (options.verbose) console.log("streamline: transforming: " + path);
	var opts = Object.keys(options).reduce(function(r, k) { r[k] = options[k]; return r; }, {});
	opts.lines = "preserve";
	transformed = banner + _transform(transform, content, opts);
	if (path.indexOf('/tmp--') < 0) fs.writeFileSync(f, transformed, "utf8");
	return transformed;
}

exports.cachedTransformSync = function(content, path, transform, options) {
	var banner = _banner(transform.version);
	return cachedTransformSync(content, path, { transform: transform }, banner, options);
}
/// * `compiler.compile(_, paths, options)`  
///   Compiles streamline source files in `paths`.  
///   Generates a `foo.js` file for each `foo._js` file found in `paths`.
///   `paths` may be a list of files or a list of directories which
///   will be traversed recursively.  
///   `options`  is a set of options for the `transform` operation.
exports.compile = function(_, paths, options) {
	function _compile(_, path, options) {
		var stat = fs.stat(path, _);
		if (stat.isDirectory()) {
			fs.readdir(path, _).forEach_(_, function(_, f) {
				_compile(_, path + "/" + f, options)
			});
		} else if (stat.isFile()) {
			try {
				exports.loadFile(_, path, options);
				var ext = fspath.extname(path);
				if (ext === "._js" || ext === "._coffee") {
					exports.compileFile(_, path, options);
				} else {
					exports.loadFile(_, path, options);
				}
			} catch (ex) {
				console.error(ex.stack);
				failed++;
			}
		}
		// else ignore
	}

	var failed = 0;
	options = options || {};
	var transform = _getTransform(options);
	if (options.verbose) console.log("transform version: " + transform.version)
	if (!paths || paths.length == 0) throw new Error("cannot compile: no files specified");
	var cwd = process.cwd();
	paths.forEach_(_, function(_, path) {
		_compile(_, fspath.resolve(cwd, path), options);
	});
	if (failed) throw new Error("errors found in " + failed + " files");
};
