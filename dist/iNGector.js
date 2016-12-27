(function() {
  var fs, iNGector,
    slice = [].slice;

  iNGector = function() {
    var _executeInitBlocks, _executeProvideBlocks, _initBlocks, _initialized, _orderChain, _provideBlocks, _self, _startCalled;
    _self = this;
    _startCalled = false;
    _initialized = false;
    _provideBlocks = {};
    _initBlocks = [];
    _orderChain = function(items) {
      var _result, visit;
      _result = [];
      visit = function(i) {
        var d, j, k, len, ref;
        if (i.visited) {
          return;
        }
        i.visited = true;
        ref = i.dependencies || [];
        for (k = 0, len = ref.length; k < len; k++) {
          j = ref[k];
          d = (items.filter(function(s) {
            return s.name === j;
          }))[0];
          if (d == null) {
            throw "Dependency not found (" + j + ")";
          }
          visit(d);
        }
        return _result.push(i);
      };
      while (items.length > _result.length) {
        visit((items.filter(function(s) {
          return !s.visited;
        }))[0]);
      }
      return _result;
    };
    _executeProvideBlocks = function() {
      return new Promise(function(resolve, reject) {
        var _configPromise, _orderedChain, _provideChain, block, k, len, name;
        _provideChain = [];
        for (name in _provideBlocks) {
          block = _provideBlocks[name];
          _provideChain.push({
            name: name,
            dependencies: block.dependencies
          });
        }
        _orderedChain = _orderChain(_provideChain);
        _configPromise = Promise.resolve();
        for (k = 0, len = _orderedChain.length; k < len; k++) {
          block = _orderedChain[k];
          _configPromise = _configPromise.then((function(blockName) {
            return function() {
              var _block, d;
              _block = _provideBlocks[blockName];
              return _block.func.apply(_block, (function() {
                var l, len1, ref, results;
                ref = _block.dependencies;
                results = [];
                for (l = 0, len1 = ref.length; l < len1; l++) {
                  d = ref[l];
                  results.push(_provideBlocks[d].result);
                }
                return results;
              })()).then(function(result) {
                if (result != null) {
                  return _block.result = result;
                }
              })["catch"](function(error) {
                return reject(error);
              });
            };
          })(block.name));
        }
        return _configPromise.then(function() {
          return resolve();
        });
      });
    };
    _executeInitBlocks = function() {
      return new Promise(function(resolve, reject) {
        var _dependencies, _dependency, _promises, block, d, k, l, len, len1, ref;
        _promises = [];
        for (k = 0, len = _initBlocks.length; k < len; k++) {
          block = _initBlocks[k];
          _dependencies = [];
          ref = block.dependencies;
          for (l = 0, len1 = ref.length; l < len1; l++) {
            d = ref[l];
            _dependency = _provideBlocks[d];
            if (_dependency == null) {
              throw "Dependency not found (" + d + ")";
            }
            _dependencies.push(_dependency.result);
          }
          _promises.push(block.func.apply(block, _dependencies));
        }
        return Promise.all(_promises)["catch"](function(error) {
          return reject(error);
        }).then(function() {
          return resolve();
        });
      });
    };
    this.checkInitialization = function() {
      if (_initialized) {
        throw '[iNGector] Already initialized!';
      }
    };
    this.provide = function() {
      var dependencies, func, k, name;
      name = arguments[0], dependencies = 3 <= arguments.length ? slice.call(arguments, 1, k = arguments.length - 1) : (k = 1, []), func = arguments[k++];
      _self.checkInitialization();
      _provideBlocks[name] = {
        dependencies: dependencies,
        func: func
      };
      return _self;
    };
    this.init = function() {
      var dependencies, func, k;
      dependencies = 2 <= arguments.length ? slice.call(arguments, 0, k = arguments.length - 1) : (k = 0, []), func = arguments[k++];
      _self.checkInitialization();
      _initBlocks.push({
        dependencies: dependencies,
        func: func
      });
      return _self;
    };
    this.resolve = function(name) {
      if (!_initialized) {
        throw "[iNGector] Cannot get " + name + ". iNGector is not initialized yet!";
      }
      if (!_provideBlocks[name]) {
        throw "[iNGector] Block " + name + " not provided!";
      }
      return _provideBlocks[name].result;
    };
    this.start = function() {
      var _checkPromise;
      _checkPromise = new Promise(function(resolve, reject) {
        _self.checkInitialization();
        if (_startCalled) {
          throw '[iNGector] Start already called!';
        }
        return resolve();
      });
      return _checkPromise.then(function() {
        var _initPromise;
        _startCalled = true;
        _initPromise = Promise.resolve();
        if (_self.preInit != null) {
          _initPromise = _self.preInit();
        }
        return _initPromise.then(_executeProvideBlocks)["catch"](function(error) {
          return Promise.reject((typeof error.startsWith === "function" ? error.startsWith('[iNGector]') : void 0) ? error : "[iNGector] Error running provide blocks: \r\n" + error + " \r\n" + error.stack);
        }).then(_executeInitBlocks)["catch"](function(error) {
          return Promise.reject((typeof error.startsWith === "function" ? error.startsWith('[iNGector]') : void 0) ? error : "[iNGector] Error running init blocks: \r\n" + error + " \r\n" + error.stack);
        }).then(function() {
          _initialized = true;
          return _self;
        });
      });
    };
    return _self;
  };

  if (typeof window !== "undefined" && window !== null) {
    window.di = new iNGector;
  } else {
    fs = require('fs');
    module.exports = function() {
      var _baseDir, _createFilePromise, _di, _loadDir, _loadFile, _loadPromise;
      _baseDir = '';
      _di = new iNGector;
      _loadPromise = Promise.resolve();
      _createFilePromise = function(file) {
        return new Promise(function(resolve, reject) {
          fs.stat(file, function(error, stats) {
            var module;
            if (!(error != null ? error.code : void 0) && !stats.isDirectory()) {
              module = require(_baseDir + "/" + file);
              module(_di);
            }
            resolve();
          });
        });
      };
      _loadFile = function(file) {
        return function() {
          return _createFilePromise(file);
        };
      };
      _loadDir = function(dir) {
        return function() {
          return new Promise(function(resolve, reject) {
            return fs.readdir(dir, function(error, files) {
              var file;
              if (error != null) {
                return reject(error);
              } else {
                return resolve((function() {
                  var k, len, results;
                  results = [];
                  for (k = 0, len = files.length; k < len; k++) {
                    file = files[k];
                    results.push(dir + "/" + file);
                  }
                  return results;
                })());
              }
            });
          });
        };
      };
      _di.setBaseDir = function(baseDir) {
        _baseDir = baseDir;
        return _di;
      };
      _di.loadFiles = function() {
        var file, files, k, len;
        files = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        _di.checkInitialization();
        for (k = 0, len = files.length; k < len; k++) {
          file = files[k];
          _loadPromise = _loadPromise.then(_loadFile(file));
        }
        return _di;
      };
      _di.loadDirs = function() {
        var dir, dirs, k, len;
        dirs = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        _di.checkInitialization();
        for (k = 0, len = dirs.length; k < len; k++) {
          dir = dirs[k];
          _loadPromise = _loadPromise.then(_loadDir(dir)).then(function(files) {
            var file;
            return Promise.all((function() {
              var l, len1, results;
              results = [];
              for (l = 0, len1 = files.length; l < len1; l++) {
                file = files[l];
                results.push(_createFilePromise(file));
              }
              return results;
            })());
          });
        }
        return _di;
      };
      _di.preInit = function() {
        return _loadPromise["catch"](function(error) {
          return Promise.reject("[iNGector] Error loading files: \r\n" + error + " \r\n" + error.stack);
        });
      };
      return _di;
    };
  }

}).call(this);
